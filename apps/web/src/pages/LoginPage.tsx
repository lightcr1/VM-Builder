import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const endpoint = typeof window !== "undefined" ? window.location.host : "10.10.40.61:4000";
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
        <p className="eyebrow">Secure Access</p>
        <h1>Operate tenant-scoped infrastructure from one clean control plane.</h1>
        <p>
          Built for self-service VM creation, guarded visibility, and a direct path into Proxmox-backed
          provisioning.
        </p>
        <div className="login-stat-grid">
          <div>
            <strong>HTTPS</strong>
            <span>{endpoint}</span>
          </div>
          <div>
            <strong>Queue-backed</strong>
            <span>Async worker execution</span>
          </div>
          <div>
            <strong>Tenant aware</strong>
            <span>Visibility enforced in API</span>
          </div>
        </div>
        <div className="signal-list">
          <span>Proxmox-ready</span>
          <span>Admin recovery flow</span>
          <span>Network isolation later</span>
        </div>
        <a className="hosted-by login-hosted-by" href="https://arcs-cloud.ch" target="_blank" rel="noreferrer">
          Hosted by <strong>arcs-cloud</strong>
        </a>
      </section>

      <section className="login-panel form-panel">
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-intro">
            <p className="eyebrow">Sign In</p>
            <strong>Local bootstrap access</strong>
            <span>Use the admin credentials from the environment file or your provisioned local account.</span>
          </div>
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
          <p className="helper-text">Backend auth is local today and can later be mapped to LDAP or AD.</p>
        </form>
      </section>
    </div>
  );
}
