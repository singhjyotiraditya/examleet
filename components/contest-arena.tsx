"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Icons } from "./shared";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ContestMeta {
  id: string; name: string; type: string; duration: string; questions: number;
}
export interface SpecialEvent {
  type: string; title: string; desc: string; reward: string; participants: number; color: string;
}

interface ArenaQuestion {
  id: number; subject: string; chapter: string; body: string;
  options: { id: string; text: string }[];
  correct: string;
}
interface Opponent {
  name: string; city: string; score: number; lastDelta: number; streak: number; finished: number;
}
interface RankedPlayer extends Partial<Opponent> {
  name: string; city: string; score: number; isMe: boolean; streak: number; rank: number;
}
interface ResultEntry {
  correct: boolean; timeSec: number; points: number; picked: string | null; correctId: string;
}
interface FeedEvent {
  kind: "instant" | "streak"; name: string; city?: string; n?: number; key: number;
}
interface Pulse {
  type: "instant" | "correct" | "wrong" | "streak"; at: number;
}

// ─── Static data ──────────────────────────────────────────────────────────────
const ARENA_QUESTIONS: ArenaQuestion[] = [
  {
    id: 1, subject: "bio", chapter: "Cell Biology",
    body: "Which of the following organelles is responsible for protein synthesis in eukaryotic cells?",
    options: [{ id: "a", text: "Ribosome" }, { id: "b", text: "Golgi apparatus" }, { id: "c", text: "Lysosome" }, { id: "d", text: "Peroxisome" }],
    correct: "a",
  },
  {
    id: 2, subject: "bio", chapter: "Genetics",
    body: "In a dihybrid cross between RrYy × RrYy, what is the expected phenotypic ratio in the F₂ generation?",
    options: [{ id: "a", text: "3 : 1" }, { id: "b", text: "1 : 2 : 1" }, { id: "c", text: "9 : 3 : 3 : 1" }, { id: "d", text: "1 : 1 : 1 : 1" }],
    correct: "c",
  },
  {
    id: 3, subject: "bio", chapter: "Human Physiology",
    body: "The cardiac pacemaker of the human heart is the:",
    options: [{ id: "a", text: "Atrioventricular node" }, { id: "b", text: "Sinoatrial node" }, { id: "c", text: "Bundle of His" }, { id: "d", text: "Purkinje fibres" }],
    correct: "b",
  },
  {
    id: 4, subject: "bio", chapter: "Plant Physiology",
    body: "Which pigment is primarily responsible for the absorption of light in photosystem II?",
    options: [{ id: "a", text: "Chlorophyll-b" }, { id: "b", text: "Carotenoids" }, { id: "c", text: "Chlorophyll-a (P680)" }, { id: "d", text: "Phycobilins" }],
    correct: "c",
  },
  {
    id: 5, subject: "bio", chapter: "Reproduction",
    body: "The functional unit of the kidney is the:",
    options: [{ id: "a", text: "Neuron" }, { id: "b", text: "Nephron" }, { id: "c", text: "Alveolus" }, { id: "d", text: "Glomerulus" }],
    correct: "b",
  },
];

const ARENA_OPPONENTS: Opponent[] = [
  { name: "Aarav Singh",  city: "Kota",      score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Ishita Reddy", city: "Hyderabad", score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Rohan Mehta",  city: "Mumbai",    score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Priya Iyer",   city: "Chennai",   score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Karan Joshi",  city: "Pune",      score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Sneha Patel",  city: "Ahmedabad", score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Vikram Nair",  city: "Bangalore", score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Tara Bhat",    city: "Delhi",     score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Aditya Rao",   city: "Kolkata",   score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Meera Kapoor", city: "Jaipur",    score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Dhruv Chawla", city: "Lucknow",   score: 0, lastDelta: 0, streak: 0, finished: 0 },
  { name: "Riya Saxena",  city: "Bhopal",    score: 0, lastDelta: 0, streak: 0, finished: 0 },
];

const SKILL_BASE = [0.35, 0.32, 0.30, 0.27, 0.24, 0.22, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10];
const TIME_PER_Q = 30;
const POINTS_BASE = 100;
const SPEED_BONUS_THRESHOLD = 5;
const STREAK_BONUS = 25;

