"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Problem } from "@/lib/data";
import { dbQuestionToProblem } from "@/lib/data";
import { authFetch } from "@/lib/auth";
import {
  applySolveFilter,
  filtersToSearchParams,
  type ProblemPlayQueue,
} from "@/lib/playQueue";
import Dashboard from "@/components/dashboard";
import Playground from "@/components/playground";
import PYQBrowser from "@/components/pyq-browser";
import Contests from "@/components/contests";
import Profile from "@/components/profile";
import AuthOverlay, { AUTH_REASONS } from "@/components/auth-overlay";
import { BottomNav, TopNav, ExamLeetMark, Avatar, Icons } from "@/components/shared";
import SearchModal from "@/components/search-modal";

const AUTH_KEY = "examleet_auth_v1";
const ONBOARD_KEY = "examleet_onboarded_v1";

type TabId = "home" | "sets" | "contests" | "profile";

const TABS: TabId[] = ["home", "sets", "contests", "profile"];

function getTabFromURL(): TabId | null {
  if (typeof window === "undefined") return null;
  const t = new URLSearchParams(window.location.search).get("tab");
  return TABS.includes(t as TabId) ? (t as TabId) : null;
}

/** Guests land on Problems; signed-in users default to Home (adjusted after session check). */
function getInitialTab(): TabId {
  return getTabFromURL() ?? "sets";
}

function defaultTabForAuth(signedIn: boolean): TabId {
  return signedIn ? "home" : "sets";
}

function syncURL(tab: TabId, problemId?: string) {
  const qs = problemId ? `?problem=${problemId}` : tab !== "home" ? `?tab=${tab}` : "";
  window.history.replaceState(null, "", qs || "/");
}

interface AuthRecord {
  name: string;
  email: string;
  city?: string;
  method?: string;
  signedUpAt?: string;
}

