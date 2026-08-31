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

})();
