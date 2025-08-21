from django.db import models
from classrooms.models import Classroom
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

class Session(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='sessions')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    report_generated = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.classroom.name} - {self.start_time}"
    
    def get_websocket_url(self):
        return f"ws://your-domain.com/ws/session/{self.id}/"
    
    def broadcast_to_session(self, message_type, data):
        channel_layer = get_channel_layer()
        group_name = f'session_{self.id}'
        
        message = {
            'type': message_type,
            **data
        }
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'broadcast_message',
                'message': json.dumps(message)
            }
        )
    
    def end_session(self):
        from django.utils import timezone
        from reports.tasks import generate_session_report_task

        self.end_time = timezone.now()
        self.is_active = False
        self.save()
        
        self.broadcast_to_session('session_ended', {
            'message': 'Session has ended',
            'end_time': self.end_time.isoformat()
        })
        
        generate_session_report_task.delay(self.id)
        return True
    
    def save(self, *args, **kwargs):
        if self.end_time and not self.report_generated:
            from reports.tasks import generate_session_report_task
            generate_session_report_task.delay(self.id)
            self.report_generated = True
        
        from django.db import models
from classrooms.models import Classroom
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

class Session(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='sessions')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    report_generated = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.classroom.name} - {self.start_time}"
    
    def get_websocket_url(self):
        return f"ws://your-domain.com/ws/session/{self.id}/"
    
    def broadcast_to_session(self, message_type, data):
        channel_layer = get_channel_layer()
        group_name = f'session_{self.id}'
        
        message = {
            'type': message_type,
            **data
        }
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'broadcast_message',
                'message': json.dumps(message)
            }
        )
    
    def end_session(self):
        from django.utils import timezone
        from reports.tasks import generate_session_report_task

        self.end_time = timezone.now()
        self.is_active = False
        self.save()
        
        self.broadcast_to_session('session_ended', {
            'message': 'Session has ended',
            'end_time': self.end_time.isoformat()
        })
        
        return True
    
    def save(self, *args, **kwargs):
        if self.end_time and not self.report_generated:
            from reports.tasks import generate_session_report_task
            generate_session_report_task.delay(self.id)
            self.report_generated = True
        
        super().save(*args, **kwargs)
