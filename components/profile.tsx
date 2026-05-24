"use client";
import React, { useState, useEffect } from "react";
import { AreaChart, Area, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { SUBJECTS } from "@/lib/data";
import { AppBar, Avatar, YearHeatmap, BadgeTile, Icons } from "./shared";
import type { User } from "@/lib/data";
import { supabase } from "@/lib/supabase";

const EXAM_NAMES: Record<string, string> = { mains: "JEE Mains", adv: "JEE Advanced" };
const LEVEL_NAMES: Record<string, string> = { "11": "Class XI", "12": "Class XII", "drop": "Dropper" };

interface LeaderItem {
  id: string; name: string; handle: string; city: string;
  rating: number; rankAllIndia: number | null; totalSolved: number; streakCurrent: number;
}

interface ProfileProps {
  user: User | null;
  onSignOut: () => void;
  isDesktop?: boolean;
  onProfileUpdated?: (data: Record<string, unknown>) => void;
}

function activityToHeatmap(activities: { activityDate: string; questionsSolved: number }[]): number[] {
  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const days = Math.ceil((new Date(year, 11, 31).getTime() - startDate.getTime()) / 86400000) + 1;
  const result = new Array(days).fill(0);
  for (const a of activities) {
    const d = new Date(a.activityDate);
    if (d.getFullYear() !== year) continue;
    const idx = Math.floor((d.getTime() - startDate.getTime()) / 86400000);
    if (idx >= 0 && idx < days) result[idx] = Math.min(4, a.questionsSolved > 0 ? Math.ceil(a.questionsSolved / 3) + 1 : 0);
  }
  return result;
}

export default function Profile({ user, onSignOut, isDesktop, onProfileUpdated }: ProfileProps) {
  const [section, setSection] = useState<"stats" | "ranks">("stats");
  const [scope, setScope] = useState("india");
  const [period, setPeriod] = useState("week");
  const [leaders, setLeaders] = useState<LeaderItem[]>([]);
  const [activityData, setActivityData] = useState<number[]>([]);
  const [ratingHistory, setRatingHistory] = useState<number[]>([]);

  const me = user || {
    name: "User", handle: "", city: "", joined: "", target: "",
    rating: 1200, rank: "—" as unknown as number, delta: "+0",
    solved: 0, correct: 0, total: 30000, streak: 0, streakMax: 0,
    todayMinutes: 0, weeklyGoal: 840, weeklyDone: 0,
    badges: [] as string[], mastery: [], recent: [],
    examType: null, currentLevel: null, targetYear: null, dailyGoalMinutes: 120,
  };

  useEffect(() => {
    fetch("/api/users/leaderboard?limit=12")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setLeaders(json.data); })
      .catch(() => null);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const token = session.access_token;
      fetch("/api/me/activity?days=365", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(json => { if (json?.data) setActivityData(activityToHeatmap(json.data)); })
        .catch(() => null);
    });
  }, []);

  // Build rating chart from ratingHistory in profileData (passed via user.badges hack)
  // For now use empty until the profile API includes history
  const statsSparkData = ratingHistory.length > 0 ? ratingHistory : [];

  const overallPct = me.total > 0 ? Math.round((me.solved / me.total) * 100) : 0;
  const myLeaderRow = { rank: typeof me.rank === "number" ? me.rank : 0, name: me.name, rating: String(me.rating), change: 0, streak: me.streak };
  const podium = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const scopeOptions = [
    { id: "india", label: "All India", icon: <Icons.Globe size={13} /> },
    { id: "city", label: me.city || "City", icon: <Icons.Pin size={13} /> },
    { id: "school", label: "My School", icon: <Icons.Book size={13} /> },
    { id: "friends", label: "Friends", icon: <Icons.Users size={13} /> },
  ];

  const statsContent = (
    <>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <SolvedDonut me={me} pct={overallPct} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {me.mastery.length > 0 ? me.mastery.map(m => {
              const subj = SUBJECTS[m.subject];
              return (
                <div key={m.subject} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="dot" style={{ background: subj.color, width: 8, height: 8 }} />
                  <span style={{ fontSize: 12, color: "var(--fg-1)", flex: 1 }}>{subj.short}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-2)" }}>{m.solved}</span>
                </div>
              );
            }) : (
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Solve problems to see subject breakdown</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6, borderTop: "1px solid var(--line-1)" }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)", flex: 1, fontFamily: "var(--mono)" }}>CORRECT</span>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--easy)", fontWeight: 600 }}>{me.correct ?? 0}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)", flex: 1, fontFamily: "var(--mono)" }}>ATTEMPTED</span>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-0)", fontWeight: 600 }}>{me.solved}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className="eyebrow">Rating</span>
              <RatingInfoButton />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="serif" style={{ fontSize: 26, lineHeight: 1 }}>{me.rating}</span>
              {me.delta && (
                <span style={{ fontSize: 12, color: me.delta?.startsWith("-") ? "var(--hard)" : "var(--easy)", display: "inline-flex", alignItems: "center", gap: 2 }}>
                  {me.delta?.startsWith("-") ? <Icons.ArrowDown size={10} /> : <Icons.ArrowUp size={10} />} {me.delta}
                </span>
              )}
            </div>
          </div>
        </div>
        {statsSparkData.length > 0 && <RatingChart data={statsSparkData} />}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <YearHeatmap data={activityData} />
      </div>

      {me.badges.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Achievements</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{me.badges.length} earned</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${isDesktop ? 6 : 4}, 1fr)`, gap: 10 }}>
            {me.badges.map((b, i) => <BadgeTile key={i} badge={{ type: b, label: b }} earned />)}
          </div>
        </div>
      )}

      {me.recent.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Recent submissions</span>
            <button style={{ fontSize: 12, color: "var(--fg-2)" }}>View all</button>
          </div>
          <div className="card row-divider" style={{ padding: 0 }}>
            {me.recent.map((r, i) => (
              <div key={i} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: r.verdict === "AC" ? "color-mix(in srgb, var(--easy) 18%, transparent)" : "color-mix(in srgb, var(--hard) 14%, transparent)", color: r.verdict === "AC" ? "var(--easy)" : "var(--hard)", border: r.verdict === "AC" ? "1px solid color-mix(in srgb, var(--easy) 35%, transparent)" : "1px solid color-mix(in srgb, var(--hard) 30%, transparent)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700 }}>
                  {r.verdict}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.id}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{r.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const ranksContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", margin: isDesktop ? "0" : "0 -20px", padding: isDesktop ? "0" : "0 20px" }}>
        {scopeOptions.map(s => {
          const active = scope === s.id;
          return (
            <button key={s.id} onClick={() => setScope(s.id)} className="chip"
              style={{ borderColor: active ? "var(--accent)" : "var(--line-2)", background: active ? "var(--accent-soft)" : "var(--bg-2)", color: active ? "var(--accent)" : "var(--fg-1)", fontSize: 12, padding: "8px 12px", cursor: "pointer", gap: 6, display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0 }}>
              {s.icon}{s.label}
            </button>
          );
        })}
      </div>

      <div className="tabs">
        {[{ id: "week", label: "This week" }, { id: "month", label: "This month" }, { id: "all", label: "All time" }].map(p => (
          <button key={p.id} className={`tab${period === p.id ? " active" : ""}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
        ))}
      </div>

      {podium.length >= 3 && <Podium podium={podium} isDesktop={isDesktop} />}
      {myLeaderRow.rank > 0 && <YourRankCard me={myLeaderRow} />}

      {rest.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Top performers</span>
          </div>
          {isDesktop ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 80px 60px", padding: "8px 16px", borderBottom: "1px solid var(--line-1)" }}>
                {["#", "Student", "City", "Rating", "Solved"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--fg-3)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>{h}</span>
                ))}
              </div>
              <div className="row-divider">
                {rest.map(p => <LeaderRowDesktop key={p.id} p={p} idx={leaders.indexOf(p)} />)}
              </div>
            </div>
          ) : (
            <div className="card row-divider" style={{ padding: 0 }}>
              {rest.map(p => <LeaderRow key={p.id} p={p} idx={leaders.indexOf(p)} />)}
            </div>
          )}
        </div>
      )}

      {leaders.length === 0 && (
        <div style={{ padding: 30, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
          Leaderboard is being populated…
        </div>
      )}
    </div>
  );

  // ── Mobile ─────────────────────────────────────────────────────────────────
  if (!isDesktop) {
    return (
      <div className="screen">
        <AppBar display eyebrow={me.handle} title={me.name}
          right={<button className="btn btn-ghost" style={{ padding: 10, borderRadius: 999 }}><Icons.Settings size={20} /></button>}
        />
        <div className="screen-pad" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <MobileProfileHeader me={me} />
          {me.examType && <PlanCard me={me} onUpdated={onProfileUpdated} />}

          <div className="tabs">
            <button className={`tab${section === "stats" ? " active" : ""}`} onClick={() => setSection("stats")}>Stats</button>
            <button className={`tab${section === "ranks" ? " active" : ""}`} onClick={() => setSection("ranks")} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icons.Medal size={13} /> Ranks
            </button>
          </div>

          {section === "stats" ? statsContent : ranksContent}
          <AccountCard me={me} onSignOut={onSignOut} />
        </div>
      </div>
    );
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  return (
    <div className="dt-container" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <MobileProfileHeader me={me} />
        {me.examType && <PlanCard me={me} onUpdated={onProfileUpdated} />}

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <SolvedDonut me={me} pct={overallPct} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {me.mastery.length > 0 ? me.mastery.map(m => {
                const subj = SUBJECTS[m.subject];
                return (
                  <div key={m.subject} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="dot" style={{ background: subj.color, width: 8, height: 8 }} />
                    <span style={{ fontSize: 12, color: "var(--fg-1)", flex: 1 }}>{subj.short}</span>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-2)" }}>{m.solved}</span>
                  </div>
                );
              }) : (
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Solve problems to see subject breakdown</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6, borderTop: "1px solid var(--line-1)" }}>
                <span style={{ fontSize: 11, color: "var(--fg-3)", flex: 1, fontFamily: "var(--mono)" }}>CORRECT</span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--easy)", fontWeight: 600 }}>{me.correct ?? 0}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "var(--fg-3)", flex: 1, fontFamily: "var(--mono)" }}>ATTEMPTED</span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-0)", fontWeight: 600 }}>{me.solved}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span className="eyebrow">Rating</span>
                <RatingInfoButton />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="serif" style={{ fontSize: 26, lineHeight: 1 }}>{me.rating}</span>
                {me.delta && (
                  <span style={{ fontSize: 12, color: me.delta?.startsWith("-") ? "var(--hard)" : "var(--easy)", display: "inline-flex", alignItems: "center", gap: 2 }}>
                    {me.delta?.startsWith("-") ? <Icons.ArrowDown size={10} /> : <Icons.ArrowUp size={10} />} {me.delta}
                  </span>
                )}
              </div>
            </div>
          </div>
          {statsSparkData.length > 0 && <RatingChart data={statsSparkData} />}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <YearHeatmap data={activityData} />
        </div>

        {typeof me.rank === "number" && me.rank > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Your rank</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>All India</span>
            </div>
            <RankSnapshot me={me} />
          </div>
        )}

        {me.badges.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Achievements</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{me.badges.length} earned</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {me.badges.map((b, i) => <BadgeTile key={i} badge={{ type: b, label: b }} earned />)}
            </div>
          </div>
        )}

        <AccountCard me={me} onSignOut={onSignOut} />
      </div>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────

