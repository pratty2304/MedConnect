import apiService from './api.js';
import authService from './auth.js';

class ProfileSettings {
    constructor() {
        this.user = null;
        this.currentSection = 'personal';
        this.init();
    }

    async init() {
        // Check authentication
        const session = authService.getSession();
        if (!session) {
            window.location.href = '/pages/login.html';
            return;
        }

        this.user = session.user;
        this.initializeElements();
        this.setupEventListeners();
        await this.loadUserData();
    }

    initializeElements() {
        // Forms
        this.personalInfoForm = document.getElementById('personalInfoForm');
        this.medicalHistoryForm = document.getElementById('medicalHistoryForm');
        this.preferencesForm = document.getElementById('preferencesForm');
        this.securityForm = document.getElementById('securityForm');
        this.notificationsForm = document.getElementById('notificationsForm');
        this.photoUploadForm = document.getElementById('photoUploadForm');

        // Modals
        this.photoUploadModal = document.getElementById('photoUploadModal');

        // Navigation
        this.settingsMenu = document.querySelector('.settings-menu');
        
        // Profile elements
        this.profileImage = document.getElementById('profileImage');
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');
    }

    setupEventListeners() {
        // Navigation
        this.settingsMenu.addEventListener('click', (e) => this.handleNavigation(e));
        
        // Forms submission
        this.personalInfoForm.addEventListener('submit', (e) => this.handlePersonalInfoSubmit(e));
        this.medicalHistoryForm.addEventListener('submit', (e) => this.handleMedicalHistorySubmit(e));
        this.preferencesForm.addEventListener('submit', (e) => this.handlePreferencesSubmit(e));
        this.securityForm.addEventListener('submit', (e) => this.handleSecuritySubmit(e));
        this.notificationsForm.addEventListener('submit', (e) => this.handleNotificationsSubmit(e));
        
        // Photo upload
        document.getElementById('changePhotoBtn').addEventListener('click', () => {
            this.photoUploadModal.classList.add('active');
        });
        
        document.getElementById('cancelPhotoUpload').addEventListener('click', () => {
            this.photoUploadModal.classList.remove('active');
        });

        // Back to dashboard
        document.getElementById('backToDashboard').addEventListener('click', () => {
            const dashboardPath = this.user.role === 'doctor' 
                ? '/pages/doctor-dashboard.html' 
                : '/pages/patient-dashboard.html';
            window.location.href = dashboardPath;
        });

        // File upload handling
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                this.handlePhotoUpload(files[0]);
            }
        });

        document.getElementById('photoInput').addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handlePhotoUpload(e.target.files[0]);
            }
        });
    }

    async loadUserData() {
        try {
            const userData = await apiService.getUserProfile();
            this.populateUserData(userData);
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Failed to load user data');
        }
    }

    populateUserData(userData) {
        // Update profile header
        this.profileImage.src = userData.profileImage || '../assets/images/avatar-placeholder.png';
        this.userName.textContent = `${userData.firstName} ${userData.lastName}`;
        this.userEmail.textContent = userData.email;

        // Populate personal information form
        const personalForm = this.personalInfoForm;
        personalForm.firstName.value = userData.firstName;
        personalForm.lastName.value = userData.lastName;
        personalForm.email.value = userData.email;
        personalForm.phone.value = userData.phone;
        personalForm.dateOfBirth.value = userData.dateOfBirth;
        personalForm.gender.value = userData.gender;
        personalForm.address.value = userData.address;

        // Populate medical history
        const medicalForm = this.medicalHistoryForm;
        medicalForm.allergies.value = userData.medicalHistory?.allergies || '';
        medicalForm.medications.value = userData.medicalHistory?.medications || '';
        medicalForm.conditions.value = userData.medicalHistory?.conditions || '';
        medicalForm.surgeries.value = userData.medicalHistory?.surgeries || '';
        medicalForm.familyHistory.value = userData.medicalHistory?.familyHistory || '';

        // Populate preferences
        const preferencesForm = this.preferencesForm;
        preferencesForm.language.value = userData.preferences?.language || 'en';
        preferencesForm.preferredContact.value = userData.preferences?.preferredContact || 'email';

        // Populate notification settings
        this.populateNotificationSettings(userData.notifications);
    }

    handleNavigation(event) {
        event.preventDefault();
        const link = event.target.closest('.menu-item');
        if (!link) return;

        // Update active section
        document.querySelector('.menu-item.active')?.classList.remove('active');
        link.classList.add('active');

        // Show corresponding section
        const sectionId = link.getAttribute('href').substring(1);
        document.querySelector('.settings-section.active')?.classList.remove('active');
        document.getElementById(sectionId).classList.add('active');
    }

    async handlePersonalInfoSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
            await apiService.updateUserProfile(Object.fromEntries(formData));
            this.showSuccess('Personal information updated successfully');
        } catch (error) {
            this.showError('Failed to update personal information');
        }
    }

    async handleMedicalHistorySubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
            await apiService.updateMedicalHistory(Object.fromEntries(formData));
            this.showSuccess('Medical history updated successfully');
        } catch (error) {
            this.showError('Failed to update medical history');
        }
    }

    async handlePreferencesSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
            await apiService.updatePreferences(Object.fromEntries(formData));
            this.showSuccess('Preferences updated successfully');
        } catch (error) {
            this.showError('Failed to update preferences');
        }
    }

    async handleSecuritySubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        if (data.newPassword !== data.confirmNewPassword) {
            this.showError('New passwords do not match');
            return;
        }

        try {
            await apiService.updatePassword(data);
            this.showSuccess('Security settings updated successfully');
            event.target.reset();
        } catch (error) {
            this.showError('Failed to update security settings');
        }
    }

    async handleNotificationsSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
            await apiService.updateNotificationSettings(Object.fromEntries(formData));
            this.showSuccess('Notification settings updated successfully');
        } catch (error) {
            this.showError('Failed to update notification settings');
        }
    }

    async handlePhotoUpload(file) {
        if (!file.type.startsWith('image/')) {
            this.showError('Please upload an image file');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('photo', file);
            const response = await apiService.uploadProfilePhoto(formData);
            
            this.profileImage.src = response.photoUrl;
            this.photoUploadModal.classList.remove('active');
            this.showSuccess('Profile photo updated successfully');
        } catch (error) {
            this.showError('Failed to upload profile photo');
        }
    }

    showSuccess(message) {
        // Implement success notification
        console.log('Success:', message);
    }

    showError(message) {
        // Implement error notification
        console.error('Error:', message);
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfileSettings();
}); 