/**
 * @fileoverview Notes Application for The Web Vault WebOS.
 *
 * Implements a split-pane Markdown / Text editor:
 * - Searchable notes list on the left
 * - Full editor with word & character counters on the right
 * - 300ms debounced autosave to VirtualFS (`/Documents/Notes/`)
 * - Live synchronization with FileExplorer and Terminal
 *
 * @module os/apps/NotesApp
 */

import virtualFS from '../core/VirtualFS.js';
import store from '../core/Store.js';

export const AppManifest = {
  id: 'notes',
  name: 'Vault Notes',
  icon: '📝',
  category: 'Productivity',
  version: '2.0.0',
  singleton: false,
  defaultSize: { width: 780, height: 500 },
  minSize: { width: 420, height: 280 },
  menus: [
    {
      label: 'Note',
      items: [
        { label: 'New Note', action: 'note:new', shortcut: '⌘N' },
        { label: 'Save Note', action: 'note:save', shortcut: '⌘S' }
      ]
    }
  ],

  async mount(containerEl, context) {
    const NOTES_DIR = '/Documents/Notes';
    await virtualFS.mkdir(NOTES_DIR);

    let notesList = [];
    let currentNotePath = context?.launchOptions?.filePath || null;
    let autosaveTimer = null;

    containerEl.innerHTML = `
      <div class="notes-root" style="display:flex; height:100%; background:#100b1a; color:#f5f3ff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow:hidden;">
        <!-- Left Sidebar: Note List -->
        <div style="width:230px; background:rgba(18,12,32,0.95); border-right:1px solid rgba(168,85,247,0.18); display:flex; flex-direction:column; padding:12px; flex-shrink:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:14px; font-weight:700; color:#fff;">Notes</span>
            <button id="notes-new-btn" title="Create New Note" style="width:28px; height:28px; border-radius:6px; border:none; background:#8b5cf6; color:#fff; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">+</button>
          </div>

          <!-- Search input -->
          <input type="text" id="notes-search-input" placeholder="Search notes..." style="width:100%; padding:6px 10px; border-radius:8px; border:1px solid rgba(168,85,247,0.25); background:rgba(0,0,0,0.3); color:#fff; font-size:12px; outline:none; margin-bottom:10px;">

          <!-- Notes Items Container -->
          <div id="notes-items-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
          </div>
        </div>

        <!-- Right Side: Editor -->
        <div style="flex:1; display:flex; flex-direction:column; min-width:0; background:#0b0713;">
          <!-- Editor Header -->
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 18px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02);">
            <input type="text" id="note-title-input" placeholder="Note Title" style="background:transparent; border:none; outline:none; font-size:16px; font-weight:600; color:#fff; flex:1; min-width:0;">
            <div style="display:flex; gap:8px;">
              <span id="note-save-status" style="font-size:11.5px; color:#10b981; align-self:center;">Saved</span>
              <button id="note-delete-btn" title="Delete Note" style="background:none; border:none; color:#f87171; font-size:16px; cursor:pointer; padding:2px 6px;">🗑️</button>
            </div>
          </div>

          <!-- Textarea Content -->
          <textarea id="note-content-area" placeholder="Start typing your note here... (Markdown supported)" style="flex:1; width:100%; padding:18px; background:transparent; border:none; outline:none; color:#e8e0f0; font-family:'Menlo', 'Consolas', 'Courier New', monospace; font-size:13px; line-height:1.6; resize:none;"></textarea>

          <!-- Footer / Stats -->
          <div style="display:flex; justify-content:space-between; padding:6px 18px; border-top:1px solid rgba(255,255,255,0.04); background:rgba(0,0,0,0.3); font-size:11px; color:#7c6f9f;">
            <span id="note-word-count">0 words, 0 characters</span>
            <span id="note-path-display">/Documents/Notes</span>
          </div>
        </div>
      </div>
    `;

    const itemsList = containerEl.querySelector('#notes-items-list');
    const titleInput = containerEl.querySelector('#note-title-input');
    const contentArea = containerEl.querySelector('#note-content-area');
    const saveStatus = containerEl.querySelector('#note-save-status');
    const wordCount = containerEl.querySelector('#note-word-count');
    const pathDisplay = containerEl.querySelector('#note-path-display');
    const searchInput = containerEl.querySelector('#notes-search-input');
    const newBtn = containerEl.querySelector('#notes-new-btn');
    const deleteBtn = containerEl.querySelector('#note-delete-btn');

    const updateWordCount = () => {
      const text = contentArea.value || '';
      const chars = text.length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      wordCount.textContent = `${words} word${words === 1 ? '' : 's'}, ${chars} char${chars === 1 ? '' : 's'}`;
    };

    const loadNotesList = async () => {
      try {
        const files = await virtualFS.list(NOTES_DIR);
        notesList = files.filter(f => f.type === 'file');
      } catch (err) {
        notesList = [];
      }
      renderNotesList();
    };

    const renderNotesList = () => {
      itemsList.innerHTML = '';
      const query = (searchInput.value || '').toLowerCase();
      const filtered = notesList.filter(n => n.name.toLowerCase().includes(query));

      if (filtered.length === 0) {
        itemsList.innerHTML = '<div style="color:#7c6f9f; font-size:12px; text-align:center; padding:20px 0;">No notes found</div>';
        return;
      }

      for (const note of filtered) {
        const el = document.createElement('div');
        const isActive = note.path === currentNotePath;
        el.style.cssText = `
          padding:8px 10px; border-radius:8px; cursor:pointer; font-size:12.5px;
          border:1px solid ${isActive ? 'rgba(139,92,246,0.5)' : 'transparent'};
          background:${isActive ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.02)'};
          transition:background 0.15s;
        `;

        const nameClean = note.name.replace(/\.(md|txt)$/, '');
        const dateStr = note.mtime ? new Date(note.mtime).toLocaleDateString() : '';

        el.innerHTML = `
          <div style="font-weight:600; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${nameClean}</div>
          <div style="font-size:10.5px; color:#7c6f9f; margin-top:2px;">${dateStr}</div>
        `;

        el.addEventListener('click', () => openNote(note.path));
        itemsList.appendChild(el);
      }
    };

    const openNote = async (path) => {
      currentNotePath = path;
      try {
        const content = await virtualFS.readFile(path);
        const fileName = path.split('/').pop();
        titleInput.value = fileName.replace(/\.(md|txt)$/, '');
        contentArea.value = content;
        pathDisplay.textContent = path;
        saveStatus.textContent = 'Saved';
        saveStatus.style.color = '#10b981';
        updateWordCount();
        renderNotesList();
      } catch (err) {
        console.error('[NotesApp] Failed to read note:', err);
      }
    };

    const saveCurrentNote = async () => {
      if (!currentNotePath && !titleInput.value.trim()) return;

      saveStatus.textContent = 'Saving...';
      saveStatus.style.color = '#f59e0b';

      const title = titleInput.value.trim() || 'Untitled Note';
      const ext = currentNotePath && currentNotePath.endsWith('.txt') ? '.txt' : '.md';
      const targetPath = `${NOTES_DIR}/${title}${ext}`;

      try {
        // If title changed, remove old file
        if (currentNotePath && currentNotePath !== targetPath) {
          await virtualFS.remove(currentNotePath);
        }

        await virtualFS.writeFile(targetPath, contentArea.value, 'text/markdown');
        currentNotePath = targetPath;
        pathDisplay.textContent = targetPath;
        saveStatus.textContent = 'Saved';
        saveStatus.style.color = '#10b981';
        await loadNotesList();
      } catch (err) {
        saveStatus.textContent = 'Save Error';
        saveStatus.style.color = '#ef4444';
      }
    };

    const scheduleAutosave = () => {
      saveStatus.textContent = 'Unsaved';
      saveStatus.style.color = '#f59e0b';
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(saveCurrentNote, 300);
      updateWordCount();
    };

    contentArea.addEventListener('input', scheduleAutosave);
    titleInput.addEventListener('input', scheduleAutosave);
    searchInput.addEventListener('input', renderNotesList);

    newBtn.addEventListener('click', async () => {
      let counter = 1;
      let candidate = `${NOTES_DIR}/Untitled ${counter}.md`;
      while (await virtualFS.stat(candidate)) {
        counter++;
        candidate = `${NOTES_DIR}/Untitled ${counter}.md`;
      }
      await virtualFS.writeFile(candidate, '# Untitled Note\n\n', 'text/markdown');
      await loadNotesList();
      await openNote(candidate);
    });

    deleteBtn.addEventListener('click', async () => {
      if (!currentNotePath) return;
      if (confirm('Delete this note?')) {
        await virtualFS.remove(currentNotePath);
        currentNotePath = null;
        titleInput.value = '';
        contentArea.value = '';
        updateWordCount();
        await loadNotesList();
        if (notesList.length > 0) openNote(notesList[0].path);
      }
    });

    await loadNotesList();
    if (currentNotePath) {
      await openNote(currentNotePath);
    } else if (notesList.length > 0) {
      await openNote(notesList[0].path);
    } else {
      newBtn.click();
    }
  }
};

export default AppManifest;
