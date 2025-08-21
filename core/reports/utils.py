import json
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, F, Window
from django.db.models.functions import TruncMinute
from .models import Report
from session.models import Session
from performance.models import Performance
from users.models import User
from classrooms.models import Enrollment
import pandas as pd
from io import BytesIO
import matplotlib.pyplot as plt
import seaborn as sns
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

import json
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, F, Window
from django.db.models.functions import TruncMinute
from .models import Report
from session.models import Session
from performance.models import Performance
from users.models import User
from classrooms.models import Enrollment
import pandas as pd
from io import BytesIO
import matplotlib.pyplot as plt
import seaborn as sns
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

def generate_session_report(session_id):
    """
    Generate a comprehensive report for a session
    """
    try:
        session = Session.objects.get(id=session_id)
        performances = Performance.objects.filter(session=session)
        
        if not performances.exists():
            logger.warning(f"No performance data found for session {session_id}")
            return None
        
        # Calculate session duration
        duration = calculate_session_duration(session)
        
        # Calculate attendance metrics
        attendance_metrics = calculate_attendance_metrics(session, performances)
        
        # Calculate focus metrics
        focus_metrics = calculate_focus_metrics(performances)
        
        # Generate time-series focus data
        time_series_data = generate_time_series_data(performances)
        
        # Create reports for instructor and each student
        instructor_report = create_instructor_report(
            session, duration, attendance_metrics, focus_metrics, time_series_data
        )
        
        student_reports = create_student_reports(
            session, duration, attendance_metrics, focus_metrics, time_series_data
        )
        
        logger.info(f"Generated report for session {session_id}")
        return {
            'instructor_report': instructor_report,
            'student_reports': student_reports
        }
        
    except Session.DoesNotExist:
        logger.error(f"Session {session_id} does not exist")
        return None
    except Exception as e:
        logger.error(f"Error generating report for session {session_id}: {str(e)}")
        return None

def calculate_session_duration(session):
    """
    Calculate the duration of a session
    """
    if session.end_time:
        duration = session.end_time - session.start_time
        return {
            'start_time': session.start_time,
            'end_time': session.end_time,
            'duration_seconds': duration.total_seconds(),
            'duration_formatted': str(duration)
        }
    else:
        # If session hasn't ended, use current time
        now = timezone.now()
        duration = now - session.start_time
        return {
            'start_time': session.start_time,
            'end_time': now,
            'duration_seconds': duration.total_seconds(),
            'duration_formatted': str(duration)
        }

def calculate_attendance_metrics(session, performances):
    """
    Calculate attendance metrics for a session
    """
    # Get all enrolled students
    enrolled_students = Enrollment.objects.filter(
        classroom=session.classroom
    ).values_list('student_id', flat=True)
    
    # Get students who attended
    attended_students = performances.filter(
        attended=True
    ).values_list('student_id', flat=True).distinct()
    
    # Calculate attendance percentage
    total_students = len(enrolled_students)
    present_students = len(attended_students)
    attendance_percentage = (present_students / total_students * 100) if total_students > 0 else 0
    
    # Create attendance status per student
    student_attendance = []
    for student_id in enrolled_students:
        student = User.objects.get(id=student_id)
        attended = student_id in attended_students
        student_attendance.append({
            'student_id': student_id,
            'student_name': student.full_name,
            'attended': attended
        })
    
    return {
        'total_students': total_students,
        'present_students': present_students,
        'attendance_percentage': round(attendance_percentage, 2),
        'student_attendance': student_attendance
    }

def calculate_focus_metrics(performances):
    """
    Calculate focus metrics for a session
    """
    # Calculate average focus score per student
    student_focus = performances.values('student').annotate(
        avg_focus=Avg('focus_score'),
        focus_count=Count('focus_score')
    ).order_by('student')
    
    # Add student names
    for entry in student_focus:
        student = User.objects.get(id=entry['student'])
        entry['student_name'] = student.full_name
    
    # Calculate overall average focus
    overall_avg_focus = performances.aggregate(
        avg_focus=Avg('focus_score')
    )['avg_focus'] or 0
    
    return {
        'overall_avg_focus': round(overall_avg_focus, 2),
        'student_focus': list(student_focus)
    }

