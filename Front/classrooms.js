// classrooms.js
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
    } else if (isStudent) {
        document.getElementById('studentActions').style.display = 'block';
    }
    
    // DOM elements
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    const logoutButton = document.getElementById('logoutButton');
    const createClassroomBtn = document.getElementById('createClassroomBtn');
    const joinClassroomBtn = document.getElementById('joinClassroomBtn');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    
    // Modal elements
    const createModal = document.getElementById('createModal');
    const closeCreateModal = document.getElementById('closeCreateModal');
    const cancelCreate = document.getElementById('cancelCreate');
    const createClassroomForm = document.getElementById('createClassroomForm');
    const classNameInput = document.getElementById('className');
    const classNameError = document.getElementById('classNameError');
    
    const joinModal = document.getElementById('joinModal');
    const closeJoinModal = document.getElementById('closeJoinModal');
    const cancelJoin = document.getElementById('cancelJoin');
    const joinClassroomForm = document.getElementById('joinClassroomForm');
    const joinCodeInput = document.getElementById('joinCode');
    const joinCodeError = document.getElementById('joinCodeError');
    
    // Content elements
    const classroomsList = document.getElementById('classroomsList');
    const noClassroomsMessage = document.getElementById('noClassroomsMessage');
    const noClassroomsText = document.getElementById('noClassroomsText');
    const noClassroomsAction = document.getElementById('noClassroomsAction');
    const classroomsLoading = document.getElementById('classroomsLoading');
    
    // State
    let allClassrooms = [];
    let filteredClassrooms = [];
    
    // Event listeners
    userMenuButton.addEventListener('click', toggleUserDropdown);
    logoutButton.addEventListener('click', handleLogout);
    
    if (isInstructor) {
        createClassroomBtn.addEventListener('click', openCreateModal);
        closeCreateModal.addEventListener('click', closeCreateModalHandler);
        cancelCreate.addEventListener('click', closeCreateModalHandler);
        createClassroomForm.addEventListener('submit', handleCreateClassroom);
    }
    
    if (isStudent) {
        joinClassroomBtn.addEventListener('click', openJoinModal);
        closeJoinModal.addEventListener('click', closeJoinModalHandler);
        cancelJoin.addEventListener('click', closeJoinModalHandler);
        joinClassroomForm.addEventListener('submit', handleJoinClassroom);
    }
    
    searchInput.addEventListener('input', filterClassrooms);
    sortSelect.addEventListener('change', sortClassrooms);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    });
    
    // Load classrooms
    loadClassrooms();
    
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
        createClassroomForm.reset();
        classNameError.textContent = '';
    }
    
    function openJoinModal() {
        joinModal.style.display = 'flex';
    }
    
    function closeJoinModalHandler() {
        joinModal.style.display = 'none';
        joinClassroomForm.reset();
        joinCodeError.textContent = '';
    }
    
    async function handleCreateClassroom(e) {
        e.preventDefault();
        
        const name = classNameInput.value.trim();
        
        // Validate
        if (!name) {
            classNameError.textContent = 'Classroom name is required';
            return;
        }
        
        try {
            const response = await fetch('/api/classrooms/', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: name,
                    description: document.getElementById('classDescription').value.trim()
                })
            });
            
            if (response.ok) {
                const classroom = await response.json();
                showSuccess('Classroom created successfully!');
                closeCreateModalHandler();
                loadClassrooms(); // Reload the list
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create classroom');
            }
        } catch (error) {
            console.error('Error creating classroom:', error);
            showError(error.message || 'Failed to create classroom. Please try again.');
        }
    }
    
    async function handleJoinClassroom(e) {
        e.preventDefault();
        
        const code = joinCodeInput.value.trim();
        
        // Validate
        if (!code) {
            joinCodeError.textContent = 'Join code is required';
            return;
        }
        
        try {
            const response = await fetch(`/api/classrooms/${code}/join/`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showSuccess('Successfully joined classroom!');
                closeJoinModalHandler();
                loadClassrooms(); // Reload the list
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to join classroom');
            }
        } catch (error) {
            console.error('Error joining classroom:', error);
            showError(error.message || 'Failed to join classroom. Please check the code and try again.');
        }
    }
    
    async function loadClassrooms() {
        classroomsLoading.style.display = 'flex';
        classroomsList.innerHTML = '';
        noClassroomsMessage.style.display = 'none';
        
        try {
            const endpoint = isInstructor ? '/api/classrooms/' : '/api/classrooms/enrolled/';
            const response = await fetch(endpoint, { headers: getAuthHeaders() });
            
            if (response.ok) {
                allClassrooms = await response.json();
                
                if (allClassrooms.length > 0) {
                    filteredClassrooms = [...allClassrooms];
                    renderClassrooms();
                } else {
                    showNoClassroomsMessage();
                }
            } else {
                throw new Error('Failed to load classrooms');
            }
        } catch (error) {
            console.error('Error loading classrooms:', error);
            showError('Failed to load classrooms. Please try again.');
            showNoClassroomsMessage();
        } finally {
            classroomsLoading.style.display = 'none';
        }
    }
    
    function renderClassrooms() {
        classroomsList.innerHTML = '';
        
        filteredClassrooms.forEach(classroom => {
            const classroomCard = createClassroomCard(classroom);
            classroomsList.appendChild(classroomCard);
        });
    }
    
    function createClassroomCard(classroom) {
        const card = document.createElement('div');
        card.className = 'classroom-card';
        
        if (isInstructor) {
            card.innerHTML = `
                <div class="classroom-card-header">
                    <h3>${classroom.name}</h3>
                    <p>${classroom.description || 'No description'}</p>
                </div>
                <div class="classroom-card-body">
                    <div class="classroom-stats">
                        <div class="classroom-stat">
                            <span class="value">${classroom.session_count || 0}</span>
                            <span class="label">Sessions</span>
                        </div>
                        <div class="classroom-stat">
                            <span class="value">${classroom.student_count || 0}</span>
                            <span class="label">Students</span>
                        </div>
                    </div>
                    <div class="classroom-card-actions">
                        <a href="sessions.html?classroom_id=${classroom.id}" class="btn-primary">View Sessions</a>
                        <button class="btn-secondary" data-id="${classroom.id}" data-action="view">Details</button>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="classroom-card-header">
                    <h3>${classroom.name}</h3>
                    <p>Instructor: ${classroom.instructor_name}</p>
                </div>
                <div class="classroom-card-body">
                    <div class="classroom-stats">
                        <div class="classroom-stat">
                            <span class="value">${classroom.session_count || 0}</span>
                            <span class="label">Sessions</span>
                        </div>
                        <div class="classroom-stat">
                            <span class="value">${classroom.attendance_rate || 0}%</span>
                            <span class="label">Attendance</span>
                        </div>
                    </div>
                    <div class="classroom-card-actions">
                        <a href="sessions.html?classroom_id=${classroom.id}" class="btn-primary">View Sessions</a>
                        <button class="btn-secondary" data-id="${classroom.id}" data-action="view">Details</button>
                    </div>
                </div>
            `;
        }
        
        // Add event listener to details button
        const detailsBtn = card.querySelector('[data-action="view"]');
        detailsBtn.addEventListener('click', () => {
            // Implement view details functionality
            alert(`View details for classroom: ${classroom.name}`);
        });
        
        return card;
    }
    
    function showNoClassroomsMessage() {
        noClassroomsMessage.style.display = 'flex';
        
        if (isInstructor) {
            noClassroomsText.textContent = "You haven't created any classrooms yet";
            noClassroomsAction.innerHTML = '<button class="btn-primary" id="createFirstClassroom">Create Your First Classroom</button>';
            
            document.getElementById('createFirstClassroom').addEventListener('click', openCreateModal);
        } else {
            noClassroomsText.textContent = "You haven't joined any classrooms yet";
            noClassroomsAction.innerHTML = '<button class="btn-primary" id="joinFirstClassroom">Join a Classroom</button>';
            
            document.getElementById('joinFirstClassroom').addEventListener('click', openJoinModal);
        }
    }
    
    function filterClassrooms() {
        const searchTerm = searchInput.value.toLowerCase();
        
        if (searchTerm) {
            filteredClassrooms = allClassrooms.filter(classroom => 
                classroom.name.toLowerCase().includes(searchTerm) ||
                (classroom.description && classroom.description.toLowerCase().includes(searchTerm))
            );
        } else {
            filteredClassrooms = [...allClassrooms];
        }
        
        // Apply sorting
        sortClassrooms();
    }
    
    function sortClassrooms() {
        const sortBy = sortSelect.value;
        
        switch (sortBy) {
            case 'name':
                filteredClassrooms.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'recent':
                // Assuming classrooms have a created_at field
                filteredClassrooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'students':
                filteredClassrooms.sort((a, b) => (b.student_count || 0) - (a.student_count || 0));
                break;
        }
        
        renderClassrooms();
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