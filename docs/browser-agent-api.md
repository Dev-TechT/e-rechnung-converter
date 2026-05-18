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

If no extractor is registered, PDF/DOC/DOCX return a structured failure that asks for a local OCR/PDF engine or Desktop/CLI extraction. Any extracted fields are marked as suggestions and require human review before conversion.

### PDF text-extraction spike decision

For the first browser-local PDF text-extraction spike, use PDF.js via `pdfjs-dist@4.10.38` as the candidate engine.

Decision facts checked for this spike:

- License: Apache-2.0.
- NPM package: `pdfjs-dist@4.10.38`, Node engine `>=20`, unpacked package size about 37 MB; a production bundle must be size-checked before shipping.
- Scope: extracts only eingebetteten PDF-Text from locally selected PDFs; no semantic correctness guarantee.
- Explicit limit: nur eingebetteten PDF-Text; keine OCR für Scan-/Bild-PDFs. Scanned PDFs must return a low-confidence/review-required result and remain a separate local OCR/WebWorker/WASM task.
- Privacy gate: keep the runtime bundle free of network/persistence calls; keine Runtime-Netzwerk-/Persistenz-APIs (`fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`). If PDF.js helper code is bundled, tree-shake or wrap it so URL/network loading paths are not present in shipped runtime source.
- Human review remains mandatory for every extracted field.

Do not change the product UI from “OCR-Engine lokal einbindbar” to “PDF-Text lokal extrahierbar” until a real browser smoke with a local sample PDF passes and the bundle passes the privacy scan.

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
