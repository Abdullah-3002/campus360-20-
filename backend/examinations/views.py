from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin, IsAdminOrTeacher
from students.models import Student
from sections.models import Section
from enrollments.models import CourseRegistration
from .models import ExamType, Examination, ExamSchedule, Grade, Marks, FinalGrade, Result, ResultApproval, MarksEditPermission
from .serializers import (
    ExamTypeSerializer, ExaminationSerializer, ExamScheduleSerializer,
    GradeSerializer, MarksSerializer, FinalGradeSerializer,
    ResultSerializer, ResultApprovalSerializer
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
@permission_classes([IsAdminOrTeacher])
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
@permission_classes([IsAdminOrTeacher])
def create_examination(request):
    serializer = ExaminationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminOrTeacher])
def examination_detail(request, exam_id):
    try:
        exam = Examination.objects.select_related('course', 'exam_type').get(exam_id=exam_id)
    except Examination.DoesNotExist:
        return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ExaminationSerializer(exam).data)

    if request.method == 'PUT':
        serializer = ExaminationSerializer(exam, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
    if user.user_type == 'admin':
        return True
    if not section.marks_locked:
        return True
    if section.marks_unlock_until and section.marks_unlock_until > timezone.now():
        return True
    faculty = _get_faculty(user)
    if not faculty:
        return False
    perms = MarksEditPermission.objects.filter(
        section=section, granted_to=faculty, is_active=True,
        expires_at__gt=timezone.now(),
    )
    if student_id:
        perms = perms.filter(Q(student_id=student_id) | Q(student__isnull=True))
    return perms.exists()


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
@permission_classes([IsAdminOrTeacher])
def list_marks(request, exam_id):
    marks = Marks.objects.select_related('student', 'exam').filter(exam__exam_id=exam_id)
    return Response(MarksSerializer(marks, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def enter_marks(request, exam_id):
    try:
        exam = Examination.objects.select_related('section').get(exam_id=exam_id)
    except Examination.DoesNotExist:
        return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)

    faculty = _get_faculty(request.user)
    if request.user.user_type == 'teacher' and not faculty:
        return Response({'error': 'Only faculty can enter marks.'}, status=status.HTTP_403_FORBIDDEN)
    if not faculty:
        faculty = exam.section.faculty

    if not _can_edit_section_marks(exam.section, request.user):
        return Response({'error': 'Marks are locked for this section. Contact admin for edit permission.'}, status=status.HTTP_403_FORBIDDEN)

    marks_data = request.data.get('marks', [])
    created = []
    errors  = []

    for entry in marks_data:
        student_id = entry.get('student')
        if not _can_edit_section_marks(exam.section, request.user, student_id=student_id):
            errors.append({'student': student_id, 'error': 'Marks locked for this student.'})
            continue
        entry['exam'] = exam_id
        entry['entered_by'] = faculty.faculty_id if faculty else entry.get('entered_by')
        serializer = MarksSerializer(data=entry)
        if serializer.is_valid():
            serializer.save()
            created.append(serializer.data)
        else:
            errors.append(serializer.errors)

    return Response({'created': created, 'errors': errors}, status=status.HTTP_201_CREATED)


@api_view(['PUT'])
@permission_classes([IsAdminOrTeacher])
def update_marks(request, marks_id):
    try:
        marks = Marks.objects.select_related('exam__section').get(marks_id=marks_id)
    except Marks.DoesNotExist:
        return Response({'error': 'Marks record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not _can_edit_section_marks(marks.exam.section, request.user, student_id=marks.student_id):
        return Response({'error': 'Marks are locked for this section.'}, status=status.HTTP_403_FORBIDDEN)

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
    grades = FinalGrade.objects.select_related('course', 'semester', 'grade').filter(student=student)
    return Response(FinalGradeSerializer(grades, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_final_grade(request):
    serializer = FinalGradeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
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
        result = Result.objects.get(result_id=result_id)
    except Result.DoesNotExist:
        return Response({'error': 'Result not found.'}, status=status.HTTP_404_NOT_FOUND)

    result.is_published = True
    result.published_date = timezone.now().date()
    result.published_by = request.user
    result.save(update_fields=['is_published', 'published_date', 'published_by'])
    _sync_student_cgpa(result.student)
    return Response({'message': 'Result published.'})


@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
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
    reason = request.data.get('reason', '')

    section.marks_locked = False
    section.marks_unlock_until = timezone.now() + timedelta(hours=hours)
    section.save(update_fields=['marks_locked', 'marks_unlock_until'])

    if faculty_id:
        from faculty.models import Faculty
        faculty = Faculty.objects.filter(faculty_id=faculty_id).first()
        if faculty:
            MarksEditPermission.objects.create(
                section=section,
                student_id=student_id,
                granted_by=request.user,
                granted_to=faculty,
                expires_at=section.marks_unlock_until,
                reason=reason,
            )

    return Response({
        'message': f'Section marks unlocked for {hours} hours.',
        'marks_unlock_until': section.marks_unlock_until,
    })


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