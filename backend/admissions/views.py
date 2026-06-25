# admissions/views.py
from django.shortcuts import render
import uuid
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.permissions import IsAdmin 
from students.models import Student, StudentProfile
from academics.models import DegreeProgram
from .models import (
    Applicant, AcademicRecord, AdmissionApplication, ProgramPreference, 
    ApplicantDocument, AdmissionDecision, AdmissionLog
) 
from .serializers import (
    ApplicantSerializer, AcademicRecordSerializer,
    AdmissionApplicationSerializer, ApplicantDocumentSerializer,
    AdmissionDecisionSerializer
)
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
from django.conf import settings

def _get_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')


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

    app_number = 'APP-2026-' + str(uuid.uuid4())[:8].upper()
    admission_type = request.data.get('admission_type', 'Regular')
    preferences_data = request.data.get('preferences', [])

    application = AdmissionApplication.objects.create(
        applicant=applicant,
        application_number=app_number,
        admission_type=admission_type
    )

    for pref in preferences_data:
        ProgramPreference.objects.create(
            application=application,
            program=pref.get('program',''),
            preference_order=pref.get('preference',''),
            department=pref.get('department','Faculty of Computing & IT')
        )

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
        'applicant', 'program'
    ).order_by('-submitted_at')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    return Response(AdmissionApplicationSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def make_decision(request, application_id):
    try:
        application = AdmissionApplication.objects.get(application_id=application_id)
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

    prev = application.status
    with transaction.atomic():
        AdmissionDecision.objects.create(
            application=application,
            decision=decision_value,
            decided_by=request.user,
            remarks=request.data.get('remarks', ''),
            registration_deadline=request.data.get('registration_deadline'),
            offered_section=request.data.get('offered_section', ''),
            rejection_reason=request.data.get('rejection_reason', ''),
            merit_score=request.data.get('merit_score'),
            merit_position=request.data.get('merit_position'),
        )
        application.status = decision_value
        application.save(update_fields=['status'])
        _log(application, decision_value, request.user, prev, decision_value, request,
             remarks=request.data.get('remarks', ''))

    return Response({
        'message': f'Application {decision_value}.',
        'application_number': application.application_number,
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def confirm_student_registration(request, application_id):
    """
    Admin confirms registration after approval.
    This is the point where the applicant becomes a student.
    Three things happen atomically:
    1. Student record is created
    2. StudentProfile is created
    3. user_type changes from applicant to student
    """
    try:
        application = AdmissionApplication.objects.select_related(
            'applicant', 'applicant__user', 'program'
        ).get(application_id=application_id)
    except AdmissionApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

    if application.status != 'approved':
        return Response(
            {'error': 'Only approved applications can be confirmed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    applicant = application.applicant
    user = applicant.user

    if Student.objects.filter(user=user).exists():
        return Response({'error': 'Student record already exists for this user.'}, status=status.HTTP_400_BAD_REQUEST)

    batch_year = timezone.now().year

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
        )
        StudentProfile.objects.create(student=student)
        user.user_type = 'student'
        user.save(update_fields=['user_type'])
        application.status = 'registered'
        application.save(update_fields=['status'])
        _log(application, 'registered', request.user, 'approved', 'registered', request,
             remarks='Student record created. Registration confirmed.')

    return Response({
        'message': 'Student registration confirmed.',
        'registration_number': student.registration_number,
        'student_id': student.student_id,
    }, status=status.HTTP_201_CREATED)