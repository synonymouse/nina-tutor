type Consent = 'accepted' | 'declined';
type YmArguments = [counterId: number, action: string, ...parameters: unknown[]];
type Ym = ((...args: YmArguments) => void) & {
  a?: YmArguments[];
  l?: number;
};
type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};
type ScheduledLoad = {
  kind: 'idle' | 'timeout';
  handle: number;
  generation: number;
};

const approvedGoals = [
  'contact_open',
  'telegram_click',
  'whatsapp_click',
  'form_success',
] as const;
type Goal = (typeof approvedGoals)[number];
const approvedGoalSet = new Set<string>(approvedGoals);

declare global {
  interface Window {
    ym?: Ym;
  }
}

const storageKey = 'nina:analytics-consent:v1';
const channelName = `${storageKey}:sync`;
const maxPendingGoals = 20;
const counterId = Number(import.meta.env.PUBLIC_YANDEX_METRICA_ID);
const enabled = Number.isInteger(counterId) && counterId > 0;
const panel = document.querySelector<HTMLElement>('[data-cookie-panel]');
const acceptButton = panel?.querySelector<HTMLButtonElement>('[data-cookie-accept]');
const declineButton = panel?.querySelector<HTMLButtonElement>('[data-cookie-decline]');
let consent: Consent | null = null;
let lifecycleGeneration = 0;
let scheduledLoad: ScheduledLoad | null = null;
let metricaStarted = false;
let metricaReady = false;
let metricaScript: HTMLScriptElement | null = null;
let scriptLoadHandler: (() => void) | null = null;
let scriptErrorHandler: (() => void) | null = null;
let queuedYm: Ym | null = null;
let consentChannel: BroadcastChannel | null = null;
let settingsTrigger: HTMLElement | null = null;
const pendingGoals: Goal[] = [];

function readConsent(): Consent | null {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved === 'accepted' || saved === 'declined' ? saved : null;
  } catch {
    return consent;
  }
}

function writeConsent(value: Consent): boolean {
  consent = value;

  try {
    window.localStorage.setItem(storageKey, value);
    return window.localStorage.getItem(storageKey) === value;
  } catch {
    return false;
  }
}

function isApprovedGoal(value: unknown): value is Goal {
  return typeof value === 'string' && approvedGoalSet.has(value);
}

function createYmQueue(): Ym {
  const ym = ((...args: YmArguments) => {
    (ym.a ??= []).push(args);
  }) as Ym;

  ym.l = Date.now();
  return ym;
}

function ensureYm(): Ym {
  if (typeof window.ym === 'function') return window.ym;

  queuedYm = createYmQueue();
  window.ym = queuedYm;
  return queuedYm;
}

function unbindMetricaScript() {
  if (!metricaScript) return;

  if (scriptLoadHandler) metricaScript.removeEventListener('load', scriptLoadHandler);
  if (scriptErrorHandler) metricaScript.removeEventListener('error', scriptErrorHandler);
  scriptLoadHandler = null;
  scriptErrorHandler = null;
}

function removeMetricaScript() {
  unbindMetricaScript();
  metricaScript?.remove();
  metricaScript = null;
}

function cancelScheduledLoad() {
  lifecycleGeneration += 1;

  if (!scheduledLoad) return;

  if (scheduledLoad.kind === 'idle') {
    (window as IdleWindow).cancelIdleCallback?.(scheduledLoad.handle);
  } else {
    window.clearTimeout(scheduledLoad.handle);
  }

  scheduledLoad = null;
}

function stopMetrica(clearGoals: boolean) {
  cancelScheduledLoad();

  if (metricaStarted && typeof window.ym === 'function') {
    try {
      window.ym(counterId, 'destruct');
    } catch {
      // Consent state still prevents further application goals if teardown is unavailable.
    }
  }

  metricaStarted = false;
  metricaReady = false;
  removeMetricaScript();

  if (queuedYm && window.ym === queuedYm) delete window.ym;
  queuedYm = null;

  if (clearGoals) pendingGoals.length = 0;
}

function queueGoal(goal: Goal) {
  if (pendingGoals.length < maxPendingGoals) pendingGoals.push(goal);
}

function flushPendingGoals() {
  if (consent !== 'accepted' || !metricaStarted || !metricaReady) return;

  if (typeof window.ym !== 'function') {
    stopMetrica(false);
    scheduleMetrica();
    return;
  }

  const goals = pendingGoals.splice(0);

  for (let index = 0; index < goals.length; index += 1) {
    try {
      window.ym(counterId, 'reachGoal', goals[index]);
    } catch {
      pendingGoals.unshift(...goals.slice(index));
      stopMetrica(false);
      scheduleMetrica();
      return;
    }
  }
}

function handleScriptError(generation: number) {
  if (generation !== lifecycleGeneration || consent !== 'accepted') return;

  stopMetrica(false);
}

function bindMetricaScript(script: HTMLScriptElement, generation: number) {
  if (metricaScript !== script) unbindMetricaScript();
  metricaScript = script;

  scriptLoadHandler = () => {
    if (generation !== lifecycleGeneration || consent !== 'accepted' || script !== metricaScript) {
      return;
    }

    script.dataset.analyticsLoaded = 'true';
    metricaReady = true;
    flushPendingGoals();
  };
  scriptErrorHandler = () => handleScriptError(generation);
  script.addEventListener('load', scriptLoadHandler, { once: true });
  script.addEventListener('error', scriptErrorHandler, { once: true });
}

