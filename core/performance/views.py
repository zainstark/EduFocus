from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count
from .models import Performance
from .serializers import PerformanceCreateUpdateSerializer, PerformanceSerializer, PerformanceAggregateSerializer
from session.models import Session
from django.shortcuts import get_object_or_404 # ADD THIS IMPORT

class PerformanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PerformanceSerializer

    def get_queryset(self):
        # Get the parent session_pk from the URL kwargs
        # 'session_session_pk' is the default lookup name for nested routers
        session_pk = self.kwargs.get('session_session_pk') # CHANGE THIS LINE
        if session_pk:
            # Filter performances by the parent session
            return Performance.objects.filter(session__id=session_pk)
        return Performance.objects.all() # Or restrict to only nested access if desired

    def create(self, request, *args, **kwargs):
        # For students to submit their focus scores
        # Get the parent session_pk from the URL kwargs
        session_pk = self.kwargs.get('session_session_pk') # ADD THIS LINE
        session = get_object_or_404(Session, pk=session_pk) # ADD THIS LINE

        serializer = PerformanceCreateUpdateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(student=request.user, session=session) # CHANGE THIS LINE
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def aggregate(self, request, session_pk=None): # REMOVE session_pk=None from here
        # Get aggregate data for a session (for teacher dashboard)
        # The session_session_pk will be automatically passed by the nested router
        session_pk = self.kwargs.get('session_session_pk') # ADD THIS LINE

        session = get_object_or_404(Session, pk=session_pk) # CHANGE THIS LINE
        # Check if user is the instructor of this classroom
        if session.classroom.instructor != request.user:
            return Response(
                {'error': 'Only the instructor can view aggregate data'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Calculate aggregates
        performances = Performance.objects.filter(session=session)
        avg_focus = performances.aggregate(avg_score=Avg('focus_score'))['avg_score'] or 0
        student_count = performances.count()
        present_count = performances.filter(attended=True).count()

        data = {
            'avg_focus_score': round(avg_focus, 2),
            'student_count': student_count,
            'present_count': present_count
        }

        serializer = PerformanceAggregateSerializer(data)
        return Response(serializer.data)
