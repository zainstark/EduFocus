from rest_framework import serializers
from .models import Classroom, Enrollment, Session, Performance
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email']

class ClassroomSerializer(serializers.ModelSerializer):
    instructor = UserSerializer(read_only=True)
    
    class Meta:
        model = Classroom
        fields = ['id', 'name', 'description', 'instructor', 'code', 'created_at']
        read_only_fields = ['code', 'created_at']

class EnrollmentSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'classroom', 'joined_at']
        read_only_fields = ['joined_at']

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['id', 'classroom', 'start_time', 'end_time', 'is_active']
        read_only_fields = ['is_active']

class PerformanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Performance
        fields = ['id', 'session', 'student', 'focus_score', 'attended']

class DashboardSessionSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    
    class Meta:
        model = Session
        fields = ['id', 'classroom_name', 'start_time']

class StudentPerformanceSerializer(serializers.ModelSerializer):
    session = DashboardSessionSerializer(read_only=True)
    
    class Meta:
        model = Performance
        fields = ['id', 'session', 'focus_score', 'attended']

class ClassroomStatsSerializer(serializers.Serializer):
    session_count = serializers.IntegerField()
    student_count = serializers.IntegerField()
    last_session_attendance = serializers.FloatField()
    last_session_avg_focus = serializers.FloatField()
    session_focus_data = serializers.ListField(child=serializers.FloatField())
    session_labels = serializers.ListField(child=serializers.CharField())

class StudentClassStatsSerializer(serializers.Serializer):
    session_count = serializers.IntegerField()
    attended_count = serializers.IntegerField()
    last_focus_score = serializers.FloatField()
    performance_data = serializers.ListField(child=serializers.FloatField())
    performance_labels = serializers.ListField(child=serializers.CharField())