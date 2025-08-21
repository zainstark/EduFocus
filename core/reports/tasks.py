from celery import shared_task
from celery.utils.log import get_task_logger
from .utils import generate_session_report
from session.models import Session
from real_time.utils import send_to_session_group
import json
import asyncio

logger = get_task_logger(__name__)

@shared_task(bind=True, max_retries=3)
def generate_session_report_task(self, session_id):
    """
    Celery task to generate session reports asynchronously
    """
    try:
        logger.info(f"Starting report generation for session {session_id}")
        
        # Generate the report
        result = generate_session_report(session_id)
        
        if result:
            # Notify users that reports are available
            session = Session.objects.get(id=session_id)
            
            # Notify instructor
            asyncio.run(send_to_session_group(
                session_id,
                {
                    'type': 'report_available',
                    'message': 'Session report is now available',
                    'report_type': 'instructor',
                    'session_id': session_id
                }
            ))
            
            # Notify students who attended
            for report in result['student_reports']:
                if report.metadata.get('attended', False):
                    # For WebSocket notifications to specific users, we'd need
                    # a different approach, but this is a simplified version
                    pass
            
            logger.info(f"Successfully generated report for session {session_id}")
            return True
        else:
            logger.error(f"Failed to generate report for session {session_id}")
            return False
            
    except Session.DoesNotExist:
        logger.error(f"Session {session_id} does not exist")
        return False
    except Exception as e:
        logger.error(f"Error in report generation task for session {session_id}: {str(e)}")
        # Retry the task after 5 minutes
        self.retry(countdown=300, exc=e)

@shared_task
def cleanup_old_reports(days=30):
    """
    Celery task to cleanup reports older than specified days
    """
    from django.utils import timezone
    from datetime import timedelta
    from .models import Report
    
    cutoff_date = timezone.now() - timedelta(days=days)
    old_reports = Report.objects.filter(generated_at__lt=cutoff_date)
    
    count = old_reports.count()
    old_reports.delete()
    
    logger.info(f"Cleaned up {count} reports older than {days} days")
    return count