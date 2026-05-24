"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    if (!code) { router.replace("/"); return; }

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.session) { router.replace("/"); return; }

      const { user, access_token } = data.session;
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          email: user.email,
        }),
      });

      router.replace("/");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-0)", color: "var(--fg-2)", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.1em" }}>
      SIGNING IN…
    </div>
  );
}
