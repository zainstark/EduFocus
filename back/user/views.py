from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django import forms
from .models import CustomUser


# ============================
#       FORMS
# ============================

# ----- Registration Form -----
class CustomRegisterForm(forms.ModelForm):
    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={"class": "form-control"})
    )
    password2 = forms.CharField(
        label="Confirm Password",
        widget=forms.PasswordInput(attrs={"class": "form-control"})
    )

    class Meta:
        model = CustomUser
        fields = ['full_name', 'email', 'role']
        widgets = {
            'full_name': forms.TextInput(attrs={"class": "form-control"}),
            'email': forms.EmailInput(attrs={"class": "form-control"}),
        }

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if CustomUser.objects.filter(email=email).exists():
            raise forms.ValidationError("Email is already registered.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        p1 = cleaned_data.get("password1")
        p2 = cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("Passwords do not match.")
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


# ----- Login Form -----
class EmailAuthenticationForm(forms.Form):
    email = forms.EmailField(widget=forms.EmailInput(attrs={"class": "form-control"}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={"class": "form-control"}))

    def clean(self):
        email = self.cleaned_data.get("email")
        password = self.cleaned_data.get("password")

        if email and password:
            user = authenticate(email=email, password=password)
            if not user:
                raise forms.ValidationError("Invalid email or password.")
            self.user = user
        return self.cleaned_data

    def get_user(self):
        return getattr(self, 'user', None)


# ============================
#       VIEWS
# ============================

# Home
def home_view(request):
    return render(request, 'user/home.html')


# Register
def register_view(request):
    if request.method == "POST":
        form = CustomRegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect_dashboard(user)
    else:
        form = CustomRegisterForm()
    return render(request, 'user/register.html', {'form': form})


# Login
def login_view(request):
    if request.method == "POST":
        form = EmailAuthenticationForm(request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect_dashboard(user)
    else:
        form = EmailAuthenticationForm()
    return render(request, 'user/auth.html', {'form': form})


# Dashboard Redirect
def redirect_dashboard(user):
    if user.role == 'student':
        return redirect('/classrooms/student/dashboard/')
    elif user.role == 'instructor':
        return redirect('/classrooms/instructor/dashboard/')
    return redirect('/')
