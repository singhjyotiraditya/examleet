"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { authFetch } from "@/lib/auth";
import { SUBJECTS, dbQuestionToProblem, SubjectId } from "@/lib/data";
import { AppBar, Icons, SubjectIcon, DifficultyChip } from "./shared";
import { ThemedSelect } from "./themed-select";
import type { Problem } from "@/lib/data";
import { computeForYouPrimary, forYouFeedMode } from "@/lib/for-you";
import type { ForYouPrimaryPick } from "@/lib/for-you";
import type { ChapterStat, SubjectPYQStat, YearStat } from "@/services/question.service";
import { buildPlayQueue } from "@/lib/playQueue";
import type { ProblemPlayQueue } from "@/lib/playQueue";

type OpenFn = (p: Problem, queue?: ProblemPlayQueue) => void;

const REASON_META = {
  weak:     { color: "var(--hard)",   icon: "⚡", label: "WEAK SPOT" },
  fresh:    { color: "var(--phy)",    icon: "✦",  label: "FRESH FROM 2024" },
  frequent: { color: "var(--accent)", icon: "★",  label: "FREQUENT" },
  review:   { color: "var(--chem)",   icon: "↻",  label: "REVISE" },
} as const;

// ─── Root ────────────────────────────────────────────────────────────────────

