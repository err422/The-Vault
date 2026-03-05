// Account.js - CORRECTED VERSION - Enhanced Account Page Logic with Leaderboard & Charts
const savedTheme = localStorage.getItem('vaultTheme') || 'default';
document.body.classList.add(`theme-${savedTheme}`);

(function() {
    const AccountPage = {
        currentUser: null,
        currentUsername: null,
        
        init() {
            console.log('🎨 Initializing Enhanced Account Page...');
            this.checkAuthState();
        },
        
        checkAuthState() {
            if (typeof auth === 'undefined') {
                console.error('❌ Firebase auth not loaded');
                this.renderError('Firebase not initialized');
                return;
            }
            
            auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                
                if (user) {
                    this.loadUserData();
                } else {
                    this.renderAuthForms();
                }
            });
        },
        
        async loadUserData() {
            const content = document.getElementById('account-content');
            
            // Show loading
            content.innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p style="margin-top: 20px; color: #888;">Loading your profile...</p>
                </div>
            `;
            
            try {
                // Get username first
                const usernameSnap = await database.ref(`users/${this.currentUser.uid}/username`).once('value');
                this.currentUsername = usernameSnap.val();
                
                // Get full user data
                const snapshot = await database.ref(`users/${this.currentUser.uid}`).once('value');
                const userData = snapshot.val();
                
                // Calculate stats
                const stats = this.calculateStats(userData);
                const achievements = this.calculateAchievements(userData, stats);
                
                // Render account view
                await this.renderAccountView(stats, achievements, userData);
                
            } catch (error) {
                console.error('❌ Error loading user data:', error);
                this.renderError('Failed to load profile data');
            }
        },
        
        async renderAccountView(stats, achievements, userData) {
            const content = document.getElementById('account-content');
            
            // Generate the playtime chart and leaderboard HTML
            const playtimeChartHTML = await this.renderPlaytimeChart(userData);
            const leaderboardHTML = await this.renderLeaderboard(this.currentUser.uid);
            
            content.innerHTML = `
                <!-- Profile Header -->
                <div class="profile-header">
                    <div class="profile-avatar">
                        👤
                        ${stats.level > 1 ? `<div class="level-badge">${stats.level}</div>` : ''}
                    </div>
                    
                    <h2 class="profile-username">@${this.currentUsername}</h2>
                    <p class="profile-email">${this.currentUser.email}</p>
                    <div class="profile-title">Level ${stats.level} • ${stats.title}</div>
                    
                    <!-- XP Progress Bar -->
                    <div class="xp-bar-container">
                        <div class="xp-bar">
                            <div class="xp-fill" style="width: ${stats.xpProgress}%">
                                <div class="xp-shimmer"></div>
                            </div>
                        </div>
                        <div class="xp-text">
                            <span>Level ${stats.level}</span>
                            <span>${Math.floor(stats.xpProgress)}% to Level ${stats.level + 1}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-value">${stats.totalPlaytimeFormatted}</div>
                        <div class="stat-label">Total Playtime</div>
                    </div>
                    
                    <div class="stat-card success">
                        <div class="stat-icon">🎮</div>
                        <div class="stat-value">${stats.gamesPlayed}</div>
                        <div class="stat-label">Games Played</div>
                    </div>
                    
                    <div class="stat-card warning">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-value">${achievements.unlockedCount}/${achievements.total}</div>
                        <div class="stat-label">Achievements</div>
                    </div>
                    
                    ${stats.favoriteGame.name !== 'None' ? `
                        <div class="stat-card purple">
                            <div class="stat-icon">👑</div>
                            <div class="stat-value">${stats.favoriteGame.name}</div>
                            <div class="stat-label">Most Played Game</div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Playtime Chart - Last 7 Days -->
                <div class="section">
                    <h3 class="section-title">
                        <span>📊</span> Last 7 Days
                    </h3>
                    ${playtimeChartHTML}
                </div>
                
                <!-- Leaderboard -->
                <div class="section">
                    <h3 class="section-title">
                        <span>🏆</span> Top Players
                    </h3>
                    ${leaderboardHTML}
                </div>
                
                <!-- Achievements -->
                <div class="section">
                    <h3 class="section-title">
                        <span>🏆</span> Achievements
                    </h3>
                    <div class="achievements-grid">
                        ${achievements.list.map(achievement => `
                            <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                                <div class="achievement-icon">${achievement.icon}</div>
                                <div class="achievement-name">${achievement.name}</div>
                                <div class="achievement-description">${achievement.description}</div>
                                <div class="achievement-badge">${achievement.unlocked ? '✨' : '🔒'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button class="btn btn-primary" id="change-username-btn">
                        <span>✏️</span> Change Username
                    </button>
                    <button class="btn btn-danger" id="sign-out-btn">
                        <span>🚪</span> Sign Out
                    </button>
                </div>
            `;
            
            // Attach event listeners
            this.attachEventListeners();
        },
        
        async renderPlaytimeChart(userData) {
            if (!userData.playtime || !userData.playtime.daily) {
                return `
                    <div style="text-align: center; padding: 60px 20px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📊</div>
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #888;">No playtime data yet</div>
                        <div style="font-size: 14px;">Start playing some games to see your activity here!</div>
                    </div>
                `;
            }
            
            const days = [];
            const dayLabels = [];
            const playtimeData = [];
            
            // Get last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                
                days.push(dateStr);
                dayLabels.push(dayName);
                
                let totalMinutes = 0;
                if (userData.playtime.daily[dateStr]) {
                    const seconds = Object.values(userData.playtime.daily[dateStr])
                        .reduce((sum, s) => sum + Number(s), 0);
                    totalMinutes = Math.floor(seconds / 60);
                }
                playtimeData.push(totalMinutes);
            }
            
            const maxMinutes = Math.max(...playtimeData, 1);
            
            let html = `
                <div style="
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 24px;
                ">
                    <div style="
                        display: flex;
                        align-items: flex-end;
                        justify-content: space-around;
                        height: 300px;
                        gap: 12px;
                        margin-bottom: 20px;
                        padding: 40px 10px 0 10px;
                    ">
            `;
            
            playtimeData.forEach((minutes, index) => {
                let heightPercent;
                if (minutes === 0) {
                    heightPercent = 0;
                } else {
                    heightPercent = (minutes / maxMinutes) * 95;
                }
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                
                html += `
                    <div style="
                        flex: 1;
                        max-width: 100px;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-end;
                        position: relative;
                    ">
                        ${minutes > 0 ? `
                            <div style="
                                position: absolute;
                                bottom: 100%;
                                left: 50%;
                                transform: translateX(-50%);
                                margin-bottom: 8px;
                                font-size: 12px;
                                color: #667eea;
                                white-space: nowrap;
                                font-weight: 700;
                                background: rgba(0,0,0,0.7);
                                padding: 4px 8px;
                                border-radius: 6px;
                                border: 1px solid rgba(102, 126, 234, 0.3);
                            ">${minutes}m</div>
                        ` : ''}
                        <div style="
                            width: 100%;
                            background: linear-gradient(180deg, #764ba2 0%, #667eea 100%);
                            border-radius: 8px 8px 0 0;
                            height: ${heightPercent}%;
                            min-height: ${minutes > 0 ? '30px' : '0px'};
                            position: relative;
                            transition: all 0.3s ease;
                            box-shadow: ${minutes > 0 ? '0 4px 20px rgba(102, 126, 234, 0.5), 0 0 40px rgba(102, 126, 234, 0.3)' : 'none'};
                            opacity: ${minutes > 0 ? '1' : '0.15'};
                        " title="${timeStr}"></div>
                        <div style="
                            font-size: 13px;
                            color: ${minutes > 0 ? '#aaa' : '#666'};
                            margin-top: 12px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">${dayLabels[index]}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
            `;
            
            // Calculate total for the week
            const totalMinutes = playtimeData.reduce((sum, m) => sum + m, 0);
            const totalHours = Math.floor(totalMinutes / 60);
            const totalMins = totalMinutes % 60;
            const totalStr = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;
            
            html += `
                    <div style="
                        padding: 14px 20px;
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
                        border: 1px solid rgba(102, 126, 234, 0.4);
                        border-radius: 12px;
                        text-align: center;
                        font-size: 15px;
                    ">
                        <span style="color: #aaa; font-weight: 500;">Total this week:</span>
                        <span style="color: #667eea; font-weight: 700; margin-left: 10px; font-size: 18px;">${totalStr}</span>
                    </div>
                </div>
            `;
            
            return html;
        },
        
        async renderLeaderboard(currentUserId) {
            try {
                const snapshot = await database.ref('users').once('value');
                const users = snapshot.val();
                
                if (!users) {
                    return `
                        <div style="text-align: center; padding: 60px 20px; color: #666;">
                            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🏆</div>
                            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #888;">No players yet</div>
                            <div style="font-size: 14px;">Be the first to play!</div>
                        </div>
                    `;
                }
                
                // Build leaderboard
                const leaderboard = Object.entries(users).map(([uid, userData]) => {
                    let totalPlaytime = 0;
                    if (userData.playtime && userData.playtime.total) {
                        totalPlaytime = Object.values(userData.playtime.total).reduce((sum, seconds) => {
                            const num = Number(seconds);
                            return sum + (isNaN(num) ? 0 : num);
                        }, 0);
                    }
                    return {
                        uid,
                        username: userData.username || 'Unknown',
                        totalPlaytime
                    };
                }).sort((a, b) => b.totalPlaytime - a.totalPlaytime).slice(0, 5);
                
                if (leaderboard.every(user => user.totalPlaytime === 0)) {
                    return `
                        <div style="text-align: center; padding: 60px 20px; color: #666;">
                            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🎮</div>
                            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #888;">No playtime recorded yet</div>
                            <div style="font-size: 14px;">Start playing some games!</div>
                        </div>
                    `;
                }
                
                let html = '<div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px;">';
                
                leaderboard.forEach((user, index) => {
                    const isCurrentUser = user.uid === currentUserId;
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    const hours = Math.floor(user.totalPlaytime / 3600);
                    const minutes = Math.floor((user.totalPlaytime % 3600) / 60);
                    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                    
                    const bgColor = isCurrentUser 
                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))' 
                        : index < 3 
                            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15))' 
                            : 'rgba(255,255,255,0.05)';
                    
                    const borderColor = isCurrentUser 
                        ? 'rgba(102, 126, 234, 0.5)' 
                        : index < 3 
                            ? 'rgba(251, 191, 36, 0.3)' 
                            : 'rgba(255,255,255,0.1)';
                    
                    html += `
                        <div style="
                            background: ${bgColor};
                            border: 1px solid ${borderColor};
                            border-radius: 10px;
                            padding: 14px 16px;
                            margin-bottom: 10px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            transition: all 0.2s ease;
                            ${isCurrentUser ? 'box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);' : ''}
                        ">
                            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                                <span style="font-size: 24px; flex-shrink: 0;">${medal}</span>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="
                                        font-weight: 700;
                                        font-size: 16px;
                                        color: ${isCurrentUser ? '#667eea' : '#fff'};
                                        overflow: hidden;
                                        text-overflow: ellipsis;
                                        white-space: nowrap;
                                    ">
                                        @${user.username}${isCurrentUser ? ' (You)' : ''}
                                    </div>
                                </div>
                            </div>
                            <div style="
                                font-size: 15px;
                                font-weight: 700;
                                color: ${index < 3 ? '#fbbf24' : '#888'};
                                flex-shrink: 0;
                                margin-left: 12px;
                            ">
                                ${timeStr}
                            </div>
                        </div>
                    `;
                });
                
                // Check if current user is in top 5
                const currentUserInTop5 = leaderboard.some(u => u.uid === currentUserId);
                
                if (!currentUserInTop5) {
                    // Get all users and find current user's rank
                    const allUsers = Object.entries(users).map(([uid, userData]) => {
                        let totalPlaytime = 0;
                        if (userData.playtime && userData.playtime.total) {
                            totalPlaytime = Object.values(userData.playtime.total)
                                .reduce((sum, seconds) => sum + Number(seconds), 0);
                        }
                        return { uid, username: userData.username, totalPlaytime };
                    }).sort((a, b) => b.totalPlaytime - a.totalPlaytime);
                    
                    const currentUserRank = allUsers.findIndex(u => u.uid === currentUserId) + 1;
                    const currentUserData = allUsers.find(u => u.uid === currentUserId);
                    
                    if (currentUserData && currentUserData.totalPlaytime > 0) {
                        const hours = Math.floor(currentUserData.totalPlaytime / 3600);
                        const minutes = Math.floor((currentUserData.totalPlaytime % 3600) / 60);
                        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                        
                        html += `
                            <div style="
                                margin-top: 16px;
                                padding: 14px 16px;
                                background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
                                border: 1px solid rgba(102, 126, 234, 0.5);
                                border-radius: 10px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
                            ">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 20px;">#{currentUserRank}</span>
                                    <div style="font-weight: 700; font-size: 16px; color: #667eea;">
                                        @${currentUserData.username} (You)
                                    </div>
                                </div>
                                <div style="font-size: 15px; font-weight: 700; color: #667eea;">
                                    ${timeStr}
                                </div>
                            </div>
                        `;
                    }
                }
                
                html += '</div>';
                
                return html;
                
            } catch (error) {
                console.error('Error loading leaderboard:', error);
                return `
                    <div style="text-align: center; padding: 40px 20px; color: #ef4444;">
                        <div style="font-size: 40px; margin-bottom: 12px;">😕</div>
                        <div style="font-size: 14px;">Error loading leaderboard</div>
                    </div>
                `;
            }
        },
        
        attachEventListeners() {
            const changeBtn = document.getElementById('change-username-btn');
            const signOutBtn = document.getElementById('sign-out-btn');
            
            if (changeBtn) {
                changeBtn.addEventListener('click', () => this.showChangeUsernameForm());
            }
            
            if (signOutBtn) {
                signOutBtn.addEventListener('click', async () => {
                    try {
                        await auth.signOut();
                        window.location.href = 'index.html';
                    } catch (error) {
                        console.error('Sign out error:', error);
                    }
                });
            }
        },
        
        showChangeUsernameForm() {
            const content = document.getElementById('account-content');
            
            content.innerHTML = `
                <div class="auth-container">
                    <div class="auth-header">
                        <h2 class="auth-title">Change Username</h2>
                        <p class="auth-subtitle">Choose a new username for your account</p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Current Username</label>
                        <div style="padding: 16px; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 12px; color: #667eea; font-weight: 600;">
                            @${this.currentUsername}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">New Username</label>
                        <input type="text" class="form-input" id="new-username" placeholder="Enter new username" />
                    </div>
                    
                    <div class="form-error" id="change-error"></div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-primary" id="cancel-change-btn">
                            <span>❌</span> Cancel
                        </button>
                        <button class="btn btn-primary" id="confirm-change-btn">
                            <span>✅</span> Change Username
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('cancel-change-btn').addEventListener('click', () => {
                this.loadUserData();
            });
            
            document.getElementById('confirm-change-btn').addEventListener('click', async () => {
                const newUsername = document.getElementById('new-username').value.trim();
                const errorDiv = document.getElementById('change-error');
                const btn = document.getElementById('confirm-change-btn');
                
                errorDiv.textContent = '';
                btn.textContent = 'Changing...';
                btn.disabled = true;
                
                try {
                    await window.AuthCore.changeUsername(newUsername);
                    this.currentUsername = newUsername;
                    this.loadUserData();
                } catch (error) {
                    errorDiv.textContent = error.message;
                    btn.innerHTML = '<span>✅</span> Change Username';
                    btn.disabled = false;
                }
            });
            
            document.getElementById('new-username').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('confirm-change-btn').click();
                }
            });
        },
        
        renderAuthForms() {
            const content = document.getElementById('account-content');
            
            content.innerHTML = `
                <div class="auth-container">
                    <div class="auth-header">
                        <h2 class="auth-title">Welcome to The Vault</h2>
                        <p class="auth-subtitle">Sign in to track your progress and achievements</p>
                    </div>
                    
                    <!-- Tabs -->
                    <div class="auth-tabs">
                        <button class="auth-tab active" id="tab-signin">Sign In</button>
                        <button class="auth-tab" id="tab-signup">Sign Up</button>
                    </div>
                    
                    <!-- Sign In Form -->
                    <div id="signin-form">
                        <div class="form-group">
                            <label class="form-label">Username or Email</label>
                            <input type="text" class="form-input" id="signin-username" placeholder="Enter username or email" />
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" id="signin-password" placeholder="Enter password" />
                        </div>
                        
                        <div class="form-error" id="signin-error"></div>
                        
                        <button class="form-button" id="signin-btn">Sign In</button>
                    </div>
                    
                    <!-- Sign Up Form -->
                    <div id="signup-form" style="display: none;">
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-input" id="signup-username" placeholder="Choose a username" />
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="signup-email" placeholder="Enter your email" />
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" id="signup-password" placeholder="Create a password" />
                        </div>
                        
                        <!-- FIXED: Moved ToS checkbox INSIDE signup form -->
                        <div class="form-group tos-group">
                            <label style="display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#aaa;cursor:pointer;">
                                <input type="checkbox" id="signup-tos" style="margin-top:4px;">
                                <span>
                                    I agree to the 
                                    <a href="tos.html" target="_blank" style="color:#667eea;text-decoration:underline;">
                                        Terms of Service
                                    </a>
                                </span>
                            </label>
                        </div>
                        
                        <div class="form-error" id="signup-error"></div>
                        
                        <button class="form-button" id="signup-btn">Create Account</button>
                    </div>
                </div>
            `;
            
            this.attachAuthFormListeners();
        },
        
        attachAuthFormListeners() {
            const tabSignIn = document.getElementById('tab-signin');
            const tabSignUp = document.getElementById('tab-signup');
            const signInForm = document.getElementById('signin-form');
            const signUpForm = document.getElementById('signup-form');
            
            tabSignIn.addEventListener('click', () => {
                tabSignIn.classList.add('active');
                tabSignUp.classList.remove('active');
                signInForm.style.display = 'block';
                signUpForm.style.display = 'none';
            });
            
            tabSignUp.addEventListener('click', () => {
                tabSignUp.classList.add('active');
                tabSignIn.classList.remove('active');
                signUpForm.style.display = 'block';
                signInForm.style.display = 'none';
            });
            
            // Sign In
            document.getElementById('signin-btn').addEventListener('click', () => this.handleSignIn());
            document.getElementById('signin-password').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSignIn();
            });
            
            // Sign Up
            document.getElementById('signup-btn').addEventListener('click', () => this.handleSignUp());
            document.getElementById('signup-password').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSignUp();
            });
        },
        
        async handleSignIn() {
            const username = document.getElementById('signin-username').value.trim();
            const password = document.getElementById('signin-password').value;
            const errorDiv = document.getElementById('signin-error');
            const btn = document.getElementById('signin-btn');
            
            errorDiv.textContent = '';
            btn.textContent = 'Signing in...';
            btn.disabled = true;
            
            try {
                await window.AuthCore.signIn(username, password);
            } catch (error) {
                errorDiv.textContent = error.message;
                btn.textContent = 'Sign In';
                btn.disabled = false;
            }
        },
        
        async handleSignUp() {
            const username = document.getElementById('signup-username').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const tosChecked = document.getElementById('signup-tos')?.checked;
            const errorDiv = document.getElementById('signup-error');
            const btn = document.getElementById('signup-btn');
            
            if (!tosChecked) {
                errorDiv.textContent = 'You must agree to the Terms of Service.';
                return;
            }
            
            errorDiv.textContent = '';
            btn.textContent = 'Creating account...';
            btn.disabled = true;
            
            try {
                await window.AuthCore.signUp(username, email, password);
            } catch (error) {
                errorDiv.textContent = error.message;
                btn.textContent = 'Create Account';
                btn.disabled = false;
            }
        },
        
        function xpRequiredForLevel(level, prestige) {
            const baseXP = 1200;
            const growthRate = 1.087;

            const prestigeMultiplier = 1 + (prestige * 0.15); // 15% harder per prestige

            return Math.floor(
                baseXP *
                Math.pow(growthRate, level - 1) *
                prestigeMultiplier
            );
        }
            
            function totalXpForLevel(level) {
                let total = 0;
                for (let i = 1; i < level; i++) {
                    total += xpRequiredForLevel(i);
                }
                return total;
            }
            
            let totalPlaytime = 0;
            let gamesPlayed = 0;
            let favoriteGame = { name: 'None', time: 0 };
            
            if (userData.playtime && userData.playtime.total) {
                const games = userData.playtime.total;
                gamesPlayed = Object.keys(games).length;
                
                Object.entries(games).forEach(([game, seconds]) => {
                    const time = Number(seconds) || 0;
                    totalPlaytime += time;
                    
                    if (time > favoriteGame.time) {
                        favoriteGame = { name: game, time: time };
                    }
                });
            }
            
            let level = 1;
            while (totalPlaytime >= totalXpForLevel(level + 1)) {
                level++;
            }
            
            const currentLevelXP = totalXpForLevel(level);
            const nextLevelXP = totalXpForLevel(level + 1);
            const progressXP = Math.max(0, totalPlaytime - currentLevelXP);
            const neededXP = Math.max(1, nextLevelXP - currentLevelXP);
            const xpProgress = Math.min((progressXP / neededXP) * 100, 100);
            
            let title = 'Newcomer';
            if (level >= 50) title = 'Discord Mod';
            else if (level >= 30) title = 'Master';
            else if (level >= 20) title = 'Expert';
            else if (level >= 10) title = 'Veteran';
            else if (level >= 5) title = 'Regular';
            
            const hours = Math.floor(totalPlaytime / 3600);
            const minutes = Math.floor((totalPlaytime % 3600) / 60);
            const totalPlaytimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            return {
                totalPlaytime,
                totalPlaytimeFormatted,
                gamesPlayed,
                favoriteGame,
                level,
                title,
                xpProgress
            };
        },
        
        calculateAchievements(userData, stats) {
            const achievements = [
                {
                    id: 'first_game',
                    name: 'First Steps',
                    description: 'Play your first game',
                    icon: '🎮',
                    unlocked: stats.gamesPlayed >= 1
                },
                {
                    id: 'game_collector',
                    name: 'Collector',
                    description: 'Play 5 different games',
                    icon: '🎯',
                    unlocked: stats.gamesPlayed >= 5
                },
                {
                    id: 'hour_one',
                    name: 'Getting Started',
                    description: 'Play for 1 hour total',
                    icon: '⏰',
                    unlocked: stats.totalPlaytime >= 3600
                },
                {
                    id: 'hour_ten',
                    name: 'Dedicated',
                    description: 'Play for 10 hours total',
                    icon: '🔥',
                    unlocked: stats.totalPlaytime >= 36000
                },
                {
                    id: 'marathon',
                    name: 'Marathon',
                    description: 'Play for 24 hours total',
                    icon: '⚡',
                    unlocked: stats.totalPlaytime >= 86400
                },
                {
                    id: 'veteran',
                    name: 'Veteran',
                    description: 'Reach level 10',
                    icon: '🏅',
                    unlocked: stats.level >= 10
                },
                {
                    id: 'no_life',
                    name: 'No Life',
                    description: 'Reach level 50',
                    icon: '💀',
                    unlocked: stats.level >= 50
                },
                {
                    id: 'favorites',
                    name: 'Curator',
                    description: 'Add 5 favorites',
                    icon: '⭐',
                    unlocked: (userData.favorites?.length || 0) >= 5
                },
                {
                    id: 'explorer',
                    name: 'Explorer',
                    description: 'Play 10 different games',
                    icon: '🗺️',
                    unlocked: stats.gamesPlayed >= 10
                }
            ];
            
            return {
                list: achievements,
                unlockedCount: achievements.filter(a => a.unlocked).length,
                total: achievements.length
            };
        },
        
        renderError(message) {
            const content = document.getElementById('account-content');
            content.innerHTML = `
                <div style="text-align: center; padding: 100px 20px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">😕</div>
                    <h2 style="margin-bottom: 12px;">Oops!</h2>
                    <p style="color: #888; margin-bottom: 30px;">${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <span>🔄</span> Reload Page
                    </button>
                </div>
            `;
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AccountPage.init());
    } else {
        AccountPage.init();
    }
    
    console.log('✅ Enhanced Account.js loaded with Leaderboard & Charts (FIXED VERSION)');
    
    window.AccountPage = AccountPage;

})();