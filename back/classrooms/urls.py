from django.urls import path
from .views import (
    InstructorDashboardAPI,
    StudentDashboardAPI,
    ClassroomCreateAPI,
    JoinClassroomAPI,
    TeacherClassViewAPI,
    StudentClassViewAPI,
    SessionCreateAPI,
    SessionEndAPI,
    PerformanceCreateAPI,
    EnrollmentListAPI,
    student_dashboard, instructor_dashboard,
    teacher_class_view, student_class_view,
    create_classroom, join_classroom
)

urlpatterns = [
    # Dashboard endpoints
    path('api/instructor/dashboard/', InstructorDashboardAPI.as_view(), name='instructor_dashboard_api'),
    path('api/student/dashboard/', StudentDashboardAPI.as_view(), name='student_dashboard_api'),
    
    # Classroom endpoints
    path('api/instructor/classes/', ClassroomCreateAPI.as_view(), name='create_classroom_api'),
    path('api/student/classes/join/', JoinClassroomAPI.as_view(), name='join_classroom_api'),
    
    # Class detail endpoints
    path('api/instructor/classes/<int:pk>/', TeacherClassViewAPI.as_view(), name='teacher_class_api'),
    path('api/student/classes/<int:pk>/', StudentClassViewAPI.as_view(), name='student_class_api'),
    
    # Session endpoints
    path('api/instructor/classes/<int:pk>/sessions/', SessionCreateAPI.as_view(), name='create_session_api'),
    path('api/instructor/sessions/<int:pk>/end/', SessionEndAPI.as_view(), name='end_session_api'),
    
    # Performance endpoints
    path('api/instructor/performances/', PerformanceCreateAPI.as_view(), name='create_performance_api'),
    
    # Enrollment endpoints
    path('api/instructor/classes/<int:pk>/enrollments/', EnrollmentListAPI.as_view(), name='class_enrollments_api'),


     # Traditional Views (HTML)
    path('student/dashboard/', student_dashboard, name='student_dashboard'),
    path('instructor/dashboard/', instructor_dashboard, name='instructor_dashboard'),
    path('class/create/', create_classroom, name='create_classroom'),
    path('class/join/', join_classroom, name='join_classroom'),
    path('class/<int:pk>/teacher/', teacher_class_view, name='teacher_class_view'),
    path('class/<int:pk>/student/', student_class_view, name='student_class_view'),
]