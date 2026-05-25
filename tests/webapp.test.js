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
    invoiceTypeCode: '380',
    dueDate: '2025-02-01',
    currency: 'EUR',
    businessProcessType: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
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

function makePdfWithAttachment(filename, attachmentText) {
  const escapedName = String(filename).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const escapedPayload = String(attachmentText).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = 'BT /F1 12 Tf 50 760 Td (Factur-X embedded XML fixture) Tj ET';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(factur-x.xml) 6 0 R] >> >> >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream\nendobj\n`,
    `6 0 obj\n<< /Type /Filespec /F (${escapedName}) /UF (${escapedName}) /EF << /F 7 0 R >> >>\nendobj\n`,
    `7 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Length ${Buffer.byteLength(escapedPayload, 'latin1')} >>\nstream\n${escapedPayload}\nendstream\nendobj\n`,
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

test('product page includes local document intake and PDF text extraction architecture without remote upload claims', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  assert(html.includes('id="sourceFile"'), 'missing local file input');
  assert(html.includes('accept=".pdf,.doc,.docx,.txt,.csv,.xml,application/pdf,text/plain,text/csv,application/xml,text/xml"'), 'missing accepted invoice formats');
  assert(html.includes('Datei bleibt in diesem Browser-Tab'), 'missing local-only upload wording');
  assert(html.includes('Eingebettetes PDF-XML lokal zuerst'), 'missing embedded PDF XML wording');
  assert(html.includes('Eingebetteter PDF-Text lokal extrahierbar'), 'missing embedded PDF text wording');
  assert(html.includes('Scan-OCR nur mit geprüfter lokaler Engine'), 'missing scan OCR boundary wording');
  assert(html.includes('GitHub Pages liefert nur HTML, CSS und JavaScript aus'), 'missing GitHub static hosting wording');
});

test('product page exposes full XRechnung product direction and advanced field groups', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  for (const needle of [
    'Großes Formular',
    'Alle XRechnung-BT/BG-Felder',
    'Referenzen, Parteien, Lieferung, Steuern, Zu-/Abschläge, Anhänge und Positionen erweitert',
    'Fehlende Pflichtangaben werden vor dem Generieren markiert',
    'eingebettetes Factur-X/ZUGFeRD/XRechnung-XML wird lokal zuerst gesucht',
    'xrechnung-3.0.2-bundle-2026-01-31.zip',
  ]) {
    assert(html.includes(needle), `missing full product direction copy: ${needle}`);
  }
});

test('form uses red yellow and white field priority semantics', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'web', 'styles.css'), 'utf8');
  assert(html.includes('field-priority-legend'), 'missing field priority legend');
  assert(html.includes('Rot = Pflichtfeld'), 'missing red required explanation');
  assert(html.includes('Gelb = wichtig oder bedingt erforderlich'), 'missing yellow conditional explanation');
  assert(html.includes('Weiß = optional oder bereits unauffällig'), 'missing white optional explanation');
  for (const cssClass of ['field-required', 'field-conditional', 'field-optional']) {
    assert(css.includes(`.${cssClass}`), `missing ${cssClass} CSS`);
    assert(html.includes(cssClass), `missing ${cssClass} usage`);
  }
});

test('runtime exposes field priority metadata for required conditional and optional fields', () => {
  const required = app.getFieldPriority('invoiceNumber');
  const conditional = app.getFieldPriority('sellerVatId');
  const optional = app.getFieldPriority('sellerWebsiteUrl');
  const dueDate = app.getFieldPriority('dueDate');
  const buyerEndpoint = app.getFieldPriority('buyerEndpointId');
  assert(required.priority === 'required', 'invoice number should be required priority');
  assert(dueDate.priority === 'required', 'due date blocks export and should be required priority');
  assert(buyerEndpoint.priority === 'required', 'buyer endpoint is catalog-required and should be required priority');
  assert(conditional.priority === 'conditional', 'seller VAT ID should be conditional priority');
  assert(optional.priority === 'optional', 'seller website URL should be optional priority');
  assert(app.getFieldsByPriority('required').some((field) => field.id === 'invoiceNumber'), 'required list missing invoice number');
  assert(app.getFieldsByPriority('conditional').some((field) => field.id === 'sellerVatId'), 'conditional list missing seller VAT ID');
  assert(app.getFieldsByPriority('optional').some((field) => field.id === 'sellerWebsiteUrl'), 'optional list missing seller website URL');
});

test('expanded form model includes references delivery allowances charges taxes attachments and output options', () => {
  const fieldIds = app.getFormFieldBindings().map((field) => field.id);
  for (const expected of [
    'invoiceTypeCode', 'businessProcessType', 'projectReference', 'contractReference', 'sellerOrderReference',
    'deliveryDate', 'deliveryRecipientName', 'deliveryStreet', 'deliveryCity', 'deliveryCountry',
    'allowanceAmount', 'allowanceReasonCode', 'chargeAmount', 'chargeReasonCode',
    'taxExemptionReason', 'attachmentId', 'attachmentDescription', 'outputLanguage', 'quantityUnitDisplayMode',
  ]) {
    assert(fieldIds.includes(expected), `missing expanded field binding: ${expected}`);
  }
});

test('field priorities match export-blocking preflight and helper metadata is explicit', () => {
  const requiredIds = app.getRequiredFields().map((field) => field.id);
  const redIds = app.getFieldsByPriority('required').map((field) => field.id).filter((id) => !id.startsWith('line'));
  for (const id of redIds) {
    assert(requiredIds.includes(id), `red required field is not preflight-blocking: ${id}`);
  }
  const invalid = sampleInvoice({ seller: { ...sampleInvoice().seller, street: '' } });
  const report = app.convertForAgent(invalid, 'xrechnung-ubl');
  assert(report.ok === false, 'blank red seller street should block conversion');
  assert(report.errors.some((error) => error.includes('Straße des Rechnungsstellers')), 'missing seller street error should be explicit');
  const scheme = app.getFormFieldBindings().find((field) => field.id === 'sellerEndpointSchemeId');
  assert(scheme.catalogName.includes('schemeID for BT-34'), 'seller endpoint scheme helper metadata should not masquerade as the endpoint value');
});

test('expanded editable fields are exported in UBL or explicitly scoped in metadata', () => {
  const invoice = sampleInvoice({
    invoiceTypeCode: '381',
    businessProcessType: 'urn:test:process',
    projectReference: 'PRJ-1',
    contractReference: 'CTR-1',
    sellerOrderReference: 'SO-1',
    delivery: { date: '2025-01-20', recipientName: 'Liefer Empfänger', street: 'Lieferweg 2', city: 'Lieferstadt', country: 'DE' },
    allowance: { amount: '10.00', reasonCode: '95' },
    charge: { amount: '2.50', reasonCode: 'FC' },
    tax: { exemptionReason: 'Steuerhinweis' },
    attachment: { id: 'ATT-1', description: 'Leistungsnachweis' },
  });
  const artifact = app.generateInvoice(invoice, 'xrechnung-ubl');
  for (const needle of ['<cbc:InvoiceTypeCode>381</cbc:InvoiceTypeCode>', '<cbc:ProfileID>urn:test:process</cbc:ProfileID>', '<cac:ProjectReference>', 'PRJ-1', '<cac:ContractDocumentReference>', 'CTR-1', '<cbc:SalesOrderID>SO-1</cbc:SalesOrderID>', '<cac:Delivery>', 'Liefer Empfänger', '<cac:AllowanceCharge>', '<cbc:ChargeIndicator>false</cbc:ChargeIndicator>', '<cbc:ChargeIndicator>true</cbc:ChargeIndicator>', 'Steuerhinweis', '<cac:AdditionalDocumentReference>', 'ATT-1', 'Leistungsnachweis']) {
    assert(artifact.content.includes(needle), `expanded field not exported: ${needle}`);
  }
  const allowedNonExported = ['sellerTradeName', 'sellerTaxId', 'sellerGlobalId', 'sellerTradeId', 'sellerWebsiteUrl', 'outputLanguage', 'quantityUnitDisplayMode'];
  const allowedUblOnly = ['projectReference', 'contractReference', 'sellerOrderReference', 'deliveryDate', 'deliveryRecipientName', 'deliveryStreet', 'deliveryCity', 'deliveryCountry', 'allowanceAmount', 'allowanceReasonCode', 'chargeAmount', 'chargeReasonCode', 'taxExemptionReason', 'attachmentId', 'attachmentDescription'];
  for (const field of app.getFormFieldBindings()) {
    if (field.exported === false) assert(allowedNonExported.includes(field.id), `unexpected non-exported field: ${field.id}`);
    if (field.exported === 'ubl-only') assert(allowedUblOnly.includes(field.id), `unexpected UBL-only field: ${field.id}`);
  }
});


test('cleared red DOM defaults do not silently pass preflight', () => {
  const base = sampleInvoice();
  for (const field of ['invoiceTypeCode', 'currency', 'businessProcessType']) {
    const invoice = { ...base, [field]: '' };
    const report = app.convertForAgent(invoice, 'xrechnung-ubl');
    assert(report.ok === false, `${field} should block when cleared`);
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

test('browser validation strategy exposes a realistic phased KoSIT-in-browser contract', () => {
  const strategy = app.getBrowserValidationStrategy();
  assert(strategy.goal === 'browser-local-xrechnung-validation', 'strategy should target browser-local validation');
  assert(strategy.officialKoSITInBrowser.feasible === 'theoretical-heavy-port', 'official Java KoSIT browser port should be classified as theoretical/heavy');
  assert(strategy.officialKoSITInBrowser.recommendation === 'do-not-port-java-first', 'should not start by porting Java KoSIT');
  assert(strategy.browserNativePipeline.steps.includes('xsd-wasm'), 'browser-native pipeline should include XSD/WASM');
  assert(strategy.browserNativePipeline.steps.includes('schematron-xslt'), 'browser-native pipeline should include Schematron/XSLT');
  assert(strategy.claimPolicy.beforeParity.includes('KoSIT CLI remains reference'), 'pre-parity wording must keep KoSIT CLI as reference');
});

test('browser xrechnung validation API returns local-only structured reports without official KoSIT claims', () => {
  const valid = app.generateInvoice(sampleInvoice(), 'xrechnung-ubl');
  let report = app.validateXRechnungInBrowser(valid.content, { formatId: 'xrechnung-ubl' });
  assert(report.ok === true, 'generated UBL should pass browser-local structural checks');
  assert(report.engine === 'browser-xrechnung-sanity', 'browser validator should identify non-official engine');
  assert(report.requiresServer === false, 'browser validation must be local-only');
  assert(report.officialKoSIT === false, 'browser sanity must not claim official KoSIT');
  assert(report.parityWithKoSIT === 'not-established', 'browser parity should not be claimed yet');
  assert(report.artifacts.includes('xrechnung-3.0.2-validator-configuration-2026-01-31.zip'), 'report should name versioned XRechnung config artifact');
  assert(report.checks.some((check) => check.name === 'BuyerReference' && check.ok), 'report should check BuyerReference');

  report = app.validateXRechnungInBrowser('<Invoice></Invoice>', { formatId: 'xrechnung-ubl' });
  assert(report.ok === false, 'malformed UBL should fail browser-local report');
  assert(report.errors.some((error) => /CustomizationID|BuyerReference|UBL/i.test(error)), 'malformed report should include structural error messages');

  report = app.validateXRechnungInBrowser('<Invoice><cbc:CustomizationID>urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID><cbc:BuyerReference>LW-1</cbc:BuyerReference>', { formatId: 'xrechnung-ubl' });
  assert(report.ok === false, 'unclosed XML must fail browser sanity validation');
  assert(report.checks.some((check) => check.name === 'well-formed XML' && !check.ok), 'well-formed XML check should fail');
  assert(report.errors.some((error) => /wohlgeformt|parse|XML/i.test(error)), 'well-formedness error should be explicit');

  report = app.validateXRechnungInBrowser('<Invoice a="unterminated><cbc:CustomizationID>urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID><cbc:BuyerReference>LW-1</cbc:BuyerReference></Invoice>', { formatId: 'xrechnung-ubl' });
  assert(report.ok === false, 'malformed attributes must fail browser sanity validation');
  assert(report.checks.some((check) => check.name === 'well-formed XML' && !check.ok), 'well-formed XML check should fail for bad attributes');
});

test('browser totals and XML tax subtotals handle mixed VAT rates per line', () => {
  const invoice = sampleInvoice({
    lines: [
      { description: 'Ermäßigte Leistung', quantity: '1', unitCode: 'C62', netPrice: '100.00', taxCategory: 'AA', taxPercent: '7' },
      { description: 'Regelleistung', quantity: '1', unitCode: 'C62', netPrice: '100.00', taxCategory: 'S', taxPercent: '19' },
    ],
  });
  const totals = app.calculateTotals(invoice.lines);
  assert(totals.lineNet === 200, 'mixed VAT line net should sum line amounts');
  assert(totals.tax === 26, `mixed VAT tax should be 26.00, got ${totals.tax}`);
  assert(totals.payable === 226, `mixed VAT payable should be 226.00, got ${totals.payable}`);
  assert(totals.taxGroups.length === 2, 'mixed VAT should create two tax groups');

  const artifact = app.generateInvoice(invoice, 'xrechnung-ubl');
  assert((artifact.content.match(/<cac:TaxSubtotal>/g) || []).length === 2, 'UBL should emit one TaxSubtotal per VAT group');
  assert(artifact.content.includes('<cbc:TaxAmount currencyID="EUR">26.00</cbc:TaxAmount>'), 'UBL total tax should be 26.00');
  assert(artifact.content.includes('<cbc:TaxableAmount currencyID="EUR">100.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">7.00</cbc:TaxAmount><cac:TaxCategory><cbc:ID>AA</cbc:ID><cbc:Percent>7.00</cbc:Percent>'), 'UBL missing 7% tax subtotal');
  assert(artifact.content.includes('<cbc:TaxableAmount currencyID="EUR">100.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">19.00</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>19.00</cbc:Percent>'), 'UBL missing 19% tax subtotal');
});

test('preflight blocks adjustments that would create negative mixed-VAT tax groups', () => {
  const invoice = sampleInvoice({
    allowance: { amount: '50.00', reasonCode: '95' },
    lines: [
      { description: 'Ermäßigte Leistung', quantity: '1', unitCode: 'C62', netPrice: '10.00', taxCategory: 'AA', taxPercent: '7' },
      { description: 'Regelleistung', quantity: '1', unitCode: 'C62', netPrice: '100.00', taxCategory: 'S', taxPercent: '19' },
    ],
  });
  const result = app.convertForAgent(invoice, 'xrechnung-ubl');
  assert(result.ok === false, 'allowance must not generate a negative VAT subtotal');
  assert(result.errors.some((error) => /negative Steuergruppe|Steuerkategorie-Zuordnung/i.test(error)), 'negative tax-group error should be explicit');
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

test('local XML intake auto-detects generated UBL fields for sourceFile autofill review', () => {
  const artifact = app.generateInvoice(sampleInvoice(), 'xrechnung-ubl');
  const parsed = app.parseLocalDocument({ name: artifact.filename, type: 'application/xml', text: artifact.content });
  assert(parsed.ok === true, 'generated UBL XML should parse as local source file');
  for (const [key, expected] of Object.entries({
    invoiceNumber: 'RE-2025-0001',
    issueDate: '2025-01-15',
    dueDate: '2025-02-01',
    invoiceTypeCode: '380',
    currency: 'EUR',
    businessProcessType: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
    buyerReference: 'DEMO-LEITWEG-001',
    orderNumber: 'DEMO-ORDER-001',
    paymentIban: 'DE00DEMO00000000000000',
    paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    sellerName: 'Demo Lieferant GmbH',
    sellerStreet: 'Hauptstr. 1',
    sellerPostalCode: '10115',
    sellerCity: 'Berlin',
    sellerCountry: 'DE',
    sellerEndpointId: 'seller@example.invalid',
    sellerIdentifier: 'DEMO-SELLER-ID',
    sellerTelephone: '+49 30 123456',
    buyerName: 'Demo Empfänger',
    buyerStreet: 'Empfängerweg 1',
    buyerPostalCode: '00000',
    buyerCity: 'Demostadt',
    buyerCountry: 'DE',
    lineDescription: 'Beratungsleistung',
    lineQuantity: '2',
    lineUnitCode: 'HUR',
    lineNetPrice: '100.00',
    lineTaxPercent: '19.00',
  })) {
    assert(parsed.fields[key] === expected, `${key} should autofill from XML source file, got ${parsed.fields[key]}`);
  }
  assert(parsed.fieldSources.invoiceNumber.includes('XML'), 'field source metadata should explain XML detection');
  assert(parsed.requiresHumanReview === true, 'auto-detected XML fields must still require review');
});

test('local CII XML intake auto-detects generated fields for sourceFile autofill review', () => {
  const artifact = app.generateInvoice(sampleInvoice(), 'xrechnung-cii');
  const parsed = app.parseLocalDocument({ name: artifact.filename, type: 'application/xml', text: artifact.content });
  assert(parsed.ok === true, 'generated CII XML should parse as local source file');
  assert(parsed.fields.invoiceNumber === 'RE-2025-0001', 'CII invoice number missing');
  assert(parsed.fields.issueDate === '2025-01-15', 'CII issue date missing');
  assert(parsed.fields.invoiceTypeCode === '380', 'CII invoice type code missing');
  assert(parsed.fields.businessProcessType === 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0', 'CII business process/profile missing');
  assert(parsed.fields.buyerReference === 'DEMO-LEITWEG-001', 'CII buyer reference missing');
  assert(parsed.fields.orderNumber === 'DEMO-ORDER-001', 'CII order number missing');
  assert(parsed.fields.paymentIban === 'DE00DEMO00000000000000', 'CII IBAN missing');
  assert(parsed.fields.sellerName === 'Demo Lieferant GmbH', 'CII seller name missing');
  assert(parsed.fields.sellerTelephone === '+49 30 123456', 'CII seller telephone missing');
  assert(parsed.fields.buyerName === 'Demo Empfänger', 'CII buyer name missing');
  assert(parsed.fields.lineDescription === 'Beratungsleistung', 'CII line description missing');
  assert(parsed.fields.lineQuantity === '2', 'CII line quantity missing');
  assert(parsed.fields.lineNetPrice === '100.00', 'CII line net price missing');
  assert(parsed.fieldSources.invoiceNumber.includes('XML'), 'CII field source metadata should explain XML detection');
});

test('sourceFile review UI exposes automatic recognition status and field-level sources', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  for (const needle of [
    'id="extractionReview"',
    'Die Verarbeitung startet automatisch',
    'id="recognizedFieldList"',
    'Erkannte Felder',
    'PDF auswählen → Felder lokal vorschlagen → prüfen → validieren → exportieren',
    'Standardfelder',
    'Weitere XRechnung-Felder',
    'Validierung & Export',
  ]) {
    assert(html.includes(needle), `missing sourceFile review UI copy: ${needle}`);
  }
});

test('sourceFile applyParsedFields reports filled and missing required fields with sources', () => {
  const values = new Map();
  const inputs = new Map();
  const makeInput = (id) => {
    const input = { dataset: {}, classList: { add() {} } };
    Object.defineProperty(input, 'value', {
      get() { return values.get(id) || ''; },
      set(value) { values.set(id, value); },
    });
    return input;
  };
  const fieldList = { children: [], appendChild(node) { this.children.push(node); }, textContent: '' };
  const review = { hidden: true };
  const summary = { textContent: '', className: '' };
  const makeNode = (tag) => ({ tag, children: [], className: '', textContent: '', dataset: {}, appendChild(node) { this.children.push(node); }, setAttribute() {} });
  const document = {
    getElementById(id) {
      if (id === 'recognizedFieldList') return fieldList;
      if (id === 'extractionReview') return review;
      if (id === 'extractionSummary') return summary;
      if (['invoiceNumber', 'buyerReference', 'sellerName', 'invoiceTypeCode', 'businessProcessType'].includes(id) || app.getRequiredFields().some((field) => field.id === id)) {
        if (!inputs.has(id)) inputs.set(id, makeInput(id));
        return inputs.get(id);
      }
      return null;
    },
    createElement: makeNode,
  };
  const report = app.applyParsedFields(document, {
    invoiceNumber: 'RE-SRC-1',
    invoiceTypeCode: '381',
    businessProcessType: 'urn:test:source-profile',
    buyerReference: 'LW-SRC-1',
    sellerName: 'Quelle GmbH',
  }, {
    invoiceNumber: 'XML lokale Dateierkennung',
    invoiceTypeCode: 'XML lokale Dateierkennung',
    businessProcessType: 'XML lokale Dateierkennung',
    buyerReference: 'XML lokale Dateierkennung',
    sellerName: 'XML lokale Dateierkennung',
  });
  assert(report.filled.length === 5, 'expected five filled fields');
  assert(report.missingRequired.includes('paymentIban'), 'missing required IBAN should be reported');
  assert(values.get('invoiceNumber') === 'RE-SRC-1', 'invoiceNumber should be written to DOM');
  assert(values.get('invoiceTypeCode') === '381', 'invoiceTypeCode should be written to DOM');
  assert(values.get('businessProcessType') === 'urn:test:source-profile', 'businessProcessType should be written to DOM');
  assert(review.hidden === false, 'review panel should become visible');
  assert(summary.textContent.includes('5 Felder'), 'summary should mention filled count');
  assert(fieldList.children.length >= 3, 'field list should render recognized field rows');
});



test('sourceFile applyParsedFields treats ungrounded required defaults as still needing review', () => {
  const defaultValues = new Map([
    ['invoiceTypeCode', '380'],
    ['currency', 'EUR'],
    ['businessProcessType', 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
  ]);
  const inputs = new Map();
  const makeInput = (id) => {
    const input = { dataset: {}, classList: { add() {} } };
    Object.defineProperty(input, 'value', {
      get() { return defaultValues.get(id) || ''; },
      set(value) { defaultValues.set(id, value); },
    });
    return input;
  };
  const fieldList = { children: [], appendChild(node) { this.children.push(node); }, textContent: '' };
  const review = { hidden: true };
  const summary = { textContent: '', className: '' };
  const makeNode = (tag) => ({ tag, children: [], className: '', textContent: '', dataset: {}, appendChild(node) { this.children.push(node); }, setAttribute() {} });
  const document = {
    getElementById(id) {
      if (id === 'recognizedFieldList') return fieldList;
      if (id === 'extractionReview') return review;
      if (id === 'extractionSummary') return summary;
      if (app.getRequiredFields().some((field) => field.id === id)) {
        if (!inputs.has(id)) inputs.set(id, makeInput(id));
        return inputs.get(id);
      }
      return null;
    },
    createElement: makeNode,
  };

  app.applyXRechnungFieldMetadata(document);
  const report = app.applyParsedFields(document, {
    invoiceNumber: 'RE-SRC-PARTIAL',
    buyerReference: 'LW-SRC-PARTIAL',
    orderNumber: 'PO-SRC-PARTIAL',
  }, {
    invoiceNumber: 'TXT lokale Dateierkennung',
    buyerReference: 'TXT lokale Dateierkennung',
    orderNumber: 'TXT lokale Dateierkennung',
  });

  assert(report.missingRequired.includes('invoiceTypeCode'), 'default invoice type must remain missing/unconfirmed without source metadata');
  assert(report.missingRequired.includes('currency'), 'default currency must remain missing/unconfirmed without source metadata');
  assert(report.missingRequired.includes('businessProcessType'), 'default ProfileID must remain missing/unconfirmed without source metadata');
  assert(!report.missingRequired.includes('invoiceNumber'), 'source-backed invoice number should not remain missing');
});



test('sourceFile review accepts required default values after an explicit user edit confirmation', () => {
  const values = new Map([
    ['invoiceTypeCode', '380'],
    ['currency', 'EUR'],
    ['businessProcessType', 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'],
  ]);
  const listeners = new Map();
  const inputs = new Map();
  const makeInput = (id) => {
    const input = {
      dataset: {},
      classList: { add() {} },
      setAttribute() {},
      addEventListener(type, handler) { listeners.set(`${id}:${type}`, handler); },
    };
    Object.defineProperty(input, 'value', {
      get() { return values.get(id) || ''; },
      set(value) { values.set(id, value); },
    });
    return input;
  };
  const fieldList = { children: [], appendChild(node) { this.children.push(node); }, textContent: '' };
  const review = { hidden: true };
  const summary = { textContent: '', className: '' };
  const makeNode = (tag) => ({ tag, children: [], className: '', textContent: '', dataset: {}, appendChild(node) { this.children.push(node); }, setAttribute() {} });
  const document = {
    getElementById(id) {
      if (id === 'recognizedFieldList') return fieldList;
      if (id === 'extractionReview') return review;
      if (id === 'extractionSummary') return summary;
      if (app.getRequiredFields().some((field) => field.id === id)) {
        if (!inputs.has(id)) inputs.set(id, makeInput(id));
        return inputs.get(id);
      }
      return null;
    },
    createElement: makeNode,
  };

  app.applyXRechnungFieldMetadata(document);
  listeners.get('invoiceTypeCode:input')?.();
  listeners.get('currency:input')?.();
  listeners.get('businessProcessType:input')?.();
  app.applyXRechnungFieldMetadata(document);

  const report = app.applyParsedFields(document, {
    invoiceNumber: 'RE-SRC-PARTIAL',
    buyerReference: 'LW-SRC-PARTIAL',
    orderNumber: 'PO-SRC-PARTIAL',
  }, {
    invoiceNumber: 'TXT lokale Dateierkennung',
    buyerReference: 'TXT lokale Dateierkennung',
    orderNumber: 'TXT lokale Dateierkennung',
  });

  assert(!report.missingRequired.includes('invoiceTypeCode'), 'user-confirmed invoice type should not remain missing');
  assert(!report.missingRequired.includes('currency'), 'user-confirmed currency should not remain missing');
  assert(!report.missingRequired.includes('businessProcessType'), 'user-confirmed ProfileID should not remain missing');
});

test('browser execution model mirrors competitor-style review funnel while keeping local-first boundary', () => {
  const model = app.getBrowserExecutionModel();
  assert(model.workflow.join(' → ') === 'source-file → local-recognition → review-and-complete → browser-validation → export', 'workflow should expose upload/extract/review/validate/export funnel');
  assert(model.dataLeavesDeviceByDefault === false, 'workflow should remain local-first');
  assert(model.review.required === true, 'auto-filled fields should require review');
  assert(model.review.fieldSources === true, 'review should expose field sources');
  assert(model.validation.browserNativePipeline.steps.includes('xsd-wasm'), 'browser-native validator plan should include XSD/WASM');
  assert(model.validation.browserNativePipeline.steps.includes('schematron-xslt'), 'browser-native validator plan should include Schematron/XSLT');
});

test('docs explain local review funnel without naming proprietary reference sites', () => {
  const docs = fs.readFileSync(path.join(__dirname, '..', 'docs', 'browser-agent-api.md'), 'utf8');
  for (const banned of ['tools.pdf' + '24.org', 'PDF' + '24']) {
    assert(!docs.includes(banned), 'public docs should not name proprietary reference sites');
  }
  for (const needle of [
    'Datei auswählen → lokale Erkennung → prüfen und ergänzen → Browser-Validierung → Export',
    'keine Cloud-AI-Erkennung',
    'Feldquelle',
  ]) {
    assert(docs.includes(needle), `missing local review funnel note: ${needle}`);
  }
});

test('local document intake is honest about doc/docx needing a browser-local extraction engine', () => {
  for (const name of ['invoice.doc', 'invoice.docx']) {
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

test('PDF.js candidate facts are documented without implying a bundled runtime', () => {
  const docs = fs.readFileSync(path.join(__dirname, '..', 'docs', 'browser-agent-api.md'), 'utf8');
  for (const needle of [
    'PDF.js',
    'Apache-2.0',
    'pdfjs-dist@4.10.38',
    'nicht gebündelt',
    'nur einfachen eingebetteten PDF-Text',
    'keine OCR für Scan-/Bild-PDFs',
    'keine Runtime-Netzwerk-/Persistenz-APIs',
  ]) {
    assert(docs.includes(needle), `missing PDF engine decision/limit: ${needle}`);
  }
});

test('built-in browser-local PDF text extractor maps embedded text as review-required suggestions', async () => {
  const parsed = await app.parseLocalDocument({
    name: 'invoice.pdf',
    type: 'application/pdf',
    bytes: makeTinyTextPdf([
      'Rechnungsnummer: RE-PDF-TEXT-1',
      'Leitweg-ID: LW-PDF-TEXT-1',
      'Auftragsnummer: PO-PDF-TEXT-1',
      'IBAN: DE89370400440532013000',
      'Zahlungsbedingungen: 14 Tage ohne Abzug',
      'Telefon: +49 30 123456',
      'E-Mail: seller@example.invalid'
    ])
  });
  assert(parsed.ok === true, 'embedded PDF text should parse locally');
  assert(parsed.usedLocalExtractor === true, 'built-in PDF extractor should run through local extractor hook');
  assert(parsed.extractionMethod === 'browser-local-pdf-text', 'method should identify browser-local PDF text extraction');
  assert(parsed.requiresServer === false, 'PDF text extraction must not require a server');
  assert(parsed.requiresHumanReview === true, 'PDF suggestions must require human review');
  assert(parsed.confidence >= 0.6 && parsed.confidence < 1, 'embedded PDF text extraction should be useful but not final truth');
  assert(parsed.fields.invoiceNumber === 'RE-PDF-TEXT-1', 'invoice number missing from embedded PDF text');
  assert(parsed.fields.buyerReference === 'LW-PDF-TEXT-1', 'buyer reference missing from embedded PDF text');
  assert(parsed.fields.orderNumber === 'PO-PDF-TEXT-1', 'order number missing from embedded PDF text');
  assert(parsed.fields.paymentIban === 'DE89370400440532013000', 'IBAN missing from embedded PDF text');
});

test('built-in browser-local PDF text extractor fails closed for scanned empty or unmapped PDFs', async () => {
  let parsed = await app.parseLocalDocument({
    name: 'scan.pdf',
    type: 'application/pdf',
    bytes: makeTinyTextPdf([])
  });
  assert(parsed.ok === false, 'empty/scanned-like PDF should not be treated as extracted invoice data');
  assert(parsed.requiresLocalOcrEngine === true, 'scan-like PDF should require a local OCR engine');
  assert(parsed.requiresServer === false, 'scan-like PDF should not suggest a server fallback');
  assert(parsed.requiresHumanReview === true, 'scan-like PDF boundary should remain review-required');
  assert(parsed.confidence <= 0.2, 'scan-like PDF should be low confidence');
  assert(parsed.errors.some((error) => /eingebetteten PDF-Text|Scan|OCR/i.test(error)), 'scan-like PDF should explain embedded text/OCR boundary');
  assert(Object.keys(parsed.fields).length === 0, 'scan-like PDF must not invent fields');

  parsed = await app.parseLocalDocument({
    name: 'letter.pdf',
    type: 'application/pdf',
    bytes: makeTinyTextPdf(['Dies ist Text, aber keine erkennbaren Rechnungsfelder.'])
  });
  assert(parsed.ok === false, 'PDF text without mapped invoice fields should fail closed');
  assert(parsed.confidence <= 0.2, 'unmapped PDF text should be downgraded to low confidence');
  assert(Object.keys(parsed.fields).length === 0, 'unmapped PDF text must not invent fields');
});

test('built-in browser-local PDF text extractor returns structured errors for broken PDF input', async () => {
  const parsed = await app.parseLocalDocument({
    name: 'broken.pdf',
    type: 'application/pdf',
    bytes: Buffer.from('not a pdf', 'utf8')
  });
  assert(parsed.ok === false, 'broken PDF should fail structurally');
  assert(parsed.requiresServer === false, 'broken PDF should not need server fallback');
  assert(parsed.requiresLocalOcrEngine === true, 'broken PDF should remain local-engine bounded');
  assert(Array.isArray(parsed.errors) && parsed.errors.length > 0, 'broken PDF should return structured errors');
});

test('pdf intake extracts embedded Factur-X or ZUGFeRD XML before text OCR fallback', async () => {
  const embeddedXml = '<rsm:CrossIndustryInvoice><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>FX-1</ram:ID></rsm:ExchangedDocument><ram:BuyerReference>LW-FX-1</ram:BuyerReference></rsm:CrossIndustryInvoice>';
  const parsed = await app.parseLocalDocument({
    name: 'factur-x.pdf',
    type: 'application/pdf',
    bytes: makePdfWithAttachment('factur-x.xml', embeddedXml)
  });
  assert(parsed.ok === true, 'embedded XML PDF should parse locally');
  assert(parsed.extractionMethod === 'browser-local-pdf-embedded-xml', 'embedded XML should be preferred over text extraction');
  assert(parsed.embeddedXml && /invoice\.xml$|factur-x\.xml$/.test(parsed.embeddedXml.filename), 'embedded XML metadata missing');
  assert(parsed.fields.invoiceNumber === 'FX-1', 'embedded CII invoice id missing');
  assert(parsed.fields.buyerReference === 'LW-FX-1', 'embedded CII buyer reference missing');
  assert(parsed.requiresHumanReview === true, 'embedded XML mapping still needs human review');
  assert(parsed.requiresServer === false, 'embedded XML extraction must not require server');
});

test('embedded XML extraction rejects unsafe or non-invoice PDF attachments', async () => {
  const parsed = await app.parseLocalDocument({
    name: 'attachment.pdf',
    type: 'application/pdf',
    bytes: makePdfWithAttachment('payload.js', '<script>alert(1)</script>')
  });
  assert(parsed.ok === false, 'non-invoice embedded attachment must not parse as invoice');
  assert(parsed.requiresServer === false, 'unsafe attachment must not require server fallback');
  assert(Object.keys(parsed.fields).length === 0, 'unsafe attachment must not invent fields');
  assert(parsed.errors.some((error) => /eingebettetes XML|Rechnungs-XML|Factur-X|ZUGFeRD/i.test(error)), 'unsafe attachment should explain embedded XML boundary');
});

test('embedded XML extraction ignores invoice-looking page streams that are not file attachments', async () => {
  const fakeInvoicePagePdf = makePdfWithAttachment('readme.txt', 'not invoice text').toString('latin1')
    .replace('Factur-X embedded XML fixture', '<rsm:CrossIndustryInvoice><ram:ID>FALSE-PAGE</ram:ID><ram:BuyerReference>LW-FALSE</ram:BuyerReference></rsm:CrossIndustryInvoice>');
  const parsed = await app.parseLocalDocument({
    name: 'fake-page-stream.pdf',
    type: 'application/pdf',
    bytes: Buffer.from(fakeInvoicePagePdf, 'latin1')
  });
  assert(parsed.ok === false, 'invoice-looking page stream must not parse as embedded invoice XML');
  assert(parsed.extractionMethod === 'browser-local-pdf-embedded-xml', 'should fail in embedded XML boundary, not text fallback');
  assert(Object.keys(parsed.fields).length === 0, 'page-stream XML must not prefill fields');
});

test('embedded XML extraction requires invoice profiles not generic XML-looking invoices', async () => {
  const genericXml = '<Invoice><cbc:ID>GENERIC-1</cbc:ID><cbc:BuyerReference>LW-GENERIC</cbc:BuyerReference></Invoice>';
  const parsed = await app.parseLocalDocument({
    name: 'generic.pdf',
    type: 'application/pdf',
    bytes: makePdfWithAttachment('invoice.xml', genericXml)
  });
  assert(parsed.ok === false, 'generic XML invoice without profile markers should not be treated as Factur-X/ZUGFeRD/XRechnung');
  assert(Object.keys(parsed.fields).length === 0, 'generic embedded XML must not prefill fields');
});

function makePdfWithNonFilespecEfAttachment(attachmentText) {
  const escapedPayload = String(attachmentText).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(not-filespec.xml) 6 0 R] >> >> >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n',
    '6 0 obj\n<< /Type /NotAFileSpec /EF << /F 7 0 R >> >>\nendobj\n',
    `7 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Length ${Buffer.byteLength(escapedPayload, 'latin1')} >>\nstream\n${escapedPayload}\nendstream\nendobj\n`,
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join('')}%%EOF\n`, 'latin1');
}

