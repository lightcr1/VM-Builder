export type Role = "admin" | "user";

export type User = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  authSource: string;
  isActive: boolean;
};

export type Tenant = {
  id: number;
  name: string;
  slug: string;
  maxVms: number;
  maxCpuCores: number;
  maxMemoryMb: number;
  maxDiskGb: number;
};

export type VmTemplate = {
  id: number;
  name: string;
  cpuCores: number;
  memoryMb: number;
  diskGb: number;
  imageRef: string;
};

export type VmPackage = {
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

export type VmStatus = "requested" | "provisioning" | "running" | "stopped" | "error";
export type RequestStatus = "pending" | "approved" | "completed" | "failed";

export type Vm = {
  id: number;
  name: string;
  description: string;
  tenant: Tenant;
  owner: User;
  template: VmTemplate;
  packageId: string;
  cpuCores: number;
  memoryMb: number;
  diskGb: number;
  status: VmStatus;
  createdAt: string;
  providerName: string;
  providerVmId?: string | null;
};

export type ProvisioningRequest = {
  id: number;
  status: RequestStatus;
  providerPayload: string;
  createdAt: string;
  vmInstanceId: number;
};

export type Session = {
  token: string;
  user: User;
};

export type Membership = {
  tenant: Tenant;
  isDefault: boolean;
};

export type Me = User & {
  memberships: Membership[];
};

export type AuditEvent = {
  id: number;
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
};

export type TenantUsage = {
  id: number;
  name: string;
  slug: string;
  usedVms: number;
  usedCpuCores: number;
  usedMemoryMb: number;
  usedDiskGb: number;
  maxVms: number;
  maxCpuCores: number;
  maxMemoryMb: number;
  maxDiskGb: number;
};

export type SshKey = {
  id: number;
  name: string;
  publicKey: string;
  fingerprint: string;
  createdAt: string;
};
