// Pushes idea state to the local desktop-wallpaper service.
//
// This module is loaded lazily and ONLY when `lofty.sync.enabled` is "1" in
// localStorage, so for every other visitor to the deployed site it is never
// downloaded, parsed or executed. Nothing here may throw: the wallpaper is a
// nicety, the app is not.
//
// See tools/wallpaper-sync/ for the service that receives this.

import type { ArchivedIdea, Idea } from "./types";

const PORTS = [47821, 47822, 47823];
const ENABLED_KEY = "lofty.sync.enabled";
const TOKEN_KEY = "lofty.sync.token";
const PORT_KEY = "lofty.sync.port";
const STATUS_KEY = "lofty.sync.status";

export type SyncStatus = {
  ok: boolean;
  at: number;
  error?: string;
  generation?: number;
  ideas?: number;
  wallpaperConnected?: boolean;
};

function read(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

export function isEnabled(): boolean {
  return read(ENABLED_KEY) === "1";
}

export function getToken(): string {
  return read(TOKEN_KEY);
}

export function setToken(token: string): void {
  write(TOKEN_KEY, token.trim());
}

export function setEnabled(on: boolean): void {
  write(ENABLED_KEY, on ? "1" : "0");
}

export function lastStatus(): SyncStatus | null {
  try {
    return JSON.parse(read(STATUS_KEY)) as SyncStatus;
  } catch {
    return null;
  }
}

function publish(status: SyncStatus): void {
  write(STATUS_KEY, JSON.stringify(status));
  try {
    window.dispatchEvent(new CustomEvent("lofty:sync", { detail: status }));
  } catch {
    /* no window (SSR) — never reached, this module is client-only */
  }
}

/** 32-bit FNV-1a. Used only to skip pushes that would be no-ops. */
function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16);
}

type Row = [string, number, number, string, number, string, number];

function toRows(ideas: Idea[]): Row[] {
  return ideas.map((i) => [
    i.id,
    i.priority,
    i.big,
    i.balloon,
    i.progress,
    i.name,
    i.deadline,
  ]);
}

let lastSent = "";
let failures = 0;
let mutedUntil = 0;
let pending: string | null = null;
let pendingBody: string | null = null;
let pendingSig = "";
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const RETRY_MS = 20_000;

/**
 * Keep trying the last unsent payload until it lands. Without this, an idea
 * added while the service happens to be down would sit unsynced until the next
 * edit or page load — so "it always syncs" would quietly not be true.
 */
function scheduleRetry(): void {
  if (retryTimer || !pendingBody) return;
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    if (!isEnabled() || !pendingBody) return;
    const body = pendingBody;
    for (const port of candidatePorts()) {
      try {
        const res = await post(port, body);
        if (!res.ok) break; // reachable but refusing — retrying won't help
        const out = (await res.json()) as { generation?: number };
        write(PORT_KEY, String(port));
        lastSent = pendingSig;
        pending = null;
        pendingBody = null;
        failures = 0;
        mutedUntil = 0;
        publish({ ok: true, at: Date.now(), generation: out.generation });
        return;
      } catch {
        /* try the next port */
      }
    }
    publish({ ok: false, at: Date.now(), error: "service not running (still retrying)" });
    scheduleRetry();
  }, RETRY_MS);
}

function candidatePorts(): number[] {
  const cached = Number(read(PORT_KEY));
  if (cached && PORTS.includes(cached)) {
    return [cached, ...PORTS.filter((p) => p !== cached)];
  }
  return PORTS;
}

