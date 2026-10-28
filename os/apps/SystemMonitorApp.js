/**
 * @fileoverview System Monitor Application for The Web Vault WebOS.
 *
 * Displays authentic browser telemetry:
 * - Active WebOS windows & process list with "End Task" termination
 * - Live session uptime & refresh timer
 * - DOM node count across document
 * - JS heap memory allocation (Chrome performance.memory)
 * - IndexedDB / VirtualFS storage usage estimation
 * - Network connectivity state
 *
 * @module os/apps/SystemMonitorApp
 */

import store from '../core/Store.js';
import windowManager from '../core/WindowManager.js';

export const AppManifest = {
  id: 'system-monitor',
  name: 'System Monitor',
  icon: '📊',
  category: 'System',
  version: '2.0.0',
  singleton: true,
  defaultSize: { width: 720, height: 480 },
  minSize: { width: 440, height: 320 },
  menus: [
    {
      label: 'Process',
      items: [
        { label: 'Refresh Telemetry', action: 'sysmon:refresh', shortcut: '⌘R' }
      ]
    }
  ],

  mount(containerEl, context) {
    let updateInterval = null;

    containerEl.innerHTML = `
      <div class="sysmon-root" style="display:flex; flex-direction:column; height:100%; background:#0a0612; color:#f5f3ff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding:16px; overflow:hidden;">
        <!-- Telemetry Summary Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:16px;">
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(168,85,247,0.18); border-radius:10px; padding:12px;">
            <div style="font-size:11px; color:#7c6f9f; text-transform:uppercase; font-weight:600;">Active Tasks</div>
            <div id="mon-task-count" style="font-size:22px; font-weight:700; color:#fff; margin-top:4px;">0</div>
          </div>

          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(168,85,247,0.18); border-radius:10px; padding:12px;">
            <div style="font-size:11px; color:#7c6f9f; text-transform:uppercase; font-weight:600;">DOM Elements</div>
            <div id="mon-dom-nodes" style="font-size:22px; font-weight:700; color:#8b5cf6; margin-top:4px;">0</div>
          </div>

          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(168,85,247,0.18); border-radius:10px; padding:12px;">
            <div style="font-size:11px; color:#7c6f9f; text-transform:uppercase; font-weight:600;">JS Heap Memory</div>
            <div id="mon-js-heap" style="font-size:22px; font-weight:700; color:#10b981; margin-top:4px;">—</div>
          </div>

          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(168,85,247,0.18); border-radius:10px; padding:12px;">
            <div style="font-size:11px; color:#7c6f9f; text-transform:uppercase; font-weight:600;">System Uptime</div>
            <div id="mon-uptime" style="font-size:22px; font-weight:700; color:#c4b5fd; margin-top:4px;">0s</div>
          </div>
        </div>

        <!-- Process Table Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; font-weight:600; color:#c4b5fd;">Running Processes & Windows</span>
          <span style="font-size:11px; color:#7c6f9f;">Auto-refreshing 1Hz</span>
        </div>

        <!-- Process Table Container -->
        <div style="flex:1; overflow-y:auto; border:1px solid rgba(255,255,255,0.06); border-radius:10px; background:rgba(0,0,0,0.3);">
          <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
            <thead>
              <tr style="background:rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.08); color:#7c6f9f; font-weight:600;">
                <th style="padding:8px 12px;">Process / Title</th>
                <th style="padding:8px 12px;">Instance ID</th>
                <th style="padding:8px 12px;">State</th>
                <th style="padding:8px 12px;">Z-Index</th>
                <th style="padding:8px 12px; text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody id="mon-process-tbody">
            </tbody>
          </table>
        </div>
      </div>
    `;

    const taskCountEl = containerEl.querySelector('#mon-task-count');
    const domNodesEl = containerEl.querySelector('#mon-dom-nodes');
    const jsHeapEl = containerEl.querySelector('#mon-js-heap');
    const uptimeEl = containerEl.querySelector('#mon-uptime');
    const tbody = containerEl.querySelector('#mon-process-tbody');

    const updateMetrics = () => {
      // Windows / processes
      const windows = windowManager.getAllWindows();
      taskCountEl.textContent = windows.length;

      // DOM elements
      domNodesEl.textContent = document.getElementsByTagName('*').length;

      // Memory
      if (performance && performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
        jsHeapEl.textContent = `${usedMB} MB`;
      } else {
        jsHeapEl.textContent = 'Sandboxed';
        jsHeapEl.style.fontSize = '16px';
      }

      // Uptime
      const sec = Math.floor(performance.now() / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      uptimeEl.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;

      // Render processes table
      tbody.innerHTML = '';
      if (windows.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:30px; color:#7c6f9f;">No active application windows</td>
          </tr>
        `;
        return;
      }

      for (const win of windows) {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.03); color:#e8e0f0; transition:background 0.15s;';
        tr.onmouseenter = () => tr.style.background = 'rgba(255,255,255,0.04)';
        tr.onmouseleave = () => tr.style.background = 'transparent';

        tr.innerHTML = `
          <td style="padding:8px 12px; display:flex; align-items:center; gap:8px;">
            <span>${win.icon || '📁'}</span>
            <span style="font-weight:500;">${win.title || win.appId}</span>
          </td>
          <td style="padding:8px 12px; color:#7c6f9f; font-family:monospace;">${win.instanceId}</td>
          <td style="padding:8px 12px;">
            <span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:10.5px; background:${win.state === 'minimized' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}; color:${win.state === 'minimized' ? '#f59e0b' : '#10b981'}; text-transform:uppercase; font-weight:600;">${win.state}</span>
          </td>
          <td style="padding:8px 12px; color:#7c6f9f;">${win.zIndex}</td>
          <td style="padding:8px 12px; text-align:right;">
            <button class="end-task-btn" data-id="${win.instanceId}" style="padding:4px 10px; border-radius:6px; border:1px solid rgba(239,68,68,0.4); background:rgba(239,68,68,0.15); color:#fca5a5; font-size:11px; cursor:pointer;">End Task</button>
          </td>
        `;

        tr.querySelector('.end-task-btn').addEventListener('click', () => {
          windowManager.closeWindow(win.instanceId);
          updateMetrics();
        });

        tbody.appendChild(tr);
      }
    };

    updateMetrics();
    updateInterval = setInterval(updateMetrics, 1000);

    // Auto-cleanup on unmount
    if (context) {
      context.unmount = () => {
        if (updateInterval) clearInterval(updateInterval);
      };
    }
  }
};

export default AppManifest;
