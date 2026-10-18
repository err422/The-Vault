/**
 * @fileoverview File Explorer Application for The Web Vault WebOS.
 *
 * Provides:
 * - Sidebar quick-links (/Desktop, /Documents, /Downloads, /Pictures, /Vault)
 * - Breadcrumb path navigation & Up button
 * - Grid and List view toggle
 * - Live search filter
 * - Create New Folder & New Text File
 * - Rename and Delete operations
 * - File import from local computer via `<input type="file">`
 * - Double-click opening: text files open in Notes, .lnk shortcuts launch target apps
 *
 * @module os/apps/FileExplorerApp
 */

import virtualFS from '../core/VirtualFS.js';
import store from '../core/Store.js';
import { showContextMenu } from '../ui/ContextMenu.js';

export const AppManifest = {
  id: 'file-explorer',
  name: 'File Explorer',
  icon: '📁',
  category: 'System',
  version: '2.0.0',
  singleton: false,
  defaultSize: { width: 780, height: 520 },
  minSize: { width: 440, height: 320 },
  menus: [
    {
      label: 'File',
      items: [
        { label: 'New Folder', action: 'file:new-folder', shortcut: '⇧⌘N' },
        { label: 'New Text File', action: 'file:new-text' },
        { label: 'Import from Computer', action: 'file:import' }
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Grid View', action: 'view:grid' },
        { label: 'List View', action: 'view:list' }
      ]
    }
  ],

  async mount(containerEl, context) {
    let currentPath = '/Desktop';
    let viewMode = 'grid'; // 'grid' | 'list'
    let searchQuery = '';
    let selectedPath = null;

    const QUICK_LINKS = [
      { name: 'Desktop', path: '/Desktop', icon: '🖥️' },
      { name: 'Documents', path: '/Documents', icon: '📄' },
      { name: 'Notes', path: '/Documents/Notes', icon: '📝' },
      { name: 'Downloads', path: '/Downloads', icon: '📥' },
      { name: 'Pictures', path: '/Pictures', icon: '🖼️' },
      { name: 'Vault Mount', path: '/Vault', icon: '🏠' }
    ];

    containerEl.innerHTML = `
      <div class="fe-root" style="display:flex; height:100%; background:#100b1a; color:#f5f3ff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow:hidden;">
        <!-- Sidebar -->
        <div style="width:190px; background:rgba(18,12,32,0.95); border-right:1px solid rgba(168,85,247,0.18); display:flex; flex-direction:column; padding:12px 8px; flex-shrink:0;">
          <div style="font-size:11px; font-weight:700; color:#7c6f9f; text-transform:uppercase; letter-spacing:0.05em; padding:6px 10px;">Quick Access</div>
          <div style="display:flex; flex-direction:column; gap:2px; margin-top:4px;">
            ${QUICK_LINKS.map(link => `
              <div class="fe-nav-link" data-path="${link.path}" style="display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px; cursor:pointer; font-size:12.5px; color:#c4b5fd; transition:background 0.15s;">
                <span>${link.icon}</span>
                <span>${link.name}</span>
              </div>
            `).join('')}
          </div>

          <!-- File Import Button -->
          <div style="margin-top:auto; padding:10px 4px 4px 4px; border-top:1px solid rgba(255,255,255,0.06);">
            <input type="file" id="fe-file-import-input" multiple style="display:none;">
            <button id="fe-import-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:6px; padding:8px; border-radius:8px; border:1px dashed rgba(168,85,247,0.4); background:rgba(139,92,246,0.1); color:#c4b5fd; font-size:11.5px; font-weight:500; cursor:pointer;">
              <span>⬆️</span>
              <span>Import File</span>
            </button>
          </div>
        </div>

        <!-- Main Explorer Area -->
        <div style="flex:1; display:flex; flex-direction:column; min-width:0; background:#0b0713;">
          <!-- Explorer Toolbar -->
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 14px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.06);">
            <!-- Breadcrumbs & Nav buttons -->
            <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">
              <button id="fe-up-btn" title="Go up to parent folder" style="width:28px; height:28px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#fff; cursor:pointer;">↑</button>
              <div id="fe-breadcrumbs" style="display:flex; align-items:center; gap:4px; padding:4px 10px; border-radius:8px; background:rgba(255,255,255,0.05); font-size:12px; color:#c4b5fd; overflow-x:auto; white-space:nowrap; max-width:100%;">
              </div>
            </div>

            <!-- Actions: View toggle, search, new folder -->
            <div style="display:flex; align-items:center; gap:8px;">
              <button id="fe-new-folder-btn" title="Create New Folder" style="padding:5px 10px; border-radius:6px; border:1px solid rgba(168,85,247,0.3); background:rgba(139,92,246,0.15); color:#c4b5fd; font-size:11.5px; cursor:pointer;">+ Folder</button>
              <button id="fe-new-file-btn" title="Create New Text File" style="padding:5px 10px; border-radius:6px; border:1px solid rgba(168,85,247,0.3); background:rgba(139,92,246,0.15); color:#c4b5fd; font-size:11.5px; cursor:pointer;">+ File</button>

              <div style="display:flex; background:rgba(255,255,255,0.06); padding:2px; border-radius:6px;">
                <button id="fe-view-grid-btn" style="padding:4px 8px; border:none; border-radius:4px; background:#8b5cf6; color:#fff; font-size:11px; cursor:pointer;">☷</button>
                <button id="fe-view-list-btn" style="padding:4px 8px; border:none; border-radius:4px; background:transparent; color:#c4b5fd; font-size:11px; cursor:pointer;">☰</button>
              </div>

              <input type="text" id="fe-search-input" placeholder="Search..." style="width:130px; padding:5px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.3); color:#fff; font-size:11.5px; outline:none;">
            </div>
          </div>

          <!-- File Area -->
          <div id="fe-file-display" style="flex:1; overflow-y:auto; padding:16px;">
          </div>

          <!-- Status Bar -->
          <div id="fe-status-bar" style="display:flex; justify-content:space-between; padding:5px 14px; font-size:11px; color:#7c6f9f; background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.04);">
            <span id="fe-status-count">0 items</span>
            <span id="fe-status-selected">No selection</span>
          </div>
        </div>
      </div>
    `;

    const breadcrumbs = containerEl.querySelector('#fe-breadcrumbs');
    const fileDisplay = containerEl.querySelector('#fe-file-display');
    const upBtn = containerEl.querySelector('#fe-up-btn');
    const statusCount = containerEl.querySelector('#fe-status-count');
    const statusSelected = containerEl.querySelector('#fe-status-selected');
    const searchInput = containerEl.querySelector('#fe-search-input');
    const fileImportInput = containerEl.querySelector('#fe-file-import-input');

    const renderBreadcrumbs = () => {
      breadcrumbs.innerHTML = '';
      const parts = currentPath.split('/').filter(Boolean);

      const rootSpan = document.createElement('span');
      rootSpan.textContent = 'root';
      rootSpan.style.cssText = 'cursor:pointer; font-weight:600; color:#8b5cf6;';
      rootSpan.addEventListener('click', () => navigateTo('/'));
      breadcrumbs.appendChild(rootSpan);

      let builtPath = '';
      for (const part of parts) {
        builtPath += '/' + part;
        const thisPath = builtPath;

        const sep = document.createElement('span');
        sep.textContent = ' / ';
        sep.style.color = '#7c6f9f';

        const seg = document.createElement('span');
        seg.textContent = part;
        seg.style.cursor = 'pointer';
        seg.addEventListener('click', () => navigateTo(thisPath));

        breadcrumbs.appendChild(sep);
        breadcrumbs.appendChild(seg);
      }
    };

    const navigateTo = async (path) => {
      currentPath = path || '/';
      selectedPath = null;
      statusSelected.textContent = 'No selection';
      renderBreadcrumbs();
      await renderFiles();
    };

    const renderFiles = async () => {
      fileDisplay.innerHTML = '';
      let entries = [];
      try {
        entries = await virtualFS.list(currentPath);
      } catch (err) {
        console.error('[FileExplorerApp] Failed to list path:', err);
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        entries = entries.filter(e => e.name.toLowerCase().includes(q));
      }

      statusCount.textContent = `${entries.length} item${entries.length === 1 ? '' : 's'}`;

      if (entries.length === 0) {
        fileDisplay.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#7c6f9f;">
            <div style="font-size:36px; margin-bottom:8px;">📂</div>
            <div style="font-size:13px;">This folder is empty</div>
          </div>
        `;
        return;
      }

      if (viewMode === 'grid') {
        fileDisplay.style.cssText = 'flex:1; overflow-y:auto; padding:16px; display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:12px; align-content:start;';
        for (const item of entries) {
          const el = document.createElement('div');
          const isSelected = item.path === selectedPath;
          el.style.cssText = `
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            gap:6px; padding:12px 8px; border-radius:10px; cursor:pointer; user-select:none;
            border:1px solid ${isSelected ? 'rgba(139,92,246,0.6)' : 'transparent'};
            background:${isSelected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.02)'};
            transition:background 0.15s;
          `;

          let icon = '📄';
          if (item.type === 'dir') icon = '📁';
          else if (item.name.endsWith('.md') || item.name.endsWith('.txt')) icon = '📝';
          else if (item.name.endsWith('.lnk')) icon = '🔗';
          else if (item.name.endsWith('.png') || item.name.endsWith('.jpg') || item.name.endsWith('.svg')) icon = '🖼️';

          el.innerHTML = `
            <div style="font-size:32px;">${icon}</div>
            <div style="font-size:11.5px; text-align:center; color:#e8e0f0; max-width:84px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedPath = item.path;
            statusSelected.textContent = `${item.name} (${item.type === 'dir' ? 'Folder' : formatBytes(item.size)})`;
            renderFiles();
          });

          el.addEventListener('dblclick', () => openItem(item));

          el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedPath = item.path;
            showItemContextMenu(e.clientX, e.clientY, item);
          });

          fileDisplay.appendChild(el);
        }
      } else {
        // List view
        fileDisplay.style.cssText = 'flex:1; overflow-y:auto; padding:10px 16px; display:flex; flex-direction:column; gap:2px;';
        for (const item of entries) {
          const el = document.createElement('div');
          const isSelected = item.path === selectedPath;
          el.style.cssText = `
            display:flex; align-items:center; justify-content:space-between; padding:8px 12px;
            border-radius:6px; cursor:pointer; user-select:none; font-size:12.5px;
            background:${isSelected ? 'rgba(139,92,246,0.2)' : 'transparent'};
            color:${isSelected ? '#fff' : '#c4b5fd'};
          `;

          let icon = item.type === 'dir' ? '📁' : '📄';
          const dateStr = item.mtime ? new Date(item.mtime).toLocaleDateString() : '—';
          const sizeStr = item.type === 'dir' ? 'Folder' : formatBytes(item.size);

          el.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
              <span>${icon}</span>
              <span>${item.name}</span>
            </div>
            <div style="display:flex; gap:24px; font-size:11.5px; color:#7c6f9f;">
              <span>${dateStr}</span>
              <span style="width:60px; text-align:right;">${sizeStr}</span>
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedPath = item.path;
            statusSelected.textContent = item.name;
            renderFiles();
          });

          el.addEventListener('dblclick', () => openItem(item));

          el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedPath = item.path;
            showItemContextMenu(e.clientX, e.clientY, item);
          });

          fileDisplay.appendChild(el);
        }
      }
    };

    const formatBytes = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const openItem = async (item) => {
      if (item.type === 'dir') {
        navigateTo(item.path);
      } else if (item.name.endsWith('.lnk')) {
        try {
          const raw = await virtualFS.readFile(item.path);
          const data = JSON.parse(raw);
          if (data.target) {
            import('../core/AppRegistry.js').then(m => (m.default || m).launch(data.target));
          }
        } catch (err) {
          console.error('[FileExplorerApp] Failed to parse shortcut:', err);
        }
      } else {
        // Open text files in NotesApp
        import('../core/AppRegistry.js').then(m => {
          (m.default || m).launch('notes', { filePath: item.path });
        });
      }
    };

    const showItemContextMenu = (x, y, item) => {
      showContextMenu(x, y, [
        { label: 'Open', icon: '↗️', action: () => openItem(item) },
        { type: 'separator' },
        { label: 'Rename', icon: '✏️', action: () => promptRename(item) },
        { label: 'Delete', icon: '🗑️', action: () => deleteItem(item) }
      ]);
    };

    const promptRename = async (item) => {
      const newName = prompt('Enter new name:', item.name);
      if (!newName || newName === item.name) return;
      const parent = currentPath === '/' ? '' : currentPath;
      const targetPath = `${parent}/${newName}`;
      try {
        await virtualFS.rename(item.path, targetPath);
        renderFiles();
      } catch (err) {
        alert('Rename failed: ' + err.message);
      }
    };

    const deleteItem = async (item) => {
      if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
      try {
        await virtualFS.remove(item.path);
        renderFiles();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    };

    // Right-click background context menu
    fileDisplay.addEventListener('contextmenu', (e) => {
      if (e.target === fileDisplay) {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          { label: 'New Folder', icon: '📁', action: () => createNewFolder() },
          { label: 'New Text Document', icon: '📄', action: () => createNewFile() },
          { type: 'separator' },
          { label: 'Import from Computer', icon: '⬆️', action: () => fileImportInput.click() },
          { label: 'Refresh', icon: '🔄', action: () => renderFiles() }
        ]);
      }
    });

    const createNewFolder = async () => {
      const name = prompt('Folder name:', 'New Folder');
      if (!name) return;
      const target = (currentPath === '/' ? '' : currentPath) + '/' + name;
      try {
        await virtualFS.mkdir(target);
        renderFiles();
      } catch (err) {
        alert('Could not create folder: ' + err.message);
      }
    };

    const createNewFile = async () => {
      const name = prompt('File name:', 'Note.md');
      if (!name) return;
      const target = (currentPath === '/' ? '' : currentPath) + '/' + name;
      try {
        await virtualFS.writeFile(target, '# ' + name + '\n\n', 'text/markdown');
        renderFiles();
      } catch (err) {
        alert('Could not create file: ' + err.message);
      }
    };

    // Sidebar navigation clicks
    containerEl.querySelectorAll('.fe-nav-link').forEach(link => {
      link.addEventListener('click', () => navigateTo(link.dataset.path));
    });

    // Toolbar buttons
    upBtn.addEventListener('click', () => {
      if (currentPath === '/') return;
      const parts = currentPath.split('/').filter(Boolean);
      parts.pop();
      navigateTo(parts.length === 0 ? '/' : '/' + parts.join('/'));
    });

    containerEl.querySelector('#fe-new-folder-btn').addEventListener('click', createNewFolder);
    containerEl.querySelector('#fe-new-file-btn').addEventListener('click', createNewFile);

    containerEl.querySelector('#fe-view-grid-btn').addEventListener('click', () => {
      viewMode = 'grid';
      containerEl.querySelector('#fe-view-grid-btn').style.background = '#8b5cf6';
      containerEl.querySelector('#fe-view-list-btn').style.background = 'transparent';
      renderFiles();
    });

    containerEl.querySelector('#fe-view-list-btn').addEventListener('click', () => {
      viewMode = 'list';
      containerEl.querySelector('#fe-view-list-btn').style.background = '#8b5cf6';
      containerEl.querySelector('#fe-view-grid-btn').style.background = 'transparent';
      renderFiles();
    });

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderFiles();
    });

    // File Import
    containerEl.querySelector('#fe-import-btn').addEventListener('click', () => fileImportInput.click());
    fileImportInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        const text = await file.text();
        const target = (currentPath === '/' ? '' : currentPath) + '/' + file.name;
        await virtualFS.writeFile(target, text, file.type || 'text/plain');
      }
      renderFiles();
    });

    // Deselect click
    fileDisplay.addEventListener('click', (e) => {
      if (e.target === fileDisplay) {
        selectedPath = null;
        statusSelected.textContent = 'No selection';
        renderFiles();
      }
    });

    // Auto-update on VFS changes
    const unsub = store.on('vfs:change', () => renderFiles());
    if (context) context._feUnsub = unsub;

    navigateTo('/Desktop');
  }
};

export default AppManifest;
