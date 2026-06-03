import type { Metadata } from "next";
import s from "./landing.module.css";
import LandingReveal from "./LandingReveal";

export const metadata: Metadata = {
  title: "ExamLeet — Grind PYQs. Climb the All-India rank. Crack JEE.",
  description: "Every JEE problem worth solving, in one ruthless practice arena. Instant verdicts, full solutions, daily streaks, and a live All-India leaderboard.",
  openGraph: {
    title: "ExamLeet — Grind PYQs. Climb the All-India rank. Crack JEE.",
    description: "AI-guided hints, 3,000+ PYQs, and all-India ranked mocks for JEE Mains & Advanced.",
    url: "https://www.examleet.com",
    siteName: "ExamLeet",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "ExamLeet — JEE Practice", description: "AI-guided hints, 3,000+ PYQs, and all-India ranked mocks for JEE Mains & Advanced." },
  alternates: { canonical: "https://www.examleet.com" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ExamLeet",
  url: "https://www.examleet.com",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description: "AI-guided JEE Mains & Advanced practice platform with previous year questions, ranked mock tests, and step-by-step solutions.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
};

/* ── SVG icons ── */
const ArrowRight = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>
  </svg>
);
const PlayIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
);
const TrophyIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);
const AtomIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2.2"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.2"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)"/>
  </svg>
);
const FlaskIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6"/><path d="M10 3v6.5L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-9.5V3"/>
    <path d="M7.5 14h9"/>
  </svg>
);
const MathIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16"/><path d="m7 12 4 8"/><path d="M11 12 7 20"/><path d="M14 11h6"/><path d="M14 16h6"/>
  </svg>
);
const PhysicsIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2.2"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.2"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)"/>
  </svg>
);
const RankUpIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/>
  </svg>
);
const FlameIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c1 3-1 4-2 6-1.6 3 .4 5 .4 5s-2.4-.3-2.4-3C5.6 11 4 13.5 4 16a8 8 0 1 0 16 0c0-4-3-6-4-9-1-3-4-4-4-5z"/>
  </svg>
);
const ListIcon = () => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h12"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);
const RankIcon = () => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/>
  </svg>
);

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingReveal />

      <div className={s.page}>

        {/* ── Nav ── */}
        <header className={s.nav}>
          <div className={`${s.wrap} ${s.navInner}`}>
            <a href="/" className={s.brand} aria-label="ExamLeet home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className={s.brandLogo} width={34} height={34} />
              <span>Exam<em>Leet</em></span>
            </a>
            <nav className={s.navLinks}>
              <a href="#how">How it works</a>
              <a href="#subjects">Subjects</a>
              <a href="#compete">Compete</a>
            </nav>
            <div className={s.navRight}>
              <a href="/app" className={s.navSignin}>Sign in</a>
              <a href="/app" className={`${s.btn} ${s.btnAccent} ${s.btnSm}`}>
                Start solving <ArrowRight />
              </a>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className={s.hero}>
          <div className={s.heroBg} />
          <div className={s.wrap}>
            <div className={s.heroGrid}>
              <div className={s.heroCopy}>
                <span className={s.heroPill}>
                  <span className={s.heroPillTag}>JEE MAIN + ADV</span>
                  12 years of solved PYQs
                </span>
                <h1 className={`${s.heroH1} ${s.reveal}`}>
                  Grind the papers.<br />Climb the <em>rank.</em><br />Crack JEE.
                </h1>
                <p className={`${s.heroSub} ${s.reveal}`}>
                  Every JEE problem worth solving, in one ruthless practice arena. Instant verdicts, full solutions, daily streaks, and a live All-India leaderboard that never lies.
                </p>
                <div className={`${s.heroCta} ${s.reveal}`}>
                  <a href="/app" className={`${s.btn} ${s.btnAccent} ${s.btnLg}`}>
                    Start solving — free <ArrowRight />
                  </a>
                  <a href="/app" className={`${s.btn} ${s.btnLg}`}>
                    <PlayIcon /> Today&apos;s pick
                  </a>
                </div>
                <div className={`${s.heroFlair} ${s.reveal}`}>
                  <span className={s.avstack} aria-hidden="true">
                    <i>AK</i><i>RP</i><i>SM</i><i>+</i>
                  </span>
                  <span><b>50,000+</b> aspirants grinding</span>
                  <span className={s.flairSep} />
                  <span><b>3,210</b> problems live</span>
                </div>
              </div>

              {/* App mock */}
              <div className={`${s.heroMockWrap} ${s.reveal}`}>
                <div className={`${s.float} ${s.fRank}`} aria-hidden="true">
                  <span className={s.floatIco}><RankUpIcon /></span>
                  <span>
                    <span className={s.floatK}>All-India rank</span>
                    <span className={s.floatV}>#1,284 <small>▲ 212</small></span>
                  </span>
                </div>
                <div className={`${s.float} ${s.fStreak}`} aria-hidden="true">
                  <span className={s.floatIco}><FlameIcon /></span>
                  <span>
                    <span className={s.floatK}>Streak</span>
                    <span className={s.floatV}>14 days</span>
                  </span>
                </div>
                <div className={`${s.float} ${s.fXp}`} aria-hidden="true">
                  <span className={s.floatV}>+50 XP</span>
                </div>

                <div className={s.mockCard}>
                  <div className={s.mockTop}>
                    <span className={s.mockSubj}><AtomIcon /></span>
                    <span className={s.mockCode}>JEE-A-2024-P-12</span>
                    <span className={`${s.chip} ${s.chipHard}`} style={{ marginLeft: "auto" }}>Hard</span>
                  </div>
                  <div className={s.mockTitle}>Bead on a Rotating Hoop</div>
                  <div className={s.mockTags}>
                    <span className={`${s.chip} ${s.chipMono}`}>Physics</span>
                    <span className={`${s.chip} ${s.chipMono}`}>Rotational Motion</span>
                    <span className={`${s.chip} ${s.chipMono}`}>23% solved</span>
                  </div>
                  <div className={`${s.mcq} ${s.mcqSel}`}>
                    <span className={`${s.mcqLtr}`}>A</span>
                    <span className={s.mcqMath}>θ = cos⁻¹(g / ω²R)</span>
                  </div>
                  <div className={s.mcq}>
                    <span className={s.mcqLtr}>B</span>
                    <span className={s.mcqMath}>θ = sin⁻¹(g / ω²R)</span>
                  </div>
                  <div className={s.mcq}>
                    <span className={s.mcqLtr}>C</span>
                    <span className={s.mcqMath}>θ = cos⁻¹(ω²R / g)</span>
                  </div>
                  <a href="/app" className={`${s.btn} ${s.btnAccent} ${s.mockSubmit}`}>
                    Submit answer <ArrowRight />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className={s.stats}>
          <div className={s.wrap}>
            <div className={s.statsGrid}>
              <div className={`${s.stat} ${s.reveal}`}><div className={s.statNum}><em>3,210</em></div><div className={s.statLbl}>PYQ problems, every one solved &amp; explained</div></div>
              <div className={`${s.stat} ${s.reveal}`}><div className={s.statNum}>12</div><div className={s.statLbl}>years of JEE Main &amp; Advanced papers</div></div>
              <div className={`${s.stat} ${s.reveal}`}><div className={s.statNum}>50<em>k</em>+</div><div className={s.statLbl}>aspirants on the leaderboard</div></div>
              <div className={`${s.stat} ${s.reveal}`}><div className={s.statNum}>Weekly</div><div className={s.statLbl}>timed contests &amp; rank battles</div></div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className={s.pad}>
          <div className={s.wrap}>
            <div className={`${s.secHead} center ${s.reveal}`} style={{ maxWidth: 640, margin: "0 auto 44px", textAlign: "center" }}>
              <span className={s.eyebrow}>The loop</span>
              <h2 className={s.serif} style={{ fontFamily: "var(--serif)", fontWeight: 400, letterSpacing: "-.025em", fontSize: "clamp(32px,4.4vw,52px)", lineHeight: 1.02, margin: "0 0 14px" }}>
                Solve. Verify. <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Rank up.</em>
              </h2>
              <p style={{ fontSize: 17, color: "var(--fg-2)", margin: 0, lineHeight: 1.55 }}>
                No passive video watching. You solve real exam problems, get judged instantly, and watch your rank move — the same loop that makes competitive coders fast.
              </p>
            </div>
            <div className={s.steps}>
              <div className={`${s.step} ${s.reveal}`}>
                <div className={s.stepN}>01</div>
                <div className={s.stepIco}><ListIcon /></div>
                <h3>Pick a PYQ</h3>
                <p>Filter 3,210 problems by subject, chapter, year, or difficulty — or just hit the daily pick and start the timer.</p>
              </div>
              <div className={`${s.step} ${s.reveal}`}>
                <div className={s.stepN}>02</div>
                <div className={s.stepIco}><CheckIcon /></div>
                <h3>Get an instant verdict</h3>
                <p>Submit and know immediately. Stuck? Reveal a graded hint, then the full step-by-step solution written like a topper would.</p>
              </div>
              <div className={`${s.step} ${s.reveal}`}>
                <div className={s.stepN}>03</div>
                <div className={s.stepIco}><RankIcon /></div>
                <h3>Climb the rank</h3>
                <p>Every solve earns XP, extends your streak, and moves your All-India rank. Compete live and see exactly where you stand.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Subjects ── */}
        <section id="subjects" className={s.pad} style={{ background: "var(--bg-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}>
          <div className={s.wrap}>
            <div className={`${s.secHead} ${s.reveal}`}>
              <span className={s.eyebrow}>Full syllabus</span>
              <h2 className={s.serif} style={{ fontFamily: "var(--serif)", fontWeight: 400, letterSpacing: "-.025em", fontSize: "clamp(32px,4.4vw,52px)", lineHeight: 1.02, margin: "0 0 14px" }}>
                Three subjects. <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Every chapter.</em>
              </h2>
              <p style={{ fontSize: 17, color: "var(--fg-2)", margin: 0, lineHeight: 1.55 }}>
                The entire JEE blueprint, broken into the chapters you&apos;ll actually be tested on — each with a deep, ranked problem bank.
              </p>
            </div>
            <div className={s.subjGrid}>
              <a href="/app?tab=sets" className={`${s.subj} ${s.reveal}`} style={{ "--sc": "var(--phy)", textDecoration: "none", color: "inherit" } as React.CSSProperties}>
                <div className={s.subjIco}><PhysicsIcon /></div>
                <h3>Physics</h3>
                <div className={s.subjMeta}>14 chapters · 230 problems</div>
                <div className={s.subjChaps}>
                  <span>Kinematics</span><span>Rotational Motion</span><span>Electrostatics</span><span>Modern Physics</span>
                  <span className={s.subjMore}>+10 more</span>
                </div>
              </a>
              <a href="/app?tab=sets" className={`${s.subj} ${s.reveal}`} style={{ "--sc": "var(--chem)", textDecoration: "none", color: "inherit" } as React.CSSProperties}>
                <div className={s.subjIco}><FlaskIcon /></div>
                <h3>Chemistry</h3>
                <div className={s.subjMeta}>14 chapters · 240 problems</div>
                <div className={s.subjChaps}>
                  <span>Chemical Bonding</span><span>Equilibrium</span><span>GOC</span><span>Carbonyl Compounds</span>
                  <span className={s.subjMore}>+10 more</span>
                </div>
              </a>
              <a href="/app?tab=sets" className={`${s.subj} ${s.reveal}`} style={{ "--sc": "var(--math)", textDecoration: "none", color: "inherit" } as React.CSSProperties}>
                <div className={s.subjIco}><MathIcon /></div>
                <h3>Maths</h3>
                <div className={s.subjMeta}>14 chapters · 180 problems</div>
                <div className={s.subjChaps}>
                  <span>Integration</span><span>Conic Sections</span><span>Probability</span><span>Vectors</span>
                  <span className={s.subjMore}>+10 more</span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* ── Compete ── */}
        <section id="compete" className={s.pad}>
          <div className={s.wrap}>
            <div className={`${s.secHead} ${s.reveal}`}>
              <span className={s.eyebrow}>The arena</span>
              <h2 className={s.serif} style={{ fontFamily: "var(--serif)", fontWeight: 400, letterSpacing: "-.025em", fontSize: "clamp(32px,4.4vw,52px)", lineHeight: 1.02, margin: "0 0 14px" }}>
                Where you really <em style={{ fontStyle: "italic", color: "var(--accent)" }}>stand.</em>
              </h2>
              <p style={{ fontSize: 17, color: "var(--fg-2)", margin: 0, lineHeight: 1.55 }}>
                Solving in a vacuum is easy. Solving against 50,000 other aspirants — on the clock, ranked live — is what gets you exam-ready.
              </p>
            </div>
            <div className={s.competeGrid}>
              {/* Leaderboard */}
              <div className={`${s.panel} ${s.reveal}`}>
                <div className={s.panelH}>
                  <span className={s.panelTitle}><TrophyIcon /> All-India leaderboard</span>
                  <span className={`${s.chip} ${s.chipMono}`}><span className={s.dot} style={{ background: "var(--easy)" }} /> Live</span>
                </div>
                {[
                  { rank: "1", rankTop: true, init: "AK", color: "var(--phy)", name: "Aarav K.", sub: "2,940 solved · Kota", rating: "2814", delta: "▲ 18" },
                  { rank: "2", rankTop: true, init: "RP", color: "var(--chem)", name: "Riya P.", sub: "2,871 solved · Hyderabad", rating: "2790", delta: "▲ 9" },
                  { rank: "3", rankTop: true, init: "SM", color: "var(--math)", name: "Sai M.", sub: "2,802 solved · Chennai", rating: "2758", delta: "▲ 24" },
                  { rank: "1,284", rankTop: false, init: "YOU", color: "var(--accent)", name: "You — climbing fast", sub: "412 solved · 14-day streak", rating: "1640", delta: "▲ 212", you: true },
                ].map((row) => (
                  <div key={row.rank} className={`${s.lbRow} ${row.you ? s.lbRowYou : ""}`}>
                    <span className={`${s.lbRank} ${row.rankTop ? s.lbRankTop : ""}`}>{row.rank}</span>
                    <span className={s.lbAv} style={{ color: row.color }}>{row.init}</span>
                    <span>
                      <span className={s.lbName}>{row.name}</span><br />
                      <span className={s.lbSub}>{row.sub}</span>
                    </span>
                    <span className={s.lbRating}>{row.rating} <span className={s.lbDelta}>{row.delta}</span></span>
                  </div>
                ))}
              </div>

              {/* Contest card */}
              <div className={`${s.panel} ${s.reveal}`}>
                <div className={s.contestCard}>
                  <span className={s.live}><span className={s.liveDot} /> Live tonight</span>
                  <h3>JEE Physics Speedrun</h3>
                  <p className={s.contestDesc}>20 problems · 30 minutes · one shot each. Beat the clock, bank the rating.</p>
                  <div className={s.contestMeta}>
                    <div><div className={s.contestMetaK}>Starts in</div><div className={s.contestMetaV}>06:12:40</div></div>
                    <div><div className={s.contestMetaK}>Registered</div><div className={s.contestMetaV}>9,821</div></div>
                  </div>
                  <div className={s.spacer} />
                  <a href="/app?tab=contests" className={`${s.btn} ${s.btnAccent} ${s.btnBlock}`}>
                    Register &amp; compete <ArrowRight />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className={`${s.pad} ${s.final}`}>
          <div className={s.wrap}>
            <div className={`${s.finalCard} ${s.reveal}`}>
              <div className={s.finalGlow} />
              <h2>Stop reading. <em>Start solving.</em></h2>
              <p>Your first problem is one click away. No setup, no payment — just you, the paper, and a rank to chase.</p>
              <div className={s.finalCta}>
                <a href="/app" className={`${s.btn} ${s.btnAccent} ${s.btnLg}`}>
                  Open ExamLeet <ArrowRight />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className={s.footer}>
          <div className={`${s.wrap} ${s.foot}`}>
            <a href="/" className={s.brand} style={{ fontSize: 21 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" width={30} height={30} style={{ borderRadius: 8 }} />
              <span>Exam<em>Leet</em></span>
            </a>
            <nav className={s.footLinks}>
              <a href="/app?tab=sets">Problems</a>
              <a href="/app?tab=contests">Contests</a>
              <a href="/app?tab=home">Leaderboard</a>
              <a href="#how">How it works</a>
              <a href="/app">Sign in</a>
            </nav>
            <span className={s.footCopy}>© 2026 ExamLeet · Built for JEE aspirants</span>
          </div>
        </footer>

      </div>
    </>
  );
}
