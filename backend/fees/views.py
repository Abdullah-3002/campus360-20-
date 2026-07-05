import uuid
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import require_permission, require_any_permission
from students.models import Student
from .models import FeeStructure, Challan, Payment, Scholarship
from .serializers import FeeStructureSerializer, ChallanSerializer, PaymentSerializer, ScholarshipSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated, require_any_permission('fees.view_fees', 'fees.manage_fees')])
def list_fee_structures(request):
    structures = FeeStructure.objects.select_related('program').all()
    program = request.query_params.get('program')
    if program:
        structures = structures.filter(program__program_id=program)
    return Response(FeeStructureSerializer(structures, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, require_permission('fees.manage_fees')])
def create_fee_structure(request):
    serializer = FeeStructureSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, require_permission('fees.view_own_fees')])
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
@permission_classes([IsAuthenticated, require_permission('fees.manage_fees')])
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
@permission_classes([IsAuthenticated, require_permission('fees.manage_fees')])
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
@permission_classes([IsAuthenticated, require_permission('fees.manage_fees')])
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
@permission_classes([IsAuthenticated, require_permission('fees.manage_fees')])
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


@api_view(['GET'])
@permission_classes([IsAuthenticated, require_permission('fees.manage_fees')])
def list_payments(request):
    qs = Payment.objects.select_related('student', 'challan', 'verified_by').order_by('-created_at')
    verified = request.query_params.get('verified')
    if verified == 'true':
        qs = qs.filter(verified_by__isnull=False)
    elif verified == 'false':
        qs = qs.filter(verified_by__isnull=True)
    return Response(PaymentSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, require_permission('fees.manage_fees')])
def verify_payment(request, payment_id):
    try:
        payment = Payment.objects.select_related('challan').get(payment_id=payment_id)
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)
    if payment.verified_by_id:
        return Response({'error': 'Payment already verified.'}, status=status.HTTP_400_BAD_REQUEST)

    payment.verified_by = request.user
    payment.remarks = request.data.get('remarks', payment.remarks)
    payment.save(update_fields=['verified_by', 'remarks'])

    challan = payment.challan
    if challan.amount_paid >= challan.total_amount:
        challan.status = 'paid'
    else:
        challan.status = 'partial'
    challan.save(update_fields=['status'])

    from accounts.audit import log_audit
    log_audit(request, 'verify_payment', 'payment', payment.payment_id)
    return Response(PaymentSerializer(payment).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, require_permission('fees.manage_fees')])
def generate_semester_challans(request):
    """Generate fee challans for all active students in a semester."""
    semester_id = request.data.get('semester_id')
    sem_num = request.data.get('semester_number')
    if not semester_id:
        return Response({'error': 'semester_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    from academics.models import Semester
    try:
        semester = Semester.objects.get(semester_id=semester_id)
    except Semester.DoesNotExist:
        return Response({'error': 'Semester not found.'}, status=status.HTTP_404_NOT_FOUND)

    from datetime import timedelta
    created = 0
    skipped = 0
    for student in Student.objects.filter(status='active').select_related('program'):
        sn = sem_num or student.current_semester
        if Challan.objects.filter(student=student, semester=semester).exists():
            skipped += 1
            continue
        fee_structure = FeeStructure.objects.filter(
            program=student.program, semester_number=sn, fee_type='semester_fee',
        ).order_by('-effective_from').first()
        amount = fee_structure.amount if fee_structure else (student.program.fee_per_semester or 75000)
        Challan.objects.create(
            challan_number=f"CH-{timezone.now().year}-{str(uuid.uuid4().int)[:6]}",
            student=student,
            semester=semester,
            due_date=timezone.now().date() + timedelta(days=30),
            total_amount=amount,
            generated_by=request.user,
        )
        created += 1

    from accounts.audit import log_audit
    log_audit(request, 'generate_challans', 'semester', semester.semester_id, new_value={'created': created})
    return Response({'message': f'Generated {created} challans.', 'created': created, 'skipped': skipped})