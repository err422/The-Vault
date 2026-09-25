// Account.js
// Fully self-contained — no dependency on Accounthelper.js or script load order.
(function () {

// ===== WEEKLY RANK SYSTEM =====
const RankManager = {
    RANKS: [
        { name: 'Bronze', short: 'BRZ', min: 0 },
        { name: 'Silver', short: 'SLV', min: 10800 },
        { name: 'Gold', short: 'GLD', min: 25200 },
        { name: 'Platinum', short: 'PLT', min: 43200 },
        { name: 'Diamond', short: 'DIA', min: 72000 },
        { name: 'Mythic', short: 'MYT', min: 108000 }
    ],
    getRank(weeklySeconds) {
        for (let i = this.RANKS.length - 1; i >= 0; i--) {
            if (weeklySeconds >= this.RANKS[i].min) return this.RANKS[i];
        }
        return this.RANKS[0];
    },
    getRankIndex(weeklySeconds) {
        for (let i = this.RANKS.length - 1; i >= 0; i--) {
            if (weeklySeconds >= this.RANKS[i].min) return i;
        }
        return 0;
    },
    getWeeklyPlaytime(userData) {
        if (!userData.playtime?.daily) return 0;
        let total = 0;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            if (userData.playtime.daily[dateStr]) {
                total += Object.values(userData.playtime.daily[dateStr]).reduce((sum, s) => sum + Number(s), 0);
            }
        }
        return total;
    }
};

const StreakManager = {
    async updateStreak(userId, userData) {
        const daily = userData.playtime?.daily || {};
        const dates = Object.keys(daily).sort().reverse();
        let current = 0;
        let longest = 0;
        if (dates.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (dates[0] === today || dates[0] === yesterday) {
                current = 1;
                let checkDate = new Date(dates[0]);
                for (let i = 1; i < dates.length; i++) {
                    const prevDate = new Date(checkDate);
                    prevDate.setDate(prevDate.getDate() - 1);
                    const prevDateStr = prevDate.toISOString().split('T')[0];
                    if (dates[i] === prevDateStr) {
                        current++;
                        checkDate = prevDate;
                    } else break;
                }
            }
            for (let i = 0; i < dates.length; i++) {
                let tempStreak = 1;
                let checkDate = new Date(dates[i]);
                for (let j = i + 1; j < dates.length; j++) {
                    const prevDate = new Date(checkDate);
                    prevDate.setDate(prevDate.getDate() - 1);
                    const prevDateStr = prevDate.toISOString().split('T')[0];
                    if (dates[j] === prevDateStr) {
                        tempStreak++;
                        checkDate = prevDate;
                    } else break;
                }
                longest = Math.max(longest, tempStreak);
            }
        }
        const streak = { current, longest, lastPlayed: dates[0] || null };
        await database.ref('users/' + userId + '/streak').set(streak);
        return streak;
    },
    getWeekView(userData) {
        const daily = userData.playtime?.daily || {};
        const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const dayOfWeek = now.getDay();
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        const week = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const played = !!daily[dateStr] && Object.values(daily[dateStr]).some(s => Number(s) > 0);
            week.push({ label: labels[i], done: played, isToday: dateStr === todayStr });
        }
        return week;
    }
};

const DailyChallengeManager = {
    _gamesCache: null,
    async loadGames() {
        if (this._gamesCache) return this._gamesCache;
        const res = await fetch('Data/games.json');
        this._gamesCache = await res.json();
        return this._gamesCache;
    },
    async getTodaysChallenge() {
        const dateStr = new Date().toISOString().split('T')[0];
        const ref = database.ref('dailyChallenge/' + dateStr);
        const snapshot = await ref.once('value');
        const existing = snapshot.val();
        if (existing) return existing;
        const games = await this.loadGames();
        const seed = dateStr.split('-').reduce((a, n) => a + Number(n), 0);
        const pick = games[seed % games.length];
        const challenge = { gameId: pick.id, title: pick.title, icon: pick.icon, url: pick.url, date: dateStr };
        await ref.set(challenge);
        return challenge;
    }
};

