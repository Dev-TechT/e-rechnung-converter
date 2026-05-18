# DSGVO- und Monetarisierungsnotizen

Datum: 2026-05-18

## Positionierung

Privacy-first E-Rechnungs-Tool für Deutschland/EU.

Default: Local-first/offline. Rechnungsdaten verlassen das Gerät standardmäßig nicht.

Optional später: Self-hosted/API/SaaS für Teams, Steuerberater und ERP-Anbieter.

## DSGVO-Ansatz

### Local-first MVP

- Keine Uploads im Standard.
- Keine Cloud-Verarbeitung im Standard.
- Telemetrie aus oder strikt anonym/deaktivierbar.
- Temporäre Dateien lokal und löschbar.
- Support-Upload nur mit expliziter Zustimmung.
- Audit-Logs ohne vollständige Rechnungsinhalte; Hashes statt Rohdaten.

### SaaS/API später

Dann sind wir typischerweise Auftragsverarbeiter und brauchen:

- AVV/DPA nach Art. 28 DSGVO.
- EU-/Deutschland-Hosting bevorzugt.
- TLS, Verschlüsselung at rest, Mandantentrennung.
- RBAC/MFA für Admins.
- Subprozessorenliste.
- Löschkonzept und Retention.
- No-training-policy für OCR/KI.
- Incident-Prozess.
- TOMs und Verarbeitungstätigkeiten.

## Claims, die wir vermeiden

Nicht sagen:

- "100% DSGVO-konform"
- "rechtssicher garantiert"
- "GoBD-konform garantiert"
- "jede PDF wird automatisch korrekt konvertiert"
- "ersetzt Steuerberater/Rechtsberatung"

Besser:

- "Datenschutzfreundlich durch lokale Verarbeitung"
- "Rechnungsdaten verlassen Ihr Gerät standardmäßig nicht"
- "Unterstützt XRechnung/EN16931-Validierung mit lokalem KoSIT-Validator"
- "Hilft bei der Erstellung strukturierter E-Rechnungen; finale Prüfung bleibt beim Nutzer"
- "AVV für Cloud-/API-Verarbeitung verfügbar" nur wenn wirklich vorhanden.

## Monetarisierung

### Startmodell

1. Free
   - Viewer/Validator
   - wenige Konvertierungen/Monat oder nur manuelle Einzelrechnung

2. Pro lokal
   - 49-149 EUR/Jahr pro Nutzer
   - Batch, Vorlagen, Validierungsreports, Exportprofile

3. Team/KMU
   - 19-49 EUR/Nutzer/Monat oder 49-199 EUR/Firma/Monat
   - Mandanten, Rollen, Audit-Logs, zentrale Templates

4. API/Self-hosted
   - 99-499 EUR/Monat plus Volumenpreis
   - Webhooks, ERP-Integration, Mandantenfähigkeit

5. Enterprise/On-Prem
   - 2.000-20.000 EUR/Jahr
   - Installation, SLA, Support, Custom Mappings

## Zielkunden

- Selbstständige/KMU mit Word/Excel/PDF-Rechnungen.
- Steuerberater/Buchhaltungsbüros mit vielen kleinen Mandanten.
- Handwerker, Agenturen, Berater, Vereine.
- ERP-/Nischen-Softwareanbieter, die eine API brauchen.

## Hauptrisiken

- Falsche OCR/PDF-Extraktion -> falsche Steuer-/Betragsdaten.
- Standards ändern sich; KoSIT-Versionen müssen gepflegt werden.
- SaaS erhöht Security-/AVV-Aufwand deutlich.
- Archivierung wäre ein separates GoBD-nahes Produkt, nicht MVP.
