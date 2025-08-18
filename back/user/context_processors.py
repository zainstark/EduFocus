def auth_tokens(request):
    return {
        'access_token': request.COOKIES.get('access_token', ''),
        'refresh_token': request.COOKIES.get('refresh_token', ''),
    }