import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Vm } from "@/types";

const statusCfg: Record<string, { bg: string; color: string; label: string }> = {
  running:      { bg: "rgba(16,185,129,0.08)",  color: "#10B981", label: "Running" },
  stopped:      { bg: "rgba(100,116,139,0.08)", color: "#64748B", label: "Stopped" },
  provisioning: { bg: "rgba(59,130,246,0.08)",  color: "#3B82F6", label: "Provisioning" },
  requested:    { bg: "rgba(100,116,139,0.08)", color: "#64748B", label: "Requested" },
  error:        { bg: "rgba(239,68,68,0.08)",   color: "#EF4444", label: "Error" },
};

export function InstancesPage() {
  const navigate = useNavigate();
  const [vms, setVms] = useState<Vm[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    void api.vms.list().then(setVms);
  }, []);

  async function handleAction(vmId: number, action: "start" | "stop") {
    setBusyId(vmId);
    try {
      const updated = await api.vms.action(vmId, action);
      setVms((prev) => prev.map((v) => (v.id === vmId ? updated : v)));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(vmId: number) {
    setBusyId(vmId);
    try {
      await api.vms.remove(vmId);
      setVms((prev) => prev.filter((v) => v.id !== vmId));
      setSelected(null);
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  }

  const filtered = vms.filter((v) => {
    const matchQ = search === "" || v.name.toLowerCase().includes(search.toLowerCase()) || v.tenant.name.toLowerCase().includes(search.toLowerCase());
    const matchS = filterStatus === "all" || v.status === filterStatus;
    return matchQ && matchS;
  });

  const selVm = vms.find((v) => v.id === selected);

  return (
    <div style={{ display: "flex", gap: "20px", height: "calc(100vh - 120px)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Workspace</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Instances</h1>
              <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Manage and monitor your virtual machines.</p>
            </div>
            <button onClick={() => navigate("/create")} style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              + Create VM
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or tenant…"
            style={{ flex: 1, padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", color: "#0F172A", outline: "none", background: "#fff" }}
          />
          {["all", "running", "stopped", "provisioning", "error"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${filterStatus === s ? "#2563EB" : "#E2E8F0"}`, background: filterStatus === s ? "#EFF6FF" : "#fff", color: filterStatus === s ? "#2563EB" : "#64748B", fontSize: "12px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                {["Name", "Tenant", "Package", "Template", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((vm, i) => {
                const s = statusCfg[vm.status] ?? statusCfg.stopped;
                const isSelected = selected === vm.id;
                return (
                  <tr key={vm.id} onClick={() => setSelected(vm.id === selected ? null : vm.id)}
                    style={{ borderBottom: "1px solid #F8FAFC", cursor: "pointer", background: isSelected ? "#F0F7FF" : "transparent", transition: "background 0.1s" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{vm.name}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{vm.template.name}</div>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748B" }}>{vm.tenant.name}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: "12px", color: "#475569", background: "#F1F5F9", padding: "3px 8px", borderRadius: "5px", fontWeight: 500 }}>{vm.packageId}</span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748B" }}>{vm.template.name}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "20px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 600 }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.color }} />
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {vm.status !== "provisioning" && vm.status !== "requested" && (
                          <button
                            onClick={() => void handleAction(vm.id, vm.status === "running" ? "stop" : "start")}
                            disabled={busyId === vm.id}
                            style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                            {busyId === vm.id ? "…" : vm.status === "running" ? "⏹ Stop" : "▶ Start"}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(vm.id)}
                          style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #FEE2E2", background: "#FFF5F5", color: "#EF4444", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>No instances match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selVm && (
        <div style={{ width: "280px", background: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px", flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{selVm.name}</div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "16px" }}>×</button>
          </div>
          {(() => {
            const s = statusCfg[selVm.status] ?? statusCfg.stopped;
            return (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "20px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 600, marginBottom: "16px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.color }} />
                {s.label}
              </span>
            );
          })()}
          {[
            ["Tenant", selVm.tenant.name],
            ["Owner", selVm.owner.fullName],
            ["Template", selVm.template.name],
            ["Package", selVm.packageId],
            ["CPU", `${selVm.cpuCores} vCPU`],
            ["RAM", `${selVm.memoryMb / 1024} GB`],
            ["Disk", `${selVm.diskGb} GB`],
            ["Created", new Date(selVm.createdAt).toLocaleDateString()],
          ].map(([k, v]) => (
            <div key={k} style={{ borderBottom: "1px solid #F1F5F9", padding: "8px 0", display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>{k}</span>
              <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600, textAlign: "right" }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            {selVm.status !== "provisioning" && selVm.status !== "requested" && (
              <button
                onClick={() => void handleAction(selVm.id, selVm.status === "running" ? "stop" : "start")}
                disabled={busyId === selVm.id}
                style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                {selVm.status === "running" ? "⏹ Stop" : "▶ Start"}
              </button>
            )}
            <button onClick={() => setConfirmDelete(selVm.id)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #FEE2E2", background: "#FFF5F5", color: "#EF4444", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              Delete
            </button>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#fff", borderRadius: "14px", padding: "28px", width: "360px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>Delete VM?</div>
            <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>
              This will permanently delete <strong style={{ fontFamily: "monospace" }}>{vms.find((v) => v.id === confirmDelete)?.name}</strong>. This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => void handleDelete(confirmDelete)} disabled={busyId === confirmDelete} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                {busyId === confirmDelete ? "Deleting…" : "Delete VM"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
