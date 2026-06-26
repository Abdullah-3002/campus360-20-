from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdmin, IsAdminOrTeacher
from students.models import Student
from .models import Attendance, AttendanceRecord, StudentAttendanceSummary
from .serializers import AttendanceSerializer, AttendanceRecordSerializer, StudentAttendanceSummarySerializer


@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def mark_attendance(request):
    try:
        faculty = request.user.faculty_profile
    except Exception:
        return Response({'error': 'Only faculty can mark attendance.'}, status=status.HTTP_403_FORBIDDEN)

    section_id      = request.data.get('section_id')
    attendance_date = request.data.get('attendance_date')
    lecture_number  = request.data.get('lecture_number')
    topic_covered   = request.data.get('topic_covered', '')
    records_data    = request.data.get('records', [])

    if not section_id or not attendance_date:
        return Response({'error': 'section_id and attendance_date are required.'}, status=status.HTTP_400_BAD_REQUEST)

    attendance, created = Attendance.objects.get_or_create(
        section_id=section_id,
        attendance_date=attendance_date,
        lecture_number=lecture_number,
        defaults={'marked_by': faculty, 'topic_covered': topic_covered}
    )

    if not created:
        return Response({'error': 'Attendance already marked for this session.'}, status=status.HTTP_400_BAD_REQUEST)

    created_records = []
    for entry in records_data:
        entry['attendance'] = attendance.attendance_id
        serializer = AttendanceRecordSerializer(data=entry)
        if serializer.is_valid():
            record = serializer.save()
            created_records.append(serializer.data)
            _update_summary(record)

    return Response({
        'attendance': AttendanceSerializer(attendance).data,
        'records': created_records
    }, status=status.HTTP_201_CREATED)


def _update_summary(record):
    summary, _ = StudentAttendanceSummary.objects.get_or_create(
        student=record.student,
        section=record.attendance.section,
        course=record.attendance.section.course,
        semester=record.attendance.section.semester,
    )
    summary.total_lectures = AttendanceRecord.objects.filter(
        student=record.student,
        attendance__section=record.attendance.section
    ).count()
    summary.attended_lectures = AttendanceRecord.objects.filter(
        student=record.student,
        attendance__section=record.attendance.section,
        status='present'
    ).count()
    summary.late_count = AttendanceRecord.objects.filter(
        student=record.student,
        attendance__section=record.attendance.section,
        status='late'
    ).count()
    summary.leave_count = AttendanceRecord.objects.filter(
        student=record.student,
        attendance__section=record.attendance.section,
        status='leave'
    ).count()
    if summary.total_lectures > 0:
        summary.attendance_percentage = (summary.attended_lectures / summary.total_lectures) * 100
        summary.is_below_threshold = summary.attendance_percentage < 75
    summary.save()


@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def list_attendance(request):
    section  = request.query_params.get('section')
    semester = request.query_params.get('semester')
    qs = Attendance.objects.select_related('section__course', 'section__semester').all()
    if section:
        qs = qs.filter(section__section_id=section)
    if semester:
        qs = qs.filter(section__semester__semester_id=semester)
    return Response(AttendanceSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_attendance_summary(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can access this.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'No student record found.'}, status=status.HTTP_404_NOT_FOUND)
    summaries = StudentAttendanceSummary.objects.select_related('course', 'semester').filter(student=student)
    return Response(StudentAttendanceSummarySerializer(summaries, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_attendance_summaries(request):
    section  = request.query_params.get('section')
    semester = request.query_params.get('semester')
    qs = StudentAttendanceSummary.objects.select_related('student', 'course', 'semester').all()
    if section:
        qs = qs.filter(section__section_id=section)
    if semester:
        qs = qs.filter(semester__semester_id=semester)
    return Response(StudentAttendanceSummarySerializer(qs, many=True).data)