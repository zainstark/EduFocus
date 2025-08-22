// dashboard_student.js
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!requireAuth()) return;
    
    const userData = getUserData();
    if (userData.role !== 'student') {
        window.location.href = 'dashboard_instructor.html';
        return;
    }
    
    // DOM elements
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    const logoutButton = document.getElementById('logoutButton');
    const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
    
    // Stats elements
    const classroomsCount = document.getElementById('classroomsCount');
    const sessionsCount = document.getElementById('sessionsCount');
    const attendanceRate = document.getElementById('attendanceRate');
    const avgFocusScore = document.getElementById('avgFocusScore');
    
    // Focus elements
    const todayFocus = document.getElementById('todayFocus');
    const weeklyFocus = document.getElementById('weeklyFocus');
    const bestFocus = document.getElementById('bestFocus');
    
    // List containers
    const availableSessionsList = document.getElementById('availableSessionsList');
    const noSessionsMessage = document.getElementById('noSessionsMessage');
    const sessionsLoading = document.getElementById('sessionsLoading');
    
    const classroomsList = document.getElementById('classroomsList');
    const noClassroomsMessage = document.getElementById('noClassroomsMessage');
    const classroomsLoading = document.getElementById('classroomsLoading');
    
    const upcomingSessionsList = document.getElementById('upcomingSessionsList');
    const noUpcomingMessage = document.getElementById('noUpcomingMessage');
    const upcomingLoading = document.getElementById('upcomingLoading');
    
    // Chart instance
    let focusChart = null;
    
    // Event listeners
    userMenuButton.addEventListener('click', toggleUserDropdown);
    logoutButton.addEventListener('click', handleLogout);
    refreshSessionsBtn.addEventListener('click', loadAvailableSessions);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    });
    
    // Load dashboard data
    loadDashboardData();
    
    function toggleUserDropdown() {
        userDropdown.classList.toggle('show');
    }
    
    function handleLogout() {
        logout();
    }
    
    async function loadDashboardData() {
        try {
            await Promise.all([
                loadStats(),
                loadAvailableSessions(),
                loadClassrooms(),
                loadUpcomingSessions(),
                loadFocusData()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data. Please try again.');
        }
    }
    
    async function loadStats() {
        try {
            const [classroomsRes, sessionsRes, attendanceRes, focusRes] = await Promise.all([
                fetch('/api/classrooms/enrolled/count/', { headers: getAuthHeaders() }),
                fetch('/api/sessions/available/count/', { headers: getAuthHeaders() }),
                fetch('/api/attendance/rate/', { headers: getAuthHeaders() }),
                fetch('/api/focus/student/average/', { headers: getAuthHeaders() })
            ]);
            
            if (classroomsRes.ok) {
                const data = await classroomsRes.json();
                classroomsCount.textContent = data.count || 0;
            }
            
            if (sessionsRes.ok) {
                const data = await sessionsRes.json();
                sessionsCount.textContent = data.count || 0;
            }
            
            if (attendanceRes.ok) {
                const data = await attendanceRes.json();
                attendanceRate.textContent = `${data.rate || 0}%`;
            }
            
            if (focusRes.ok) {
                const data = await focusRes.json();
                avgFocusScore.textContent = `${data.average || 0}%`;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    async function loadAvailableSessions() {
        sessionsLoading.style.display = 'flex';
        availableSessionsList.innerHTML = '';
        noSessionsMessage.style.display = 'none';
        
        try {
            const response = await fetch('/api/sessions/available/', { headers: getAuthHeaders() });
            
            if (response.ok) {
                const sessions = await response.json();
                
                if (sessions.length > 0) {
                    sessions.forEach(session => {
                        const sessionItem = createSessionItem(session);
                        availableSessionsList.appendChild(sessionItem);
                    });
                } else {
                    noSessionsMessage.style.display = 'flex';
                }
            } else {
                throw new Error('Failed to load sessions');
            }
        } catch (error) {
            console.error('Error loading available sessions:', error);
            showError('Failed to load available sessions. Please try again.');
            noSessionsMessage.style.display = 'flex';
        } finally {
            sessionsLoading.style.display = 'none';
        }
    }
    
    function createSessionItem(session) {
        const div = document.createElement('div');
        div.className = 'session-item';
        
        div.innerHTML = `
            <div class="session-icon">
                <i class="fas fa-video"></i>
            </div>
            <div class="session-info">
                <h3>${session.classroom_name}</h3>
                <p>Instructor: ${session.instructor_name}</p>
                <p>Started: ${new Date(session.start_time).toLocaleString()}</p>
            </div>
            <div class="session-actions">
                <a href="live_session.html?session_id=${session.id}" class="btn-primary">Join</a>
            </div>
        `;
        
        return div;
    }
    
    async function loadClassrooms() {
        classroomsLoading.style.display = 'flex';
        classroomsList.innerHTML = '';
        noClassroomsMessage.style.display = 'none';
        
        try {
            const response = await fetch('/api/classrooms/enrolled/', { headers: getAuthHeaders() });
            
            if (response.ok) {
                const classrooms = await response.json();
                
                if (classrooms.length > 0) {
                    // Show only the first 3 classrooms
                    const limitedClassrooms = classrooms.slice(0, 3);
                    
                    limitedClassrooms.forEach(classroom => {
                        const classroomItem = createClassroomItem(classroom);
                        classroomsList.appendChild(classroomItem);
                    });
                    
                    // Show "View All" link if there are more classrooms
                    if (classrooms.length > 3) {
                        const viewAll = document.createElement('div');
                        viewAll.className = 'text-center';
                        viewAll.innerHTML = `<a href="classrooms.html" class="btn-text">View all ${classrooms.length} classes</a>`;
                        classroomsList.appendChild(viewAll);
                    }
                } else {
                    noClassroomsMessage.style.display = 'flex';
                }
            } else {
                throw new Error('Failed to load classrooms');
            }
        } catch (error) {
            console.error('Error loading classrooms:', error);
            noClassroomsMessage.style.display = 'flex';
        } finally {
            classroomsLoading.style.display = 'none';
        }
    }
    
    function createClassroomItem(classroom) {
        const div = document.createElement('div');
        div.className = 'classroom-item';
        
        div.innerHTML = `
            <div class="classroom-icon">
                <i class="fas fa-chalkboard"></i>
            </div>
            <div class="classroom-info">
                <h3>${classroom.name}</h3>
                <p>Instructor: ${classroom.instructor_name}</p>
                <p>Enrolled: ${new Date(classroom.enrolled_at).toLocaleDateString()}</p>
            </div>
            <div class="classroom-actions">
                <a href="sessions.html?classroom_id=${classroom.id}" class="btn-secondary">View</a>
            </div>
        `;
        
        return div;
    }
    
    async function loadUpcomingSessions() {
        upcomingLoading.style.display = 'flex';
        upcomingSessionsList.innerHTML = '';
        noUpcomingMessage.style.display = 'none';
        
        try {
            const response = await fetch('/api/sessions/upcoming/', { headers: getAuthHeaders() });
            
            if (response.ok) {
                const sessions = await response.json();
                
                if (sessions.length > 0) {
                    sessions.forEach(session => {
                        const sessionItem = createUpcomingSessionItem(session);
                        upcomingSessionsList.appendChild(sessionItem);
                    });
                } else {
                    noUpcomingMessage.style.display = 'flex';
                }
            } else {
                throw new Error('Failed to load upcoming sessions');
            }
        } catch (error) {
            console.error('Error loading upcoming sessions:', error);
            noUpcomingMessage.style.display = 'flex';
        } finally {
            upcomingLoading.style.display = 'none';
        }
    }
    
    function createUpcomingSessionItem(session) {
        const div = document.createElement('div');
        div.className = 'upcoming-item';
        
        // Calculate time until session
        const now = new Date();
        const sessionTime = new Date(session.scheduled_time);
        const timeDiff = sessionTime - now;
        const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
        
        let timeText = '';
        if (hoursUntil < 1) {
            timeText = 'Starting soon';
        } else if (hoursUntil < 24) {
            timeText = `In ${hoursUntil} hours`;
        } else {
            const daysUntil = Math.floor(hoursUntil / 24);
            timeText = `In ${daysUntil} days`;
        }
        
        div.innerHTML = `
            <div class="upcoming-icon">
                <i class="fas fa-clock"></i>
            </div>
            <div class="upcoming-info">
                <h3>${session.classroom_name}</h3>
                <p>${session.title}</p>
                <p>${new Date(session.scheduled_time).toLocaleString()}</p>
                <span class="upcoming-badge">${timeText}</span>
            </div>
        `;
        
        return div;
    }
    
    async function loadFocusData() {
        try {
            const [todayRes, weeklyRes, bestRes, historyRes] = await Promise.all([
                fetch('/api/focus/student/today/', { headers: getAuthHeaders() }),
                fetch('/api/focus/student/weekly/', { headers: getAuthHeaders() }),
                fetch('/api/focus/student/best/', { headers: getAuthHeaders() }),
                fetch('/api/focus/student/history/', { headers: getAuthHeaders() })
            ]);
            
            if (todayRes.ok) {
                const data = await todayRes.json();
                todayFocus.textContent = `${data.average || 0}%`;
            }
            
            if (weeklyRes.ok) {
                const data = await weeklyRes.json();
                weeklyFocus.textContent = `${data.average || 0}%`;
            }
            
            if (bestRes.ok) {
                const data = await bestRes.json();
                bestFocus.textContent = `${data.score || 0}%`;
            }
            
            if (historyRes.ok) {
                const data = await historyRes.json();
                renderFocusChart(data);
            }
        } catch (error) {
            console.error('Error loading focus data:', error);
        }
    }
    
    function renderFocusChart(data) {
        const ctx = document.getElementById('focusChart').getContext('2d');
        
        // Destroy previous chart if it exists
        if (focusChart) {
            focusChart.destroy();
        }
        
        // Prepare chart data
        const labels = data.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const scores = data.map(item => item.average_score);
        
        // Create chart
        focusChart = new Chart(ctx, {
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
                    pointRadius: 4,
                    pointHoverRadius: 6
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
    
    function showError(message) {
        // Create error toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-error';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
});