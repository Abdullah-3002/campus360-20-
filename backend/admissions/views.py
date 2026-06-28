# admissions/views.py
from django.shortcuts import render
import uuid
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.permissions import IsAdmin
from accounts.models import UserRole, Role
from students.models import Student, StudentProfile
from academics.models import DegreeProgram, Semester, ProgramCourse
from enrollments.models import Enrollment, CourseRegistration
from sections.models import Section
from fees.models import FeeStructure, Challan
from notifications.models import NotificationType, Notification
from .models import (
    Applicant, AcademicRecord, AdmissionApplication, ProgramPreference, 
    ApplicantDocument, AdmissionDecision, AdmissionLog
) 
from .serializers import (
    ApplicantSerializer, AcademicRecordSerializer,
    AdmissionApplicationSerializer, ApplicantDocumentSerializer,
    AdmissionDecisionSerializer, AdmissionProgramSerializer,
    AdminApplicationListSerializer, AdminApplicationDetailSerializer,
)
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
from django.conf import settings

def _get_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')


LOCKED_APPLICATION_STATUSES = {
    'pending', 'under_review', 'documents_pending',
    'approved', 'rejected', 'waitlist', 'registered',
}


def _applicant_has_submitted_application(applicant):
    """True once the applicant has submitted an application (non-draft)."""
    return AdmissionApplication.objects.filter(
        applicant=applicant,
        status__in=LOCKED_APPLICATION_STATUSES,
    ).exists()


def _get_applicant_for_user(user):
    try:
        return Applicant.objects.get(user=user)
    except Applicant.DoesNotExist:
        return None


def _locked_response():
    return Response(
        {'error': 'Your application has been submitted. You cannot make changes.'},
        status=status.HTTP_403_FORBIDDEN,
    )


def _log(application, action_type, performed_by, prev_status, new_status, request, remarks=''):
    AdmissionLog.objects.create(
        application=application,
        action_type=action_type,
        performed_by=performed_by,
        previous_status=prev_status,
        new_status=new_status,
        remarks=remarks,
        ip_address=_get_ip(request),
    )


def _parse_preference_order(value):
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if digits:
            return int(digits)
    return 1


def _resolve_program(pref):
    program_id = pref.get('program_id')
    if program_id:
        return DegreeProgram.objects.filter(
            program_id=program_id,
            is_active=True,
            accepting_admissions=True,
        ).first()

    program_name = pref.get('program') or pref.get('program_name')
    if program_name:
        return DegreeProgram.objects.filter(
            program_name=program_name,
            is_active=True,
            accepting_admissions=True,
        ).first()
    return None


def _check_eligibility(applicant):
    """
    Automatic eligibility check.
    Returns True if the applicant has at least 50% in intermediate.
    Returns False if no intermediate record exists or marks are below 50%.
    """
    try:
        intermediate = AcademicRecord.objects.get(
            applicant=applicant,
            qualification_level='intermediate'
        )
        if intermediate.grading_system == 'marks':
            if not intermediate.total or intermediate.total <=0:
                return False
            percentage = (intermediate.obtained / intermediate.total) * 100
            return percentage >= 50
        elif intermediate.grading_system == 'cgpa':
            return intermediate.obtained >= 2.0
        return False
    except AcademicRecord.DoesNotExist:
        return False
    except AcademicRecord.MultipleObjectsReturned:
        # If multiple intermediate records, check the most recent one
        intermediate = AcademicRecord.objects.filter(
            applicant=applicant,
            qualification_level='intermediate'
        ).order_by('-end_year').first()
        if intermediate.grading_system == 'marks':
            if not intermediate.total or intermediate.total <=0:
                return False
            percentage = (intermediate.obtained / intermediate.total) * 100
            return percentage >= 50
        return False


def _sync_user_role(user, role_key, assigned_by=None):
    role_name_map = {
        'student': 'Student',
        'teacher': 'Teacher',
        'staff': 'Staff',
        'admin': 'Admin',
        'applicant': 'Applicant',
    }
    role_name = role_name_map.get(role_key)
    if not role_name:
        return
    role, _ = Role.objects.get_or_create(
        role_name=role_name,
        defaults={'description': f'{role_name} role'},
    )
    UserRole.objects.filter(user=user).delete()
    UserRole.objects.create(user=user, role=role, assigned_by=assigned_by or user)


