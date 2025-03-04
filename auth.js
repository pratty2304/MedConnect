// Constants
const STORAGE_KEY = 'medconnect_auth';
const ROUTES = {
    DOCTOR: '/pages/doctor-dashboard.html',
    PATIENT: '/pages/patient-dashboard.html',
    LOGIN: '/pages/login.html'
};

// Mock user data (replace with actual backend authentication)
const MOCK_USERS = {
    'doctor@example.com': {
        password: 'doctor123',
        role: 'doctor',
        name: 'Dr. Smith'
    },
    'patient@example.com': {
        password: 'patient123',
        role: 'patient',
        name: 'John Doe'
    }
};

class AuthService {
    constructor() {
        this.init();
    }

    init() {
        // Add form submit listener if on login page
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Check authentication status on page load
        this.checkAuth();
    }

    handleLogin(event) {
        event.preventDefault();

        // Get form data
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        // Validate form
        if (!this.validateForm(email, password)) {
            return;
        }

        // Attempt login
        this.login(email, password, role);
    }

    validateForm(email, password) {
        // Clear previous error messages
        this.clearErrors();

        let isValid = true;

        // Email validation
        if (!email) {
            this.showError('email', 'Email is required');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showError('email', 'Please enter a valid email address');
            isValid = false;
        }

        // Password validation
        if (!password) {
            this.showError('password', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            this.showError('password', 'Password must be at least 6 characters');
            isValid = false;
        }

        return isValid;
    }

    login(email, password, role) {
        // In a real app, this would be an API call
        const user = MOCK_USERS[email];

        if (!user || user.password !== password || user.role !== role) {
            this.showError('email', 'Invalid email or password');
            return;
        }

        // Create session
        const session = {
            user: {
                email,
                name: user.name,
                role: user.role
            },
            token: 'mock-jwt-token', // In real app, this would come from the server
            timestamp: new Date().getTime()
        };

        // Save to localStorage
        this.setSession(session);

        // Redirect based on role
        this.redirectToUserDashboard(user.role);
    }

    logout() {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = ROUTES.LOGIN;
    }

    checkAuth() {
        const session = this.getSession();
        const currentPath = window.location.pathname;

        if (!session && !currentPath.includes('login.html')) {
            // No session and not on login page - redirect to login
            window.location.href = ROUTES.LOGIN;
            return;
        }

        if (session) {
            // Has session but on login page - redirect to appropriate dashboard
            if (currentPath.includes('login.html')) {
                this.redirectToUserDashboard(session.user.role);
            }

            // Verify user is on correct dashboard
            this.validateUserAccess(session.user.role, currentPath);
        }
    }

    redirectToUserDashboard(role) {
        const route = role === 'doctor' ? ROUTES.DOCTOR : ROUTES.PATIENT;
        window.location.href = route;
    }

    validateUserAccess(userRole, currentPath) {
        const isDoctorPath = currentPath.includes('doctor-dashboard');
        const isPatientPath = currentPath.includes('patient-dashboard');

        if (isDoctorPath && userRole !== 'doctor' || 
            isPatientPath && userRole !== 'patient') {
            this.redirectToUserDashboard(userRole);
        }
    }

    // Session Management
    getSession() {
        const session = localStorage.getItem(STORAGE_KEY);
        if (!session) return null;

        const parsedSession = JSON.parse(session);
        
        // Check if session is expired (24 hours)
        if (this.isSessionExpired(parsedSession.timestamp)) {
            this.logout();
            return null;
        }

        return parsedSession;
    }

    setSession(session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }

    isSessionExpired(timestamp) {
        const now = new Date().getTime();
        const hoursPassed = (now - timestamp) / (1000 * 60 * 60);
        return hoursPassed > 24;
    }

    // Utility Methods
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = 'var(--error)';
        errorDiv.style.fontSize = 'var(--font-size-sm)';
        errorDiv.style.marginTop = 'var(--spacing-xs)';
        errorDiv.textContent = message;

        field.parentNode.appendChild(errorDiv);
        field.style.borderColor = 'var(--error)';
    }

    clearErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(error => error.remove());

        const fields = document.querySelectorAll('input');
        fields.forEach(field => field.style.borderColor = '');
    }
}

// Initialize authentication service
const authService = new AuthService();

// Export for use in other files
export default authService; 