(function() {
    console.log('🚀 Debug System Initializing...');
    
    // ===== CONFIGURATION =====
    const DEBUG_CONFIG = {
        passwordHash: 'e7cf3ef4f17c3999a94f2c6f612e8a888e5b1026878e4e19398b23bd38ec221a', 
        secretCode: ['d', 'e', 'b', 'u', 'g']
    };

    let userInput = [];
    let debugModeActive = false;
    let passwordPromptOpen = false;

    console.log('✅ Debug configuration loaded');
    
    // ===== SECRET CODE LISTENER =====
    document.addEventListener('keydown', function(event) {
        userInput.push(event.key.toLowerCase());
        
        if (userInput.length > DEBUG_CONFIG.secretCode.length) {
            userInput.shift();
        }

        if (JSON.stringify(userInput) === JSON.stringify(DEBUG_CONFIG.secretCode)) {
            console.log('🔑 Secret code detected!');
            promptPassword();
            userInput = [];
        }
    });

    console.log('✅ Secret code listener attached');

    // ===== PASSWORD PROMPT =====
    function promptPassword() {
        console.log('🔐 Opening password prompt...');
        
        if (passwordPromptOpen) {
            console.log('⚠️ Password prompt already open, ignoring');
            return;
        }
        
        passwordPromptOpen = true;
        
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
            border: 2px solid transparent;
            background-clip: padding-box;
            position: relative;
            min-width: 400px;
            animation: slideUp 0.3s ease;
        `;
        
        modal.style.borderImage = 'linear-gradient(to right, #fc72ff, #8f68ff, #487bff) 1';

        modal.innerHTML = `
            <h2 style="color: white; margin: 0 0 10px 0; font-size: 24px; display: flex; align-items: center; gap: 10px;">
                <span style="background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                    🔐 Debug Mode Access
                </span>
            </h2>
            <p style="color: rgba(255,255,255,0.6); margin: 0 0 20px 0; font-size: 14px;">
                Enter the debug password to continue
            </p>
            <input type="password" id="debug-password-input" placeholder="Password" style="
                width: 100%;
                padding: 12px;
                background: rgba(255,255,255,0.05);
                border: 2px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                color: white;
                font-size: 16px;
                margin-bottom: 15px;
                box-sizing: border-box;
                transition: all 0.2s;
            ">
            <div id="password-error" style="color: #ff6b6b; font-size: 14px; margin-bottom: 15px; min-height: 20px;"></div>
            <div style="display: flex; gap: 10px;">
                <button id="password-submit" style="
                    flex: 1;
                    padding: 12px;
                    background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff);
                    border: none;
                    color: white;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.2s;
                ">Unlock</button>
                <button id="password-cancel" style="
                    flex: 1;
                    padding: 12px;
                    background: rgba(255,255,255,0.05);
                    border: 2px solid rgba(255,255,255,0.2);
                    color: white;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.2s;
                ">Cancel</button>
            </div>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
        console.log('✅ Password modal created and added to DOM');

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            #debug-password-input:focus {
                outline: none;
                border-color: #8f68ff;
                background: rgba(255,255,255,0.1);
                box-shadow: 0 0 20px rgba(143, 104, 255, 0.3);
            }
            #password-submit:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(143, 104, 255, 0.4);
            }
            #password-cancel:hover {
                background: rgba(255,255,255,0.1);
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(style);

        const input = document.getElementById('debug-password-input');
        const errorDiv = document.getElementById('password-error');
        const submitBtn = document.getElementById('password-submit');
        const cancelBtn = document.getElementById('password-cancel');

        // Focus input
        setTimeout(() => {
            input.focus();
            console.log('✅ Input focused');
        }, 100);

        // Handle submit
        const handleSubmit = () => {
            console.log('🔍 Checking password...');
            const password = input.value.trim();
            if (!password) {
                console.log('⚠️ No password entered');
                errorDiv.textContent = '⚠️ Please enter a password';
                return;
            }

            submitBtn.textContent = 'Checking...';
            submitBtn.disabled = true;

            hashPassword(password).then(hash => {
                console.log('🔐 Entered hash:', hash);
                console.log('🔐 Expected hash:', DEBUG_CONFIG.passwordHash);
                
                if (hash === DEBUG_CONFIG.passwordHash) {
                    console.log('✅ Password correct! Activating debug mode...');
                    passwordPromptOpen = false;
                    backdrop.remove();
                    style.remove();
                    console.log('✅ Modal removed, calling activateDebugMode()...');
                    activateDebugMode();
                } else {
                    console.log('❌ Incorrect password');
                    errorDiv.textContent = '❌ Incorrect password';
                    input.value = '';
                    input.focus();
                    submitBtn.textContent = 'Unlock';
                    submitBtn.disabled = false;
                }
            }).catch(err => {
                console.error('❌ Error hashing password:', err);
                errorDiv.textContent = '❌ Error checking password';
                submitBtn.textContent = 'Unlock';
                submitBtn.disabled = false;
            });
        };

        // Handle cancel
        const handleCancel = () => {
            console.log('❌ Password prompt cancelled');
            passwordPromptOpen = false;
            backdrop.remove();
            style.remove();
        };

        // Event listeners
        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('⏎ Enter key pressed');
                handleSubmit();
            }
            if (e.key === 'Escape') {
                console.log('⎋ Escape key pressed');
                handleCancel();
            }
        });
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                console.log('🖱️ Clicked outside modal');
                handleCancel();
            }
        });

        console.log('✅ Event listeners attached to password modal');
    }

    // ===== PASSWORD HASHING =====
    async function hashPassword(password) {
        console.log('🔐 Hashing password...');
        try {
            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('✅ Password hashed successfully');
            return hashHex;
        } catch (error) {
            console.error('❌ Error hashing password:', error);
            throw error;
        }
    }

    // ===== ACTIVATE DEBUG MODE =====
    function activateDebugMode() {
        console.log('🎯 activateDebugMode() called!');
        console.log('📊 Current debugModeActive:', debugModeActive);
        
        if (debugModeActive) {
            console.log('⚠️ Debug mode already active, deactivating...');
            deactivateDebugMode();
            return;
        }

        debugModeActive = true;
        console.log('✅ debugModeActive set to true');
        console.log('🐛 Creating debug panel...');
        
        try {
            createDebugPanel();
            console.log('✅ Debug panel created successfully');
            console.log('📢 Showing notification...');
            if (typeof showNotification === 'function') {
                showNotification('Debug Mode', 'Debug panel activated! 🐛', 'success');
            } else {
                console.warn('⚠️ showNotification function not found');
            }
        } catch (error) {
            console.error('❌ Error activating debug mode:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    // ===== DEACTIVATE DEBUG MODE =====
    function deactivateDebugMode() {
        console.log('🔴 Deactivating debug mode...');
        debugModeActive = false;
        const panel = document.getElementById('vault-debug-panel');
        if (panel) {
            panel.remove();
            console.log('✅ Debug panel removed');
        } else {
            console.log('⚠️ Debug panel not found in DOM');
        }
    }

    // ===== CREATE DEBUG PANEL =====
    function createDebugPanel() {
        console.log('🎨 Creating debug panel UI...');
        
        const existing = document.getElementById('vault-debug-panel');
        if (existing) {
            console.log('⚠️ Debug panel already exists, removing...');
            existing.remove();
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'vault-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1000px;
            max-height: 85vh;
            background: linear-gradient(135deg, rgba(30, 30, 30, 0.98) 0%, rgba(15, 15, 15, 0.98) 100%);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
            z-index: 100000;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 2px solid transparent;
            background-clip: padding-box;
            animation: panelFadeIn 0.3s ease;
        `;

        console.log('✅ Panel element created with ID:', panel.id);

        const username = (typeof auth !== 'undefined' && auth.currentUser && typeof authSystem !== 'undefined') 
            ? authSystem.getCurrentUsername() 
            : 'Not logged in';

        panel.innerHTML = `
            <div style="padding: 20px; background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 700; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">🐛 The Vault - Debug Panel</h2>
                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 12px;">Admin Mode - ${username}</p>
                </div>
                <button id="close-debug-panel" style="
                    background: rgba(0,0,0,0.3);
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                ">×</button>
            </div>

            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- Sidebar -->
                <div style="width: 200px; background: rgba(0,0,0,0.3); padding: 20px; overflow-y: auto; border-right: 1px solid rgba(255,255,255,0.1);">
                    <div class="debug-tab active" data-tab="overview">📊 Overview</div>
                    <div class="debug-tab" data-tab="analytics">📈 Analytics</div>
                    <div class="debug-tab" data-tab="allusers">👥 All Users</div>
                    <div class="debug-tab" data-tab="leaderboard">🏆 Leaderboard</div>
                    <div class="debug-tab" data-tab="playtime">⏱️ My Playtime</div>
                    <div class="debug-tab" data-tab="favorites">⭐ Favorites</div>
                    <div class="debug-tab" data-tab="diagnostic">🔬 Diagnostic</div>
                    <div class="debug-tab" data-tab="firebase">🔥 Firebase</div>
                    <div class="debug-tab" data-tab="storage">💾 Storage</div>
                    <div class="debug-tab" data-tab="console">💻 Console</div>
                </div>

                <!-- Content Area -->
                <div id="debug-content" style="flex: 1; padding: 20px; overflow-y: auto; color: white;"></div>
            </div>
        `;

        console.log('✅ Panel HTML set');

        document.body.appendChild(panel);
        console.log('✅ Panel added to document.body');

        // Add tab styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes panelFadeIn {
                from { opacity: 0; transform: translate(-50%, -48%) scale(0.95); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            .debug-tab {
                padding: 12px;
                margin-bottom: 8px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                cursor: pointer;
                color: white;
                font-weight: 600;
                transition: all 0.2s;
            }
            .debug-tab:hover {
                background: rgba(255,255,255,0.1);
                transform: translateX(5px);
            }
            .debug-tab.active {
                background: linear-gradient(to right, rgba(252, 114, 255, 0.2), rgba(143, 104, 255, 0.2), rgba(72, 123, 255, 0.2));
                border: 1px solid rgba(143, 104, 255, 0.5);
                color: #8f68ff;
                box-shadow: 0 0 20px rgba(143, 104, 255, 0.2);
            }
            .user-card:hover {
                transform: translateY(-2px);
                border-color: rgba(143, 104, 255, 0.4);
                box-shadow: 0 5px 15px rgba(143, 104, 255, 0.2);
            }
        `;
        document.head.appendChild(style);
        console.log('✅ Tab styles added');

        // Tab switching
        const tabs = document.querySelectorAll('.debug-tab');
        console.log('📑 Found', tabs.length, 'tabs');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                console.log('🖱️ Tab clicked:', this.dataset.tab);
                document.querySelectorAll('.debug-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                loadDebugTab(this.dataset.tab);
            });
        });
        console.log('✅ Tab click listeners attached');

        // Close button
        const closeBtn = document.getElementById('close-debug-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('🖱️ Close button clicked');
                deactivateDebugMode();
            });
            console.log('✅ Close button listener attached');
        }

        // ESC key to close
        const escHandler = function(e) {
            if (e.key === 'Escape' && debugModeActive) {
                console.log('⎋ Escape pressed, closing debug panel');
                deactivateDebugMode();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        console.log('✅ Escape key listener attached');

        console.log('📊 Loading overview tab...');
        loadDebugTab('overview');
    }

    // ===== LOAD TAB CONTENT =====
    function loadDebugTab(tab) {
        console.log('📂 Loading tab:', tab);
        const content = document.getElementById('debug-content');
        
        if (!content) {
            console.error('❌ debug-content element not found!');
            return;
        }

        try {
            switch(tab) {
                case 'overview':
                    loadOverviewTab(content);
                    break;
                case 'analytics':
                    loadAnalyticsTab(content);
                    break;
                case 'allusers':
                    loadAllUsersTab(content);
                    break;
                case 'leaderboard':
                    loadLeaderboardTab(content);
                    break;
                case 'playtime':
                    loadPlaytimeTab(content);
                    break;
                case 'favorites':
                    loadFavoritesTab(content);
                    break;
                case 'diagnostic':
                    loadDiagnosticTab(content);
                    break;
                case 'firebase':
                    loadFirebaseTab(content);
                    break;
                case 'storage':
                    loadStorageTab(content);
                    break;
                case 'console':
                    loadConsoleTab(content);
                    break;
                default:
                    console.warn('⚠️ Unknown tab:', tab);
            }
            console.log('✅ Tab loaded:', tab);
        } catch (error) {
            console.error('❌ Error loading tab:', tab, error);
            content.innerHTML = `<div style="color: #ef4444;">Error loading tab: ${error.message}</div>`;
        }
    }

    // ===== TAB: OVERVIEW =====
    function loadOverviewTab(content) {
        console.log('📊 Loading overview tab...');
        
        const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
        const favCount = (typeof favorites !== 'undefined') ? (favorites?.length || 0) : 0;
        const firebaseStatus = (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0);
        
        content.innerHTML = `
            <h2 style="margin-top: 0;">📊 System Overview</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, rgba(143, 104, 255, 0.1), rgba(72, 123, 255, 0.1)); border: 1px solid rgba(143, 104, 255, 0.3); border-radius: 10px; padding: 15px;">
                    <div style="font-size: 12px; color: #8f68ff; margin-bottom: 5px; font-weight: 600;">USER STATUS</div>
                    <div style="font-size: 24px; font-weight: 700;">${user ? '✅ Logged In' : '❌ Guest'}</div>
                    ${user && typeof authSystem !== 'undefined' ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">@${authSystem.getCurrentUsername()}</div>` : ''}
                </div>

                <div style="background: linear-gradient(135deg, rgba(72, 255, 123, 0.1), rgba(34, 197, 94, 0.1)); border: 1px solid rgba(72, 255, 123, 0.3); border-radius: 10px; padding: 15px;">
                    <div style="font-size: 12px; color: #48ff7b; margin-bottom: 5px; font-weight: 600;">FAVORITES</div>
                    <div style="font-size: 24px; font-weight: 700;">${favCount}</div>
                    <div style="font-size: 12px; color: #888; margin-top: 5px;">Starred items</div>
                </div>

                <div style="background: linear-gradient(135deg, rgba(252, 114, 255, 0.1), rgba(143, 104, 255, 0.1)); border: 1px solid rgba(252, 114, 255, 0.3); border-radius: 10px; padding: 15px;">
                    <div style="font-size: 12px; color: #fc72ff; margin-bottom: 5px; font-weight: 600;">FIREBASE</div>
                    <div style="font-size: 24px; font-weight: 700;">${firebaseStatus ? '✅ Connected' : '❌ Not Init'}</div>
                    <div style="font-size: 12px; color: #888; margin-top: 5px;">Status</div>
                </div>

                <div style="background: linear-gradient(135deg, rgba(72, 123, 255, 0.1), rgba(143, 104, 255, 0.1)); border: 1px solid rgba(72, 123, 255, 0.3); border-radius: 10px; padding: 15px;">
                    <div style="font-size: 12px; color: #487bff; margin-bottom: 5px; font-weight: 600;">CURRENT PAGE</div>
                    <div style="font-size: 18px; font-weight: 700;">${document.title}</div>
                    <div style="font-size: 12px; color: #888; margin-top: 5px;">${window.location.pathname}</div>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">🔧 Quick Actions</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    <button onclick="window.debugActions.clearLocalStorage()" style="padding: 10px; background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(239, 68, 68, 0.2)); border: 1px solid #ff6b6b; color: #ff6b6b; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Clear localStorage</button>
                    <button onclick="window.debugActions.exportData()" style="padding: 10px; background: linear-gradient(135deg, rgba(143, 104, 255, 0.2), rgba(72, 123, 255, 0.2)); border: 1px solid #8f68ff; color: #8f68ff; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Export User Data</button>
                    <button onclick="window.debugActions.reloadPage()" style="padding: 10px; background: linear-gradient(135deg, rgba(252, 114, 255, 0.2), rgba(143, 104, 255, 0.2)); border: 1px solid #fc72ff; color: #fc72ff; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Reload Page</button>
                    <button onclick="window.debugActions.testNotification()" style="padding: 10px; background: linear-gradient(135deg, rgba(72, 255, 123, 0.2), rgba(34, 197, 94, 0.2)); border: 1px solid #48ff7b; color: #48ff7b; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Test Notification</button>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px;">
                <h3 style="margin-top: 0;">ℹ️ System Information</h3>
                <table style="width: 100%; font-size: 14px;">
                    <tr><td style="padding: 5px 0; color: #888;">Browser:</td><td>${navigator.userAgent.split(' ').pop()}</td></tr>
                    <tr><td style="padding: 5px 0; color: #888;">Screen:</td><td>${window.innerWidth}x${window.innerHeight}</td></tr>
                    <tr><td style="padding: 5px 0; color: #888;">Firebase Apps:</td><td>${firebaseStatus ? firebase.apps.length : 0}</td></tr>
                    <tr><td style="padding: 5px 0; color: #888;">Auth State:</td><td>${user ? 'Authenticated' : 'Not Authenticated'}</td></tr>
                </table>
            </div>
        `;
        
        console.log('✅ Overview tab rendered');
    }

    // ===== TAB: ANALYTICS =====
    function loadAnalyticsTab(content) {
        console.log('📈 Loading analytics tab...');
        content.innerHTML = `
            <h2 style="margin-top: 0;">📈 Global Analytics</h2>
            <button onclick="window.debugActions.loadAnalytics()" style="width: 100%; padding: 12px; background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff); border: none; color: white; border-radius: 10px; cursor: pointer; font-weight: 600; margin-bottom: 20px; transition: all 0.2s; box-shadow: 0 4px 15px rgba(143, 104, 255, 0.3);">Load Analytics Data</button>
            <div id="analytics-output" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; min-height: 400px;">Click button to load analytics...</div>
        `;
    }

    // ===== TAB: ALL USERS =====
    function loadAllUsersTab(content) {
        console.log('👥 Loading all users tab...');
        content.innerHTML = `
            <h2 style="margin-top: 0;">👥 All Users</h2>
            
            <div style="margin-bottom: 20px;">
                <input type="text" id="user-search" placeholder="Search users..." style="
                    width: 100%;
                    padding: 12px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 10px;
                    color: white;
                    font-size: 14px;
                    margin-bottom: 10px;
                ">
                <button onclick="window.debugActions.loadAllUsers()" style="width: 100%; padding: 12px; background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff); border: none; color: white; border-radius: 10px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 15px rgba(143, 104, 255, 0.3); transition: all 0.2s
                ;">Load All Users</button>
            </div>

            <div id="users-list" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; min-height: 400px; max-height: 500px; overflow-y: auto;">Click button to load users...</div>
        `;

        // Add search functionality
        setTimeout(() => {
            const searchInput = document.getElementById('user-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase();
                    const userCards = document.querySelectorAll('.user-card');
                    userCards.forEach(card => {
                        const username = card.dataset.username.toLowerCase();
                        const email = card.dataset.email.toLowerCase();
                        if (username.includes(query) || email.includes(query)) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            }
        }, 100);
    }

    // ===== TAB: LEADERBOARD =====
    function loadLeaderboardTab(content) {
        console.log('🏆 Loading leaderboard tab...');
        content.innerHTML = `
            <h2 style="margin-top: 0;">🏆 Leaderboards</h2>
            <button onclick="window.debugActions.loadLeaderboard()" style="width: 100%; padding: 12px; background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff); border: none; color: white; border-radius: 10px; cursor: pointer; font-weight: 600; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(143, 104, 255, 0.3); transition: all 0.2s;">Load Leaderboard</button>
            <div id="leaderboard-output" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; min-height: 400px;">Click button to load leaderboard...</div>
        `;
    }

    // ===== TAB: PLAYTIME =====
    function loadPlaytimeTab(content) {
        console.log('⏱️ Loading playtime tab...');
        content.innerHTML = `
            <h2 style="margin-top: 0;">⏱️ My Playtime</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px;">
                <button onclick="window.debugActions.loadPlaytime('today')" style="padding: 12px; background: linear-gradient(135deg, rgba(72, 123, 255, 0.2), rgba(143, 104, 255, 0.2)); border: 1px solid #487bff; color: #487bff; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s;">📅 Today</button>
                <button onclick="window.debugActions.loadPlaytime('week')" style="padding: 12px; background: linear-gradient(135deg, rgba(72, 255, 123, 0.2), rgba(34, 197, 94, 0.2)); border: 1px solid #48ff7b; color: #48ff7b; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s;">📊 This Week</button>
                <button onclick="window.debugActions.loadPlaytime('month')" style="padding: 12px; background: linear-gradient(135deg, rgba(252, 114, 255, 0.2), rgba(143, 104, 255, 0.2)); border: 1px solid #fc72ff; color: #fc72ff; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s;">📈 Past Weeks</button>
                <button onclick="window.debugActions.loadPlaytime('all')" style="padding: 12px; background: linear-gradient(135deg, rgba(143, 104, 255, 0.2), rgba(72, 123, 255, 0.2)); border: 1px solid #8f68ff; color: #8f68ff; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s;">🏆 All Time</button>
            </div>

            <button onclick="window.debugActions.runConsolidation()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(239, 68, 68, 0.2)); border: 1px solid #ff6b6b; color: #ff6b6b; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 16px; margin-bottom: 20px; transition: all 0.2s;">🔄 Run Consolidation</button>

            <div id="playtime-output" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; font-family: monospace; font-size: 14px; min-height: 300px; white-space: pre-wrap; overflow-y: auto;">Click a button above to view playtime data...</div>
        `;
    }

    // ===== TAB: FAVORITES =====
    function loadFavoritesTab(content) {
        console.log('⭐ Loading favorites tab...');
        const favCount = (typeof favorites !== 'undefined') ? (favorites?.length || 0) : 0;
        
        content.innerHTML = `
            <h2 style="margin-top: 0;">⭐ Favorites Manager</h2>
            
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">Current Favorites (${favCount})</h3>
                <div id="favorites-list"></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button onclick="window.debugActions.clearFavorites()" style="padding: 12px; background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(239, 68, 68, 0.2)); border: 1px solid #ff6b6b; color: #ff6b6b; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Clear All Favorites</button>
                <button onclick="window.debugActions.syncFavorites()" style="padding: 12px; background: linear-gradient(to right, rgba(143, 104, 255, 0.2), rgba(72, 123, 255, 0.2)); border: 1px solid #8f68ff; color: #8f68ff; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Force Sync to Cloud</button>
            </div>
        `;

        const list = document.getElementById('favorites-list');
        if (typeof favorites !== 'undefined' && favorites && favorites.length > 0) {
            list.innerHTML = favorites.map((fav, i) => `
                <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 20px; margin-right: 10px;">${fav.icon || '🎮'}</span>
                        <span style="font-weight: 600;">${fav.title}</span>
                        <span style="color: #888; font-size: 12px; margin-left: 10px;">${fav.category || 'Game'}</span>
                    </div>
                    <button onclick="window.debugActions.removeFavorite(${i})" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Remove</button>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No favorites yet</p>';
        }
    }

    // ===== TAB: DIAGNOSTIC (NEW!) =====
    function loadDiagnosticTab(content) {
        console.log('🔬 Loading diagnostic tab...');
        
        content.innerHTML = `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            padding: 20px; border-radius: 12px; margin-bottom: 20px;
                            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                    <h2 style="margin: 0 0 10px 0; color: white;">🔬 Leaderboard Diagnostic Tool</h2>
                    <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                        This will analyze why the leaderboard shows 0s
                    </p>
                </div>
                
                <button onclick="window.debugActions.runDiagnostic()" 
                        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                               color: white; border: none; padding: 12px 24px;
                               border-radius: 8px; font-size: 16px; cursor: pointer;
                               margin-bottom: 20px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                               width: 100%; font-weight: 600;">
                    🔍 Run Diagnostic
                </button>
                
                <div id="diagnostic-output" style="background: rgba(30, 30, 30, 0.8);
                                                   border: 1px solid rgba(102, 126, 234, 0.3);
                                                   border-radius: 12px; padding: 20px;
                                                   font-family: 'Courier New', monospace;
                                                   font-size: 13px; line-height: 1.6;
                                                   color: #e0e0e0; min-height: 400px;
                                                   max-height: 600px; overflow-y: auto;">
                    <p style="color: #888; text-align: center; padding: 40px;">
                        Click "Run Diagnostic" to analyze your data
                    </p>
                </div>
            </div>
        `;
    }

    // ===== TAB: FIREBASE =====
    function loadFirebaseTab(content) {
        console.log('🔥 Loading firebase tab...');
        const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
        
        content.innerHTML = `
            <h2 style="margin-top: 0;">🔥 Firebase Debug</h2>
            
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">Connection Status</h3>
                <div style="font-size: 14px;">
                    <p>✅ Firebase Apps Initialized: ${typeof firebase !== 'undefined' && firebase.apps ? firebase.apps.length : 0}</p>
                    <p>✅ Auth Initialized: ${typeof auth !== 'undefined' ? 'Yes' : 'No'}</p>
                    <p>✅ Database Initialized: ${typeof database !== 'undefined' ? 'Yes' : 'No'}</p>
                    <p>${user ? '✅' : '❌'} User Authenticated: ${user && typeof authSystem !== 'undefined' ? authSystem.getCurrentUsername() + ' (' + user.email + ')' : 'No'}</p>
                </div>
            </div>

            ${user ? `
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0;">User Database Structure</h3>
                    <button onclick="window.debugActions.viewDatabaseStructure()" style="width: 100%; padding: 12px; background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff); border: none; color: white; border-radius: 10px; cursor: pointer; font-weight: 600; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(143, 104, 255, 0.3); transition: all 0.2s;">Load Database Structure</button>
                    <div id="db-structure" style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">Click button to load...</div>
                </div>
            ` : '<p style="color: #888;">Log in to view database information</p>'}
        `;
    }

    // ===== TAB: STORAGE =====
    function loadStorageTab(content) {
        console.log('💾 Loading storage tab...');
        const localStorageSize = new Blob(Object.values(localStorage)).size;
        
        content.innerHTML = `
            <h2 style="margin-top: 0;">💾 Local Storage</h2>
            
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">Storage Info</h3>
                <p>📦 Total Items: ${localStorage.length}</p>
                <p>💽 Approximate Size: ${(localStorageSize / 1024).toFixed(2)} KB</p>
            </div>

            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">Stored Keys</h3>
                <div id="storage-keys"></div>
            </div>

            <button onclick="window.debugActions.clearAllStorage()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(239, 68, 68, 0.2)); border: 1px solid #ff6b6b; color: #ff6b6b; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.2s;">⚠️ Clear All Local Storage</button>
        `;

        const keysList = document.getElementById('storage-keys');
        const keys = Object.keys(localStorage);
        if (keys.length > 0) {
            keysList.innerHTML = keys.map(key => {
                const value = localStorage.getItem(key);
                const preview = value.length > 100 ? value.substring(0, 100) + '...' : value;
                return `
                    <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">
                        <div style="font-weight: 600; margin-bottom: 5px; color: #3b82f6;">${key}</div>
                        <div style="font-family: monospace; font-size: 12px; color: #888; word-break: break-all;">${preview}</div>
                        <div style="margin-top: 5px; font-size: 12px; color: #666;">Size: ${(value.length / 1024).toFixed(2)} KB</div>
                    </div>
                `;
            }).join('');
        } else {
            keysList.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No data in localStorage</p>';
        }
    }

    // ===== TAB: CONSOLE =====
    function loadConsoleTab(content) {
        console.log('💻 Loading console tab...');
        content.innerHTML = `
            <h2 style="margin-top: 0;">💻 JavaScript Console</h2>
            
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">Execute JavaScript</h3>
                <textarea id="console-input" placeholder="Enter JavaScript code here..." style="width: 100%; height: 150px; background: rgba(0,0,0,0.5); border: 1px solid rgba(143, 104, 255, 0.3); border-radius: 8px; padding: 10px; color: white; font-family: monospace; font-size: 14px; resize: vertical;"></textarea>
                <button onclick="window.debugActions.executeCode()" style="width: 100%; padding: 12px; background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff); border: none; color: white; border-radius: 10px; cursor: pointer; font-weight: 600; margin-top: 10px; box-shadow: 0 4px 15px rgba(143, 104, 255, 0.3); transition: all 0.2s;">▶️ Execute</button>
            </div>

            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px;">
                <h3 style="margin-top: 0;">Output</h3>
                <div id="console-output" style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; font-family: monospace; font-size: 14px; min-height: 200px; white-space: pre-wrap; overflow-y: auto; color: #22c55e;">Ready to execute code...</div>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 10px;">
                <h4 style="color: #fbbf24; margin: 0 0 10px 0;">💡 Quick Commands:</h4>
                <div style="font-family: monospace; font-size: 12px; color: #888;">
                    <p>• <span style="color: white;">auth.currentUser</span> - View current user</p>
                    <p>• <span style="color: white;">authSystem.getCurrentUsername()</span> - Get username</p>
                    <p>• <span style="color: white;">favorites</span> - View favorites array</p>
                    <p>• <span style="color: white;">localStorage</span> - View localStorage</p>
                    <p>• <span style="color: white;">firebase.apps</span> - View Firebase apps</p>
                </div>
            </div>
        `;
    }

    // ===== DEBUG ACTIONS =====
    window.debugActions = {
        // NEW: Run Diagnostic
        runDiagnostic: function() {
            const output = document.getElementById('diagnostic-output');
            output.innerHTML = '<p style="color: #667eea;">🔍 Starting diagnostic...</p>';
            
            let log = '';
            
            function addLog(text, color = '#e0e0e0') {
                log += `<div style="color: ${color}; margin: 4px 0;">${text}</div>`;
                output.innerHTML = log;
                output.scrollTop = output.scrollHeight;
            }
            
            addLog('🔍 Starting Leaderboard Diagnostic...', '#667eea');
            addLog('━'.repeat(60), '#444');
            
            const database = firebase.database();
            const usersRef = database.ref('users');
            
            usersRef.once('value').then(snapshot => {
                const users = snapshot.val();
                
                if (!users) {
                    addLog('❌ No users found in database!', '#ef4444');
                    return;
                }
                
                addLog(`✅ Found ${Object.keys(users).length} user(s) in database`, '#10b981');
                addLog('');
                
                let globalIssues = [];
                
                Object.entries(users).forEach(([uid, userData], index) => {
                    addLog('━'.repeat(60), '#444');
                    addLog(`\n👤 USER #${index + 1}: ${userData.username || 'Unknown'}`, '#fbbf24');
                    addLog(`   UID: ${uid}`, '#888');
                    addLog(`   Email: ${userData.email || 'N/A'}`, '#888');
                    addLog('');
                    
                    // Check playtime structure
                    if (!userData.playtime) {
                        addLog('   ❌ NO PLAYTIME DATA', '#ef4444');
                        globalIssues.push(`${userData.username}: Missing playtime object`);
                        return;
                    }
                    
                    addLog('   ✅ Playtime object exists', '#10b981');
                    
                    // Check total
                    if (!userData.playtime.total) {
                        addLog('   ❌ NO TOTAL PLAYTIME', '#ef4444');
                        globalIssues.push(`${userData.username}: Missing playtime.total`);
                        return;
                    }
                    
                    const totalGames = Object.keys(userData.playtime.total);
                    addLog(`   ✅ Total playtime exists with ${totalGames.length} game(s)`, '#10b981');
                    addLog('');
                    
                    // Analyze each game
                    addLog('   🎮 GAMES ANALYSIS:', '#667eea');
                    let manualTotal = 0;
                    let typeIssues = [];
                    
                    Object.entries(userData.playtime.total).forEach(([game, seconds]) => {
                        const valueType = typeof seconds;
                        const displayValue = seconds;
                        
                        addLog(`      • ${game}:`, '#e0e0e0');
                        addLog(`        Value: ${displayValue}`, '#888');
                        addLog(`        Type: ${valueType}`, valueType === 'number' ? '#10b981' : '#ef4444');
                        
                        // Try to convert
                        const numSeconds = Number(seconds);
                        if (isNaN(numSeconds)) {
                            addLog(`        ⚠️ CANNOT CONVERT TO NUMBER!`, '#ef4444');
                            typeIssues.push(game);
                        } else {
                            manualTotal += numSeconds;
                            addLog(`        ✅ Converted: ${numSeconds} seconds`, '#10b981');
                        }
                    });
                    
                    addLog('');
                    addLog('   📊 CALCULATION RESULTS:', '#667eea');
                    
                    // Manual calculation
                    const manualMinutes = Math.floor(manualTotal / 60);
                    addLog(`      Manual Total: ${manualTotal} seconds (${manualMinutes} min)`, '#10b981');
                    
                    // Reduce method (what leaderboard uses)
                    const reduceTotal = Object.values(userData.playtime.total)
                        .reduce((sum, seconds) => {
                            const num = Number(seconds);
                            return sum + (isNaN(num) ? 0 : num);
                        }, 0);
                    const reduceMinutes = Math.floor(reduceTotal / 60);
                    addLog(`      Reduce Method: ${reduceTotal} seconds (${reduceMinutes} min)`, reduceTotal > 0 ? '#10b981' : '#ef4444');
                    
                    // Compare
                    if (reduceTotal === 0 && manualTotal > 0) {
                        addLog(`      🚨 PROBLEM FOUND: Reduce returns 0 but manual calc works!`, '#ef4444');
                        globalIssues.push(`${userData.username}: Reduce method failing`);
                    } else if (reduceTotal !== manualTotal) {
                        addLog(`      ⚠️ MISMATCH: Manual and Reduce totals differ!`, '#fbbf24');
                        globalIssues.push(`${userData.username}: Calculation mismatch`);
                    } else if (reduceTotal > 0) {
                        addLog(`      ✅ CALCULATIONS MATCH - This user should show on leaderboard!`, '#10b981');
                    }
                    
                    if (typeIssues.length > 0) {
                        addLog(`      ⚠️ Type issues in: ${typeIssues.join(', ')}`, '#fbbf24');
                        globalIssues.push(`${userData.username}: Type conversion issues`);
                    }
                    
                    addLog('');
                });
                
                // Summary
                addLog('━'.repeat(60), '#444');
                addLog('\n📋 DIAGNOSTIC SUMMARY:', '#667eea');
                addLog('');
                
                if (globalIssues.length === 0) {
                    addLog('✅ NO ISSUES FOUND!', '#10b981');
                    addLog('   All users should appear correctly on leaderboard.', '#10b981');
                    addLog('   If they still show 0s, the problem is in the leaderboard rendering code.', '#fbbf24');
                } else {
                    addLog(`⚠️ Found ${globalIssues.length} issue(s):`, '#ef4444');
                    globalIssues.forEach(issue => {
                        addLog(`   • ${issue}`, '#fbbf24');
                    });
                }
                
                addLog('');
                addLog('✅ Diagnostic complete!', '#667eea');
                
            }).catch(error => {
                addLog('❌ ERROR: ' + error.message, '#ef4444');
            });
        },

        // Analytics
        loadAnalytics: function() {
            console.log('📊 Loading analytics...');
            const output = document.getElementById('analytics-output');
            output.innerHTML = '⏳ Loading analytics data...\n\n';

            if (typeof database === 'undefined') {
                output.innerHTML = '❌ Database not available';
                return;
            }

            database.ref('users').once('value')
                .then((snapshot) => {
                    const users = snapshot.val();
                    if (!users) {
                        output.innerHTML = 'No users found in database';
                        return;
                    }

                    const userIds = Object.keys(users);
                    let totalUsers = userIds.length;
                    let totalPlaytime = 0;
                    let gamePlaytimes = {};
                    let activeUsers = 0;

                    userIds.forEach(userId => {
                        const user = users[userId];
                        
                        if (user.playtime && user.playtime.total) {
                            activeUsers++;
                            
                            Object.values(user.playtime.total).forEach(seconds => {
                                totalPlaytime += seconds;
                            });

                            Object.entries(user.playtime.total).forEach(([game, seconds]) => {
                                gamePlaytimes[game] = (gamePlaytimes[game] || 0) + seconds;
                            });
                        }
                    });

                    let html = `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div style="background: linear-gradient(135deg, rgba(143, 104, 255, 0.1), rgba(72, 123, 255, 0.1)); border: 1px solid rgba(143, 104, 255, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
                                <div style="font-size: 36px; font-weight: 700; color: #8f68ff;">${totalUsers}</div>
                                <div style="font-size: 14px; color: #888; margin-top: 5px;">Total Users</div>
                            </div>
                            <div style="background: linear-gradient(135deg, rgba(72, 255, 123, 0.1), rgba(34, 197, 94, 0.1)); border: 1px solid rgba(72, 255, 123, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
                                <div style="font-size: 36px; font-weight: 700; color: #48ff7b;">${activeUsers}</div>
                                <div style="font-size: 14px; color: #888; margin-top: 5px;">Active Players</div>
                            </div>
                            <div style="background: linear-gradient(135deg, rgba(252, 114, 255, 0.1), rgba(143, 104, 255, 0.1)); border: 1px solid rgba(252, 114, 255, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
                                <div style="font-size: 36px; font-weight: 700; color: #fc72ff;">${formatPlaytime(totalPlaytime)}</div>
                                <div style="font-size: 14px; color: #888; margin-top: 5px;">Total Playtime</div>
                            </div>
                            <div style="background: linear-gradient(135deg, rgba(72, 123, 255, 0.1), rgba(143, 104, 255, 0.1)); border: 1px solid rgba(72, 123, 255, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
                                <div style="font-size: 36px; font-weight: 700; color: #487bff;">${Object.keys(gamePlaytimes).length}</div>
                                <div style="font-size: 14px; color: #888; margin-top: 5px;">Games Played</div>
                            </div>
                        </div>

                        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px;">
                            <h3 style="margin-top: 0;">🎮 Most Popular Games</h3>
                    `;

                    const sortedGames = Object.entries(gamePlaytimes).sort((a, b) => b[1] - a[1]).slice(0, 10);
                    sortedGames.forEach(([game, seconds], index) => {
                        const bar = '█'.repeat(Math.min(Math.floor(seconds / 3600), 20));
                        html += `
                            <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span style="font-weight: 600;">${index + 1}. ${game}</span>
                                    <span style="color: #888;">${formatPlaytime(seconds)}</span>
                                </div>
                                <div style="background: linear-gradient(to right, #fc72ff, #8f68ff, #487bff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 12px;">${bar}</div>
                            </div>
                        `;
                    });

                    html += '</div>';
                    output.innerHTML = html;
                    console.log('✅ Analytics loaded');
                })
                .catch((error) => {
                    output.innerHTML = `❌ Error loading analytics: ${error.message}`;
                    console.error('❌ Analytics error:', error);
                });
        },

        // All Users
        loadAllUsers: function() {
            console.log('👥 Loading all users...');
            const list = document.getElementById('users-list');
            list.innerHTML = '⏳ Loading all users...\n\n';
            
            if (typeof database === 'undefined') {
                list.innerHTML = '❌ Database not available';
                return;
            }

            database.ref('users').once('value')
                .then((snapshot) => {
                    const users = snapshot.val();
                    if (!users) {
                        list.innerHTML = 'No users found in database';
                        return;
                    }
                    
                    let html = '';
                    Object.entries(users).forEach(([uid, userData]) => {
                        const username = userData.username || 'No username';
                        const email = userData.email || 'No email';
                        const createdAt = userData.createdAt ? new Date(userData.createdAt).toLocaleString() : 'Unknown';
                        
                        // Calculate total playtime from playtime.total
                        let totalPlaytime = 0;
                        if (userData.playtime && userData.playtime.total) {
                            totalPlaytime = Object.values(userData.playtime.total)
                                .reduce((sum, seconds) => sum + Number(seconds), 0);
                        }
                        
                        html += `
                            <div class="user-card" data-username="${username}" data-email="${email}" style="
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(143, 104, 255, 0.2);
                                border-radius: 10px;
                                padding: 15px;
                                margin-bottom: 10px;
                                transition: all 0.2s;
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 18px; font-weight: 700; color: #8f68ff; margin-bottom: 5px;">
                                            @${username}
                                        </div>
                                        <div style="font-size: 14px; color: #888; margin-bottom: 3px;">
                                            📧 ${email}
                                        </div>
                                        <div style="font-size: 12px; color: #666;">
                                            🆔 ${uid.substring(0, 12)}...
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 16px; font-weight: 600; color: #fc72ff; margin-bottom: 3px;">
                                            ⏱️ ${formatPlaytime(totalPlaytime)}
                                        </div>
                                        <div style="font-size: 11px; color: #666;">
                                            Joined: ${createdAt.split(',')[0]}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    list.innerHTML = html;
                    console.log('✅ All users loaded');
                })
                .catch((error) => {
                    list.innerHTML = `❌ Error loading users: ${error.message}`;
                    console.error('❌ Users error:', error);
                });
        },
        
        // Leaderboard
        loadLeaderboard: function() {
            console.log('🏆 Loading leaderboard...');
            const output = document.getElementById('leaderboard-output');
            output.innerHTML = '⏳ Loading leaderboard...\n\n';
            
            if (typeof database === 'undefined') {
                output.innerHTML = '❌ Database not available';
                return;
            }

            database.ref('users').once('value')
                .then((snapshot) => {
                    const users = snapshot.val();
                    if (!users) {
                        output.innerHTML = 'No users found in database';
                        return;
                    }
                    
                    // Calculate total playtime from playtime.total for each user
                    const leaderboard = Object.entries(users).map(([uid, userData]) => {
                        let totalPlaytime = 0;
                        
                        if (userData.playtime && userData.playtime.total) {
                            totalPlaytime = Object.values(userData.playtime.total)
                                .reduce((sum, seconds) => {
                                    const num = Number(seconds);
                                    return sum + (isNaN(num) ? 0 : num);
                                }, 0);
                        }
                        
                        return {
                            username: userData.username || 'Unknown',
                            totalPlaytime: totalPlaytime,
                            email: userData.email || 'No email'
                        };
                    })
                    .sort((a, b) => b.totalPlaytime - a.totalPlaytime);
                    
                    let html = `
                        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px;">
                            <h3 style="margin-top: 0;">🏆 Top Players by Total Playtime</h3>
                    `;
                    
                    if (leaderboard.every(user => user.totalPlaytime === 0)) {
                        html += '<p style="color: #888; text-align: center; padding: 40px;">No playtime data available yet. Start playing some games!</p>';
                    } else {
                        leaderboard.slice(0, 50).forEach((user, index) => {
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                            const highlight = index < 3 ? 'background: linear-gradient(135deg, rgba(252, 114, 255, 0.15), rgba(143, 104, 255, 0.15)); border: 1px solid rgba(143, 104, 255, 0.4);' : 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);';
                            
                            html += `
                                <div style="${highlight} border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="font-size: 20px; min-width: 40px;">${medal}</span>
                                        <div>
                                            <div style="font-weight: 700; font-size: 16px;">@${user.username}</div>
                                            <div style="font-size: 12px; color: #888;">${user.email}</div>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 18px; font-weight: 700; color: #8f68ff;">${formatPlaytime(user.totalPlaytime)}</div>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    
                    html += '</div>';
                    output.innerHTML = html;
                    console.log('✅ Leaderboard loaded');
                })
                .catch((error) => {
                    output.innerHTML = `❌ Error loading leaderboard: ${error.message}`;
                    console.error('❌ Leaderboard error:', error);
                });
        },
        
        // Playtime
        loadPlaytime: function(filter) {
            console.log('⏱️ Loading playtime:', filter);
            const output = document.getElementById('playtime-output');
            const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            
            if (!user) {
                output.textContent = '❌ You must be logged in to view playtime';
                return;
            }
            
            if (typeof database === 'undefined') {
                output.textContent = '❌ Database not available';
                return;
            }
            
            output.textContent = '⏳ Loading playtime data...\n\n';
            
            database.ref(`users/${user.uid}/playtime`).once('value')
                .then((snapshot) => {
                    const playtime = snapshot.val();
                    if (!playtime) {
                        output.textContent = 'No playtime data found';
                        return;
                    }
                    
                    let result = `📊 Playtime Data for @${typeof authSystem !== 'undefined' ? authSystem.getCurrentUsername() : 'User'}\n`;
                    result += `Filter: ${filter.toUpperCase()}\n`;
                    result += `${'='.repeat(60)}\n\n`;
                    
                    if (filter === 'today') {
                        const today = new Date().toISOString().split('T')[0];
                        if (playtime.daily && playtime.daily[today]) {
                            result += `📅 Today (${today}):\n`;
                            Object.entries(playtime.daily[today]).forEach(([game, seconds]) => {
                                result += `  ${game}: ${formatPlaytime(seconds)}\n`;
                            });
                        } else {
                            result += 'No playtime recorded today';
                        }
                    } else if (filter === 'week') {
                        result += '📊 This Week (Last 7 Days):\n\n';
                        const last7Days = [];
                        for (let i = 0; i < 7; i++) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            last7Days.push(date.toISOString().split('T')[0]);
                        }
                        
                        if (playtime.daily) {
                            last7Days.forEach(date => {
                                if (playtime.daily[date]) {
                                    result += `\n${date}:\n`;
                                    Object.entries(playtime.daily[date]).forEach(([game, seconds]) => {
                                        result += `  ${game}: ${formatPlaytime(seconds)}\n`;
                                    });
                                }
                            });
                        } else {
                            result += 'No daily data available';
                        }
                    } else if (filter === 'month') {
                        result += '📈 Weekly Breakdown:\n\n';
                        if (playtime.weekly) {
                            Object.entries(playtime.weekly).sort().reverse().forEach(([week, games]) => {
                                result += `\nWeek ${week}:\n`;
                                Object.entries(games).forEach(([game, seconds]) => {
                                    result += `  ${game}: ${formatPlaytime(seconds)}\n`;
                                });
                            });
                        } else {
                            result += 'No weekly data available';
                        }
                    } else if (filter === 'all') {
                        result += '🏆 All-Time Stats:\n\n';
                        if (playtime.total) {
                            const sorted = Object.entries(playtime.total).sort((a, b) => b[1] - a[1]);
                            sorted.forEach(([game, seconds]) => {
                                const bar = '█'.repeat(Math.min(Math.floor(seconds / 3600), 30));
                                result += `${game.padEnd(30)} ${formatPlaytime(seconds).padStart(12)} ${bar}\n`;
                            });
                        } else {
                            result += 'No total playtime data available';
                        }
                    }
                    
                    output.textContent = result;
                    console.log('✅ Playtime loaded');
                })
                .catch((error) => {
                    output.textContent = `❌ Error loading playtime: ${error.message}`;
                    console.error('❌ Playtime error:', error);
                });
        },
        
        // Consolidation
        runConsolidation: function() {
            const output = document.getElementById('playtime-output');
            output.textContent = '🔄 Starting playtime consolidation...\n\n';
            
            if (typeof consolidatePlaytime === 'function') {
                consolidatePlaytime()
                    .then(() => {
                        output.textContent += '✅ Consolidation completed successfully!\n';
                        output.textContent += 'Click a filter button to view updated data.';
                    })
                    .catch((error) => {
                        output.textContent += `❌ Consolidation failed: ${error.message}`;
                    });
            } else {
                output.textContent = '❌ Consolidation function not found. Make sure PlaytimeConsolidation.js is loaded.';
            }
        },
        
        // Favorites
        clearFavorites: function() {
            if (confirm('⚠️ Are you sure you want to clear ALL favorites? This cannot be undone!')) {
                if (typeof favorites !== 'undefined') {
                    favorites = [];
                }
                if (typeof saveFavorites === 'function') {
                    saveFavorites();
                }
                if (typeof showNotification === 'function') {
                    showNotification('Favorites Cleared', 'All favorites have been removed', 'success');
                }
                loadFavoritesTab(document.getElementById('debug-content'));
            }
        },
        
        syncFavorites: function() {
            const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            if (!user) {
                if (typeof showNotification === 'function') {
                    showNotification('Error', 'You must be logged in to sync favorites', 'error');
                }
                return;
            }
            
            if (typeof database !== 'undefined' && typeof favorites !== 'undefined') {
                database.ref(`users/${user.uid}/favorites`).set(favorites)
                    .then(() => {
                        if (typeof showNotification === 'function') {
                            showNotification('Sync Complete', 'Favorites synced to cloud', 'success');
                        }
                    })
                    .catch((error) => {
                        if (typeof showNotification === 'function') {
                            showNotification('Sync Failed', error.message, 'error');
                        }
                    });
            }
        },
        
        removeFavorite: function(index) {
            if (typeof favorites !== 'undefined') {
                favorites.splice(index, 1);
            }
            if (typeof saveFavorites === 'function') {
                saveFavorites();
            }
            loadFavoritesTab(document.getElementById('debug-content'));
        },
        
        // Firebase
        viewDatabaseStructure: function() {
            const output = document.getElementById('db-structure');
            const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            
            if (!user) {
                output.textContent = '❌ Not logged in';
                return;
            }
            
            output.textContent = '⏳ Loading database structure...\n\n';
            
            if (typeof database !== 'undefined') {
                database.ref(`users/${user.uid}`).once('value')
                    .then((snapshot) => {
                        const data = snapshot.val();
                        output.textContent = JSON.stringify(data, null, 2);
                    })
                    .catch((error) => {
                        output.textContent = `❌ Error: ${error.message}`;
                    });
            }
        },
        
        // Storage
        clearLocalStorage: function() {
            if (confirm('⚠️ This will clear ALL localStorage data. Continue?')) {
                localStorage.clear();
                if (typeof showNotification === 'function') {
                    showNotification('Storage Cleared', 'localStorage has been cleared', 'success');
                }
                loadStorageTab(document.getElementById('debug-content'));
            }
        },
        
        clearAllStorage: function() {
            if (confirm('⚠️ This will clear ALL localStorage data including favorites and settings. This cannot be undone! Continue?')) {
                localStorage.clear();
                if (typeof showNotification === 'function') {
                    showNotification('All Storage Cleared', 'All local data has been wiped', 'success');
                }
                setTimeout(() => location.reload(), 1000);
            }
        },
        
        // Quick Actions
        exportData: function() {
            const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            if (!user) {
                if (typeof showNotification === 'function') {
                    showNotification('Error', 'You must be logged in to export data', 'error');
                }
                return;
            }
            
            if (typeof database !== 'undefined') {
                database.ref(`users/${user.uid}`).once('value')
                    .then((snapshot) => {
                        const data = snapshot.val();
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        const username = (typeof authSystem !== 'undefined') ? authSystem.getCurrentUsername() : 'user';
                        a.download = `vault-data-${username}-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        if (typeof showNotification === 'function') {
                            showNotification('Export Complete', 'Data downloaded successfully', 'success');
                        }
                    })
                    .catch((error) => {
                        if (typeof showNotification === 'function') {
                            showNotification('Export Failed', error.message, 'error');
                        }
                    });
            }
        },
        
        reloadPage: function() {
            location.reload();
        },
        
        testNotification: function() {
            if (typeof showNotification === 'function') {
                showNotification('Test Notification', 'This is a test notification! 🎉', 'success');
            } else {
                alert('Test Notification: showNotification function not found');
            }
        },
        
        // Console
        executeCode: function() {
            const input = document.getElementById('console-input');
            const output = document.getElementById('console-output');
            
            if (!input || !output) return;
            
            const code = input.value.trim();
            if (!code) {
                output.textContent = '❌ No code to execute';
                return;
            }
            
            output.textContent = `▶️ Executing:\n${code}\n\n${'─'.repeat(50)}\n\n`;
            
            try {
                const result = eval(code);
                output.textContent += `✅ Result:\n${JSON.stringify(result, null, 2)}`;
            } catch (error) {
                output.textContent += `❌ Error:\n${error.message}\n\n${error.stack}`;
            }
        }
    };
    
    // ===== HELPER FUNCTIONS =====
    function formatPlaytime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    console.log('🐛 Debug System Loaded');
    console.log('💡 Type "debug" on any page, enter password to activate');

})();