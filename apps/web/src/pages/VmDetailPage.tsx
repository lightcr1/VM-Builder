import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isAdmin, useAuth } from "@/App";
import { RequestStatusPill } from "@/components/RequestStatusPill";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import type { ProvisioningRequest, Vm } from "@/types";

export function VmDetailPage() {
  const { vmId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [vm, setVm] = useState<Vm | null>(null);
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"start" | "stop" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const numericVmId = Number(vmId);
  const latestRequest = requests[0];
  const latestPayload = latestRequest ? parsePayload(latestRequest.providerPayload) : {};
  const canSeeGuardrails = isAdmin(session?.user);

  useEffect(() => {
    if (!numericVmId) {
      setError("Invalid VM id");
      setIsLoading(false);
      return;
    }
    void load();
  }, [numericVmId]);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [nextVm, nextRequests] = await Promise.all([api.vms.get(numericVmId), api.vms.requestsForVm(numericVmId)]);
      setVm(nextVm);
      setRequests(nextRequests);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "VM could not be loaded");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction(action: "start" | "stop") {
    if (!vm) return;
    setBusyAction(action);
    try {
      const updated = await api.vms.action(vm.id, action);
      setVm(updated);
      const nextRequests = await api.vms.requestsForVm(vm.id);
      setRequests(nextRequests);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!vm || !window.confirm(`Delete instance ${vm.name}?`)) return;
    setBusyAction("delete");
    try {
      await api.vms.remove(vm.id);
      navigate("/instances", { replace: true });
    } finally {
      setBusyAction(null);
    }
  }

  if (isLoading) {
    return <p className="empty-state">Loading instance...</p>;
  }

  if (error || !vm) {
    return (
      <div className="page-stack">
        <SectionHeader title="Instance unavailable" description={error ?? "The requested instance could not be found."} />
        <Link className="primary-link" to="/instances">
          Back to instances
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <SectionHeader
        title={vm.name}
        description={vm.description || "Instance detail, provider state and provisioning history."}
        action={
          <div className="header-actions">
            <Link className="ghost-button" to="/instances">
              Back
            </Link>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void handleAction("start")}
              disabled={busyAction !== null || vm.status === "running" || vm.status === "provisioning" || vm.status === "requested"}
            >
              {busyAction === "start" ? "Starting..." : "Start"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void handleAction("stop")}
              disabled={busyAction !== null || vm.status === "stopped" || vm.status === "provisioning" || vm.status === "requested"}
            >
              {busyAction === "stop" ? "Stopping..." : "Stop"}
            </button>
            <button
              type="button"
              className="ghost-button table-action-danger"
              onClick={() => void handleDelete()}
              disabled={busyAction !== null || vm.status === "provisioning"}
            >
              {busyAction === "delete" ? "Deleting..." : "Delete"}
            </button>
          </div>
        }
      />

      <div className="metric-strip">
        <div>
          <span>Status</span>
          <strong>{vm.status}</strong>
        </div>
        <div>
          <span>Tenant</span>
          <strong>{vm.tenant.name}</strong>
        </div>
        <div>
          <span>Provider ID</span>
          <strong>{vm.providerVmId ?? "Pending"}</strong>
        </div>
      </div>

      <div className="detail-layout">
        <section className="surface">
          <div className="table-header">
            <p>Instance overview</p>
            <span>Operational metadata for this VM.</span>
          </div>
          <div className="detail-matrix">
            <DetailItem label="Runtime state" value={<StatusPill status={vm.status} />} />
            <DetailItem label="Owner" value={vm.owner.fullName} />
            <DetailItem label="Template" value={vm.template.name} />
            <DetailItem label="Provider" value={vm.providerName} />
            <DetailItem label="Created" value={new Date(vm.createdAt).toLocaleString()} />
            <DetailItem label="Image" value={vm.template.imageRef} />
          </div>
        </section>

        <aside className="surface summary-panel">
          <div className="table-header">
            <p>Provisioning state</p>
            <span>Last worker result and provider metadata.</span>
          </div>
          <div className="summary-stack">
            <div className="summary-item">
              <span>Last provider status</span>
              <strong>{latestPayload.providerStatus ?? "Pending"}</strong>
            </div>
            <div className="summary-item">
              <span>Last task</span>
              <strong>{latestPayload.taskRef ?? "No task reference"}</strong>
            </div>
            <div className="summary-item">
              <span>Attempts</span>
              <strong>{latestPayload.attemptCount ?? "0"}</strong>
            </div>
          </div>
        </aside>
      </div>

      {canSeeGuardrails ? (
        <section className="surface">
          <div className="table-header">
            <p>Provider guardrails</p>
            <span>Internal controls applied by VM Builder; users cannot opt out during creation.</span>
          </div>
          <div className="detail-matrix">
            <DetailItem label="VM firewall" value={latestPayload.firewallEnabled ?? "Configured on next provision"} />
            <DetailItem label="Firewall group" value={latestPayload.firewallGroup ?? "Configured by environment"} />
            <DetailItem label="Network bridge" value={latestPayload.networkBridge ?? "Template/default bridge"} />
            <DetailItem label="VLAN tag" value={latestPayload.vlanTag ?? "Untagged/default"} />
          </div>
        </section>
      ) : null}

      <section className="surface">
        <div className="table-header">
          <p>Provisioning history</p>
          <span>Requests and worker state for this VM.</span>
        </div>
        <div className="table-columns request-columns">
          <span>Request</span>
          <span>Execution</span>
          <span>Submitted</span>
          <span>Status</span>
        </div>
        <div className="vm-table">
          {requests.length === 0 ? <p className="empty-state">No provisioning history for this instance.</p> : null}
          {requests.map((request) => {
            const payload = parsePayload(request.providerPayload);
            return (
              <article className="vm-row request-grid-row" key={request.id}>
                <div>
                  <strong>Request #{request.id}</strong>
                  <span>{payload.template ?? "Template pending"}</span>
                </div>
                <div>
                  <strong>{payload.providerStatus ?? payload.ipConfigMode ?? "Awaiting worker"}</strong>
                  <span>{payload.error ?? payload.taskRef ?? "Worker-managed execution"}</span>
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

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function parsePayload(payload: string): {
  template?: string;
  providerStatus?: string;
  taskRef?: string;
  ipConfigMode?: string;
  error?: string;
  attemptCount?: number;
  firewallGroup?: string;
  firewallEnabled?: string;
  networkBridge?: string;
  vlanTag?: string;
} {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      template: parsed.template ? String(parsed.template) : undefined,
      providerStatus: parsed.provider_status ? String(parsed.provider_status) : undefined,
      taskRef: parsed.task_ref ? String(parsed.task_ref) : undefined,
      ipConfigMode: parsed.ip_config_mode ? String(parsed.ip_config_mode) : undefined,
      error: parsed.error ? String(parsed.error) : undefined,
      attemptCount: parsed.attempt_count ? Number(parsed.attempt_count) : undefined,
      firewallGroup: parsed.firewall_group ? String(parsed.firewall_group) : undefined,
      firewallEnabled: parsed.firewall_enabled ? String(parsed.firewall_enabled) : undefined,
      networkBridge: parsed.network_bridge ? String(parsed.network_bridge) : undefined,
      vlanTag: parsed.vlan_tag ? String(parsed.vlan_tag) : undefined,
    };
  } catch {
    return {};
  }
}
