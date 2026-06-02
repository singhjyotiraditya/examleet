"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase auto-exchanges the ?code= via detectSessionInUrl (default: true).
    // Calling exchangeCodeForSession manually would try to use an already-spent code
    // and either fail or hang, leaving the user stuck on this screen.
    // Instead, just listen for the SIGNED_IN event and do the sync there.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        try {
          await fetch("/api/auth/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ email: session.user.email }),
          });
        } catch {
          // Sync failure is fine — the homepage's /api/me fallback handles it
        }
        router.replace("/app");
      }
    });

    // Safety net: if neither SIGNED_IN nor any event fires within 8 seconds
    // (e.g. the code was invalid or already exchanged), bail out to homepage.
    // The homepage's getSession() will pick up the session if it was established.
    const timeout = setTimeout(() => router.replace("/"), 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-0)", color: "var(--fg-2)", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.1em" }}>
      SIGNING IN…
    </div>
  );
}
