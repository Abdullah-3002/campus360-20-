import uuid
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin
from students.models import Student
from .models import FeeStructure, Challan, Payment, Scholarship
from .serializers import FeeStructureSerializer, ChallanSerializer, PaymentSerializer, ScholarshipSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_fee_structures(request):
    structures = FeeStructure.objects.select_related('program').all()
    program = request.query_params.get('program')
    if program:
        structures = structures.filter(program__program_id=program)
    return Response(FeeStructureSerializer(structures, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_fee_structure(request):
    serializer = FeeStructureSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_challans(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can access this.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Student record not found.'}, status=status.HTTP_404_NOT_FOUND)
    challans = Challan.objects.filter(student=student).select_related('semester')
    return Response(ChallanSerializer(challans, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def generate_challan(request):
    serializer = ChallanSerializer(data=request.data)
    if serializer.is_valid():
        challan_number = f"CH-{timezone.now().year}-{str(uuid.uuid4().int)[:6]}"
        serializer.save(
            challan_number=challan_number,
            generated_by=request.user
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_challans(request):
    challans = Challan.objects.select_related('student', 'semester').all()
    student = request.query_params.get('student')
    status_filter = request.query_params.get('status')
    if student:
        challans = challans.filter(student__student_id=student)
    if status_filter:
        challans = challans.filter(status=status_filter)
    return Response(ChallanSerializer(challans, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def record_payment(request):
    challan_id = request.data.get('challan')
    try:
        challan = Challan.objects.get(challan_id=challan_id)
    except Challan.DoesNotExist:
        return Response({'error': 'Challan not found.'}, status=status.HTTP_404_NOT_FOUND)

    receipt_number = f"RCP-{timezone.now().year}-{str(uuid.uuid4().int)[:6]}"
    serializer = PaymentSerializer(data=request.data)
    if serializer.is_valid():
        payment = serializer.save(
            receipt_number=receipt_number,
            recorded_by=request.user
        )
        challan.amount_paid += payment.amount
        if challan.amount_paid >= challan.total_amount:
            challan.status = 'paid'
        else:
            challan.status = 'partial'
        challan.save(update_fields=['amount_paid', 'status'])
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def scholarships(request):
    if request.method == 'GET':
        student = request.query_params.get('student')
        qs = Scholarship.objects.select_related('student', 'semester').filter(is_active=True)
        if student:
            qs = qs.filter(student__student_id=student)
        return Response(ScholarshipSerializer(qs, many=True).data)

    serializer = ScholarshipSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(awarded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)