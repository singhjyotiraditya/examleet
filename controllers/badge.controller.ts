import { NextRequest } from "next/server";
import * as BadgeService from "@/services/badge.service";
import { requireAuth } from "@/lib/auth";
import * as R from "@/lib/response";

export async function listAll(req: NextRequest) {
  try {
    const badges = await BadgeService.findAll();
    return R.ok(badges);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getMyBadges(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const badges = await BadgeService.getUserBadges(user.id);
    return R.ok(badges);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function create(req: NextRequest) {
  try {
    const body = await req.json();
    const badge = await BadgeService.create(body);
    return R.created(badge);
  } catch (e) {
    return R.serverError(e);
  }
}