def _auto_enroll_student(student, program, performed_by):
    """Enroll a new student in semester-1 program courses and create fee challan."""
    try:
        current_semester = Semester.objects.get(is_current=True)
    except Semester.DoesNotExist:
        return {'enrolled_courses': [], 'warnings': ['No active semester found. Run seed_erp_data.']}

    enrollment, _ = Enrollment.objects.get_or_create(student=student, semester=current_semester)
    program_courses = ProgramCourse.objects.filter(
        program=program, semester_number=1
    ).select_related('course')

    enrolled = []
    warnings = []

    for pc in program_courses:
        section = Section.objects.filter(
            course=pc.course, semester=current_semester, is_active=True
        ).first()
        if not section:
            warnings.append(f'No section for {pc.course.course_code}')
            continue
        if CourseRegistration.objects.filter(enrollment=enrollment, course=pc.course).exists():
            continue
        if section.enrolled_count >= section.max_capacity:
            warnings.append(f'Section full for {pc.course.course_code}')
            continue

        CourseRegistration.objects.create(
            enrollment=enrollment,
            course=pc.course,
            section=section,
            student=student,
        )
        section.enrolled_count += 1
        section.save(update_fields=['enrolled_count'])
        enrolled.append(pc.course.course_code)

    enrollment.total_credit_hours_registered = sum(
        r.course.credit_hours for r in CourseRegistration.objects.filter(
            enrollment=enrollment, status='registered'
        )
    )
    enrollment.save(update_fields=['total_credit_hours_registered'])

    fee_structure = FeeStructure.objects.filter(
        program=program, semester_number=1, fee_type='semester_fee'
    ).order_by('-effective_from').first()
    if fee_structure:
        amount = fee_structure.amount
    elif program.fee_per_semester:
        amount = program.fee_per_semester
    else:
        amount = 50000

    if not Challan.objects.filter(student=student, semester=current_semester).exists():
        Challan.objects.create(
            challan_number=f"CH-{timezone.now().year}-{str(uuid.uuid4().int)[:6]}",
            student=student,
            semester=current_semester,
            due_date=timezone.now().date() + timedelta(days=30),
            total_amount=amount,
            generated_by=performed_by,
        )

    notif_type, _ = NotificationType.objects.get_or_create(
        type_name='Registration',
        defaults={'description': 'Registration notifications'},
    )
    course_list = ', '.join(enrolled) if enrolled else 'pending section assignment'
    Notification.objects.create(
        notification_type=notif_type,
        recipient=student.user,
        title='Welcome to Campus 360',
        message=(
            f'Registration confirmed. Your registration number is {student.registration_number}. '
            f'Program: {program.program_name}. Enrolled courses: {course_list}.'
        ),
        priority='high',
    )

    return {'enrolled_courses': enrolled, 'warnings': warnings}

