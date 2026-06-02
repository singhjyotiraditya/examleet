"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SubjectIcon, Icons } from "./shared";
import { supabase } from "@/lib/supabase";

const EXAM_OPTIONS = [
  { id: "mains", label: "JEE Mains", desc: "Engineering · 90 Q / 3h", subjects: ["phy", "chem", "math"] as const, tone: "var(--phy)" },
  { id: "adv", label: "JEE Advanced", desc: "IITs · Paper 1 & 2", subjects: ["phy", "chem", "math"] as const, tone: "var(--accent)" },
] as const;

const LEVEL_OPTIONS = [
  { id: "11", label: "Class XI", desc: "Just starting" },
  { id: "12", label: "Class XII", desc: "Final year" },
  { id: "drop", label: "Dropper", desc: "Take 2 — let's go" },
] as const;

const PLAN_YEARS = [2026, 2027, 2028] as const;

const DAILY_PRESETS = [
  { v: 45, label: "Casual" },
  { v: 90, label: "Serious" },
  { v: 150, label: "Intense" },
  { v: 210, label: "Beast mode" },
] as const;

export interface PlanValues {
  exam: string;
  targetYear: number;
  currentLevel: string;
  dailyMinutes: number;
}

interface PlanEditOverlayProps {
  open: boolean;
  initial: PlanValues;
  onClose: () => void;
  onSaved: (data: Record<string, unknown>) => void;
  isDesktop?: boolean;
}

