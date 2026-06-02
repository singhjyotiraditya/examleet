import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SUBJECTS } from "@/lib/data";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const q = await prisma.question.findUnique({
    where: { code },
    select: { title: true, subject: true, chapter: true, exam: true, year: true },
  });
  if (!q) return { title: "Question Not Found | ExamLeet" };

  const subjectName = SUBJECTS[q.subject as keyof typeof SUBJECTS]?.name ?? q.subject;
  return {
    title: `${q.title} — ${subjectName} ${q.chapter} | JEE ${q.exam} ${q.year} | ExamLeet`,
    description: `Practice this ${subjectName} question from JEE ${q.exam} ${q.year} (${q.chapter}). Step-by-step solution, AI-guided hints, and chapter context on ExamLeet.`,
    alternates: { canonical: `https://www.examleet.com/problems/${code}` },
    openGraph: {
      title: `${q.title} | ExamLeet`,
      description: `JEE ${q.exam} ${q.year} · ${subjectName} · ${q.chapter}`,
      url: `https://www.examleet.com/problems/${code}`,
      siteName: "ExamLeet",
      type: "article",
    },
  };
}

export default async function ProblemPage({ params }: Props) {
  const { code } = await params;
  const q = await prisma.question.findUnique({
    where: { code },
    select: {
      id: true, code: true, title: true, subject: true, chapter: true, topic: true,
      exam: true, year: true, difficulty: true, body: true,
      options: true, correct: true, tags: true,
      attemptCount: true, correctCount: true, verified: true,
    },
  });

  if (!q) notFound();

  // Redirect unverified questions to app (may not exist yet)
  if (!q.verified) redirect(`/app?problem=${q.id}`);

  const subjectName = SUBJECTS[q.subject as keyof typeof SUBJECTS]?.name ?? q.subject;
  const options = q.options as { id: string; text: string }[];
  const tags = q.tags as string[];
  const acceptancePct = q.attemptCount > 0
    ? Math.round((q.correctCount / q.attemptCount) * 100)
    : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.examleet.com" },
      { "@type": "ListItem", position: 2, name: "Problems", item: "https://www.examleet.com/problems" },
      { "@type": "ListItem", position: 3, name: q.title, item: `https://www.examleet.com/problems/${code}` },
    ],
  };

  const quizSchema = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: q.title,
    about: { "@type": "Thing", name: `${subjectName} — ${q.chapter}` },
    educationalLevel: "HighSchool",
    assesses: subjectName,
    educationalAlignment: {
      "@type": "AlignmentObject",
      alignmentType: "educationalSubject",
      targetName: subjectName,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(quizSchema) }} />

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
          <a href="/" style={{ color: "#666", textDecoration: "none" }}>ExamLeet</a>
          <span style={{ margin: "0 6px" }}>›</span>
          <a href="/problems" style={{ color: "#666", textDecoration: "none" }}>Problems</a>
          <span style={{ margin: "0 6px" }}>›</span>
          <span>{q.title}</span>
        </nav>

        {/* Header */}
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#f0f0f0", color: "#444" }}>{subjectName}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#f0f0f0", color: "#444" }}>{q.chapter}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#f0f0f0", color: "#444" }}>JEE {q.exam} {q.year}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#f0f0f0", color: "#444" }}>{q.difficulty}</span>
            {acceptancePct !== null && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#f0f0f0", color: "#444" }}>{acceptancePct}% pass rate</span>
            )}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.25, margin: 0 }}>{q.title}</h1>
          <p style={{ fontSize: 11, color: "#999", margin: "8px 0 0", fontFamily: "monospace" }}>{q.code}</p>
        </header>

        {/* Question body */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 12 }}>Question</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 10, padding: "20px 22px", margin: 0 }}>
            {q.body}
          </p>
        </section>

        {/* Options */}
        {options.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 12 }}>Options</h2>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {options.map((opt) => (
                <li key={opt.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 18px", border: "1px solid #e8e8e8", borderRadius: 10, background: "#fff", fontSize: 15 }}>
                  <span style={{ fontWeight: 700, color: "#555", minWidth: 18 }}>{opt.id.toUpperCase()}.</span>
                  <span style={{ lineHeight: 1.6 }}>{opt.text}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tags.map((t) => (
                <span key={t} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: "#f5f5f5", color: "#777" }}>#{t.toLowerCase().replace(/\s+/g, "-")}</span>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section style={{ borderTop: "1px solid #eee", paddingTop: 32, textAlign: "center" }}>
          <p style={{ fontSize: 15, color: "#555", marginBottom: 20 }}>
            Practice this question with AI-guided hints and a step-by-step solution — free on ExamLeet.
          </p>
          <a
            href={`/app?problem=${q.id}`}
            style={{ display: "inline-block", background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 28px", borderRadius: 999, textDecoration: "none" }}
          >
            Solve on ExamLeet →
          </a>
          <p style={{ fontSize: 12, color: "#aaa", marginTop: 14 }}>
            Ranked all-India mocks · {q.chapter} questions · JEE {q.exam} {q.year}
          </p>
        </section>
      </main>
    </>
  );
}
