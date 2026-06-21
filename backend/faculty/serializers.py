from rest_framework import serializers
from .models import Designation, Faculty, Staff, EmployeeProfile


class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = '__all__'
        read_only_fields = ['designation_id', 'created_at']


class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeProfile
        fields = '__all__'
        read_only_fields = ['profile_id', 'updated_at']


class FacultySerializer(serializers.ModelSerializer):
    username        = serializers.CharField(source='user.username', read_only=True)
    email           = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    designation_title = serializers.CharField(source='designation.designation_title', read_only=True)

    class Meta:
        model = Faculty
        fields = '__all__'
        read_only_fields = ['faculty_id', 'created_at', 'updated_at']


class FacultyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = [
            'user', 'department', 'designation', 'employee_code',
            'qualification', 'specialization', 'joining_date',
            'employment_type', 'status',
        ]


class StaffSerializer(serializers.ModelSerializer):
    username        = serializers.CharField(source='user.username', read_only=True)
    email           = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    designation_title = serializers.CharField(source='designation.designation_title', read_only=True)

    class Meta:
        model = Staff
        fields = '__all__'
        read_only_fields = ['staff_id', 'created_at', 'updated_at']


class StaffCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            'user', 'department', 'designation', 'employee_code',
            'joining_date', 'employment_type', 'status',
        ]