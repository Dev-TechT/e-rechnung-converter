# XRechnung Converter MVP

Local-first Prototyp für Rechnung -> E-Rechnungs-Zielformate wie XRechnung UBL, XRechnung CII, ZUGFeRD PDF/A-3, Factur-X PDF/A-3 und generisches UBL.

Status: MVP/Spike, nicht produktionsreif. Die lokale Python-CLI erzeugt derzeit aus strukturierten JSON/CSV-Eingaben einen XRechnung-UBL-Kandidaten und zeigt für weitere Formate Validierungspläne. Die Browser-App erzeugt zusätzlich XRechnung CII, generisches EN16931 UBL sowie XML-Vorbereitungspakete für ZUGFeRD/Factur-X. Offizielle KoSIT-/Mustang-/veraPDF-Validierung muss mit lokalen Artefakten gepinnt und ausgeführt werden.

Warum greenfield:
- Es gibt gute Bausteine, aber kein reifes OSS-Komplettprodukt für beliebige PDF/DOC/DOCX/TXT/CSV/XML -> valide XRechnung.
- PDF/DOC sind semantisch unsicher; echte Produkt-UX braucht Human-in-the-loop statt "magisch immer korrekt".
- Local-first ist der DSGVO- und Verkaufshebel.

Schnellstart:

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

Statische Browser-Demo:

```bash
cd /home/neon/xrechnung-converter
python3 -m http.server 8124 --bind 127.0.0.1
# öffnen: http://127.0.0.1:8124/web/
```

Die Browser-App nutzt keine Datenbank, keine Cookies und keine Uploads. Sie erzeugt aktuell XRechnung UBL, XRechnung CII, generisches EN16931 UBL sowie XML-Vorbereitungspakete für ZUGFeRD/Factur-X. Pflichtfelder sind mit `*` markiert; fehlt eines davon, wird nicht konvertiert. Dazu zählen Leitweg-ID, IBAN/Bankdaten, Zahlungsbedingungen, Rechnungssteller-E-Mail/Endpoint-ID, Seller Identifier, Auftragsnummer/Bestellreferenz und Positionsdaten. Für andere Agenten/LLMs gibt es `window.XInvoice.convertForAgent(invoice, formatId)` mit strukturierten Fehlern oder Artefakten plus Browser-Validierungsbericht.

Tests:

```bash
cd /home/neon/xrechnung-converter
. .venv/bin/activate
pytest -q
```

Offizielle Validierung:

```bash
# Beispiel, sobald Artefakte lokal liegen:
xrechnung-converter examples/minimal-invoice.json -o out/minimal-invoice.xml \
  --kosit-validator /opt/kosit/validator-1.6.2-standalone.jar \
  --kosit-scenarios /opt/kosit/xrechnung-3.0.2-validator-configuration-2026-01-31/scenarios.xml \
  --report-dir reports/validation
```

Wichtige Klarstellung:
- XRechnung UBL/CII und generisches UBL sind XML-Dateien.
- ZUGFeRD und Factur-X sind PDF/A-3-Dateien mit eingebettetem CII-XML.
- XSL/XSLT ist nur für Visualisierung/Transformation, z.B. KoSIT xrechnung-visualization.
- Für Produktion muss jede erzeugte XRechnung-XML mit KoSIT validator + validator-configuration-xrechnung validiert werden.
- Für Produktion muss jedes ZUGFeRD/Factur-X-PDF zusätzlich mit Mustangproject und veraPDF lokal validiert werden.
- Upload ins Internet ist technisch nicht nötig; local-first ist der Default.
