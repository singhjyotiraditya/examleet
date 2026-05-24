"use client";
import React, { useState, useEffect, useRef } from "react";
import type { Problem } from "@/lib/data";
import { dbQuestionToProblem } from "@/lib/data";
import { buildPlayQueue, type ProblemPlayQueue } from "@/lib/playQueue";
import { authFetch } from "@/lib/auth";
import { appendListSeed } from "@/lib/sessionSeed";
import { Icons } from "@/components/shared";

const SUBJECT_LABELS: Record<string, string> = { phy: "Physics", chem: "Chemistry", math: "Mathematics" };
const DIFF_COLORS: Record<string, string> = {
  Easy: "var(--accent)",
  Medium: "#f59e0b",
  Hard: "#ef4444",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenProblem: (p: Problem, queue?: ProblemPlayQueue) => void;
}

export default function SearchModal({ open, onClose, onOpenProblem }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Problem[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const params = appendListSeed(new URLSearchParams({ limit: "10" }));
      if (q) params.set("q", q);
      const res = await authFetch(`/api/questions?${params}`).catch(() => null);
      if (!res?.ok) return;
      const json = await res.json();
      setResults((json.data?.items ?? []).map(dbQuestionToProblem));
      setSelected(0);
    }, q ? 200 : 0);
  }, [query, open]);

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { pick(results[selected]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, selected, results]);

  const pick = (p: Problem) => {
    const q = query.trim();
    onOpenProblem(
      p,
      buildPlayQueue(results, p.id, { filters: q ? { q } : undefined }),
    );
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 580,
          background: "var(--bg-1)",
          border: "1px solid var(--line-1)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--line-0)" }}>
          <Icons.Search size={16} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search questions, chapters, topics…"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 15, color: "var(--fg-1)", caretColor: "var(--accent)",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--fg-3)" }}>
              <Icons.X size={14} />
            </button>
          )}
          <span style={{ fontSize: 11, color: "var(--fg-3)", padding: "2px 7px", borderRadius: 5, background: "var(--bg-2)", border: "1px solid var(--line-1)" }}>Esc</span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 400, overflowY: "auto" }}>
          {results.length === 0 && query ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              No questions found for &ldquo;{query}&rdquo;
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              Start typing to search…
            </div>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                onClick={() => pick(p)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 16px", border: "none", cursor: "pointer", textAlign: "left",
                  background: i === selected ? "var(--bg-2)" : "transparent",
                  borderBottom: i < results.length - 1 ? "1px solid var(--line-0)" : "none",
                  transition: "background 0.1s",
                }}
              >
                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icons.Search size={13} style={{ color: "var(--fg-3)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 1 }}>{SUBJECT_LABELS[p.subject]} · {p.chapter}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: DIFF_COLORS[p.difficulty], fontWeight: 600 }}>{p.difficulty}</span>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{p.exam} {p.year}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--line-0)", display: "flex", gap: 16, alignItems: "center" }}>
          {[["↑↓", "navigate"], ["↵", "open"], ["Esc", "close"]].map(([k, l]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--fg-3)" }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, padding: "1px 5px", borderRadius: 4, background: "var(--bg-2)", border: "1px solid var(--line-1)" }}>{k}</span>
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
