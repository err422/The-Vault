(function() {
    
    // Helper: Get week number in format "2026-W01"
    function getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return d.getFullYear() + '-W' + String(weekNo).padStart(2, '0');
    }
    
    // Helper: Get month in format "2026-01"
    function getMonthString(date) {
        const d = new Date(date);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }
    
    // Helper: Get year in format "2026"
    function getYearString(date) {
        return new Date(date).getFullYear().toString();
    }
    
    // Helper: Calculate days ago from today
    function daysAgo(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        const diffTime = today - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    
    // Main consolidation function
    async function consolidatePlaytime(userId) {
        console.log('🔄 Starting playtime consolidation for user:', userId);
        
        try {
            // Get all playtime data
            const snapshot = await database.ref(`users/${userId}/playtime`).once('value');
            const data = snapshot.val();
            
            if (!data) {
                console.log('No playtime data to consolidate');
                return;
            }
            
            const daily = data.daily || {};
            const weekly = data.weekly || {};
            const monthly = data.monthly || {};
            
            let updates = {};
            
            // === STEP 1: Consolidate old daily entries into weekly ===
            console.log('📅 Checking daily entries...');
            for (const dateStr in daily) {
                const age = daysAgo(dateStr);
                
                if (age >= 7) {
                    console.log(`  Moving ${dateStr} to weekly (${age} days old)`);
                    const weekStr = getWeekNumber(dateStr);
                    
                    // Merge this day's data into the appropriate week
                    for (const game in daily[dateStr]) {
                        const seconds = daily[dateStr][game];
                        const weekPath = `weekly/${weekStr}/${game}`;
                        const currentWeeklySeconds = (weekly[weekStr] && weekly[weekStr][game]) || 0;
                        updates[weekPath] = currentWeeklySeconds + seconds;
                    }
                    
                    // Mark this daily entry for deletion
                    updates[`daily/${dateStr}`] = null;
                }
            }
            
            // === STEP 2: Consolidate old weekly entries into monthly ===
            console.log('📊 Checking weekly entries...');
            for (const weekStr in weekly) {
                // Extract year and week number from "2026-W01"
                const [year, weekPart] = weekStr.split('-W');
                const weekNum = parseInt(weekPart);
                
                // Calculate approximate date (first day of that week)
                const jan1 = new Date(year, 0, 1);
                const daysOffset = (weekNum - 1) * 7;
                const weekDate = new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000);
                const age = daysAgo(weekDate.toISOString().split('T')[0]);
                
                if (age >= 28) { // 4 weeks
                    console.log(`  Moving ${weekStr} to monthly (${age} days old)`);
                    const monthStr = getMonthString(weekDate);
                    
                    // Merge this week's data into the appropriate month
                    for (const game in weekly[weekStr]) {
                        const seconds = weekly[weekStr][game];
                        const monthPath = `monthly/${monthStr}/${game}`;
                        const currentMonthlySeconds = (monthly[monthStr] && monthly[monthStr][game]) || 0;
                        updates[monthPath] = currentMonthlySeconds + seconds;
                    }
                    
                    // Mark this weekly entry for deletion
                    updates[`weekly/${weekStr}`] = null;
                }
            }
            
            // === STEP 3: Consolidate old monthly entries into yearly ===
            console.log('📈 Checking monthly entries...');
            for (const monthStr in monthly) {
                const monthDate = new Date(monthStr + '-01');
                const age = daysAgo(monthDate.toISOString().split('T')[0]);
                
                if (age >= 365) { // 12 months
                    console.log(`  Moving ${monthStr} to yearly (${age} days old)`);
                    const yearStr = getYearString(monthDate);
                    
                    // Merge this month's data into the appropriate year
                    for (const game in monthly[monthStr]) {
                        const seconds = monthly[monthStr][game];
                        const yearPath = `yearly/${yearStr}/${game}`;
                        
                        // Need to get current yearly data
                        const yearlySnapshot = await database.ref(`users/${userId}/playtime/yearly/${yearStr}/${game}`).once('value');
                        const currentYearlySeconds = yearlySnapshot.val() || 0;
                        updates[yearPath] = currentYearlySeconds + seconds;
                    }
                    
                    // Mark this monthly entry for deletion
                    updates[`monthly/${monthStr}`] = null;
                }
            }
            
            // === STEP 4: Apply all updates at once ===
            if (Object.keys(updates).length > 0) {
                console.log('💾 Applying', Object.keys(updates).length, 'updates...');
                await database.ref(`users/${userId}/playtime`).update(updates);
                console.log('✅ Consolidation complete!');
            } else {
                console.log('✅ No consolidation needed - data is already clean!');
            }
            
        } catch (error) {
            console.error('❌ Error during consolidation:', error);
        }
    }
    
    // Export the function
    window.consolidatePlaytime = consolidatePlaytime;
    
})();