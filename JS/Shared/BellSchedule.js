////Bell Schedule extension with Notifications\\\\

const bellSchedules = {
    monday: [
        { name: "Early Bird", start: "7:10", end: "7:50" },
        { name: "AM Support", start: "8:00", end: "8:25" },
        { name: "Block 1", start: "8:30", end: "9:03" },
        { name: "Block 2", start: "9:08", end: "9:41" },
        { name: "Block 3", start: "9:46", end: "10:19" },
        { name: "Block 4", start: "10:24", end: "10:57" },
        { name: "Lunch 1", start: "11:02", end: "11:35", overlapping: true, overlapsWith: "Block 5A" },
        { name: "Block 5A", start: "11:02", end: "11:35", hidden: true },
        { name: "Lunch 2", start: "11:40", end: "12:13", overlapping: true, overlapsWith: "Block 5B" },
        { name: "Block 5B", start: "11:40", end: "12:13", hidden: true },
        { name: "Block 6", start: "12:18", end: "12:51" },
        { name: "Block 7", start: "12:56", end: "13:29" },
        { name: "Block 8", start: "13:34", end: "14:07" }
    ],
    orange: [ // Tuesday & Thursday
        { name: "Early Bird", start: "7:10", end: "7:50" },
        { name: "AM Support", start: "8:00", end: "8:25" },
        { name: "Block 1", start: "8:30", end: "9:55" },
        { name: "Block 3", start: "10:05", end: "11:30" },
        { name: "Lunch 1", start: "11:40", end: "12:20", overlapping: true, overlapsWith: "Block 5A" },
        { name: "Block 5A", start: "11:40", end: "13:05", hidden: true },
        { name: "Lunch 2", start: "13:15", end: "13:55", overlapping: true, overlapsWith: "Block 5B" },
        { name: "Block 5B", start: "12:30", end: "13:55", hidden: true },
        { name: "Block 7", start: "14:05", end: "15:35" }
    ],
    blue: [ // Wednesday & Friday
        { name: "Early Bird", start: "7:10", end: "7:50" },
        { name: "AM Support", start: "8:00", end: "8:25" },
        { name: "Block 2", start: "8:30", end: "9:55" },
        { name: "Block 4", start: "10:05", end: "11:30" },
        { name: "Lunch 1", start: "11:40", end: "12:20", overlapping: true, overlapsWith: "Block 6A" },
        { name: "Block 6A", start: "11:40", end: "13:05", hidden: true },
        { name: "Lunch 2", start: "13:15", end: "13:55", overlapping: true, overlapsWith: "Block 6B" },
        { name: "Block 6B", start: "12:30", end: "13:55", hidden: true },
        { name: "Block 8", start: "14:05", end: "15:35" }
    ]
};

// Notification settings - customize these!
const notificationSettings = {
    enabled: true,
    soundEnabled: true,
    reminders: [
        { minutesBefore: 5, message: "5 minutes left in class!" },
        { minutesBefore: 1, message: "1 minute left - start packing up!" },
        { minutesBefore: 0, message: "Class is ending now!" }
    ],
    passingPeriodReminder: true, // Show when passing period starts
    nextClassReminder: true // Show when next class is about to start
};

// Track which notifications have been shown
let shownNotifications = new Set();