const QuestManager = {
    getTodaysQuests(userData, challenge) {
        const dateStr = new Date().toISOString().split('T')[0];
        const today = userData.playtime?.daily?.[dateStr] || {};
        const gamesPlayedToday = Object.keys(today).length;
        const secondsToday = Object.values(today).reduce((s, v) => s + Number(v), 0);
        const minutesToday = Math.floor(secondsToday / 60);
        const challengePlayed = !!(challenge && today[challenge.title] > 0);
        return [
            { id: 'play_games', label: 'Play 3 games', progress: Math.min(gamesPlayedToday, 3), target: 3, done: gamesPlayedToday >= 3 },
            { id: 'play_minutes', label: 'Play for 20 minutes', progress: Math.min(minutesToday, 20), target: 20, done: minutesToday >= 20 },
            { id: 'daily_challenge', label: 'Finish the daily challenge', progress: challengePlayed ? 1 : 0, target: 1, done: challengePlayed }
        ];
    }
};

const LeaderboardManager = {
    getCalendarWeekPlaytime(userData) {
        const daily = userData.playtime?.daily || {};
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        let total = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            if (daily[dateStr]) total += Object.values(daily[dateStr]).reduce((sum, s) => sum + Number(s), 0);
        }
        return total;
    },
    buildEntries(users, mode, calcStats) {
        const entries = Object.entries(users || {}).map(([uid, userData]) => {
            const stats = calcStats(userData);
            const weekSeconds = this.getCalendarWeekPlaytime(userData);
            return {
                uid,
                username: userData.username || 'Unknown',
                level: stats.level,
                seconds: mode === 'week' ? weekSeconds : stats.totalPlaytime,
                allTimeSeconds: stats.totalPlaytime
            };
        });
        entries.sort((a,b) => {
            if (b.seconds !== a.seconds) return b.seconds - a.seconds;
            if (b.level !== a.level) return b.level - a.level;
            if (b.allTimeSeconds !== a.allTimeSeconds) return b.allTimeSeconds - a.allTimeSeconds;
            if (a.username !== b.username) return a.username.localeCompare(b.username);
            return a.uid.localeCompare(b.uid);
        });
        return entries;
    },
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm';
    }
};


    const AccountPage = {
        currentUser: null,
        currentUsername: null,
        _leaderboard: { week: [], all: [] },
        _leaderboardTab: 'week',

        init() {
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
            content.innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p style="margin-top: 16px; color: #777; font-size: 14px;">Loading your record...</p>
                </div>
            `;
            try {
                const usernameSnap = await database.ref(`users/${this.currentUser.uid}/username`).once('value');
                this.currentUsername = usernameSnap.val();

                const snapshot = await database.ref(`users/${this.currentUser.uid}`).once('value');
                const userData = snapshot.val() || {};

                const stats = this.calculateStats(userData);
                const achievementCount = this.countAchievements(userData, stats);

                await this.renderAccountView(stats, achievementCount, userData);
            } catch (error) {
                console.error('❌ Error loading user data:', error);
                this.renderError('Failed to load profile data');
            }
        },

        async renderAccountView(stats, achievementCount, userData) {
            const content = document.getElementById('account-content');

            const weeklyPlaytime = RankManager.getWeeklyPlaytime(userData);
            const rank = RankManager.getRank(weeklyPlaytime);
            const rankIndex = RankManager.getRankIndex(weeklyPlaytime);
            const streak = await StreakManager.updateStreak(this.currentUser.uid, userData);
            const weekView = StreakManager.getWeekView(userData);
            const dailyChallenge = await DailyChallengeManager.getTodaysChallenge();
            const dailyQuests = QuestManager.getTodaysQuests(userData, dailyChallenge);

            const usersSnap = await database.ref('users').once('value');
            const allUsers = usersSnap.val() || {};
            this._leaderboard.week = LeaderboardManager.buildEntries(allUsers, 'week', this.calculateStats);
            this._leaderboard.all = LeaderboardManager.buildEntries(allUsers, 'all', this.calculateStats);

            content.innerHTML = `
                <div class="page-wrap">
                    <h1 class="page-title">Your Record</h1>
                    <p class="page-subtitle">Every minute here is counted by the server while you play, not by this page.</p>

                    ${this.renderProfileCard(stats, rank)}

                    <div class="two-col">
                        ${this.renderRankCard(rank, rankIndex)}
                        ${this.renderStreakCard(streak, weekView)}
                    </div>

                    <div class="two-col">
                        ${this.renderQuestsCard(dailyQuests)}
                        ${this.renderChallengeCard(dailyChallenge, dailyQuests)}
                    </div>

                    <div class="card">
                        <div class="card-label"><span class="dot"></span> Play Activity · Last 30 Days</div>
                        ${this.renderHeatmap(userData)}
                    </div>

                    <div class="card" id="leaderboard-card">
                        ${this.renderLeaderboardCardInner()}
                    </div>

                    ${this.renderGlanceCard(stats, achievementCount)}

                    <div class="action-buttons">
                        <button class="btn" id="change-username-btn">Change Username</button>
                        <button class="btn btn-danger" id="sign-out-btn">Sign Out</button>
                    </div>
                </div>
            `;

            this.attachEventListeners();
        },

        // ===== YOUR PROFILE =====
        renderProfileCard(stats, rank) {
            const initial = (this.currentUsername || '?').charAt(0);
            return `
                <div class="card">
                    <div class="card-label"><span class="dot"></span> Your Profile</div>
                    <div class="profile-row">
                        <div class="profile-avatar">${initial}<div class="profile-level-badge">${stats.level}</div></div>
                        <div class="profile-info">
                            <div class="profile-name">${this.currentUsername}</div>
                            <div class="profile-meta">${rank.name} · Level ${stats.level}</div>
                        </div>
                        <div class="profile-total">
                            <div class="profile-total-value">${stats.totalPlaytime}</div>
                            <div class="profile-total-label">Total XP</div>
                        </div>
                    </div>
                    <div class="xp-track"><div class="xp-fill" style="width: ${stats.xpProgress}%"></div></div>
                    <div class="xp-labels">
                        <span>${stats.progressXP} / ${stats.neededXP} XP</span>
                        <span>Next: Lv ${stats.level + 1}</span>
                    </div>
                </div>
            `;
        },

        // ===== SEASON RANK =====
        renderRankCard(rank, rankIndex) {
            const ranks = RankManager.RANKS;
            const nodes = ranks.map((r, i) => {
                const state = i < rankIndex ? 'passed' : i === rankIndex ? 'current' : '';
                return `
                    <div class="rank-node ${state}">
                        <div class="rank-circle">${i + 1}</div>
                        <div class="rank-label">${r.short}</div>
                    </div>
                `;
            }).join('');
            return `
                <div class="card">
                    <div class="card-label"><span class="dot"></span> Season Rank · ${rank.name}</div>
                    <div class="rank-track">${nodes}</div>
                </div>
            `;
        },

        // ===== DAILY STREAK =====
        renderStreakCard(streak, weekView) {
            const days = weekView.map(d => `
                <div class="streak-day ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}">
                    <div class="streak-day-circle">${d.done ? '✓' : ''}</div>
                    <div class="streak-day-label">${d.label}</div>
                </div>
            `).join('');
            return `
                <div class="card">
                    <div class="card-label"><span class="dot"></span> Daily Streak</div>
                    <div class="streak-top">
                        <div class="streak-count-row">
                            <span class="streak-flame">🔥</span>
                            <div>
                                <div class="streak-number">${streak.current}</div>
                                <div class="streak-sub">Day Streak</div>
                            </div>
                        </div>
                        <div class="streak-best">
                            <div class="streak-best-value">${streak.longest}</div>
                            <div class="streak-best-label">Best</div>
                        </div>
                    </div>
                    <div class="streak-days">${days}</div>
                </div>
            `;
        },

        // ===== TODAY'S QUESTS =====
        renderQuestsCard(quests) {
            const rows = quests.map(q => `
                <div class="quest-row ${q.done ? 'done' : ''}">
                    <div class="quest-checkbox">${q.done ? '✓' : ''}</div>
                    <div class="quest-body">
                        <div class="quest-name">${q.label}</div>
                        <div class="quest-bar"><div class="quest-bar-fill" style="width: ${(q.progress / q.target) * 100}%"></div></div>
                    </div>
                    <div class="quest-count">${q.progress}/${q.target}</div>
                </div>
            `).join('');
            return `
                <div class="card">
                    <div class="card-label"><span class="dot"></span> Today's Quests</div>
                    ${rows}
                </div>
            `;
        },

        // ===== DAILY CHALLENGE =====
        renderChallengeCard(challenge, quests) {
            if (!challenge) {
                return `<div class="card"><div class="card-label"><span class="dot"></span> Daily Challenge</div><p style="color:#666;font-size:14px;">No challenge available today.</p></div>`;
            }
            const done = quests.find(q => q.id === 'daily_challenge')?.done;
            return `
                <div class="card">
                    <div class="card-label"><span class="dot"></span> Daily Challenge</div>
                    <div class="challenge-row">
                        <div class="challenge-icon">${challenge.icon}</div>
                        <div class="challenge-body">
                            <div class="challenge-label">Daily Challenge</div>
                            <div class="challenge-title">${challenge.title}</div>
                            <div class="challenge-bar"><div class="challenge-bar-fill" style="width: ${done ? 100 : 0}%"></div></div>
                        </div>
                        <a class="challenge-play" href="${challenge.url}" target="_blank" rel="noopener">${done ? 'Played' : 'Play'}</a>
                    </div>
                </div>
            `;
        },

        // ===== ACTIVITY HEATMAP (30 days) =====
        renderHeatmap(userData) {
            const daily = userData.playtime?.daily || {};
            const DAYS = 30;
            const cells = [];
            let maxMinutes = 1;

            for (let i = DAYS - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                let minutes = 0;
                if (daily[dateStr]) {
                    const seconds = Object.values(daily[dateStr]).reduce((s, v) => s + Number(v), 0);
                    minutes = Math.floor(seconds / 60);
                }
                maxMinutes = Math.max(maxMinutes, minutes);
                cells.push({ dateStr, minutes });
            }

            const getLevel = (minutes) => {
                if (minutes === 0) return 0;
                const ratio = minutes / maxMinutes;
                if (ratio > 0.66) return 4;
                if (ratio > 0.33) return 3;
                if (ratio > 0.1) return 2;
                return 1;
            };

            const cellsHTML = cells.map(c => {
                const level = getLevel(c.minutes);
                const label = new Date(c.dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const title = c.minutes > 0 ? `${label}: ${c.minutes}m played` : `${label}: no activity`;
                return `<div class="heatmap-cell level-${level}" title="${title}"></div>`;
            }).join('');

            return `
                <div class="heatmap-grid">${cellsHTML}</div>
                <div class="heatmap-legend">
                    <span>Less</span>
                    <div class="heatmap-cell level-0"></div>
                    <div class="heatmap-cell level-1"></div>
                    <div class="heatmap-cell level-2"></div>
                    <div class="heatmap-cell level-3"></div>
                    <div class="heatmap-cell level-4"></div>
                    <span>More</span>
                </div>
            `;
        },


        // ===== LEADERBOARD =====
        renderLeaderboardCardInner() {
            const mode = this._leaderboardTab;
            const entries = this._leaderboard[mode] || [];
            const uid = this.currentUser?.uid;
            const top5 = entries.slice(0, 5);
            const myIndex = entries.findIndex(e => e.uid === uid);
            const myRank = myIndex + 1;
            const inTop5 = myIndex >= 0 && myIndex < 5;

            const escapeHTML = (value) => String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

            const rowHTML = (entry, rank, isMe) => `
                <div class="lb-row ${isMe ? 'me' : ''}">
                    <div class="lb-rank">${rank}</div>
                    <div class="lb-name">${escapeHTML(entry.username)} · Level ${entry.level}</div>
                    <div class="lb-time">${LeaderboardManager.formatDuration(entry.seconds)}</div>
                </div>
            `;

            let rows = top5.map((e,i) => rowHTML(e,i+1,e.uid === uid)).join('');
            if (myIndex >= 0 && !inTop5) {
                rows += `
                    <div class="lb-divider"></div>
                    ${rowHTML(entries[myIndex], myRank, true)}
                `;
            }
            if (entries.length === 0) rows = '<p style="color:#666;font-size:14px;">No players yet.</p>';

            return `
                <div class="card-label"><span class="dot"></span> Leaderboard</div>
                <div class="lb-tabs">
                    <button class="lb-tab ${mode === 'week' ? 'active' : ''}" data-lb-tab="week">This Week</button>
                    <button class="lb-tab ${mode === 'all' ? 'active' : ''}" data-lb-tab="all">All Time</button>
                </div>
                <div class="lb-rows">${rows}</div>
            `;
        },

        // ===== AT A GLANCE =====
        renderGlanceCard(stats, achievementCount) {
            return `
                <div class="card">
                    <div class="card-label"><span class="dot"></span> At a Glance</div>
                    <div class="glance-grid">
                        <div class="glance-box">
                            <div class="glance-value">${stats.gamesPlayed}</div>
                            <div class="glance-label">Games</div>
                        </div>
                        <div class="glance-box">
                            <div class="glance-value">${stats.totalPlaytimeFormatted}</div>
                            <div class="glance-label">Played</div>
                        </div>
                        <div class="glance-box">
                            <div class="glance-value">${achievementCount.unlocked}/${achievementCount.total}</div>
                            <div class="glance-label">Badges</div>
                        </div>
                    </div>
                </div>
            `;
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

            this.attachLeaderboardListeners();
        },

        attachLeaderboardListeners() {
            const lbCard = document.getElementById('leaderboard-card');
            if (!lbCard) return;
            lbCard.querySelectorAll('[data-lb-tab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._leaderboardTab = btn.getAttribute('data-lb-tab');
                    lbCard.innerHTML = this.renderLeaderboardCardInner();
                    this.attachLeaderboardListeners();
                });
            });
        },

        showChangeUsernameForm() {
            const content = document.getElementById('account-content');
            content.innerHTML = `
                <div class="page-wrap">
                    <div class="auth-container">
                        <div class="auth-header">
                            <h2 class="auth-title">Change Username</h2>
                            <p class="auth-subtitle">Choose a new username for your account</p>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Current Username</label>
                            <div style="padding: 13px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #ccc; font-weight: 600;">
                                @${this.currentUsername}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Username</label>
                            <input type="text" class="form-input" id="new-username" placeholder="Enter new username" />
                        </div>
                        <div class="form-error" id="change-error"></div>
                        <div class="action-buttons">
                            <button class="btn" id="cancel-change-btn">Cancel</button>
                            <button class="btn" id="confirm-change-btn" style="background:#fff;color:#000;border-color:#fff;">Confirm</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('cancel-change-btn').addEventListener('click', () => this.loadUserData());
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
                    btn.textContent = 'Confirm';
                    btn.disabled = false;
                }
            });
            document.getElementById('new-username').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') document.getElementById('confirm-change-btn').click();
            });
        },

        renderAuthForms() {
            const content = document.getElementById('account-content');
            content.innerHTML = `
                <div class="page-wrap">
                    <div class="auth-container">
                        <div class="auth-header">
                            <h2 class="auth-title">Welcome to The Vault</h2>
                            <p class="auth-subtitle">Sign in to track your progress and achievements</p>
                        </div>
                        <div class="auth-tabs">
                            <button class="auth-tab active" id="tab-signin">Sign In</button>
                            <button class="auth-tab" id="tab-signup">Sign Up</button>
                        </div>
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
                            <div class="form-group tos-group">
                                <label>
                                    <input type="checkbox" id="signup-tos">
                                    <span>I agree to the <a href="tos.html" target="_blank">Terms of Service</a></span>
                                </label>
                            </div>
                            <div class="form-error" id="signup-error"></div>
                            <button class="form-button" id="signup-btn">Create Account</button>
                        </div>
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

            document.getElementById('signin-btn').addEventListener('click', () => this.handleSignIn());
            document.getElementById('signin-password').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSignIn();
            });
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

        // ===== STATS / LEVEL MATH (unchanged from the original system) =====
        calculateStats(userData) {
            function xpRequiredForLevel(level, prestige) {
                const baseXP = 1200;
                const growthRate = 1.087;
                const prestigeMultiplier = 1 + (prestige * 0.15);
                return Math.floor(baseXP * Math.pow(growthRate, level - 1) * prestigeMultiplier);
            }
            function totalXpForLevel(level, prestige) {
                let total = 0;
                for (let i = 1; i < level; i++) total += xpRequiredForLevel(i, prestige);
                return total;
            }

            let totalPlaytime = 0;
            let gamesPlayed = 0;
            if (userData.playtime && userData.playtime.total) {
                const games = userData.playtime.total;
                gamesPlayed = Object.keys(games).length;
                Object.values(games).forEach(seconds => {
                    totalPlaytime += Number(seconds) || 0;
                });
            }

            const prestige = userData.prestige || 0;
            let level = 1;
            while (totalPlaytime >= totalXpForLevel(level + 1, prestige)) level++;

            const currentLevelXP = totalXpForLevel(level, prestige);
            const nextLevelXP = totalXpForLevel(level + 1, prestige);
            const progressXP = Math.max(0, totalPlaytime - currentLevelXP);
            const neededXP = Math.max(1, nextLevelXP - currentLevelXP);
            const xpProgress = Math.min((progressXP / neededXP) * 100, 100);

            const hours = Math.floor(totalPlaytime / 3600);
            const minutes = Math.floor((totalPlaytime % 3600) / 60);
            const totalPlaytimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            return { totalPlaytime, totalPlaytimeFormatted, gamesPlayed, level, xpProgress, progressXP, neededXP };
        },

        // Count-only — no achievement grid on this page, just the number for "At a Glance"
        countAchievements(userData, stats) {
            const achievements = [
                stats.gamesPlayed >= 1,
                stats.gamesPlayed >= 5,
                stats.totalPlaytime >= 3600,
                stats.totalPlaytime >= 36000,
                stats.totalPlaytime >= 86400,
                stats.level >= 10,
                stats.level >= 50,
                (userData.favorites?.length || 0) >= 5,
                stats.gamesPlayed >= 10
            ];
            return { unlocked: achievements.filter(Boolean).length, total: achievements.length };
        },

        renderError(message) {
            const content = document.getElementById('account-content');
            content.innerHTML = `
                <div class="page-wrap" style="text-align: center;">
                    <h2 style="margin-bottom: 12px;">Oops!</h2>
                    <p style="color: #777; margin-bottom: 24px;">${message}</p>
                    <button class="btn" onclick="location.reload()" style="flex:none;">Reload Page</button>
                </div>
            `;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AccountPage.init());
    } else {
        AccountPage.init();
    }
    window.AccountPage = AccountPage;
})();
