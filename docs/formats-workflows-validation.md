# Output-Formate, Workflows und lokale Validierung

Datum: 2026-05-18

## Direkte Antwort

Ja, ZUGFeRD, Factur-X und UBL können als auswählbare Zielformate in das Produkt aufgenommen werden.

Ja, das geht lokal/offline. Für Verarbeitung und Validierung müssen Rechnungen nicht ins Internet hochgeladen werden, wenn wir die Validatoren und Schema-/Schematron-Artefakte lokal bündeln.

Internet ist nur nötig für:
- einmaliges Herunterladen/Update von Validatoren, Schemas, Codelisten und Artefakten,
- optionale Online-Dienste wie Peppol SMP-Lookup, Zertifikatsstatusprüfungen oder Cloud-OCR,
- falls wir bewusst eine SaaS/API-Version anbieten.

Für DSGVO und Vertrauen ist die richtige Produktentscheidung: local-first/offline by default. Keine Uploads im Standard.

## Begriffe

### UBL

UBL ist eine reine XML-Syntax. Für XRechnung bedeutet das: UBL 2.1 Invoice/CreditNote plus EN16931 plus deutsche XRechnung-CIUS-Regeln.

Datei: `.xml`
Validierung lokal: KoSIT Validator für XRechnung; CEN/phive für generisches EN16931/Peppol.

### CII

CII steht für UN/CEFACT Cross Industry Invoice. Es ist ebenfalls reine XML. XRechnung kann auch als CII-XML geliefert werden. ZUGFeRD/Factur-X verwenden CII als eingebettete XML-Syntax.

Datei: `.xml`
Validierung lokal: KoSIT Validator für XRechnung-CII; Mustang/CEN/phive je Profil.

### ZUGFeRD

ZUGFeRD ist ein hybrides PDF/A-3: menschenlesbares PDF plus eingebettetes CII-XML.

Datei: `.pdf`
Validierung lokal braucht zwei Ebenen:
1. PDF/A-3/Container/Metadaten/Attachment prüfen, z.B. veraPDF + Mustangproject.
2. Eingebettetes CII-XML fachlich prüfen, z.B. Mustangproject und je Profil KoSIT/CEN.

### Factur-X

Factur-X ist der französisch/deutsche Schwesterstandard zu ZUGFeRD 2.x; technisch sehr ähnlich/harmonisiert: PDF/A-3 plus eingebettetes CII-XML.

Datei: `.pdf`
Validierung lokal: wie ZUGFeRD.

## Neue auswählbare Formate im Produkt

Im Code ist jetzt ein Formatkatalog vorbereitet:

- `xrechnung-ubl`: XRechnung UBL XML
- `xrechnung-cii`: XRechnung CII XML
- `zugferd-pdf`: ZUGFeRD PDF/A-3
- `factur-x-pdf`: Factur-X PDF/A-3
- `ubl`: generisches EN16931 UBL XML, später optional Peppol BIS

Aktuell implementiert ist nur `xrechnung-ubl` als Kandidaten-Export. Die anderen Formate sind im Workflow/Validierungsplan sichtbar und bewusst als geplant markiert.

CLI:

```bash
xrechnung-converter --output-format factur-x-pdf --print-validation-plan
xrechnung-converter --output-format zugferd-pdf --print-validation-plan
xrechnung-converter --output-format xrechnung-cii --print-validation-plan
```

## Lokale automatische Validierung

### XRechnung UBL/CII

Pflichtvalidator:
- KoSIT Validator
- validator-configuration-xrechnung

Prüft lokal:
- XML/XSD
- EN16931 Schematron
- XRechnung Schematron
- Codelisten/Genericode
- XRechnung Extension/CVD je Szenario/Release

Empfehlung: KoSIT ist für XRechnung unser maßgeblicher Gatekeeper.

### ZUGFeRD/Factur-X PDF/A-3

Pflichtvalidatoren:
- Mustangproject
- veraPDF
- optional KoSIT, wenn eingebettetes XML ein XRechnung-Profil ist

Prüft lokal:
- PDF/A-3-Konformität
- eingebettete XML-Datei
- PDF-Metadaten/XMP/AFRelationship
- ZUGFeRD/Factur-X-Profil
- CII-XML-Regeln
- optional XRechnung-CII-Regeln über KoSIT

Wichtig: Ein valides XML macht das PDF nicht automatisch valide. Ein valides PDF/A-3 macht das XML nicht automatisch valide. Beides muss geprüft werden.

### Generisches UBL/Peppol

Mögliche Validatoren:
- CEN EN16931 Artefakte
- phive/phive-rules für Peppol und weitere CIUS
- KoSIT nur, wenn es wirklich XRechnung ist

## Open-Source-Projekte

### Adopt

#### Mustangproject

URL: https://github.com/ZUGFeRD/mustangproject
Lizenz: Apache-2.0
Nutzen:
- ZUGFeRD/Factur-X/CII/XRechnung-nahe Workflows
- lokale CLI/Java-Lib
- Validierung, Parsing, Extraktion
- veraPDF-Integration bzw. PDF/A-Prüfung im Umfeld

