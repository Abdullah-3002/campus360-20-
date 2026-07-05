from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from accounts.permissions import IsAdmin
from students.models import Student
from academics.models import DegreeProgram, Semester
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
    now = timezone.now()
    qs = Announcement.objects.filter(is_active=True)
    qs = qs.filter(Q(expires_date__isnull=True) | Q(expires_date__gte=now))

    user_type = request.user.user_type
    if user_type == 'student':
        student = Student.objects.filter(user=request.user).first()
        if student:
            qs = qs.filter(
                Q(target_audience='all') |
                Q(target_audience='students') |
                Q(target_audience=f'batch_{student.batch_year}') |
                Q(target_program=student.program) |
                Q(target_semester__isnull=True)
            )
        else:
            qs = qs.filter(target_audience__in=['all', 'students'])
    elif user_type == 'teacher':
        qs = qs.filter(
            Q(target_audience='all') |
            Q(target_audience='faculty') |
            Q(target_audience='teachers') |
            Q(created_by=request.user)
        )
    # Admin sees all; filter own for admin dashboard optional
    if user_type == 'admin' and request.query_params.get('mine') == '1':
        qs = qs.filter(created_by=request.user)

    return Response(AnnouncementSerializer(qs.order_by('-created_at'), many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_announcement(request):
    if request.user.user_type not in ['admin', 'teacher']:
        return Response({'error': 'Permission denied. Only Admins and Teachers can create announcements.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy()

    if request.user.user_type == 'teacher':
        allowed_types = {'academic', 'general'}
        ann_type = data.get('announcement_type', 'general')
        if ann_type not in allowed_types:
            return Response(
                {'error': 'Teachers can only create academic or general announcements.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        from faculty.models import Faculty
        from sections.models import Section
        from academics.models import ProgramCourse
        try:
            faculty = Faculty.objects.get(user=request.user)
        except Faculty.DoesNotExist:
            return Response({'error': 'Faculty profile required.'}, status=status.HTTP_403_FORBIDDEN)
        taught_course_ids = Section.objects.filter(faculty=faculty, is_active=True).values_list('course_id', flat=True)
        allowed_program_ids = set(
            ProgramCourse.objects.filter(course_id__in=taught_course_ids).values_list('program_id', flat=True).distinct()
        )
        target_opt = data.get('target_audience_option') or data.get('target_audience') or 'students'
        if target_opt.startswith('program_'):
            prog_id = int(target_opt.split('_')[1])
            if prog_id not in allowed_program_ids:
                return Response(
                    {'error': 'You can only announce to programs linked to your assigned courses.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        data['target_audience'] = data.get('target_audience') or 'students'
    
    # Map context to content if sent
    if 'context' in data and 'content' not in data:
        data['content'] = data['context']

    # Parse target audience option
    target_opt = data.get('target_audience_option') or data.get('target_audience')
    if target_opt:
        if target_opt.startswith('batch_'):
            data['target_audience'] = target_opt
            data['target_program'] = None
            data['target_semester'] = None
        elif target_opt.startswith('program_'):
            prog_id = target_opt.split('_')[1]
            data['target_audience'] = 'specific_program'
            data['target_program'] = prog_id
            data['target_semester'] = None
        elif target_opt.startswith('semester_'):
            sem_id = target_opt.split('_')[1]
            data['target_audience'] = 'students'
            data['target_program'] = None
            data['target_semester'] = sem_id
        else:
            data['target_audience'] = target_opt

    serializer = AnnouncementSerializer(data=data)
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def announcement_detail(request, announcement_id):
    try:
        announcement = Announcement.objects.get(announcement_id=announcement_id)
    except Announcement.DoesNotExist:
        return Response({'error': 'Announcement not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Permission check for write operations
    if request.method in ['PUT', 'DELETE']:
        if request.user.user_type != 'admin' and announcement.created_by != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        return Response(AnnouncementSerializer(announcement).data)

    if request.method == 'PUT':
        data = request.data.copy()
        
        # Map context to content if sent
        if 'context' in data and 'content' not in data:
            data['content'] = data['context']

        # Parse target audience option
        target_opt = data.get('target_audience_option') or data.get('target_audience')
        if target_opt:
            if target_opt.startswith('batch_'):
                data['target_audience'] = target_opt
                data['target_program'] = None
                data['target_semester'] = None
            elif target_opt.startswith('program_'):
                prog_id = target_opt.split('_')[1]
                data['target_audience'] = 'specific_program'
                data['target_program'] = prog_id
                data['target_semester'] = None
            elif target_opt.startswith('semester_'):
                sem_id = target_opt.split('_')[1]
                data['target_audience'] = 'students'
                data['target_program'] = None
                data['target_semester'] = sem_id
            else:
                data['target_audience'] = target_opt

        serializer = AnnouncementSerializer(announcement, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE method: mark inactive or delete
    announcement.is_active = False
    announcement.save(update_fields=['is_active'])
    return Response({'message': 'Announcement deactivated.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_announcement_target_options(request):
    """Retrieve dynamic targeting options for announcements"""
    # 1. Get unique active student batch years
    batches = Student.objects.filter(status='active').values_list('batch_year', flat=True).distinct()
    
    options = [
        {'value': 'all', 'label': 'All'},
        {'value': 'students', 'label': 'All Students'},
        {'value': 'faculty', 'label': 'Teachers'},
    ]
    
    for b in sorted(batches):
        options.append({
            'value': f'batch_{b}',
            'label': f'Batch {b} Students'
        })
        
    # 2. Add Programs
    programs = DegreeProgram.objects.filter(is_active=True)
    for p in programs:
        options.append({
            'value': f'program_{p.program_id}',
            'label': f'{p.program_name} Students'
        })
        
    # 3. Add Semesters
    semesters = Semester.objects.all()
    for s in semesters:
        options.append({
            'value': f'semester_{s.semester_id}',
            'label': f'Semester: {s.semester_name}'
        })
        
    return Response(options)


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