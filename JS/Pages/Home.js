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

updateClock();
setInterval(updateClock, 1000);

// Add click handlers for nav items (excluding fullscreen which is handled above)
document.querySelectorAll('.nav-item:not(#fullscreen-btn)').forEach(item => {
    item.addEventListener('click', function () {
        const label = this.querySelector('.nav-label').textContent;
        console.log(label + ' clicked');
    });
});
