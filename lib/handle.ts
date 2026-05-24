import { prisma } from "@/lib/prisma";

/** Build a URL-safe handle base from a display name (no @ prefix). */
export function handleBaseFromName(displayName: string): string {
  const base = displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24);
  return base || "student";
}

/** Returns @handle guaranteed unique in the users table. */
export async function generateUniqueHandle(displayName: string, excludeUserId?: string): Promise<string> {
  const base = handleBaseFromName(displayName);
  let suffix = 0;

  while (suffix < 10_000) {
    const handle = `@${suffix === 0 ? base : `${base}${suffix}`}`;
    const existing = await prisma.user.findFirst({
      where: {
        handle,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return handle;
    suffix++;
  }

  return `@${base}${Date.now().toString(36).slice(-4)}`;
}
