type Consent = 'accepted' | 'declined';
type YmArguments = [counterId: number, action: string, ...parameters: unknown[]];
type Ym = ((...args: YmArguments) => void) & {
  a?: YmArguments[];
  l?: number;
};
type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
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
const counterId = Number(import.meta.env.PUBLIC_YANDEX_METRICA_ID);
const enabled = Number.isInteger(counterId) && counterId > 0;
const panel = document.querySelector<HTMLElement>('[data-cookie-panel]');
const acceptButton = panel?.querySelector<HTMLButtonElement>('[data-cookie-accept]');
const declineButton = panel?.querySelector<HTMLButtonElement>('[data-cookie-decline]');
let consent: Consent | null = null;
let loadScheduled = false;
let metricaStarted = false;
let settingsTrigger: HTMLElement | null = null;

function readConsent(): Consent | null {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved === 'accepted' || saved === 'declined' ? saved : null;
  } catch {
    return consent;
  }
}

function writeConsent(value: Consent) {
  consent = value;

  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // Keep the choice in memory when storage is unavailable.
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

function loadMetrica() {
  loadScheduled = false;

  if (!enabled || consent !== 'accepted' || metricaStarted) return;

  metricaStarted = true;
  window.ym ??= createYmQueue();

  if (
    !document.querySelector<HTMLScriptElement>(
      'script[data-yandex-metrica], script[src="https://mc.yandex.ru/metrika/tag.js"]',
    )
  ) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    script.dataset.yandexMetrica = '';
    document.head.append(script);
  }

  window.ym(counterId, 'init', {
    clickmap: false,
    trackLinks: false,
    accurateTrackBounce: true,
    webvisor: false,
  });
}

function scheduleMetrica() {
  if (loadScheduled || metricaStarted || consent !== 'accepted') return;

  loadScheduled = true;
  const requestIdleCallback = (window as IdleWindow).requestIdleCallback;

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback.call(window, loadMetrica, { timeout: 1500 });
  } else {
    window.setTimeout(loadMetrica, 0);
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

function setConsent(value: Consent) {
  const reloadWithoutAnalytics = value === 'declined' && metricaStarted;
  writeConsent(value);
  hidePanel();

  if (value === 'accepted') scheduleMetrica();

  if (reloadWithoutAnalytics) {
    window.location.reload();
    return;
  }

  settingsTrigger?.focus();
  settingsTrigger = null;
}

if (!enabled) {
  panel?.remove();
  document.querySelectorAll('[data-open-cookie-settings]').forEach((control) => control.remove());
} else {
  consent = readConsent();

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
    if (!metricaStarted || !(event instanceof CustomEvent) || !isApprovedGoal(event.detail)) {
      return;
    }

    window.ym?.(counterId, 'reachGoal', event.detail);
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
