# Local Development

## Start

```bash
cp .env.example .env
docker compose up --build
```

Das lokale Default-Setup startet `proxy`, `web`, `api`, `worker`, `redis` und `db`.

## Migrationen

```bash
cd apps/api
.venv/bin/alembic upgrade head
```

Die API fuehrt diese Migrationen beim Start ebenfalls automatisch aus.

## Provisioning-Modus

- Default: `PROVISIONING_MODE=queue`
- Queue-Modus braucht `redis` und `worker`
- Fuer einfaches Debugging kann `PROVISIONING_MODE=inline` gesetzt werden

## Endpoints

- Portal: `http://localhost:8080`
- API health: `http://localhost:8080/health`
- API base: `http://localhost:8080/api`

## VM Request Fields

Der `POST /api/vms`-Pfad akzeptiert neben den Pflichtfeldern auch optionale Provisioning-Daten:

- `cpu_cores`
- `memory_mb`
- `disk_gb`
- `start_on_create`
- `cloud_init_user`
- `ssh_public_key`
- `network_bridge`
- `vlan_tag`
- `ip_config_mode`
- `ipv4_address`
- `ipv4_gateway`

## Bootstrap Admin

- E-Mail: Wert aus `APP_ADMIN_EMAIL`
- Passwort: Wert aus `APP_ADMIN_PASSWORD`

## Naechste betriebliche Themen

- Secrets sicher auslagern
- Logging und Monitoring standardisieren
- Proxmox-Zugangsdaten getrennt pro Umgebung verwalten
- Worker-Metriken und Job-Retry-Strategie festziehen
