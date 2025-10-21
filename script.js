// Main Application Controller
class MahajanaSampathaApp {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.history = [];
        this.settings = {
            minBetNumber: 1,
            maxBetNumber: 100,
            minBetAmount: 10,
            maxBetAmount: 1000,
            winningPrize: 5000
        };
        this.currentDraw = null;
        this.isDriveConnected = false;
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.setupRouting();
        this.updateUI();
        
        // Check if user is already logged in
        if (this.currentUser) {
            this.showApp();
        } else {
            this.showLogin();
        }
    }

    // Storage Management
    loadFromStorage() {
        try {
            const storedUser = localStorage.getItem('ms_currentUser');
            const storedUsers = localStorage.getItem('ms_users');
            const storedHistory = localStorage.getItem('ms_history');
            const storedSettings = localStorage.getItem('ms_settings');
            const storedDraw = localStorage.getItem('ms_currentDraw');

            if (storedUser) this.currentUser = JSON.parse(storedUser);
            if (storedUsers) this.users = JSON.parse(storedUsers);
            if (storedHistory) this.history = JSON.parse(storedHistory);
            if (storedSettings) this.settings = JSON.parse(storedSettings);
            if (storedDraw) this.currentDraw = JSON.parse(storedDraw);
            
            this.isDriveConnected = localStorage.getItem('ms_driveConnected') === 'true';
        } catch (error) {
            console.error('Error loading from storage:', error);
            this.showToast('Error loading data', 'error');
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('ms_currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('ms_users', JSON.stringify(this.users));
            localStorage.setItem('ms_history', JSON.stringify(this.history));
            localStorage.setItem('ms_settings', JSON.stringify(this.settings));
            localStorage.setItem('ms_currentDraw', JSON.stringify(this.currentDraw));
            localStorage.setItem('ms_driveConnected', this.isDriveConnected.toString());
            
            // Update data size display
            this.updateDataSize();
        } catch (error) {
            console.error('Error saving to storage:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    updateDataSize() {
        const data = {
            currentUser: this.currentUser,
            users: this.users,
            history: this.history,
            settings: this.settings,
            currentDraw: this.currentDraw
        };
        const dataSize = new Blob([JSON.stringify(data)]).size;
        const dataSizeKB = (dataSize / 1024).toFixed(2);
        document.getElementById('dataSize').textContent = `${dataSizeKB} KB`;
    }

    // User Management
    addUser(userData) {
        // Check for duplicate bet numbers
        if (this.users.some(user => user.betNumber === userData.betNumber)) {
            this.showToast('Bet number already exists', 'error');
            return false;
        }

        const user = {
            id: Date.now().toString(),
            firstName: userData.firstName,
            betNumber: parseInt(userData.betNumber),
            betAmount: parseFloat(userData.betAmount),
            createdAt: new Date().toISOString()
        };

        this.users.push(user);
        this.saveToStorage();
        this.updateUsersTable();
        this.showToast('User added successfully', 'success');
        return true;
    }

    updateUser(userId, userData) {
        const userIndex = this.users.findIndex(user => user.id === userId);
        if (userIndex === -1) return false;

        // Check for duplicate bet numbers (excluding current user)
        if (this.users.some(user => user.id !== userId && user.betNumber === userData.betNumber)) {
            this.showToast('Bet number already exists', 'error');
            return false;
        }

        this.users[userIndex] = {
            ...this.users[userIndex],
            firstName: userData.firstName,
            betNumber: parseInt(userData.betNumber),
            betAmount: parseFloat(userData.betAmount)
        };

        this.saveToStorage();
        this.updateUsersTable();
        this.showToast('User updated successfully', 'success');
        return true;
    }

    deleteUser(userId) {
        this.users = this.users.filter(user => user.id !== userId);
        this.saveToStorage();
        this.updateUsersTable();
        this.showToast('User deleted successfully', 'success');
    }

    // Draw Management
    publishDrawRange(settings) {
        this.settings = { ...this.settings, ...settings };
        this.saveToStorage();
        this.showToast('Draw range published successfully', 'success');
    }

    selectWinner() {
        if (this.users.length === 0) {
            this.showToast('No users to select winner from', 'error');
            return;
        }

        const winningNumber = Math.floor(Math.random() * (this.settings.maxBetNumber - this.settings.minBetNumber + 1)) + this.settings.minBetNumber;
        const winner = this.users.find(user => user.betNumber === winningNumber);

        this.currentDraw = {
            id: Date.now().toString(),
            winningNumber,
            winner: winner || null,
            prize: this.settings.winningPrize,
            totalUsers: this.users.length,
            users: [...this.users],
            createdAt: new Date().toISOString()
        };

        this.saveToStorage();
        this.updateWinnerDisplay();
        this.showToast(winner ? 'Winner selected!' : 'No winner for this number', winner ? 'success' : 'warning');
    }

    finishDraw() {
        if (!this.currentDraw) {
            this.showToast('No active draw to finish', 'error');
            return;
        }

        this.history.unshift(this.currentDraw);
        this.users = [];
        this.currentDraw = null;
        this.saveToStorage();
        
        this.updateUsersTable();
        this.updateHistoryDisplay();
        this.hideWinnerDisplay();
        this.showToast('Draw completed and moved to history', 'success');
        
        // Sync to Drive if connected
        if (this.isDriveConnected) {
            this.syncToDrive();
        }
    }

    // UI Updates
    updateUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        const emptyState = document.getElementById('emptyUsersState');
        
        if (this.users.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            document.getElementById('usersCount').textContent = '0';
            document.getElementById('fab').classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        document.getElementById('usersCount').textContent = this.users.length.toString();
        document.getElementById('fab').classList.remove('hidden');

        const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
        const sortBy = document.getElementById('sortUsers').value;
        
        let filteredUsers = this.users.filter(user => 
            user.firstName.toLowerCase().includes(searchTerm) ||
            user.betNumber.toString().includes(searchTerm)
        );

        // Sort users
        filteredUsers.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.firstName.localeCompare(b.firstName);
                case 'amount':
                    return b.betAmount - a.betAmount;
                case 'number':
                default:
                    return a.betNumber - b.betNumber;
            }
        });

        tbody.innerHTML = filteredUsers.map((user, index) => `
            <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-300">
                <td class="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">${index + 1}</td>
                <td class="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">${user.firstName}</td>
                <td class="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">${user.betNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">$${user.betAmount.toFixed(2)}</td>
                <td class="py-3 px-4 text-sm">
                    <div class="flex space-x-2">
                        <button onclick="app.editUser('${user.id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300">
                            Edit
                        </button>
                        <button onclick="app.deleteUser('${user.id}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-300">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateWinnerDisplay() {
        if (!this.currentDraw) return;

        const winnerSection = document.getElementById('winnerSection');
        const winnerNumber = document.getElementById('winnerNumber');
        const winnerName = document.getElementById('winnerName');
        const winnerPrize = document.getElementById('winnerPrize');

        winnerNumber.textContent = this.currentDraw.winningNumber.toString();
        winnerName.textContent = this.currentDraw.winner ? this.currentDraw.winner.firstName : 'No winner';
        winnerPrize.textContent = `$${this.currentDraw.prize.toFixed(2)}`;
        winnerSection.classList.remove('hidden');
    }

    hideWinnerDisplay() {
        document.getElementById('winnerSection').classList.add('hidden');
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyHistoryState');

        if (this.history.length === 0) {
            historyList.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        historyList.classList.remove('hidden');
        emptyState.classList.add('hidden');

        historyList.innerHTML = this.history.map(draw => `
            <div class="bg-gray-50 dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300 hover:shadow-md">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-semibold text-gray-800 dark:text-white">Draw #${draw.id.slice(-6)}</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${new Date(draw.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                        $${draw.prize.toFixed(2)}
                    </span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Winning Number:</span>
                        <div class="font-semibold text-gray-800 dark:text-white">${draw.winningNumber}</div>
                    </div>
                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Winner:</span>
                        <div class="font-semibold text-gray-800 dark:text-white">${draw.winner ? draw.winner.firstName : 'None'}</div>
                    </div>
                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Total Users:</span>
                        <div class="font-semibold text-gray-800 dark:text-white">${draw.totalUsers}</div>
                    </div>
                    <div class="md:text-right">
                        <button onclick="app.viewDrawDetails('${draw.id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    viewDrawDetails(drawId) {
        const draw = this.history.find(d => d.id === drawId);
        if (!draw) return;

        const modal = document.getElementById('historyDetailsModal');
        const content = document.getElementById('historyDetailsContent');

        content.innerHTML = `
            <div class="mb-6">
                <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Draw Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Draw ID:</span>
                        <div class="font-medium text-gray-800 dark:text-white">${draw.id}</div>
                    </div>
                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Date:</span>
                        <div class="font-medium text-gray-800 dark:text-white">${new Date(draw.createdAt).toLocaleString()}</div>
                    </div>
                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Winning Number:</span>
                        <div class="font-medium text-gray-800 dark:text-white">${draw.winningNumber}</div>
                    </div>
                    <div>
                        <span class="text-gray-600 dark:text-gray-400">Prize Amount:</span>
                        <div class="font-medium text-gray-800 dark:text-white">$${draw.prize.toFixed(2)}</div>
                    </div>
                    <div class="md:col-span-2">
                        <span class="text-gray-600 dark:text-gray-400">Winner:</span>
                        <div class="font-medium text-gray-800 dark:text-white">${draw.winner ? draw.winner.firstName : 'No winner'}</div>
                    </div>
                </div>
            </div>
            <div>
                <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Participants (${draw.users.length})</h4>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-200 dark:border-gray-700">
                                <th class="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                                <th class="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Bet Number</th>
                                <th class="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Bet Amount</th>
                                <th class="text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${draw.users.map(user => `
                                <tr class="border-b border-gray-200 dark:border-gray-700">
                                    <td class="py-2 px-4 text-sm text-gray-700 dark:text-gray-300">${user.firstName}</td>
                                    <td class="py-2 px-4 text-sm text-gray-700 dark:text-gray-300">${user.betNumber}</td>
                                    <td class="py-2 px-4 text-sm text-gray-700 dark:text-gray-300">$${user.betAmount.toFixed(2)}</td>
                                    <td class="py-2 px-4 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs font-medium ${
                                            user.betNumber === draw.winningNumber 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                        }">
                                            ${user.betNumber === draw.winningNumber ? 'Winner' : 'Participant'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.showModal(modal);
    }

    // User Authentication and Profile
    loginAsGuest() {
        this.currentUser = {
            id: 'guest',
            firstName: 'Guest',
            lastName: 'User',
            email: 'guest@example.com',
            isAdmin: false,
            isGuest: true
        };
        
        this.isDriveConnected = false;
        this.saveToStorage();
        this.showApp();
        this.showToast('Logged in as guest', 'success');
    }

    connectDrive() {
        // In a real implementation, this would trigger Google OAuth flow
        // For this demo, we'll simulate a successful connection
        this.currentUser = {
            id: 'drive_user',
            firstName: 'Drive',
            lastName: 'User',
            email: 'user@example.com',
            isAdmin: true,
            isGuest: false
        };
        
        this.isDriveConnected = true;
        this.saveToStorage();
        this.showApp();
        this.showToast('Google Drive connected successfully', 'success');
        
        // Simulate data import from Drive
        setTimeout(() => {
            this.showToast('Data imported from Drive', 'info');
        }, 1000);
    }

    disconnectDrive() {
        this.isDriveConnected = false;
        this.saveToStorage();
        this.updateUI();
        this.showToast('Disconnected from Google Drive', 'info');
    }

    updateProfile(profileData) {
        if (!this.currentUser) return;

        this.currentUser = {
            ...this.currentUser,
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            email: profileData.email,
            isAdmin: profileData.isAdmin !== undefined ? profileData.isAdmin : this.currentUser.isAdmin
        };

        this.saveToStorage();
        this.updateUI();
        this.showToast('Profile updated successfully', 'success');
    }

    // UI State Management
    showLogin() {
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('loginPage').classList.remove('hidden');
        this.hideAllPagesExcept('loginPage');
    }

    showApp() {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('loginPage').classList.add('hidden');
        this.showPage('home');
    }

    showPage(pageId) {
        this.hideAllPagesExcept(`${pageId}Page`);
        this.updateActiveNavLink(pageId);
        
        // Page-specific initializations
        switch (pageId) {
            case 'home':
                this.updateUsersTable();
                break;
            case 'profile':
                this.updateProfileForm();
                break;
            case 'admin':
                this.updateAdminForm();
                break;
            case 'history':
                this.updateHistoryDisplay();
                break;
            case 'settings':
                this.updateSettingsDisplay();
                break;
        }
    }

    hideAllPagesExcept(activePageId) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            if (page.id === activePageId) {
                page.classList.add('active');
                page.classList.remove('hidden');
            } else {
                page.classList.remove('active');
                page.classList.add('hidden');
            }
        });
    }

    updateActiveNavLink(pageId) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
            }
        });
    }

    updateUI() {
        // Update connection status
        document.getElementById('connectionStatus').textContent = this.isDriveConnected ? 'Yes' : 'No';
        document.getElementById('driveStatusText').textContent = this.isDriveConnected ? 'Connected' : 'Not connected';

        // Update profile section
        if (this.currentUser) {
            document.getElementById('profileSection').classList.remove('hidden');
            document.getElementById('connectSection').classList.add('hidden');
            document.getElementById('userName').textContent = this.currentUser.firstName;
            document.getElementById('profileAvatar').textContent = this.currentUser.firstName.charAt(0);
            
            // Show admin toggle for Drive users
            if (!this.currentUser.isGuest) {
                document.getElementById('adminToggleSection').classList.remove('hidden');
            }
        } else {
            document.getElementById('profileSection').classList.add('hidden');
            document.getElementById('connectSection').classList.remove('hidden');
        }

        // Update last sync time
        const lastSync = localStorage.getItem('ms_lastSync');
        document.getElementById('lastSyncTime').textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Never';

        this.updateDataSize();
    }

    updateProfileForm() {
        if (!this.currentUser) return;

        document.getElementById('profileFirstName').value = this.currentUser.firstName || '';
        document.getElementById('profileLastName').value = this.currentUser.lastName || '';
        document.getElementById('profileEmailInput').value = this.currentUser.email || '';
        document.getElementById('adminToggle').checked = this.currentUser.isAdmin || false;
        
        document.getElementById('profileName').textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim();
        document.getElementById('profileEmail').textContent = this.currentUser.email;
        document.getElementById('profileAvatar').textContent = this.currentUser.firstName.charAt(0);
    }

    updateAdminForm() {
        document.getElementById('minBetNumber').value = this.settings.minBetNumber;
        document.getElementById('maxBetNumber').value = this.settings.maxBetNumber;
        document.getElementById('minBetAmount').value = this.settings.minBetAmount;
        document.getElementById('maxBetAmount').value = this.settings.maxBetAmount;
        document.getElementById('winningPrize').value = this.settings.winningPrize;
        
        if (this.currentDraw) {
            this.updateWinnerDisplay();
        } else {
            this.hideWinnerDisplay();
        }
    }

    updateSettingsDisplay() {
        this.updateUI();
    }

    // Modal Management
    showModal(modalElement) {
        modalElement.classList.remove('hidden');
        setTimeout(() => {
            modalElement.classList.add('flex');
            const content = modalElement.querySelector('.modal-content');
            if (content) {
                content.classList.add('show');
            }
        }, 10);
    }

    hideModal(modalElement) {
        const content = modalElement.querySelector('.modal-content');
        if (content) {
            content.classList.remove('show');
        }
        setTimeout(() => {
            modalElement.classList.remove('flex');
            modalElement.classList.add('hidden');
        }, 300);
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserFirstName').value = user.firstName;
        document.getElementById('editUserBetNumber').value = user.betNumber;
        document.getElementById('editUserBetAmount').value = user.betAmount;

        this.showModal(document.getElementById('editUserModal'));
    }

    // Data Export/Import
    exportData() {
        const data = {
            currentUser: this.currentUser,
            users: this.users,
            history: this.history,
            settings: this.settings,
            currentDraw: this.currentDraw,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `mahajana-sampatha-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully', 'success');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (data.users && Array.isArray(data.users)) {
                    this.currentUser = data.currentUser || this.currentUser;
                    this.users = data.users;
                    this.history = data.history || [];
                    this.settings = data.settings || this.settings;
                    this.currentDraw = data.currentDraw || null;
                    
                    this.saveToStorage();
                    this.updateUI();
                    this.updateUsersTable();
                    this.updateHistoryDisplay();
                    this.showToast('Data imported successfully', 'success');
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                this.showToast('Error importing data: Invalid format', 'error');
            }
        };
        reader.readAsText(file);
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            localStorage.clear();
            this.currentUser = null;
            this.users = [];
            this.history = [];
            this.settings = {
                minBetNumber: 1,
                maxBetNumber: 100,
                minBetAmount: 10,
                maxBetAmount: 1000,
                winningPrize: 5000
            };
            this.currentDraw = null;
            this.isDriveConnected = false;
            
            this.updateUI();
            this.updateUsersTable();
            this.updateHistoryDisplay();
            this.showLogin();
            this.showToast('All data cleared successfully', 'success');
        }
    }

    // Drive Sync
    async syncToDrive() {
        if (!this.isDriveConnected) return;
        
        // Simulate Drive sync
        this.showToast('Syncing with Google Drive...', 'info');
        
        // In a real implementation, this would:
        // 1. Encrypt data
        // 2. Upload to Google Drive
        // 3. Update sync timestamp
        
        setTimeout(() => {
            localStorage.setItem('ms_lastSync', new Date().toISOString());
            this.updateUI();
            this.showToast('Data synced with Google Drive', 'success');
        }, 1500);
    }

    // Event Listeners
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            themeManager.toggleTheme();
        });

        // Login buttons
        document.getElementById('loginConnectDrive').addEventListener('click', () => {
            this.connectDrive();
        });

        document.getElementById('loginContinueGuest').addEventListener('click', () => {
            this.loginAsGuest();
        });

        // Add user form
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.addUser({
                firstName: formData.get('userFirstName') || document.getElementById('userFirstName').value,
                betNumber: formData.get('userBetNumber') || document.getElementById('userBetNumber').value,
                betAmount: formData.get('userBetAmount') || document.getElementById('userBetAmount').value
            });
            e.target.reset();
        });

        // Search and sort
        document.getElementById('searchUsers').addEventListener('input', () => {
            this.updateUsersTable();
        });

        document.getElementById('sortUsers').addEventListener('change', () => {
            this.updateUsersTable();
        });

        // Profile form
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile({
                firstName: document.getElementById('profileFirstName').value,
                lastName: document.getElementById('profileLastName').value,
                email: document.getElementById('profileEmailInput').value,
                isAdmin: document.getElementById('adminToggle').checked
            });
        });

        document.getElementById('resetProfileBtn').addEventListener('click', () => {
            this.updateProfileForm();
        });

        // Admin forms
        document.getElementById('drawConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.publishDrawRange({
                minBetNumber: parseInt(document.getElementById('minBetNumber').value),
                maxBetNumber: parseInt(document.getElementById('maxBetNumber').value),
                minBetAmount: parseFloat(document.getElementById('minBetAmount').value),
                maxBetAmount: parseFloat(document.getElementById('maxBetAmount').value),
                winningPrize: parseFloat(document.getElementById('winningPrize').value)
            });
        });

        document.getElementById('selectWinnerBtn').addEventListener('click', () => {
            this.selectWinner();
        });

        document.getElementById('finishDrawBtn').addEventListener('click', () => {
            this.finishDraw();
        });

        // Edit user modal
        document.getElementById('editUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const userId = document.getElementById('editUserId').value;
            this.updateUser(userId, {
                firstName: document.getElementById('editUserFirstName').value,
                betNumber: document.getElementById('editUserBetNumber').value,
                betAmount: document.getElementById('editUserBetAmount').value
            });
            this.hideModal(document.getElementById('editUserModal'));
        });

        document.getElementById('cancelEditUser').addEventListener('click', () => {
            this.hideModal(document.getElementById('editUserModal'));
        });

        // Settings
        document.getElementById('connectDriveSettings').addEventListener('click', () => {
            this.connectDrive();
        });

        document.getElementById('disconnectDrive').addEventListener('click', () => {
            this.disconnectDrive();
        });

        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('importDataFile').click();
        });

        document.getElementById('importDataFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importData(e.target.files[0]);
                e.target.value = '';
            }
        });

        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.clearData();
        });

        // History modal
        document.getElementById('closeHistoryDetails').addEventListener('click', () => {
            this.hideModal(document.getElementById('historyDetailsModal'));
        });

        // FAB
        document.getElementById('fab').addEventListener('click', () => {
            document.getElementById('userFirstName').focus();
        });

        // Sidebar toggle for mobile
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('-translate-x-full');
        });

        // Close sidebar when clicking on a link (mobile)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024) {
                    document.getElementById('sidebar').classList.add('-translate-x-full');
                }
            });
        });
    }

    // Routing
    setupRouting() {
        // Handle hash changes for SPA navigation
        window.addEventListener('hashchange', () => {
            const page = window.location.hash.replace('#', '') || 'home';
            this.showPage(page);
        });

        // Initial page load
        const initialPage = window.location.hash.replace('#', '') || 'home';
        if (this.currentUser) {
            this.showPage(initialPage);
        }
    }

    // Toast notifications
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MahajanaSampathaApp();
});