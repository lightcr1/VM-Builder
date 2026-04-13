import { FormEvent, useEffect, useState } from "react";
import { api, type VmInput } from "@/lib/api";
import type { Tenant, VmTemplate } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

export function VmCreatePage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<VmTemplate[]>([]);
  const [created, setCreated] = useState<string | null>(null);
  const [form, setForm] = useState<VmInput>({
    name: "",
    description: "",
    templateId: 0,
    tenantId: 0,
    startOnCreate: true,
    ipConfigMode: "dhcp",
    networkBridge: "vmbr0",
  });

  useEffect(() => {
    void Promise.all([api.tenants.list(), api.vms.templates()]).then(([tenantItems, templateItems]) => {
      setTenants(tenantItems);
      setTemplates(templateItems);
      setForm((current) => ({
        ...current,
        tenantId: current.tenantId || tenantItems[0]?.id || 0,
        templateId: current.templateId || templateItems[0]?.id || 0,
      }));
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const vm = await api.vms.create(form);
    setCreated(`Requested ${vm.name}. The worker will continue provisioning in the background.`);
    setForm((current) => ({ ...current, name: "", description: "" }));
  }

  return (
    <div className="page-stack">
      <SectionHeader
        title="Create VM"
        description="This form is kept close to the future Proxmox flow so the backend can plug in later."
      />

      <section className="surface form-surface">
        <form className="grid-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="app-prod-01"
            />
          </label>
          <label>
            Description
            <input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Customer-facing workload"
            />
          </label>
          <label>
            Tenant
            <select
              value={form.tenantId}
              onChange={(event) => setForm({ ...form, tenantId: Number(event.target.value) })}
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Template
            <select
              value={form.templateId}
              onChange={(event) => setForm({ ...form, templateId: Number(event.target.value) })}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            CPU Cores
            <input
              type="number"
              min="1"
              value={form.cpuCores ?? ""}
              onChange={(event) =>
                setForm({ ...form, cpuCores: event.target.value ? Number(event.target.value) : null })
              }
              placeholder="Use template default"
            />
          </label>
          <label>
            Memory (MB)
            <input
              type="number"
              min="512"
              step="256"
              value={form.memoryMb ?? ""}
              onChange={(event) =>
                setForm({ ...form, memoryMb: event.target.value ? Number(event.target.value) : null })
              }
              placeholder="Use template default"
            />
          </label>
          <label>
            Disk (GB)
            <input
              type="number"
              min="1"
              value={form.diskGb ?? ""}
              onChange={(event) =>
                setForm({ ...form, diskGb: event.target.value ? Number(event.target.value) : null })
              }
              placeholder="Use template default"
            />
          </label>
          <label>
            Network Bridge
            <input
              value={form.networkBridge ?? ""}
              onChange={(event) => setForm({ ...form, networkBridge: event.target.value })}
              placeholder="vmbr0"
            />
          </label>
          <label>
            VLAN Tag
            <input
              type="number"
              min="1"
              value={form.vlanTag ?? ""}
              onChange={(event) =>
                setForm({ ...form, vlanTag: event.target.value ? Number(event.target.value) : null })
              }
              placeholder="Optional"
            />
          </label>
          <label>
            IP Config
            <select
              value={form.ipConfigMode ?? "dhcp"}
              onChange={(event) =>
                setForm({ ...form, ipConfigMode: event.target.value as "dhcp" | "static" })
              }
            >
              <option value="dhcp">DHCP</option>
              <option value="static">Static IPv4</option>
            </select>
          </label>
          <label>
            Cloud-Init User
            <input
              value={form.cloudInitUser ?? ""}
              onChange={(event) => setForm({ ...form, cloudInitUser: event.target.value })}
              placeholder="ubuntu"
            />
          </label>
          <label className="toggle-field">
            Start After Create
            <input
              type="checkbox"
              checked={Boolean(form.startOnCreate)}
              onChange={(event) => setForm({ ...form, startOnCreate: event.target.checked })}
            />
          </label>
          {form.ipConfigMode === "static" ? (
            <>
              <label>
                IPv4 Address
                <input
                  value={form.ipv4Address ?? ""}
                  onChange={(event) => setForm({ ...form, ipv4Address: event.target.value })}
                  placeholder="10.42.0.10/24"
                />
              </label>
              <label>
                IPv4 Gateway
                <input
                  value={form.ipv4Gateway ?? ""}
                  onChange={(event) => setForm({ ...form, ipv4Gateway: event.target.value })}
                  placeholder="10.42.0.1"
                />
              </label>
            </>
          ) : null}
          <label className="form-span-2">
            SSH Public Key
            <textarea
              rows={4}
              value={form.sshPublicKey ?? ""}
              onChange={(event) => setForm({ ...form, sshPublicKey: event.target.value })}
              placeholder="ssh-ed25519 AAAA..."
            />
          </label>
          <button className="primary-button" type="submit">
            Request VM
          </button>
        </form>
        {created ? <p className="success-banner">{created}</p> : null}
      </section>
    </div>
  );
}
