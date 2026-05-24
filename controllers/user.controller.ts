import { NextRequest } from "next/server";
import * as UserService from "@/services/user.service";
import * as ActivityService from "@/services/activity.service";
import { requireAuth } from "@/lib/auth";
import * as R from "@/lib/response";

export async function getMe(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const profile = await UserService.getProfile(user.id);
    if (!profile) return R.notFound("User");
    const solveCounts = await UserService.getSolveCounts(user.id);
    if (profile.totalSolved !== solveCounts.attempted) {
      await UserService.update(user.id, { totalSolved: solveCounts.attempted });
      profile.totalSolved = solveCounts.attempted;
    }
    return R.ok({ ...profile, solveCounts });
  } catch (e) {
    return R.serverError(e);
  }
}

export async function updateMe(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const body = await req.json();
    const { name, city, examType, targetYear, currentLevel, dailyGoalMinutes } = body;

    const updated = await UserService.update(user.id, {
      ...(name !== undefined && { name }),
      ...(city !== undefined && { city }),
      ...(examType !== undefined && { examType }),
      ...(targetYear !== undefined && { targetYear }),
      ...(currentLevel !== undefined && { currentLevel }),
      ...(dailyGoalMinutes !== undefined && { dailyGoalMinutes }),
    });
    return R.ok(updated);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getMyStats(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const [stats, streak] = await Promise.all([
      UserService.getStats(user.id),
      ActivityService.getCurrentStreak(user.id),
    ]);
    return R.ok({ ...stats, currentStreak: streak });
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getMyActivity(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const url = new URL(req.url);
    const days = Math.min(Number(url.searchParams.get("days") ?? 90), 365);
    const activity = await ActivityService.getActivity(user.id, days);
    return R.ok(activity);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getUser(req: NextRequest, id: string) {
  try {
    const user = await UserService.findById(id);
    if (!user) return R.notFound("User");
    return R.ok(user);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getLeaderboard(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const data = await UserService.getLeaderboard(limit, offset);
    return R.ok(data);
  } catch (e) {
    return R.serverError(e);
  }
}

// Called internally after Supabase Auth signup webhook
export async function createUser(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, name } = body;
    if (!id || !email) return R.badRequest("id and email are required");

    const existing = await UserService.findByEmail(email);
    if (existing) return R.conflict("User already exists");

    const user = await UserService.create({ id, email, name: name ?? email.split("@")[0] });
    return R.created(user);
  } catch (e) {
    return R.serverError(e);
  }
}