def generate_time_series_data(performances):
    """
    Generate time-series data for focus scores
    """
    # Group by minute to create time-series data
    time_series = performances.annotate(
        time_bucket=TruncMinute('timestamp')
    ).values('time_bucket').annotate(
        avg_focus=Avg('focus_score'),
        student_count=Count('student', distinct=True)
    ).order_by('time_bucket')
    
    # Convert to list of dictionaries for JSON serialization
    time_series_data = []
    for entry in time_series:
        time_series_data.append({
            'timestamp': entry['time_bucket'].isoformat(),
            'avg_focus': round(entry['avg_focus'], 2) if entry['avg_focus'] else 0,
            'student_count': entry['student_count']
        })
    
    return time_series_data

def create_instructor_report(session, duration, attendance_metrics, focus_metrics, time_series_data):
    """
    Create a comprehensive report for the instructor
    """
    # Generate visualization
    chart_image = generate_focus_chart(time_series_data, session.id)
    
    # Create the report
    report = Report.objects.create(
        session=session,
        user=session.classroom.instructor,
        report_type='instructor',
        attendance_status=attendance_metrics['attendance_percentage'],
        avg_focus_score=focus_metrics['overall_avg_focus'],
        focus_data_json=time_series_data,
        duration_seconds=duration['duration_seconds'],
        metadata={
            'duration': duration,
            'attendance_metrics': attendance_metrics,
            'focus_metrics': focus_metrics,
            'generated_at': timezone.now().isoformat()
        }
    )
    
    # Attach the chart image if generated
    if chart_image:
        report.chart_image.save(
            f"focus_chart_session_{session.id}.png",
            ContentFile(chart_image),
            save=True
        )
    
    return report

def create_student_reports(session, duration, attendance_metrics, focus_metrics, time_series_data):
    """
    Create individual reports for each student
    """
    student_reports = []
    
    # Get all students who were enrolled in the class
    enrolled_students = Enrollment.objects.filter(classroom=session.classroom)
    
    for enrollment in enrolled_students:
        student = enrollment.student
        
        # Check if student attended
        attended = any(
            sa['student_id'] == student.id and sa['attended'] 
            for sa in attendance_metrics['student_attendance']
        )
        
        if not attended:
            # Create a minimal report for absent students
            report = Report.objects.create(
                session=session,
                user=student,
                report_type='student',
                attendance_status=0,  # 0% attendance
                avg_focus_score=0,
                focus_data_json=[],
                duration_seconds=duration['duration_seconds'],
                metadata={
                    'duration': duration,
                    'attended': False,
                    'generated_at': timezone.now().isoformat()
                }
            )
            student_reports.append(report)
            continue
        
        # Get student's focus data
        student_performances = Performance.objects.filter(
            session=session, 
            student=student
        )
        
        student_avg_focus = student_performances.aggregate(
            avg_focus=Avg('focus_score')
        )['avg_focus'] or 0
        
        # Generate student-specific time series data
        student_time_series = student_performances.annotate(
            time_bucket=TruncMinute('timestamp')
        ).values('time_bucket').annotate(
            avg_focus=Avg('focus_score')
        ).order_by('time_bucket')
        
        student_time_series_data = []
        for entry in student_time_series:
            student_time_series_data.append({
                'timestamp': entry['time_bucket'].isoformat(),
                'avg_focus': round(entry['avg_focus'], 2) if entry['avg_focus'] else 0
            })
        
        # Generate student-specific chart
        student_chart_image = generate_student_focus_chart(
            student_time_series_data, session.id, student.id
        )
        
        # Create the report
        report = Report.objects.create(
            session=session,
            user=student,
            report_type='student',
            attendance_status=100,  # 100% since they attended
            avg_focus_score=round(student_avg_focus, 2),
            focus_data_json=student_time_series_data,
            duration_seconds=duration['duration_seconds'],
            metadata={
                'duration': duration,
                'attended': True,
                'class_avg_focus': focus_metrics['overall_avg_focus'],
                'generated_at': timezone.now().isoformat()
            }
        )
        
        # Attach the chart image if generated
        if student_chart_image:
            report.chart_image.save(
                f"focus_chart_session_{session.id}_student_{student.id}.png",
                ContentFile(student_chart_image),
                save=True
            )
        
        student_reports.append(report)
    
    return student_reports

