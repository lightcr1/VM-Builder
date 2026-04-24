# VM Builder

VM Builder ist ein Self-Service-Portal fuer virtuelle Maschinen. Benutzer melden sich im Webportal an, sehen nur ihre erlaubten VMs und koennen neue VMs aus festen Paketen bestellen. Die Plattform verwaltet Tenant-Zugehoerigkeit, Provisioning-Requests, Worker-Jobs, Audit-Events und spaeter echte Proxmox-/Netzwerk-Integration zentral.

Das Projekt ist bewusst so aufgebaut, dass Benutzer einfache Hosting-Workflows sehen, waehrend technische Details wie Proxmox-Node, Bridge, VLAN, Firewall-Gruppe und Queue-Verarbeitung im Backend bleiben.

## Was aktuell enthalten ist

- React/Vite-Frontend mit Login, Overview, Instances, VM-Detail, Requests, Networks, Access, Create und Admin.
- FastAPI-Backend mit lokaler Authentifizierung, RBAC, Tenants, VM-Modell, Provisioning-Requests und Audit-Events.
- PostgreSQL als persistente Datenbank.
- Redis und Worker fuer asynchrones Provisioning.
- Nginx-Reverse-Proxy mit HTTPS auf Port `4000`.
- Automatische Self-Signed-Zertifikatserzeugung beim Proxy-Start.
- Docker Compose fuer `proxy`, `web`, `api`, `worker`, `redis` und `db`.
- Mock-Provider fuer lokale Entwicklung ohne echten Proxmox-Cluster.
- Proxmox-Provider fuer Template-Clone, CPU/RAM/Disk, Cloud-Init, Start/Stop/Delete und Firewall-Guardrails.
- Admin-Requeue fuer fehlgeschlagene Provisioning-Jobs.

## Zielbild

Normale Benutzer sollen ein einfaches Hosting-Portal bekommen:

- einloggen
- eigene VMs sehen
- VM aus einem festen Paket erstellen
- SSH-Key und Default-User setzen
- VM starten, stoppen und loeschen
- Provisioning-Status einsehen

Admins sollen die Plattform zentral betreiben:

- Benutzer und Tenants verwalten
- fehlgeschlagene Jobs erneut starten
- Audit-Events einsehen
- interne Provider-Guardrails pruefen
- Proxmox- und spaeter Netzwerk-/Firewall-Integration kontrollieren

## Schnellstart lokal oder auf der VM

Voraussetzungen:

- Docker
- Docker Compose
- Zugriff auf dieses Repository
- Host-IP, unter der das Portal erreichbar sein soll, aktuell `10.10.40.61`

Start:

```bash
cp .env.example .env
docker-compose up --build -d
```

Portal oeffnen:

```text
https://10.10.40.61:4000
```

Healthcheck:

```bash
curl -k https://10.10.40.61:4000/health
```

Login im Standard-Setup:

```text
E-Mail: admin@example.com
Passwort: change-me-now
```

Diese Werte kommen aus `.env`:

```env
APP_ADMIN_EMAIL=admin@example.com
APP_ADMIN_PASSWORD=change-me-now
```

Wichtig: Aendere `APP_SECRET_KEY`, `APP_ADMIN_PASSWORD` und Datenbankpasswoerter, bevor du die Umgebung ernsthaft benutzt.

## HTTPS und Port 4000

Der Reverse Proxy lauscht standardmaessig auf:

```text
https://10.10.40.61:4000
```

Gesteuert wird das ueber:

```env
PROXY_HOST=10.10.40.61
PROXY_PORT=4000
APP_CORS_ORIGINS=https://10.10.40.61:4000,https://localhost:4000,https://127.0.0.1:4000
```

Beim Start erzeugt der Proxy automatisch ein Self-Signed-Zertifikat, falls noch keines vorhanden ist:

```text
infra/proxy/certs/tls.crt
infra/proxy/certs/tls.key
```

Der Browser zeigt bei Self-Signed-Zertifikaten eine Warnung. Fuer Tests ist das normal. Wenn der Browser ohne Warnung vertrauen soll, importiere `infra/proxy/certs/tls.crt` in den Truststore des Clients.

## LDAP / Active Directory

