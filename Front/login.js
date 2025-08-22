// login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailValidation = document.getElementById('emailValidation');
    const passwordValidation = document.getElementById('passwordValidation');
    const loginButton = document.getElementById('loginButton');
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = loginButton.querySelector('.button-loader');
    const errorMessage = document.getElementById('errorMessage');
    
    // Redirect if already logged in
    if (isLoggedIn()) {
        redirectByRole();
    }
    
    // Email validation
    emailInput.addEventListener('blur', function() {
        validateEmail();
    });
    
    // Password validation
    passwordInput.addEventListener('blur', function() {
        validatePassword();
    });
    
    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        
        if (isEmailValid && isPasswordValid) {
            setLoadingState(true);
            errorMessage.style.display = 'none';
            
            try {
                const response = await fetch('/api/auth/login/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: emailInput.value,
                        password: passwordInput.value
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token and redirect
                    setAuthToken(data.token);
                    redirectByRole(data.user.role);
                } else {
                    // Show error message
                    showError(data.message || 'Login failed. Please try again.');
                }
            } catch (error) {
                showError('Network error. Please check your connection and try again.');
            } finally {
                setLoadingState(false);
            }
        }
    });
    
    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showValidationError(emailInput, emailValidation, 'Email is required');
            return false;
        } else if (!emailRegex.test(email)) {
            showValidationError(emailInput, emailValidation, 'Please enter a valid email address');
            return false;
        } else {
            clearValidationError(emailInput, emailValidation);
            return true;
        }
    }
    
    function validatePassword() {
        const password = passwordInput.value;
        
        if (!password) {
            showValidationError(passwordInput, passwordValidation, 'Password is required');
            return false;
        } else if (password.length < 6) {
            showValidationError(passwordInput, passwordValidation, 'Password must be at least 6 characters');
            return false;
        } else {
            clearValidationError(passwordInput, passwordValidation);
            return true;
        }
    }
    
    function showValidationError(input, validationElement, message) {
        input.classList.add('invalid');
        validationElement.textContent = message;
    }
    
    function clearValidationError(input, validationElement) {
        input.classList.remove('invalid');
        validationElement.textContent = '';
    }
    
    function setLoadingState(isLoading) {
        if (isLoading) {
            loginButton.disabled = true;
            buttonText.style.display = 'none';
            buttonLoader.style.display = 'block';
        } else {
            loginButton.disabled = false;
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
        }
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
});