# Architecture Overview

VM Builder trennt drei Ebenen:

- `web`: Bedienoberflaeche fuer Benutzer und Administratoren
- `api`: zentrale Control Plane fuer Auth, Rechte, Tenants, VMs und Provisioning Requests
- `worker + redis`: asynchrone Ausfuehrung von Provisioning-Auftraegen ausserhalb des HTTP-Requests
- `provider adapters`: spaetere Anbindung an Proxmox und OPNsense hinter stabilen Interfaces
- `alembic migrations`: versionierter Datenbankzustand statt implizitem Tabellenaufbau

## Datenfluss

1. Benutzer meldet sich im Frontend an.
2. Frontend holt ein JWT ueber die API.
3. API prueft Rolle und Tenant-Mitgliedschaften.
4. VM-Anlage erzeugt einen `VmInstance`-Datensatz und einen `ProvisioningRequest`.
5. Die API dispatcht den Auftrag je nach Modus direkt oder ueber Redis an den Worker.
6. Der Compute-Provider entscheidet zwischen Mock und echtem Proxmox-Clone.
7. Im Proxmox-Pfad folgen nach dem Clone weitere Konfigurationsschritte fuer VM-Ressourcen, `net0` und Cloud-Init.
8. Die externe Provider-ID und Task-Referenz werden in der Plattform gespeichert.

## Kernobjekte

- `User`
- `Tenant`
- `Membership`
- `VmTemplate`
- `VmInstance`
- `ProvisioningRequest`
- `AuditEvent`

## Erweiterungspfade

- LDAP/AD wird als weiterer Auth-Provider angebunden.
- Proxmox ist bereits als Compute-Provider hinter `ComputeProvider` integrierbar und nutzt Template-Cloning als ersten echten Provisioning-Pfad.
- OPNsense wird spaeter fuer Tenant-Netze, VLANs und Firewall-Policies hinter `NetworkProvider` angebunden.
