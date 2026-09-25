// Clock
function updateClock() {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = now.getDate();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    document.getElementById('clock').textContent =
        `${month} - ${day} - ${hours}:${minutes}`;
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
