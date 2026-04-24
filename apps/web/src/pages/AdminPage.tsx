import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { AuditEvent, ProvisioningRequest, Tenant, TenantUsage, VmPackage } from "@/types";

const card = { background: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const inp = { width: "100%", padding: "7px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box" } as React.CSSProperties;
const numInp = { ...inp, fontFamily: "monospace", textAlign: "right" } as React.CSSProperties;

function QuotaBar({ label, used, max, unit = "" }: { label: string; used: number; max: number; unit?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F59E0B" : "#3B82F6";
  return (
    <div style={{ flex: 1, minWidth: "60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: "10px", color: "#64748B" }}>{used}{unit ? ` ${unit}` : ""}/{max}{unit ? ` ${unit}` : ""}</span>
      </div>
      <div style={{ height: "4px", background: "#F1F5F9", borderRadius: "2px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "2px" }} />
      </div>
    </div>
  );
}

type TenantQuotaForm = { maxVms: string; maxCpuCores: string; maxMemoryMb: string; maxDiskGb: string };
type PackageForm = { id: string; name: string; description: string; cpuCores: string; memoryMb: string; diskGb: string; badge: string; sortOrder: string; isActive: boolean };

function defaultPkgForm(): PackageForm {
  return { id: "", name: "", description: "", cpuCores: "2", memoryMb: "2048", diskGb: "50", badge: "", sortOrder: "100", isActive: true };
}

function pkgToForm(p: VmPackage): PackageForm {
  return { id: p.id, name: p.name, description: p.description, cpuCores: String(p.cpuCores), memoryMb: String(p.memoryMb), diskGb: String(p.diskGb), badge: p.badge, sortOrder: String(p.sortOrder), isActive: p.isActive };
}

function tenantToForm(t: Tenant): TenantQuotaForm {
  return { maxVms: String(t.maxVms), maxCpuCores: String(t.maxCpuCores), maxMemoryMb: String(t.maxMemoryMb), maxDiskGb: String(t.maxDiskGb) };
}

export function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantUsage, setTenantUsage] = useState<TenantUsage[]>([]);
  const [packages, setPackages] = useState<VmPackage[]>([]);
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [quotaForms, setQuotaForms] = useState<Record<number, TenantQuotaForm>>({});
  const [pkgForms, setPkgForms] = useState<Record<string, PackageForm>>({});
  const [editPkg, setEditPkg] = useState<PackageForm | null>(null);
  const [tenantForm, setTenantForm] = useState({ name: "", slug: "", maxVms: 10, maxCpuCores: 8, maxMemoryMb: 16384, maxDiskGb: 200 });
  const [pkgForm, setPkgForm] = useState<PackageForm>(defaultPkgForm());
  const [message, setMessage] = useState<string | null>(null);
  const [busyReqId, setBusyReqId] = useState<number | null>(null);

  async function load() {
    const [ts, usage, pkgs, reqs, events] = await Promise.all([
      api.tenants.listAll(), api.tenants.getUsage(), api.packages.listAll(), api.vms.requests(), api.audit.list(),
    ]);
    setTenants(ts);
    setTenantUsage(usage);
    setPackages(pkgs);
    setRequests(reqs);
    setAuditEvents(events);
    setQuotaForms(Object.fromEntries(ts.map((t) => [t.id, tenantToForm(t)])));
    setPkgForms(Object.fromEntries(pkgs.map((p) => [p.id, pkgToForm(p)])));
  }

  useEffect(() => { void load().catch(() => setMessage("Failed to load admin data.")); }, []);

  useEffect(() => {
    if (!tenantForm.name) return;
    const slug = tenantForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setTenantForm((f) => f.slug === slug ? f : { ...f, slug });
  }, [tenantForm.name]);

  async function handleCreateTenant(e: FormEvent) {
    e.preventDefault();
    await api.tenants.create({ ...tenantForm, maxVms: tenantForm.maxVms, maxCpuCores: tenantForm.maxCpuCores, maxMemoryMb: tenantForm.maxMemoryMb, maxDiskGb: tenantForm.maxDiskGb });
    setTenantForm({ name: "", slug: "", maxVms: 10, maxCpuCores: 8, maxMemoryMb: 16384, maxDiskGb: 200 });
    setMessage("Tenant created.");
    await load();
  }

  async function handleSaveQuota(e: FormEvent, tenantId: number) {
    e.preventDefault();
    const f = quotaForms[tenantId];
    if (!f) return;
    await api.tenants.updateQuotas(tenantId, { maxVms: Number(f.maxVms), maxCpuCores: Number(f.maxCpuCores), maxMemoryMb: Number(f.maxMemoryMb), maxDiskGb: Number(f.maxDiskGb) });
    setMessage("Quotas updated.");
    await load();
  }

  async function handleCreatePkg(e: FormEvent) {
    e.preventDefault();
    await api.packages.create({ id: pkgForm.id.trim(), name: pkgForm.name.trim(), description: pkgForm.description.trim(), cpuCores: Number(pkgForm.cpuCores), memoryMb: Number(pkgForm.memoryMb), diskGb: Number(pkgForm.diskGb), badge: pkgForm.badge.trim(), sortOrder: Number(pkgForm.sortOrder), isActive: pkgForm.isActive });
    setPkgForm(defaultPkgForm());
    setMessage("Package created.");
    await load();
  }

  async function handleSavePkg(e: FormEvent) {
    e.preventDefault();
    if (!editPkg) return;
    await api.packages.update(editPkg.id, { name: editPkg.name.trim(), description: editPkg.description.trim(), cpuCores: Number(editPkg.cpuCores), memoryMb: Number(editPkg.memoryMb), diskGb: Number(editPkg.diskGb), badge: editPkg.badge.trim(), sortOrder: Number(editPkg.sortOrder), isActive: editPkg.isActive });
    setEditPkg(null);
    setMessage("Package saved.");
    await load();
  }

  async function handleDeletePkg(pkgId: string, name: string) {
    if (!window.confirm(`Delete package "${name}"?`)) return;
    try {
      await api.packages.remove(pkgId);
      setMessage(`Package "${name}" deleted.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete package.");
    }
  }

  async function handleRequeue(reqId: number) {
    setBusyReqId(reqId);
    try {
      await api.vms.requeueRequest(reqId);
      setMessage(`Request #${reqId} requeued.`);
      await load();
    } finally {
      setBusyReqId(null);
    }
  }

  const failedReqs = requests.filter((r) => r.status === "failed");
  const stats = [
    { label: "Tenants",      val: tenants.length,                                  color: "#8B5CF6" },
    { label: "Packages",     val: packages.length,                                 color: "#F59E0B" },
    { label: "Failed Jobs",  val: failedReqs.length,                               color: "#EF4444" },
    { label: "Audit Events", val: auditEvents.length,                              color: "#3B82F6" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase" }}>Administration</div>
          <span style={{ fontSize: "10px", fontWeight: 700, background: "rgba(239,68,68,0.1)", color: "#F87171", padding: "2px 7px", borderRadius: "4px", letterSpacing: "0.05em" }}>ADMIN ONLY</span>
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Admin</h1>
        <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Tenant, package and provisioning controls for the hosted platform.</p>
      </div>

      {message && <div style={{ background: "#ECFDF5", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "10px 16px", marginBottom: "20px", fontSize: "13px", color: "#065F46", fontWeight: 600 }}>✓ {message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...card, padding: "18px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Provider guardrails */}
      <div style={{ ...card, padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Provider Guardrails</div>
          <div style={{ fontSize: "11px", color: "#94A3B8" }}>Server-side controls, not selectable by VM users.</div>
        </div>
        {[
          { key: "Default Proxmox firewall group", val: "Configured via PROXMOX_DEFAULT_FIREWALL_GROUP" },
          { key: "VM firewall enforcement",        val: "Configured via PROXMOX_ENABLE_VM_FIREWALL" },
        ].map((g) => (
          <div key={g.key} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "2px" }}>{g.key}</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{g.val}</div>
          </div>
        ))}
      </div>

      {/* Create tenant + Tenants list */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ ...card, padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>Create Tenant</div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "16px" }}>Defines a logical ownership boundary for users and VMs.</div>
          <form onSubmit={(e) => void handleCreateTenant(e)} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[["Name", "name", "Edge Lab", false], ["Slug", "slug", "edge-lab", true]].map(([l, k, ph, mono]) => (
                <div key={String(k)}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>{l}</label>
                  <input value={(tenantForm as Record<string, string | number>)[String(k)] as string} onChange={(e) => setTenantForm((f) => ({ ...f, [String(k)]: e.target.value }))} placeholder={String(ph)} style={{ ...inp, fontFamily: mono ? "monospace" : "inherit" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[["VM Limit", "maxVms"], ["CPU Limit", "maxCpuCores"], ["RAM MB", "maxMemoryMb"], ["Disk GB", "maxDiskGb"]].map(([l, k]) => (
                <div key={String(k)}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>{l}</label>
                  <input type="number" value={(tenantForm as unknown as Record<string, number>)[String(k)]} onChange={(e) => setTenantForm((f) => ({ ...f, [String(k)]: Number(e.target.value) }))} style={numInp} />
                </div>
              ))}
            </div>
            <button type="submit" style={{ padding: "10px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "4px" }}>Create Tenant</button>
          </form>
        </div>

        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Tenants</div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}>Logical boundaries for VM visibility and network scope.</div>
          </div>
          {tenants.map((t, i) => {
            const usage = tenantUsage.find((u) => u.id === t.id);
            const form = quotaForms[t.id] ?? tenantToForm(t);
            return (
              <div key={t.id} style={{ padding: "16px 20px", borderBottom: i < tenants.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>{t.name}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace" }}>{t.slug}</div>
                  </div>
                </div>
                {usage && (
                  <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
                    <QuotaBar label="VMs" used={usage.usedVms} max={usage.maxVms} />
                    <QuotaBar label="CPU" used={usage.usedCpuCores} max={usage.maxCpuCores} unit="c" />
                    <QuotaBar label="RAM" used={Math.round(usage.usedMemoryMb / 1024)} max={Math.round(usage.maxMemoryMb / 1024)} unit="GB" />
                    <QuotaBar label="Disk" used={usage.usedDiskGb} max={usage.maxDiskGb} unit="GB" />
                  </div>
                )}
                <form onSubmit={(e) => void handleSaveQuota(e, t.id)} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: "8px", alignItems: "end" }}>
                  {[["VMs", "maxVms"], ["CPU", "maxCpuCores"], ["RAM MB", "maxMemoryMb"], ["Disk GB", "maxDiskGb"]].map(([l, k]) => (
                    <div key={String(k)}>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{l}</div>
                      <input type="number" value={form[k as keyof TenantQuotaForm]} onChange={(e) => setQuotaForms((prev) => ({ ...prev, [t.id]: { ...(prev[t.id] ?? tenantToForm(t)), [k]: e.target.value } }))} style={numInp} />
                    </div>
                  ))}
                  <button type="submit" style={{ padding: "7px 12px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Save</button>
                </form>
              </div>
            );
          })}
        </div>
      </div>

      {/* VM Packages */}
      <div style={{ ...card, padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>VM Packages</div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}>Plans users can select during VM creation. Inactive packages stay hidden.</div>
          </div>
        </div>

        <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "16px", marginBottom: "20px", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>New Package</div>
          <form onSubmit={(e) => void handleCreatePkg(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "10px" }}>
              {[["Package ID", "id", true], ["Name", "name", false], ["Badge", "badge", false], ["Sort", "sortOrder", false]].map(([l, k, mono]) => (
                <div key={String(k)}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>{l}</label>
                  <input value={(pkgForm as Record<string, string | boolean>)[String(k)] as string} onChange={(e) => setPkgForm((f) => ({ ...f, [String(k)]: e.target.value }))} style={{ ...inp, fontFamily: mono ? "monospace" : "inherit" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr auto", gap: "10px", alignItems: "end" }}>
              {[["CPU", "cpuCores"], ["RAM MB", "memoryMb"], ["Disk GB", "diskGb"]].map(([l, k]) => (
                <div key={String(k)}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>{l}</label>
                  <input type="number" value={(pkgForm as unknown as Record<string, string>)[String(k)]} onChange={(e) => setPkgForm((f) => ({ ...f, [String(k)]: e.target.value }))} style={numInp} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>Description</label>
                <input value={pkgForm.description} onChange={(e) => setPkgForm((f) => ({ ...f, description: e.target.value }))} style={inp} />
              </div>
              <button type="submit" style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Create</button>
            </div>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {packages.map((pkg) => (
            <div key={pkg.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "9px", border: "1px solid #E2E8F0", background: pkg.isActive ? "#fff" : "#F8FAFC", opacity: pkg.isActive ? 1 : 0.65 }}>
              <div style={{ width: "100px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>{pkg.name}</div>
                <div style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "monospace" }}>{pkg.id} · {pkg.isActive ? "active" : "inactive"}</div>
              </div>
              {[["CPU", pkg.cpuCores], ["RAM MB", pkg.memoryMb], ["DISK GB", pkg.diskGb], ["BADGE", pkg.badge], ["SORT", pkg.sortOrder]].map(([l, v]) => (
                <div key={String(l)} style={{ flex: 1, minWidth: "55px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>{l}</div>
                  <div style={{ fontSize: "12px", color: "#334155", fontWeight: 600, fontFamily: "monospace" }}>{v}</div>
                </div>
              ))}
              <div style={{ flex: 2, minWidth: "120px" }}>
                <div style={{ fontSize: "9px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>DESCRIPTION</div>
                <div style={{ fontSize: "11px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pkg.description}</div>
              </div>
              <button onClick={() => setEditPkg(pkgToForm(pkg))} style={{ padding: "5px 14px", borderRadius: "7px", border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontSize: "11px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Edit</button>
              <button onClick={() => void handleDeletePkg(pkg.id, pkg.name)} style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid #FEE2E2", background: "#FFF5F5", color: "#EF4444", fontSize: "11px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Delete</button>
            </div>
          ))}
        </div>
      </div>

      {/* Provisioning failures */}
      <div style={{ ...card, padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Provisioning Failures</div>
          <div style={{ fontSize: "11px", color: "#94A3B8" }}>Failed jobs can be requeued after provider issues are fixed.</div>
        </div>
        {failedReqs.length === 0 && <div style={{ fontSize: "13px", color: "#94A3B8", textAlign: "center", padding: "16px 0" }}>No failed provisioning requests.</div>}
        {failedReqs.map((req) => {
          const err = (() => { try { return (JSON.parse(req.providerPayload) as Record<string, unknown>).error as string | undefined; } catch { return undefined; } })();
          return (
            <div key={req.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "9px", border: "1px solid #FEE2E2", background: "#FFF7F7", marginBottom: "8px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace", marginBottom: "2px" }}>VM #{req.vmInstanceId} <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: "11px" }}>#{req.id}</span></div>
                {err && <div style={{ fontSize: "12px", color: "#B91C1C" }}>{err}</div>}
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", flexShrink: 0 }}>{new Date(req.createdAt).toLocaleDateString()}</div>
              <button onClick={() => void handleRequeue(req.id)} disabled={busyReqId === req.id}
                style={{ padding: "5px 12px", borderRadius: "7px", border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontSize: "11px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                {busyReqId === req.id ? "…" : "↺ Retry"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Audit events */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Audit Events</div>
          <div style={{ fontSize: "11px", color: "#94A3B8" }}>Operational trace for user, tenant and VM actions.</div>
        </div>
        {auditEvents.length === 0 && <div style={{ fontSize: "13px", color: "#94A3B8", textAlign: "center", padding: "24px 0" }}>No audit events recorded yet.</div>}
        {auditEvents.map((ev, i) => (
          <div key={ev.id} style={{ padding: "12px 20px", borderBottom: i < auditEvents.length - 1 ? "1px solid #F8FAFC" : "none", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{ev.action}</div>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>{ev.entityType} #{ev.entityId}</div>
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8", flexShrink: 0 }}>{new Date(ev.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Edit package modal */}
      {editPkg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => setEditPkg(null)}>
          <form onSubmit={(e) => void handleSavePkg(e)} style={{ background: "#fff", borderRadius: "16px", padding: "28px", width: "520px", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Edit Package</div>
                <div style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "monospace", marginTop: "2px" }}>{editPkg.id}</div>
              </div>
              <button type="button" onClick={() => setEditPkg(null)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              {[["Name", "name"], ["Badge", "badge"]].map(([l, k]) => (
                <div key={String(k)}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>{l}</label>
                  <input value={(editPkg as unknown as Record<string, string>)[String(k)]} onChange={(e) => setEditPkg((f) => f ? { ...f, [String(k)]: e.target.value } : f)} style={{ ...inp, padding: "9px 12px" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              {[["CPU", "cpuCores"], ["RAM MB", "memoryMb"], ["Disk GB", "diskGb"], ["Sort", "sortOrder"]].map(([l, k]) => (
                <div key={String(k)}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>{l}</label>
                  <input type="number" value={(editPkg as unknown as Record<string, string>)[String(k)]} onChange={(e) => setEditPkg((f) => f ? { ...f, [String(k)]: e.target.value } : f)} style={{ ...numInp, padding: "9px 10px" }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Description</label>
              <input value={editPkg.description} onChange={(e) => setEditPkg((f) => f ? { ...f, description: e.target.value } : f)} style={{ ...inp, padding: "9px 12px" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #F1F5F9" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                <input type="checkbox" checked={editPkg.isActive} onChange={(e) => setEditPkg((f) => f ? { ...f, isActive: e.target.checked } : f)} style={{ width: "16px", height: "16px", accentColor: "#2563EB" }} />
                Active for users
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setEditPkg(null)} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "9px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Save Package</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
