// AuthUI.js - UI Rendering & Modal Components (Redesigned)
(function() {
    // Inject CSS styles once
    const styleId = 'auth-ui-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            :root {
                --auth-primary: #667eea;
                --auth-primary-dark: #764ba2;
                --auth-success: #22c55e;
                --auth-success-dark: #16a34a;
                --auth-danger: #ef4444;
                --auth-warning: #fbbf24;
                --auth-warning-dark: #f59e0b;
                --auth-blue: #3b82f6;
                --auth-bg-dark: #1f2937;
                --auth-bg-darker: #111827;
                --auth-card-bg: rgba(255,255,255,0.05);
                --auth-border: rgba(255,255,255,0.1);
                --auth-text-primary: white;
                --auth-text-secondary: #888;
                --auth-radius: 12px;
                --auth-radius-lg: 16px;
                --auth-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            
            .auth-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(8px);
            }
            
            .auth-modal-content {
                background: linear-gradient(135deg, var(--auth-bg-dark) 0%, var(--auth-bg-darker) 100%);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                box-shadow: var(--auth-shadow);
                position: relative;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .auth-modal-content::-webkit-scrollbar {
                width: 8px;
            }
            
            .auth-modal-content::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.05);
                border-radius: 4px;
            }
            
            .auth-modal-content::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
            }
            
            .auth-modal-content::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.3);
            }
            
            .auth-profile-content {
                max-width: 1000px;
                width: 95%;
                padding: 48px;
            }
            
            .auth-close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(255,255,255,0.1);
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
            }
            
            .auth-close-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: rotate(90deg);
            }
            
            .auth-title {
                color: var(--auth-text-primary);
                margin-bottom: 30px;
                text-align: center;
                font-size: 28px;
                font-weight: 700;
            }
            
            .auth-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .auth-tab {
                flex: 1;
                padding: 12px;
                background: var(--auth-card-bg);
                border: 1px solid var(--auth-border);
                color: var(--auth-text-primary);
                border-radius: var(--auth-radius);
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s;
            }
            
            .auth-tab.active {
                background: rgba(59,130,246,0.2);
                border-color: var(--auth-blue);
                color: var(--auth-blue);
            }
            
            .auth-input {
                width: 100%;
                padding: 14px;
                margin-bottom: 15px;
                background: rgba(255,255,255,0.1);
                border: 1px solid var(--auth-border);
                border-radius: var(--auth-radius);
                color: var(--auth-text-primary);
                font-size: 16px;
                transition: all 0.2s;
            }
            
            .auth-input:focus {
                outline: none;
                border-color: var(--auth-blue);
                background: rgba(255,255,255,0.15);
            }
            
            .auth-input::placeholder {
                color: var(--auth-text-secondary);
            }
            
            .auth-btn {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, var(--auth-primary) 0%, var(--auth-primary-dark) 100%);
                border: none;
                color: var(--auth-text-primary);
                border-radius: var(--auth-radius);
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.2s;
            }
            
            .auth-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(102,126,234,0.4);
            }
            
            .auth-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .auth-btn-secondary {
                background: rgba(59,130,246,0.2);
                border: 1px solid var(--auth-blue);
                color: var(--auth-blue);
            }
            
            .auth-btn-danger {
                background: rgba(239,68,68,0.2);
                border: 1px solid var(--auth-danger);
                color: var(--auth-danger);
            }
            
            .auth-btn-success {
                background: linear-gradient(135deg, var(--auth-success) 0%, var(--auth-success-dark) 100%);
            }
            
            .auth-message {
                margin-top: 20px;
                padding: 12px;
                border-radius: var(--auth-radius);
                text-align: center;
                display: none;
                font-weight: 500;
            }
            
            .auth-message.error {
                background: rgba(239,68,68,0.2);
                color: var(--auth-danger);
                border: 1px solid var(--auth-danger);
            }
            
            .auth-message.success {
                background: rgba(34,197,94,0.2);
                color: var(--auth-success);
                border: 1px solid var(--auth-success);
            }
            
            .auth-guest-btn {
                width: 100%;
                padding: 14px;
                margin-top: 10px;
                background: none;
                border: none;
                color: var(--auth-text-secondary);
                cursor: pointer;
                font-size: 14px;
                text-decoration: underline;
            }
            
            .auth-guest-btn:hover {
                color: var(--auth-text-primary);
            }
            
            /* Profile Styles */
            .auth-profile-header {
                text-align: center;
                margin-bottom: 40px;
            }
            
            .auth-avatar {
                width: 120px;
                height: 120px;
                background: linear-gradient(135deg, var(--auth-primary) 0%, var(--auth-primary-dark) 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 60px;
                position: relative;
                box-shadow: 0 8px 24px rgba(102,126,234,0.4);
            }
            
            .auth-level-badge {
                position: absolute;
                bottom: -5px;
                right: -5px;
                background: linear-gradient(135deg, var(--auth-warning) 0%, var(--auth-warning-dark) 100%);
                border: 3px solid var(--auth-bg-darker);
                border-radius: 50%;
                width: 45px;
                height: 45px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 700;
                color: white;
                box-shadow: 0 4px 12px rgba(251,191,36,0.5);
            }
            
            .auth-username {
                font-size: 32px;
                margin-bottom: 8px;
                font-weight: 700;
                color: var(--auth-text-primary);
            }
            
            .auth-email {
                font-size: 16px;
                color: var(--auth-text-secondary);
                margin-bottom: 12px;
            }
            
            .auth-level-info {
                font-size: 14px;
                color: var(--auth-blue);
                font-weight: 600;
            }
            
            .auth-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            
            .auth-stat-card {
                background: var(--auth-card-bg);
                border: 1px solid var(--auth-border);
                border-radius: var(--auth-radius-lg);
                padding: 24px;
                text-align: center;
                transition: all 0.3s;
            }
            
            .auth-stat-card:hover {
                transform: translateY(-4px);
                box-shadow: var(--auth-shadow);
            }
            
            .auth-stat-card.blue {
                background: rgba(59,130,246,0.1);
                border-color: rgba(59,130,246,0.3);
            }
            
            .auth-stat-card.green {
                background: rgba(34,197,94,0.1);
                border-color: rgba(34,197,94,0.3);
            }
            
            .auth-stat-card.yellow {
                background: rgba(251,191,36,0.1);
                border-color: rgba(251,191,36,0.3);
            }
            
            .auth-stat-value {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
            }
            
            .auth-stat-card.blue .auth-stat-value {
                color: var(--auth-blue);
            }
            
            .auth-stat-card.green .auth-stat-value {
                color: var(--auth-success);
            }
            
            .auth-stat-card.yellow .auth-stat-value {
                color: var(--auth-warning);
            }
            
            .auth-stat-label {
                font-size: 13px;
                color: var(--auth-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .auth-section {
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--auth-border);
                border-radius: var(--auth-radius-lg);
                padding: 24px;
                margin-bottom: 24px;
            }
            
            .auth-section-title {
                margin: 0 0 20px 0;
                font-size: 16px;
                color: var(--auth-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
            }
            
            .auth-activity-item {
                padding: 16px;
                background: rgba(255,255,255,0.03);
                border-radius: var(--auth-radius);
                margin-bottom: 12px;
                transition: all 0.2s;
            }
            
            .auth-activity-item:hover {
                background: rgba(255,255,255,0.06);
                transform: translateX(4px);
            }
            
            .auth-activity-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .auth-activity-date {
                font-size: 14px;
                color: var(--auth-text-secondary);
            }
            
            .auth-activity-time {
                font-size: 14px;
                font-weight: 600;
                color: var(--auth-blue);
            }
            
            .auth-activity-games {
                font-size: 13px;
                color: #666;
            }
            
            .auth-achievements-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 12px;
            }
            
            .auth-achievement {
                background: var(--auth-card-bg);
                border: 1px solid var(--auth-border);
                border-radius: var(--auth-radius);
                padding: 16px;
                text-align: center;
                transition: all 0.3s;
            }
            
            .auth-achievement.unlocked {
                background: rgba(251,191,36,0.1);
                border-color: rgba(251,191,36,0.3);
            }
            
            .auth-achievement.unlocked:hover {
                transform: translateY(-4px) scale(1.05);
                box-shadow: 0 8px 20px rgba(251,191,36,0.3);
            }
            
            .auth-achievement.locked {
                opacity: 0.5;
            }
            
            .auth-achievement-icon {
                font-size: 36px;
                margin-bottom: 8px;
            }
            
            .auth-achievement.locked .auth-achievement-icon {
                filter: grayscale(100%);
            }
            
            .auth-achievement-name {
                font-size: 13px;
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .auth-achievement.unlocked .auth-achievement-name {
                color: var(--auth-warning);
            }
            
            .auth-achievement.locked .auth-achievement-name {
                color: var(--auth-text-secondary);
            }
            
            .auth-achievement-desc {
                font-size: 11px;
                color: #666;
            }
            
            .auth-empty-state {
                color: #666;
                font-size: 14px;
                padding: 24px;
                text-align: center;
            }
            
            @media (max-width: 768px) {
                .auth-modal-content {
                    padding: 24px;
                }
                
                .auth-profile-content {
                    padding: 24px;
                }
                
                .auth-stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .auth-achievements-grid {
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    window.AuthUI = {
        showModal() {
            const core = window.AuthCore;
            if (typeof auth !== 'undefined' && auth.currentUser && !core.currentUser) {
                core.currentUser = auth.currentUser;
                if (!core.currentUsername) {
                    database.ref('users/' + core.currentUser.uid + '/username').once('value')
                        .then((snapshot) => {
                            core.currentUsername = snapshot.val();
                            core.updateUI();
                            this.showModalUI();
                        })
                        .catch(() => this.showModalUI());
                    return;
                }
            }
            this.showModalUI();
        },
        
        showModalUI() {
            let modal = document.getElementById('auth-modal');
            
            if (modal) {
                modal.style.display = 'flex';
                this.renderContent();
                return;
            }
            
            modal = document.createElement('div');
            modal.id = 'auth-modal';
            modal.className = 'auth-modal';
            
            const isProfile = window.AuthCore.currentUser;
            const content = document.createElement('div');
            content.className = isProfile ? 'auth-modal-content auth-profile-content' : 'auth-modal-content';
            
            const closeBtn = document.createElement('button');
            closeBtn.id = 'close-auth-modal';
            closeBtn.className = 'auth-close-btn';
            closeBtn.innerHTML = '×';
            
            const title = document.createElement('h2');
            title.className = 'auth-title';
            title.textContent = isProfile ? '👤 Account' : '🔓 Sign In';
            
            const authContent = document.createElement('div');
            authContent.id = 'auth-content';
            
            const message = document.createElement('div');
            message.id = 'auth-message';
            message.className = 'auth-message';
            
            content.appendChild(closeBtn);
            content.appendChild(title);
            content.appendChild(authContent);
            content.appendChild(message);
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            closeBtn.addEventListener('click', () => modal.style.display = 'none');
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
            
            this.renderContent();
        },
        
        renderContent() {
            const content = document.getElementById('auth-content');
            window.AuthCore.currentUser ? this.renderAccount(content) : this.renderAuth(content);
        },
        
        renderAuth(content) {
            content.innerHTML = `
                <div class="auth-tabs">
                    <button id="tab-signin" class="auth-tab active">Sign In</button>
                    <button id="tab-signup" class="auth-tab">Sign Up</button>
                </div>
                <div id="signin-form">
                    <input type="text" id="signin-username-email" placeholder="Username or Email" class="auth-input">
                    <input type="password" id="signin-password" placeholder="Password" class="auth-input">
                    <button id="login-btn" class="auth-btn">Sign In</button>
                </div>
                <div id="signup-form" style="display:none">
                    <input type="text" id="signup-username" placeholder="Username (3-16 characters)" class="auth-input">
                    <input type="email" id="signup-email" placeholder="Email" class="auth-input">
                    <input type="password" id="signup-password" placeholder="Password (6+ characters)" class="auth-input">
                    <button id="signup-btn" class="auth-btn">Create Account</button>
                </div>
                <button id="guest-btn" class="auth-guest-btn">Continue as Guest</button>
            `;
            
            document.getElementById('tab-signin').addEventListener('click', () => this.switchTab('signin'));
            document.getElementById('tab-signup').addEventListener('click', () => this.switchTab('signup'));
            document.getElementById('login-btn').addEventListener('click', () => this.handleSignIn());
            document.getElementById('signup-btn').addEventListener('click', () => this.handleSignUp());
            document.getElementById('guest-btn').addEventListener('click', () => document.getElementById('auth-modal').style.display = 'none');
            
            document.getElementById('signin-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleSignIn(); });
            document.getElementById('signup-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleSignUp(); });
        },
        
        switchTab(tab) {
            const tabs = document.querySelectorAll('.auth-tab');
            tabs.forEach(t => t.classList.remove('active'));
            
            if (tab === 'signin') {
                document.getElementById('tab-signin').classList.add('active');
                document.getElementById('signin-form').style.display = 'block';
                document.getElementById('signup-form').style.display = 'none';
            } else {
                document.getElementById('tab-signup').classList.add('active');
                document.getElementById('signin-form').style.display = 'none';
                document.getElementById('signup-form').style.display = 'block';
            }
        },
        
        async handleSignIn() {
            const usernameOrEmail = document.getElementById('signin-username-email').value.trim();
            const password = document.getElementById('signin-password').value;
            
            try {
                await window.AuthCore.signIn(usernameOrEmail, password);
                this.showMessage('Successfully signed in!');
                setTimeout(() => document.getElementById('auth-modal').style.display = 'none', 1500);
            } catch (error) {
                this.showMessage(error.message, true);
            }
        },
        
        async handleSignUp() {
            const username = document.getElementById('signup-username').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            
            const btn = document.getElementById('signup-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Creating Account...';
            btn.disabled = true;
            
            try {
                const newUsername = await window.AuthCore.signUp(username, email, password);
                this.showMessage('Account created successfully! Welcome, @' + newUsername + '!');
                setTimeout(() => document.getElementById('auth-modal').style.display = 'none', 2000);
            } catch (error) {
                let msg = error.message;
                if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered. Try signing in instead.';
                else if (error.code === 'auth/invalid-email') msg = 'Invalid email address format.';
                else if (error.code === 'auth/weak-password') msg = 'Password is too weak. Use at least 6 characters.';
                this.showMessage(msg, true);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        },
        
        async renderAccount(content) {
            content.innerHTML = `
                <div class="auth-profile-header">
                    <div class="auth-avatar">👤</div>
                    <p class="auth-username">@${window.AuthCore.currentUsername}</p>
                    <p class="auth-email">${window.AuthCore.currentUser?.email || 'No email'}</p>
                    <div style="color:#888;padding:20px">Loading stats...</div>
                </div>
            `;
            
            try {
                const userData = await window.AuthCore.getUserStats();
                const stats = window.AuthCore.calculateStats(userData);
                const achievements = window.AuthCore.calculateAchievements(userData, stats);
                const activity = window.AuthCore.getRecentActivity(userData);
                
                content.innerHTML = `
                    <div class="auth-profile-header">
                        <div class="auth-avatar">
                            👤
                            ${stats.level > 1 ? `<div class="auth-level-badge">${stats.level}</div>` : ''}
                        </div>
                        <p class="auth-username">@${window.AuthCore.currentUsername}</p>
                        <p class="auth-email">${window.AuthCore.currentUser?.email}</p>
                        <p class="auth-level-info">Level ${stats.level} • ${stats.title}</p>
                    </div>
                    
                    <div class="auth-stats-grid">
                        <div class="auth-stat-card blue">
                            <div class="auth-stat-value">${stats.totalPlaytimeFormatted}</div>
                            <div class="auth-stat-label">Total Playtime</div>
                        </div>
                        <div class="auth-stat-card green">
                            <div class="auth-stat-value">${stats.gamesPlayed}</div>
                            <div class="auth-stat-label">Games Played</div>
                        </div>
                        <div class="auth-stat-card yellow">
                            <div class="auth-stat-value">${achievements.unlockedCount}/${achievements.total}</div>
                            <div class="auth-stat-label">Achievements</div>
                        </div>
                    </div>
                    
                    <div class="auth-section">
                        <h3 class="auth-section-title">📊 Recent Activity</h3>
                        ${activity.length ? activity.map(a => `
                            <div class="auth-activity-item">
                                <div class="auth-activity-header">
                                    <span class="auth-activity-date">${a.date}</span>
                                    <span class="auth-activity-time">${a.time}</span>
                                </div>
                                <div class="auth-activity-games">${a.gamesCount} game${a.gamesCount !== 1 ? 's' : ''} played</div>
                            </div>
                        `).join('') : '<div class="auth-empty-state">No recent activity</div>'}
                    </div>
                    
                    <div class="auth-section">
                        <h3 class="auth-section-title">🏆 Achievements</h3>
                        <div class="auth-achievements-grid">
                            ${achievements.list.map(a => `
                                <div class="auth-achievement ${a.unlocked ? 'unlocked' : 'locked'}">
                                    <div class="auth-achievement-icon">${a.icon}</div>
                                    <div class="auth-achievement-name">${a.name}</div>
                                    <div class="auth-achievement-desc">${a.description}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <button id="change-username-btn" class="auth-btn auth-btn-secondary" style="margin-bottom:12px">Change Username</button>
                    <button id="sign-out-btn" class="auth-btn auth-btn-danger">Sign Out</button>
                `;
                
                this.attachAccountListeners();
            } catch (error) {
                content.innerHTML = `
                    <div class="auth-profile-header">
                        <div class="auth-avatar">👤</div>
                        <p class="auth-username">@${window.AuthCore.currentUsername}</p>
                        <p class="auth-email">${window.AuthCore.currentUser?.email}</p>
                    </div>
                    <button id="change-username-btn" class="auth-btn auth-btn-secondary" style="margin-bottom:12px">Change Username</button>
                    <button id="sign-out-btn" class="auth-btn auth-btn-danger">Sign Out</button>
                `;
                this.attachAccountListeners();
            }
        },
        
        attachAccountListeners() {
            const changeBtn = document.getElementById('change-username-btn');
            const signOutBtn = document.getElementById('sign-out-btn');
            
            if (changeBtn) changeBtn.addEventListener('click', () => this.showChangeUsername());
            if (signOutBtn) signOutBtn.addEventListener('click', () => this.handleSignOut());
        },
        
        showChangeUsername() {
            const content = document.getElementById('auth-content');
            content.innerHTML = `
                <div style="text-align:center;color:white">
                    <h3 style="margin-bottom:20px;font-size:20px">Change Username</h3>
                    <p style="color:#888;font-size:14px;margin-bottom:20px">Current: @${window.AuthCore.currentUsername}</p>
                    <input type="text" id="new-username" placeholder="New Username" class="auth-input">
                    <button id="confirm-change-btn" class="auth-btn auth-btn-success" style="margin-bottom:10px">Change Username</button>
                    <button id="cancel-change-btn" class="auth-btn auth-btn-secondary">Cancel</button>
                </div>
            `;
            
            document.getElementById('confirm-change-btn').addEventListener('click', () => this.handleChangeUsername());
            document.getElementById('cancel-change-btn').addEventListener('click', () => this.renderContent());
        },
        
        async handleChangeUsername() {
            const newUsername = document.getElementById('new-username').value.trim();
            
            try {
                await window.AuthCore.changeUsername(newUsername);
                this.showMessage('Username changed successfully!');
                setTimeout(() => this.renderContent(), 1500);
            } catch (error) {
                this.showMessage(error.message, true);
            }
        },
        
        async handleSignOut() {
            try {
                await window.AuthCore.signOut();
                this.showMessage('Signed out successfully');
                setTimeout(() => {
                    document.getElementById('auth-modal').style.display = 'none';
                    this.renderContent();
                }, 1500);
            } catch (error) {
                this.showMessage(error.message, true);
            }
        },
        
        showMessage(message, isError = false) {
            const msgDiv = document.getElementById('auth-message');
            msgDiv.textContent = message;
            msgDiv.className = 'auth-message ' + (isError ? 'error' : 'success');
            msgDiv.style.display = 'block';
            setTimeout(() => msgDiv.style.display = 'none', 4000);
        },
        
        addNavButton() {
            const navBar = document.querySelector('.nav-bar');
            addNavButton() {
            const navBar = document.querySelector('.nav-bar');
            if (!navBar || document.getElementById('auth-nav-btn')) return;
            
            const authItem = document.createElement('div');
            authItem.className = 'nav-item';
            authItem.id = 'auth-nav-btn';
            authItem.innerHTML = '<div class="auth-button" style="font-size:20px;cursor:pointer">🔓</div><span class="nav-label">Account</span>';
            authItem.addEventListener('click', () => this.showModal());
            navBar.appendChild(authItem);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.AuthUI.addNavButton());
    } else {
        window.AuthUI.addNavButton();
    }
})();