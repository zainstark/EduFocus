// dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!requireAuth()) return;
    
    const userData = getUserData();
    if (userData.role !== 'instructor') {
        window.location.href = 'dashboard_student.html';
        return;
    }
    
    // DOM elements
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    const logoutButton = document.getElementById('logoutButton');
    const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    
    // Stats elements
    const classroomsCount = document.getElementById('classroomsCount');
    const sessionsCount = document.getElementById('sessionsCount');
    const studentsCount = document.getElementById('studentsCount');
    const avgFocusScore = document.getElementById('avgFocusScore');
    
    // List containers
    const activeSessionsList = document.getElementById('activeSessionsList');
    const noSessionsMessage = document.getElementById('noSessionsMessage');
    const sessionsLoading = document.getElementById('sessionsLoading');
    
    const activityList = document.getElementById('activityList');
    const noActivityMessage = document.getElementById('noActivityMessage');
    const activityLoading = document.getElementById('activityLoading');
    
    const classroomsList = document.getElementById('classroomsList');
    const noClassroomsMessage = document.getElementById('noClassroomsMessage');
    const classroomsLoading = document.getElementById('classroomsLoading');
    
    const notificationsList = document.getElementById('notificationsList');
    const noNotificationsMessage = document.getElementById('noNotificationsMessage');
    const notificationsLoading = document.getElementById('notificationsLoading');
    
    // Event listeners
    userMenuButton.addEventListener('click', toggleUserDropdown);
    logoutButton.addEventListener('click', handleLogout);
    refreshSessionsBtn.addEventListener('click', loadActiveSessions);
    markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    
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
                loadActiveSessions(),
                loadRecentActivity(),
                loadClassrooms(),
                loadNotifications()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data. Please try again.');
        }
    }
    
    async function loadStats() {
        try {
            const [classroomsRes, sessionsRes, studentsRes, focusRes] = await Promise.all([
                fetch('/api/classrooms/count/', { headers: getAuthHeaders() }),
                fetch('/api/sessions/active/count/', { headers: getAuthHeaders() }),
                fetch('/api/students/count/', { headers: getAuthHeaders() }),
                fetch('/api/focus/average/', { headers: getAuthHeaders() })
            ]);
            
            if (classroomsRes.ok) {
                const data = await classroomsRes.json();
                classroomsCount.textContent = data.count || 0;
            }
            
            if (sessionsRes.ok) {
                const data = await sessionsRes.json();
                sessionsCount.textContent = data.count || 0;
            }
            
            if (studentsRes.ok) {
                const data = await studentsRes.json();
                studentsCount.textContent = data.count || 0;
            }
            
            if (focusRes.ok) {
                const data = await focusRes.json();
                avgFocusScore.textContent = `${data.average || 0}%`;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    async function loadActiveSessions() {
        sessionsLoading.style.display = 'flex';
        activeSessionsList.innerHTML = '';
        noSessionsMessage.style.display = 'none';
        
        try {
            const response = await fetch('/api/sessions/active/', { headers: getAuthHeaders() });
            
            if (response.ok) {
                const sessions = await response.json();
                
                if (sessions.length > 0) {
                    sessions.forEach(session => {
                        const sessionItem = createSessionItem(session);
                        activeSessionsList.appendChild(sessionItem);
                    });
                } else {
                    noSessionsMessage.style.display = 'flex';
                }
            } else {
                throw new Error('Failed to load sessions');
            }
        } catch (error) {
            console.error('Error loading active sessions:', error);
            showError('Failed to load active sessions. Please try again.');
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
                <p>Started: ${new Date(session.start_time).toLocaleString()}</p>
                <p>Participants: ${session.participant_count}</p>
            </div>
            <div class="session-actions">
                <a href="live_session.html?session_id=${session.id}" class="btn-primary">Manage</a>
            </div>
        `;
        
        return div;
    }
    
    async function loadRecentActivity() {
        activityLoading.style.display = 'flex';
        activityList.innerHTML = '';
        noActivityMessage.style.display = 'none';
        
        try {
            const response = await fetch('/api/activity/recent/', { headers: getAuthHeaders() });
            
            if (response.ok) {
                const activities = await response.json();
                
                if (activities.length > 0) {
                    activities.forEach(activity => {
                        const activityItem = createActivityItem(activity);
                        activityList.appendChild(activityItem);
                    });
                } else {
                    noActivityMessage.style.display = 'block';
                }
            } else {
                throw new Error('Failed to load activity');
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            noActivityMessage.style.display = 'block';
        } finally {
            activityLoading.style.display = 'none';
        }
    }
    
    function createActivityItem(activity) {
        const li = document.createElement('li');
        li.className = 'activity-item';
        
        // Determine icon based on activity type
        let icon = 'fa-history';
        if (activity.type === 'session_start') icon = 'fa-play';
        if (activity.type === 'session_end') icon = 'fa-stop';
        if (activity.type === 'classroom_created') icon = 'fa-chalkboard';
        if (activity.type === 'student_joined') icon = 'fa-user-plus';
        
        li.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <h3>${activity.title}</h3>
                <p>${activity.description}</p>
                <div class="activity-time">${new Date(activity.timestamp).toLocaleString()}</div>
            </div>
        `;
        
        return li;
    }
    
    async function loadClassrooms() {
        classroomsLoading.style.display = 'flex';
        classroomsList.innerHTML = '';
        noClassroomsMessage.style.display = 'none';
        
        try {
            const response = await fetch('/api/classrooms/', { headers: getAuthHeaders() });
            
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
                        viewAll.innerHTML = `<a href="classrooms.html" class="btn-text">View all ${classrooms.length} classrooms</a>`;
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
                <p>${classroom.description || 'No description'}</p>
                <p>Students: ${classroom.student_count || 0}</p>
            </div>
            <div class="classroom-actions">
                <a href="sessions.html?classroom_id=${classroom.id}" class="btn-secondary">View</a>
            </div>
        `;
        
        return div;
    }
    
    async function loadNotifications() {
        notificationsLoading.style.display = 'flex';
        notificationsList.innerHTML = '';
        noNotificationsMessage.style.display = 'none';
        
        try {
            const response = await fetch('/api/notifications/', { headers: getAuthHeaders() });
            
            if (response.ok) {
                const notifications = await response.json();
                
                if (notifications.length > 0) {
                    // Show only the first 5 notifications
                    const limitedNotifications = notifications.slice(0, 5);
                    
                    limitedNotifications.forEach(notification => {
                        const notificationItem = createNotificationItem(notification);
                        notificationsList.appendChild(notificationItem);
                    });
                    
                    // Show "View All" link if there are more notifications
                    if (notifications.length > 5) {
                        const viewAll = document.createElement('div');
                        viewAll.className = 'text-center';
                        viewAll.innerHTML = `<a href="#" class="btn-text">View all ${notifications.length} notifications</a>`;
                        notificationsList.appendChild(viewAll);
                    }
                } else {
                    noNotificationsMessage.style.display = 'flex';
                }
            } else {
                throw new Error('Failed to load notifications');
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            noNotificationsMessage.style.display = 'flex';
        } finally {
            notificationsLoading.style.display = 'none';
        }
    }
    
    function createNotificationItem(notification) {
        const div = document.createElement('div');
        div.className = `notification-item ${notification.read ? '' : 'unread'}`;
        
        // Determine icon based on notification type
        let icon = 'fa-bell';
        if (notification.type === 'session_reminder') icon = 'fa-video';
        if (notification.type === 'student_joined') icon = 'fa-user-plus';
        if (notification.type === 'focus_alert') icon = 'fa-exclamation-triangle';
        
        div.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="notification-content">
                <h3>${notification.title}</h3>
                <p>${notification.message}</p>
                <div class="notification-time">${new Date(notification.timestamp).toLocaleString()}</div>
            </div>
        `;
        
        return div;
    }
    
    async function markAllNotificationsAsRead() {
        try {
            const response = await fetch('/api/notifications/mark-all-read/', {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                // Reload notifications to update read status
                loadNotifications();
            } else {
                throw new Error('Failed to mark notifications as read');
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            showError('Failed to mark notifications as read. Please try again.');
        }
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