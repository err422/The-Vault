// Clock
function updateClock() {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = now.getDate();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    document.getElementById('clock').innerHTML =
        `<span class="clock-date">${month} - ${day}</span><span class="clock-separator">•</span><span class="clock-time">${hours}:${minutes} <span class="clock-period">${period}</span></span>`;
}

function updateVisitCount() {
    const display = document.getElementById('visit-count');
    if (!display || typeof database === 'undefined' || !database) return;

    database.ref('siteStats/visits').once('value')
        .then(function(snapshot) {
            const count = snapshot.val();
            if (count !== null && count !== undefined) {
                display.textContent = 'Total visits: ' + count;
            }
        })
        .catch(function(error) {
            console.warn('[Home] Could not load visit count:', error.message);
        });
}

updateClock();
setInterval(updateClock, 1000);
updateVisitCount();
