/**
 * Bell — independent ETHS bell schedule app for The Web Vault WebOS.
 * Schedule choice can be overridden for special days; countdowns use wall-clock time.
 */
const BELL_SCHEDULES = {
  monday: {
    label: 'Wildkit Monday',
    periods: [
      ['Early Bird', '07:10', '07:50'],
      ['AM Support', '08:00', '08:25'],
      ['Block 1', '08:30', '09:03'],
      ['Block 2', '09:08', '09:41'],
      ['Block 3', '09:46', '10:19'],
      ['Block 4', '10:24', '10:57'],
      ['Lunch 1 / Block 5', '11:02', '11:35'],
      ['Lunch 2 / Block 5', '11:40', '12:13'],
      ['Block 6', '12:18', '12:51'],
      ['Block 7', '12:56', '13:29'],
      ['Block 8', '13:34', '14:07']
    ]
  },
  orange: {
    label: 'Orange Day',
    periods: [
      ['Early Bird', '07:10', '07:50'],
      ['AM Support', '08:00', '08:25'],
      ['Block 1', '08:30', '09:55'],
      ['Passing Period', '09:55', '10:05'],
      ['Block 3', '10:05', '11:30'],
      ['Block 5 / Lunch window', '11:40', '13:55'],
      ['Block 7', '14:05', '15:35']
    ]
  },
  blue: {
    label: 'Blue Day',
    periods: [
      ['Early Bird', '07:10', '07:50'],
      ['AM Support', '08:00', '08:25'],
      ['Block 2', '08:30', '09:55'],
      ['Passing Period', '09:55', '10:05'],
      ['Block 4', '10:05', '11:30'],
      ['Block 6 / Lunch window', '11:40', '13:55'],
      ['Block 8', '14:05', '15:35']
    ]
  }
};

const BELL_OVERRIDE_KEY = 'vaultos_bell_day_override_v1';