export default function PYQBrowser({
  onOpenProblem,
  isDesktop,
  isGuest = false,
  authReady = false,
  requireAuth,
}: {
  onOpenProblem: OpenFn;
  isDesktop?: boolean;
  isGuest?: boolean;
  /** False until parent has checked Supabase session (avoids guest tab flash while signed in). */
  authReady?: boolean;
  requireAuth?: (key: string, cb?: () => void) => boolean;
}) {
  const [tab, setTab] = useState<"all" | "foryou" | "chapters" | "years">("foryou");
  const authTabSynced = useRef(false);
  const [exam, setExam] = useState<"all" | "mains" | "advanced">("all");
  const [subj, setSubj] = useState<"all" | SubjectId>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"weak" | "alpha" | "most">("weak");
  const [openYear, setOpenYear] = useState<YearStat | null>(null);

  const [pyqStats, setPYQStats] = useState<Record<string, SubjectPYQStat>>({});
  const [yearStats, setYearStats] = useState<YearStat[]>([]);
  const [freshProblems, setFreshProblems] = useState<Problem[]>([]);
  const [forYouPrimary, setForYouPrimary] = useState<ForYouPrimaryPick | null>(null);
  const [forYouMode, setForYouMode] = useState<"cold" | "warm">("cold");
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [allOffset, setAllOffset] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [allHasMore, setAllHasMore] = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const allFetchGen = useRef(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!authReady) return;

    if (!authTabSynced.current) {
      authTabSynced.current = true;
      setTab(isGuest ? "all" : "foryou");
    } else if (isGuest) {
      setTab(t => (t === "foryou" || t === "chapters" || t === "years" ? "all" : t));
    } else {
      setTab(t => (t === "all" ? "foryou" : t));
    }
  }, [authReady, isGuest]);

  useEffect(() => {
    authFetch("/api/questions/pyq-stats")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const d = json?.data;
        if (d?.subjects) setPYQStats(d.subjects);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authReady || isGuest) return;
    authFetch("/api/questions/for-you")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const d = json?.data;
        if (!d) return;
        if (d.primary) setForYouPrimary(d.primary);
        if (d.mode) setForYouMode(d.mode);
        if (d.fresh?.length) {
          setFreshProblems(d.fresh.map((it: Record<string, unknown>) => dbQuestionToProblem(it)));
        }
      })
      .catch(() => null);
  }, [authReady, isGuest]);

  useEffect(() => {
    authFetch("/api/questions/years")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setYearStats(json.data); })
      .catch(() => null);
  }, []);

  const fetchAllProblems = useCallback((offset: number, replace: boolean) => {
    if (!isGuest || tab !== "all") return;

    const gen = ++allFetchGen.current;
    setAllLoading(true);

    const qs = new URLSearchParams();
    if (debouncedQuery) qs.set("q", debouncedQuery);
    if (exam !== "all") qs.set("exam", exam);
    qs.set("limit", "20");
    qs.set("offset", String(offset));

    authFetch(`/api/questions?${qs.toString()}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (gen !== allFetchGen.current) return;
        const items = (json?.data?.items ?? []) as unknown[];
        const total = Number(json?.data?.total ?? 0);
        const mapped = items.map(it => dbQuestionToProblem(it as Record<string, any>));
        const nextOffset = offset + mapped.length;
        setAllProblems(prev => (replace ? mapped : [...prev, ...mapped]));
        setAllOffset(nextOffset);
        setAllTotal(total);
        setAllHasMore(nextOffset < total);
      })
      .catch(() => {
        if (gen !== allFetchGen.current) return;
        if (replace) {
          setAllProblems([]);
          setAllOffset(0);
          setAllTotal(0);
        }
        setAllHasMore(false);
      })
      .finally(() => {
        if (gen === allFetchGen.current) setAllLoading(false);
      });
  }, [debouncedQuery, exam, isGuest, tab]);

  useEffect(() => {
    if (!authReady || !isGuest || tab !== "all") return;
    setAllProblems([]);
    setAllOffset(0);
    setAllTotal(0);
    setAllHasMore(true);
    fetchAllProblems(0, true);
  }, [authReady, isGuest, tab, debouncedQuery, exam, fetchAllProblems]);

  const loadMoreAll = useCallback(() => {
    if (allLoading || !allHasMore) return;
    fetchAllProblems(allOffset, false);
  }, [allHasMore, allLoading, allOffset, fetchAllProblems]);

  const { totalPyqs, solvedPyqs, attemptedPyqs } = useMemo(() => {
    let t = 0, s = 0, a = 0;
    for (const v of Object.values(pyqStats)) {
      t += v.total;
      s += v.solved;
      a += v.attempted ?? 0;
    }
    return { totalPyqs: t, solvedPyqs: s, attemptedPyqs: a };
  }, [pyqStats]);

  const pct = totalPyqs > 0 ? Math.round((solvedPyqs / totalPyqs) * 100) : 0;

  const forYouPrimaryResolved = useMemo(
    () => forYouPrimary ?? computeForYouPrimary(pyqStats, solvedPyqs, attemptedPyqs),
    [forYouPrimary, pyqStats, solvedPyqs, attemptedPyqs]
  );

  const forYouModeResolved = forYouPrimary
    ? forYouMode
    : forYouFeedMode(attemptedPyqs);

  const drillChapter = useCallback(() => {
    if (!forYouPrimaryResolved) return;
    const { subjectId, name } = forYouPrimaryResolved.chapter;
    authFetch(`/api/questions?subject=${subjectId}&chapter=${encodeURIComponent(name)}&limit=30`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const items: unknown[] = json?.data?.items ?? [];
        if (!items.length) return;
        const problems = items.map(it => dbQuestionToProblem(it as Record<string, unknown>));
        const first = problems[0];
        onOpenProblem(first, buildPlayQueue(problems, first.id, { filters: { subject: subjectId, chapter: name } }));
      })
      .catch(() => null);
  }, [forYouPrimaryResolved, onOpenProblem]);

  const openChapter = useCallback((subjectId: string, chapterName: string) => {
    authFetch(`/api/questions?subject=${subjectId}&chapter=${encodeURIComponent(chapterName)}&limit=30`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const items: unknown[] = json?.data?.items ?? [];
        if (!items.length) return;
        const problems = items.map(it => dbQuestionToProblem(it as Record<string, unknown>));
        const first = problems[0];
        onOpenProblem(first, buildPlayQueue(problems, first.id, { filters: { subject: subjectId, chapter: chapterName } }));
      })
      .catch(() => null);
  }, [onOpenProblem]);

  return (
    <div className={isDesktop ? "dt-container pyq-root" : "screen pyq-root"}>
      <PYQHeader
        isDesktop={isDesktop}
        exam={exam} setExam={setExam}
        tab={tab} setTab={setTab}
        query={query} setQuery={setQuery}
        totalPyqs={totalPyqs} solvedPyqs={solvedPyqs} pct={pct}
        isGuest={isGuest}
        authReady={authReady}
        requireAuth={requireAuth}
      />

      <div className={isDesktop ? "pyq-body" : "screen-pad pyq-body"}>
        {!authReady ? (
          <div className="pyq-auth-wait">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="shimmer-bone" style={{ height: 72, borderRadius: 14, marginBottom: 10 }} />
            ))}
          </div>
        ) : (
          <>
            {tab === "all" && (
              <AllProblemsBrowse
                problems={allProblems}
                total={allTotal}
                loading={allLoading}
                hasMore={allHasMore}
                onLoadMore={loadMoreAll}
                onOpen={onOpenProblem}
                isDesktop={isDesktop}
                infiniteScroll
              />
            )}
            {tab === "foryou" && (
              <ForYouFeed
                primary={forYouPrimaryResolved}
                feedMode={forYouModeResolved}
                fresh={freshProblems}
                loading={loading}
                onDrill={drillChapter}
                onOpen={onOpenProblem}
              />
            )}
            {tab === "chapters" && (
              <ChaptersBrowse
                pyqStats={pyqStats}
                subj={subj} setSubj={setSubj}
                sort={sort} setSort={setSort}
                query={query} setQuery={setQuery}
                loading={loading}
                onOpen={openChapter}
                isDesktop={isDesktop}
              />
            )}
            {tab === "years" && (
              <YearsBrowse
                yearStats={yearStats}
                loading={loading}
                onOpenYear={setOpenYear}
                isDesktop={isDesktop}
              />
            )}
          </>
        )}
      </div>

      {openYear && (
        <YearDetail
          year={openYear}
          onClose={() => setOpenYear(null)}
          onOpen={onOpenProblem}
        />
      )}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function PYQHeader({ isDesktop, exam, setExam, tab, setTab, query, setQuery, totalPyqs, solvedPyqs, pct, isGuest, authReady, requireAuth }: {
  isDesktop?: boolean; exam: string; setExam: (v: "all" | "mains" | "advanced") => void;
  tab: string; setTab: (v: "all" | "foryou" | "chapters" | "years") => void;
  query: string; setQuery: (v: string) => void;
  totalPyqs: number; solvedPyqs: number; pct: number;
  isGuest: boolean;
  authReady?: boolean;
  requireAuth?: (key: string, cb?: () => void) => boolean;
}) {
  return (
    <header className="pyq-header">
      {isDesktop ? (
        <div className="pyq-header-row">
          <div>
            <div className="eyebrow">PYQ archive · 2015 → 2024</div>
            <div className="h-display pyq-title">Find your <em>weak spot.</em></div>
          </div>
          <PYQOverview totalPyqs={totalPyqs} solvedPyqs={solvedPyqs} pct={pct} isDesktop />
        </div>
      ) : (
        <AppBar display eyebrow="PYQ archive · 2015 → 2024" title={<>Find your <em>weak spot.</em></>} />
      )}

      <div className={`pyq-toolbar${isDesktop ? " dt" : ""}`}>
        {isGuest && (
          <div className="pyq-search">
            <Icons.Search size={16} style={{ color: "var(--fg-3)" }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder={isDesktop ? "Search a chapter, year, or PYQ code…" : "Search chapter, year, code…"}
            />
            {query && <button onClick={() => setQuery("")} style={{ color: "var(--fg-3)" }}><Icons.X size={14} /></button>}
          </div>
        )}
        {authReady && isGuest && (
          <div className="pyq-segment">
            {([["all", "Both"], ["mains", "Mains"], ["advanced", "Advanced"]] as const).map(([id, label]) => (
              <button key={id} className={`pyq-seg${exam === id ? " on" : ""}`} onClick={() => setExam(id)}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {!isDesktop && <PYQOverview totalPyqs={totalPyqs} solvedPyqs={solvedPyqs} pct={pct} />}

      <div className="pyq-tabs">
        {!authReady ? (
          <div className="pyq-tabs-skel shimmer-bone" style={{ height: 42, borderRadius: 12, flex: 1 }} />
        ) : isGuest ? (
          <>
            <button className={`pyq-tab${tab === "all" ? " on" : ""}`} onClick={() => setTab("all")}>
              <Icons.Sets size={14} /><span>All problems</span>
            </button>
            <button
              className="pyq-tab locked"
              onClick={() => requireAuth?.("pyqChapters")}
              aria-disabled="true"
              title="Sign in to unlock chapters"
            >
              <Icons.Book size={14} /><span>Chapters</span><Icons.Lock size={13} style={{ marginLeft: 6 }} />
            </button>
            <button
              className="pyq-tab locked"
              onClick={() => requireAuth?.("pyqYears")}
              aria-disabled="true"
              title="Sign in to unlock years"
            >
              <Icons.Calendar size={14} /><span>Years</span><Icons.Lock size={13} style={{ marginLeft: 6 }} />
            </button>
          </>
        ) : (
          <>
            <button className={`pyq-tab${tab === "foryou" ? " on" : ""}`} onClick={() => setTab("foryou")}>
              <Icons.Sparkle size={14} /><span>For you</span>
            </button>
            <button className={`pyq-tab${tab === "chapters" ? " on" : ""}`} onClick={() => setTab("chapters")}>
              <Icons.Book size={14} /><span>Chapters</span>
            </button>
            <button className={`pyq-tab${tab === "years" ? " on" : ""}`} onClick={() => setTab("years")}>
              <Icons.Calendar size={14} /><span>Years</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function useInfiniteScroll({
  enabled,
  hasMore,
  loading,
  onLoadMore,
}: {
  enabled: boolean;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!enabled || !hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let scrollRoot: Element | null = null;
    let p: HTMLElement | null = sentinel.parentElement;
    while (p) {
      const { overflowY } = getComputedStyle(p);
      if (overflowY === "auto" || overflowY === "scroll") {
        scrollRoot = p;
        break;
      }
      p = p.parentElement;
    }

    const obs = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !loading && hasMore) {
          onLoadMoreRef.current();
        }
      },
      { root: scrollRoot, rootMargin: "160px 0px", threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [enabled, hasMore, loading]);

  return sentinelRef;
}

function AllProblemsBrowse({
  problems,
  total,
  loading,
  hasMore,
  onLoadMore,
  onOpen,
  isDesktop,
  infiniteScroll = true,
}: {
  problems: Problem[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpen: OpenFn;
  isDesktop?: boolean;
  infiniteScroll?: boolean;
}) {
  const sentinelRef = useInfiniteScroll({
    enabled: infiniteScroll,
    hasMore,
    loading,
    onLoadMore,
  });

  const countLabel = total > 0
    ? (problems.length < total ? `${problems.length} of ${total}` : `${total}`)
    : null;

  return (
    <div className="pyq-all">
      {countLabel && (
        <div className="pyq-all-count mono">{countLabel} problems</div>
      )}

      <div className={`pyq-qlist${isDesktop ? " dt" : ""}`}>
        {problems.map(p => (
          <PYQQuestionRow key={p.id} problem={p} onClick={() => onOpen(p)} />
        ))}
        {loading && problems.length === 0 && (
          <div className="pyq-qlist-skel">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="shimmer-bone pyq-qrow-skel" />
            ))}
          </div>
        )}
        {!loading && problems.length === 0 && (
          <div className="pyq-all-empty">No problems match your search.</div>
        )}
      </div>

      <div className="pyq-all-foot" ref={sentinelRef}>
        {loading && problems.length > 0 && (
          <span className="mono pyq-all-loading">Loading more…</span>
        )}
        {!hasMore && problems.length > 0 && !loading && (
          <span className="mono pyq-all-end">End of list</span>
        )}
      </div>
    </div>
  );
}

function PYQQuestionRow({ problem: p, onClick }: { problem: Problem; onClick: () => void }) {
  const subj = SUBJECTS[p.subject];
  const diff = p.difficulty === "Easy" ? "easy" : p.difficulty === "Medium" ? "med" : "hard";
  const diffLabel = p.difficulty === "Medium" ? "Med" : p.difficulty === "Easy" ? "Easy" : "Hard";
  const year = String(p.year).slice(-2);

  return (
    <button
      type="button"
      className="pyq-qrow"
      onClick={onClick}
      style={{ "--subj-c": subj.color } as React.CSSProperties}
    >
      <div className="pyq-qrow-body">
        <p className="pyq-qrow-title">{p.title}</p>
        <p className="pyq-qrow-meta">
          <span className="pyq-qrow-subj" style={{ color: subj.color }}>{subj.short}</span>
          <span className="pyq-qrow-sep" aria-hidden="true">·</span>
          <span>{truncateChapter(p.chapter)}</span>
          <span className="pyq-qrow-sep" aria-hidden="true">·</span>
          <span className="mono">&apos;{year}</span>
        </p>
      </div>
      <span className={`pyq-qrow-diff mono ${diff}`}>{diffLabel}</span>
    </button>
  );
}

function truncateChapter(name: string, max = 32) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

function PYQOverview({ totalPyqs, solvedPyqs, pct, isDesktop }: { totalPyqs: number; solvedPyqs: number; pct: number; isDesktop?: boolean }) {
  return (
    <div className={`pyq-overview${isDesktop ? " dt" : ""}`}>
      <div className="pyq-overview-stat">
        <div className="mono pyq-stat-label">SOLVED</div>
        <div className="pyq-stat-val serif">
          {solvedPyqs}
          <span className="of">of {totalPyqs.toLocaleString("en-IN")}</span>
        </div>
      </div>
      <div className="pyq-overview-bar">
        <div className="pyq-overview-bar-fill" style={{ width: `${pct}%` }} />
        <span className="pyq-overview-pct mono">{pct}%</span>
      </div>
    </div>
  );
}

// ─── For You ─────────────────────────────────────────────────────────────────

function WhyRow({ meta, text }: { meta: (typeof REASON_META)[keyof typeof REASON_META]; text: string }) {
  return (
    <div className="why-row">
      <span className="reason-badge" style={{ "--rc": meta.color } as React.CSSProperties}>
        <span className="reason-icon">{meta.icon}</span>
        <span>{meta.label.split(" ")[0]}</span>
      </span>
      <span>{text}</span>
    </div>
  );
}

function ForYouFeed({ primary, feedMode, fresh, loading, onDrill, onOpen }: {
  primary: ForYouPrimaryPick | null;
  feedMode: "cold" | "warm";
  fresh: Problem[];
  loading: boolean;
  onDrill: () => void;
  onOpen: (p: Problem, queue?: ProblemPlayQueue) => void;
}) {
  const freshColor = "var(--phy)";
  const ch = primary?.chapter;
  const accent = primary?.color ?? "var(--accent)";
  const showAccuracyBar = primary != null && primary.progressPct != null;

  return (
    <div className="foryou">
      <div className="fy-pair">
        <div className="fy-mini-card">
          <div className="fy-mini-head">
            {primary && (
              <span className="reason-badge" style={{ "--rc": accent } as React.CSSProperties}>
                <span className="reason-icon">{primary.icon}</span>
                <span>{primary.badge}</span>
              </span>
            )}
          </div>
          {loading ? (
            <div className="shimmer-bone" style={{ height: 20, width: "60%", borderRadius: 6 }} />
          ) : ch && primary ? (
            <>
              <div className="fy-mini-title">{ch.name}</div>
              <div className="fy-mini-sub">
                <span style={{ color: SUBJECTS[ch.subjectId as SubjectId]?.color ?? "inherit", fontWeight: 600 }}>
                  {ch.subjectName}
                </span>
                <span className="dim"> · </span>
                <span className="mono">{ch.solved}/{ch.total} PYQs</span>
                {feedMode === "warm" && (
                  <>
                    <span className="dim"> · </span>
                    <MasteryPill m={ch.mastery} />
                  </>
                )}
              </div>
              <p className="fy-mini-hint">{primary.hint}</p>
              {showAccuracyBar ? (
                <div className="fy-mini-progress">
                  <div className="fy-mini-progress-bar">
                    <div style={{ width: `${primary.progressPct}%`, background: accent }} />
                  </div>
                  <span className="mono fy-mini-pct" style={{ color: primary.reason === "weak" ? "var(--hard)" : "var(--fg-2)" }}>
                    {primary.progressLabel}
                  </span>
                </div>
              ) : (
                <div className="fy-mini-stat mono">{primary.progressLabel}</div>
              )}
              <button className="fy-mini-cta" onClick={onDrill}>
                {primary.cta} <Icons.ArrowRight size={12} />
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--fg-3)" }}>No data yet</div>
          )}
        </div>

        {/* Fresh from 2024 card */}
        <div className="fy-mini-card">
          <div className="fy-mini-head">
            <span className="reason-badge" style={{ "--rc": freshColor } as React.CSSProperties}>
              <span className="reason-icon">✦</span>
              <span>FRESH FROM 2024</span>
            </span>
          </div>
          <div className="fy-mini-title">Latest PYQs you haven&apos;t tried</div>
          <div className="fy-mini-list">
            {loading
              ? Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="shimmer-bone" style={{ height: 38, borderRadius: 10 }} />
                ))
              : fresh.slice(0, 3).map(p => {
                  const subj = SUBJECTS[p.subject];
                  return (
                    <button key={p.id} className="fy-mini-row" onClick={() => onOpen(p, buildPlayQueue(fresh, p.id))}>
                      <span className="subj-dot" style={{ background: subj.color }} />
                      <span className="fy-mini-row-t">{p.title}</span>
                      <Icons.ArrowRight size={11} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
                    </button>
                  );
                })}
          </div>
        </div>
      </div>

      <div className="why-card">
        <div className="why-head">
          <Icons.Sparkle size={14} />
          <span>{feedMode === "cold" ? "How we pick your first chapter" : "How we rank your feed"}</span>
        </div>
        <div className="why-grid">
          {feedMode === "cold" ? (
            <>
              <WhyRow meta={REASON_META.frequent} text="Recent JEE frequency ('22–'24) when you have no attempts yet" />
              <WhyRow meta={REASON_META.fresh} text="Latest 2024 papers you haven't opened" />
              <WhyRow meta={REASON_META.weak} text="Weak spots unlock after you attempt PYQs in a chapter" />
              <WhyRow meta={REASON_META.review} text="Revision prompts appear once you build solve history" />
            </>
          ) : (
            <>
              <WhyRow meta={REASON_META.weak} text="≥2 attempts and under 40% accuracy in that chapter" />
              <WhyRow meta={REASON_META.frequent} text="Often-tested chapters you haven't started" />
              <WhyRow meta={REASON_META.fresh} text="Newest papers you haven't solved yet" />
              <WhyRow meta={REASON_META.review} text="In-progress chapters to finish next" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chapters ────────────────────────────────────────────────────────────────

function ChaptersBrowse({ pyqStats, subj, setSubj, sort, setSort, query, setQuery, loading, onOpen, isDesktop }: {
  pyqStats: Record<string, SubjectPYQStat>;
  subj: string; setSubj: (s: "all" | SubjectId) => void;
  sort: "weak" | "alpha" | "most"; setSort: (s: "weak" | "alpha" | "most") => void;
  query: string; setQuery: (v: string) => void; loading: boolean;
  onOpen: (subjectId: string, chapterName: string) => void;
  isDesktop?: boolean;
}) {
  const subjects = (subj === "all" ? ["phy", "chem", "math"] : [subj]) as SubjectId[];
  const sortOptions = useMemo(
    () => [
      { value: "weak" as const, label: "Weak first" },
      { value: "most" as const, label: "Most attempted" },
      { value: "alpha" as const, label: "A → Z" },
    ],
    []
  );

  return (
    <div className="chapters-browse">
      <div className="ch-toolbar">
        <div className="ch-subj-row">
          {(["all", "phy", "chem", "math"] as const).map(s => {
            const active = subj === s;
            const color = s === "all" ? "var(--fg-0)" : SUBJECTS[s].color;
            return (
              <button key={s} className={`ch-subj${active ? " on" : ""}`}
                onClick={() => setSubj(s === "all" ? "all" : s)}
                aria-label={s === "all" ? "All subjects" : SUBJECTS[s].name}
                style={{ "--subj-c": color } as React.CSSProperties}>
                {s === "all"
                  ? <><Icons.Sets size={14} />{isDesktop && <span>All</span>}</>
                  : <><SubjectIcon subject={s} size={18} />{isDesktop && <span>{SUBJECTS[s].name}</span>}</>
                }
              </button>
            );
          })}
        </div>
        <div className="ch-sort">
          <Icons.Sort size={13} />
          <ThemedSelect
            ariaLabel="Sort chapters"
            value={sort}
            options={sortOptions}
            onChange={setSort}
          />
        </div>
      </div>

      <div className="ch-search-row">
        <div className="pyq-search">
          <Icons.Search size={15} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search chapters…"
          />
          {query && <button onClick={() => setQuery("")} style={{ color: "var(--fg-3)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}><Icons.X size={14} /></button>}
        </div>
      </div>

      <div className="ch-list">
        {loading
          ? [1, 2].map(i => (
              <div key={i}>
                <div className="shimmer-bone" style={{ height: 18, width: 160, borderRadius: 6, marginBottom: 14 }} />
                <div className="ch-grid">
                  {Array.from({ length: 4 }, (_, j) => (
                    <div key={j} className="shimmer-bone" style={{ height: 156, borderRadius: 14 }} />
                  ))}
                </div>
              </div>
            ))
          : subjects.map(s => {
              const sdata = pyqStats[s];
              if (!sdata) return null;

              let chapters = sdata.chapters.filter(c =>
                !query || c.name.toLowerCase().includes(query.toLowerCase())
              );
              if (sort === "weak") chapters = [...chapters].sort((a, b) => a.pct - b.pct);
              else if (sort === "alpha") chapters = [...chapters].sort((a, b) => a.name.localeCompare(b.name));
              else chapters = [...chapters].sort((a, b) => b.total - a.total);

              return (
                <div key={s}>
                  <div className="ch-group-head">
                    <SubjectIcon subject={s} size={28} />
                    <div>
                      <div className="ch-group-name">{sdata.name}</div>
                      <div className="ch-group-sub mono">{sdata.solved}/{sdata.total} PYQs · {chapters.length} chapters</div>
                    </div>
                  </div>
                  <div className="ch-grid">
                    {chapters.map(ch => (
                      <ChapterCard key={ch.name} chapter={ch} subjectId={s} onClick={() => onOpen(s, ch.name)} />
                    ))}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function ChapterCard({ chapter: c, subjectId, onClick }: { chapter: ChapterStat; subjectId: SubjectId; onClick: () => void }) {
  const meta = SUBJECTS[subjectId];
  const isWeak = c.pct < 30;
  return (
    <button className={`ch-card${isWeak ? " weak" : ""}`} onClick={onClick}
      style={{ "--subj-c": meta.color } as React.CSSProperties}>
      <div className="ch-card-top">
        <div className="ch-card-name">{c.name}</div>
        <MasteryPill m={c.mastery} />
      </div>
      <div className="ch-card-stats">
        <span className="mono">
          <b style={{ color: "var(--fg-0)", fontWeight: 700 }}>{c.solved}</b>
          <span className="dim">/{c.total}</span>
        </span>
        <span className="serif ch-card-pct" style={{ color: meta.color }}>
          {c.pct}<span className="ch-card-pct-sm">%</span>
        </span>
      </div>
      <div className="ch-progress-bar">
        <div style={{ width: `${c.pct}%`, background: meta.color }} />
      </div>
      <PYQHistogram hist={c.hist} color={meta.color} />
      <div className="ch-hist-labels mono">
        <span>&apos;15</span>
        <span>10-yr trend</span>
        <span>&apos;24</span>
      </div>
    </button>
  );
}

function PYQHistogram({ hist, color }: { hist: number[]; color: string }) {
  const max = Math.max(...hist, 1);
  return (
    <div className="ch-hist" aria-hidden="true">
      {hist.map((v, i) => (
        <span key={i} className="ch-hist-bar" style={{
          height: `${10 + (v / max) * 90}%`,
          background: v === 0 ? "var(--bg-3)" : color,
          opacity: v === 0 ? 0.5 : 0.45 + (v / max) * 0.55,
        }} />
      ))}
    </div>
  );
}

// ─── Years ───────────────────────────────────────────────────────────────────

function YearsBrowse({ yearStats, loading, onOpenYear, isDesktop }: {
  yearStats: YearStat[]; loading: boolean;
  onOpenYear: (y: YearStat) => void; isDesktop?: boolean;
}) {
  return (
    <div className="years-browse">
      <div className="years-intro mono">Click any year to see the full paper breakdown.</div>
      <div className={`years-grid${isDesktop ? " dt" : ""}`}>
        {loading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="shimmer-bone" style={{ height: 160, borderRadius: 14 }} />
            ))
          : yearStats.map((y, i) => {
              const total = y.mains.total + y.advanced.total;
              const solved = y.mains.solved + y.advanced.solved;
              const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
              return (
                <button key={y.year} className={`year-card${i === 0 ? " latest" : ""}`} onClick={() => onOpenYear(y)}>
                  {i === 0 && <div className="year-badge mono">LATEST</div>}
                  <div className="year-num serif">{y.year}</div>
                  <div className="year-progress">
                    <div className="year-progress-bar"><div style={{ width: `${pct}%` }} /></div>
                    <span className="mono year-pct">{pct}%</span>
                  </div>
                  <div className="year-split">
                    <div className="year-split-row">
                      <span className="ystrip-label mono">M</span>
                      <span>Mains</span>
                      <span className="mono ystrip-val">{y.mains.solved}<span className="dim">/{y.mains.total}</span></span>
                    </div>
                    <div className="year-split-row">
                      <span className="ystrip-label adv mono">A</span>
                      <span>Advanced</span>
                      <span className="mono ystrip-val">{y.advanced.solved}<span className="dim">/{y.advanced.total}</span></span>
                    </div>
                  </div>
                </button>
              );
            })}
      </div>
    </div>
  );
}

// ─── Year Detail Modal ────────────────────────────────────────────────────────

function YearDetail({ year, onClose, onOpen }: { year: YearStat; onClose: () => void; onOpen: (p: Problem, queue?: ProblemPlayQueue) => void }) {
  const total = year.mains.total + year.advanced.total;
  const solved = year.mains.solved + year.advanced.solved;
  const [samples, setSamples] = useState<Problem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchGen = useRef(0);
  const LIMIT = 20;

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onEsc); document.body.style.overflow = ""; };
  }, [onClose]);

  useEffect(() => {
    const gen = ++fetchGen.current;
    setLoadingMore(true);
    authFetch(`/api/questions?year=${year.year}&limit=${LIMIT}&offset=0`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (gen !== fetchGen.current) return;
        const items = json?.data?.items ?? [];
        const total = Number(json?.data?.total ?? 0);
        const mapped = items.map(dbQuestionToProblem);
        setSamples(mapped);
        setOffset(mapped.length);
        setHasMore(mapped.length < total);
      })
      .catch(() => null)
      .finally(() => { if (gen === fetchGen.current) setLoadingMore(false); });
  }, [year.year]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const gen = ++fetchGen.current;
    setLoadingMore(true);
    authFetch(`/api/questions?year=${year.year}&limit=${LIMIT}&offset=${offset}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (gen !== fetchGen.current) return;
        const items = json?.data?.items ?? [];
        const total = Number(json?.data?.total ?? 0);
        const mapped = items.map(dbQuestionToProblem);
        setSamples(prev => {
          const next = [...prev, ...mapped];
          setOffset(next.length);
          setHasMore(next.length < total);
          return next;
        });
      })
      .catch(() => null)
      .finally(() => { if (gen === fetchGen.current) setLoadingMore(false); });
  }, [year.year, offset, loadingMore, hasMore]);

  const sentinelRef = useInfiniteScroll({ enabled: true, hasMore, loading: loadingMore, onLoadMore: loadMore });

  return (
    <div className="year-detail-backdrop" onClick={onClose}>
      <div className="year-detail" onClick={e => e.stopPropagation()}>
        <button className="year-detail-close" onClick={onClose}><Icons.X size={18} /></button>
        <div className="year-detail-eyebrow mono">JEE PYQ ARCHIVE</div>
        <div className="year-detail-num serif">{year.year}</div>
        <div className="year-detail-sub">{solved} of {total} PYQs solved</div>
        <div className="year-detail-papers">
          <PaperCard label="JEE Mains" subtitle="Jan + April sessions · all shifts merged"
            solved={year.mains.solved} total={year.mains.total} />
          <PaperCard label="JEE Advanced" subtitle="Paper 1 + Paper 2 combined"
            solved={year.advanced.solved} total={year.advanced.total} advanced />
        </div>
        <div className="year-detail-samples">
          <div className="year-detail-samples-head">
            <span>From {year.year}</span>
          </div>
          <div className="year-detail-list">
            {samples.map(p => {
              const subj = SUBJECTS[p.subject];
              return (
                <button key={p.id} className="year-sample-row" onClick={() => { onClose(); onOpen(p, buildPlayQueue(samples, p.id, { filters: { year: String(year.year) } })); }}>
                  <span className="subj-dot" style={{ background: subj.color, width: 6, height: 6, flexShrink: 0 }} />
                  <div className="year-sample-main">
                    <div className="year-sample-title">{p.title}</div>
                    <div className="year-sample-meta mono">{subj.short} · {truncateChapter(p.chapter, 28)}</div>
                  </div>
                  <Icons.ArrowRight size={11} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
                </button>
              );
            })}
            {loadingMore && samples.length === 0 && (
              <div className="pyq-qlist-skel">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="shimmer-bone pyq-qrow-skel" />
                ))}
              </div>
            )}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }}>
            {loadingMore && samples.length > 0 && (
              <span className="mono pyq-all-loading">Loading more…</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperCard({ label, subtitle, solved, total, advanced }: {
  label: string; subtitle: string; solved: number; total: number; advanced?: boolean;
}) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <div className={`paper-card${advanced ? " adv" : ""}`}>
      <div className="paper-head">
        <div>
          <div className="paper-label">{label}</div>
          <div className="paper-sub">{subtitle}</div>
        </div>
        <div className="paper-pct serif">{pct}%</div>
      </div>
      <div className="paper-bar"><div style={{ width: `${pct}%` }} /></div>
      <div className="paper-stat mono">{solved} solved · {total - solved} pending</div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function MasteryPill({ m }: { m: string }) {
  const meta = m === "Advanced"
    ? { color: "var(--easy)", label: "Advanced" }
    : m === "Intermediate"
    ? { color: "var(--medium)", label: "Intermediate" }
    : { color: "var(--fg-3)", label: "Beginner" };
  return (
    <span className="mastery-pill" style={{ "--mc": meta.color } as React.CSSProperties}>
      <span className="mastery-dot" />
      <span>{meta.label}</span>
    </span>
  );
}
