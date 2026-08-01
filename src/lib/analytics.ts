/**
 * Privacy-first, opt-in analytics + Web Vitals.
 *
 * DESIGN CONTRACT:
 *   - INERT BY DEFAULT. With no env configuration this module sends NOTHING,
 *     sets no cookies, collects no PII, and loads no third-party script. In dev
 *     it will `console.debug` collected Web Vitals so you can see them locally.
 *   - OPT-IN via Vite env vars (see below). Only when configured do we forward
 *     anonymous, aggregate metrics.
 *   - NO hardcoded tracking domain. The endpoint/script are entirely env-driven.
 *   - SSR-SAFE. Every `window` / `document` / `performance` access is guarded by
 *     a `typeof` check and only runs from the client init entry point.
 *
 * ENV VARS (all optional; nothing runs unless at least one is set):
 *   VITE_ANALYTICS_SRC     URL of a self-hosted, cookieless analytics script to
 *                          inject (e.g. a privacy-friendly counter you host).
 *   VITE_ANALYTICS_DOMAIN  The `data-domain` attribute some cookieless scripts
 *                          (e.g. Plausible-style) expect. Optional companion to
 *                          VITE_ANALYTICS_SRC.
 *   VITE_VITALS_ENDPOINT   URL to POST Web Vitals JSON to (via sendBeacon /
 *                          keepalive fetch). When unset, vitals are dev-logged
 *                          only and never leave the browser.
 */

/** A single collected Web Vital sample. No PII — just a metric name + value. */
export interface WebVitalMetric {
  /** Metric name, e.g. "LCP", "CLS", "INP", "FCP", "TTFB". */
  name: string;
  /** The metric value (ms for timings, unitless for CLS). */
  value: number;
  /** Path the metric was collected on, for aggregate grouping (no query/PII). */
  path: string;
}

const ANALYTICS_SRC = import.meta.env.VITE_ANALYTICS_SRC as string | undefined;
const ANALYTICS_DOMAIN = import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined;
const VITALS_ENDPOINT = import.meta.env.VITE_VITALS_ENDPOINT as string | undefined;
const IS_DEV = Boolean(import.meta.env.DEV);

/** True only in the browser. Keeps every entry point SSR-safe. */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Current path for grouping, with no query string / hash (avoids leaking PII). */
function currentPath(): string {
  if (!isBrowser()) return "/";
  return window.location.pathname || "/";
}

/**
 * Inject a self-hosted, cookieless analytics script — ONLY when
 * `VITE_ANALYTICS_SRC` is configured. No-op otherwise. Idempotent.
 */
function loadAnalyticsScript(): void {
  if (!isBrowser() || !ANALYTICS_SRC) return;

  // Guard against double-injection (HMR, repeated init).
  if (document.querySelector(`script[data-portfolio-analytics]`)) return;

  const script = document.createElement("script");
  script.src = ANALYTICS_SRC;
  script.defer = true;
  script.setAttribute("data-portfolio-analytics", "");
  if (ANALYTICS_DOMAIN) script.setAttribute("data-domain", ANALYTICS_DOMAIN);
  document.head.appendChild(script);
}

/**
 * Forward one metric. When `VITE_VITALS_ENDPOINT` is set, POST it as JSON via
 * `sendBeacon` (falling back to keepalive fetch). Otherwise, in dev only,
 * `console.debug` it. Nothing leaves the browser when the endpoint is unset.
 */
function reportMetric(metric: WebVitalMetric): void {
  if (!isBrowser()) return;

  if (!VITALS_ENDPOINT) {
    if (IS_DEV) {
      console.debug("[web-vitals]", metric.name, Math.round(metric.value), metric.path);
    }
    return;
  }

  try {
    const body = JSON.stringify(metric);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(VITALS_ENDPOINT, blob);
      return;
    }
    void fetch(VITALS_ENDPOINT, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      mode: "no-cors",
    });
  } catch {
    /* Never let telemetry throw into the app. */
  }
}

