from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import User
from session.models import Session

class Report(models.Model):
    REPORT_TYPES = (
        ('instructor', 'Instructor Report'),
        ('student', 'Student Report'),
    )
    
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='reports')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    attendance_status = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )  # Percentage
    avg_focus_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    focus_data_json = models.JSONField()  # Stores time-series data
    duration_seconds = models.IntegerField()  # Session duration in seconds
    chart_image = models.ImageField(upload_to='report_charts/', null=True, blank=True)
    metadata = models.JSONField(default=dict)  # Additional report data
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['session', 'user', 'report_type']

    def __str__(self):
        return f"Report for {self.user} - {self.session}"

    def get_duration_formatted(self):
        """Return formatted duration string"""
        hours = self.duration_seconds // 3600
        minutes = (self.duration_seconds % 3600) // 60
        seconds = self.duration_seconds % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"

    def get_attendance_status_display(self):
        """Return formatted attendance status"""
        return f"{self.attendance_status:.1f}%" # Corrected formatting

    def get_focus_score_display(self):
        """Return formatted focus score"""
        return f"{round(self.avg_focus_score * 100, 1)}%"
