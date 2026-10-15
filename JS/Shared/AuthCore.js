// AuthCore.js - Authentication State & Logic
(function() {
    window.AuthCore = {
        currentUser: null,
        currentUsername: null,
        currentAdmin: false,
        profileReady: false,
        
        init() {
            auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                
                this.profileReady = false;
                this.currentAdmin = false;

                if (user) {
                    database.ref('users/' + user.uid).once('value')
                        .then(async (snapshot) => {
                            const userData = snapshot.val() || {};
                            this.currentUsername = userData.username || null;

                            // Missing admin flags are treated as non-admin. Backfill old
                            // accounts on their next sign-in without overwriting true flags.
                            if (typeof userData.admin !== 'boolean') {
                                try {
                                    await database.ref('users/' + user.uid + '/admin').set(false);
                                } catch (error) {
                                    console.warn('Could not backfill default admin flag:', error);
                                }
                                this.currentAdmin = false;
                            } else {
                                this.currentAdmin = userData.admin === true;
                            }

                            this.profileReady = true;
                            this.updateUI();
                            window.dispatchEvent(new CustomEvent('authProfileReady', {
                                detail: { user, username: this.currentUsername, admin: this.currentAdmin }
                            }));
                            setTimeout(() => this.loadUserData(), 500);
                        })
                        .catch((error) => {
                            console.error('Could not load account profile:', error);
                            this.currentUsername = null;
                            this.currentAdmin = false;
                            this.profileReady = true;
                            this.updateUI();
                            window.dispatchEvent(new CustomEvent('authProfileReady', {
                                detail: { user, username: null, admin: false, error: true }
                            }));
                        });
                } else {
                    this.currentUsername = null;
                    this.currentAdmin = false;
                    this.profileReady = true;
                    this.updateUI();
                    window.dispatchEvent(new CustomEvent('authProfileReady', {
                        detail: { user: null, username: null, admin: false }
                    }));
                }
            });
        },
        
        updateUI() {
            this.updateAdminNavigation();
            const authButtons = document.querySelectorAll('.auth-button');
            authButtons.forEach(btn => {
                if (this.currentUser && this.currentUsername) {
                    btn.innerHTML = '👤';
                    btn.title = '@' + this.currentUsername;
                } else {
                    btn.innerHTML = '🔓';
                    btn.title = 'Sign In';
                }
            });
        },
        
        updateAdminNavigation() {
            const navBar = document.querySelector('.nav-bar');
            if (!navBar) return;

            const existing = document.getElementById('admin-nav-item');
            const currentPageAdminItem = document.getElementById('admin-nav-current');
            if (this.currentUser && this.currentAdmin === true) {
                if (currentPageAdminItem) currentPageAdminItem.hidden = false;
                if (existing || currentPageAdminItem) return;
                const item = document.createElement('div');
                item.id = 'admin-nav-item';
                item.className = 'nav-item admin-nav-item';
                item.setAttribute('role', 'link');
                item.setAttribute('tabindex', '0');
                item.title = 'Admin dashboard';
                item.innerHTML = `
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="8" height="8" rx="1.5"/>
                        <rect x="13" y="3" width="8" height="5" rx="1.5"/>
                        <rect x="13" y="10" width="8" height="11" rx="1.5"/>
                        <rect x="3" y="13" width="8" height="8" rx="1.5"/>
                    </svg>
                    <span class="nav-label">Admin</span>
                `;
                item.addEventListener('click', () => {
                    if (window.navigation?.navigateTo) window.navigation.navigateTo('admin.html');
                    else window.location.href = 'admin.html';
                });
                item.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        item.click();
                    }
                });
                const fullscreen = document.getElementById('fullscreen-btn');
                if (fullscreen && fullscreen.parentElement === navBar) navBar.insertBefore(item, fullscreen);
                else navBar.appendChild(item);
                if (window.navigation?.setup) window.navigation.setup();
            } else {
                if (existing) existing.remove();
                if (currentPageAdminItem) currentPageAdminItem.hidden = true;
            }
        },

        validateUsername(username) {
            if (!username) return 'Username is required';
            if (username.length < 3) return 'Username must be at least 3 characters';
            if (username.length > 16) return 'Username must be 16 characters or less';
            if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Username can only contain letters, numbers, underscores, and hyphens';
            return null;
        },
        
        async isUsernameAvailable(username) {
            if (typeof database === 'undefined') throw new Error('Database not initialized');
            const snapshot = await database.ref('usernames/' + username).once('value');
            return !snapshot.exists();
        },
        
        async signIn(usernameOrEmail, password) {
            if (!usernameOrEmail || !password) {
                throw new Error('Please enter username/email and password');
            }
            
            const isEmail = usernameOrEmail.includes('@');
            
            if (isEmail) {
                return auth.signInWithEmailAndPassword(usernameOrEmail, password);
            } else {
                const snapshot = await database.ref('usernames/' + usernameOrEmail).once('value');
                if (!snapshot.exists()) throw new Error('Username not found');
                
                const userId = snapshot.val();
                const emailSnapshot = await database.ref('users/' + userId + '/email').once('value');
                const email = emailSnapshot.val();
                
                return auth.signInWithEmailAndPassword(email, password);
            }
        },
        
        async signUp(username, email, password) {
            const usernameError = this.validateUsername(username);
            if (usernameError) throw new Error(usernameError);
            
            if (!email || !email.includes('@') || !email.includes('.')) {
                throw new Error('Please enter a valid email address');
            }
            
            if (!password || password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            
            const available = await this.isUsernameAvailable(username);
            if (!available) throw new Error('Username "' + username + '" is already taken');
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;
            
            const updates = {};
            updates['users/' + userId] = {
                username: username,
                email: email,
                createdAt: Date.now(),
                favorites: [],
                playtime: { daily: {}, weekly: {}, total: {} },
                admin: false
            };
            updates['usernames/' + username] = userId;
            
            await database.ref().update(updates);
            return username;
        },
        
        async changeUsername(newUsername) {
            const error = this.validateUsername(newUsername);
            if (error) throw new Error(error);
            
            if (newUsername === this.currentUsername) {
                throw new Error('That\'s already your username');
            }
            
            const available = await this.isUsernameAvailable(newUsername);
            if (!available) throw new Error('Username already taken');
            
            const userId = this.currentUser.uid;
            const updates = {};
            updates['users/' + userId + '/username'] = newUsername;
            updates['usernames/' + newUsername] = userId;
            updates['usernames/' + this.currentUsername] = null;
            
            await database.ref().update(updates);
            this.currentUsername = newUsername;
            this.updateUI();
        },
        
        async signOut() {
            return auth.signOut();
        },
        
        loadUserData() {
            if (!this.currentUser) return;
            
            database.ref('users/' + this.currentUser.uid).once('value')
                .then((snapshot) => {
                    const userData = snapshot.val();
                    if (userData && userData.favorites) {
                        favorites = userData.favorites;
                        if (typeof updateFavoritesBadge === 'function') updateFavoritesBadge();
                        if (typeof updateCardStars === 'function') updateCardStars();
                        else if (typeof updateGameCardStars === 'function') updateGameCardStars();
                    }
                })
                .catch((error) => console.error('Error loading user data:', error));
        },
        
        async getUserStats() {
            if (!this.currentUser) return null;
            const snapshot = await database.ref('users/' + this.currentUser.uid).once('value');
            return snapshot.val();
        },
        
        calculateStats(userData) {
            let totalPlaytime = 0, gamesPlayed = 0;
            let favoriteGame = { name: 'None', time: 0 };
            
            if (userData.playtime && userData.playtime.total) {
                const games = userData.playtime.total;
                gamesPlayed = Object.keys(games).length;
                
                Object.entries(games).forEach(([game, seconds]) => {
                    const time = Number(seconds) || 0;
                    totalPlaytime += time;
                    if (time > favoriteGame.time) favoriteGame = { name: game, time: time };
                });
            }
            
            const level = Math.floor(totalPlaytime / 3600) + 1;
            let title = 'Newcomer';
            if (level >= 50) title = 'Legend';
            else if (level >= 30) title = 'Master';
            else if (level >= 20) title = 'Expert';
            else if (level >= 10) title = 'Veteran';
            else if (level >= 5) title = 'Regular';
            
            const hours = Math.floor(totalPlaytime / 3600);
            const minutes = Math.floor((totalPlaytime % 3600) / 60);
            const totalPlaytimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            return { totalPlaytime, totalPlaytimeFormatted, gamesPlayed, favoriteGame, level, title };
        },
        
        calculateAchievements(userData, stats) {
            const achievements = [
                { id: 'first_game', name: 'First Steps', description: 'Play your first game', icon: '🎮', unlocked: stats.gamesPlayed >= 1 },
                { id: 'game_collector', name: 'Collector', description: 'Play 5 different games', icon: '🎯', unlocked: stats.gamesPlayed >= 5 },
                { id: 'hour_one', name: 'Getting Started', description: 'Play for 1 hour total', icon: '⏰', unlocked: stats.totalPlaytime >= 3600 },
                { id: 'hour_ten', name: 'Dedicated', description: 'Play for 10 hours total', icon: '🔥', unlocked: stats.totalPlaytime >= 36000 },
                { id: 'marathon', name: 'Marathon', description: 'Play for 24 hours total', icon: '⚡', unlocked: stats.totalPlaytime >= 86400 },
                { id: 'veteran', name: 'Veteran', description: 'Reach level 10', icon: '🏅', unlocked: stats.level >= 10 },
                { id: 'favorites', name: 'Curator', description: 'Add 5 favorites', icon: '⭐', unlocked: (userData.favorites?.length || 0) >= 5 },
                { id: 'explorer', name: 'Explorer', description: 'Play 10 different games', icon: '🗺️', unlocked: stats.gamesPlayed >= 10 }
            ];
            
            return {
                list: achievements,
                unlockedCount: achievements.filter(a => a.unlocked).length,
                total: achievements.length
            };
        },
        
        getRecentActivity(userData) {
            if (!userData.playtime || !userData.playtime.daily) return [];
            
            const days = [];
            for (let i = 0; i < 3; i++) {
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
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                return {
                    date: dateStr,
                    time: timeStr,
                    gamesCount: Object.keys(games).length
                };
            }).filter(Boolean);
        }
    };
    
    window.AuthCore.init();
    
    window.authSystem = {
        showModal: () => window.AuthUI && window.AuthUI.showModal(),
        getCurrentUser: () => window.AuthCore.currentUser,
        getCurrentUsername: () => window.AuthCore.currentUsername,
        isLoggedIn: () => !!window.AuthCore.currentUser
    };
})();