def generate_focus_chart(time_series_data, session_id):
    """
    Generate a focus chart for the class
    """
    try:
        # Convert to DataFrame for easier plotting
        df = pd.DataFrame(time_series_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Create the plot
        plt.figure(figsize=(10, 6))
        sns.set_style("whitegrid")
        
        # Plot average focus over time
        plt.plot(df['timestamp'], df['avg_focus'], marker='o', linewidth=2, markersize=4)
        
        # Add student count as secondary y-axis
        ax2 = plt.gca().twinx()
        ax2.plot(df['timestamp'], df['student_count'], 'r--', alpha=0.5, linewidth=1)
        ax2.set_ylabel('Number of Students', color='r')
        ax2.tick_params(axis='y', labelcolor='r')
        
        # Format the plot
        plt.title(f'Class Focus Over Time - Session {session_id}')
        plt.xlabel('Time')
        plt.ylabel('Average Focus Score')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save to bytes buffer
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100)
        buffer.seek(0)
        image_data = buffer.getvalue()
        buffer.close()
        plt.close()
        
        return image_data
    except Exception as e:
        logger.error(f"Error generating focus chart: {str(e)}")
        return None

def generate_student_focus_chart(time_series_data, session_id, student_id):
    """
    Generate a focus chart for an individual student
    """
    try:
        # Convert to DataFrame for easier plotting
        df = pd.DataFrame(time_series_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Create the plot
        plt.figure(figsize=(10, 6))
        sns.set_style("whitegrid")
        
        # Plot student's focus over time
        plt.plot(df['timestamp'], df['avg_focus'], marker='o', linewidth=2, markersize=4, color='green')
        
        # Format the plot
        student = User.objects.get(id=student_id)
        plt.title(f'Focus Over Time - {student.full_name} - Session {session_id}')
        plt.xlabel('Time')
        plt.ylabel('Focus Score')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save to bytes buffer
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100)
        buffer.seek(0)
        image_data = buffer.getvalue()
        buffer.close()
        plt.close()
        
        return image_data
    except Exception as e:
        logger.error(f"Error generating student focus chart: {str(e)}")
        return None

def calculate_session_duration(session):
    """
    Calculate the duration of a session
    """
    if session.end_time:
        duration = session.end_time - session.start_time
        return {
            'start_time': session.start_time.isoformat(), # Added .isoformat()
            'end_time': session.end_time.isoformat(),     # Added .isoformat()
            'duration_seconds': duration.total_seconds(),
            'duration_formatted': str(duration)
        }
    else:
        # If session hasn't ended, use current time
        now = timezone.now()
        duration = now - session.start_time
        return {
            'start_time': session.start_time.isoformat(), # Added .isoformat()
            'end_time': now.isoformat(),                 # Added .isoformat()
            'duration_seconds': duration.total_seconds(),
            'duration_formatted': str(duration)
        }

