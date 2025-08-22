document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!requireAuth()) return;
    
    const userData = getUserData();
    
    // Set user role in UI
    document.getElementById('userRole').textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    
    // DOM elements
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    const logoutButton = document.getElementById('logoutButton');
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileRole = document.getElementById('profileRole');
    
    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Form elements
    const profileForm = document.getElementById('profileForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const roleInput = document.getElementById('role');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    
    const passwordForm = document.getElementById('passwordForm');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    const preferencesForm = document.getElementById('preferencesForm');
    const notifySessionStart = document.getElementById('notifySessionStart');
    const notifyFocusAlerts = document.getElementById('notifyFocusAlerts');
    const notifyReports = document.getElementById('notifyReports');
    const themeSelect = document.getElementById('theme');
    const languageSelect = document.getElementById('language');
    const savePreferencesBtn = document.getElementById('savePreferencesBtn');
    
    // Stat elements
    const statClassrooms = document.getElementById('statClassrooms');
    const statSessions = document.getElementById('statSessions');
    const statAttendance = document.getElementById('statAttendance');
    const statFocus = document.getElementById('statFocus');
    
    // Delete account elements
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    // Event listeners
    userMenuButton.addEventListener('click', toggleUserDropdown);
    logoutButton.addEventListener('click', handleLogout);
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab pane
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`${tabId}Tab`).classList.add('active');
        });
    });
    
    // Form submissions
    profileForm.addEventListener('submit', handleProfileUpdate);
    passwordForm.addEventListener('submit', handlePasswordChange);
    preferencesForm.addEventListener('submit', handlePreferencesSave);
    
    // Password strength meter
    newPasswordInput.addEventListener('input', function() {
        updatePasswordStrength(this.value);
    });
    
    // Delete account
    deleteAccountBtn.addEventListener('click', openDeleteAccountModal);
    closeDeleteModal.addEventListener('click', closeDeleteAccountModal);
    cancelDelete.addEventListener('click', closeDeleteAccountModal);
    confirmDelete.addEventListener('input', function() {
        confirmDeleteBtn.disabled = this.value !== 'DELETE';
    });
    confirmDeleteBtn.addEventListener('click', handleAccountDelete);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    });
    
    // Load user data
    loadUserData();
    loadUserStats();
    
    function toggleUserDropdown() {
        userDropdown.classList.toggle('show');
    }
    
    function handleLogout() {
        logout();
    }
    
    async function loadUserData() {
        try {
            const response = await fetch('/api/users/me/', { headers: getAuthHeaders() });
            
            if (response.ok) {
                const user = await response.json();
                populateUserData(user);
            } else {
                throw new Error('Failed to load user data');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showError('Failed to load user data. Please try again.');
        }
    }
    
    async function loadUserStats() {
        try {
            const [classroomsRes, sessionsRes, statsRes] = await Promise.all([
                fetch('/api/classrooms/count/', { headers: getAuthHeaders() }),
                fetch('/api/sessions/count/', { headers: getAuthHeaders() }),
                fetch('/api/users/me/stats/', { headers: getAuthHeaders() })
            ]);
            
            if (classroomsRes.ok) {
                const data = await classroomsRes.json();
                statClassrooms.textContent = data.count || 0;
            }
            
            if (sessionsRes.ok) {
                const data = await sessionsRes.json();
                statSessions.textContent = data.count || 0;
            }
            
            if (statsRes.ok) {
                const data = await statsRes.json();
                statAttendance.textContent = `${data.attendance_rate || 0}%`;
                statFocus.textContent = `${data.avg_focus_score || 0}%`;
            }
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }
    
    function populateUserData(user) {
        // Update profile header
        profileName.textContent = user.full_name;
        profileEmail.textContent = user.email;
        profileRole.textContent = `Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`;
        
        // Update profile form
        fullNameInput.value = user.full_name;
        emailInput.value = user.email;
        roleInput.value = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        
        // Update preferences if available
        if (user.preferences) {
            notifySessionStart.checked = user.preferences.notify_session_start !== false;
            notifyFocusAlerts.checked = user.preferences.notify_focus_alerts !== false;
            notifyReports.checked = user.preferences.notify_reports !== false;
            themeSelect.value = user.preferences.theme || 'light';
            languageSelect.value = user.preferences.language || 'en';
        }
    }
    
    async function handleProfileUpdate(e) {
        e.preventDefault();
        
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        
        // Basic validation
        if (!fullName || !email) {
            showError('Please fill in all required fields');
            return;
        }
        
        setLoadingState(saveProfileBtn, true);
        
        try {
            const response = await fetch('/api/users/me/', {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    full_name: fullName,
                    email: email
                })
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                populateUserData(updatedUser);
                showSuccess('Profile updated successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showError(error.message || 'Failed to update profile. Please try again.');
        } finally {
            setLoadingState(saveProfileBtn, false);
        }
    }
    
    async function handlePasswordChange(e) {
        e.preventDefault();
        
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            showError('Please fill in all password fields');
            return;
        }
        
        if (newPassword.length < 6) {
            showError('New password must be at least 6 characters');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showError('New passwords do not match');
            return;
        }
        
        setLoadingState(changePasswordBtn, true);
        
        try {
            const response = await fetch('/api/users/me/password/', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            if (response.ok) {
                passwordForm.reset();
                showSuccess('Password changed successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            showError(error.message || 'Failed to change password. Please try again.');
        } finally {
            setLoadingState(changePasswordBtn, false);
        }
    }
    
    async function handlePreferencesSave(e) {
        e.preventDefault();
        
        const preferences = {
            notify_session_start: notifySessionStart.checked,
            notify_focus_alerts: notifyFocusAlerts.checked,
            notify_reports: notifyReports.checked,
            theme: themeSelect.value,
            language: languageSelect.value
        };
        
        setLoadingState(savePreferencesBtn, true);
        
        try {
            const response = await fetch('/api/users/me/preferences/', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(preferences)
            });
            
            if (response.ok) {
                showSuccess('Preferences saved successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save preferences');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            showError(error.message || 'Failed to save preferences. Please try again.');
        } finally {
            setLoadingState(savePreferencesBtn, false);
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
    
    function openDeleteAccountModal() {
        deleteAccountModal.style.display = 'flex';
    }
    
    function closeDeleteAccountModal() {
        deleteAccountModal.style.display = 'none';
        confirmDelete.value = '';
        confirmDeleteBtn.disabled = true;
    }
    
    async function handleAccountDelete() {
        setLoadingState(confirmDeleteBtn, true);
        
        try {
            const response = await fetch('/api/users/me/', {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showSuccess('Account deleted successfully. Redirecting to login...');
                setTimeout(() => {
                    logout();
                }, 2000);
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete account');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            showError(error.message || 'Failed to delete account. Please try again.');
        } finally {
            setLoadingState(confirmDeleteBtn, false);
        }
    }
    
    function setLoadingState(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            const originalText = button.innerHTML;
            button.setAttribute('data-original-text', originalText);
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        } else {
            button.disabled = false;
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
            }
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