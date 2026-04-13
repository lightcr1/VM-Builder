import type { AuditEvent, Me, ProvisioningRequest, Session, Tenant, User, Vm, VmStatus, VmTemplate } from "@/types";

export type VmInput = {
  name: string;
  description: string;
  templateId: number;
  tenantId: number;
  cpuCores?: number | null;
  memoryMb?: number | null;
  diskGb?: number | null;
  startOnCreate?: boolean;
  cloudInitUser?: string;
  sshPublicKey?: string;
  networkBridge?: string;
  vlanTag?: number | null;
  ipConfigMode?: "dhcp" | "static";
  ipv4Address?: string;
  ipv4Gateway?: string;
};

type ApiClient = {
  session: {
    getCurrent: () => Promise<Me | null>;
    signIn: (email: string, password: string) => Promise<Session>;
    signOut: () => void;
  };
  tenants: {
    list: () => Promise<Tenant[]>;
    listAll: () => Promise<Tenant[]>;
    create: (input: { name: string; slug: string }) => Promise<Tenant>;
  };
  users: {
    list: () => Promise<User[]>;
    create: (input: {
      email: string;
      fullName: string;
      password: string;
      role: User["role"];
      tenantId: number;
    }) => Promise<User>;
  };
  audit: {
    list: () => Promise<AuditEvent[]>;
  };
  vms: {
    list: () => Promise<Vm[]>;
    create: (input: VmInput) => Promise<Vm>;
    templates: () => Promise<VmTemplate[]>;
    requests: () => Promise<ProvisioningRequest[]>;
    requeueRequest: (requestId: number) => Promise<ProvisioningRequest>;
  };
};

const sessionKey = "vm-builder.session";
const tokenKey = "vm-builder.token";
const apiMode = import.meta.env.VITE_API_MODE ?? "http";
const baseUrl = import.meta.env.VITE_API_URL ?? "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(tokenKey);
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const mockUsers: User[] = [
    {
      id: 1,
      fullName: "Ava Keller",
      email: "ava@example.com",
      role: "admin",
      authSource: "local",
      isActive: true,
    },
    {
      id: 2,
      fullName: "Noah Weber",
      email: "noah@example.com",
      role: "user",
      authSource: "local",
      isActive: true,
    },
  ];

const mockTenants: Tenant[] = [
    { id: 1, name: "Core Systems", slug: "core" },
    { id: 2, name: "Edge Lab", slug: "edge" },
  ];

const mockTemplates: VmTemplate[] = [
    { id: 1, name: "Ubuntu Small", cpuCores: 2, memoryMb: 2048, diskGb: 20, imageRef: "ubuntu-24.04-cloudinit" },
    { id: 2, name: "Ubuntu Medium", cpuCores: 4, memoryMb: 4096, diskGb: 40, imageRef: "ubuntu-24.04-cloudinit" },
  ];

const mockVms: Vm[] = [
    {
      id: 1,
      name: "web-prod-01",
      description: "Frontend node",
      tenant: { id: 1, name: "Core Systems", slug: "core" },
      owner: {
        id: 2,
        fullName: "Noah Weber",
        email: "noah@example.com",
        role: "user",
        authSource: "local",
        isActive: true,
      },
      template: { id: 1, name: "Ubuntu Small", cpuCores: 2, memoryMb: 2048, diskGb: 20, imageRef: "ubuntu-24.04-cloudinit" },
      status: "running" as VmStatus,
      createdAt: "2026-03-28T08:15:00Z",
      providerName: "mock-proxmox",
      providerVmId: "mock-001",
    },
    {
      id: 2,
      name: "db-stage-01",
      description: "Database staging node",
      tenant: { id: 2, name: "Edge Lab", slug: "edge" },
      owner: {
        id: 1,
        fullName: "Ava Keller",
        email: "ava@example.com",
        role: "admin",
        authSource: "local",
        isActive: true,
      },
      template: { id: 2, name: "Ubuntu Medium", cpuCores: 4, memoryMb: 4096, diskGb: 40, imageRef: "ubuntu-24.04-cloudinit" },
      status: "stopped" as VmStatus,
      createdAt: "2026-03-29T12:10:00Z",
      providerName: "mock-proxmox",
      providerVmId: "mock-002",
    },
  ];

const mockDb = {
  users: mockUsers,
  tenants: mockTenants,
  templates: mockTemplates,
  vms: mockVms,
};

