import { useAuth } from "@/App";
import { SectionHeader } from "@/components/SectionHeader";

export function AccessPage() {
  const { me } = useAuth();

  return (
    <div className="page-stack">
      <SectionHeader
        title="Access"
        description="Current operator identity, tenant reach and future integration points for directory-backed access."
      />

      <div className="split-grid">
        <section className="surface">
          <div className="table-header">
            <p>Current session</p>
            <span>Identity and scope visible to the platform right now.</span>
          </div>
          <div className="list-rows">
            <article className="detail-row">
              <div>
                <strong>{me?.fullName ?? "Unknown user"}</strong>
                <span>{me?.email ?? "No email"}</span>
              </div>
              <div>
                <span>{me?.role ?? "user"}</span>
                <span>{me?.authSource ?? "local"}</span>
              </div>
            </article>
            {me?.memberships.map((membership) => (
              <article className="detail-row" key={membership.tenant.id}>
                <div>
                  <strong>{membership.tenant.name}</strong>
                  <span>{membership.tenant.slug}</span>
                </div>
                <div>
                  <span>{membership.isDefault ? "Default tenant" : "Additional tenant"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="surface">
          <div className="table-header">
            <p>Directory roadmap</p>
            <span>Keep access clean now so LDAP and AD can slot in later without rewriting the UX.</span>
          </div>
          <div className="list-rows">
            <article className="detail-row">
              <div>
                <strong>Local login</strong>
                <span>Bootstrap and fallback path for operators.</span>
              </div>
              <div>
                <span>Active</span>
              </div>
            </article>
            <article className="detail-row">
              <div>
                <strong>LDAP / AD mapping</strong>
                <span>Planned role and tenant synchronization via external directory groups.</span>
              </div>
              <div>
                <span>Planned</span>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