function getScheduleForDay(date) {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (day === 1) return { type: 'monday', schedule: bellSchedules.monday };
    if (day === 2 || day === 4) return { type: 'orange', schedule: bellSchedules.orange };
    if (day === 3 || day === 5) return { type: 'blue', schedule: bellSchedules.blue };
    
    return { type: 'weekend', schedule: [] }; // Weekend
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function getCurrentPeriod() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const { type, schedule } = getScheduleForDay(now);
    
    if (type === 'weekend') {
        return {
            type: 'weekend',
            message: 'No school today! 🎉'
        };
    }
    
    // Check for overlapping periods (lunch with blocks)
    for (let i = 0; i < schedule.length; i++) {
        const period = schedule[i];
        const startMinutes = timeToMinutes(period.start);
        const endMinutes = timeToMinutes(period.end);
        
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            // Check if there's an overlapping period
            if (period.overlapping && period.overlapsWith) {
                const overlapPeriod = schedule.find(p => p.name === period.overlapsWith);
                if (overlapPeriod) {
                    const overlapEndMinutes = timeToMinutes(overlapPeriod.end);
                    const minutesLeft1 = endMinutes - currentMinutes;
                    const minutesLeft2 = overlapEndMinutes - currentMinutes;
                    
                    return {
                        type: 'overlapping-periods',
                        period1: period,
                        period2: overlapPeriod,
                        minutesLeft1: minutesLeft1,
                        minutesLeft2: minutesLeft2,
                        scheduleType: type
                    };
                }
            }
            
            const minutesLeft = endMinutes - currentMinutes;
            return {
                type: 'in-period',
                period: period,
                minutesLeft: minutesLeft,
                scheduleType: type
            };
        }
        
        // Check if we're in passing period
        if (i < schedule.length - 1) {
            const nextPeriod = schedule[i + 1];
            const nextStartMinutes = timeToMinutes(nextPeriod.start);
            
            if (currentMinutes >= endMinutes && currentMinutes < nextStartMinutes) {
                const minutesUntilNext = nextStartMinutes - currentMinutes;
                return {
                    type: 'passing',
                    nextPeriod: nextPeriod,
                    minutesUntilNext: minutesUntilNext,
                    scheduleType: type
                };
            }
        }
    }
    
    // Before school starts
    const firstPeriod = schedule[0];
    const firstStartMinutes = timeToMinutes(firstPeriod.start);
    if (currentMinutes < firstStartMinutes) {
        const minutesUntilStart = firstStartMinutes - currentMinutes;
        return {
            type: 'before-school',
            nextPeriod: firstPeriod,
            minutesUntilStart: minutesUntilStart,
            scheduleType: type
        };
    }
    
    // After school
    return {
        type: 'after-school',
        message: 'School day ended! 🎒',
        scheduleType: type
    };
}

// NOTIFICATION SYSTEM
function showNotification(title, message, type = 'info') {
    const browserWindow = document.getElementById('browser-window');
    if (!browserWindow) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'bell-notification';
    
    // Different styles based on type
    const styles = {
        info: { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', icon: 'ℹ️' },
        warning: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: '⚠️' },
        success: { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', icon: '✓' },
        urgent: { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: '🔔' }
    };
    
    const style = styles[type] || styles.info;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        background: ${style.bg};
        color: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        z-index: 999999;
        animation: slideInRight 0.4s ease, fadeOut 0.3s ease 4.7s;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        pointer-events: all;
    `;
    
    notification.innerHTML = `
        <div style="font-size: 24px; flex-shrink: 0;">${style.icon}</div>
        <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 14px; opacity: 0.95;">${message}</div>
        </div>
        <button class="close-notification" style="background: none; border: none; color: white; 
                font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px;
                display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                opacity: 0.7; transition: opacity 0.2s;">×</button>
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('notification-animations')) {
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                to { opacity: 0; transform: translateX(400px); }
            }
            .close-notification:hover {
                opacity: 1 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    browserWindow.appendChild(notification);
    
    // Play sound if enabled
    if (notificationSettings.soundEnabled) {
        playNotificationSound();
    }
    
    // Close button functionality
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Could not play notification sound:', e);
    }
}

