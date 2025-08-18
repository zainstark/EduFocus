from rest_framework.views import APIView
from django.views import View
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from .models import CustomUser
from django.shortcuts import render, redirect
from django.contrib.auth import get_user_model, login
from .serializers import UserRegisterSerializer, LoginSerializer
from rest_framework.permissions import AllowAny

# ============================
#       API VIEWS
# ============================

User = get_user_model()

class SetSessionView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        token = request.GET.get('token')
        if not token:
            return redirect('home')
        
        try:
            # Verify and decode token
            validated_token = UntypedToken(token)
            user_id = validated_token['user_id']
            user = User.objects.get(id=user_id)
            
            # Log user in with Django session
            login(request, user)
            
            # Redirect based on role
            if user.role == 'student':
                return redirect('student_dashboard')
            elif user.role == 'instructor':
                return redirect('instructor_dashboard')
        except (TokenError, User.DoesNotExist):
            pass
        
        return redirect('home')

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role
                }
            })
        except serializers.ValidationError as e:
            return Response({'error': e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================
#       TEMPLATE VIEWS
# ============================

class HomeView(View):
    def get(self, request):
        return render(request, 'user/home.html')

class RegisterView(View):
    def get(self, request):
        return render(request, 'user/register.html')

class LoginView(View):
    def get(self, request):
        return render(request, 'user/auth.html')