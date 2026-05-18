const fs = require('node:fs');
const path = require('node:path');

const app = require('../web/app.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sampleInvoice(overrides = {}) {
  return {
    invoiceNumber: 'RE-2025-0001',
    issueDate: '2025-01-15',
    dueDate: '2025-02-01',
    currency: 'EUR',
    buyerReference: 'DEMO-LEITWEG-001',
    orderNumber: 'DEMO-ORDER-001',
    paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    seller: {
      name: 'Demo Lieferant GmbH', street: 'Hauptstr. 1', postalCode: '10115', city: 'Berlin', country: 'DE', vatId: 'DEMO-VAT-ID', endpointId: 'seller@example.invalid', endpointSchemeId: 'EM', sellerIdentifier: 'DEMO-SELLER-ID'
    },
    buyer: {
      name: 'Demo Empfänger', street: 'Empfängerweg 1', postalCode: '00000', city: 'Demostadt', country: 'DE', endpointId: 'buyer@example.invalid', endpointSchemeId: 'EM'
    },
    paymentIban: 'DE00DEMO00000000000000',
    lines: [
      { description: 'Beratungsleistung', quantity: '2', unitCode: 'HUR', netPrice: '100.00', taxCategory: 'S', taxPercent: '19' }
    ],
    ...overrides,
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

test('all browser formats are implemented and selectable', () => {
  const formatIds = Object.keys(app.FORMATS);
  for (const expected of ['xrechnung-ubl', 'xrechnung-cii', 'zugferd-pdf', 'factur-x-pdf', 'ubl']) {
    assert(formatIds.includes(expected), `${expected} missing`);
    assert(app.FORMATS[expected].implemented === true, `${expected} not implemented`);
  }
});

test('preflight rejects missing required fields before conversion for every format', () => {
  for (const formatId of Object.keys(app.FORMATS)) {
    const result = app.preflightInvoice(sampleInvoice({ buyerReference: '', orderNumber: '', paymentIban: '', paymentTerms: '', seller: { name: 'Demo Lieferant GmbH', endpointId: '', sellerIdentifier: '' } }), formatId);
    assert(result.ok === false, `expected preflight failure for ${formatId}`);
    assert(result.errors.some((error) => error.includes('Leitweg-ID')), `missing Leitweg-ID error for ${formatId}`);
    assert(result.errors.some((error) => error.includes('Auftragsnummer')), `missing order number error for ${formatId}`);
    assert(result.errors.some((error) => error.includes('IBAN')), `missing IBAN error for ${formatId}`);
    assert(result.errors.some((error) => error.includes('Zahlungsbedingungen')), `missing payment terms error for ${formatId}`);
    assert(result.errors.some((error) => error.includes('E-Mail-Adresse')), `missing seller email error for ${formatId}`);
    assert(result.errors.some((error) => error.includes('Seller Identifier')), `missing seller identifier error for ${formatId}`);
  }
});

test('preflight rejects missing required line net price and malformed invoice objects', () => {
  let result = app.convertForAgent(sampleInvoice({ lines: [{ description: 'Leistung', quantity: '1', unitCode: 'C62', netPrice: '' }] }), 'xrechnung-ubl');
  assert(result.ok === false, 'empty net price should fail');
  assert(result.errors.some((error) => error.includes('Nettopreis')), 'missing net price error');
  result = app.convertForAgent(null, 'xrechnung-ubl');
  assert(result.ok === false, 'null invoice should fail structurally');
  assert(result.errors.length > 0, 'null invoice should return structured errors');
  result = app.convertForAgent({ lines: [null] }, 'xrechnung-ubl');
  assert(result.ok === false, 'null line should fail structurally');
  assert(result.errors.length > 0, 'null line should return structured errors');
  result = app.convertForAgent({ ...sampleInvoice(), issueDate: {} }, 'xrechnung-cii');
  assert(result.ok === false, 'object date should fail structurally');
  assert(result.errors.some((error) => error.includes('Rechnungsdatum')), 'object date should mention issue date');
});

test('required field catalog exposes star-marked fields for browser and LLM agents', () => {
  const fields = app.getRequiredFields('xrechnung-ubl');
  const ids = fields.map((field) => field.id);
  for (const expected of ['invoiceNumber', 'issueDate', 'dueDate', 'buyerReference', 'orderNumber', 'sellerName', 'sellerEndpointId', 'sellerIdentifier', 'buyerName', 'paymentIban', 'paymentTerms', 'lineDescription', 'lineQuantity', 'lineNetPrice']) {
    assert(ids.includes(expected), `${expected} missing from required fields`);
  }
  assert(fields.every((field) => field.required === true), 'all returned fields should be marked required');
});

test('generate xrechnung ubl xml includes Leitweg-ID, payment terms, seller email and order reference', () => {
  const artifact = app.generateInvoice(sampleInvoice(), 'xrechnung-ubl');
  assert(artifact.mimeType === 'application/xml', 'UBL should be XML');
  assert(artifact.filename.endsWith('.xml'), 'UBL filename should be .xml');
  assert(artifact.content.includes('<cbc:BuyerReference>DEMO-LEITWEG-001</cbc:BuyerReference>'), 'BuyerReference missing');
  assert(artifact.content.includes('<cbc:ID>DEMO-ORDER-001</cbc:ID>'), 'OrderReference missing');
  assert(artifact.content.includes('<cbc:Note>Zahlbar innerhalb von 14 Tagen ohne Abzug.</cbc:Note>'), 'payment terms missing');
  assert(artifact.content.includes('seller@example.invalid'), 'seller email missing');
  assert(artifact.content.includes('DEMO-SELLER-ID'), 'seller identifier missing');
  assert(artifact.content.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'XRechnung customization missing');
  assert(artifact.content.includes('<cbc:PayableAmount currencyID="EUR">238.00</cbc:PayableAmount>'), 'Payable amount wrong');
});

test('generate xrechnung cii xml uses CII CrossIndustryInvoice syntax', () => {
  const artifact = app.generateInvoice(sampleInvoice(), 'xrechnung-cii');
  assert(artifact.mimeType === 'application/xml', 'CII should be XML');
  assert(artifact.filename.endsWith('.xml'), 'CII filename should be .xml');
  assert(artifact.content.includes('<rsm:CrossIndustryInvoice'), 'CII root missing');
  assert(artifact.content.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'XRechnung guideline missing');
  assert(artifact.content.includes('<ram:BuyerReference>DEMO-LEITWEG-001</ram:BuyerReference>'), 'BuyerReference missing');
});

test('generate generic ubl xml omits XRechnung customization but keeps EN16931 marker', () => {
  const artifact = app.generateInvoice(sampleInvoice(), 'ubl');
  assert(artifact.content.includes('urn:cen.eu:en16931:2017'), 'EN16931 customization missing');
  assert(!artifact.content.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'generic UBL should not claim XRechnung');
});

test('generate ZUGFeRD and Factur-X browser artifacts as XML package descriptors, not fake PDFs', () => {
  for (const formatId of ['zugferd-pdf', 'factur-x-pdf']) {
    const artifact = app.generateInvoice(sampleInvoice(), formatId);
    assert(artifact.mimeType === 'application/xml', `${formatId} descriptor should be XML`);
    assert(artifact.filename.endsWith('.xml'), `${formatId} descriptor filename should be .xml`);
    assert(artifact.content.includes('<browserHybridInvoicePackage'), `${formatId} package root missing`);
    assert(artifact.content.includes('requiresLocalPdfA3Assembly="true"'), `${formatId} must require local PDF/A-3 assembly`);
    assert(artifact.content.includes('<embeddedCiiXml><![CDATA['), `${formatId} should include embedded CII CDATA`);
    assert(artifact.content.includes('Mustangproject'), `${formatId} should name local validator`);
    assert(artifact.content.includes('veraPDF'), `${formatId} should name PDF/A validator`);
  }
});

test('generation automatically browser-validates every format and attaches a report', () => {
  for (const formatId of Object.keys(app.FORMATS)) {
    const artifact = app.generateInvoice(sampleInvoice(), formatId);
    assert(artifact.browserValidation, `${formatId} missing validation report`);
    assert(artifact.browserValidation.ok === true, `${formatId} should pass browser validation`);
    assert(artifact.browserValidation.checks.length >= 3, `${formatId} should run multiple checks`);
  }
});

test('browser validation rejects malformed generated artifacts', () => {
  const result = app.validateGeneratedArtifact({ formatId: 'xrechnung-cii', content: '<Invoice></Invoice>' });
  assert(result.ok === false, 'malformed CII should fail');
  assert(result.errors.some((error) => error.includes('CrossIndustryInvoice')), 'expected CII root error');
});

test('machine-readable agent API returns structured conversion result', () => {
  const result = app.convertForAgent(sampleInvoice(), 'xrechnung-cii');
  assert(result.ok === true, 'agent conversion should pass');
  assert(result.artifact.formatId === 'xrechnung-cii', 'format id mismatch');
  assert(result.validationPlan.requiredLocalValidators.length > 0, 'validation plan missing');
  assert(result.artifact.browserValidation.ok === true, 'browser validation missing');
  assert(typeof result.artifact.content === 'string' && result.artifact.content.length > 100, 'artifact content missing');
});

test('agent API returns structured errors instead of converting invalid invoices', () => {
  const result = app.convertForAgent(sampleInvoice({ buyerReference: '' }), 'xrechnung-ubl');
  assert(result.ok === false, 'invalid conversion should fail');
  assert(!result.artifact, 'invalid conversion must not return artifact');
  assert(result.errors.some((error) => error.includes('Leitweg-ID')), 'missing Leitweg-ID error');
});

test('no persistence or network APIs are used by app helpers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.js'), 'utf8');
  for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'new WebSocket']) {
    assert(!source.includes(banned), `banned browser API found: ${banned}`);
  }
});
