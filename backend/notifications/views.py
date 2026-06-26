from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from accounts.permissions import IsAdmin
from .models import NotificationType, Notification, Announcement
from .serializers import NotificationTypeSerializer, NotificationSerializer, AnnouncementSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_notifications(request):
    notifications = Notification.objects.filter(recipient=request.user)
    unread_only = request.query_params.get('unread')
    if unread_only == 'true':
        notifications = notifications.filter(is_read=False)
    return Response(NotificationSerializer(notifications, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, notification_id):
    try:
        notification = Notification.objects.get(notification_id=notification_id, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
    notification.is_read = True
    notification.read_at = timezone.now()
    notification.save(update_fields=['is_read', 'read_at'])
    return Response({'message': 'Marked as read.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(
        is_read=True, read_at=timezone.now()
    )
    return Response({'message': 'All notifications marked as read.'})


@api_view(['POST'])
@permission_classes([IsAdmin])
def send_notification(request):
    data = {**request.data, 'recipient': request.data.get('recipient')}
    serializer = NotificationSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_announcements(request):
    qs = Announcement.objects.filter(is_active=True)
    audience = request.query_params.get('audience')
    if audience:
        qs = qs.filter(target_audience__in=[audience, 'all'])
    return Response(AnnouncementSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_announcement(request):
    serializer = AnnouncementSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdmin])
def announcement_detail(request, announcement_id):
    try:
        announcement = Announcement.objects.get(announcement_id=announcement_id)
    except Announcement.DoesNotExist:
        return Response({'error': 'Announcement not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AnnouncementSerializer(announcement).data)

    if request.method == 'PUT':
        serializer = AnnouncementSerializer(announcement, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    announcement.is_active = False
    announcement.save(update_fields=['is_active'])
    return Response({'message': 'Announcement deactivated.'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notification_types(request):
    return Response(NotificationTypeSerializer(NotificationType.objects.all(), many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_notification_type(request):
    serializer = NotificationTypeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)