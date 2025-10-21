# Mahajana Sampatha Web App

A fully functional betting web application with Google Drive synchronization and client-side encryption.

## Features

- 🎯 User management with betting functionality
- 🔐 Google Drive integration for data sync
- 🛡️ Client-side encryption for data security
- 🌗 Dark/Light theme support
- 📱 Responsive design
- 💾 Local storage with backup/export
- 👥 Admin panel for draw management
- 📊 History tracking

## Setup Instructions

### 1. Google Drive API Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in required app information
   - Add scopes: `.../auth/drive.file`
   - Add your domain to authorized domains
5. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost` (for local development)
     - Your production domain
   - Add authorized redirect URIs:
     - `http://localhost` (for local development)
     - Your production domain

### 2. Application Configuration

1. Open `drive.js`
2. Replace the following placeholders with your actual values:
   ```javascript
   this.CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
   this.API_KEY = 'YOUR_GOOGLE_API_KEY';