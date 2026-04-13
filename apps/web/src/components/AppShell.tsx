import { NavLink, Outlet } from "react-router-dom";
import { isAdmin, useAuth } from "@/App";

export function AppShell() {
  const { session, me, signOut } = useAuth();
  const navigation = [
    { to: "/", label: "Dashboard" },
    { to: "/vms/new", label: "Create VM" },
    ...(isAdmin(session?.user) ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <div>
            <p className="eyebrow">VM Builder</p>
            <h1>Control plane for tenant-scoped VMs.</h1>
          </div>
        </div>

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
          <div className="user-chip">
            <span>{session?.user.fullName}</span>
            <small>{session?.user.role}</small>
            <small>{me?.memberships.map((membership) => membership.tenant.name).join(", ")}</small>
          </div>
          <button type="button" className="ghost-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="workspace">
        <Outlet />
      </main>
    </div>
  );
}