def calculate_attendance_metrics(session, performances):
    """
    Calculate attendance metrics for a session
    """
    # Get all enrolled students
    enrolled_students = Enrollment.objects.filter(
        classroom=session.classroom
    ).values_list('student_id', flat=True)
    
    # Get students who attended
    attended_students = performances.filter(
        attended=True
    ).values_list('student_id', flat=True).distinct()
    
    # Calculate attendance percentage
    total_students = len(enrolled_students)
    present_students = len(attended_students)
    attendance_percentage = (present_students / total_students * 100) if total_students > 0 else 0
    
    # Create attendance status per student
    student_attendance = []
    for student_id in enrolled_students:
        student = User.objects.get(id=student_id)
        attended = student_id in attended_students
        student_attendance.append({
            'student_id': student_id,
            'student_name': student.full_name,
            'attended': attended
        })
    
    return {
        'total_students': total_students,
        'present_students': present_students,
        'attendance_percentage': round(attendance_percentage, 2),
        'student_attendance': student_attendance
    }

def calculate_focus_metrics(performances):
    """
    Calculate focus metrics for a session
    """
    # Calculate average focus score per student
    student_focus = performances.values('student').annotate(
        avg_focus=Avg('focus_score'),
        focus_count=Count('focus_score')
    ).order_by('student')
    
    # Add student names
    for entry in student_focus:
        student = User.objects.get(id=entry['student'])
        entry['student_name'] = student.full_name
    
    # Calculate overall average focus
    overall_avg_focus = performances.aggregate(
        avg_focus=Avg('focus_score')
    )['avg_focus'] or 0
    
    return {
        'overall_avg_focus': round(overall_avg_focus, 2),
        'student_focus': list(student_focus)
    }

def generate_time_series_data(performances):
    """
    Generate time-series data for focus scores
    """
    # Group by minute to create time-series data
    time_series = performances.annotate(
        time_bucket=TruncMinute('timestamp')
    ).values('time_bucket').annotate(
        avg_focus=Avg('focus_score'),
        student_count=Count('student', distinct=True)
    ).order_by('time_bucket')
    
    # Convert to list of dictionaries for JSON serialization
    time_series_data = []
    for entry in time_series:
        time_series_data.append({
            'timestamp': entry['time_bucket'].isoformat(),
            'avg_focus': round(entry['avg_focus'], 2) if entry['avg_focus'] else 0,
            'student_count': entry['student_count']
        })
    
    return time_series_data

def create_instructor_report(session, duration, attendance_metrics, focus_metrics, time_series_data):
    """
    Create a comprehensive report for the instructor
    """
    # Generate visualization
    chart_image = generate_focus_chart(time_series_data, session.id)
    
    # Create the report
    report = Report.objects.create(
        session=session,
        user=session.classroom.instructor,
        report_type='instructor',
        attendance_status=attendance_metrics['attendance_percentage'],
        avg_focus_score=focus_metrics['overall_avg_focus'],
        focus_data_json=time_series_data,
        duration_seconds=duration['duration_seconds'],
        metadata={
            'duration': duration,
            'attendance_metrics': attendance_metrics,
            'focus_metrics': focus_metrics,
            'generated_at': timezone.now().isoformat()
        }
    )
    
    # Attach the chart image if generated
    if chart_image:
        report.chart_image.save(
            f"focus_chart_session_{session.id}.png",
            ContentFile(chart_image),
            save=True
        )
    
    return report