LDAP-Login ist im Backend implementiert. Wenn `LDAP_ENABLED=true` gesetzt ist, versucht der Login zuerst LDAP und faellt danach auf lokale Benutzer zurueck. Neue LDAP-Benutzer werden beim ersten erfolgreichen Login lokal angelegt und dem ersten Tenant als Default-Tenant zugeordnet.

Minimalwerte in `.env`:

```env
LDAP_ENABLED=true
LDAP_SERVER_URI=ldap://dc.corp.internal
LDAP_BIND_DN=cn=svc-vm-builder,ou=service,dc=corp,dc=internal
LDAP_BIND_PASSWORD=<service-account-password>
LDAP_BASE_DN=dc=corp,dc=internal
LDAP_USER_SEARCH_FILTER=(mail={email})
LDAP_EMAIL_ATTRIBUTE=mail
LDAP_NAME_ATTRIBUTE=cn
LDAP_GROUP_ATTRIBUTE=memberOf
LDAP_ALLOWED_GROUPS=CN=VM-Builder-Users,OU=Groups,DC=corp,DC=internal;CN=VM-Builder-Admins,OU=Groups,DC=corp,DC=internal
LDAP_ADMIN_GROUPS=CN=VM-Builder-Admins,OU=Groups,DC=corp,DC=internal
```

`LDAP_ALLOWED_GROUPS` begrenzt, wer sich anmelden darf. `LDAP_ADMIN_GROUPS` mappt LDAP-Benutzer auf die Plattformrolle `admin`; alle anderen erlaubten LDAP-Benutzer werden `user`. Fuer vollstaendige DNs mit Kommas trenne mehrere Gruppen mit Semikolon. Fuer einfache Gruppennamen ohne Kommas funktioniert auch eine kommagetrennte Liste. Wenn `LDAP_ALLOWED_GROUPS` leer ist, duerfen alle gefundenen LDAP-Benutzer mit gueltigem Passwort einloggen.

## Docker Services

`proxy`

Nginx-Proxy. Terminiert HTTPS auf Port `4000` und routet `/api/*` zur API und alles andere zum Web-Frontend.

`web`

React/Vite-Frontend, als statische App ueber Nginx ausgeliefert. Deep Links wie `/create` oder `/instances/5` funktionieren ueber SPA-Fallback.

`api`

FastAPI-Anwendung. Fuehrt Migrationen aus, stellt Auth/API bereit und schreibt in PostgreSQL.

`worker`

Fuehrt Provisioning-Jobs aus. Bei echtem Proxmox macht dieser Container die Provider-API-Aufrufe.

`redis`

Queue-Backend fuer Provisioning-Jobs.

`db`

PostgreSQL-Datenbank fuer Benutzer, Tenants, VMs, Requests und Audit-Events.

## Wichtige Kommandos

Stack starten:

```bash
docker-compose up -d
```

Mit Build starten:

```bash
docker-compose up --build -d
```

Logs anzeigen:

```bash
docker-compose logs -f api worker
```

Nur Frontend neu bauen:

```bash
docker-compose build web
docker-compose rm -sf web
docker-compose up -d web
```

API und Worker neu bauen:

```bash
docker-compose build api worker
docker-compose rm -sf api worker
docker-compose up -d api worker
```

Health pruefen:

```bash
curl -k https://10.10.40.61:4000/health
```

Hinweis: Diese Umgebung nutzt aktuell das alte `docker-compose` CLI. Wenn beim Recreate ein `ContainerConfig`-Fehler auftaucht, entferne den betroffenen Container zuerst mit `docker-compose rm -sf <service>` und starte ihn danach neu.

## Bedienung im Portal

### Login

Oeffne:

```text
https://10.10.40.61:4000
```

Melde dich mit einem lokalen Benutzer an. Beim ersten Start wird ein Admin aus `APP_ADMIN_EMAIL` und `APP_ADMIN_PASSWORD` angelegt.

### Overview

Die Overview-Seite zeigt:

- Anzahl sichtbarer VMs
- Tenants
- laufende Provisioning-Jobs
- letzte Provisioning-Requests
- Direktlink `Create VM`

Der Button `Create VM` fuehrt direkt in den Create-Tab:

```text
/create
```

### Create

Der Create-Flow ist absichtlich wie ein Hosting-Bestellprozess aufgebaut.

Schritt 1: Basics

- VM-Name
- optionale Beschreibung
- Tenant
- Template

Schritt 2: Package

