import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { RequestStatusPill } from "@/components/RequestStatusPill";
import type { AuditEvent, ProvisioningRequest, Tenant, User, VmPackage } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [packages, setPackages] = useState<VmPackage[]>([]);
  const [tenantForm, setTenantForm] = useState({
    name: "",
    slug: "",
    maxVms: 10,
    maxCpuCores: 16,
    maxMemoryMb: 32768,
    maxDiskGb: 500,
  });
  const [quotaForms, setQuotaForms] = useState<Record<number, TenantQuotaForm>>({});
  const [packageForm, setPackageForm] = useState<PackageForm>(defaultPackageForm());
  const [packageForms, setPackageForms] = useState<Record<string, PackageForm>>({});
  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "user" as User["role"],
    tenantId: 0,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const firewallGuardrails = requests.map((request) => extractFirewallGuardrail(request.providerPayload)).filter(Boolean);
  const latestFirewallGuardrail = firewallGuardrails[0];

  async function loadAdminData() {
    const [userList, tenantList, events, packageList] = await Promise.all([
      api.users.list(),
      api.tenants.listAll(),
      api.audit.list(),
      api.packages.listAll(),
    ]);
    const requestList = await api.vms.requests();
    setUsers(userList);
    setTenants(tenantList);
    setAuditEvents(events);
    setRequests(requestList);
    setPackages(packageList);
    setQuotaForms(Object.fromEntries(tenantList.map((tenant) => [tenant.id, tenantToQuotaForm(tenant)])));
    setPackageForms(Object.fromEntries(packageList.map((vmPackage) => [vmPackage.id, packageToForm(vmPackage)])));
    setUserForm((current) => ({
      ...current,
      tenantId: current.tenantId || tenantList[0]?.id || 0,
    }));
  }

  useEffect(() => {
    void loadAdminData().then(() => {
      setMessage(null);
    }).catch(() => {
      setMessage("Admin data could not be loaded.");
    });
  }, []);

  async function handleTenantCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.tenants.create(tenantForm);
    setTenantForm({ name: "", slug: "", maxVms: 10, maxCpuCores: 16, maxMemoryMb: 32768, maxDiskGb: 500 });
    setMessage("Tenant created.");
    await loadAdminData();
  }

  async function handleTenantQuotaUpdate(event: FormEvent<HTMLFormElement>, tenantId: number) {
    event.preventDefault();
    const form = quotaForms[tenantId];
    if (!form) {
      return;
    }
    await api.tenants.updateQuotas(tenantId, {
      maxVms: Number(form.maxVms),
      maxCpuCores: Number(form.maxCpuCores),
      maxMemoryMb: Number(form.maxMemoryMb),
      maxDiskGb: Number(form.maxDiskGb),
    });
    setMessage("Tenant quotas updated.");
    await loadAdminData();
  }

  async function handlePackageCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.packages.create(formToPackageInput(packageForm));
    setPackageForm(defaultPackageForm());
    setMessage("VM package created.");
    await loadAdminData();
  }

  async function handlePackageUpdate(event: FormEvent<HTMLFormElement>, packageId: string) {
    event.preventDefault();
    const form = packageForms[packageId];
    if (!form) {
      return;
    }
    await api.packages.update(packageId, formToPackageUpdateInput(form));
    setMessage("VM package updated.");
    await loadAdminData();
  }

  async function handleUserCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.users.create(userForm);
    setUserForm((current) => ({
      ...current,
      fullName: "",
      email: "",
      password: "",
      role: "user",
    }));
    setMessage("User created.");
    await loadAdminData();
  }

  async function handleRequeue(requestId: number) {
    setBusyRequestId(requestId);
    try {
      await api.vms.requeueRequest(requestId);
      setMessage(`Provisioning request #${requestId} requeued.`);
      await loadAdminData();
    } finally {
      setBusyRequestId(null);
    }
  }

  useEffect(() => {
    if (!tenantForm.name && !tenantForm.slug) {
      return;
    }
    const nextSlug = tenantForm.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setTenantForm((current) => (current.slug === nextSlug ? current : { ...current, slug: nextSlug }));
  }, [tenantForm.name]);

  return (
    <div className="page-stack">
      <SectionHeader
        title="Admin"
        description="Central tenant, identity and recovery controls for the hosted platform."
      />

      {message ? <p className="success-banner">{message}</p> : null}

      <div className="metric-strip">
        <div>
          <span>Users</span>
          <strong>{users.length}</strong>
        </div>
        <div>
          <span>Tenants</span>
          <strong>{tenants.length}</strong>
        </div>
        <div>
          <span>Failed jobs</span>
          <strong>{requests.filter((request) => request.status === "failed").length}</strong>
        </div>
        <div>
          <span>Packages</span>
          <strong>{packages.filter((vmPackage) => vmPackage.isActive).length}</strong>
        </div>
      </div>

      <section className="surface">
        <div className="table-header">
          <p>Provider guardrails</p>
          <span>Server-side controls applied by the platform, not selectable by VM users.</span>
        </div>
        <div className="summary-stack">
          <div className="summary-item">
            <span>Default Proxmox firewall group</span>
            <strong>{latestFirewallGuardrail?.group ?? "Configured via PROXMOX_DEFAULT_FIREWALL_GROUP"}</strong>
          </div>
          <div className="summary-item">
            <span>VM firewall enforcement</span>
            <strong>{latestFirewallGuardrail?.enabled ?? "Configured via PROXMOX_ENABLE_VM_FIREWALL"}</strong>
          </div>
        </div>
      </section>

      <div className="split-grid admin-forms">
        <section className="surface form-surface">
          <div className="table-header">
            <p>Create tenant</p>
            <span>Defines a logical ownership boundary for users and VMs.</span>
          </div>
          <form className="grid-form compact-form" onSubmit={handleTenantCreate}>
            <label>
              Name
              <input
                value={tenantForm.name}
                onChange={(event) => setTenantForm({ ...tenantForm, name: event.target.value })}
                placeholder="Edge Lab"
              />
            </label>
            <label>
              Slug
              <input
                value={tenantForm.slug}
                onChange={(event) => setTenantForm({ ...tenantForm, slug: event.target.value })}
                placeholder="edge-lab"
              />
            </label>
            <label>
              VM limit
              <input
                type="number"
                min="0"
                value={tenantForm.maxVms}
                onChange={(event) => setTenantForm({ ...tenantForm, maxVms: Number(event.target.value) })}
              />
            </label>
            <label>
              CPU core limit
              <input
                type="number"
                min="0"
                value={tenantForm.maxCpuCores}
                onChange={(event) => setTenantForm({ ...tenantForm, maxCpuCores: Number(event.target.value) })}
              />
            </label>
            <label>
              RAM limit MB
              <input
                type="number"
                min="0"
                value={tenantForm.maxMemoryMb}
                onChange={(event) => setTenantForm({ ...tenantForm, maxMemoryMb: Number(event.target.value) })}
              />
            </label>
            <label>
              Disk limit GB
              <input
                type="number"
                min="0"
                value={tenantForm.maxDiskGb}
                onChange={(event) => setTenantForm({ ...tenantForm, maxDiskGb: Number(event.target.value) })}
              />
            </label>
            <button className="primary-button" type="submit">
              Create tenant
            </button>
          </form>
        </section>

        <section className="surface form-surface">
          <div className="table-header">
            <p>Create user</p>
            <span>Creates a local account and assigns a default tenant.</span>
          </div>
          <form className="grid-form compact-form" onSubmit={handleUserCreate}>
            <label>
              Full name
              <input
                value={userForm.fullName}
                onChange={(event) => setUserForm({ ...userForm, fullName: event.target.value })}
                placeholder="Ava Keller"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={userForm.email}
                onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                placeholder="ava@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                placeholder="Temporary password"
              />
            </label>
            <label>
              Role
              <select
                value={userForm.role}
                onChange={(event) => setUserForm({ ...userForm, role: event.target.value as User["role"] })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              Tenant
              <select
                value={userForm.tenantId}
                onChange={(event) => setUserForm({ ...userForm, tenantId: Number(event.target.value) })}
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              Create user
            </button>
          </form>
        </section>
      </div>

      <div className="split-grid">
        <section className="surface">
          <div className="table-header">
            <p>Users</p>
            <span>Roles and tenant memberships.</span>
          </div>
          <div className="list-rows">
            {users.map((user) => (
              <article className="detail-row" key={user.id}>
                <div>
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </div>
                <div>
                  <span>{user.role}</span>
                  <span>{user.authSource}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="surface">
          <div className="table-header">
            <p>Tenants</p>
            <span>Logical boundaries for VM visibility and, later, network scope.</span>
          </div>
          <div className="list-rows">
            {tenants.map((tenant) => (
              <article className="detail-row" key={tenant.id}>
                <div>
                  <strong>{tenant.name}</strong>
                  <span>{tenant.slug}</span>
                </div>
                <div>
                  <span>{tenant.maxVms} VMs</span>
                  <span>{tenant.maxCpuCores} cores · {Math.round(tenant.maxMemoryMb / 1024)} GB RAM · {tenant.maxDiskGb} GB disk</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="surface">
        <div className="table-header">
          <p>Tenant quotas</p>
          <span>Hard limits enforced by the API before a VM request is accepted.</span>
        </div>
        <div className="list-rows">
          {tenants.map((tenant) => {
            const form = quotaForms[tenant.id] ?? tenantToQuotaForm(tenant);
            return (
              <form
                className="detail-row quota-row"
                key={tenant.id}
                onSubmit={(event) => void handleTenantQuotaUpdate(event, tenant.id)}
              >
                <div>
                  <strong>{tenant.name}</strong>
                  <span>{tenant.slug}</span>
                </div>
                <label>
                  VMs
                  <input
                    type="number"
                    min="0"
                    value={form.maxVms}
                    onChange={(event) => setQuotaForms(updateQuotaForm(quotaForms, tenant.id, "maxVms", event.target.value))}
                  />
                </label>
                <label>
                  CPU
                  <input
                    type="number"
                    min="0"
                    value={form.maxCpuCores}
                    onChange={(event) => setQuotaForms(updateQuotaForm(quotaForms, tenant.id, "maxCpuCores", event.target.value))}
                  />
                </label>
                <label>
                  RAM MB
                  <input
                    type="number"
                    min="0"
                    value={form.maxMemoryMb}
                    onChange={(event) => setQuotaForms(updateQuotaForm(quotaForms, tenant.id, "maxMemoryMb", event.target.value))}
                  />
                </label>
                <label>
                  Disk GB
                  <input
                    type="number"
                    min="0"
                    value={form.maxDiskGb}
                    onChange={(event) => setQuotaForms(updateQuotaForm(quotaForms, tenant.id, "maxDiskGb", event.target.value))}
                  />
                </label>
                <button className="secondary-button" type="submit">
                  Save limits
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <section className="surface">
        <div className="table-header">
          <p>VM packages</p>
          <span>Plans users can select during VM creation. Inactive packages stay hidden from users.</span>
        </div>
        <form className="grid-form package-create-form" onSubmit={handlePackageCreate}>
          <label>
            Package ID
            <input
              value={packageForm.id}
              onChange={(event) => setPackageForm({ ...packageForm, id: event.target.value })}
              placeholder="cloud-dev"
            />
          </label>
          <label>
            Name
            <input
              value={packageForm.name}
              onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })}
              placeholder="Cloud Dev"
            />
          </label>
          <label>
            Badge
            <input
              value={packageForm.badge}
              onChange={(event) => setPackageForm({ ...packageForm, badge: event.target.value })}
              placeholder="Starter"
            />
          </label>
          <label>
            Sort
            <input
              type="number"
              value={packageForm.sortOrder}
              onChange={(event) => setPackageForm({ ...packageForm, sortOrder: event.target.value })}
            />
          </label>
          <label>
            CPU
            <input
              type="number"
              min="1"
              value={packageForm.cpuCores}
              onChange={(event) => setPackageForm({ ...packageForm, cpuCores: event.target.value })}
            />
          </label>
          <label>
            RAM MB
            <input
              type="number"
              min="256"
              value={packageForm.memoryMb}
              onChange={(event) => setPackageForm({ ...packageForm, memoryMb: event.target.value })}
            />
          </label>
          <label>
            Disk GB
            <input
              type="number"
              min="1"
              value={packageForm.diskGb}
              onChange={(event) => setPackageForm({ ...packageForm, diskGb: event.target.value })}
            />
          </label>
          <label>
            Description
            <input
              value={packageForm.description}
              onChange={(event) => setPackageForm({ ...packageForm, description: event.target.value })}
              placeholder="Short user-facing plan description"
            />
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={packageForm.isActive}
              onChange={(event) => setPackageForm({ ...packageForm, isActive: event.target.checked })}
            />
            Active for users
          </label>
          <button className="primary-button" type="submit">
            Create package
          </button>
        </form>

        <div className="list-rows package-list">
          {packages.map((vmPackage) => {
            const form = packageForms[vmPackage.id] ?? packageToForm(vmPackage);
            return (
              <form
                className="detail-row package-row"
                key={vmPackage.id}
                onSubmit={(event) => void handlePackageUpdate(event, vmPackage.id)}
              >
                <div>
                  <strong>{vmPackage.name}</strong>
                  <span>
                    {vmPackage.id} · {vmPackage.isActive ? "active" : "inactive"}
                  </span>
                </div>
                <label>
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => setPackageForms(updatePackageForm(packageForms, vmPackage.id, "name", event.target.value))}
                  />
                </label>
                <label>
                  CPU
                  <input
                    type="number"
                    min="1"
                    value={form.cpuCores}
                    onChange={(event) => setPackageForms(updatePackageForm(packageForms, vmPackage.id, "cpuCores", event.target.value))}
                  />
                </label>
                <label>
                  RAM MB
                  <input
                    type="number"
                    min="256"
                    value={form.memoryMb}
                    onChange={(event) => setPackageForms(updatePackageForm(packageForms, vmPackage.id, "memoryMb", event.target.value))}
                  />
                </label>
                <label>
                  Disk GB
                  <input
                    type="number"
                    min="1"
                    value={form.diskGb}
                    onChange={(event) => setPackageForms(updatePackageForm(packageForms, vmPackage.id, "diskGb", event.target.value))}
                  />
                </label>
                <label>
                  Badge
                  <input
                    value={form.badge}
                    onChange={(event) => setPackageForms(updatePackageForm(packageForms, vmPackage.id, "badge", event.target.value))}
                  />
                </label>
                <label>
                  Sort
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) => setPackageForms(updatePackageForm(packageForms, vmPackage.id, "sortOrder", event.target.value))}
                  />
                </label>
                <label className="toggle-field package-toggle">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setPackageForms(updatePackageForm(packageForms, vmPackage.id, "isActive", event.target.checked))}
                  />
                  Active
                </label>
                <label className="package-description-field">
                  Description
                  <input
                    value={form.description}
                    onChange={(event) => setPackageForms(updatePackageForm(packageForms, vmPackage.id, "description", event.target.value))}
                  />
                </label>
                <button className="secondary-button" type="submit">
                  Save package
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <section className="surface">
        <div className="table-header">
          <p>Provisioning failures</p>
          <span>Failed jobs can be requeued after config or provider issues are fixed.</span>
        </div>
        <div className="list-rows">
          {requests.filter((request) => request.status === "failed").length === 0 ? (
            <p className="empty-state">No failed provisioning requests at the moment.</p>
          ) : null}
          {requests
            .filter((request) => request.status === "failed")
            .map((request) => {
              const error = extractRequestError(request.providerPayload);
              return (
                <article className="detail-row request-admin-row" key={request.id}>
                  <div>
                    <strong>Request #{request.id}</strong>
                    <span>
                      VM #{request.vmInstanceId} {error ? `· ${error}` : ""}
                    </span>
                  </div>
                  <div>
                    <span>{new Date(request.createdAt).toLocaleString()}</span>
                    <RequestStatusPill status={request.status} />
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void handleRequeue(request.id)}
                    disabled={busyRequestId === request.id}
                  >
                    {busyRequestId === request.id ? "Requeueing..." : "Requeue"}
                  </button>
                </article>
              );
            })}
        </div>
      </section>

      <section className="surface">
        <div className="table-header">
          <p>Recent audit events</p>
          <span>Operational trace for user, tenant and VM actions.</span>
        </div>
        <div className="list-rows">
          {auditEvents.map((event) => (
            <article className="detail-row audit-row" key={event.id}>
              <div>
                <strong>{event.action}</strong>
                <span>
                  {event.entityType} #{event.entityId}
                </span>
              </div>
              <div>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
                <span>{event.details}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function extractRequestError(payload: string): string | null {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return parsed.error ? String(parsed.error) : null;
  } catch {
    return null;
  }
}

function extractFirewallGuardrail(payload: string): { group?: string; enabled?: string } | null {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const group = parsed.firewall_group ? String(parsed.firewall_group) : undefined;
    const enabled = parsed.firewall_enabled ? String(parsed.firewall_enabled) : undefined;
    if (!group && !enabled) {
      return null;
    }
    return { group, enabled };
  } catch {
    return null;
  }
}

type TenantQuotaForm = {
  maxVms: string;
  maxCpuCores: string;
  maxMemoryMb: string;
  maxDiskGb: string;
};

function tenantToQuotaForm(tenant: Tenant): TenantQuotaForm {
  return {
    maxVms: String(tenant.maxVms),
    maxCpuCores: String(tenant.maxCpuCores),
    maxMemoryMb: String(tenant.maxMemoryMb),
    maxDiskGb: String(tenant.maxDiskGb),
  };
}

function updateQuotaForm(
  forms: Record<number, TenantQuotaForm>,
  tenantId: number,
  key: keyof TenantQuotaForm,
  value: string,
): Record<number, TenantQuotaForm> {
  const current = forms[tenantId] ?? { maxVms: "0", maxCpuCores: "0", maxMemoryMb: "0", maxDiskGb: "0" };
  return {
    ...forms,
    [tenantId]: {
      ...current,
      [key]: value,
    },
  };
}

type PackageForm = {
  id: string;
  name: string;
  description: string;
  cpuCores: string;
  memoryMb: string;
  diskGb: string;
  badge: string;
  sortOrder: string;
  isActive: boolean;
};

function defaultPackageForm(): PackageForm {
  return {
    id: "",
    name: "",
    description: "",
    cpuCores: "2",
    memoryMb: "2048",
    diskGb: "50",
    badge: "",
    sortOrder: "100",
    isActive: true,
  };
}

function packageToForm(vmPackage: VmPackage): PackageForm {
  return {
    id: vmPackage.id,
    name: vmPackage.name,
    description: vmPackage.description,
    cpuCores: String(vmPackage.cpuCores),
    memoryMb: String(vmPackage.memoryMb),
    diskGb: String(vmPackage.diskGb),
    badge: vmPackage.badge,
    sortOrder: String(vmPackage.sortOrder),
    isActive: vmPackage.isActive,
  };
}

function formToPackageInput(form: PackageForm) {
  return {
    id: form.id.trim(),
    ...formToPackageUpdateInput(form),
  };
}

function formToPackageUpdateInput(form: PackageForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    cpuCores: Number(form.cpuCores),
    memoryMb: Number(form.memoryMb),
    diskGb: Number(form.diskGb),
    badge: form.badge.trim(),
    sortOrder: Number(form.sortOrder),
    isActive: form.isActive,
  };
}

function updatePackageForm(
  forms: Record<string, PackageForm>,
  packageId: string,
  key: keyof PackageForm,
  value: string | boolean,
): Record<string, PackageForm> {
  const current = forms[packageId] ?? defaultPackageForm();
  return {
    ...forms,
    [packageId]: {
      ...current,
      [key]: value,
    },
  };
}
