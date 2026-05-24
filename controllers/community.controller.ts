import { NextRequest } from "next/server";
import * as CommunityService from "@/services/community.service";
import { getAuthUser, requireAuth } from "@/lib/auth";
import * as R from "@/lib/response";

export async function listNotes(req: NextRequest, questionId: string) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const authUser = await getAuthUser(req);
    const data = await CommunityService.listNotes(questionId, authUser?.id ?? null, limit, offset);
    return R.ok(data);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function createNote(req: NextRequest, questionId: string) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const body = await req.json();
    if (!body.body?.trim()) return R.badRequest("Note body is required");

    const note = await CommunityService.createNote({
      questionId,
      userId: user.id,
      body: body.body,
      tag: body.tag,
    });

    return R.created({
      id: note.id,
      body: note.body,
      tag: note.tag,
      upvoteCount: note.upvoteCount,
      hasUpvoted: false,
      createdAt: note.createdAt,
      user: note.user,
    });
  } catch (e) {
    return R.serverError(e);
  }
}

export async function upvoteNote(req: NextRequest, noteId: string) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();
    const result = await CommunityService.toggleUpvote(noteId, user.id);
    return R.ok(result);
  } catch (e) {
    return R.serverError(e);
  }
}
