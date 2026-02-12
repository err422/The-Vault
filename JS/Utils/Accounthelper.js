// EnhancedFeatures.js - Competitive & Cosmetic Extensions
// Add to your existing Account.js or load separately

(function() {
    // ===== SEASON SYSTEM =====
    const SeasonManager = {
        getCurrentSeason() {
            const now = new Date();
            const month = now.getMonth(); // 0-11
            const year = now.getFullYear();
            
            // Q1: Jan-Mar (0-2), Q2: Apr-Jun (3-5), Q3: Jul-Sep (6-8), Q4: Oct-Dec (9-11)
            const quarter = Math.floor(month / 3) + 1;
            const seasonNum = (year - 2025) * 4 + quarter;
            
            const themes = ['Genesis', 'Rising Storm', 'Eternal Flame', 'Frozen Throne'];
            const colors = ['#a855f7', '#3b82f6', '#f59e0b', '#06b6d4'];
            
            return {
                number: seasonNum,
                name: `Season ${seasonNum}: ${themes[(seasonNum - 1) % 4]}`,
                theme: colors[(seasonNum - 1) % 4],
                startDate: new Date(2025, (quarter - 1) * 3, 1),
                endDate: new Date(2025, quarter * 3, 0)
            };
        },
        
        async getSeasonBadges(userId) {
            const snapshot = await database.ref(`users/${userId}/seasonBadges`).once('value');
            return snapshot.val() || {};
        },
        
        async awardSeasonBadge(userId, season, rank) {
            const badges = await this.getSeasonBadges(userId);
            badges[`S${season}`] = { rank, date: Date.now() };
            await database.ref(`users/${userId}/seasonBadges`).set(badges);
        }
    };
    
    // ===== RANK SYSTEM =====
    const RankManager = {
        RANKS: [
            { name: 'Bronze', min: 0, color: '#CD7F32', icon: '🥉', glow: 'rgba(205, 127, 50, 0.3)' },
            { name: 'Silver', min: 10800, color: '#C0C0C0', icon: '🥈', glow: 'rgba(192, 192, 192, 0.3)' }, // 3h
            { name: 'Gold', min: 25200, color: '#FFD700', icon: '🥇', glow: 'rgba(255, 215, 0, 0.3)' }, // 7h
            { name: 'Platinum', min: 43200, color: '#E5E4E2', icon: '💎', glow: 'rgba(229, 228, 226, 0.3)' }, // 12h
            { name: 'Diamond', min: 72000, color: '#B9F2FF', icon: '💠', glow: 'rgba(185, 242, 255, 0.3)' }, // 20h
            { name: 'Mythic', min: 108000, color: '#FF6B9D', icon: '👑', glow: 'rgba(255, 107, 157, 0.3)' } // 30h
        ],
        
        getRank(weeklySeconds) {
            for (let i = this.RANKS.length - 1; i >= 0; i--) {
                if (weeklySeconds >= this.RANKS[i].min) return this.RANKS[i];
            }
            return this.RANKS[0];
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
    const StreakManager = {
        async getStreak(userId) {
            const snapshot = await database.ref(`users/${userId}/streak`).once('value');
            return snapshot.val() || { current: 0, longest: 0, lastPlayed: null };
        },
        
        async updateStreak(userId, userData) {
            if (!userData.playtime?.daily) return { current: 0, longest: 0 };
            
            const dates = Object.keys(userData.playtime.daily).sort().reverse();
            if (dates.length === 0) return { current: 0, longest: 0 };
            
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            
            let current = 0;
            let longest = 0;
            let tempStreak = 0;
            
            // Calculate current streak
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
            
            // Calculate longest streak
            for (let i = 0; i < dates.length; i++) {
                tempStreak = 1;
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
            
            const streak = { current, longest, lastPlayed: dates[0] };
            await database.ref(`users/${userId}/streak`).set(streak);
            return streak;
        }
    };
    
    // ===== PRESTIGE SYSTEM =====
    const PrestigeManager = {
        canPrestige(level) {
            return level >= 50;
        },
        
        async prestige(userId, currentLevel) {
            if (!this.canPrestige(currentLevel)) return false;
            
            const snapshot = await database.ref(`users/${userId}/prestige`).once('value');
            const currentPrestige = snapshot.val() || 0;
            
            await database.ref(`users/${userId}/prestige`).set(currentPrestige + 1);
            
            // Award prestige badge
            const badge = { level: currentLevel, date: Date.now() };
            await database.ref(`users/${userId}/prestigeBadges/${currentPrestige}`).set(badge);
            
            return currentPrestige + 1;
        },
        
        getPrestigeIcon(prestige) {
            if (prestige === 0) return '';
            return '⭐'.repeat(Math.min(prestige, 5)) + (prestige > 5 ? `+${prestige - 5}` : '');
        }
    };
    
    // ===== WEEKLY CHALLENGES =====
    const ChallengeManager = {
        CHALLENGES: [
            { id: 'variety', name: 'Variety Player', desc: 'Play 5 different games', check: (data) => Object.keys(data.playtime?.total || {}).length >= 5, reward: '🎯' },
            { id: 'consistent', name: 'Consistency', desc: 'Play on 3 different days', check: (data) => Object.keys(data.playtime?.daily || {}).filter(d => d >= new Date(Date.now() - 604800000).toISOString().split('T')[0]).length >= 3, reward: '📅' },
            { id: 'grind', name: 'Grinder', desc: 'Play 10 hours this week', check: (data) => RankManager.getWeeklyPlaytime(data) >= 36000, reward: '💪' }
        ],
        
        checkChallenges(userData) {
            return this.CHALLENGES.map(challenge => ({
                ...challenge,
                completed: challenge.check(userData)
            }));
        }
    };
    
    // ===== PROFILE FRAMES =====
    const FrameManager = {
        FRAMES: {
            default: { 
                name: 'Default', 
                css: 'border: 5px solid rgba(255,255,255,0.3);' 
            },
            bronze: { 
                name: 'Bronze', 
                css: 'border: 6px solid #CD7F32; box-shadow: 0 0 30px rgba(205, 127, 50, 0.6), inset 0 0 20px rgba(205, 127, 50, 0.2);', 
                unlock: 'Bronze Rank' 
            },
            silver: { 
                name: 'Silver', 
                css: 'border: 6px solid #C0C0C0; box-shadow: 0 0 35px rgba(192, 192, 192, 0.7), inset 0 0 20px rgba(192, 192, 192, 0.3); animation: shimmer 3s linear infinite;', 
                unlock: 'Silver Rank' 
            },
            gold: { 
                name: 'Gold', 
                css: 'border: 7px solid #FFD700; box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4), inset 0 0 25px rgba(255, 215, 0, 0.3); animation: goldPulse 2s ease-in-out infinite;', 
                unlock: 'Gold Rank' 
            },
            platinum: { 
                name: 'Platinum', 
                css: 'border: 7px solid #E5E4E2; box-shadow: 0 0 45px rgba(229, 228, 226, 0.9), 0 0 70px rgba(229, 228, 226, 0.5), inset 0 0 30px rgba(229, 228, 226, 0.4); animation: platinumGlow 2.5s ease-in-out infinite;', 
                unlock: 'Platinum Rank' 
            },
            diamond: { 
                name: 'Diamond', 
                css: 'border: 4px solid #B9F2FF; box-shadow: 0 0 50px rgba(185, 242, 255, 1), 0 0 80px rgba(185, 242, 255, 0.6), 0 0 100px rgba(185, 242, 255, 0.3), inset 0 0 35px rgba(185, 242, 255, 0.5); animation: diamondSparkle 2.5s ease-in-out infinite;', 
                unlock: 'Diamond Rank' 
            },
            mythic: { 
                name: 'Mythic Glow', 
                css: 'border: 8px solid #FF6B9D; box-shadow: 0 0 60px rgba(255, 107, 157, 1), 0 0 90px rgba(255, 107, 157, 0.7), 0 0 120px rgba(255, 107, 157, 0.4), inset 0 0 40px rgba(255, 107, 157, 0.6); animation: mythicPulse 2s ease-in-out infinite;', 
                unlock: 'Mythic Rank' 
            },
            rainbow: { 
                name: 'Season Champion', 
                css: 'border: 8px solid transparent; background: linear-gradient(#1f2937, #1f2937) padding-box, linear-gradient(45deg, #ff0080, #ff8c00, #40e0d0, #ff0080) border-box; box-shadow: 0 0 60px rgba(255, 0, 128, 0.8), 0 0 90px rgba(64, 224, 208, 0.6); animation: rainbowRotate 3s linear infinite;', 
                unlock: 'Win Season' 
            },
            prestige: { 
                name: 'Prestige Star', 
                css: 'border: 8px solid #fbbf24; box-shadow: 0 0 50px rgba(251, 191, 36, 1), 0 0 80px rgba(251, 191, 36, 0.6), inset 0 0 35px rgba(251, 191, 36, 0.5); animation: prestigeShine 2s ease-in-out infinite;', 
                unlock: 'Prestige' 
            }
        },
        
        getUnlockedFrames(userData, rank, seasonBadges, prestige) {
            const frames = ['default'];
            
            // Add rank-based frames
            if (rank.name === 'Bronze') frames.push('bronze');
            if (rank.name === 'Silver') frames.push('silver');
            if (rank.name === 'Gold') frames.push('gold');
            if (rank.name === 'Platinum') frames.push('platinum');
            if (rank.name === 'Diamond') frames.push('diamond');
            if (rank.name === 'Mythic') frames.push('mythic');
            
            // Season winner frame
            if (Object.keys(seasonBadges).some(s => seasonBadges[s].rank === 1)) frames.push('rainbow');
            
            // Prestige frame
            if (prestige > 0) frames.push('prestige');
            
            return frames;
        },
        
        getAutoFrame(rank, seasonBadges, prestige) {
            // Auto-select best frame
            if (Object.keys(seasonBadges).some(s => seasonBadges[s].rank === 1)) return 'rainbow';
            if (prestige > 0) return 'prestige';
            
            const rankFrames = {
                'Mythic': 'mythic',
                'Diamond': 'diamond',
                'Platinum': 'platinum',
                'Gold': 'gold',
                'Silver': 'silver',
                'Bronze': 'bronze'
            };
            
            return rankFrames[rank.name] || 'default';
        }
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
    
    console.log('✅ Enhanced Features loaded - Ranks, Seasons, Streaks, Prestige, Challenges');
})();