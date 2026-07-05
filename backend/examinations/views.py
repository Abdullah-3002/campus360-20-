from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin, require_permission, require_any_permission
from accounts.rbac import user_has_permission
from accounts.audit import log_audit
from students.models import Student
from sections.models import Section
from enrollments.models import CourseRegistration
from .models import ExamType, Examination, ExamSchedule, Grade, Marks, FinalGrade, Result, ResultApproval, MarksEditPermission
from .marks_locking import can_edit_exam_marks, exam_edit_status, get_semester_phase, get_mid_term_cutoff, get_grace_end
from .serializers import (
    ExamTypeSerializer, ExaminationSerializer, ExamScheduleSerializer,
    GradeSerializer, MarksSerializer, FinalGradeSerializer,
    ResultSerializer, ResultApprovalSerializer, MarksEditPermissionSerializer,
)


# ── EXAM TYPES ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_exam_types(request):
    return Response(ExamTypeSerializer(ExamType.objects.all(), many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_exam_type(request):
    serializer = ExamTypeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── GRADE SCALE ───────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_grades(request):
    return Response(GradeSerializer(Grade.objects.all().order_by('-min_percentage'), many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_grade(request):
    serializer = GradeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── EXAMINATIONS ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, require_any_permission(
    'examinations.view_examination', 'examinations.create_examination',
    'examinations.enter_marks', 'examinations.view_marks',
)])
def list_examinations(request):
    exams = Examination.objects.select_related('course', 'semester', 'section', 'exam_type').all()
    semester = request.query_params.get('semester')
    section  = request.query_params.get('section')
    if semester:
        exams = exams.filter(semester__semester_id=semester)
    if section:
        exams = exams.filter(section__section_id=section)
    return Response(ExaminationSerializer(exams, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, require_permission('examinations.create_examination')])
def create_examination(request):
    if request.user.user_type == 'teacher':
        faculty = _get_faculty(request.user)
        section_id = request.data.get('section')
        if not faculty:
            return Response({'error': 'Faculty profile required.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            section = Section.objects.get(section_id=section_id)
        except Section.DoesNotExist:
            return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)
        if section.faculty_id != faculty.faculty_id:
            return Response({'error': 'You can only create exams for your own sections.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ExaminationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, require_any_permission(
    'examinations.view_examination', 'examinations.update_examination',
    'examinations.delete_examination',
)])
def examination_detail(request, exam_id):
    try:
        exam = Examination.objects.select_related('course', 'exam_type', 'section__faculty').get(exam_id=exam_id)
    except Examination.DoesNotExist:
        return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ExaminationSerializer(exam).data)

    if request.user.user_type == 'teacher':
        faculty = _get_faculty(request.user)
        if not faculty or exam.section.faculty_id != faculty.faculty_id:
            return Response({'error': 'Not your section.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        if not user_has_permission(request.user, 'examinations.update_examination'):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ExaminationSerializer(exam, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if not user_has_permission(request.user, 'examinations.delete_examination'):
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    exam.delete()
    return Response({'message': 'Examination deleted.'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAdmin])
def add_exam_schedule(request, exam_id):
    try:
        exam = Examination.objects.get(exam_id=exam_id)
    except Examination.DoesNotExist:
        return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ExamScheduleSerializer(data={**request.data, 'exam': exam.exam_id})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── MARKS ─────────────────────────────────────────────────────

def _get_faculty(user):
    try:
        return user.faculty_profile
    except Exception:
        return None


def _can_edit_section_marks(section, user, student_id=None):
    """Legacy section-level check; prefer can_edit_exam_marks for exam-aware locking."""
    if user.user_type == 'admin':
        return True
    if section.marks_locked:
        faculty = _get_faculty(user)
        if not faculty:
            return False
        perms = MarksEditPermission.objects.filter(
            section=section, granted_to=faculty, is_active=True,
            request_status='approved', expires_at__gt=timezone.now(),
        )
        if student_id:
            return perms.filter(student_id=student_id).exists()
        return perms.exists()
    return True


def _get_exam_for_marks(exam_id):
    return Examination.objects.select_related(
        'section', 'section__faculty', 'exam_type', 'semester',
    ).get(exam_id=exam_id)


def _grade_for_percentage(pct):
    for g in Grade.objects.all().order_by('-min_percentage'):
        if pct >= g.min_percentage:
            return g
    return Grade.objects.order_by('min_percentage').first()


def _compute_section_final_grades(section):
    exams = Examination.objects.select_related('exam_type').filter(section=section)
    if not exams.exists():
        return {'created': 0, 'updated': 0}

    regs = CourseRegistration.objects.filter(section=section, status='registered').select_related('student')
    created, updated = 0, 0

    for reg in regs:
        total_obtained = Decimal('0')
        total_possible = Decimal('0')
        for exam in exams:
            weight = exam.exam_type.weightage_percentage / Decimal('100')
            mark = Marks.objects.filter(exam=exam, student=reg.student).first()
            if mark and not mark.is_absent and mark.obtained_marks is not None:
                total_obtained += mark.obtained_marks * weight
            total_possible += exam.total_marks * weight

        if total_possible <= 0:
            continue

        percentage = (total_obtained / total_possible) * Decimal('100')
        grade_obj = _grade_for_percentage(percentage)
        status_val = grade_obj.status if grade_obj else 'fail'

        fg, was_created = FinalGrade.objects.update_or_create(
            registration=reg,
            defaults={
                'student': reg.student,
                'course': section.course,
                'semester': section.semester,
                'total_obtained_marks': total_obtained,
                'total_marks': total_possible,
                'percentage': percentage,
                'grade': grade_obj,
                'status': status_val,
            },
        )
        from examinations.results_pipeline import sync_registration_from_final_grade
        sync_registration_from_final_grade(fg)
        if was_created:
            created += 1
        else:
            updated += 1

    return {'created': created, 'updated': updated}


def _sync_student_cgpa(student):
    results = Result.objects.filter(student=student, is_published=True).order_by('-semester__academic_year', '-semester__semester_type')
    if not results.exists():
        return
    latest = results.first()
    earned = sum(
        fg.registration.course.credit_hours
        for fg in FinalGrade.objects.filter(
            student=student, status='pass'
        ).select_related('registration__course')
    )
    student.cgpa = latest.cgpa or Decimal('0')
    student.total_credit_hours_completed = earned
    student.save(update_fields=['cgpa', 'total_credit_hours_completed'])


@api_view(['GET'])
@permission_classes([IsAuthenticated, require_any_permission(
    'examinations.view_examination', 'examinations.create_examination',
    'examinations.enter_marks', 'examinations.view_marks',
)])
def marks_lock_status(request):
    """Per-exam or per-section marks lock overview for teachers."""
    section_id = request.query_params.get('section_id')
    exam_id = request.query_params.get('exam_id')

    if exam_id:
        try:
            exam = _get_exam_for_marks(exam_id)
        except Examination.DoesNotExist:
            return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.user.user_type == 'teacher':
            faculty = _get_faculty(request.user)
            if not faculty or exam.section.faculty_id != faculty.faculty_id:
                return Response({'error': 'Not your section.'}, status=status.HTTP_403_FORBIDDEN)
        student_id = request.query_params.get('student_id')
        base = exam_edit_status(exam, request.user, student_id=int(student_id) if student_id else None)
        if student_id:
            return Response(base)
        from enrollments.models import CourseRegistration
        students = []
        for reg in CourseRegistration.objects.filter(section=exam.section, status='registered').select_related('student'):
            st = exam_edit_status(exam, request.user, student_id=reg.student_id)
            students.append({
                'student_id': reg.student_id,
                'registration_number': reg.student.registration_number,
                'editable': st['editable'],
                'admin_override': st.get('admin_override', False),
            })
        base['students'] = students
        return Response(base)

    if not section_id:
        return Response({'error': 'section_id or exam_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        section = Section.objects.select_related('semester').get(section_id=section_id)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.user_type == 'teacher':
        faculty = _get_faculty(request.user)
        if not faculty or section.faculty_id != faculty.faculty_id:
            return Response({'error': 'Not your section.'}, status=status.HTTP_403_FORBIDDEN)

    semester = section.semester
    exams = Examination.objects.select_related('exam_type').filter(section=section)
    return Response({
        'section_id': section.section_id,
        'semester_phase': get_semester_phase(semester),
        'mid_term_cutoff': str(get_mid_term_cutoff(semester)),
        'grace_end': str(get_grace_end(semester)),
        'exams': [exam_edit_status(ex, request.user) for ex in exams],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, require_any_permission(
    'examinations.view_examination', 'examinations.create_examination',
    'examinations.enter_marks', 'examinations.view_marks',
)])
def list_marks(request, exam_id):
    try:
        exam = _get_exam_for_marks(exam_id)
    except Examination.DoesNotExist:
        return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.user_type == 'teacher':
        faculty = _get_faculty(request.user)
        if not faculty or exam.section.faculty_id != faculty.faculty_id:
            return Response({'error': 'Not your section.'}, status=status.HTTP_403_FORBIDDEN)

    marks = Marks.objects.select_related('student', 'exam').filter(exam__exam_id=exam_id)
    return Response(MarksSerializer(marks, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, require_permission('examinations.enter_marks')])
def enter_marks(request, exam_id):
    try:
        exam = _get_exam_for_marks(exam_id)
    except Examination.DoesNotExist:
        return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)

    faculty = _get_faculty(request.user)
    if request.user.user_type == 'teacher' and not faculty:
        return Response({'error': 'Only faculty can enter marks.'}, status=status.HTTP_403_FORBIDDEN)
    if not faculty:
        faculty = exam.section.faculty

    marks_data = request.data.get('marks', [])
    created = []
    errors  = []

    for entry in marks_data:
        student_id = entry.get('student')
        allowed, reason = can_edit_exam_marks(exam, request.user, student_id)
        if not allowed:
            errors.append({'student': student_id, 'error': reason})
            continue
        entry['exam'] = exam_id
        entry['entered_by'] = faculty.faculty_id if faculty else entry.get('entered_by')
        serializer = MarksSerializer(data=entry)
        if serializer.is_valid():
            serializer.save()
            created.append(serializer.data)
        else:
            errors.append(serializer.errors)

    if not created and errors:
        return Response({'created': created, 'errors': errors}, status=status.HTTP_403_FORBIDDEN)
    return Response({'created': created, 'errors': errors}, status=status.HTTP_201_CREATED)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, require_any_permission(
    'examinations.view_examination', 'examinations.create_examination',
    'examinations.enter_marks', 'examinations.view_marks',
)])
def update_marks(request, marks_id):
    try:
        marks = Marks.objects.select_related('exam__section', 'exam__exam_type', 'exam__semester').get(marks_id=marks_id)
    except Marks.DoesNotExist:
        return Response({'error': 'Marks record not found.'}, status=status.HTTP_404_NOT_FOUND)

    allowed, reason = can_edit_exam_marks(marks.exam, request.user, marks.student_id)
    if not allowed:
        return Response({'error': reason}, status=status.HTTP_403_FORBIDDEN)

    serializer = MarksSerializer(marks, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(modified_by=request.user)
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── FINAL GRADES ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_final_grades(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can access this.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'No student record found.'}, status=status.HTTP_404_NOT_FOUND)
    from examinations.results_pipeline import published_semester_ids_for
    published = published_semester_ids_for(student)
    grades = FinalGrade.objects.select_related('course', 'semester', 'grade').filter(
        student=student, semester_id__in=published,
    )
    return Response(FinalGradeSerializer(grades, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_final_grade(request):
    serializer = FinalGradeSerializer(data=request.data)
    if serializer.is_valid():
        fg = serializer.save()
        from examinations.results_pipeline import sync_registration_from_final_grade
        sync_registration_from_final_grade(fg)
        log_audit(request, 'create_final_grade', 'final_grade', fg.final_grade_id)
        return Response(FinalGradeSerializer(fg).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── RESULTS ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_results(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can access this.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'No student record found.'}, status=status.HTTP_404_NOT_FOUND)
    results = Result.objects.select_related('semester').filter(student=student, is_published=True)
    return Response(ResultSerializer(results, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_results(request):
    results = Result.objects.select_related('student', 'semester').all()
    semester = request.query_params.get('semester')
    if semester:
        results = results.filter(semester__semester_id=semester)
    return Response(ResultSerializer(results, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def generate_semester_results(request):
    """Aggregate FinalGrades into Result rows for a semester."""
    semester_id = request.data.get('semester_id')
    if not semester_id:
        return Response({'error': 'semester_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    from academics.models import Semester
    try:
        semester = Semester.objects.get(semester_id=semester_id)
    except Semester.DoesNotExist:
        return Response({'error': 'Semester not found.'}, status=status.HTTP_404_NOT_FOUND)

    from examinations.results_pipeline import generate_results_for_semester
    stats = generate_results_for_semester(semester)
    log_audit(request, 'generate_results', 'semester', semester.semester_id, new_value=stats)
    return Response({'message': 'Results generated.', **stats})


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_result(request):
    serializer = ResultSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAdmin])
def publish_result(request, result_id):
    try:
        result = Result.objects.select_related('student', 'semester').get(result_id=result_id)
    except Result.DoesNotExist:
        return Response({'error': 'Result not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not ResultApproval.objects.filter(result=result).exists():
        return Response({'error': 'Result must be approved before publishing.'}, status=status.HTTP_400_BAD_REQUEST)

    result.is_published = True
    result.published_date = timezone.now().date()
    result.published_by = request.user
    result.save(update_fields=['is_published', 'published_date', 'published_by'])
    _sync_student_cgpa(result.student)

    from enrollments.promotion import promote_student_after_published_result
    promo = promote_student_after_published_result(
        result.student, result.semester, performed_by=request.user,
    )
    log_audit(request, 'publish_result', 'result', result.result_id, new_value={'student_id': result.student_id})
    return Response({'message': 'Result published.', 'promotion': promo})


@api_view(['POST'])
@permission_classes([IsAuthenticated, require_any_permission(
    'examinations.view_examination', 'examinations.create_examination',
    'examinations.enter_marks', 'examinations.view_marks',
)])
def compute_section_grades(request, section_id):
    try:
        section = Section.objects.select_related('faculty', 'course', 'semester').get(section_id=section_id)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.user_type == 'teacher':
        faculty = _get_faculty(request.user)
        if not faculty or section.faculty_id != faculty.faculty_id:
            return Response({'error': 'You can only compute grades for your own sections.'}, status=status.HTTP_403_FORBIDDEN)

    stats = _compute_section_final_grades(section)
    return Response({'message': 'Final grades computed.', **stats})


@api_view(['POST'])
@permission_classes([IsAdmin])
def unlock_section_marks(request, section_id):
    """Grant temporary marks edit access or unlock section marks until a datetime."""
    try:
        section = Section.objects.get(section_id=section_id)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)

    hours = int(request.data.get('hours', 24))
    faculty_id = request.data.get('faculty_id')
    student_id = request.data.get('student_id')
    exam_id = request.data.get('exam_id')
    reason = request.data.get('reason', '')

    section.marks_locked = False
    section.marks_unlock_until = timezone.now() + timedelta(hours=hours)
    section.save(update_fields=['marks_locked', 'marks_unlock_until'])

    if faculty_id:
        from faculty.models import Faculty
        faculty = Faculty.objects.filter(faculty_id=faculty_id).first()
        if faculty and student_id:
            MarksEditPermission.objects.create(
                section=section,
                student_id=student_id,
                examination_id=exam_id,
                granted_by=request.user,
                granted_to=faculty,
                expires_at=section.marks_unlock_until,
                reason=reason,
                request_status='approved',
                is_active=True,
                reviewed_at=timezone.now(),
            )

    log_audit(request, 'unlock_marks', 'section', section.section_id, new_value={'hours': hours, 'student_id': student_id})
    return Response({
        'message': f'Section marks unlocked for {hours} hours.',
        'marks_unlock_until': section.marks_unlock_until,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, require_any_permission(
    'examinations.view_examination', 'examinations.create_examination',
    'examinations.enter_marks', 'examinations.view_marks',
)])
def list_exam_schedules(request, exam_id):
    try:
        exam = Examination.objects.get(exam_id=exam_id)
    except Examination.DoesNotExist:
        return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)
    schedules = ExamSchedule.objects.filter(exam=exam).select_related('invigilator')
    return Response(ExamScheduleSerializer(schedules, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, require_any_permission(
    'examinations.view_examination', 'examinations.create_examination',
    'examinations.enter_marks', 'examinations.view_marks',
)])
def request_marks_edit(request):
    if not user_has_permission(request.user, 'examinations.request_marks_edit'):
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    faculty = _get_faculty(request.user)
    if not faculty:
        return Response({'error': 'Faculty profile required.'}, status=status.HTTP_403_FORBIDDEN)

    section_id = request.data.get('section_id')
    student_id = request.data.get('student_id')
    exam_id = request.data.get('exam_id')
    reason = request.data.get('reason', '')
    hours = int(request.data.get('hours', 48))

    if not section_id or not student_id or not exam_id:
        return Response({'error': 'section_id, student_id, and exam_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        section = Section.objects.get(section_id=section_id, faculty=faculty)
        student = Student.objects.get(student_id=student_id)
        exam = Examination.objects.select_related('exam_type', 'semester').get(exam_id=exam_id, section=section)
    except (Section.DoesNotExist, Student.DoesNotExist, Examination.DoesNotExist):
        return Response({'error': 'Invalid section, student, or exam.'}, status=status.HTTP_404_NOT_FOUND)

    allowed, lock_reason = can_edit_exam_marks(exam, request.user, student_id)
    if allowed:
        return Response({'error': 'Marks are already editable for this student and exam.'}, status=status.HTTP_400_BAD_REQUEST)

    if MarksEditPermission.objects.filter(
        section=section, student=student, examination=exam,
        granted_to=faculty, request_status='pending',
    ).exists():
        return Response({'error': 'A pending request already exists for this student and exam.'}, status=status.HTTP_400_BAD_REQUEST)

    perm = MarksEditPermission.objects.create(
        section=section,
        student=student,
        examination=exam,
        granted_by=request.user,
        granted_to=faculty,
        expires_at=timezone.now() + timedelta(hours=hours),
        reason=reason or lock_reason,
        request_status='pending',
        is_active=False,
    )
    log_audit(request, 'request_marks_edit', 'marks_edit_permission', perm.permission_id, new_value={
        'student_id': student_id, 'exam_id': exam_id,
    })
    return Response(MarksEditPermissionSerializer(perm).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_marks_edit_requests(request):
    qs = MarksEditPermission.objects.select_related(
        'section', 'section__course', 'student', 'student__user',
        'granted_to', 'granted_to__user', 'examination',
    ).order_by('-created_at')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(request_status=status_filter)
    return Response(MarksEditPermissionSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def review_marks_edit_request(request, permission_id):
    if not user_has_permission(request.user, 'examinations.approve_marks_edit'):
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        perm = MarksEditPermission.objects.select_related('section', 'student').get(permission_id=permission_id)
    except MarksEditPermission.DoesNotExist:
        return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action')
    if action not in ('approve', 'reject'):
        return Response({'error': 'action must be approve or reject.'}, status=status.HTTP_400_BAD_REQUEST)

    if perm.request_status != 'pending':
        return Response({'error': 'Request already reviewed.'}, status=status.HTTP_400_BAD_REQUEST)

    perm.review_notes = request.data.get('review_notes', '')
    perm.reviewed_at = timezone.now()
    if action == 'approve':
        hours = int(request.data.get('hours', 48))
        perm.request_status = 'approved'
        perm.is_active = True
        perm.expires_at = timezone.now() + timedelta(hours=hours)
    else:
        perm.request_status = 'rejected'
        perm.is_active = False
    perm.save()
    log_audit(request, f'{action}_marks_edit', 'marks_edit_permission', perm.permission_id)
    return Response(MarksEditPermissionSerializer(perm).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def approve_result(request, result_id):
    try:
        result = Result.objects.get(result_id=result_id)
    except Result.DoesNotExist:
        return Response({'error': 'Result not found.'}, status=status.HTTP_404_NOT_FOUND)

    if hasattr(result, 'approval'):
        return Response({'error': 'Result already approved.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = ResultApprovalSerializer(data={
        'result': result.result_id,
        'approved_by': request.user.pk,
        'remarks': request.data.get('remarks', '')
    })
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)