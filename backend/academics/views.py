from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin
from .models import Department, DegreeProgram, Semester, Course, ProgramCourse
from .serializers import (
    DepartmentSerializer, DegreeProgramSerializer,
    SemesterSerializer, CourseSerializer, ProgramCourseSerializer
)


# ── DEPARTMENTS ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_departments(request):
    departments = Department.objects.filter(is_active=True)
    return Response(DepartmentSerializer(departments, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_department(request):
    serializer = DepartmentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdmin])
def department_detail(request, department_id):
    try:
        department = Department.objects.get(department_id=department_id)
    except Department.DoesNotExist:
        return Response({'error': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(DepartmentSerializer(department).data)

    if request.method == 'PUT':
        serializer = DepartmentSerializer(department, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    department.is_active = False
    department.save(update_fields=['is_active'])
    return Response({'message': 'Department deactivated.'}, status=status.HTTP_200_OK)


# ── DEGREE PROGRAMS ────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_programs(request):
    programs = DegreeProgram.objects.select_related('department').filter(is_active=True)
    return Response(DegreeProgramSerializer(programs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_program(request):
    serializer = DegreeProgramSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdmin])
def program_detail(request, program_id):
    try:
        program = DegreeProgram.objects.select_related('department').get(program_id=program_id)
    except DegreeProgram.DoesNotExist:
        return Response({'error': 'Program not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(DegreeProgramSerializer(program).data)

    if request.method == 'PUT':
        serializer = DegreeProgramSerializer(program, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    program.is_active = False
    program.save(update_fields=['is_active'])
    return Response({'message': 'Program deactivated.'}, status=status.HTTP_200_OK)


# ── SEMESTERS ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_semesters(request):
    semesters = Semester.objects.all().order_by('-academic_year', '-semester_type')
    return Response(SemesterSerializer(semesters, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_semester(request):
    serializer = SemesterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAdmin])
def semester_detail(request, semester_id):
    try:
        semester = Semester.objects.get(semester_id=semester_id)
    except Semester.DoesNotExist:
        return Response({'error': 'Semester not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(SemesterSerializer(semester).data)

    serializer = SemesterSerializer(semester, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_semester(request):
    try:
        semester = Semester.objects.get(is_current=True)
        return Response(SemesterSerializer(semester).data)
    except Semester.DoesNotExist:
        return Response({'error': 'No current semester set.'}, status=status.HTTP_404_NOT_FOUND)


# ── COURSES ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_courses(request):
    courses = Course.objects.select_related('department').filter(is_active=True)
    dept = request.query_params.get('department')
    if dept:
        courses = courses.filter(department__department_id=dept)
    return Response(CourseSerializer(courses, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_course(request):
    serializer = CourseSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdmin])
def course_detail(request, course_id):
    try:
        course = Course.objects.select_related('department').get(course_id=course_id)
    except Course.DoesNotExist:
        return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(CourseSerializer(course).data)

    if request.method == 'PUT':
        serializer = CourseSerializer(course, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    course.is_active = False
    course.save(update_fields=['is_active'])
    return Response({'message': 'Course deactivated.'}, status=status.HTTP_200_OK)


# ── PROGRAM COURSES ───────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_program_courses(request, program_id):
    courses = ProgramCourse.objects.select_related('course', 'program').filter(
        program__program_id=program_id
    ).order_by('semester_number')
    return Response(ProgramCourseSerializer(courses, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def add_program_course(request):
    serializer = ProgramCourseSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)