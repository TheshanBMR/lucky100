// Utility functions for Mahajana Sampatha app

// Theme Manager
class ThemeManager {
    constructor() {
        this.currentTheme = this.getSystemTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
    }

    getSystemTheme() {
        if (localStorage.getItem('ms_theme')) {
            return localStorage.getItem('ms_theme');
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('ms_theme', theme);
        this.updateThemeIcon();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    updateThemeIcon() {
        const themeIcon = document.getElementById('themeIcon');
        const themeIconPath = document.getElementById('themeIconPath');
        
        if (!themeIcon || !themeIconPath) return;

        if (this.currentTheme === 'dark') {
            themeIconPath.setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
        } else {
            themeIconPath.setAttribute('d', 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z');
        }
    }

    setupEventListeners() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('ms_theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

// Encryption utilities (simplified for demo)
class EncryptionUtils {
    static async generateKey() {
        // In a real implementation, this would use Web Crypto API
        return btoa(Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
    }

    static async encrypt(data, key) {
        // Simplified encryption for demo purposes
        // In production, use Web Crypto API with AES-GCM
        const dataStr = JSON.stringify(data);
        let result = '';
        for (let i = 0; i < dataStr.length; i++) {
            result += String.fromCharCode(dataStr.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result);
    }

    static async decrypt(encryptedData, key) {
        // Simplified decryption for demo purposes
        try {
            const decoded = atob(encryptedData);
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return JSON.parse(result);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    static async deriveKeyFromPassword(password, salt) {
        // In a real implementation, this would use PBKDF2
        return password + salt;
    }
}

// Date/Time utilities
class DateTimeUtils {
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    static formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    static formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return this.formatDate(dateString);
    }
}

// Validation utilities
class ValidationUtils {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateBetNumber(number, min, max) {
        const num = parseInt(number);
        return !isNaN(num) && num >= min && num <= max;
    }

    static validateBetAmount(amount, min, max) {
        const num = parseFloat(amount);
        return !isNaN(num) && num >= min && num <= max;
    }

    static validateName(name) {
        return name && name.trim().length >= 2 && name.trim().length <= 50;
    }
}

// Export utilities for global access
window.themeManager = new ThemeManager();
window.EncryptionUtils = EncryptionUtils;
window.DateTimeUtils = DateTimeUtils;
window.ValidationUtils = ValidationUtils;
