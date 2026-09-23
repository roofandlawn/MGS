(() => {
  const PARAM = 'mgsValidation';

  function validationModeEnabled() {
    try {
      return new URLSearchParams(location.search).get(PARAM) === '1';
    } catch {
      return false;
    }
  }

  if (!validationModeEnabled()) return;

  const ui = {
    launcher: null,
    panel: null,
    status: null,
    result: null,
    email: null,
    buttons: []
  };

  function syncAdapter() {
    return window.MGSSupabaseSync || null;
  }

  function baseHarness() {
    return window.MGSSyncValidation || null;
  }

  function lifecycleHarness() {
    return window.MGSLifecycleValidation || null;
  }

  function text(value) {
    return value == null || value === '' ? '—' : String(value);
  }

  function setBusy(busy) {
    ui.buttons.forEach(button => {
      button.disabled = Boolean(busy);
    });
  }

  function collectFailures(report) {
    const failed = new Set();
    if (Array.isArray(report?.failed)) report.failed.forEach(item => failed.add(String(item)));
    Object.values(report || {}).forEach(value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      if (Array.isArray(value.failed)) value.failed.forEach(item => failed.add(String(item)));
    });
    return [...failed];
  }

  function summarizeReport(report) {
    const result = report?.result || {};
    return {
      phase: report?.phase || 'validation',
      passed: Boolean(report?.passed),
      failedChecks: collectFailures(report),
      revision: Number(result.revision) || undefined,
      pendingPhotoUploads: Number.isFinite(Number(result.pendingPhotoUploads))
        ? Number(result.pendingPhotoUploads)
        : undefined,
      photoUpload: result.photoUpload ? {
        attempted: Number(result.photoUpload.attempted) || 0,
        uploaded: Number(result.photoUpload.uploaded) || 0,
        failed: Number(result.photoUpload.failed) || 0,
        skipped: Number(result.photoUpload.skipped) || 0
      } : undefined,
      photoHydration: result.photoHydration ? {
        hydrated: Number(result.photoHydration.hydrated) || 0,
        failed: Number(result.photoHydration.failed) || 0
      } : undefined
    };
  }

  function showResult(value, state = '') {
    if (!ui.result) return;
    ui.result.dataset.state = state;
    ui.result.textContent = typeof value === 'string'
      ? value
      : JSON.stringify(value, null, 2);
  }

  async function refreshStatus() {
    const sync = syncAdapter();
    const lifecycle = lifecycleHarness();
    const base = baseHarness();
    const enabled = Boolean(sync?.isEnabled?.());
    let sessionLabel = enabled ? 'Not signed in' : 'Cloud disabled';
    let signedIn = false;

    if (enabled && sync?.getSession) {
      try {
        const session = await sync.getSession();
        signedIn = Boolean(session?.user?.id);
        sessionLabel = signedIn ? (session.user.email || 'Signed in') : 'Not signed in';
      } catch (error) {
        sessionLabel = error?.message || 'Session unavailable';
      }
    }

    const rows = [
      ['Validation mode', 'Enabled'],
      ['Cloud feature flag', enabled ? 'Enabled' : 'Disabled'],
      ['Supabase session', sessionLabel],
      ['Lifecycle harness', lifecycle ? 'Loaded' : 'Missing'],
      ['Fixture project', base?.fixtureProjectId || 'Harness missing']
    ];

    ui.status.innerHTML = rows.map(([label, value]) => (
      `<dt>${label}</dt><dd>${text(value)}</dd>`
    )).join('');

    return { enabled, signedIn, lifecycleLoaded: Boolean(lifecycle), baseLoaded: Boolean(base) };
  }

  async function runAction(label, action) {
    setBusy(true);
    showResult(`${label} running...`);
    try {
      const report = await action();
      const summary = summarizeReport(report);
      showResult(summary, summary.passed ? 'pass' : 'fail');
      await refreshStatus();
      return report;
    } catch (error) {
      showResult({
        phase: label,
        passed: false,
        error: error?.message || String(error)
      }, 'fail');
      await refreshStatus();
      return null;
    } finally {
      setBusy(false);
    }
  }

  function runLocalPreflight() {
    const harness = baseHarness();
    if (!harness?.installFixture || !harness?.runContractPreflight) {
      throw new Error('Base sync validation harness is not loaded.');
    }
    const fixture = harness.installFixture();
    return harness.runContractPreflight(fixture);
  }

  async function sendMagicLink() {
    const sync = syncAdapter();
    const email = String(ui.email?.value || '').trim();
    if (!sync?.isEnabled?.()) throw new Error('Enable MGS cloud sync configuration first.');
    if (!email) throw new Error('Enter the development test email address.');
    if (!sync?.signInWithOtp) throw new Error('Supabase sign-in adapter is not loaded.');
    await sync.signInWithOtp(email, location.href.split('#')[0]);
    if (ui.email) ui.email.value = '';
    return { phase: 'magic-link', passed: true, message: 'Sign-in link sent. Return to this validation URL after signing in.' };
  }

  function button(label, handler, className = '') {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = label;
    if (className) el.className = className;
    el.addEventListener('click', handler);
    ui.buttons.push(el);
    return el;
  }

  function buildUi() {
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'mgs-validation-launcher no-print';
    launcher.textContent = 'Sync validation';
    launcher.setAttribute('aria-expanded', 'false');

    const panel = document.createElement('aside');
    panel.className = 'mgs-validation-panel no-print';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Supabase sync validation');

    const head = document.createElement('div');
    head.className = 'mgs-validation-head';
    head.innerHTML = '<div><h3>Sync validation</h3><p>Development-only cloud round-trip testing</p></div>';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mgs-validation-close';
    close.setAttribute('aria-label', 'Close validation panel');
    close.textContent = '×';
    head.appendChild(close);

    const warning = document.createElement('p');
    warning.className = 'mgs-validation-warning';
    warning.textContent = 'Development validation only. These actions create/update the deterministic test fixture in Supabase. Do not run them against a live job.';

    const status = document.createElement('dl');
    status.className = 'mgs-validation-status';

    const auth = document.createElement('div');
    auth.className = 'mgs-validation-auth';
    const email = document.createElement('input');
    email.type = 'email';
    email.autocomplete = 'email';
    email.placeholder = 'Development test email';
    email.setAttribute('aria-label', 'Development test email');
    const magic = button('Send sign-in link', () => runAction('Send sign-in link', sendMagicLink));
    auth.append(email, magic);

    const actions = document.createElement('div');
    actions.className = 'mgs-validation-actions';
    actions.append(
      button('Refresh status', () => runAction('Refresh status', async () => ({ phase: 'status', passed: Boolean((await refreshStatus()).lifecycleLoaded) }))),
      button('Local preflight', () => runAction('Local preflight', async () => runLocalPreflight())),
      button('Browser A: initial sync', () => runAction('Browser A lifecycle', async () => {
        const harness = lifecycleHarness();
        if (!harness?.runBrowserALifecycle) throw new Error('Lifecycle validation harness is not loaded.');
        return harness.runBrowserALifecycle();
      }), 'wide'),
      button('Browser B: edit + hydrate', () => runAction('Browser B lifecycle', async () => {
        const harness = lifecycleHarness();
        if (!harness?.runBrowserBLifecycle) throw new Error('Lifecycle validation harness is not loaded.');
        return harness.runBrowserBLifecycle();
      }), 'wide'),
      button('Browser A: return verify', () => runAction('Browser A return', async () => {
        const harness = lifecycleHarness();
        if (!harness?.runBrowserAReturn) throw new Error('Lifecycle validation harness is not loaded.');
        return harness.runBrowserAReturn();
      }), 'wide')
    );

    const result = document.createElement('pre');
    result.className = 'mgs-validation-result';
    result.textContent = 'Ready. Start with Local preflight, then run the Browser A → Browser B → Browser A sequence on the development Supabase project.';

    panel.append(head, warning, status, auth, actions, result);
    document.body.append(panel, launcher);

    ui.launcher = launcher;
    ui.panel = panel;
    ui.status = status;
    ui.result = result;
    ui.email = email;

    launcher.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      launcher.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
      if (!panel.hidden) refreshStatus();
    });

    close.addEventListener('click', () => {
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
    });

    window.addEventListener('mgs:supabase-sync', event => {
      if (panel.hidden) return;
      const detail = event?.detail || {};
      const phase = detail.phase ? ` · ${detail.phase}` : '';
      showResult(`Cloud event: ${detail.status || 'update'}${phase}`);
    });

    refreshStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUi, { once: true });
  } else {
    buildUi();
  }
})();
