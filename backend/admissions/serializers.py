from rest_framework import serializers
from academics.models import DegreeProgram
from .models import (
    Applicant, AcademicRecord, AdmissionApplication, ProgramPreference,
    ApplicantDocument, AdmissionDecision, AdmissionLog
)


class ApplicantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Applicant
        exclude = ['user', 'created_at', 'updated_at']


class AcademicRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicRecord
        exclude = ['applicant', 'created_at']

    def validate_roll_number(self, value):
        if value and not value.strip():
            raise serializers.ValidationError('Roll number cannot be blank if provided.')
        if value and len(value.strip()) < 3:
            raise serializers.ValidationError('Roll number must be at least 3 characters.')
        return value.strip() if value else value

    def validate(self, attrs):
        start_year = attrs.get('start_year')
        end_year = attrs.get('end_year')
        if start_year and end_year and end_year <= start_year:
            raise serializers.ValidationError({'end_year': 'End year must be after start year.'})

        obtained = attrs.get('obtained')
        total = attrs.get('total')
        if obtained is not None and total is not None:
            if total <= 0:
                raise serializers.ValidationError({'total': 'Total marks must be greater than zero.'})
            if obtained < 0:
                raise serializers.ValidationError({'obtained': 'Obtained marks cannot be negative.'})
            if obtained > total:
                raise serializers.ValidationError({'obtained': 'Obtained marks cannot exceed total marks.'})

        level = attrs.get('qualification_level', '')
        if level not in ('matric', 'inter'):
            raise serializers.ValidationError({'qualification_level': 'Only Matric and Intermediate levels are allowed.'})

        return attrs


class ProgramPreferenceSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.program_name', read_only=True)
    department_name = serializers.CharField(source='program.department.department_name', read_only=True)

    class Meta:
        model = ProgramPreference
        exclude = ['application']


class AdmissionProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True)

    class Meta:
        model = DegreeProgram
        fields = [
            'program_id', 'program_name', 'program_code',
            'department_name', 'degree_level', 'duration_years',
            'accepting_admissions',
        ]


class ApplicantDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.SerializerMethodField()

    class Meta:
        model = ApplicantDocument
        fields = '__all__'
        read_only_fields = ['document_id', 'uploaded_at', 'verified_at']

    def get_document_type_display(self, obj):
        return obj.get_document_type_display()


class AdmissionDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionDecision
        fields = '__all__'
        read_only_fields = ['decision_id', 'decision_date', 'created_at']


class AdmissionApplicationSerializer(serializers.ModelSerializer):
    preferences = ProgramPreferenceSerializer(many=True, read_only=True)
    program_name = serializers.CharField(source='program.program_name', read_only=True)
    decision = AdmissionDecisionSerializer(read_only=True)

    class Meta:
        model = AdmissionApplication
        fields = '__all__'


class ApplicantDetailSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    user_id = serializers.IntegerField(source='user.user_id', read_only=True)
    user_type = serializers.CharField(source='user.user_type', read_only=True)
    academic_records = AcademicRecordSerializer(many=True, read_only=True)
    documents = ApplicantDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Applicant
        exclude = ['user', 'created_at', 'updated_at']


class AdminApplicationListSerializer(serializers.ModelSerializer):
    preferences = ProgramPreferenceSerializer(many=True, read_only=True)
    program_name = serializers.CharField(source='program.program_name', read_only=True)
    applicant_name = serializers.SerializerMethodField()
    applicant_email = serializers.CharField(source='applicant.user.email', read_only=True)
    applicant_username = serializers.CharField(source='applicant.user.username', read_only=True)
    user_id = serializers.IntegerField(source='applicant.user.user_id', read_only=True)
    user_type = serializers.CharField(source='applicant.user.user_type', read_only=True)
    decision = AdmissionDecisionSerializer(read_only=True)

    class Meta:
        model = AdmissionApplication
        fields = '__all__'

    def get_applicant_name(self, obj):
        return f'{obj.applicant.first_name} {obj.applicant.last_name}'.strip()


class AdminApplicationDetailSerializer(serializers.ModelSerializer):
    preferences = ProgramPreferenceSerializer(many=True, read_only=True)
    program_name = serializers.CharField(source='program.program_name', read_only=True)
    applicant = ApplicantDetailSerializer(read_only=True)
    decision = AdmissionDecisionSerializer(read_only=True)

    class Meta:
        model = AdmissionApplication
        fields = '__all__'


class AdmissionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionLog
        fields = '__all__'
        read_only_fields = ['log_id', 'timestamp']