def create_student_reports(session, duration, attendance_metrics, focus_metrics, time_series_data):
    """
    Create individual reports for each student
    """
    student_reports = []
    
    # Get all students who were enrolled in the class
    enrolled_students = Enrollment.objects.filter(classroom=session.classroom)
    
    for enrollment in enrolled_students:
        student = enrollment.student
        
        # Check if student attended
        attended = any(
            sa['student_id'] == student.id and sa['attended'] 
            for sa in attendance_metrics['student_attendance']
        )
        
        if not attended:
            # Create a minimal report for absent students
            report = Report.objects.create(
                session=session,
                user=student,
                report_type='student',
                attendance_status=0,  # 0% attendance
                avg_focus_score=0,
                focus_data_json=[],
                duration_seconds=duration['duration_seconds'],
                metadata={
                    'duration': duration,
                    'attended': False,
                    'generated_at': timezone.now().isoformat()
                }
            )
            student_reports.append(report)
            continue
        
        # Get student's focus data
        student_performances = Performance.objects.filter(
            session=session, 
            student=student
        )
        
        student_avg_focus = student_performances.aggregate(
            avg_focus=Avg('focus_score')
        )['avg_focus'] or 0
        
        # Generate student-specific time series data
        student_time_series = student_performances.annotate(
            time_bucket=TruncMinute('timestamp')
        ).values('time_bucket').annotate(
            avg_focus=Avg('focus_score')
        ).order_by('time_bucket')
        
        student_time_series_data = []
        for entry in student_time_series:
            student_time_series_data.append({
                'timestamp': entry['time_bucket'].isoformat(),
                'avg_focus': round(entry['avg_focus'], 2) if entry['avg_focus'] else 0
            })
        
        # Generate student-specific chart
        student_chart_image = generate_student_focus_chart(
            student_time_series_data, session.id, student.id
        )
        
        # Create the report
        report = Report.objects.create(
            session=session,
            user=student,
            report_type='student',
            attendance_status=100,  # 100% since they attended
            avg_focus_score=round(student_avg_focus, 2),
            focus_data_json=student_time_series_data,
            duration_seconds=duration['duration_seconds'],
            metadata={
                'duration': duration,
                'attended': True,
                'class_avg_focus': focus_metrics['overall_avg_focus'],
                'generated_at': timezone.now().isoformat()
            }
        )
        
        # Attach the chart image if generated
        if student_chart_image:
            report.chart_image.save(
                f"focus_chart_session_{session.id}_student_{student.id}.png",
                ContentFile(student_chart_image),
                save=True
            )
        
        student_reports.append(report)
    
    return student_reports

def generate_focus_chart(time_series_data, session_id):
    """
    Generate a focus chart for the class
    """
    try:
        # Convert to DataFrame for easier plotting
        df = pd.DataFrame(time_series_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Create the plot
        plt.figure(figsize=(10, 6))
        sns.set_style("whitegrid")
        
        # Plot average focus over time
        plt.plot(df['timestamp'], df['avg_focus'], marker='o', linewidth=2, markersize=4)
        
        # Add student count as secondary y-axis
        ax2 = plt.gca().twinx()
        ax2.plot(df['timestamp'], df['student_count'], 'r--', alpha=0.5, linewidth=1)
        ax2.set_ylabel('Number of Students', color='r')
        ax2.tick_params(axis='y', labelcolor='r')
        
        # Format the plot
        plt.title(f'Class Focus Over Time - Session {session_id}')
        plt.xlabel('Time')
        plt.ylabel('Average Focus Score')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save to bytes buffer
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100)
        buffer.seek(0)
        image_data = buffer.getvalue()
        buffer.close()
        plt.close()
        
        return image_data
    except Exception as e:
        logger.error(f"Error generating focus chart: {str(e)}")
        return None

def generate_student_focus_chart(time_series_data, session_id, student_id):
    """
    Generate a focus chart for an individual student
    """
    try:
        # Convert to DataFrame for easier plotting
        df = pd.DataFrame(time_series_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Create the plot
        plt.figure(figsize=(10, 6))
        sns.set_style("whitegrid")
        
        # Plot student's focus over time
        plt.plot(df['timestamp'], df['avg_focus'], marker='o', linewidth=2, markersize=4, color='green')
        
        # Format the plot
        student = User.objects.get(id=student_id)
        plt.title(f'Focus Over Time - {student.full_name} - Session {session_id}')
        plt.xlabel('Time')
        plt.ylabel('Focus Score')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save to bytes buffer
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100)
        buffer.seek(0)
        image_data = buffer.getvalue()
        buffer.close()
        plt.close()
        
        return image_data
    except Exception as e:
        logger.error(f"Error generating student focus chart: {str(e)}")
        return None