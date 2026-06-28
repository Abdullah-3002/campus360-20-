from rest_framework import serializers
from .models import Section, SectionSchedule, BatchSection


class SectionScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SectionSchedule
        fields = '__all__'
        read_only_fields = ['schedule_id', 'created_at']


class SectionSerializer(serializers.ModelSerializer):
    schedules       = SectionScheduleSerializer(many=True, read_only=True)
    course_code     = serializers.CharField(source='course.course_code', read_only=True)
    course_name     = serializers.CharField(source='course.course_name', read_only=True)
    semester_name   = serializers.CharField(source='semester.semester_name', read_only=True)
    faculty_name    = serializers.CharField(source='faculty.user.username', read_only=True)

    class Meta:
        model = Section
        fields = '__all__'
        read_only_fields = ['section_id', 'enrolled_count', 'created_at']


class SectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = [
            'course', 'semester', 'faculty', 'section_name',
            'section_type', 'max_capacity', 'is_active',
        ]


class BatchSectionSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.program_name', read_only=True)
    program_code = serializers.CharField(source='program.program_code', read_only=True)

    class Meta:
        model = BatchSection
        fields = '__all__'
        read_only_fields = ['batch_section_id', 'created_at']