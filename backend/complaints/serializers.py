from rest_framework import serializers
from .models import ComplaintCategory, Complaint, ComplaintAssignment, ComplaintLog, CommunicationThread, Message, Feedback


class ComplaintCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintCategory
        fields = '__all__'
        read_only_fields = ['category_id']


class ComplaintLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintLog
        fields = '__all__'
        read_only_fields = ['log_id', 'timestamp']


class ComplaintAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintAssignment
        fields = '__all__'
        read_only_fields = ['assignment_id', 'assigned_date']


class ComplaintSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    logs = ComplaintLogSerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ['complaint_id', 'submitted_at', 'submitted_by', 'status', 'admin_response', 'resolved_at']


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['message_id', 'sent_at', 'sender']


class CommunicationThreadSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = CommunicationThread
        fields = '__all__'
        read_only_fields = ['thread_id', 'created_at', 'created_by']

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'
        read_only_fields = ['feedback_id', 'submitted_at', 'user']