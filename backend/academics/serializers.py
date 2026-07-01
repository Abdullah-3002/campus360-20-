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
        read_only_fields = ['program_id', 'created_at', 'program_type']

    def create(self, validated_data):
        validated_data['program_type'] = 'morning'
        return super().create(validated_data)


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
    credit_hours = serializers.IntegerField(source='course.credit_hours', read_only=True)
    theory_credit_hours = serializers.IntegerField(source='course.theory_credit_hours', read_only=True)
    lab_credit_hours = serializers.IntegerField(source='course.lab_credit_hours', read_only=True)
    course_type = serializers.CharField(source='course.course_type', read_only=True)
    department_id = serializers.IntegerField(source='course.department_id', read_only=True)
    department_name = serializers.CharField(source='course.department.department_name', read_only=True)

    class Meta:
        model = ProgramCourse
        fields = '__all__'
        read_only_fields = ['program_course_id', 'created_at']


class ProgramCourseCreateSerializer(serializers.Serializer):
    program = serializers.IntegerField()
    semester_number = serializers.IntegerField(min_value=1, max_value=12)
    department = serializers.IntegerField()
    course_code = serializers.CharField(max_length=20)
    course_name = serializers.CharField(max_length=200)
    course_type = serializers.ChoiceField(choices=['core', 'elective', 'university_requirement'])
    credit_hours = serializers.IntegerField(min_value=1)
    theory_credit_hours = serializers.IntegerField(min_value=0, default=0)
    lab_credit_hours = serializers.IntegerField(min_value=0, default=0)
