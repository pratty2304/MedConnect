class ApiService {
    constructor() {
        this.baseUrl = 'https://api.medconnect.com/v1'; // Replace with your actual API URL
        this.endpoints = {
            auth: {
                login: '/auth/login',
                register: '/auth/register',
                logout: '/auth/logout',
                refresh: '/auth/refresh-token'
            },
            users: {
                profile: '/users/profile',
                update: '/users/update'
            },
            doctors: {
                appointments: '/doctors/appointments',
                reports: '/doctors/reports',
                patients: '/doctors/patients'
            },
            patients: {
                appointments: '/patients/appointments',
                reports: '/patients/reports',
                doctors: '/patients/doctors'
            },
            messages: {
                list: '/messages',
                send: '/messages/send',
                read: '/messages/read'
            }
        };
    }

    // Token Management
    getAuthToken() {
        const session = JSON.parse(localStorage.getItem('medconnect_auth'));
        return session?.token;
    }

    setAuthToken(token) {
        const session = JSON.parse(localStorage.getItem('medconnect_auth')) || {};
        session.token = token;
        localStorage.setItem('medconnect_auth', JSON.stringify(session));
    }

    // Request Helper Methods
    async fetchWithAuth(endpoint, options = {}) {
        try {
            const token = this.getAuthToken();
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            };

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers
            });

            // Handle 401 Unauthorized - Token expired
            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry the original request with new token
                    return this.fetchWithAuth(endpoint, options);
                } else {
                    throw new Error('Authentication failed');
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.auth.refresh}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.setAuthToken(data.token);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    handleError(error) {
        console.error('API Error:', error);
        // Implement your error handling logic here
        // You might want to show a notification or redirect to an error page
    }

    // Authentication Methods
    async login(email, password, role) {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.auth.login}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, role })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            this.setAuthToken(data.token);
            return data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.fetchWithAuth(this.endpoints.auth.logout, { method: 'POST' });
            localStorage.removeItem('medconnect_auth');
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    // User Profile Methods
    async getUserProfile() {
        return this.fetchWithAuth(this.endpoints.users.profile);
    }

    async updateUserProfile(data) {
        return this.fetchWithAuth(this.endpoints.users.update, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Doctor Methods
    async getDoctorAppointments(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.fetchWithAuth(`${this.endpoints.doctors.appointments}?${queryString}`);
    }

    async getDoctorReports(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.fetchWithAuth(`${this.endpoints.doctors.reports}?${queryString}`);
    }

    async getDoctorPatients(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.fetchWithAuth(`${this.endpoints.doctors.patients}?${queryString}`);
    }

    // Patient Methods
    async getPatientAppointments(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.fetchWithAuth(`${this.endpoints.patients.appointments}?${queryString}`);
    }

    async getPatientReports(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.fetchWithAuth(`${this.endpoints.patients.reports}?${queryString}`);
    }

    async getPatientDoctors() {
        return this.fetchWithAuth(this.endpoints.patients.doctors);
    }

    // Messaging Methods
    async getMessages(conversationId) {
        return this.fetchWithAuth(`${this.endpoints.messages.list}/${conversationId}`);
    }

    async sendMessage(data) {
        return this.fetchWithAuth(this.endpoints.messages.send, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async markMessageAsRead(messageId) {
        return this.fetchWithAuth(`${this.endpoints.messages.read}/${messageId}`, {
            method: 'PUT'
        });
    }

    // Appointment Methods
    async createAppointment(data) {
        return this.fetchWithAuth(this.endpoints.doctors.appointments, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateAppointment(appointmentId, data) {
        return this.fetchWithAuth(`${this.endpoints.doctors.appointments}/${appointmentId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async cancelAppointment(appointmentId) {
        return this.fetchWithAuth(`${this.endpoints.doctors.appointments}/${appointmentId}`, {
            method: 'DELETE'
        });
    }

    // Report Methods
    async createReport(data) {
        return this.fetchWithAuth(this.endpoints.doctors.reports, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateReport(reportId, data) {
        return this.fetchWithAuth(`${this.endpoints.doctors.reports}/${reportId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // File Upload Method
    async uploadFile(file, type = 'report') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        return this.fetchWithAuth('/files/upload', {
            method: 'POST',
            headers: {
                // Remove Content-Type header to let browser set it with boundary
                'Content-Type': undefined
            },
            body: formData
        });
    }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService; 