import apiService from './api.js';

class ReportsManager {
    constructor() {
        this.reports = [];
        this.currentReport = null;
        this.init();
    }

    async init() {
        this.initializeElements();
        this.setupEventListeners();
        await this.loadReports();
    }

    initializeElements() {
        // Main containers
        this.reportsList = document.getElementById('reportsList');
        this.activeReport = document.getElementById('activeReport');
        this.emptyState = document.getElementById('emptyState');
        this.reportContent = document.getElementById('reportContent');

        // Modals
        this.uploadModal = document.getElementById('uploadModal');
        this.shareModal = document.getElementById('shareModal');

        // Forms
        this.uploadForm = document.getElementById('uploadForm');
        this.shareForm = document.getElementById('shareForm');
        this.searchInput = document.getElementById('searchReports');
        this.filterSelect = document.getElementById('filterReports');

        // Buttons
        this.uploadButton = document.getElementById('uploadReportBtn');
        this.downloadButton = document.getElementById('downloadReport');
        this.shareButton = document.getElementById('shareReport');
    }

    setupEventListeners() {
        // Upload functionality
        this.uploadButton.addEventListener('click', () => this.showUploadModal());
        this.uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        document.getElementById('closeUploadModal').addEventListener('click', 
            () => this.uploadModal.classList.add('hidden'));

        // Share functionality
        this.shareButton.addEventListener('click', () => this.showShareModal());
        this.shareForm.addEventListener('submit', (e) => this.handleShare(e));
        document.getElementById('closeShareModal').addEventListener('click', 
            () => this.shareModal.classList.add('hidden'));

        // Download functionality
        this.downloadButton.addEventListener('click', () => this.handleDownload());

        // Search and filter
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.filterSelect.addEventListener('change', (e) => this.handleFilter(e.target.value));

        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length) {
                this.handleFiles(files);
            }
        });

        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFiles(e.target.files);
            }
        });
    }

    async loadReports() {
        try {
            const reports = await apiService.getPatientReports();
            this.reports = reports;
            this.renderReportsList();
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showError('Failed to load reports');
        }
    }

    renderReportsList() {
        this.reportsList.innerHTML = this.reports
            .map(report => this.createReportListItem(report))
            .join('');

        // Add click listeners to report items
        document.querySelectorAll('.report-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openReport(item.dataset.reportId);
            });
        });
    }

    createReportListItem(report) {
        return `
            <div class="report-item" data-report-id="${report.id}">
                <i class="fas ${this.getReportIcon(report.type)}"></i>
                <div class="report-item-info">
                    <h4>${report.title}</h4>
                    <span class="report-date">${this.formatDate(report.date)}</span>
                </div>
                <span class="report-type">${report.type}</span>
            </div>
        `;
    }

    async openReport(reportId) {
        try {
            const report = await apiService.getReportDetails(reportId);
            this.currentReport = report;
            this.displayReport(report);
        } catch (error) {
            console.error('Error opening report:', error);
            this.showError('Failed to load report details');
        }
    }

    displayReport(report) {
        this.emptyState.classList.add('hidden');
        this.activeReport.classList.remove('hidden');

        // Update report header
        document.getElementById('reportTitle').textContent = report.title;
        document.getElementById('reportDate').textContent = this.formatDate(report.date);
        document.getElementById('reportType').textContent = report.type;

        // Display report content based on file type
        this.renderReportContent(report);
    }

    renderReportContent(report) {
        const content = document.getElementById('reportContent');
        
        if (report.fileType.startsWith('image/')) {
            content.innerHTML = `<img src="${report.fileUrl}" alt="${report.title}">`;
        } else if (report.fileType === 'application/pdf') {
            content.innerHTML = `
                <iframe src="${report.fileUrl}" type="application/pdf" width="100%" height="100%">
                    <p>Your browser doesn't support PDF viewing. 
                    <a href="${report.fileUrl}" target="_blank">Download PDF</a></p>
                </iframe>
            `;
        } else {
            content.innerHTML = `
                <div class="file-preview">
                    <i class="fas ${this.getReportIcon(report.type)}"></i>
                    <p>This file type cannot be previewed</p>
                    <button class="btn btn-primary" onclick="window.open('${report.fileUrl}')">
                        Open File
                    </button>
                </div>
            `;
        }
    }

    async handleUpload(event) {
        event.preventDefault();
        
        const formData = new FormData(this.uploadForm);
        const fileInput = document.getElementById('fileInput');
        
        if (!fileInput.files.length) {
            this.showError('Please select a file to upload');
            return;
        }

        try {
            const response = await apiService.uploadReport(formData);
            this.uploadModal.classList.add('hidden');
            this.uploadForm.reset();
            await this.loadReports(); // Refresh reports list
            this.showSuccess('Report uploaded successfully');
        } catch (error) {
            console.error('Error uploading report:', error);
            this.showError('Failed to upload report');
        }
    }

    async handleShare(event) {
        event.preventDefault();
        
        const recipientId = document.getElementById('recipient').value;
        const message = document.getElementById('shareMessage').value;

        try {
            await apiService.shareReport(this.currentReport.id, recipientId, message);
            this.shareModal.classList.add('hidden');
            this.shareForm.reset();
            this.showSuccess('Report shared successfully');
        } catch (error) {
            console.error('Error sharing report:', error);
            this.showError('Failed to share report');
        }
    }

    handleDownload() {
        if (!this.currentReport) return;

        const link = document.createElement('a');
        link.href = this.currentReport.fileUrl;
        link.download = this.currentReport.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    handleSearch(query) {
        const filteredReports = this.reports.filter(report => 
            report.title.toLowerCase().includes(query.toLowerCase()) ||
            report.type.toLowerCase().includes(query.toLowerCase())
        );
        this.renderFilteredReports(filteredReports);
    }

    handleFilter(type) {
        const filteredReports = type === 'all' 
            ? this.reports 
            : this.reports.filter(report => report.type === type);
        this.renderFilteredReports(filteredReports);
    }

    handleFiles(files) {
        const fileInput = document.getElementById('fileInput');
        fileInput.files = files;
        
        // Update upload area to show selected file
        const uploadArea = document.getElementById('uploadArea');
        const fileName = files[0].name;
        uploadArea.querySelector('.upload-prompt').innerHTML = `
            <i class="fas fa-file"></i>
            <p>${fileName}</p>
            <span class="file-size">${this.formatFileSize(files[0].size)}</span>
        `;
    }

    // Utility Methods
    getReportIcon(type) {
        const icons = {
            'lab': 'fa-flask',
            'imaging': 'fa-x-ray',
            'prescription': 'fa-prescription',
            'other': 'fa-file-medical'
        };
        return icons[type] || icons.other;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        // Implement error notification
        console.error(message);
    }

    showSuccess(message) {
        // Implement success notification
        console.log(message);
    }

    showUploadModal() {
        this.uploadModal.classList.remove('hidden');
    }

    showShareModal() {
        this.shareModal.classList.remove('hidden');
    }
}

// Initialize reports manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReportsManager();
}); 