// ─── Subject icon ─────────────────────────────────────────────────────────────
function SubjectIcon({ subject, size = 28 }: { subject: string; size?: number }) {
  const map: Record<string, string> = { bio: "🧬", phy: "⚛️", chem: "⚗️", math: "∑" };
  return <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>{map[subject] ?? "📚"}</span>;
}

// ─── Timer Ring ───────────────────────────────────────────────────────────────
function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const size = 80, stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, seconds / total);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        style={{ transition: "stroke-dashoffset 0.1s linear" }} />
    </svg>
  );
}

// ─── Rank Row ─────────────────────────────────────────────────────────────────
function RankRow({ p }: { p: RankedPlayer }) {
  const [flash, setFlash] = useState(false);
  const prevScore = useRef(p.score);
  useEffect(() => {
    if (p.score !== prevScore.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      prevScore.current = p.score;
      return () => clearTimeout(t);
    }
  }, [p.score]);

  const lastName = p.isMe ? "" : (p.name.split(" ")[1]?.[0] ?? "") + ".";
  const displayName = p.isMe ? "You" : `${p.name.split(" ")[0]} ${lastName}`;

  return (
    <div className={["rank-row", p.isMe ? "me" : "", flash ? "flash" : "", p.rank === 1 ? "first" : ""].filter(Boolean).join(" ")}>
      <div className="rank-pos serif">{p.rank}</div>
      <div className="rank-name">
        <div className="rank-name-l1">{displayName}</div>
        <div className="rank-name-l2 mono">{p.city}</div>
      </div>
      <div className="rank-score">
        <div className="mono rank-score-val">{p.score.toLocaleString("en-IN")}</div>
        {(p.lastDelta ?? 0) > 0 && <div className="rank-delta mono">+{p.lastDelta}</div>}
      </div>
    </div>
  );
}

// ─── Live Rank List ───────────────────────────────────────────────────────────
function LiveRankList({ ranked }: { ranked: RankedPlayer[] }) {
  const myIdx = ranked.findIndex(p => p.isMe);
  const top = ranked.slice(0, 5);
  const includesMe = top.some(p => p.isMe);
  const meWindow = !includesMe
    ? ranked.slice(Math.max(0, myIdx - 1), Math.min(ranked.length, myIdx + 2))
    : [];

  return (
    <div className="ranklist">
      {top.map(p => <RankRow key={p.name} p={p} />)}
      {meWindow.length > 0 && (
        <>
          <div className="rank-gap">···</div>
          {meWindow.map(p => <RankRow key={p.name} p={p} />)}
        </>
      )}
    </div>
  );
}

