# sessions/views.py
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Session
from .serializers import SessionSerializer, SessionCreateSerializer, SessionEndSerializer
from classrooms.models import Classroom
from performance.models import Performance
from real_time.utils import send_to_session_group

class SessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        classroom_id = self.kwargs.get('classroom_pk')
        if classroom_id:
            return Session.objects.filter(classroom_id=classroom_id)
        return Session.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SessionCreateSerializer
        elif self.action == 'end':
            return SessionEndSerializer
        return SessionSerializer
    
    def perform_create(self, serializer):
        classroom = serializer.validated_data['classroom']
        # Check if user is the instructor of this classroom
        if classroom.instructor != self.request.user:
            raise serializers.ValidationError("Only the instructor can start a session")
        serializer.save(start_time=timezone.now())
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        session = self.get_object()
        # Create a performance record for the student
        Performance.objects.get_or_create(
            session=session,
            student=request.user,
            defaults={'attended': True, 'focus_score': 0.0}
        )
        return Response({'message': 'Joined session successfully'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        session = self.get_object()
        # Update the performance record
        try:
            performance = Performance.objects.get(session=session, student=request.user)
            performance.attended = False
            performance.save()
            return Response({'message': 'Left session successfully'})
        except Performance.DoesNotExist:
            return Response(
                {'error': 'Performance record not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        session = self.get_object()
        if session.classroom.instructor != request.user:
            return Response(
                {'error': 'Only the instructor can end the session'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # End session using WebSocket-aware method
        session.end_session()
        
        # Trigger report generation (you'll implement this later)
        # generate_session_report.delay(session.id)
        
        serializer = SessionEndSerializer(session)
        return Response(serializer.data)