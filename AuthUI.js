async function renderLoggedInView(content) {
    console.log('🎨 Rendering enhanced account view for:', currentUsername);
    
    // Show loading state first
    content.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 40px;
            ">👤</div>
            
            <p style="font-size: 20px; margin-bottom: 8px; font-weight: 600;">@${currentUsername}</p>
            <p style="font-size: 14px; color: #888; margin-bottom: 20px;">${currentUser?.email || 'No email'}</p>
            
            <div style="color: #888; padding: 20px;">Loading stats...</div>
        </div>
    `;
    
    // Load user stats from Firebase
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}`).once('value');
        const userData = snapshot.val();
        
        // Calculate stats
        const stats = calculateStats(userData);
        const achievements = calculateAchievements(userData, stats);
        
        // Render full account view
        content.innerHTML = `
            <div style="text-align: center; color: white; max-height: 70vh; overflow-y: auto; padding-right: 10px;">
                <!-- Profile Header -->
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    font-size: 40px;
                    position: relative;
                ">
                    👤
                    ${stats.level > 1 ? `
                        <div style="
                            position: absolute;
                            bottom: -5px;
                            right: -5px;
                            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                            border: 2px solid #1f2937;
                            border-radius: 50%;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 14px;
                            font-weight: 700;
                        ">${stats.level}</div>
                    ` : ''}
                </div>
                
                <p style="font-size: 24px; margin-bottom: 4px; font-weight: 700;">@${currentUsername}</p>
                <p style="font-size: 14px; color: #888; margin-bottom: 8px;">${currentUser?.email}</p>
                <p style="font-size: 12px; color: #667eea; font-weight: 600;">Level ${stats.level} • ${stats.title}</p>

                <!-- Quick Stats -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin: 20px 0;
                ">
                    <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 12px;">
                        <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${stats.totalPlaytimeFormatted}</div>
                        <div style="font-size: 11px; color: #888; margin-top: 4px;">Total Playtime</div>
                    </div>
                    <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 10px; padding: 12px;">
                        <div style="font-size: 20px; font-weight: 700; color: #22c55e;">${stats.gamesPlayed}</div>
                        <div style="font-size: 11px; color: #888; margin-top: 4px;">Games Played</div>
                    </div>
                    <div style="background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 10px; padding: 12px;">
                        <div style="font-size: 20px; font-weight: 700; color: #fbbf24;">${achievements.unlockedCount}/${achievements.total}</div>
                        <div style="font-size: 11px; color: #888; margin-top: 4px;">Achievements</div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: left;">
                    <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">📊 Recent Activity</h3>
                    ${renderRecentActivity(userData)}
                </div>

                <!-- Achievements Section -->
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: left;">
                    <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">🏆 Achievements</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        ${achievements.list.map(achievement => `
                            <div style="
                                background: ${achievement.unlocked ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.05)'};
                                border: 1px solid ${achievement.unlocked ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.1)'};
                                border-radius: 8px;
                                padding: 10px;
                                text-align: center;
                                position: relative;
                                ${!achievement.unlocked ? 'opacity: 0.5;' : ''}
                            ">
                                <div style="font-size: 24px; margin-bottom: 4px; ${!achievement.unlocked ? 'filter: grayscale(100%);' : ''}">${achievement.icon}</div>
                                <div style="font-size: 11px; font-weight: 600; color: ${achievement.unlocked ? '#fbbf24' : '#888'};">${achievement.name}</div>
                                <div style="font-size: 9px; color: #666; margin-top: 2px;">${achievement.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Action Buttons -->
                <button id="change-username-btn" style="
                    width: 100%;
                    padding: 14px;
                    margin-bottom: 10px;
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid #3b82f6;
                    color: #3b82f6;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                    transition: all 0.2s;
                ">Change Username</button>

                <button id="sign-out-btn" style="
                    width: 100%;
                    padding: 14px;
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                    transition: all 0.2s;
                ">Sign Out</button>
            </div>
        `;

        // Attach event listeners
        attachAccountButtonListeners();
        
        console.log('✅ Enhanced account view rendered');
        
    } catch (error) {
        console.error('❌ Error loading user stats:', error);
        // Fallback to basic view
        content.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    font-size: 40px;
                ">👤</div>
                
                <p style="font-size: 20px; margin-bottom: 8px; font-weight: 600;">@${currentUsername}</p>
                <p style="font-size: 14px; color: #888; margin-bottom: 30px;">${currentUser?.email}</p>

                <button id="change-username-btn" style="
                    width: 100%;
                    padding: 14px;
                    margin-bottom: 10px;
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid #3b82f6;
                    color: #3b82f6;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                    transition: all 0.2s;
                ">Change Username</button>

                <button id="sign-out-btn" style="
                    width: 100%;
                    padding: 14px;
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                    transition: all 0.2s;
                ">Sign Out</button>
            </div>
        `;
        attachAccountButtonListeners();
    }
}

function calculateStats(userData) {
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
    
    // Calculate level based on playtime (1 level per hour)
    const level = Math.floor(totalPlaytime / 3600) + 1;
    
    // Determine title based on level
    let title = 'Newcomer';
    if (level >= 50) title = 'Legend';
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
        title
    };
}

function calculateAchievements(userData, stats) {
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
    
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    
    return {
        list: achievements,
        unlockedCount,
        total: achievements.length
    };
}

function renderRecentActivity(userData) {
    if (!userData.playtime || !userData.playtime.daily) {
        return '<div style="color: #666; font-size: 12px; padding: 10px; text-align: center;">No recent activity</div>';
    }
    
    // Get last 3 days of activity
    const days = [];
    for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
    }
    
    let html = '';
    let hasActivity = false;
    
    days.forEach(date => {
        if (userData.playtime.daily[date]) {
            hasActivity = true;
            const games = userData.playtime.daily[date];
            const totalSeconds = Object.values(games).reduce((sum, s) => sum + Number(s), 0);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            html += `
                <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: #888;">${dateStr}</span>
                        <span style="font-size: 12px; font-weight: 600; color: #3b82f6;">${timeStr}</span>
                    </div>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">${Object.keys(games).length} game${Object.keys(games).length !== 1 ? 's' : ''} played</div>
                </div>
            `;
        }
    });
    
    if (!hasActivity) {
        return '<div style="color: #666; font-size: 12px; padding: 10px; text-align: center;">No recent activity</div>';
    }
    
    return html;
}

function attachAccountButtonListeners() {
    const changeUsernameBtn = document.getElementById('change-username-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    
    if (changeUsernameBtn) {
        changeUsernameBtn.addEventListener('click', showChangeUsernameForm);
        changeUsernameBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        changeUsernameBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    }
    
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
        signOutBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        signOutBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    }
}
})();
