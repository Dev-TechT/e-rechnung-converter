# GitHub Pages Web Demo

Status: lokale statische Demo, bereit für Review vor Veröffentlichung.

## Idee

Eine GitHub-Pages-Seite ist für den ersten öffentlichen Proof sinnvoll, wenn wir ehrlich bleiben:

- Browser-only HTML/CSS/JS.
- Keine Datenbank.
- Keine Cookies.
- Keine Uploads.
- Keine API-Calls aus dem Generator.
- Daten leben nur im RAM/Formular des Browser-Tabs und in der heruntergeladenen XML-Datei.

Das passt zu DSGVO/Privacy-first besser als ein SaaS-Upload-Konverter. GitHub hostet nur die statischen Assets, nicht die Rechnungsdaten.

## Grenzen

Die Web-Demo erzeugt aktuell nur einen XRechnung-UBL-Kandidaten. Sie ist kein amtlicher Validator.

Für echte Einreichung gilt:

1. Pflichtfelder erfassen, insbesondere Leitweg-ID und Auftrags-/Bestellreferenz, wenn der Empfänger sie fordert.
2. XML lokal mit KoSIT validator + validator-configuration-xrechnung validieren.
3. Bei ZUGFeRD/Factur-X später zusätzlich PDF/A-3 mit veraPDF und Hybridrechnung mit Mustangproject validieren.

## Ablehnungsfall, den die Demo adressiert

Ein Empfänger kann Rechnungen ablehnen, wenn nur ein normales PDF geschickt wird oder Pflichtangaben fehlen. Viele öffentliche Empfänger fordern z.B. XRechnung oder ZUGFeRD und zusätzlich Leitweg-ID/Auftragsnummer.

Die Demo blockiert deshalb den Download, wenn Leitweg-ID oder Auftragsnummer fehlen. Die echten Werte müssen beim Empfänger erfragt und dürfen nicht aus Beispieltexten übernommen werden.

## Lokale Prüfung

```bash
cd /home/neon/xrechnung-converter
python3 -m http.server 8124 --bind 127.0.0.1
# dann öffnen: http://127.0.0.1:8124/web/
```

Automatische Checks:

```bash
cd /home/neon/xrechnung-converter
node tests/webapp.test.js
python3 ~/.hermes/skills/openclaw-imports/webapp-testing/scripts/with_server.py \
  --cwd /home/neon/xrechnung-converter \
  --url http://127.0.0.1:8123/web/ \
  --server "python3 -m http.server 8123 --bind 127.0.0.1" \
  --test "python3 - <<'PY'
from urllib.request import urlopen
for url in ['http://127.0.0.1:8123/web/', 'http://127.0.0.1:8123/web/app.js', 'http://127.0.0.1:8123/web/styles.css']:
    with urlopen(url, timeout=5) as r:
        assert r.status == 200
print('ok')
PY"
```

## Veröffentlichung auf Dev-TechT

Empfohlene Repo-Variante:

- GitHub owner: `Dev-TechT`
- Repo: `e-rechnung-converter` oder `xrechnung-converter`
- Pages source: GitHub Actions oder `/web` über ein deploy action artifact
- Profil-Link: `https://github.com/Dev-TechT`

Vor Veröffentlichung notwendig:

- Review PASS.
- Keine echten Leitweg-IDs/Auftragsnummern in Tests/Doku/Web.
- Keine übertriebenen Claims wie "rechtssicher" oder "GoBD-konform".
- README klar: Demo/Kandidat, offizielle lokale Validierung nötig.
- Optional Impressum/Datenschutzseite, wenn als deutsche öffentliche Website beworben wird.
