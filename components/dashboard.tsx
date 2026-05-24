"use client";
import React, { useEffect, useState } from "react";
import { SUBJECTS, dbQuestionToProblem } from "@/lib/data";
import { AppBar, StreakRing, SubjectIcon, DifficultyChip, YearHeatmap, Icons } from "./shared";
import type { Problem, User } from "@/lib/data";
import { buildPlayQueue, type ProblemPlayQueue } from "@/lib/playQueue";
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/auth";
import { appendListSeed } from "@/lib/sessionSeed";

interface ContestItem {
  id: string; name: string; type: string; startsAt: string; durationMin: number;
  totalQuestions: number; participantCount: number; isHot: boolean; badge: string; status: string;
}

interface DashboardProps {
  onOpenProblem: (p: Problem, queue?: ProblemPlayQueue) => void;
  onGoto: (tab: string) => void;
  user: User | null;
  isGuest: boolean;
  onSignIn: () => void;
  requireAuth: (key: string, cb?: () => void) => boolean;
  isDesktop?: boolean;
}

function formatContestTime(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDuration(min: number) {
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60 > 0 ? `${min % 60}m` : ""}`.trim() : `${min}m`;
}

function computeWeekData(activities: { activityDate: string; timeSpentSec: number }[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  for (const a of activities) map.set(new Date(a.activityDate).toISOString().slice(0, 10), a.timeSpentSec);

  const todayKey = today.toISOString().slice(0, 10);
  const todayMinutes = Math.floor((map.get(todayKey) ?? 0) / 60);

  // Mon=0 … Sun=6 for this week
  const activeDays = new Set<number>();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if ((map.get(d.toISOString().slice(0, 10)) ?? 0) > 0) activeDays.add(i);
  }
  return { todayMinutes, activeDays };
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

export default function Dashboard({ onOpenProblem, onGoto, user, isGuest, onSignIn, requireAuth, isDesktop }: DashboardProps) {
  const [pod, setPod] = useState<Problem | null>(null);
  const [recentProblems, setRecentProblems] = useState<Problem[]>([]);
  const [nextContest, setNextContest] = useState<ContestItem | null>(null);
  const [activityData, setActivityData] = useState<number[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [activeDays, setActiveDays] = useState(new Set<number>());

  const loadDailyPick = () => {
    authFetch("/api/daily-pick")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setPod(dbQuestionToProblem(json.data)); })
      .catch(() => null);
  };

  useEffect(() => {
    loadDailyPick();

    authFetch(`/api/questions?${appendListSeed(new URLSearchParams({ limit: "3" }))}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data?.items) setRecentProblems(json.data.items.map(dbQuestionToProblem)); })
      .catch(() => null);

    fetch("/api/contests?status=upcoming&limit=1")
      .then(r => r.ok ? r.json() : null)
      .then(json => { const item = json?.data?.items?.[0]; if (item) setNextContest(item); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!isGuest) loadDailyPick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, user?.solved, user?.correct]);

  useEffect(() => {
    if (isGuest) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch(`/api/me/activity?days=365`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.data) {
            setActivityData(activityToHeatmap(json.data));
            const { todayMinutes: tm, activeDays: ad } = computeWeekData(json.data);
            setTodayMinutes(tm);
            setActiveDays(ad);
          }
        })
        .catch(() => null);
    });
  }, [isGuest]);

  const me = user || {
    name: "Guest", streak: 0, todayMinutes: 0, solved: 0, correct: 0, total: 30000,
    rating: "—" as unknown as number, rank: "—" as unknown as number,
    delta: "—", mastery: [], streakMax: 0, dailyGoalMinutes: 120,
  };
  const firstName = isGuest ? "there" : ((me.name || "").split(" ")[0] || "there");
  const h = new Date().getHours();
  const greeting = h < 5 ? "Up early" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Burning the midnight oil";

  if (isDesktop) {
    return (
      <div className="dt-container">
        {/* Hero header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 20 }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{greeting}, {firstName}</div>
            <div className="h-display" style={{ fontSize: 56, lineHeight: 1 }}>Sharpen <em>the edge.</em></div>
          </div>
        </div>

        {/* Guest banner */}
        {isGuest && (
          <button onClick={onSignIn} style={{ width: "100%", padding: "14px 20px", marginBottom: 24, background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--bg-1)) 0%, var(--bg-1) 70%)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 16, textAlign: "left", display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", flexShrink: 0 }}>
              <Icons.Sparkle size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Sign in to save your progress</div>
              <div style={{ fontSize: 12, color: "var(--fg-2)" }}>Unlock hints, climb the ranks, register for contests</div>
            </div>
            <Icons.ChevronRight size={18} style={{ color: "var(--fg-3)" }} />
          </button>
        )}

        {/* Top row: 4 stat cards */}
        <div className="dt-grid-4" style={{ marginBottom: 24 }}>
          <DtStreakCard streak={me.streak} todayMinutes={me.todayMinutes} streakMax={(me as User).streakMax || 0} />
          <DtStatCard label="Correct" value={me.correct ?? 0} sub={`/ ${me.solved} attempted`} icon={<Icons.Check size={14} />} />
          <DtStatCard label="Rating" value={me.rating} sub={isGuest ? undefined : me.delta} subColor="var(--easy)" icon={<Icons.TrendingUp size={14} />} />
          <DtStatCard label="All India Rank" value={typeof me.rank === "number" ? `#${me.rank.toLocaleString("en-IN")}` : me.rank} sub={isGuest ? undefined : undefined} icon={<Icons.Medal size={14} />} />
        </div>

        {/* Main 2-col content */}
        <div className="dt-grid-2">
          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Daily pick big card */}
            {pod && (
              <button onClick={() => requireAuth("dailyPick", () => onOpenProblem(pod))} className="card card-elev" style={dailyPickCardStyle(pod)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="dot" style={{ background: "var(--accent)" }} />
                    <span className="eyebrow" style={{ color: pod.solved ? "var(--easy)" : "var(--accent)" }}>Daily pick · today</span>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{pod.code}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
                  <SubjectIcon subject={pod.subject} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="serif" style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 6 }}>{pod.title}</div>
                    <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 12 }}>{SUBJECTS[pod.subject].name} · {pod.chapter}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <DifficultyChip d={pod.difficulty} />
                      <ProblemStatusChip p={pod} />
                      <span className="chip chip-mono">{pod.acceptance}% pass rate</span>
                      <span className="chip chip-mono">~{pod.avgTime}</span>
                      <span className="chip chip-mono" style={{ color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}>1.5× rating</span>
                    </div>
                  </div>
                  <Icons.ArrowRight size={20} style={{ color: pod.solved ? "var(--easy)" : "var(--accent)", flexShrink: 0 }} />
                </div>
              </button>
            )}

            {/* Subject mastery */}
            {me.mastery.length > 0 && (
              <div>
                <SectionHeader label="Subject mastery" action="Details" onAction={() => onGoto("profile")} />
                <div className="dt-grid-3" style={{ marginTop: 12 }}>
                  {me.mastery.map(m => {
                    const subj = SUBJECTS[m.subject];
                    return (
                      <div key={m.subject} className="card" style={{ padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                          <SubjectIcon subject={m.subject} size={32} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{subj.name}</div>
                            <div style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{m.level}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                          <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>{m.solved}/{m.total}</span>
                          <span className="serif" style={{ fontSize: 22, color: subj.color, lineHeight: 1 }}>{m.pct}<span style={{ fontSize: 12, color: "var(--fg-3)" }}>%</span></span>
                        </div>
                        <div className="progress"><div className="progress-fill" style={{ width: `${m.pct}%`, background: subj.color }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pick up where you left */}
            {recentProblems.length > 0 && (
              <div>
                <SectionHeader label="Pick up where you left" action="See all" onAction={() => onGoto("sets")} />
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {recentProblems.map(p => (
                    <button key={p.id} onClick={() => onOpenProblem(p, buildPlayQueue(recentProblems, p.id))} className="card" style={{ padding: 14, textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                      <SubjectIcon subject={p.subject} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{p.chapter}</div>
                      </div>
                      <DifficultyChip d={p.difficulty} />
                      <ProblemStatusChip p={p} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Activity heatmap */}
            <div className="card" style={{ padding: 22, width: 500, flexShrink: 0 }}>
              <YearHeatmap data={activityData} centerCurrentMonth />
            </div>

            {/* Upcoming contest */}
            {nextContest && (
              <button onClick={() => onGoto("contests")} className="card" style={{ padding: 18, textAlign: "left", width: "100%", display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {nextContest.isHot && <span className="live-dot" />}
                  <span className="eyebrow" style={{ fontSize: 10, color: nextContest.isHot ? "var(--easy)" : "var(--accent)" }}>{nextContest.isHot ? "Live tonight" : "Next contest"}</span>
                </div>
                <div className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>{nextContest.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--fg-2)", flexWrap: "wrap" }}>
                  <span><Icons.Clock size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />{formatContestTime(nextContest.startsAt)}</span>
                  <span><Icons.Users size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />{nextContest.participantCount.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>
                  View contest <Icons.ArrowRight size={12} />
                </div>
              </button>
            )}

            {/* Today's goal */}
            {!isGuest && (
              <TodayGoalCard todayMinutes={todayMinutes} goalMinutes={(me as User).dailyGoalMinutes || 120} activeDays={activeDays} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <AppBar display eyebrow={`${greeting}, ${firstName}`}
        title={<>Sharpen <em>the edge.</em></>}
        right={isGuest ? (
          <button onClick={onSignIn} className="btn" style={{ padding: "8px 14px", background: "var(--bg-1)", border: "1px solid var(--line-2)", fontSize: 12.5, fontWeight: 600 }}>Sign in</button>
        ) : (
          <button className="btn btn-ghost" style={{ padding: 10, borderRadius: 999, position: "relative" }}>
            <Icons.Bell size={20} />
            <span className="dot" style={{ background: "var(--accent)", width: 7, height: 7, position: "absolute", top: 9, right: 10, boxShadow: "0 0 0 2px var(--bg-0)" }} />
          </button>
        )}
      />

      <div className="screen-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {isGuest && (
          <button onClick={onSignIn} className="card card-elev" style={{ padding: "14px 16px", textAlign: "left", width: "100%", display: "flex", alignItems: "center", gap: 12, border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--bg-1)) 0%, var(--bg-1) 70%)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", flexShrink: 0 }}>
              <Icons.Sparkle size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>Sign in to track your streak</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-2)" }}>Save progress, unlock hints, climb the ranks</div>
            </div>
            <Icons.ChevronRight size={16} style={{ color: "var(--fg-3)" }} />
          </button>
        )}

        {/* Hero streak card */}
        <div className="card card-elev" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
          <div className="glow-accent" style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, position: "relative" }}>
            <StreakRing value={todayMinutes} max={(me as User).dailyGoalMinutes || 120} size={84} stroke={7}>
              <div className="serif" style={{ fontSize: 30, lineHeight: 1, color: "var(--accent)" }}>{me.streak}</div>
              <div style={{ fontSize: 8.5, marginTop: 2, color: "var(--fg-3)", fontFamily: "var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>days</div>
            </StreakRing>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, whiteSpace: "nowrap" }}>
                <Icons.Flame size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)", letterSpacing: "0.04em" }}>TODAY · {todayMinutes} MIN</span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.3, marginBottom: 10, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--fg-0)", fontWeight: 600 }}>{todayMinutes}</span>
                <span style={{ color: "var(--fg-2)" }}> of {(me as User).dailyGoalMinutes || 120} min</span>
                <span style={{ color: "var(--fg-3)" }}> · {Math.max(0, ((me as User).dailyGoalMinutes || 120) - todayMinutes)} to go</span>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: `${Math.min(100, (todayMinutes / ((me as User).dailyGoalMinutes || 120)) * 100)}%` }} /></div>
              <WeekStrip activeDays={activeDays} labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} style={{ marginTop: 8, fontSize: 11, color: "var(--fg-3)" }} />
            </div>
          </div>
        </div>

        {/* Problem of the day */}
        {pod && (
          <button onClick={() => requireAuth("dailyPick", () => onOpenProblem(pod))} className="card card-elev" style={{ ...dailyPickCardStyle(pod), padding: 0, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "55%", background: pod.solved ? "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--easy) 20%, transparent), transparent 65%)" : "radial-gradient(circle at 100% 0%, var(--accent-soft), transparent 65%)", pointerEvents: "none" }} />
            <div style={{ padding: "16px 18px 14px", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span className="dot" style={{ background: "var(--accent)", flexShrink: 0 }} />
                  <span className="eyebrow" style={{ color: pod.solved ? "var(--easy)" : "var(--accent)", fontSize: 10 }}>Daily pick</span>
                </div>
                <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{pod.code}</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <SubjectIcon subject={pod.subject} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4, lineHeight: 1.25 }}>{pod.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--fg-2)", marginBottom: 10 }}>{SUBJECTS[pod.subject].name} • {pod.chapter}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <DifficultyChip d={pod.difficulty} />
                    <ProblemStatusChip p={pod} />
                    <span className="chip chip-mono">{pod.acceptance}% pass rate</span>
                    <span className="chip chip-mono">~{pod.avgTime}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-2)", position: "relative" }}>
              <span style={{ fontSize: 12.5, color: "var(--fg-2)" }}>{pod.solved ? "Attempted · 1.5× rating on first try" : "1.5× rating on your first attempt"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: pod.solved ? "var(--easy)" : "var(--accent)", fontWeight: 600, fontSize: 13 }}>
                {pod.solved ? "Practice" : "Start"} <Icons.ArrowRight size={14} />
              </div>
            </div>
          </button>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <StatTile label="Correct" value={me.correct ?? 0} sub={`/ ${me.solved} attempted`} icon={<Icons.Check size={13} />} />
          <StatTile label="Rating" value={me.rating} sub={me.delta} subColor="var(--easy)" icon={<Icons.TrendingUp size={13} />} />
          <StatTile label="AIR" value={typeof me.rank === "number" ? me.rank.toLocaleString("en-IN") : me.rank} sub={null} icon={<Icons.Medal size={13} />} small />
        </div>

        {/* Subject mastery */}
        {me.mastery.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionHeader label="Subject mastery" action="Details" onAction={() => onGoto("profile")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {me.mastery.map(m => <MasteryRow key={m.subject} m={m} />)}
            </div>
          </div>
        )}

        {/* Upcoming contest */}
        {nextContest && (
          <button onClick={() => onGoto("contests")} className="card card-elev" style={{ padding: 16, textAlign: "left", width: "100%", display: "flex", alignItems: "center", gap: 14, borderColor: "var(--line-3)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-3)", border: "1px solid var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
              <Icons.Zap size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                {nextContest.isHot && <span className="live-dot" />}
                <span className="eyebrow" style={{ fontSize: 10 }}>{nextContest.isHot ? "Starts tonight" : "Upcoming contest"}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{nextContest.name}</div>
              <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{formatContestTime(nextContest.startsAt)} • {nextContest.totalQuestions} Qs • {nextContest.participantCount.toLocaleString("en-IN")} registered</div>
            </div>
            <Icons.ChevronRight size={18} style={{ color: "var(--fg-3)" }} />
          </button>
        )}

        {/* Recent problems */}
        {recentProblems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionHeader label="Pick up where you left" action="See all" onAction={() => onGoto("sets")} />
            <div className="card row-divider" style={{ padding: 0 }}>
              {recentProblems.map(p => (
                <button key={p.id} onClick={() => onOpenProblem(p, buildPlayQueue(recentProblems, p.id))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", width: "100%", textAlign: "left" }}>
                  <SubjectIcon subject={p.subject} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-3)" }}>
                      <span className="mono">{p.code}</span><span>•</span><span>{p.chapter}</span>
                    </div>
                  </div>
                  <DifficultyChip d={p.difficulty} />
                  <ProblemStatusChip p={p} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="card" style={{ padding: 16 }}>
            <YearHeatmap data={activityData} centerCurrentMonth />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, sub, action, onAction }: { label: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{label}</span>
        {sub && <span style={{ fontSize: 11.5, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{sub}</span>}
      </div>
      {action && <button onClick={onAction} style={{ fontSize: 12, color: "var(--fg-2)", display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>{action} <Icons.ChevronRight size={12} /></button>}
    </div>
  );
}

function StatTile({ label, value, sub, subColor, icon, small }: { label: string; value: number | string; sub?: string | null; subColor?: string; icon?: React.ReactNode; small?: boolean }) {
  return (
    <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--fg-3)" }}>{icon}<span className="eyebrow" style={{ fontSize: 10 }}>{label}</span></div>
      <div className="serif" style={{ fontSize: small ? 22 : 26, lineHeight: 1, color: "var(--fg-0)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || "var(--fg-3)" }}>{sub}</div>}
    </div>
  );
}

function WeekStrip({ activeDays, labels, style }: { activeDays: Set<number>; labels: string[]; style?: React.CSSProperties }) {
  const todayIndex = (new Date().getDay() + 6) % 7;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", ...style }}>
      {labels.map((d, i) => {
        const isToday = i === todayIndex;
        const hasActivity = activeDays.has(i);
        return (
          <span key={i} style={{ color: isToday ? "var(--accent)" : hasActivity ? "var(--accent)" : undefined, fontWeight: isToday || hasActivity ? 600 : undefined, opacity: isToday ? 1 : hasActivity ? 0.7 : 1 }}>
            {d}
          </span>
        );
      })}
    </div>
  );
}

function TodayGoalCard({ todayMinutes, goalMinutes, activeDays }: { todayMinutes: number; goalMinutes: number; activeDays: Set<number> }) {
  const todayIndex = (new Date().getDay() + 6) % 7;
  const pct = Math.min(100, (todayMinutes / goalMinutes) * 100);
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Today's goal</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{todayMinutes}/{goalMinutes} min</span>
      </div>
      <div className="progress" style={{ height: 8, marginBottom: 14 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
          const isToday = i === todayIndex;
          const hasActivity = activeDays.has(i);
          return (
            <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, background: isToday ? "var(--accent)" : hasActivity ? "var(--accent-soft)" : "var(--bg-2)", color: isToday ? "var(--accent-fg)" : hasActivity ? "var(--accent)" : "var(--fg-3)" }}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DtStreakCard({ streak, todayMinutes, streakMax }: { streak: number; todayMinutes: number; streakMax: number }) {
  return (
    <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
      <StreakRing value={todayMinutes} max={120} size={64} stroke={6}>
        <div className="serif" style={{ fontSize: 22, lineHeight: 1, color: "var(--accent)" }}>{streak}</div>
      </StreakRing>
      <div>
        <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent)" }}>
          <Icons.Flame size={11} /> STREAK
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-1)", fontWeight: 600 }}>{streak} days</div>
        <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Max {streakMax}d</div>
      </div>
    </div>
  );
}

function dailyPickCardStyle(pod: Problem): React.CSSProperties {
  const done = pod.solved;
  return {
    padding: 24,
    textAlign: "left",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    cursor: "pointer",
    border: done
      ? "1px solid color-mix(in srgb, var(--easy) 40%, transparent)"
      : "1px solid var(--line-2)",
    background: done
      ? "linear-gradient(135deg, color-mix(in srgb, var(--easy) 14%, var(--bg-1)) 0%, color-mix(in srgb, var(--easy) 5%, var(--bg-1)) 100%)"
      : "linear-gradient(135deg, var(--bg-1) 0%, color-mix(in srgb, var(--accent) 6%, var(--bg-1)) 100%)",
  };
}

function ProblemStatusChip({ p }: { p: Problem }) {
  if (p.answeredCorrect) {
    return (
      <span className="chip" style={{ background: "color-mix(in srgb, var(--easy) 12%, transparent)", color: "var(--easy)", border: "1px solid color-mix(in srgb, var(--easy) 30%, transparent)", fontSize: 10.5, fontFamily: "var(--mono)" }}>
        Correct ✓
      </span>
    );
  }
  if (p.solved) {
    return (
      <span className="chip" style={{ background: "color-mix(in srgb, var(--fg-3) 12%, transparent)", color: "var(--fg-2)", border: "1px solid var(--line-2)", fontSize: 10.5, fontFamily: "var(--mono)" }}>
        Attempted
      </span>
    );
  }
  return null;
}

function DtStatCard({ label, value, sub, subColor, icon }: { label: string; value: number | string; sub?: string; subColor?: string; icon?: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-3)", marginBottom: 10 }}>
        {icon}
        <span className="eyebrow" style={{ fontSize: 9.5 }}>{label}</span>
      </div>
      <div className="serif" style={{ fontSize: 32, lineHeight: 1, color: "var(--fg-0)", marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: subColor || "var(--fg-3)" }}>{sub}</div>}
    </div>
  );
}

function MasteryRow({ m }: { m: { subject: string; pct: number; level: string; solved: number; total: number } }) {
  const subj = SUBJECTS[m.subject as keyof typeof SUBJECTS];
  if (!subj) return null;
  return (
    <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
      <SubjectIcon subject={m.subject as keyof typeof SUBJECTS} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{subj.name}</div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{m.level} · {m.solved}/{m.total}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="serif" style={{ fontSize: 18, color: subj.color }}>{m.pct}</span>
            <span style={{ fontSize: 10, color: "var(--fg-3)" }}>%</span>
          </div>
        </div>
        <div className="progress" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${m.pct}%`, background: subj.color }} /></div>
      </div>
    </div>
  );
}
