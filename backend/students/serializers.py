from rest_framework import serializers
from .models import Student, StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model   = StudentProfile
        exclude = ['student']


class StudentSerializer(serializers.ModelSerializer):
    profile             = StudentProfileSerializer(read_only=True)
    program_name        = serializers.CharField(source='program.program_name', read_only=True)
    program_code        = serializers.CharField(source='program.program_code', read_only=True)
    email               = serializers.CharField(source='user.email', read_only=True)
    username            = serializers.CharField(source='user.username', read_only=True)
    batch_section_name  = serializers.CharField(source='batch_section.section_name', read_only=True)
    section_label       = serializers.CharField(read_only=True)

    class Meta:
        model  = Student
        fields = [
            'student_id', 'registration_number', 'batch_year',
            'admission_date', 'current_semester', 'status',
            'cgpa', 'total_credit_hours_completed',
            'batch_section', 'batch_section_name', 'section', 'section_label',
            'program_name', 'program_code',
            'email', 'username',
            'profile', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'student_id', 'registration_number', 'cgpa',
            'total_credit_hours_completed', 'section', 'section_label',
            'created_at', 'updated_at',
        ]


class StudentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Student
        fields = [
            'user', 'applicant', 'program',
            'batch_year', 'admission_date', 'current_semester', 'status',
            'batch_section',
        ]