// ─── Event Feed ───────────────────────────────────────────────────────────────
function EventFeed({ feed }: { feed: FeedEvent[] }) {
  if (feed.length === 0) {
    return <div className="feed-empty mono">Waiting for the arena to ignite…</div>;
  }
  return (
    <div className="feed">
      {feed.map(ev => (
        <div key={ev.key} className={`feed-row feed-${ev.kind}`}>
          {ev.kind === "instant" && (
            <><span className="feed-icon">⚡</span><span><b>{ev.name}</b> from {ev.city} answered in <b>under 5s</b></span></>
          )}
          {ev.kind === "streak" && (
            <><span className="feed-icon">🔥</span><span><b>{ev.name}</b> on a <b>{ev.n}× streak</b></span></>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Result Line ──────────────────────────────────────────────────────────────
function ArenaResultLine({ result, streak }: { result: ResultEntry; streak: number }) {
  const { correct, timeSec, points, picked } = result;
  const speedy = correct && timeSec <= SPEED_BONUS_THRESHOLD;
  const timedOut = picked == null;
  return (
    <div className={`result-line ${correct ? "ok" : "bad"}`}>
      <div className="result-pill">{correct ? "CORRECT" : timedOut ? "TIME UP" : "WRONG"}</div>
      <span className="mono result-time">{timeSec.toFixed(1)}s</span>
      {correct && (
        <span className="result-pts mono">
          +{points}
          {speedy && <span className="result-bonus"> · +50 SPEED</span>}
          {streak >= 2 && <span className="result-bonus"> · +25 STREAK</span>}
        </span>
      )}
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti({ count = 28 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.2,
    dur: 0.9 + Math.random() * 0.7,
    rot: Math.random() * 360,
    color: (["var(--accent)", "var(--easy)", "var(--phy)", "var(--chem)"] as string[])[i % 4],
    size: 6 + Math.random() * 6,
  })), [count]);
  return (
    <div className="confetti">
      {pieces.map(p => (
        <span key={p.id} style={{
          left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
          background: p.color, width: p.size, height: p.size * 0.4, transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </div>
  );
}

// ─── Celebration Layer ────────────────────────────────────────────────────────
function CelebrationLayer({ pulse, timeSec }: { pulse: Pulse | null; timeSec?: number }) {
  if (!pulse) return null;
  if (pulse.type === "instant") {
    return (
      <div className="celebrate celebrate-instant" key={pulse.at}>
        <div className="celebrate-rays" />
        <div className="celebrate-card">
          <div className="celebrate-eyebrow mono">⚡ LIGHTNING</div>
          <div className="celebrate-title serif">Instant!</div>
          <div className="celebrate-sub">
            Solved in <b>{timeSec?.toFixed(1)}s</b> · <span className="mono">+50 SPEED BONUS</span>
          </div>
        </div>
        <Confetti count={32} />
      </div>
    );
  }
  if (pulse.type === "streak") {
    return (
      <div className="celebrate celebrate-streak" key={pulse.at}>
        <div className="celebrate-card streak">
          <div className="celebrate-eyebrow mono">🔥 ON FIRE</div>
          <div className="celebrate-title serif">Streak!</div>
        </div>
      </div>
    );
  }
  return null;
}

// ─── Finish Screen ────────────────────────────────────────────────────────────
function ArenaFinish({ results, score, bestStreak, rank, totalPlayers, ranked, onExit }: {
  results: ResultEntry[]; score: number; bestStreak: number;
  rank: number; totalPlayers: number; ranked: RankedPlayer[]; onExit: () => void;
}) {
  const correct = results.filter(r => r.correct).length;
  const avgTime = results.length
    ? (results.reduce((s, r) => s + r.timeSec, 0) / results.length).toFixed(1)
    : "0.0";
  const correctResults = results.filter(r => r.correct).map(r => r.timeSec);
  const fastest = correctResults.length ? Math.min(...correctResults) : Infinity;

  return (
    <div className="arena arena-finish">
      <div className="arena-bg" />
      <div className="finish-shell">
        <div className="finish-eyebrow mono">CONTEST COMPLETE</div>
        <div className="finish-title serif">
          You finished <em>#{rank}</em>
          <span className="finish-of"> of {totalPlayers.toLocaleString("en-IN")}</span>
        </div>
        <div className="finish-stats">
          <FinishStat label="Score" value={score.toLocaleString("en-IN")} accent />
          <FinishStat label="Correct" value={`${correct}/${results.length}`} />
          <FinishStat label="Avg time" value={`${avgTime}s`} />
          <FinishStat label="Fastest" value={isFinite(fastest) ? `${fastest.toFixed(1)}s` : "—"} />
          <FinishStat label="Best streak" value={`${bestStreak}×`} />
        </div>
        <div className="finish-podium">
          {ranked.slice(0, 5).map(p => (
            <div key={p.name} className={`podium-row ${p.isMe ? "me" : ""}`}>
              <div className="podium-rank serif">#{p.rank}</div>
              <div className="podium-name">{p.isMe ? "You" : p.name}</div>
              <div className="podium-score mono">{p.score.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
        <div className="finish-actions">
          <button className="btn btn-primary btn-lg" onClick={onExit} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Back to contests <Icons.ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FinishStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="fin-stat">
      <div className="fin-stat-label mono">{label.toUpperCase()}</div>
      <div className={`fin-stat-val serif${accent ? " accent" : ""}`}>{value}</div>
    </div>
  );
}

// ─── Main Arena ───────────────────────────────────────────────────────────────
export function ContestArena({ contest, onExit, isDesktop: _isDesktop }: { contest: ContestMeta; onExit: () => void; isDesktop?: boolean }) {
  const total = ARENA_QUESTIONS.length;
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [myStreak, setMyStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [opponents, setOpponents] = useState<Opponent[]>(() => ARENA_OPPONENTS.map(o => ({ ...o })));
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [eventFeed, setEventFeed] = useState<FeedEvent[]>([]);
  const [finished, setFinished] = useState(false);

  const q = ARENA_QUESTIONS[qIdx];
  const timeLeft = Math.max(0, TIME_PER_Q - elapsed);
  const lowTime = timeLeft <= 7 && !locked;
  const criticalTime = timeLeft <= 3 && !locked;

  const addEvent = useCallback((ev: Omit<FeedEvent, "key">) => {
    setEventFeed(prev => [{ ...ev, key: Math.random() } as FeedEvent, ...prev].slice(0, 8));
  }, []);

  // Tick timer
  useEffect(() => {
    if (locked || finished) return;
    const t = setInterval(() => {
      setElapsed(e => {
        if (e + 0.1 >= TIME_PER_Q) { clearInterval(t); return TIME_PER_Q; }
        return +(e + 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(t);
  }, [locked, qIdx, finished]);

  // Auto-lock on timeout
  useEffect(() => {
    if (locked || finished || elapsed < TIME_PER_Q) return;
    commitAnswer(null, TIME_PER_Q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, locked, finished]);

  // Opponent simulation
  useEffect(() => {
    if (locked || finished) return;
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      setOpponents(prev => {
        const next = prev.map(o => ({ ...o, lastDelta: 0 }));
        const t = elapsed;
        next.forEach((o, i) => {
          if (o.finished > qIdx) return;
          const baseSkill = SKILL_BASE[i] ?? 0.1;
          const timeFactor = Math.min(1, t / 12);
          if (Math.random() < baseSkill * timeFactor * 0.18) {
            const correct = Math.random() < (0.55 + (12 - i) * 0.02);
            const speedy = Math.random() < 0.4 && t < 8;
            let pts = 0;
            if (correct) {
              pts = POINTS_BASE + (speedy ? 50 : Math.max(0, Math.round((TIME_PER_Q - t) * 2)));
              if (o.streak + 1 >= 2) pts += STREAK_BONUS;
            }
            o.score += pts;
            o.lastDelta = pts;
            o.streak = correct ? o.streak + 1 : 0;
            o.finished = qIdx + 1;
            if (correct && speedy && Math.random() < 0.6) {
              addEvent({ kind: "instant", name: o.name.split(" ")[0], city: o.city });
            } else if (correct && o.streak >= 3 && Math.random() < 0.4) {
              addEvent({ kind: "streak", name: o.name.split(" ")[0], n: o.streak });
            }
          }
        });
        return next;
      });
    }, 350);
    return () => { cancelled = true; clearInterval(interval); };
  }, [qIdx, elapsed, locked, finished, addEvent]);

  function commitAnswer(optId: string | null, atSec: number) {
    const correct = optId === q.correct;
    const t = atSec;
    const speedy = correct && t <= SPEED_BONUS_THRESHOLD;
    let points = 0;
    if (correct) {
      points = POINTS_BASE + Math.max(0, Math.round((TIME_PER_Q - t) * 2));
      if (speedy) points += 50;
      if (myStreak + 1 >= 2) points += STREAK_BONUS;
    }
    setLocked(true);
    setPicked(optId);
    setMyScore(s => s + points);
    setResults(r => [...r, { correct, timeSec: t, points, picked: optId, correctId: q.correct }]);
    const newStreak = correct ? myStreak + 1 : 0;
    setMyStreak(newStreak);
    setBestStreak(b => Math.max(b, newStreak));
    if (speedy) setPulse({ type: "instant", at: Date.now() });
    else if (correct && newStreak >= 3) setPulse({ type: "streak", at: Date.now() });
    else if (correct) setPulse({ type: "correct", at: Date.now() });
    else setPulse({ type: "wrong", at: Date.now() });
  }

  function next() {
    if (qIdx + 1 >= total) { setFinished(true); return; }
    setQIdx(i => i + 1);
    setPicked(null);
    setLocked(false);
    setElapsed(0);
    setPulse(null);
  }

  const myEntry: RankedPlayer = { name: "You", city: "—", score: myScore, isMe: true, streak: myStreak, lastDelta: 0, rank: 1 };
  const ranked = useMemo<RankedPlayer[]>(() => {
    const all: RankedPlayer[] = [
      ...opponents.map(o => ({ ...o, isMe: false, rank: 0 })),
      myEntry,
    ];
    all.sort((a, b) => b.score - a.score || (b.isMe ? -1 : 1));
    return all.map((p, i) => ({ ...p, rank: i + 1 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponents, myScore, myStreak]);

  const myRank = ranked.find(p => p.isMe)?.rank ?? 1;
  const totalPlayers = ranked.length;

  if (finished) {
    return <ArenaFinish results={results} score={myScore} bestStreak={bestStreak}
      rank={myRank} totalPlayers={totalPlayers} ranked={ranked} onExit={onExit} />;
  }

  return (
    <div className="arena">
      <div className="arena-bg" />
      <div className={`arena-pulse-bg ${criticalTime ? "critical" : lowTime ? "low" : ""}`} />

      {/* TOP HUD */}
      <header className="arena-hud">
        <div className="hud-left">
          <button className="arena-quit" onClick={onExit} aria-label="Quit">
            <Icons.X size={16} />
          </button>
          <div className="hud-meta">
            <div className="hud-eyebrow">
              <span className="live-dot" /> LIVE · {contest.name.toUpperCase()}
            </div>
            <div className="hud-progress-row">
              <span className="mono hud-qcount">Q {qIdx + 1}<span className="dim">/{total}</span></span>
              <div className="hud-progress">
                {Array.from({ length: total }).map((_, i) => {
                  const r = results[i];
                  return (
                    <div key={i} className={[
                      "hud-progress-cell",
                      r ? (r.correct ? "ok" : "bad") : "",
                      i === qIdx ? "current" : "",
                    ].filter(Boolean).join(" ")} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={`hud-timer${lowTime ? " low" : ""}${criticalTime ? " critical" : ""}${locked ? " locked" : ""}`}>
          <TimerRing seconds={timeLeft} total={TIME_PER_Q} />
          <div className="hud-timer-val">
            <span className="serif">{Math.ceil(timeLeft)}</span>
            <span className="mono">SEC</span>
          </div>
        </div>

        <div className="hud-right">
          <div className="hud-stat">
            <div className="hud-stat-label">RANK</div>
            <div className="hud-stat-val serif">
              <span className="hash">#</span>{myRank}
              <span className="hud-stat-sub mono">of {totalPlayers}</span>
            </div>
          </div>
          <div className="hud-stat hud-stat-score">
            <div className="hud-stat-label">SCORE</div>
            <div className="hud-stat-val serif">{myScore.toLocaleString("en-IN")}</div>
          </div>
          <div className={`hud-stat hud-streak${myStreak >= 2 ? " active" : ""}`}>
            <div className="hud-stat-label">STREAK</div>
            <div className="hud-stat-val serif">
              <span className="flame">{myStreak >= 2 ? "🔥" : ""}</span>
              ×{myStreak}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="arena-main">
        {/* QUESTION COLUMN */}
        <section className="arena-question">
          <div className="aq-head">
            <span className="aq-subject" style={{ color: `var(--${q.subject})` }}>
              <SubjectIcon subject={q.subject} size={28} />
              <span className="mono">{q.chapter.toUpperCase()}</span>
            </span>
            <span className="aq-tag mono">
              +{POINTS_BASE} BASE · UP TO +{POINTS_BASE + TIME_PER_Q * 2 + 50 + STREAK_BONUS} TOTAL
            </span>
          </div>

          <div className="aq-body serif">{q.body}</div>

          <div className="aq-options">
            {q.options.map((o, i) => {
              const isPicked = picked === o.id;
              const showCorrect = locked && o.id === q.correct;
              const showWrong = locked && isPicked && o.id !== q.correct;
              return (
                <button key={o.id}
                  className={[
                    "aq-opt",
                    isPicked && !locked ? "picked" : "",
                    showCorrect ? "correct" : "",
                    showWrong ? "wrong" : "",
                    locked && !isPicked && o.id !== q.correct ? "dim" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={locked}
                  onClick={() => { if (!locked) commitAnswer(o.id, elapsed); }}>
                  <span className="aq-opt-letter mono">{String.fromCharCode(65 + i)}</span>
                  <span className="aq-opt-text">{o.text}</span>
                  {showCorrect && <Icons.Check size={20} />}
                  {showWrong && <Icons.X size={20} />}
                </button>
              );
            })}
          </div>

          <div className="aq-foot">
            <div className="aq-foot-info">
              {!locked && <span className="mono dim-2">TAP AN OPTION · NO GOING BACK</span>}
              {locked && results.length > 0 && (
                <ArenaResultLine result={results[results.length - 1]} streak={myStreak} />
              )}
            </div>
            <button className={`aq-next${locked ? " ready" : " wait"}`} disabled={!locked} onClick={next}>
              {qIdx + 1 === total ? "Finish" : "Next"}
              <Icons.ArrowRight size={18} />
            </button>
          </div>
        </section>

        {/* RIGHT RAIL */}
        <aside className="arena-rail">
          <div className="rail-card rail-ranks">
            <div className="rail-head">
              <span className="rail-title">LIVE RANK</span>
              <span className="live-dot" />
            </div>
            <LiveRankList ranked={ranked} />
          </div>
          <div className="rail-card rail-feed">
            <div className="rail-head">
              <span className="rail-title">ARENA FEED</span>
              <span className="mono rail-sub">{eventFeed.length} events</span>
            </div>
            <EventFeed feed={eventFeed} />
          </div>
        </aside>
      </main>

      <CelebrationLayer pulse={pulse} timeSec={results[results.length - 1]?.timeSec} />
    </div>
  );
}

// ─── Special Event Join Modal ─────────────────────────────────────────────────
export function SpecialEventJoinModal({ event, onClose, onJoin }: {
  event: SpecialEvent; onClose: () => void; onJoin: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const labels: Record<string, string> = { series: "100-DAY SERIES", rivalry: "CITY RIVALRY", theme: "THEMED SPRINT" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 440, background: "var(--bg-1)", borderRadius: 22, overflow: "hidden", border: "1px solid var(--line-1)", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 24px 20px", background: `linear-gradient(135deg, ${event.color}18, transparent)`, borderBottom: "1px solid var(--line-1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: event.color, fontWeight: 700 }}>{labels[event.type] || "SPECIAL EVENT"}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-3)" }}><Icons.X size={16} /></button>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>{event.title}</div>
          <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>{event.desc}</div>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: 12, border: "1px solid var(--line-1)" }}>
              <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Participants</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{event.participants.toLocaleString("en-IN")}</div>
            </div>
            <div style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: 12, border: `1px solid ${event.color}33` }}>
              <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Reward</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: event.color, lineHeight: 1.3 }}>{event.reward}</div>
            </div>
          </div>
          <div style={{ padding: 14, background: "var(--bg-2)", borderRadius: 12, border: "1px solid var(--line-1)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="eyebrow" style={{ fontSize: 9 }}>Commitment</div>
            {["Daily participation required — missing 3 days disqualifies you", "No external help, AI tools, or collaboration", "Rankings reset each week — consistency matters", "Results are final; disputes reviewed within 48h"].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "var(--fg-3)", flexShrink: 0, marginTop: 2 }}><Icons.X size={11} /></span>
                <span style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.4 }}>{r}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setAgreed(a => !a)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${agreed ? event.color : "var(--line-2)"}`, background: agreed ? event.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              {agreed && <Icons.Check size={12} style={{ color: "#fff" }} />}
            </div>
            <span style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.4 }}>I understand the commitment and rules of this event</span>
          </button>
          <button onClick={onJoin} disabled={!agreed} className="btn btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: 14, opacity: agreed ? 1 : 0.45, cursor: agreed ? "pointer" : "not-allowed" }}>
            Join event — {event.participants.toLocaleString("en-IN")} competing
          </button>
        </div>
      </div>
    </div>
  );
}
