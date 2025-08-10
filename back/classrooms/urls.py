from django.urls import path
from .views import (
    instructor_dashboard as InstructorDashboardView,
    student_dashboard as StudentDashboardView,
    create_classroom as CreateClassroom,
    join_classroom as JoinClassroom,
    teacher_class_view as TeacherClassView,
    student_class_view as StudentClassView
)

urlpatterns = [
    path('student/dashboard/', StudentDashboardView, name='student_dashboard'),
    path('instructor/dashboard/', InstructorDashboardView, name='instructor_dashboard'),
    path('class/create/', CreateClassroom, name='create_classroom'),
    path('class/join/', JoinClassroom, name='join_classroom'),
    path('class/<int:pk>/teacher/', TeacherClassView, name='teacher_class_view'),
    path('class/<int:pk>/student/', StudentClassView, name='student_class_view'),
]