export default function PlanEditOverlay({ open, initial, onClose, onSaved, isDesktop }: PlanEditOverlayProps) {
  const [step, setStep] = useState(0);
  const [exam, setExam] = useState(initial.exam);
  const [targetYear, setTargetYear] = useState(initial.targetYear);
  const [currentLevel, setCurrentLevel] = useState(initial.currentLevel);
  const [dailyMinutes, setDailyMinutes] = useState(initial.dailyMinutes);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setStep(0);
      setExam(initial.exam);
      setTargetYear(initial.targetYear);
      setCurrentLevel(initial.currentLevel);
      setDailyMinutes(initial.dailyMinutes);
      setSaving(false);
    }
  }, [open, initial.exam, initial.targetYear, initial.currentLevel, initial.dailyMinutes]);

  if (!open || !mounted) return null;

  const steps = [
    { id: "exam", canNext: () => !!exam },
    { id: "profile", canNext: () => !!currentLevel },
    { id: "commit", canNext: () => true },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

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
        onSaved(json.data);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (isLast) save();
    else setStep(s => s + 1);
  };

  return createPortal(
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 85,
          background: "rgba(8,8,10,0.5)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: "planFadeIn .2s ease",
        }}
        onClick={() => !saving && onClose()}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 86,
          display: "flex",
          alignItems: isDesktop ? "center" : "flex-end",
          justifyContent: "center",
          pointerEvents: "none",
          padding: isDesktop ? 24 : 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: isDesktop ? 440 : 420,
            height: isDesktop ? "min(680px, 100dvh - 48px)" : "min(88dvh, 720px)",
            maxHeight: isDesktop ? "calc(100dvh - 48px)" : "92dvh",
            background: "var(--bg-0)",
            borderRadius: isDesktop ? 24 : "28px 28px 0 0",
            boxShadow: "var(--shadow-xl)",
            overflow: "hidden",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            animation: isDesktop ? "planFadeIn .2s ease" : "planSheetUp .35s cubic-bezier(.2,.9,.3,1.1) both",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header — matches onboarding */}
          <div style={{ padding: "18px 22px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {!isFirst ? (
              <button
                type="button"
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={saving}
                className="btn btn-ghost"
                style={{ padding: 8, marginLeft: -8, color: "var(--fg-2)" }}
              >
                <Icons.ArrowLeft size={18} />
              </button>
            ) : (
              <div style={{ width: 36 }} />
            )}
            <div style={{ flex: 1, display: "flex", gap: 4 }}>
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    height: 3,
                    flex: 1,
                    borderRadius: 999,
                    background: i <= step ? "var(--accent)" : "var(--bg-3)",
                    transition: "background .3s ease",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn btn-ghost"
              style={{ padding: 8, marginRight: -8, color: "var(--fg-2)" }}
            >
              <Icons.X size={18} />
            </button>
          </div>

          {/* Step content */}
          <div key={step} className="fade-up" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {step === 0 && (
              <StepExam exam={exam} onExam={setExam} />
            )}
            {step === 1 && (
              <StepLevelYear
                currentLevel={currentLevel}
                targetYear={targetYear}
                onLevel={setCurrentLevel}
                onYear={setTargetYear}
              />
            )}
            {step === 2 && (
              <StepDaily dailyMinutes={dailyMinutes} onDaily={setDailyMinutes} />
            )}
          </div>

          {/* Footer — matches onboarding */}
          <div
            style={{
              padding: "12px 22px calc(env(safe-area-inset-bottom, 0px) + 22px)",
              background: "linear-gradient(180deg, transparent, var(--bg-0) 30%)",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={next}
              className="btn btn-primary btn-block btn-lg"
              disabled={!current.canNext() || saving}
              style={{
                opacity: current.canNext() && !saving ? 1 : 0.35,
                cursor: current.canNext() && !saving ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {saving ? "Saving…" : isLast ? "Save plan" : "Continue"}
              {!saving && !isLast && <Icons.ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes planSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes planFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>,
    document.body,
  );
}

function StepExam({ exam, onExam }: { exam: string; onExam: (v: string) => void }) {
  return (
    <div style={{ padding: "8px 22px 32px" }}>
      <div className="eyebrow" style={{ marginBottom: 14, color: "var(--fg-3)" }}>Step 1 of 3</div>
      <div className="h-display" style={{ fontSize: 34, marginBottom: 10, lineHeight: 1.1 }}>
        Which exam are you <em>chasing?</em>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginBottom: 28, lineHeight: 1.5 }}>
        We&apos;ll tune the question mix to match your syllabus and difficulty curve.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {EXAM_OPTIONS.map(opt => {
          const selected = exam === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onExam(opt.id)}
              style={{
                padding: 16,
                borderRadius: 18,
                background: "var(--bg-1)",
                border: `1px solid ${selected ? opt.tone : "var(--line-1)"}`,
                boxShadow: selected
                  ? `0 0 0 3px color-mix(in srgb, ${opt.tone} 14%, transparent), var(--shadow-md)`
                  : "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                width: "100%",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex" }}>
                {opt.subjects.map((s, i) => (
                  <div key={s} style={{ marginLeft: i === 0 ? 0 : -12, boxShadow: "0 0 0 2px var(--bg-1)", borderRadius: 12 }}>
                    <SubjectIcon subject={s} size={36} />
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{opt.desc}</div>
              </div>
              <PlanRadio checked={selected} tone={opt.tone} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepLevelYear({
  currentLevel,
  targetYear,
  onLevel,
  onYear,
}: {
  currentLevel: string;
  targetYear: number;
  onLevel: (v: string) => void;
  onYear: (v: number) => void;
}) {
  return (
    <div style={{ padding: "8px 22px 32px" }}>
      <div className="eyebrow" style={{ marginBottom: 14, color: "var(--fg-3)" }}>Step 2 of 3</div>
      <div className="h-display" style={{ fontSize: 34, marginBottom: 10, lineHeight: 1.1 }}>
        Where are you <em>right now?</em>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginBottom: 28, lineHeight: 1.5 }}>
        This shapes how aggressive we get with hard problems.
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>Current level</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {LEVEL_OPTIONS.map(l => {
          const selected = currentLevel === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onLevel(l.id)}
              style={{
                padding: "14px 16px",
                borderRadius: 16,
                background: "var(--bg-1)",
                border: `1px solid ${selected ? "var(--fg-0)" : "var(--line-1)"}`,
                boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                width: "100%",
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{l.label}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{l.desc}</div>
              </div>
              <PlanRadio checked={selected} />
            </button>
          );
        })}
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>Target year</div>
      <div style={{ display: "flex", gap: 8 }}>
        {PLAN_YEARS.map(y => {
          const selected = targetYear === y;
          return (
            <button
              key={y}
              type="button"
              onClick={() => onYear(y)}
              style={{
                flex: 1,
                padding: "14px 12px",
                borderRadius: 14,
                background: selected ? "var(--accent)" : "var(--bg-1)",
                color: selected ? "var(--accent-fg)" : "var(--fg-0)",
                border: `1px solid ${selected ? "var(--accent)" : "var(--line-1)"}`,
                boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)",
                fontFamily: "var(--serif)",
                fontSize: 22,
                letterSpacing: "-0.02em",
                cursor: "pointer",
              }}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDaily({ dailyMinutes, onDaily }: { dailyMinutes: number; onDaily: (v: number) => void }) {
  return (
    <div style={{ padding: "8px 22px 32px" }}>
      <div className="eyebrow" style={{ marginBottom: 14, color: "var(--fg-3)" }}>Step 3 of 3</div>
      <div className="h-display" style={{ fontSize: 34, marginBottom: 10, lineHeight: 1.1 }}>
        How much time, <em>every day?</em>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginBottom: 28, lineHeight: 1.5 }}>
        The streak only counts if you hit your goal. Pick something honest.
      </div>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div className="serif" style={{ fontSize: 80, lineHeight: 1, color: "var(--accent)", letterSpacing: "-0.04em" }}>
          {dailyMinutes}
        </div>
        <div className="eyebrow" style={{ marginTop: 6 }}>minutes / day</div>
      </div>

      <div style={{ padding: "0 4px" }}>
        <input
          type="range"
          className="plan-range"
          min={30}
          max={240}
          step={15}
          value={dailyMinutes}
          onChange={e => onDaily(+e.target.value)}
          style={{ ["--pct" as string]: `${((dailyMinutes - 30) / 210) * 100}%` }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-3)" }}>
          <span>30m</span>
          <span>120m</span>
          <span>240m</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {DAILY_PRESETS.map(p => {
          const active = Math.abs(dailyMinutes - p.v) < 8;
          return (
            <button
              key={p.v}
              type="button"
              onClick={() => onDaily(p.v)}
              className="chip"
              style={{
                cursor: "pointer",
                borderColor: active ? "var(--accent)" : "var(--line-2)",
                background: active ? "var(--accent-soft)" : "var(--bg-2)",
                color: active ? "var(--accent)" : "var(--fg-1)",
                fontSize: 11.5,
                padding: "7px 12px",
                fontWeight: 600,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--fg-3)", textAlign: "center", marginTop: 20, lineHeight: 1.5 }}>
        Tap <strong style={{ color: "var(--fg-1)", fontWeight: 600 }}>Save plan</strong> below when you&apos;re done.
      </p>
    </div>
  );
}

function PlanRadio({ checked, tone = "var(--fg-0)" }: { checked: boolean; tone?: string }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: `2px solid ${checked ? tone : "var(--line-2)"}`,
        background: checked ? tone : "transparent",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {checked && <Icons.Check size={13} />}
    </div>
  );
}
