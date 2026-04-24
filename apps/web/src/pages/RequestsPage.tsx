import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProvisioningRequest } from "@/types";

const statusMap: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "rgba(100,116,139,0.08)", color: "#64748B", label: "Queued" },
  approved:  { bg: "rgba(59,130,246,0.1)",   color: "#3B82F6", label: "Provisioning" },
  completed: { bg: "rgba(16,185,129,0.08)",  color: "#10B981", label: "Completed" },
  failed:    { bg: "rgba(239,68,68,0.08)",   color: "#EF4444", label: "Failed" },
};

function parsePayload(payload: string): { template?: string; providerStatus?: string; error?: string } {
  try {
    const p = JSON.parse(payload) as Record<string, unknown>;
    return {
      template: p.template ? String(p.template) : undefined,
      providerStatus: p.provider_status ? String(p.provider_status) : undefined,
      error: p.error ? String(p.error) : undefined,
    };
  } catch {
    return {};
  }
}

export function RequestsPage() {
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    void api.vms.requests().then(setRequests);
  }, []);

  async function handleRetry(requestId: number) {
    setBusyId(requestId);
    try {
      const updated = await api.vms.requeueRequest(requestId);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const counts = {
    all: requests.length,
    approved: requests.filter((r) => r.status === "approved" || r.status === "pending").length,
    failed: requests.filter((r) => r.status === "failed").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  const pills = [
    { key: "all", label: "All Requests", count: counts.all },
    { key: "approved", label: "Provisioning", count: counts.approved },
    { key: "failed", label: "Failed", count: counts.failed },
    { key: "completed", label: "Completed", count: counts.completed },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Workspace</div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Requests</h1>
        <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Provisioning queue, provider execution state and failure context.</p>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {pills.map((p) => (
          <button key={p.key} onClick={() => setFilter(p.key)}
            style={{ padding: "7px 14px", borderRadius: "8px", border: `1px solid ${filter === p.key ? "#2563EB" : "#E2E8F0"}`, background: filter === p.key ? "#EFF6FF" : "#fff", color: filter === p.key ? "#2563EB" : "#64748B", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
            {p.label}
            <span style={{ background: filter === p.key ? "#BFDBFE" : "#F1F5F9", color: filter === p.key ? "#1D4ED8" : "#64748B", padding: "1px 6px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{p.count}</span>
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              {["Request ID", "VM", "Template", "Provider", "Submitted", "Status", ""].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => {
              const s = statusMap[req.status] ?? statusMap.pending;
              const details = parsePayload(req.providerPayload);
              const isExp = expanded === req.id;
              return (
                <tr key={req.id} style={{ borderBottom: "1px solid #F8FAFC", background: isExp ? "#FAFBFF" : "transparent" }}>
                  <td style={{ padding: "13px 16px", fontFamily: "monospace", fontSize: "12px", color: "#64748B" }}>#{req.id}</td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>VM #{req.vmInstanceId}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748B" }}>{details.template ?? "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>{details.providerStatus ?? "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12px", color: "#94A3B8" }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "20px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 600, width: "fit-content" }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.color }} />
                        {s.label}
                      </span>
                      {(req.status === "approved" || req.status === "pending") && (
                        <div style={{ width: "80px", height: "3px", background: "#E2E8F0", borderRadius: "2px" }}>
                          <div style={{ width: "60%", height: "100%", background: "#3B82F6", borderRadius: "2px" }} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {req.status === "failed" && (
                        <button onClick={() => void handleRetry(req.id)} disabled={busyId === req.id}
                          style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                          {busyId === req.id ? "…" : "↺ Retry"}
                        </button>
                      )}
                      {details.error && (
                        <button onClick={() => setExpanded(isExp ? null : req.id)}
                          style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #FEE2E2", background: "#FFF5F5", color: "#EF4444", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                          {isExp ? "Hide" : "Details"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>No requests match this filter.</td></tr>
            )}
          </tbody>
        </table>
        {expanded !== null && (() => {
          const req = requests.find((r) => r.id === expanded);
          if (!req) return null;
          const details = parsePayload(req.providerPayload);
          return (
            <div style={{ background: "#FFF7F7", borderTop: "1px solid #FEE2E2", padding: "0 16px 14px" }}>
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "14px 16px", marginTop: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Failure Context — #{expanded}</div>
                <div style={{ fontSize: "12px", color: "#7F1D1D", lineHeight: "1.6", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{details.error}</div>
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{ marginTop: "20px", background: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>Provider Execution State</div>
        <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>Status of connected Proxmox providers.</div>
        <div style={{ display: "flex", gap: "14px" }}>
          {[
            { name: "proxmox-01", status: "healthy", vms: requests.filter((r) => r.status === "completed").length, cpu: "—", ram: "—" },
          ].map((p) => (
            <div key={p.name} style={{ flex: 1, background: p.status === "healthy" ? "#F0FDF4" : "#FFF7F7", border: `1px solid ${p.status === "healthy" ? "#BBF7D0" : "#FECACA"}`, borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{p.name}</div>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: p.status === "healthy" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: p.status === "healthy" ? "#10B981" : "#EF4444", textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.status}</span>
              </div>
              {[["Completed VMs", p.vms], ["CPU Util.", p.cpu], ["RAM Util.", p.ram]].map(([k, v]) => (
                <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>{k}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
