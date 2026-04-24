import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type VmInput } from "@/lib/api";
import type { Tenant, VmPackage, VmTemplate } from "@/types";

const badgeColors: Record<string, { bg: string; color: string }> = {
  Starter:     { bg: "#EFF6FF", color: "#3B82F6" },
  Popular:     { bg: "#ECFDF5", color: "#10B981" },
  Growth:      { bg: "#FFFBEB", color: "#F59E0B" },
  Performance: { bg: "#F5F3FF", color: "#8B5CF6" },
};

const steps = ["Basics", "Package", "Access", "Review"];

const inp = { width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" } as React.CSSProperties;
const card = { background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" };

export function VmCreatePage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<VmTemplate[]>([]);
  const [packages, setPackages] = useState<VmPackage[]>([]);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [form, setForm] = useState<VmInput>({
    name: "", description: "", templateId: 0, tenantId: 0, packageId: "cloud-m", startOnCreate: true, ipConfigMode: "dhcp",
  });

  useEffect(() => {
    void Promise.all([api.tenants.list(), api.vms.templates(), api.vms.packages()]).then(([ts, tmps, pkgs]) => {
      setTenants(ts);
      setTemplates(tmps);
      setPackages(pkgs);
      setForm((f) => ({
        ...f,
        tenantId: f.tenantId || ts[0]?.id || 0,
        templateId: f.templateId || tmps[0]?.id || 0,
        packageId: f.packageId || pkgs.find((p) => p.id === "cloud-m")?.id || pkgs[0]?.id || "cloud-m",
      }));
    });
  }, []);

  const selPkg = packages.find((p) => p.id === form.packageId);
  const set = (k: keyof VmInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const canNext = step === 0 ? form.name.trim().length >= 2 : true;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const vm = await api.vms.create({ ...form, ipConfigMode: "dhcp", networkBridge: undefined, vlanTag: undefined, ipv4Address: undefined, ipv4Gateway: undefined });
    setSubmitted(vm.name);
  }

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: "16px", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>✓</div>
        <div style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A" }}>VM Request Submitted</div>
        <div style={{ fontSize: "13px", color: "#64748B", maxWidth: "320px" }}>
          <strong style={{ fontFamily: "monospace" }}>{submitted}</strong> has been queued for provisioning. Check the Requests page for live status.
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button onClick={() => navigate("/requests")} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", color: "#334155", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>View Requests</button>
          <button onClick={() => { setSubmitted(null); setStep(0); setForm((f) => ({ ...f, name: "", description: "" })); }}
            style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Create Another</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Workspace</div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Create VM</h1>
        <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Configure a new virtual machine with a predefined package and managed network.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "20px", alignItems: "start" }}>
        <div style={card}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "12px" }}>New virtual machine</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {steps.map((s, i) => (
                <div key={s} onClick={() => i < step && setStep(i)}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", cursor: i < step ? "pointer" : "default", background: i === step ? "#EFF6FF" : "#F8FAFC", border: `1px solid ${i === step ? "#BFDBFE" : "#E2E8F0"}`, color: i === step ? "#2563EB" : i < step ? "#64748B" : "#94A3B8", fontSize: "13px", fontWeight: i === step ? 700 : 500 }}>
                  {i + 1}. {s}
                  {i < step && <span style={{ marginLeft: "4px", color: "#10B981" }}>✓</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "28px 24px" }}>
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Name <span style={{ color: "#EF4444" }}>*</span></label>
                    <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. web-01" style={{ ...inp, fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Description <span style={{ color: "#94A3B8", fontWeight: 400 }}>optional</span></label>
                    <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description" style={inp} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Tenant</label>
                    <select value={form.tenantId} onChange={(e) => set("tenantId", Number(e.target.value))} style={{ ...inp, background: "#fff" }}>
                      {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Template</label>
                    <select value={form.templateId} onChange={(e) => set("templateId", Number(e.target.value))} style={{ ...inp, background: "#fff" }}>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {packages.map((pkg) => {
                  const bc = badgeColors[pkg.badge] ?? { bg: "#F1F5F9", color: "#64748B" };
                  const sel = form.packageId === pkg.id;
                  return (
                    <div key={pkg.id} onClick={() => set("packageId", pkg.id)}
                      style={{ padding: "20px", borderRadius: "10px", border: `2px solid ${sel ? "#2563EB" : "#E2E8F0"}`, cursor: "pointer", background: sel ? "#EFF6FF" : "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>{pkg.name}</div>
                        <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: bc.bg, color: bc.color, letterSpacing: "0.06em" }}>{pkg.badge.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px", lineHeight: "1.4" }}>{pkg.description}</div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {[`${pkg.cpuCores} vCPU`, `${pkg.memoryMb / 1024} GB RAM`, `${pkg.diskGb} GB SSD`].map((spec) => (
                          <span key={spec} style={{ fontSize: "11px", fontWeight: 600, color: "#475569", background: "#F1F5F9", padding: "3px 7px", borderRadius: "4px" }}>{spec}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0369A1", marginBottom: "4px" }}>Network is managed automatically</div>
                  <div style={{ fontSize: "12px", color: "#0284C7", lineHeight: "1.5" }}>ARCS-Cloud assigns the correct tenant network and firewall policy automatically.</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Default user</label>
                    <input value={form.cloudInitUser ?? ""} onChange={(e) => set("cloudInitUser", e.target.value)} placeholder="ubuntu" style={{ ...inp, fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                      <input type="checkbox" checked={Boolean(form.startOnCreate)} onChange={(e) => set("startOnCreate", e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#2563EB" }} />
                      Start after create
                    </label>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>SSH Public Key <span style={{ color: "#94A3B8", fontWeight: 400 }}>optional</span></label>
                  <textarea value={form.sshPublicKey ?? ""} onChange={(e) => set("sshPublicKey", e.target.value)}
                    placeholder="Paste your public SSH key, e.g. ssh-ed25519 AAAA…"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px", outline: "none", resize: "vertical", minHeight: "90px", boxSizing: "border-box", fontFamily: "monospace", lineHeight: "1.5" }} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "8px" }}>Review your configuration before submitting.</div>
                {[
                  ["Name", form.name || "(unnamed)", true],
                  ["Tenant / Template", `${tenants.find((t) => t.id === form.tenantId)?.name ?? "—"} · ${templates.find((t) => t.id === form.templateId)?.name ?? "—"}`],
                  ["Package", selPkg ? `${selPkg.name} · ${selPkg.cpuCores} vCPU · ${selPkg.memoryMb / 1024} GB RAM · ${selPkg.diskGb} GB SSD` : "—"],
                  ["Network", "Managed tenant network · DHCP · standard firewall policy"],
                  ["Access", `${form.cloudInitUser || "ubuntu"} user · ${form.sshPublicKey ? "SSH key set" : "No SSH key"} · ${form.startOnCreate ? "starts after create" : "manual start"}`],
                ].map(([k, v, mono]) => (
                  <div key={String(k)} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "14px 16px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{k}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", fontFamily: mono ? "monospace" : "inherit" }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between" }}>
            {step > 0
              ? <button onClick={() => setStep((s) => s - 1)} style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>← Back</button>
              : <button onClick={() => navigate("/instances")} style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            }
            {step < 3
              ? <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: canNext ? "#2563EB" : "#CBD5E1", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: canNext ? "pointer" : "not-allowed" }}>Continue →</button>
              : <button onClick={(e) => void handleSubmit(e)} style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Request VM →</button>
            }
          </div>
        </div>

        <div style={{ ...card, position: "sticky", top: "20px" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Request summary</div>
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>Live preview</span>
          </div>
          <div style={{ padding: "6px 0" }}>
            {[
              ["Tenant", tenants.find((t) => t.id === form.tenantId)?.name ?? "—"],
              ["Template", templates.find((t) => t.id === form.templateId)?.name ?? "—"],
              ["Package", selPkg ? `${selPkg.name} · ${selPkg.cpuCores} vCPU · ${selPkg.memoryMb / 1024} GB · ${selPkg.diskGb} GB` : "—"],
              ["Network", "Managed · standard firewall"],
              ["Access", `${form.cloudInitUser || "ubuntu"} · ${form.startOnCreate ? "auto-start" : "manual start"}`],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ padding: "10px 18px", borderBottom: "1px solid #F8FAFC" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "2px" }}>{k}</div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 18px", background: "#F0F9FF", borderTop: "1px solid #BAE6FD" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0369A1", marginBottom: "4px" }}>Managed by ARCS-Cloud</div>
            <div style={{ fontSize: "11px", color: "#0284C7", lineHeight: "1.5" }}>Network placement and firewall rules are applied automatically by the platform.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
