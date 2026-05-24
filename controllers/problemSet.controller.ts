import { NextRequest } from "next/server";
import * as ProblemSetService from "@/services/problemSet.service";
import { requireAuth } from "@/lib/auth";
import * as R from "@/lib/response";

export async function list(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const subject = url.searchParams.get("subject") ?? undefined;
    const isCurated = url.searchParams.has("curated")
      ? url.searchParams.get("curated") === "true"
      : undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const data = await ProblemSetService.findMany(subject, isCurated, limit, offset);
    return R.ok(data);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getOne(req: NextRequest, id: string) {
  try {
    const set = await ProblemSetService.findById(id);
    if (!set) return R.notFound("Problem set");
    return R.ok(set);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function create(req: NextRequest) {
  try {
    const body = await req.json();
    const set = await ProblemSetService.create(body);
    return R.created(set);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getProgress(req: NextRequest, setId: string) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const progress = await ProblemSetService.getProgress(setId, user.id);
    return R.ok(progress ?? null);
  } catch (e) {
    return R.serverError(e);
  }
}
