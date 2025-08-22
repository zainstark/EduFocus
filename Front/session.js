// sessions.js
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!requireAuth()) return;
    
    const userData = getUserData();
    const isInstructor = userData.role === 'instructor';
    const isStudent = userData.role === 'student';
    
    // Set user role in UI
    document.getElementById('userRole').textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    
    // Show appropriate actions based on role
    if (isInstructor) {
        document.getElementById('instructorActions').style.display = 'block';
    }
    
    // Get classroom ID from URL parameters if present
    const urlParams = new URLSearchParams(window.location.search);
    const classroomId = urlParams.get('classroom_id');
    
    // DOM elements
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    const logoutButton = document.getElementById('logoutButton');
    const createSessionBtn = document.getElementById('createSessionBtn');
    const classroomFilter = document.getElementById('classroomFilter');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    
    // Modal elements
    const createModal = document.getElementById('createModal');
    const closeCreateModal = document.getElementById('closeCreateModal');
    const cancelCreate = document.getElementById('cancelCreate');
    const createSessionForm = document.getElementById('createSessionForm');
    const sessionClassroom = document.getElementById('sessionClassroom');
    const sessionTypeRadios = document.querySelectorAll('input[name="sessionType"]');
    const scheduledTimeGroup = document.getElementById('scheduledTimeGroup');
    const scheduledTime = document.getElementById('scheduledTime');
    
    const actionsModal = document.getElementById('actionsModal');
    const actionsModalTitle = document.getElementById('actionsModalTitle');
    const closeActionsModal = document.getElementById('closeActionsModal');
    const closeActions = document.getElementById('closeActions');
    const sessionDetails = document.getElementById('sessionDetails');
    const sessionActions = document.getElementById('sessionActions');
    
    // Content elements
    const sessionsList = document.getElementById('sessionsList');
    const noSessionsMessage = document.getElementById('noSessionsMessage');
    const noSessionsText = document.getElementById('noSessionsText');
    const noSessionsAction = document.getElementById('noSessionsAction');
    const sessionsLoading = document.getElementById('sessionsLoading');
    
    // State
    let allSessions = [];
    let filteredSessions = [];
    let allClassrooms = [];
    let currentSession = null;
    
    // Event listeners
    userMenuButton.addEventListener('click', toggleUserDropdown);
    logoutButton.addEventListener('click', handleLogout);
    
    if (isInstructor) {
        createSessionBtn.addEventListener('click', openCreateModal);
        closeCreateModal.addEventListener('click', closeCreateModalHandler);
        cancelCreate.addEventListener('click', closeCreateModalHandler);
        createSessionForm.addEventListener('submit', handleCreateSession);
        
        // Session type toggle
        sessionTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                scheduledTimeGroup.style.display = this.value === 'scheduled' ? 'block' : 'none';
                if (this.value === 'scheduled') {
                    // Set minimum datetime to current time
                    const now = new Date();
                    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    scheduledTime.min = localDateTime;
                }
            });
        });
    }
    
    classroomFilter.addEventListener('change', filterSessions);
    statusFilter.addEventListener('change', filterSessions);
    searchInput.addEventListener('input', filterSessions);
    
    closeActionsModal.addEventListener('click', closeActionsModalHandler);
    closeActions.addEventListener('click', closeActionsModalHandler);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    });
    
    // Load initial data
    loadClassrooms().then(() => {
        // If classroom ID is specified in URL, select it in the filter
        if (classroomId) {
            classroomFilter.value = classroomId;
        }
        loadSessions();
    });
    
    function toggleUserDropdown() {
        userDropdown.classList.toggle('show');
    }
    
    function handleLogout() {
        logout();
    }
    
    function openCreateModal() {
        createModal.style.display = 'flex';
    }
    
    function closeCreateModalHandler() {
        createModal.style.display = 'none';
        createSessionForm.reset();
        scheduledTimeGroup.style.display = 'none';
    }
    
    function openActionsModal(session) {
        currentSession = session;
        actionsModalTitle.textContent = session.title;
        renderSessionDetails(session);
        renderSessionActions(session);
        actionsModal.style.display = 'flex';
    }
    
    function closeActionsModalHandler() {
        actionsModal.style.display = 'none';
        currentSession = null;
    }
    
    async function loadClassrooms() {
        try {
            const endpoint = isInstructor ? '/api/classrooms/' : '/api/classrooms/enrolled/';
            const response = await fetch(endpoint, { headers: getAuthHeaders() });
            
            if (response.ok) {
                allClassrooms = await response.json();
                populateClassroomFilter();
                populateSessionClassroomSelect();
            } else {
                throw new Error('Failed to load classrooms');
            }
        } catch (error) {
            console.error('Error loading classrooms:', error);
            showError('Failed to load classrooms. Please try again.');
        }
    }
    
    function populateClassroomFilter() {
        classroomFilter.innerHTML = '<option value="">All Classrooms</option>';
        
        allClassrooms.forEach(classroom => {
            const option = document.createElement('option');
            option.value = classroom.id;
            option.textContent = classroom.name;
            classroomFilter.appendChild(option);
        });
    }
    
    function populateSessionClassroomSelect() {
        sessionClassroom.innerHTML = '<option value="">Select a classroom</option>';
        
        allClassrooms.forEach(classroom => {
            const option = document.createElement('option');
            option.value = classroom.id;
            option.textContent = classroom.name;
            sessionClassroom.appendChild(option);
        });
    }
    
    async function loadSessions() {
        sessionsLoading.style.display = 'flex';
        sessionsList.innerHTML = '';
        noSessionsMessage.style.display = 'none';
        
        try {
            let endpoint = '/api/sessions/';
            const classroomId = classroomFilter.value;
            
            if (classroomId) {
                endpoint += `?classroom_id=${classroomId}`;
            }
            
            const response = await fetch(endpoint, { headers: getAuthHeaders() });
            
            if (response.ok) {
                allSessions = await response.json();
                filterSessions();
            } else {
                throw new Error('Failed to load sessions');
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            showError('Failed to load sessions. Please try again.');
            showNoSessionsMessage();
        } finally {
            sessionsLoading.style.display = 'none';
        }
    }
    
    function filterSessions() {
        const status = statusFilter.value;
        const searchTerm = searchInput.value.toLowerCase();
        
        filteredSessions = allSessions.filter(session => {
            // Filter by status
            if (status && session.status !== status) {
                return false;
            }
            
            // Filter by search term
            if (searchTerm) {
                const matchesTitle = session.title.toLowerCase().includes(searchTerm);
                const matchesDescription = session.description && session.description.toLowerCase().includes(searchTerm);
                const matchesClassroom = session.classroom_name.toLowerCase().includes(searchTerm);
                
                if (!matchesTitle && !matchesDescription && !matchesClassroom) {
                    return false;
                }
            }
            
            return true;
        });
        
        renderSessions();
    }
    
    function renderSessions() {
        sessionsList.innerHTML = '';
        
        if (filteredSessions.length === 0) {
            showNoSessionsMessage();
            return;
        }
        
        filteredSessions.forEach(session => {
            const sessionItem = createSessionItem(session);
            sessionsList.appendChild(sessionItem);
        });
    }
    
    function createSessionItem(session) {
        const div = document.createElement('div');
        div.className = 'session-item';
        
        // Format dates
        const startTime = new Date(session.start_time).toLocaleString();
        const endTime = session.end_time ? new Date(session.end_time).toLocaleString() : 'Ongoing';
        
        // Calculate duration if session has ended
        let duration = '';
        if (session.end_time) {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            const diffMs = end - start;
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffMins = Math.floor((diffMs % 3600000) / 60000);
            duration = `${diffHrs}h ${diffMins}m`;
        }
        
        // Determine status class and text
        let statusClass = '';
        let statusText = '';
        
        switch (session.status) {
            case 'scheduled':
                statusClass = 'status-scheduled';
                statusText = 'Scheduled';
                break;
            case 'live':
                statusClass = 'status-live';
                statusText = 'Live';
                break;
            case 'paused':
                statusClass = 'status-paused';
                statusText = 'Paused';
                break;
            case 'ended':
                statusClass = 'status-ended';
                statusText = 'Ended';
                break;
        }
        
        div.innerHTML = `
            <div class="session-info">
                <h3>${session.title}</h3>
                <div class="session-meta">
                    <div class="session-meta-item">
                        <i class="fas fa-chalkboard"></i>
                        <span>${session.classroom_name}</span>
                    </div>
                    <div class="session-meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${startTime}</span>
                    </div>
                </div>
                <div class="session-status ${statusClass}">
                    <i class="fas fa-circle"></i>
                    <span>${statusText}</span>
                </div>
                ${session.description ? `<p>${session.description}</p>` : ''}
                ${duration ? `<div class="session-duration">Duration: ${duration}</div>` : ''}
            </div>
            <div class="session-actions">
                ${getSessionActionButtons(session)}
            </div>
        `;
        
        // Add event listeners to action buttons
        const viewBtn = div.querySelector('[data-action="view"]');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => openActionsModal(session));
        }
        
        const joinBtn = div.querySelector('[data-action="join"]');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => joinSession(session));
        }
        
        const startBtn = div.querySelector('[data-action="start"]');
        if (startBtn) {
            startBtn.addEventListener('click', () => startSession(session));
        }
        
        const pauseBtn = div.querySelector('[data-action="pause"]');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => pauseSession(session));
        }
        
        const endBtn = div.querySelector('[data-action="end"]');
        if (endBtn) {
            endBtn.addEventListener('click', () => endSession(session));
        }
        
        return div;
    }
    
    function getSessionActionButtons(session) {
        if (isStudent) {
            if (session.status === 'live') {
                return `<button class="btn-primary" data-action="join">Join Session</button>
                        <button class="btn-secondary" data-action="view">Details</button>`;
            } else {
                return `<button class="btn-secondary" data-action="view">View Details</button>`;
            }
        } else if (isInstructor) {
            let buttons = '';
            
            if (session.status === 'scheduled') {
                buttons = `<button class="btn-primary" data-action="start">Start Session</button>`;
            } else if (session.status === 'live') {
                buttons = `<button class="btn-primary" data-action="view">Manage</button>
                           <button class="btn-secondary" data-action="pause">Pause</button>
                           <button class="btn-danger" data-action="end">End</button>`;
            } else if (session.status === 'paused') {
                buttons = `<button class="btn-primary" data-action="start">Resume</button>
                           <button class="btn-danger" data-action="end">End</button>`;
            } else if (session.status === 'ended') {
                buttons = `<button class="btn-secondary" data-action="view">View Report</button>`;
            }
            
            return buttons;
        }
        
        return '';
    }
    
    function renderSessionDetails(session) {
        const startTime = new Date(session.start_time).toLocaleString();
        const endTime = session.end_time ? new Date(session.end_time).toLocaleString() : 'Ongoing';
        
        // Calculate duration if session has ended
        let duration = '';
        if (session.end_time) {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            const diffMs = end - start;
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffMins = Math.floor((diffMs % 3600000) / 60000);
            duration = `${diffHrs}h ${diffMins}m`;
        }
        
        // Participant count
        const participantCount = session.participant_count || 0;
        
        sessionDetails.innerHTML = `
            <div class="session-details-grid">
                <div class="session-detail-item">
                    <span class="session-detail-label">Classroom</span>
                    <span class="session-detail-value">${session.classroom_name}</span>
                </div>
                <div class="session-detail-item">
                    <span class="session-detail-label">Start Time</span>
                    <span class="session-detail-value">${startTime}</span>
                </div>
                <div class="session-detail-item">
                    <span class="session-detail-label">End Time</span>
                    <span class="session-detail-value">${endTime}</span>
                </div>
                <div class="session-detail-item">
                    <span class="session-detail-label">Duration</span>
                    <span class="session-detail-value">${duration || 'N/A'}</span>
                </div>
                <div class="session-detail-item">
                    <span class="session-detail-label">Participants</span>
                    <span class="session-detail-value">${participantCount}</span>
                </div>
                <div class="session-detail-item">
                    <span class="session-detail-label">Status</span>
                    <span class="session-detail-value">${session.status.charAt(0).toUpperCase() + session.status.slice(1)}</span>
                </div>
            </div>
            ${session.description ? `<p><strong>Description:</strong> ${session.description}</p>` : ''}
        `;
    }
    
    function renderSessionActions(session) {
        sessionActions.innerHTML = '';
        
        if (isStudent) {
            if (session.status === 'live') {
                const joinButton = document.createElement('button');
                joinButton.className = 'action-button action-button-primary';
                joinButton.innerHTML = `
                    <i class="fas fa-video"></i>
                    <div>
                        <strong>Join Live Session</strong>
                        <p>Participate in this ongoing session</p>
                    </div>
                `;
                joinButton.addEventListener('click', () => {
                    closeActionsModalHandler();
                    joinSession(session);
                });
                sessionActions.appendChild(joinButton);
            }
        } else if (isInstructor) {
            if (session.status === 'scheduled') {
                const startButton = document.createElement('button');
                startButton.className = 'action-button action-button-primary';
                startButton.innerHTML = `
                    <i class="fas fa-play"></i>
                    <div>
                        <strong>Start Session</strong>
                        <p>Begin this scheduled session now</p>
                    </div>
                `;
                startButton.addEventListener('click', () => {
                    closeActionsModalHandler();
                    startSession(session);
                });
                sessionActions.appendChild(startButton);
            } else if (session.status === 'live') {
                const manageButton = document.createElement('button');
                manageButton.className = 'action-button action-button-primary';
                manageButton.innerHTML = `
                    <i class="fas fa-cogs"></i>
                    <div>
                        <strong>Manage Session</strong>
                        <p>View and control the live session</p>
                    </div>
                `;
                manageButton.addEventListener('click', () => {
                    closeActionsModalHandler();
                    window.location.href = `live_session.html?session_id=${session.id}`;
                });
                sessionActions.appendChild(manageButton);
                
                const pauseButton = document.createElement('button');
                pauseButton.className = 'action-button';
                pauseButton.innerHTML = `
                    <i class="fas fa-pause"></i>
                    <div>
                        <strong>Pause Session</strong>
                        <p>Temporarily pause this session</p>
                    </div>
                `;
                pauseButton.addEventListener('click', () => {
                    closeActionsModalHandler();
                    pauseSession(session);
                });
                sessionActions.appendChild(pauseButton);
                
                const endButton = document.createElement('button');
                endButton.className = 'action-button action-button-danger';
                endButton.innerHTML = `
                    <i class="fas fa-stop"></i>
                    <div>
                        <strong>End Session</strong>
                        <p>Permanently end this session</p>
                    </div>
                `;
                endButton.addEventListener('click', () => {
                    closeActionsModalHandler();
                    endSession(session);
                });
                sessionActions.appendChild(endButton);
            } else if (session.status === 'paused') {
                const resumeButton = document.createElement('button');
                resumeButton.className = 'action-button action-button-primary';
                resumeButton.innerHTML = `
                    <i class="fas fa-play"></i>
                    <div>
                        <strong>Resume Session</strong>
                        <p>Continue this paused session</p>
                    </div>
                `;
                resumeButton.addEventListener('click', () => {
                    closeActionsModalHandler();
                    startSession(session);
                });
                sessionActions.appendChild(resumeButton);
                
                const endButton = document.createElement('button');
                endButton.className = 'action-button action-button-danger';
                endButton.innerHTML = `
                    <i class="fas fa-stop"></i>
                    <div>
                        <strong>End Session</strong>
                        <p>Permanently end this session</p>
                    </div>
                `;
                endButton.addEventListener('click', () => {
                    closeActionsModalHandler();
                    endSession(session);
                });
                sessionActions.appendChild(endButton);
            }
            
            // Add report button for ended sessions
            if (session.status === 'ended') {
                const reportButton = document.createElement('button');
                reportButton.className = 'action-button';
                reportButton.innerHTML = `
                    <i class="fas fa-chart-bar"></i>
                    <div>
                        <strong>View Report</strong>
                        <p>See detailed analytics for this session</p>
                    </div>
                `;
                reportButton.addEventListener('click', () => {
                    closeActionsModalHandler();
                    window.location.href = `reports.html?session_id=${session.id}`;
                });
                sessionActions.appendChild(reportButton);
            }
        }
    }
    
    function showNoSessionsMessage() {
        noSessionsMessage.style.display = 'flex';
        
        if (isInstructor) {
            noSessionsText.textContent = "You haven't created any sessions yet";
            noSessionsAction.innerHTML = '<button class="btn-primary" id="createFirstSession">Create Your First Session</button>';
            
            document.getElementById('createFirstSession').addEventListener('click', openCreateModal);
        } else {
            noSessionsText.textContent = "You don't have any sessions available";
            noSessionsAction.innerHTML = '';
        }
    }
    
    async function handleCreateSession(e) {
        e.preventDefault();
        
        const classroomId = sessionClassroom.value;
        const title = document.getElementById('sessionTitle').value.trim();
        const description = document.getElementById('sessionDescription').value.trim();
        const sessionType = document.querySelector('input[name="sessionType"]:checked').value;
        const scheduledTimeValue = scheduledTime.value;
        
        // Validate
        if (!classroomId || !title) {
            showError('Please fill in all required fields');
            return;
        }
        
        if (sessionType === 'scheduled' && !scheduledTimeValue) {
            showError('Please select a scheduled time');
            return;
        }
        
        try {
            const sessionData = {
                classroom_id: classroomId,
                title: title,
                description: description
            };
            
            if (sessionType === 'scheduled') {
                sessionData.scheduled_time = scheduledTimeValue;
                sessionData.status = 'scheduled';
            } else {
                sessionData.status = 'live';
            }
            
            const response = await fetch('/api/sessions/', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(sessionData)
            });
            
            if (response.ok) {
                const session = await response.json();
                showSuccess('Session created successfully!');
                closeCreateModalHandler();
                
                if (sessionType === 'instant') {
                    // Redirect to live session for instant sessions
                    window.location.href = `live_session.html?session_id=${session.id}`;
                } else {
                    // Reload the list for scheduled sessions
                    loadSessions();
                }
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create session');
            }
        } catch (error) {
            console.error('Error creating session:', error);
            showError(error.message || 'Failed to create session. Please try again.');
        }
    }
    
    async function joinSession(session) {
        try {
            // For students, joining a session typically means being redirected to the live session
            window.location.href = `live_session.html?session_id=${session.id}`;
        } catch (error) {
            console.error('Error joining session:', error);
            showError('Failed to join session. Please try again.');
        }
    }
    
    async function startSession(session) {
        try {
            const response = await fetch(`/api/sessions/${session.id}/start/`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showSuccess('Session started successfully!');
                loadSessions(); // Reload the list
                
                // Redirect to live session for instructors
                window.location.href = `live_session.html?session_id=${session.id}`;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to start session');
            }
        } catch (error) {
            console.error('Error starting session:', error);
            showError(error.message || 'Failed to start session. Please try again.');
        }
    }
    
    async function pauseSession(session) {
        try {
            const response = await fetch(`/api/sessions/${session.id}/pause/`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showSuccess('Session paused successfully!');
                loadSessions(); // Reload the list
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to pause session');
            }
        } catch (error) {
            console.error('Error pausing session:', error);
            showError(error.message || 'Failed to pause session. Please try again.');
        }
    }
    
    async function endSession(session) {
        // Confirm before ending session
        const confirmed = confirm('Are you sure you want to end this session? This action cannot be undone.');
        
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch(`/api/sessions/${session.id}/end/`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showSuccess('Session ended successfully!');
                loadSessions(); // Reload the list
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to end session');
            }
        } catch (error) {
            console.error('Error ending session:', error);
            showError(error.message || 'Failed to end session. Please try again.');
        }
    }
    
    function showSuccess(message) {
        // Create success toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-success';
        toast.innerHTML = `
            <i class="fas fa-check-circle toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Add close event
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Remove toast after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
    
    function showError(message) {
        // Create error toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-error';
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Add close event
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Remove toast after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
});