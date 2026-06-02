"use client";
import React, { useState } from "react";
import { SubjectIcon, Icons } from "./shared";
import { Field } from "./auth";

const ONBOARD_KEY = "examleet_onboarded_v1";

interface OnboardAnswers {
  exam: string | null;
  targetYear: number;
  currentLevel: string | null;
  dailyMinutes: number;
  name: string;
  city: string;
}

interface OnboardingProps {
  onFinish: (answers: Record<string, unknown>) => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardAnswers>({
    exam: null,
    targetYear: 2027,
    currentLevel: null,
    dailyMinutes: 90,
    name: "",
    city: "",
  });

  const setA = <K extends keyof OnboardAnswers>(k: K, v: OnboardAnswers[K]) =>
    setAnswers(a => ({ ...a, [k]: v }));

  const steps = [
    { id: "welcome", canNext: () => true, render: () => <StepWelcome /> },
    { id: "goal", canNext: () => !!answers.exam, render: () => <StepGoal answers={answers} setA={setA} /> },
    { id: "profile", canNext: () => !!answers.currentLevel && answers.name.trim().length >= 2, render: () => <StepProfile answers={answers} setA={setA} /> },
    { id: "commit", canNext: () => true, render: () => <StepCommit answers={answers} setA={setA} /> },
  ];

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const current = steps[step];

  const next = () => {
    if (isLast) {
      try { localStorage.setItem(ONBOARD_KEY, JSON.stringify(answers)); } catch { }
      onFinish(answers as unknown as Record<string, unknown>);
    } else {
      setStep(s => s + 1);
    }
  };

  const skip = () => {
    try { localStorage.setItem(ONBOARD_KEY, JSON.stringify({ skipped: true })); } catch { }
    onFinish(answers as unknown as Record<string, unknown>);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="screen" style={{ paddingBottom: 0, flex: 1 }}>
        <div style={{ padding: "22px 22px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          {!isFirst ? (
            <button onClick={() => setStep(s => Math.max(0, s - 1))} className="btn btn-ghost" style={{ padding: 8, marginLeft: -8, color: "var(--fg-2)" }}>
              <Icons.ArrowLeft size={18} />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          <div style={{ flex: 1, display: "flex", gap: 4 }}>
            {steps.map((s, i) => (
              <div key={s.id} style={{ height: 3, flex: 1, borderRadius: 999, background: i <= step ? "var(--accent)" : "var(--bg-3)", transition: "background .3s ease" }} />
            ))}
          </div>
          <button onClick={skip} style={{ fontSize: 12, color: "var(--fg-3)", padding: 8 }}>Skip</button>
        </div>

        <div key={step} className="fade-up" style={{ flex: 1, overflowY: "auto" }}>
          {current.render()}
        </div>
      </div>

      <div style={{ padding: "12px 22px 24px", background: "linear-gradient(180deg, transparent, var(--bg-0) 30%)" }}>
        <button onClick={next} className="btn btn-primary btn-block btn-lg" disabled={!current.canNext()} style={{ opacity: current.canNext() ? 1 : 0.35, cursor: current.canNext() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {isLast ? "Start solving" : "Continue"} <Icons.ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div style={{ padding: "20px 22px 40px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0 40px" }}>
        <OnboardHero />
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 14 }}>★ ExamLeet · v1.0</div>
        <div className="h-display" style={{ fontSize: 42, marginBottom: 16, lineHeight: 1.1 }}>
          Crack JEE — <em>one question at a time.</em>
        </div>
        <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 320, margin: "0 auto" }}>
          The daily-drill app built for serious droppers. 30,000+ PYQs, AI hints, weekly mocks ranked all-India.
        </div>
      </div>
    </div>
  );
}

