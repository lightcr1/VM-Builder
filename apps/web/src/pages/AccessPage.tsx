import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/App";
import { isAdmin } from "@/App";
import { api } from "@/lib/api";
import type { SshKey, Tenant, User } from "@/types";

const card = { background: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const inp = { width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" } as React.CSSProperties;
const roleColors: Record<string, { bg: string; color: string }> = {
  admin:    { bg: "rgba(239,68,68,0.08)",   color: "#EF4444" },
  operator: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B" },
  user:     { bg: "rgba(59,130,246,0.08)", color: "#3B82F6" },
};

export function AccessPage() {
  const { session } = useAuth();
  const adminUser = isAdmin(session?.user);

  const [sshKeys, setSshKeys] = useState<SshKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [keyErr, setKeyErr] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userForm, setUserForm] = useState({ fullName: "", email: "", password: "", role: "user" as User["role"], tenantId: 0 });
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [userErr, setUserErr] = useState<string | null>(null);

  useEffect(() => {
    void api.sshKeys.list().then(setSshKeys).catch(() => setSshKeys([]));
    if (adminUser) {
      void Promise.all([api.users.list(), api.tenants.listAll()]).then(([us, ts]) => {
        setUsers(us);
        setTenants(ts);
        setUserForm((f) => ({ ...f, tenantId: f.tenantId || ts[0]?.id || 0 }));
      }).catch(() => {});
    }
  }, [adminUser]);

  async function handleAddKey(e: FormEvent) {
    e.preventDefault();
    setKeyErr(null);
    setKeyBusy(true);
    try {
      await api.sshKeys.create({ name: keyName.trim(), publicKey: publicKey.trim() });
      setKeyName("");
      setPublicKey("");
      setKeyMsg("SSH key added.");
      setSshKeys(await api.sshKeys.list());
    } catch (err) {
      setKeyErr(err instanceof Error ? err.message : "Failed to add SSH key.");
    } finally {
      setKeyBusy(false);
    }
  }

  async function handleRemoveKey(keyId: number, name: string) {
    if (!window.confirm(`Remove SSH key "${name}"?`)) return;
    try {
      await api.sshKeys.remove(keyId);
      setKeyMsg(`SSH key "${name}" removed.`);
      setSshKeys(await api.sshKeys.list());
    } catch (err) {
      setKeyErr(err instanceof Error ? err.message : "Failed to remove SSH key.");
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setUserErr(null);
    try {
      await api.users.create(userForm);
      setUserMsg("User created successfully.");
      setUserForm((f) => ({ ...f, fullName: "", email: "", password: "", role: "user" }));
      setUsers(await api.users.list());
    } catch (err) {
      setUserErr(err instanceof Error ? err.message : "Failed to create user.");
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase" }}>Administration</div>
          {adminUser && <span style={{ fontSize: "10px", fontWeight: 700, background: "rgba(239,68,68,0.1)", color: "#F87171", padding: "2px 7px", borderRadius: "4px", letterSpacing: "0.05em" }}>ADMIN ONLY</span>}
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Access</h1>
        <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>SSH keys, user management and identity configuration.</p>
      </div>

      {/* SSH Keys */}
      <div style={{ ...card, padding: "0", marginBottom: "20px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>SSH Keys</div>
          <div style={{ fontSize: "11px", color: "#94A3B8" }}>Public keys stored here can be injected at VM creation via cloud-init.</div>
        </div>
        <div style={{ padding: "20px" }}>
          {keyMsg && <div style={{ background: "#ECFDF5", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "9px 14px", marginBottom: "14px", fontSize: "12px", color: "#065F46", fontWeight: 600 }}>✓ {keyMsg}</div>}
          {keyErr && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "9px 14px", marginBottom: "14px", fontSize: "12px", color: "#B91C1C", fontWeight: 600 }}>{keyErr}</div>}
          <form onSubmit={(e) => void handleAddKey(e)} style={{ display: "grid", gridTemplateColumns: "200px 1fr auto", gap: "12px", alignItems: "end", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Key name</label>
              <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="my-laptop" required style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Public key</label>
              <input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="ssh-ed25519 AAAA... user@host" required style={{ ...inp, fontFamily: "monospace" }} />
            </div>
            <button type="submit" disabled={keyBusy} style={{ padding: "9px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: keyBusy ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {keyBusy ? "Adding…" : "Add Key"}
            </button>
          </form>
          {sshKeys.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#94A3B8", textAlign: "center", padding: "20px 0" }}>No SSH keys registered. Add one above to enable passwordless VM access.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sshKeys.map((key) => (
                <div key={key.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 16px", borderRadius: "9px", border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>{key.name}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{key.fingerprint}</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", flexShrink: 0 }}>{new Date(key.createdAt).toLocaleDateString()}</div>
                  <button onClick={() => void handleRemoveKey(key.id, key.name)} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #FEE2E2", background: "#FFF5F5", color: "#EF4444", fontSize: "11px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User management — admin only */}
      {adminUser && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Users</div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>Roles and tenant memberships</div>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "3px 8px", borderRadius: "6px" }}>{users.length} total</span>
              </div>
              {users.map((u, i) => {
                const rc = roleColors[u.role] ?? roleColors.user;
                const initials = u.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={u.id} style={{ padding: "14px 20px", borderBottom: i < users.length - 1 ? "1px solid #F8FAFC" : "none", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{u.fullName}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{u.email}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: rc.bg, color: rc.color, textTransform: "capitalize" }}>{u.role}</span>
                      <span style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "monospace" }}>{u.authSource}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ ...card, padding: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>Create User</div>
              <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "16px" }}>Creates a local account and assigns a default tenant.</div>
              {userMsg && <div style={{ background: "#ECFDF5", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "9px 14px", marginBottom: "12px", fontSize: "12px", color: "#065F46", fontWeight: 600 }}>✓ {userMsg}</div>}
              {userErr && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "9px 14px", marginBottom: "12px", fontSize: "12px", color: "#B91C1C", fontWeight: 600 }}>{userErr}</div>}
              <form onSubmit={(e) => void handleCreateUser(e)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Full name</label>
                    <input value={userForm.fullName} onChange={(e) => setUserForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Ava Keller" required style={inp} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Email</label>
                    <input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="ava@example.com" required style={inp} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Password</label>
                    <input type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="Temporary password" required style={inp} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Role</label>
                    <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value as User["role"] }))} style={{ ...inp, background: "#fff" }}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Tenant</label>
                  <select value={userForm.tenantId} onChange={(e) => setUserForm((f) => ({ ...f, tenantId: Number(e.target.value) }))} style={{ ...inp, background: "#fff" }}>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <button type="submit" style={{ padding: "10px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Create User
                </button>
              </form>
            </div>
          </div>

          {/* LDAP Config */}
          <div style={{ ...card, padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>LDAP / Active Directory</div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>Authenticate users against an external directory service. Configured via environment variables.</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { key: "LDAP_ENABLED", desc: "Enable LDAP authentication provider" },
                { key: "LDAP_SERVER_URI", desc: "LDAP server URI (e.g. ldap://dc.corp.internal)" },
                { key: "LDAP_BIND_DN", desc: "Service account DN for directory searches" },
                { key: "LDAP_BIND_PASSWORD", desc: "Service account password" },
                { key: "LDAP_BASE_DN", desc: "Base DN for user search" },
                { key: "LDAP_USER_SEARCH_FILTER", desc: "Filter to match allowed users" },
                { key: "LDAP_EMAIL_ATTRIBUTE", desc: "LDAP attribute used as the platform email" },
                { key: "LDAP_NAME_ATTRIBUTE", desc: "LDAP attribute used as the display name" },
                { key: "LDAP_GROUP_ATTRIBUTE", desc: "LDAP attribute containing group memberships" },
                { key: "LDAP_ALLOWED_GROUPS", desc: "Allowed groups; use semicolons for full DNs" },
                { key: "LDAP_ADMIN_GROUPS", desc: "Admin groups; use semicolons for full DNs" },
              ].map((item) => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#F8FAFC", borderRadius: "8px", padding: "10px 14px", border: "1px solid #E2E8F0" }}>
                  <code style={{ fontSize: "11px", fontWeight: 600, color: "#475569", fontFamily: "monospace", minWidth: "220px" }}>{item.key}</code>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>{item.desc}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "16px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "8px", padding: "12px 16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#0369A1", marginBottom: "4px" }}>Role Mapping</div>
              <div style={{ fontSize: "11px", color: "#0284C7", lineHeight: "1.5" }}>Group membership is mapped to platform roles via <code style={{ fontFamily: "monospace" }}>LDAP_ADMIN_GROUPS</code> and <code style={{ fontFamily: "monospace" }}>LDAP_ALLOWED_GROUPS</code>. Users in admin groups receive the <strong>admin</strong> role; all others receive <strong>user</strong>.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
