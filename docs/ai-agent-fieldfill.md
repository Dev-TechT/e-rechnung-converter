# AI-Agent-Feldbefüllung für E-Rechnung Studio

Ziel: Ein AI-Agent wie Hermes soll Rechnungsquellen analysieren und XRechnung-/E-Rechnung-Felder vollständig als prüfbare Vorschläge befüllen können — ohne Frontend-API-Schlüssel und ohne automatische finale Rechnungsfreigabe.

## Grundregeln

- Keine API-Keys im Browser.
- Keine Secrets in GitHub Pages.
- Keine Frontend-Secret-Lösung.
- Keine automatische finale Rechnung durch AI.
- Jeder Vorschlag braucht Wert, Quelle/Zitat, Confidence und Review-Status.
- Der Request enthält für jedes bekannte Feld Zweck, BT/BG-Zuordnung, Pflicht-/Empfehlungsstatus und konkrete Ausfüllhilfe; Agenten müssen diese Hilfen beachten.
- Wenn ein Wert nicht sicher aus der Quelle bestimmbar ist, muss der Agent `cannotDetermine` liefern.

## Unterstützte Verbindungsmodi

### hermes-copy-paste

Die App erzeugt einen JSON-Request und einen Prompt für Hermes. Der Nutzer übergibt beides manuell an Hermes, z.B. über Telegram oder CLI. Hermes antwortet ausschließlich mit JSON. Die App importiert diese JSON-Antwort und zeigt die Felder als Review-Vorschläge.

Dieser Modus braucht keinen lokalen Server, keine API-Verbindung und keinen API-Key.

### local-hermes-bridge

Ein Lokaler Hermes-Bridge-Service läuft auf dem Rechner des Nutzers, z.B. unter:

`http://127.0.0.1:<port>`

Die Browser-App spricht nur mit diesem lokalen Dienst. Der Dienst übergibt die Aufgabe an Hermes, z.B. per:

- `hermes chat -q`,
- lokaler Hermes API/Gateway-Adapter,
- stdin/stdout-Bridge,
- oder später kontrolliertem lokalen Agent-Workflow.

Secrets bleiben ausschließlich in Hermes, KeePassXC oder einem zugelassenen lokalen Secret Store. Die Web-App speichert keine Zugangsdaten.

### secure-inbox-outbox

Für eine Online-Version wird kein Frontend-Key verwendet. Stattdessen gibt es ein sicheres Inbox/Outbox-Protokoll:

1. Die App erzeugt einen Job mit Job-ID, Nonce, Ablaufzeit, Zielformat und Dokumentart.
2. Die Quelle wird in eine gesicherte Inbox gelegt.
3. Hermes oder ein autorisierter Agent holt den Job aktiv ab.
4. Der Agent schreibt das Ergebnis als JSON in eine Outbox.
5. Die App importiert die Antwort als Review-Vorschläge.

Mögliche Transportvarianten:

- IMAP/SMTP-artig mit dediziertem Postfach, PGP/S/MIME-verschlüsselten Anhängen und Job-ID im Header/Betreff.
- WebDAV/Nextcloud-artig mit verschlüsseltem Job-Ordner.
- Hermes-Gateway-kompatibel über autorisierte Accounts/Kanäle.
- Webhook mit mTLS oder kurzlebigem Einmal-Link, falls später ein Server nötig wird.

## Request-Vertrag

```json
{
  "task": "fill_xrechnung_invoice_fields",
  "version": "2026-05-18",
  "locale": "de-DE",
  "targetFormat": "xrechnung-cii",
  "documentKind": "pdf_text",
  "transport": "hermes-copy-paste",
  "sourceText": "...",
  "existingFields": {},
  "requiredFields": [],
  "fieldCatalog": [],
  "recommendedFields": [],
  "rules": {
    "doNotInvent": true,
    "returnOnlyJson": true,
    "humanReviewRequired": true,
    "markUncertainFields": true,
    "sourceRequiredPerField": true,
    "confidenceRequiredPerField": true
  },
  "connectionPolicy": {
    "noApiKeyInBrowser": true,
    "secretsInFrontend": false
  }
}
```

## Response-Vertrag

```json
{
  "ok": true,
  "fields": {
    "invoiceNumber": {
      "value": "2026-021",
      "confidence": 0.98,
      "source": "Rechnungsnummer 2026-021",
      "reviewRequired": false
    }
  },
  "missingRequired": ["sellerTelephone"],
  "warnings": ["Telefon nicht gefunden"],
  "cannotDetermine": [
    {
      "field": "sellerTelephone",
      "reason": "Nicht in Quelle gefunden"
    }
  ]
}
```

## Sicherheitsmodell

- Job-ID: eindeutige Zuordnung zwischen Anfrage und Antwort.
- Nonce: verhindert Wiederverwendung alter Antworten.
- Ablaufzeit: begrenzt Gültigkeit der Aufgabe.
- Signatur oder autorisierter Kanal: stellt sicher, dass die Antwort vom richtigen Agent stammt.
- Optional Ende-zu-Ende-Verschlüsselung für Dokument und Resultat.
- Human Review bleibt Pflicht vor Export.

## Status

Phase 1 definiert Schema und Runtime-Hilfsfunktionen:

- `web/ai-agent-schema.js`
- `getAgentFieldFillSchema()`
- `buildAgentFieldFillRequest()`
- `validateAgentFieldFillResponse()`

Weitere Phasen bauen darauf auf: Prompt-Export/Import, lokaler Hermes-Bridge-Service und sichere Online-Inbox/Outbox.
