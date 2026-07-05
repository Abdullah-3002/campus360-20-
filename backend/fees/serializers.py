from rest_framework import serializers
from .models import FeeStructure, Challan, Payment, Scholarship


class FeeStructureSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.program_name', read_only=True)

    class Meta:
        model = FeeStructure
        fields = '__all__'
        read_only_fields = ['structure_id', 'created_at']


class ChallanSerializer(serializers.ModelSerializer):
    student_reg  = serializers.CharField(source='student.registration_number', read_only=True)
    semester_name = serializers.CharField(source='semester.semester_name', read_only=True)

    class Meta:
        model = Challan
        fields = '__all__'
        read_only_fields = ['challan_id', 'challan_number', 'issue_date', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)
    challan_number = serializers.CharField(source='challan.challan_number', read_only=True)
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_id', 'payment_date', 'created_at']

    def get_is_verified(self, obj):
        return obj.verified_by_id is not None


class ScholarshipSerializer(serializers.ModelSerializer):
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)

    class Meta:
        model = Scholarship
        fields = '__all__'
        read_only_fields = ['scholarship_id', 'created_at']