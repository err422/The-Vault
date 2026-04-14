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
            max-width: 950px;
            max-height: 85vh;
            background: #272727;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
            z-index: 100000;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 1px solid #3a3a3a;
            animation: panelFadeIn 0.3s ease;
        `;

        console.log('✅ Panel element created with ID:', panel.id);

        const username = (typeof auth !== 'undefined' && auth.currentUser && typeof authSystem !== 'undefined') 
            ? authSystem.getCurrentUsername() 
            : 'Not logged in';

        panel.innerHTML = `
            <div style="padding: 16px 20px; background: #2a2a2a; border-bottom: 1px solid #3a3a3a; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="color: #e5e5e5; margin: 0; font-size: 18px; font-weight: 600;">Debug Panel</h2>
                    <p style="color: #999; margin: 4px 0 0 0; font-size: 12px;">@${username}</p>
                </div>
                <button id="close-debug-panel" style="
                    background: transparent;
                    border: 1px solid #4a4a4a;
                    color: #999;
                    font-size: 24px;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    hover: { background: #3a3a3a; color: #ddd; }
                ">×</button>
            </div>

            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- Sidebar -->
                <div style="width: 160px; background: #1f1f1f; padding: 12px; overflow-y: auto; border-right: 1px solid #3a3a3a;">
                    <div class="debug-tab active" data-tab="overview">Overview</div>
                    <div class="debug-tab" data-tab="diagnostic">Diagnostic</div>
                    <div class="debug-tab" data-tab="firebase">Firebase</div>
                    <div class="debug-tab" data-tab="storage">Storage</div>
                    <div class="debug-tab" data-tab="console">Console</div>
                </div>

                <!-- Content Area -->
                <div id="debug-content" style="flex: 1; padding: 20px; overflow-y: auto; color: #e5e5e5;"></div>
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
                padding: 10px 12px;
                margin-bottom: 6px;
                background: #2a2a2a;
                border: 1px solid #3a3a3a;
                border-radius: 6px;
                cursor: pointer;
                color: #999;
                font-weight: 500;
                font-size: 13px;
                transition: all 0.2s;
            }
            .debug-tab:hover {
                background: #333;
                color: #ccc;
                border-color: #4a4a4a;
            }
            .debug-tab.active {
                background: #3a4a5a;
                border-color: #5a7abb;
                color: #7a9fd4;
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
        const firebaseStatus = (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0);
        const storageSize = (new Blob(Object.values(localStorage)).size / 1024).toFixed(2);
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #e5e5e5; font-size: 18px;">System Overview</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px;">
                    <div style="font-size: 11px; color: #777; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">User Status</div>
                    <div style="font-size: 20px; font-weight: 600; color: #7a9fd4;">${user ? '✓ Logged In' : '○ Guest'}</div>
                    ${user && typeof authSystem !== 'undefined' ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">@${authSystem.getCurrentUsername()}</div>` : ''}
                </div>

                <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px;">
                    <div style="font-size: 11px; color: #777; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Firebase</div>
                    <div style="font-size: 20px; font-weight: 600; color: #7a9fd4;">${firebaseStatus ? '✓ Connected' : '○ Offline'}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">Status</div>
                </div>

                <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px;">
                    <div style="font-size: 11px; color: #777; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Storage</div>
                    <div style="font-size: 20px; font-weight: 600; color: #7a9fd4;">${storageSize} KB</div>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">${localStorage.length} items</div>
                </div>
            </div>

            <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #e5e5e5;">Quick Actions</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
                    <button onclick="window.debugActions.clearLocalStorage()" style="padding: 8px; background: #3a3a3a; border: 1px solid #4a4a4a; color: #999; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 12px; transition: all 0.2s;">Clear Storage</button>
                    <button onclick="window.debugActions.exportData()" style="padding: 8px; background: #3a4a5a; border: 1px solid #4a5a6a; color: #7a9fd4; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 12px; transition: all 0.2s;">Export Data</button>
                    <button onclick="window.debugActions.reloadPage()" style="padding: 8px; background: #3a3a3a; border: 1px solid #4a4a4a; color: #999; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 12px; transition: all 0.2s;">Reload Page</button>
                </div>
            </div>

            <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #e5e5e5;">System Info</h3>
                <div style="font-size: 12px; line-height: 1.6; color: #999;">
                    <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px;">
                        <span style="color: #666;">Page:</span><span>${document.title || 'N/A'}</span>
                        <span style="color: #666;">URL:</span><span style="word-break: break-all;">${window.location.pathname}</span>
                        <span style="color: #666;">Screen:</span><span>${window.innerWidth}x${window.innerHeight}</span>
                        <span style="color: #666;">Firebase:</span><span>${firebaseStatus ? 'Initialized' : 'Not init'}</span>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Overview tab rendered');
    }

    // ===== TAB: DIAGNOSTIC =====
    function loadDiagnosticTab(content) {
        console.log('🔬 Loading diagnostic tab...');
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #e5e5e5; font-size: 18px;">Leaderboard Diagnostic</h2>
            
            <button onclick="window.debugActions.runDiagnostic()" 
                    style="background: #3a4a5a;
                           color: #7a9fd4; border: 1px solid #4a5a6a; padding: 10px;
                           border-radius: 6px; font-size: 14px; cursor: pointer;
                           margin-bottom: 16px; width: 100%; font-weight: 500; transition: all 0.2s;">
                Run Diagnostic
            </button>
            
            <div id="diagnostic-output" style="background: #1f1f1f;
                                              border: 1px solid #3a3a3a;
                                              border-radius: 6px; padding: 12px;
                                              font-family: 'Courier New', monospace;
                                              font-size: 12px; line-height: 1.5;
                                              color: #999; min-height: 400px;
                                              max-height: 500px; overflow-y: auto;">
                <p style="color: #666; text-align: center; padding: 40px;">
                    Click button to analyze leaderboard data
                </p>
            </div>
        `;
    }

    // ===== TAB: FIREBASE =====
    function loadFirebaseTab(content) {
        console.log('🔥 Loading firebase tab...');
        const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #e5e5e5; font-size: 18px;">Firebase Debug</h2>
            
            <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #e5e5e5;">Connection Status</h3>
                <div style="font-size: 13px; line-height: 1.6; color: #999;">
                    <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px;">
                        <span style="color: #666;">Apps Init:</span><span>${typeof firebase !== 'undefined' && firebase.apps ? firebase.apps.length + ' app(s)' : 'No'}</span>
                        <span style="color: #666;">Auth:</span><span>${typeof auth !== 'undefined' ? 'Yes' : 'No'}</span>
                        <span style="color: #666;">Database:</span><span>${typeof database !== 'undefined' ? 'Yes' : 'No'}</span>
                        <span style="color: #666;">User:</span><span>${user && typeof authSystem !== 'undefined' ? authSystem.getCurrentUsername() : 'Not logged in'}</span>
                    </div>
                </div>
            </div>

            ${user ? `
                <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #e5e5e5;">User Data</h3>
                    <button onclick="window.debugActions.viewDatabaseStructure()" style="width: 100%; padding: 8px; background: #3a4a5a; border: 1px solid #4a5a6a; color: #7a9fd4; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 12px; margin-bottom: 10px; transition: all 0.2s;">Load Structure</button>
                    <div id="db-structure" style="background: #1f1f1f; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; max-height: 300px; overflow-y: auto; color: #999;">Click button to load...</div>
                </div>
            ` : '<p style="color: #666; padding: 20px;">Log in to view database information</p>'}
        `;
    }

    // ===== TAB: STORAGE =====
    function loadStorageTab(content) {
        console.log('💾 Loading storage tab...');
        const localStorageSize = new Blob(Object.values(localStorage)).size;
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #e5e5e5; font-size: 18px;">Local Storage</h2>
            
            <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #e5e5e5;">Info</h3>
                <div style="font-size: 13px; line-height: 1.6; color: #999;">
                    <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px;">
                        <span style="color: #666;">Items:</span><span>${localStorage.length}</span>
                        <span style="color: #666;">Size:</span><span>${(localStorageSize / 1024).toFixed(2)} KB</span>
                    </div>
                </div>
            </div>

            <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #e5e5e5;">Keys</h3>
                <div id="storage-keys" style="font-size: 12px;"></div>
            </div>

            <button onclick="window.debugActions.clearAllStorage()" style="width: 100%; padding: 10px; background: rgba(150, 80, 80, 0.3); border: 1px solid rgba(200, 100, 100, 0.5); color: #b8a0a0; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 12px; transition: all 0.2s;">Clear All Storage</button>
        `;

        const keysList = document.getElementById('storage-keys');
        const keys = Object.keys(localStorage);
        if (keys.length > 0) {
            keysList.innerHTML = keys.map(key => {
                const value = localStorage.getItem(key);
                const preview = value.length > 80 ? value.substring(0, 80) + '...' : value;
                return `
                    <div style="padding: 8px; background: #1f1f1f; border: 1px solid #3a3a3a; border-radius: 6px; margin-bottom: 6px;">
                        <div style="font-weight: 600; margin-bottom: 4px; color: #7a9fd4; font-size: 12px;">${key}</div>
                        <div style="font-family: monospace; font-size: 11px; color: #666; word-break: break-all; margin-bottom: 4px;">${preview}</div>
                        <div style="font-size: 10px; color: #555;">Size: ${(value.length / 1024).toFixed(2)} KB</div>
                    </div>
                `;
            }).join('');
        } else {
            keysList.innerHTML = '<p style="color: #555; text-align: center; padding: 12px; font-size: 12px;">No items</p>';
        }
    }

    // ===== TAB: CONSOLE =====
    function loadConsoleTab(content) {
        console.log('💻 Loading console tab...');
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #e5e5e5; font-size: 18px;">JavaScript Console</h2>
            
            <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #e5e5e5;">Execute Code</h3>
                <textarea id="console-input" placeholder="Enter JavaScript code..." style="width: 100%; height: 120px; background: #1f1f1f; border: 1px solid #3a3a3a; border-radius: 6px; padding: 10px; color: #e5e5e5; font-family: 'Courier New', monospace; font-size: 12px; resize: vertical;"></textarea>
                <button onclick="window.debugActions.executeCode()" style="width: 100%; padding: 10px; background: #3a4a5a; border: 1px solid #4a5a6a; color: #7a9fd4; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 12px; margin-top: 8px; transition: all 0.2s;">Execute</button>
            </div>

            <div style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #e5e5e5;">Output</h3>
                <div id="console-output" style="background: #1f1f1f; padding: 10px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 12px; min-height: 150px; white-space: pre-wrap; overflow-y: auto; color: #7a9fd4; line-height: 1.4;">Ready...</div>
            </div>
        `;
    }

    // ===== DEBUG ACTIONS =====
    window.debugActions = {
        // Run Diagnostic
        runDiagnostic: function() {
            const output = document.getElementById('diagnostic-output');
            output.innerHTML = '<p style="color: #7a9fd4;">Starting diagnostic...</p>';
            
            let log = '';
            
            function addLog(text, color = '#999') {
                log += `<div style="color: ${color}; margin: 2px 0; font-size: 12px;">${text}</div>`;
                output.innerHTML = log;
                output.scrollTop = output.scrollHeight;
            }
            
            addLog('Starting Leaderboard Diagnostic...', '#7a9fd4');
            addLog('─'.repeat(50), '#444');
            
            if (typeof firebase === 'undefined' || !firebase.database) {
                addLog('❌ Firebase not initialized', '#c0524d');
                return;
            }
            
            const database = firebase.database();
            const usersRef = database.ref('users');
            
            usersRef.once('value').then(snapshot => {
                const users = snapshot.val();
                
                if (!users) {
                    addLog('❌ No users found in database!', '#c0524d');
                    return;
                }
                
                addLog(`Found ${Object.keys(users).length} user(s)`, '#6db574');
                addLog('');
                
                let globalIssues = [];
                
                Object.entries(users).forEach(([uid, userData], index) => {
                    addLog('─'.repeat(50), '#333');
                    addLog(`USER ${index + 1}: ${userData.username || 'Unknown'}`, '#bba8a8');
                    
                    if (!userData.playtime || !userData.playtime.total) {
                        addLog('  ❌ Missing playtime data', '#c0524d');
                        globalIssues.push(`${userData.username}: No playtime`);
                        return;
                    }
                    
                    const totalGames = Object.keys(userData.playtime.total).length;
                    addLog(`  ✓ ${totalGames} game(s) tracked`, '#6db574');
                    
                    const reduceTotal = Object.values(userData.playtime.total)
                        .reduce((sum, seconds) => {
                            const num = Number(seconds);
                            return sum + (isNaN(num) ? 0 : num);
                        }, 0);
                    
                    const minutes = Math.floor(reduceTotal / 60);
                    addLog(`  Total: ${minutes} minutes`, reduceTotal > 0 ? '#7a9fd4' : '#997766');
                });
                
                addLog('');
                addLog('─'.repeat(50), '#333');
                
                if (globalIssues.length === 0) {
                    addLog('✓ No issues found', '#6db574');
                } else {
                    addLog(`Found ${globalIssues.length} issue(s):`, '#c0524d');
                    globalIssues.forEach(issue => {
                        addLog(`  • ${issue}`, '#bba8a8');
                    });
                }
                
                addLog('Done', '#7a9fd4');
                
            }).catch(error => {
                addLog(`ERROR: ${error.message}`, '#c0524d');
            });
        },
        
        // Firebase
        viewDatabaseStructure: function() {
            const output = document.getElementById('db-structure');
            const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            
            if (!user) {
                output.textContent = 'Not logged in';
                return;
            }
            
            output.textContent = 'Loading...';
            
            if (typeof database !== 'undefined') {
                database.ref(`users/${user.uid}`).once('value')
                    .then((snapshot) => {
                        const data = snapshot.val();
                        output.textContent = JSON.stringify(data, null, 2);
                    })
                    .catch((error) => {
                        output.textContent = `Error: ${error.message}`;
                    });
            }
        },
        
        // Storage
        clearLocalStorage: function() {
            if (confirm('Clear all localStorage? This cannot be undone.')) {
                localStorage.clear();
                loadStorageTab(document.getElementById('debug-content'));
            }
        },
        
        clearAllStorage: function() {
            if (confirm('Clear ALL data? This cannot be undone!')) {
                localStorage.clear();
                setTimeout(() => location.reload(), 1000);
            }
        },
        
        // Quick Actions
        exportData: function() {
            const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            if (!user) return;
            
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
                    })
                    .catch(() => {});
            }
        },
        
        reloadPage: function() {
            location.reload();
        },
        
        // Console
        executeCode: function() {
            const input = document.getElementById('console-input');
            const output = document.getElementById('console-output');
            
            if (!input || !output) return;
            
            const code = input.value.trim();
            if (!code) {
                output.textContent = 'No code';
                return;
            }
            
            try {
                const result = eval(code);
                output.textContent = JSON.stringify(result, null, 2);
            } catch (error) {
                output.textContent = `Error: ${error.message}`;
            }
        }
    };
    
    // ===== HELPER FUNCTIONS =====
    function formatPlaytime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }
    
    console.log('🐛 Debug System Loaded');
    console.log('💡 Type "debug" to activate');

})();