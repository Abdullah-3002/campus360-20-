from rest_framework import status

from rest_framework.decorators import api_view, permission_classes

from rest_framework.permissions import IsAuthenticated

from rest_framework.response import Response

from accounts.permissions import IsAdmin, IsTeacher

from .models import Designation, Faculty, Staff, EmployeeProfile

from .serializers import (

    DesignationSerializer, FacultySerializer, FacultyCreateSerializer,

    StaffSerializer, StaffCreateSerializer, EmployeeProfileSerializer

)





# ── DESIGNATIONS ──────────────────────────────────────────────



@api_view(['GET'])

@permission_classes([IsAuthenticated])

def list_designations(request):

    return Response(DesignationSerializer(Designation.objects.all(), many=True).data)





@api_view(['POST'])

@permission_classes([IsAdmin])

def create_designation(request):

    serializer = DesignationSerializer(data=request.data)

    if serializer.is_valid():

        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





# ── FACULTY ───────────────────────────────────────────────────



@api_view(['GET'])

@permission_classes([IsAuthenticated])

def list_faculty(request):

    faculty = Faculty.objects.select_related(

        'user', 'department', 'designation', 'program'

    ).all().order_by('employee_code')

    dept = request.query_params.get('department')

    if dept:

        faculty = faculty.filter(department__department_id=dept)

    status_filter = request.query_params.get('status')

    if status_filter:

        faculty = faculty.filter(status=status_filter)

    return Response(FacultySerializer(faculty, many=True).data)





@api_view(['POST'])

@permission_classes([IsAdmin])

def create_faculty(request):

    serializer = FacultyCreateSerializer(data=request.data)

    if serializer.is_valid():

        faculty = serializer.save()

        return Response(FacultySerializer(faculty).data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





@api_view(['GET', 'PUT', 'DELETE'])

@permission_classes([IsAdmin])

def faculty_detail(request, faculty_id):

    try:

        faculty = Faculty.objects.select_related(

            'user', 'department', 'designation', 'program'

        ).get(faculty_id=faculty_id)

    except Faculty.DoesNotExist:

        return Response({'error': 'Faculty member not found.'}, status=status.HTTP_404_NOT_FOUND)



    if request.method == 'GET':

        return Response(FacultySerializer(faculty).data)



    if request.method == 'PUT':

        allowed = {'status', 'designation', 'department', 'program', 'qualification', 'specialization'}

        data = {k: v for k, v in request.data.items() if k in allowed}

        serializer = FacultySerializer(faculty, data=data, partial=True)

        if serializer.is_valid():

            serializer.save()

            return Response(FacultySerializer(faculty).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



    user = faculty.user

    faculty.delete()

    user.delete()

    return Response({'message': 'Faculty member deleted.'})





@api_view(['GET'])

@permission_classes([IsAuthenticated])

def get_my_faculty_profile(request):

    if request.user.user_type != 'teacher':

        return Response({'error': 'Only teacher accounts can access this.'}, status=status.HTTP_403_FORBIDDEN)

    try:

        faculty = Faculty.objects.select_related('user', 'department', 'designation', 'program').get(user=request.user)

        return Response(FacultySerializer(faculty).data)

    except Faculty.DoesNotExist:

        return Response({'error': 'No faculty record found for this account.'}, status=status.HTTP_404_NOT_FOUND)





# ── STAFF ─────────────────────────────────────────────────────



@api_view(['GET'])

@permission_classes([IsAdmin])

def list_staff(request):

    staff = Staff.objects.select_related('user', 'department', 'designation').filter(status='active')

    return Response(StaffSerializer(staff, many=True).data)





@api_view(['POST'])

@permission_classes([IsAdmin])

def create_staff(request):

    serializer = StaffCreateSerializer(data=request.data)

    if serializer.is_valid():

        staff = serializer.save()

        return Response(StaffSerializer(staff).data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





@api_view(['GET', 'PUT', 'DELETE'])

@permission_classes([IsAdmin])

def staff_detail(request, staff_id):

    try:

        staff = Staff.objects.select_related('user', 'department', 'designation').get(staff_id=staff_id)

    except Staff.DoesNotExist:

        return Response({'error': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)



    if request.method == 'GET':

        return Response(StaffSerializer(staff).data)



    if request.method == 'PUT':

        serializer = StaffSerializer(staff, data=request.data, partial=True)

        if serializer.is_valid():

            serializer.save()

            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



    staff.status = 'resigned'

    staff.save(update_fields=['status'])

    return Response({'message': 'Staff member marked as resigned.'})





# ── EMPLOYEE PROFILE ──────────────────────────────────────────



@api_view(['GET', 'PUT'])

@permission_classes([IsAuthenticated])

def employee_profile(request):

    user = request.user

    if user.user_type not in ['teacher', 'staff']:

        return Response({'error': 'Only faculty and staff can access this.'}, status=status.HTTP_403_FORBIDDEN)



    employee_type = 'faculty' if user.user_type == 'teacher' else 'staff'

    try:

        employee_id = Faculty.objects.get(user=user).faculty_id if employee_type == 'faculty' else Staff.objects.get(user=user).staff_id

    except (Faculty.DoesNotExist, Staff.DoesNotExist):

        return Response({'error': 'No employee record found.'}, status=status.HTTP_404_NOT_FOUND)



    profile, _ = EmployeeProfile.objects.get_or_create(

        employee_id=employee_id, employee_type=employee_type

    )



    if request.method == 'GET':

        return Response(EmployeeProfileSerializer(profile).data)



    serializer = EmployeeProfileSerializer(profile, data=request.data, partial=True)

    if serializer.is_valid():

        serializer.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





@api_view(['POST'])

@permission_classes([IsTeacher])

def complete_teacher_onboarding(request):

    """Teacher completes profile after admin creates credentials."""

    try:

        faculty = Faculty.objects.select_related('user', 'department', 'designation').get(user=request.user)

    except Faculty.DoesNotExist:

        return Response({'error': 'No faculty record found.'}, status=status.HTTP_404_NOT_FOUND)



    required = ['qualification', 'specialization', 'office_hours']

    for field in required:

        val = request.data.get(field, getattr(faculty, field, ''))

        if not str(val).strip():

            return Response({field: 'This field is required to complete onboarding.'}, status=status.HTTP_400_BAD_REQUEST)



    faculty.qualification = request.data.get('qualification', faculty.qualification)

    faculty.specialization = request.data.get('specialization', faculty.specialization)

    faculty.office_floor = request.data.get('office_floor', faculty.office_floor)

    faculty.office_hours = request.data.get('office_hours', faculty.office_hours)

    if request.data.get('department'):

        faculty.department_id = request.data['department']

    if request.data.get('designation'):

        faculty.designation_id = request.data['designation']

    faculty.profile_completed = True

    faculty.save()



    profile, _ = EmployeeProfile.objects.get_or_create(

        employee_id=faculty.faculty_id, employee_type='faculty'

    )

    emp_fields = ['cnic', 'date_of_birth', 'gender', 'phone_number',

                  'emergency_contact_name', 'emergency_contact_phone',

                  'emergency_contact_relation', 'current_address', 'permanent_address']

    for f in emp_fields:

        if request.data.get(f):

            setattr(profile, f, request.data[f])

    profile.save()



    return Response({

        'message': 'Profile completed successfully.',

        'faculty': FacultySerializer(faculty).data,

    })

