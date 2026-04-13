import type { VmStatus } from "@/types";

const labels: Record<VmStatus, string> = {
  requested: "Requested",
  provisioning: "Provisioning",
  running: "Running",
  stopped: "Stopped",
  error: "Error",
};

export function StatusPill({ status }: { status: VmStatus }) {
  return <span className={`status-pill ${status}`}>{labels[status]}</span>;
}
