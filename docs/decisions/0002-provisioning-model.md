# ADR 0002: Provisioning Request First

## Decision

- Eine VM-Anlage erzeugt im MVP zuerst einen `ProvisioningRequest`.
- Der erste Compute-Provider ist ein Mock, der die Proxmox-Grenze simuliert.
- Echte Infrastruktur-Aenderungen werden erst ueber einen spaeteren Worker oder Adapter ausgefuehrt.

## Rationale

- Das Datenmodell fuer Status, Audit und Fehlerfaelle wird frueh stabil.
- Proxmox kann spaeter eingebaut werden, ohne die Portal-Domaene neu zu schneiden.
- Risiken durch vorschnelle Infrastruktur-Automation werden reduziert.

