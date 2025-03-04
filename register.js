import apiService from './api.js';

class RegistrationForm {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.doctorFields = document.getElementById('doctorFields');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPasswordToggles();
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Role selection
        document.querySelectorAll('input[name="role"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.toggleDoctorFields(e));
        });

        // Password validation
        document.getElementById('confirmPassword').addEventListener('input', (e) => {
            this.validatePasswordMatch(e.target.value);
        });
    }

    setupPasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', (e) => {
                const input = e.target.closest('.password-input').querySelector('input');
                const icon = e.target.closest('.toggle-password').querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(this.form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
            ...(formData.get('role') === 'doctor' && {
                specialization: formData.get('specialization'),
                license: formData.get('license')
            })
        };

        try {
            const response = await apiService.register(data);
            this.handleRegistrationSuccess(response);
        } catch (error) {
            this.handleRegistrationError(error);
        }
    }

    validateForm() {
        this.clearErrors();
        let isValid = true;

        // Required fields
        const requiredFields = ['name', 'email', 'password', 'confirmPassword'];
        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (!input.value.trim()) {
                this.showError(field, 'This field is required');
                isValid = false;
            }
        });

        // Email validation
        const email = document.getElementById('email').value;
        if (!this.isValidEmail(email)) {
            this.showError('email', 'Please enter a valid email address');
            isValid = false;
        }

        // Password validation
        const password = document.getElementById('password').value;
        if (password.length < 8) {
            this.showError('password', 'Password must be at least 8 characters');
            isValid = false;
        }

        // Password match
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (password !== confirmPassword) {
            this.showError('confirmPassword', 'Passwords do not match');
            isValid = false;
        }

        // Terms checkbox
        if (!document.getElementById('terms').checked) {
            this.showError('terms', 'You must agree to the Terms of Service');
            isValid = false;
        }

        // Doctor-specific validation
        const role = document.querySelector('input[name="role"]:checked').value;
        if (role === 'doctor') {
            ['specialization', 'license'].forEach(field => {
                const input = document.getElementById(field);
                if (!input.value.trim()) {
                    this.showError(field, 'This field is required for doctors');
                    isValid = false;
                }
            });
        }

        return isValid;
    }

    toggleDoctorFields(event) {
        if (event.target.value === 'doctor') {
            this.doctorFields.classList.remove('hidden');
        } else {
            this.doctorFields.classList.add('hidden');
        }
    }

    validatePasswordMatch(confirmPassword) {
        const password = document.getElementById('password').value;
        const confirmInput = document.getElementById('confirmPassword');
        
        if (password !== confirmPassword) {
            confirmInput.setCustomValidity('Passwords do not match');
        } else {
            confirmInput.setCustomValidity('');
        }
    }

    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
        field.classList.add('error');
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(error => error.remove());
        document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    handleRegistrationSuccess(response) {
        // Store auth token if provided
        if (response.token) {
            localStorage.setItem('medconnect_auth', JSON.stringify({
                token: response.token,
                user: response.user
            }));
        }

        // Redirect based on role
        const redirectPath = response.user.role === 'doctor' 
            ? '/pages/doctor-dashboard.html'
            : '/pages/patient-dashboard.html';
        
        window.location.href = redirectPath;
    }

    handleRegistrationError(error) {
        const message = error.response?.data?.message || 'Registration failed. Please try again.';
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.textContent = message;
        this.form.insertBefore(errorDiv, this.form.firstChild);
    }
}

// Initialize registration form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RegistrationForm();
}); 