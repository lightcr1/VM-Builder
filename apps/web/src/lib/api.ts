import type { AuditEvent, Me, ProvisioningRequest, Session, SshKey, Tenant, TenantUsage, User, Vm, VmPackage, VmStatus, VmTemplate } from "@/types";

export type VmInput = {
  name: string;
  description: string;
  templateId: number;
  tenantId: number;
  packageId: string;
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
    create: (input: TenantQuotaInput & { name: string; slug: string }) => Promise<Tenant>;
    updateQuotas: (tenantId: number, input: TenantQuotaInput) => Promise<Tenant>;
    getUsage: () => Promise<TenantUsage[]>;
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
    get: (vmId: number) => Promise<Vm>;
    create: (input: VmInput) => Promise<Vm>;
    action: (vmId: number, action: "start" | "stop") => Promise<Vm>;
    remove: (vmId: number) => Promise<void>;
    templates: () => Promise<VmTemplate[]>;
    packages: () => Promise<VmPackage[]>;
    requests: () => Promise<ProvisioningRequest[]>;
    requestsForVm: (vmId: number) => Promise<ProvisioningRequest[]>;
    requeueRequest: (requestId: number) => Promise<ProvisioningRequest>;
  };
  packages: {
    listAll: () => Promise<VmPackage[]>;
    create: (input: VmPackageInput) => Promise<VmPackage>;
    update: (packageId: string, input: VmPackageUpdateInput) => Promise<VmPackage>;
    remove: (packageId: string) => Promise<void>;
  };
  sshKeys: {
    list: () => Promise<SshKey[]>;
    create: (input: { name: string; publicKey: string }) => Promise<SshKey>;
    remove: (keyId: number) => Promise<void>;
  };
};

export type TenantQuotaInput = {
  maxVms: number;
  maxCpuCores: number;
  maxMemoryMb: number;
  maxDiskGb: number;
};

export type VmPackageInput = {
  id: string;
  name: string;
  description: string;
  cpuCores: number;
  memoryMb: number;
  diskGb: number;
  badge: string;
  sortOrder: number;
  isActive: boolean;
};

export type VmPackageUpdateInput = Omit<VmPackageInput, "id">;

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
    let detail = `Request failed: ${response.status}`;
    try {
      const body = await response.json() as Record<string, unknown>;
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (body.detail !== null && typeof body.detail === "object") {
        const d = body.detail as Record<string, unknown>;
        detail = d.message ? String(d.message) : JSON.stringify(body.detail);
      }
    } catch { /* ignore parse errors */ }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
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
    { id: 1, name: "Core Systems", slug: "core", maxVms: 10, maxCpuCores: 16, maxMemoryMb: 32768, maxDiskGb: 500 },
    { id: 2, name: "Edge Lab", slug: "edge", maxVms: 5, maxCpuCores: 8, maxMemoryMb: 16384, maxDiskGb: 250 },
  ];

const mockTemplates: VmTemplate[] = [
    { id: 1, name: "Ubuntu Small", cpuCores: 2, memoryMb: 2048, diskGb: 20, imageRef: "ubuntu-24.04-cloudinit" },
    { id: 2, name: "Ubuntu Medium", cpuCores: 4, memoryMb: 4096, diskGb: 40, imageRef: "ubuntu-24.04-cloudinit" },
  ];

const mockPackages: VmPackage[] = [
    { id: "cloud-s", name: "Cloud S", description: "Small services, test systems and lightweight web apps.", cpuCores: 2, memoryMb: 1024, diskGb: 30, badge: "Starter", sortOrder: 10, isActive: true },
    { id: "cloud-m", name: "Cloud M", description: "Default choice for application servers and small databases.", cpuCores: 2, memoryMb: 2048, diskGb: 50, badge: "Popular", sortOrder: 20, isActive: true },
    { id: "cloud-l", name: "Cloud L", description: "More memory and storage for heavier tenant workloads.", cpuCores: 4, memoryMb: 4096, diskGb: 80, badge: "Growth", sortOrder: 30, isActive: true },
    { id: "cloud-xl", name: "Cloud XL", description: "Bigger application nodes, build workers and staging stacks.", cpuCores: 4, memoryMb: 8192, diskGb: 120, badge: "Performance", sortOrder: 40, isActive: true },
  ];

