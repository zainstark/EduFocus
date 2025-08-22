// reports.js
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!requireAuth()) return;
    
    const userData = getUserData();
    const isInstructor = userData.role === 'instructor';
    
    // Set user role in UI
    document.getElementById('userRole').textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    
    // DOM elements
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    const logoutButton = document.getElementById('logoutButton');
    const exportAllBtn = document.getElementById('exportAllBtn');
    const classroomFilter = document.getElementById('classroomFilter');
    const sessionFilter = document.getElementById('sessionFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const customDateRange = document.getElementById('customDateRange');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const generateReportBtn = document.getElementById('generateReportBtn');
    
    // Content elements
    const reportsLoading = document.getElementById('reportsLoading');
    const reportsContainer = document.getElementById('reportsContainer');
    const noReportsMessage = document.getElementById('noReportsMessage');
    
    // Summary elements
    const totalSessions = document.getElementById('totalSessions');
    const avgAttendance = document.getElementById('avgAttendance');
    const avgFocusScore = document.getElementById('avgFocusScore');
    const improvementRate = document.getElementById('improvementRate');
    
    // Chart elements
    const focusTrendChart = document.getElementById('focusTrendChart');
    const attendanceChart = document.getElementById('attendanceChart');
    const durationChart = document.getElementById('durationChart');
    const distributionChart = document.getElementById('distributionChart');
    
    // Table elements
    const sessionsTable = document.getElementById('sessionsTable');
    
    // Modal elements
    const sessionDetailModal = document.getElementById('sessionDetailModal');
    const closeSessionModal = document.getElementById('closeSessionModal');
    const closeSessionDetail = document.getElementById('closeSessionDetail');
    const exportSessionReport = document.getElementById('exportSessionReport');
    const sessionDetailTitle = document.getElementById('sessionDetailTitle');
    const detailClassroom = document.getElementById('detailClassroom');
    const detailDate = document.getElementById('detailDate');
    const detailDuration = document.getElementById('detailDuration');
    const detailAttendance = document.getElementById('detailAttendance');
    const detailFocus = document.getElementById('detailFocus');
    const detailStatus = document.getElementById('detailStatus');
    const sessionFocusChart = document.getElementById('sessionFocusChart');
    const studentFocusChart = document.getElementById('studentFocusChart');
    const participantsTableBody = document.getElementById('participantsTableBody');
    
    // Export buttons
    const exportFocusChartBtn = document.getElementById('exportFocusChart');
    const exportAttendanceChartBtn = document.getElementById('exportAttendanceChart');
    const exportDurationChartBtn = document.getElementById('exportDurationChart');
    const exportDistributionChartBtn = document.getElementById('exportDistributionChart');
    const exportSessionDataBtn = document.getElementById('exportSessionData');
    
    // State
    let allClassrooms = [];
    let allSessions = [];
    let filteredSessions = [];
    let chartInstances = {};
    let currentSessionDetail = null;
    
    // Event listeners
    userMenuButton.addEventListener('click', toggleUserDropdown);
    logoutButton.addEventListener('click', handleLogout);
    
    dateRangeFilter.addEventListener('change', function() {
        customDateRange.style.display = this.value === 'custom' ? 'flex' : 'none';
    });
    
    generateReportBtn.addEventListener('click', generateReport);
    exportAllBtn.addEventListener('click', exportAllReports);
    
    closeSessionModal.addEventListener('click', closeSessionDetailModal);
    closeSessionDetail.addEventListener('click', closeSessionDetailModal);
    exportSessionReport.addEventListener('click', exportSessionReportHandler);
    
    exportFocusChartBtn.addEventListener('click', () => exportChart('focusTrendChart', 'focus-trend'));
    exportAttendanceChartBtn.addEventListener('click', () => exportChart('attendanceChart', 'attendance'));
    exportDurationChartBtn.addEventListener('click', () => exportChart('durationChart', 'duration'));
    exportDistributionChartBtn.addEventListener('click', () => exportChart('distributionChart', 'distribution'));
    exportSessionDataBtn.addEventListener('click', exportSessionDataToCSV);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    });
    
    // Load initial data
    loadClassrooms().then(() => {
        loadSessions();
    });
    
    function toggleUserDropdown() {
        userDropdown.classList.toggle('show');
    }
    
    function handleLogout() {
        logout();
    }
    
    async function loadClassrooms() {
        try {
            const endpoint = isInstructor ? '/api/classrooms/' : '/api/classrooms/enrolled/';
            const response = await fetch(endpoint, { headers: getAuthHeaders() });
            
            if (response.ok) {
                allClassrooms = await response.json();
                populateClassroomFilter();
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
    
    async function loadSessions() {
        reportsLoading.style.display = 'flex';
        reportsContainer.style.display = 'none';
        noReportsMessage.style.display = 'none';
        
        try {
            let endpoint = '/api/sessions/';
            const classroomId = classroomFilter.value;
            
            if (classroomId) {
                endpoint += `?classroom_id=${classroomId}`;
            }
            
            const response = await fetch(endpoint, { headers: getAuthHeaders() });
            
            if (response.ok) {
                allSessions = await response.json();
                generateReport();
            } else {
                throw new Error('Failed to load sessions');
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            showError('Failed to load sessions. Please try again.');
            showNoReportsMessage();
        } finally {
            reportsLoading.style.display = 'none';
        }
    }
    
    function generateReport() {
        const classroomId = classroomFilter.value;
        const sessionId = sessionFilter.value;
        const dateRange = dateRangeFilter.value;
        let startDateValue, endDateValue;
        
        // Apply date range filter
        if (dateRange === 'custom') {
            startDateValue = startDate.value;
            endDateValue = endDate.value;
        } else {
            const days = parseInt(dateRange);
            if (!isNaN(days)) {
                endDateValue = new Date().toISOString().split('T')[0];
                const start = new Date();
                start.setDate(start.getDate() - days);
                startDateValue = start.toISOString().split('T')[0];
            }
        }
        
        // Filter sessions
        filteredSessions = allSessions.filter(session => {
            // Filter by classroom
            if (classroomId && session.classroom_id !== classroomId) {
                return false;
            }
            
            // Filter by session
            if (sessionId && session.id !== sessionId) {
                return false;
            }
            
            // Filter by date range
            if (startDateValue && endDateValue) {
                const sessionDate = new Date(session.start_time).toISOString().split('T')[0];
                if (sessionDate < startDateValue || sessionDate > endDateValue) {
                    return false;
                }
            }
            
            return true;
        });
        
        if (filteredSessions.length > 0) {
            renderReportSummary();
            renderCharts();
            renderSessionsTable();
            reportsContainer.style.display = 'block';
            noReportsMessage.style.display = 'none';
        } else {
            reportsContainer.style.display = 'none';
            showNoReportsMessage();
        }
    }
    
    function renderReportSummary() {
        // Calculate summary statistics
        const total = filteredSessions.length;
        const avgAtt = filteredSessions.reduce((sum, session) => sum + (session.attendance_rate || 0), 0) / total;
        const avgFocus = filteredSessions.reduce((sum, session) => sum + (session.avg_focus_score || 0), 0) / total;
        
        // Calculate improvement rate (simplified)
        const firstSession = filteredSessions[0];
        const lastSession = filteredSessions[filteredSessions.length - 1];
        const improvement = lastSession && firstSession ? 
            ((lastSession.avg_focus_score - firstSession.avg_focus_score) / firstSession.avg_focus_score * 100) : 0;
        
        // Update UI
        totalSessions.textContent = total;
        avgAttendance.textContent = `${avgAtt.toFixed(1)}%`;
        avgFocusScore.textContent = `${avgFocus.toFixed(1)}%`;
        improvementRate.textContent = `${improvement.toFixed(1)}%`;
    }
    
    function renderCharts() {
        // Destroy existing charts
        Object.values(chartInstances).forEach(chart => {
            if (chart) chart.destroy();
        });
        
        // Prepare data for charts
        const labels = filteredSessions.map(session => {
            const date = new Date(session.start_time);
            return date.toLocaleDateString();
        });
        
        const focusData = filteredSessions.map(session => session.avg_focus_score || 0);
        const attendanceData = filteredSessions.map(session => session.attendance_rate || 0);
        const durationData = filteredSessions.map(session => {
            if (session.end_time) {
                const start = new Date(session.start_time);
                const end = new Date(session.end_time);
                return (end - start) / (1000 * 60); // duration in minutes
            }
            return 0;
        });
        
        // Focus Trend Chart
        chartInstances.focusTrendChart = new Chart(focusTrendChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Focus Score',
                    data: focusData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
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
                }
            }
        });
        
        // Attendance Chart
        chartInstances.attendanceChart = new Chart(attendanceChart, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Attendance Rate',
                    data: attendanceData,
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
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
                }
            }
        });
        
        // Duration Chart
        chartInstances.durationChart = new Chart(durationChart, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Duration (minutes)',
                    data: durationData,
                    backgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
        
        // Focus Distribution Chart
        const focusRanges = [
            '0-20%', '21-40%', '41-60%', '61-80%', '81-100%'
        ];
        
        const distributionData = [
            focusData.filter(score => score <= 20).length,
            focusData.filter(score => score > 20 && score <= 40).length,
            focusData.filter(score => score > 40 && score <= 60).length,
            focusData.filter(score => score > 60 && score <= 80).length,
            focusData.filter(score => score > 80).length
        ];
        
        chartInstances.distributionChart = new Chart(distributionChart, {
            type: 'pie',
            data: {
                labels: focusRanges,
                datasets: [{
                    data: distributionData,
                    backgroundColor: [
                        '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
    
    function renderSessionsTable() {
        const tbody = sessionsTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        filteredSessions.forEach(session => {
            const startTime = new Date(session.start_time);
            const endTime = session.end_time ? new Date(session.end_time) : null;
            
            let duration = 'N/A';
            if (endTime) {
                const diffMs = endTime - startTime;
                const diffMins = Math.floor(diffMs / 60000);
                duration = `${diffMins} min`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${session.title}</td>
                <td>${startTime.toLocaleDateString()}</td>
                <td>${duration}</td>
                <td>${session.attendance_rate || 0}%</td>
                <td>${session.avg_focus_score || 0}%</td>
                <td>
                    <button class="btn-text view-session-btn" data-id="${session.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-session-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const sessionId = this.getAttribute('data-id');
                viewSessionDetails(sessionId);
            });
        });
    }
    
    async function viewSessionDetails(sessionId) {
        try {
            const response = await fetch(`/api/sessions/${sessionId}/report/`, { 
                headers: getAuthHeaders() 
            });
            
            if (response.ok) {
                currentSessionDetail = await response.json();
                renderSessionDetailModal();
                sessionDetailModal.style.display = 'flex';
            } else {
                throw new Error('Failed to load session details');
            }
        } catch (error) {
            console.error('Error loading session details:', error);
            showError('Failed to load session details. Please try again.');
        }
    }
    
    function renderSessionDetailModal() {
        if (!currentSessionDetail) return;
        
        const session = currentSessionDetail.session;
        const startTime = new Date(session.start_time);
        const endTime = session.end_time ? new Date(session.end_time) : null;
        
        let duration = 'N/A';
        if (endTime) {
            const diffMs = endTime - startTime;
            const diffMins = Math.floor(diffMs / 60000);
            duration = `${diffMins} minutes`;
        }
        
        // Update modal content
        sessionDetailTitle.textContent = session.title;
        detailClassroom.textContent = session.classroom_name;
        detailDate.textContent = startTime.toLocaleString();
        detailDuration.textContent = duration;
        detailAttendance.textContent = `${session.attendance_rate || 0}%`;
        detailFocus.textContent = `${session.avg_focus_score || 0}%`;
        detailStatus.textContent = session.status.charAt(0).toUpperCase() + session.status.slice(1);
        
        // Render session focus chart
        if (chartInstances.sessionFocusChart) {
            chartInstances.sessionFocusChart.destroy();
        }
        
        if (currentSessionDetail.focus_over_time && currentSessionDetail.focus_over_time.length > 0) {
            const timeLabels = currentSessionDetail.focus_over_time.map((_, index) => 
                `${index + 1} min`
            );
            
            chartInstances.sessionFocusChart = new Chart(sessionFocusChart, {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: 'Focus Score',
                        data: currentSessionDetail.focus_over_time,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
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
                    }
                }
            });
        }
        
        // Render student focus distribution chart
        if (chartInstances.studentFocusChart) {
            chartInstances.studentFocusChart.destroy();
        }
        
        if (currentSessionDetail.student_focus && currentSessionDetail.student_focus.length > 0) {
            const studentNames = currentSessionDetail.student_focus.map(student => student.name);
            const studentScores = currentSessionDetail.student_focus.map(student => student.avg_focus);
            
            chartInstances.studentFocusChart = new Chart(studentFocusChart, {
                type: 'bar',
                data: {
                    labels: studentNames,
                    datasets: [{
                        label: 'Average Focus',
                        data: studentScores,
                        backgroundColor: '#10b981'
                    }]
                },
                options: {
                    responsive: true,
                    indexAxis: 'y',
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Render participants table
        participantsTableBody.innerHTML = '';
        
        if (currentSessionDetail.student_focus && currentSessionDetail.student_focus.length > 0) {
            currentSessionDetail.student_focus.forEach(student => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${student.name}</td>
                    <td>${student.attended ? 'Present' : 'Absent'}</td>
                    <td>${student.avg_focus || 0}%</td>
                    <td>${student.max_focus || 0}%</td>
                    <td>${student.min_focus || 0}%</td>
                `;
                participantsTableBody.appendChild(tr);
            });
        }
    }
    
    function closeSessionDetailModal() {
        sessionDetailModal.style.display = 'none';
        currentSessionDetail = null;
    }
    
    function exportChart(chartId, filename) {
        const chart = chartInstances[chartId];
        if (!chart) return;
        
        const image = chart.toBase64Image();
        const link = document.createElement('a');
        link.href = image;
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
    }
    
    function exportSessionDataToCSV() {
        if (filteredSessions.length === 0) return;
        
        let csvContent = "Session,Classroom,Date,Duration,Attendance,Avg Focus\n";
        
        filteredSessions.forEach(session => {
            const startTime = new Date(session.start_time);
            const endTime = session.end_time ? new Date(session.end_time) : null;
            
            let duration = 'N/A';
            if (endTime) {
                const diffMs = endTime - startTime;
                const diffMins = Math.floor(diffMs / 60000);
                duration = `${diffMins}`;
            }
            
            csvContent += `"${session.title}","${session.classroom_name}",${startTime.toLocaleDateString()},${duration},${session.attendance_rate || 0},${session.avg_focus_score || 0}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `sessions-report-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    function exportAllReports() {
        // This would typically generate a comprehensive PDF report
        // For simplicity, we'll just export the session data as CSV
        exportSessionDataToCSV();
    }
    
    function exportSessionReportHandler() {
        if (!currentSessionDetail) return;
        
        // This would generate a detailed PDF report for the specific session
        // For now, we'll just show a message
        showSuccess('Session report export functionality will be implemented soon');
    }
    
    function showNoReportsMessage() {
        noReportsMessage.style.display = 'flex';
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
});
