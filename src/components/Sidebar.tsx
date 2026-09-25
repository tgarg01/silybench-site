"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "silybench-theme";

/** Runs before paint so a saved theme doesn't flash. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const icon = "h-4 w-4 shrink-0";

const I = ({ d }: { d: string }) => (
  <svg className={icon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const NAV_GROUPS = [
  {
    title: "Cost",
    items: [
      { href: "/", label: "Self-host vs API", icon: <I d="M2 13.5h12M4 11V7M8 11V3.5M12 11V6" /> },
      { href: "/calculator/", label: "Calculator", icon: <I d="M3.5 2h9v12h-9zM5.5 4.5h5M5.5 8h1M9.5 8h1M5.5 11h1M9.5 11h1" /> },
      { href: "/services/", label: "Managed hosting", icon: <I d="M2.5 9.5 8 13l5.5-3.5M2.5 6.5 8 3l5.5 3.5L8 10z" /> },
    ],
  },
  {
    title: "Benchmarks",
    items: [
      { href: "/benchmarks/", label: "Performance", icon: <I d="M2 2.5v11h12M4.5 10l3-3.5 2 2L13 4" /> },
      { href: "/runs/", label: "Runs", icon: <I d="M5 4h9M5 8h9M5 12h9M2 4h.5M2 8h.5M2 12h.5" /> },
    ],
  },
  {
    title: "Open data",
    items: [
      { href: "/data/", label: "Data", icon: <I d="M3 4c0-1.1 2.2-2 5-2s5 .9 5 2-2.2 2-5 2-5-.9-5-2zM3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" /> },
      { href: "/reproduce/", label: "Reproduce", icon: <I d="M13 8a5 5 0 1 1-1.5-3.5M13 2.5v2.5h-2.5" /> },
      { href: "/methodology/", label: "Methodology", icon: <I d="M3 2.5h7l3 3v8H3zM5.5 8h5M5.5 10.5h5" /> },
    ],
  },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="silybench home">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="2" y="8" width="3" height="6" rx="1" />
          <rect x="6.5" y="4" width="3" height="10" rx="1" />
          <rect x="11" y="2" width="3" height="12" rx="1" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">silybench</span>
    </Link>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(root.dataset.theme ? root.dataset.theme === "dark" : mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setDark(!dark);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      {dark ? (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
        </svg>
      )}
    </button>
  );
}

export function Sidebar({ stack }: { stack: string[] }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, "")));

  return (
    <aside className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:h-full lg:flex-col lg:flex-nowrap lg:items-stretch lg:px-4 lg:py-5">
        <div className="flex flex-1 items-center justify-between lg:flex-none lg:px-2">
          <Logo />
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>

        <nav
          aria-label="Main"
          className="no-scrollbar -mx-1 flex w-full gap-1 overflow-x-auto lg:mx-0 lg:mt-6 lg:flex-col lg:overflow-visible"
        >
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="flex shrink-0 gap-1 lg:mb-4 lg:flex-col">
              <div className="mb-1 hidden px-2 text-[11px] font-medium uppercase tracking-wider text-muted lg:block">
                {g.title}
              </div>
              {g.items.map((n) => {
                const on = active(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm ${
                      on ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {n.icon}
                    {n.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto hidden space-y-3 lg:block">
          {stack.length > 0 && (
            <div className="rounded-xl bg-surface-2 p-3 text-xs">
              <div className="font-medium text-ink">Measured on</div>
              <ul className="mt-1.5 space-y-1 text-ink-2">
                {stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
