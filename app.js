(function () {
  'use strict';

  // ===== Constants =====
  const SIZE_WARN = 50 * 1024 * 1024; // 50MB

  // ===== State =====
  const state = {
    items: [],
    settings: {
      outputFormat: 'auto',
      quality: 80,
      pngStrategy: 'lossless',
      resizeEnabled: false,
      resizeMax: 2000,
    },
    theme: 'light',
    webpSupported: true,
    busy: false,
    rescheduleNeeded: false,
    largeWarned: false,
  };

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);
  const dom = {
    themeToggle: $('theme-toggle'),
    dropZone: $('drop-zone'),
    dropZoneIcon: $('drop-zone-icon'),
    fileInput: $('file-input'),
    dropError: $('drop-zone-error'),
    outputFormat: $('output-format'),
    webpOption: $('webp-option'),
    quality: $('quality'),
    qualityValue: $('quality-value'),
    pngStrategySetting: $('png-strategy-setting'),
    resizeToggle: $('resize-toggle'),
    resizeMax: $('resize-max'),
    imageList: $('image-list'),
    emptyState: $('empty-state'),
    emptyStateIcon: $('empty-state-icon'),
    imageListHeader: $('image-list-header'),
    count: $('count'),
    actionBar: $('action-bar'),
    addMore: $('add-more'),
    addMoreIcon: $('add-more-icon'),
    downloadZip: $('download-zip'),
    downloadZipIcon: $('download-zip-icon'),
    clearAll: $('clear-all'),
    toastContainer: $('toast-container'),
    modalBackdrop: $('modal-backdrop'),
    modalTitle: $('modal-title'),
    modalBody: $('modal-body'),
    modalConfirm: $('modal-confirm'),
    modalCancel: $('modal-cancel'),
  };

  // ===== Icons (inline SVG) =====
  function iconUpload() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  }
  function iconImage() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  }
  function iconDownload() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  }
  function iconClose() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }
  function iconSun() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  }
  function iconMoon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ===== Init =====
  function init() {
    state.theme = localStorage.getItem('theme') || detectPreferredTheme();
    applyTheme(state.theme, false);
    detectWebpSupport();
    bindEvents();
    updatePngStrategyVisibility();
    updateResizeInputState();
    render();
  }

  function detectPreferredTheme() {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  // ===== Theme =====
  function applyTheme(theme, persist) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    dom.themeToggle.innerHTML = theme === 'dark' ? iconSun() : iconMoon();
    dom.themeToggle.setAttribute(
      'aria-label',
      theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'
    );
    if (persist !== false) localStorage.setItem('theme', theme);
  }

  function detectWebpSupport() {
    if (!('createElement' in document)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    canvas.toBlob((blob) => {
      const ok = !!blob && blob.type === 'image/webp';
      state.webpSupported = ok;
      if (!ok) {
        dom.webpOption.disabled = true;
        dom.webpOption.textContent = 'WebP（浏览器不支持）';
        if (state.settings.outputFormat === 'image/webp') {
          state.settings.outputFormat = 'auto';
          dom.outputFormat.value = 'auto';
          updatePngStrategyVisibility();
        }
      }
    }, 'image/webp');
  }

  // ===== Events =====
  function bindEvents() {
    dom.themeToggle.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Drop zone
    dom.dropZone.addEventListener('click', () => dom.fileInput.click());
    dom.dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dom.fileInput.click();
      }
    });
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      dom.fileInput.value = '';
    });

    // Drag & drop with counter (handles child element enters)
    let dragCounter = 0;
    dom.dropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      dom.dropZone.classList.add('drag-over');
    });
    dom.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    dom.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) dom.dropZone.classList.remove('drag-over');
    });
    dom.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      dom.dropZone.classList.remove('drag-over');
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) handleFiles(files);
    });
    // Prevent the browser from navigating to dropped files outside the zone
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    // Settings
    dom.outputFormat.addEventListener('change', (e) => {
      state.settings.outputFormat = e.target.value;
      updatePngStrategyVisibility();
      requeueAll();
    });
    dom.quality.addEventListener('input', (e) => {
      state.settings.quality = Number(e.target.value);
      dom.qualityValue.textContent = state.settings.quality;
    });
    dom.quality.addEventListener('change', requeueAll);
    document.querySelectorAll('input[name="png-strategy"]').forEach((r) => {
      r.addEventListener('change', (e) => {
        state.settings.pngStrategy = e.target.value;
        requeueAll();
      });
    });
    dom.resizeToggle.addEventListener('change', (e) => {
      state.settings.resizeEnabled = e.target.checked;
      updateResizeInputState();
      requeueAll();
    });
    dom.resizeMax.addEventListener('change', () => {
      const v = Math.max(1, Math.min(8000, Number(dom.resizeMax.value) || 2000));
      state.settings.resizeMax = v;
      dom.resizeMax.value = v;
      requeueAll();
    });

    // Action bar
    dom.addMore.addEventListener('click', () => dom.fileInput.click());
    dom.downloadZip.addEventListener('click', downloadAsZip);
    dom.clearAll.addEventListener('click', clearAll);

    // Modal
    dom.modalCancel.addEventListener('click', closeModal);
    dom.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === dom.modalBackdrop) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !dom.modalBackdrop.hidden) closeModal();
    });

    // Inject icons
    dom.dropZoneIcon.innerHTML = iconUpload();
    dom.emptyStateIcon.innerHTML = iconImage();
    dom.addMoreIcon.innerHTML = iconUpload();
    dom.downloadZipIcon.innerHTML = iconDownload();
  }

  function updatePngStrategyVisibility() {
    const of = state.settings.outputFormat;
    const hasPng = of === 'image/png' ||
      state.items.some((it) => it.type === 'image/png');
    dom.pngStrategySetting.hidden = !hasPng;
  }

  function updateResizeInputState() {
    dom.resizeMax.disabled = !state.settings.resizeEnabled;
  }

  // ===== File handling =====
  function normalizeType(file) {
    if (file.type) return file.type;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return '';
  }

  async function handleFiles(fileList) {
    hideError();
    const files = Array.from(fileList);
    const accepted = [];
    const rejected = [];

    for (const file of files) {
      const t = normalizeType(file);
      if (t === 'image/jpeg' || t === 'image/png' || t === 'image/webp') {
        accepted.push({ file: file, type: t });
      } else {
        rejected.push(file.name);
      }
    }

    if (rejected.length) {
      const list = rejected.slice(0, 3).join(', ') + (rejected.length > 3 ? ' \u2026' : '');
      showError(`已忽略 ${rejected.length} 个不支持的文件：${list}`);
    }

    if (!accepted.length) return;

    // Warn on large files
    const large = accepted.filter((a) => a.file.size > SIZE_WARN);
    if (large.length) {
      const ok = await confirmDialog(
        '文件较大',
        `有 ${large.length} 个文件超过 50MB，可能导致浏览器卡顿或失败。是否继续？`
      );
      if (!ok) return;
    }

    for (const a of accepted) {
      const item = {
        id: 'i_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        file: a.file,
        type: a.type,
        originalSize: a.file.size,
        originalUrl: URL.createObjectURL(a.file),
        originalWH: null,
        compressedBlob: null,
        compressedUrl: null,
        compressedSize: null,
        status: 'pending',
        error: null,
      };
      state.items.push(item);
    }

    updatePngStrategyVisibility();
    render();
    scheduleProcess();
  }

  function requeueAll() {
    let touched = false;
    for (const item of state.items) {
      if (item.status === 'done' || item.status === 'error') {
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
        item.compressedUrl = null;
        item.compressedBlob = null;
        item.compressedSize = null;
        item.status = 'pending';
        item.error = null;
        touched = true;
      }
    }
    if (touched) {
      render();
      scheduleProcess();
    }
  }

  async function scheduleProcess() {
    if (state.busy) {
      state.rescheduleNeeded = true;
      return;
    }
    state.busy = true;
    try {
      do {
        state.rescheduleNeeded = false;
        for (const item of state.items) {
          if (item.status === 'pending' || item.status === 'error') {
            if (item.status === 'error') item.error = null;
            item.status = 'pending';
            await processItem(item);
          }
        }
      } while (state.rescheduleNeeded);
    } finally {
      state.busy = false;
      render();
    }
  }

  async function processItem(item) {
    item.status = 'processing';
    render();
    try {
      const blob = await compressOne(item);
      item.compressedBlob = blob;
      item.compressedSize = blob.size;
      item.compressedUrl = URL.createObjectURL(blob);
      item.status = 'done';
    } catch (err) {
      console.error('Compression failed:', err);
      item.status = 'error';
      item.error = (err && err.message) || '压缩失败';
    }
    render();
  }

  // ===== Compression engine =====
  function determineOutput(srcType, settings) {
    const of = settings.outputFormat;
    const strat = settings.pngStrategy;

    if (of !== 'auto') {
      if (of === 'image/png') {
        if (srcType === 'image/png') {
          return { type: 'image/png', strategy: strat === 'webp' ? 'lossy' : strat };
        }
        return { type: 'image/png', strategy: 'lossy-canvas' };
      }
      return { type: of, strategy: 'quality' };
    }

    if (srcType === 'image/jpeg') return { type: 'image/jpeg', strategy: 'quality' };
    if (srcType === 'image/webp') return { type: 'image/webp', strategy: 'quality' };
    if (srcType === 'image/png') {
      if (strat === 'webp') return { type: 'image/webp', strategy: 'quality' };
      return { type: 'image/png', strategy: strat };
    }
    return { type: srcType, strategy: 'quality' };
  }

  async function compressOne(item) {
    const file = item.file;
    const settings = state.settings;
    const out = determineOutput(item.type, settings);

    // Lossless PNG: try UPNG (pixel-perfect recompress), fall back to canvas
    // if UPNG is missing or throws on this particular PNG variant. The canvas
    // path is no longer pixel-perfect, but at least the item won't be marked
    // as "failed".
    if (out.type === 'image/png' && out.strategy === 'lossless') {
      try {
        const recompressed = await upngEncode(file, 0);
        if (recompressed.size >= file.size) {
          return new Blob([file], { type: 'image/png' });
        }
        return recompressed;
      } catch (err) {
        console.warn(
          '[compress] UPNG lossless failed, falling back to canvas:',
          (err && err.message) ? err.message : err
        );
        // Fall through to the canvas-based path below.
      }
    }

    // Canvas path: JPEG, WebP, PNG lossy, forced non-PNG->PNG, and the
    // UPNG-lossless fallback above all funnel through here.
    const img = await loadImage(file);
    item.originalWH = { w: img.naturalWidth, h: img.naturalHeight };

    if (
      (img.naturalWidth > 4000 || img.naturalHeight > 4000) &&
      !state.largeWarned
    ) {
      state.largeWarned = true;
      showToast('大图处理中，主线程会短暂卡顿', 'info');
    }

    const dims = computeTargetSize(
      img.naturalWidth,
      img.naturalHeight,
      settings
    );
    const canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d');
    if (out.type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, dims.width, dims.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, dims.width, dims.height);

    // PNG encoders in browsers ignore the quality argument; passing undefined
    // makes that explicit. JPEG / WebP honor it.
    const quality = out.type === 'image/png' ? undefined : settings.quality / 100;
    return await canvasToBlob(canvas, out.type, quality);
  }

  function computeTargetSize(w, h, settings) {
    if (!settings.resizeEnabled) return { width: w, height: h };
    const max = Math.max(1, Math.min(8000, Number(settings.resizeMax) || 2000));
    const longest = Math.max(w, h);
    if (longest <= max) return { width: w, height: h };
    const scale = max / longest;
    return { width: Math.round(w * scale), height: Math.round(h * scale) };
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('无法解码图片'));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('编码失败：浏览器不支持 ' + type));
      }, type, quality);
    });
  }

  async function upngEncode(file, cnum) {
    if (typeof UPNG === 'undefined' || typeof UPNG.encode !== 'function') {
      throw new Error('UPNG.js 未加载，请联网后重试');
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const img = UPNG.decode(bytes);
    const out = UPNG.encode([img.data], img.width, img.height, cnum);
    return new Blob([out], { type: 'image/png' });
  }

  // ===== Output filename =====
  function getOutputType(item) {
    return determineOutput(item.type, state.settings).type;
  }

  function getOutputName(item) {
    const dot = item.file.name.lastIndexOf('.');
    const base = dot === -1 ? item.file.name : item.file.name.slice(0, dot);
    const ext = extensionForType(getOutputType(item));
    return base + '-min.' + ext;
  }

  function extensionForType(type) {
    if (type === 'image/jpeg') return 'jpg';
    if (type === 'image/png') return 'png';
    if (type === 'image/webp') return 'webp';
    return 'bin';
  }

  // ===== Render =====
  function render() {
    const items = state.items;
    dom.count.textContent = items.length;
    dom.emptyState.hidden = items.length > 0;
    dom.imageListHeader.hidden = items.length === 0;
    dom.actionBar.hidden = items.length === 0;
    dom.downloadZip.disabled = !items.some((i) => i.status === 'done');
    dom.clearAll.disabled = items.length === 0;

    const existing = new Map();
    Array.from(dom.imageList.children).forEach((li) => {
      existing.set(li.dataset.id, li);
    });

    const seen = new Set();
    for (const item of items) {
      seen.add(item.id);
      let li = existing.get(item.id);
      if (!li) {
        li = createItemElement(item);
        dom.imageList.appendChild(li);
      } else {
        updateItemElement(li, item);
      }
    }
    for (const [id, li] of existing) {
      if (!seen.has(id)) li.remove();
    }
  }

  function createItemElement(item) {
    const li = document.createElement('li');
    li.className = 'image-item';
    li.dataset.id = item.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = document.createElement('img');
    img.alt = '';
    img.src = item.originalUrl;
    thumb.appendChild(img);
    li.appendChild(thumb);

    const info = document.createElement('div');
    info.className = 'image-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'image-name';
    info.appendChild(nameEl);
    const metaEl = document.createElement('div');
    metaEl.className = 'image-meta';
    info.appendChild(metaEl);
    li.appendChild(info);

    const savings = document.createElement('div');
    savings.className = 'image-savings neutral';
    li.appendChild(savings);

    const badge = document.createElement('div');
    badge.className = 'status-badge';
    li.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'image-actions';
    actions.style.display = 'flex';
    actions.style.gap = '4px';

    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn btn-icon';
    dlBtn.title = '下载';
    dlBtn.setAttribute('aria-label', '下载');
    dlBtn.innerHTML = iconDownload();
    actions.appendChild(dlBtn);

    const rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.className = 'btn btn-icon btn-ghost';
    rmBtn.title = '移除';
    rmBtn.setAttribute('aria-label', '移除');
    rmBtn.innerHTML = iconClose();
    actions.appendChild(rmBtn);

    li.appendChild(actions);

    updateItemElement(li, item);
    return li;
  }

  function updateItemElement(li, item) {
    li.classList.toggle('processing', item.status === 'processing');
    li.classList.toggle('error', item.status === 'error');

    const nameEl = li.querySelector('.image-name');
    nameEl.textContent = item.file.name;

    const metaEl = li.querySelector('.image-meta');
    metaEl.innerHTML = '';
    metaEl.appendChild(textSpan(formatBytes(item.originalSize)));
    if (item.originalWH) {
      metaEl.appendChild(dotSpan());
      metaEl.appendChild(textSpan(item.originalWH.w + '\u00d7' + item.originalWH.h));
    }
    if (item.status === 'done' && item.compressedSize != null) {
      metaEl.appendChild(textSpan('\u2192'));
      metaEl.appendChild(textSpan(formatBytes(item.compressedSize)));
    }

    const savings = li.querySelector('.image-savings');
    savings.classList.remove('positive', 'negative', 'neutral');
    if (item.status === 'done' && item.compressedSize != null) {
      const diff = item.originalSize - item.compressedSize;
      const pct = item.originalSize > 0
        ? Math.round((diff / item.originalSize) * 100) : 0;
      const sign = pct > 0 ? '-' : pct < 0 ? '+' : '';
      savings.textContent = sign + Math.abs(pct) + '%';
      savings.classList.add(pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral');
      savings.title = formatBytes(item.originalSize) + ' \u2192 ' + formatBytes(item.compressedSize);
    } else if (item.status === 'error') {
      savings.textContent = '失败';
      savings.classList.add('negative');
      savings.title = item.error || '压缩失败';
    } else {
      savings.textContent = '\u2014';
      savings.classList.add('neutral');
      savings.title = '';
    }

    const badge = li.querySelector('.status-badge');
    badge.className = 'status-badge ' + item.status;
    badge.innerHTML = '';
    badge.appendChild(textSpan(statusLabel(item.status)));
    if (item.status === 'processing') {
      const sp = document.createElement('span');
      sp.className = 'spinner';
      badge.appendChild(sp);
    }

    const buttons = li.querySelectorAll('.image-actions button');
    buttons[0].disabled = item.status !== 'done';
    buttons[0].onclick = () => downloadOne(item);
    buttons[1].onclick = () => removeItem(item);
  }

  function statusLabel(s) {
    return { pending: '等待', processing: '处理中', done: '完成', error: '失败' }[s] || s;
  }

  function textSpan(text) {
    const s = document.createElement('span');
    s.textContent = text;
    return s;
  }

  function dotSpan() {
    const s = document.createElement('span');
    s.className = 'image-meta-divider';
    s.textContent = '\u00b7';
    return s;
  }

  function formatBytes(n) {
    if (n == null) return '\u2014';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // ===== Actions =====
  function removeItem(item) {
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
    if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    state.items = state.items.filter((i) => i.id !== item.id);
    updatePngStrategyVisibility();
    render();
  }

  function clearAll() {
    if (!state.items.length) return;
    if (!confirm('清空所有图片？此操作无法撤销。')) return;
    for (const item of state.items) {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    }
    state.items = [];
    updatePngStrategyVisibility();
    render();
  }

  function downloadOne(item) {
    if (!item.compressedBlob) return;
    triggerDownload(item.compressedUrl, getOutputName(item));
  }

  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadAsZip() {
    const ready = state.items.filter((i) => i.status === 'done' && i.compressedBlob);
    if (!ready.length) return;
    if (typeof JSZip === 'undefined') {
      showToast('JSZip 未加载，请联网后重试', 'error');
      return;
    }
    const originalLabel = dom.downloadZip.innerHTML;
    dom.downloadZip.disabled = true;
    dom.downloadZip.innerHTML = iconDownload() + '<span>打包中\u2026</span>';
    try {
      const zip = new JSZip();
      const used = new Set();
      let dupCounter = 1;
      for (const item of ready) {
        let name = getOutputName(item);
        while (used.has(name)) {
          const dot = name.lastIndexOf('.');
          const base = dot === -1 ? name : name.slice(0, dot);
          const ext = dot === -1 ? '' : name.slice(dot);
          name = base + '-' + dupCounter + ext;
          dupCounter++;
        }
        used.add(name);
        zip.file(name, item.compressedBlob);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      const url = URL.createObjectURL(blob);
      triggerDownload(url, 'compressed-images-' + ts + '.zip');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('已下载 ' + ready.length + ' 个文件', 'success');
    } catch (err) {
      console.error(err);
      showToast('打包失败：' + ((err && err.message) || err), 'error');
    } finally {
      dom.downloadZip.disabled = false;
      dom.downloadZip.innerHTML = originalLabel;
    }
  }

  // ===== UI helpers =====
  function showError(msg) {
    dom.dropError.textContent = msg;
    dom.dropError.hidden = false;
  }

  function hideError() {
    dom.dropError.hidden = true;
  }

  function showToast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type && type !== 'info' ? ' ' + type : '');
    t.textContent = msg;
    dom.toastContainer.appendChild(t);
    setTimeout(() => {
      t.classList.add('toast-out');
      setTimeout(() => t.remove(), 250);
    }, 3500);
  }

  function confirmDialog(title, body) {
    return new Promise((resolve) => {
      dom.modalTitle.textContent = title;
      dom.modalBody.textContent = body;
      dom.modalBackdrop.hidden = false;
      const onConfirm = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const cleanup = () => {
        dom.modalBackdrop.hidden = true;
        dom.modalConfirm.removeEventListener('click', onConfirm);
        dom.modalCancel.removeEventListener('click', onCancel);
      };
      dom.modalConfirm.addEventListener('click', onConfirm);
      dom.modalCancel.addEventListener('click', onCancel);
    });
  }

  function closeModal() { dom.modalBackdrop.hidden = true; }

  // ===== Go =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
