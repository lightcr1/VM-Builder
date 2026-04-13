import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("change-me-now");
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

  return (
    <div className="login-screen">
      <section className="login-panel intro-panel">
        <p className="eyebrow">VM Builder</p>
        <h1>Tenant-aware VM operations, without the control-panel clutter.</h1>
        <p>
          Local accounts are enabled now. LDAP and AD can be wired in later without changing the frontend
          structure.
        </p>
        <div className="signal-list">
          <span>Own VMs only</span>
          <span>Proxmox-ready API</span>
          <span>Tenant isolation later</span>
        </div>
      </section>

      <section className="login-panel form-panel">
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <p className="helper-text">Default backend login uses the bootstrap admin from the environment file.</p>
        </form>
      </section>
    </div>
  );
}
