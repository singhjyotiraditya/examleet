"use client";
import React, { useState } from "react";
import { Icons } from "./shared";

const AUTH_KEY = "apex_auth_v1";

interface AuthUser {
  name: string;
  email: string;
  city: string;
  method: string;
  signedUpAt?: string;
}

interface AuthFlowProps {
  onAuthed: (user: AuthUser) => void;
}

export default function AuthFlow({ onAuthed }: AuthFlowProps) {
  const persist = (user: Omit<AuthUser, "signedUpAt">) => {
    const record = { ...user, signedUpAt: new Date().toISOString() };
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(record)); } catch { }
    onAuthed(record);
  };

  const handleGoogle = () => {
    // TODO: supabase.auth.signInWithOAuth({ provider: "google" })
    persist({ name: "", email: "user@gmail.com", city: "", method: "google" });
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Splash onGoogle={handleGoogle} />
    </div>
  );
}

function Splash({ onGoogle }: { onGoogle: () => void }) {
  return (
    <div className="screen" style={{ paddingBottom: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 22px 20px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 50% at 50% 30%, var(--accent-soft) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", marginBottom: 36 }}>
          <BrandMark size={88} />
        </div>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 12 }}>★ JEE Mains · JEE Advanced · 30,000+ PYQs</div>
        <div className="h-display" style={{ fontSize: 44, textAlign: "center", marginBottom: 18, padding: "0 8px", lineHeight: 1.1 }}>
          A daily edge for <em>serious droppers.</em>
        </div>
        <div style={{ fontSize: 14, color: "var(--fg-2)", textAlign: "center", lineHeight: 1.55, maxWidth: 320 }}>
          AI-guided hints, weekly mocks ranked all-India, and the cleanest practice loop you'll find.
        </div>
      </div>

      <div style={{ padding: "20px 22px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={onGoogle}
          className="btn btn-block"
          style={{ padding: "15px 18px", background: "var(--bg-0)", border: "1px solid var(--line-2)", fontWeight: 600, fontSize: 15, color: "var(--fg-0)", gap: 12, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 18, boxShadow: "var(--shadow-md)" }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.5 }}>
          By continuing you agree to our <span style={{ textDecoration: "underline" }}>Terms</span> & <span style={{ textDecoration: "underline" }}>Privacy</span>.
        </div>
      </div>
    </div>
  );
}



function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.3z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.5C4.7 19.6 8.1 22 12 22z" fill="#34A853" />
      <path d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.6H3.1C2.4 9 2 10.4 2 12s.4 3 1.1 4.4l3.3-2.5z" fill="#FBBC04" />
      <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3 14.7 2 12 2 8.1 2 4.7 4.4 3.1 7.6l3.3 2.5c.8-2.4 3-4.1 5.6-4.1z" fill="#EA4335" />
    </svg>
  );
}

export function BrandMark({ size = 64 }: { size?: number }) {
  return <img src="/logo.png" alt="ExamLeet" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
}

export function Field({ label, value, onChange, placeholder, type = "text", left, right, valid }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; left?: React.ReactNode; right?: React.ReactNode; valid?: boolean | null;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--fg-3)", marginBottom: 6, marginLeft: 2, fontWeight: 500, fontFamily: "var(--mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", background: "var(--bg-1)", border: `1px solid ${focused ? "var(--fg-0)" : valid === false ? "var(--hard)" : "var(--line-2)"}`, borderRadius: 14, boxShadow: focused ? "var(--shadow-md)" : "var(--shadow-sm)", transition: "all .15s ease" }}>
        {left}
        <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, fontSize: 14, color: "var(--fg-0)", background: "transparent", outline: "none", border: "none", minWidth: 0 }} />
        {valid === true && <Icons.Check size={15} style={{ color: "var(--easy)" }} />}
        {right}
      </div>
    </div>
  );
}

export { AUTH_KEY };
