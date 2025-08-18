# classrooms/models.py
from time import timezone
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Classroom(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="classes_taught")
    created_at = models.DateTimeField(auto_now_add=True)
    code = models.CharField(max_length=8, unique=True)  # For joining via code

    @property
    def active_session(self):
        return self.sessions.filter(is_active=True).first()

    def __str__(self):
        return self.name


class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="enrollments")
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="enrollments")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'classroom')


class Session(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="sessions")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)

    def end_session(self):
        self.end_time = timezone.now()
        self.is_active = False
        self.save()

    def __str__(self):
        return f"{self.classroom.name} - {self.start_time.date()}"


class Performance(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="performances")
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    focus_score = models.FloatField()  # Average focus for the session (0–100)
    attended = models.BooleanField(default=False)