test('embedded XML extraction rejects EF references from non-Filespec objects', async () => {
  const profiledXml = '<rsm:CrossIndustryInvoice><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>BAD-EF</ram:ID></rsm:ExchangedDocument><ram:BuyerReference>LW-BAD-EF</ram:BuyerReference></rsm:CrossIndustryInvoice>';
  const parsed = await app.parseLocalDocument({
    name: 'not-filespec.pdf',
    type: 'application/pdf',
    bytes: makePdfWithNonFilespecEfAttachment(profiledXml)
  });
  assert(parsed.ok === false, 'non-Filespec /EF reference must not parse as invoice attachment');
  assert(Object.keys(parsed.fields).length === 0, 'non-Filespec /EF reference must not prefill fields');
});

function makePdfWithFakeFilespecInsidePageStream(attachmentText) {
  const escapedPayload = String(attachmentText).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const fakeContent = 'BT (/Type /Filespec /EF << /F 7 0 R >>) Tj ET';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(fake.xml) 5 0 R] >> >> >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(fakeContent, 'latin1')} >>\nstream\n${fakeContent}\nendstream\nendobj\n`,
    `7 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Length ${Buffer.byteLength(escapedPayload, 'latin1')} >>\nstream\n${escapedPayload}\nendstream\nendobj\n`,
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join('')}%%EOF\n`, 'latin1');
}

