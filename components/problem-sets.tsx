"use client";
import React, { useState, useEffect, useMemo } from "react";
import { SUBJECTS, dbQuestionToProblem, SubjectId } from "@/lib/data";
import { authFetch } from "@/lib/auth";
import { appendListSeed } from "@/lib/sessionSeed";
import { AppBar, SubjectIcon, DifficultyChip, Icons } from "./shared";
import type { Problem } from "@/lib/data";
import { buildPlayQueue, type ProblemPlayQueue } from "@/lib/playQueue";

type SubjectStats = Record<string, { total: number; chapters: Record<string, number> }>;

interface ProblemSetItem {
  id: string; name: string; subject: string; chapter: string | null;
  description: string; difficulty: string | null; totalQuestions: number;
  isFeatured: boolean; isCurated: boolean;
}

type OpenProblemFn = (p: Problem, queue?: ProblemPlayQueue) => void;

export default function ProblemSets({ onOpenProblem, isDesktop }: { onOpenProblem: OpenProblemFn; isDesktop?: boolean }) {
  const [tab, setTab] = useState<"topics" | "all" | "curated">("all");
  const [query, setQuery] = useState("");
  const [subj, setSubj] = useState<"all" | SubjectId>("all");
  const [diff, setDiff] = useState<"all" | string>("all");
  const [solveFilter, setSolveFilter] = useState<"all" | "solved" | "unsolved">("unsolved");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemSets, setProblemSets] = useState<ProblemSetItem[]>([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SubjectStats>({});

  // Fetch accurate per-subject/chapter counts once — no pagination
  useEffect(() => {
    fetch("/api/questions/stats")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setStats(json.data); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = appendListSeed(new URLSearchParams({ limit: "50" }));
    if (subj !== "all") params.set("subject", subj);
    if (diff !== "all") params.set("difficulty", diff);
    if (query) params.set("q", query);

    authFetch(`/api/questions?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.data) {
          setProblems(json.data.items.map(dbQuestionToProblem));
          setTotalProblems(json.data.total);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [subj, diff, query]);

  useEffect(() => {
    fetch("/api/problem-sets?curated=true&limit=20")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data?.items) setProblemSets(json.data.items); })
      .catch(() => null);
  }, []);

  const openChapter = (subject: string, chapter: string) => {
    authFetch(`/api/questions?subject=${subject}&chapter=${encodeURIComponent(chapter)}&limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { const item = json?.data?.items?.[0]; if (item) onOpenProblem(dbQuestionToProblem(item)); })
      .catch(() => null);
  };

  const filtered = useMemo(() => {
    if (solveFilter === "solved") return problems.filter(p => p.solved);
    if (solveFilter === "unsolved") return problems.filter(p => !p.solved);
    return problems;
  }, [problems, solveFilter]);

  const listFilters = useMemo(
    () => ({
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(subj !== "all" ? { subject: subj } : {}),
      ...(diff !== "all" ? { difficulty: diff } : {}),
    }),
    [query, subj, diff],
  );

  const openFromFiltered = (p: Problem) => {
    onOpenProblem(
      p,
      buildPlayQueue(filtered, p.id, { filters: listFilters, solveFilter }),
    );
  };

  const searchBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 12 }}>
      <Icons.Search size={15} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search topic, problem…" style={{ flex: 1, fontSize: 13, color: "var(--fg-0)" }} />
      {query && <button onClick={() => setQuery("")} style={{ color: "var(--fg-3)" }}><Icons.X size={13} /></button>}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="dt-container">
        <div style={{ marginBottom: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Problem library</div>
          <div className="h-display" style={{ fontSize: 48, lineHeight: 1 }}>
            Drill what <em>matters.</em>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 14 }}>
            <Icons.Search size={16} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by topic, problem code, or title…" style={{ flex: 1, fontSize: 14, color: "var(--fg-0)" }} />
            {query && <button onClick={() => setQuery("")} style={{ color: "var(--fg-3)" }}><Icons.X size={14} /></button>}
          </div>
          <div className="tabs" style={{ flexShrink: 0, minWidth: 280 }}>
            <button className={`tab${tab === "topics" ? " active" : ""}`} onClick={() => setTab("topics")}>By topic</button>
            <button className={`tab${tab === "all" ? " active" : ""}`} onClick={() => setTab("all")}>All</button>
            <button className={`tab${tab === "curated" ? " active" : ""}`} onClick={() => setTab("curated")}>Curated</button>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          {(["all", "phy", "chem", "math"] as const).map(s => {
            const active = subj === s;
            const label = s === "all" ? "All subjects" : SUBJECTS[s as SubjectId].name;
            return (
              <button key={s} onClick={() => setSubj(s === "all" ? "all" : s as SubjectId)} className="chip"
                style={{ borderColor: active ? "var(--accent)" : "var(--line-2)", background: active ? "var(--accent-soft)" : "var(--bg-1)", color: active ? "var(--accent)" : "var(--fg-1)", cursor: "pointer", fontSize: 12, padding: "7px 12px" }}>
                {label}
              </button>
            );
          })}
          {tab === "all" && (
            <>
              <span style={{ width: 1, height: 20, background: "var(--line-1)", margin: "0 4px", flexShrink: 0 }} />
              {["all", "Easy", "Medium", "Hard"].map(d => {
                const active = diff === d;
                return (
                  <button key={d} onClick={() => setDiff(d)} className="chip"
                    style={{ borderColor: active ? "var(--accent)" : "var(--line-2)", background: active ? "var(--accent-soft)" : "var(--bg-1)", color: active ? "var(--accent)" : "var(--fg-1)", cursor: "pointer", fontSize: 12, padding: "7px 12px" }}>
                    {d === "all" ? "All difficulty" : d}
                  </button>
                );
              })}
              <span style={{ width: 1, height: 20, background: "var(--line-1)", margin: "0 4px", flexShrink: 0 }} />
              {([
                { id: "all", label: "All" },
                { id: "solved", label: "Solved" },
                { id: "unsolved", label: "Unsolved" },
              ] as const).map(({ id, label }) => {
                const active = solveFilter === id;
                return (
                  <button key={id} onClick={() => setSolveFilter(id)} className="chip"
                    style={{ borderColor: active ? "var(--accent)" : "var(--line-2)", background: active ? "var(--accent-soft)" : "var(--bg-1)", color: active ? "var(--accent)" : "var(--fg-1)", cursor: "pointer", fontSize: 12, padding: "7px 12px" }}>
                    {label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {tab === "topics" && <TopicBrowse stats={stats} subj={subj} onOpenChapter={openChapter} onViewAll={s => setSubj(s)} />}

        {tab === "all" && (
          <>
            <div style={{ marginBottom: 12, minHeight: 18 }}>
              {loading ? (
                <div className="shimmer-bone" style={{ width: 280, height: 12, borderRadius: 4, ["--shimmer-delay" as string]: "0s" }} />
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
                  {`${solveFilter !== "all" ? `${filtered.length} shown · ` : ""}${totalProblems} problems · ${problems.filter(p => p.answeredCorrect).length} correct · ${problems.filter(p => p.solved).length} attempted`}
                </span>
              )}
            </div>
            <div className="card row-divider" style={{ padding: 0 }}>
              {loading
                ? <ProblemListSkeletonDesktop count={9} />
                : filtered.length === 0
                  ? <div style={{ padding: 30, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>No problems match your filter.</div>
                  : filtered.map(p => <ProblemRowDesktop key={p.id} p={p} onClick={() => openFromFiltered(p)} />)}
            </div>
          </>
        )}

        {tab === "curated" && (
          <div className="dt-grid-3">
            {problemSets.length === 0
              ? <div style={{ color: "var(--fg-3)", fontSize: 13, padding: 20 }}>No curated sets yet</div>
              : problemSets.map(set => <CuratedSet key={set.id} set={set} />)}
          </div>
        )}
      </div>
    );
  }

  // ── Mobile ─────────────────────────────────────────────────────────────────
  return (
    <div className="screen">
      <AppBar display eyebrow="Problem sets" title={<>Drill what <em>matters.</em></>}
        right={<button className="btn btn-ghost" style={{ padding: 10, borderRadius: 999 }}><Icons.Sparkle size={20} /></button>}
      />
      <div className="screen-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {(Object.values(SUBJECTS) as typeof SUBJECTS[SubjectId][]).map(s => {
            const isSel = subj === s.id;
            const total = stats[s.id]?.total ?? 0;
            return (
              <button key={s.id} onClick={() => setSubj(isSel ? "all" : s.id as SubjectId)} className="card"
                style={{ padding: 10, textAlign: "left", cursor: "pointer", borderColor: isSel ? `color-mix(in srgb, ${s.color} 60%, transparent)` : "var(--line-1)", background: isSel ? `color-mix(in srgb, ${s.color} 10%, var(--bg-1))` : "var(--bg-1)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                  <SubjectIcon subject={s.id as SubjectId} size={28} />
                  <div>
                    <div style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.short}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>0/{total || "··"}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 14 }}>
          <Icons.Search size={16} style={{ color: "var(--fg-3)" }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by topic, problem, or code…" style={{ flex: 1, fontSize: 13.5, color: "var(--fg-0)" }} />
          {query && <button onClick={() => setQuery("")} style={{ color: "var(--fg-3)" }}><Icons.X size={14} /></button>}
          <button onClick={() => setDiff(diff === "all" ? "Easy" : "all")} style={{ color: diff !== "all" ? "var(--accent)" : "var(--fg-2)", padding: 4 }}>
            <Icons.Filter size={16} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="tabs" style={{ flex: 1, maxWidth: 230 }}>
            <button className={`tab${tab === "all" ? " active" : ""}`} onClick={() => setTab("all")}>All problems</button>
            <button className={`tab${tab === "curated" ? " active" : ""}`} onClick={() => setTab("curated")}>Curated</button>
          </div>
          <button className="btn btn-ghost" style={{ padding: 8, fontSize: 12, gap: 4 }}>
            <Icons.Sort size={14} /> <span style={{ color: "var(--fg-2)" }}>Sort</span>
          </button>
        </div>

        {tab === "all" && (
          <div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {([
                { id: "all", label: "All" },
                { id: "solved", label: "Solved" },
                { id: "unsolved", label: "Unsolved" },
              ] as const).map(({ id, label }) => {
                const active = solveFilter === id;
                return (
                  <button key={id} onClick={() => setSolveFilter(id)} className="chip"
                    style={{ borderColor: active ? "var(--accent)" : "var(--line-2)", background: active ? "var(--accent-soft)" : "var(--bg-1)", color: active ? "var(--accent)" : "var(--fg-1)", cursor: "pointer", fontSize: 11.5, padding: "6px 11px" }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 2px", minHeight: 16 }}>
              {loading ? (
                <div className="shimmer-bone" style={{ width: 160, height: 11, borderRadius: 4 }} />
              ) : (
                <>
                  <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{`${solveFilter !== "all" ? `${filtered.length} shown · ` : ""}${totalProblems} problems`}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{problems.filter(p => p.answeredCorrect).length} correct · {problems.filter(p => p.solved).length} attempted</span>
                </>
              )}
            </div>
            <div className="card row-divider" style={{ padding: 0 }}>
              {loading
                ? <ProblemListSkeleton count={8} />
                : filtered.length === 0
                  ? <div style={{ padding: 30, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>No problems match.</div>
                  : filtered.map(p => <ProblemRow key={p.id} p={p} onClick={() => openFromFiltered(p)} />)}
            </div>
          </div>
        )}

        {tab === "curated" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {problemSets.length === 0
              ? <div style={{ color: "var(--fg-3)", fontSize: 13, padding: 20, textAlign: "center" }}>No curated sets yet</div>
              : problemSets.map(set => <CuratedSet key={set.id} set={set} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ShimmerBone({ w, h, r = 6, delay = 0, style }: { w: number | string; h: number; r?: number; delay?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="shimmer-bone"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        flexShrink: 0,
        ["--shimmer-delay" as string]: `${delay}s`,
        ...style,
      }}
    />
  );
}

function ProblemListSkeletonDesktop({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            padding: "13px 18px",
            display: "grid",
            gridTemplateColumns: "28px 1fr 100px 80px 40px",
            alignItems: "center",
            gap: 14,
          }}
        >
          <ShimmerBone w={22} h={22} r={7} delay={i * 0.05} />
          <div style={{ minWidth: 0 }}>
            <ShimmerBone w={`${68 + (i % 3) * 8}%`} h={13} r={5} delay={i * 0.05 + 0.04} style={{ marginBottom: 6 }} />
            <ShimmerBone w={`${42 + (i % 4) * 6}%`} h={10} r={4} delay={i * 0.05 + 0.08} />
          </div>
          <ShimmerBone w={52} h={11} r={4} delay={i * 0.05 + 0.06} />
          <ShimmerBone w={56} h={22} r={999} delay={i * 0.05 + 0.1} />
          <div />
        </div>
      ))}
    </>
  );
}

function ProblemListSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            padding: "13px 14px",
            display: "flex",
            alignItems: "center",
            gap: 11,
          }}
        >
          <ShimmerBone w={22} h={22} r={7} delay={i * 0.05} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <ShimmerBone w={`${72 + (i % 3) * 6}%`} h={13} r={5} delay={i * 0.05 + 0.04} style={{ marginBottom: 6 }} />
            <ShimmerBone w={`${48 + (i % 4) * 5}%`} h={10} r={4} delay={i * 0.05 + 0.08} />
          </div>
          <ShimmerBone w={52} h={22} r={999} delay={i * 0.05 + 0.1} />
        </div>
      ))}
    </>
  );
}

function ProblemProgressIcon({ p }: { p: Problem }) {
  const incorrect = p.solved && !p.answeredCorrect;
  const bg = p.answeredCorrect
    ? "color-mix(in srgb, var(--easy) 18%, transparent)"
    : incorrect
      ? "color-mix(in srgb, var(--hard) 12%, transparent)"
      : "var(--bg-3)";
  const color = p.answeredCorrect ? "var(--easy)" : incorrect ? "var(--hard)" : "var(--fg-3)";
  const border = p.answeredCorrect
    ? "1px solid color-mix(in srgb, var(--easy) 40%, transparent)"
    : incorrect
      ? "1px solid color-mix(in srgb, var(--hard) 35%, transparent)"
      : "1px solid var(--line-2)";
  return (
    <div style={{ width: 22, height: 22, borderRadius: 7, background: bg, color, border, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {p.answeredCorrect && <Icons.Check size={12} />}
      {incorrect && <Icons.X size={12} />}
    </div>
  );
}

function ProblemRow({ p, onClick }: { p: Problem; onClick: () => void }) {
  const subj = SUBJECTS[p.subject];
  return (
    <button onClick={onClick} style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left" }}>
      <ProblemProgressIcon p={p} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{p.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-3)" }}>
          <span className={`subj-${subj.cls}`}>●</span>
          <span>{subj.short}</span><span>·</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.chapter}</span>
          <span>·</span><span className="mono">{p.acceptance}%</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
        <DifficultyChip d={p.difficulty} />
        {p.bookmarked && <Icons.BookmarkFill size={11} style={{ color: "var(--accent)" }} />}
      </div>
    </button>
  );
}

function ProblemRowDesktop({ p, onClick }: { p: Problem; onClick: () => void }) {
  const subj = SUBJECTS[p.subject];
  return (
    <button onClick={onClick} style={{ padding: "13px 18px", display: "grid", gridTemplateColumns: "28px 1fr 100px 80px 40px", alignItems: "center", gap: 14, width: "100%", textAlign: "left" }}>
      <ProblemProgressIcon p={p} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{p.title}</div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.chapter}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--fg-2)" }}>
        <span className={`subj-${subj.cls}`}>●</span> {subj.short}
      </div>
      <DifficultyChip d={p.difficulty} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {p.bookmarked && <Icons.BookmarkFill size={12} style={{ color: "var(--accent)" }} />}
      </div>
    </button>
  );
}

function TopicBrowse({ stats, subj, onOpenChapter, onViewAll }: {
  stats: SubjectStats; subj: string;
  onOpenChapter: (subject: string, chapter: string) => void;
  onViewAll: (s: SubjectId) => void;
}) {
  const isAll = subj === "all";
  const subjects = (isAll ? ["phy", "chem", "math", "bio"] : [subj]) as SubjectId[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {subjects.map(s => {
        const subjMeta = SUBJECTS[s];
        const subjStats = stats[s];
        if (!subjStats) return null;
        const chapters = Object.keys(subjStats.chapters).sort();

        return (
          <div key={s}>
            {/* Subject header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <SubjectIcon subject={s} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-0)" }}>{subjMeta.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{chapters.length} chapters · {subjStats.total} problems</div>
              </div>
              {isAll && (
                <button onClick={() => onViewAll(s)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: subjMeta.color, fontWeight: 500, padding: "5px 10px", borderRadius: 8, border: `1px solid color-mix(in srgb, ${subjMeta.color} 30%, transparent)`, background: `color-mix(in srgb, ${subjMeta.color} 8%, transparent)`, whiteSpace: "nowrap", flexShrink: 0 }}>
                  View all <Icons.ArrowRight size={11} />
                </button>
              )}
            </div>

            {isAll ? (
              /* Compact one-line horizontal strip of chapter chips */
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                {chapters.map(ch => {
                  const total = subjStats.chapters[ch];
                  return (
                    <button key={ch} onClick={() => onOpenChapter(s, ch)}
                      style={{ display: "inline-flex", flexDirection: "column", gap: 3, flexShrink: 0, padding: "10px 14px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 12, textAlign: "left", cursor: "pointer", minWidth: 140, maxWidth: 200 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{ch}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{total} problems</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Full grid when a subject is selected */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {chapters.map(ch => {
                  const total = subjStats.chapters[ch];
                  return (
                    <button key={ch} onClick={() => onOpenChapter(s, ch)} className="card"
                      style={{ padding: 14, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: "var(--fg-0)" }}>{ch}</div>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>0/{total}</span>
                        <span className="serif" style={{ fontSize: 16, color: subjMeta.color, lineHeight: 1 }}>
                          0<span style={{ fontSize: 9, color: "var(--fg-3)" }}>%</span>
                        </span>
                      </div>
                      <div className="progress" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: "0%", background: subjMeta.color }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 10.5, color: "var(--fg-3)" }}>
                        <Icons.ArrowRight size={11} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CuratedSet({ set }: { set: ProblemSetItem }) {
  const color = `var(--${set.subject === "mixed" ? "accent" : set.subject})`;
  return (
    <button className="card card-elev" style={{ padding: 0, textAlign: "left", width: "100%", overflow: "hidden", borderColor: set.isFeatured ? color : "var(--line-2)" }}>
      {set.isFeatured && (
        <div style={{ padding: "4px 14px", background: `color-mix(in srgb, ${color} 15%, transparent)`, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--mono)", color, borderBottom: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>
          ★ Featured
        </div>
      )}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          {set.subject !== "mixed" && <SubjectIcon subject={set.subject as SubjectId} size={38} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3, lineHeight: 1.2 }}>{set.name}</div>
            <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.4 }}>{set.description}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>{set.totalQuestions} questions</span>
          {set.difficulty && <span className="mono" style={{ fontSize: 11, color, fontWeight: 600 }}>{set.difficulty}</span>}
        </div>
      </div>
    </button>
  );
}
