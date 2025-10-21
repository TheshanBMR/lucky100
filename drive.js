// Google Drive API integration for Mahajana Sampatha app

class GoogleDriveManager {
    constructor() {
        this.CLIENT_ID = '154587099449-bbnbg6f7d0itip10odbe5kf2v23cjita.apps.googleusercontent.com'; // Replace with your actual Client ID
        this.API_KEY = 'AIzaSyBaHo1TUIOR5j9LtiplKCkiZfK-0Ha3_PY'; // Replace with your actual API Key
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
        this.isSignedIn = false;
        this.gapiLoaded = false;
        
        this.init();
    }

    async init() {
        await this.loadGAPI();
        this.setupAuthListeners();
    }

    loadGAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                this.gapiLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                gapi.load('client:auth2', () => {
                    this.gapiLoaded = true;
                    resolve();
                });
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async initClient() {
        if (!this.gapiLoaded) {
            throw new Error('Google API not loaded');
        }

        try {
            await gapi.client.init({
                apiKey: this.API_KEY,
                clientId: this.CLIENT_ID,
                discoveryDocs: this.discoveryDocs,
                scope: this.SCOPES
            });

            // Listen for sign-in state changes
            gapi.auth2.getAuthInstance().isSignedIn.listen((isSignedIn) => {
                this.handleAuthChange(isSignedIn);
            });

            // Handle initial sign-in state
            this.handleAuthChange(gapi.auth2.getAuthInstance().isSignedIn.get());
            
            return true;
        } catch (error) {
            console.error('Error initializing Google client:', error);
            return false;
        }
    }

