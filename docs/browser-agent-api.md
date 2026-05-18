# Browser and Agent API

The static GitHub Pages app exposes a browser-only API for humans and other agents/LLMs. It does not use a database, cookies, browser storage, uploads, or network APIs.

## Supported browser formats

- `xrechnung-ubl` -> XRechnung UBL XML
- `xrechnung-cii` -> XRechnung CII XML
- `ubl` -> generic EN16931 UBL XML without XRechnung CIUS claim
- `zugferd-pdf` -> browser XML package containing CII XML and local PDF/A-3 assembly instructions
- `factur-x-pdf` -> browser XML package containing CII XML and local PDF/A-3 assembly instructions

Important: GitHub Pages is static hosting only. HTML, CSS and JavaScript are delivered to the user; generation, field checks and optional local OCR/PDF extraction run on the user's hardware. The app does not need an application server for the default workflow. GitHub Pages cannot run native KoSIT/Mustang/veraPDF for us, and the browser must not claim official validation unless that exact artifact has a real local validator report.

## Required fields

The app marks required fields with `*` and blocks conversion if any are missing:

- invoice number
- issue date
- due date
- Leitweg-ID / BuyerReference
- order number / buyer order reference
- seller name
- seller email address / endpoint ID
- seller identifier
- seller telephone number
- buyer name
- payment IBAN
- payment terms
- line description
- line quantity
- line net price

## Local OCR/PDF extractor hook

The browser exposes a local extraction hook for future reviewed PDF/DOC/DOCX engines:

```js
window.XInvoice.registerLocalExtractor('pdf', async ({ file }) => {
  // Run a browser-local PDF text/OCR engine here, for example in a Web Worker.
  // Do not send the file to a server.
  return {
    ok: true,
    method: 'browser-pdf-text-or-ocr',
    confidence: 0.74,
    text: 'Rechnungsnummer: RE-1\nLeitweg-ID: ...',
    fields: {}
  };
});
```

If no extractor is registered, DOC/DOCX return a structured failure that asks for a local OCR/PDF engine or Desktop/CLI extraction. PDF has a built-in local extractor that checks embedded Factur-X/ZUGFeRD/XRechnung XML first, then simple embedded text. If it cannot find usable embedded invoice data, it returns a structured low-confidence/review-required failure. Any extracted fields are marked as suggestions and require human review before conversion.

### PDF engine decision

PDF.js via `pdfjs-dist@4.10.38` was checked as a candidate for a later stronger browser-local PDF engine, but it is nicht gebündelt in the shipped runtime of this slice. The current shipped extractor is intentionally smaller: it reads only simple embedded PDF text strings from locally selected PDF bytes.

Candidate facts checked:

- PDF.js license: Apache-2.0.
- NPM package: `pdfjs-dist@4.10.38`, Node engine `>=20`, unpacked package size about 37 MB; a production bundle must be size-checked before shipping.
- Current shipped scope: embedded Factur-X/ZUGFeRD/XRechnung XML first, then nur einfachen eingebetteten PDF-Text; no semantic correctness guarantee.
- Explicit limit: keine OCR für Scan-/Bild-PDFs. Scanned PDFs return a low-confidence/review-required result and remain a separate local OCR/WebWorker/WASM task.
- Privacy gate: keep the runtime bundle free of network/persistence calls; keine Runtime-Netzwerk-/Persistenz-APIs (`fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`). If PDF.js helper code is bundled later, tree-shake or wrap it so URL/network loading paths are not present in shipped runtime source.
- Human review remains mandatory for every extracted field.

### PDF text-extraction implementation

The shipped browser runtime now includes a minimal `browser-local-pdf-embedded-xml-or-text` path registered behind `window.XInvoice.registerLocalExtractor`/`parseLocalDocument` semantics. It reads locally selected PDF bytes in the browser, tries embedded invoice XML first, then extracts simple embedded text strings only. It has deliberately narrow scope:

- local-only: no CDN, no upload, no runtime network or persistence APIs;
- embedded invoice XML first: uncompressed embedded CII/UBL invoice XML can prefill mapped fields;
- suggestions only: parsed fields set `requiresHumanReview: true`;
- low-confidence boundary: scanned/image PDFs, empty PDFs and unsupported compressed text streams return structured local failures instead of invented fields;
- not OCR: Scan-OCR remains a separate reviewed local engine task.

The PDF.js candidate facts above remain useful for a later stronger engine, but the current shipped extractor is intentionally smaller than a bundled PDF.js runtime so the privacy scan can stay strict.

## Local review funnel

PDF24 and invoice-converter.com use the familiar pattern “upload/select invoice -> automatic extraction -> review -> choose e-invoice format -> validate/export”. This app mirrors that understandable flow but keeps the local-first boundary stricter:

Datei auswählen → lokale Erkennung → prüfen und ergänzen → Browser-Validierung → Export

- The `#sourceFile` change handler starts automatically after selection.
- Embedded XRechnung/ZUGFeRD/Factur-X XML is preferred before PDF text extraction.
- TXT/CSV/XML fields and simple PDF text fields are suggestions, not truth.
- Every auto-filled form control receives field source metadata (`data-source`) and the review panel shows the Feldquelle.
- There is keine Cloud-AI-Erkennung, no upload and no server-side extraction in the default flow.
- Missing required fields remain visible blockers before artifact generation.

## Agent usage

In the browser console or another browser automation agent:

```js
const invoice = {
  invoiceNumber: 'RE-2025-0001',
  issueDate: '2025-01-15',
  dueDate: '2025-02-01',
  currency: 'EUR',
  buyerReference: 'BEISPIEL-LEITWEG-001',
  orderNumber: 'BEISPIEL-ORDER-001',
  paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
  seller: {
    name: 'Beispiel Lieferant GmbH',
    country: 'DE',
    endpointId: 'seller@example.invalid',
    endpointSchemeId: 'EM',
    sellerIdentifier: 'BEISPIEL-SELLER-ID',
    telephone: '+49 30 123456'
  },
  buyer: { name: 'Beispiel Empfänger', country: 'DE' },
  paymentIban: 'DE89370400440532013000',
  lines: [{ description: 'Beispiel Leistung', quantity: '1', unitCode: 'C62', netPrice: '100.00', taxCategory: 'S', taxPercent: '19' }]
};

const result = window.XInvoice.convertForAgent(invoice, 'xrechnung-cii');
if (result.ok) {
  console.log(result.artifact.filename);
  console.log(result.artifact.content);
  console.log(result.artifact.browserValidation);
} else {
  console.error(result.errors);
}
```

The API returns structured errors instead of generating if required fields are missing.

## Security constraints

Do not add these to the browser generator:

- `fetch`
- `XMLHttpRequest`
- `WebSocket`
- `localStorage`
- `sessionStorage`
- `indexedDB`
- file upload controls that send real invoice PDFs to a remote service
- PDF/DOC/DOCX extraction that is not purely local, reviewed, and human-review gated

Tests enforce the current no-upload/no-persistence boundary.
