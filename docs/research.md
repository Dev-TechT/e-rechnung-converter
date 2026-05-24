# Recherche: Rechnung -> XRechnung Converter

Datum: 2026-05-18

## Ergebnis in einem Satz

Ein eigenes Produkt ist gerechtfertigt: Es gibt gute Open-Source-Bausteine und kommerzielle Wettbewerber, aber kein reifes, vollständig quelloffenes, cross-platform, local-first Komplettprodukt, das PDF/DOC/DOCX/TXT/CSV/XML zuverlässig in valide deutsche XRechnung umwandelt.

## Formatklärung

- Korrekte Zielausgabe: XML.
- XRechnung basiert auf EN 16931 und nutzt XML-Syntaxen:
  - UBL 2.1 Invoice/CreditNote
  - UN/CEFACT Cross Industry Invoice CII D16B
- XSL/XSLT ist kein Rechnungs-Austauschformat, sondern wird für Visualisierung/Transformation genutzt, z.B. mit KoSIT xrechnung-visualization.

## Autoritative Komponenten

### KoSIT validator-configuration-xrechnung

URL: https://github.com/itplr-kosit/validator-configuration-xrechnung
Latest geprüft: v2026-01-31, "Validator Configuration 2026-01-31 compatible with XRechnung 3.0.x"
Asset: xrechnung-3.0.2-validator-configuration-2026-01-31.zip
Bewertung: adopt als Pflicht-Abhängigkeit.

### KoSIT validator

URL: https://github.com/itplr-kosit/validator
Latest geprüft: v1.6.2
Asset: validator-1.6.2-standalone.jar
Bewertung: adopt als offizielle lokale Validierungsengine.

### KoSIT xrechnung-visualization

URL: https://github.com/itplr-kosit/xrechnung-visualization
Latest geprüft: v2026-01-31, "XRechnung Visualization 2026-01-31 compatible with XRechnung 3.0.x"
Asset: xrechnung-3.0.2-visualization-2026-01-31.zip
Bewertung: adopt/reference für Preview/HTML/PDF-Darstellung; nicht als Validator missverstehen.

### Mustangproject

URL: https://github.com/ZUGFeRD/mustangproject
Latest geprüft: core-2.23.0, veröffentlicht 2026-04-24
Bewertung: starker Baustein für Java/CLI/Service rund um ZUGFeRD/Factur-X/XRechnung. Für unser Python-MVP noch nicht integriert, aber sehr guter Kandidat für Produktionskern oder Sidecar-Service.

### paperless-ngx-erechnung

URL: https://github.com/bitbetterde/paperless-ngx-erechnung
Bewertung: reference-only. Nützlich für Parsing/Indexierung bestehender E-Rechnungen in Paperless, aber kein Kern für beliebige PDF/DOC -> XRechnung.

## Weitere OSS-Kandidaten

- gflohr/e-invoice-eu: interessant für JS/Browser/CLI und Spreadsheet/JSON -> EN16931; Lizenz direkt prüfen.
- OpenXRechnungToolbox: guter lokaler Validator/Viewer/UX-Referenzpunkt.
- horstoeko/zugferd: PHP-Baustein.
- ZUGFeRD-csharp: .NET-Baustein.
- CSV-spezifische Generatoren: reference-only, meist zu klein/schmal.

## Kommerzielle Wettbewerber

- Reife proprietäre E-Rechnungs-Tools: Online/Offline-Flows; guter UX-/Reifegrad-Benchmark ohne Code-Übernahme.
- SaaS PDF -> XRechnung/ZUGFeRD: Datenschutz/AVV prüfen.
- e-rechnung.tools: SaaS PDF/Word/Excel -> XRechnung/ZUGFeRD; Pay-per-use Benchmark.
- Invoixo: Offline-Tool für Word/PDF -> E-Rechnung; wichtigster Datenschutz-/Desktop-Benchmark.
- Treesoft PDF2XRechnung/E-Rechnung Toolkit: proprietär, template-/PC-orientiert; guter B2B-Benchmark.
- Rechnungshub, pedif.digital/Supedio, webPDF/PDF Xpansion: Wettbewerber/SDK-Referenzen.

## Produktlücke

Die technische Lücke ist nicht "XML schreiben". Die Lücke ist:

1. Quellrechnungen aus heterogenen Formaten lesen.
2. Rechnungsfelder semantisch korrekt extrahieren.
3. Fehlende Pflichtfelder sauber vom Nutzer abfragen.
4. Summen/Steuern/Rundung nachvollziehbar prüfen.
5. Valide UBL/CII XML erzeugen.
6. Lokal mit KoSIT validieren.
7. Prüfbericht und Vorschau liefern.

PDF/DOC/DOCX/TXT können nicht garantiert vollautomatisch korrekt konvertiert werden. Realistisch ist eine Human-in-the-loop-App: Extrahieren, Vorschlagen, Nutzer prüft/korrigiert, dann XML erzeugen/validieren.

## Entscheidung

Build greenfield, aber Komponenten adoptieren:

- Python/Electron/Tauri oder lokale Web-App für UI und Cross-OS.
- Lokale Python-Extraktion für PDF/DOCX/TXT/CSV/XML.
- Canonical Invoice Model als eigenes Kernmodell.
- Export UBL 2.1 zuerst; CII später.
- KoSIT validator + validator-configuration-xrechnung als Pflicht-Gate.
- xrechnung-visualization als Preview.
- Optional Mustangproject als Java-Sidecar für robustere eInvoice-Funktionen.
