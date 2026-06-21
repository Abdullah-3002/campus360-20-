from rest_framework import serializers
from .models import Enrollment, CourseRegistration


class CourseRegistrationSerializer(serializers.ModelSerializer):
    course_code   = serializers.CharField(source='course.course_code', read_only=True)
    course_name   = serializers.CharField(source='course.course_name', read_only=True)
    section_name  = serializers.CharField(source='section.section_name', read_only=True)
    credit_hours  = serializers.IntegerField(source='course.credit_hours', read_only=True)

    class Meta:
        model = CourseRegistration
        fields = '__all__'
        read_only_fields = ['registration_id', 'registration_date', 'student', 'created_at']


class EnrollmentSerializer(serializers.ModelSerializer):
    course_registrations = CourseRegistrationSerializer(many=True, read_only=True)
    semester_name        = serializers.CharField(source='semester.semester_name', read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'
        read_only_fields = ['enrollment_id', 'enrollment_date', 'created_at']