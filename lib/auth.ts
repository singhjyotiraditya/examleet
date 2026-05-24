import { NextRequest } from "next/server";
import { supabaseAdmin, supabase } from "./supabase";

// Client-side fetch wrapper that injects the current Supabase session token.
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function getAuthUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, error: "Unauthorized" } as const;
  return { user, error: null } as const;
}
