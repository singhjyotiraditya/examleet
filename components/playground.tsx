"use client";
import React, { useState, useEffect, useRef } from "react";
import { SUBJECTS } from "@/lib/data";
import { SubjectIcon, DifficultyChip, FigureSlot, Sparkline, isEquation, MathText, Icons } from "./shared";
import { authFetch } from "@/lib/auth";
import type { Problem } from "@/lib/data";
import { computePreview, DAILY_PICK_RATING_WEIGHT } from "@/lib/ratingFormula";

interface PlaygroundProps {
  problem: Problem;
  onBack: () => void;
  onNext: () => void;
  onPrev?: () => void;
  queueLabel?: string;
  isGuest: boolean;
  requireAuth: (key: string, cb?: () => void) => boolean;
  isDesktop?: boolean;
  userRating?: number;
  onFirstSolve?: () => void;
  isDailyPick?: boolean;
}

const REPORT_CATEGORIES = ["Wrong answer", "Typo / Error", "Missing figure", "Bad solution", "Other"] as const;
type ReportCategory = typeof REPORT_CATEGORIES[number];

interface ApiHint { orderIndex: number; hintText: string; }

export default function Playground({ problem: initial, onBack, onNext, onPrev, queueLabel, isGuest, requireAuth, isDesktop, userRating = 1200, onFirstSolve, isDailyPick = false }: PlaygroundProps) {
  const [problem, setProblem] = useState(initial);
  const [pTab, setPTab] = useState<"problem" | "hint" | "solution">("problem");
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [numericalInput, setNumericalInput] = useState("");
  const [hintLevel, setHintLevel] = useState(0);
  const [solRevealed, setSolRevealed] = useState(false);
  const [bookmarked, setBookmarked] = useState(initial.bookmarked);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(true);
  const [hints, setHints] = useState<ApiHint[] | null>(null);
  const [solution, setSolution] = useState<string[] | null>(null);
  const [hintsLoading, setHintsLoading] = useState(false);
  const [solLoading, setSolLoading] = useState(false);
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);
  const [serverCorrect, setServerCorrect] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previouslyAttempted, setPreviouslyAttempted] = useState(() => initial.solved);
  const [retrying, setRetrying] = useState(() => initial.solved);
  const [autoSkipMins, setAutoSkipMins] = useState<null | 2 | 3 | 5 | 10>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const isPractice = retrying;

  useEffect(() => {
    if (!running || isPractice) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [running, isPractice]);

  useEffect(() => {
    if (!autoSkipMins || isPractice || submitted) return;
    if (timer >= autoSkipMins * 60) onNext();
  }, [timer, autoSkipMins, isPractice, submitted, onNext]);

  useEffect(() => {
    setProblem(initial);
    setPTab("problem");
    setSelected(null);
    setNumericalInput("");
    setSubmitted(false);
    setHintLevel(0);
    setSolRevealed(false);
    setBookmarked(initial?.bookmarked || false);
    setTimer(0);
    setHints(null);
    setSolution(null);
    setRatingDelta(null);
    setServerCorrect(null);
    setSubmitting(false);
    setPreviouslyAttempted(initial.solved);
    setRetrying(initial.solved);
  }, [initial?.id, initial.solved]);

  // First attempt locks rating; any prior attempt → practice retry only
  useEffect(() => {
    if (isGuest) return;
    authFetch(`/api/attempts?questionId=${initial.id}&limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const items = json?.data?.items ?? [];
        const attempted = items.length > 0;
        setPreviouslyAttempted(attempted);
        if (attempted) setRetrying(true);
      })
      .catch(() => null);
  }, [initial?.id, isGuest]);

  const loadHints = () => {
    if (hints !== null || hintsLoading) return;
    setHintsLoading(true);
    authFetch(`/api/questions/${problem.id}/hints`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setHints(json.data); })
      .catch(() => null)
      .finally(() => setHintsLoading(false));
  };

  const loadSolution = () => {
    if (solution !== null || solLoading) return;
    setSolLoading(true);
    authFetch(`/api/questions/${problem.id}/solution`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const steps = json?.data?.solution;
        if (Array.isArray(steps)) setSolution(steps);
      })
      .catch(() => null)
      .finally(() => setSolLoading(false));
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const subj = SUBJECTS[problem.subject];
  const isNumerical = problem.options.length === 0;
  const numericalCorrect = parseFloat(problem.correct);
  const clientCorrect = isNumerical
    ? !isNaN(numericalCorrect) && Math.abs(parseFloat(numericalInput) - numericalCorrect) < 1e-6
    : selected === problem.correct;
  const isCorrect = submitted && (serverCorrect ?? clientCorrect);

  // Live rating preview — recomputed on every render (timer ticks every second,
  // but timeFactor only changes at discrete thresholds so the number is stable).
  const ratingWeight = isDailyPick && !isPractice ? DAILY_PICK_RATING_WEIGHT : 1;
  const ratingPreview = !submitted && !isGuest && !isPractice
    ? computePreview({
        userRating,
        difficulty: problem.difficulty,
        isNumerical,
        timeTakenSec: timer,
        avgTimeSec: problem.avgTimeSec || null,
        hintsUsed: hintLevel,
        ratingWeight,
      })
    : null;

  // What they'd earn if they reveal one more hint (only on correct)
  const nextHintCorrect = ratingPreview && hintLevel < 2
    ? computePreview({
        userRating,
        difficulty: problem.difficulty,
        isNumerical,
        timeTakenSec: timer,
        avgTimeSec: problem.avgTimeSec || null,
        hintsUsed: hintLevel + 1,
        ratingWeight,
      }).correct
    : null;

  const handleHintTab = () => {
    if (isGuest) { requireAuth("hint", () => { loadHints(); setPTab("hint"); }); }
    else { loadHints(); setPTab("hint"); }
  };
  const handleSolTab = () => {
    if (!submitted && !isPractice) return;
    if (isGuest) { requireAuth("solution", () => setPTab("solution")); }
    else setPTab("solution");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setRunning(false);
    setSubmitting(true);
    setSubmitted(true);
    if (!isGuest) {
      try {
        const body: Record<string, unknown> = {
          questionId: problem.id,
          timeTakenSec: timer,
          sessionType: isDailyPick ? "daily_pick" : "practice",
          hintsUsed: hintLevel,   // only non-last hints (last is locked pre-submit)
        };
        if (isNumerical) {
          body.numericalInput = parseFloat(numericalInput);
        } else {
          body.selectedOption = selected;
        }
        if (isPractice) {
          body.skipRating = true;
        }
        const res = await authFetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const json = await res.json();
          const data = json?.data;
          if (typeof data?.isCorrect === "boolean") setServerCorrect(data.isCorrect);
          if (data?.ratingDelta != null) setRatingDelta(data.ratingDelta);
          if (data?.firstAttempt || data?.ratingDelta != null) onFirstSolve?.();
          if (data?.firstAttempt || data?.ratingLocked) setPreviouslyAttempted(true);
        }
      } catch {}
    }
    setSubmitting(false);
  };

  const revealAnswer = submitted && !isPractice;

  if (isDesktop) {
    return (
      <div style={{ minHeight: "100%", background: "var(--bg-0)", position: "relative" }}>
        <div className="pg-desktop">
          {/* LEFT panel: problem statement */}
          <div className="pg-panel">
            <div className="pg-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <button onClick={onBack} className="btn btn-ghost" style={{ padding: 8, color: "var(--fg-2)", flexShrink: 0 }}>
                  <Icons.ArrowLeft size={17} />
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{problem.code}</span>
                    <span style={{ color: "var(--fg-4)", fontSize: 10 }}>·</span>
                    <span style={{ fontSize: 11, color: "var(--fg-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{problem.exam}</span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 340 }}>{problem.title}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <DifficultyChip d={problem.difficulty} />
                <button onClick={() => requireAuth("bookmark", () => setBookmarked(b => !b))} className="btn btn-ghost" style={{ padding: 9, color: bookmarked ? "var(--accent)" : "var(--fg-2)" }}>
                  {bookmarked ? <Icons.BookmarkFill size={16} /> : <Icons.Bookmark size={16} />}
                </button>
                <Tooltip text="Report an issue" side="bottom">
                  <button onClick={() => setReportOpen(true)} className="btn btn-ghost" style={{ padding: 9, color: "var(--fg-3)" }}>
                    <Icons.Flag size={16} />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="pg-panel-body">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <SubjectIcon subject={problem.subject} size={32} />
                <div className="serif" style={{ fontSize: 30, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{problem.title}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
                <span className="chip chip-mono"><span className={`subj-${subj.cls}`}>●</span> {subj.name}</span>
                <span className="chip chip-mono">{problem.chapter}</span>
                <span className="chip chip-mono">{problem.acceptance}% pass rate</span>
                <span className="chip chip-mono">~{problem.avgTime} avg</span>
              </div>
              <MathText text={problem.body} style={{ fontSize: 15.5, lineHeight: 1.75, color: "var(--fg-1)", marginBottom: 28, letterSpacing: "-0.003em", display: "block" }} />
              {problem.figure && <FigureSlot label="Figure 1" caption={problem.figure.caption} />}
              <div style={{ display: "flex", gap: 6, marginTop: 22, flexWrap: "wrap" }}>
                {problem.tags.map(t => <span key={t} className="chip" style={{ background: "transparent", fontSize: 10.5 }}>#{t.toLowerCase().replace(/\s+/g, "-")}</span>)}
              </div>
              <CommunitySection problem={problem} isGuest={isGuest} requireAuth={requireAuth} />
            </div>
          </div>

          {/* RIGHT panel: answer + hints + solution */}
          <div className="pg-panel">
            <div className="pg-panel-header">
              <div className="pg-tabs-side">
                <button className={`pg-tab-side${pTab === "problem" ? " active" : ""}`} onClick={() => setPTab("problem")}>
                  <Icons.Book size={13} /> Solve
                </button>
                <button className={`pg-tab-side${pTab === "hint" ? " active" : ""}`} onClick={handleHintTab}>
                  <Icons.Lightbulb size={13} /> Hints
                  {hintLevel > 0 && <span className="dot" style={{ background: "var(--accent)" }} />}
                </button>
                <button className={`pg-tab-side${pTab === "solution" ? " active" : ""}`} onClick={handleSolTab} style={{ opacity: (submitted || isPractice) ? 1 : 0.4, cursor: (submitted || isPractice) ? "pointer" : "not-allowed" }}>
                  <Icons.Sparkle size={13} /> Solution {!submitted && !isPractice && <Icons.Lock size={11} />}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!isPractice && (
                  <>
                    <div className="mono" style={{ fontSize: 13, color: running ? "var(--fg-0)" : "var(--fg-3)", padding: "7px 12px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--line-1)", display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <button onClick={() => setRunning(r => !r)} style={{ display: "inline-flex", color: "var(--fg-2)" }}>
                        {running ? <Icons.Pause size={12} /> : <Icons.Play size={12} />}
                      </button>
                      {fmt(timer)}
                    </div>
                    <AutoSkipButton autoSkipMins={autoSkipMins} timer={timer} onSelect={setAutoSkipMins} fmt={fmt} />
                  </>
                )}
                {isPractice && (
                  <span className="chip chip-mono" style={{ fontSize: 10.5, color: "var(--fg-2)" }}>Practice</span>
                )}
                {queueLabel && (
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{queueLabel}</span>
                )}
              </div>
            </div>

            <div className="pg-panel-body" key={pTab}>
              {pTab === "problem" && (
                <>
                  {isPractice && !submitted && (
                    <div style={{ marginBottom: 14, padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--line-1)", borderRadius: 10, fontSize: 12, color: "var(--fg-2)" }}>
                      Practice mode — rating won&apos;t change. Open Solution when you&apos;re ready.
                    </div>
                  )}
                  {isNumerical ? (
                    <>
                      <div className="eyebrow" style={{ marginBottom: 14 }}>Enter your answer</div>
                      <input
                        type="number"
                        value={numericalInput}
                        onChange={e => setNumericalInput(e.target.value)}
                        disabled={submitted}
                        placeholder="Type a number…"
                        style={{ width: "100%", padding: "12px 14px", fontSize: 16, background: "var(--bg-2)", border: "1.5px solid var(--line-2)", borderRadius: 12, color: "var(--fg-0)", outline: "none", boxSizing: "border-box" }}
                      />
                    </>
                  ) : (
                    <>
                      <div className="eyebrow" style={{ marginBottom: 14 }}>Choose one</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {problem.options.map(opt => {
                          const isSel = selected === opt.id;
                          const isC = revealAnswer && opt.id === problem.correct;
                          const isW = revealAnswer && isSel && opt.id !== problem.correct;
                          let cls = "mcq";
                          if (isC) cls += " correct"; else if (isW) cls += " wrong"; else if (isSel) cls += " selected";
                          return (
                            <button key={opt.id} className={cls} disabled={submitted} onClick={() => setSelected(opt.id)}>
                              <span className="mcq-letter">{opt.id.toUpperCase()}</span>
                              <MathText text={opt.text} style={{ fontSize: 14, lineHeight: 1.5, flex: 1, letterSpacing: 0 }} />
                              {isC && <Icons.Check size={16} style={{ color: "var(--easy)", flexShrink: 0 }} />}
                              {isW && <Icons.X size={16} style={{ color: "var(--hard)", flexShrink: 0 }} />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {!submitted ? (
                    <>
                      {ratingPreview && (
                        <RatingPreviewBar correct={ratingPreview.correct} wrong={ratingPreview.wrong} hintsUsed={hintLevel} style={{ marginTop: 18 }} />
                      )}
                      <SubmitNextRow
                        onSubmit={handleSubmit}
                        onNext={onNext}
                        onPrev={onPrev}
                        submitting={submitting}
                        canSubmit={isNumerical ? !!numericalInput.trim() : !!selected}
                        submitLabel={isPractice ? "Check" : "Submit"}
                        style={{ marginTop: 10 }}
                      />
                    </>
                  ) : (
                    <VerdictCard
                      isCorrect={isCorrect}
                      isPractice={isPractice}
                      ratingDelta={ratingDelta}
                      timer={fmt(timer)}
                      correctLabel={isNumerical ? (isNaN(numericalCorrect) ? "—" : problem.correct) : `(${problem.correct.toUpperCase()})`}
                      onSolution={() => setPTab("solution")}
                      onTryAgain={() => { setSubmitted(false); setSelected(null); setNumericalInput(""); setServerCorrect(null); setRatingDelta(null); }}
                    />
                  )}

                  <div style={{ marginTop: 22, padding: 14, background: "var(--bg-2)", borderRadius: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    <PgKpi label="Accuracy" value="68%" />
                    <PgKpi label="Avg time" value={problem.avgTime} />
                    <PgKpi label="Attempts" value={problem.attempts} />
                  </div>
                </>
              )}

              {pTab === "hint" && <HintView problem={problem} hints={hints} loading={hintsLoading} hintLevel={hintLevel} onAdvance={() => setHintLevel(l => Math.min(l + 1, (hints?.length ?? 3) - 1))} onSwitchToSolution={() => setPTab("solution")} submitted={submitted} previouslyAttempted={isPractice} currentGain={ratingPreview?.correct ?? null} nextHintGain={nextHintCorrect} />}
              {pTab === "solution" && <SolutionView problem={problem} steps={solution} loading={solLoading} revealed={solRevealed} onReveal={() => { setSolRevealed(true); loadSolution(); }} />}
            </div>
          </div>
        </div>
        {reportOpen && <ReportModal problemId={problem.id} onClose={() => setReportOpen(false)} />}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="screen">
        {/* Top bar */}
        <div className="app-header" style={{ padding: "16px 18px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: "8px 12px 8px 8px", gap: 4, border: "1px solid var(--line-1)" }}>
              <Icons.ArrowLeft size={15} /><span style={{ fontSize: 13 }}>Back</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {!isPractice ? (
                <>
                  <div className="mono" style={{ fontSize: 12, color: running ? "var(--fg-1)" : "var(--fg-3)", padding: "7px 11px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--line-1)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setRunning(r => !r)} style={{ display: "inline-flex", color: "var(--fg-2)" }}>
                      {running ? <Icons.Pause size={12} /> : <Icons.Play size={12} />}
                    </button>
                    {fmt(timer)}
                  </div>
                  <AutoSkipButton autoSkipMins={autoSkipMins} timer={timer} onSelect={setAutoSkipMins} fmt={fmt} />
                </>
              ) : (
                <span className="chip chip-mono" style={{ fontSize: 10.5, color: "var(--fg-2)" }}>Practice</span>
              )}
              <button onClick={() => requireAuth("bookmark", () => setBookmarked(b => !b))} className="btn btn-ghost" style={{ padding: 9, color: bookmarked ? "var(--accent)" : "var(--fg-2)" }}>
                {bookmarked ? <Icons.BookmarkFill size={17} /> : <Icons.Bookmark size={17} />}
              </button>
              <Tooltip text="Report an issue" side="bottom">
                <button onClick={() => setReportOpen(true)} className="btn btn-ghost" style={{ padding: 9, color: "var(--fg-3)" }}>
                  <Icons.Flag size={16} />
                </button>
              </Tooltip>
              {queueLabel && (
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{queueLabel}</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 14, paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <SubjectIcon subject={problem.subject} size={28} />
              <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{problem.code}</span>
              <span style={{ fontSize: 10.5, color: "var(--fg-3)" }}>·</span>
              <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{problem.exam}</span>
            </div>
            <div className="serif" style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.05, marginBottom: 10, letterSpacing: "-0.02em" }}>{problem.title}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <DifficultyChip d={problem.difficulty} />
              <span className="chip chip-mono"><span className={`subj-${subj.cls}`}>●</span> {subj.name}</span>
              <span className="chip chip-mono">{problem.chapter}</span>
              <span className="chip chip-mono">{problem.acceptance}%</span>
            </div>
          </div>

          <div className="tabs" style={{ marginTop: 14 }}>
            <button className={`tab${pTab === "problem" ? " active" : ""}`} onClick={() => setPTab("problem")}>
              <Icons.Book size={13} /> Problem
            </button>
            <button className={`tab${pTab === "hint" ? " active" : ""}`} onClick={handleHintTab}>
              <Icons.Lightbulb size={13} /> Hint
              {hintLevel > 0 && <span className="dot" style={{ background: "var(--accent)" }} />}
            </button>
            <button className={`tab${pTab === "solution" ? " active" : ""}`} onClick={handleSolTab} style={{ opacity: (submitted || isPractice) ? 1 : 0.4, cursor: (submitted || isPractice) ? "pointer" : "not-allowed" }}>
              <Icons.Sparkle size={13} /> Solution {!submitted && !isPractice && <Icons.Lock size={11} />}
            </button>
          </div>
        </div>

        <div style={{ padding: "18px 18px 240px" }} key={pTab}>
          {pTab === "problem" && <ProblemView problem={problem} selected={selected} onSelect={setSelected} submitted={submitted} revealAnswer={revealAnswer} correct={problem.correct} numericalInput={numericalInput} onNumericalChange={setNumericalInput} />}
          {pTab === "hint" && <HintView problem={problem} hints={hints} loading={hintsLoading} hintLevel={hintLevel} onAdvance={() => setHintLevel(l => Math.min(l + 1, (hints?.length ?? 3) - 1))} onSwitchToSolution={() => setPTab("solution")} submitted={submitted} previouslyAttempted={isPractice} currentGain={ratingPreview?.correct ?? null} nextHintGain={nextHintCorrect} />}
          {pTab === "solution" && <SolutionView problem={problem} steps={solution} loading={solLoading} revealed={solRevealed} onReveal={() => { setSolRevealed(true); loadSolution(); }} />}
        </div>
      </div>

      {/* Action footer */}
      {pTab === "problem" && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 16px 28px", background: "linear-gradient(180deg, transparent, var(--bg-0) 28%)", zIndex: 20, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            {!submitted ? (
              <>
                {ratingPreview && (
                  <RatingPreviewBar correct={ratingPreview.correct} wrong={ratingPreview.wrong} hintsUsed={hintLevel} style={{ marginBottom: 10 }} />
                )}
                <SubmitNextRow
                  onSubmit={handleSubmit}
                  onNext={onNext}
                  onPrev={onPrev}
                  submitting={submitting}
                  canSubmit={isNumerical ? !!numericalInput.trim() : !!selected}
                  submitLabel={isPractice ? "Submit practice attempt" : "Submit answer"}
                />
              </>
            ) : (
              <VerdictCard
                isCorrect={isCorrect}
                isPractice={isPractice}
                ratingDelta={ratingDelta}
                timer={fmt(timer)}
                correctLabel={isNumerical ? problem.correct : `(${problem.correct.toUpperCase()})`}
                onSolution={() => setPTab("solution")}
                onTryAgain={() => { setSubmitted(false); setSelected(null); setNumericalInput(""); setServerCorrect(null); setRatingDelta(null); }}
                compact
              />
            )}
          </div>
        </div>
      )}
      {reportOpen && <ReportModal problemId={problem.id} onClose={() => setReportOpen(false)} />}
    </div>
  );
}

function VerdictCard({ isCorrect, isPractice, ratingDelta, timer, correctLabel, onSolution, onTryAgain, compact }: {
  isCorrect: boolean; isPractice: boolean; ratingDelta: number | null; timer: string; correctLabel: string;
  onSolution: () => void; onTryAgain: () => void; compact?: boolean;
}) {
  const showEasy = isCorrect;
  const showHard = !isPractice && !isCorrect;
  const bg = showEasy
    ? "color-mix(in srgb, var(--easy) 8%, var(--bg-1))"
    : showHard
      ? "color-mix(in srgb, var(--hard) 6%, var(--bg-1))"
      : "var(--bg-2)";
  const border = showEasy
    ? "color-mix(in srgb, var(--easy) 35%, transparent)"
    : showHard
      ? "color-mix(in srgb, var(--hard) 35%, transparent)"
      : "var(--line-1)";
  const iconBg = showEasy ? "var(--easy)" : showHard ? "var(--hard)" : "var(--fg-3)";

  let title = "Correct";
  let detail = `Solved in ${timer}${ratingDelta != null ? ` · ${ratingDelta >= 0 ? "+" : ""}${ratingDelta} rating` : ""}`;
  if (isPractice) {
    title = isCorrect ? "Correct" : "Not quite";
    detail = isCorrect ? "Nice — got it this time." : "Check the Solution tab when you're ready.";
  } else if (!isCorrect) {
    title = "Incorrect — attempted";
    detail = `Correct: ${correctLabel}${ratingDelta != null ? ` · ${ratingDelta >= 0 ? "+" : ""}${ratingDelta} rating` : ""}`;
  }

  return (
    <div className="fade-up" style={{ marginTop: compact ? 0 : 22, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 14, padding: compact ? "14px 16px" : "16px 18px", background: bg, border: `1px solid ${border}`, borderRadius: compact ? 18 : 16, boxShadow: compact ? "var(--shadow-md)" : undefined }}>
        <div style={{ width: compact ? 34 : 38, height: compact ? 34 : 38, borderRadius: "50%", background: iconBg, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isCorrect ? <Icons.Check size={compact ? 17 : 18} /> : showHard ? <Icons.X size={compact ? 17 : 18} /> : <Icons.X size={compact ? 17 : 18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: compact ? 13.5 : 15, fontWeight: 600, marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: compact ? 11.5 : 12.5, color: "var(--fg-2)" }}>{detail}</div>
        </div>
        <button onClick={onSolution} className="btn btn-sm" style={{ flexShrink: 0, background: "var(--bg-1)", border: "1px solid var(--line-2)", fontSize: compact ? 12 : undefined }}>
          {compact ? "View" : "View walkthrough"} <Icons.ArrowRight size={compact ? 12 : 13} />
        </button>
      </div>
      {isPractice && (
        <button onClick={onTryAgain} className="btn btn-ghost btn-block btn-sm" style={{ fontSize: 12, color: "var(--fg-2)" }}>
          Try again
        </button>
      )}
    </div>
  );
}

function ProblemView({ problem, selected, onSelect, submitted, revealAnswer, correct, numericalInput, onNumericalChange }: {
  problem: Problem; selected: string | null; onSelect: (id: string) => void; submitted: boolean; revealAnswer: boolean; correct: string;
  numericalInput: string; onNumericalChange: (v: string) => void;
}) {
  const isNumerical = problem.options.length === 0;
  return (
    <div>
      <MathText text={problem.body} style={{ fontSize: 15, lineHeight: 1.7, color: "var(--fg-1)", marginBottom: 20, letterSpacing: "-0.005em", display: "block" }} />
      {problem.figure && <FigureSlot label="Figure 1" caption={problem.figure.caption} />}
      {isNumerical ? (
        <>
          <div className="eyebrow" style={{ marginBottom: 12, marginTop: 24 }}>Enter your answer</div>
          <input
            type="number"
            value={numericalInput}
            onChange={e => onNumericalChange(e.target.value)}
            disabled={submitted}
            placeholder="Type a number…"
            style={{ width: "100%", padding: "12px 14px", fontSize: 16, background: "var(--bg-1)", border: "1.5px solid var(--line-2)", borderRadius: 12, color: "var(--fg-0)", outline: "none", boxSizing: "border-box" }}
          />
        </>
      ) : (
        <>
          <div className="eyebrow" style={{ marginBottom: 12, marginTop: 24 }}>Choose one</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {problem.options.map(opt => {
              const isSel = selected === opt.id;
              const isC = revealAnswer && opt.id === correct;
              const isW = revealAnswer && isSel && opt.id !== correct;
              let cls = "mcq";
              if (isC) cls += " correct"; else if (isW) cls += " wrong"; else if (isSel) cls += " selected";
              return (
                <button key={opt.id} className={cls} disabled={submitted} onClick={() => onSelect(opt.id)}>
                  <span className="mcq-letter">{opt.id.toUpperCase()}</span>
                  <MathText text={opt.text} style={{ fontSize: 14, lineHeight: 1.5, flex: 1, letterSpacing: 0 }} />
                  {isC && <Icons.Check size={16} style={{ color: "var(--easy)", flexShrink: 0 }} />}
                  {isW && <Icons.X size={16} style={{ color: "var(--hard)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 22, flexWrap: "wrap" }}>
        {problem.tags.map(t => <span key={t} className="chip" style={{ background: "transparent", fontSize: 10.5 }}>#{t.toLowerCase().replace(/\s+/g, "-")}</span>)}
      </div>
      <div style={{ marginTop: 22, padding: 14, background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 3 }}>Community</div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-2)" }}>{problem.attempts} attempts · avg {problem.avgTime}</div>
        </div>
        <Sparkline data={[8, 11, 9, 14, 16, 13, 18, 20, 19, 22]} w={70} h={22} color="var(--accent)" />
      </div>
    </div>
  );
}

const HINT_LABELS = ["Nudge", "Key idea", "Almost there"];

function HintView({ hints, loading, hintLevel, onAdvance, onSwitchToSolution, submitted, previouslyAttempted, currentGain, nextHintGain }: {
  problem: Problem; hints: ApiHint[] | null; loading: boolean;
  hintLevel: number; onAdvance: () => void; onSwitchToSolution: () => void; submitted: boolean; previouslyAttempted?: boolean;
  currentGain: number | null; nextHintGain: number | null;
}) {
  if (loading) {
    return <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>Loading hints…</div>;
  }
  if (!hints || hints.length === 0) {
    return <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>No hints available.</div>;
  }
  const sorted = [...hints].sort((a, b) => a.orderIndex - b.orderIndex);
  // Before submitting, cap at second-to-last hint; previouslyAttempted unlocks all
  const maxUnlocked = (submitted || previouslyAttempted) ? sorted.length - 1 : Math.max(0, sorted.length - 2);
  const effectiveLevel = Math.min(hintLevel, maxUnlocked);
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <Icons.Lightbulb size={12} /> Progressive hints
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((h, i) => {
          const isLastHint = i === sorted.length - 1;
          const lockedByAttempt = isLastHint && !submitted;
          const open = !lockedByAttempt && i <= effectiveLevel;
          const label = HINT_LABELS[i] ?? `Hint ${i + 1}`;
          return (
            <div key={h.orderIndex} className="card" style={{ padding: 16, borderColor: open ? "var(--line-2)" : "var(--line-1)", opacity: open ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: open ? 8 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 7, background: open ? "var(--accent-soft)" : "var(--bg-3)", color: open ? "var(--accent)" : "var(--fg-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, fontFamily: "var(--mono)" }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                </div>
                {!open && <span style={{ fontSize: 11, color: "var(--fg-3)", display: "inline-flex", alignItems: "center", gap: 4 }}>{lockedByAttempt ? <><Icons.Lock size={11} /> Attempt first</> : "Locked"}</span>}
              </div>
              {open && <div className="fade-up" style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--fg-1)" }}><MathText text={h.hintText} /></div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
        {effectiveLevel < maxUnlocked && (
          <>
            {!submitted && currentGain != null && nextHintGain != null && (
              <div style={{ padding: "9px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--hard) 6%, var(--bg-2))", border: "1px solid color-mix(in srgb, var(--hard) 20%, transparent)", display: "flex", alignItems: "center", gap: 10 }}>
                <Icons.Lightbulb size={13} style={{ color: "var(--hard)", flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: "var(--fg-1)", lineHeight: 1.4 }}>
                  Using this hint reduces your gain:{" "}
                  <span style={{ fontFamily: "var(--mono)", color: "var(--easy)", fontWeight: 600 }}>+{currentGain}</span>
                  {" → "}
                  <span style={{ fontFamily: "var(--mono)", color: nextHintGain >= currentGain ? "var(--easy)" : "var(--hard)", fontWeight: 600 }}>+{nextHintGain}</span>
                  {" "}
                  <span style={{ color: "var(--fg-3)" }}>
                    (−{Math.round((1 - nextHintGain / currentGain) * 100)}% if correct)
                  </span>
                </div>
              </div>
            )}
            <button onClick={onAdvance} className="btn btn-block" style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
              Reveal next hint <Icons.ArrowDown size={14} />
            </button>
          </>
        )}
        {submitted && <button onClick={onSwitchToSolution} style={{ fontSize: 12.5, color: "var(--fg-2)", padding: 10 }}>Show solution</button>}
      </div>
    </div>
  );
}

function SolutionView({ problem, steps, loading, revealed, onReveal }: { problem: Problem; steps: string[] | null; loading: boolean; revealed: boolean; onReveal: () => void }) {
  if (!revealed) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--bg-2)", border: "1px solid var(--line-2)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Icons.Sparkle size={24} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Try first, then peek.</div>
        <div style={{ fontSize: 13, color: "var(--fg-2)", maxWidth: 280, lineHeight: 1.5, marginBottom: 22 }}>Solutions are best after a real attempt. You'll retain the method 4× better.</div>
        <button className="btn btn-primary" onClick={onReveal}>Reveal walkthrough</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--line-1)" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "color-mix(in srgb, var(--easy) 15%, transparent)", color: "var(--easy)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icons.Check size={15} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 3 }}>Answer</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>({problem.correct.toUpperCase()})</span>
            <MathText text={problem.options.find(o => o.id === problem.correct)?.text ?? ""} style={{ fontSize: 14.5, color: "var(--fg-0)" }} />
          </div>
        </div>
      </div>
      <div className="eyebrow" style={{ marginBottom: 14 }}>Step-by-step</div>
      {loading && <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>Loading solution…</div>}
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
        {(steps ?? []).map((step, i) => (
          <li key={i} style={{ display: "flex", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--line-2)", color: "var(--fg-1)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600, fontFamily: "var(--mono)" }}>{i + 1}</div>
              {i < (steps?.length ?? 1) - 1 && <div style={{ width: 1, flex: 1, minHeight: 18, background: "var(--line-1)", marginTop: 4 }} />}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--fg-1)", paddingBottom: 6, flex: 1, minWidth: 0 }}>
              <MathText text={step} prose />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const TAG_OPTIONS = ["Approach", "Common mistake", "Memory tip", "Question"] as const;
const TAG_COLORS: Record<string, string> = {
  "Approach": "var(--phy)",
  "Common mistake": "var(--hard)",
  "Memory tip": "var(--easy)",
  "Question": "var(--fg-3)",
};

function nameToHue(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

interface CommunityNote {
  id: string;
  body: string;
  tag: string | null;
  upvoteCount: number;
  hasUpvoted: boolean;
  createdAt: string;
  user: { name: string; handle: string };
}

function CommunitySection({ problem, isGuest, requireAuth }: { problem: Problem; isGuest: boolean; requireAuth: (k: string, cb?: () => void) => boolean }) {
  const [notes, setNotes] = React.useState<CommunityNote[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [showCompose, setShowCompose] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    authFetch(`/api/questions/${problem.id}/community?limit=10`)
      .then(r => r.json())
      .then(json => { if (!cancelled) { setNotes(json.data.notes); setTotal(json.data.total); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [problem.id]);

  const doUpvote = async (noteId: string) => {
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, hasUpvoted: !n.hasUpvoted, upvoteCount: n.upvoteCount + (n.hasUpvoted ? -1 : 1) } : n
    ));
    try {
      const res = await authFetch(`/api/questions/${problem.id}/community/${noteId}/upvote`, { method: "POST" });
      const json = await res.json();
      if (json.data) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...json.data } : n));
      }
    } catch {
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, hasUpvoted: !n.hasUpvoted, upvoteCount: n.upvoteCount + (n.hasUpvoted ? -1 : 1) } : n
      ));
    }
  };

  const handleUpvote = (noteId: string) => {
    requireAuth("upvote", () => { doUpvote(noteId); });
  };

  const handleCompose = () => {
    requireAuth("comment", () => setShowCompose(true));
  };

  const handlePost = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      const res = await authFetch(`/api/questions/${problem.id}/community`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft, tag: selectedTag || undefined }),
      });
      if (res.ok) {
        const json = await res.json();
        setNotes(prev => [json.data, ...prev]);
        setTotal(t => t + 1);
        setShowCompose(false);
        setDraft("");
        setSelectedTag("");
      }
    } catch {}
    setPosting(false);
  };

  const loadMore = () => {
    authFetch(`/api/questions/${problem.id}/community?limit=50&offset=${notes.length}`)
      .then(r => r.json())
      .then(json => { if (json.data?.notes) setNotes(prev => [...prev, ...json.data.notes]); })
      .catch(() => {});
  };

  return (
    <div style={{ marginTop: 36, paddingTop: 28, borderTop: "1px solid var(--line-1)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em" }}>Community notes</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{problem.attempts} attempts</span>
            <span style={{ color: "var(--fg-4)", fontSize: 11 }}>·</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>avg {problem.avgTime}</span>
          </span>
          <Sparkline data={[8, 11, 9, 14, 16, 13, 18, 20, 19, 22]} w={48} h={16} color="var(--accent)" />
        </div>
        <button onClick={handleCompose} className="btn btn-sm" style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)", gap: 5, fontSize: 12, padding: "7px 12px" }}>
          <Icons.Edit size={12} /> Add note
        </button>
      </div>

      {/* Compose box */}
      {showCompose && (
        <div className="card fade-up" style={{ padding: 16, marginBottom: 16, border: "1px solid var(--line-2)" }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Share an approach, tip, or question about this problem…"
            style={{ width: "100%", minHeight: 88, fontSize: 13.5, lineHeight: 1.6, color: "var(--fg-1)", background: "transparent", border: "none", outline: "none", resize: "none", fontFamily: "var(--sans)" }}
            autoFocus
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {TAG_OPTIONS.map(t => {
              const active = selectedTag === t;
              const tc = TAG_COLORS[t] || "var(--fg-3)";
              return (
                <button key={t} onClick={() => setSelectedTag(active ? "" : t)}
                  style={{ fontSize: 10.5, fontFamily: "var(--mono)", padding: "3px 9px", borderRadius: 999, border: `1px solid ${active ? tc : "var(--line-2)"}`, background: active ? `color-mix(in srgb, ${tc} 12%, transparent)` : "transparent", color: active ? tc : "var(--fg-3)", cursor: "pointer" }}>
                  {t}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-1)" }}>
            <button onClick={() => { setShowCompose(false); setDraft(""); setSelectedTag(""); }} className="btn btn-sm btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
            <button onClick={handlePost} className="btn btn-sm btn-primary" disabled={!draft.trim() || posting} style={{ fontSize: 12, opacity: draft.trim() && !posting ? 1 : 0.4 }}>{posting ? "Posting…" : "Post note"}</button>
          </div>
        </div>
      )}

      {/* Posts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--fg-3)", fontSize: 13 }}>Loading…</div>
        ) : notes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--fg-3)", fontSize: 13 }}>No notes yet — be the first to add one!</div>
        ) : notes.map(note => {
          const hue = nameToHue(note.user.handle || note.user.name);
          const initials = note.user.name.split(" ").map((w: string) => w[0]).join("");
          const tagColor = note.tag ? (TAG_COLORS[note.tag] || "var(--fg-3)") : "var(--fg-3)";
          return (
            <div key={note.id} style={{ padding: "16px 18px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 14, display: "flex", gap: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, oklch(0.42 0.12 ${hue}), oklch(0.32 0.10 ${hue + 30}))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", letterSpacing: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-0)" }}>{note.user.name}</span>
                  {note.tag && (
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", fontWeight: 500, color: tagColor, background: `color-mix(in srgb, ${tagColor} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${tagColor} 22%, transparent)`, padding: "2px 7px", borderRadius: 999, letterSpacing: "0.04em" }}>
                      {note.tag}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--fg-4)", marginLeft: "auto" }}>{relativeTime(note.createdAt)} ago</span>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--fg-1)", marginBottom: 10 }}>{note.body}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => handleUpvote(note.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontFamily: "var(--mono)", color: note.hasUpvoted ? "var(--accent)" : "var(--fg-3)", padding: "4px 8px", borderRadius: 7, background: note.hasUpvoted ? "var(--accent-soft)" : "transparent", border: `1px solid ${note.hasUpvoted ? "color-mix(in srgb, var(--accent) 25%, transparent)" : "transparent"}`, transition: "all .15s" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={note.hasUpvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                    {note.upvoteCount.toLocaleString("en-IN")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {total > notes.length && (
        <button onClick={loadMore} style={{ marginTop: 14, width: "100%", padding: "10px 14px", fontSize: 12.5, color: "var(--fg-2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "1px solid var(--line-1)", borderRadius: 12, background: "var(--bg-1)" }}>
          See all {total} notes <Icons.ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function SubmitNextRow({
  onSubmit,
  onNext,
  onPrev,
  submitting,
  canSubmit,
  submitLabel,
  style,
}: {
  onSubmit: () => void;
  onNext: () => void;
  onPrev?: () => void;
  submitting: boolean;
  canSubmit: boolean;
  submitLabel: string;
  style?: React.CSSProperties;
}) {
  const navBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: "11px 16px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 999,
    border: "1px solid var(--line-2)",
    background: "var(--bg-1)",
    color: "var(--fg-1)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={submitting || !canSubmit}
        onClick={onSubmit}
        style={{
          width: "100%",
          justifyContent: "center",
          opacity: canSubmit ? 1 : 0.35,
          cursor: canSubmit ? "pointer" : "not-allowed",
          fontSize: 15,
          padding: "14px 20px",
        }}
      >
        {submitLabel} <Icons.ArrowRight size={16} />
      </button>
      <div style={{ display: "flex", gap: 8 }}>
        {onPrev ? (
          <button type="button" onClick={onPrev} className="btn" style={navBtnStyle}>
            <Icons.ArrowLeft size={14} /> Prev
          </button>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <button type="button" onClick={onNext} className="btn" style={navBtnStyle}>
          Next <Icons.ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

const AUTOSKIP_OPTION_VALUES = [null, 2, 3, 5, 10] as const;
type AutoSkipVal = null | 2 | 3 | 5 | 10;

function Tooltip({ text, children, side = "bottom" }: {
  text: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: "absolute",
          [side === "bottom" ? "top" : "bottom"]: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--fg-0)",
          color: "var(--bg-0)",
          fontSize: 10.5,
          fontFamily: "var(--mono)",
          padding: "4px 9px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 300,
          letterSpacing: "0.01em",
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

function AutoSkipButton({ autoSkipMins, timer, onSelect, fmt }: {
  autoSkipMins: AutoSkipVal;
  timer: number;
  onSelect: (v: AutoSkipVal) => void;
  fmt: (s: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const limit = autoSkipMins ? autoSkipMins * 60 : null;
  const remaining = limit !== null ? Math.max(0, limit - timer) : null;
  const urgent = remaining !== null && remaining <= 30;
  const critical = remaining !== null && remaining <= 10;

  const stateColor = critical
    ? "var(--hard)"
    : urgent
    ? "var(--medium)"
    : autoSkipMins
    ? "var(--accent)"
    : "var(--fg-3)";

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "6px 9px",
          borderRadius: 8,
          fontSize: 11,
          color: stateColor,
          border: `1px solid ${autoSkipMins ? stateColor : open ? "var(--line-3)" : "var(--line-1)"}`,
          background: autoSkipMins
            ? `color-mix(in srgb, ${stateColor} 10%, var(--bg-1))`
            : open ? "var(--bg-2)" : "transparent",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: "var(--mono)",
          cursor: "pointer",
          transition: "all .15s",
        }}
      >
        <Icons.Clock size={12} />
        <span>
          {autoSkipMins && remaining !== null ? fmt(remaining) : "auto"}
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "var(--bg-1)",
          border: "1px solid var(--line-2)",
          borderRadius: 14,
          padding: "16px",
          boxShadow: "0 8px 32px color-mix(in srgb, var(--fg-0) 16%, transparent)",
          zIndex: 200,
          minWidth: 220,
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-0)", marginBottom: 3 }}>
              Auto-skip
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.4 }}>
              Move to next question after this time
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {AUTOSKIP_OPTION_VALUES.map(v => {
              const active = autoSkipMins === v;
              return (
                <button
                  key={v ?? "off"}
                  type="button"
                  onClick={() => { onSelect(v); setOpen(false); }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "var(--mono)",
                    fontWeight: 600,
                    border: `1px solid ${active ? "var(--accent)" : "var(--line-2)"}`,
                    background: active ? "var(--accent-soft)" : "var(--bg-2)",
                    color: active ? "var(--accent)" : "var(--fg-1)",
                    cursor: "pointer",
                    transition: "all .12s",
                  }}
                >
                  {v === null ? "Off" : `${v} min`}
                </button>
              );
            })}
          </div>

          {autoSkipMins && remaining !== null && (
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--line-1)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontFamily: "var(--mono)",
              color: stateColor,
            }}>
              <Icons.Clock size={11} />
              Skips in {fmt(remaining)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportModal({ problemId, onClose }: { problemId: string; onClose: () => void }) {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!category || submitting) return;
    setSubmitting(true);
    try {
      await authFetch(`/api/questions/${problemId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, text: text.trim() }),
      });
      setDone(true);
    } catch { /* silent */ } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "color-mix(in srgb, var(--fg-0) 45%, transparent)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        animation: "fadeIn .18s ease forwards",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--line-2)",
          borderRadius: 20,
          padding: "24px 22px",
          width: "min(420px, 92vw)",
          boxShadow: "0 16px 48px color-mix(in srgb, var(--fg-0) 18%, transparent)",
          animation: "detailIn .25s cubic-bezier(0.16,1,.3,1) forwards",
        }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🙏</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-0)", marginBottom: 6 }}>Thanks for reporting</div>
            <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20, lineHeight: 1.5 }}>
              We review every report and fix issues quickly.
            </div>
            <button onClick={onClose} className="btn btn-primary" style={{ padding: "10px 28px" }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-0)", marginBottom: 3 }}>Report an issue</div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Help us keep the question bank accurate</div>
              </div>
              <button onClick={onClose} className="btn btn-ghost" style={{ padding: 7, color: "var(--fg-3)", borderRadius: 8 }}>
                <Icons.X size={15} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-2)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {REPORT_CATEGORIES.map(c => {
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 500,
                        border: `1px solid ${active ? "var(--accent)" : "var(--line-2)"}`,
                        background: active ? "var(--accent-soft)" : "var(--bg-2)",
                        color: active ? "var(--accent)" : "var(--fg-1)",
                        cursor: "pointer",
                        transition: "all .12s",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-2)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Details <span style={{ fontWeight: 400, color: "var(--fg-3)", textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Describe the problem — e.g. the correct answer should be B…"
                rows={3}
                style={{
                  width: "100%",
                  resize: "none",
                  fontSize: 13,
                  lineHeight: 1.5,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--line-2)",
                  background: "var(--bg-2)",
                  color: "var(--fg-0)",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} className="btn" style={{ padding: "9px 18px", fontSize: 13 }}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!category || submitting}
                className="btn btn-primary"
                style={{ padding: "9px 22px", fontSize: 13, opacity: category ? 1 : 0.4, cursor: category ? "pointer" : "not-allowed" }}
              >
                {submitting ? "Sending…" : "Send report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PgKpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, color: "var(--fg-0)", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function RatingPreviewBar({ correct, wrong, hintsUsed, style }: {
  correct: number; wrong: number; hintsUsed: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line-1)", ...style }}>
      <span style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--mono)", letterSpacing: "0.04em", flexShrink: 0 }}>RATING</span>
      <span style={{ fontSize: 12.5, fontFamily: "var(--mono)", color: "var(--easy)", fontWeight: 700 }}>+{correct}</span>
      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>correct</span>
      <span style={{ width: 1, height: 14, background: "var(--line-2)", flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontFamily: "var(--mono)", color: "var(--hard)", fontWeight: 700 }}>{wrong}</span>
      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>wrong</span>
      {hintsUsed > 0 && (
        <>
          <span style={{ width: 1, height: 14, background: "var(--line-2)", flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, color: "var(--fg-3)", display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Icons.Lightbulb size={10} />
            {hintsUsed === 1 ? "−15%" : "−30%"} gain
          </span>
        </>
      )}
    </div>
  );
}
