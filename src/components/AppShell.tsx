"use client";
/* eslint-disable @next/next/no-img-element */

// Full-viewport galaxy background + per-screen overlay + top nav. Wraps every
// screen. The active route drives the pill toggle / New-idea highlight.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Galaxy from "./Galaxy";
import WallBackground from "./WallBackground";
import NewIdeaButton from "./NewIdeaButton";

const TABS = [
  { label: "Wall", href: "/wall" },
  { label: "List", href: "/list" },
  { label: "Deadlines", href: "/deadlines" },
  { label: "Quiet Sky", href: "/archive" },
];

// Per-screen dark overlay opacities, mirroring the design.
const OVERLAY: Record<string, number> = {
  "/wall": 0.18,
  "/list": 0.46,
  "/deadlines": 0.3,
  "/archive": 0.46,
  "/new": 0.42,
};

export default function AppShell({ children, bgImage }: { children: ReactNode; bgImage?: string }) {
  const pathname = usePathname() || "/wall";
  const overlay = OVERLAY[pathname] ?? 0.3;
  const onNew = pathname === "/new";

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
            <nav className="lofty-tabs">
              {TABS.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`lofty-tab${pathname === t.href ? " lofty-tab--active" : ""}`}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <NewIdeaButton active={onNew} />
          </div>
        </header>

        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
      </div>
    </div>
  );
}
