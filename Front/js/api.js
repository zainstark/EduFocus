// js/api.js
// API utility functions

const API_BASE_URL = 'http://localhost:8000';

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const authHeaders = getAuthHeaders();
    
    const config = {
        headers: {
            ...authHeaders,
            ...options.headers
        },
        ...options
    };
    
    try {
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            // Token expired or invalid
            removeAuthToken();
            window.location.href = 'login.html';
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Classroom API functions
async function getClassrooms() {
    return await apiRequest('/api/classrooms/');
}

async function getClassroom(id) {
    return await apiRequest(`/api/classrooms/${id}/`);
}

async function createClassroom(data) {
    return await apiRequest('/api/classrooms/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

async function updateClassroom(id, data) {
    return await apiRequest(`/api/classrooms/${id}/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

async function deleteClassroom(id) {
    return await apiRequest(`/api/classrooms/${id}/`, {
        method: 'DELETE'
    });
}

// Session API functions
async function getSessions(classroomId = null) {
    const endpoint = classroomId ? `/api/sessions/?classroom_id=${classroomId}` : '/api/sessions/';
    return await apiRequest(endpoint);
}

async function getSession(id) {
    return await apiRequest(`/api/sessions/${id}/`);
}

async function createSession(data) {
    return await apiRequest('/api/sessions/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

async function updateSession(id, data) {
    return await apiRequest(`/api/sessions/${id}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

async function endSession(id) {
    return await apiRequest(`/api/sessions/${id}/end/`, {
        method: 'POST'
    });
}

// User API functions
async function getUserProfile() {
    return await apiRequest('/api/users/me/');
}

async function updateUserProfile(data) {
    return await apiRequest('/api/users/me/', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

async function changePassword(data) {
    return await apiRequest('/api/users/change-password/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

// Report API functions
async function getReports(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/api/reports/?${queryParams}` : '/api/reports/';
    return await apiRequest(endpoint);
}

async function generateReport(data) {
    return await apiRequest('/api/reports/generate/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

// WebSocket connection for live sessions
function createWebSocketConnection(sessionId) {
    const token = getAuthToken();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/session/${sessionId}/?token=${token}`;
    
    return new WebSocket(wsUrl);
}