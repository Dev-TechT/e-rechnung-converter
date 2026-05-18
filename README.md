# xrechnung-converter

Local-first Produkt für Rechnung -> E-Rechnungs-Zielformate wie XRechnung UBL, XRechnung CII, ZUGFeRD PDF/A-3, Factur-X PDF/A-3 und generisches EN16931 UBL.

Status: Produktaufbau, noch nicht rechts-/produktionsfertig ohne offizielle lokale Validatoren. Die Browser-App erzeugt XRechnung UBL, XRechnung CII, generisches EN16931 UBL sowie XML-Vorbereitungspakete für ZUGFeRD/Factur-X. Die lokale Python-CLI erzeugt aus strukturierten JSON/CSV-Eingaben XRechnung-UBL und kann den KoSIT Validator lokal ausführen.

## Warum greenfield

- XRechnung ist XML, nicht PDF.
- ZUGFeRD/Factur-X brauchen PDF/A-3 + eingebettetes XML + separate Validatoren.
- Local-first ist der DSGVO- und Verkaufshebel.

## Browser-App lokal starten

```bash
cd /home/neon/xrechnung-converter
python3 -m http.server 8124 --bind 127.0.0.1
# öffnen: http://127.0.0.1:8124/web/
```

Die Browser-App nutzt keine Datenbank, keine Cookies und keine Server-Uploads. GitHub Pages hostet nur statische Dateien; Generierung, Browser-Sanity-Checks und lokale Dateiauswertung laufen auf der Hardware des Benutzers. TXT/CSV/XML können lokal im Browser-Tab eingelesen werden. PDFs mit einfachem eingebettetem Text werden lokal als prüfpflichtige Vorschläge ausgelesen; Scan-/Bild-PDFs sind damit keine OCR und brauchen weiter eine geprüfte lokale OCR-Engine. DOC/DOCX brauchen ebenfalls eine geprüfte lokale Engine oder ein Desktop/CLI-Modul mit Sichtprüfung.

Der Browser lädt zusätzlich einen aus dem offiziellen XRechnung-CIUS-Modell generierten Feldkatalog (`web/xrechnung-field-catalog.js`). Dieser Katalog wird nicht als sichtbare Leseliste angezeigt, sondern im Hintergrund an die bestehenden Formularfelder gebunden (`data-bt`, `data-bg`, Tooltips und Agenten-API). So bleiben Nutzer im Formularfluss, während Tests und Agenten die XRechnung-Zuordnung maschinenlesbar nutzen können.

Pflichtfelder sind mit `*` markiert; fehlt eines davon, wird nicht konvertiert. Dazu zählen Leitweg-ID, IBAN/Bankdaten, Zahlungsbedingungen, Rechnungssteller-E-Mail/Endpoint-ID, Rechnungssteller-Telefon für XRechnung-Kontaktangaben, Seller Identifier, Auftragsnummer/Bestellreferenz und Positionsdaten. Für andere Agenten/LLMs gibt es `window.XInvoice.convertForAgent(invoice, formatId)` mit strukturierten Fehlern oder Artefakten plus Browser-Validierungsbericht. Zusätzlich stehen `window.XInvoice.getXRechnungFieldCatalog()`, `window.XInvoice.getFormFieldBindings()` und `window.XInvoice.applyXRechnungFieldMetadata(document)` für Feldzuordnung und Formularfüllung bereit.

## KoSIT lokal bootstrappen

Wiederholbarer Bootstrap, inklusive robuster Download-Prüfung, Entpacken der XRechnung-Konfiguration und Manifest:

```bash
cd /home/neon/xrechnung-converter
. .venv/bin/activate
python3 scripts/bootstrap_validators.py --include-visualization
```

Ergebnis liegt unter `tools/kosit/`:

- `validator-1.6.2-standalone.jar`
- `xrechnung-config/scenarios.xml`
- optional `xrechnung-visualization/`
- `manifest.json` mit Versionen, Pfaden, Quell-URLs und SHA-256-Werten

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

Format-Pläne ansehen:

```bash
xrechnung-converter --output-format factur-x-pdf --print-validation-plan
xrechnung-converter --output-format zugferd-pdf --print-validation-plan
xrechnung-converter --output-format xrechnung-cii --print-validation-plan
```

Offizielle lokale KoSIT-Validierung:

```bash
xrechnung-converter examples/minimal-invoice.json -o out/minimal-invoice.xml \
  --kosit-validator tools/kosit/validator-1.6.2-standalone.jar \
  --kosit-scenarios tools/kosit/xrechnung-config/scenarios.xml \
  --report-dir reports/validation
```

Der CLI-JSON-Output enthält `ok`, `engine`, `report_path`, `errors` und `warnings`. `ok: true` bedeutet: der KoSIT-Prozess hat für dieses konkrete XML erfolgreich beendet; den erzeugten Prüfbericht trotzdem mitliefern/archivieren.

## Tests

```bash
cd /home/neon/xrechnung-converter
. .venv/bin/activate
python3 -m pytest -q
node tests/webapp.test.js
```

## Formatgrenzen

- XRechnung UBL/CII und generisches UBL sind XML-Dateien.
- ZUGFeRD und Factur-X sind PDF/A-3-Dateien mit eingebettetem CII-XML; die Browser-App erzeugt dafür nur ein lokales Vorbereitungspaket, kein Fake-PDF.
- XSL/XSLT ist nur für Visualisierung/Transformation, z.B. KoSIT xrechnung-visualization.
- Für echte Einreichung muss jede erzeugte XRechnung-XML mit KoSIT validator + validator-configuration-xrechnung validiert werden.
- Für echte Einreichung muss jedes ZUGFeRD/Factur-X-PDF zusätzlich mit Mustangproject und veraPDF lokal validiert werden.
- Upload ins Internet ist technisch nicht nötig; local-first ist der Default.

## Browser statt Server?

Generierung und einfache Browser-Sanity-Checks können im Browser des Benutzers laufen und tun das bereits. GitHub Pages ist dafür nur statisches Hosting: HTML, CSS und JavaScript werden ausgeliefert, aber kein Dev-TechT-Server verarbeitet Rechnungen. Ein lokaler Server ist dafür nicht zwingend nötig; eine statische Seite, PWA oder Desktop-Shell reicht.

PDF-Erkennung kann ebenfalls teilweise auf der Hardware des Benutzers laufen: die Browser-App liest jetzt einfachen eingebetteten PDF-Text lokal als Vorschläge aus. Das ist keine OCR und keine semantische Garantie. Scan-/Bild-PDFs sowie DOC/DOCX dürfen weiterhin keine Werte raten; sie brauchen eine geprüfte lokale OCR/Dokument-Engine oder ein Desktop/CLI-Modul und Human Review.

Die offizielle KoSIT-Validierung ist heute aber ein Java-Validator plus XRechnung-Konfigurationsartefakte. Praktisch und wartbar läuft sie lokal als CLI/Desktop-Schritt, nicht auf einem fremden Webserver. Eine spätere WebAssembly-/Browser-Portierung wäre möglich, aber deutlich aufwendiger: Java-Runtime/Dateisystem, ZIP-Artefakte, XSLT/Schematron und Report-Dateien müssten sauber im Browser verpackt werden. Deshalb ist der robuste nächste Produktschritt: Browser für Eingabe/Generierung/OCR-Adapter, lokale CLI/Desktop-Komponente für KoSIT/Mustang/veraPDF und Human Review.