const mockVms: Vm[] = [
    {
      id: 1,
      name: "web-prod-01",
      description: "Frontend node",
      tenant: mockTenants[0],
      owner: {
        id: 2,
        fullName: "Noah Weber",
        email: "noah@example.com",
        role: "user",
        authSource: "local",
        isActive: true,
      },
      template: { id: 1, name: "Ubuntu Small", cpuCores: 2, memoryMb: 2048, diskGb: 20, imageRef: "ubuntu-24.04-cloudinit" },
      packageId: "cloud-m",
      cpuCores: 2,
      memoryMb: 2048,
      diskGb: 50,
      status: "running" as VmStatus,
      createdAt: "2026-03-28T08:15:00Z",
      providerName: "mock-proxmox",
      providerVmId: "mock-001",
    },
    {
      id: 2,
      name: "db-stage-01",
      description: "Database staging node",
      tenant: mockTenants[1],
      owner: {
        id: 1,
        fullName: "Ava Keller",
        email: "ava@example.com",
        role: "admin",
        authSource: "local",
        isActive: true,
      },
      template: { id: 2, name: "Ubuntu Medium", cpuCores: 4, memoryMb: 4096, diskGb: 40, imageRef: "ubuntu-24.04-cloudinit" },
      packageId: "cloud-l",
      cpuCores: 4,
      memoryMb: 4096,
      diskGb: 80,
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
  packages: mockPackages,
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
          maxVms: input.maxVms,
          maxCpuCores: input.maxCpuCores,
          maxMemoryMb: input.maxMemoryMb,
          maxDiskGb: input.maxDiskGb,
        };
        mockDb.tenants.unshift(tenant);
        return tenant;
      },
      async updateQuotas(tenantId, input) {
        const tenant = mockDb.tenants.find((entry) => entry.id === tenantId);
        if (!tenant) {
          throw new Error("Tenant not found");
        }
        Object.assign(tenant, input);
        return tenant;
      },
      async getUsage() {
        return mockDb.tenants.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          usedVms: mockDb.vms.filter((vm) => vm.tenant.id === tenant.id).length,
          usedCpuCores: mockDb.vms.filter((vm) => vm.tenant.id === tenant.id).reduce((sum, vm) => sum + vm.cpuCores, 0),
          usedMemoryMb: mockDb.vms.filter((vm) => vm.tenant.id === tenant.id).reduce((sum, vm) => sum + vm.memoryMb, 0),
          usedDiskGb: mockDb.vms.filter((vm) => vm.tenant.id === tenant.id).reduce((sum, vm) => sum + vm.diskGb, 0),
          maxVms: tenant.maxVms,
          maxCpuCores: tenant.maxCpuCores,
          maxMemoryMb: tenant.maxMemoryMb,
          maxDiskGb: tenant.maxDiskGb,
        }));
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
      async get(vmId) {
        const vm = mockDb.vms.find((entry) => entry.id === vmId);
        if (!vm) {
          throw new Error("VM not found");
        }
        return vm;
      },
      async create(input) {
        const vm: Vm = {
          id: Date.now(),
          name: input.name,
          description: input.description,
          tenant: mockDb.tenants.find((tenant) => tenant.id === input.tenantId) ?? mockDb.tenants[0],
          owner: readStoredSession()?.user ?? mockDb.users[0],
          template: mockDb.templates.find((template) => template.id === input.templateId) ?? mockDb.templates[0],
          packageId: input.packageId,
          cpuCores: mockDb.packages.find((entry) => entry.id === input.packageId)?.cpuCores ?? 2,
          memoryMb: mockDb.packages.find((entry) => entry.id === input.packageId)?.memoryMb ?? 2048,
          diskGb: mockDb.packages.find((entry) => entry.id === input.packageId)?.diskGb ?? 50,
          status: "provisioning",
          createdAt: new Date().toISOString(),
          providerName: "mock-proxmox",
          providerVmId: `mock-${Date.now()}`,
        };
        mockDb.vms.unshift(vm);
        return vm;
      },
      async action(vmId, action) {
        const vm = mockDb.vms.find((entry) => entry.id === vmId);
        if (!vm) {
          throw new Error("VM not found");
        }
        vm.status = action === "start" ? "running" : "stopped";
        return vm;
      },
      async remove(vmId) {
        const index = mockDb.vms.findIndex((entry) => entry.id === vmId);
        if (index >= 0) {
          mockDb.vms.splice(index, 1);
        }
      },
      async templates() {
        return mockDb.templates;
      },
      async packages() {
        return mockDb.packages.filter((entry) => entry.isActive);
      },
      async requests() {
        return [];
      },
      async requestsForVm() {
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
    packages: {
      async listAll() {
        return mockDb.packages;
      },
      async create(input) {
        const vmPackage: VmPackage = { ...input };
        mockDb.packages.push(vmPackage);
        mockDb.packages.sort((left, right) => left.sortOrder - right.sortOrder);
        return vmPackage;
      },
      async update(packageId, input) {
        const vmPackage = mockDb.packages.find((entry) => entry.id === packageId);
        if (!vmPackage) {
          throw new Error("Package not found");
        }
        Object.assign(vmPackage, input);
        mockDb.packages.sort((left, right) => left.sortOrder - right.sortOrder);
        return vmPackage;
      },
      async remove(packageId) {
        const index = mockDb.packages.findIndex((entry) => entry.id === packageId);
        if (index >= 0) {
          mockDb.packages.splice(index, 1);
        }
      },
    },
    sshKeys: {
      async list() {
        return [];
      },
      async create(input) {
        return {
          id: Date.now(),
          name: input.name,
          publicKey: input.publicKey,
          fingerprint: "mock:fingerprint",
          createdAt: new Date().toISOString(),
        };
      },
      async remove() {},
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
          body: JSON.stringify({
            name: input.name,
            slug: input.slug,
            max_vms: input.maxVms,
            max_cpu_cores: input.maxCpuCores,
            max_memory_mb: input.maxMemoryMb,
            max_disk_gb: input.maxDiskGb,
          }),
        });
        return normalizeTenant(tenant);
      },
      updateQuotas: async (tenantId, input) => {
        const tenant = await requestJson<Record<string, unknown>>(`/admin/tenants/${tenantId}/quotas`, {
          method: "PATCH",
          body: JSON.stringify({
            max_vms: input.maxVms,
            max_cpu_cores: input.maxCpuCores,
            max_memory_mb: input.maxMemoryMb,
            max_disk_gb: input.maxDiskGb,
          }),
        });
        return normalizeTenant(tenant);
      },
      getUsage: async () => {
        const usage = await requestJson<Array<Record<string, unknown>>>("/admin/tenants/usage");
        return usage.map(normalizeTenantUsage);
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
      get: async (vmId) => {
        const vm = await requestJson<Record<string, unknown>>(`/vms/${vmId}`);
        return normalizeVm(vm);
      },
      create: (input) =>
        requestJson<Record<string, unknown>>("/vms", {
          method: "POST",
          body: JSON.stringify({
            name: input.name,
            description: input.description,
            template_id: input.templateId,
            tenant_id: input.tenantId,
            package_id: input.packageId,
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
      action: async (vmId, action) => {
        const vm = await requestJson<Record<string, unknown>>(`/vms/${vmId}/actions/${action}`, {
          method: "POST",
        });
        return normalizeVm(vm);
      },
      remove: async (vmId) => {
        await requestJson(`/vms/${vmId}`, {
          method: "DELETE",
        });
      },
      templates: async () => {
        const templates = await requestJson<Array<Record<string, unknown>>>("/vms/templates");
        return templates.map(normalizeTemplate);
      },
      packages: async () => {
        const packages = await requestJson<Array<Record<string, unknown>>>("/vms/packages");
        return packages.map(normalizePackage);
      },
      requests: async () => {
        const requests = await requestJson<Array<Record<string, unknown>>>("/vms/requests");
        return requests.map(normalizeProvisioningRequest);
      },
      requestsForVm: async (vmId) => {
        const requests = await requestJson<Array<Record<string, unknown>>>(`/vms/${vmId}/requests`);
        return requests.map(normalizeProvisioningRequest);
      },
      requeueRequest: async (requestId) => {
        const request = await requestJson<Record<string, unknown>>(`/admin/provisioning-requests/${requestId}/requeue`, {
          method: "POST",
        });
        return normalizeProvisioningRequest(request);
      },
    },
    packages: {
      listAll: async () => {
        const packages = await requestJson<Array<Record<string, unknown>>>("/admin/vm-packages");
        return packages.map(normalizePackage);
      },
      create: async (input) => {
        const vmPackage = await requestJson<Record<string, unknown>>("/admin/vm-packages", {
          method: "POST",
          body: JSON.stringify(packageToApiPayload(input)),
        });
        return normalizePackage(vmPackage);
      },
      update: async (packageId, input) => {
        const vmPackage = await requestJson<Record<string, unknown>>(`/admin/vm-packages/${packageId}`, {
          method: "PATCH",
          body: JSON.stringify(packageToApiPayload(input)),
        });
        return normalizePackage(vmPackage);
      },
      remove: async (packageId) => {
        await requestJson(`/admin/vm-packages/${packageId}`, { method: "DELETE" });
      },
    },
    sshKeys: {
      list: async () => {
        const keys = await requestJson<Array<Record<string, unknown>>>("/ssh-keys");
        return keys.map(normalizeSshKey);
      },
      create: async (input) => {
        const key = await requestJson<Record<string, unknown>>("/ssh-keys", {
          method: "POST",
          body: JSON.stringify({ name: input.name, public_key: input.publicKey }),
        });
        return normalizeSshKey(key);
      },
      remove: async (keyId) => {
        await requestJson(`/ssh-keys/${keyId}`, { method: "DELETE" });
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

function normalizePackage(payload: Record<string, unknown>): VmPackage {
  return {
    id: String(payload.id ?? ""),
    name: String(payload.name ?? ""),
    description: String(payload.description ?? ""),
    cpuCores: Number(payload.cpu_cores ?? payload.cpuCores ?? 0),
    memoryMb: Number(payload.memory_mb ?? payload.memoryMb ?? 0),
    diskGb: Number(payload.disk_gb ?? payload.diskGb ?? 0),
    badge: String(payload.badge ?? ""),
    sortOrder: Number(payload.sort_order ?? payload.sortOrder ?? 100),
    isActive: Boolean(payload.is_active ?? payload.isActive ?? false),
  };
}

function packageToApiPayload(input: VmPackageInput | VmPackageUpdateInput): Record<string, unknown> {
  return {
    ...("id" in input ? { id: input.id } : {}),
    name: input.name,
    description: input.description,
    cpu_cores: input.cpuCores,
    memory_mb: input.memoryMb,
    disk_gb: input.diskGb,
    badge: input.badge,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };
}

function normalizeTenant(payload: Record<string, unknown>): Tenant {
  return {
    id: Number(payload.id),
    name: String(payload.name ?? ""),
    slug: String(payload.slug ?? ""),
    maxVms: Number(payload.max_vms ?? payload.maxVms ?? 0),
    maxCpuCores: Number(payload.max_cpu_cores ?? payload.maxCpuCores ?? 0),
    maxMemoryMb: Number(payload.max_memory_mb ?? payload.maxMemoryMb ?? 0),
    maxDiskGb: Number(payload.max_disk_gb ?? payload.maxDiskGb ?? 0),
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
    packageId: String(payload.package_id ?? payload.packageId ?? ""),
    cpuCores: Number(payload.cpu_cores ?? payload.cpuCores ?? 0),
    memoryMb: Number(payload.memory_mb ?? payload.memoryMb ?? 0),
    diskGb: Number(payload.disk_gb ?? payload.diskGb ?? 0),
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

function normalizeTenantUsage(payload: Record<string, unknown>): TenantUsage {
  return {
    id: Number(payload.id),
    name: String(payload.name ?? ""),
    slug: String(payload.slug ?? ""),
    usedVms: Number(payload.used_vms ?? payload.usedVms ?? 0),
    usedCpuCores: Number(payload.used_cpu_cores ?? payload.usedCpuCores ?? 0),
    usedMemoryMb: Number(payload.used_memory_mb ?? payload.usedMemoryMb ?? 0),
    usedDiskGb: Number(payload.used_disk_gb ?? payload.usedDiskGb ?? 0),
    maxVms: Number(payload.max_vms ?? payload.maxVms ?? 0),
    maxCpuCores: Number(payload.max_cpu_cores ?? payload.maxCpuCores ?? 0),
    maxMemoryMb: Number(payload.max_memory_mb ?? payload.maxMemoryMb ?? 0),
    maxDiskGb: Number(payload.max_disk_gb ?? payload.maxDiskGb ?? 0),
  };
}

function normalizeSshKey(payload: Record<string, unknown>): SshKey {
  return {
    id: Number(payload.id),
    name: String(payload.name ?? ""),
    publicKey: String(payload.public_key ?? payload.publicKey ?? ""),
    fingerprint: String(payload.fingerprint ?? ""),
    createdAt: String(payload.created_at ?? payload.createdAt ?? ""),
  };
}
