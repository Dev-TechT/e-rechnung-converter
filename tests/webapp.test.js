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
    seller: {
      name: 'Demo Lieferant GmbH', street: 'Hauptstr. 1', postalCode: '10115', city: 'Berlin', country: 'DE', vatId: 'DEMO-VAT-ID', endpointId: 'seller@example.invalid', endpointSchemeId: 'EM'
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

test('preflight rejects missing Leitweg-ID and order number for public recipient workflow', () => {
  const result = app.preflightInvoice(sampleInvoice({ buyerReference: '', orderNumber: '' }), 'xrechnung-ubl');
  assert(result.ok === false, 'expected preflight failure');
  assert(result.errors.some((error) => error.includes('Leitweg-ID')), 'missing Leitweg-ID error');
  assert(result.errors.some((error) => error.includes('Auftragsnummer')), 'missing order number error');
});

test('generate xrechnung ubl xml includes Leitweg-ID and order reference', () => {
  const xml = app.generateInvoice(sampleInvoice(), 'xrechnung-ubl');
  assert(xml.includes('<cbc:BuyerReference>DEMO-LEITWEG-001</cbc:BuyerReference>'), 'BuyerReference missing');
  assert(xml.includes('<cbc:ID>DEMO-ORDER-001</cbc:ID>'), 'OrderReference missing');
  assert(xml.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'XRechnung customization missing');
  assert(xml.includes('<cbc:PayableAmount currencyID="EUR">238.00</cbc:PayableAmount>'), 'Payable amount wrong');
});

test('planned browser formats return honest not implemented error', () => {
  const result = app.preflightInvoice(sampleInvoice(), 'zugferd-pdf');
  assert(result.ok === false, 'expected planned format to block');
  assert(result.errors.some((error) => error.includes('noch nicht im Browser implementiert')), 'expected honest planned error');
});

test('no persistence or network APIs are used by app helpers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.js'), 'utf8');
  for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'new WebSocket']) {
    assert(!source.includes(banned), `banned browser API found: ${banned}`);
  }
});
