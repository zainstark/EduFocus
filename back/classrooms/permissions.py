from rest_framework import permissions

class IsInstructor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'instructor'

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'student'

class IsClassroomInstructor(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.instructor == request.user

class IsEnrolledStudent(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.enrollments.filter(student=request.user).exists()