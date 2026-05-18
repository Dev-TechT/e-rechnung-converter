# Browser and Agent API

The static GitHub Pages app exposes a browser-only API for humans and other agents/LLMs. It does not use a database, cookies, browser storage, uploads, or network APIs.

## Supported browser formats

- `xrechnung-ubl` -> XRechnung UBL XML
- `xrechnung-cii` -> XRechnung CII XML
- `ubl` -> generic EN16931 UBL XML without XRechnung CIUS claim
- `zugferd-pdf` -> browser XML package containing CII XML and local PDF/A-3 assembly instructions
- `factur-x-pdf` -> browser XML package containing CII XML and local PDF/A-3 assembly instructions

Important: GitHub Pages cannot run native KoSIT/Mustang/veraPDF. The browser performs mandatory-field and structure sanity validation while generating. Final official validation still requires local validator tools.

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
- buyer name
- payment IBAN
- payment terms
- line description
- line quantity
- line net price

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
  seller: { name: 'Beispiel Lieferant GmbH', country: 'DE', endpointId: 'seller@example.invalid', endpointSchemeId: 'EM', sellerIdentifier: 'BEISPIEL-SELLER-ID' },
  buyer: { name: 'Beispiel Empfänger', country: 'DE' },
  paymentIban: 'DE00BEISPIEL0000000000',
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
- file upload controls for real invoice PDFs unless the parser is purely local and reviewed

Tests enforce the current no-upload/no-persistence boundary.
