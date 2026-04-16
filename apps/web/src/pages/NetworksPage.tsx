import { SectionHeader } from "@/components/SectionHeader";

export function NetworksPage() {
  return (
    <div className="page-stack">
      <SectionHeader
        title="Networks"
        description="Prepare tenant-aware networking, VLAN mapping and later OPNsense-backed isolation from one place."
      />

      <div className="dashboard-grid">
        <section className="surface">
          <div className="table-header">
            <p>Tenant network model</p>
            <span>This area is intentionally staged for the next infrastructure layer.</span>
          </div>
          <div className="list-rows">
            <article className="detail-row">
              <div>
                <strong>Tenant segments</strong>
                <span>Reserve logical network objects per tenant before wiring OPNsense rules.</span>
              </div>
              <div>
                <span>Planned</span>
              </div>
            </article>
            <article className="detail-row">
              <div>
                <strong>Bridge and VLAN policy</strong>
                <span>Map provisioning defaults like `vmbr0` and VLAN tags into reusable network profiles.</span>
              </div>
              <div>
                <span>Planned</span>
              </div>
            </article>
            <article className="detail-row">
              <div>
                <strong>Firewall ownership</strong>
                <span>Later attach OPNsense policies without exposing global platform controls to tenants.</span>
              </div>
              <div>
                <span>Planned</span>
              </div>
            </article>
          </div>
        </section>

        <aside className="surface summary-panel">
          <div className="table-header">
            <p>Why this page exists</p>
            <span>Cloud hosting panels usually expose networks as a first-class resource.</span>
          </div>
          <div className="summary-note">
            <strong>Hosted by arcs-cloud</strong>
            <span>This placeholder keeps the IA aligned with where the platform is heading, instead of hiding networking inside VM forms forever.</span>
            <a href="https://arcs-cloud.ch" target="_blank" rel="noreferrer">
              arcs-cloud.ch
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
