(() => {
  const topActions = document.querySelector('.top-actions');
  if (!topActions || document.getElementById('cloudSyncStatus')) return;

  const status = document.createElement('div');
  status.id = 'cloudSyncStatus';
  status.className = 'cloud-sync-status local';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.innerHTML = '<span class="cloud-sync-status-dot" aria-hidden="true"></span><span class="cloud-sync-status-copy"><strong data-sync-status-label>Local save active</strong><small data-sync-status-detail>Cloud sync is not enabled.</small></span>';
  topActions.insertBefore(status, topActions.firstChild);

  const label = status.querySelector('[data-sync-status-label]');
  const detail = status.querySelector('[data-sync-status-detail]');
  let lastCloudState = null;

  function setStatus(kind, labelText, detailText) {
    status.className = `cloud-sync-status ${kind}`;
    label.textContent = labelText;
    detail.textContent = detailText || '';
    status.title = detailText || labelText;
  }

  function formatTime(value = new Date()) {
    try {
      return value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  async function refreshBaseState() {
    if (!navigator.onLine) {
      setStatus('offline', 'Offline · saved locally', 'Field records continue to save on this device.');
      return;
    }

    const adapter = window.MGSSupabaseSync;
    if (!adapter) {
      setStatus('local', 'Local save active', 'Cloud sync adapter is unavailable; local project saves still work.');
      return;
    }

    if (!adapter.isEnabled()) {
      setStatus('local', 'Local save active', 'Cloud sync is disabled by feature flag.');
      return;
    }

    setStatus('syncing', 'Checking cloud', 'Verifying the configured Supabase session.');
    try {
      const session = await adapter.getSession();
      if (session?.user?.id) {
        lastCloudState = { kind: 'ready', label: 'Cloud ready', detail: 'Signed in. Local saves remain primary while sync validation is in progress.' };
        setStatus(lastCloudState.kind, lastCloudState.label, lastCloudState.detail);
      } else {
        lastCloudState = { kind: 'warning', label: 'Cloud sign-in needed', detail: 'Cloud sync is configured, but this browser is not signed in.' };
        setStatus(lastCloudState.kind, lastCloudState.label, lastCloudState.detail);
      }
    } catch (error) {
      lastCloudState = { kind: 'error', label: 'Cloud setup issue', detail: error?.message || 'Unable to verify cloud sync configuration.' };
      setStatus(lastCloudState.kind, lastCloudState.label, lastCloudState.detail);
    }
  }

  window.addEventListener('mgs:supabase-sync', event => {
    const info = event.detail || {};
    if (info.status === 'syncing') {
      setStatus('syncing', 'Syncing project', 'Local data is already retained on this device while cloud sync runs.');
      return;
    }
    if (info.status === 'synced') {
      const revision = Number(info.revision) || 0;
      const pending = Number(info.pendingPhotoUploads) || 0;
      const photoNote = pending ? ` · ${pending} photo${pending === 1 ? '' : 's'} still local-only` : '';
      const detailText = `${revision ? `Server revision ${revision} · ` : ''}Synced ${formatTime()}${photoNote}`;
      lastCloudState = { kind: pending ? 'warning' : 'synced', label: pending ? 'Synced · photos pending' : 'Cloud synced', detail: detailText };
      setStatus(lastCloudState.kind, lastCloudState.label, lastCloudState.detail);
      return;
    }
    if (info.status === 'error') {
      lastCloudState = { kind: 'error', label: 'Sync issue · saved locally', detail: info.message || 'Cloud sync did not complete. Local project data remains saved.' };
      setStatus(lastCloudState.kind, lastCloudState.label, lastCloudState.detail);
    }
  });

  window.addEventListener('offline', () => {
    setStatus('offline', 'Offline · saved locally', 'Field records continue to save on this device.');
  });

  window.addEventListener('online', () => {
    if (lastCloudState && window.MGSSupabaseSync?.isEnabled()) {
      setStatus(lastCloudState.kind, lastCloudState.label, lastCloudState.detail);
    } else {
      refreshBaseState();
    }
  });

  function loadValidationUi() {
    let enabled = false;
    try {
      enabled = new URLSearchParams(location.search).get('mgsValidation') === '1';
    } catch {
      enabled = false;
    }
    if (!enabled) return;

    if (!document.querySelector('link[data-mgs-validation-ui]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'sync-validation-ui.css';
      link.dataset.mgsValidationUi = 'true';
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[data-mgs-validation-ui]')) {
      const script = document.createElement('script');
      script.src = 'sync-validation-ui.js';
      script.async = true;
      script.dataset.mgsValidationUi = 'true';
      document.body.appendChild(script);
    }
  }

  loadValidationUi();
  refreshBaseState();
})();
