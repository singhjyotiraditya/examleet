"use client";
import React, { useState, useEffect } from "react";
import { AppBar, Avatar, Icons } from "./shared";
import { ContestArena } from "./contest-arena";

interface ContestItem {
  id: string; name: string; type: string; examType: string;
  startsAt: string; durationMin: number; totalQuestions: number;
  maxScore: number; status: string; isHot: boolean; badge: string;
  participantCount: number;
}

interface LeaderItem {
  id: string; name: string; handle: string; city: string;
  rating: number; rankAllIndia: number | null; totalSolved: number; streakCurrent: number;
}

interface ContestsProps {
  isGuest: boolean;
  requireAuth: (key: string, cb?: () => void) => boolean;
  isDesktop?: boolean;
}

function formatContestDate(iso: string) {
  const d = new Date(iso);
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatContestTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDuration(min: number) {
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}m` : ""}` : `${min}m`;
}

export default function Contests({ isGuest, requireAuth, isDesktop }: ContestsProps) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [leaders, setLeaders] = useState<LeaderItem[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [activeContest, setActiveContest] = useState<ContestItem | null>(null);
  useEffect(() => {
    fetch("/api/contests?limit=20")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data?.items) setContests(json.data.items); })
      .catch(() => null);

    fetch("/api/users/leaderboard?limit=6")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setLeaders(json.data); })
      .catch(() => null);
  }, []);

  const upcoming = contests.filter(c => c.status === "upcoming" || c.status === "live");
  const past = contests.filter(c => c.status === "past");

  const toggle = (id: string) => {
    const doToggle = () => setRegistered(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (isGuest) requireAuth("contest", doToggle);
    else doToggle();
  };

  const enterContest = (contest: ContestItem) => {
    const doEnter = () => setActiveContest(contest);
    if (isGuest) requireAuth("contest", doEnter);
    else doEnter();
  };

  if (activeContest) {
    const arenaContest = {
      id: activeContest.id,
      name: activeContest.name,
      type: activeContest.type,
      duration: activeContest.durationMin >= 60
        ? `${Math.floor(activeContest.durationMin / 60)}h${activeContest.durationMin % 60 > 0 ? ` ${activeContest.durationMin % 60}m` : ""}`
        : `${activeContest.durationMin}m`,
      questions: activeContest.totalQuestions,
    };
    return <ContestArena contest={arenaContest} onExit={() => setActiveContest(null)} isDesktop={isDesktop} />;
  }

  if (isDesktop) {
    return (
      <>
      <div className="dt-container">
        <div style={{ marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Contests</div>
          <div className="h-display" style={{ fontSize: 48, lineHeight: 1 }}>
            Compete <em>every week.</em>
          </div>
        </div>

        <LiveContestBanner upcomingCount={upcoming.length} />

        <div className="tabs" style={{ maxWidth: 280, marginBottom: 24, marginTop: 28 }}>
          <button className={`tab${tab === "upcoming" ? " active" : ""}`} onClick={() => setTab("upcoming")}>
            Upcoming <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginLeft: 4 }}>{upcoming.length}</span>
          </button>
          <button className={`tab${tab === "past" ? " active" : ""}`} onClick={() => setTab("past")}>
            Past <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginLeft: 4 }}>{past.length}</span>
          </button>
        </div>

        {tab === "upcoming" && (
          <>
            <div className="dt-grid-2">
              {(() => {
                const hero = upcoming.find(c => registered.has(c.id)) || upcoming.find(c => c.isHot) || upcoming[0];
                const rest = upcoming.filter(c => c !== hero);
                if (!hero) return <div style={{ gridColumn: "1 / -1" }}><ContestsComingSoon /></div>;
                return (
                  <>
                    <NextContestHero contest={hero} registered={registered} onRegister={toggle} onEnter={enterContest} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {rest.map(c => <UpcomingCard key={c.id} contest={c} registered={registered.has(c.id)} onToggle={() => toggle(c.id)} onEnter={() => enterContest(c)} />)}
                    </div>
                  </>
                );
              })()}
            </div>

            {leaders.length >= 5 && (
              <div style={{ marginTop: 36 }}>
                <SectionHeader label="Last week's top performers" action="Full ranks" />
                <TopPerformersStrip leaders={leaders} />
              </div>
            )}
          </>
        )}

        {tab === "past" && (
          <div className="dt-grid-2">
            {past.length === 0
              ? <div style={{ color: "var(--fg-3)", fontSize: 13, padding: 20 }}>No past contests yet</div>
              : past.map(c => <PastCard key={c.id} contest={c} />)}
          </div>
        )}
      </div>
      </>
    );
  }


  return (
    <div className="screen">
      <AppBar display eyebrow="Contests" title={<>Compete <em>every week.</em></>}
        right={<button className="btn btn-ghost" style={{ padding: 10, borderRadius: 999 }}><Icons.Calendar size={20} /></button>}
      />
      <div className="screen-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {upcoming[0] && <NextContestHero contest={upcoming.find(c => c.isHot) || upcoming[0]} registered={registered} onRegister={toggle} onEnter={enterContest} />}

        <div className="tabs">
          <button className={`tab${tab === "upcoming" ? " active" : ""}`} onClick={() => setTab("upcoming")}>
            Upcoming <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginLeft: 4 }}>{upcoming.length}</span>
          </button>
          <button className={`tab${tab === "past" ? " active" : ""}`} onClick={() => setTab("past")}>
            Past <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginLeft: 4 }}>{past.length}</span>
          </button>
        </div>

        {tab === "upcoming" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upcoming.length === 0
              ? <ContestsComingSoon />
              : upcoming.map(c => <UpcomingCard key={c.id} contest={c} registered={registered.has(c.id)} onToggle={() => toggle(c.id)} onEnter={() => enterContest(c)} />)}
          </div>
        )}
        {tab === "past" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {past.length === 0
              ? <div style={{ color: "var(--fg-3)", fontSize: 13, padding: 20, textAlign: "center" }}>No past contests yet</div>
              : past.map(c => <PastCard key={c.id} contest={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function NextContestHero({ contest, registered, onRegister, onEnter }: { contest: ContestItem | undefined; registered: Set<string>; onRegister: (id: string) => void; onEnter: (c: ContestItem) => void }) {
  if (!contest) return null;
  const isReg = registered.has(contest.id);
  return (
    <div className="card card-elev" style={{ padding: 0, overflow: "hidden", position: "relative", border: "1px solid var(--line-3)" }}>
      <div style={{ padding: "18px 18px 16px", position: "relative", background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, transparent), transparent 60%), var(--bg-2)", borderBottom: "1px solid var(--line-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
          {contest.isHot && <span className="live-dot" />}
          <span className="eyebrow" style={{ color: contest.isHot ? "var(--easy)" : "var(--accent)" }}>{contest.isHot ? "Live tonight" : "Next contest"}</span>
          <span style={{ flex: 1 }} />
          {contest.badge && (
            <span className="chip chip-mono" style={{ background: "var(--bg-3)", color: "var(--fg-2)", borderColor: "var(--line-2)", fontSize: 9.5, letterSpacing: "0.1em", padding: "3px 7px" }}>{contest.badge}</span>
          )}
        </div>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.1, marginBottom: 8 }}>{contest.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>{formatContestDate(contest.startsAt)}</span>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>· {formatContestTime(contest.startsAt)}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, paddingTop: 12, borderTop: "1px solid var(--line-1)" }}>
          <HeroStat label="Duration" value={formatDuration(contest.durationMin)} />
          <HeroStat label="Questions" value={String(contest.totalQuestions)} />
          <HeroStat label="Registered" value={contest.participantCount >= 1000 ? `${(contest.participantCount / 1000).toFixed(1)}k` : String(contest.participantCount)} />
        </div>
      </div>
      <div style={{ padding: "14px 14px 12px", display: "flex", gap: 8 }}>
        {isReg
          ? <button onClick={() => onEnter(contest)} className="btn btn-primary" style={{ flex: 1, padding: "16px 14px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14 }}>
              <Icons.Play size={16} /> Join contest
            </button>
          : <button onClick={() => onRegister(contest.id)} className="btn btn-primary" style={{ flex: 1, padding: "16px 14px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              Register now <Icons.ArrowRight size={14} />
            </button>
        }
        <button className="btn" style={{ padding: 14 }}><Icons.Share size={15} /></button>
      </div>

      {/* Contest rules */}
      <div style={{ margin: "0 14px 14px", padding: "14px", background: "var(--bg-2)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 2 }}>Contest rules</div>
        {[
          { icon: <Icons.Check size={12} />, text: "Attempt all questions within the time limit", ok: true },
          { icon: <Icons.X size={12} />, text: "No external resources, books or calculators", ok: false },
          { icon: <Icons.X size={12} />, text: "Do not switch tabs or exit the browser", ok: false },
          { icon: <Icons.X size={12} />, text: "No collaboration or discussion during the contest", ok: false },
          { icon: <Icons.Check size={12} />, text: "Each correct answer awards +4 marks; −1 for wrong", ok: true },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: r.ok ? "var(--easy)" : "var(--hard)", flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
            <span style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.4 }}>{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 3 }}>{label}</div>
      <div className="serif" style={{ fontSize: 18, color: "var(--fg-0)", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function UpcomingCard({ contest, registered, onToggle, onEnter }: { contest: ContestItem; registered: boolean; onToggle: () => void; onEnter: () => void }) {
  const dateStr = formatContestDate(contest.startsAt);
  const parts = dateStr.split(",");
  const dayMonth = (parts[1] || "").trim();
  const dayNum = dayMonth.replace(/[A-Za-z]+\s*/, "").trim();
  const monthStr = (dayMonth.match(/[A-Za-z]+/) || [""])[0].toUpperCase().slice(0, 3);
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 52, flexShrink: 0, padding: "10px 6px", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 12, textAlign: "center" }}>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{parts[0] || "—"}</div>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1, color: "var(--fg-0)" }}>{dayNum || "—"}</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--fg-3)", marginTop: 2 }}>{monthStr}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{contest.type.toUpperCase()}</span>
            {contest.isHot && <><span style={{ fontSize: 9, color: "var(--fg-3)" }}>·</span><span className="mono" style={{ fontSize: 10, color: "var(--easy)" }}>HOT</span></>}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4, lineHeight: 1.25 }}>{contest.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--fg-3)", flexWrap: "wrap" }}>
            <Icons.Clock size={11} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: "nowrap" }}>{formatContestTime(contest.startsAt)}</span>
            <span>·</span><span style={{ whiteSpace: "nowrap" }}>{formatDuration(contest.durationMin)}</span>
            <span>·</span><span style={{ whiteSpace: "nowrap" }}>{contest.totalQuestions} Qs</span>
          </div>
        </div>
      </div>
      {registered ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={onEnter} className="btn btn-primary" style={{ flex: 1, padding: "10px 14px", fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icons.Play size={13} /> Join contest
          </button>
          <button onClick={onToggle} className="btn" style={{ padding: "10px 12px", fontSize: 12 }}>
            <Icons.X size={13} />
          </button>
        </div>
      ) : (
        <button onClick={onToggle} className="btn btn-primary" style={{ marginTop: 12, width: "100%", padding: "10px 14px", fontSize: 12.5 }}>
          Register
        </button>
      )}
    </div>
  );
}

function PastCard({ contest }: { contest: ContestItem & { yourRank?: number; yourScore?: number; maxScore?: number } }) {
  if (!contest.yourScore || !contest.maxScore) {
    return (
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>{contest.type.toUpperCase()} · {formatContestDate(contest.startsAt)}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{contest.name}</div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{contest.participantCount.toLocaleString("en-IN")} participated</div>
          </div>
        </div>
      </div>
    );
  }
  const pct = Math.round((contest.yourScore / contest.maxScore) * 100);
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{contest.type.toUpperCase()}</span>
            <span style={{ fontSize: 9, color: "var(--fg-3)" }}>·</span>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{formatContestDate(contest.startsAt)}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, marginBottom: 4 }}>{contest.name}</div>
          <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{contest.participantCount.toLocaleString("en-IN")} participated</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>AIR</div>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1, color: "var(--accent)" }}>{contest.yourRank?.toLocaleString("en-IN")}</div>
        </div>
      </div>
      <div style={{ padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--line-1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 2 }}>Your score</div>
          <div>
            <span className="mono" style={{ fontSize: 14, color: "var(--fg-0)", fontWeight: 600 }}>{contest.yourScore}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}> / {contest.maxScore}</span>
          </div>
        </div>
        <div style={{ flex: 1, marginLeft: 16, maxWidth: 140 }}>
          <div className="progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
      <button className="btn btn-ghost" style={{ marginTop: 10, width: "100%", padding: "10px 14px", fontSize: 12.5, border: "1px solid var(--line-2)" }}>
        Review submissions <Icons.ArrowRight size={13} />
      </button>
    </div>
  );
}

