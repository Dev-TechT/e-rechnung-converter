# Wettbewerbsnotizen: Invoice-Converter.com und ähnliche Tools

Stand: 2026-05-18

## Beobachtete Positionierung

Invoice-Converter.com positioniert sich als Upload-basierter Online-Konverter:

- PDF-Rechnung hochladen.
- Daten automatisch extrahieren.
- Daten prüfen/reviewen.
- E-Rechnung herunterladen.
- Genannte Zielformate: XRechnung, ZUGFeRD, Factur-X, UBL, CII.

Relevante URLs:

- https://www.invoice-converter.com/en/pdf-to-zugferd
- https://www.invoice-converter.com/en/convert
- https://www.invoice-converter.com/

## Was wir davon übernehmen sollten

- Klarer Einstieg über Dokument-Upload bzw. Dateiauswahl.
- Review-Schritt zwischen Extraktion und Konvertierung.
- Zielformat klar auswählen lassen.
- Sichtbarer Hinweis, welches Format was bedeutet.
- Downloadbarer Output plus Validierungsstatus.

## Unsere Differenzierung

- Local-first statt Server-Upload: Rechnungsdaten verlassen standardmäßig nicht das Gerät.
- Ehrliche PDF/DOC/DOCX-Grenze: kein Versprechen, beliebige PDFs im Browser fehlerfrei zu verstehen.
- Offizielle lokale Validatoren sichtbar machen: KoSIT, validator-configuration-xrechnung, Mustangproject, veraPDF.
- Agentenfreundliche API im Browser: `window.XInvoice.convertForAgent(invoice, formatId)`.

## Produktimplikation

Die Web-App braucht eine sichtbare Dokument-Intake-Zone. Für TXT/CSV/XML kann der Browser lokal Felder vorbefüllen. Für PDF/DOC/DOCX soll die UI erklären, dass die Desktop/CLI-Extraktion der nächste lokale Produktschritt ist.

Für echte Monetarisierung ist ein Desktop-Paket sinnvoller als ein reiner GitHub-Pages-Konverter:

1. Browser/Marketing/Product UI: erklärt und sammelt Leads.
2. Desktop/CLI: liest PDFs/DOCs lokal, führt KoSIT/Mustang/veraPDF aus.
3. Optional Pro-Version: Batch-Konvertierung, Vorlagen, Mandantenprofile, Prüfberichte.
