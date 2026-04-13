# VM Builder

VM Builder ist ein Self-Service-Portal fuer virtuelle Maschinen mit Fokus auf sauberer Tenant-Trennung, Proxmox-Integration und spaeterer Netzwerkisolation ueber OPNsense.

## Enthaltenes MVP

- React/Vite-Frontend fuer Login, VM-Uebersicht, VM-Anlage und einfache Admin-Seiten
- FastAPI-Backend mit RBAC, Tenants, Provisioning Requests und Audit Events
- PostgreSQL als Datenbank
- Redis und Worker fuer asynchrones Provisioning
- Docker Compose mit `proxy`, `web`, `api`, `worker`, `redis` und `db`
- vorbereitete Adapter fuer lokales Auth, spaeter LDAP/AD, Proxmox und OPNsense
- Queue-Jobs mit Retry-Strategie und Admin-Requeue fuer fehlgeschlagene Requests

## Schnellstart

1. `.env.example` nach `.env` kopieren und Werte setzen.
2. `docker compose up --build` im Repo-Root starten.
3. Portal unter `http://localhost:8080` oeffnen.
4. Login mit `APP_ADMIN_EMAIL` und `APP_ADMIN_PASSWORD`.
5. API-Healthcheck unter `http://localhost:8080/health`.

Beim API-Start werden Alembic-Migrationen automatisch bis `head` ausgefuehrt.
Im Standard-Setup arbeitet die VM-Anlage asynchron ueber `redis` und `worker`.

## Kernprinzipien

- Das Backend erzwingt Besitz- und Tenant-Filterung.
- VM-Erstellung erzeugt im MVP einen nachvollziehbaren Provisioning-Request statt sofort blind Infrastruktur zu aendern.
- Die API nimmt VM-Requests an, der Worker fuehrt Provisioning getrennt vom HTTP-Request aus.
- Fehlgeschlagene Jobs koennen ueber den Admin-Pfad erneut in die Queue gelegt werden.
- Provider-Anbindungen bleiben gekapselt, damit Proxmox und OPNsense spaeter ohne Domainedits integriert werden koennen.

## Proxmox vorbereiten

- Standardmaessig bleibt der Mock-Provider aktiv.
- Fuer echten Proxmox-Clone `PROXMOX_ENABLED=true` setzen.
- Zusaetzlich mindestens diese Variablen korrekt belegen:
  - `PROXMOX_BASE_URL`
  - `PROXMOX_TOKEN_ID`
  - `PROXMOX_TOKEN_SECRET`
  - `PROXMOX_NODE`
  - `PROXMOX_TARGET_NODE`
  - `PROXMOX_TEMPLATE_VMID`
- Der aktuelle Adapter klont eine bestehende Proxmox-Template-VM ueber API-Token-Auth und schreibt die Provider-VM-ID in die Plattformdatenbank.
- Der Adapter pollt den Proxmox-Task bis `OK` oder Timeout und markiert den Request entsprechend.
- Die VM-Anlage kann jetzt optional CPU, RAM, Disk, Startverhalten, Bridge, VLAN und einfache Cloud-Init/IP-Daten uebergeben.
- Fuer lokale Entwicklung kann `PROVISIONING_MODE=inline` gesetzt werden, um den Worker-Pfad zu umgehen.
- Queue-Retries werden ueber `PROVISIONING_RETRY_MAX` und `PROVISIONING_RETRY_INTERVALS` gesteuert.
- Fehlgeschlagene Requests lassen sich ueber `POST /api/admin/provisioning-requests/{id}/requeue` erneut anstossen.
