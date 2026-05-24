import { prisma } from "@/lib/prisma";

export interface CreateNoteInput {
  questionId: string;
  userId: string;
  body: string;
  tag?: string;
}

export async function listNotes(questionId: string, userId: string | null, limit = 10, offset = 0) {
  const [notes, total] = await Promise.all([
    prisma.communityNote.findMany({
      where: { questionId },
      orderBy: { upvoteCount: "desc" },
      take: limit,
      skip: offset,
      include: { user: { select: { name: true, handle: true } } },
    }),
    prisma.communityNote.count({ where: { questionId } }),
  ]);

  let upvotedIds = new Set<string>();
  if (userId && notes.length > 0) {
    const upvotes = await prisma.communityNoteUpvote.findMany({
      where: { noteId: { in: notes.map(n => n.id) }, userId },
      select: { noteId: true },
    });
    upvotedIds = new Set(upvotes.map(u => u.noteId));
  }

  return {
    notes: notes.map(n => ({
      id: n.id,
      body: n.body,
      tag: n.tag,
      upvoteCount: n.upvoteCount,
      hasUpvoted: upvotedIds.has(n.id),
      createdAt: n.createdAt,
      user: n.user,
    })),
    total,
  };
}

export async function createNote(input: CreateNoteInput) {
  return prisma.communityNote.create({
    data: {
      questionId: input.questionId,
      userId: input.userId,
      body: input.body.trim(),
      tag: input.tag ?? null,
    },
    include: { user: { select: { name: true, handle: true } } },
  });
}

export async function toggleUpvote(noteId: string, userId: string) {
  const existing = await prisma.communityNoteUpvote.findUnique({
    where: { noteId_userId: { noteId, userId } },
  });

  if (existing) {
    await prisma.communityNoteUpvote.delete({ where: { noteId_userId: { noteId, userId } } });
    const note = await prisma.communityNote.update({
      where: { id: noteId },
      data: { upvoteCount: { decrement: 1 } },
    });
    return { hasUpvoted: false, upvoteCount: Math.max(0, note.upvoteCount) };
  } else {
    await prisma.communityNoteUpvote.create({ data: { noteId, userId } });
    const note = await prisma.communityNote.update({
      where: { id: noteId },
      data: { upvoteCount: { increment: 1 } },
    });
    return { hasUpvoted: true, upvoteCount: note.upvoteCount };
  }
}
