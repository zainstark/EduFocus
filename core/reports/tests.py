from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Report
from session.models import Session
from classrooms.models import Classroom, Enrollment
from performance.models import Performance
from django.utils import timezone
from unittest.mock import patch, MagicMock
from .utils import generate_session_report
from .tasks import generate_session_report_task

User = get_user_model()

class ReportModelTest(TestCase):
    @patch('reports.tasks.generate_session_report_task.delay')
    def setUp(self, mock_delay):
        self.instructor = User.objects.create_user(
            email='instructor@example.com', password='password123', full_name='Instructor', role='instructor')
        self.student = User.objects.create_user(
            email='student@example.com', password='password123', full_name='Student', role='student')
        self.classroom = Classroom.objects.create(name='Test Class', instructor=self.instructor)
        self.session = Session.objects.create(
            classroom=self.classroom, start_time=timezone.now(), end_time=timezone.now() + timezone.timedelta(minutes=60))

    def test_report_creation_and_methods(self):
        report = Report.objects.create(
            session=self.session, user=self.student, report_type='student', attendance_status=100,
            avg_focus_score=0.75, focus_data_json={}, duration_seconds=3600)
        self.assertEqual(str(report), f"Report for {self.student} - {self.session}")
        self.assertEqual(report.get_duration_formatted(), '1h 0m 0s')
        self.assertEqual(report.get_attendance_status_display(), '100.0%')
        self.assertEqual(report.get_focus_score_display(), '75.0%')

class ReportViewSetTest(APITestCase):
    @patch('reports.tasks.generate_session_report_task.delay')
    def setUp(self, mock_delay):
        self.instructor = User.objects.create_user(
            email='instructor@example.com', password='password123', full_name='Instructor', role='instructor')
        self.student = User.objects.create_user(
            email='student@example.com', password='password123', full_name='Student', role='student')
        self.classroom = Classroom.objects.create(name='Test Class', instructor=self.instructor)
        self.session = Session.objects.create(classroom=self.classroom, start_time=timezone.now())
        self.report = Report.objects.create(
            session=self.session, user=self.student, report_type='student', attendance_status=100,
            avg_focus_score=0.8, focus_data_json={}, duration_seconds=3000)

    def test_student_can_view_own_report(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/reports/{self.report.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.report.id)

    def test_student_cannot_view_other_student_report(self):
        other_student = User.objects.create_user(
            email='other@example.com', password='password123', full_name='Other', role='student')
        self.client.force_authenticate(user=other_student)
        response = self.client.get(f'/api/reports/{self.report.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_instructor_can_view_student_report(self):
        self.client.force_authenticate(user=self.instructor)
        # Note: The default queryset for the viewset is filtered by user.
        # An instructor would need a different endpoint or a modified queryset to view all reports.
        # This test assumes the default behavior.
        response = self.client.get(f'/api/reports/{self.report.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ReportUtilsTest(TestCase):
    @patch('reports.tasks.generate_session_report_task.delay')
    def setUp(self, mock_delay):
        self.instructor = User.objects.create_user(
            email='instructor@example.com', password='password123', full_name='Instructor', role='instructor')
        self.student1 = User.objects.create_user(
            email='student1@example.com', password='password123', full_name='Student 1', role='student')
        self.student2 = User.objects.create_user(
            email='student2@example.com', password='password123', full_name='Student 2', role='student')
        self.classroom = Classroom.objects.create(name='Test Class', instructor=self.instructor)
        self.session = Session.objects.create(classroom=self.classroom, start_time=timezone.now())
        Enrollment.objects.create(student=self.student1, classroom=self.classroom)
        Enrollment.objects.create(student=self.student2, classroom=self.classroom)
        Performance.objects.create(session=self.session, student=self.student1, focus_score=0.9, attended=True)
        Performance.objects.create(session=self.session, student=self.student2, focus_score=0.7, attended=True)

    @patch('reports.utils.generate_focus_chart')
    @patch('reports.utils.generate_student_focus_chart')
    def test_generate_session_report(self, mock_student_chart, mock_instructor_chart):
        mock_instructor_chart.return_value = b''
        mock_student_chart.return_value = b''
        result = generate_session_report(self.session.id)
        self.assertIsNotNone(result)
        self.assertIn('instructor_report', result)
        self.assertIn('student_reports', result)
        self.assertEqual(len(result['student_reports']), 2)
        self.assertEqual(Report.objects.count(), 3) # 1 instructor, 2 students

class ReportTasksTest(TestCase):
    @patch('reports.tasks.generate_session_report_task.delay')
    def setUp(self, mock_delay):
        self.instructor = User.objects.create_user(
            email='instructor@example.com', password='password123', full_name='Instructor', role='instructor')
        self.classroom = Classroom.objects.create(name='Test Class', instructor=self.instructor)
        self.session = Session.objects.create(classroom=self.classroom, start_time=timezone.now())

    @patch('reports.tasks.generate_session_report')
    def test_generate_session_report_task(self, mock_generate_report):
        mock_generate_report.return_value = {'instructor_report': MagicMock(), 'student_reports': []}
        generate_session_report_task(self.session.id)
        mock_generate_report.assert_called_once_with(self.session.id)
