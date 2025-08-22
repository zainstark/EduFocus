// js/auth.js
// Authentication utility functions

function getAuthToken() {
    return localStorage.getItem('edufocus_token');
}

function setAuthToken(token) {
    localStorage.setItem('edufocus_token', token);
}

function removeAuthToken() {
    localStorage.removeItem('edufocus_token');
}

function isLoggedIn() {
    return !!getAuthToken();
}

function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function redirectByRole(role = null) {
    // If role not provided, try to get it from stored user data
    if (!role) {
        const userData = getUserData();
        role = userData ? userData.role : null;
    }
    
    if (role === 'instructor') {
        window.location.href = 'dashboard_instructor.html';
    } else if (role === 'student') {
        window.location.href = 'dashboard_student.html';
    } else {
        // Default to instructor dashboard if role not recognized
        window.location.href = 'dashboard_instructor.html';
    }
}

function getUserData() {
    const token = getAuthToken();
    if (!token) return null;
    
    try {
        // Decode JWT token to get user data (without verification)
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch (e) {
        console.error('Error parsing user data from token', e);
        return null;
    }
}

function logout() {
    removeAuthToken();
    window.location.href = 'login.html';
}

// Check authentication on protected pages
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}