test('embedded XML extraction ignores fake Filespec EF tokens inside page streams', async () => {
  const profiledXml = '<rsm:CrossIndustryInvoice><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>FAKE-STREAM</ram:ID></rsm:ExchangedDocument><ram:BuyerReference>LW-FAKE-STREAM</ram:BuyerReference></rsm:CrossIndustryInvoice>';
  const parsed = await app.parseLocalDocument({
    name: 'fake-filespec-stream.pdf',
    type: 'application/pdf',
    bytes: makePdfWithFakeFilespecInsidePageStream(profiledXml)
  });
  assert(parsed.ok === false, 'Filespec-looking stream text must not authorize an embedded XML stream');
  assert(Object.keys(parsed.fields).length === 0, 'Filespec-looking stream text must not prefill fields');
});

function makePdfWithMetadataAndPageEmbeddedFileStream(attachmentText) {
  const escapedPayload = String(attachmentText).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const xmp = '<rdf:Description xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#"><fx:DocumentFileName>factur-x.xml</fx:DocumentFileName></rdf:Description>';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Metadata 4 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>\nendobj\n',
    `4 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${Buffer.byteLength(xmp, 'latin1')} >>\nstream\n${xmp}\nendstream\nendobj\n`,
    `5 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Length ${Buffer.byteLength(escapedPayload, 'latin1')} >>\nstream\n${escapedPayload}\nendstream\nendobj\n`,
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join('')}%%EOF\n`, 'latin1');
}

test('metadata-only embedded XML extraction rejects page content streams', async () => {
  const profiledXml = '<rsm:CrossIndustryInvoice><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>META-PAGE</ram:ID></rsm:ExchangedDocument><ram:BuyerReference>LW-META-PAGE</ram:BuyerReference></rsm:CrossIndustryInvoice>';
  const parsed = await app.parseLocalDocument({
    name: 'metadata-page-stream.pdf',
    type: 'application/pdf',
    bytes: makePdfWithMetadataAndPageEmbeddedFileStream(profiledXml)
  });
  assert(parsed.ok === false, 'Factur-X metadata must not make page content an embedded invoice attachment');
  assert(Object.keys(parsed.fields).length === 0, 'metadata page stream must not prefill fields');
});

function makePdfWithEmptyStreamFilespecEf(attachmentText) {
  const escapedPayload = String(attachmentText).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(empty-stream-filespec.xml) 6 0 R] >> >> >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n',
    '6 0 obj\n<< /Type /Filespec /F (empty-stream-filespec.xml) /EF << /F 7 0 R >> /Length 0 >>\nstream\n\nendstream\nendobj\n',
    `7 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Length ${Buffer.byteLength(escapedPayload, 'latin1')} >>\nstream\n${escapedPayload}\nendstream\nendobj\n`,
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join('')}%%EOF\n`, 'latin1');
}