Empfehlung: als lokaler Sidecar/Validator/Generator für ZUGFeRD/Factur-X/CII einplanen.

#### KoSIT Validator + validator-configuration-xrechnung

URLs:
- https://github.com/itplr-kosit/validator
- https://github.com/itplr-kosit/validator-configuration-xrechnung

Nutzen:
- maßgebliche lokale XRechnung-Validierung für UBL und CII.

Empfehlung: Pflicht für XRechnung.

#### veraPDF

URL: https://verapdf.org/
Nutzen:
- lokale PDF/A-3-Prüfung.

Empfehlung: Pflicht für ZUGFeRD/Factur-X-PDFs.

### Adopt oder Fork nach Lizenz-/Qualitätstest

#### E-Invoice-EU

URL: https://github.com/gflohr/e-invoice-eu
Nutzen:
- TypeScript/JS CLI/Core/REST
- kann aus JSON/Spreadsheet mehrere Formate erzeugen: Factur-X/ZUGFeRD, UBL, CII, XRechnung
- sehr nah an unserer gewünschten Formatauswahl

Empfehlung: ernsthaft prüfen. Potenziell beste OSS-Basis für Format-Auswahl und Generator-Architektur. Lizenz/Qualität direkt im Repo final verifizieren.

### Reference only

- horstoeko/zugferd: PHP ZUGFeRD/Factur-X/XRechnung-Profile, gut als Referenz.
- ZUGFeRD-csharp: .NET Library, gut wenn .NET-Stack gewählt wird.
- akretion/factur-x: Python Factur-X PDF-Embedding/Extraktion, nützlich für Python-PDF-Details.
- Quba Viewer: gute Offline-Viewer-UX.
- OpenXRechnungToolbox: lokale Validierung/Visualisierung als UX-Referenz.

## Kommerzielle Konkurrenz

Ja, kommerziell gibt es das bereits in Teilen:

- PDF24 E-Rechnung
- Invoixo
- Treesoft PDF2XRechnung/E-Rechnung Toolkit
- invoice-converter.com
- e-rechnung.tools
- Rechnungshub
- PDF Xpansion SDK
- webPDF
- Aloaha / TX Text Control / Pdftools / PDFlib im SDK-Bereich

Aber: Viele sind proprietär, SaaS-basiert, Windows/SDK-lastig oder kein vollständiges OSS-Produkt. Genau hier liegt unsere Chance: local-first, offen nachvollziehbar, mehrere Formate, Validator-Orchestrierung, Human-review-Workflow.

## Build-vs-Fork-Entscheidung

Meine Empfehlung:

Build greenfield für:
- eigenes Domain-Modell,
- UI/Workflow,
- Format-Auswahl,
- Extraktion aus PDF/DOC/DOCX/TXT/CSV/XML,
- Human-review,
- Validator-Orchestrierung,
- Reports,
- DSGVO/local-first UX.

Adopt für:
- KoSIT Validator,
- Mustangproject,
- veraPDF,
- ggf. E-Invoice-EU als Generator/Reference.

Nicht sinnvoll:
- alles selbst validieren;
- eigene Schematron-Regeln nachbauen;
- Rechnungen standardmäßig ins Internet hochladen;
- behaupten, jede PDF werde vollautomatisch korrekt.

## Neuer Workflow

1. User wählt Zielformat:
   - XRechnung UBL XML
   - XRechnung CII XML
   - ZUGFeRD PDF/A-3
   - Factur-X PDF/A-3
   - generisches UBL/Peppol später

2. Source Adapter liest Eingabe:
   - JSON/CSV jetzt
   - XML/ZUGFeRD pass-through/extract geplant
   - PDF/DOCX/TXT mit Human-review geplant

3. Canonical Invoice Model wird gefüllt.

4. User prüft/korrigiert unsichere Felder.

5. Exporter erzeugt Zielartefakt:
   - UBL XML
   - CII XML
   - PDF/A-3 + eingebettetes CII XML

6. Lokale Validierung läuft automatisch:
   - XRechnung: KoSIT
   - ZUGFeRD/Factur-X: Mustang + veraPDF + ggf. KoSIT
   - UBL/Peppol: CEN/phive

7. Ergebnis:
   - Artefakt
   - maschinenlesbarer JSON-Report
   - Original-Validator-Reports
   - menschliche Fehlerliste

## Grenzen

Validierung sagt nur: technisch/formal korrekt nach Profil. Sie garantiert nicht:
- steuerliche Richtigkeit,
- inhaltliche Korrektheit,
- Empfängerakzeptanz,
- Übereinstimmung zwischen PDF-Ansicht und XML,
- Rechtsberatung/GoBD-Konformität.

## Umsetzung im Code bisher

Hinzugefügt:
- Formatkatalog in `src/xrechnung_converter/formats.py`
- CLI-Option `--output-format`
- CLI-Option `--print-validation-plan`
- Tests für Formatkatalog und CLI-Hilfe

Noch nicht implementiert:
- echte CII-Erzeugung
- echte ZUGFeRD/Factur-X PDF/A-3-Erzeugung
- veraPDF/Mustang-Bootstrap
- KoSIT-Bootstrap und echte offizielle Validierung
