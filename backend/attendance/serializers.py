from rest_framework import serializers
from .models import Attendance, AttendanceRecord, StudentAttendanceSummary


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = '__all__'
        read_only_fields = ['record_id']


class AttendanceSerializer(serializers.ModelSerializer):
    records      = AttendanceRecordSerializer(many=True, read_only=True)
    section_name = serializers.CharField(source='section.section_name', read_only=True)
    course_code  = serializers.CharField(source='section.course.course_code', read_only=True)

    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['attendance_id', 'marked_at']


class StudentAttendanceSummarySerializer(serializers.ModelSerializer):
    course_code   = serializers.CharField(source='course.course_code', read_only=True)
    course_name   = serializers.CharField(source='course.course_name', read_only=True)
    semester_name = serializers.CharField(source='semester.semester_name', read_only=True)

    class Meta:
        model = StudentAttendanceSummary
        fields = '__all__'
        read_only_fields = ['summary_id', 'last_updated_at']