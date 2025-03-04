import apiService from './api.js';

class MessagingSystem {
    constructor() {
        this.currentConversation = null;
        this.conversations = [];
        this.messagePollingInterval = null;
        this.typingTimeout = null;
        this.lastMessageId = null;
        
        this.init();
    }

    async init() {
        this.initializeElements();
        this.setupEventListeners();
        await this.loadConversations();
        this.startMessagePolling();
    }

    initializeElements() {
        // Main containers
        this.conversationsList = document.querySelector('.conversations-list');
        this.chatMessages = document.getElementById('chatMessages');
        this.activeChat = document.getElementById('activeChat');
        this.emptyState = document.getElementById('emptyState');
        
        // Forms and inputs
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.searchInput = document.querySelector('.search-messages input');
        
        // Modals
        this.fileUploadModal = document.getElementById('fileUploadModal');
        this.fileInput = document.getElementById('fileInput');
    }

    setupEventListeners() {
        // Message form submission
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Message input auto-resize
        this.messageInput.addEventListener('input', () => {
            this.handleTyping();
            this.autoResizeTextarea();
        });

        // File attachment
        document.querySelector('.attach-btn').addEventListener('click', () => {
            this.fileUploadModal.classList.remove('hidden');
        });

        document.getElementById('cancelUpload').addEventListener('click', () => {
            this.fileUploadModal.classList.add('hidden');
        });

        document.getElementById('fileUploadForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFileUpload();
        });
    }

    async loadConversations() {
        try {
            const conversations = await apiService.getMessages();
            this.conversations = conversations;
            this.renderConversations();
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showError('Failed to load conversations');
        }
    }

    renderConversations() {
        this.conversationsList.innerHTML = this.conversations
            .map(conv => this.createConversationElement(conv))
            .join('');

        // Add click listeners to conversation items
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openConversation(item.dataset.conversationId);
            });
        });
    }

    createConversationElement(conversation) {
        const lastMessage = conversation.lastMessage || {};
        const unreadClass = conversation.unreadCount ? 'unread' : '';
        
        return `
            <div class="conversation-item ${unreadClass}" data-conversation-id="${conversation.id}">
                <img src="${conversation.avatar}" alt="${conversation.name}" class="user-avatar">
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h4>${conversation.name}</h4>
                        <span class="time">${this.formatTime(lastMessage.timestamp)}</span>
                    </div>
                    <p class="last-message">${lastMessage.content || 'No messages yet'}</p>
                    ${conversation.unreadCount ? 
                        `<span class="unread-badge">${conversation.unreadCount}</span>` : 
                        ''}
                </div>
            </div>
        `;
    }

    async openConversation(conversationId) {
        try {
            // Update UI
            this.currentConversation = conversationId;
            this.emptyState.classList.add('hidden');
            this.activeChat.classList.remove('hidden');

            // Load conversation details
            const conversation = this.conversations.find(c => c.id === conversationId);
            this.updateChatHeader(conversation);

            // Load messages
            const messages = await apiService.getMessages(conversationId);
            this.renderMessages(messages);

            // Mark as read
            if (conversation.unreadCount) {
                await apiService.markMessageAsRead(conversationId);
                this.updateConversationUnreadStatus(conversationId);
            }
        } catch (error) {
            console.error('Error opening conversation:', error);
            this.showError('Failed to load conversation');
        }
    }

    renderMessages(messages) {
        this.chatMessages.innerHTML = messages
            .map(msg => this.createMessageElement(msg))
            .join('');

        this.scrollToBottom();
        this.lastMessageId = messages[messages.length - 1]?.id;
    }

    createMessageElement(message) {
        const isOwn = message.senderId === apiService.getCurrentUserId();
        const messageClass = isOwn ? 'message-own' : 'message-other';

        return `
            <div class="message ${messageClass}">
                ${!isOwn ? `<img src="${message.senderAvatar}" alt="" class="message-avatar">` : ''}
                <div class="message-content">
                    ${message.file ? this.createFileAttachment(message.file) : ''}
                    <p>${message.content}</p>
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                </div>
            </div>
        `;
    }

    createFileAttachment(file) {
        const isImage = file.type.startsWith('image/');
        
        return isImage ? 
            `<img src="${file.url}" alt="Attached Image" class="message-attachment">` :
            `<div class="file-attachment">
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
            </div>`;
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content && !this.fileInput.files.length) return;

        try {
            let fileUrl = null;
            if (this.fileInput.files.length) {
                fileUrl = await this.uploadFile(this.fileInput.files[0]);
            }

            const message = {
                conversationId: this.currentConversation,
                content,
                fileUrl
            };

            await apiService.sendMessage(message);
            this.messageInput.value = '';
            this.fileInput.value = '';
            this.fileUploadModal.classList.add('hidden');
            this.autoResizeTextarea();

            // Optimistically add message to UI
            this.appendMessage({
                ...message,
                senderId: apiService.getCurrentUserId(),
                timestamp: new Date(),
                status: 'sent'
            });

        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    async handleFileUpload() {
        const file = this.fileInput.files[0];
        if (!file) return;

        try {
            const fileUrl = await this.uploadFile(file);
            this.fileUploadModal.classList.add('hidden');
            
            // If it's an image, append it to the message input
            if (file.type.startsWith('image/')) {
                this.messageInput.value += `[Image: ${file.name}]`;
            } else {
                this.messageInput.value += `[File: ${file.name}]`;
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            this.showError('Failed to upload file');
        }
    }

    async uploadFile(file) {
        try {
            const response = await apiService.uploadFile(file);
            return response.fileUrl;
        } catch (error) {
            throw new Error('File upload failed');
        }
    }

    startMessagePolling() {
        this.messagePollingInterval = setInterval(async () => {
            if (this.currentConversation) {
                await this.checkNewMessages();
            }
        }, 5000); // Poll every 5 seconds
    }

    async checkNewMessages() {
        try {
            const messages = await apiService.getMessages(this.currentConversation, {
                after: this.lastMessageId
            });

            if (messages.length) {
                messages.forEach(message => this.appendMessage(message));
                this.lastMessageId = messages[messages.length - 1].id;
            }
        } catch (error) {
            console.error('Error checking new messages:', error);
        }
    }

    // Utility Methods
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        return date.toLocaleDateString();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }

    handleTyping() {
        clearTimeout(this.typingTimeout);
        // Implement typing indicator logic here
    }

    showError(message) {
        // Implement error notification logic
        console.error(message);
    }
}

// Initialize messaging system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MessagingSystem();
}); 