# ========== EXISTING VIEWS ==========

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def applicant_profile(request):
    if request.method == 'GET':
        try:
            applicant = Applicant.objects.get(user=request.user)
            return Response(ApplicantSerializer(applicant).data)
        except Applicant.DoesNotExist:
            return Response({}, status=status.HTTP_404_NOT_FOUND)

    applicant, _ = Applicant.objects.get_or_create(user=request.user)
    if _applicant_has_submitted_application(applicant):
        return _locked_response()

    serializer = ApplicantSerializer(applicant, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_academic_record(request):
    try:
        applicant = Applicant.objects.get(user=request.user)
    except Applicant.DoesNotExist:
        return Response({'error': 'Complete your profile first.'}, status=400)

    if _applicant_has_submitted_application(applicant):
        return _locked_response()

    serializer = AcademicRecordSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(applicant=applicant)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_academic_records(request):
    try:
        applicant = Applicant.objects.get(user=request.user)
        records = AcademicRecord.objects.filter(applicant=applicant)
        return Response(AcademicRecordSerializer(records, many=True).data)
    except Applicant.DoesNotExist:
        return Response([])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_admission_programs(request):
    programs = DegreeProgram.objects.select_related('department').filter(
        is_active=True,
        accepting_admissions=True,
    ).order_by('department__department_name', 'program_name')
    return Response(AdmissionProgramSerializer(programs, many=True).data)


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def admission_application(request):
    if request.method == 'GET':
        try:
            applicant = Applicant.objects.get(user=request.user)
            apps = AdmissionApplication.objects.filter(applicant=applicant)
            return Response(AdmissionApplicationSerializer(apps, many=True).data)
        except Applicant.DoesNotExist:
            return Response([])

    try:
        applicant = Applicant.objects.get(user=request.user)
    except Applicant.DoesNotExist:
        return Response({'error': 'Complete your profile first.'}, status=400)

    if AdmissionApplication.objects.filter(applicant=applicant).exists():
        return Response(
            {'error': 'You already have a submitted application.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    preferences_data = request.data.get('preferences', [])
    if not preferences_data:
        return Response({'error': 'At least one program preference is required.'}, status=status.HTTP_400_BAD_REQUEST)

    resolved_preferences = []
    for pref in preferences_data:
        program = _resolve_program(pref)
        if not program:
            return Response(
                {'error': f"Invalid or unavailable program: {pref.get('program') or pref.get('program_id')}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order = _parse_preference_order(pref.get('preference_order') or pref.get('preference'))
        resolved_preferences.append((program, order))

    resolved_preferences.sort(key=lambda item: item[1])
    primary_program = resolved_preferences[0][0]

    app_number = 'APP-2026-' + str(uuid.uuid4())[:8].upper()
    admission_type = request.data.get('admission_type', 'Regular')

    application = AdmissionApplication.objects.create(
        applicant=applicant,
        program=primary_program,
        application_number=app_number,
        admission_type=admission_type,
        session_year=timezone.now().year,
        session_type='spring',
    )

    for program, order in resolved_preferences:
        ProgramPreference.objects.create(
            application=application,
            program=program,
            preference_order=order,
        )

    _log(application, 'submitted', request.user, 'draft', 'pending', request,
         remarks='Application submitted by applicant.')

    return Response({
        'application_id': application.id,
        'application_number': application.application_number,
        'status': application.status
    }, status=status.HTTP_201_CREATED)


# ========== DOCUMENT VIEWS ==========

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_documents(request):
    """Get all documents for the current applicant"""
    try:
        applicant = Applicant.objects.get(user=request.user)
        documents = ApplicantDocument.objects.filter(applicant=applicant).order_by('-uploaded_at')
        serializer = ApplicantDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    except Applicant.DoesNotExist:
        return Response([])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request):
    """Upload a document for the current applicant"""
    try:
        applicant = Applicant.objects.get(user=request.user)
    except Applicant.DoesNotExist:
        return Response(
            {'error': 'Please complete your profile first. Go to Complete Profile tab and save your details.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if _applicant_has_submitted_application(applicant):
        return _locked_response()

    # Get document type from request
    document_type = request.data.get('document_type', 'photograph')
    
    # Personal document types (limited to 4 total)
    personal_doc_types = ['cnic_front', 'cnic_back', 'domicile', 'photograph']
    
    # Only apply limit for personal documents
    if document_type in personal_doc_types:
        personal_doc_count = ApplicantDocument.objects.filter(
            applicant=applicant, 
            document_type__in=personal_doc_types
        ).count()
        if personal_doc_count >= 4:
            return Response(
                {'error': 'Maximum 4 personal documents allowed (CNIC Front, CNIC Back, Domicile, Photograph). You cannot upload more personal documents.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # No limit for academic documents - they can be uploaded freely
    
    # Get uploaded file
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return Response(
            {'error': 'No file provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate file size (max 1 MB = 1,048,576 bytes)
    if uploaded_file.size > 1048576:
        return Response(
            {'error': 'File size must be ≤ 1 MB'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate file extension
    file_ext = uploaded_file.name.split('.')[-1].lower()
    allowed_extensions = ['pdf', 'jpg', 'jpeg', 'png']
    if file_ext not in allowed_extensions:
        return Response(
            {'error': f'Only {", ".join(allowed_extensions)} files are allowed'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create directory if it doesn't exist
    upload_dir = os.path.join(settings.MEDIA_ROOT, 'documents', f'applicant_{applicant.id}')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}_{uploaded_file.name}"
    upload_path = f'documents/applicant_{applicant.id}/{unique_filename}'
    
    saved_path = default_storage.save(upload_path, ContentFile(uploaded_file.read()))
    
    document = ApplicantDocument.objects.create(
        applicant=applicant,
        document_type=document_type,
        file_name=uploaded_file.name,
        file_path=saved_path,
        file_size=uploaded_file.size,
        file_type=file_ext,
        is_verified=False
    )
    
    return Response(
        {
            'message': 'Document uploaded successfully',
            'document_id': document.document_id
        }, 
        status=status.HTTP_201_CREATED
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, doc_id):
    """Delete a document by ID"""
    try:
        applicant = Applicant.objects.get(user=request.user)
        if _applicant_has_submitted_application(applicant):
            return _locked_response()

        document = ApplicantDocument.objects.get(document_id=doc_id, applicant=applicant)
        
        # Delete the physical file from storage
        if document.file_path:
            default_storage.delete(document.file_path)
        
        # Delete the database record
        document.delete()
        
        return Response(
            {'message': 'Document deleted successfully'}, 
            status=status.HTTP_200_OK
        )
        
    except Applicant.DoesNotExist:
        return Response(
            {'error': 'Applicant not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except ApplicantDocument.DoesNotExist:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_document(request, doc_id):
    """Download a document file"""
    try:
        applicant = Applicant.objects.get(user=request.user)
        document = ApplicantDocument.objects.get(document_id=doc_id, applicant=applicant)
        
        from django.http import FileResponse, Http404
        
        if default_storage.exists(document.file_path):
            file = default_storage.open(document.file_path, 'rb')
            response = FileResponse(file, content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{document.file_name}"'
            return response
        else:
            raise Http404("File not found")
            
    except (Applicant.DoesNotExist, ApplicantDocument.DoesNotExist):
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_application(request, app_id):
    """Delete an application by ID"""
    try:
        applicant = Applicant.objects.get(user=request.user)
        application = AdmissionApplication.objects.get(id=app_id, applicant=applicant)

        if application.status in LOCKED_APPLICATION_STATUSES:
            return Response(
                {'error': 'Submitted applications cannot be deleted.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Delete all preferences first (cascade will handle if set)
        application.preferences.all().delete()
        # Delete the application
        application.delete()
        
        return Response(
            {'message': 'Application deleted successfully'}, 
            status=status.HTTP_200_OK
        )
        
    except Applicant.DoesNotExist:
        return Response(
            {'error': 'Applicant not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except AdmissionApplication.DoesNotExist:
        return Response(
            {'error': 'Application not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_academic_record(request, record_id):
    """Delete an academic record by ID"""
    try:
        applicant = Applicant.objects.get(user=request.user)
        if _applicant_has_submitted_application(applicant):
            return _locked_response()

        record = AcademicRecord.objects.get(id=record_id, applicant=applicant)
        record.delete()
        return Response({'message': 'Academic record deleted successfully'}, status=status.HTTP_200_OK)
    except Applicant.DoesNotExist:
        return Response({'error': 'Applicant not found'}, status=status.HTTP_404_NOT_FOUND)
    except AcademicRecord.DoesNotExist:
        return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)


# ── Admin endpoints ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_list_applications(request):
    qs = AdmissionApplication.objects.select_related(
        'applicant', 'applicant__user', 'program'
    ).prefetch_related('preferences', 'decision').order_by('-submitted_at')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    return Response(AdminApplicationListSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_application_detail(request, application_id):
    try:
        application = AdmissionApplication.objects.select_related(
            'applicant', 'applicant__user', 'program'
        ).prefetch_related(
            'preferences',
            'applicant__academic_records',
            'applicant__documents',
            'decision',
        ).get(id=application_id)
    except AdmissionApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(AdminApplicationDetailSerializer(application).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_download_document(request, application_id, doc_id):
    try:
        application = AdmissionApplication.objects.select_related('applicant').get(id=application_id)
        document = ApplicantDocument.objects.get(
            document_id=doc_id,
            applicant=application.applicant,
        )
        from django.http import FileResponse, Http404

        if default_storage.exists(document.file_path):
            file = default_storage.open(document.file_path, 'rb')
            response = FileResponse(file, content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{document.file_name}"'
            return response
        raise Http404("File not found")
    except (AdmissionApplication.DoesNotExist, ApplicantDocument.DoesNotExist):
        return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdmin])
def make_decision(request, application_id):
    try:
        application = AdmissionApplication.objects.get(id=application_id)
    except AdmissionApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

    if hasattr(application, 'decision'):
       application.decision.delete()
    decision_value = request.data.get('decision')
    if decision_value not in ['approved', 'rejected', 'waitlist']:
        return Response(
            {'error': 'decision must be approved, rejected, or waitlist.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    remarks_val = request.data.get('remarks', '').strip()
    if not remarks_val:
        return Response(
            {'error': 'Remarks are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if decision_value == 'rejected' and not request.data.get('rejection_reason', '').strip():
        return Response(
            {'error': 'Rejection reason is required when rejecting an application.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Before approving, enforce document verification check
    if decision_value == 'approved':
        applicant_docs = ApplicantDocument.objects.filter(applicant=application.applicant)
        unverified_docs = applicant_docs.filter(is_verified=False)
        if unverified_docs.exists():
            return Response(
                {'error': 'Cannot approve application. All applicant documents must be verified first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    prev = application.status
    with transaction.atomic():
        if decision_value == 'approved':
            registration_deadline = timezone.now().date() + timedelta(days=15)
        else:
            registration_deadline = None

        AdmissionDecision.objects.create(
            application=application,
            decision=decision_value,
            decided_by=request.user,
            remarks=remarks_val,
            registration_deadline=registration_deadline,
            offered_section=request.data.get('offered_section', ''),
            rejection_reason=request.data.get('rejection_reason', ''),
            merit_score=request.data.get('merit_score'),
            merit_position=request.data.get('merit_position'),
        )
        application.status = decision_value
        application.save(update_fields=['status'])
        _log(application, decision_value, request.user, prev, decision_value, request,
             remarks=remarks_val)

    return Response({
        'message': f'Application {decision_value}.',
        'application_number': application.application_number,
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_verify_document(request, application_id, doc_id):
    """Admin verifies/approves a specific applicant document"""
    try:
        application = AdmissionApplication.objects.select_related('applicant').get(id=application_id)
        document = ApplicantDocument.objects.get(
            document_id=doc_id,
            applicant=application.applicant,
        )
    except (AdmissionApplication.DoesNotExist, ApplicantDocument.DoesNotExist):
        return Response({'error': 'Document or application not found.'}, status=status.HTTP_404_NOT_FOUND)

    document.is_verified = True
    document.verified_at = timezone.now()
    document.verified_by = request.user
    document.save(update_fields=['is_verified', 'verified_at', 'verified_by'])

    return Response({
        'message': 'Document verified successfully.',
        'document_id': document.document_id,
        'is_verified': document.is_verified,
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def confirm_student_registration(request, application_id):
    """
    Admin confirms registration after approval.
    This is the point where the applicant becomes a student.
    Three things happen atomically:
    1. Student record is created
    2. StudentProfile is created (with copied details from Applicant profile)
    3. user_type changes from applicant to student
    """
    try:
        application = AdmissionApplication.objects.select_related(
            'applicant', 'applicant__user', 'program'
        ).get(id=application_id)
    except AdmissionApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

    if application.status != 'approved':
        return Response(
            {'error': 'Only approved applications can be confirmed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Double check document verification
    applicant_docs = ApplicantDocument.objects.filter(applicant=application.applicant)
    if applicant_docs.filter(is_verified=False).exists():
        return Response(
            {'error': 'Cannot confirm registration. All documents must be verified first.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    applicant = application.applicant
    user = applicant.user

    if Student.objects.filter(user=user).exists():
        return Response({'error': 'Student record already exists for this user.'}, status=status.HTTP_400_BAD_REQUEST)

    batch_year = timezone.now().year

    # Get offered_section from decision
    offered_sec = None
    if hasattr(application, 'decision'):
        offered_sec = application.decision.offered_section

    with transaction.atomic():
        existing_count = Student.objects.select_for_update().filter(
            program=application.program,
            batch_year=batch_year
        ).count()
        
        registration_number = f"{application.program.program_code}-{batch_year}-{str(existing_count + 1).zfill(4)}"

        student = Student.objects.create(
            user=user,
            applicant=applicant,
            program=application.program,
            registration_number=registration_number,
            batch_year=batch_year,
            admission_date=timezone.now().date(),
            section=offered_sec,
        )
        
        # Populate StudentProfile copying from Applicant profile details
        StudentProfile.objects.create(
            student=student,
            guardian_name=applicant.guardian_name,
            guardian_cnic=applicant.guardian_cnic,
            guardian_phone=applicant.phone,
            residential_address=applicant.perm_address,
            permanent_address=applicant.perm_address,
            permanent_address_same_as_residential=True,
        )
        
        user.user_type = 'student'
        user.save(update_fields=['user_type'])
        _sync_user_role(user, 'student', assigned_by=request.user)
        application.status = 'registered'
        application.save(update_fields=['status'])
        enroll_result = _auto_enroll_student(student, application.program, request.user)
        _log(application, 'registered', request.user, 'approved', 'registered', request,
             remarks='Student record created. Registration confirmed.')

    return Response({
        'message': 'Student registration confirmed.',
        'registration_number': student.registration_number,
        'student_id': student.student_id,
        'enrolled_courses': enroll_result['enrolled_courses'],
        'warnings': enroll_result['warnings'],
    }, status=status.HTTP_201_CREATED)