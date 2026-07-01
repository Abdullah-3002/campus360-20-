from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from accounts.permissions import IsAdmin, IsStudent
from academics.models import Semester
from sections.models import Section
from students.models import Student
from .models import Enrollment, CourseRegistration
from .serializers import EnrollmentSerializer, CourseRegistrationSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_enrollments(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can access this.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'No student record found.'}, status=status.HTTP_404_NOT_FOUND)
    enrollments = Enrollment.objects.select_related('semester').filter(student=student)
    return Response(EnrollmentSerializer(enrollments, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_courses(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can register courses.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'No student record found.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        current_semester = Semester.objects.get(is_current=True)
    except Semester.DoesNotExist:
        return Response({'error': 'No active semester found.'}, status=status.HTTP_400_BAD_REQUEST)

    section_ids = request.data.get('section_ids', [])
    if not section_ids:
        return Response({'error': 'No sections provided.'}, status=status.HTTP_400_BAD_REQUEST)

    enrollment, _ = Enrollment.objects.get_or_create(
        student=student, semester=current_semester
    )

    registered = []
    errors = []

    for section_id in section_ids:
        try:
            section = Section.objects.select_related('course').get(section_id=section_id, is_active=True)
        except Section.DoesNotExist:
            errors.append(f"Section {section_id} not found or inactive.")
            continue

        if section.enrolled_count >= section.max_capacity:
            errors.append(f"{section.course.course_code} Section {section.section_name} is full.")
            continue

        if CourseRegistration.objects.filter(enrollment=enrollment, course=section.course).exists():
            errors.append(f"{section.course.course_code} is already registered.")
            continue

        reg = CourseRegistration.objects.create(
            enrollment=enrollment,
            course=section.course,
            section=section,
            student=student,
        )
        section.enrolled_count += 1
        section.save(update_fields=['enrolled_count'])
        registered.append(reg)

    enrollment.total_credit_hours_registered = sum(
        r.course.credit_hours for r in CourseRegistration.objects.filter(
            enrollment=enrollment, status='registered'
        )
    )
    enrollment.save(update_fields=['total_credit_hours_registered'])

    return Response({
        'registered': CourseRegistrationSerializer(registered, many=True).data,
        'errors': errors,
    }, status=status.HTTP_201_CREATED if registered else status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def drop_course(request, registration_id):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can drop courses.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        reg = CourseRegistration.objects.select_related('section', 'enrollment__semester').get(
            registration_id=registration_id,
            student__user=request.user,
            status='registered'
        )
    except CourseRegistration.DoesNotExist:
        return Response({'error': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

    reg.status = 'dropped'
    reg.dropped_date = timezone.now().date()
    reg.drop_reason = request.data.get('drop_reason', '')
    reg.save(update_fields=['status', 'dropped_date', 'drop_reason'])

    reg.section.enrolled_count = max(0, reg.section.enrolled_count - 1)
    reg.section.save(update_fields=['enrolled_count'])

    return Response({'message': f'{reg.course.course_code} dropped successfully.'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_enrollments(request):
    regs = CourseRegistration.objects.select_related(
        'student', 'student__user', 'student__program', 'student__program__department',
        'course', 'section', 'enrollment__semester',
    ).filter(status='registered')

    dept = request.query_params.get('department')
    if dept:
        regs = regs.filter(student__program__department__department_id=dept)
    program = request.query_params.get('program')
    if program:
        regs = regs.filter(student__program__program_id=program)
    course = request.query_params.get('course')
    if course:
        regs = regs.filter(course__course_id=course)

    student_ids = regs.values_list('student_id', flat=True).distinct()
    items = []
    for reg in regs.order_by('student__registration_number', 'course__course_code'):
        items.append({
            'registration_id': reg.registration_id,
            'registration_number': reg.student.registration_number,
            'student_name': reg.student.user.username,
            'program_name': reg.student.program.program_name,
            'course_code': reg.course.course_code,
            'course_name': reg.course.course_name,
            'section_name': reg.section.section_name if reg.section else '',
            'semester_name': reg.enrollment.semester.semester_name,
            'status': reg.status,
            'credit_hours': reg.course.credit_hours,
        })

    return Response({
        'stats': {
            'total_registrations': len(items),
            'unique_students': len(set(student_ids)),
            'courses_count': regs.values('course_id').distinct().count(),
        },
        'enrollments': items,
    })
