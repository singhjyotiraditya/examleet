import { NextRequest } from "next/server";
import * as ContestService from "@/services/contest.service";
import { requireAuth } from "@/lib/auth";
import * as R from "@/lib/response";

export async function list(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const data = await ContestService.findMany(status, limit, offset);
    return R.ok(data);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getOne(req: NextRequest, id: string) {
  try {
    const contest = await ContestService.findById(id);
    if (!contest) return R.notFound("Contest");
    return R.ok(contest);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function create(req: NextRequest) {
  try {
    const body = await req.json();
    const contest = await ContestService.create(body);
    return R.created(contest);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function update(req: NextRequest, id: string) {
  try {
    const body = await req.json();
    const contest = await ContestService.update(id, body);
    return R.ok(contest);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function register(req: NextRequest, contestId: string) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const reg = await ContestService.register(contestId, user.id);
    return R.created(reg);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "Contest not found") return R.notFound("Contest");
      if (e.message === "Registration closed") return R.badRequest("Registration closed");
    }
    return R.serverError(e);
  }
}

export async function unregister(req: NextRequest, contestId: string) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    await ContestService.unregister(contestId, user.id);
    return R.noContent();
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getLeaderboard(req: NextRequest, contestId: string) {
  try {
    const data = await ContestService.getLeaderboard(contestId);
    return R.ok(data);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getMyRegistration(req: NextRequest, contestId: string) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const reg = await ContestService.getRegistration(contestId, user.id);
    return R.ok(reg ?? null);
  } catch (e) {
    return R.serverError(e);
  }
}