Benutzer waehlen ein festes Paket. Freie CPU/RAM/Disk-Werte sind im User-Flow nicht sichtbar und werden auch backendseitig nicht akzeptiert. Die API nutzt `package_id` und setzt CPU/RAM/Disk serverseitig aus der Paketdefinition in PostgreSQL.

Aktuelle Pakete:

- `Cloud S`: 2 vCPU, 1 GB RAM, 30 GB SSD
- `Cloud M`: 2 vCPU, 2 GB RAM, 50 GB SSD
- `Cloud L`: 4 vCPU, 4 GB RAM, 80 GB SSD
- `Cloud XL`: 4 vCPU, 8 GB RAM, 120 GB SSD

Aktuelle Paket-IDs fuer die API:

- `cloud-s`
- `cloud-m`
- `cloud-l`
- `cloud-xl`

Paketliste per API:

```text
GET /api/vms/packages
```

Admins koennen Pakete unter `Admin -> VM packages` verwalten. Inaktive Pakete bleiben fuer Benutzer im Create-Flow unsichtbar, vorhandene VMs behalten aber ihre gespeicherte `package_id`.

Schritt 3: Access

Benutzer koennen nur noch Zugriffsdaten setzen:

- Default-User fuer Cloud-Init
- SSH Public Key
- Start after create

Nicht auswaehlbar fuer Benutzer:

- Bridge
- VLAN
- IP-Modus
- statische IP
- Firewall-Gruppe

Diese Dinge werden von der Plattform verwaltet.

Schritt 4: Review

Zusammenfassung der Bestellung. Danach wird ein Provisioning-Request erzeugt und vom Worker verarbeitet.

### Instances

Die Instances-Seite zeigt alle VMs, die der Benutzer sehen darf.

Moegliche Aktionen:

- `Start`
- `Stop`
- `Delete`
- Klick auf den VM-Namen fuer die Detailseite

Normale Benutzer sehen nur VMs, die ihnen bzw. ihrem Tenant erlaubt sind. Admins sehen tenantuebergreifend.

### VM Detail

Die Detailseite zeigt:

- Status
- Tenant
- Provider-ID
- Owner
- Template
- letzte Provisioning-Historie
- Start/Stop/Delete

Admins sehen zusaetzlich interne Provider-Guardrails, zum Beispiel angewendete Firewall-Gruppe und Netzwerk-/Firewall-Defaults.

### Requests

Requests zeigt Provisioning-Jobs:

- pending
- approved
- completed
- failed

Hier sieht man, ob ein Job noch laeuft, erfolgreich abgeschlossen wurde oder fehlgeschlagen ist.

### Admin

Admin-Funktionen:

- Tenants erstellen
- Tenant-Quotas fuer VMs, CPU, RAM und Disk setzen
- VM-Pakete erstellen, bearbeiten und deaktivieren
- Benutzer erstellen
- Benutzerliste anzeigen
- Tenantliste anzeigen
- fehlgeschlagene Provisioning-Requests requeueen
- Audit-Events sehen
- Provider-Guardrails einsehen

## Tenant- und Rechte-Modell

VM Builder trennt Sichtbarkeit im Backend, nicht nur im Frontend.

Grundregeln:

- Jeder Benutzer hat eine Rolle: `user` oder `admin`.
- Benutzer sind ueber Memberships Tenants zugeordnet.
- Normale Benutzer sehen nur erlaubte VMs.
- Admins sehen alles.
- Cross-Tenant-Zugriffe werden serverseitig blockiert.
- Tenant-Quotas werden serverseitig vor jeder VM-Erstellung geprueft.

Das ist wichtig, weil Benutzer URLs oder IDs manipulieren koennten. Deshalb darf Tenant-Sicherheit nie nur im Frontend passieren.

## Provisioning-Modell

Eine VM-Erstellung passiert nicht direkt im HTTP-Request.

Ablauf:

1. Benutzer erstellt im Portal eine VM.
2. API validiert Tenant, Paket, Eingaben und Tenant-Quota.
3. API legt `VmInstance` und `ProvisioningRequest` in PostgreSQL an.
4. API schiebt einen Job in Redis.
5. Worker holt den Job ab.
6. Worker ruft den Compute-Provider auf.
7. Provider ist entweder Mock oder Proxmox.
8. Status und Provider-Metadaten werden in der Datenbank gespeichert.

Standardmodus:

```env
PROVISIONING_MODE=queue
```

