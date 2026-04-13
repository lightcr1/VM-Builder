import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { RequestStatusPill } from "@/components/RequestStatusPill";
import type { AuditEvent, ProvisioningRequest, Tenant, User } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [tenantForm, setTenantForm] = useState({ name: "", slug: "" });
  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "user" as User["role"],
    tenantId: 0,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);

  async function loadAdminData() {
    const [userList, tenantList, events] = await Promise.all([
      api.users.list(),
      api.tenants.listAll(),
      api.audit.list(),
    ]);
    const requestList = await api.vms.requests();
    setUsers(userList);
    setTenants(tenantList);
    setAuditEvents(events);
    setRequests(requestList);
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
    setTenantForm({ name: "", slug: "" });
    setMessage("Tenant created.");
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
        description="Central tenant and identity oversight. LDAP and AD can be mapped here later."
      />

      {message ? <p className="success-banner">{message}</p> : null}

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
                  <span>active</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

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
