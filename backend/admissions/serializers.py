from rest_framework import serializers
from .models import Applicant, AcademicRecord, AdmissionApplication, ProgramPreference, ApplicantDocument

class ApplicantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Applicant
        exclude = ['user', 'created_at', 'updated_at']


class AcademicRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicRecord
        exclude = ['applicant', 'created_at']


class ProgramPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramPreference
        exclude = ['application']


class AdmissionApplicationSerializer(serializers.ModelSerializer):
    preferences = ProgramPreferenceSerializer(many=True, read_only=True)
    class Meta:
        model = AdmissionApplication
        fields = '__all__'


# ========== ADD THIS NEW SERIALIZER ==========
# admissions/serializers.py - Update ApplicantDocumentSerializer

class ApplicantDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ApplicantDocument
        fields = '__all__'
        read_only_fields = ['document_id', 'uploaded_at', 'verified_at']
    
    def get_document_type_display(self, obj):
        return obj.get_document_type_display()
    