export const AppManifest = {
  id: 'bell',
  name: 'Bell',
  icon: '🔔',
  category: 'Utility',
  version: '1.0.0',
  singleton: true,
  defaultSize: { width: 620, height: 700 },
  minSize: { width: 360, height: 460 },

  mount(containerEl) {
    let timer = null;
    let override = 'auto';
    try {
      const saved = localStorage.getItem(BELL_OVERRIDE_KEY);
      if (saved && ['auto', 'monday', 'orange', 'blue', 'none'].includes(saved)) override = saved;
    } catch {}

    containerEl.innerHTML = `
      <section class="bell-app" aria-label="Bell schedule">
        <header class="bell-app__header">
          <div class="bell-app__brand"><span class="bell-app__icon">🔔</span><div><h1>Bell</h1><p>ETHS schedule</p></div></div>
          <label class="bell-app__day-label">Day
            <select class="bell-app__day">
              <option value="auto">Automatic</option>
              <option value="monday">Wildkit Monday</option>
              <option value="orange">Orange Day</option>
              <option value="blue">Blue Day</option>
              <option value="none">No school</option>
            </select>
          </label>
        </header>
        <div class="bell-app__hero">
          <div class="bell-app__eyebrow">CURRENT STATUS</div>
          <div class="bell-app__status">Checking schedule…</div>
          <div class="bell-app__countdown">--:--</div>
          <div class="bell-app__caption">until the next bell</div>
          <div class="bell-app__progress"><span></span></div>
          <div class="bell-app__times"><span class="bell-app__start">--:--</span><span class="bell-app__end">--:--</span></div>
        </div>
        <div class="bell-app__schedule-head"><div><h2>Today's schedule</h2><p class="bell-app__date"></p></div><span class="bell-app__type"></span></div>
        <div class="bell-app__list" role="list"></div>
        <footer class="bell-app__footer"><span>Times are shown in your device's local timezone.</span><button type="button" class="bell-app__reset">Use automatic day</button></footer>
      </section>`;

    const styleId = 'vault-bell-app-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .bell-app{height:100%;box-sizing:border-box;overflow:auto;padding:22px;background:radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.18),transparent 50%),#0d0916;color:#f5f3ff;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .bell-app *{box-sizing:border-box}.bell-app__header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}
        .bell-app__brand{display:flex;align-items:center;gap:12px}.bell-app__icon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:rgba(139,92,246,.2);font-size:23px;border:1px solid rgba(167,139,250,.25)}
        .bell-app h1{font-size:21px;line-height:1.2;margin:0;font-weight:750}.bell-app__brand p,.bell-app__schedule-head p{margin:4px 0 0;color:#a99cbd;font-size:12px}
        .bell-app__day-label{display:flex;align-items:center;gap:8px;color:#b8aacd;font-size:12px}.bell-app__day{max-width:160px;padding:9px 10px;border-radius:9px;border:1px solid #493565;background:#171024;color:#f5f3ff;outline:none}
        .bell-app__hero{padding:22px;border-radius:18px;background:linear-gradient(135deg,rgba(91,33,182,.32),rgba(30,20,48,.92));border:1px solid rgba(167,139,250,.23);box-shadow:0 12px 35px #0003;text-align:center}
        .bell-app__eyebrow{font-size:10px;letter-spacing:.16em;color:#c4b5fd;font-weight:750}.bell-app__status{font-size:22px;font-weight:750;margin-top:10px}.bell-app__countdown{font-size:clamp(42px,8vw,64px);line-height:1.15;font-variant-numeric:tabular-nums;letter-spacing:-.04em;font-weight:800;margin-top:8px}
        .bell-app__caption{color:#b8aacd;font-size:12px;margin-top:2px}.bell-app__progress{height:5px;background:#ffffff14;border-radius:99px;overflow:hidden;margin:20px 0 8px}.bell-app__progress span{display:block;height:100%;width:0;background:linear-gradient(90deg,#8b5cf6,#c4b5fd);border-radius:99px;transition:width .25s}
        .bell-app__times{display:flex;justify-content:space-between;color:#b8aacd;font-size:11px;font-variant-numeric:tabular-nums}
        .bell-app__schedule-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:22px 0 10px}.bell-app h2{font-size:15px;margin:0}.bell-app__type{font-size:11px;color:#c4b5fd;background:#8b5cf622;border:1px solid #8b5cf644;padding:5px 8px;border-radius:99px;white-space:nowrap}
        .bell-app__list{display:flex;flex-direction:column;gap:6px}.bell-app__row{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:11px;border:1px solid #ffffff0d;background:#ffffff05;min-height:48px}
        .bell-app__row.is-current{border-color:#8b5cf6a8;background:#8b5cf621}.bell-app__row.is-past{opacity:.48}.bell-app__marker{width:7px;height:7px;border-radius:50%;background:#655777;flex-shrink:0}.is-current .bell-app__marker{background:#a78bfa;box-shadow:0 0 0 4px #8b5cf622}
        .bell-app__period{font-weight:650;flex:1;min-width:0}.bell-app__period small{display:block;color:#a99cbd;font-size:11px;font-weight:400;margin-top:4px}.bell-app__period-time{color:#c9bedb;font-size:11px;white-space:nowrap;font-variant-numeric:tabular-nums}
        .bell-app__footer{display:flex;justify-content:space-between;align-items:center;gap:12px;color:#847696;font-size:10px;margin-top:16px}.bell-app__reset{border:0;background:transparent;color:#c4b5fd;cursor:pointer;font:inherit;white-space:nowrap}.bell-app__reset:hover{text-decoration:underline}
        .bell-app__empty{padding:26px 12px;text-align:center;color:#b8aacd;background:#ffffff05;border-radius:12px;line-height:1.6}
        @media(max-width:460px){.bell-app{padding:14px}.bell-app__header{align-items:flex-start;flex-direction:column}.bell-app__day-label{width:100%;justify-content:space-between}.bell-app__day{flex:1;max-width:none}.bell-app__hero{padding:18px 14px}.bell-app__footer{align-items:flex-start;flex-direction:column}}
      `;
      document.head.appendChild(style);
    }

    const $ = (selector) => containerEl.querySelector(selector);
    const daySelect = $('.bell-app__day');
    const dateEl = $('.bell-app__date');
    const statusEl = $('.bell-app__status');
    const countdownEl = $('.bell-app__countdown');
    const captionEl = $('.bell-app__caption');
    const startEl = $('.bell-app__start');
    const endEl = $('.bell-app__end');
    const progressEl = $('.bell-app__progress span');
    const listEl = $('.bell-app__list');
    const typeEl = $('.bell-app__type');

    daySelect.value = override;
    const formatTime = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const minutesFromTime = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const getDayKey = (date) => {
      if (override !== 'auto') return override;
      const weekday = date.getDay();
      if (weekday === 1) return 'monday';
      if (weekday === 2 || weekday === 4) return 'orange';
      if (weekday === 3 || weekday === 5) return 'blue';
      return 'none';
    };
    const makeTimestamp = (date, time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const value = new Date(date);
      value.setHours(hours, minutes, 0, 0);
      return value;
    };

    const render = () => {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      const dayKey = getDayKey(now);
      const schedule = BELL_SCHEDULES[dayKey];
      typeEl.textContent = schedule?.label || 'No school';
      listEl.textContent = '';

      if (!schedule) {
        statusEl.textContent = 'No school schedule';
        countdownEl.textContent = '—';
        captionEl.textContent = override === 'auto' ? 'weekend · choose a day if needed' : 'day override selected';
        startEl.textContent = '';
        endEl.textContent = '';
        progressEl.style.width = '0%';
        listEl.innerHTML = '<div class="bell-app__empty">No schedule is selected for today.<br>Use the day menu above to preview a schedule.</div>';
        return;
      }

      const periods = schedule.periods.map(([name, start, end]) => ({
        name, start, end,
        startAt: makeTimestamp(now, start),
        endAt: makeTimestamp(now, end)
      }));
      let current = periods.find((period) => now >= period.startAt && now < period.endAt);
      let next = periods.find((period) => period.startAt > now);
      let previous = [...periods].reverse().find((period) => period.endAt <= now);

      if (current) {
        statusEl.textContent = current.name;
        countdownEl.textContent = formatCountdown(current.endAt - now);
        captionEl.textContent = 'until this period ends';
        startEl.textContent = formatTime(current.startAt);
        endEl.textContent = formatTime(current.endAt);
        const duration = current.endAt - current.startAt;
        progressEl.style.width = `${Math.max(0, Math.min(100, ((now - current.startAt) / duration) * 100))}%`;
      } else if (next) {
        statusEl.textContent = previous ? 'Passing period' : 'Before school';
        countdownEl.textContent = formatCountdown(next.startAt - now);
        captionEl.textContent = `until ${next.name}`;
        startEl.textContent = previous ? formatTime(previous.endAt) : '—';
        endEl.textContent = formatTime(next.startAt);
        const span = next.startAt - (previous?.endAt || now);
        progressEl.style.width = span > 0 && previous ? `${Math.max(0, Math.min(100, ((now - previous.endAt) / span) * 100))}%` : '0%';
      } else {
        statusEl.textContent = 'School day ended';
        countdownEl.textContent = '✓';
        captionEl.textContent = 'you made it';
        startEl.textContent = '';
        endEl.textContent = '';
        progressEl.style.width = '100%';
      }

      periods.forEach((period) => {
        const row = document.createElement('div');
        const isCurrent = current === period;
        row.className = 'bell-app__row' + (isCurrent ? ' is-current' : '') + (period.endAt <= now ? ' is-past' : '');
        const marker = document.createElement('span');
        marker.className = 'bell-app__marker';
        const name = document.createElement('div');
        name.className = 'bell-app__period';
        name.textContent = period.name;
        const time = document.createElement('span');
        time.className = 'bell-app__period-time';
        time.textContent = `${formatTime(period.startAt)} – ${formatTime(period.endAt)}`;
        if (isCurrent) {
          const label = document.createElement('small');
          label.textContent = 'Happening now';
          name.appendChild(label);
        }
        row.append(marker, name, time);
        listEl.appendChild(row);
      });
    };

    const formatCountdown = (milliseconds) => {
      const seconds = Math.max(0, Math.floor(milliseconds / 1000));
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remaining = seconds % 60;
      return hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
    };

    daySelect.addEventListener('change', () => {
      override = daySelect.value;
      try { localStorage.setItem(BELL_OVERRIDE_KEY, override); } catch {}
      render();
    });
    $('.bell-app__reset').addEventListener('click', () => {
      override = 'auto';
      daySelect.value = 'auto';
      try { localStorage.removeItem(BELL_OVERRIDE_KEY); } catch {}
      render();
    });

    render();
    timer = window.setInterval(render, 1000);
    containerEl._bellCleanup = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
  },

  unmount(containerEl) {
    if (containerEl._bellCleanup) containerEl._bellCleanup();
  }
};

export default AppManifest;
