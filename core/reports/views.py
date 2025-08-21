from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from .models import Report
from .serializers import ReportSerializer, ReportSummarySerializer
from .utils import generate_session_report
from session.models import Session

class ReportViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['session', 'report_type']
    
    def get_queryset(self):
        user = self.request.user
        # Users can only see their own reports
        return Report.objects.filter(user=user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ReportSummarySerializer
        return ReportSerializer
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent reports (last 30 days)"""
        cutoff_date = timezone.now() - timedelta(days=30)
        recent_reports = self.get_queryset().filter(generated_at__gte=cutoff_date)
        
        page = self.paginate_queryset(recent_reports)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(recent_reports, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_session(self, request, session_id=None):
        """Get reports for a specific session"""
        if not session_id:
            return Response(
                {'error': 'Session ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = Session.objects.get(id=session_id)
            
            # Check if user has access to this session's reports
            if session.classroom.instructor != request.user and not session.classroom.enrollments.filter(student=request.user).exists():
                return Response(
                    {'error': 'You do not have access to this session'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            reports = self.get_queryset().filter(session=session)
            serializer = self.get_serializer(reports, many=True)
            return Response(serializer.data)
            
        except Session.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """Regenerate a report"""
        report = self.get_object()
        
        # Only allow instructors to regenerate reports
        if request.user != report.session.classroom.instructor:
            return Response(
                {'error': 'Only instructors can regenerate reports'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate the report
        result = generate_session_report(report.session.id)
        
        if result:
            return Response({'message': 'Report regenerated successfully'})
        else:
            return Response(
                {'error': 'Failed to regenerate report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )