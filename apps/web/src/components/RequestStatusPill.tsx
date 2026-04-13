import type { RequestStatus } from "@/types";

const labels: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  completed: "Completed",
  failed: "Failed",
};

export function RequestStatusPill({ status }: { status: RequestStatus }) {
  return <span className={`status-pill request-${status}`}>{labels[status]}</span>;
}
