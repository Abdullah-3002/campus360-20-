from rest_framework import serializers
from .models import ExamType, Examination, ExamSchedule, Grade, Marks, FinalGrade, Result, ResultApproval


class ExamTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamType
        fields = '__all__'
        read_only_fields = ['exam_type_id']


class ExamScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSchedule
        fields = '__all__'
        read_only_fields = ['schedule_id', 'created_at']


class ExaminationSerializer(serializers.ModelSerializer):
    schedules    = ExamScheduleSerializer(many=True, read_only=True)
    course_code  = serializers.CharField(source='course.course_code', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.type_name', read_only=True)

    class Meta:
        model = Examination
        fields = '__all__'
        read_only_fields = ['exam_id', 'created_at']


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = '__all__'
        read_only_fields = ['grade_id']


class MarksSerializer(serializers.ModelSerializer):
    student_reg  = serializers.CharField(source='student.registration_number', read_only=True)
    exam_name    = serializers.CharField(source='exam.exam_name', read_only=True)

    class Meta:
        model = Marks
        fields = '__all__'
        read_only_fields = ['marks_id', 'entered_at']


class FinalGradeSerializer(serializers.ModelSerializer):
    grade_letter = serializers.CharField(source='grade.grade_letter', read_only=True)
    course_code  = serializers.CharField(source='course.course_code', read_only=True)

    class Meta:
        model = FinalGrade
        fields = '__all__'
        read_only_fields = ['final_grade_id', 'created_at']


class ResultSerializer(serializers.ModelSerializer):
    student_reg  = serializers.CharField(source='student.registration_number', read_only=True)
    semester_name = serializers.CharField(source='semester.semester_name', read_only=True)

    class Meta:
        model = Result
        fields = '__all__'
        read_only_fields = ['result_id', 'created_at']


class ResultApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResultApproval
        fields = '__all__'
        read_only_fields = ['approval_id', 'approval_date']