test('embedded XML extraction rejects Filespec EF tokens from empty stream objects', async () => {
  const profiledXml = '<rsm:CrossIndustryInvoice><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>EMPTY-STREAM-EF</ram:ID></rsm:ExchangedDocument><ram:BuyerReference>LW-EMPTY-STREAM-EF</ram:BuyerReference></rsm:CrossIndustryInvoice>';
  const parsed = await app.parseLocalDocument({
    name: 'empty-stream-filespec.pdf',
    type: 'application/pdf',
    bytes: makePdfWithEmptyStreamFilespecEf(profiledXml)
  });
  assert(parsed.ok === false, 'Filespec/EF tokens on stream objects must not authorize invoice attachments');
  assert(Object.keys(parsed.fields).length === 0, 'empty stream Filespec/EF tokens must not prefill fields');
});

function makePdfWithFakeMetadataTokenInPageStream(attachmentText) {
  const escapedPayload = String(attachmentText).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const fakeMetadataContent = 'BT (<fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>) Tj ET';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(fakeMetadataContent, 'latin1')} >>\nstream\n${fakeMetadataContent}\nendstream\nendobj\n`,
    `7 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Length ${Buffer.byteLength(escapedPayload, 'latin1')} >>\nstream\n${escapedPayload}\nendstream\nendobj\n`,
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join('')}%%EOF\n`, 'latin1');
}

