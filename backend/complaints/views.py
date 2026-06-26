from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from accounts.permissions import IsAdmin
from .models import ComplaintCategory, Complaint, ComplaintAssignment, ComplaintLog, CommunicationThread, Message, Feedback
from .serializers import (
    ComplaintCategorySerializer, ComplaintSerializer, ComplaintAssignmentSerializer,
    ComplaintLogSerializer, CommunicationThreadSerializer, MessageSerializer,
    FeedbackSerializer
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_categories(request):
    return Response(ComplaintCategorySerializer(ComplaintCategory.objects.all(), many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_category(request):
    serializer = ComplaintCategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_complaint(request):
    serializer = ComplaintSerializer(data=request.data)
    if serializer.is_valid():
        complaint = serializer.save(submitted_by=request.user)
        ComplaintLog.objects.create(
            complaint=complaint,
            action_type='submitted',
            performed_by=request.user,
            new_status='pending'
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_complaints(request):
    complaints = Complaint.objects.select_related('category').filter(submitted_by=request.user)
    return Response(ComplaintSerializer(complaints, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_all_complaints(request):
    qs = Complaint.objects.select_related('category', 'submitted_by').all()
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    return Response(ComplaintSerializer(qs, many=True).data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def complaint_detail(request, complaint_id):
    try:
        complaint = Complaint.objects.select_related('category').get(complaint_id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ComplaintSerializer(complaint).data)

    if complaint.submitted_by != request.user and request.user.user_type != 'admin':
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    old_status = complaint.status
    serializer = ComplaintSerializer(complaint, data=request.data, partial=True)
    if serializer.is_valid():
        updated = serializer.save()
        if updated.status != old_status:
            ComplaintLog.objects.create(
                complaint=updated,
                action_type='updated',
                performed_by=request.user,
                previous_status=old_status,
                new_status=updated.status
            )
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_complaint(request, complaint_id):
    try:
        complaint = Complaint.objects.get(complaint_id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = {**request.data, 'complaint': complaint_id, 'assigned_by': request.user.pk}
    serializer = ComplaintAssignmentSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        complaint.status = 'assigned'
        complaint.save(update_fields=['status'])
        ComplaintLog.objects.create(
            complaint=complaint,
            action_type='assigned',
            performed_by=request.user,
            previous_status='pending',
            new_status='assigned'
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def complaint_thread(request, complaint_id):
    try:
        complaint = Complaint.objects.get(complaint_id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        try:
            thread = CommunicationThread.objects.prefetch_related('messages').get(complaint=complaint)
            return Response(CommunicationThreadSerializer(thread).data)
        except CommunicationThread.DoesNotExist:
            return Response({'error': 'No thread found.'}, status=status.HTTP_404_NOT_FOUND)

    thread, _ = CommunicationThread.objects.get_or_create(
        complaint=complaint,
        defaults={'subject': complaint.subject, 'created_by': request.user}
    )
    message = Message.objects.create(
        thread=thread,
        sender=request.user,
        message_text=request.data.get('message_text', '')
    )
    return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_feedback(request, complaint_id):
    """
    Submit feedback for a resolved complaint.
    Only the complaint submitter can give feedback.
    """
    try:
        complaint = Complaint.objects.get(complaint_id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Only the person who submitted the complaint can give feedback
    if complaint.submitted_by != request.user:
        return Response(
            {'error': 'You can only give feedback on your own complaints.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Optional: Only allow feedback on resolved/closed complaints
    if complaint.status not in ['resolved', 'closed']:
        return Response(
            {'error': 'Feedback can only be submitted for resolved or closed complaints.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = FeedbackSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(
            complaint=complaint,
            user=request.user
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_feedback(request, complaint_id):
    """
    Admin view to see all feedback for a complaint.
    """
    try:
        complaint = Complaint.objects.get(complaint_id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

    feedback = Feedback.objects.filter(complaint=complaint)
    return Response(FeedbackSerializer(feedback, many=True).data)