Fuer einfache lokale Tests kann inline genutzt werden:

```env
PROVISIONING_MODE=inline
```

Queue-Retries:

```env
PROVISIONING_RETRY_MAX=3
PROVISIONING_RETRY_INTERVALS=10,30,60
```

## Proxmox verwenden

Standardmaessig ist Proxmox deaktiviert:

```env
PROXMOX_ENABLED=false
```

Dann nutzt VM Builder den Mock-Provider. Das ist gut fuer UI, Auth, Tenants und Worker-Tests.

Fuer echtes Proxmox:

```env
PROXMOX_ENABLED=true
PROXMOX_BASE_URL=https://proxmox.example.com:8006/api2/json
PROXMOX_TOKEN_ID=root@pam!vm-builder
PROXMOX_TOKEN_SECRET=change-me
PROXMOX_VERIFY_TLS=true
PROXMOX_NODE=pve1
PROXMOX_TARGET_NODE=pve1
PROXMOX_TEMPLATE_VMID=9000
PROXMOX_STORAGE=local-lvm
PROXMOX_BRIDGE=vmbr0
PROXMOX_CLONE_MODE=full
PROXMOX_TEMPLATE_DISK_GB=20
```

Der aktuelle Proxmox-Adapter macht:

- Template-Clone von `PROXMOX_TEMPLATE_VMID`
- CPU setzen
- RAM setzen
- `net0` setzen
- optional Disk vergroessern
- Cloud-Init User setzen
- SSH-Key setzen
- DHCP setzen
- optional VM starten
- Task-Status pollen
- Start/Stop/Delete ueber API

Wichtig: Die Template-VM in Proxmox muss korrekt vorbereitet sein, idealerweise als Cloud-Init-Template.

## Proxmox API-Token und Rechte

VM Builder sollte nicht mit einem normalen Benutzerpasswort arbeiten, sondern mit einem Proxmox API-Token.

Empfohlener Ablauf auf Proxmox:

1. Einen dedizierten User anlegen, z.B. `vm-builder@pve` oder `vm-builder@pam`.
2. Fuer diesen User einen API-Token anlegen, z.B. `vm-builder`.
3. Token in `.env` eintragen.
4. Dem User bzw. Token nur die Rechte geben, die VM Builder wirklich braucht.

Token-Beispiel:

```env
PROXMOX_TOKEN_ID=vm-builder@pve!vm-builder
PROXMOX_TOKEN_SECRET=<token-secret>
```

Wenn du den Token im Proxmox-UI als "privilege separated" anlegst, muessen die Rechte explizit auch fuer den Token passen. Wenn du privilege separation deaktivierst, erbt der Token die Rechte des Users. Fuer Produktion ist ein sauber begrenzter Token sinnvoller.

### Welche Variablen welche Proxmox-Rechte brauchen

Diese Tabelle beschreibt, welche VM-Builder-Konfiguration welche Proxmox-Berechtigungen ausloest.

| VM Builder Einstellung | Was VM Builder macht | Typische Proxmox-Rechte |
| --- | --- | --- |
| `PROXMOX_TEMPLATE_VMID` | Template-VM klonen | `VM.Clone` auf der Template-VM |
| `PROXMOX_TARGET_NODE` | neue VM auf Zielnode erstellen | `VM.Allocate` auf dem Ziel-Pool oder Pfad |
| `PROXMOX_STORAGE` | Disk fuer Clone/Resize auf Storage anlegen | `Datastore.AllocateSpace` auf dem Storage |
| Paket-Auswahl im Portal | CPU/RAM/Disk der VM setzen | `VM.Config.CPU`, `VM.Config.Memory`, `VM.Config.Disk` |
| `PROXMOX_BRIDGE` | `net0` setzen | `VM.Config.Network` |
| Cloud-Init User und SSH-Key | Cloud-Init Optionen setzen | `VM.Config.Cloudinit` |
| `Start after create`, Start/Stop im Portal | VM starten/stoppen | `VM.PowerMgmt` |
| Delete im Portal | VM loeschen | `VM.Allocate` auf der VM bzw. dem relevanten Pfad |
| `PROXMOX_ENABLE_VM_FIREWALL` | VM-Firewall aktivieren | `VM.Config.Options` und je nach Proxmox-Version Firewall-Rechte auf VM-Ebene |
| `PROXMOX_DEFAULT_FIREWALL_GROUP` | Security Group als VM-Firewall-Regel setzen | Firewall-Administrationsrechte fuer VM/Datacenter-Firewall, typischerweise `Sys.Modify` bzw. passende Firewall-ACLs |
| `PROXMOX_NODE` / `PROXMOX_TARGET_NODE` Task-Polling | Taskstatus lesen | mindestens passende Audit-/Read-Rechte, in vielen Setups `Sys.Audit` auf Node oder Pfad |

