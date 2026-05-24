import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as R from "@/lib/response";

// Called immediately after Google OAuth callback.
// Creates the user row on first login; no-ops on subsequent logins.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return R.unauthorized();

  const { name, email } = await req.json();

  const resolvedEmail: string = email ?? user.email ?? "";
  const resolvedName: string = name || resolvedEmail.split("@")[0];
  const handle = "@" + resolvedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9._]/g, "");

  const profile = await prisma.user.upsert({
    where: { id: user.id },
    update: {},  // never overwrite profile data on re-login
    create: {
      id: user.id,
      ...(resolvedEmail && { email: resolvedEmail }),
      name: resolvedName,
      handle,
      authMethod: "google",
    },
  });

  return R.ok(profile);
}
