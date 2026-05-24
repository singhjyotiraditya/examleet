import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateUniqueHandle, handleBaseFromName } from "@/lib/handle";
import { prisma } from "@/lib/prisma";
import * as R from "@/lib/response";

// Called immediately after Google OAuth callback.
// Creates the user row on first login; never overwrites profile on re-login.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return R.unauthorized();

  const body = await req.json().catch(() => ({}));
  const resolvedEmail: string = body.email ?? user.email ?? "";
  const emailLocal = resolvedEmail.split("@")[0]?.toLowerCase().replace(/[^a-z0-9._]/g, "") || "student";

  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (existing) return R.ok(existing);

  const handle = await generateUniqueHandle(emailLocal);
  const profile = await prisma.user.create({
    data: {
      id: user.id,
      ...(resolvedEmail && { email: resolvedEmail }),
      name: handleBaseFromName(emailLocal),
      handle,
      authMethod: "google",
    },
  });

  return R.ok(profile);
}
