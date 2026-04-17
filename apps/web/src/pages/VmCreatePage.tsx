import { FormEvent, useEffect, useState } from "react";
import { api, type VmInput } from "@/lib/api";
<<<<<<< HEAD
import type { Tenant, VmPackage, VmTemplate } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

export function VmCreatePage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<VmTemplate[]>([]);
  const [packages, setPackages] = useState<VmPackage[]>([]);
  const [created, setCreated] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPackageId, setSelectedPackageId] = useState("cloud-m");
  const selectedPackage = packages.find((plan) => plan.id === selectedPackageId) ?? packages[0];
=======
import type { Tenant, VmTemplate } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

const VM_PACKAGES = [
  {
    id: "cx-small",
    name: "Cloud S",
    description: "Small services, test systems and lightweight web apps.",
    cpuCores: 2,
    memoryMb: 1024,
    diskGb: 30,
    badge: "Starter",
  },
  {
    id: "cx-medium",
    name: "Cloud M",
    description: "Default choice for application servers and small databases.",
    cpuCores: 2,
    memoryMb: 2048,
    diskGb: 50,
    badge: "Popular",
  },
  {
    id: "cx-large",
    name: "Cloud L",
    description: "More memory and storage for heavier tenant workloads.",
    cpuCores: 4,
    memoryMb: 4096,
    diskGb: 80,
    badge: "Growth",
  },
  {
    id: "cx-xl",
    name: "Cloud XL",
    description: "Bigger application nodes, build workers and staging stacks.",
    cpuCores: 4,
    memoryMb: 8192,
    diskGb: 120,
    badge: "Performance",
  },
];

export function VmCreatePage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<VmTemplate[]>([]);
  const [created, setCreated] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPackageId, setSelectedPackageId] = useState(VM_PACKAGES[1].id);
  const selectedPackage = VM_PACKAGES.find((plan) => plan.id === selectedPackageId) ?? VM_PACKAGES[1];
