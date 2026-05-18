# Produktseite und GitHub Pages

Status: öffentliche statische Produktseite für E-Rechnung Studio.

## Idee

Eine GitHub-Pages-Seite ist als Produktoberfläche sinnvoll, wenn die Grenzen klar bleiben:

- Browser-only HTML/CSS/JS.
- Keine Datenbank.
- Keine Cookies.
- Keine Server-Uploads.
- Keine API-Calls aus dem Generator.
- Daten leben nur im RAM/Formular des Browser-Tabs und in der heruntergeladenen Datei.
- Lokale Dateiauswahl liest TXT/CSV/XML im Browser-Tab; PDF/DOC/DOCX werden nicht heimlich hochgeladen oder geraten.

Das passt zu DSGVO/Privacy-first besser als ein SaaS-Upload-Konverter. GitHub hostet nur die statischen Assets, nicht die Rechnungsdaten.

## Grenzen

Die Web-App erzeugt im Browser XRechnung UBL, XRechnung CII, generisches EN16931 UBL und XML-Vorbereitungspakete für ZUGFeRD/Factur-X. Für ZUGFeRD/Factur-X erzeugt sie absichtlich kein Fake-PDF; das Browser-Paket enthält CII-XML plus Montage-/Validierungshinweise für lokale PDF/A-3-Tools.

Für echte Einreichung gilt:

1. Pflichtfelder erfassen, insbesondere Leitweg-ID, IBAN/Bankdaten, Zahlungsbedingungen, Rechnungssteller-E-Mail, Seller Identifier und Auftrags-/Bestellreferenz, wenn der Empfänger sie fordert.
2. XRechnung-XML lokal mit KoSIT validator + validator-configuration-xrechnung validieren.
3. Bei ZUGFeRD/Factur-X zusätzlich PDF/A-3 mit veraPDF und Hybridrechnung mit Mustangproject validieren.

## Ablehnungsfall, den das Produkt adressiert

Ein Empfänger kann Rechnungen ablehnen, wenn nur ein normales PDF geschickt wird oder Pflichtangaben fehlen. Viele öffentliche Empfänger fordern XRechnung oder ZUGFeRD und zusätzlich Leitweg-ID/Auftragsnummer.

Die Web-App blockiert deshalb den Download, wenn Pflichtfelder fehlen. Die echten Werte müssen beim Empfänger erfragt und dürfen nicht aus Beispieltexten übernommen werden.

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

Repo: `Dev-TechT/e-rechnung-converter`
Pages: GitHub Actions deployt `/web` als statisches Artifact.
Profil-Link: `https://github.com/Dev-TechT`

Vor Veröffentlichung notwendig:

- Review PASS.
- Keine echten Leitweg-IDs/Auftragsnummern in Tests/Doku/Web.
- Keine übertriebenen Claims wie "rechtssicher" oder "GoBD-konform".
- README klar: Produkt in Aufbau; offizielle lokale Validierung nötig.
- Optional Impressum/Datenschutzseite, wenn als deutsche öffentliche Website beworben wird.
