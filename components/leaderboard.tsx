"use client";
import React, { useState, useEffect } from "react";
import { AppBar, Avatar, Icons } from "./shared";

interface LeaderItem {
  id: string; name: string; handle: string; city: string;
  rating: number; rankAllIndia: number | null; totalSolved: number; streakCurrent: number;
}

interface LeaderboardProps {
  isGuest: boolean;
}

export default function Leaderboard({ isGuest }: LeaderboardProps) {
  const [scope, setScope] = useState("india");
  const [period, setPeriod] = useState("week");
  const [leaders, setLeaders] = useState<LeaderItem[]>([]);

  useEffect(() => {
    fetch("/api/users/leaderboard?limit=50")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setLeaders(json.data); })
      .catch(() => null);
  }, []);

  const podium = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const scopeOptions = [
    { id: "india", label: "All India", icon: <Icons.Globe size={13} /> },
    { id: "city", label: "City", icon: <Icons.Pin size={13} /> },
    { id: "school", label: "My School", icon: <Icons.Book size={13} /> },
    { id: "friends", label: "Friends", icon: <Icons.Users size={13} /> },
  ];

  return (
    <div className="screen">
      <AppBar display eyebrow="Leaderboard" title={<>Where you <em>stand.</em></>} />

      <div className="screen-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", margin: "0 -20px", padding: "0 20px" }}>
          {scopeOptions.map(s => {
            const active = scope === s.id;
            return (
              <button key={s.id} onClick={() => setScope(s.id)} className="chip"
                style={{ borderColor: active ? "var(--accent)" : "var(--line-2)", background: active ? "var(--accent-soft)" : "var(--bg-2)", color: active ? "var(--accent)" : "var(--fg-1)", fontSize: 12, padding: "8px 12px", cursor: "pointer", gap: 6, display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0 }}>
                {s.icon}
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="tabs">
          {[{ id: "week", label: "This week" }, { id: "month", label: "This month" }, { id: "all", label: "All time" }].map(p => (
            <button key={p.id} className={`tab${period === p.id ? " active" : ""}`} onClick={() => setPeriod(p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        {podium.length >= 3 && <Podium podium={podium} />}

        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 4px", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>Top {leaders.length}</span>
          </div>
          <div className="card row-divider" style={{ padding: 0 }}>
            {rest.map((p, i) => <LeaderRow key={p.id} p={p} rank={i + 4} />)}
            {leaders.length === 0 && (
              <div style={{ padding: 30, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                Leaderboard loading…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Podium({ podium }: { podium: LeaderItem[] }) {
  const order = [podium[1], podium[0], podium[2]];
  const heights = [88, 110, 70];
  const colors = ["#C0C0C0", "var(--accent)", "#CD7F32"];
  const labels = ["2", "1", "3"];

  return (
    <div className="card card-elev" style={{ padding: "20px 16px 16px", background: "linear-gradient(180deg, var(--bg-2), var(--bg-1))", position: "relative", overflow: "hidden" }}>
      <div className="glow-accent" style={{ position: "absolute", inset: 0, opacity: 0.3, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, position: "relative" }}>
        {order.map((p, i) => p && (
          <div key={p.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, maxWidth: 110 }}>
            <Avatar name={p.name} size={i === 1 ? 56 : 46} />
            <div style={{ textAlign: "center", width: "100%" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                {p.name.split(" ")[0]}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{p.rating}</div>
            </div>
            <div style={{ width: "100%", height: heights[i], borderRadius: "10px 10px 0 0", background: `linear-gradient(180deg, ${colors[i]}40, ${colors[i]}10)`, border: `1px solid ${colors[i]}50`, borderBottom: "none", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 10, position: "relative" }}>
              <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: colors[i] }}>{labels[i]}</div>
              {i === 1 && (
                <div style={{ position: "absolute", top: -26, color: "var(--accent)" }}>
                  <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor">
                    <path d="M2 17h24l-2-13-6 6-4-8-4 8-6-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fillOpacity="0.85" />
                    <circle cx="2" cy="4" r="1.6" />
                    <circle cx="14" cy="2" r="1.6" />
                    <circle cx="26" cy="4" r="1.6" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderRow({ p, rank }: { p: LeaderItem; rank: number }) {
  return (
    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 32, textAlign: "center", fontFamily: "var(--mono)", fontSize: 13, color: "var(--fg-2)", flexShrink: 0 }}>
        {rank}
      </div>
      <Avatar name={p.name} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}>{p.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
          {p.city && <span>{p.city}</span>}
          {p.streakCurrent > 100 && (
            <><span>·</span><span style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 2 }}><Icons.Flame size={10} /> {p.streakCurrent}</span></>
          )}
        </div>
      </div>
      <span className="mono" style={{ fontSize: 12.5, color: "var(--fg-0)", fontWeight: 600 }}>{p.rating}</span>
    </div>
  );
}
