import apiService from './api.js';
import authService from './auth.js';

class AppointmentScheduling {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.selectedTimeSlot = null;
        this.selectedDoctor = null;
        this.doctors = [];
        this.init();
    }

    async init() {
        // Check authentication
        const session = authService.getSession();
        if (!session) {
            window.location.href = '/pages/login.html';
            return;
        }

        this.initializeElements();
        this.setupEventListeners();
        await this.loadDoctors();
        this.renderCalendar();
    }

    initializeElements() {
        // Calendar elements
        this.calendarGrid = document.getElementById('calendarGrid');
        this.currentMonthElement = document.getElementById('currentMonth');
        this.timeSlotsGrid = document.getElementById('timeSlotsGrid');
        
        // Doctor selection elements
        this.doctorsList = document.getElementById('doctorsList');
        this.doctorSearch = document.getElementById('doctorSearch');

        // Summary elements
        this.summaryDoctor = document.getElementById('summaryDoctor');
        this.summaryDate = document.getElementById('summaryDate');
        this.summaryTime = document.getElementById('summaryTime');
        this.summaryType = document.getElementById('summaryType');
        this.confirmBookingBtn = document.getElementById('confirmBooking');

        // Modal
        this.confirmationModal = document.getElementById('confirmationModal');
    }

    setupEventListeners() {
        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // View toggle
        document.querySelector('.view-toggle').addEventListener('click', (e) => {
            if (e.target.matches('button')) {
                this.changeView(e.target.dataset.view);
            }
        });

        // Doctor search
        this.doctorSearch.addEventListener('input', (e) => this.filterDoctors(e.target.value));

        // Appointment type selection
        document.querySelectorAll('input[name="appointmentType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.summaryType.textContent = e.target.value.charAt(0).toUpperCase() + 
                                             e.target.value.slice(1);
                this.updateConfirmButton();
            });
        });

        // Booking actions
        document.getElementById('confirmBooking').addEventListener('click', () => this.confirmAppointment());
        document.getElementById('cancelBooking').addEventListener('click', () => this.cancelBooking());

        // Modal actions
        document.getElementById('viewAppointments').addEventListener('click', () => {
            window.location.href = '/pages/appointments.html';
        });
        document.getElementById('scheduleAnother').addEventListener('click', () => {
            this.resetForm();
            this.confirmationModal.classList.remove('active');
        });
    }

    async loadDoctors() {
        try {
            this.doctors = await apiService.getDoctors();
            this.renderDoctorsList(this.doctors);
        } catch (error) {
            console.error('Error loading doctors:', error);
            this.showError('Failed to load doctors list');
        }
    }

    renderDoctorsList(doctors) {
        this.doctorsList.innerHTML = doctors.map(doctor => `
            <div class="doctor-card" data-id="${doctor.id}">
                <img src="${doctor.avatar}" alt="Dr. ${doctor.name}" class="doctor-avatar">
                <div class="doctor-info">
                    <h4>Dr. ${doctor.name}</h4>
                    <p>${doctor.specialization}</p>
                    <div class="doctor-stats">
                        <span><i class="fas fa-star"></i> ${doctor.rating}</span>
                        <span><i class="fas fa-user-clock"></i> ${doctor.experience} years</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click event listeners
        this.doctorsList.querySelectorAll('.doctor-card').forEach(card => {
            card.addEventListener('click', () => this.selectDoctor(card.dataset.id));
        });
    }

    filterDoctors(searchTerm) {
        const filtered = this.doctors.filter(doctor => 
            doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderDoctorsList(filtered);
    }

    async selectDoctor(doctorId) {
        this.selectedDoctor = this.doctors.find(d => d.id === doctorId);
        this.doctorsList.querySelectorAll('.doctor-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.id === doctorId);
        });
        this.summaryDoctor.textContent = `Dr. ${this.selectedDoctor.name}`;
        this.updateConfirmButton();
        await this.loadAvailableSlots();
    }

    renderCalendar() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        this.currentMonthElement.textContent = this.currentDate.toLocaleString('default', { 
            month: 'long', 
            year: 'numeric' 
        });

        // Create calendar grid
        const daysInMonth = lastDay.getDate();
        const firstDayIndex = firstDay.getDay();
        
        let calendarHTML = `
            <div class="calendar-header-row">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                    .map(day => `<div class="calendar-header-cell">${day}</div>`).join('')}
            </div>
        `;

        let dayCount = 1;
        const today = new Date();

        for (let i = 0; i < 6; i++) {
            let row = '<div class="calendar-row">';
            
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDayIndex) {
                    row += '<div class="calendar-cell empty"></div>';
                } else if (dayCount > daysInMonth) {
                    row += '<div class="calendar-cell empty"></div>';
                } else {
                    const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), dayCount);
                    const isToday = date.toDateString() === today.toDateString();
                    const isPast = date < today;
                    const isSelected = this.selectedDate && date.toDateString() === this.selectedDate.toDateString();
                    
                    row += `
                        <div class="calendar-cell ${isToday ? 'today' : ''} 
                                                 ${isPast ? 'past' : ''} 
                                                 ${isSelected ? 'selected' : ''}"
                             data-date="${date.toISOString()}"
                             ${isPast ? 'disabled' : ''}>
                            ${dayCount}
                        </div>
                    `;
                    dayCount++;
                }
            }
            
            row += '</div>';
            calendarHTML += row;

            if (dayCount > daysInMonth) break;
        }

        this.calendarGrid.innerHTML = calendarHTML;

        // Add click events to calendar cells
        this.calendarGrid.querySelectorAll('.calendar-cell:not(.empty):not(.past)').forEach(cell => {
            cell.addEventListener('click', () => this.selectDate(new Date(cell.dataset.date)));
        });
    }

    async loadAvailableSlots() {
        if (!this.selectedDoctor || !this.selectedDate) return;

        try {
            const slots = await apiService.getAvailableSlots(
                this.selectedDoctor.id,
                this.selectedDate.toISOString()
            );
            this.renderTimeSlots(slots);
        } catch (error) {
            console.error('Error loading time slots:', error);
            this.showError('Failed to load available time slots');
        }
    }

    renderTimeSlots(slots) {
        if (!slots.length) {
            this.timeSlotsGrid.innerHTML = `
                <div class="no-slots">
                    <i class="fas fa-calendar-times"></i>
                    <p>No available slots for this date</p>
                </div>
            `;
            return;
        }

        this.timeSlotsGrid.innerHTML = slots.map(slot => `
            <button class="time-slot" data-time="${slot.time}">
                ${this.formatTime(slot.time)}
            </button>
        `).join('');

        // Add click events to time slots
        this.timeSlotsGrid.querySelectorAll('.time-slot').forEach(slot => {
            slot.addEventListener('click', () => this.selectTimeSlot(slot.dataset.time));
        });
    }

    selectDate(date) {
        this.selectedDate = date;
        this.summaryDate.textContent = date.toLocaleDateString('default', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        this.renderCalendar();
        this.loadAvailableSlots();
        this.updateConfirmButton();
    }

    selectTimeSlot(time) {
        this.selectedTimeSlot = time;
        this.timeSlotsGrid.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.toggle('selected', slot.dataset.time === time);
        });
        this.summaryTime.textContent = this.formatTime(time);
        this.updateConfirmButton();
    }

    async confirmAppointment() {
        if (!this.validateAppointment()) return;

        try {
            const appointmentData = {
                doctorId: this.selectedDoctor.id,
                date: this.selectedDate.toISOString(),
                time: this.selectedTimeSlot,
                type: document.querySelector('input[name="appointmentType"]:checked').value,
                notes: document.getElementById('appointmentNotes').value
            };

            const response = await apiService.createAppointment(appointmentData);
            this.showConfirmation(response);
        } catch (error) {
            console.error('Error booking appointment:', error);
            this.showError('Failed to book appointment');
        }
    }

    showConfirmation(appointment) {
        const details = this.confirmationModal.querySelector('.confirmation-details');
        details.innerHTML = `
            <div class="confirmation-item">
                <i class="fas fa-user-md"></i>
                <span>Dr. ${this.selectedDoctor.name}</span>
            </div>
            <div class="confirmation-item">
                <i class="fas fa-calendar"></i>
                <span>${this.selectedDate.toLocaleDateString()}</span>
            </div>
            <div class="confirmation-item">
                <i class="fas fa-clock"></i>
                <span>${this.formatTime(this.selectedTimeSlot)}</span>
            </div>
        `;
        this.confirmationModal.classList.add('active');
    }

    // Utility methods
    changeMonth(delta) {
        this.currentDate = new Date(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth() + delta,
            1
        );
        this.renderCalendar();
    }

    changeView(view) {
        document.querySelectorAll('.view-toggle button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        // Implement different calendar views
    }

    formatTime(time) {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('default', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    validateAppointment() {
        return this.selectedDoctor && 
               this.selectedDate && 
               this.selectedTimeSlot;
    }

    updateConfirmButton() {
        this.confirmBookingBtn.disabled = !this.validateAppointment();
    }

    resetForm() {
        this.selectedDoctor = null;
        this.selectedDate = null;
        this.selectedTimeSlot = null;
        this.doctorsList.querySelectorAll('.doctor-card').forEach(card => {
            card.classList.remove('selected');
        });
        this.summaryDoctor.textContent = 'Not selected';
        this.summaryDate.textContent = 'Not selected';
        this.summaryTime.textContent = 'Not selected';
        document.getElementById('appointmentNotes').value = '';
        this.updateConfirmButton();
    }

    showError(message) {
        // Implement error notification
        console.error(message);
    }
}

// Initialize scheduling when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AppointmentScheduling();
}); 