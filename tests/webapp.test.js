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
      name: 'Demo Lieferant GmbH', street: 'Hauptstr. 1', postalCode: '10115', city: 'Berlin', country: 'DE', vatId: 'DEMO-VAT-ID', endpointId: 'seller@example.invalid', endpointSchemeId: 'EM', sellerIdentifier: 'DEMO-SELLER-ID', telephone: '+49 30 123456'
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

function makeTinyTextPdf(lines) {
  const content = lines.map((line, index) => {
    const escaped = String(line).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    return `BT /F1 12 Tf 50 ${760 - index * 18} Td (${escaped}) Tj ET`;
  }).join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const pendingTests = [];

function reportFailure(name, error) {
  console.error(`not ok - ${name}`);
  console.error(error.stack || error.message);
  process.exitCode = 1;
}

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      pendingTests.push(result.then(() => {
        console.log(`ok - ${name}`);
      }).catch((error) => reportFailure(name, error)));
      return;
    }
    console.log(`ok - ${name}`);
  } catch (error) {
    reportFailure(name, error);
  }
}

setImmediate(async () => {
  await Promise.all(pendingTests);
});

test('all browser formats are implemented and selectable', () => {
  const formatIds = Object.keys(app.FORMATS);
  for (const expected of ['xrechnung-ubl', 'xrechnung-cii', 'zugferd-pdf', 'factur-x-pdf', 'ubl']) {
    assert(formatIds.includes(expected), `${expected} missing`);
    assert(app.FORMATS[expected].implemented === true, `${expected} not implemented`);
  }
});

test('product copy does not describe the app as a demo or fake legal certainty', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'pages.yml'), 'utf8');
  assert(!/\bDemo\b/i.test(html), 'page should not present product as Demo');
  assert(!/\bdemo\b/i.test(workflow), 'deployment workflow should not present product as demo');
  assert(!/rechtssicher garantiert|100% DSGVO|GoBD-konform garantiert/i.test(html), 'unsafe legal overclaim');
});

test('product page explains where KoSIT and official validation artifacts come from', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  for (const needle of [
    'github.com/itplr-kosit/validator',
    'validator-1.6.2-standalone.jar',
    'github.com/itplr-kosit/validator-configuration-xrechnung',
    'xrechnung-3.0.2-validator-configuration-2026-01-31.zip',
    'github.com/itplr-kosit/xrechnung-visualization',
    'Mustangproject',
    'veraPDF',
  ]) {
    assert(html.includes(needle), `missing validator info: ${needle}`);
  }
});

test('product page includes local document intake and OCR architecture without remote upload claims', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  assert(html.includes('id="sourceFile"'), 'missing local file input');
  assert(html.includes('accept=".pdf,.doc,.docx,.txt,.csv,.xml,application/pdf,text/plain,text/csv,application/xml,text/xml"'), 'missing accepted invoice formats');
  assert(html.includes('Datei bleibt in diesem Browser-Tab'), 'missing local-only upload wording');
  assert(html.includes('OCR-Engine lokal einbindbar'), 'missing local OCR engine wording');
  assert(html.includes('GitHub Pages liefert nur HTML, CSS und JavaScript aus'), 'missing GitHub static hosting wording');
});

test('product page exposes full XRechnung product direction and advanced field groups', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  for (const needle of [
    'Großes Formular',
    'Alle XRechnung-BT/BG-Felder',
    'Referenzen, Parteien, Lieferung, Steuern, Zu-/Abschläge, Anhänge und Positionen erweitert',
    'Fehlende Pflichtangaben werden vor dem Generieren markiert',
    'xrechnung-3.0.2-bundle-2026-01-31.zip',
  ]) {
    assert(html.includes(needle), `missing full product direction copy: ${needle}`);
  }
});

test('browser validator roadmap targets local XSD Schematron and codelist validation before KoSIT-equivalent claims', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  for (const needle of [
    'Browser-Validierung Zielbild',
    'XSD per WebAssembly',
    'Schematron/XSLT im Browser',
    'Codelisten aus dem XRechnung-Bundle',
    'KoSIT-CLI-Referenzvergleich',
  ]) {
    assert(html.includes(needle), `missing browser validator roadmap copy: ${needle}`);
  }
  assert(!html.includes('KoSIT-valid im Browser verfügbar'), 'must not claim browser KoSIT availability before implementation');
});

