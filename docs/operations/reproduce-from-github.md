# Reproduce From GitHub

This project is intended to run from source with Docker Compose. Local databases, build outputs, certificates, Python egg metadata, and `node_modules` are intentionally ignored.

## Fresh Machine

```bash
git clone <repo-url> vm-builder
cd vm-builder
cp .env.example .env
```

Edit `.env` before first real use:

- replace `APP_SECRET_KEY`
- replace `APP_ADMIN_PASSWORD`
- replace `POSTGRES_PASSWORD` and update `DATABASE_URL` to match
- set `PROXY_HOST` and `APP_CORS_ORIGINS` for the new machine
- keep `PROXMOX_ENABLED=false` for UI/API testing without a real cluster

Start:

```bash
docker-compose up -d --build
```

Check:

```bash
curl -k https://<host>:4000/health
```

## LDAP

To enable LDAP:

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

Use semicolons when listing full DNs because DNs contain commas. Short group names without commas can be comma-separated.

## Proxmox

Only enable Proxmox after the mock flow is verified:

```env
PROXMOX_ENABLED=true
PROXMOX_BASE_URL=https://pve.example.internal:8006/api2/json
PROXMOX_TOKEN_ID=vm-builder@pve!vm-builder
PROXMOX_TOKEN_SECRET=<token-secret>
PROXMOX_NODE=pve1
PROXMOX_TARGET_NODE=pve1
PROXMOX_TEMPLATE_VMID=9000
PROXMOX_STORAGE=local-lvm
PROXMOX_BRIDGE=vmbr0
```

Run a controlled create/start/stop/delete test against one disposable VM before allowing users in.

