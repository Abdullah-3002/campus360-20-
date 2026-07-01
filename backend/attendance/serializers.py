from rest_framework import serializers
from .models import Attendance, AttendanceRecord, StudentAttendanceSummary, LeaveApplication


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


class LeaveApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)
    course_code = serializers.CharField(source='section.course.course_code', read_only=True)
    section_name = serializers.CharField(source='section.section_name', read_only=True)

    class Meta:
        model = LeaveApplication
        fields = '__all__'
        read_only_fields = ['leave_id', 'submitted_at', 'reviewed_at', 'reviewed_by', 'status']

    def get_student_name(self, obj):
        return obj.student.user.username

    def validate(self, attrs):
        if attrs.get('end_date') and attrs.get('start_date') and attrs['end_date'] < attrs['start_date']:
            raise serializers.ValidationError({'end_date': 'End date must be on or after start date.'})
        return attrs