test('local document intake parses csv txt and xml snippets without network', () => {
  let parsed = app.parseLocalDocument({ name: 'invoice.csv', type: 'text/csv', text: 'invoiceNumber,buyerReference,orderNumber\nRE-1,LW-1,PO-1' });
  assert(parsed.ok === true, 'csv should parse');
  assert(parsed.fields.invoiceNumber === 'RE-1', 'csv invoice number missing');
  parsed = app.parseLocalDocument({ name: 'invoice.txt', type: 'text/plain', text: 'Rechnungsnummer: RE-2\nLeitweg-ID: LW-2\nAuftragsnummer: PO-2' });
  assert(parsed.ok === true, 'txt should parse');
  assert(parsed.fields.invoiceNumber === 'RE-2', 'txt invoice number missing');
  parsed = app.parseLocalDocument({ name: 'invoice.xml', type: 'application/xml', text: '<Invoice><cbc:ID>RE-3</cbc:ID><cbc:BuyerReference>LW-3</cbc:BuyerReference></Invoice>' });
  assert(parsed.ok === true, 'xml should parse');
  assert(parsed.fields.invoiceNumber === 'RE-3', 'xml invoice number missing');
});

test('local document intake is honest about pdf/doc/docx needing a browser-local extraction engine', () => {
  for (const name of ['invoice.pdf', 'invoice.doc', 'invoice.docx']) {
    const parsed = app.parseLocalDocument({ name, type: 'application/octet-stream', text: '' });
    assert(parsed.ok === false, `${name} should not pretend extraction without an engine`);
    assert(parsed.requiresLocalOcrEngine === true, `${name} should require a browser-local OCR/PDF engine`);
    assert(parsed.requiresServer === false, `${name} should not require a server`);
    assert(parsed.errors.some((error) => error.includes('lokale OCR/PDF-Engine')), `${name} should mention local OCR/PDF engine`);
  }
});

test('pdf intake can use an injected browser-local OCR/PDF engine and still requires review', () => {
  const parsed = app.parseLocalDocument({ name: 'invoice.pdf', type: 'application/pdf', text: '' }, {
    localExtractors: {
      pdf() {
        return {
          ok: true,
          method: 'browser-pdf-text',
          confidence: 0.72,
          text: 'Rechnungsnummer: RE-PDF-1\nLeitweg-ID: LW-PDF-1\nAuftragsnummer: PO-PDF-1\nIBAN: DE89370400440532013000\nZahlungsbedingungen: 14 Tage\nTelefon: +49 30 123456\nE-Mail: seller@example.invalid'
        };
      }
    }
  });
  assert(parsed.ok === true, 'pdf should parse when local engine returns text');
  assert(parsed.usedLocalExtractor === true, 'result should record local extractor use');
  assert(parsed.requiresHumanReview === true, 'OCR/text extraction must require review');
  assert(parsed.requiresServer === false, 'local extraction should not require a server');
  assert(parsed.fields.invoiceNumber === 'RE-PDF-1', 'pdf invoice number missing');
  assert(parsed.fields.buyerReference === 'LW-PDF-1', 'pdf buyer reference missing');
  assert(parsed.fields.orderNumber === 'PO-PDF-1', 'pdf order number missing');
  assert(parsed.fields.paymentIban === 'DE89370400440532013000', 'pdf IBAN missing');
});

test('pdf intake normalizes async local OCR/PDF extractor success and failure', async () => {
  let parsed = await app.parseLocalDocument({ name: 'invoice.pdf', type: 'application/pdf', text: '' }, {
    localExtractors: {
      async pdf() {
        return { ok: true, method: 'async-browser-pdf-text', text: 'Rechnungsnummer: RE-ASYNC-1\nLeitweg-ID: LW-ASYNC-1' };
      }
    }
  });
  assert(parsed.ok === true, 'async pdf extractor should parse');
  assert(parsed.fields.invoiceNumber === 'RE-ASYNC-1', 'async invoice number missing');
  assert(parsed.requiresHumanReview === true, 'async extraction must require review');

  parsed = await app.parseLocalDocument({ name: 'invoice.pdf', type: 'application/pdf', text: '' }, {
    localExtractors: {
      async pdf() { throw new Error('ocr worker crashed'); }
    }
  });
  assert(parsed.ok === false, 'async extractor rejection should become structured failure');
  assert(parsed.requiresLocalOcrEngine === true, 'async failure should require local OCR engine');
  assert(parsed.requiresServer === false, 'async failure should not suggest server');
  assert(parsed.errors.some((error) => error.includes('ocr worker crashed')), 'async failure should include cause');
});

