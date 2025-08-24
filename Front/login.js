// API Configuration
const API_BASE_URL = 'http://localhost:8000/api'; // Update this to your backend URL

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const loginBtn = document.getElementById('loginBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

// Error elements
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const generalError = document.getElementById('generalError');

// Authentication utilities
class AuthManager {
    static setTokens(accessToken, refreshToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
    }

    static setUserProfile(user) {
        localStorage.setItem('user_profile', JSON.stringify(user));
    }

    static getUserProfile() {
        const profile = localStorage.getItem('user_profile');
        return profile ? JSON.parse(profile) : null;
    }

    static clearAuth() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');
    }

    static isAuthenticated() {
        return !!localStorage.getItem('access_token');
    }

    static redirectToDashboard() {
        const user = this.getUserProfile();
        if (user) {
            if (user.role === 'instructor') {
                window.location.href = 'instructor-dashboard.html';
            } else if (user.role === 'student') {
                window.location.href = 'student-dashboard.html';
            }
        }
    }
}

// Check if user is already authenticated
if (AuthManager.isAuthenticated()) {
    AuthManager.redirectToDashboard();
}

// Password toggle functionality
passwordToggle.addEventListener('click', function() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});

// Form validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateForm() {
    let isValid = true;
    clearErrors();

    // Email validation
    const email = emailInput.value.trim();
    if (!email) {
        showError(emailError, 'Email is required');
        emailInput.classList.add('invalid');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError(emailError, 'Please enter a valid email address');
        emailInput.classList.add('invalid');
        isValid = false;
    } else {
        emailInput.classList.remove('invalid');
        emailInput.classList.add('valid');
    }

    // Password validation
    const password = passwordInput.value;
    if (!password) {
        showError(passwordError, 'Password is required');
        passwordInput.classList.add('invalid');
        isValid = false;
    } else if (password.length < 8) {
        showError(passwordError, 'Password must be at least 8 characters');
        passwordInput.classList.add('invalid');
        isValid = false;
    } else {
        passwordInput.classList.remove('invalid');
        passwordInput.classList.add('valid');
    }

    return isValid;
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function clearErrors() {
    [emailError, passwordError, generalError].forEach(element => {
        element.textContent = '';
        element.classList.remove('show');
    });

    [emailInput, passwordInput].forEach(input => {
        input.classList.remove('invalid', 'valid');
    });
}

function setLoading(isLoading) {
    if (isLoading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }
}

// API call to login
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Store tokens and user profile
            AuthManager.setTokens(data.access, data.refresh);
            AuthManager.setUserProfile(data.user);
            
            // Show success animation
            loginBtn.style.background = 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)';
            loginBtn.querySelector('.btn-text').textContent = 'Success!';
            
            // Redirect after a short delay
            setTimeout(() => {
                AuthManager.redirectToDashboard();
            }, 1000);
            
        } else {
            // Handle different error types
            if (data.non_field_errors) {
                showError(generalError, data.non_field_errors[0]);
            } else if (data.email) {
                showError(emailError, data.email[0]);
                emailInput.classList.add('invalid');
            } else if (data.password) {
                showError(passwordError, data.password[0]);
                passwordInput.classList.add('invalid');
            } else {
                showError(generalError, 'Invalid credentials. Please try again.');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(generalError, 'Network error. Please check your connection and try again.');
    }
}

// Form submission
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    setLoading(true);
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        await loginUser(email, password);
    } finally {
        if (!AuthManager.isAuthenticated()) {
            setLoading(false);
        }
    }
});

// Real-time validation
emailInput.addEventListener('input', function() {
    if (this.classList.contains('invalid') || this.classList.contains('valid')) {
        const email = this.value.trim();
        if (email && validateEmail(email)) {
            this.classList.remove('invalid');
            this.classList.add('valid');
            emailError.classList.remove('show');
        } else if (email) {
            this.classList.remove('valid');
            this.classList.add('invalid');
        }
    }
});

passwordInput.addEventListener('input', function() {
    if (this.classList.contains('invalid') || this.classList.contains('valid')) {
        const password = this.value;
        if (password && password.length >= 8) {
            this.classList.remove('invalid');
            this.classList.add('valid');
            passwordError.classList.remove('show');
        } else if (password) {
            this.classList.remove('valid');
            this.classList.add('invalid');
        }
    }
});

// Clear general errors when user starts typing
[emailInput, passwordInput].forEach(input => {
    input.addEventListener('input', function() {
        if (generalError.classList.contains('show')) {
            generalError.classList.remove('show');
        }
    });
});

// Handle Enter key
loginForm.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        loginBtn.click();
    }
});

// Add some visual feedback for input focus
[emailInput, passwordInput].forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
        this.parentElement.style.transition = 'transform 0.2s ease';
    });

    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});