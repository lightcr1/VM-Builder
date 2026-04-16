import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { ProvisioningRequest, Tenant, Vm } from "@/types";
import { RequestStatusPill } from "@/components/RequestStatusPill";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusPill } from "@/components/StatusPill";

export function DashboardPage() {
  const [vms, setVms] = useState<Vm[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requests, setRequests] = useState<ProvisioningRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    let intervalId: number | undefined;

    async function loadDashboard(isBackgroundRefresh: boolean) {
      if (!active) return;
      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [vmList, tenantList, requestList] = await Promise.all([api.vms.list(), api.tenants.list(), api.vms.requests()]);
        if (!active) return;
        setVms(vmList);
        setTenants(tenantList);
        setRequests(requestList);
        setLastUpdated(new Date().toISOString());
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Dashboard refresh failed");
      } finally {
        if (!active) return;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    void loadDashboard(false);
    intervalId = window.setInterval(() => {
      void loadDashboard(true);
    }, 5000);

    return () => {
      active = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [refreshToken]);

  return (
    <div className="page-stack">
      <SectionHeader
        title="Dashboard"
        description="A compact workspace for the VMs you own or are allowed to operate."
        action={
          <div className="header-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setRefreshToken((current) => current + 1)}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link className="primary-link" to="/create">
              Create VM
            </Link>
          </div>
        }
      />

      <section className="surface dashboard-signal">
        <div>
          <strong>{isLoading ? "Loading dashboard" : "Live provisioning view"}</strong>
          <span>
            {error
              ? `Last refresh failed: ${error}`
              : lastUpdated
                ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}`
                : "Waiting for first refresh"}
          </span>
        </div>
        <span className={`signal-dot ${error ? "signal-error" : "signal-ok"}`} />
      </section>

      <div className="metric-strip">
        <div>
          <span>VMs</span>
          <strong>{vms.length}</strong>
        </div>
        <div>
          <span>Tenants</span>
          <strong>{tenants.length}</strong>
        </div>
        <div>
          <span>Provisioning</span>
          <strong>{requests.filter((request) => request.status === "pending" || request.status === "approved").length}</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="surface">
          <div className="table-header">
            <p>Instances</p>
            <span>Scoped to your memberships and ownership.</span>
          </div>
          <div className="table-columns">
            <span>Name</span>
            <span>Tenant</span>
            <span>Created</span>
            <span>Status</span>
          </div>
          <div className="vm-table">
            {vms.length === 0 ? <p className="empty-state">No VMs visible yet.</p> : null}
            {vms.map((vm) => (
              <article className="vm-row vm-grid-row" key={vm.id}>
                <div>
                  <strong>{vm.name}</strong>
                  <span>{vm.template.name}</span>
                </div>
                <div>
                  <strong>{vm.tenant.name}</strong>
                  <span>{vm.providerName}</span>
                </div>
                <div>
                  <strong>{new Date(vm.createdAt).toLocaleDateString()}</strong>
                  <span>{vm.providerVmId ? `VMID ${vm.providerVmId}` : "Pending provider ID"}</span>
                </div>
                <StatusPill status={vm.status} />
              </article>
            ))}
          </div>
        </section>

        <section className="surface summary-panel">
          <div className="table-header">
            <p>Platform summary</p>
            <span>Fast operator context, similar to a cloud overview pane.</span>
          </div>
          <div className="summary-stack">
            <div className="summary-item">
              <span>Running instances</span>
              <strong>{vms.filter((vm) => vm.status === "running").length}</strong>
            </div>
            <div className="summary-item">
              <span>Failed requests</span>
              <strong>{requests.filter((request) => request.status === "failed").length}</strong>
            </div>
            <div className="summary-item">
              <span>Default tenant views</span>
              <strong>{tenants.length}</strong>
            </div>
          </div>
          <div className="summary-note">
            <strong>Hosted by arcs-cloud</strong>
            <span>Managed self-service infrastructure with a direct path into Proxmox-backed automation.</span>
            <a href="https://arcs-cloud.ch" target="_blank" rel="noreferrer">
              Visit arcs-cloud.ch
            </a>
          </div>
        </section>
      </div>

      <section className="surface">
        <div className="table-header">
          <p>Provisioning queue</p>
          <span>Tracks the async worker path from request to completed provisioning.</span>
        </div>
        <div className="table-columns request-columns">
          <span>Request</span>
          <span>Execution</span>
          <span>Submitted</span>
          <span>Status</span>
        </div>
        <div className="vm-table">
          {requests.length === 0 ? <p className="empty-state">No provisioning requests yet.</p> : null}
          {requests.slice(0, 6).map((request) => {
            const details = parsePayload(request.providerPayload);
            return (
              <article className="vm-row request-grid-row" key={request.id}>
                <div>
                  <strong>Request #{request.id}</strong>
                  <span>
                    VM #{request.vmInstanceId} · {details.template ?? "Template pending"}
                  </span>
                </div>
                <div>
                  <strong>{details.providerStatus ?? details.ipConfigMode ?? "Awaiting worker"}</strong>
                  {details.error ? <span className="request-error">{details.error}</span> : <span>Worker-managed execution</span>}
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
} {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      template: parsed.template ? String(parsed.template) : undefined,
      providerStatus: parsed.provider_status ? String(parsed.provider_status) : undefined,
      ipConfigMode: parsed.ip_config_mode ? String(parsed.ip_config_mode) : undefined,
      error: parsed.error ? String(parsed.error) : undefined,
    };
  } catch {
    return {};
  }
}