    setupAuthListeners() {
        // Handle OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code') || urlParams.has('error')) {
            this.handleOAuthCallback();
        }
    }

    handleAuthChange(isSignedIn) {
        this.isSignedIn = isSignedIn;
        if (isSignedIn) {
            const user = gapi.auth2.getAuthInstance().currentUser.get();
            this.handleSuccessfulAuth(user);
        } else {
            this.handleSignOut();
        }
    }

    async handleSuccessfulAuth(user) {
        const profile = user.getBasicProfile();
        const userInfo = {
            id: profile.getId(),
            name: profile.getName(),
            givenName: profile.getGivenName(),
            familyName: profile.getFamilyName(),
            email: profile.getEmail(),
            imageUrl: profile.getImageUrl()
        };

        // Store user info
        localStorage.setItem('ms_driveUser', JSON.stringify(userInfo));
        
        // Check for existing data file
        await this.checkForExistingData();
        
        // Update app state
        if (window.app) {
            window.app.currentUser = {
                id: userInfo.id,
                firstName: userInfo.givenName,
                lastName: userInfo.familyName,
                email: userInfo.email,
                isAdmin: true,
                isGuest: false
            };
            window.app.isDriveConnected = true;
            window.app.saveToStorage();
            window.app.updateUI();
            window.app.showApp();
            window.app.showToast('Google Drive connected successfully', 'success');
        }
    }

    handleSignOut() {
        localStorage.removeItem('ms_driveUser');
        if (window.app) {
            window.app.isDriveConnected = false;
            window.app.updateUI();
        }
    }

    async handleOAuthCallback() {
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
            await this.initClient();
        } catch (error) {
            console.error('OAuth callback error:', error);
            if (window.app) {
                window.app.showToast('Failed to connect to Google Drive', 'error');
            }
        }
    }

    async signIn() {
        if (!this.gapiLoaded) {
            await this.loadGAPI();
        }

        if (!gapi.auth2) {
            const initialized = await this.initClient();
            if (!initialized) {
                throw new Error('Failed to initialize Google client');
            }
        }

        try {
            await gapi.auth2.getAuthInstance().signIn();
            return true;
        } catch (error) {
            console.error('Sign-in error:', error);
            throw error;
        }
    }

    async signOut() {
        if (gapi.auth2) {
            await gapi.auth2.getAuthInstance().signOut();
        }
        this.handleSignOut();
    }

    async checkForExistingData() {
        try {
            const response = await gapi.client.drive.files.list({
                q: "name='mahajana_sampatha_data.enc' and trashed=false",
                spaces: 'drive',
                fields: 'files(id, name, modifiedTime)'
            });

            const files = response.result.files;
            if (files.length > 0) {
                // Found existing data file
                const file = files[0];
                await this.downloadAndDecryptData(file.id);
                return true;
            }
            
            // No existing file found, create new one
            await this.createNewDataFile();
            return false;
        } catch (error) {
            console.error('Error checking for existing data:', error);
            return false;
        }
    }

    async downloadAndDecryptData(fileId) {
        try {
            // Get file metadata
            const fileResponse = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            const encryptedData = fileResponse.body;
            
            // Get encryption key from local storage
            const encryptionKey = localStorage.getItem('ms_encryptionKey');
            if (!encryptionKey) {
                throw new Error('No encryption key found');
            }

            // Decrypt data
            const decryptedData = await EncryptionUtils.decrypt(encryptedData, encryptionKey);
            
            // Update app data
            if (window.app && decryptedData) {
                window.app.users = decryptedData.users || [];
                window.app.history = decryptedData.history || [];
                window.app.settings = decryptedData.settings || window.app.settings;
                window.app.saveToStorage();
                window.app.updateUsersTable();
                window.app.updateHistoryDisplay();
                window.app.showToast('Data imported from Google Drive', 'success');
            }
        } catch (error) {
            console.error('Error downloading and decrypting data:', error);
            throw error;
        }
    }

    async createNewDataFile() {
        try {
            // Generate encryption key if not exists
            let encryptionKey = localStorage.getItem('ms_encryptionKey');
            if (!encryptionKey) {
                encryptionKey = await EncryptionUtils.generateKey();
                localStorage.setItem('ms_encryptionKey', encryptionKey);
            }

            // Create initial data structure
            const initialData = {
                users: [],
                history: [],
                settings: {
                    minBetNumber: 1,
                    maxBetNumber: 100,
                    minBetAmount: 10,
                    maxBetAmount: 1000,
                    winningPrize: 5000
                },
                createdAt: new Date().toISOString()
            };

            // Encrypt data
            const encryptedData = await EncryptionUtils.encrypt(initialData, encryptionKey);

            // Create file on Drive
            const fileMetadata = {
                name: 'mahajana_sampatha_data.enc',
                mimeType: 'text/plain'
            };

            const media = {
                mimeType: 'text/plain',
                body: encryptedData
            };

            await gapi.client.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
            });

            return true;
        } catch (error) {
            console.error('Error creating new data file:', error);
            throw error;
        }
    }

    async uploadData() {
        if (!this.isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }

        try {
            // Get current app data
            const appData = {
                users: window.app ? window.app.users : [],
                history: window.app ? window.app.history : [],
                settings: window.app ? window.app.settings : {},
                currentDraw: window.app ? window.app.currentDraw : null,
                lastSync: new Date().toISOString()
            };

            // Get encryption key
            const encryptionKey = localStorage.getItem('ms_encryptionKey');
            if (!encryptionKey) {
                throw new Error('No encryption key found');
            }

            // Encrypt data
            const encryptedData = await EncryptionUtils.encrypt(appData, encryptionKey);

            // Find existing file
            const response = await gapi.client.drive.files.list({
                q: "name='mahajana_sampatha_data.enc' and trashed=false",
                spaces: 'drive',
                fields: 'files(id, name)'
            });

            const files = response.result.files;
            
            if (files.length > 0) {
                // Update existing file
                const fileId = files[0].id;
                
                const media = {
                    mimeType: 'text/plain',
                    body: encryptedData
                };

                await gapi.client.drive.files.update({
                    fileId: fileId,
                    media: media
                });
            } else {
                // Create new file
                await this.createNewDataFile();
            }

            // Update last sync time
            localStorage.setItem('ms_lastSync', new Date().toISOString());
            
            return true;
        } catch (error) {
            console.error('Error uploading data to Drive:', error);
            throw error;
        }
    }

    async syncData() {
        if (!this.isSignedIn) {
            return false;
        }

        try {
            await this.uploadData();
            if (window.app) {
                window.app.updateUI();
                window.app.showToast('Data synced with Google Drive', 'success');
            }
            return true;
        } catch (error) {
            console.error('Sync error:', error);
            if (window.app) {
                window.app.showToast('Failed to sync with Google Drive', 'error');
            }
            return false;
        }
    }

    // Public methods
    async connect() {
        try {
            await this.signIn();
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.signOut();
            return true;
        } catch (error) {
            console.error('Disconnection error:', error);
            throw error;
        }
    }

    async isConnected() {
        return this.isSignedIn;
    }
}

// Initialize Google Drive Manager
window.driveManager = new GoogleDriveManager();

// Export for global access
window.GoogleDriveManager = GoogleDriveManager;