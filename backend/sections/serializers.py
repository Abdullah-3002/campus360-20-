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
    department_name = serializers.CharField(source='course.department.department_name', read_only=True)
    program_name    = serializers.SerializerMethodField()
    program_code    = serializers.SerializerMethodField()
    curriculum_semester = serializers.SerializerMethodField()
    batch_years     = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = '__all__'
        read_only_fields = ['section_id', 'enrolled_count', 'created_at']

    def get_program_name(self, obj):
        pc = obj.course.program_courses.select_related('program').first()
        return pc.program.program_name if pc else obj.course.department.department_name

    def get_program_code(self, obj):
        pc = obj.course.program_courses.select_related('program').first()
        return pc.program.program_code if pc else ''

    def get_curriculum_semester(self, obj):
        pc = obj.course.program_courses.order_by('semester_number').first()
        return pc.semester_number if pc else None

    def get_batch_years(self, obj):
        from enrollments.models import CourseRegistration
        years = CourseRegistration.objects.filter(
            section=obj, status='registered'
        ).values_list('student__batch_year', flat=True).distinct()
        return sorted(set(y for y in years if y))


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
