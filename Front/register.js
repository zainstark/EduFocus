// register.js
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const roleInput = document.getElementById('role');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const nameValidation = document.getElementById('nameValidation');
    const emailValidation = document.getElementById('emailValidation');
    const roleValidation = document.getElementById('roleValidation');
    const passwordValidation = document.getElementById('passwordValidation');
    const confirmPasswordValidation = document.getElementById('confirmPasswordValidation');
    const registerButton = document.getElementById('registerButton');
    const buttonText = registerButton.querySelector('.button-text');
    const buttonLoader = registerButton.querySelector('.button-loader');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    // Redirect if already logged in
    if (isLoggedIn()) {
        redirectByRole();
    }
    
    // Name validation
    fullNameInput.addEventListener('blur', function() {
        validateName();
    });
    
    // Email validation
    emailInput.addEventListener('blur', function() {
        validateEmail();
    });
    
    // Role validation
    roleInput.addEventListener('change', function() {
        validateRole();
    });
    
    // Password validation and strength meter
    passwordInput.addEventListener('input', function() {
        validatePassword();
        updatePasswordStrength(this.value);
    });
    
    // Confirm password validation
    confirmPasswordInput.addEventListener('blur', function() {
        validateConfirmPassword();
    });
    
    // Form submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const isNameValid = validateName();
        const isEmailValid = validateEmail();
        const isRoleValid = validateRole();
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();
        
        if (isNameValid && isEmailValid && isRoleValid && isPasswordValid && isConfirmPasswordValid) {
            setLoadingState(true);
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            try {
                const response = await fetch('/api/auth/register/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fullName: fullNameInput.value.trim(),
                        email: emailInput.value.trim(),
                        role: roleInput.value,
                        password: passwordInput.value
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token and show success message
                    setAuthToken(data.token);
                    showSuccess('Account created successfully! Redirecting...');
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        redirectByRole(data.user.role);
                    }, 1500);
                } else {
                    // Show error message
                    showError(data.message || 'Registration failed. Please try again.');
                }
            } catch (error) {
                showError('Network error. Please check your connection and try again.');
            } finally {
                setLoadingState(false);
            }
        }
    });
    
    function validateName() {
        const name = fullNameInput.value.trim();
        
        if (!name) {
            showValidationError(fullNameInput, nameValidation, 'Full name is required');
            return false;
        } else if (name.length < 2) {
            showValidationError(fullNameInput, nameValidation, 'Name must be at least 2 characters');
            return false;
        } else if (!/^[a-zA-Z\s]+$/.test(name)) {
            showValidationError(fullNameInput, nameValidation, 'Name can only contain letters and spaces');
            return false;
        } else {
            clearValidationError(fullNameInput, nameValidation);
            return true;
        }
    }
    
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
    
    function validateRole() {
        const role = roleInput.value;
        
        if (!role) {
            showValidationError(roleInput, roleValidation, 'Please select a role');
            return false;
        } else {
            clearValidationError(roleInput, roleValidation);
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
    
    function validateConfirmPassword() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (!confirmPassword) {
            showValidationError(confirmPasswordInput, confirmPasswordValidation, 'Please confirm your password');
            return false;
        } else if (password !== confirmPassword) {
            showValidationError(confirmPasswordInput, confirmPasswordValidation, 'Passwords do not match');
            return false;
        } else {
            clearValidationError(confirmPasswordInput, confirmPasswordValidation);
            return true;
        }
    }
    
    function updatePasswordStrength(password) {
        let strength = 0;
        let message = '';
        let color = '';
        
        if (password.length === 0) {
            message = 'Password strength';
            color = 'transparent';
        } else if (password.length < 6) {
            message = 'Too short';
            color = '#ef4444'; // red
            strength = 25;
        } else {
            // Check for character variety
            if (/[a-z]/.test(password)) strength += 20;
            if (/[A-Z]/.test(password)) strength += 20;
            if (/[0-9]/.test(password)) strength += 20;
            if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
            
            // Adjust based on length
            strength += Math.min(20, (password.length - 6) * 2);
            
            if (strength < 50) {
                message = 'Weak';
                color = '#ef4444'; // red
            } else if (strength < 80) {
                message = 'Medium';
                color = '#f59e0b'; // orange
            } else {
                message = 'Strong';
                color = '#10b981'; // green
            }
        }
        
        strengthFill.style.width = `${strength}%`;
        strengthFill.style.backgroundColor = color;
        strengthText.textContent = message;
        strengthText.style.color = color;
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
            registerButton.disabled = true;
            buttonText.style.display = 'none';
            buttonLoader.style.display = 'block';
        } else {
            registerButton.disabled = false;
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
        }
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        // Scroll to error message
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});