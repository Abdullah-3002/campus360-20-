from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin
from enrollments.models import CourseRegistration
from .models import Student, StudentProfile
from .serializers import StudentSerializer, StudentCreateSerializer, StudentProfileSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_student_profile(request):
    if request.user.user_type != 'student':
        return Response(
            {'error': 'Only student accounts can access this endpoint.'},
            status=status.HTTP_403_FORBIDDEN
        )
    try:
        student = Student.objects.select_related('user', 'program', 'profile').get(user=request.user)
        return Response(StudentSerializer(student).data)
    except Student.DoesNotExist:
        return Response({'error': 'No student record found for this account.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_students(request):
    students = Student.objects.select_related('user', 'program', 'program__department').all()
    status_filter = request.query_params.get('status')
    if status_filter:
        students = students.filter(status=status_filter)
    dept = request.query_params.get('department')
    if dept:
        students = students.filter(program__department__department_id=dept)
    program = request.query_params.get('program')
    if program:
        students = students.filter(program__program_id=program)

    data = StudentSerializer(students, many=True).data
    return Response({
        'count': len(data),
        'students': data,
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_student(request, student_id):
    try:
        student = Student.objects.select_related(
            'user', 'program', 'program__department', 'profile', 'applicant'
        ).get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    payload = StudentSerializer(student).data
    payload['department_name'] = student.program.department.department_name
    if student.applicant_id:
        from admissions.models import ApplicantDocument, AcademicRecord
        from admissions.serializers import ApplicantDocumentSerializer, AcademicRecordSerializer
        payload['applicant_documents'] = ApplicantDocumentSerializer(
            ApplicantDocument.objects.filter(applicant=student.applicant), many=True
        ).data
        payload['academic_records'] = AcademicRecordSerializer(
            AcademicRecord.objects.filter(applicant=student.applicant), many=True
        ).data
        payload['applicant_profile'] = {
            'first_name': student.applicant.first_name,
            'last_name': student.applicant.last_name,
            'cnic': student.applicant.cnic,
            'phone': student.applicant.phone,
            'email': student.user.email,
        }
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_degree_progress(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can access this.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = Student.objects.select_related('program').get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'No student record found.'}, status=status.HTTP_404_NOT_FOUND)

    from academics.models import ProgramCourse
    curriculum = ProgramCourse.objects.filter(program=student.program).select_related('course')
    total_courses = curriculum.count()
    total_credits = sum(pc.course.credit_hours for pc in curriculum)

    completed_regs = CourseRegistration.objects.filter(
        student=student, status='completed',
    ).select_related('course')
    completed_course_ids = set(completed_regs.values_list('course_id', flat=True))
    completed_courses = len(completed_course_ids)
    earned_credits = sum(r.course.credit_hours for r in completed_regs)

    by_semester = {}
    for pc in curriculum.order_by('semester_number'):
        sem = pc.semester_number
        if sem not in by_semester:
            by_semester[sem] = {'total': 0, 'completed': 0, 'courses': []}
        done = pc.course_id in completed_course_ids
        by_semester[sem]['total'] += 1
        if done:
            by_semester[sem]['completed'] += 1
        by_semester[sem]['courses'].append({
            'course_code': pc.course.course_code,
            'course_name': pc.course.course_name,
            'credit_hours': pc.course.credit_hours,
            'completed': done,
        })

    pct = round((earned_credits / total_credits) * 100, 1) if total_credits else 0
    return Response({
        'registration_number': student.registration_number,
        'program': student.program.program_name,
        'current_semester': student.current_semester,
        'total_courses': total_courses,
        'completed_courses': completed_courses,
        'total_credit_hours': total_credits,
        'earned_credit_hours': earned_credits,
        'degree_completion_percent': pct,
        'semester_breakdown': by_semester,
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_student(request):
    serializer = StudentCreateSerializer(data=request.data)
    if serializer.is_valid():
        program    = serializer.validated_data['program']
        batch_year = serializer.validated_data['batch_year']

        count = Student.objects.filter(program=program, batch_year=batch_year).count() + 1
        registration_number = f"{program.program_code}-{batch_year}-{str(count).zfill(4)}"

        student = serializer.save(registration_number=registration_number)
        StudentProfile.objects.create(student=student)

        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_student_profile(request):
    if request.user.user_type != 'student':
        return Response(
            {'error': 'Only student accounts can access this endpoint.'},
            status=status.HTTP_403_FORBIDDEN
        )
    try:
        student = Student.objects.get(user=request.user)
        profile, _ = StudentProfile.objects.get_or_create(student=student)
    except Student.DoesNotExist:
        return Response({'error': 'No student record found for this account.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = StudentProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def update_student_status(request, student_id):
    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    allowed_fields = {'status', 'current_semester'}
    data = {k: v for k, v in request.data.items() if k in allowed_fields}

    if not data:
        return Response(
            {'error': 'Only status and current_semester can be updated here.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    for field, value in data.items():
        setattr(student, field, value)
    student.save(update_fields=list(data.keys()))

    return Response(StudentSerializer(student).data)