function OnboardHero() {
  return (
    <div style={{ position: "relative", width: 280, height: 240 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, var(--accent-soft) 0%, transparent 70%)" }} />
      <FloatTile subject="phy" x={20} y={60} rotate={-8} delay={0} />
      <FloatTile subject="chem" x={180} y={40} rotate={6} delay={0.15} />
      <FloatTile subject="math" x={100} y={160} rotate={4} delay={0.3} />
      <div style={{ position: "absolute", top: 80, left: 90, width: 100, height: 100, borderRadius: "50%", background: "var(--accent)", color: "var(--accent-fg)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-lg), 0 0 0 8px var(--bg-0), 0 0 0 9px var(--accent-soft)", animation: "float 3s ease-in-out infinite" }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path d="M12 3l2.4 6.4L21 11l-5.4 4 1.8 6.5L12 18l-5.4 3.5L8.4 15 3 11l6.6-1.6z" fill="currentColor" />
        </svg>
      </div>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes floatTile { 0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); } 50% { transform: translateY(-4px) rotate(var(--r, 0deg)); } }
      `}</style>
    </div>
  );
}

function FloatTile({ subject, x, y, rotate, delay }: { subject: string; x: number; y: number; rotate: number; delay: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rotate}deg)`, animation: `floatTile 3.2s ease-in-out ${delay}s infinite`, boxShadow: "var(--shadow-md)", borderRadius: 14 }}>
      <SubjectIcon subject={subject as "phy" | "chem" | "math"} size={64} />
    </div>
  );
}