Pragmatische Startrolle fuer Lab/Test:

```text
VM.Allocate
VM.Clone
VM.Config.CPU
VM.Config.Memory
VM.Config.Disk
VM.Config.Network
VM.Config.Cloudinit
VM.Config.Options
VM.PowerMgmt
Datastore.AllocateSpace
Sys.Audit
Sys.Modify
```

Fuer Produktion solltest du diese Rechte enger auf die betroffenen Pfade begrenzen:

- Template-VM: Clone-Recht nur auf das Template.
- Ziel-Pool oder Ziel-Pfad: VM-Allokation nur dort, wo VM Builder VMs erstellen darf.
- Storage: AllocateSpace nur auf dem vorgesehenen Storage.
- Node: Audit/Task-Leserechte nur auf dem Zielnode.
- Firewall: nur so weit wie noetig, damit die Standard-Security-Group angewendet werden kann.

Beispielhafte Pfade, je nach Proxmox-Setup:

```text
/vms/<template-vmid>        VM.Clone
/pool/<vm-builder-pool>     VM.Allocate, VM.Config.*, VM.PowerMgmt
/storage/<storage-name>     Datastore.AllocateSpace
/nodes/<node-name>          Sys.Audit
/                            Firewall-/Security-Group-Rechte, falls Datacenter-Firewall-Gruppen genutzt werden
```

Die exakten ACL-Pfade haengen davon ab, ob du mit Pools, einzelnen VMs, Storage-ACLs oder Datacenter-Rechten arbeitest.

## Proxmox Firewall-Guardrail

VM Builder kann automatisch eine Standard-Firewall-Policy auf jede neue VM anwenden.

Konfiguration:

```env
PROXMOX_ENABLE_VM_FIREWALL=true
PROXMOX_DEFAULT_FIREWALL_GROUP=vm-builder-default
```

Verhalten:

- Benutzer sehen diese Option nicht.
- Benutzer koennen sie nicht deaktivieren.
- Beim Provisioning wird die VM-Firewall aktiviert.
- Auf `net0` wird Firewall aktiviert.
- Die konfigurierte Proxmox Security Group wird als VM-Firewall-Regel hinzugefuegt.
- Admins koennen in VM Builder sehen, welche Guardrail angewendet wurde.

Wichtig: Die Security Group muss in Proxmox bereits existieren. Wenn `PROXMOX_DEFAULT_FIREWALL_GROUP=vm-builder-default` gesetzt ist, muss diese Gruppe in Proxmox vorhanden sein.

Gedachter Zweck:

- Standard-Inbound-Regeln erzwingen
- SSH/Management kontrollieren
- Tenant-Sicherheit vorbereiten
- Benutzer sollen keine unsicheren Firewall-Ausnahmen im Self-Service setzen

## Netzwerkmodell

Im aktuellen User-Flow ist Netzwerk bewusst nicht frei waehlbar.

Benutzer duerfen nicht setzen:

- Bridge
- VLAN
- IP-Modus
- statische IP
- Firewall-Gruppe

Stattdessen gilt:

- Standard-Bridge kommt aus `PROXMOX_BRIDGE`.
- DHCP ist der Default fuer neue VMs.
- Firewall-Guardrail kommt aus `PROXMOX_DEFAULT_FIREWALL_GROUP`.
- Spaetere Tenant-Netzwerke koennen daraus als Admin-/Provider-Modell entstehen.

Langfristig ist OPNsense als separater Network-Provider vorgesehen. Dann kann VM Builder z.B. Tenant-Netze, VLANs und Firewall-Regeln zentral verwalten, ohne diese Optionen direkt an normale Benutzer auszuliefern.

## Datenbank und Migrationen

Die API verwendet Alembic.

Beim API-Start:

- wird das Schema auf bekannten Stand geprueft
- frische Datenbanken werden migriert
- bestehende Datenbanken auf `head` werden nicht unnoetig migriert
- Admin und Default-Templates werden geseedet

