import { NextRequest } from "next/server";
import * as QuestionService from "@/services/question.service";
import { requireAuth } from "@/lib/auth";
import * as R from "@/lib/response";

export async function list(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const p = url.searchParams;

    let userId: string | undefined;
    try {
      const { user, error } = await requireAuth(req);
      if (!error && user) userId = user.id;
    } catch { /* auth optional for listing */ }

    const data = await QuestionService.findMany({
      q: p.get("q") ?? undefined,
      exam: p.get("exam") ?? undefined,
      subject: p.get("subject") ?? undefined,
      chapter: p.get("chapter") ?? undefined,
      topic: p.get("topic") ?? undefined,
      difficulty: p.get("difficulty") ?? undefined,
      year: p.get("year") ? Number(p.get("year")) : undefined,
      verified: p.has("verified") ? p.get("verified") === "true" : undefined,
      limit: Math.min(Number(p.get("limit") ?? 20), 50),
      offset: Number(p.get("offset") ?? 0),
      seed: (() => {
        const raw = p.get("seed");
        if (!raw) return undefined;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n >>> 0 : undefined;
      })(),
      userId,
    });

    return R.ok(data);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getOne(req: NextRequest, id: string) {
  try {
    const question = await QuestionService.findById(id);
    if (!question) return R.notFound("Question");

    // Strip solution from public response
    const { solution: _, correctOptions: __, ...safe } = question as Record<string, unknown>;
    return R.ok(safe);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getSolution(req: NextRequest, id: string) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const solution = await QuestionService.getSolution(id);
    if (!solution) return R.notFound("Question");
    return R.ok(solution);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function report(req: NextRequest, id: string) {
  try {
    const body = await req.json().catch(() => ({}));
    const { category, text } = body as { category?: string; text?: string };
    if (!category) return R.badRequest("category is required");

    let userId: string | undefined;
    try {
      const { user, error } = await requireAuth(req);
      if (!error && user) userId = user.id;
    } catch { /* anonymous reports allowed */ }

    const ok = await QuestionService.addReport(id, { userId, category: String(category), text: String(text ?? "").trim() });
    if (!ok) return R.notFound("Question");
    return R.ok({ reported: true });
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getHints(req: NextRequest, id: string) {
  try {
    const { user, error } = await requireAuth(req);
    if (error) return R.unauthorized();

    const hints = await QuestionService.getHints(id);
    // Filter premium hints for non-premium users (extend when subscriptions are added)
    const filtered = hints;
    return R.ok(filtered);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getStats(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const subject = url.searchParams.get("subject") ?? undefined;
    let userId: string | undefined;
    try {
      const { user, error } = await requireAuth(req);
      if (!error && user) userId = user.id;
    } catch { /* auth optional */ }
    const data = await QuestionService.getStats(subject, userId);
    return R.ok(data);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function getPYQStats(req: NextRequest) {
  try {
    let userId: string | undefined;
    try { const { user, error } = await requireAuth(req); if (!error && user) userId = user.id; } catch {}
    const data = await QuestionService.getPYQStats(userId);
    return R.ok(data);
  } catch (e) { return R.serverError(e); }
}

export async function getForYou(req: NextRequest) {
  try {
    let userId: string | undefined;
    try { const { user, error } = await requireAuth(req); if (!error && user) userId = user.id; } catch {}
    const data = await QuestionService.getForYouFeed(userId);
    return R.ok(data);
  } catch (e) { return R.serverError(e); }
}

export async function getPYQYears(req: NextRequest) {
  try {
    let userId: string | undefined;
    try { const { user, error } = await requireAuth(req); if (!error && user) userId = user.id; } catch {}
    const data = await QuestionService.getPYQYears(userId);
    return R.ok(data);
  } catch (e) { return R.serverError(e); }
}

export async function create(req: NextRequest) {
  try {
    // Admin-only: validate via service role in a real app
    const body = await req.json();
    const question = await QuestionService.create(body);
    return R.created(question);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function update(req: NextRequest, id: string) {
  try {
    const body = await req.json();
    const question = await QuestionService.update(id, body);
    return R.ok(question);
  } catch (e) {
    return R.serverError(e);
  }
}

export async function remove(req: NextRequest, id: string) {
  try {
    await QuestionService.remove(id);
    return R.noContent();
  } catch (e) {
    return R.serverError(e);
  }
}
