from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import logout as django_logout
from django.utils import timezone
from .models import User, LoginSession, PasswordReset, UserRole, Role
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    RoleSerializer, LoginSessionSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, ChangePasswordSerializer
)
from .utils import generate_jwt_token, create_login_session, generate_password_reset_token
from .permissions import IsAdmin
import jwt
from django.conf import settings

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """User registration endpoint"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Auto-login after registration
        token = generate_jwt_token(user)
        session = create_login_session(user, request)
        
        # Get user roles
        user_roles = UserRole.objects.filter(user=user).select_related('role')
        roles = [ur.role.role_name for ur in user_roles]
        
        return Response({
            'message': 'Registration successful',
            'user': {
                'user_id': user.user_id,
                'username': user.username,
                'email': user.email,
                'user_type': user.user_type,
                'roles': roles
            },
            'token': token,
            'session_id': session.session_id
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login endpoint"""
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Generate JWT token
        token = generate_jwt_token(user)
        
        # Create login session
        session = create_login_session(user, request)
        
        # Get user roles
        user_roles = UserRole.objects.filter(user=user).select_related('role')
        roles = [ur.role.role_name for ur in user_roles]
        
        return Response({
            'message': 'Login successful',
            'user': {
                'user_id': user.user_id,
                'username': user.username,
                'email': user.email,
                'user_type': user.user_type,
                'roles': roles
            },
            'token': token,
            'session_id': session.session_id,
            'expires_in': '24 hours'
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """User logout endpoint"""
    try:
        # Get the active session from header
        session_token = request.headers.get('X-Session-Token')
        if session_token:
            session = LoginSession.objects.get(
                session_token=session_token,
                user=request.user,
                is_active=True
            )
            session.logout_time = timezone.now()
            session.is_active = False
            session.save()
        
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    except LoginSession.DoesNotExist:
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    print(request.headers)
    """Get current authenticated user info"""
    serializer = UserSerializer(request.user)
    
    # Get user roles
    user_roles = UserRole.objects.filter(user=request.user).select_related('role')
    roles = [ur.role.role_name for ur in user_roles]
    
    data = serializer.data
    data['roles'] = roles
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']
        
        if not request.user.check_password(old_password):
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
        
        request.user.set_password(new_password)
        request.user.save()
        
        # Logout from all sessions after password change
        LoginSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
        
        return Response({'message': 'Password changed successfully. Please login again.'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Request password reset email"""
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        user = User.objects.get(email=email)
        
        token, expires_at = generate_password_reset_token(user)
        
        # Here you would send an email with the reset link
        # For development, we'll return the token
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        
        # TODO: Implement email sending
        # send_reset_email(user.email, reset_link)
        
        return Response({
            'message': 'Password reset link has been sent to your email',
            'reset_token': token  # Only for development, remove in production
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    """Confirm password reset with token"""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        try:
            reset = PasswordReset.objects.get(
                reset_token=token,
                is_used=False,
                expires_at__gt=timezone.now()
            )
            
            user = reset.user
            user.set_password(new_password)
            user.save()
            
            reset.is_used = True
            reset.used_at = timezone.now()
            reset.save()
            
            # Deactivate all active sessions
            LoginSession.objects.filter(user=user, is_active=True).update(is_active=False)
            
            return Response({'message': 'Password reset successful. Please login.'})
            
        except PasswordReset.DoesNotExist:
            return Response({'error': 'Invalid or expired reset token'}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_sessions(request):
    """Get all active sessions for current user"""
    sessions = LoginSession.objects.filter(user=request.user, is_active=True)
    serializer = LoginSessionSerializer(sessions, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revoke_session(request, session_id):
    """Revoke a specific session"""
    try:
        session = LoginSession.objects.get(
            session_id=session_id,
            user=request.user,
            is_active=True
        )
        session.is_active = False
        session.logout_time = timezone.now()
        session.save()
        
        return Response({'message': 'Session revoked successfully'})
    except LoginSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAdmin])
def get_roles(request):
    """Get all roles (admin only)"""
    roles = Role.objects.all()
    serializer = RoleSerializer(roles, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_role(request):
    """Assign role to user (admin only)"""
    user_id = request.data.get('user_id')
    role_id = request.data.get('role_id')
    
    if not user_id or not role_id:
        return Response({'error': 'user_id and role_id are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
        role = Role.objects.get(role_id=role_id)
        
        # Check if assignment already exists
        user_role, created = UserRole.objects.get_or_create(
            user=user,
            role=role,
            defaults={'assigned_by': request.user}
        )
        
        if created:
            return Response({
                'message': 'Role assigned successfully',
                'user': user.email,
                'role': role.role_name
            })
        else:
            return Response({
                'message': 'Role already assigned to this user',
                'user': user.email,
                'role': role.role_name
            })
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Role.DoesNotExist:
        return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAdmin])
def remove_role(request):
    """Remove role from user (admin only)"""
    user_id = request.data.get('user_id')
    role_id = request.data.get('role_id')
    
    if not user_id or not role_id:
        return Response({'error': 'user_id and role_id are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(user_id=user_id)
        role = Role.objects.get(role_id=role_id)
        
        # Delete the role assignment
        deleted, _ = UserRole.objects.filter(user=user, role=role).delete()
        
        if deleted:
            return Response({
                'message': 'Role removed successfully',
                'user': user.email,
                'role': role.role_name
            })
        else:
            return Response({
                'message': 'Role was not assigned to this user'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Role.DoesNotExist:
        return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_roles(request, user_id=None):
    """Get roles for a specific user (admin only for other users, users can see their own)"""
    # If no user_id provided, get current user's roles
    if user_id is None:
        target_user = request.user
    else:
        # Only admin can view other users' roles
        if request.user.user_type != 'admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        try:
            target_user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user_roles = UserRole.objects.filter(user=target_user).select_related('role')
    roles = [{
        'role_id': ur.role.role_id,
        'role_name': ur.role.role_name,
        'description': ur.role.description,
        'assigned_at': ur.assigned_at,
        'assigned_by': ur.assigned_by.email if ur.assigned_by else None
    } for ur in user_roles]
    
    return Response({
        'user_id': target_user.user_id,
        'email': target_user.email,
        'username': target_user.username,
        'roles': roles
    })