import apiService from './api.js';
import authService from './auth.js';

class PatientDashboard {
    constructor() {
        this.user = null;
        this.appointments = [];
        this.activities = [];
        this.init();
    }

    async init() {
        // Check authentication
        const session = authService.getSession();
        if (!session || session.user.role !== 'patient') {
            window.location.href = '/pages/login.html';
            return;
        }

        this.user = session.user;
        this.initializeUI();
        await this.loadDashboardData();
        this.setupEventListeners();
    }

    initializeUI() {
        // Set user info
        document.querySelector('.user-name').textContent = this.user.name;
        
        // Initialize components
        this.appointmentsList = document.querySelector('.appointments-list');
        this.activityList = document.querySelector('.activity-list');
        this.searchInput = document.querySelector('.header-search input');
    }

    async loadDashboardData() {
        try {
            // Load data in parallel
            const [appointments, activities, stats] = await Promise.all([
                this.fetchAppointments(),
                this.fetchActivities(),
                this.fetchStats()
            ]);

            this.appointments = appointments;
            this.activities = activities;
            
            this.updateDashboard(stats);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async fetchAppointments() {
        try {
            return await apiService.getPatientAppointments();
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }
    }

    async fetchActivities() {
        try {
            return await apiService.getPatientActivities();
        } catch (error) {
            console.error('Error fetching activities:', error);
            return [];
        }
    }

    async fetchStats() {
        try {
            return await apiService.getPatientStats();
        } catch (error) {
            console.error('Error fetching stats:', error);
            return null;
        }
    }

    updateDashboard(stats) {
        if (stats) {
            this.updateStats(stats);
        }
        this.renderAppointments();
        this.renderActivities();
    }

    updateStats(stats) {
        // Update stat cards
        document.querySelector('.stat-card:nth-child(1) .stat-number')
            .textContent = stats.upcomingAppointments;
        document.querySelector('.stat-card:nth-child(2) .stat-number')
            .textContent = stats.activePrescriptions;
        document.querySelector('.stat-card:nth-child(3) .stat-number')
            .textContent = stats.newMessages;
    }

    renderAppointments() {
        if (!this.appointments.length) {
            this.appointmentsList.innerHTML = `
                <div class="empty-state">
                    <p>No upcoming appointments</p>
                    <button class="btn btn-primary">Book Appointment</button>
                </div>
            `;
            return;
        }

        this.appointmentsList.innerHTML = this.appointments
            .map(appointment => this.createAppointmentCard(appointment))
            .join('');
    }

    createAppointmentCard(appointment) {
        return `
            <div class="appointment-card">
                <div class="appointment-info">
                    <div class="doctor-info">
                        <img src="${appointment.doctorAvatar}" alt="Doctor Avatar" class="avatar">
                        <div>
                            <h4>Dr. ${appointment.doctorName}</h4>
                            <p>${appointment.specialization}</p>
                        </div>
                    </div>
                    <div class="appointment-details">
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>${this.formatDate(appointment.date)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>${this.formatTime(appointment.time)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${appointment.location}</span>
                        </div>
                    </div>
                </div>
                <div class="appointment-actions">
                    <button class="btn btn-outline" onclick="rescheduleAppointment(${appointment.id})">
                        Reschedule
                    </button>
                    <button class="btn btn-outline-error" onclick="cancelAppointment(${appointment.id})">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    }

    renderActivities() {
        if (!this.activities.length) {
            this.activityList.innerHTML = '<p class="empty-state">No recent activity</p>';
            return;
        }

        this.activityList.innerHTML = this.activities
            .map(activity => this.createActivityItem(activity))
            .join('');
    }

    createActivityItem(activity) {
        return `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <p>${activity.description}</p>
                    <span class="activity-time">${this.formatActivityTime(activity.timestamp)}</span>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Quick action buttons
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', (e) => this.handleQuickAction(e));
        });

        // Search functionality
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Profile settings
        document.getElementById('profileSettings').addEventListener('click', () => {
            window.location.href = '/pages/profile-settings.html';
        });
    }

    handleQuickAction(event) {
        const action = event.currentTarget.querySelector('span').textContent;
        switch (action) {
            case 'Book Appointment':
                window.location.href = '/pages/appointment-booking.html';
                break;
            case 'Upload Records':
                window.location.href = '/pages/medical-records.html';
                break;
            case 'Virtual Consultation':
                this.initiateVirtualConsultation();
                break;
            case 'Emergency Contact':
                this.showEmergencyContacts();
                break;
        }
    }

    handleSearch(query) {
        // Implement search functionality
    }

    async handleLogout() {
        try {
            await authService.logout();
            window.location.href = '/pages/login.html';
        } catch (error) {
            console.error('Error logging out:', error);
            this.showError('Failed to log out');
        }
    }

    // Utility Methods
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(time) {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    formatActivityTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else {
            return this.formatDate(date);
        }
    }

    getActivityIcon(type) {
        const icons = {
            appointment: 'fa-calendar-check',
            prescription: 'fa-prescription',
            message: 'fa-envelope',
            report: 'fa-file-medical',
            payment: 'fa-credit-card'
        };
        return icons[type] || 'fa-circle';
    }

    showError(message) {
        // Implement error notification
        console.error(message);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PatientDashboard();
}); 