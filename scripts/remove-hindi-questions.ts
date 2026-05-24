/**
 * Removes questions that contain Devanagari (Hindi) text from the database.
 * Run: npx tsx scripts/remove-hindi-questions.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

const DEVANAGARI = /[\u0900-\u097F]/;

function containsHindi(row: {
  title: string;
  body: string;
  options: unknown;
  solution: unknown;
}): boolean {
  const opts = JSON.stringify(row.options ?? "");
  const sol = JSON.stringify(row.solution ?? "");
  return (
    DEVANAGARI.test(row.title) ||
    DEVANAGARI.test(row.body) ||
    DEVANAGARI.test(opts) ||
    DEVANAGARI.test(sol)
  );
}

const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  max: 5,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const total = await prisma.question.count();
  const hindi: { id: string; code: string }[] = [];
  const batch = 2000;

  for (let skip = 0; skip < total; skip += batch) {
    const rows = await prisma.question.findMany({
      skip,
      take: batch,
      select: { id: true, code: true, title: true, body: true, options: true, solution: true },
    });
    for (const r of rows) {
      if (containsHindi(r)) hindi.push({ id: r.id, code: r.code });
    }
  }

  if (hindi.length === 0) {
    console.log("No Hindi questions found.");
    return;
  }

  console.log(`Found ${hindi.length} Hindi question(s):`);
  for (const q of hindi) console.log(`  - ${q.code}`);

  const ids = hindi.map(q => q.id);

  const attempts = await prisma.attempt.deleteMany({ where: { questionId: { in: ids } } });
  const bookmarks = await prisma.bookmark.deleteMany({ where: { questionId: { in: ids } } });
  const notes = await prisma.communityNote.findMany({
    where: { questionId: { in: ids } },
    select: { id: true },
  });
  const noteIds = notes.map(n => n.id);
  const upvotes =
    noteIds.length > 0
      ? await prisma.communityNoteUpvote.deleteMany({ where: { noteId: { in: noteIds } } })
      : { count: 0 };
  const communityNotes = await prisma.communityNote.deleteMany({ where: { questionId: { in: ids } } });
  const setLinks = await prisma.problemSetQuestion.deleteMany({ where: { questionId: { in: ids } } });
  const deleted = await prisma.question.deleteMany({ where: { id: { in: ids } } });

  console.log("\nDeleted:");
  console.log(`  questions: ${deleted.count}`);
  console.log(`  attempts: ${attempts.count}`);
  console.log(`  bookmarks: ${bookmarks.count}`);
  console.log(`  community notes: ${communityNotes.count}`);
  console.log(`  note upvotes: ${upvotes.count}`);
  console.log(`  problem set links: ${setLinks.count}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