test('pdf text spike has deterministic local text-PDF fixture and low-confidence scanned-PDF boundary', () => {
  const textPdf = makeTinyTextPdf([
    'Rechnungsnummer: RE-PDFJS-1',
    'Leitweg-ID: LW-PDFJS-1',
    'IBAN: DE89370400440532013000'
  ]);
  const scannedLikePdf = makeTinyTextPdf([]);
  assert(textPdf.includes(Buffer.from('/BaseFont /Helvetica')), 'text PDF fixture should contain embedded text font instructions');
  assert(textPdf.includes(Buffer.from('RE-PDFJS-1')), 'text PDF fixture should contain a realistic invoice number');
  assert(scannedLikePdf.includes(Buffer.from('/Contents 5 0 R')), 'scanned-like fixture should still be a parseable PDF shell');
  assert(!scannedLikePdf.includes(Buffer.from('Rechnungsnummer')), 'scanned-like fixture should not expose invoice text');
});

test('pdf.js is selected for the first local PDF text-extraction spike with explicit limits', () => {
  const docs = fs.readFileSync(path.join(__dirname, '..', 'docs', 'browser-agent-api.md'), 'utf8');
  for (const needle of [
    'PDF.js',
    'Apache-2.0',
    'pdfjs-dist@4.10.38',
    'nur eingebetteten PDF-Text',
    'keine OCR für Scan-/Bild-PDFs',
    'keine Runtime-Netzwerk-/Persistenz-APIs',
  ]) {
    assert(docs.includes(needle), `missing PDF.js spike decision/limit: ${needle}`);
  }
});

test('browser execution model explains GitHub Pages hosting, user hardware and KoSIT boundary', () => {
  const model = app.getBrowserExecutionModel();
  assert(model.githubPages === 'static-hosting-only', 'GitHub Pages should only host static files');
  assert(model.runsOnUserHardware === true, 'browser work should run on user hardware');
  assert(model.requiresApplicationServer === false, 'product should not need an application server');
  assert(model.ocr.mode === 'browser-local-engine', 'OCR should be modeled as browser-local engine');
  assert(model.kosit.officialValidator === 'KoSIT validator + validator-configuration-xrechnung', 'KoSIT stack should be explicit');
  assert(model.kosit.browserOnlyStatus.includes('not shipped'), 'browser KoSIT boundary should be honest');
  assert(model.kosit.explainsWhyNotPureBrowser.includes('Java'), 'KoSIT explanation should mention Java');
  assert(model.kosit.explainsWhyNotPureBrowser.includes('Schematron'), 'KoSIT explanation should mention Schematron');
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
    assert(result.errors.some((error) => error.includes('Telefon')), `missing seller telephone error for ${formatId}`);
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
  for (const expected of ['invoiceNumber', 'issueDate', 'dueDate', 'buyerReference', 'orderNumber', 'sellerName', 'sellerEndpointId', 'sellerIdentifier', 'sellerTelephone', 'buyerName', 'paymentIban', 'paymentTerms', 'lineDescription', 'lineQuantity', 'lineNetPrice']) {
    assert(ids.includes(expected), `${expected} missing from required fields`);
  }
  assert(fields.every((field) => field.required === true), 'all returned fields should be marked required');
});


test('xrechnung field catalog is generated from the CIUS model with core advanced groups', () => {
  const catalog = require('../web/xrechnung-field-catalog.js');
  assert(catalog.meta.source.includes('xrechnung-cius-model.xml'), 'catalog source should name CIUS model');
  assert(catalog.meta.bundle === 'xrechnung-3.0.2-bundle-2026-01-31.zip', 'catalog should record bundle version');
  assert(catalog.meta.termCount >= 190, 'catalog should expose broad BT/BG term coverage');
  assert(catalog.meta.requiredTermCount >= 40, 'catalog should expose required terms from structure');
  const ids = catalog.terms.map((term) => term.id);
  for (const expected of ['BT-1', 'BT-2', 'BT-10', 'BT-20', 'BT-34', 'BT-49', 'BT-72', 'BT-84', 'BT-95', 'BT-99', 'BT-118', 'BT-126', 'BT-129', 'BT-130', 'BT-131', 'BT-153']) {
    assert(ids.includes(expected), `${expected} missing from catalog terms`);
  }
  for (const expected of ['BG-4', 'BG-7', 'BG-13', 'BG-20', 'BG-21', 'BG-23', 'BG-25', 'BG-27', 'BG-28', 'BG-31']) {
    const group = catalog.groups.find((entry) => entry.id === expected);
    assert(group, `${expected} missing from catalog groups`);
    assert(Array.isArray(group.children) && group.children.length > 0, `${expected} should expose child terms/groups`);
  }
});