function checkAndShowNotifications() {
    if (!notificationSettings.enabled) return;
    
    const info = getCurrentPeriod();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Create a unique key for this minute to avoid duplicate notifications
    const timeKey = `${now.getHours()}:${now.getMinutes()}`;
    
    // Reset shown notifications at the start of each new minute
    if (!window.lastNotificationMinute || window.lastNotificationMinute !== timeKey) {
        shownNotifications.clear();
        window.lastNotificationMinute = timeKey;
    }
    
    // Check for class ending reminders
    if (info.type === 'in-period') {
        notificationSettings.reminders.forEach(reminder => {
            if (info.minutesLeft === reminder.minutesBefore) {
                const notifKey = `${info.period.name}-${reminder.minutesBefore}`;
                if (!shownNotifications.has(notifKey)) {
                    const notifType = reminder.minutesBefore <= 1 ? 'warning' : 'info';
                    showNotification(
                        info.period.name,
                        reminder.message,
                        notifType
                    );
                    shownNotifications.add(notifKey);
                }
            }
        });
    }
    
    // Check for overlapping periods
    if (info.type === 'overlapping-periods') {
        notificationSettings.reminders.forEach(reminder => {
            // Check both periods
            if (info.minutesLeft1 === reminder.minutesBefore) {
                const notifKey = `${info.period1.name}-${reminder.minutesBefore}`;
                if (!shownNotifications.has(notifKey)) {
                    showNotification(
                        info.period1.name,
                        reminder.message,
                        'info'
                    );
                    shownNotifications.add(notifKey);
                }
            }
            if (info.minutesLeft2 === reminder.minutesBefore) {
                const notifKey = `${info.period2.name}-${reminder.minutesBefore}`;
                if (!shownNotifications.has(notifKey)) {
                    showNotification(
                        info.period2.name,
                        reminder.message,
                        'info'
                    );
                    shownNotifications.add(notifKey);
                }
            }
        });
    }
    
    // Passing period notification
    if (info.type === 'passing' && notificationSettings.passingPeriodReminder) {
        const notifKey = `passing-${info.nextPeriod.name}`;
        if (!shownNotifications.has(notifKey)) {
            showNotification(
                'Passing Period',
                `Next: ${info.nextPeriod.name} in ${info.minutesUntilNext} minutes`,
                'success'
            );
            shownNotifications.add(notifKey);
        }
    }
    
    // Next class starting soon
    if (info.type === 'passing' && info.minutesUntilNext === 2 && notificationSettings.nextClassReminder) {
        const notifKey = `next-class-${info.nextPeriod.name}`;
        if (!shownNotifications.has(notifKey)) {
            showNotification(
                'Heads Up!',
                `${info.nextPeriod.name} starts in 2 minutes`,
                'urgent'
            );
            shownNotifications.add(notifKey);
        }
    }
}

function createBellScheduleWidget() {
    console.log('Bell schedule widget initialized - will appear in browser toolbar');
}

function addBellIconToToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) {
        console.log('Toolbar not found');
        return;
    }
    
    // Create bell button for toolbar
    const bellButton = document.createElement('button');
    bellButton.id = 'bell-schedule-toolbar-btn';
    bellButton.innerHTML = '🔔';
    bellButton.title = 'Bell Schedule';
    bellButton.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        border: none;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        margin-left: 8px;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
    `;
    
    bellButton.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.5)';
    });
    
    bellButton.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 2px 8px rgba(251, 191, 36, 0.3)';
    });
    
    bellButton.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('Bell button clicked!');
        toggleBellSchedulePopup();
    });
    
    const addressBar = toolbar.querySelector('div')?.nextElementSibling;
    if (addressBar) {
        toolbar.insertBefore(bellButton, addressBar.nextSibling);
    } else {
        toolbar.appendChild(bellButton);
    }
    
    console.log('Bell icon added to toolbar');
    
    // Update every second
    setInterval(() => {
        updateBellSchedule();
        checkAndShowNotifications();
    }, 1000);
}

function toggleBellSchedulePopup() {
    let popup = document.getElementById('bell-schedule-popup');
    
    if (popup) {
        popup.remove();
        return;
    }
    
    const info = getCurrentPeriod();
    
    const scheduleBackgrounds = {
        monday: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
        orange: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
        blue: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
        weekend: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
    };
    
    const bgColor = scheduleBackgrounds[info.scheduleType] || scheduleBackgrounds.weekend;
    
    const bellButton = document.getElementById('bell-schedule-toolbar-btn');
    const browserWindow = document.getElementById('browser-window');
    
    if (!bellButton || !browserWindow) {
        console.error('Bell button or browser window not found');
        return;
    }
    
    popup = document.createElement('div');
    popup.id = 'bell-schedule-popup';
    popup.style.cssText = `
        position: absolute;
        top: 100px;
        right: 20px;
        width: 340px;
        background: ${bgColor};
        border-radius: 16px;
        overflow: hidden;
        z-index: 99999;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
        animation: slideIn 0.3s ease;
        pointer-events: all;
    `;
    
    const slideInStyle = document.createElement('style');
    slideInStyle.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    if (!document.getElementById('bell-slide-in-style')) {
        slideInStyle.id = 'bell-slide-in-style';
        document.head.appendChild(slideInStyle);
    }
    
    popup.innerHTML = `
        <div style="padding: 20px 24px; position: relative;">
            <button id="close-bell-popup" style="position: absolute; top: 16px; right: 16px;
                    background: rgba(255,255,255,0.2); border: none; color: white; 
                    font-size: 20px; cursor: pointer; padding: 4px 8px; width: 28px; height: 28px;
                    border-radius: 6px; display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s ease;">×</button>
            
            <h2 style="color: white; margin: 0 0 16px 0; font-size: 24px; font-weight: 700; text-align: center;">
                ${getScheduleTitle(info.scheduleType)}
            </h2>
            
            <div style="text-align: center; margin-bottom: 16px;">
                <label style="display: flex; align-items: center; justify-content: center; gap: 8px; 
                              color: white; font-size: 14px; cursor: pointer;">
                    <input type="checkbox" id="notification-toggle" 
                           ${notificationSettings.enabled ? 'checked' : ''}
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <span>Enable Notifications</span>
                </label>
            </div>
            
            <div id="bell-schedule-content" style="color: white;"></div>
        </div>
        
        <div style="background: white; padding: 16px 24px; text-align: center; color: #666; font-size: 13px;">
            Scroll down for schedule
        </div>
    `;
    
    browserWindow.appendChild(popup);
    
    console.log('Bell schedule popup created and appended');
    
    // Notification toggle
    const notifToggle = document.getElementById('notification-toggle');
    notifToggle.addEventListener('change', (e) => {
        notificationSettings.enabled = e.target.checked;
        if (e.target.checked) {
            showNotification('Notifications Enabled', 'You\'ll receive class reminders', 'success');
        }
    });
    
    const closeBtn = document.getElementById('close-bell-popup');
    closeBtn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255,255,255,0.3)';
    });
    closeBtn.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255,255,255,0.2)';
    });
    closeBtn.addEventListener('click', () => {
        popup.remove();
    });
    
    document.addEventListener('click', function closeOutside(e) {
        if (!popup.contains(e.target) && e.target.id !== 'bell-schedule-btn') {
            popup.remove();
            document.removeEventListener('click', closeOutside);
        }
    });
    
    updateBellSchedule();
}

function updateBellSchedule() {
    const content = document.getElementById('bell-schedule-content');
    if (!content) return;
    
    const info = getCurrentPeriod();
    
    const scheduleList = document.getElementById('bell-schedule-list');
    const scrollPos = scheduleList ? scheduleList.scrollTop : 0;
    
    let html = '';
    
    if (info.type === 'weekend') {
        html += `
            <div style="text-align: center; padding: 30px 0;">
                <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                <div style="font-size: 18px; font-weight: 600;">
                    ${info.message}
                </div>
            </div>
        `;
    } else if (info.type === 'overlapping-periods') {
        html += `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
                    <div style="width: 28px; height: 28px; background: rgba(255,255,255,0.3); 
                                border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 14px; height: 14px; background: white; border-radius: 50%;"></div>
                    </div>
                    <div style="font-size: 18px; font-weight: 600;">
                        ${info.period1.name} ends at ${formatTime(info.period1.end)}
                    </div>
                </div>
                <div style="font-size: 16px; opacity: 0.9; margin-bottom: 16px;">
                    (in <strong>${info.minutesLeft1}m</strong>)
                </div>
                
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
                    <div style="width: 28px; height: 28px; background: rgba(255,255,255,0.3); 
                                border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 14px; height: 14px; background: white; border-radius: 50%;"></div>
                    </div>
                    <div style="font-size: 18px; font-weight: 600;">
                        ${info.period2.name} ends at ${formatTime(info.period2.end)}
                    </div>
                </div>
                <div style="font-size: 16px; opacity: 0.9;">
                    (in <strong>${info.minutesLeft2}m</strong>)
                </div>
            </div>
            
            <div style="height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; margin-bottom: 16px;">
                <div style="height: 100%; background: white; border-radius: 2px; width: 40%; transition: width 1s linear;"></div>
            </div>
        `;
        
        const { schedule } = getScheduleForDay(new Date());
        const currentIndex = schedule.findIndex(p => p.name === info.period2.name);
        if (currentIndex >= 0 && currentIndex < schedule.length - 1) {
            const nextPeriod = schedule[currentIndex + 1];
            if (!nextPeriod.hidden) {
                html += `
                    <div style="text-align: center; font-size: 15px; opacity: 0.9;">
                        The next period is ${nextPeriod.name}, which ends at ${formatTime(nextPeriod.end)}.
                    </div>
                `;
            }
        }
    } else if (info.type === 'in-period') {
        const isOverlapping = info.period.overlapping;
        
        html += `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.3); 
                                border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 16px; height: 16px; background: white; border-radius: 50%;"></div>
                    </div>
                    <div style="font-size: 20px; font-weight: 600;">
                        ${info.period.name} ends at ${formatTime(info.period.end)}
                    </div>
                </div>
                <div style="font-size: 18px; opacity: 0.9;">
                    (in <strong>${info.minutesLeft}m</strong>)
                </div>
                ${isOverlapping && info.period.detail ? `
                    <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.15); 
                                border-radius: 8px; font-size: 14px; opacity: 0.9;">
                        ℹ️ ${info.period.detail}
                    </div>
                ` : ''}
            </div>
            
            <div style="height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; margin-bottom: 16px;">
                <div style="height: 100%; background: white; border-radius: 2px; width: 40%; transition: width 1s linear;"></div>
            </div>
        `;
        
        const { schedule } = getScheduleForDay(new Date());
        const currentIndex = schedule.findIndex(p => p.name === info.period.name);
        if (currentIndex >= 0 && currentIndex < schedule.length - 1) {
            const nextPeriod = schedule[currentIndex + 1];
            html += `
                <div style="text-align: center; font-size: 15px; opacity: 0.9;">
                    The next period is ${nextPeriod.name}, which ends at ${formatTime(nextPeriod.end)}.
                </div>
            `;
        }
    } else if (info.type === 'passing') {
        html += `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">
                    Passing Period
                </div>
                <div style="font-size: 16px; opacity: 0.9;">
                    Next: ${info.nextPeriod.name} in <strong>${info.minutesUntilNext}m</strong>
                </div>
            </div>
        `;
    } else if (info.type === 'before-school') {
        html += `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">
                    Before School
                </div>
                <div style="font-size: 16px; opacity: 0.9;">
                    ${info.nextPeriod.name} starts in <strong>${info.minutesUntilStart}m</strong>
                </div>
            </div>
        `;
    } else if (info.type === 'after-school') {
        html += `
            <div style="text-align: center; padding: 30px 0;">
                <div style="font-size: 48px; margin-bottom: 10px;">🎒</div>
                <div style="font-size: 18px; font-weight: 600;">
                    ${info.message}
                </div>
            </div>
        `;
    }
    
    const { schedule } = getScheduleForDay(new Date());
    if (schedule && schedule.length > 0 && info.type !== 'weekend') {
        html += `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
                <div id="bell-schedule-list" style="max-height: 250px; overflow-y: auto; padding-right: 8px;">
        `;
        
        const currentPeriodName = info.type === 'in-period' ? info.period.name : null;
        
        schedule.forEach(period => {
            if (period.hidden) return;
            
            const isCurrentPeriod = period.name === currentPeriodName;
            
            html += `
                <div style="display: flex; justify-content: space-between; padding: 10px 12px; 
                            margin-bottom: 6px; border-radius: 8px;
                            background: ${isCurrentPeriod ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'};
                            ${isCurrentPeriod ? 'font-weight: 600;' : ''}">
                    <span>${period.name}</span>
                    <span style="opacity: 0.8; white-space: nowrap; margin-left: 8px;">${formatTime(period.start)} - ${formatTime(period.end)}</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
    
    const newScheduleList = document.getElementById('bell-schedule-list');
    if (newScheduleList && scrollPos > 0) {
        newScheduleList.scrollTop = scrollPos;
    }
}

function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getScheduleTitle(scheduleType) {
    const titles = {
        monday: 'Wildkit Monday',
        orange: 'Orange Day',
        blue: 'Blue Day',
        weekend: 'Weekend'
    };
    return titles[scheduleType] || 'Bell Schedule';
}

document.addEventListener('DOMContentLoaded', function() {
    createBellScheduleWidget();
});