test('metadata-only embedded XML extraction ignores fake Factur-X metadata tokens in page streams', async () => {
  const profiledXml = '<rsm:CrossIndustryInvoice><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>FAKE-METADATA</ram:ID></rsm:ExchangedDocument><ram:BuyerReference>LW-FAKE-METADATA</ram:BuyerReference></rsm:CrossIndustryInvoice>';
  const parsed = await app.parseLocalDocument({
    name: 'fake-metadata-page-token.pdf',
    type: 'application/pdf',
    bytes: makePdfWithFakeMetadataTokenInPageStream(profiledXml)
  });
  assert(parsed.ok === false, 'Factur-X-looking page text must not enable metadata fallback');
  assert(Object.keys(parsed.fields).length === 0, 'fake metadata page text must not prefill fields');
});

function makePdfWithFakeObjectsInsidePageStream(attachmentText) {
  const escapedPayload = String(attachmentText).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const injected = `BT (visible text) Tj ET\nendobj\n6 0 obj\n<< /Type /Filespec /F (fake.xml) /EF << /F 7 0 R >> >>\nendobj\n7 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Length ${Buffer.byteLength(escapedPayload, 'latin1')} >>\nstream\n${escapedPayload}\nendstream`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(fake.xml) 6 0 R] >> >> >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(injected, 'latin1')} >>\nstream\n${injected}\nendstream\nendobj\n`,
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join('')}%%EOF\n`, 'latin1');
}

