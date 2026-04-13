# ADR 0001: Auth and Tenancy Baseline

## Decision

- Lokale Accounts sind im MVP sofort aktiv.
- LDAP/AD wird nicht hart eingebaut, aber ueber eine eigene Provider-Schicht vorbereitet.
- Sichtbarkeit wird im Backend ueber Rollen und Tenant-Mitgliedschaften erzwungen.

## Rationale

- Das reduziert initiale Komplexitaet.
- Die Plattform bleibt spaeter anschlussfaehig fuer Unternehmens-Identitaeten.
- Tenant-Schutz ist ein serverseitiges Sicherheitsmerkmal und darf nicht nur im Frontend liegen.

