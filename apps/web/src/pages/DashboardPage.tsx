import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { ProvisioningRequest, Tenant, Vm } from "@/types";

const statusCfg: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  running:      { bg: "rgba(16,185,129,0.1)",  color: "#10B981", dot: "#10B981", label: "Running" },
  stopped:      { bg: "rgba(100,116,139,0.1)", color: "#64748B", dot: "#94A3B8", label: "Stopped" },
  provisioning: { bg: "rgba(59,130,246,0.1)",  color: "#3B82F6", dot: "#3B82F6", label: "Provisioning" },
  requested:    { bg: "rgba(100,116,139,0.1)", color: "#64748B", dot: "#94A3B8", label: "Requested" },
  error:        { bg: "rgba(239,68,68,0.1)",   color: "#EF4444", dot: "#EF4444", label: "Error" },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusCfg[status] ?? statusCfg.stopped;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "20px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 600 }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

const card = { background: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

export function DashboardPage() {
  const navigate = useNavigate();
  const [vms, setVms] = useState<Vm[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);

  useEffect(() => {
    void Promise.all([api.vms.list(), api.tenants.list(), api.vms.requests()]).then(([vmList, tenantList, reqList]) => {
      setVms(vmList);
      setTenants(tenantList);
      setRequests(reqList);
    });
  }, []);

  const running = vms.filter((v) => v.status === "running").length;
  const stopped = vms.filter((v) => v.status === "stopped").length;
  const provisioning = vms.filter((v) => v.status === "provisioning" || v.status === "requested").length;
  const pendingReqs = requests.filter((r) => r.status === "pending" || r.status === "approved").length;
  const failedJobs = requests.filter((r) => r.status === "failed").length;
  const totalCpu = vms.reduce((sum, v) => sum + v.cpuCores, 0);

  const statCards = [
    { label: "Running VMs", value: running, color: "#10B981", sub: `${stopped} stopped · ${provisioning} provisioning` },
    { label: "Pending Requests", value: pendingReqs, color: "#F59E0B", sub: `${failedJobs} failed` },
    { label: "Active Tenants", value: tenants.length, color: "#3B82F6", sub: "Logical scopes" },
    { label: "Total vCPUs", value: totalCpu, color: "#8B5CF6", sub: "Across all VMs" },
  ];

  const recent = requests.slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Workspace</div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Overview</h1>
        <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Platform health, active instances and recent activity.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {statCards.map((c) => (
          <div key={c.label} style={{ ...card, padding: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>{c.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px" }}>
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Virtual Machines</div>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>{vms.length} total instances</div>
            </div>
            <button onClick={() => navigate("/create")} style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: "7px", padding: "7px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              + New VM
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Name", "Tenant", "Package", "Template", "Status", "Created"].map((h) => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #F1F5F9" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vms.map((vm, i) => (
                <tr key={vm.id} style={{ borderBottom: i < vms.length - 1 ? "1px solid #F8FAFC" : "none", cursor: "pointer" }} onClick={() => navigate("/instances")}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", fontFamily: "monospace" }}>{vm.name}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{vm.description || "No description"}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "#64748B" }}>{vm.tenant.name}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "12px", color: "#475569", background: "#F1F5F9", padding: "3px 8px", borderRadius: "5px", fontWeight: 500 }}>{vm.packageId}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "#64748B" }}>{vm.template.name}</td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={vm.status} /></td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "#64748B" }}>{new Date(vm.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {vms.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>No VMs yet. Create one to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Activity</div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}>Recent provisioning events</div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {recent.length === 0 && (
              <div style={{ padding: "24px 20px", fontSize: "12px", color: "#94A3B8", textAlign: "center" }}>No recent activity.</div>
            )}
            {recent.map((req, i) => {
              const dotColor = req.status === "completed" ? "#10B981" : req.status === "failed" ? "#EF4444" : "#3B82F6";
              const msg = req.status === "completed" ? "Provisioning completed" : req.status === "failed" ? "Provisioning failed" : "Provisioning in progress";
              return (
                <div key={req.id} style={{ padding: "12px 20px", display: "flex", gap: "12px", alignItems: "flex-start", borderBottom: i < recent.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: "4px" }} />
                  <div>
                    <div style={{ fontSize: "12px", color: "#334155", lineHeight: "1.4" }}>{msg}</div>
                    <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>VM #{req.vmInstanceId} · Request #{req.id}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
