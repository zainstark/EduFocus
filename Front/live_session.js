// live_session.js
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!requireAuth()) return;
    
    const userData = getUserData();
    const isInstructor = userData.role === 'instructor';
    const isStudent = userData.role === 'student';
    
    // Get session ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (!sessionId) {
        showError('No session ID provided. Redirecting to dashboard...');
        setTimeout(() => {
            window.location.href = isInstructor ? 'dashboard_instructor.html' : 'dashboard_student.html';
        }, 2000);
        return;
    }
    
    // DOM elements
    const sessionTitle = document.getElementById('sessionTitle');
    const classroomName = document.getElementById('classroomName');
    const sessionTimer = document.getElementById('sessionTimer');
    const participantCount = document.getElementById('participantCount');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    const leaveSessionBtn = document.getElementById('leaveSessionBtn');
    const participantList = document.getElementById('participantList');
    
    // Student elements
    const studentView = document.getElementById('studentView');
    const webcamVideo = document.getElementById('webcamVideo');
    const currentFocusScore = document.getElementById('currentFocusScore');
    const focusIndicator = document.getElementById('focusIndicator');
    const toggleVideoBtn = document.getElementById('toggleVideoBtn');
    const toggleAudioBtn = document.getElementById('toggleAudioBtn');
    const webcamModal = document.getElementById('webcamModal');
    const allowWebcamBtn = document.getElementById('allowWebcamBtn');
    const continueWithoutWebcamBtn = document.getElementById('continueWithoutWebcamBtn');
    
    // Instructor elements
    const instructorView = document.getElementById('instructorView');
    const totalParticipants = document.getElementById('totalParticipants');
    const avgClassFocus = document.getElementById('avgClassFocus');
    const focusTrend = document.getElementById('focusTrend');
    const pauseSessionBtn = document.getElementById('pauseSessionBtn');
    const endSessionBtn = document.getElementById('endSessionBtn');
    const endSessionModal = document.getElementById('endSessionModal');
    const closeEndSessionModal = document.getElementById('closeEndSessionModal');
    const cancelEndSession = document.getElementById('cancelEndSession');
    const confirmEndSession = document.getElementById('confirmEndSession');
    
    // Charts
    let studentFocusChart = null;
    let classFocusChart = null;
    
    // State
    let sessionData = null;
    let wsConnection = null;
    let isVideoEnabled = true;
    let isAudioEnabled = true;
    let focusScores = [];
    let classFocusData = [];
    let participants = [];
    let sessionStartTime = null;
    let timerInterval = null;
    let webgazerInitialized = false;
    
    // Initialize based on user role
    if (isStudent) {
        studentView.style.display = 'block';
        initializeStudentView();
    } else if (isInstructor) {
        instructorView.style.display = 'block';
        initializeInstructorView();
    }
    
    // Load session data
    loadSessionData();
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Event listeners
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    leaveSessionBtn.addEventListener('click', leaveSession);
    
    if (isStudent) {
        toggleVideoBtn.addEventListener('click', toggleVideo);
        toggleAudioBtn.addEventListener('click', toggleAudio);
        allowWebcamBtn.addEventListener('click', setupWebcam);
        continueWithoutWebcamBtn.addEventListener('click', continueWithoutWebcam);
    }
    
    if (isInstructor) {
        pauseSessionBtn.addEventListener('click', togglePauseSession);
        endSessionBtn.addEventListener('click', showEndSessionModal);
        closeEndSessionModal.addEventListener('click', hideEndSessionModal);
        cancelEndSession.addEventListener('click', hideEndSessionModal);
        confirmEndSession.addEventListener('click', endSession);
    }
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(event) {
        if (!toggleSidebarBtn.contains(event.target) && !sidebar.contains(event.target)) {
            sidebar.classList.remove('open');
        }
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    function initializeStudentView() {
        // Show webcam permission modal
        webcamModal.style.display = 'flex';
    }
    
    function initializeInstructorView() {
        // No special initialization needed for instructors
    }
    
    async function loadSessionData() {
        try {
            const response = await fetch(`/api/sessions/${sessionId}/`, { headers: getAuthHeaders() });
            
            if (response.ok) {
                sessionData = await response.json();
                updateSessionInfo();
            } else {
                throw new Error('Failed to load session data');
            }
        } catch (error) {
            console.error('Error loading session data:', error);
            showError('Failed to load session data. Please try again.');
        }
    }
    
    function updateSessionInfo() {
        if (!sessionData) return;
        
        sessionTitle.textContent = sessionData.title;
        classroomName.textContent = sessionData.classroom_name;
        
        // Set session start time and start timer
        sessionStartTime = new Date(sessionData.start_time);
        startSessionTimer();
    }
    
    function startSessionTimer() {
        if (timerInterval) clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            const now = new Date();
            const diff = now - sessionStartTime;
            
            // Calculate hours, minutes, seconds
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            // Format time
            sessionTimer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    function initializeWebSocket() {
        try {
            wsConnection = createWebSocketConnection(sessionId);
            
            wsConnection.onopen = function() {
                console.log('WebSocket connection established');
                sendWebSocketMessage({
                    type: 'join',
                    user_id: userData.user_id,
                    role: userData.role
                });
            };
            
            wsConnection.onmessage = function(event) {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            };
            
            wsConnection.onclose = function() {
                console.log('WebSocket connection closed');
                showError('Connection lost. Attempting to reconnect...');
                setTimeout(initializeWebSocket, 3000);
            };
            
            wsConnection.onerror = function(error) {
                console.error('WebSocket error:', error);
                showError('Connection error. Please check your internet connection.');
            };
        } catch (error) {
            console.error('Error initializing WebSocket:', error);
            showError('Failed to establish real-time connection.');
        }
    }
    
    function sendWebSocketMessage(message) {
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(JSON.stringify(message));
        }
    }
    
    function handleWebSocketMessage(message) {
        switch (message.type) {
            case 'participants_update':
                updateParticipants(message.participants);
                break;
            case 'focus_data':
                if (isStudent) {
                    updateStudentFocus(message.score);
                } else if (isInstructor) {
                    updateClassFocus(message.data);
                }
                break;
            case 'session_status':
                updateSessionStatus(message.status);
                break;
            case 'error':
                showError(message.message);
                break;
        }
    }
    
    function updateParticipants(participantsData) {
        participants = participantsData;
        
        // Update participant count
        participantCount.textContent = participants.length;
        if (isInstructor) {
            totalParticipants.textContent = participants.length;
        }
        
        // Update participant list
        participantList.innerHTML = '';
        
        participants.forEach(participant => {
            const participantItem = createParticipantItem(participant);
            participantList.appendChild(participantItem);
        });
    }
    
    function createParticipantItem(participant) {
        const div = document.createElement('div');
        div.className = 'participant-item';
        
        // Determine focus level class
        let focusClass = 'focus-low';
        if (participant.focus_score >= 70) focusClass = 'focus-high';
        else if (participant.focus_score >= 40) focusClass = 'focus-medium';
        
        div.innerHTML = `
            <div class="participant-avatar">
                ${participant.name.charAt(0).toUpperCase()}
            </div>
            <div class="participant-info">
                <div class="participant-name">${participant.name}</div>
                <div class="participant-status">
                    <span class="focus-dot ${focusClass}"></span>
                    <span class="participant-focus">${participant.focus_score}% Focus</span>
                </div>
            </div>
        `;
        
        return div;
    }
    
    function updateStudentFocus(score) {
        // Update current focus score
        currentFocusScore.textContent = `${score}%`;
        
        // Add to focus history
        focusScores.push({
            time: new Date(),
            score: score
        });
        
        // Keep only last 30 data points
        if (focusScores.length > 30) {
            focusScores.shift();
        }
        
        // Update focus indicator
        if (score >= 70) {
            focusIndicator.innerHTML = '<i class="fas fa-check-circle"></i><span>High Focus</span>';
            focusIndicator.style.color = '#10b981';
        } else if (score >= 40) {
            focusIndicator.innerHTML = '<i class="fas fa-minus-circle"></i><span>Medium Focus</span>';
            focusIndicator.style.color = '#f59e0b';
        } else {
            focusIndicator.innerHTML = '<i class="fas fa-times-circle"></i><span>Low Focus</span>';
            focusIndicator.style.color = '#ef4444';
        }
        
        // Update chart
        updateStudentFocusChart();
        
        // Send focus data to server every 5 seconds
        if (focusScores.length % 5 === 0) {
            sendWebSocketMessage({
                type: 'focus_update',
                score: score,
                user_id: userData.user_id
            });
        }
    }
    
    function updateClassFocus(focusData) {
        classFocusData = focusData;
        
        // Calculate average focus
        const avgFocus = focusData.reduce((sum, participant) => sum + participant.focus_score, 0) / focusData.length;
        avgClassFocus.textContent = `${avgFocus.toFixed(1)}%`;
        
        // Determine focus trend
        // This would ideally be calculated based on historical data
        focusTrend.textContent = 'Stable';
        
        // Update chart
        updateClassFocusChart();
    }
    
    function updateStudentFocusChart() {
        const ctx = document.getElementById('studentFocusChart').getContext('2d');
        
        // Destroy previous chart if it exists
        if (studentFocusChart) {
            studentFocusChart.destroy();
        }
        
        // Prepare chart data
        const labels = focusScores.map((_, index) => (index + 1).toString());
        const scores = focusScores.map(item => item.score);
        
        // Create chart
        studentFocusChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Focus Score',
                    data: scores,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Focus: ${context.raw}%`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updateClassFocusChart() {
        const ctx = document.getElementById('classFocusChart').getContext('2d');
        
        // Destroy previous chart if it exists
        if (classFocusChart) {
            classFocusChart.destroy();
        }
        
        // Prepare chart data
        const labels = classFocusData.map(participant => participant.name);
        const scores = classFocusData.map(participant => participant.focus_score);
        
        // Create chart
        classFocusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Focus Score',
                    data: scores,
                    backgroundColor: '#2563eb',
                    borderColor: '#1d4ed8',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Focus: ${context.raw}%`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updateSessionStatus(status) {
        // Update UI based on session status
        if (status === 'paused') {
            if (timerInterval) clearInterval(timerInterval);
            if (isInstructor) {
                pauseSessionBtn.innerHTML = '<i class="fas fa-play"></i><span>Resume Session</span>';
            }
            showMessage('Session paused');
        } else if (status === 'live') {
            startSessionTimer();
            if (isInstructor) {
                pauseSessionBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause Session</span>';
            }
        } else if (status === 'ended') {
            if (timerInterval) clearInterval(timerInterval);
            showMessage('Session ended');
            setTimeout(() => {
                window.location.href = isInstructor ? 'dashboard_instructor.html' : 'dashboard_student.html';
            }, 3000);
        }
    }
    
    async function setupWebcam() {
        try {
            // Request webcam access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true,
                audio: false
            });
            
            // Set video source
            webcamVideo.srcObject = stream;
            
            // Initialize WebGazer for focus tracking
            await initializeWebGazer();
            
            // Hide modal
            webcamModal.style.display = 'none';
            
        } catch (error) {
            console.error('Error accessing webcam:', error);
            showError('Failed to access webcam. Please check your permissions.');
        }
    }
    
    async function initializeWebGazer() {
        try {
            // Initialize WebGazer
            webgazer.setGazeListener(function(data, elapsedTime) {
                if (data == null) {
                    return;
                }
                
                // Calculate focus score based on gaze data
                // This is a simplified implementation
                const focusScore = calculateFocusScore(data);
                updateStudentFocus(focusScore);
            }).begin();
            
            webgazer.showPredictionPoints(true);
            webgazerInitialized = true;
            
        } catch (error) {
            console.error('Error initializing WebGazer:', error);
            showError('Failed to initialize focus tracking.');
        }
    }
    
    function calculateFocusScore(gazeData) {
        // Simplified focus score calculation
        // In a real implementation, this would be more sophisticated
        const videoWidth = webcamVideo.videoWidth;
        const videoHeight = webcamVideo.videoHeight;
        
        // Check if gaze is within the central area of the screen
        const centerX = videoWidth / 2;
        const centerY = videoHeight / 2;
        const gazeX = gazeData.x;
        const gazeY = gazeData.y;
        
        // Calculate distance from center
        const distance = Math.sqrt(Math.pow(gazeX - centerX, 2) + Math.pow(gazeY - centerY, 2));
        
        // Max distance from center (diagonal)
        const maxDistance = Math.sqrt(Math.pow(videoWidth, 2) + Math.pow(videoHeight, 2)) / 2;
        
        // Convert to score (closer to center = higher score)
        let score = 100 - (distance / maxDistance * 100);
        score = Math.max(0, Math.min(100, Math.round(score)));
        
        return score;
    }
    
    function continueWithoutWebcam() {
        webcamModal.style.display = 'none';
        showMessage('Continuing without webcam. Focus tracking disabled.');
    }
    
    function toggleVideo() {
        isVideoEnabled = !isVideoEnabled;
        
        if (webcamVideo.srcObject) {
            webcamVideo.srcObject.getVideoTracks().forEach(track => {
                track.enabled = isVideoEnabled;
            });
        }
        
        toggleVideoBtn.innerHTML = isVideoEnabled ? 
            '<i class="fas fa-video"></i><span>Camera On</span>' : 
            '<i class="fas fa-video-slash"></i><span>Camera Off</span>';
    }
    
    function toggleAudio() {
        isAudioEnabled = !isAudioEnabled;
        
        // Note: We're not capturing audio, but this would control mic if we were
        toggleAudioBtn.innerHTML = isAudioEnabled ? 
            '<i class="fas fa-microphone"></i><span>Mic On</span>' : 
            '<i class="fas fa-microphone-slash"></i><span>Mic Off</span>';
    }
    
    function toggleSidebar() {
        sidebar.classList.toggle('open');
    }
    
    function leaveSession() {
        if (wsConnection) {
            sendWebSocketMessage({
                type: 'leave',
                user_id: userData.user_id
            });
            wsConnection.close();
        }
        
        if (webgazerInitialized) {
            webgazer.end();
        }
        
        window.location.href = isInstructor ? 'dashboard_instructor.html' : 'dashboard_student.html';
    }
    
    function togglePauseSession() {
        if (!sessionData) return;
        
        const newStatus = sessionData.status === 'live' ? 'paused' : 'live';
        
        sendWebSocketMessage({
            type: 'session_control',
            action: newStatus,
            session_id: sessionId
        });
    }
    
    function showEndSessionModal() {
        endSessionModal.style.display = 'flex';
    }
    
    function hideEndSessionModal() {
        endSessionModal.style.display = 'none';
    }
    
    function endSession() {
        const notes = document.getElementById('sessionNotes').value;
        
        sendWebSocketMessage({
            type: 'session_control',
            action: 'end',
            session_id: sessionId,
            notes: notes
        });
        
        hideEndSessionModal();
    }
    
    function handleBeforeUnload(event) {
        if (wsConnection) {
            sendWebSocketMessage({
                type: 'leave',
                user_id: userData.user_id
            });
        }
        
        if (webgazerInitialized) {
            webgazer.end();
        }
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
    
    function showMessage(message) {
        // Create info toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-info';
        toast.innerHTML = `
            <i class="fas fa-info-circle toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Add close event
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }
});