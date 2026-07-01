from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin, IsAdminOrTeacher
from .models import Section, SectionSchedule, BatchSection
from .serializers import SectionSerializer, SectionCreateSerializer, SectionScheduleSerializer, BatchSectionSerializer
from enrollments.models import CourseRegistration


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_sections(request):
    sections = Section.objects.select_related('course', 'semester', 'faculty__user').filter(is_active=True)
    semester = request.query_params.get('semester')
    course   = request.query_params.get('course')
    faculty  = request.query_params.get('faculty')
    if semester:
        sections = sections.filter(semester__semester_id=semester)
    if course:
        sections = sections.filter(course__course_id=course)
    if faculty:
        sections = sections.filter(faculty__faculty_id=faculty)
    return Response(SectionSerializer(sections, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_section(request):
    serializer = SectionCreateSerializer(data=request.data)
    if serializer.is_valid():
        section = serializer.save()
        return Response(SectionSerializer(section).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminOrTeacher])
def section_detail(request, section_id):
    try:
        section = Section.objects.select_related('course', 'semester', 'faculty__user').get(section_id=section_id)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(SectionSerializer(section).data)

    if request.method == 'PUT':
        serializer = SectionCreateSerializer(section, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(SectionSerializer(section).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    section.is_active = False
    section.save(update_fields=['is_active'])
    return Response({'message': 'Section deactivated.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_sections(request):
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can access this.'}, status=status.HTTP_403_FORBIDDEN)
    sections = Section.objects.select_related('course', 'semester', 'course__department').filter(
        faculty__user=request.user
    )
    active_only = request.query_params.get('active', 'true')
    if active_only == 'true':
        sections = sections.filter(is_active=True)
    elif active_only == 'false':
        sections = sections.filter(is_active=False)
    program_id = request.query_params.get('program_id')
    batch_year = request.query_params.get('batch_year')
    if program_id:
        from enrollments.models import CourseRegistration
        section_ids = CourseRegistration.objects.filter(
            student__program_id=program_id, status='registered'
        ).values_list('section_id', flat=True).distinct()
        sections = sections.filter(section_id__in=section_ids)
    if batch_year:
        from enrollments.models import CourseRegistration
        section_ids = CourseRegistration.objects.filter(
            student__batch_year=batch_year, status='registered'
        ).values_list('section_id', flat=True).distinct()
        sections = sections.filter(section_id__in=section_ids)
    return Response(SectionSerializer(sections, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def add_schedule(request, section_id):
    try:
        section = Section.objects.get(section_id=section_id)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = SectionScheduleSerializer(data={**request.data, 'section': section.section_id})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_batch_sections(request):
    if request.method == 'GET':
        batch_sections = BatchSection.objects.select_related('program').all()
        program = request.query_params.get('program')
        batch = request.query_params.get('batch')
        if program:
            batch_sections = batch_sections.filter(program__program_id=program)
        if batch:
            batch_sections = batch_sections.filter(batch_year=batch)
        return Response(BatchSectionSerializer(batch_sections, many=True).data)

    if request.method == 'POST':
        if request.user.user_type != 'admin':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = BatchSectionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def delete_batch_section(request, batch_section_id):
    try:
        batch_section = BatchSection.objects.get(batch_section_id=batch_section_id)
        batch_section.delete()
        return Response({'message': 'Batch section deleted successfully.'})
    except BatchSection.DoesNotExist:
        return Response({'error': 'Batch section not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_section_students(request, section_id):
    registrations = CourseRegistration.objects.filter(
        section_id=section_id,
        status='registered'
    ).select_related('student__user')
    data = []
    for reg in registrations:
        data.append({
            'registration_id': reg.registration_id,
            'student_id': reg.student.student_id,
            'registration_number': reg.student.registration_number,
            'username': reg.student.user.username,
            'email': reg.student.user.email,
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def submit_final_marks(request, section_id):
    """Lock section marks and deactivate section after teacher submits final marks."""
    try:
        section = Section.objects.select_related('faculty').get(section_id=section_id)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.user_type == 'teacher':
        if section.faculty.user_id != request.user.user_id:
            return Response({'error': 'You can only submit marks for your own sections.'}, status=status.HTTP_403_FORBIDDEN)

    from examinations.views import _compute_section_final_grades
    grade_stats = _compute_section_final_grades(section)

    section.marks_locked = True
    section.is_active = False
    section.save(update_fields=['marks_locked', 'is_active'])
    return Response({
        'message': 'Final marks submitted. Section is now locked and inactive.',
        'section_id': section_id,
        **grade_stats,
    })
