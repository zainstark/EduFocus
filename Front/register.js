// API Configuration
const API_BASE_URL = 'http://localhost:8000/api'; // Update this to your backend URL

// DOM Elements
const registerForm = document.getElementById('registerForm');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const roleSelect = document.getElementById('role');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordToggle = document.getElementById('passwordToggle');
const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
const registerBtn = document.getElementById('registerBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

// Password strength elements
const passwordStrength = document.getElementById('passwordStrength');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');

// Error elements
const fullNameError = document.getElementById('fullNameError');
const emailError = document.getElementById('emailError');
const roleError = document.getElementById('roleError');
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');
const generalError = document.getElementById('generalError');

// Authentication utilities (same as login)
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
function setupPasswordToggle(toggleBtn, passwordField) {
    toggleBtn.addEventListener('click', function() {
        const type = passwordField.type === 'password' ? 'text' : 'password';
        passwordField.type = type;
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
}

setupPasswordToggle(passwordToggle, passwordInput);
setupPasswordToggle(confirmPasswordToggle, confirmPasswordInput);

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = 'Password strength';

    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
    if (password.match(/\d/)) strength += 1;
    if (password.match(/[^a-zA-Z\d]/)) strength += 1;

    strengthBar.className = 'strength-bar';
    
    switch (strength) {
        case 0:
        case 1:
            strengthBar.classList.add('weak');
            feedback = 'Weak password';
            break;
        case 2:
            strengthBar.classList.add('fair');
            feedback = 'Fair password';
            break;
        case 3:
            strengthBar.classList.add('good');
            feedback = 'Good password';
            break;
        case 4:
            strengthBar.classList.add('strong');
            feedback = 'Strong password';
            break;
    }

    strengthText.textContent = feedback;
    return strength;
}

// Form validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateFullName(name) {
    return name.trim().length >= 2 && name.trim().length <= 255;
}

function validatePassword(password) {
    return password.length >= 8;
}

function validateForm() {
    let isValid = true;
    clearErrors();

    // Full name validation
    const fullName = fullNameInput.value.trim();
    if (!fullName) {
        showError(fullNameError, 'Full name is required');
        fullNameInput.classList.add('invalid');
        isValid = false;
    } else if (!validateFullName(fullName)) {
        showError(fullNameError, 'Full name must be between 2-255 characters');
        fullNameInput.classList.add('invalid');
        isValid = false;
    } else {
        fullNameInput.classList.remove('invalid');
        fullNameInput.classList.add('valid');
    }

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

    // Role validation
    const role = roleSelect.value;
    if (!role) {
        showError(roleError, 'Please select your role');
        roleSelect.classList.add('invalid');
        isValid = false;
    } else {
        roleSelect.classList.remove('invalid');
        roleSelect.classList.add('valid');
    }

    // Password validation
    const password = passwordInput.value;
    if (!password) {
        showError(passwordError, 'Password is required');
        passwordInput.classList.add('invalid');
        isValid = false;
    } else if (!validatePassword(password)) {
        showError(passwordError, 'Password must be at least 8 characters');
        passwordInput.classList.add('invalid');
        isValid = false;
    } else {
        passwordInput.classList.remove('invalid');
        passwordInput.classList.add('valid');
    }

    // Confirm password validation
    const confirmPassword = confirmPasswordInput.value;
    if (!confirmPassword) {
        showError(confirmPasswordError, 'Please confirm your password');
        confirmPasswordInput.classList.add('invalid');
        isValid = false;
    } else if (password !== confirmPassword) {
        showError(confirmPasswordError, 'Passwords do not match');
        confirmPasswordInput.classList.add('invalid');
        isValid = false;
    } else {
        confirmPasswordInput.classList.remove('invalid');
        confirmPasswordInput.classList.add('valid');
    }

    return isValid;
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function clearErrors() {
    [fullNameError, emailError, roleError, passwordError, confirmPasswordError, generalError].forEach(element => {
        element.textContent = '';
        element.classList.remove('show');
    });

    [fullNameInput, emailInput, roleSelect, passwordInput, confirmPasswordInput].forEach(input => {
        input.classList.remove('invalid', 'valid');
    });
}

function setLoading(isLoading) {
    if (isLoading) {
        registerBtn.classList.add('loading');
        registerBtn.disabled = true;
    } else {
        registerBtn.classList.remove('loading');
        registerBtn.disabled = false;
    }
}

// API call to register user
async function registerUser(userData) {
    console.log("registerUser function called");
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            // Store tokens and user profile
            AuthManager.setTokens(data.access, data.refresh);
            AuthManager.setUserProfile(data.user);
            
            // Show success animation
            registerBtn.style.background = 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)';
            registerBtn.querySelector('.btn-text').textContent = 'Account Created!';
            
            // Redirect after a short delay
            setTimeout(() => {
                AuthManager.redirectToDashboard();
            }, 1500);
            
        } else {
            // Handle different error types
            if (data.non_field_errors) {
                showError(generalError, data.non_field_errors[0]);
            } else {
                // Field-specific errors
                if (data.full_name) {
                    showError(fullNameError, data.full_name[0]);
                    fullNameInput.classList.add('invalid');
                }
                if (data.email) {
                    showError(emailError, data.email[0]);
                    emailInput.classList.add('invalid');
                }
                if (data.role) {
                    showError(roleError, data.role[0]);
                    roleSelect.classList.add('invalid');
                }
                if (data.password) {
                    showError(passwordError, data.password[0]);
                    passwordInput.classList.add('invalid');
                }
                if (data.password_confirm) {
                    showError(confirmPasswordError, data.password_confirm[0]);
                    confirmPasswordInput.classList.add('invalid');
                }
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError(generalError, 'Network error. Please check your connection and try again.');
    }
}

// Form submission
registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    setLoading(true);
    
    const userData = {
        full_name: fullNameInput.value.trim(),
        email: emailInput.value.trim(),
        role: roleSelect.value,
        password: passwordInput.value,
        password_confirm: confirmPasswordInput.value
    };

    try {
        await registerUser(userData);
    } finally {
        if (!AuthManager.isAuthenticated()) {
            setLoading(false);
        }
    }
});

