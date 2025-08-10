import json
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Avg
from django.shortcuts import render, redirect, get_object_or_404
from django.utils.crypto import get_random_string
from .models import Classroom, Enrollment, Session, Performance

@login_required
def instructor_dashboard(request):
    if request.user.role != 'instructor':
        return redirect('student_dashboard')

    classes = Classroom.objects.filter(instructor=request.user)

    # Example of simple "reports" list — could be replaced with actual analytics queries
    reports = Session.objects.filter(classroom__in=classes).order_by('-start_time')[:10]

    context = {
        "full_name": request.user.full_name or request.user.username,
        "classes": classes,
        "reports": reports,
    }
    return render(request, "classrooms/instructor_dashboard.html", context)



@login_required
def student_dashboard(request):
    if request.user.role != 'student':
        return redirect('instructor_dashboard')

    enrolled_classes = Classroom.objects.filter(enrollments__student=request.user)
    
    # Example: Active/live classes = active session in an enrolled class
    live_classes = Classroom.objects.filter(
        enrollments__student=request.user,
        sessions__is_active=True
    ).distinct()

    session_history = Performance.objects.filter(
        student=request.user
    ).select_related('session', 'session__classroom').order_by('-session__start_time')

    # Placeholder: notifications could be from another model
    notifications = []

    context = {
        "full_name": request.user.full_name or request.user.username,
        "live_classes": live_classes,
        "enrolled_classes": enrolled_classes,
        "session_history": session_history,
        "notifications": notifications,
    }
    return render(request, "classrooms/student_dashboard.html", context)


@login_required
def create_classroom(request):
    if request.user.role != 'instructor':
        return redirect('home')
    if request.method == "POST":
        name = request.POST.get("class_name")
        description = request.POST.get("description")
        code = get_random_string(6).upper()
        Classroom.objects.create(
            name=name,
            description=description,
            instructor=request.user,
            code=code
        )
        return redirect('instructor_dashboard')
    return redirect('instructor_dashboard')

@login_required
def join_classroom(request):
    if request.user.role != 'student':
        return redirect('home')
    if request.method == "POST":
        code = request.POST.get("class_code").upper()
        classroom = get_object_or_404(Classroom, code=code)
        Enrollment.objects.get_or_create(student=request.user, classroom=classroom)
        return redirect('student_dashboard')
    return redirect('student_dashboard')

@login_required
def teacher_class_view(request, pk):
    classroom = get_object_or_404(Classroom, pk=pk, instructor=request.user)
    sessions = classroom.sessions.order_by('-start_time')
    students = [enr.student for enr in classroom.enrollments.all()]
    
    # Calculate average focus for each session, ordered from oldest to newest for the chart
    session_avg_focus_data = []
    session_labels = []
    # Iterate over sessions in reverse (oldest to newest) for chart
    for session in reversed(sessions):
        session_labels.append(session.start_time.strftime('%b %d'))
        avg_focus = Performance.objects.filter(session=session).aggregate(Avg('focus_score'))['focus_score__avg'] or 0
        session_avg_focus_data.append(round(avg_focus))

    # Get stats for the last session (which is the first in the original 'sessions' queryset)
    last_session = sessions.first()
    last_session_attendance = 0
    last_session_avg_focus = 0
    if last_session:
        attended_students = Performance.objects.filter(session=last_session).count()
        total_students = len(students)
        last_session_attendance = round((attended_students / total_students) * 100) if total_students > 0 else 0
        # Get the avg focus for the last session
        last_session_avg_focus_query = Performance.objects.filter(session=last_session).aggregate(Avg('focus_score'))['focus_score__avg'] or 0
        last_session_avg_focus = round(last_session_avg_focus_query)

    # Data for "Focus vs Time (Last Lecture)" chart (currently empty)
    last_session_time_points = []
    last_session_focus_values = []

    context = {
        "classroom": classroom,
        "sessions": sessions,
        "students": students,
        "last_session_attendance": last_session_attendance,
        "last_session_avg_focus": last_session_avg_focus,
        
        # Chart data as JSON
        "session_labels_json": json.dumps(session_labels),
        "session_avg_focus_data_json": json.dumps(session_avg_focus_data),
        "last_session_time_points_json": json.dumps(last_session_time_points),
        "last_session_focus_values_json": json.dumps(last_session_focus_values),
    }
    return render(request, "classrooms/teacher_class_view.html", context)

@login_required
def student_class_view(request, pk):
    classroom = get_object_or_404(Classroom, pk=pk)
    # Ensure student is enrolled
    if not Enrollment.objects.filter(classroom=classroom, student=request.user).exists():
        return redirect('student_dashboard')
    
    sessions = classroom.sessions.order_by('-start_time')
    my_performance = Performance.objects.filter(session__in=sessions, student=request.user).order_by('-session__start_time')
    
    last_session_perf = my_performance.first()

    # Data for "Average Focus Performance Per Session" chart, ordered oldest to newest
    performance_labels = [perf.session.start_time.strftime('%b %d') for perf in reversed(my_performance)]
    performance_data = [perf.focus_score for perf in reversed(my_performance)]

    context = {
        "classroom": classroom,
        "sessions": sessions,
        "my_performance": my_performance,
        "last_session_perf": last_session_perf,

        # Chart data as JSON
        "performance_labels_json": json.dumps(performance_labels),
        "performance_data_json": json.dumps(performance_data),
    }
    return render(request, "classrooms/student_class_view.html", context)