function loadMetrica(generation: number) {
  if (scheduledLoad?.generation === generation) scheduledLoad = null;

  if (
    generation !== lifecycleGeneration ||
    !enabled ||
    consent !== 'accepted' ||
    metricaStarted
  ) {
    return;
  }

  const ym = ensureYm();
  let script = document.querySelector<HTMLScriptElement>(
    'script[data-yandex-metrica], script[src="https://mc.yandex.ru/metrika/tag.js"]',
  );

  if (!script) {
    script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    script.dataset.yandexMetrica = '';
  }

  bindMetricaScript(script, generation);

  if (script.dataset.analyticsLoaded === 'true') {
    metricaReady = true;
  } else if (!script.isConnected) {
    document.head.append(script);
  }

  if (generation !== lifecycleGeneration || consent !== 'accepted') return;

  try {
    ym(counterId, 'init', {
      clickmap: false,
      trackLinks: false,
      accurateTrackBounce: true,
      webvisor: false,
    });
    metricaStarted = true;

    if (metricaReady) flushPendingGoals();
  } catch {
    handleScriptError(generation);
  }
}

function scheduleMetrica() {
  if (scheduledLoad || metricaStarted || consent !== 'accepted') return;

  const generation = lifecycleGeneration;
  const requestIdleCallback = (window as IdleWindow).requestIdleCallback;

  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback.call(window, () => loadMetrica(generation), {
      timeout: 1500,
    });
    scheduledLoad = { kind: 'idle', handle, generation };
  } else {
    const handle = window.setTimeout(() => loadMetrica(generation), 0);
    scheduledLoad = { kind: 'timeout', handle, generation };
  }
}

function hidePanel() {
  if (panel) panel.hidden = true;
}

function openSettings(moveFocus = false) {
  if (!panel) return;

  panel.hidden = false;
  if (moveFocus) declineButton?.focus();
}

function broadcastConsent(value: Consent) {
  try {
    consentChannel?.postMessage(value);
  } catch {
    // Storage events remain available when the channel cannot send.
  }
}

function applySyncedConsent(value: Consent, persistLocally: boolean) {
  consent = value;
  hidePanel();

  if (value === 'declined') {
    stopMetrica(true);
    if (persistLocally) writeConsent(value);
    return;
  }

  scheduleMetrica();
}

function setConsent(value: Consent) {
  if (value === 'declined') {
    const reloadWithoutAnalytics = metricaStarted;
    consent = value;
    stopMetrica(true);
    const persisted = writeConsent(value);
    broadcastConsent(value);
    hidePanel();

    if (reloadWithoutAnalytics && persisted) {
      window.location.reload();
      return;
    }
  } else {
    writeConsent(value);
    broadcastConsent(value);
    hidePanel();
    scheduleMetrica();
  }

  settingsTrigger?.focus();
  settingsTrigger = null;
}

function openConsentChannel() {
  if (!enabled || consentChannel || typeof BroadcastChannel !== 'function') return;

  try {
    consentChannel = new BroadcastChannel(channelName);
    consentChannel.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (event.data === 'declined') {
        applySyncedConsent('declined', true);
      } else if (event.data === 'accepted') {
        applySyncedConsent('accepted', false);
      }
    });
  } catch {
    consentChannel = null;
  }
}

function closeConsentChannel() {
  consentChannel?.close();
  consentChannel = null;
}

function restoreConsentSync() {
  const saved = readConsent();

  if (saved) applySyncedConsent(saved, false);
  openConsentChannel();
}

function handleGoal(goal: Goal) {
  if (consent !== 'accepted') return;

  if (metricaStarted && metricaReady) {
    if (typeof window.ym !== 'function') {
      queueGoal(goal);
      stopMetrica(false);
      scheduleMetrica();
      return;
    }

    try {
      window.ym(counterId, 'reachGoal', goal);
    } catch {
      queueGoal(goal);
      stopMetrica(false);
      scheduleMetrica();
    }
    return;
  }

  queueGoal(goal);
  scheduleMetrica();
}

if (!enabled) {
  panel?.remove();
  document.querySelectorAll('[data-open-cookie-settings]').forEach((control) => control.remove());
} else {
  consent = readConsent();
  openConsentChannel();

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;

    if (event.newValue === 'declined' || event.newValue === 'accepted') {
      applySyncedConsent(event.newValue, false);
    }
  });
  window.addEventListener('pagehide', closeConsentChannel);
  window.addEventListener('pageshow', restoreConsentSync);

  if (consent === 'accepted') {
    scheduleMetrica();
  } else if (consent !== 'declined') {
    openSettings();
  }

  acceptButton?.addEventListener('click', () => setConsent('accepted'));
  declineButton?.addEventListener('click', () => setConsent('declined'));

  document.querySelectorAll<HTMLElement>('[data-open-cookie-settings]').forEach((control) => {
    control.hidden = false;
    control.addEventListener('click', () => {
      settingsTrigger = control;
      openSettings(true);
    });
  });

  window.addEventListener('nina:goal', (event) => {
    if (!(event instanceof CustomEvent) || !isApprovedGoal(event.detail)) {
      return;
    }

    handleGoal(event.detail);
  });

  document.querySelectorAll<HTMLElement>('[data-goal]').forEach((element) => {
    if (element.dataset.analyticsGoalBound === 'true') return;

    element.dataset.analyticsGoalBound = 'true';
    element.addEventListener('click', () => {
      const goal = element.dataset.goal;
      if (isApprovedGoal(goal)) {
        window.dispatchEvent(new CustomEvent('nina:goal', { detail: goal }));
      }
    });
  });
}

export {};