// Real-time validation and feedback
fullNameInput.addEventListener('input', function() {
    const name = this.value.trim();
    if (name && validateFullName(name)) {
        this.classList.remove('invalid');
        this.classList.add('valid');
        fullNameError.classList.remove('show');
    } else if (this.classList.contains('invalid') || this.classList.contains('valid')) {
        this.classList.remove('valid');
        if (name) this.classList.add('invalid');
    }
});

emailInput.addEventListener('input', function() {
    const email = this.value.trim();
    if (email && validateEmail(email)) {
        this.classList.remove('invalid');
        this.classList.add('valid');
        emailError.classList.remove('show');
    } else if (this.classList.contains('invalid') || this.classList.contains('valid')) {
        this.classList.remove('valid');
        if (email) this.classList.add('invalid');
    }
});

roleSelect.addEventListener('change', function() {
    if (this.value) {
        this.classList.remove('invalid');
        this.classList.add('valid');
        roleError.classList.remove('show');
    }
});

passwordInput.addEventListener('input', function() {
    const password = this.value;
    
    // Show/hide strength indicator
    if (password) {
        passwordStrength.classList.add('show');
        checkPasswordStrength(password);
    } else {
        passwordStrength.classList.remove('show');
    }
    
    // Validation feedback
    if (password && validatePassword(password)) {
        this.classList.remove('invalid');
        this.classList.add('valid');
        passwordError.classList.remove('show');
    } else if (this.classList.contains('invalid') || this.classList.contains('valid')) {
        this.classList.remove('valid');
        if (password) this.classList.add('invalid');
    }
    
    // Revalidate confirm password if it has a value
    if (confirmPasswordInput.value) {
        validatePasswordMatch();
    }
});

confirmPasswordInput.addEventListener('input', validatePasswordMatch);

function validatePasswordMatch() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword && password === confirmPassword) {
        confirmPasswordInput.classList.remove('invalid');
        confirmPasswordInput.classList.add('valid');
        confirmPasswordError.classList.remove('show');
    } else if (confirmPasswordInput.classList.contains('invalid') || confirmPasswordInput.classList.contains('valid')) {
        confirmPasswordInput.classList.remove('valid');
        if (confirmPassword) confirmPasswordInput.classList.add('invalid');
    }
}

// Clear general errors when user starts typing
[fullNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('input', function() {
        if (generalError.classList.contains('show')) {
            generalError.classList.remove('show');
        }
    });
});

roleSelect.addEventListener('change', function() {
    if (generalError.classList.contains('show')) {
        generalError.classList.remove('show');
    }
});

// Add visual feedback for input focus
[fullNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
        this.parentElement.style.transition = 'transform 0.2s ease';
    });

    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// Special handling for role select
roleSelect.addEventListener('focus', function() {
    this.parentElement.classList.add('focused');
});

roleSelect.addEventListener('blur', function() {
    this.parentElement.classList.remove('focused');
});

// Handle Enter key
registerForm.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        registerBtn.click();
    }
});

// Form progress indication
function updateFormProgress() {
    const inputs = [fullNameInput, emailInput, roleSelect, passwordInput, confirmPasswordInput];
    const filledInputs = inputs.filter(input => input.value.trim() !== '').length;
    const progress = (filledInputs / inputs.length) * 100;
    
    // You could add a progress bar here if desired
    document.documentElement.style.setProperty('--form-progress', `${progress}%`);
}

// Monitor form completion
[fullNameInput, emailInput, roleSelect, passwordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('input', updateFormProgress);
});

roleSelect.addEventListener('change', updateFormProgress);

// Initialize
updateFormProgress();