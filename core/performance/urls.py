from django.urls import include, path
from rest_framework_nested import routers
from .views import PerformanceViewSet

session_router = routers.NestedDefaultRouter()
session_router.register('performances', PerformanceViewSet, basename='session-performance')


urlpatterns = [
    path('', include(session_router.urls)),
]