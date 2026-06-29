"use client";
/* eslint-disable @next/next/no-img-element */

// Full-viewport galaxy background + per-screen overlay + top nav. Wraps every
// screen. The active route drives the pill toggle / New-idea highlight.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import Galaxy from "./Galaxy";
import WallBackground from "./WallBackground";

const FREDOKA = "var(--font-fredoka), sans-serif";

const TABS = [
  { label: "Wall", href: "/wall" },
  { label: "List", href: "/list" },
  { label: "Deadlines", href: "/deadlines" },
];

// Per-screen dark overlay opacities, mirroring the design.
const OVERLAY: Record<string, number> = {
  "/wall": 0.18,
  "/list": 0.46,
  "/deadlines": 0.3,
  "/new": 0.42,
};

export default function AppShell({ children, bgImage }: { children: ReactNode; bgImage?: string }) {
  const pathname = usePathname() || "/wall";
  const overlay = OVERLAY[pathname] ?? 0.3;
  const onNew = pathname === "/new";

  const tab = (active: boolean): CSSProperties => ({
    padding: "6px 15px",
    borderRadius: 999,
    fontFamily: FREDOKA,
    fontWeight: active ? 600 : 500,
    fontSize: 14,
    color: active ? "#fff" : "rgba(255,255,255,0.6)",
    background: active ? "rgba(255,255,255,0.16)" : "transparent",
    textDecoration: "none",
    transition: "color 120ms, background 120ms",
  });

  return (
    <div style={{ position: "relative", minHeight: "100vh", color: "#fff", background: "#07041a" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        {bgImage ? <WallBackground src={bgImage} /> : <Galaxy />}
        <div style={{ position: "absolute", inset: 0, background: `rgba(6,4,22,${overlay})` }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 72,
            flex: "0 0 72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
          }}
        >
          <Link href="/wall" style={{ display: "block", lineHeight: 0 }} aria-label="Lofty — home">
            <img src="/lofty-logo.png" alt="Lofty" style={{ height: 60, width: "auto", display: "block" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <nav style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: 4 }}>
              {TABS.map((t) => (
                <Link key={t.href} href={t.href} style={tab(pathname === t.href)}>
                  {t.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/new"
              style={{
                padding: "9px 18px",
                borderRadius: 999,
                background: "linear-gradient(135deg,#FF5FA2,#A06BFF)",
                color: "#fff",
                fontFamily: FREDOKA,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: onNew
                  ? "0 0 0 2px rgba(255,255,255,0.22), 0 6px 22px rgba(160,107,255,0.55)"
                  : "0 6px 22px rgba(160,107,255,0.55)",
              }}
            >
              +&nbsp;&nbsp;New idea
            </Link>
          </div>
        </header>

        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
      </div>
    </div>
  );
}
