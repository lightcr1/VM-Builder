import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const endpoint = typeof window !== "undefined" ? window.location.host : "10.10.40.61:4000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    return (
      <Navigate
        to={(location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/"}
        replace
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch {
      setError("Sign-in failed. Check the API endpoint or use mock mode.");
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    background: "#F8FAFC",
    color: "#0F172A",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0B0F1A" }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", background: "linear-gradient(135deg, #0D1424 0%, #0B0F1A 60%, #0D1A2E 100%)" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="lg-login" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#lg-login)" />
            <path d="M8 16L14 10L20 16L14 22L8 16Z" fill="white" fillOpacity="0.9" />
            <path d="M16 8L24 16L16 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.6" />
          </svg>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.3px" }}>ARCS-Cloud</span>
        </div>

        {/* Main copy */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#3B82F6", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>Secure Access</div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#F1F5F9", lineHeight: 1.25, margin: "0 0 16px", maxWidth: "380px" }}>
            Operate tenant-scoped infrastructure from one clean control plane.
          </h1>
          <p style={{ fontSize: "14px", color: "#7A8DB8", lineHeight: 1.7, maxWidth: "340px", margin: "0 0 40px" }}>
            Built for self-service VM creation, guarded visibility, and a direct path into Proxmox-backed provisioning.
          </p>

          {/* Stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "32px" }}>
            {[
              { label: "HTTPS", value: endpoint },
              { label: "Queue-backed", value: "Async worker execution" },
              { label: "Tenant aware", value: "Visibility enforced in API" },
              { label: "Proxmox-ready", value: "Direct provider bridge" },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#3B82F6", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                <div style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["Proxmox-ready", "Admin recovery flow", "Network isolation"].map((t) => (
              <span key={t} style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "rgba(59,130,246,0.1)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.2)" }}>{t}</span>
            ))}
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "#475569" }}>
          Hosted by <a href="https://arcs-cloud.ch" target="_blank" rel="noreferrer" style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 600 }}>arcs-cloud</a>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: "480px", display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 48px", background: "#F0F2F7" }}>
        <div style={{ width: "100%" }}>
          <div style={{ marginBottom: "36px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Sign In</div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A", margin: "0 0 6px" }}>Local bootstrap access</h2>
            <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.6 }}>
              Use the admin credentials from the environment file or your provisioned local account.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Email</label>
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={inp}
              />
            </div>

            {error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#DC2626" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "none", background: loading ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.15s" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "16px", textAlign: "center", lineHeight: 1.6 }}>
              Local and LDAP accounts use the same sign-in flow when LDAP is enabled.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
