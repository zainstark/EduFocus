import jwt
from django.conf import settings
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import redirect
from django.contrib.auth import get_user_model

User = get_user_model()

def get_user_from_token(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        return User.objects.get(id=user_id)
    except Exception:
        return None

class JWTAuthenticationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Skip for API endpoints, set-session, and login page
        if (
            request.path.startswith('/api/')
            or request.path == '/set-session/'
            or request.path.startswith('/auth') 
             or request.path.startswith('/') # ✅ don't intercept login page
        ):
            return None

        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return redirect('auth')

        try:
            request.user = get_user_from_token(access_token)
            if request.user is None:
                return redirect('auth')
        except jwt.ExpiredSignatureError:
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                try:
                    refresh = RefreshToken(refresh_token)
                    new_access = str(refresh.access_token)
                    response = redirect(request.path)
                    response.set_cookie('access_token', new_access, httponly=True, secure=True)
                    return response
                except:
                    return JsonResponse({'error': 'Invalid refresh token'}, status=401)
            else:
                return redirect('auth')
        except:
            return redirect('auth')

        return None
