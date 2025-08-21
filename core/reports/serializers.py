from rest_framework import serializers
from .models import Report
from users.models import User
from session.models import Session

class ReportSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.classroom.name', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    attendance_status_display = serializers.SerializerMethodField()
    focus_score_display = serializers.SerializerMethodField()
    chart_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Report
        fields = [
            'id', 'session', 'session_name', 'user', 'user_name', 'report_type',
            'attendance_status', 'attendance_status_display', 'avg_focus_score',
            'focus_score_display', 'focus_data_json', 'duration_seconds',
            'duration_formatted', 'chart_image', 'chart_image_url', 'metadata',
            'generated_at'
        ]
        read_only_fields = [
            'attendance_status', 'avg_focus_score', 'focus_data_json',
            'duration_seconds', 'chart_image', 'metadata', 'generated_at'
        ]
    
    def get_duration_formatted(self, obj):
        return obj.get_duration_formatted()
    
    def get_attendance_status_display(self, obj):
        return obj.get_attendance_status_display()
    
    def get_focus_score_display(self, obj):
        return obj.get_focus_score_display()
    
    def get_chart_image_url(self, obj):
        if obj.chart_image:
            return obj.chart_image.url
        return None

class ReportSummarySerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.classroom.name', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    attendance_status_display = serializers.SerializerMethodField()
    focus_score_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Report
        fields = [
            'id', 'session', 'session_name', 'report_type',
            'attendance_status_display', 'focus_score_display',
            'duration_formatted', 'generated_at'
        ]
    
    def get_duration_formatted(self, obj):
        return obj.get_duration_formatted()
    
    def get_attendance_status_display(self, obj):
        return obj.get_attendance_status_display()
    
    def get_focus_score_display(self, obj):
        return obj.get_focus_score_display()