import { useEffect, useState } from "react";
import { RequestStatusPill } from "@/components/RequestStatusPill";
import { SectionHeader } from "@/components/SectionHeader";
import { api } from "@/lib/api";
import type { ProvisioningRequest } from "@/types";

export function RequestsPage() {
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "completed" | "failed">("all");

  useEffect(() => {
    void api.vms.requests().then(setRequests);
  }, []);

  const filteredRequests = requests.filter((request) => {
    const details = parsePayload(request.providerPayload);
    const matchesQuery =
      query === "" ||
      String(request.id).includes(query) ||
      String(request.vmInstanceId).includes(query) ||
      (details.template ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (details.error ?? "").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page-stack">
      <SectionHeader
        title="Requests"
        description="Provisioning queue, provider execution state and failure context in one operator view."
      />

      <section className="surface">
        <div className="table-header">
          <p>Provisioning requests</p>
          <span>Track pending jobs, successful runs and failure states without leaving the workspace.</span>
        </div>
        <div className="toolbar-row">
          <label className="toolbar-field">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search request, VM or error"
            />
          </label>
          <label className="toolbar-field toolbar-select">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        </div>
        <div className="table-columns request-columns">
          <span>Request</span>
          <span>Execution</span>
          <span>Submitted</span>
          <span>Status</span>
        </div>
        <div className="vm-table">
          {filteredRequests.length === 0 ? <p className="empty-state">No provisioning requests match the current filters.</p> : null}
          {filteredRequests.map((request) => {
            const details = parsePayload(request.providerPayload);
            return (
              <article className="vm-row request-grid-row" key={request.id}>
                <div>
                  <strong>Request #{request.id}</strong>
                  <span>VM #{request.vmInstanceId} · {details.template ?? "Template pending"}</span>
                </div>
                <div>
                  <strong>{details.providerStatus ?? details.ipConfigMode ?? "Awaiting worker"}</strong>
                  <span>
                    {details.error ?? "Worker-managed execution path"}
                    {details.attemptCount ? ` · attempt ${details.attemptCount}` : ""}
                    {details.requeueCount ? ` · requeued ${details.requeueCount}x` : ""}
                  </span>
                </div>
                <div>
                  <strong>{new Date(request.createdAt).toLocaleDateString()}</strong>
                  <span>{new Date(request.createdAt).toLocaleTimeString()}</span>
                </div>
                <RequestStatusPill status={request.status} />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function parsePayload(payload: string): {
  template?: string;
  providerStatus?: string;
  ipConfigMode?: string;
  error?: string;
  attemptCount?: number;
  requeueCount?: number;
} {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      template: parsed.template ? String(parsed.template) : undefined,
      providerStatus: parsed.provider_status ? String(parsed.provider_status) : undefined,
      ipConfigMode: parsed.ip_config_mode ? String(parsed.ip_config_mode) : undefined,
      error: parsed.error ? String(parsed.error) : undefined,
      attemptCount: parsed.attempt_count ? Number(parsed.attempt_count) : undefined,
      requeueCount: parsed.requeue_count ? Number(parsed.requeue_count) : undefined,
    };
  } catch {
    return {};
  }
}
