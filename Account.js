// Account.js - Account Page Logic

(function() {
    const AccountPage = {
        currentUser: null,
        currentUsername: null,
        
        init() {
            console.log('🎨 Initializing Account Page...');
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
                const recentActivity = this.getRecentActivity(userData);
                
                // Render account view
                this.renderAccountView(stats, achievements, recentActivity);
                
            } catch (error) {
                console.error('❌ Error loading user data:', error);
                this.renderError('Failed to load profile data');
            }
        },
        
        renderAccountView(stats, achievements, recentActivity) {
            const content = document.getElementById('account-content');
            
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
                
                <!-- Recent Activity -->
                ${recentActivity.length > 0 ? `
                    <div class="section">
                        <h3 class="section-title">
                            <span>📊</span> Recent Activity
                        </h3>
                        ${recentActivity.map(day => `
                            <div class="activity-item">
                                <div class="activity-header">
                                    <span class="activity-date">${day.date}</span>
                                    <span class="activity-time">${day.time}</span>
                                </div>
                                <div class="activity-games">${day.gamesCount} game${day.gamesCount !== 1 ? 's' : ''} played</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
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
            const errorDiv = document.getElementById('signup-error');
            const btn = document.getElementById('signup-btn');
            
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
        
        calculateStats(userData) {
            function xpRequiredForLevel(level) {
                const baseXP = 1800; // 30 minutes in seconds
                const growthRate = 1.5; // 50% harder each level
                return Math.floor(baseXP * Math.pow(growthRate, level - 1));
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
            
            // Calculate level
            let level = 1;
            
            while (totalPlaytime >= totalXpForLevel(level + 1)) {
                level++;
            }
            
            // Calculate XP progress to next level
            const currentLevelXP = totalXpForLevel(level);
            const nextLevelXP = totalXpForLevel(level + 1);
            
            const progressXP = Math.max(0, totalPlaytime - currentLevelXP);
            const neededXP = Math.max(1, nextLevelXP - currentLevelXP);
            
            const xpProgress = Math.min((progressXP / neededXP) * 100, 100);

            
            // Determine title
            let title = 'Newcomer';
            if (level >= 50) title = 'Discord Mod';
            else if (level >= 30) title = 'Master';
            else if (level >= 20) title = 'Expert';
            else if (level >= 10) title = 'Veteran';
            else if (level >= 5) title = 'Regular';
            
            // Format playtime
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
                  id: 'no life',
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
        
        getRecentActivity(userData) {
            if (!userData.playtime || !userData.playtime.daily) {
                return [];
            }
            
            const days = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                days.push(date.toISOString().split('T')[0]);
            }
            
            return days.map(date => {
                if (!userData.playtime.daily[date]) return null;
                
                const games = userData.playtime.daily[date];
                const totalSeconds = Object.values(games).reduce((sum, s) => sum + Number(s), 0);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                
                const dateObj = new Date(date);
                const dateStr = dateObj.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                
                return {
                    date: dateStr,
                    time: timeStr,
                    gamesCount: Object.keys(games).length
                };
            }).filter(Boolean);
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
    
    console.log('✅ Account.js loaded');
})();