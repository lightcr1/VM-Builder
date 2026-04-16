import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusPill } from "@/components/StatusPill";
import type { Vm } from "@/types";

export function InstancesPage() {
  const [vms, setVms] = useState<Vm[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped" | "provisioning" | "requested" | "error">("all");
  const [busyVmId, setBusyVmId] = useState<number | null>(null);

  useEffect(() => {
    void loadVms();
  }, []);

  async function loadVms() {
    const data = await api.vms.list();
    setVms(data);
  }

  async function handleAction(vmId: number, action: "start" | "stop") {
    setBusyVmId(vmId);
    try {
      const updated = await api.vms.action(vmId, action);
      setVms((current) => current.map((vm) => (vm.id === vmId ? updated : vm)));
    } finally {
      setBusyVmId(null);
    }
  }

  async function handleDelete(vmId: number, vmName: string) {
    if (!window.confirm(`Delete instance ${vmName}?`)) {
      return;
    }
    setBusyVmId(vmId);
    try {
      await api.vms.remove(vmId);
      setVms((current) => current.filter((vm) => vm.id !== vmId));
    } finally {
      setBusyVmId(null);
    }
  }

  const filteredVms = vms.filter((vm) => {
    const matchesQuery =
      query === "" ||
      vm.name.toLowerCase().includes(query.toLowerCase()) ||
      vm.tenant.name.toLowerCase().includes(query.toLowerCase()) ||
      vm.template.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || vm.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page-stack">
      <SectionHeader
        title="Instances"
        description="Compute inventory with tenant scope, provider identifiers and current runtime state."
        action={
          <Link className="primary-link" to="/create">
            New instance
          </Link>
        }
      />

      <section className="surface">
        <div className="table-header">
          <p>Virtual machines</p>
          <span>Modelled after the compact inventory surfaces used by cloud hosting dashboards.</span>
        </div>
        <div className="toolbar-row">
          <label className="toolbar-field">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search instance, tenant or template"
            />
          </label>
          <label className="toolbar-field toolbar-select">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">All statuses</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="provisioning">Provisioning</option>
              <option value="requested">Requested</option>
              <option value="error">Error</option>
            </select>
          </label>
        </div>
        <div className="table-columns">
          <span>Name</span>
          <span>Tenant</span>
          <span>Template</span>
          <span>State</span>
        </div>
        <div className="vm-table">
          {filteredVms.length === 0 ? <p className="empty-state">No instances match the current filters.</p> : null}
          {filteredVms.map((vm) => (
            <article className="vm-row vm-grid-row" key={vm.id}>
              <div>
                <strong>
                  <Link className="inline-link" to={`/instances/${vm.id}`}>
                    {vm.name}
                  </Link>
                </strong>
                <span>{vm.description || "No description"}</span>
              </div>
              <div>
                <strong>{vm.tenant.name}</strong>
                <span>{vm.owner.fullName}</span>
              </div>
              <div>
                <strong>{vm.template.name}</strong>
                <span>{vm.providerVmId ? `VMID ${vm.providerVmId}` : "Provider ID pending"}</span>
              </div>
              <div className="row-actions">
                <StatusPill status={vm.status} />
                <div className="row-action-links">
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => void handleAction(vm.id, "start")}
                    disabled={busyVmId === vm.id || vm.status === "running" || vm.status === "provisioning" || vm.status === "requested"}
                  >
                    {busyVmId === vm.id ? "Working..." : "Start"}
                  </button>
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => void handleAction(vm.id, "stop")}
                    disabled={busyVmId === vm.id || vm.status === "stopped" || vm.status === "provisioning" || vm.status === "requested"}
                  >
                    {busyVmId === vm.id ? "Working..." : "Stop"}
                  </button>
                  <button
                    type="button"
                    className="table-action table-action-danger"
                    onClick={() => void handleDelete(vm.id, vm.name)}
                    disabled={busyVmId === vm.id || vm.status === "provisioning"}
                  >
                    {busyVmId === vm.id ? "Working..." : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
