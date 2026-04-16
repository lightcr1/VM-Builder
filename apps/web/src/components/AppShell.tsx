import { NavLink, Outlet } from "react-router-dom";
import { isAdmin, useAuth } from "@/App";

export function AppShell() {
  const { session, me, signOut } = useAuth();
  const endpoint = typeof window !== "undefined" ? window.location.host : "10.10.40.61:4000";
  const navigation = [
    { to: "/", label: "Overview" },
    { to: "/instances", label: "Instances" },
    { to: "/requests", label: "Requests" },
    { to: "/networks", label: "Networks" },
    { to: "/access", label: "Access" },
    { to: "/create", label: "Create" },
    ...(isAdmin(session?.user) ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <div>
            <p className="eyebrow">Infrastructure</p>
            <h1>VM Builder</h1>
            <p className="brand-copy">Tenant-scoped compute with a cleaner operator surface.</p>
          </div>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="nav">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-endpoint">
            <span className="eyebrow">Endpoint</span>
            <strong>{endpoint}</strong>
          </div>
          <div className="user-chip">
            <span>{session?.user.fullName}</span>
            <small>{session?.user.role}</small>
            <small>{me?.memberships.map((membership) => membership.tenant.name).join(", ")}</small>
          </div>
          <button type="button" className="ghost-button" onClick={signOut}>
            Sign out
          </button>
          <a className="hosted-by" href="https://arcs-cloud.ch" target="_blank" rel="noreferrer">
            Hosted by <strong>arcs-cloud</strong>
          </a>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">Control Plane</p>
            <div className="topbar-heading">
              <strong>{me?.memberships.length ?? 0} tenant scopes active</strong>
              <span>HTTPS endpoint active. Provisioning routed through queue workers.</span>
            </div>
          </div>
          <div className="topbar-meta">
            <span>{session?.user.email}</span>
            <span>{me?.memberships[0]?.tenant.name ?? "No tenant assigned"}</span>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
