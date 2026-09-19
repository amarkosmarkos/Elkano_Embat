import { NavLink, Outlet, useLocation } from "react-router";
import { motion } from "framer-motion";
import { Anchor, Coins, HandCoins, Moon, Sun, Telescope } from "lucide-react";
import { CompanyOverlay } from "@/components/CompanyOverlay";
import { useApp } from "@/store/app";
import { cx } from "@/lib/format";
import { useNetwork } from "@/hooks/useNetwork";
import { useFitScale } from "@/hooks/useFitScale";

const NAV = [
  { to: "/", label: "Lenders", sub: "Who can lend", Icon: Coins },
  { to: "/borrowers", label: "Borrowers", sub: "Treasure chest", Icon: HandCoins },
  { to: "/monitor", label: "Monitor", sub: "Crow's nest", Icon: Telescope },
];

/** Fixed-viewport shell: everything fits in one screen, never scrolls; down-scales on small viewports. */
export function AppShell() {
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const result = useApp((s) => s.result);
  const { data } = useNetwork();
  const loc = useLocation();
  const fit = useFitScale();
  return (
    <div className="relative overflow-hidden" style={{ zoom: fit.scale, width: fit.width, height: fit.height }}>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="torn-edge" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.028" numOctaves="3" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="deck" />
      <div className="grain" />
      <div className="flex h-full flex-col">
        <header className="brass relative z-40 shrink-0 border-b border-[#c9a227]/30">
          <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
            <NavLink to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c9a227]/60 bg-[#2a1b0e] shadow-[0_0_18px_rgba(201,162,39,.35)]">
                <Anchor size={17} className="text-[#e2bd45]" />
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="font-display whitespace-nowrap text-[19px] tracking-wide text-[#f3d97a]">Embat <span className="text-[#d9c39a]">Capital Network</span></div>
                <div className="font-caps text-[9px] uppercase tracking-[0.28em] text-[#b39a6d]">Rational investors sail further</div>
              </div>
            </NavLink>
            <nav className="relative flex items-center gap-1 rounded-[5px] border border-[#c9a227]/25 bg-[#0e0906]/60 p-1">
              {NAV.map((n) => {
                const active = n.to === "/" ? loc.pathname === "/" || loc.pathname.startsWith("/company") : loc.pathname.startsWith(n.to);
                return (
                  <NavLink key={n.to} to={n.to} className={cx("font-caps relative rounded-[3px] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-4", active ? "text-[#2a1b0e]" : "text-[#d9c39a] hover:text-[#f3d97a]")}>
                    {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-[3px] bg-[#c9a227] shadow-[inset_0_1px_0_rgba(255,240,180,.6)]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <span className="relative flex items-center gap-1.5">
                      <n.Icon size={13} />
                      {n.label}
                      {n.to === "/monitor" && result && <span className="h-1.5 w-1.5 rounded-full bg-[#8b1e2d] ring-1 ring-[#f3d97a]" />}
                    </span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="flex items-center gap-3">
              {data && <div className="font-caps hidden whitespace-nowrap text-[9px] uppercase tracking-[0.22em] text-[#b39a6d] lg:block">{data.meta.scoreVersion} · as of {data.meta.asOf}</div>}
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9a227]/40 text-[#d9c39a] transition hover:text-[#f3d97a]" aria-label="Toggle theme" title={theme === "dark" ? "Open sea" : "Below deck"}>
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </div>
          <div className="rope h-[5px] rounded-none" />
        </header>
        <main className="min-h-0 flex-1 p-3 md:p-4">
          <Outlet />
        </main>
        <CompanyOverlay />
      </div>
    </div>
  );
}
