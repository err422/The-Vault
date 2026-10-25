/**
 * @fileoverview Terminal Shell Application for The Web Vault WebOS.
 *
 * Implements a full UNIX-style virtual command line interface:
 * - Tab autocomplete for VFS paths and commands
 * - History stack with Up/Down arrows
 * - Built-in commands:
 *   - help, ls, cd, pwd, cat, mkdir, touch, rm, mv, echo, open <appId>, whoami, neofetch, clear
 *
 * @module os/apps/TerminalApp
 */

import virtualFS from '../core/VirtualFS.js';
import store from '../core/Store.js';
import appRegistry from '../core/AppRegistry.js';
import { getChaosChance, setChaosChance, triggerChaos } from '../core/VaultChaos.js';

export const AppManifest = {
  id: 'terminal',
  name: 'Vault Terminal',
  icon: '💻',
  category: 'System',
  version: '2.0.0',
  singleton: false,
  defaultSize: { width: 680, height: 420 },
  minSize: { width: 380, height: 240 },
  menus: [
    {
      label: 'Terminal',
      items: [
        { label: 'Clear Screen', action: 'term:clear', shortcut: '⌃L' },
        { label: 'Reset Shell', action: 'term:reset' }
      ]
    }
  ],

  mount(containerEl, context) {
    let cwd = '/Desktop';
    let history = [];
    let histIdx = -1;

    containerEl.innerHTML = `
      <div class="terminal-root" style="display:flex; flex-direction:column; height:100%; background:#07020d; color:#c4b5fd; font-family:'Menlo', 'Monaco', 'Courier New', monospace; font-size:12.5px; padding:12px; overflow-y:auto; line-height:1.45;">
        <div id="term-output" style="display:flex; flex-direction:column; gap:4px; margin-bottom:8px;">
          <div style="color:#8b5cf6; font-weight:bold;">Welcome to The Web Vault OS Terminal [Version 2.0.0]</div>
          <div style="color:#7c6f9f;">Type <span style="color:#a855f7;">help</span> for a list of commands. Press <span style="color:#a855f7;">Tab</span> for path completion.</div>
          <div style="margin-bottom:6px;"></div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span id="term-prompt" style="color:#10b981; font-weight:600; white-space:nowrap;">guest@vault:${cwd}$</span>
          <input type="text" id="term-input" autocomplete="off" spellcheck="false" style="flex:1; background:transparent; border:none; outline:none; color:#f5f3ff; font-family:inherit; font-size:inherit; padding:0; margin:0;">
        </div>
      </div>
    `;

    const output = containerEl.querySelector('#term-output');
    const input = containerEl.querySelector('#term-input');
    const promptEl = containerEl.querySelector('#term-prompt');
    const root = containerEl.querySelector('.terminal-root');

    // Click anywhere in terminal focuses input
    root.addEventListener('click', () => input.focus());

    const updatePrompt = () => {
      const user = store.getState('session.displayName') || 'guest';
      promptEl.textContent = `${user.toLowerCase()}@vault:${cwd}$`;
    };

    const println = (html, color = '#f5f3ff') => {
      const line = document.createElement('div');
      line.style.color = color;
      line.style.wordBreak = 'break-word';
      line.innerHTML = html;
      output.appendChild(line);
      root.scrollTop = root.scrollHeight;
    };

    const resolvePath = (p) => {
      if (!p) return cwd;
      if (p === '~') return '/Desktop';
      if (p.startsWith('/')) return p;
      if (p === '..') {
        if (cwd === '/') return '/';
        const parts = cwd.split('/').filter(Boolean);
        parts.pop();
        return parts.length === 0 ? '/' : '/' + parts.join('/');
      }
      return cwd === '/' ? '/' + p : `${cwd}/${p}`;
    };

    const executeCommand = async (cmdLine) => {
      const trimmed = cmdLine.trim();
      if (!trimmed) return;

      history.push(trimmed);
      histIdx = history.length;

      // Echo command
      println(`<span style="color:#10b981;">${promptEl.textContent}</span> <span style="color:#fff;">${escapeHtml(trimmed)}</span>`);

      const [cmd, ...args] = trimmed.split(/\s+/);

      switch (cmd.toLowerCase()) {
        case 'chaos': {
          const subcommand = (args[0] || 'status').toLowerCase();
          if (subcommand === 'status') {
            println(`Secret-code chaos chance on this computer: ${getChaosChance()}% per desktop shortcut launch.`, '#c4b5fd');
          } else if (subcommand === 'chance') {
            const raw = args[1];
            const chance = Number(raw);
            if (raw === undefined || raw.trim() === '' || !Number.isFinite(chance) || chance < 0 || chance > 100) {
              println('Usage: chaos chance <0-100> (use 0 to disable random triggers)', '#ef4444');
            } else {
              setChaosChance(chance);
              println(`Chaos chance set to ${chance}% on this computer.`, '#10b981');
            }
          } else if (subcommand === 'trigger') {
            triggerChaos();
            println('Celebration sequence initiated.', '#c084fc');
          } else {
            println('Usage: chaos [status | chance <0-100> | trigger]', '#ef4444');
          }
          break;
        }

        case 'help':
          println(`
            <div style="display:grid; grid-template-columns:120px 1fr; gap:6px; margin:4px 0;">
              <span style="color:#a855f7;">help</span><span>Show this command reference</span>
              <span style="color:#a855f7;">ls [path]</span><span>List files and directories</span>
              <span style="color:#a855f7;">cd [dir]</span><span>Change directory</span>
              <span style="color:#a855f7;">pwd</span><span>Print current working directory</span>
              <span style="color:#a855f7;">cat &lt;file&gt;</span><span>View file contents</span>
              <span style="color:#a855f7;">mkdir &lt;dir&gt;</span><span>Create a new directory</span>
              <span style="color:#a855f7;">touch &lt;file&gt;</span><span>Create an empty file</span>
              <span style="color:#a855f7;">rm &lt;path&gt;</span><span>Remove a file or folder</span>
              <span style="color:#a855f7;">echo &lt;text&gt;</span><span>Print text to terminal</span>
              <span style="color:#a855f7;">open &lt;appId&gt;</span><span>Launch an application</span>
              <span style="color:#a855f7;">whoami</span><span>Display active user status</span>
              <span style="color:#a855f7;">neofetch</span><span>Display system specs & ASCII logo</span>
              <span style="color:#a855f7;">clear</span><span>Clear the terminal screen</span>
              <span style="color:#a855f7;">chaos chance &lt;0-100&gt;</span><span>Set this computer's Easter egg trigger chance</span>
              <span style="color:#a855f7;">chaos status</span><span>Show the current local trigger chance</span>
              <span style="color:#a855f7;">chaos trigger</span><span>Manually launch the celebration</span>
            </div>
          `);
          break;

        case 'clear':
          output.innerHTML = '';
          break;

        case 'pwd':
          println(cwd, '#c4b5fd');
          break;

        case 'whoami': {
          const session = store.getState('session');
          if (session?.isLoggedIn) {
            println(`User: @${session.displayName} (UID: ${session.uid || 'auth'}) ${session.isAdmin ? '[ADMIN]' : ''}`, '#10b981');
          } else {
            println('Guest User (Local Session)', '#f59e0b');
          }
          break;
        }

        case 'cd': {
          const target = resolvePath(args[0] || '/Desktop');
          try {
            const stat = await virtualFS.stat(target);
            if (!stat || stat.type !== 'dir') {
              println(`cd: not a directory: ${args[0]}`, '#ef4444');
            } else {
              cwd = stat.path;
              updatePrompt();
            }
          } catch (err) {
            println(`cd: ${err.message}`, '#ef4444');
          }
          break;
        }

        case 'ls': {
          const target = resolvePath(args[0] || cwd);
          try {
            const entries = await virtualFS.list(target);
            if (entries.length === 0) {
              println('(empty directory)', '#7c6f9f');
            } else {
              const formatted = entries.map(e => {
                if (e.type === 'dir') return `<span style="color:#8b5cf6; font-weight:bold;">${escapeHtml(e.name)}/</span>`;
                if (e.name.endsWith('.lnk')) return `<span style="color:#06b6d4;">${escapeHtml(e.name)}</span>`;
                return `<span style="color:#f5f3ff;">${escapeHtml(e.name)}</span>`;
              }).join('   ');
              println(formatted);
            }
          } catch (err) {
            println(`ls: ${err.message}`, '#ef4444');
          }
          break;
        }

        case 'cat': {
          if (!args[0]) {
            println('cat: missing file operand', '#ef4444');
            break;
          }
          const target = resolvePath(args[0]);
          try {
            const content = await virtualFS.readFile(target);
            println(escapeHtml(content).replace(/\n/g, '<br>'));
          } catch (err) {
            println(`cat: ${err.message}`, '#ef4444');
          }
          break;
        }

        case 'mkdir': {
          if (!args[0]) {
            println('mkdir: missing operand', '#ef4444');
            break;
          }
          const target = resolvePath(args[0]);
          try {
            await virtualFS.mkdir(target);
            println(`Created directory "${args[0]}"`, '#10b981');
          } catch (err) {
            println(`mkdir: ${err.message}`, '#ef4444');
          }
          break;
        }

        case 'touch': {
          if (!args[0]) {
            println('touch: missing file operand', '#ef4444');
            break;
          }
          const target = resolvePath(args[0]);
          try {
            await virtualFS.writeFile(target, '', 'text/plain');
            println(`Created file "${args[0]}"`, '#10b981');
          } catch (err) {
            println(`touch: ${err.message}`, '#ef4444');
          }
          break;
        }

        case 'rm': {
          if (!args[0]) {
            println('rm: missing operand', '#ef4444');
            break;
          }
          const target = resolvePath(args[0]);
          try {
            await virtualFS.remove(target);
            println(`Removed "${args[0]}"`, '#10b981');
          } catch (err) {
            println(`rm: ${err.message}`, '#ef4444');
          }
          break;
        }

        case 'echo': {
          const text = args.join(' ');
          println(escapeHtml(text));
          break;
        }

        case 'open': {
          if (!args[0]) {
            println('open: specify an appId, URL, or file path (e.g., file-explorer, notes, browser, https://google.com, /Documents/Notes/Welcome.md)', '#ef4444');
            break;
          }
          const targetArg = args[0];
          if (/^https?:\/\//i.test(targetArg)) {
            appRegistry.launch('browser', { url: targetArg, title: targetArg });
            println(`Opening ${targetArg} in Vault Browser...`, '#10b981');
            break;
          }
          const appId = targetArg.toLowerCase();
          const app = appRegistry.getApp(appId);
          if (app) {
            appRegistry.launch(appId);
            println(`Launched ${app.name}`, '#10b981');
          } else {
            // Check if it's a VFS file path
            const resolved = resolvePath(targetArg);
            try {
              const stat = await virtualFS.stat(resolved);
              if (stat) {
                if (stat.type === 'dir') {
                  appRegistry.launch('file-explorer', { path: stat.path });
                  println(`Opened folder ${stat.path} in File Explorer`, '#10b981');
                } else if (stat.name.endsWith('.md') || stat.name.endsWith('.txt')) {
                  appRegistry.launch('notes', { filePath: stat.path });
                  println(`Opened file ${stat.path} in Vault Notes`, '#10b981');
                } else {
                  println(`open: no default application associated with ${stat.name}`, '#ef4444');
                }
              } else {
                println(`open: "${targetArg}" is neither an app ID nor an existing file.`, '#ef4444');
              }
            } catch (err) {
              println(`open: app or file "${appId}" not found.`, '#ef4444');
            }
          }
          break;
        }

        case 'neofetch': {
          const user = store.getState('session.displayName') || 'Guest';
          const windows = store.getState('windows');
          const windowCount = windows ? (windows instanceof Map ? windows.size : Object.keys(windows).length) : 0;
          const heap = performance?.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : 'Browser Sandboxed';

          println(`
            <pre style="margin:0; font-family:inherit; color:#c4b5fd;">
   <span style="color:#8b5cf6;">  ██████╗ ███████╗   </span>  <strong style="color:#fff;">${user}@thewebvault.org</strong>
   <span style="color:#8b5cf6;"> ██╔═══██╗██╔════╝   </span>  ---------------------------
   <span style="color:#a855f7;"> ██║   ██║███████╗   </span>  <span style="color:#8b5cf6;">OS:</span> The Web Vault WebOS 2.0
   <span style="color:#a855f7;"> ██║   ██║╚════██║   </span>  <span style="color:#8b5cf6;">Kernel:</span> VirtualFS / ES6 Reactive
   <span style="color:#c084fc;"> ╚██████╔╝███████║   </span>  <span style="color:#8b5cf6;">Shell:</span> Vault Glass (Purple &amp; Black)
   <span style="color:#c084fc;">  ╚═════╝ ╚══════╝   </span>  <span style="color:#8b5cf6;">Uptime:</span> ${Math.round(performance.now() / 1000)}s
                         <span style="color:#8b5cf6;">Active Windows:</span> ${windowCount}
                         <span style="color:#8b5cf6;">JS Heap:</span> ${heap}
                         <span style="color:#8b5cf6;">Resolution:</span> ${window.innerWidth}x${window.innerHeight}
            </pre>
          `);
          break;
        }

        default:
          println(`zsh: command not found: ${escapeHtml(cmd)}. Type <span style="color:#a855f7;">help</span> for available commands.`, '#ef4444');
      }
    };

    const escapeHtml = (str) => {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    // Keyboard bindings
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        await executeCommand(val);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx > 0) {
          histIdx--;
          input.value = history[histIdx] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx < history.length - 1) {
          histIdx++;
          input.value = history[histIdx] || '';
        } else {
          histIdx = history.length;
          input.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const tokens = input.value.split(/\s+/);
        const lastToken = tokens[tokens.length - 1];
        if (lastToken) {
          try {
            const list = await virtualFS.list(cwd);
            const matches = list.filter(item => item.name.toLowerCase().startsWith(lastToken.toLowerCase()));
            if (matches.length === 1) {
              tokens[tokens.length - 1] = matches[0].name;
              input.value = tokens.join(' ') + (matches[0].type === 'dir' ? '/' : ' ');
            } else if (matches.length > 1) {
              println(matches.map(m => m.name).join('   '), '#7c6f9f');
            }
          } catch {}
        }
      }
    });

    updatePrompt();
    setTimeout(() => input.focus(), 50);
  }
};

export default AppManifest;