async function post(port: number, body: string): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}/v1/state`, {
    method: "POST",
    // text/plain keeps this a CORS-"simple" request, so there is no CORS
    // preflight. (It does not avoid Chrome's private-network preflight.)
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
    mode: "cors",
    cache: "no-store",
    keepalive: true,
    signal: AbortSignal.timeout(3000),
  });
}

/**
 * Send the current wall to the wallpaper service. Safe to call on every change:
 * identical payloads are skipped, and repeated failures back off.
 */
export async function push(ideas: Idea[], archived: ArchivedIdea[]): Promise<void> {
  if (!isEnabled()) return;
  const token = getToken();
  if (!token) {
    publish({ ok: false, at: Date.now(), error: "no token set" });
    return;
  }

  const core = JSON.stringify([toRows(ideas), archived.slice(0, 50).map((a) => a.id)]);
  const sig = hash(core);
  if (sig === lastSent) return; // nothing changed — the StrictMode echo dies here
  pending = core;

  const body = JSON.stringify({
    v: 1,
    token,
    rev: Date.now(),
    origin: typeof location !== "undefined" ? location.origin : "",
    ideas: toRows(ideas),
    archivedIds: archived.slice(0, 50).map((a) => a.id),
  });

  // Remember it before attempting, so a failure (or a muted window) still gets
  // retried in the background rather than being lost.
  pendingBody = body;
  pendingSig = sig;

  if (Date.now() < mutedUntil) {
    scheduleRetry();
    return;
  }

  for (const port of candidatePorts()) {
    try {
      const res = await post(port, body);
      if (!res.ok) {
        // Reached the service but it refused (bad token, bad origin).
        let error = `service returned ${res.status}`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) error = j.error;
        } catch {
          /* non-JSON body */
        }
        failures = 0; // it IS reachable; don't back off, just report
        publish({ ok: false, at: Date.now(), error });
        return;
      }
      const out = (await res.json()) as { generation?: number; deduped?: boolean };
      write(PORT_KEY, String(port));
      lastSent = sig;
      pending = null;
      pendingBody = null;
      failures = 0;
      mutedUntil = 0;
      publish({
        ok: true,
        at: Date.now(),
        generation: out.generation,
        ideas: ideas.length,
      });
      return;
    } catch {
      /* try the next port */
    }
  }

  failures++;
  if (failures >= 5) mutedUntil = Date.now() + RETRY_MS; // stop hammering loopback
  publish({ ok: false, at: Date.now(), error: "service not running (retrying)" });
  scheduleRetry(); // the idea still reaches the wallpaper once the service is back
}

/** One-shot reachability probe. Call this from a click — if the browser shows a
 *  local-network permission prompt it needs a user gesture, and firing it from a
 *  background effect gets it suppressed, which reads as "silently broken". */
export async function probe(): Promise<SyncStatus> {
  const token = getToken();
  if (!token) return { ok: false, at: Date.now(), error: "no token set" };
  for (const port of candidatePorts()) {
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/v1/ping?t=${encodeURIComponent(token)}`,
        { cache: "no-store", signal: AbortSignal.timeout(3000) },
      );
      if (res.status === 403) {
        const s: SyncStatus = { ok: false, at: Date.now(), error: "token rejected" };
        publish(s);
        return s;
      }
      if (!res.ok) continue;
      const j = (await res.json()) as { generation?: number; wallpaperClients?: number };
      write(PORT_KEY, String(port));
      const s: SyncStatus = {
        ok: true,
        at: Date.now(),
        generation: j.generation,
        wallpaperConnected: (j.wallpaperClients ?? 0) > 0,
      };
      failures = 0;
      mutedUntil = 0;
      publish(s);
      return s;
    } catch {
      /* next port */
    }
  }
  const s: SyncStatus = { ok: false, at: Date.now(), error: "service not running" };
  publish(s);
  return s;
}

/** Re-send the last payload even if it was already sent (used by "Send now"). */
export async function resend(ideas: Idea[], archived: ArchivedIdea[]): Promise<void> {
  lastSent = "";
  mutedUntil = 0;
  failures = 0;
  await push(ideas, archived);
}

// A change made just before the tab closes still gets out: `keepalive` lets the
// request outlive the document.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (!pending || !isEnabled()) return;
    const token = getToken();
    if (!token) return;
    try {
      const parsed = JSON.parse(pending) as [Row[], string[]];
      void post(
        Number(read(PORT_KEY)) || PORTS[0],
        JSON.stringify({
          v: 1,
          token,
          rev: Date.now(),
          origin: location.origin,
          ideas: parsed[0],
          archivedIds: parsed[1],
        }),
      );
    } catch {
      /* best effort */
    }
  });
}
