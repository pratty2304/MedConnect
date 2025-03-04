// Import auth service for user session management
import authService from './auth.js';

class DoctorDashboard {
    constructor() {
        this.currentTab = 'overview';
        this.notifications = [];
        
        // Mock data - in real app, this would come from an API
        this.mockAppointments = [
            {
                id: 1,
                patientName: "John Doe",
                time: "09:00 AM",
                date: "2024-03-20",
                type: "General Checkup",
                status: "confirmed"
            },
            {
                id: 2,
                patientName: "Sarah Johnson",
                time: "10:30 AM",
                date: "2024-03-20",
                type: "Follow-up",
                status: "pending"
            },
            {
                id: 3,
                patientName: "Mike Wilson",
                time: "02:00 PM",
                date: "2024-03-20",
                type: "Consultation",
                status: "confirmed"
            }
        ];

        this.mockReports = [
            {
                id: 1,
                patientName: "Michael Brown",
                type: "Blood Test Results",
                date: "2024-03-19",
                urgency: "high"
            },
            {
                id: 2,
                patientName: "Emma Wilson",
                type: "X-Ray Analysis",
                date: "2024-03-19",
                urgency: "medium"
            }
        ];

        this.init();
    }

    init() {
        // Check authentication
        const session = authService.getSession();
        if (!session || session.user.role !== 'doctor') {
            window.location.href = '/pages/login.html';
            return;
        }

        // Initialize UI elements
        this.initializeUI();
        
        // Load initial data
        this.loadDashboardData();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    initializeUI() {
        // Set user name and avatar
        const session = authService.getSession();
        const userProfileElement = document.querySelector('.user-profile span');
        if (userProfileElement) {
            userProfileElement.textContent = session.user.name;
        }

        // Initialize navigation
        this.initializeNavigation();
    }

    setupEventListeners() {
        // Navigation click handlers
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.getAttribute('data-tab');
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        // Notification button click handler
        const notificationBtn = document.querySelector('.notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.showNotifications());
        }

        // Search input handler
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
    }

    loadDashboardData() {
        this.fetchAndDisplayAppointments();
        this.fetchAndDisplayReports();
        this.updateStats();
        this.checkNotifications();
    }

    async fetchAndDisplayAppointments() {
        try {
            // In real app, this would be an API call
            const appointments = this.mockAppointments;
            
            const appointmentsList = document.querySelector('.appointments-list');
            if (!appointmentsList) return;

            appointmentsList.innerHTML = appointments.map(appointment => `
                <div class="appointment-item">
                    <div class="appointment-time">${appointment.time}</div>
                    <div class="appointment-info">
                        <h4>${appointment.patientName}</h4>
                        <p>${appointment.type}</p>
                    </div>
                    <div class="appointment-status">
                        <span class="status-badge ${appointment.status}">
                            ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error fetching appointments:', error);
            this.showError('Failed to load appointments');
        }
    }

    async fetchAndDisplayReports() {
        try {
            // In real app, this would be an API call
            const reports = this.mockReports;
            
            const reportsList = document.querySelector('.reports-list');
            if (!reportsList) return;

            reportsList.innerHTML = reports.map(report => `
                <div class="report-item">
                    <div class="report-info">
                        <h4>${report.type}</h4>
                        <p>Patient: ${report.patientName}</p>
                    </div>
                    <div class="report-actions">
                        <button class="btn btn-primary" onclick="handleReportReview(${report.id})">
                            Review
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error fetching reports:', error);
            this.showError('Failed to load reports');
        }
    }

    updateStats() {
        // Update dashboard statistics
        const stats = {
            appointments: this.mockAppointments.length,
            reports: this.mockReports.length,
            messages: 12 // Mock value
        };

        document.querySelectorAll('.stats-card').forEach(card => {
            const statType = card.getAttribute('data-stat');
            if (statType && stats[statType] !== undefined) {
                const numberElement = card.querySelector('.stats-number');
                if (numberElement) {
                    numberElement.textContent = stats[statType];
                }
            }
        });
    }

    checkNotifications() {
        // In real app, this would check for new notifications from the server
        this.notifications = [
            { id: 1, message: "New appointment request", type: "appointment" },
            { id: 2, message: "Lab results ready", type: "report" },
            { id: 3, message: "New message from patient", type: "message" }
        ];

        // Update notification badge
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = this.notifications.length;
        }
    }

    showNotifications() {
        // Create and show notifications dropdown
        const notificationsList = document.createElement('div');
        notificationsList.className = 'notifications-dropdown';
        notificationsList.innerHTML = `
            <div class="notifications-header">
                <h3>Notifications</h3>
                <button class="btn btn-text" onclick="markAllAsRead()">Mark all as read</button>
            </div>
            ${this.notifications.map(notif => `
                <div class="notification-item">
                    <i class="fas fa-${this.getNotificationIcon(notif.type)}"></i>
                    <span>${notif.message}</span>
                </div>
            `).join('')}
        `;

        // Position and show dropdown
        const notificationBtn = document.querySelector('.notification-btn');
        if (notificationBtn) {
            notificationBtn.appendChild(notificationsList);
        }
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'appointment': return 'calendar-check';
            case 'report': return 'file-medical';
            case 'message': return 'envelope';
            default: return 'bell';
        }
    }

    handleSearch(query) {
        // Implement search functionality
        if (!query) {
            this.fetchAndDisplayAppointments();
            this.fetchAndDisplayReports();
            return;
        }

        const filteredAppointments = this.mockAppointments.filter(apt => 
            apt.patientName.toLowerCase().includes(query.toLowerCase()) ||
            apt.type.toLowerCase().includes(query.toLowerCase())
        );

        const filteredReports = this.mockReports.filter(report => 
            report.patientName.toLowerCase().includes(query.toLowerCase()) ||
            report.type.toLowerCase().includes(query.toLowerCase())
        );

        this.displayFilteredResults(filteredAppointments, filteredReports);
    }

    displayFilteredResults(appointments, reports) {
        // Update appointments list
        const appointmentsList = document.querySelector('.appointments-list');
        if (appointmentsList) {
            appointmentsList.innerHTML = appointments.length ? 
                this.renderAppointments(appointments) : 
                '<p class="no-results">No appointments found</p>';
        }

        // Update reports list
        const reportsList = document.querySelector('.reports-list');
        if (reportsList) {
            reportsList.innerHTML = reports.length ? 
                this.renderReports(reports) : 
                '<p class="no-results">No reports found</p>';
        }
    }

    showError(message) {
        // Create and show error toast
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new DoctorDashboard();
});

// Export for use in other files
export default DoctorDashboard; 