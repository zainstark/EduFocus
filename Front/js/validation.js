// js/validation.js
// Shared validation functions

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePasswordStrength(password) {
    let strength = 0;
    
    if (password.length < 6) return 0;
    
    // Check for character variety
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
    
    // Adjust based on length
    strength += Math.min(20, (password.length - 6) * 2);
    
    return strength;
}

function getPasswordStrengthText(strength) {
    if (strength === 0) return { text: 'Too short', color: '#ef4444' };
    if (strength < 50) return { text: 'Weak', color: '#ef4444' };
    if (strength < 80) return { text: 'Medium', color: '#f59e0b' };
    return { text: 'Strong', color: '#10b981' };
}

function validateName(name) {
    return name.length >= 2 && /^[a-zA-Z\s]+$/.test(name);
}