from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin
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
    students = Student.objects.select_related('user', 'program').all()
    status_filter = request.query_params.get('status')
    if status_filter:
        students = students.filter(status=status_filter)
    return Response(StudentSerializer(students, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_student(request, student_id):
    try:
        student = Student.objects.select_related('user', 'program', 'profile').get(student_id=student_id)
        return Response(StudentSerializer(student).data)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)


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