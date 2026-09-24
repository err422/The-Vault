// Accounthelper.js
// Shared manager objects used by JS/Pages/Account.js
// Loaded BEFORE Account.js (see account.html script order)
//
// Trimmed to match the approved account page redesign:
// only rank, streak, daily quests, and the featured daily challenge
// are shown on the page. Season badges, weekly challenges, prestige
// UI, and profile frames were dropped along with the old layout.
(function () {

    // ===== WEEKLY RANK SYSTEM (drives the Season Rank track) =====
    const RankManager = {
        RANKS: [
            { name: 'Bronze', short: 'BRZ', min: 0 },
            { name: 'Silver', short: 'SLV', min: 10800 },   // 3h
            { name: 'Gold', short: 'GLD', min: 25200 },      // 7h
            { name: 'Platinum', short: 'PLT', min: 43200 },  // 12h
            { name: 'Diamond', short: 'DIA', min: 72000 },   // 20h
            { name: 'Mythic', short: 'MYT', min: 108000 }    // 30h
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
                    total += Object.values(userData.playtime.daily[dateStr])
                        .reduce((sum, s) => sum + Number(s), 0);
                }
            }
            return total;
        }
    };

    // ===== STREAK SYSTEM =====
    // current: consecutive days played up to today/yesterday
    // longest: best streak ever (shown as "Best" on the card)
    // weekDays: which of the current Mon-Sun week were played (for the 7 day dots)
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
            await database.ref(`users/${userId}/streak`).set(streak);
            return streak;
        },

        // Returns 7 entries for the current Mon-Sun week: { label, done, isToday }
        getWeekView(userData) {
            const daily = userData.playtime?.daily || {};
            const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Find this week's Monday
            const dayOfWeek = now.getDay(); // 0 = Sun
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

    // ===== DAILY CHALLENGE =====
    // Picks a featured game from Data/games.json deterministically by date,
    // and caches the pick in a single shared node so only the first person
    // to load the page that day triggers a write. Everyone else just reads it.
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
            const ref = database.ref(`dailyChallenge/${dateStr}`);
            const snapshot = await ref.once('value');
            const existing = snapshot.val();
            if (existing) return existing;

            // Nobody has picked today's game yet — pick deterministically
            // (same result for everyone even if two people load at once)
            // so the write is idempotent and safe to race.
            const games = await this.loadGames();
            const seed = dateStr.split('-').reduce((a, n) => a + Number(n), 0);
            const pick = games[seed % games.length];
            const challenge = {
                gameId: pick.id,
                title: pick.title,
                icon: pick.icon,
                url: pick.url,
                date: dateStr
            };
            await ref.set(challenge);
            return challenge;
        }
    };

    // ===== DAILY QUESTS =====
    // Quest progress is derived entirely from data already tracked
    // (playtime.daily) plus today's featured game from DailyChallengeManager.
    // Nothing new is written to Firebase for this — zero extra cost.
    const QuestManager = {
        getTodaysQuests(userData, challenge) {
            const dateStr = new Date().toISOString().split('T')[0];
            const today = userData.playtime?.daily?.[dateStr] || {};
            const gamesPlayedToday = Object.keys(today).length;
            const secondsToday = Object.values(today).reduce((s, v) => s + Number(v), 0);
            const minutesToday = Math.floor(secondsToday / 60);
            const challengePlayed = !!(challenge && today[challenge.title] > 0);

            return [
                {
                    id: 'play_games',
                    label: 'Play 3 games',
                    progress: Math.min(gamesPlayedToday, 3),
                    target: 3,
                    done: gamesPlayedToday >= 3
                },
                {
                    id: 'play_minutes',
                    label: 'Play for 20 minutes',
                    progress: Math.min(minutesToday, 20),
                    target: 20,
                    done: minutesToday >= 20
                },
                {
                    id: 'daily_challenge',
                    label: 'Finish the daily challenge',
                    progress: challengePlayed ? 1 : 0,
                    target: 1,
                    done: challengePlayed
                }
            ];
        }
    };

    window.VaultManagers = {
        RankManager,
        StreakManager,
        DailyChallengeManager,
        QuestManager
    };
    // ===== EXTEND ACCOUNT PAGE =====
    if (window.AccountPage) {
        const originalRender = window.AccountPage.renderAccountView;
        window.AccountPage.renderAccountView = async function(stats, achievements, userData) {
            // Get enhanced data
            const season = SeasonManager.getCurrentSeason();
            const weeklyPlaytime = RankManager.getWeeklyPlaytime(userData);
            const rank = RankManager.getRank(weeklyPlaytime);
            const streak = await StreakManager.updateStreak(this.currentUser.uid, userData);
            const challenges = ChallengeManager.checkChallenges(userData);
            const prestige = userData.prestige || 0;
            const seasonBadges = await SeasonManager.getSeasonBadges(this.currentUser.uid);
            // Call original render
            await originalRender.call(this, stats, achievements, userData);
            // Inject enhanced features
            const content = document.getElementById('account-content');
            const header = content.querySelector('.profile-header');
            // Add rank & season info to header
            const rankHTML = `
                <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <div style="background: linear-gradient(135deg, rgba(${this.hexToRgb(rank.color)}, 0.2), rgba(${this.hexToRgb(rank.color)}, 0.1)); border: 1px solid ${rank.color}; border-radius: 12px; padding: 12px 20px; display: flex; align-items: center; gap: 10px; box-shadow: 0 0 20px ${rank.glow};">
                        <span style="font-size: 24px;">${rank.icon}</span>
                        <div>
                            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Weekly Rank</div>
                            <div style="font-size: 16px; font-weight: 700; color: ${rank.color};">${rank.name}</div>
                        </div>
                    </div>
                    ${streak.current > 0 ? `
                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1)); border: 1px solid #ef4444; border-radius: 12px; padding: 12px 20px; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">🔥</span>
                            <div>
                                <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Streak</div>
                                <div style="font-size: 16px; font-weight: 700; color: #ef4444;">${streak.current} Day${streak.current !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                    ` : ''}
                    ${prestige > 0 ? `
                        <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1)); border: 1px solid #fbbf24; border-radius: 12px; padding: 12px 20px; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">⭐</span>
                            <div>
                                <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Prestige</div>
                                <div style="font-size: 16px; font-weight: 700; color: #fbbf24;">${PrestigeManager.getPrestigeIcon(prestige)}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>  
                ${Object.keys(seasonBadges).length > 0 ? `
                    <div style="margin-top: 15px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                        ${Object.entries(seasonBadges).map(([season, badge]) => `
                            <div style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #a855f7;" title="Season ${season.slice(1)} - Rank #${badge.rank}">
                                ${badge.rank === 1 ? '🏆' : badge.rank <= 3 ? '🥈' : badge.rank <= 10 ? '🥉' : '🎖️'} ${season}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
            header.insertAdjacentHTML('beforeend', rankHTML);
            // Add weekly challenges section
            const statsGrid = content.querySelector('.stats-grid');
            const challengesHTML = `
                <div class="section" style="margin-top: 20px;">
                    <h3 class="section-title"><span>🎯</span> Weekly Challenges</h3>
                    <div style="display: grid; gap: 12px;">
                        ${challenges.map(c => `
                            <div style="background: ${c.completed ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${c.completed ? '#22c55e' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 16px; font-weight: 600; color: ${c.completed ? '#22c55e' : '#fff'}; margin-bottom: 4px;">${c.name}</div>
                                    <div style="font-size: 13px; color: #888;">${c.desc}</div>
                                </div>
                                <div style="font-size: 32px;">${c.completed ? '✅' : c.reward}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            statsGrid.insertAdjacentHTML('afterend', challengesHTML);
            // Add flex stats section
            const flexStats = `
                <div class="section">
                    <h3 class="section-title"><span>💫</span> Flex Stats</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 8px;">📅</div>
                            <div style="font-size: 20px; font-weight: 700; color: #667eea;">${Object.keys(userData.playtime?.daily || {}).length}</div>
                            <div style="font-size: 12px; color: #888; margin-top: 4px;">Days Active</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 8px;">🏆</div>
                            <div style="font-size: 20px; font-weight: 700; color: #fbbf24;">${streak.longest}</div>
                            <div style="font-size: 12px; color: #888; margin-top: 4px;">Longest Streak</div>
                        </div>
                        ${userData.playtime?.daily ? `
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center;">
                                <div style="font-size: 24px; margin-bottom: 8px;">🔥</div>
                                <div style="font-size: 20px; font-weight: 700; color: #ef4444;">${Math.floor(Math.max(...Object.values(userData.playtime.daily).map(d => Object.values(d).reduce((s, v) => s + Number(v), 0))) / 3600)}h</div>
                                <div style="font-size: 12px; color: #888; margin-top: 4px;">Most in One Day</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            const achievementsSection = content.querySelector('.section:has(.achievements-grid)');
            achievementsSection.insertAdjacentHTML('beforebegin', flexStats);
            // Add prestige button if eligible
            if (PrestigeManager.canPrestige(stats.level) && prestige === 0) {
                const actionButtons = content.querySelector('.action-buttons');
                const prestigeBtn = `
                    <button class="btn" id="prestige-btn" style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2)); border-color: #fbbf24; color: #fbbf24;">
                        <span>⭐</span> Prestige (Reset to Level 1)
                    </button>
                `;
                actionButtons.insertAdjacentHTML('afterbegin', prestigeBtn);   
                document.getElementById('prestige-btn').addEventListener('click', async () => {
                    if (confirm('Reset to Level 1 and gain a Prestige Star? This cannot be undone!')) {
                        await PrestigeManager.prestige(this.currentUser.uid, stats.level);
                        location.reload();
                    }
                });
            }
            // Apply profile frame (auto-select best frame)
            const avatar = content.querySelector('.profile-avatar');
            const activeFrame = userData.activeFrame || FrameManager.getAutoFrame(rank, seasonBadges, prestige);
            const unlockedFrames = FrameManager.getUnlockedFrames(userData, rank, seasonBadges, prestige);
            
            if (unlockedFrames.includes(activeFrame)) {
                const frame = FrameManager.FRAMES[activeFrame];
                const currentStyle = avatar.getAttribute('style') || '';
                avatar.setAttribute('style', currentStyle + frame.css);
            }
        };   
        // Helper function
        window.AccountPage.hexToRgb = function(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
        };
    }
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
            50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.8); }
        }
        @keyframes shimmer {
            0% { filter: brightness(1); }
            50% { filter: brightness(1.3); }
            100% { filter: brightness(1); }
        }
        @keyframes goldPulse {
            0%, 100% { 
                box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4), inset 0 0 25px rgba(255, 215, 0, 0.3);
            }
            50% { 
                box-shadow: 0 0 60px rgba(255, 215, 0, 1), 0 0 90px rgba(255, 215, 0, 0.6), inset 0 0 35px rgba(255, 215, 0, 0.5);
            }
        }
        @keyframes platinumGlow {
            0%, 100% { 
                box-shadow: 0 0 45px rgba(229, 228, 226, 0.9), 0 0 70px rgba(229, 228, 226, 0.5), inset 0 0 30px rgba(229, 228, 226, 0.4);
            }
            50% { 
                box-shadow: 0 0 60px rgba(229, 228, 226, 1), 0 0 100px rgba(229, 228, 226, 0.7), inset 0 0 40px rgba(229, 228, 226, 0.6);
            }
        }
        @keyframes diamondSparkle {
          0%, 100% {
            box-shadow:0 0 12px rgba(185, 242, 255, 0.9), 0 0 22px rgba(185, 242, 255, 0.6),inset 0 0 12px rgba(185, 242, 255, 0.5);
          }
          25% {
            box-shadow:0 0 16px rgba(185, 242, 255, 1),0 0 28px rgba(185, 242, 255, 0.7), inset 0 0 16px rgba(185, 242, 255, 0.6);
          }
          50% {
            box-shadow:0 0 12px rgba(185, 242, 255, 0.9),0 0 22px rgba(185, 242, 255, 0.6),inset 0 0 12px rgba(185, 242, 255, 0.5);
          }
          75% {
            box-shadow:0 0 18px rgba(185, 242, 255, 1),0 0 32px rgba(185, 242, 255, 0.8),inset 0 0 18px rgba(185, 242, 255, 0.7);
          }
        }
        @keyframes mythicPulse {
            0%, 100% { 
                box-shadow: 0 0 60px rgba(255, 107, 157, 1), 0 0 90px rgba(255, 107, 157, 0.7), 0 0 120px rgba(255, 107, 157, 0.4), inset 0 0 40px rgba(255, 107, 157, 0.6);
            }
            50% { 
                box-shadow: 0 0 80px rgba(255, 107, 157, 1), 0 0 120px rgba(255, 107, 157, 0.9), 0 0 160px rgba(255, 107, 157, 0.6), inset 0 0 50px rgba(255, 107, 157, 0.8);
            }
        }
        @keyframes rainbowRotate {
            0% { 
                filter: hue-rotate(0deg) brightness(1.2);
                box-shadow: 0 0 60px rgba(255, 0, 128, 0.8), 0 0 90px rgba(64, 224, 208, 0.6);
            }
            25% { 
                box-shadow: 0 0 70px rgba(255, 140, 0, 0.9), 0 0 100px rgba(255, 0, 128, 0.7);
            }
            50% { 
                filter: hue-rotate(180deg) brightness(1.3);
                box-shadow: 0 0 80px rgba(64, 224, 208, 1), 0 0 110px rgba(255, 140, 0, 0.8);
            }
            75% { 
                box-shadow: 0 0 70px rgba(138, 43, 226, 0.9), 0 0 100px rgba(64, 224, 208, 0.7);
            }
            100% { 
                filter: hue-rotate(360deg) brightness(1.2);
                box-shadow: 0 0 60px rgba(255, 0, 128, 0.8), 0 0 90px rgba(64, 224, 208, 0.6);
            }
        }
        @keyframes prestigeShine {
            0%, 100% { 
                box-shadow: 0 0 50px rgba(251, 191, 36, 1), 0 0 80px rgba(251, 191, 36, 0.6), inset 0 0 35px rgba(251, 191, 36, 0.5);
            }
            50% { 
                box-shadow: 0 0 70px rgba(251, 191, 36, 1), 0 0 110px rgba(251, 191, 36, 0.8), inset 0 0 45px rgba(251, 191, 36, 0.7);
                filter: brightness(1.2);
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('Enhanced Features loaded - Ranks, Seasons, Streaks, Prestige, Challenges');
})();