function readStoredSession(): Session | null {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function writeStoredSession(session: Session | null) {
  if (!session) {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(tokenKey);
    return;
  }
  localStorage.setItem(tokenKey, session.token);
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function mockClient(): ApiClient {
  return {
    session: {
      async getCurrent() {
        const session = readStoredSession();
        if (!session) return null;
        return {
          ...session.user,
          memberships: [
            { tenant: mockDb.tenants[0], isDefault: true },
            { tenant: mockDb.tenants[1], isDefault: false },
          ],
        };
      },
      async signIn(email) {
        const user = mockDb.users.find((entry) => entry.email === email) ?? mockDb.users[0];
        const session = { token: "mock-token", user };
        writeStoredSession(session);
        return session;
      },
      signOut() {
        writeStoredSession(null);
      },
    },
    tenants: {
      async list() {
        return mockDb.tenants;
      },
      async listAll() {
        return mockDb.tenants;
      },
      async create(input) {
        const tenant: Tenant = {
          id: Date.now(),
          name: input.name,
          slug: input.slug,
        };
        mockDb.tenants.unshift(tenant);
        return tenant;
      },
    },
    users: {
      async list() {
        return mockDb.users;
      },
      async create(input) {
        const user: User = {
          id: Date.now(),
          email: input.email,
          fullName: input.fullName,
          role: input.role,
          authSource: "local",
          isActive: true,
        };
        mockDb.users.unshift(user);
        return user;
      },
    },
    audit: {
      async list() {
        return [
          {
            id: 1,
            actorUserId: 1,
            action: "admin.user_created",
            entityType: "user",
            entityId: "2",
            details: "{\"tenant_id\":1}",
            createdAt: new Date().toISOString(),
          },
        ];
      },
    },
    vms: {
      async list() {
        return mockDb.vms;
      },
      async create(input) {
        const vm: Vm = {
          id: Date.now(),
          name: input.name,
          description: input.description,
          tenant: mockDb.tenants.find((tenant) => tenant.id === input.tenantId) ?? mockDb.tenants[0],
          owner: readStoredSession()?.user ?? mockDb.users[0],
          template: mockDb.templates.find((template) => template.id === input.templateId) ?? mockDb.templates[0],
          status: "provisioning",
          createdAt: new Date().toISOString(),
          providerName: "mock-proxmox",
          providerVmId: `mock-${Date.now()}`,
        };
        mockDb.vms.unshift(vm);
        return vm;
      },
      async templates() {
        return mockDb.templates;
      },
      async requests() {
        return [];
      },
      async requeueRequest(requestId) {
        return {
          id: requestId,
          status: "pending",
          providerPayload: JSON.stringify({ requeue_count: 1 }),
          createdAt: new Date().toISOString(),
          vmInstanceId: 1,
        };
      },
    },
  };
}

function httpClient(): ApiClient {
  return {
    session: {
      async getCurrent() {
        const token = localStorage.getItem(tokenKey);
        if (!token) return null;
        const me = await requestJson<Record<string, unknown>>("/me");
        return normalizeMe(me);
      },
      async signIn(email, password) {
        const tokenResponse = await requestJson<{ access_token: string; token_type: string }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem(tokenKey, tokenResponse.access_token);
        const me = await requestJson<Me>("/me");
        const session = { token: tokenResponse.access_token, user: normalizeUser(me) };
        writeStoredSession(session);
        return session;
      },
      signOut() {
        writeStoredSession(null);
      },
    },
    tenants: {
      list: async () => {
        const me = await requestJson<Record<string, unknown>>("/me").then(normalizeMe);
        return me.memberships.map((membership) => membership.tenant);
      },
      listAll: async () => {
        const tenants = await requestJson<Array<Record<string, unknown>>>("/admin/tenants");
        return tenants.map(normalizeTenant);
      },
      create: async (input) => {
        const tenant = await requestJson<Record<string, unknown>>("/admin/tenants", {
          method: "POST",
          body: JSON.stringify(input),
        });
        return normalizeTenant(tenant);
      },
    },
    users: {
      list: async () => {
        const users = await requestJson<Array<Record<string, unknown>>>("/admin/users");
        return users.map(normalizeUser);
      },
      create: async (input) => {
        const user = await requestJson<Record<string, unknown>>("/admin/users", {
          method: "POST",
          body: JSON.stringify({
            email: input.email,
            full_name: input.fullName,
            password: input.password,
            role: input.role,
            tenant_id: input.tenantId,
          }),
        });
        return normalizeUser(user);
      },
    },
    audit: {
      list: async () => {
        const events = await requestJson<Array<Record<string, unknown>>>("/admin/audit-events");
        return events.map(normalizeAuditEvent);
      },
    },
    vms: {
      list: async () => {
        const vms = await requestJson<Array<Record<string, unknown>>>("/vms");
        return vms.map(normalizeVm);
      },
      create: (input) =>
        requestJson<Record<string, unknown>>("/vms", {
          method: "POST",
          body: JSON.stringify({
            name: input.name,
            description: input.description,
            template_id: input.templateId,
            tenant_id: input.tenantId,
            cpu_cores: input.cpuCores || undefined,
            memory_mb: input.memoryMb || undefined,
            disk_gb: input.diskGb || undefined,
            start_on_create: input.startOnCreate ?? false,
            cloud_init_user: input.cloudInitUser || undefined,
            ssh_public_key: input.sshPublicKey || undefined,
            network_bridge: input.networkBridge || undefined,
            vlan_tag: input.vlanTag || undefined,
            ip_config_mode: input.ipConfigMode ?? "dhcp",
            ipv4_address: input.ipv4Address || undefined,
            ipv4_gateway: input.ipv4Gateway || undefined,
          }),
        }).then(normalizeVm),
      templates: async () => {
        const templates = await requestJson<Array<Record<string, unknown>>>("/vms/templates");
        return templates.map(normalizeTemplate);
      },
      requests: async () => {
        const requests = await requestJson<Array<Record<string, unknown>>>("/vms/requests");
        return requests.map(normalizeProvisioningRequest);
      },
      requeueRequest: async (requestId) => {
        const request = await requestJson<Record<string, unknown>>(`/admin/provisioning-requests/${requestId}/requeue`, {
          method: "POST",
        });
        return normalizeProvisioningRequest(request);
      },
    },
  };
}

export const api: ApiClient = apiMode === "http" ? httpClient() : mockClient();

function normalizeMe(payload: Record<string, unknown>): Me {
  return {
    ...normalizeUser(payload),
    memberships: Array.isArray(payload.memberships)
      ? payload.memberships.map((membership) => ({
          tenant: normalizeTenant((membership as Record<string, unknown>).tenant as Record<string, unknown>),
          isDefault: Boolean((membership as Record<string, unknown>).is_default ?? (membership as Record<string, unknown>).isDefault),
        }))
      : [],
  };
}

function normalizeUser(payload: Record<string, unknown>): User {
  return {
    id: Number(payload.id),
    fullName: String(payload.full_name ?? payload.fullName ?? ""),
    email: String(payload.email ?? ""),
    role: (payload.role as User["role"]) ?? "user",
    authSource: String(payload.auth_source ?? payload.authSource ?? "local"),
    isActive: Boolean(payload.is_active ?? payload.isActive),
  };
}

function normalizeTemplate(payload: Record<string, unknown>): VmTemplate {
  return {
    id: Number(payload.id),
    name: String(payload.name ?? ""),
    cpuCores: Number(payload.cpu_cores ?? payload.cpuCores ?? 0),
    memoryMb: Number(payload.memory_mb ?? payload.memoryMb ?? 0),
    diskGb: Number(payload.disk_gb ?? payload.diskGb ?? 0),
    imageRef: String(payload.image_ref ?? payload.imageRef ?? ""),
  };
}

function normalizeTenant(payload: Record<string, unknown>): Tenant {
  return {
    id: Number(payload.id),
    name: String(payload.name ?? ""),
    slug: String(payload.slug ?? ""),
  };
}

function normalizeVm(payload: Record<string, unknown>): Vm {
  return {
    id: Number(payload.id),
    name: String(payload.name ?? ""),
    description: String(payload.description ?? ""),
    status: (payload.status as VmStatus) ?? "requested",
    createdAt: String(payload.created_at ?? payload.createdAt ?? ""),
    providerName: String(payload.provider_name ?? payload.providerName ?? ""),
    providerVmId: payload.provider_vm_id ? String(payload.provider_vm_id) : null,
    tenant: normalizeTenant(payload.tenant as Record<string, unknown>),
    owner: normalizeUser(payload.owner as Record<string, unknown>),
    template: normalizeTemplate(payload.template as Record<string, unknown>),
  };
}

function normalizeAuditEvent(payload: Record<string, unknown>): AuditEvent {
  return {
    id: Number(payload.id),
    actorUserId: payload.actor_user_id ? Number(payload.actor_user_id) : null,
    action: String(payload.action ?? ""),
    entityType: String(payload.entity_type ?? ""),
    entityId: String(payload.entity_id ?? ""),
    details: String(payload.details ?? ""),
    createdAt: String(payload.created_at ?? ""),
  };
}

function normalizeProvisioningRequest(payload: Record<string, unknown>): ProvisioningRequest {
  return {
    id: Number(payload.id),
    status: String(payload.status ?? "pending") as ProvisioningRequest["status"],
    providerPayload: String(payload.provider_payload ?? payload.providerPayload ?? "{}"),
    createdAt: String(payload.created_at ?? payload.createdAt ?? ""),
    vmInstanceId: Number(payload.vm_instance_id ?? payload.vmInstanceId ?? 0),
  };
}