test('runtime exposes full XRechnung catalog and advanced field groups without claiming full export support', () => {
  const catalog = app.getXRechnungFieldCatalog();
  assert(catalog.meta.termCount >= 190, 'runtime catalog term count too small');
  assert(catalog.groups.some((group) => group.id === 'BG-23' && /VAT BREAKDOWN/.test(group.name)), 'VAT breakdown group missing');
  const advanced = app.getAdvancedFieldGroups();
  const labels = advanced.map((group) => group.label).join(' | ');
  for (const expected of ['Referenzen', 'Parteien', 'Lieferung', 'Steuern', 'Zu-/Abschläge', 'Zahlung', 'Positionen erweitert', 'Anhänge']) {
    assert(labels.includes(expected), `advanced group missing: ${expected}`);
  }
  assert(advanced.every((group) => group.status === 'catalog-first'), 'advanced groups should be catalog-first until generators support round-trip');
});

test('xrechnung field catalog is used as background metadata on form fields, not as a visible reading list', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  assert(!html.includes('id="advancedFieldCatalog"'), 'field catalog should not be rendered as a visible catalog block');
  assert(!html.includes('<legend>XRechnung Feldkatalog</legend>'), 'visible field catalog section should be removed');
  for (const needle of [
    'id="invoiceNumber"', 'data-bt="BT-1"',
    'id="buyerReference"', 'data-bt="BT-10"',
    'id="paymentTerms"', 'data-bt="BT-20"',
    'id="sellerEndpointId"', 'data-bt="BT-34"',
    'id="buyerEndpointId"', 'data-bt="BT-49"',
    'id="lineDescription"', 'data-bt="BT-153"',
    'data-bg="BG-4"', 'data-bg="BG-7"', 'data-bg="BG-25"'
  ]) {
    assert(html.includes(needle), `missing background field metadata: ${needle}`);
  }
});

test('runtime exposes BT/BG form field bindings for preflight and agent UI filling', () => {
  const bindings = app.getFormFieldBindings();
  const byId = Object.fromEntries(bindings.map((field) => [field.id, field]));
  assert(byId.invoiceNumber.bt === 'BT-1', 'invoice number should bind to BT-1');
  assert(byId.buyerReference.bt === 'BT-10', 'buyer reference should bind to BT-10');
  assert(byId.paymentTerms.bt === 'BT-20', 'payment terms should bind to BT-20');
  assert(byId.sellerEndpointId.bg === 'BG-4', 'seller endpoint should bind to seller group');
  assert(byId.buyerEndpointId.bt === 'BT-49', 'buyer endpoint should bind to BT-49');
  assert(byId.lineDescription.bt === 'BT-153', 'line description should bind to item name BT-153');
  assert(bindings.every((field) => field.catalogName && field.groupName), 'bindings should be enriched from catalog metadata');
});

test('applyXRechnungFieldMetadata annotates existing inputs without duplicating visible catalog UI', () => {
  const inputs = new Map();
  for (const id of ['invoiceNumber', 'buyerReference', 'lineDescription']) {
    inputs.set(id, { dataset: {}, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } });
  }
  const document = { getElementById(id) { return inputs.get(id) || null; } };
  const result = app.applyXRechnungFieldMetadata(document);
  assert(result.annotated >= 3, 'expected field annotations');
  assert(inputs.get('invoiceNumber').dataset.bt === 'BT-1', 'invoiceNumber data-bt missing');
  assert(inputs.get('buyerReference').dataset.bt === 'BT-10', 'buyerReference data-bt missing');
  assert(inputs.get('lineDescription').dataset.bg === 'BG-31', 'lineDescription BG should point to item information group');
  assert(inputs.get('lineDescription').attributes.title.includes('BT-153'), 'title should include BT id for field-level help');
});

