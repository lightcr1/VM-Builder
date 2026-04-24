import { NavLink, Outlet } from "react-router-dom";
import { isAdmin, useAuth } from "@/App";

function ArcLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="url(#arcGrad)" />
      <path d="M7 20 Q15 7 23 20" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="15" cy="20" r="2.5" fill="white" fillOpacity="0.9" />
      <defs>
        <linearGradient id="arcGrad" x1="0" y1="0" x2="30" y2="30">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type NavItem = { to: string; label: string; end?: boolean; admin?: boolean };

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ fontSize: "9.5px", fontWeight: 600, color: "#3A4A72", letterSpacing: "0.12em", textTransform: "uppercase", padding: "0 10px", marginBottom: "4px" }}>
        {label}
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 10px", borderRadius: "7px", cursor: "pointer",
            background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
            color: isActive ? "#60A5FA" : "#7A8DB8",
            fontSize: "13px", fontWeight: isActive ? 600 : 500,
            textDecoration: "none", transition: "all 0.15s", marginBottom: "2px",
          })}
        >
          {item.label}
          {item.admin && (
            <span style={{ fontSize: "9px", fontWeight: 700, background: "rgba(239,68,68,0.15)", color: "#F87171", padding: "1px 5px", borderRadius: "3px", marginLeft: "auto", letterSpacing: "0.05em" }}>
              ADMIN
            </span>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function AppShell() {
  const { session, me, signOut } = useAuth();
  const adminUser = isAdmin(session?.user);
  const initials = (session?.user.fullName ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const workspaceNav: NavItem[] = [
    { to: "/", label: "Overview", end: true },
    { to: "/instances", label: "Instances" },
    { to: "/requests", label: "Requests" },
    { to: "/networks", label: "Networks" },
  ];

  const adminNav: NavItem[] = [
    { to: "/access", label: "Access", admin: true },
    { to: "/admin", label: "Admin", admin: true },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: "220px", minHeight: "100vh", background: "#0B0F1A", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100, userSelect: "none" }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <ArcLogo />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.3px", lineHeight: 1 }}>ARCS-Cloud</span>
              <span style={{ fontSize: "10px", fontWeight: 500, color: "#4B5B8C", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "3px" }}>VM Builder</span>
            </div>
          </div>
          <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981" }} />
            <span style={{ fontSize: "11px", color: "#4B5B8C", fontWeight: 500 }}>
              {me?.memberships.length ?? 0} tenant scope{(me?.memberships.length ?? 0) !== 1 ? "s" : ""} active
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          <NavSection label="Workspace" items={workspaceNav} />
          {adminUser && <NavSection label="Administration" items={adminNav} />}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#CBD5E1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session?.user.fullName}
              </div>
              <div style={{ fontSize: "10px", color: "#4B5B8C", fontWeight: 500 }}>{session?.user.role}</div>
            </div>
            <button type="button" onClick={signOut} title="Sign out" style={{ background: "none", border: "none", color: "#4B5B8C", cursor: "pointer", fontSize: "16px", padding: "4px", borderRadius: "4px", lineHeight: 1 }}>
              ↪
            </button>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, marginLeft: "220px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "48px", background: "#fff", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "sticky", top: 0, zIndex: 50, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981" }} />
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>proxmox-01</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#10B981" }}>active</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "#64748B" }}>{session?.user.email}</span>
            {adminUser && (
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "3px 10px", borderRadius: "6px" }}>
                Platform Admin
              </span>
            )}
          </div>
        </div>

        <div style={{ flex: 1, padding: "28px 32px", maxWidth: "1400px", width: "100%" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