function MobileProfileHeader({ me }: { me: User }) {
  return (
    <div className="card card-elev" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, var(--accent-soft), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative" }}>
        <Avatar name={me.name} size={64} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, whiteSpace: "nowrap" }}>
            {me.city && <span style={{ fontSize: 11, color: "var(--fg-3)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icons.Pin size={10} /> {me.city}</span>}
            {me.city && me.joined && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>·</span>}
            {me.joined && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Joined {me.joined}</span>}
          </div>
          {me.target && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 999, fontSize: 10.5, color: "var(--accent)", fontWeight: 600, fontFamily: "var(--mono)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              <Icons.Target size={10} /> {me.target}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", paddingTop: 16, borderTop: "1px solid var(--line-1)" }}>
        <MobileStat label="Rating" value={String(me.rating)} delta={me.delta} />
        <MobileStat label="AIR" value={typeof me.rank === "number" ? `#${me.rank.toLocaleString("en-IN")}` : "—"} />
        <MobileStat label="Streak" value={String(me.streak)} delta={`max ${me.streakMax}d`} accent isLast />
      </div>
    </div>
  );
}

function MobileStat({ label, value, delta, accent, isLast }: { label: string; value: string; delta?: string; accent?: boolean; isLast?: boolean }) {
  return (
    <div style={{ textAlign: "center", borderRight: isLast ? "none" : "1px solid var(--line-1)" }}>
      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>{label}</div>
      <div className="serif" style={{ fontSize: 22, lineHeight: 1, color: accent ? "var(--accent)" : "var(--fg-0)" }}>{value}</div>
      {delta && <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 4 }}>{delta}</div>}
    </div>
  );
}

