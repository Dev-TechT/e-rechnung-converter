# E-Rechnung Studio

Local-first Produkt für Rechnung -> E-Rechnungs-Zielformate wie XRechnung UBL, XRechnung CII, ZUGFeRD PDF/A-3, Factur-X PDF/A-3 und generisches EN16931 UBL.

Status: Produktaufbau, noch nicht rechts-/produktionsfertig ohne offizielle lokale Validatoren. Die Browser-App erzeugt XRechnung UBL, XRechnung CII, generisches EN16931 UBL sowie XML-Vorbereitungspakete für ZUGFeRD/Factur-X. Die lokale Python-CLI erzeugt derzeit aus strukturierten JSON/CSV-Eingaben einen XRechnung-UBL-Kandidaten und zeigt Validierungspläne für weitere Formate.

## Warum greenfield

- Es gibt gute Bausteine, aber kein reifes OSS-Komplettprodukt für beliebige PDF/DOC/DOCX/TXT/CSV/XML -> valide XRechnung.
- PDF/DOC sind semantisch unsicher; echte Produkt-UX braucht Human-in-the-loop statt "magisch immer korrekt".
- Local-first ist der DSGVO- und Verkaufshebel.

## Browser-App lokal starten

```bash
cd /home/neon/xrechnung-converter
python3 -m http.server 8124 --bind 127.0.0.1
# öffnen: http://127.0.0.1:8124/web/
```

Die Browser-App nutzt keine Datenbank, keine Cookies und keine Server-Uploads. TXT/CSV/XML können lokal im Browser-Tab eingelesen werden. PDF/DOC/DOCX werden aktuell nicht im Browser extrahiert; dafür ist ein lokales Desktop/CLI-Modul mit Sichtprüfung geplant.

Pflichtfelder sind mit `*` markiert; fehlt eines davon, wird nicht konvertiert. Dazu zählen Leitweg-ID, IBAN/Bankdaten, Zahlungsbedingungen, Rechnungssteller-E-Mail/Endpoint-ID, Seller Identifier, Auftragsnummer/Bestellreferenz und Positionsdaten. Für andere Agenten/LLMs gibt es `window.XInvoice.convertForAgent(invoice, formatId)` mit strukturierten Fehlern oder Artefakten plus Browser-Validierungsbericht.

## KoSIT beziehen

KoSIT braucht zwei Downloads: Validator + XRechnung-Konfiguration.

```bash
mkdir -p tools/kosit
cd tools/kosit
curl -L https://github.com/itplr-kosit/validator/releases/download/v1.6.2/validator-1.6.2-standalone.jar \
  -o validator-1.6.2-standalone.jar
curl -L https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-01-31/xrechnung-3.0.2-validator-configuration-2026-01-31.zip \
  -o xrechnung-3.0.2-validator-configuration-2026-01-31.zip
unzip xrechnung-3.0.2-validator-configuration-2026-01-31.zip -d xrechnung-config
```

Optional für Vorschau/Visualisierung:

```bash
curl -L https://github.com/itplr-kosit/xrechnung-visualization/releases/download/v2026-01-31/xrechnung-3.0.2-visualization-2026-01-31.zip \
  -o xrechnung-3.0.2-visualization-2026-01-31.zip
```

Quellen:
- https://github.com/itplr-kosit/validator
- https://github.com/itplr-kosit/validator-configuration-xrechnung
- https://github.com/itplr-kosit/xrechnung-visualization

## CLI-Schnellstart

```bash
cd /home/neon/xrechnung-converter
. .venv/bin/activate
xrechnung-converter examples/minimal-invoice.json -o out/minimal-invoice.xml --output-format xrechnung-ubl
```

Format-/Validierungsplan anzeigen:

```bash
xrechnung-converter --output-format factur-x-pdf --print-validation-plan
xrechnung-converter --output-format zugferd-pdf --print-validation-plan
xrechnung-converter --output-format xrechnung-cii --print-validation-plan
```

Offizielle Validierung, sobald KoSIT lokal liegt:

```bash
xrechnung-converter examples/minimal-invoice.json -o out/minimal-invoice.xml \
  --kosit-validator tools/kosit/validator-1.6.2-standalone.jar \
  --kosit-scenarios tools/kosit/xrechnung-config/scenarios.xml \
  --report-dir reports/validation
```

## Tests

```bash
cd /home/neon/xrechnung-converter
. .venv/bin/activate
pytest -q
node tests/webapp.test.js
```

## Wichtige Klarstellung

- XRechnung UBL/CII und generisches UBL sind XML-Dateien.
- ZUGFeRD und Factur-X sind PDF/A-3-Dateien mit eingebettetem CII-XML; die Browser-App erzeugt dafür nur ein lokales Vorbereitungspaket, kein Fake-PDF.
- XSL/XSLT ist nur für Visualisierung/Transformation, z.B. KoSIT xrechnung-visualization.
- Für echte Einreichung muss jede erzeugte XRechnung-XML mit KoSIT validator + validator-configuration-xrechnung validiert werden.
- Für echte Einreichung muss jedes ZUGFeRD/Factur-X-PDF zusätzlich mit Mustangproject und veraPDF lokal validiert werden.
- Upload ins Internet ist technisch nicht nötig; local-first ist der Default.