test('embedded XML extraction ignores fake PDF objects injected inside page streams', async () => {
  const profiledXml = '<rsm:CrossIndustryInvoice><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>INJECTED-OBJECT</ram:ID></rsm:ExchangedDocument><ram:BuyerReference>LW-INJECTED-OBJECT</ram:BuyerReference></rsm:CrossIndustryInvoice>';
  const parsed = await app.parseLocalDocument({
    name: 'injected-objects-in-stream.pdf',
    type: 'application/pdf',
    bytes: makePdfWithFakeObjectsInsidePageStream(profiledXml)
  });
  assert(parsed.ok === false, 'object syntax inside page streams must not define attachments');
  assert(Object.keys(parsed.fields).length === 0, 'object syntax inside page streams must not prefill fields');
});

function makePdfWithEarlyEndstreamInjectedObjects(attachmentText, useIndirectLength = false) {
  const escapedPayload = String(attachmentText).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const injected = `BT (visible text) Tj ET\nendstream\nendobj\n6 0 obj\n<< /Type /Filespec /F (fake.xml) /EF << /F 7 0 R >> >>\nendobj\n7 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Length ${Buffer.byteLength(escapedPayload, 'latin1')} >>\nstream\n${escapedPayload}\nendstream\nendobj`;
  const lengthObject = useIndirectLength ? `8 0 obj\n${Buffer.byteLength(injected, 'latin1')}\nendobj\n` : '';
  const lengthValue = useIndirectLength ? '8 0 R' : String(Buffer.byteLength(injected, 'latin1'));
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(fake.xml) 6 0 R] >> >> >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>\nendobj\n',
    `5 0 obj\n<< /Length ${lengthValue} >>\nstream\n${injected}\nendstream\nendobj\n`,
    lengthObject,
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join('')}%%EOF\n`, 'latin1');
}

test('embedded XML extraction ignores early endstream object injection inside page streams', async () => {
  const profiledXml = '<rsm:CrossIndustryInvoice><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>EARLY-ENDSTREAM</ram:ID></rsm:ExchangedDocument><ram:BuyerReference>LW-EARLY-ENDSTREAM</ram:BuyerReference></rsm:CrossIndustryInvoice>';
  let parsed = await app.parseLocalDocument({
    name: 'early-endstream-injection.pdf',
    type: 'application/pdf',
    bytes: makePdfWithEarlyEndstreamInjectedObjects(profiledXml)
  });
  assert(parsed.ok === false, 'early endstream bytes inside page streams must not define attachments');
  assert(Object.keys(parsed.fields).length === 0, 'early endstream bytes inside page streams must not prefill fields');

  parsed = await app.parseLocalDocument({
    name: 'early-endstream-indirect-length-injection.pdf',
    type: 'application/pdf',
    bytes: makePdfWithEarlyEndstreamInjectedObjects(profiledXml, true)
  });
  assert(parsed.ok === false, 'indirect-length page streams must not expose injected fake attachment objects');
  assert(Object.keys(parsed.fields).length === 0, 'indirect-length page stream injection must not prefill fields');
});

test('all shipped browser runtime files avoid network and persistence APIs', () => {
  const root = path.join(__dirname, '..', 'web');
  const runtimeFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs|html)$/i.test(entry.name)) runtimeFiles.push(full);
    }
  };
  walk(root);
  assert(runtimeFiles.length >= 3, 'expected shipped web runtime files');
  for (const file of runtimeFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'new WebSocket', 'sendBeacon']) {
      assert(!source.includes(banned), `banned browser API found in ${path.relative(root, file)}: ${banned}`);
    }
  }
});

test('browser execution model explains GitHub Pages hosting, user hardware and KoSIT boundary', () => {
  const model = app.getBrowserExecutionModel();
  assert(model.githubPages === 'static-hosting-only', 'GitHub Pages should only host static files');
  assert(model.runsOnUserHardware === true, 'browser work should run on user hardware');
  assert(model.requiresApplicationServer === false, 'product should not need an application server');
  assert(model.ocr.builtInPdfTextExtraction.method === 'browser-local-pdf-embedded-xml-or-text', 'built-in PDF extractor should be documented');
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



test('preflight blocks invalid allowance and charge amounts before negative totals can be generated', () => {
  const excessiveAllowance = app.convertForAgent(sampleInvoice({ allowance: { amount: '250.00', reasonCode: '95' } }), 'xrechnung-ubl');
  assert(excessiveAllowance.ok === false, 'allowance greater than line net must block conversion');
  assert(excessiveAllowance.errors.some((error) => /Abschlag|steuerpflichtige Summe|negativ/i.test(error)), 'negative taxable total error should be explicit');

  const roundingBoundary = app.convertForAgent(sampleInvoice({ allowance: { amount: '200.005', reasonCode: '95' } }), 'xrechnung-ubl');
  assert(roundingBoundary.ok === false, 'allowance that rounds above line net must block conversion');
  assert(roundingBoundary.errors.some((error) => /Dezimalstellen|steuerpflichtige Summe|negativ/i.test(error)), 'rounding boundary error should be explicit');

  const negativeAllowance = app.convertForAgent(sampleInvoice({ allowance: { amount: '-1.00', reasonCode: '95' } }), 'xrechnung-ubl');
  assert(negativeAllowance.ok === false, 'negative allowance amount must block conversion');
  assert(negativeAllowance.errors.some((error) => /Abschlag/i.test(error)), 'negative allowance error should name allowance');

  const badCharge = app.convertForAgent(sampleInvoice({ charge: { amount: 'abc', reasonCode: 'FC' } }), 'xrechnung-ubl');
  assert(badCharge.ok === false, 'non-numeric charge amount must block conversion');
  assert(badCharge.errors.some((error) => /Zuschlag/i.test(error)), 'non-numeric charge error should name charge');
});

test('CII and hybrid totals ignore UBL-only allowance and charge fields until CII export supports them', () => {
  const invoice = sampleInvoice({ allowance: { amount: '10.00', reasonCode: '95' }, charge: { amount: '2.50', reasonCode: 'FC' } });
  const cii = app.generateInvoice(invoice, 'xrechnung-cii');
  assert(cii.content.includes('<ram:LineTotalAmount>200.00</ram:LineTotalAmount>'), 'CII line total must stay line-net when adjustments are UBL-only');
  assert(cii.content.includes('<ram:TaxBasisTotalAmount>200.00</ram:TaxBasisTotalAmount>'), 'CII tax basis must not include UBL-only adjustments');
  assert(cii.content.includes('<ram:DuePayableAmount>238.00</ram:DuePayableAmount>'), 'CII due payable must not include UBL-only adjustments');
  assert(!cii.content.includes('SpecifiedTradeAllowanceCharge'), 'CII must not imply unsupported allowance/charge export');

  const hybrid = app.generateInvoice(invoice, 'factur-x-pdf');
  assert(hybrid.content.includes('<ram:DuePayableAmount>238.00</ram:DuePayableAmount>'), 'hybrid embedded CII must also ignore UBL-only adjustments');

  const ubl = app.generateInvoice(invoice, 'xrechnung-ubl');
  assert(ubl.content.includes('<cbc:AllowanceTotalAmount currencyID="EUR">10.00</cbc:AllowanceTotalAmount>'), 'UBL should still export allowance');
  assert(ubl.content.includes('<cbc:ChargeTotalAmount currencyID="EUR">2.50</cbc:ChargeTotalAmount>'), 'UBL should still export charge');
  assert(ubl.content.includes('<cbc:PayableAmount currencyID="EUR">229.08</cbc:PayableAmount>'), 'UBL total should include supported adjustments');
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
