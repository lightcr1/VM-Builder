import { useState } from "react";

type Network = { id: string; name: string; tenant: string; vlan: number; cidr: string; gateway: string; type: "managed" | "custom"; vms: number };

const initNetworks: Network[] = [
  { id: "net-001", name: "tenant-admin", tenant: "Platform Admin", vlan: 100, cidr: "10.10.1.0/24", gateway: "10.10.1.1", type: "managed", vms: 0 },
  { id: "net-002", name: "tenant-edge",  tenant: "Edge Lab",       vlan: 200, cidr: "10.10.2.0/24", gateway: "10.10.2.1", type: "managed", vms: 0 },
  { id: "net-003", name: "dmz-public",   tenant: "Platform Admin", vlan: 900, cidr: "10.90.0.0/24", gateway: "10.90.0.1", type: "custom",  vms: 0 },
];

const card = { background: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

export function NetworksPage() {
  const [networks, setNetworks] = useState<Network[]>(initNetworks);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", tenant: "Platform Admin", vlan: "", cidr: "", gateway: "", type: "managed" as "managed" | "custom" });
  const [created, setCreated] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = () => {
    if (!form.name || !form.vlan || !form.cidr) return;
    setNetworks((prev) => [...prev, { id: `net-${Date.now()}`, ...form, vlan: parseInt(form.vlan), vms: 0 }]);
    setForm({ name: "", tenant: "Platform Admin", vlan: "", cidr: "", gateway: "", type: "managed" });
    setShowCreate(false);
    setCreated(true);
    setTimeout(() => setCreated(false), 3000);
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Workspace</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Networks</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Tenant-aware networking, VLAN mapping and subnet management.</p>
          </div>
          <button onClick={() => setShowCreate((s) => !s)}
            style={{ background: showCreate ? "#F1F5F9" : "#2563EB", color: showCreate ? "#64748B" : "#fff", border: showCreate ? "1px solid #E2E8F0" : "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            {showCreate ? "Cancel" : "+ Add Network"}
          </button>
        </div>
      </div>

      {created && (
        <div style={{ background: "#ECFDF5", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#065F46", fontWeight: 600 }}>
          ✓ Network created successfully.
        </div>
      )}

      {showCreate && (
        <div style={{ ...card, padding: "24px", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "16px" }}>New Network</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "14px" }}>
            {[{ label: "Network Name", key: "name", ph: "e.g. tenant-dev" }, { label: "VLAN ID", key: "vlan", ph: "e.g. 300" }, { label: "CIDR", key: "cidr", ph: "e.g. 10.10.3.0/24" }].map((f) => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>{f.label}</label>
                <input value={(form as Record<string, string>)[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.ph}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Gateway</label>
              <input value={form.gateway} onChange={(e) => set("gateway", e.target.value)} placeholder="e.g. 10.10.3.1"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Tenant</label>
              <select value={form.tenant} onChange={(e) => set("tenant", e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", outline: "none", background: "#fff", boxSizing: "border-box" }}>
                {["Platform Admin", "Edge Lab", "Dev Cluster"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Type</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", outline: "none", background: "#fff", boxSizing: "border-box" }}>
                <option value="managed">Managed (ARCS-Cloud)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Create Network
          </button>
        </div>
      )}

      <div style={{ ...card, overflow: "hidden", marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              {["Network Name", "Tenant", "VLAN", "CIDR", "Gateway", "Type", "VMs", ""].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {networks.map((net, i) => (
              <tr key={net.id} style={{ borderBottom: i < networks.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                <td style={{ padding: "13px 16px", fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{net.name}</td>
                <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748B" }}>{net.tenant}</td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ background: "#F1F5F9", padding: "3px 8px", borderRadius: "5px", fontWeight: 600, fontSize: "12px", fontFamily: "monospace" }}>{net.vlan}</span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>{net.cidr}</td>
                <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>{net.gateway}</td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "5px", background: net.type === "managed" ? "rgba(59,130,246,0.08)" : "rgba(139,92,246,0.08)", color: net.type === "managed" ? "#3B82F6" : "#8B5CF6" }}>
                    {net.type === "managed" ? "⚡ Managed" : "✎ Custom"}
                  </span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748B" }}>{net.vms}</td>
                <td style={{ padding: "13px 16px" }}>
                  <button style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...card, padding: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>VLAN Mapping</div>
        <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>Tenant-to-VLAN assignment enforced by the provider bridge.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {networks.map((net) => (
            <div key={net.id} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "14px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{net.name}</div>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#EFF6FF", color: "#2563EB", padding: "2px 7px", borderRadius: "4px", fontFamily: "monospace" }}>VLAN {net.vlan}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>{net.tenant}</div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace", marginTop: "2px" }}>{net.cidr}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