function SectionHeader({ label, action }: { label: string; action?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px", gap: 8 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>{label}</span>
      {action && <button style={{ fontSize: 12, color: "var(--fg-2)", display: "inline-flex", alignItems: "center", gap: 3 }}>{action} <Icons.ChevronRight size={12} /></button>}
    </div>
  );
}

function ContestsComingSoon() {
  return (
    <div className="contests-soon card">
      <div className="contests-soon-icon" aria-hidden="true">
        <Icons.Trophy size={26} />
      </div>
      <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 8 }}>Coming soon</div>
      <div className="serif contests-soon-title">Weekly mocks are almost here</div>
      <p className="contests-soon-body">
        All-India timed contests with live ranks, AIR badges, and authentic JEE scoring — launching soon.
      </p>
    </div>
  );
}

function LiveContestBanner({ upcomingCount }: { upcomingCount: number }) {
  return (
    <div style={{ padding: 22, background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 6%, var(--bg-1)) 0%, var(--bg-1) 60%)", border: "1px solid var(--line-2)", borderRadius: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
      <BannerStat label="Competing this week" value={upcomingCount > 0 ? `${upcomingCount} contests` : "Soon"} sub={upcomingCount > 0 ? "register now" : "first mock TBA"} icon={<Icons.Users size={14} />} />
      <BannerStat label="Prize pool" value="Badges" sub="+ merit certificates" icon={<Icons.TrendingUp size={14} />} />
      <BannerStat label="Format" value="JEE" sub="authentic scoring" icon={<Icons.Medal size={14} />} />
      <BannerStat label="Top reward" value="AIR Badge" sub="+ ranking boost" icon={<Icons.Zap size={14} />} />
    </div>
  );
}

function BannerStat({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-3)", marginBottom: 8 }}>
        {icon}
        <span className="eyebrow" style={{ fontSize: 9.5 }}>{label}</span>
      </div>
      <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: accent ? "var(--accent)" : "var(--fg-0)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function TopPerformersStrip({ leaders }: { leaders: LeaderItem[] }) {
  return (
    <div style={{ padding: "18px 4px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 18, display: "grid", gridTemplateColumns: `repeat(${leaders.length}, 1fr)`, gap: 4, marginTop: 14 }}>
      {leaders.map((p, i) => (
        <div key={p.id} style={{ padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", borderRight: i === leaders.length - 1 ? "none" : "1px solid var(--line-1)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: i < 3 ? "var(--accent-soft)" : "var(--bg-2)", border: i < 3 ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" : "1px solid var(--line-1)", color: i < 3 ? "var(--accent)" : "var(--fg-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--serif)", fontSize: 16 }}>
            {i + 1}
          </div>
          <Avatar name={p.name} size={36} />
          <div style={{ minWidth: 0, width: "100%" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name.split(" ")[0]}</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{p.rating}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
