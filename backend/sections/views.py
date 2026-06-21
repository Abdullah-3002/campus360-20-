from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin, IsAdminOrTeacher
from .models import Section, SectionSchedule
from .serializers import SectionSerializer, SectionCreateSerializer, SectionScheduleSerializer


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
    sections = Section.objects.select_related('course', 'semester').filter(
        faculty__user=request.user, is_active=True
    )
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