>>>>>>> origin/main
  const [form, setForm] = useState<VmInput>({
    name: "",
    description: "",
    templateId: 0,
    tenantId: 0,
<<<<<<< HEAD
    packageId: "cloud-m",
=======
    cpuCores: VM_PACKAGES[1].cpuCores,
    memoryMb: VM_PACKAGES[1].memoryMb,
    diskGb: VM_PACKAGES[1].diskGb,
>>>>>>> origin/main
    startOnCreate: true,
    ipConfigMode: "dhcp",
  });

  useEffect(() => {
<<<<<<< HEAD
    void Promise.all([api.tenants.list(), api.vms.templates(), api.vms.packages()]).then(([tenantItems, templateItems, packageItems]) => {
      setTenants(tenantItems);
      setTemplates(templateItems);
      setPackages(packageItems);
      const defaultPackage = packageItems.find((plan) => plan.id === "cloud-m") ?? packageItems[0];
=======
    void Promise.all([api.tenants.list(), api.vms.templates()]).then(([tenantItems, templateItems]) => {
      setTenants(tenantItems);
      setTemplates(templateItems);
>>>>>>> origin/main
      setForm((current) => ({
        ...current,
        tenantId: current.tenantId || tenantItems[0]?.id || 0,
        templateId: current.templateId || templateItems[0]?.id || 0,
<<<<<<< HEAD
        packageId: current.packageId || defaultPackage?.id || "cloud-m",
      }));
      if (defaultPackage) {
        setSelectedPackageId(defaultPackage.id);
      }
=======
      }));
>>>>>>> origin/main
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const vm = await api.vms.create({
      ...form,
<<<<<<< HEAD
      packageId: selectedPackage?.id ?? form.packageId,
=======
      cpuCores: selectedPackage.cpuCores,
      memoryMb: selectedPackage.memoryMb,
      diskGb: selectedPackage.diskGb,
>>>>>>> origin/main
      ipConfigMode: "dhcp",
      networkBridge: undefined,
      vlanTag: undefined,
      ipv4Address: undefined,
      ipv4Gateway: undefined,
    });
    setCreated(`VM ${vm.name} was requested. Provisioning continues in the background.`);
    setForm((current) => ({ ...current, name: "", description: "" }));
    setStep(1);
  }

  function selectPackage(packageId: string) {
<<<<<<< HEAD
    const nextPackage = packages.find((plan) => plan.id === packageId) ?? packages[0];
    if (!nextPackage) return;
    setSelectedPackageId(nextPackage.id);
    setForm((current) => ({
      ...current,
      packageId: nextPackage.id,
=======
    const nextPackage = VM_PACKAGES.find((plan) => plan.id === packageId) ?? VM_PACKAGES[1];
    setSelectedPackageId(nextPackage.id);
    setForm((current) => ({
      ...current,
      cpuCores: nextPackage.cpuCores,
      memoryMb: nextPackage.memoryMb,
      diskGb: nextPackage.diskGb,
>>>>>>> origin/main
    }));
  }

  return (
    <div className="page-stack">
      <SectionHeader
        title="Create VM"
        description="Create a tenant VM with a predefined package, managed network defaults and optional SSH access."
      />

      <div className="create-layout">
        <section className="surface form-surface">
          <div className="table-header">
            <p>New virtual machine</p>
            <span>Choose the basic details, a package and how you want to access the VM.</span>
          </div>
          <div className="wizard-steps">
            <button type="button" className={`wizard-step ${step === 1 ? "active" : ""}`} onClick={() => setStep(1)}>
              1. Basics
            </button>
            <button type="button" className={`wizard-step ${step === 2 ? "active" : ""}`} onClick={() => setStep(2)}>
              2. Package
            </button>
            <button type="button" className={`wizard-step ${step === 3 ? "active" : ""}`} onClick={() => setStep(3)}>
              3. Access
            </button>
            <button type="button" className={`wizard-step ${step === 4 ? "active" : ""}`} onClick={() => setStep(4)}>
              4. Review
            </button>
          </div>
          <form className="grid-form" onSubmit={handleSubmit}>
            {step === 1 ? (
              <>
                <label>
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="web-01"
                  />
                </label>
                <label>
                  Description optional
                  <input
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Web server for the customer portal"
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
                <div className="wizard-actions form-span-2">
                  <button type="button" className="ghost-button" onClick={() => setStep(2)}>
                    Continue
                  </button>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="package-grid form-span-2">
<<<<<<< HEAD
                  {packages.length === 0 ? <p className="empty-state">Packages are loading.</p> : null}
                  {packages.map((plan) => (
=======
                  {VM_PACKAGES.map((plan) => (
>>>>>>> origin/main
                    <button
                      type="button"
                      key={plan.id}
                      className={`package-option ${selectedPackageId === plan.id ? "active" : ""}`}
                      onClick={() => selectPackage(plan.id)}
                    >
                      <span className="package-badge">{plan.badge}</span>
                      <strong>{plan.name}</strong>
                      <span>{plan.description}</span>
                      <div className="package-specs">
                        <span>{plan.cpuCores} vCPU</span>
                        <span>{plan.memoryMb / 1024} GB RAM</span>
                        <span>{plan.diskGb} GB SSD</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="wizard-actions form-span-2">
                  <button type="button" className="ghost-button" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setStep(3)}>
                    Continue
                  </button>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className="managed-network-note form-span-2">
                  <strong>Network is managed automatically</strong>
                  <span>
                    VM Builder assigns the correct tenant network and firewall policy automatically. You only choose how
                    you want to log in after the VM is ready.
                  </span>
                </div>
                <label>
                  Default user
                  <input
                    value={form.cloudInitUser ?? ""}
                    onChange={(event) => setForm({ ...form, cloudInitUser: event.target.value })}
                    placeholder="ubuntu"
                  />
                </label>
                <label className="toggle-field">
                  Start after create
                  <input
                    type="checkbox"
                    checked={Boolean(form.startOnCreate)}
                    onChange={(event) => setForm({ ...form, startOnCreate: event.target.checked })}
                  />
                </label>
                <label className="form-span-2">
                  SSH Public Key
                  <textarea
                    rows={4}
                    value={form.sshPublicKey ?? ""}
                    onChange={(event) => setForm({ ...form, sshPublicKey: event.target.value })}
                    placeholder="Paste your public SSH key, for example ssh-ed25519 AAAA..."
                  />
                </label>
                <div className="wizard-actions form-span-2">
                  <button type="button" className="ghost-button" onClick={() => setStep(2)}>
                    Back
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setStep(4)}>
                    Review
                  </button>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <div className="review-panel form-span-2">
                  <div className="summary-stack">
                    <div className="summary-item">
                      <span>Name</span>
                      <strong>{form.name || "Unnamed request"}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Tenant / Template</span>
                      <strong>
                        {tenants.find((tenant) => tenant.id === form.tenantId)?.name ?? "Not selected"} ·{" "}
                        {templates.find((template) => template.id === form.templateId)?.name ?? "Not selected"}
                      </strong>
                    </div>
                    <div className="summary-item">
                      <span>Package</span>
                      <strong>
<<<<<<< HEAD
                        {selectedPackage
                          ? `${selectedPackage.name} · ${selectedPackage.cpuCores} vCPU · ${selectedPackage.memoryMb / 1024} GB RAM · ${selectedPackage.diskGb} GB SSD`
                          : "No package selected"}
=======
                        {selectedPackage.name} · {selectedPackage.cpuCores} vCPU · {selectedPackage.memoryMb / 1024} GB RAM ·{" "}
                        {selectedPackage.diskGb} GB SSD
>>>>>>> origin/main
                      </strong>
                    </div>
                    <div className="summary-item">
                      <span>Network</span>
                      <strong>Managed tenant network · DHCP · standard firewall policy</strong>
                    </div>
                    <div className="summary-item">
                      <span>Access</span>
                      <strong>
                        {form.cloudInitUser || "ubuntu"} user · {form.sshPublicKey ? "SSH key provided" : "No SSH key"} ·{" "}
                        {form.startOnCreate ? "starts after create" : "stays stopped"}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="wizard-actions form-span-2">
                  <button type="button" className="ghost-button" onClick={() => setStep(3)}>
                    Back
                  </button>
                  <button className="primary-button" type="submit">
                    Request VM
                  </button>
                </div>
              </>
            ) : null}
          </form>
          {created ? <p className="success-banner">{created}</p> : null}
        </section>

        <aside className="surface order-summary">
          <div className="table-header">
            <p>Request summary</p>
            <span>The request will be queued and provisioned by the platform.</span>
          </div>
          <div className="summary-stack">
            <div className="summary-item">
              <span>Tenant</span>
              <strong>{tenants.find((tenant) => tenant.id === form.tenantId)?.name ?? "Not selected"}</strong>
            </div>
            <div className="summary-item">
              <span>Template</span>
              <strong>{templates.find((template) => template.id === form.templateId)?.name ?? "Not selected"}</strong>
            </div>
            <div className="summary-item">
              <span>Package</span>
              <strong>
<<<<<<< HEAD
                {selectedPackage
                  ? `${selectedPackage.name} · ${selectedPackage.cpuCores} vCPU · ${selectedPackage.memoryMb / 1024} GB RAM · ${selectedPackage.diskGb} GB SSD`
                  : "No package selected"}
=======
                {selectedPackage.name} · {selectedPackage.cpuCores} vCPU · {selectedPackage.memoryMb / 1024} GB RAM ·{" "}
                {selectedPackage.diskGb} GB SSD
>>>>>>> origin/main
              </strong>
            </div>
            <div className="summary-item">
              <span>Network</span>
              <strong>Managed tenant network · standard firewall policy</strong>
            </div>
            <div className="summary-item">
              <span>Access</span>
              <strong>
                {form.cloudInitUser || "ubuntu"} user · {form.startOnCreate ? "auto-start enabled" : "manual start"}
              </strong>
            </div>
          </div>
          <div className="summary-note">
            <strong>Managed by arcs-cloud</strong>
            <span>Network placement and firewall rules are applied automatically by the platform.</span>
            <a href="https://arcs-cloud.ch" target="_blank" rel="noreferrer">
              Hosted by arcs-cloud
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
