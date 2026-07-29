"use client";

// Desktop-wallpaper sync settings. Deliberately NOT in AppShell's tab strip —
// it is a this-machine-only feature, reachable by URL. Anyone else who lands
// here sees an inert card explaining what it is.
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useIdeas } from "@/lib/useIdeas";
import type { SyncStatus } from "@/lib/wallSync";

type Mod = typeof import("@/lib/wallSync");
const load = (): Promise<Mod> => import("@/lib/wallSync");

export default function SettingsPage() {
  const { ideas, archived } = useIdeas();
  const [token, setTokenInput] = useState("");
  const [enabled, setEnabledState] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    load().then((m) => {
      if (!alive) return;
      setTokenInput(m.getToken());
      setEnabledState(m.isEnabled());
      setStatus(m.lastStatus());
    });
    const onStatus = (e: Event) => setStatus((e as CustomEvent<SyncStatus>).detail);
    window.addEventListener("lofty:sync", onStatus);
    return () => {
      alive = false;
      window.removeEventListener("lofty:sync", onStatus);
    };
  }, []);

  // The probe runs from this click on purpose: if the browser asks permission to
  // reach the local network it needs a user gesture, and a background request
  // would be suppressed — which just looks like "it doesn't work".
  const enable = useCallback(async () => {
    setBusy(true);
    const m = await load();
    m.setToken(token);
    m.setEnabled(true);
    setEnabledState(true);
    const s = await m.probe();
    if (s.ok) await m.resend(ideas, archived);
    setBusy(false);
  }, [token, ideas, archived]);

  const disable = useCallback(async () => {
    const m = await load();
    m.setEnabled(false);
    setEnabledState(false);
    setStatus(null);
  }, []);

  const sendNow = useCallback(async () => {
    setBusy(true);
    const m = await load();
    await m.resend(ideas, archived);
    setBusy(false);
  }, [ideas, archived]);

  const line = !enabled
    ? "Off — the wallpaper keeps showing whatever it last received."
    : status === null
      ? "Checking…"
      : status.ok
        ? `Connected — update ${status.generation ?? "?"}${
            status.wallpaperConnected === false ? " (wallpaper not attached)" : ""
          }`
        : `Not syncing — ${status.error ?? "unknown error"}`;

  const tone = !enabled ? "#9AA0B5" : status?.ok ? "#46C66B" : "#FF8A2E";

  return (
    <AppShell>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "24px 20px 60px" }}>
        <div className="lofty-glass" style={{ width: "100%", maxWidth: 620, padding: 24 }}>
          <h1
            style={{
              fontFamily: "var(--font-fredoka), sans-serif",
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Desktop wallpaper sync
          </h1>
          <p style={{ color: "rgba(255,255,255,.62)", fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
            Mirrors this wall onto the Windows desktop background. It needs the
            local Lofty Sync service running on this machine — everywhere else
            this page does nothing.
          </p>

          <label
            style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,.7)", marginBottom: 6 }}
          >
            Service token
          </label>
          <input
            value={token}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="paste the token from install.ps1"
            spellCheck={false}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.16)",
              background: "rgba(10,7,30,.6)",
              color: "#fff",
              fontFamily: "ui-monospace, Consolas, monospace",
              fontSize: 12,
              marginBottom: 16,
            }}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {enabled ? (
              <button className="lofty-press" onClick={disable} style={btn("rgba(255,255,255,.1)")}>
                Turn off
              </button>
            ) : (
              <button
                className="lofty-press"
                onClick={enable}
                disabled={busy || !token.trim()}
                style={btn("linear-gradient(160deg,#ff67d8,#8d45ff 55%,#4d6dff)")}
              >
                {busy ? "Connecting…" : "Turn on"}
              </button>
            )}
            <button
              className="lofty-press"
              onClick={sendNow}
              disabled={busy || !enabled}
              style={btn("rgba(255,255,255,.1)")}
            >
              Send now
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(10,7,30,.5)",
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: tone,
                boxShadow: `0 0 10px ${tone}`,
                flex: "0 0 auto",
              }}
            />
            <span style={{ fontSize: 13.5, color: "rgba(255,255,255,.86)" }}>{line}</span>
          </div>

          <p style={{ marginTop: 16, fontSize: 12.5, color: "rgba(255,255,255,.45)", lineHeight: 1.55 }}>
            {ideas.length} idea{ideas.length === 1 ? "" : "s"} on the wall. Changes
            are sent automatically about half a second after you make them.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function btn(background: string) {
  return {
    padding: "10px 18px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.18)",
    background,
    color: "#fff",
    fontFamily: "var(--font-fredoka), sans-serif",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
  } as const;
}
