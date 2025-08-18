from django.urls import path
from . import views

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='auth'),
    
    # API Endpoints
    path('api/register/', views.RegisterAPIView.as_view(), name='api_register'),
    path('api/login/', views.LoginAPIView.as_view(), name='api_login'),

    path('set-session/', views.SetSessionView.as_view(), name='set_session'),

]