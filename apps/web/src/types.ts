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
<<<<<<< HEAD
  maxVms: number;
  maxCpuCores: number;
  maxMemoryMb: number;
  maxDiskGb: number;
=======
>>>>>>> origin/main
};

export type VmTemplate = {
  id: number;
  name: string;
  cpuCores: number;
  memoryMb: number;
  diskGb: number;
  imageRef: string;
};

<<<<<<< HEAD
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

=======
>>>>>>> origin/main
export type VmStatus = "requested" | "provisioning" | "running" | "stopped" | "error";
export type RequestStatus = "pending" | "approved" | "completed" | "failed";

export type Vm = {
  id: number;
  name: string;
  description: string;
  tenant: Tenant;
  owner: User;
  template: VmTemplate;
<<<<<<< HEAD
  packageId: string;
  cpuCores: number;
  memoryMb: number;
  diskGb: number;
=======
>>>>>>> origin/main
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
