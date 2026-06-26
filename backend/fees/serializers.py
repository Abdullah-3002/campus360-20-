from rest_framework import serializers
from .models import FeeStructure, Challan, Payment, Scholarship


class FeeStructureSerializer(serializers.ModelSerializer):
    total_fee    = serializers.SerializerMethodField()
    program_name = serializers.CharField(source='program.program_name', read_only=True)

    class Meta:
        model = FeeStructure
        fields = '__all__'
        read_only_fields = ['structure_id', 'created_at']

    def get_total_fee(self, obj):
        return obj.total_fee()


class ChallanSerializer(serializers.ModelSerializer):
    student_reg  = serializers.CharField(source='student.registration_number', read_only=True)
    semester_name = serializers.CharField(source='semester.semester_name', read_only=True)

    class Meta:
        model = Challan
        fields = '__all__'
        read_only_fields = ['challan_id', 'challan_number', 'issue_date', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_id', 'payment_date', 'created_at']


class ScholarshipSerializer(serializers.ModelSerializer):
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)

    class Meta:
        model = Scholarship
        fields = '__all__'
        read_only_fields = ['scholarship_id', 'created_at']