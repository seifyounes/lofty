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
import { useIsMobile } from "@/lib/useMediaQuery";
import { useIdeas } from "@/lib/useIdeas";

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
  const isMobile = useIsMobile();
  const { demo, exitDemo } = useIdeas();

  const tabs = (
    <nav className="lofty-tabs" style={isMobile ? { width: "100%", justifyContent: "space-between" } : undefined}>
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
  );

  // Logo with the Elite Instagram handle tucked underneath it.
  const brand = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
      <Link href="/wall" style={{ display: "block", lineHeight: 0 }} aria-label="Lofty — home">
        <img
          src="/lofty-logo.png"
          alt="Lofty"
          style={{ height: isMobile ? 38 : 58, width: "auto", display: "block" }}
        />
      </Link>
      <a
        className="lofty-ig"
        href="https://www.instagram.com/elite__app"
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: isMobile ? 11 : 12, marginLeft: isMobile ? 4 : 6 }}
      >
        @elite__app
      </a>
    </div>
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh", color: "#fff", background: "#07041a" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        {bgImage ? <WallBackground src={bgImage} /> : <Galaxy />}
        <div style={{ position: "absolute", inset: 0, background: `rgba(6,4,22,${overlay})` }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Phone: logo + New on one row, the tabs on their own full-width row. */}
        {isMobile ? (
          <header
            style={{
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "8px 14px 10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              {brand}
              <NewIdeaButton active={onNew} />
            </div>
            {tabs}
          </header>
        ) : (
          <header
            style={{
              height: 84,
              flex: "0 0 84px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 32px",
            }}
          >
            {brand}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {tabs}
              <NewIdeaButton active={onNew} />
            </div>
          </header>
        )}

        {demo && (
          <div className="lofty-demo-bar" role="status">
            <span>Demo wall with sample ideas. Nothing you change here is saved.</span>
            <button type="button" onClick={exitDemo}>
              Start your own wall
            </button>
          </div>
        )}

        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