export default function Page() {
  const [tab, setTab] = useState<TabId>(getInitialTab);
  const [playingProblem, setPlayingProblem] = useState<Problem | null>(null);
  const [playQueue, setPlayQueue] = useState<ProblemPlayQueue | null>(null);
  const [auth, setAuth] = useState<AuthRecord | null>(null);
  const [onboardData, setOnboardData] = useState<Record<string, unknown> | null>(null);
  const [authReason, setAuthReason] = useState<{ icon: string; title: string; body: string } | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [dailyPickId, setDailyPickId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const pendingSuccessRef = useRef<(() => void) | null>(null);
  const authDefaultTabAppliedRef = useRef(false);

  const applyAuthDefaultTab = useCallback((signedIn: boolean) => {
    if (getTabFromURL() || authDefaultTabAppliedRef.current) return;
    authDefaultTabAppliedRef.current = true;
    setTab(defaultTabForAuth(signedIn));
  }, []);

  // Sync tab + active problem to URL so refresh restores position
  useEffect(() => {
    if (mounted) syncURL(tab, playingProblem?.id);
  }, [tab, playingProblem, mounted]);

  useEffect(() => {
    setMounted(true);
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);

    authFetch("/api/daily-pick")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data?.id) setDailyPickId(json.data.id); })
      .catch(() => null);

    // Restore problem from URL (e.g. ?problem=<id> after refresh)
    const problemId = new URLSearchParams(window.location.search).get("problem");
    if (problemId) {
      authFetch(`/api/questions/${problemId}`)
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.data) {
            setPlayingProblem(dbQuestionToProblem(json.data));
            setPlayQueue(null);
          }
        })
        .catch(() => null);
    }

    // Restore onboarding answers from localStorage (fast, non-sensitive)
    try {
      const onb = localStorage.getItem(ONBOARD_KEY);
      if (onb) setOnboardData(JSON.parse(onb));
    } catch { }

    // Check existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) applySession(session);
      applyAuthDefaultTab(!!session);
    }).finally(() => setAuthChecked(true));

    // Listen for sign-in / sign-out events (fires after OAuth redirect too)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) applySession(session);
      else {
        setAuth(null);
        setOnboardData(null);
        setProfileData(null);
        if (!getTabFromURL()) setTab("sets");
      }
    });

    return () => {
      window.removeEventListener("resize", checkDesktop);
      window.removeEventListener("keydown", onKey);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySession(session: { user: { email?: string; user_metadata?: Record<string, string>; created_at: string }; access_token: string }) {
    const u = session.user;
    setAuth({ name: "", email: u.email ?? "", method: "google", signedUpAt: u.created_at });

    const token = session.access_token;

    const syncUser = () => fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ email: u.email }),
    });

    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (r.status === 404) {
          // User missing from DB (sync failed in callback) — create now
          await syncUser();
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(json => {
        if (!json?.data) {
          setNeedsOnboarding(true);
          return;
        }
        const p = json.data;
        setProfileData(p);
        setAuth(a => ({
          ...a!,
          name: (p.name as string) || a?.name || "",
          city: (p.city as string) || "",
        }));
        if (p.examType) {
          const onb = {
            exam: p.examType,
            currentLevel: p.currentLevel,
            targetYear: p.targetYear,
            dailyMinutes: p.dailyGoalMinutes,
            name: p.name,
            city: p.city,
          };
          setOnboardData(onb);
          try { localStorage.setItem(ONBOARD_KEY, JSON.stringify(onb)); } catch { }
        } else {
          setNeedsOnboarding(true);
        }
      })
      .catch(() => null);
  }

  const isGuest = !auth;

  const requireAuth = useCallback((reasonKey: string, onSuccess?: () => void): boolean => {
    if (auth) {
      onSuccess?.();
      return true;
    }
    pendingSuccessRef.current = onSuccess || null;
    setAuthReason(AUTH_REASONS[reasonKey] || AUTH_REASONS.profile);
    return false;
  }, [auth]);

  const handleAuthed = (record: Record<string, unknown>) => {
    // Only used for non-OAuth flows (phone OTP) — Google sets auth via onAuthStateChange
    setAuth(record as unknown as AuthRecord);
  };

  const handleOnboarded = (answers: Record<string, unknown>) => {
    try { localStorage.setItem(ONBOARD_KEY, JSON.stringify(answers)); } catch { }
    setOnboardData(answers);
    setNeedsOnboarding(false);
    setAuthReason(null);

    const displayName = String(answers.name ?? "").trim();

    // Persist onboarding profile + unique handle from chosen name
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          name: displayName,
          city: String(answers.city ?? "").trim(),
          examType: answers.exam,
          targetYear: answers.targetYear,
          currentLevel: answers.currentLevel,
          dailyGoalMinutes: answers.dailyMinutes,
          generateHandleFromName: displayName.length >= 2,
        }),
      })
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          if (!json?.data) return;
          setProfileData(json.data);
          setAuth(a => ({
            ...a!,
            name: json.data.name as string,
            city: (json.data.city as string) || "",
          }));
        })
        .catch(() => null);
    });

    if (displayName.length >= 2) {
      setAuth(a => (a ? { ...a, name: displayName, city: String(answers.city ?? "").trim() } : a));
    }

    pendingSuccessRef.current?.();
    pendingSuccessRef.current = null;
  };

  const closeAuthOverlay = () => {
    setAuthReason(null);
    setNeedsOnboarding(false);
    if (auth && onboardData) {
      pendingSuccessRef.current?.();
      pendingSuccessRef.current = null;
    }
  };

  const refreshProfile = () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch("/api/me", { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(json => { if (json?.data) setProfileData(json.data); });
    });
  };

  const resetAll = () => {
    supabase.auth.signOut();
    try { localStorage.removeItem(ONBOARD_KEY); } catch { }
    setAuth(null);
    setOnboardData(null);
    setProfileData(null);
    setTab(getTabFromURL() ?? "sets");
    setPlayingProblem(null);
    setPlayQueue(null);
  };

  const openProblem = useCallback((p: Problem, queue?: ProblemPlayQueue) => {
    setPlayingProblem(p);
    setPlayQueue(queue ?? null);
    syncURL(tab, p.id);
  }, [tab]);

  const goToPrevProblem = useCallback(async () => {
    if (!playQueue || playQueue.index <= 0) return;
    const prevIndex = playQueue.index - 1;
    const id = playQueue.ids[prevIndex];
    const res = await authFetch(`/api/questions/${id}`).catch(() => null);
    if (!res?.ok) return;
    const json = await res.json();
    if (!json?.data) return;
    setPlayingProblem(dbQuestionToProblem(json.data));
    setPlayQueue({ ...playQueue, index: prevIndex });
    syncURL(tab, id);
  }, [playQueue, tab]);

  const goToNextProblem = useCallback(async () => {
    if (!playingProblem) return;

    const loadById = async (id: string, queue: ProblemPlayQueue) => {
      const res = await authFetch(`/api/questions/${id}`).catch(() => null);
      if (!res?.ok) return false;
      const json = await res.json();
      if (!json?.data) return false;
      setPlayingProblem(dbQuestionToProblem(json.data));
      setPlayQueue(queue);
      syncURL(tab, id);
      return true;
    };

    if (playQueue) {
      const nextIndex = playQueue.index + 1;
      if (nextIndex < playQueue.ids.length) {
        await loadById(playQueue.ids[nextIndex], { ...playQueue, index: nextIndex });
        return;
      }

      if (playQueue.filters) {
        const params = filtersToSearchParams(playQueue.filters, 50, playQueue.ids.length);
        const res = await authFetch(`/api/questions?${params}`).catch(() => null);
        if (!res?.ok) return;
        const json = await res.json();
        const items = (json.data?.items ?? []).map(dbQuestionToProblem) as Problem[];
        const filtered = applySolveFilter(items, playQueue.solveFilter);
        const seen = new Set(playQueue.ids);
        const newItems = filtered.filter(p => !seen.has(p.id));
        if (newItems.length > 0) {
          const newIds = [...playQueue.ids, ...newItems.map(p => p.id)];
          const nextId = newItems[0].id;
          await loadById(nextId, {
            ...playQueue,
            ids: newIds,
            index: playQueue.ids.length,
          });
        }
        return;
      }
    }

    const params = new URLSearchParams({ limit: "30", subject: playingProblem.subject });
    if (playingProblem.chapter) params.set("chapter", playingProblem.chapter);
    const res = await authFetch(`/api/questions?${params}`).catch(() => null);
    if (!res?.ok) return;
    const json = await res.json();
    const items = (json.data?.items ?? []).map(dbQuestionToProblem) as Problem[];
    if (items.length === 0) return;
    const curIdx = items.findIndex(p => p.id === playingProblem.id);
    const next = curIdx >= 0 ? items[curIdx + 1] ?? items[0] : items[0];
    if (next.id === playingProblem.id && items.length < 2) return;
    openProblem(
      next,
      {
        ids: items.map(p => p.id),
        index: items.findIndex(p => p.id === next.id),
        filters: { subject: playingProblem.subject, chapter: playingProblem.chapter },
      },
    );
  }, [playingProblem, playQueue, tab, openProblem]);

  const user = useMemo(() => {
    if (!auth) return null;
    const p = profileData as Record<string, unknown> | null;
    const examType = (p?.examType as string) || (onboardData?.exam as string) || null;
    const targetYear = (p?.targetYear as number) ?? (onboardData?.targetYear as number) ?? null;
    const currentLevel = (p?.currentLevel as string) || (onboardData?.currentLevel as string) || null;
    const dailyGoalMinutes = (p?.dailyGoalMinutes as number) ?? (onboardData?.dailyMinutes as number) ?? 120;

    return {
      name: (p?.name as string) || auth.name || "",
      email: auth.email,
      city: (p?.city as string) || auth.city || "",
      handle: (p?.handle as string) || "",
      joined: auth.signedUpAt ? formatJoinDate(auth.signedUpAt) : "",
      authMethod: auth.method,
      target: examType ? buildTargetLabel({ exam: examType, targetYear, currentLevel }) : "",
      examType,
      currentLevel,
      targetYear,
      dailyGoalMinutes,
      rating: (p?.rating as number) || 1200,
      rank: (p?.rankAllIndia as number) || "—",
      delta: ((rd: number) => rd >= 0 ? `+${rd}` : `${rd}`)((p?.ratingDelta as number) ?? 0),
      solved: (p?.solveCounts as { attempted?: number })?.attempted ?? (p?.totalSolved as number) ?? 0,
      correct: (p?.solveCounts as { correct?: number })?.correct ?? 0,
      total: 30000,
      streak: (p?.streakCurrent as number) || 0,
      streakMax: (p?.streakMax as number) || 0,
      todayMinutes: 0,
      weeklyGoal: dailyGoalMinutes * 7,
      weeklyDone: 0,
      badges: ((p?.userBadges as Array<{badge: {type: string}}>)?.map(ub => ub.badge.type) ?? []) as string[],
      mastery: [],
      recent: [],
    };
  }, [auth, onboardData, profileData]);

  if (!mounted) return null;

  const isPlaying = playingProblem !== null;

  const renderScreen = () => {
    if (isPlaying) {
      return (
        <Playground
          problem={playingProblem!}
          onBack={() => { setPlayingProblem(null); setPlayQueue(null); }}
          onNext={goToNextProblem}
          onPrev={playQueue && playQueue.index > 0 ? goToPrevProblem : undefined}
          queueLabel={
            playQueue && playQueue.ids.length > 1
              ? `${Math.min(playQueue.index + 1, playQueue.ids.length)} / ${playQueue.ids.length}`
              : undefined
          }
          isGuest={isGuest}
          requireAuth={requireAuth}
          isDesktop={isDesktop}
          userRating={typeof user?.rating === "number" ? user.rating : 1200}
          onFirstSolve={refreshProfile}
          isDailyPick={playingProblem?.id === dailyPickId}
        />
      );
    }
    switch (tab) {
      case "home":
        return (
          <Dashboard
            onOpenProblem={openProblem}
            onGoto={(id) => setTab(id as TabId)}
            user={user}
            isGuest={isGuest}
            onSignIn={() => setAuthReason(AUTH_REASONS.profile)}
            requireAuth={requireAuth}
            isDesktop={isDesktop}
          />
        );
      case "sets":
        return <PYQBrowser onOpenProblem={openProblem} isDesktop={isDesktop} isGuest={isGuest} authReady={authChecked} requireAuth={requireAuth} />;
      case "contests":
        return <Contests isGuest={isGuest} requireAuth={requireAuth} isDesktop={isDesktop} />;
      case "profile":
        return isGuest
          ? <GuestGate reasonKey="profile" onSignIn={() => setAuthReason(AUTH_REASONS.profile)} />
          : (
            <Profile
              user={user}
              onSignOut={resetAll}
              isDesktop={isDesktop}
              onProfileUpdated={data => {
                setProfileData(data);
                setOnboardData({
                  exam: data.examType,
                  currentLevel: data.currentLevel,
                  targetYear: data.targetYear,
                  dailyMinutes: data.dailyGoalMinutes,
                  name: data.name,
                  city: data.city,
                });
                setAuth(a => (a ? { ...a, name: data.name as string, city: (data.city as string) || "" } : a));
              }}
            />
          );
      default:
        return null;
    }
  };

  const authOverlay = (
    <AuthOverlay
      open={!!authReason || needsOnboarding}
      reason={authReason}
      onClose={closeAuthOverlay}
      onAuthed={handleAuthed}
      onboardData={onboardData}
      onOnboarded={handleOnboarded}
      isDesktop={isDesktop}
      skipToOnboarding={needsOnboarding && !authReason}
    />
  );

  if (isDesktop) {
    return (
      <>
        <div className="stage" style={{ alignItems: "stretch", justifyContent: "flex-start", background: "var(--bg-0)" }}>
          <div className="desktop-shell">
            {/* Desktop top bar */}
            <header className="dt-topbar">
              <button className="dt-brand" onClick={() => { setPlayingProblem(null); setPlayQueue(null); setTab("home"); }}>
                <ExamLeetMark size={36} />
                <span>Exam<em>Leet</em></span>
              </button>
              <TopNav tab={isPlaying ? "" : tab} onChange={(t) => { setPlayingProblem(null); setPlayQueue(null); setTab(t as TabId); }} />
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setSearchOpen(true)} style={{ padding: "8px 14px", gap: 8, color: "var(--fg-2)", border: "1px solid var(--line-1)", borderRadius: 12, fontSize: 12.5, display: "flex", alignItems: "center" }}>
                  <Icons.Search size={14} />
                  <span>Search</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)", padding: "2px 6px", borderRadius: 5, background: "var(--bg-2)", border: "1px solid var(--line-1)", marginLeft: 4 }}>⌘K</span>
                </button>
                {!isGuest && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 12px", borderRadius: 999, border: "1px solid var(--line-1)", background: "var(--bg-1)", fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>
                    <Icons.Flame size={15} style={{ color: "var(--accent)" }} />
                    <span>{user?.streak ?? 0}</span>
                  </div>
                )}
                <button
                  style={{ width: 40, height: 40, borderRadius: 999, border: "1px solid var(--line-1)", background: "var(--bg-1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-2)", cursor: "pointer", flexShrink: 0 }}
                  aria-label="Notifications"
                >
                  <Icons.Bell size={16} />
                </button>
                {isGuest ? (
                  <button className="btn btn-primary" onClick={() => setAuthReason(AUTH_REASONS.profile)} style={{ padding: "10px 20px", whiteSpace: "nowrap" }}>
                    Sign in
                  </button>
                ) : (
                  <button onClick={() => { setPlayingProblem(null); setPlayQueue(null); setTab("profile"); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 12px 4px 4px", borderRadius: 999, border: "1px solid var(--line-1)", whiteSpace: "nowrap" }}>
                    <Avatar name={user?.name || "User"} size={32} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{user?.name?.split(" ")[0]}</span>
                  </button>
                )}
              </div>
            </header>
            {/* Scrollable canvas */}
            <main className="dt-canvas">
              {renderScreen()}
            </main>
          </div>
        </div>
        {authOverlay}
        <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onOpenProblem={(p, queue) => { openProblem(p, queue); setSearchOpen(false); }} />
      </>
    );
  }

  return (
    <>
      <div className="stage">
        <div className="phone">
          {renderScreen()}
          {!isPlaying && <BottomNav tab={tab} onChange={(t) => setTab(t)} />}
        </div>
      </div>
      {authOverlay}
    </>
  );
}

