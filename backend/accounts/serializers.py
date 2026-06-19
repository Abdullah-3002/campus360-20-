# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User, Role, LoginSession, PasswordReset, UserRole
import uuid

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password']
        extra_kwargs = {
            'user_type': {'required': False}
        }

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        
        if 'user_type' not in data or not data['user_type']:
            data['user_type'] = 'student'

        # Validate user_type
        valid_types = ['student', 'teacher', 'staff', 'admin', 'applicant']
        if data['user_type'] not in valid_types:
            raise serializers.ValidationError({"user_type": "Invalid user type"})
        
        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        validated_data['user_type'] = 'applicant'
        user = User.objects.create_user(**validated_data)
        
        # Assign role based on user_type
        try:
            role = Role.objects.get(role_name=validated_data['user_type'].upper())
            UserRole.objects.create(user=user, role=role)
        except Role.DoesNotExist:
            pass
        
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(email=email, password=password)
            
            if not user:
                raise serializers.ValidationError("Invalid email or password")
            
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled")
            
            # Update last login
            user.last_login = timezone.now()
            user.save()
            
            data['user'] = user
            return data
        
        raise serializers.ValidationError("Must include email and password")

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'username', 'email', 'user_type', 'created_at', 'last_login', 'is_active']
        read_only_fields = ['user_id', 'created_at', 'last_login']

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class LoginSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginSession
        fields = ['session_id', 'login_time', 'ip_address', 'device_info', 'is_active', 'expires_at']
        read_only_fields = ['session_id', 'login_time']

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        return data

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        return data