function PlanCard({ me, onUpdated }: { me: User; onUpdated?: (data: Record<string, unknown>) => void }) {
  const [editing, setEditing] = useState(false);
  const [exam, setExam] = useState(me.examType || "mains");
  const [targetYear, setTargetYear] = useState(me.targetYear || 2027);
  const [currentLevel, setCurrentLevel] = useState(me.currentLevel || "12");
  const [dailyMinutes, setDailyMinutes] = useState(me.dailyGoalMinutes || 120);
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    setExam(me.examType || "mains");
    setTargetYear(me.targetYear || 2027);
    setCurrentLevel(me.currentLevel || "12");
    setDailyMinutes(me.dailyGoalMinutes || 120);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          examType: exam,
          targetYear,
          currentLevel,
          dailyGoalMinutes: dailyMinutes,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.data) {
        onUpdated?.(json.data);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="card" style={{ padding: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Edit your plan</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 11.5, color: "var(--fg-2)" }}>
            Exam
            <select value={exam} onChange={e => setExam(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-1)", fontSize: 13 }}>
              <option value="mains">JEE Mains</option>
              <option value="adv">JEE Advanced</option>
            </select>
          </label>
          <label style={{ fontSize: 11.5, color: "var(--fg-2)" }}>
            Target year
            <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-1)", fontSize: 13 }}>
              {[2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11.5, color: "var(--fg-2)" }}>
            Level
            <select value={currentLevel} onChange={e => setCurrentLevel(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-1)", fontSize: 13 }}>
              <option value="11">Class XI</option>
              <option value="12">Class XII</option>
              <option value="drop">Dropper</option>
            </select>
          </label>
          <label style={{ fontSize: 11.5, color: "var(--fg-2)" }}>
            Daily goal ({dailyMinutes} min)
            <input type="range" min={30} max={240} step={15} value={dailyMinutes} onChange={e => setDailyMinutes(Number(e.target.value))} style={{ display: "block", width: "100%", marginTop: 8, accentColor: "var(--accent)" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" className="btn" style={{ border: "1px solid var(--line-2)" }} disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icons.Target size={13} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Your plan</span>
        </div>
        <button type="button" onClick={openEdit} style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Edit</button>
      </div>
      <div style={{ padding: "4px 14px 12px" }}>
        <PlanLine k="Exam" v={EXAM_NAMES[me.examType || ""] || "—"} />
        <PlanLine k="Target year" v={String(me.targetYear || "—")} />
        <PlanLine k="Level" v={LEVEL_NAMES[me.currentLevel || ""] || "—"} />
        <PlanLine k="Daily goal" v={`${me.dailyGoalMinutes || 120} min`} last />
      </div>
    </div>
  );
}

function PlanLine({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: last ? "none" : "1px solid var(--line-1)" }}>
      <span style={{ fontSize: 11.5, color: "var(--fg-2)" }}>{k}</span>
      <span style={{ fontSize: 12, color: "var(--fg-0)", fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function AccountCard({ me, onSignOut }: { me: User; onSignOut: () => void }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-1)" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Account</span>
      </div>
      <div className="row-divider">
        <AccountRow icon={<Icons.User size={14} />} k="Username" v={me.handle} />
        {me.email && <AccountRow icon={<Icons.Send size={14} />} k="Email" v={me.email} />}
        {me.city && <AccountRow icon={<Icons.Pin size={14} />} k="City" v={me.city} />}
        {me.joined && <AccountRow icon={<Icons.Calendar size={14} />} k="Joined" v={me.joined} />}
        <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", width: "100%", textAlign: "left", color: "var(--hard)", fontSize: 12.5, fontWeight: 500 }}>
          <Icons.ArrowLeft size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

function AccountRow({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
      <span style={{ color: "var(--fg-3)", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: "var(--fg-2)", flex: 1 }}>{k}</span>
      <span style={{ fontSize: 12.5, color: "var(--fg-0)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{v}</span>
    </div>
  );
}

// ── Leaderboard sub-components ─────────────────────────────────────────────

function Podium({ podium, isDesktop }: { podium: LeaderItem[]; isDesktop?: boolean }) {
  const order = [podium[1], podium[0], podium[2]];
  const heights = isDesktop ? [110, 138, 88] : [88, 110, 70];
  const avatarSizes = isDesktop ? [62, 78, 52] : [46, 58, 40];
  const colors = ["#7B92A8", "#E8841C", "#B07040"];
  const bgColors = ["rgba(123,146,168,0.18)", "rgba(232,132,28,0.18)", "rgba(176,112,64,0.18)"];
  const borderColors = ["rgba(123,146,168,0.45)", "rgba(232,132,28,0.45)", "rgba(176,112,64,0.45)"];
  const labels = ["2", "1", "3"];

  return (
    <div className="card card-elev" style={{ padding: isDesktop ? "28px 24px 20px" : "20px 16px 16px", background: "linear-gradient(180deg, var(--bg-2), var(--bg-1))", position: "relative", overflow: "hidden" }}>
      <div className="glow-accent" style={{ position: "absolute", inset: 0, opacity: 0.25, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: isDesktop ? 16 : 10, position: "relative" }}>
        {order.map((p, i) => p && (
          <div key={p.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: isDesktop ? 10 : 8, maxWidth: isDesktop ? 160 : 110 }}>
            <div style={{ position: "relative" }}>
              {i === 1 && (
                <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `2.5px solid ${colors[i]}`, opacity: 0.7 }} />
              )}
              <Avatar name={p.name} size={avatarSizes[i]} />
            </div>
            <div style={{ textAlign: "center", width: "100%" }}>
              <div style={{ fontSize: isDesktop ? 13.5 : 12, fontWeight: 600, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                {p.name.split(" ")[0]}
              </div>
              <div className="mono" style={{ fontSize: isDesktop ? 11.5 : 10.5, color: "var(--fg-3)" }}>{p.rating}</div>
            </div>
            <div style={{ width: "100%", height: heights[i], borderRadius: "10px 10px 0 0", background: `linear-gradient(180deg, ${bgColors[i]}, transparent)`, border: `1.5px solid ${borderColors[i]}`, borderBottom: "none", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 12, position: "relative" }}>
              <div className="serif" style={{ fontSize: isDesktop ? 32 : 28, lineHeight: 1, color: colors[i] }}>{labels[i]}</div>
              {i === 1 && (
                <div style={{ position: "absolute", top: isDesktop ? -32 : -26, color: colors[1] }}>
                  <svg width={isDesktop ? 34 : 28} height={isDesktop ? 24 : 20} viewBox="0 0 28 20" fill="currentColor">
                    <path d="M2 17h24l-2-13-6 6-4-8-4 8-6-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fillOpacity="0.85" />
                    <circle cx="2" cy="4" r="1.6" /><circle cx="14" cy="2" r="1.6" /><circle cx="26" cy="4" r="1.6" />
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

function YourRankCard({ me }: { me: { rank: number; name: string; rating: string; change: number; streak: number } }) {
  return (
    <div style={{ padding: 14, borderRadius: 16, border: "1px solid var(--accent)", background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--bg-1)), var(--bg-1))", display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
      <div style={{ position: "absolute", top: 10, right: 12, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--mono)", color: "var(--accent)" }}>YOU</div>
      <div className="serif" style={{ fontSize: 26, color: "var(--accent)", lineHeight: 1, minWidth: 56, textAlign: "center" }}>#{me.rank.toLocaleString("en-IN")}</div>
      <Avatar name={me.name} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-3)" }}>
          <span className="mono">{me.rating}</span>
          {me.streak > 0 && (
            <><span>·</span><span style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 2 }}><Icons.Flame size={11} /> {me.streak}d</span></>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaderRow({ p, idx }: { p: LeaderItem; idx: number }) {
  return (
    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 32, textAlign: "center", fontFamily: "var(--mono)", fontSize: 13, color: "var(--fg-2)", flexShrink: 0 }}>{idx + 1}</div>
      <Avatar name={p.name} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}>{p.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-3)" }}>
          {p.city && <span>{p.city}</span>}
          {p.streakCurrent > 100 && (<><span>·</span><span style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 2 }}><Icons.Flame size={10} /> {p.streakCurrent}</span></>)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span className="mono" style={{ fontSize: 12.5, color: "var(--fg-0)", fontWeight: 600 }}>{p.rating}</span>
      </div>
    </div>
  );
}

function LeaderRowDesktop({ p, idx }: { p: LeaderItem; idx: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 80px 60px", padding: "11px 16px", alignItems: "center" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--fg-2)" }}>{idx + 1}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Avatar name={p.name} size={30} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
          {p.streakCurrent > 100 && <div style={{ fontSize: 10.5, color: "var(--accent)", display: "flex", alignItems: "center", gap: 2 }}><Icons.Flame size={9} /> {p.streakCurrent}d streak</div>}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{p.city}</div>
      <div className="mono" style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 600 }}>{p.rating}</div>
      <div className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>{p.totalSolved}</div>
    </div>
  );
}

function RankSnapshot({ me }: { me: User }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px", background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%)", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>All India Rank</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="serif" style={{ fontSize: 36, lineHeight: 1, color: "var(--accent)" }}>
              #{typeof me.rank === "number" ? me.rank.toLocaleString("en-IN") : me.rank}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SolvedDonut({ me, pct: _ }: { me: User; pct: number }) {
  const size = 96, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const totalSolved = me.mastery.reduce((s, m) => s + m.solved, 0) || me.solved;
  let cumPct = 0;
  const segments = me.mastery.length > 0 ? me.mastery : [];
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={stroke} />
        {segments.map(m => {
          const subj = SUBJECTS[m.subject];
          const portion = totalSolved > 0 ? m.solved / totalSolved : 0;
          const dash = c * portion, offset = c * (cumPct / 100);
          cumPct += portion * 100;
          return <circle key={m.subject} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={subj.color} strokeWidth={stroke} strokeLinecap="butt" strokeDasharray={`${dash} ${c}`} strokeDashoffset={-offset} />;
        })}
        {segments.length === 0 && totalSolved > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="butt" strokeDasharray={`${c} 0`} />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div className="serif" style={{ fontSize: 22, lineHeight: 1.1, textAlign: "center" }}>
          <span style={{ color: "var(--easy)" }}>{me.correct ?? 0}</span>
          <span style={{ fontSize: 14, color: "var(--fg-3)", margin: "0 2px" }}>/</span>
          <span>{me.solved}</span>
        </div>
        <div className="mono" style={{ fontSize: 8.5, color: "var(--fg-3)", marginTop: 4, textAlign: "center", lineHeight: 1.2 }}>correct / attempted</div>
      </div>
    </div>
  );
}

function RatingChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const peakIdx = data.indexOf(max);
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{ background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 8, fontSize: 12, padding: "4px 10px" }}
          itemStyle={{ color: "var(--fg-1)" }}
          formatter={(v) => [v, "Rating"]}
          labelFormatter={() => ""}
        />
        <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.75} fill="url(#ratingGrad)" dot={false} activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--bg-0)", strokeWidth: 2 }} />
        <ReferenceDot x={peakIdx} y={max} r={4} fill="var(--bg-1)" stroke="var(--accent)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const RATING_FACTORS = [
  { label: "Starting rating", value: "1200", desc: "Every user begins at 1200." },
  { label: "Floor", value: "800", desc: "Your rating cannot drop below 800." },
  { label: "Correctness", value: "±", desc: "Correct answers gain rating; wrong answers lose rating. The amount depends on how unexpected the result was." },
  { label: "Difficulty", value: "Easy / Hard", desc: "Easy: smaller swing. Medium: moderate. Hard: biggest swing. Solving a Hard question correctly is worth far more than an Easy one." },
  { label: "Speed bonus", value: "×0.7–1.3", desc: "Finishing in under half the community average time gives +30% weight. Twice as slow gives −30% weight." },
  { label: "Numerical questions", value: "×1.15", desc: "Numerical questions can't be guessed — they carry 15% extra weight, rewarding genuine mastery." },
  { label: "Hints used (correct)", value: "×0.85 / ×0.70", desc: "Used 1 hint before submitting → 15% less gain. Used 2 hints → 30% less gain. The last hint is only unlocked after you submit, so it never counts against you. Wrong answers aren't penalised further for using hints." },
  { label: "Rating decay", value: "None", desc: "Your rating doesn't decay while you're idle — but as others improve, your percentile rank will naturally shift." },
  { label: "Max gain / loss", value: "+40 / −25", desc: "A single question can change your rating by at most +40 (correct, hard, fast, no hints) or −25 (wrong, easy, slow)." },
];

function RatingInfoButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="How rating works"
        style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid var(--fg-3)", background: "transparent", color: "var(--fg-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", cursor: "pointer", lineHeight: 1, padding: 0, flexShrink: 0 }}
      >
        i
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.45)" }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 20, padding: 24, maxWidth: 420, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>How it works</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Rating system</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--fg-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, marginBottom: 18 }}>
              Your rating is an ELO-style score that measures your problem-solving ability. Each question you submit updates your rating based on several factors:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RATING_FACTORS.map(f => (
                <div key={f.label} style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: 12, display: "flex", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-0)" }}>{f.label}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--accent)", fontWeight: 600 }}>{f.value}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, padding: "12px 14px", background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--fg-1)", lineHeight: 1.6 }}>
                <strong>Formula:</strong> Rating change = K × (actual − expected), where K scales with question type and speed, and expected is derived from the gap between your rating and the question&apos;s difficulty rating (ELO 400-point scale).
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
