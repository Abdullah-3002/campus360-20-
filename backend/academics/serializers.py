from rest_framework import serializers
from .models import Department, DegreeProgram, Semester, Course, ProgramCourse


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['department_id', 'created_at']


class DegreeProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True)

    class Meta:
        model = DegreeProgram
        fields = '__all__'
        read_only_fields = ['program_id', 'created_at']


class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = '__all__'
        read_only_fields = ['semester_id', 'created_at']


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True)

    class Meta:
        model = Course
        fields = '__all__'
        read_only_fields = ['course_id', 'created_at']


class ProgramCourseSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.course_code', read_only=True)
    course_name = serializers.CharField(source='course.course_name', read_only=True)

    class Meta:
        model = ProgramCourse
        fields = '__all__'
        read_only_fields = ['program_course_id', 'created_at']