import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ExamLeet — JEE Practice Platform",
  description: "AI-guided hints, 30,000+ previous year questions, and all-India ranked mocks for JEE Mains & Advanced. The sharpest practice loop, free.",
  openGraph: {
    title: "ExamLeet — JEE Practice Platform",
    description: "AI-guided hints, 30,000+ PYQs, and all-India ranked mocks for JEE Mains & Advanced.",
    url: "https://www.examleet.com",
    siteName: "ExamLeet",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExamLeet — JEE Practice Platform",
    description: "AI-guided hints, 30,000+ PYQs, and all-India ranked mocks for JEE Mains & Advanced.",
  },
  alternates: { canonical: "https://www.examleet.com" },
};

const FEATURES = [
  {
    icon: "◈",
    title: "30,000+ PYQs",
    body: "Every JEE Mains & Advanced question from 2001 to 2024, organised chapter-wise with subject filters.",
  },
  {
    icon: "◎",
    title: "AI-Guided Hints",
    body: "Three progressive hints per question — nudges the thinking without giving away the answer.",
  },
  {
    icon: "◉",
    title: "Ranked Mocks",
    body: "Weekly timed contests with live all-India leaderboards and rating that moves after every test.",
  },
  {
    icon: "◐",
    title: "Streak & Goals",
    body: "Daily practice goals, activity heatmap, and a streak that keeps momentum going.",
  },
];

const SUBJECTS = [
  { key: "phy", name: "Physics", color: "var(--phy)", chapters: "30 chapters" },
  { key: "chem", name: "Chemistry", color: "var(--chem)", chapters: "28 chapters" },
  { key: "math", name: "Maths", color: "var(--math)", chapters: "24 chapters" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ExamLeet",
  url: "https://www.examleet.com",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description: "AI-guided JEE Mains & Advanced practice platform with previous year questions, ranked mock tests, and step-by-step solutions.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  audience: { "@type": "Audience", audienceType: "JEE aspirants, Class 11–12 students" },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Full-page scrollable wrapper (globals.css sets overflow:hidden on html/body) */}
      <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: "var(--bg-0)", color: "var(--fg-0)", fontFamily: "var(--sans)" }}>

        {/* ── Nav ── */}
        <nav style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(20px, 5vw, 64px)", height: 60, background: "color-mix(in srgb, var(--bg-0) 80%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--line-1)" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--fg-0)" }}>
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden>
              <rect width="40" height="40" rx="11" fill="var(--accent)" />
              <path d="M10 28L20 12L30 28" stroke="var(--accent-fg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 22H26" stroke="var(--accent-fg)" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}>
              Exam<em style={{ fontStyle: "normal", color: "var(--accent)" }}>Leet</em>
            </span>
          </a>
          <a href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, background: "var(--fg-0)", color: "var(--bg-0)", textDecoration: "none", letterSpacing: "-0.01em" }}>
            Start free →
          </a>
        </nav>

        {/* ── Hero ── */}
        <section style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(56px, 10vw, 100px) clamp(20px, 5vw, 40px) 64px", textAlign: "center" }}>
          <p style={{ fontSize: 11.5, fontFamily: "var(--mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 24, fontWeight: 500 }}>
            JEE Mains &amp; Advanced Practice
          </p>
          <h1 className="serif" style={{ fontSize: "clamp(44px, 8vw, 80px)", fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.03em", margin: "0 0 28px", color: "var(--fg-0)" }}>
            The sharpest practice<br />
            <em style={{ color: "var(--accent)" }}>tool for JEE.</em>
          </h1>
          <p style={{ fontSize: "clamp(15px, 2.5vw, 18px)", lineHeight: 1.65, color: "var(--fg-2)", maxWidth: 580, margin: "0 auto 44px" }}>
            AI-guided hints, 30,000+ previous year questions organised chapter-wise,
            and ranked all-India mocks — all in a clean, fast practice loop.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 28px", borderRadius: 999, fontSize: 15, fontWeight: 700, background: "var(--fg-0)", color: "var(--bg-0)", textDecoration: "none" }}>
              Start practising →
            </a>
            <a href="/app?tab=sets" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 28px", borderRadius: 999, fontSize: 15, fontWeight: 600, background: "transparent", color: "var(--fg-1)", textDecoration: "none", border: "1px solid var(--line-2)" }}>
              Browse PYQs
            </a>
          </div>
        </section>

        {/* ── Subject chips ── */}
        <section style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", padding: "0 20px 64px" }}>
          {SUBJECTS.map(s => (
            <a key={s.key} href={`/app?tab=sets`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: "var(--bg-2)", border: "1px solid var(--line-1)", color: "var(--fg-1)", textDecoration: "none" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              {s.name}
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--mono)" }}>{s.chapters}</span>
            </a>
          ))}
        </section>

        {/* ── Features ── */}
        <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(20px, 5vw, 40px) 80px" }}>
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: 48 }}>What&rsquo;s inside</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="card" style={{ padding: "24px 22px" }}>
                <span style={{ fontSize: 22, display: "block", marginBottom: 16, color: "var(--accent)" }}>{f.icon}</span>
                <h2 style={{ fontSize: 15.5, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.02em" }}>{f.title}</h2>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--fg-2)", margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA strip ── */}
        <section style={{ borderTop: "1px solid var(--line-1)", textAlign: "center", padding: "clamp(48px, 8vw, 80px) 20px" }}>
          <h2 className="serif" style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 400, letterSpacing: "-0.025em", margin: "0 0 20px" }}>
            Ready to crack JEE?
          </h2>
          <p style={{ fontSize: 15, color: "var(--fg-2)", marginBottom: 36 }}>
            Free forever for self-study. No credit card needed.
          </p>
          <a href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 32px", borderRadius: 999, fontSize: 16, fontWeight: 700, background: "var(--accent)", color: "var(--accent-fg)", textDecoration: "none" }}>
            Open ExamLeet →
          </a>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: "1px solid var(--line-1)", padding: "24px clamp(20px, 5vw, 64px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--mono)" }}>
            © 2026 ExamLeet
          </span>
          <nav style={{ display: "flex", gap: 20 }}>
            {[["Problems", "/app?tab=sets"], ["Contests", "/app?tab=contests"]].map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: 12, color: "var(--fg-3)", textDecoration: "none" }}>{label}</a>
            ))}
          </nav>
        </footer>

      </div>
    </>
  );
}
