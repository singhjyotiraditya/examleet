"use client";
import React, { useRef, useEffect, memo } from "react";
import { SubjectId } from "@/lib/data";
import * as Icons from "./icons";
import katex from "katex";
import "katex/dist/katex.min.css";

// ── Subject marks ──────────────────────────────────────────────────────────
const SubjectMarks: Record<SubjectId, ({ size }: { size: number }) => React.ReactElement> = {
  phy: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>
      <ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(-30 12 12)"/>
      <ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(30 12 12)"/>
    </svg>
  ),
  chem: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="9" r="3"/>
      <circle cx="16" cy="15" r="4" fill="currentColor" stroke="none" opacity="0.18"/>
      <circle cx="16" cy="15" r="4"/>
      <path d="M9.5 11l4 2"/>
    </svg>
  ),
  math: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19c4 0 4-14 8-14"/>
      <path d="M9 12h7"/>
      <path d="M14 6l6 12"/>
      <path d="M20 6l-6 12"/>
    </svg>
  ),
};

export function SubjectIcon({ subject, size = 36 }: { subject: SubjectId; size?: number }) {
  const Mark = SubjectMarks[subject];
  return (
    <div className={`subj-${subject} bg-${subject} bord-${subject}`}
      style={{ width: size, height: size, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid", flexShrink: 0 }}>
      <Mark size={size * 0.58} />
    </div>
  );
}

// ── Difficulty chip ────────────────────────────────────────────────────────
export function DifficultyChip({ d }: { d: string }) {
  const cls = d === "Easy" ? "chip-easy" : d === "Medium" ? "chip-medium" : "chip-hard";
  return <span className={`chip chip-mono ${cls}`}>{d}</span>;
}

// ── Streak ring ────────────────────────────────────────────────────────────
export function StreakRing({ value, max = 100, size = 96, stroke = 8, children }: {
  value: number; max?: number; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="ring-track" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="ring-progress" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────────
export function Sparkline({ data, w = 80, h = 24, color = "currentColor" }: {
  data: number[]; w?: number; h?: number; color?: string;
}) {
  const max = Math.max(...data), min = Math.min(...data);
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Heatmap (90-day compact) ───────────────────────────────────────────────
export function Heatmap({ data }: { data: number[] }) {
  return (
    <div className="heat">
      {data.map((v, i) => (
        <div key={i} className={`heat-cell${v > 0 ? ` l${v}` : ""}`} />
      ))}
    </div>
  );
}

// ── YearHeatmap ────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const LEVEL_COLORS = [
  "var(--bg-2)",
  "color-mix(in srgb, var(--accent) 20%, var(--bg-2))",
  "color-mix(in srgb, var(--accent) 40%, var(--bg-2))",
  "color-mix(in srgb, var(--accent) 65%, var(--bg-2))",
  "var(--accent)",
];

export function YearHeatmap({ data, centerCurrentMonth = false }: { data: number[]; centerCurrentMonth?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMonthRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!centerCurrentMonth || !scrollRef.current || !currentMonthRef.current) return;
    const c = scrollRef.current, m = currentMonthRef.current;
    c.scrollLeft = m.offsetLeft - c.clientWidth / 2 + m.clientWidth / 2;
  }, [centerCurrentMonth]);

  const today = new Date(2026, 4, 23);
  const startDate = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year

  // Build date→value lookup (only past days up to today)
  const lookup = new Map<string, number>();
  data.forEach((v, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (d <= today) lookup.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, v);
  });

  // Show Jan–Dec of the current year
  const year = today.getFullYear();
  const months: { year: number; month: number }[] = Array.from({ length: 12 }, (_, m) => ({ year, month: m }));

  // For each month build week-columns (7 rows, Sun–Sat)
  const monthBlocks = months.map(({ year, month }) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    // pad + all days of month; -1 = future day (gray), null = padding (transparent)
    const cells: (number | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, d) => {
        const key = `${year}-${month}-${d + 1}`;
        if (lookup.has(key)) return lookup.get(key)!;
        const cellDate = new Date(year, month, d + 1);
        return cellDate > today ? -1 : 0;
      }),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { label: MONTH_NAMES[month], weeks };
  });

  const activeDays = data.filter(v => v > 0).length;
  const CELL = 13, GAP = 3, R = 4;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--fg-1)" }}>Activity</span>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{activeDays} active days</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--fg-3)" }}>
          <span>Less</span>
          {LEVEL_COLORS.map((c, i) => (
            <div key={i} style={{ width: CELL, height: CELL, borderRadius: R, background: c, flexShrink: 0 }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Month blocks */}
      <div ref={scrollRef} style={{ overflowX: "auto", scrollbarWidth: "none" } as React.CSSProperties}>
        <style>{`.yh-wrap::-webkit-scrollbar{display:none}`}</style>
        <div className="yh-wrap" style={{ display: "inline-flex", alignItems: "flex-start", gap: 10 }}>
          {monthBlocks.map(({ label, weeks }, mi) => (
            <div key={label} ref={mi === today.getMonth() ? currentMonthRef : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: GAP, flexShrink: 0 }}>
              {/* Month label */}
              <div style={{ fontSize: 10, color: "var(--fg-3)", height: 13, lineHeight: "13px" }}>{label}</div>
              {/* Week columns side by side */}
              <div style={{ display: "flex", gap: GAP }}>
                {weeks.map((week, w) => (
                  <div key={w} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                    {week.map((v, d) => (
                      <div
                        key={d}
                        title={v !== null ? `${v} solved` : undefined}
                        style={{
                          width: CELL, height: CELL, borderRadius: R, flexShrink: 0,
                          background: v === null ? "transparent" : v === -1 ? "var(--bg-3)" : LEVEL_COLORS[v],
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MonthHeatmap — compact single-month view for dashboard ────────────────
export function MonthHeatmap({ data }: { data: number[] }) {
  const today = new Date(2026, 4, 23);
  const year = today.getFullYear(), month = today.getMonth();
  const startDate = new Date(year, 0, 1);

  const lookup = new Map<string, number>();
  data.forEach((v, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (d <= today) lookup.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, v);
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, d) => {
      const key = `${year}-${month}-${d + 1}`;
      if (lookup.has(key)) return lookup.get(key)!;
      return new Date(year, month, d + 1) > today ? -1 : 0;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const activeDays = data.filter(v => v > 0).length;
  const CELL = 10, GAP = 3, R = 3;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--fg-1)" }}>Activity</span>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{activeDays} active days</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{MONTH_NAMES[month]} {year}</span>
      </div>
      <div style={{ display: "flex", gap: GAP }}>
        {weeks.map((week, w) => (
          <div key={w} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {week.map((v, d) => (
              <div key={d} style={{
                width: CELL, height: CELL, borderRadius: R, flexShrink: 0,
                background: v === null ? "transparent" : v === -1 ? "var(--bg-3)" : LEVEL_COLORS[v],
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const init = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="avatar" style={{
      width: size, height: size, fontSize: size * 0.37,
      background: `linear-gradient(145deg, oklch(0.91 0.08 ${h}), oklch(0.84 0.13 ${h + 22}))`,
      color: `oklch(0.33 0.16 ${h})`,
      border: `1.5px solid oklch(0.78 0.12 ${h} / 0.5)`,
    }}>
      {init}
    </div>
  );
}

// ── Brand mark (logo icon) ─────────────────────────────────────────────────
export function BrandMark({ size = 64 }: { size?: number }) {
  return <img src="/logo.png" alt="ExamLeet" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
}

// ── ExamLeet mark — logo for desktop top bar ──────────────────────────────
export function ExamLeetMark({ size = 36 }: { size?: number }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <img src="/logo.png" alt="ExamLeet" style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
    </div>
  );
}

// ── AppBar ─────────────────────────────────────────────────────────────────
export function AppBar({ title, eyebrow, right, display }: {
  title: React.ReactNode; eyebrow?: React.ReactNode; right?: React.ReactNode; display?: boolean;
}) {
  return (
    <div className="app-header">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
          <div className={display ? "h-display" : "h-title"}>{title}</div>
        </div>
        {right}
      </div>
    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────
type TabId = "home" | "sets" | "contests" | "profile";

const NavMarks: Record<TabId, () => React.ReactElement> = {
  home: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.02 2.84L3.63 7.04C2.73 7.74 2 9.23 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29 21.19 7.74 20.2 7.05L14.02 2.72C12.62 1.74 10.37 1.79 9.02 2.84Z"/>
      <path d="M12 18V15"/>
    </svg>
  ),
  sets: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 19.9V4.1C10.5 2.6 9.86 2 8.27 2H4.23C2.64 2 2 2.6 2 4.1V19.9C2 21.4 2.64 22 4.23 22H8.27C9.86 22 10.5 21.4 10.5 19.9Z"/>
      <path d="M22 10.9V4.1C22 2.6 21.36 2 19.77 2H15.73C14.14 2 13.5 2.6 13.5 4.1V10.9C13.5 12.4 14.14 13 15.73 13H19.77C21.36 13 22 12.4 22 10.9Z"/>
      <path d="M22 19.9V18.1C22 16.6 21.36 16 19.77 16H15.73C14.14 16 13.5 16.6 13.5 18.1V19.9C13.5 21.4 14.14 22 15.73 22H19.77C21.36 22 22 21.4 22 19.9Z"/>
    </svg>
  ),
  contests: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.15 16.5V18.6"/>
      <path d="M7.15 22H17.15V21C17.15 19.9 16.25 19 15.15 19H9.15C8.05 19 7.15 19.9 7.15 21V22Z"/>
      <path d="M6.15 22H18.15"/>
      <path d="M12 16C8.13 16 5 12.87 5 9V6C5 3.79 6.79 2 9 2H15C17.21 2 19 3.79 19 6V9C19 12.87 15.87 16 12 16Z"/>
      <path d="M5.47 11.65C4.72 11.41 4.06 10.97 3.54 10.45C2.64 9.45 2.04 8.25 2.04 6.85C2.04 5.45 3.14 4.35 4.54 4.35H5.19C4.99 4.81 4.89 5.32 4.89 5.85V8.85C4.89 9.85 5.1 10.79 5.47 11.65Z"/>
      <path d="M18.53 11.65C19.28 11.41 19.94 10.97 20.46 10.45C21.36 9.45 21.96 8.25 21.96 6.85C21.96 5.45 20.86 4.35 19.46 4.35H18.81C19.01 4.81 19.11 5.32 19.11 5.85V8.85C19.11 9.85 18.9 10.79 18.53 11.65Z"/>
    </svg>
  ),
  profile: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.16 10.87C12.06 10.86 11.94 10.86 11.83 10.87C9.45 10.79 7.56 8.84 7.56 6.44C7.56 3.99 9.54 2 12 2C14.45 2 16.44 3.99 16.44 6.44C16.43 8.84 14.54 10.79 12.16 10.87Z"/>
      <path d="M7.16 14.56C4.74 16.18 4.74 18.82 7.16 20.43C9.91 22.27 14.42 22.27 17.17 20.43C19.59 18.81 19.59 16.17 17.17 14.56C14.43 12.73 9.92 12.73 7.16 14.56Z"/>
    </svg>
  ),
};

const NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "sets", label: "Problems" },
  { id: "contests", label: "Contests" },
  { id: "profile", label: "Profile" },
];

const SidebarMarks: Record<TabId, (active: boolean) => React.ReactElement> = {
  home: (a) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? "2" : "1.7"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H4a1 1 0 0 1-1-1z" fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.12 : 0} />
      <path d="M3 11.5L12 4l9 7.5" />
    </svg>
  ),
  sets: (a) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? "2" : "1.7"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="3.5" rx="1.5" fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.15 : 0} />
      <rect x="3.5" y="10.5" width="17" height="3.5" rx="1.5" fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.15 : 0} />
      <rect x="3.5" y="16.5" width="11" height="3" rx="1.5" fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.15 : 0} />
    </svg>
  ),
  contests: (a) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? "2" : "1.7"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v4.5a4 4 0 0 1-8 0z" fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.14 : 0} />
      <path d="M8 5.5H5.5a1.5 1.5 0 0 0 1.5 3M16 5.5h2.5a1.5 1.5 0 0 1-1.5 3" />
      <path d="M12 12.5V16M8.5 19.5h7" />
    </svg>
  ),
  profile: (a) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? "2" : "1.7"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.14 : 0} />
      <path d="M4 21c1-4 4.5-7 8-7s7 3 8 7" />
    </svg>
  ),
};

export function SidebarNav({ tab, onChange }: { tab: string; onChange: (t: TabId) => void }) {
  return (
    <nav className="sidebar-items">
      {NAV_ITEMS.map(it => {
        const active = tab === it.id;
        return (
          <button key={it.id} className={`sidebar-btn${active ? " active" : ""}`} onClick={() => onChange(it.id)} aria-label={it.label}>
            {SidebarMarks[it.id](active)}
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function TopNav({ tab, onChange }: { tab: string; onChange: (t: TabId) => void }) {
  return (
    <nav className="dt-nav">
      {NAV_ITEMS.filter(it => it.id !== "profile").map(it => {
        const active = tab === it.id;
        return (
          <button key={it.id} className={`dt-nav-btn${active ? " active" : ""}`} onClick={() => onChange(it.id)}>
            {SidebarMarks[it.id](active)}
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

export function BottomNav({ tab, onChange }: { tab: string; onChange: (t: TabId) => void }) {
  const idx = NAV_ITEMS.findIndex(it => it.id === tab);
  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        <span className="nav-indicator" style={{ "--nav-idx": idx } as React.CSSProperties} />
        {NAV_ITEMS.map(it => {
          const active = tab === it.id;
          const Mark = NavMarks[it.id];
          return (
            <button key={it.id} className={`nav-btn${active ? " active" : ""}`} onClick={() => onChange(it.id)} aria-label={it.label}>
              <Mark />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Badge tiles ────────────────────────────────────────────────────────────
const BadgeIcons: Record<string, () => React.ReactElement> = {
  streak: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M12 2c1 2 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4-.5 2 1 4 2 4 0-2 0-5 0-8z" fill="currentColor" fillOpacity="0.22" />
      <path d="M12 2c1 2 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4-.5 2 1 4 2 4 0-2 0-5 0-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="2" fill="currentColor" />
    </svg>
  ),
  speed: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M13 3L4 14h6l-1 7 9-12h-6z" fill="currentColor" fillOpacity="0.2" />
      <path d="M13 3L4 14h6l-1 7 9-12h-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  flask: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M9 3v6l-4 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-9V3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6.5 15.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 3h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  target: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    </svg>
  ),
  trophy: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M8 4h8v4.5a4 4 0 0 1-8 0z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
      <path d="M8 5.5H5.5a1.5 1.5 0 0 0 1.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5.5h2.5a1.5 1.5 0 0 1-1.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 12.5V16M9 19.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  diamond: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M12 3l8 7-8 11-8-11z" fill="currentColor" fillOpacity="0.18" />
      <path d="M12 3l8 7-8 11-8-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 10h16M9 10l3 11M15 10l-3 11" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  book: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M4 5a2 2 0 0 1 2-2h12v17H6a2 2 0 0 0-2 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="currentColor" fillOpacity="0.16" />
      <path d="M8 8h7M8 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  rocket: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M14 3c4 0 7 3 7 7l-7 7-3-3 7-7c-1 0-3-1-3-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="currentColor" fillOpacity="0.16" />
      <path d="M11 14l-3-3-4 2 1 4 4 1 2-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    </svg>
  ),
};

export function BadgeTile({ badge, earned }: { badge: { type: string; label: string; color?: string }; earned: boolean }) {
  const BIcon = BadgeIcons[badge.type] || BadgeIcons.target;
  const accent = badge.color || "var(--accent)";
  return (
    <div style={{ padding: 12, textAlign: "center", opacity: earned ? 1 : 0.35, background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 16, boxShadow: earned ? "var(--shadow-sm)" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: earned ? `color-mix(in srgb, ${accent} 14%, transparent)` : "var(--bg-2)", color: earned ? accent : "var(--fg-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: earned ? `1px solid color-mix(in srgb, ${accent} 30%, transparent)` : "1px solid var(--line-1)" }}>
        <BIcon />
      </div>
      <div style={{ fontSize: 10, color: "var(--fg-2)", lineHeight: 1.2, fontWeight: 500 }}>{badge.label}</div>
    </div>
  );
}

// ── Figure slot ────────────────────────────────────────────────────────────
export function FigureSlot({ label = "Figure", caption }: { label?: string; caption?: string }) {
  return (
    <div className="figure-slot">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="1.6" />
        <path d="M21 16l-5-5-9 9" />
      </svg>
      <div className="figure-slot-label">{label}</div>
      {caption && <div className="figure-slot-caption">{caption}</div>}
    </div>
  );
}

export function isEquation(s: string) {
  return /=|∫|∑|²|³|→|⇒|±|≤|≥|≠|√|π|θ|α|β|γ|δ|ω/.test(s);
}

type MathSegment = { kind: "math"; src: string; display: boolean } | { kind: "text"; src: string };

// Parse text into alternating text/math segments. Handles unclosed $ at end.
function parseSegments(text: string): MathSegment[] {
  const segs: MathSegment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$((?:[^$]|\\.)+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ kind: "text", src: text.slice(last, m.index) });
    const display = m[0].startsWith("$$");
    segs.push({ kind: "math", src: display ? m[1] : m[2], display });
    last = m.index + m[0].length;
  }
  const tail = text.slice(last);
  if (tail) {
    // Try to render a trailing unclosed $...
    const unclosed = tail.match(/^([\s\S]*?)\$([\s\S]+)$/);
    if (unclosed) {
      if (unclosed[1]) segs.push({ kind: "text", src: unclosed[1] });
      segs.push({ kind: "math", src: unclosed[2], display: false });
    } else {
      segs.push({ kind: "text", src: tail });
    }
  }
  // Downgrade $$...$$ to inline when it sits mid-sentence (non-whitespace text on either side)
  return segs.map((seg, i) => {
    if (seg.kind !== "math" || !seg.display) return seg;
    const prev = segs[i - 1];
    const next = segs[i + 1];
    const hasPrevText = prev?.kind === "text" && /\S/.test(prev.src);
    const hasNextText = next?.kind === "text" && /\S/.test(next.src);
    if (hasPrevText || hasNextText) return { ...seg, display: false };
    return seg;
  });
}

function renderMathSeg(seg: MathSegment, key: number): React.ReactNode {
  if (seg.kind === "text") return <React.Fragment key={key}>{seg.src}</React.Fragment>;
  try {
    const html = katex.renderToString(seg.src, { displayMode: seg.display, throwOnError: false, strict: false });
    return (
      <span key={key}
        style={seg.display ? { display: "block", overflowX: "auto", margin: "10px 0", textAlign: "center" } : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <React.Fragment key={key}>{seg.display ? `$$${seg.src}$$` : `$${seg.src}$`}</React.Fragment>;
  }
}

// For prose mode: split a plain-text segment into sub-lines at logical sentence boundaries.
// ONLY applied to text segments — never touches math content.
function splitProseText(src: string): string[] {
  return src
    .replace(/\. +(For |Comparing |Substituting |Therefore,?|Hence,?|Now,|From |Using |Let |Since |So,|Thus,)/g, ".\n$1")
    .replace(/\. +(\([ivxIVX]+\))/g, ".\n$1")
    .split("\n")
    .filter(l => l.trim().length > 0);
}

export const MathText = memo(function MathText({
  text, style, className, prose,
}: {
  text: string; style?: React.CSSProperties; className?: string;
  prose?: boolean;
}) {
  const segs = parseSegments(text);

  if (!prose) {
    return (
      <span style={style} className={className}>
        {segs.map((s, i) => renderMathSeg(s, i))}
      </span>
    );
  }

  // Prose mode: split text segments into paragraphs, keep math segments inline/block
  const blocks: React.ReactNode[] = [];
  let key = 0;
  for (const seg of segs) {
    if (seg.kind === "math") {
      blocks.push(renderMathSeg(seg, key++));
    } else {
      const lines = splitProseText(seg.src);
      for (const line of lines) {
        blocks.push(
          <span key={key++} style={{ display: "block", marginBottom: "0.5em" }}>{line}</span>
        );
      }
    }
  }

  return (
    <span style={{ display: "block", ...style }} className={className}>
      {blocks}
    </span>
  );
});

export { Icons };
export type { TabId };
export { NAV_ITEMS };