/**
 * Observe a PerformanceObserver entry type, translating each entry into a
 * {@link WebVitalMetric} via `pick`. Returns the observer (or null) so callers
 * can disconnect. Silently no-ops when the type is unsupported.
 */
function observeEntries(
  type: string,
  buffered: boolean,
  pick: (entry: PerformanceEntry) => WebVitalMetric | null,
): PerformanceObserver | null {
  if (typeof PerformanceObserver === "undefined") return null;
  // Some browsers throw if the entry type is unknown — guard defensively.
  try {
    const supported = PerformanceObserver.supportedEntryTypes;
    if (Array.isArray(supported) && !supported.includes(type)) return null;
  } catch {
    /* supportedEntryTypes not available — attempt observe anyway. */
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const metric = pick(entry);
        if (metric) reportMetric(metric);
      }
    });
    observer.observe({ type, buffered });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Collect a lightweight set of Web Vitals using ONLY the native
 * PerformanceObserver (no `web-vitals` dependency):
 *   - LCP  (largest-contentful-paint, last entry wins)
 *   - CLS  (layout-shift, summed excluding recent input)
 *   - INP  (event, worst interaction duration — a coarse proxy)
 *   - FCP  (paint: first-contentful-paint)
 *   - TTFB (navigation: responseStart)
 *
 * Final LCP/CLS/INP values are flushed on `visibilitychange -> hidden` and
 * `pagehide`, which is the reliable moment to report terminal values.
 * Returns a cleanup function that disconnects all observers.
 */
function collectWebVitals(): () => void {
  if (!isBrowser()) return () => {};

  const observers: PerformanceObserver[] = [];
  const track = (obs: PerformanceObserver | null) => {
    if (obs) observers.push(obs);
  };

  const path = currentPath();

  // LCP — keep the latest reported value; flush the largest at the end.
  let lcpValue = 0;
  track(
    observeEntries("largest-contentful-paint", true, (entry) => {
      lcpValue = entry.startTime;
      return null; // reported on flush
    }),
  );

  // CLS — accumulate layout shifts that were not caused by recent user input.
  let clsValue = 0;
  track(
    observeEntries("layout-shift", true, (entry) => {
      const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
      if (!shift.hadRecentInput) clsValue += shift.value;
      return null; // reported on flush
    }),
  );

  // INP proxy — worst interaction latency observed.
  let inpValue = 0;
  track(
    observeEntries("event", true, (entry) => {
      const evt = entry as PerformanceEntry & { duration: number };
      if (evt.duration > inpValue) inpValue = evt.duration;
      return null; // reported on flush
    }),
  );

  // FCP — report immediately when the first-contentful-paint entry lands.
  track(
    observeEntries("paint", true, (entry) => {
      if (entry.name === "first-contentful-paint") {
        return { name: "FCP", value: entry.startTime, path };
      }
      return null;
    }),
  );

  // TTFB — from the navigation timing entry.
  track(
    observeEntries("navigation", true, (entry) => {
      const nav = entry as PerformanceNavigationTiming;
      return { name: "TTFB", value: nav.responseStart, path };
    }),
  );

  // Flush terminal metrics exactly once.
  let flushed = false;
  const flush = () => {
    if (flushed) return;
    flushed = true;
    if (lcpValue > 0) reportMetric({ name: "LCP", value: lcpValue, path });
    reportMetric({ name: "CLS", value: clsValue, path });
    if (inpValue > 0) reportMetric({ name: "INP", value: inpValue, path });
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", flush);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", flush);
    for (const obs of observers) {
      try {
        obs.disconnect();
      } catch {
        /* ignore */
      }
    }
  };
}

/**
 * Client entry point. Call once from a client effect (e.g. in the root
 * component's `useEffect`). Wires up opt-in analytics and Web Vitals collection.
 * Returns a cleanup function that tears down all listeners/observers.
 *
 * INERT unless the corresponding env vars are configured — safe to always call.
 */
export function initAnalytics(): () => void {
  if (!isBrowser()) return () => {};
  loadAnalyticsScript();
  return collectWebVitals();
}