function GuestGate({ reasonKey, onSignIn }: { reasonKey: string; onSignIn: () => void }) {
  const r = AUTH_REASONS[reasonKey];
  return (
    <div className="screen">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px 140px", textAlign: "center", minHeight: "100%" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", marginBottom: 22 }}>
          {reasonKey === "ranks" ? <Icons.Medal size={28} /> : <Icons.User size={28} />}
        </div>
        <div className="h-display" style={{ fontSize: 32, marginBottom: 12 }}>{r?.title}</div>
        <div style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55, marginBottom: 28, maxWidth: 300 }}>{r?.body}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
          <button className="btn btn-primary btn-block btn-lg" onClick={onSignIn} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            Create account <Icons.ArrowRight size={16} />
          </button>
          <button className="btn btn-block" onClick={onSignIn} style={{ background: "transparent", border: "1px solid var(--line-2)" }}>
            Log in
          </button>
        </div>
        <div style={{ marginTop: 32, fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.5, maxWidth: 280 }}>
          You can keep solving without an account — only stats & rankings need a sign-in.
        </div>
      </div>
    </div>
  );
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function buildTargetLabel(o: Record<string, unknown>): string {
  const exam = ({ mains: "JEE Mains", adv: "JEE Advanced" } as Record<string, string>)[o.exam as string] || "";
  return `${exam} ${o.targetYear}`;
}
