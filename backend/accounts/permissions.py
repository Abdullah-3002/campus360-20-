from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """Allow access only to admin users"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.user_type == 'admin'

class IsTeacher(BasePermission):
    """Allow access only to teacher users"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.user_type == 'teacher'

class IsStudent(BasePermission):
    """Allow access only to student users"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.user_type == 'student'

class IsAdminOrTeacher(BasePermission):
    """Allow access to admin and teacher users"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.user_type in ['admin', 'teacher']

class IsApplicant(BasePermission):
    """Allow access only to applicant users"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.user_type == 'applicant'