Die aktuelle Revision steht in:

```text
apps/api/alembic/versions/
```

## Backups

Mindestens PostgreSQL sichern.

Beispiel:

```bash
docker-compose exec -T db pg_dump -U vm_builder vm_builder > vm_builder_backup.sql
```

Restore-Beispiel:

```bash
cat vm_builder_backup.sql | docker-compose exec -T db psql -U vm_builder -d vm_builder
```

Zusaetzlich sichern:

- `.env`
- `infra/proxy/certs/`, falls das Self-Signed-Zertifikat beibehalten werden soll

Keine Proxmox-API-Tokens oder Secrets in Git committen.

## Sicherheitshinweise

Vor produktiver Nutzung:

- `APP_SECRET_KEY` ersetzen.
- `APP_ADMIN_PASSWORD` ersetzen.
- PostgreSQL-Passwort ersetzen.
- Proxmox API-Token mit minimal noetigen Rechten verwenden.
- HTTPS-Zertifikat sauber vertrauen oder durch ein echtes Zertifikat ersetzen.
- Backups einrichten.
- Zugriff auf Port `5432` pruefen. Fuer Produktion sollte PostgreSQL nicht offen ins Netz zeigen.
- `.env` nicht committen.

## Troubleshooting

Healthcheck liefert `502 Bad Gateway`

- API ist noch nicht bereit oder abgestuerzt.
- Pruefen:

```bash
docker-compose logs --tail=100 api
docker-compose ps
```

Worker verarbeitet Jobs nicht

- Worker-Logs pruefen:

```bash
docker-compose logs -f worker
```

- Redis pruefen:

```bash
docker-compose ps redis
```

Frontend zeigt alte Version

- Web neu bauen und Container frisch starten:

```bash
docker-compose build web
docker-compose rm -sf web
docker-compose up -d web
```

Legacy Compose `ContainerConfig` Fehler

- Betroffenen Container entfernen und neu starten:

```bash
docker-compose rm -sf api web worker
docker-compose up -d api worker web
```

Proxmox Provisioning schlaegt fehl

- `PROXMOX_ENABLED=true` gesetzt?
- API-Token korrekt?
- `PROXMOX_BASE_URL` endet auf `/api2/json`?
- Template-VMID korrekt?
- Zielnode korrekt?
- Storage vorhanden?
- Firewall-Gruppe vorhanden, falls `PROXMOX_DEFAULT_FIREWALL_GROUP` gesetzt ist?
- Worker-Logs lesen:

```bash
docker-compose logs -f worker
```

Fehlgeschlagenen Job erneut starten

- Im Portal als Admin auf `Admin`.
- Bereich `Provisioning failures`.
- `Requeue` klicken.

## Repo-Struktur

```text
apps/
  api/      FastAPI Backend, Modelle, Provider, Worker, Alembic
  web/      React/Vite Frontend
docs/       Architektur- und Betriebsnotizen
infra/
  proxy/    HTTPS-Reverse-Proxy, Zertifikats-Bootstrap
docker-compose.yml
.env.example
README.md
```

## Aktuelle Grenzen

- LDAP/AD Login ist implementiert, muss aber gegen eure echte Directory-Struktur getestet werden.
- OPNsense ist als zukuenftiger Network-Provider vorgesehen, aber noch nicht angebunden.
- VM-Pakete sind als Datenbank- und Admin-Ressource umgesetzt, aber noch ohne Loesch-/Archivierungsworkflow.
- Echte Proxmox-Ausfuehrung muss mit realem Cluster und echten Tokens getestet werden.
- Quotas sind als Tenant-Hard-Limits umgesetzt, aber noch ohne Usage-Dashboard, Reservation-Locking und Billing-Integration.
- Billing, Snapshots, Backups und Console-Access sind noch nicht umgesetzt.

## Naechste sinnvolle Schritte

- Quota-Usage im Admin-UI sichtbar machen und bei parallelen Create-Requests mit DB-Locks absichern.
- Proxmox-Templates im Admin-UI pflegbar machen.
- Network-/Firewall-Profile als Admin-Ressource modellieren.
- OPNsense-Provider fuer Tenant-Netze vorbereiten.
- LDAP/AD Login und Gruppenmapping aktivieren.
- Produktions-Deployment haerten: Secrets, Backups, Monitoring, echtes TLS.
