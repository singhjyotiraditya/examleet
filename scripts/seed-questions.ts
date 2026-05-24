import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

// Use a small pool to stay within Supabase session connection limits
const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  max: 5,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface RawHint {
  orderIndex: number;
  hintText: string;
}

interface RawQuestion {
  code: string;
  title: string;
  exam: string;
  year: number;
  paperNo?: number | null;
  subject: string;
  chapter: string;
  topic?: string | null;
  difficulty: string;
  body: string;
  figure?: unknown;
  options: unknown;
  correct: string;
  solution: string[];
  tags?: string[];
  hints?: RawHint[];
}

async function seedOne(q: RawQuestion): Promise<boolean> {
  const question = await prisma.question.upsert({
    where: { code: q.code },
    update: {},
    create: {
      code: q.code,
      title: q.title,
      exam: q.exam,
      year: q.year,
      paperNo: q.paperNo ?? null,
      subject: q.subject,
      chapter: q.chapter,
      topic: q.topic ?? null,
      difficulty: q.difficulty,
      body: q.body,
      figure: null,
      options: q.options as never,
      correct: q.correct,
      solution: q.solution as never,
      tags: (q.tags ?? []) as never,
    },
  });

  const existing = await prisma.hint.count({ where: { questionId: question.id } });
  if (existing === 0 && q.hints?.length) {
    await prisma.hint.createMany({
      data: q.hints.map((h) => ({
        questionId: question.id,
        orderIndex: h.orderIndex,
        hintText: h.hintText,
      })),
    });
  }
  return true;
}

async function main() {
  const filePath = path.join(__dirname, "../questions_clean.json");
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const all: RawQuestion[] = raw.questions;

  const eligible = all.filter(
    (q) => !q.figure && q.solution?.length > 0 && q.hints && q.hints.length > 0
  );

  console.log(`Total: ${all.length} | Eligible: ${eligible.length}`);

  let inserted = 0;
  let skipped = 0;
  const CONCURRENCY = 5;

  for (let i = 0; i < eligible.length; i += CONCURRENCY) {
    const chunk = eligible.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunk.map(async (q) => {
        try {
          await seedOne(q);
          inserted++;
        } catch (e) {
          if (skipped < 3) console.error(`SKIP ${q.code}:`, (e as Error).message?.slice(0, 150));
          skipped++;
        }
      })
    );

    if (i % 500 === 0) {
      process.stdout.write(`\rProgress: ${i + CONCURRENCY}/${eligible.length} | inserted=${inserted} skipped=${skipped}`);
    }
  }

  console.log(`\nDone. Inserted=${inserted} Skipped=${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