function StepGoal({ answers, setA }: { answers: OnboardAnswers; setA: <K extends keyof OnboardAnswers>(k: K, v: OnboardAnswers[K]) => void }) {
  const options = [
    { id: "mains", label: "JEE Mains", desc: "Engineering · 90 Q / 3h", subjects: ["phy", "chem", "math"] as const, tone: "var(--phy)" },
    { id: "adv", label: "JEE Advanced", desc: "IITs · Paper 1 & 2", subjects: ["phy", "chem", "math"] as const, tone: "var(--accent)" },
  ];

  return (
    <div style={{ padding: "12px 22px 40px" }}>
      <div className="eyebrow" style={{ marginBottom: 14, color: "var(--fg-3)" }}>Step 1 of 3</div>
      <div className="h-display" style={{ fontSize: 36, marginBottom: 10, lineHeight: 1.1 }}>Which exam are you <em>chasing?</em></div>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginBottom: 28, lineHeight: 1.5 }}>We'll tune the question mix to match your syllabus and difficulty curve.</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map(opt => {
          const selected = answers.exam === opt.id;
          return (
            <button key={opt.id} onClick={() => setA("exam", opt.id)}
              style={{ padding: 16, borderRadius: 18, background: "var(--bg-1)", border: `1px solid ${selected ? opt.tone : "var(--line-1)"}`, boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${opt.tone} 14%, transparent), var(--shadow-md)` : "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 14, textAlign: "left", width: "100%", cursor: "pointer" }}>
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
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selected ? opt.tone : "var(--line-2)"}`, background: selected ? opt.tone : "transparent", color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {selected && <Icons.Check size={13} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepProfile({ answers, setA }: { answers: OnboardAnswers; setA: <K extends keyof OnboardAnswers>(k: K, v: OnboardAnswers[K]) => void }) {
  const levels = [
    { id: "11", label: "Class XI", desc: "Just starting" },
    { id: "12", label: "Class XII", desc: "Final year" },
    { id: "drop", label: "Dropper", desc: "Take 2 — let's go" },
  ];
  const years = [2026, 2027, 2028];

  return (
    <div style={{ padding: "12px 22px 40px" }}>
      <div className="eyebrow" style={{ marginBottom: 14, color: "var(--fg-3)" }}>Step 2 of 3</div>
      <div className="h-display" style={{ fontSize: 36, marginBottom: 10, lineHeight: 1.1 }}>Where are you <em>right now?</em></div>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginBottom: 28, lineHeight: 1.5 }}>This shapes how aggressive we get with hard problems.</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        <Field label="Your name" value={answers.name} onChange={v => setA("name", v)} placeholder="Ananya Sharma" />
        <Field label="City (optional)" value={answers.city} onChange={v => setA("city", v)} placeholder="Kota, Rajasthan"
          left={<Icons.Pin size={14} style={{ color: "var(--fg-3)" }} />} />
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>Current level</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {levels.map(l => {
          const selected = answers.currentLevel === l.id;
          return (
            <button key={l.id} onClick={() => setA("currentLevel", l.id)}
              style={{ padding: "14px 16px", borderRadius: 16, background: "var(--bg-1)", border: `1px solid ${selected ? "var(--fg-0)" : "var(--line-1)"}`, boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 14, textAlign: "left", width: "100%", cursor: "pointer" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{l.label}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{l.desc}</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected ? "var(--fg-0)" : "var(--line-2)"}`, background: selected ? "var(--fg-0)" : "transparent", color: "var(--bg-0)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {selected && <Icons.Check size={11} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>Target year</div>
      <div style={{ display: "flex", gap: 8 }}>
        {years.map(y => {
          const selected = answers.targetYear === y;
          return (
            <button key={y} onClick={() => setA("targetYear", y)}
              style={{ flex: 1, padding: "14px 12px", borderRadius: 14, background: selected ? "var(--accent)" : "var(--bg-1)", color: selected ? "var(--accent-fg)" : "var(--fg-0)", border: `1px solid ${selected ? "var(--accent)" : "var(--line-1)"}`, boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)", fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "-0.02em", cursor: "pointer" }}>
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepCommit({ answers, setA }: { answers: OnboardAnswers; setA: <K extends keyof OnboardAnswers>(k: K, v: OnboardAnswers[K]) => void }) {
  const minutes = answers.dailyMinutes;
  const EXAM_LABEL: Record<string, string> = { mains: "JEE Mains", adv: "JEE Advanced" };
  const LEVEL_LABEL: Record<string, string> = { "11": "Class XI", "12": "Class XII", "drop": "Dropper" };

  return (
    <div style={{ padding: "12px 22px 40px" }}>
      <div className="eyebrow" style={{ marginBottom: 14, color: "var(--fg-3)" }}>Step 3 of 3</div>
      <div className="h-display" style={{ fontSize: 36, marginBottom: 10, lineHeight: 1.1 }}>How much time, <em>every day?</em></div>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginBottom: 32, lineHeight: 1.5 }}>The streak only counts if you hit your goal. Pick something honest.</div>

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="serif" style={{ fontSize: 96, lineHeight: 1, color: "var(--accent)", letterSpacing: "-0.04em" }}>{minutes}</div>
        <div className="eyebrow" style={{ marginTop: 6 }}>minutes / day</div>
      </div>

      <div style={{ padding: "0 4px" }}>
        <input type="range" min={30} max={240} step={15} value={minutes}
          onChange={e => setA("dailyMinutes", +e.target.value)}
          style={{ width: "100%", accentColor: "var(--accent)", height: 6 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-3)" }}>
          <span>30m</span><span>120m</span><span>240m</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
        {[{ v: 45, label: "Casual" }, { v: 90, label: "Serious" }, { v: 150, label: "Intense" }, { v: 210, label: "Beast mode" }].map(p => {
          const active = Math.abs(minutes - p.v) < 8;
          return (
            <button key={p.v} onClick={() => setA("dailyMinutes", p.v)} className="chip"
              style={{ cursor: "pointer", borderColor: active ? "var(--accent)" : "var(--line-2)", background: active ? "var(--accent-soft)" : "var(--bg-2)", color: active ? "var(--accent)" : "var(--fg-1)", fontSize: 11.5, padding: "7px 12px", fontWeight: 600 }}>
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 36, padding: 16, background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 16, boxShadow: "var(--shadow-sm)" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Your plan</div>
        <SummaryLine icon={<Icons.Target size={13} />} k="Goal" v={EXAM_LABEL[answers.exam || ""] || "—"} />
        <SummaryLine icon={<Icons.Calendar size={13} />} k="Year" v={String(answers.targetYear)} />
        <SummaryLine icon={<Icons.Book size={13} />} k="Level" v={LEVEL_LABEL[answers.currentLevel || ""] || "—"} />
        <SummaryLine icon={<Icons.Clock size={13} />} k="Daily" v={`${minutes} min`} last />
      </div>
    </div>
  );
}

function SummaryLine({ icon, k, v, last }: { icon: React.ReactNode; k: string; v: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: last ? "none" : "1px solid var(--line-1)" }}>
      <span style={{ color: "var(--fg-3)" }}>{icon}</span>
      <span style={{ fontSize: 12, color: "var(--fg-2)", flex: 1 }}>{k}</span>
      <span style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 600 }}>{v}</span>
    </div>
  );
}

export { ONBOARD_KEY };
