# KoSIT, Validatoren und lokale Produktvalidierung

Stand: 2026-05-18

## Kurze Antwort: Woher bekommt man KoSIT?

Von den offiziellen GitHub-Repositories der KoSIT/IT-Planungsrat-Organisation:

1. Validator-Programm
   - Repo: https://github.com/itplr-kosit/validator
   - Release: `v1.6.2`
   - Datei: `validator-1.6.2-standalone.jar`
   - Direkt: https://github.com/itplr-kosit/validator/releases/download/v1.6.2/validator-1.6.2-standalone.jar

2. XRechnung-Konfiguration
   - Repo: https://github.com/itplr-kosit/validator-configuration-xrechnung
   - Release: `v2026-01-31`
   - Datei: `xrechnung-3.0.2-validator-configuration-2026-01-31.zip`
   - Direkt: https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-01-31/xrechnung-3.0.2-validator-configuration-2026-01-31.zip

3. Visualisierung, optional
   - Repo: https://github.com/itplr-kosit/xrechnung-visualization
   - Release: `v2026-01-31`
   - Datei: `xrechnung-3.0.2-visualization-2026-01-31.zip`
   - Direkt: https://github.com/itplr-kosit/xrechnung-visualization/releases/download/v2026-01-31/xrechnung-3.0.2-visualization-2026-01-31.zip

## Installation lokal

Empfohlen ist der wiederholbare Bootstrap:

```bash
cd /home/neon/xrechnung-converter
. .venv/bin/activate
python3 scripts/bootstrap_validators.py --include-visualization
```

Das Script:

- lädt Validator-JAR, XRechnung-Konfigurations-ZIP und optional Visualisierungs-ZIP,
- prüft JAR/ZIP-Magic und ZIP-Integrität,
- entpackt die XRechnung-Konfiguration nach `tools/kosit/xrechnung-config/`,
- sucht `scenarios.xml`,
- schreibt `tools/kosit/manifest.json` mit Versionen, Pfaden, Quell-URLs und SHA-256-Werten.

Manuelle Alternative:

```bash
mkdir -p tools/kosit
cd tools/kosit
curl -L https://github.com/itplr-kosit/validator/releases/download/v1.6.2/validator-1.6.2-standalone.jar \
  -o validator-1.6.2-standalone.jar
curl -L https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-01-31/xrechnung-3.0.2-validator-configuration-2026-01-31.zip \
  -o xrechnung-3.0.2-validator-configuration-2026-01-31.zip
unzip xrechnung-3.0.2-validator-configuration-2026-01-31.zip -d xrechnung-config
```

## CLI-Validierung

```bash
cd /home/neon/xrechnung-converter
. .venv/bin/activate
xrechnung-converter examples/minimal-invoice.json -o out/kosit-minimal.xml \
  --kosit-validator tools/kosit/validator-1.6.2-standalone.jar \
  --kosit-scenarios tools/kosit/xrechnung-config/scenarios.xml \
  --report-dir reports/kosit-minimal
```

Der CLI-Output ist JSON. `engine: "kosit"` zeigt, dass nicht nur der interne Sanity-Check lief. `report_path` zeigt auf den erzeugten KoSIT-Prüfbericht.

Verifizierter lokaler Smoke am 2026-05-18:

```text
xrechnung-converter examples/minimal-invoice.json -o out/kosit-minimal.xml \
  --kosit-validator tools/kosit/validator-1.6.2-standalone.jar \
  --kosit-scenarios tools/kosit/xrechnung-config/scenarios.xml \
  --report-dir reports/kosit-minimal-5
-> ok: true, engine: kosit, report_path: reports/kosit-minimal-5/kosit-minimal-report.xml
```

## Warum zwei KoSIT-Dateien?

- `validator-...jar` ist die generische Prüfmaschine.
- `validator-configuration-xrechnung...zip` enthält die XRechnung-spezifischen Szenarien, Schemas, Schematron-Regeln und Codelisten.

Nur zusammen kann daraus eine belastbare lokale XRechnung-Prüfung werden.

## Produktgrenze

Die Browser-App führt Browser-Sanity-Checks aus. Sie darf nicht als amtlicher Validator verkauft werden.

Produktziel:

1. Browser/CLI erzeugt Kandidaten-Artefakt.
2. Lokales KoSIT-Gate prüft XRechnung UBL/CII.
3. Für ZUGFeRD/Factur-X prüft Mustangproject das Hybridrechnungsprofil.
4. veraPDF prüft PDF/A-3.
5. Erst nach Validator-PASS wird das konkrete Ergebnis als vom lokalen Validator akzeptiert angezeigt.

## Browser statt Server?

Die Generierung und einfache Validierung können im Browser laufen. Ein lokaler Server ist dafür nicht zwingend nötig; eine statische Seite reicht.

Für offizielle KoSIT-Validierung ist aktuell ein lokaler CLI/Desktop-Schritt die realistische Produktlösung: KoSIT ist Java plus Konfigurationsartefakte und Report-Dateien. Das gehört nicht auf einen fremden Server und ist im Browser nur mit erheblichem WebAssembly-/Packaging-Aufwand sauber abbildbar. Deshalb: Browser/Agent-API für Eingabe und Artefakt, lokales Validator-Paket für echte Reports.
