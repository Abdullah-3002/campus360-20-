from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin, IsAdminOrTeacher
from students.models import Student
from .models import ExamType, Examination, ExamSchedule, Grade, Marks, FinalGrade, Result, ResultApproval
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

@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def list_marks(request, exam_id):
    marks = Marks.objects.select_related('student', 'exam').filter(exam__exam_id=exam_id)
    return Response(MarksSerializer(marks, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def enter_marks(request, exam_id):
    try:
        exam = Examination.objects.get(exam_id=exam_id)
    except Examination.DoesNotExist:
        return Response({'error': 'Examination not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        faculty = request.user.faculty_profile
    except Exception:
        return Response({'error': 'Only faculty can enter marks.'}, status=status.HTTP_403_FORBIDDEN)

    marks_data = request.data.get('marks', [])
    created = []
    errors  = []

    for entry in marks_data:
        entry['exam'] = exam_id
        entry['entered_by'] = faculty.faculty_id
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
        marks = Marks.objects.get(marks_id=marks_id)
    except Marks.DoesNotExist:
        return Response({'error': 'Marks record not found.'}, status=status.HTTP_404_NOT_FOUND)

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

    from django.utils import timezone
    result.is_published = True
    result.published_date = timezone.now().date()
    result.published_by = request.user
    result.save(update_fields=['is_published', 'published_date', 'published_by'])
    return Response({'message': 'Result published.'})


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