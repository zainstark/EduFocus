from django.db import models
from users.models import User

class Classroom(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='taught_classrooms')
    created_at = models.DateTimeField(auto_now_add=True)
    join_code = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.name

class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='enrollments')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'classroom']

    def __str__(self):
        return f"{self.student} - {self.classroom}"