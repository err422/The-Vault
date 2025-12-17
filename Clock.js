////Home Page date and time clock\\\\

function updateClock() {
    const now = new Date();
    //gets date from user computer
    const date = now.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    //gets time from users computer
    const time = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });
    //updates #clock to display date & time
    document.getElementById('clock').textContent = `${date} — ${time}`;
}

// Runs on page load
updateClock();

// Updates clock every second
setInterval(updateClock, 1000);