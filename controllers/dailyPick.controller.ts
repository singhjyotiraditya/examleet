import { NextRequest } from "next/server";
import * as DailyPickService from "@/services/dailyPick.service";
import { requireAuth } from "@/lib/auth";
import * as R from "@/lib/response";

export async function getToday(req: NextRequest) {
  try {
    let userId: string | undefined;
    try {
      const { user, error } = await requireAuth(req);
      if (!error && user) userId = user.id;
    } catch { /* optional auth */ }

    const pick = await DailyPickService.getToday(userId);
    if (!pick) return R.notFound("Daily pick");
    return R.ok(pick);
  } catch (e) {
    return R.serverError(e);
  }
}