test('generate xrechnung ubl xml includes Leitweg-ID, payment terms, seller email and order reference', () => {
  const artifact = app.generateInvoice(sampleInvoice(), 'xrechnung-ubl');
  assert(artifact.mimeType === 'application/xml', 'UBL should be XML');
  assert(artifact.filename.endsWith('.xml'), 'UBL filename should be .xml');
  assert(artifact.content.includes('<cbc:BuyerReference>DEMO-LEITWEG-001</cbc:BuyerReference>'), 'BuyerReference missing');
  assert(artifact.content.includes('<cbc:ID>DEMO-ORDER-001</cbc:ID>'), 'OrderReference missing');
  assert(artifact.content.includes('<cbc:Note>Zahlbar innerhalb von 14 Tagen ohne Abzug.</cbc:Note>'), 'payment terms missing');
  assert(artifact.content.includes('seller@example.invalid'), 'seller email missing');
  assert(artifact.content.includes('<cac:Contact>'), 'seller contact missing');
  assert(artifact.content.includes('<cbc:Telephone>+49 30 123456</cbc:Telephone>'), 'seller telephone missing');
  assert(artifact.content.includes('DEMO-SELLER-ID'), 'seller identifier missing');
  assert(artifact.content.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'XRechnung customization missing');
  assert(artifact.content.includes('<cbc:PayableAmount currencyID="EUR">238.00</cbc:PayableAmount>'), 'Payable amount wrong');
  assert(artifact.content.indexOf('<cbc:Note>') < artifact.content.indexOf('<cbc:DocumentCurrencyCode>'), 'UBL Note must precede DocumentCurrencyCode for XSD sequence');
  assert(artifact.content.indexOf('<cbc:BuyerReference>') < artifact.content.indexOf('<cac:OrderReference>'), 'UBL BuyerReference must precede OrderReference');
});

test('generate xrechnung cii xml uses CII CrossIndustryInvoice syntax', () => {
  const artifact = app.generateInvoice(sampleInvoice(), 'xrechnung-cii');
  assert(artifact.mimeType === 'application/xml', 'CII should be XML');
  assert(artifact.filename.endsWith('.xml'), 'CII filename should be .xml');
  assert(artifact.content.includes('<rsm:CrossIndustryInvoice'), 'CII root missing');
  assert(artifact.content.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'XRechnung guideline missing');
  assert(artifact.content.includes('<ram:BuyerReference>DEMO-LEITWEG-001</ram:BuyerReference>'), 'BuyerReference missing');
  assert(artifact.content.includes('<ram:DefinedTradeContact>'), 'seller CII contact missing');
  assert(artifact.content.includes('<ram:CompleteNumber>+49 30 123456</ram:CompleteNumber>'), 'seller CII telephone missing');
  assert(artifact.content.indexOf('<ram:SpecifiedTradePaymentTerms>') < artifact.content.indexOf('<ram:SpecifiedTradeSettlementHeaderMonetarySummation>'), 'CII payment terms must precede monetary summation for XSD sequence');
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
    assert(artifact.content.includes('<ram:CompleteNumber>+49 30 123456</ram:CompleteNumber>'), `${formatId} embedded CII should include seller telephone`);
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

test('responsive type scale keeps hero and privacy copy compact', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'web', 'styles.css'), 'utf8');
  assert(css.includes('h1 { font-size: clamp(2.15rem, 4.8vw, 4.9rem)'), 'h1 type scale should be reduced');
  assert(css.includes('.lead { max-width: 680px; font-size: 1.03rem'), 'lead copy should be smaller/narrower');
  assert(css.includes('.privacy-card h2 { font-size: clamp(1.45rem, 2.4vw, 2.35rem)'), 'privacy h2 should be toned down');
});

test('required star is inserted inside inline label text before the input', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  assert(html.includes('<span class="label-text">Name<span class="required-star" aria-label="Pflichtfeld"> *</span></span>'), 'required star should sit next to Name text');
  assert(html.includes('<span class="label-text">Rechnungsnummer<span class="required-star" aria-label="Pflichtfeld"> *</span></span>'), 'required star should sit next to invoice label text');
  const css = fs.readFileSync(path.join(__dirname, '..', 'web', 'styles.css'), 'utf8');
  assert(css.includes('.label-text { display: inline-flex;'), 'label text should be inline-flex');
});

test('markRequiredFields does not duplicate static required stars', () => {
  const calls = [];
  const labels = new Map();
  const document = {
    getElementById(id) {
      const label = labels.get(id) || {
        querySelector(selector) { return selector === '.required-star' ? { className: 'required-star' } : null; },
        insertBefore() { calls.push(id); },
      };
      labels.set(id, label);
      return { required: false, closest() { return label; } };
    },
    createElement() { return { className: '', textContent: '', title: '' }; },
  };

  app.markRequiredFields(document);

  assert(calls.length === 0, 'static required stars should not be duplicated');
});

test('no persistence or network APIs are used by app helpers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.js'), 'utf8');
  for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'new WebSocket', 'sendBeacon']) {
    assert(!source.includes(banned), `banned browser API found: ${banned}`);
  }
});
