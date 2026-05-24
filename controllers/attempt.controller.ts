import { NextRequest } from "next/server";
import * as AttemptService from "@/services/attempt.service";
import * as BadgeService from "@/services/badge.service";
import { requireAuth } from "@/lib/auth";
import * as R from "@/lib/response";

export async function submit(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const body = await req.json();
    const { questionId, contestId, selectedOption, selectedOptions, numericalInput, timeTakenSec, sessionType, hintsUsed, skipRating } = body;

    if (!questionId) return R.badRequest("questionId is required");

    const attempt = await AttemptService.submit({
      userId: user.id,
      questionId,
      contestId,
      selectedOption,
      selectedOptions,
      numericalInput,
      timeTakenSec,
      sessionType,
      hintsUsed,
      skipRating,
    });

    // Check badges (fire-and-forget style — don't block response)
    BadgeService.checkAndAward(user.id).catch(console.error);

    return R.created(attempt);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Question not found")
      return R.notFound("Question");
    return R.serverError(e);
  }
}

export async function getMyAttempts(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const questionId = url.searchParams.get("questionId") ?? undefined;

    const data = await AttemptService.findByUser(user.id, limit, offset, questionId);
    return R.ok(data);
  } catch (e) {
    return R.serverError(e);
  }
}
