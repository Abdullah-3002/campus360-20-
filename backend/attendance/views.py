from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Max
from accounts.permissions import IsAdmin, IsAdminOrTeacher
from students.models import Student
from sections.models import Section
from enrollments.models import CourseRegistration
from .models import Attendance, AttendanceRecord, StudentAttendanceSummary, LeaveApplication
from .serializers import AttendanceSerializer, AttendanceRecordSerializer, StudentAttendanceSummarySerializer, LeaveApplicationSerializer


def _get_faculty(user):
    try:
        return user.faculty_profile
    except Exception:
        return None


def _next_lecture_number(section_id):
    last = Attendance.objects.filter(section_id=section_id).aggregate(
        max_lec=Max('lecture_number')
    )['max_lec']
    return (last or 0) + 1


def _update_summary(record):
    summary, _ = StudentAttendanceSummary.objects.get_or_create(
        student=record.student,
        section=record.attendance.section,
        course=record.attendance.section.course,
        semester=record.attendance.section.semester,
    )
    ch = getattr(record.attendance.section.course, 'credit_hours', 3)
    if ch == 3:
        summary.total_lectures = 32
    elif ch == 1:
        summary.total_lectures = 16
    elif ch == 2:
        summary.total_lectures = 24
    elif ch == 4:
        summary.total_lectures = 40
    else:
        summary.total_lectures = ch * 10

    conducted_lectures = AttendanceRecord.objects.filter(
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

    if conducted_lectures > 0:
        summary.attendance_percentage = (summary.attended_lectures / conducted_lectures) * 100.0
    else:
        summary.attendance_percentage = 100.0

    summary.is_below_threshold = summary.attendance_percentage < 75.0
    summary.save()


@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def mark_attendance(request):
    faculty = _get_faculty(request.user)
    if not faculty:
        return Response({'error': 'Only faculty can mark attendance.'}, status=status.HTTP_403_FORBIDDEN)

    section_id = request.data.get('section_id')
    attendance_date = request.data.get('attendance_date')
    lecture_number = request.data.get('lecture_number')
    topic_covered = request.data.get('topic_covered', '')
    records_data = request.data.get('records', [])

    if not section_id:
        course_id = request.data.get('course_id') or request.data.get('course')
        section_name = request.data.get('section_name') or request.data.get('section')
        if course_id and section_name:
            sec_obj = Section.objects.filter(course_id=course_id, section_name=section_name).first()
            if sec_obj:
                section_id = sec_obj.section_id

    if not section_id or not attendance_date:
        return Response({'error': 'section_id and attendance_date are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not lecture_number:
        lecture_number = _next_lecture_number(section_id)

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
        student_id = entry.get('student')
        reg = CourseRegistration.objects.filter(
            student_id=student_id, section_id=section_id, status='registered'
        ).first()
        if reg:
            entry['registration'] = reg.registration_id
        entry['attendance'] = attendance.attendance_id
        serializer = AttendanceRecordSerializer(data=entry)
        if serializer.is_valid():
            record = serializer.save()
            created_records.append(serializer.data)
            _update_summary(record)

    return Response({
        'attendance': AttendanceSerializer(attendance).data,
        'records': created_records,
        'lecture_number': lecture_number,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def list_attendance(request):
    section = request.query_params.get('section')
    semester = request.query_params.get('semester')
    qs = Attendance.objects.select_related('section__course', 'section__semester').all()
    if request.user.user_type == 'teacher':
        faculty = _get_faculty(request.user)
        if faculty:
            qs = qs.filter(section__faculty=faculty)
    if section:
        qs = qs.filter(section__section_id=section)
    if semester:
        qs = qs.filter(section__semester__semester_id=semester)
    return Response(AttendanceSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def next_lecture_number(request):
    section_id = request.query_params.get('section_id')
    if not section_id:
        return Response({'error': 'section_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'lecture_number': _next_lecture_number(section_id)})


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
    course_id = request.query_params.get('course_id')
    if course_id:
        summaries = summaries.filter(course_id=course_id)
    return Response(StudentAttendanceSummarySerializer(summaries, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_attendance_summaries(request):
    section = request.query_params.get('section')
    semester = request.query_params.get('semester')
    qs = StudentAttendanceSummary.objects.select_related('student', 'course', 'semester').all()
    if section:
        qs = qs.filter(section__section_id=section)
    if semester:
        qs = qs.filter(semester__semester_id=semester)
    return Response(StudentAttendanceSummarySerializer(qs, many=True).data)


# ── Leave Applications ────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_leave(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can submit leave applications.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Student record not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = {**request.data, 'student': student.student_id}
    serializer = LeaveApplicationSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_leaves(request):
    if request.user.user_type != 'student':
        return Response({'error': 'Only students can access this.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        return Response({'error': 'Student record not found.'}, status=status.HTTP_404_NOT_FOUND)
    leaves = LeaveApplication.objects.select_related('section__course').filter(student=student)
    return Response(LeaveApplicationSerializer(leaves, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_leave(request, leave_id):
    try:
        leave = LeaveApplication.objects.get(leave_id=leave_id)
    except LeaveApplication.DoesNotExist:
        return Response({'error': 'Leave application not found.'}, status=status.HTTP_404_NOT_FOUND)
    if leave.student.user != request.user:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    if leave.status != 'pending':
        return Response({'error': 'Only pending leave applications can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
    leave.delete()
    return Response({'message': 'Leave application deleted.'})


@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def teacher_leaves(request):
    faculty = _get_faculty(request.user)
    if not faculty and request.user.user_type != 'admin':
        return Response({'error': 'Faculty profile required.'}, status=status.HTTP_403_FORBIDDEN)
    qs = LeaveApplication.objects.select_related('student__user', 'section__course').filter(status='pending')
    if request.user.user_type == 'teacher' and faculty:
        qs = qs.filter(section__faculty=faculty)
    return Response(LeaveApplicationSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def review_leave(request, leave_id):
    try:
        leave = LeaveApplication.objects.select_related('section', 'student').get(leave_id=leave_id)
    except LeaveApplication.DoesNotExist:
        return Response({'error': 'Leave application not found.'}, status=status.HTTP_404_NOT_FOUND)

    faculty = _get_faculty(request.user)
    if request.user.user_type == 'teacher':
        if not faculty or leave.section.faculty_id != faculty.faculty_id:
            return Response({'error': 'You can only review leaves for your sections.'}, status=status.HTTP_403_FORBIDDEN)

    action = request.data.get('action')
    remarks = request.data.get('teacher_remarks', '').strip()
    if action not in ('approved', 'rejected'):
        return Response({'error': 'action must be approved or rejected.'}, status=status.HTTP_400_BAD_REQUEST)
    if action == 'rejected' and not remarks:
        return Response({'error': 'Remarks required when rejecting leave.'}, status=status.HTTP_400_BAD_REQUEST)

    leave.status = action
    leave.teacher_remarks = remarks
    leave.reviewed_by = request.user
    leave.reviewed_at = timezone.now()
    leave.save()

    if action == 'approved' and faculty:
        from datetime import timedelta
        current = leave.start_date
        while current <= leave.end_date:
            lec_num = _next_lecture_number(leave.section_id)
            att, att_created = Attendance.objects.get_or_create(
                section=leave.section,
                attendance_date=current,
                lecture_number=lec_num,
                defaults={'marked_by': faculty, 'topic_covered': f'Approved leave: {leave.reason[:100]}'}
            )
            if att_created:
                reg = CourseRegistration.objects.filter(
                    student=leave.student, section=leave.section, status='registered'
                ).first()
                if reg:
                    record, _ = AttendanceRecord.objects.get_or_create(
                        attendance=att,
                        student=leave.student,
                        defaults={'registration': reg, 'status': 'leave', 'remarks': 'Approved leave application'}
                    )
                    if record.status != 'leave':
                        record.status = 'leave'
                        record.save(update_fields=['status'])
                        _update_summary(record)
            current += timedelta(days=1)

    return Response(LeaveApplicationSerializer(leave).data)
