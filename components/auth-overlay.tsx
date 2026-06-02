"use client";
import React, { useState, useEffect } from "react";
import { Icons } from "./shared";
import Onboarding from "./onboarding";
import { supabase } from "@/lib/supabase";

interface AuthReason {
  icon: string;
  title: string;
  body: string;
}

interface AuthOverlayProps {
  open: boolean;
  reason: AuthReason | null;
  onClose: () => void;
  onAuthed: (record: Record<string, unknown>) => void;
  onboardData: Record<string, unknown> | null;
  onOnboarded: (answers: Record<string, unknown>) => void;
  isDesktop?: boolean;
  skipToOnboarding?: boolean;
}

type OverlayView = "sheet" | "onboarding";

export default function AuthOverlay({ open, reason, onClose, onAuthed, onboardData, onOnboarded, isDesktop, skipToOnboarding }: AuthOverlayProps) {
  const [view, setView] = useState<OverlayView | null>(null);

  useEffect(() => {
    if (open) setView(skipToOnboarding ? "onboarding" : "sheet");
    else setView(null);
  }, [open, skipToOnboarding]);

  if (!view) return null;

  const isSheet = view === "sheet";
  const fullscreen = !isSheet;

  const handleAuthed = (record: Record<string, unknown>) => {
    onAuthed(record);
    if (!onboardData) setView("onboarding");
    else onClose();
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Page redirects — nothing runs after this
  };

  const handleOnboarded = (answers: Record<string, unknown>) => {
    onOnboarded(answers);
    onClose();
  };

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(8,8,10,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "fadeIn .2s ease" }}
        onClick={() => isSheet && onClose()}
      />

      <div style={{ position: "fixed", inset: 0, zIndex: 81, display: "flex", alignItems: isSheet && !isDesktop ? "flex-end" : "center", justifyContent: "center", pointerEvents: "none", padding: isDesktop ? 24 : 0 }}>
        <div style={{
          width: "100%", maxWidth: isDesktop ? 440 : 420,
          height: fullscreen ? (isDesktop ? "min(720px, 100dvh - 48px)" : "min(900px, 100dvh - 40px)") : "auto",
          maxHeight: isDesktop ? "calc(100dvh - 48px)" : "100dvh",
          background: "var(--bg-0)",
          borderRadius: isDesktop ? 24 : (isSheet ? "28px 28px 0 0" : 36),
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          animation: isDesktop ? "fadeIn .2s ease" : (isSheet ? "sheetUp .35s cubic-bezier(.2,.9,.3,1.1) both" : "fadeIn .2s ease"),
        }}>
          {view === "sheet" && (
            <SheetBody
              reason={reason}
              onGoogle={handleGoogle}
              onClose={onClose}
            />
          )}
          {view === "onboarding" && (
            <Onboarding onFinish={handleOnboarded} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

function SheetBody({ reason, onGoogle, onClose }: { reason: AuthReason | null; onGoogle: () => void; onClose: () => void }) {
  const { title, body, icon } = reason || { title: "Sign in to continue", body: "Create an account to unlock the full ExamLeet experience.", icon: "lock" };

  return (
    <div style={{ padding: "20px 22px 28px" }}>
      <div style={{ width: 44, height: 4, borderRadius: 999, background: "var(--line-2)", margin: "0 auto 18px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <ReasonIcon kind={icon} />
        <button onClick={onClose} className="btn btn-ghost" style={{ padding: 8, color: "var(--fg-2)" }}>
          <Icons.X size={18} />
        </button>
      </div>
      <div className="h-display" style={{ fontSize: 30, marginBottom: 10, lineHeight: 1.05 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55, marginBottom: 24 }}>{body}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={onGoogle}
          className="btn btn-block"
          style={{ padding: "14px 18px", background: "var(--bg-1)", border: "1px solid var(--line-2)", fontWeight: 600, fontSize: 14, color: "var(--fg-0)", gap: 10, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16 }}
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button onClick={onClose} style={{ fontSize: 12, color: "var(--fg-3)", padding: 10, marginTop: 2 }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.3z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.5C4.7 19.6 8.1 22 12 22z" fill="#34A853" />
      <path d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.6H3.1C2.4 9 2 10.4 2 12s.4 3 1.1 4.4l3.3-2.5z" fill="#FBBC04" />
      <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3 14.7 2 12 2 8.1 2 4.7 4.4 3.1 7.6l3.3 2.5c.8-2.4 3-4.1 5.6-4.1z" fill="#EA4335" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

function ReasonIcon({ kind }: { kind: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    lock: <Icons.Lock size={20} />,
    hint: <Icons.Lightbulb size={20} />,
    trophy: <Icons.Trophy size={20} />,
    medal: <Icons.Medal size={20} />,
    user: <Icons.User size={20} />,
    bookmark: <Icons.Bookmark size={20} />,
    bolt: <Icons.Bolt size={20} />,
    book: <Icons.Book size={20} />,
    calendar: <Icons.Calendar size={20} />,
  };
  return (
    <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
      {iconMap[kind] || iconMap.lock}
    </div>
  );
}

export const AUTH_REASONS: Record<string, AuthReason> = {
  hint: { icon: "hint", title: "Sign in to unlock hints", body: "Save your progress, get progressive hints, and step-by-step solutions across every problem." },
  bookmark: { icon: "bookmark", title: "Sign in to save problems", body: "Bookmarks sync across devices so you can come back to any tricky question later." },
  ranks: { icon: "medal", title: "See where you stand", body: "All-India ranks, city leaderboards, and friends — track your climb every week." },
  contest: { icon: "trophy", title: "Sign in to enter the contest", body: "Reserve your seat, get reminders, and ranked all-India scoring after the test." },
  profile: { icon: "user", title: "Sign in to track your journey", body: "Streaks, rating, subject mastery, every accepted solution — saved and visualized." },
  solution: { icon: "hint", title: "Sign in to view solutions", body: "Full step-by-step walkthroughs available after sign-in." },
  dailyPick: { icon: "bolt", title: "Sign in for today’s Daily Pick", body: "One curated Medium/Hard question per day with 1.5× rating on your first attempt — sign in to play." },
  pyqChapters: {
    icon: "book",
    title: "Sign in to browse by chapter",
    body: "See every chapter in Physics, Chemistry & Maths — sorted by weakness, attempts, or A→Z. Track solved PYQs and spot gaps before they cost marks.",
  },
  pyqYears: {
    icon: "calendar",
    title: "Sign in to browse by year",
    body: "Open any year from 2015–2024, compare Mains vs Advanced papers, and jump into past JEE questions with your progress saved.",
  },
  pyqBrowse: {
    icon: "lock",
    title: "Sign in to unlock the full archive",
    body: "Chapter grids and year-by-year paper breakdowns need an account — your attempts and mastery sync across devices.",
  },
};
