(function (root, factory) {
  let fieldCatalog = root.XRECHNUNG_FIELD_CATALOG;
  if (!fieldCatalog && typeof require === 'function') {
    try { fieldCatalog = require('./xrechnung-field-catalog.js'); } catch (error) { fieldCatalog = null; }
  }
  const api = factory(fieldCatalog);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XInvoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (fieldCatalog) {
  'use strict';

  const REQUIRED_FIELDS = [
    { id: 'invoiceNumber', label: 'Rechnungsnummer', required: true },
    { id: 'issueDate', label: 'Rechnungsdatum', required: true },
    { id: 'invoiceTypeCode', label: 'Rechnungstyp', required: true },
    { id: 'currency', label: 'Währung', required: true },
    { id: 'dueDate', label: 'Fälligkeitsdatum', required: true },
    { id: 'buyerReference', label: 'Leitweg-ID / BuyerReference', required: true },
    { id: 'businessProcessType', label: 'Geschäftsprozess / ProfileID', required: true },
    { id: 'orderNumber', label: 'Auftragsnummer / Bestellreferenz', required: true },
    { id: 'sellerName', label: 'Name des Rechnungsstellers', required: true },
    { id: 'sellerStreet', label: 'Straße des Rechnungsstellers', required: true },
    { id: 'sellerPostalCode', label: 'PLZ des Rechnungsstellers', required: true },
    { id: 'sellerCity', label: 'Ort des Rechnungsstellers', required: true },
    { id: 'sellerCountry', label: 'Land des Rechnungsstellers', required: true },
    { id: 'sellerEndpointId', label: 'E-Mail-Adresse des Rechnungsstellers / Endpoint-ID', required: true },
    { id: 'sellerEndpointSchemeId', label: 'Endpoint schemeID des Rechnungsstellers', required: true },
    { id: 'sellerIdentifier', label: 'Seller Identifier / Verkäuferkennung', required: true },
    { id: 'sellerTelephone', label: 'Telefon des Rechnungsstellers', required: true },
    { id: 'buyerName', label: 'Name des Empfängers', required: true },
    { id: 'buyerStreet', label: 'Straße des Empfängers', required: true },
    { id: 'buyerPostalCode', label: 'PLZ des Empfängers', required: true },
    { id: 'buyerCity', label: 'Ort des Empfängers', required: true },
    { id: 'buyerCountry', label: 'Land des Empfängers', required: true },
    { id: 'buyerEndpointId', label: 'Endpoint-ID des Empfängers', required: true },
    { id: 'buyerEndpointSchemeId', label: 'Endpoint schemeID des Empfängers', required: true },
    { id: 'paymentIban', label: 'IBAN', required: true },
    { id: 'paymentTerms', label: 'Zahlungsbedingungen', required: true },
    { id: 'lineDescription', label: 'Beschreibung Position 1', required: true },
    { id: 'lineQuantity', label: 'Menge Position 1', required: true },
    { id: 'lineUnitCode', label: 'Einheit Position 1', required: true },
    { id: 'lineNetPrice', label: 'Nettopreis Position 1', required: true },
    { id: 'lineTaxPercent', label: 'MwSt-Satz Position 1', required: true },
  ];

  const FORMATS = {
    'xrechnung-ubl': {
      label: 'XRechnung UBL XML',
      implemented: true,
      output: 'XML-Datei',
      syntax: 'ubl',
      extension: '.xml',
      mimeType: 'application/xml',
      validation: ['KoSIT Validator lokal', 'validator-configuration-xrechnung lokal'],
      requiredLocalValidators: ['KoSIT Validator', 'validator-configuration-xrechnung'],
    },
    'xrechnung-cii': {
      label: 'XRechnung CII XML',
      implemented: true,
      output: 'XML-Datei',
      syntax: 'cii',
      extension: '.xml',
      mimeType: 'application/xml',
      validation: ['KoSIT Validator lokal', 'Mustangproject optional'],
      requiredLocalValidators: ['KoSIT Validator', 'validator-configuration-xrechnung'],
    },
    'ubl': {
      label: 'Generisches EN16931 UBL XML',
      implemented: true,
      output: 'XML-Datei',
      syntax: 'ubl',
      extension: '.xml',
      mimeType: 'application/xml',
      validation: ['CEN EN16931 Artefakte lokal', 'phive optional für Peppol'],
      requiredLocalValidators: ['CEN EN16931 artefacts or phive'],
    },
    'zugferd-pdf': {
      label: 'ZUGFeRD Browser-Paket',
      implemented: true,
      output: 'XML-Paket mit eingebettetem CII und PDF/A-3-Montagehinweisen',
      syntax: 'cii-package',
      extension: '.xml',
      mimeType: 'application/xml',
      validation: ['Mustangproject lokal', 'veraPDF lokal', 'KoSIT lokal falls XRechnung-Profil'],
      requiredLocalValidators: ['Mustangproject', 'veraPDF', 'KoSIT Validator for XRechnung profile'],
      hybridProfile: 'ZUGFeRD 2.x EN16931/XRECHNUNG preparation package',
    },
    'factur-x-pdf': {
      label: 'Factur-X Browser-Paket',
      implemented: true,
      output: 'XML-Paket mit eingebettetem CII und PDF/A-3-Montagehinweisen',
      syntax: 'cii-package',
      extension: '.xml',
      mimeType: 'application/xml',
      validation: ['Mustangproject lokal', 'veraPDF lokal'],
      requiredLocalValidators: ['Mustangproject', 'veraPDF'],
      hybridProfile: 'Factur-X EN16931 preparation package',
    },
  };

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getXRechnungFieldCatalog() {
    if (!fieldCatalog) {
      return {
        meta: {
          source: 'xrechnung-cius-model.xml',
          bundle: 'xrechnung-3.0.2-bundle-2026-01-31.zip',
          termCount: 0,
          groupCount: 0,
          requiredTermCount: 0,
          privateDataIncluded: false,
          unavailable: true,
        },
        terms: [],
        groups: [],
        requiredTerms: [],
        productGroups: [],
      };
    }
    return cloneJson(fieldCatalog);
  }

  function getAdvancedFieldGroups() {
    const catalog = getXRechnungFieldCatalog();
    return (catalog.productGroups || []).map((group) => ({
      key: group.key,
      label: group.label,
      description: group.description,
      status: group.status || 'catalog-first',
      groups: [...(group.groups || [])],
      terms: [...(group.terms || [])],
      entries: (group.entries || []).map((entry) => ({ ...entry })),
    }));
  }

  const FIELD_PRIORITIES = {
    required: {
      label: 'Pflichtfeld',
      color: 'red',
      meaning: 'Muss vor Export/Validierung ausgefüllt sein.',
    },
    conditional: {
      label: 'Wichtig / bedingt erforderlich',
      color: 'yellow',
      meaning: 'Je nach Empfänger, Steuerfall, Profil oder Zahlungsart wichtig und prüfpflichtig.',
    },
    optional: {
      label: 'Optional / unauffällig',
      color: 'white',
      meaning: 'Kann ergänzt werden, blockiert aber den Browser-Export nicht pauschal.',
    },
  };

  const FORM_FIELD_BINDINGS = [
    { id: 'invoiceNumber', bt: 'BT-1', bg: 'INVOICE', role: 'invoice.invoiceNumber', priority: 'required' },
    { id: 'issueDate', bt: 'BT-2', bg: 'INVOICE', role: 'invoice.issueDate', priority: 'required' },
    { id: 'invoiceTypeCode', bt: 'BT-3', bg: 'INVOICE', role: 'invoice.typeCode', priority: 'required' },
    { id: 'currency', bt: 'BT-5', bg: 'INVOICE', role: 'invoice.currency', priority: 'required' },
    { id: 'dueDate', bt: 'BT-9', bg: 'INVOICE', role: 'invoice.dueDate', priority: 'required' },
    { id: 'buyerReference', bt: 'BT-10', bg: 'INVOICE', role: 'invoice.buyerReference', priority: 'required' },
    { id: 'projectReference', bt: 'BT-11', bg: 'INVOICE', role: 'invoice.projectReference', exported: 'ubl-only', priority: 'optional' },
    { id: 'contractReference', bt: 'BT-12', bg: 'INVOICE', role: 'invoice.contractReference', exported: 'ubl-only', priority: 'optional' },
    { id: 'orderNumber', bt: 'BT-13', bg: 'INVOICE', role: 'invoice.orderNumber', priority: 'required' },
    { id: 'sellerOrderReference', bt: 'BT-14', bg: 'INVOICE', role: 'invoice.sellerOrderReference', exported: 'ubl-only', priority: 'optional' },
    { id: 'businessProcessType', bt: 'BT-23', bg: 'INVOICE', role: 'invoice.businessProcessType', priority: 'required' },
    { id: 'paymentTerms', bt: 'BT-20', bg: 'INVOICE', role: 'invoice.paymentTerms', priority: 'required' },
    { id: 'paymentIban', bt: 'BT-84', bg: 'BG-17', role: 'payment.iban', priority: 'required' },
    { id: 'sellerName', bt: 'BT-27', bg: 'BG-4', role: 'seller.name', priority: 'required' },
    { id: 'sellerTradeName', bt: 'BT-28', bg: 'BG-4', role: 'seller.tradeName', exported: false, priority: 'optional' },
    { id: 'sellerStreet', bt: 'BT-35', bg: 'BG-5', role: 'seller.street', priority: 'required' },
    { id: 'sellerPostalCode', bt: 'BT-38', bg: 'BG-5', role: 'seller.postalCode', priority: 'required' },
    { id: 'sellerCity', bt: 'BT-37', bg: 'BG-5', role: 'seller.city', priority: 'required' },
    { id: 'sellerCountry', bt: 'BT-40', bg: 'BG-5', role: 'seller.country', priority: 'required' },
    { id: 'sellerVatId', bt: 'BT-31', bg: 'BG-4', role: 'seller.vatId', priority: 'conditional' },
    { id: 'sellerTaxId', bt: 'BT-32', bg: 'BG-4', role: 'seller.taxId', exported: false, priority: 'conditional' },
    { id: 'sellerIdentifier', bt: 'BT-29', bg: 'BG-4', role: 'seller.identifier', priority: 'required' },
    { id: 'sellerGlobalId', bt: 'BT-29', bg: 'BG-4', role: 'seller.globalId', exported: false, priority: 'conditional' },
    { id: 'sellerTradeId', bt: 'BT-30', bg: 'BG-4', role: 'seller.tradeId', exported: false, priority: 'conditional' },
    { id: 'sellerEndpointId', bt: 'BT-34', bg: 'BG-4', role: 'seller.endpointId', priority: 'required' },
    { id: 'sellerTelephone', bt: 'BT-42', bg: 'BG-6', role: 'seller.telephone', priority: 'required' },
    { id: 'sellerEndpointSchemeId', bt: 'BT-34', bg: 'BG-4', role: 'seller.endpointSchemeId', priority: 'required', helperLabel: 'schemeID for BT-34 Seller electronic address' },
    { id: 'sellerWebsiteUrl', bt: 'INFO', bg: 'BG-4', role: 'seller.websiteUrl', exported: false, priority: 'optional' },
    { id: 'buyerName', bt: 'BT-44', bg: 'BG-7', role: 'buyer.name', priority: 'required' },
    { id: 'buyerStreet', bt: 'BT-50', bg: 'BG-8', role: 'buyer.street', priority: 'required' },
    { id: 'buyerPostalCode', bt: 'BT-53', bg: 'BG-8', role: 'buyer.postalCode', priority: 'required' },
    { id: 'buyerCity', bt: 'BT-52', bg: 'BG-8', role: 'buyer.city', priority: 'required' },
    { id: 'buyerCountry', bt: 'BT-55', bg: 'BG-8', role: 'buyer.country', priority: 'required' },
    { id: 'buyerEndpointId', bt: 'BT-49', bg: 'BG-7', role: 'buyer.endpointId', priority: 'required' },
    { id: 'buyerEndpointSchemeId', bt: 'BT-49', bg: 'BG-7', role: 'buyer.endpointSchemeId', priority: 'required', helperLabel: 'schemeID for BT-49 Buyer electronic address' },
    { id: 'deliveryDate', bt: 'BT-72', bg: 'BG-13', role: 'delivery.date', exported: 'ubl-only', priority: 'conditional' },
    { id: 'deliveryRecipientName', bt: 'BT-70', bg: 'BG-13', role: 'delivery.recipientName', exported: 'ubl-only', priority: 'optional' },
    { id: 'deliveryStreet', bt: 'BT-75', bg: 'BG-15', role: 'delivery.street', exported: 'ubl-only', priority: 'optional' },
    { id: 'deliveryCity', bt: 'BT-77', bg: 'BG-15', role: 'delivery.city', exported: 'ubl-only', priority: 'optional' },
    { id: 'deliveryCountry', bt: 'BT-80', bg: 'BG-15', role: 'delivery.country', exported: 'ubl-only', priority: 'optional' },
    { id: 'lineDescription', bt: 'BT-153', bg: 'BG-31', role: 'line.itemName', priority: 'required' },
    { id: 'lineQuantity', bt: 'BT-129', bg: 'BG-25', role: 'line.quantity', priority: 'required' },
    { id: 'lineUnitCode', bt: 'BT-130', bg: 'BG-25', role: 'line.unitCode', priority: 'required' },
    { id: 'lineNetPrice', bt: 'BT-146', bg: 'BG-29', role: 'line.netPrice', priority: 'required' },
    { id: 'lineTaxPercent', bt: 'BT-152', bg: 'BG-30', role: 'line.taxPercent', priority: 'required' },
    { id: 'allowanceAmount', bt: 'BT-92', bg: 'BG-20', role: 'allowance.amount', exported: 'ubl-only', priority: 'conditional' },
    { id: 'allowanceReasonCode', bt: 'BT-98', bg: 'BG-20', role: 'allowance.reasonCode', exported: 'ubl-only', priority: 'conditional' },
    { id: 'chargeAmount', bt: 'BT-99', bg: 'BG-21', role: 'charge.amount', exported: 'ubl-only', priority: 'conditional' },
    { id: 'chargeReasonCode', bt: 'BT-105', bg: 'BG-21', role: 'charge.reasonCode', exported: 'ubl-only', priority: 'conditional' },
    { id: 'taxExemptionReason', bt: 'BT-120', bg: 'BG-23', role: 'tax.exemptionReason', exported: 'ubl-only', priority: 'conditional' },
    { id: 'attachmentId', bt: 'BT-122', bg: 'BG-24', role: 'attachment.id', exported: 'ubl-only', priority: 'conditional' },
    { id: 'attachmentDescription', bt: 'BT-123', bg: 'BG-24', role: 'attachment.description', exported: 'ubl-only', priority: 'conditional' },
    { id: 'outputLanguage', bt: 'OUTPUT', bg: 'OUTPUT', role: 'output.language', priority: 'optional', exported: false },
    { id: 'quantityUnitDisplayMode', bt: 'OUTPUT', bg: 'OUTPUT', role: 'output.quantityUnitDisplayMode', priority: 'optional', exported: false },
  ];

  function getCatalogTerm(id) {
    const catalog = getXRechnungFieldCatalog();
    return (catalog.terms || []).find((term) => term.id === id) || null;
  }

  function getFormFieldBindings() {
    return FORM_FIELD_BINDINGS.map((binding) => {
      const term = getCatalogTerm(binding.bt);
      const group = binding.bg === 'INVOICE' ? { name: 'INVOICE' } : getCatalogTerm(binding.bg);
      return {
        ...binding,
        catalogName: binding.helperLabel || term?.name || binding.bt,
        datatype: term?.datatype || '',
        requiredInModel: Boolean(term?.required),
        groupName: group?.name || binding.bg,
        priority: binding.priority || 'optional',
        priorityMeta: FIELD_PRIORITIES[binding.priority || 'optional'],
        exported: binding.exported === undefined ? true : binding.exported,
        helperLabel: binding.helperLabel || '',
      };
    });
  }

  function getFieldPriority(id) {
    const binding = FORM_FIELD_BINDINGS.find((candidate) => candidate.id === id);
    const priority = binding?.priority || 'optional';
    return { id, priority, ...FIELD_PRIORITIES[priority] };
  }

  function getFieldsByPriority(priority) {
    return getFormFieldBindings().filter((field) => field.priority === priority);
  }

  function applyXRechnungFieldMetadata(document) {
    let annotated = 0;
    for (const binding of getFormFieldBindings()) {
      const input = document.getElementById(binding.id);
      if (!input) continue;
      if (input.value && !input.dataset.source && input.dataset.userConfirmed !== 'true' && !input.dataset.defaultValue) input.dataset.defaultValue = 'true';
      if (!input.dataset.defaultListenerAttached && typeof input.addEventListener === 'function') {
        const confirmValue = () => {
          if (input.dataset.defaultValue === 'true') delete input.dataset.defaultValue;
          input.dataset.userConfirmed = 'true';
        };
        input.addEventListener('input', confirmValue);
        input.addEventListener('change', confirmValue);
        input.dataset.defaultListenerAttached = 'true';
      }
      input.dataset.bt = binding.bt;
      input.dataset.bg = binding.bg;
      input.dataset.xrechnungName = binding.catalogName;
      input.dataset.xrechnungGroup = binding.groupName;
      input.dataset.priority = binding.priority;
      input.dataset.exportStatus = String(binding.exported);
      input.classList?.add?.(`field-${binding.priority}`);
      input.closest?.('label')?.classList?.add?.(`field-${binding.priority}`);
      const title = `${binding.bt} ${binding.catalogName} · ${binding.bg} ${binding.groupName} · ${binding.priorityMeta.label}`;
      input.setAttribute?.('title', title);
      input.setAttribute?.('aria-description', title);
      annotated += 1;
    }
    return { ok: true, annotated };
  }

  function decimal(value, fallback = 0) {
    const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function money(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(value) {
    return money(value).toFixed(2);
  }

  function escapeXml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function cdata(value) {
    return String(value ?? '').replaceAll(']]>', ']]]]><![CDATA[>');
  }

  function requireField(errors, value, label) {
    if (!String(value ?? '').trim()) errors.push(`${label} fehlt.`);
  }

  function requireStringField(errors, value, label) {
    requireField(errors, value, label);
    if (value != null && typeof value !== 'string' && typeof value !== 'number') {
      errors.push(`${label} muss als Text/Zahl angegeben werden.`);
    }
  }

  function getRequiredFields() {
    return REQUIRED_FIELDS.map((field) => ({ ...field }));
  }

  function normalizeInvoice(invoice) {
    return {
      invoiceNumber: invoice?.invoiceNumber,
      issueDate: invoice?.issueDate,
      dueDate: invoice?.dueDate,
      invoiceTypeCode: invoice?.invoiceTypeCode,
      currency: invoice?.currency,
      buyerReference: invoice?.buyerReference,
      businessProcessType: invoice?.businessProcessType,
      projectReference: invoice?.projectReference,
      contractReference: invoice?.contractReference,
      orderNumber: invoice?.orderNumber,
      sellerOrderReference: invoice?.sellerOrderReference,
      seller: {
        ...(invoice?.seller || {}),
      },
      buyer: {
        ...(invoice?.buyer || {}),
      },
      delivery: { ...(invoice?.delivery || {}) },
      allowance: { ...(invoice?.allowance || {}) },
      charge: { ...(invoice?.charge || {}) },
      tax: { ...(invoice?.tax || {}) },
      attachment: { ...(invoice?.attachment || {}) },
      paymentIban: invoice?.paymentIban,
      paymentTerms: invoice?.paymentTerms,
      lines: Array.isArray(invoice?.lines) ? invoice.lines.map((line) => line || {}) : [],
    };
  }

  function preflightInvoice(invoice, formatId) {
    invoice = normalizeInvoice(invoice);
    const errors = [];
    const warnings = [];
    const format = FORMATS[formatId];
    if (!format) {
      errors.push(`Unbekanntes Zielformat: ${formatId}`);
      return { ok: false, errors, warnings };
    }

    requireStringField(errors, invoice.invoiceNumber, 'Rechnungsnummer');
    requireStringField(errors, invoice.issueDate, 'Rechnungsdatum');
    requireStringField(errors, invoice.invoiceTypeCode, 'Rechnungstyp');
    requireStringField(errors, invoice.currency, 'Währung');
    requireStringField(errors, invoice.dueDate, 'Fälligkeitsdatum');
    requireStringField(errors, invoice.buyerReference, 'Leitweg-ID / BuyerReference');
    requireStringField(errors, invoice.businessProcessType, 'Geschäftsprozess / ProfileID');
    requireStringField(errors, invoice.orderNumber, 'Auftragsnummer / Bestellreferenz');
    requireStringField(errors, invoice.seller?.name, 'Name des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.street, 'Straße des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.postalCode, 'PLZ des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.city, 'Ort des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.country, 'Land des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.endpointId, 'E-Mail-Adresse des Rechnungsstellers / Endpoint-ID');
    requireStringField(errors, invoice.seller?.endpointSchemeId, 'Endpoint schemeID des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.sellerIdentifier, 'Seller Identifier / Verkäuferkennung');
    requireStringField(errors, invoice.seller?.telephone, 'Telefon des Rechnungsstellers');
    requireStringField(errors, invoice.buyer?.name, 'Name des Empfängers');
    requireStringField(errors, invoice.buyer?.street, 'Straße des Empfängers');
    requireStringField(errors, invoice.buyer?.postalCode, 'PLZ des Empfängers');
    requireStringField(errors, invoice.buyer?.city, 'Ort des Empfängers');
    requireStringField(errors, invoice.buyer?.country, 'Land des Empfängers');
    requireStringField(errors, invoice.buyer?.endpointId, 'Endpoint-ID des Empfängers');
    requireStringField(errors, invoice.buyer?.endpointSchemeId, 'Endpoint schemeID des Empfängers');
    requireStringField(errors, invoice.paymentIban, 'IBAN');
    requireStringField(errors, invoice.paymentTerms, 'Zahlungsbedingungen');

    if (!Array.isArray(invoice.lines) || invoice.lines.length === 0) {
      errors.push('Mindestens eine Rechnungsposition fehlt.');
    } else {
      invoice.lines.forEach((line, index) => {
        requireStringField(errors, line.description, `Beschreibung Position ${index + 1}`);
        requireStringField(errors, line.quantity, `Menge Position ${index + 1}`);
        requireStringField(errors, line.unitCode, `Einheit Position ${index + 1}`);
        requireStringField(errors, line.netPrice, `Nettopreis Position ${index + 1}`);
        requireStringField(errors, line.taxPercent, `MwSt-Satz Position ${index + 1}`);
        if (String(line.quantity ?? '').trim() && decimal(line.quantity) <= 0) errors.push(`Menge Position ${index + 1} muss größer als 0 sein.`);
        if (String(line.netPrice ?? '').trim() && decimal(line.netPrice) < 0) errors.push(`Nettopreis Position ${index + 1} darf nicht negativ sein.`);
      });
    }

    if (!String(invoice.buyerReference ?? '').match(/^[0-9A-Za-z][0-9A-Za-z\-]{4,}$/)) {
      warnings.push('Leitweg-ID-Format wirkt ungewöhnlich; bitte Empfängerangabe prüfen.');
    }
    if (!String(invoice.orderNumber ?? '').match(/[A-Za-z0-9]/)) {
      warnings.push('Auftragsnummer wirkt ungewöhnlich; bei öffentlichen Empfängern oft Pflicht.');
    }

    for (const [label, group] of [['Abschlag', invoice.allowance], ['Zuschlag', invoice.charge]]) {
      const raw = String(group?.amount ?? '').trim();
      if (!raw) continue;
      const amount = decimal(raw, Number.NaN);
      if (!Number.isFinite(amount)) errors.push(`${label} muss als Zahl angegeben werden.`);
      else if (amount < 0) errors.push(`${label} darf nicht negativ sein.`);
      else if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) errors.push(`${label} darf höchstens zwei Dezimalstellen haben.`);
    }
    const totals = calculateTotals(invoice.lines, { allowance: invoice.allowance, charge: invoice.charge });
    if (Number.isFinite(totals.taxable) && totals.taxable < 0) errors.push('Abschlag/Zuschlag erzeugt eine negative steuerpflichtige Summe. Bitte Beträge prüfen.');
    if (Number.isFinite(totals.payable) && totals.payable < 0) errors.push('Abschlag/Zuschlag erzeugt einen negativen Zahlbetrag. Bitte Beträge prüfen.');
    if (totals.taxGroups.some((group) => Number.isFinite(group.taxable) && group.taxable < 0)) {
      errors.push('Abschlag/Zuschlag kann ohne Steuerkategorie-Zuordnung keine negative Steuergruppe erzeugen. Bitte Abschlag/Zuschlag reduzieren oder später mit gruppierter Steuerlogik erfassen.');
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  function calculateTaxGroups(lines) {
    const groups = new Map();
    for (const line of lines || []) {
      const category = String(line?.taxCategory || 'S').trim() || 'S';
      const percent = decimal(line?.taxPercent, 19);
      const taxable = money(decimal(line?.quantity) * decimal(line?.netPrice));
      const key = `${category}\u0000${formatMoney(percent)}`;
      const current = groups.get(key) || { category, percent, taxable: 0 };
      current.taxable = money(current.taxable + taxable);
      groups.set(key, current);
    }
    return [...groups.values()].map((group) => ({
      ...group,
      taxable: money(group.taxable),
      tax: money(group.taxable * group.percent / 100),
    }));
  }

  function calculateTotals(lines, adjustments = {}) {
    const lineTaxGroups = calculateTaxGroups(lines);
    const lineNet = lineTaxGroups.reduce((sum, group) => sum + group.taxable, 0);
    const allowance = hasAmount(adjustments.allowance) ? decimal(adjustments.allowance.amount) : 0;
    const charge = hasAmount(adjustments.charge) ? decimal(adjustments.charge.amount) : 0;
    const taxable = lineNet - allowance + charge;
    const firstTaxGroup = lineTaxGroups[0] || { category: 'S', percent: 19, taxable: 0, tax: 0 };
    const adjustmentDelta = money(charge - allowance);
    const taxGroups = lineTaxGroups.map((group, index) => {
      const adjustedTaxable = index === 0 ? money(group.taxable + adjustmentDelta) : group.taxable;
      return {
        ...group,
        taxable: adjustedTaxable,
        tax: money(adjustedTaxable * group.percent / 100),
      };
    });
    const tax = money(taxGroups.reduce((sum, group) => sum + group.tax, 0));
    return { lineNet: money(lineNet), allowance: money(allowance), charge: money(charge), taxable: money(taxable), tax, payable: money(taxable + tax), taxPercent: firstTaxGroup.percent, taxGroups };
  }

  function optionalXml(value, render) {
    return String(value ?? '').trim() ? render(String(value).trim()) : '';
  }

  function hasAmount(group) {
    return String(group?.amount ?? '').trim() && decimal(group.amount) !== 0;
  }

  function allowanceChargeUblXml(group, isCharge, currency) {
    if (!hasAmount(group)) return '';
    const amount = formatMoney(decimal(group.amount));
    const reasonCode = group.reasonCode || (isCharge ? 'FC' : '95');
    return `
  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>${isCharge ? 'true' : 'false'}</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReasonCode>${escapeXml(reasonCode)}</cbc:AllowanceChargeReasonCode>
    <cbc:Amount currencyID="${currency}">${amount}</cbc:Amount>
  </cac:AllowanceCharge>`;
  }

  function supportingDocumentUblXml(attachment) {
    if (!String(attachment?.id ?? '').trim()) return '';
    return `
  <cac:AdditionalDocumentReference>
    <cbc:ID>${escapeXml(attachment.id)}</cbc:ID>
    ${optionalXml(attachment.description, (value) => `<cbc:DocumentDescription>${escapeXml(value)}</cbc:DocumentDescription>`)}
  </cac:AdditionalDocumentReference>`;
  }

  function deliveryUblXml(delivery) {
    if (!delivery || !Object.values(delivery).some((value) => String(value ?? '').trim())) return '';
    return `
  <cac:Delivery>
    ${optionalXml(delivery.date, (value) => `<cbc:ActualDeliveryDate>${escapeXml(value)}</cbc:ActualDeliveryDate>`)}
    ${(delivery.recipientName || delivery.street || delivery.city || delivery.country) ? `<cac:DeliveryLocation><cac:Address>${optionalXml(delivery.street, (value) => `<cbc:StreetName>${escapeXml(value)}</cbc:StreetName>`)}${optionalXml(delivery.city, (value) => `<cbc:CityName>${escapeXml(value)}</cbc:CityName>`)}<cac:Country><cbc:IdentificationCode>${escapeXml(delivery.country || 'DE')}</cbc:IdentificationCode></cac:Country></cac:Address></cac:DeliveryLocation>` : ''}
    ${optionalXml(delivery.recipientName, (value) => `<cac:DeliveryParty><cac:PartyName><cbc:Name>${escapeXml(value)}</cbc:Name></cac:PartyName></cac:DeliveryParty>`)}
  </cac:Delivery>`;
  }

  function partyUblXml(party) {
    return `
    <cac:Party>
      ${party.endpointId ? `<cbc:EndpointID schemeID="${escapeXml(party.endpointSchemeId || 'EM')}">${escapeXml(party.endpointId)}</cbc:EndpointID>` : ''}
      <cac:PartyIdentification><cbc:ID>${escapeXml(party.sellerIdentifier || party.endpointId || party.name)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(party.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(party.street)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(party.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(party.postalCode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${escapeXml(party.country || 'DE')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${party.vatId ? `<cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(party.vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(party.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
      ${(party.endpointId || party.telephone) ? `<cac:Contact><cbc:Name>${escapeXml(party.name)}</cbc:Name>${party.telephone ? `<cbc:Telephone>${escapeXml(party.telephone)}</cbc:Telephone>` : ''}${party.endpointId ? `<cbc:ElectronicMail>${escapeXml(party.endpointId)}</cbc:ElectronicMail>` : ''}</cac:Contact>` : ''}
    </cac:Party>`;
  }

  function generateUblXml(invoice, options = {}) {
    const totals = calculateTotals(invoice.lines, { allowance: invoice.allowance, charge: invoice.charge });
    const currency = invoice.currency || 'EUR';
    const customization = options.xrechnung
      ? 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0'
      : 'urn:cen.eu:en16931:2017';
    const lineXml = invoice.lines.map((line, index) => {
      const lineAmount = money(decimal(line.quantity) * decimal(line.netPrice));
      const taxPercent = decimal(line.taxPercent, 19);
      return `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${escapeXml(line.unitCode || 'C62')}">${escapeXml(line.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${formatMoney(lineAmount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(line.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>${escapeXml(line.taxCategory || 'S')}</cbc:ID><cbc:Percent>${formatMoney(taxPercent)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${currency}">${formatMoney(decimal(line.netPrice))}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
    }).join('');

    const taxSubtotalXml = totals.taxGroups.map((group) => `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="${currency}">${formatMoney(group.taxable)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="${currency}">${formatMoney(group.tax)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${escapeXml(group.category)}</cbc:ID><cbc:Percent>${formatMoney(group.percent)}</cbc:Percent>${optionalXml(invoice.tax?.exemptionReason, (value) => `<cbc:TaxExemptionReason>${escapeXml(value)}</cbc:TaxExemptionReason>`)}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>${customization}</cbc:CustomizationID>
  <cbc:ProfileID>${escapeXml(invoice.businessProcessType || 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0')}</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(invoice.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${escapeXml(invoice.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${escapeXml(invoice.invoiceTypeCode || '380')}</cbc:InvoiceTypeCode>
  <cbc:Note>${escapeXml(invoice.paymentTerms)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${escapeXml(currency)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escapeXml(invoice.buyerReference)}</cbc:BuyerReference>
  <cac:OrderReference><cbc:ID>${escapeXml(invoice.orderNumber)}</cbc:ID>${optionalXml(invoice.sellerOrderReference, (value) => `<cbc:SalesOrderID>${escapeXml(value)}</cbc:SalesOrderID>`)}</cac:OrderReference>
  ${optionalXml(invoice.contractReference, (value) => `<cac:ContractDocumentReference><cbc:ID>${escapeXml(value)}</cbc:ID></cac:ContractDocumentReference>`)}
  ${supportingDocumentUblXml(invoice.attachment)}
  ${optionalXml(invoice.projectReference, (value) => `<cac:ProjectReference><cbc:ID>${escapeXml(value)}</cbc:ID></cac:ProjectReference>`)}
  <cac:AccountingSupplierParty>${partyUblXml(invoice.seller)}
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${partyUblXml(invoice.buyer)}
  </cac:AccountingCustomerParty>${deliveryUblXml(invoice.delivery)}
  <cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>${escapeXml(invoice.paymentIban)}</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>${allowanceChargeUblXml(invoice.allowance, false, currency)}${allowanceChargeUblXml(invoice.charge, true, currency)}
  <cac:TaxTotal><cbc:TaxAmount currencyID="${currency}">${formatMoney(totals.tax)}</cbc:TaxAmount>${taxSubtotalXml}</cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="${currency}">${formatMoney(totals.lineNet)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="${currency}">${formatMoney(totals.taxable)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="${currency}">${formatMoney(totals.payable)}</cbc:TaxInclusiveAmount><cbc:AllowanceTotalAmount currencyID="${currency}">${formatMoney(totals.allowance)}</cbc:AllowanceTotalAmount><cbc:ChargeTotalAmount currencyID="${currency}">${formatMoney(totals.charge)}</cbc:ChargeTotalAmount><cbc:PayableAmount currencyID="${currency}">${formatMoney(totals.payable)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lineXml}
</Invoice>`;
  }

  function generateCiiXml(invoice, options = {}) {
    const totals = calculateTotals(invoice.lines);
    const currency = invoice.currency || 'EUR';
    const guideline = options.xrechnung
      ? 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0'
      : 'urn:cen.eu:en16931:2017';
    const lineXml = invoice.lines.map((line, index) => {
      const lineAmount = money(decimal(line.quantity) * decimal(line.netPrice));
      return `
      <ram:IncludedSupplyChainTradeLineItem>
        <ram:AssociatedDocumentLineDocument><ram:LineID>${index + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct><ram:Name>${escapeXml(line.description)}</ram:Name></ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${formatMoney(decimal(line.netPrice))}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${escapeXml(line.unitCode || 'C62')}">${escapeXml(line.quantity)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${escapeXml(line.taxCategory || 'S')}</ram:CategoryCode><ram:RateApplicablePercent>${formatMoney(decimal(line.taxPercent, 19))}</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${formatMoney(lineAmount)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext><ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>${escapeXml(invoice.businessProcessType || 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0')}</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${guideline}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument><ram:ID>${escapeXml(invoice.invoiceNumber)}</ram:ID><ram:TypeCode>${escapeXml(invoice.invoiceTypeCode || '380')}</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${escapeXml(invoice.issueDate.replaceAll('-', ''))}</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lineXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${escapeXml(invoice.buyerReference)}</ram:BuyerReference>
      <ram:SellerTradeParty><ram:ID>${escapeXml(invoice.seller.sellerIdentifier)}</ram:ID><ram:Name>${escapeXml(invoice.seller.name)}</ram:Name><ram:DefinedTradeContact><ram:PersonName>${escapeXml(invoice.seller.name)}</ram:PersonName><ram:TelephoneUniversalCommunication><ram:CompleteNumber>${escapeXml(invoice.seller.telephone)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication><ram:EmailURIUniversalCommunication><ram:URIID>${escapeXml(invoice.seller.endpointId)}</ram:URIID></ram:EmailURIUniversalCommunication></ram:DefinedTradeContact><ram:PostalTradeAddress><ram:PostcodeCode>${escapeXml(invoice.seller.postalCode)}</ram:PostcodeCode><ram:LineOne>${escapeXml(invoice.seller.street)}</ram:LineOne><ram:CityName>${escapeXml(invoice.seller.city)}</ram:CityName><ram:CountryID>${escapeXml(invoice.seller.country || 'DE')}</ram:CountryID></ram:PostalTradeAddress><ram:URIUniversalCommunication><ram:URIID schemeID="${escapeXml(invoice.seller.endpointSchemeId || 'EM')}">${escapeXml(invoice.seller.endpointId)}</ram:URIID></ram:URIUniversalCommunication>${invoice.seller.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(invoice.seller.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}</ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>${escapeXml(invoice.buyer.name)}</ram:Name><ram:PostalTradeAddress><ram:PostcodeCode>${escapeXml(invoice.buyer.postalCode)}</ram:PostcodeCode><ram:LineOne>${escapeXml(invoice.buyer.street)}</ram:LineOne><ram:CityName>${escapeXml(invoice.buyer.city)}</ram:CityName><ram:CountryID>${escapeXml(invoice.buyer.country || 'DE')}</ram:CountryID></ram:PostalTradeAddress>${invoice.buyer.endpointId ? `<ram:URIUniversalCommunication><ram:URIID schemeID="${escapeXml(invoice.buyer.endpointSchemeId || 'EM')}">${escapeXml(invoice.buyer.endpointId)}</ram:URIID></ram:URIUniversalCommunication>` : ''}</ram:BuyerTradeParty>
      <ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${escapeXml(invoice.orderNumber)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery />
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${escapeXml(currency)}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${escapeXml(invoice.paymentIban)}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount></ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax><ram:CalculatedAmount>${formatMoney(totals.tax)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>${formatMoney(totals.taxable)}</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>${formatMoney(totals.taxPercent)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms><ram:Description>${escapeXml(invoice.paymentTerms)}</ram:Description></ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${formatMoney(totals.taxable)}</ram:LineTotalAmount><ram:TaxBasisTotalAmount>${formatMoney(totals.taxable)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="${currency}">${formatMoney(totals.tax)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${formatMoney(totals.payable)}</ram:GrandTotalAmount><ram:DuePayableAmount>${formatMoney(totals.payable)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
  }

  function generateHybridPackage(invoice, formatId) {
    const fmt = FORMATS[formatId];
    const cii = generateCiiXml(invoice, { xrechnung: formatId === 'zugferd-pdf' });
    return `<?xml version="1.0" encoding="UTF-8"?>
<browserHybridInvoicePackage format="${escapeXml(formatId)}" label="${escapeXml(fmt.label)}" requiresLocalPdfA3Assembly="true">
  <notice>Dieses Browser-only Artefakt enthält das CII-XML und eine Montage-Anweisung. Ein echtes PDF/A-3 für ZUGFeRD/Factur-X muss lokal mit Mustangproject/veraPDF oder einer geprüften Desktop-App assembliert und validiert werden. Die Webseite erzeugt absichtlich kein Fake-PDF.</notice>
  <requiredLocalValidators>${fmt.requiredLocalValidators.map((tool) => `<validator>${escapeXml(tool)}</validator>`).join('')}</requiredLocalValidators>
  <targetPdfAttachmentName>${formatId === 'factur-x-pdf' ? 'factur-x.xml' : 'xrechnung.xml'}</targetPdfAttachmentName>
  <embeddedCiiXml><![CDATA[${cdata(cii)}]]></embeddedCiiXml>
</browserHybridInvoicePackage>`;
  }

  function filenameBase(invoice) {
    return String(invoice.invoiceNumber || 'rechnung').replace(/[^A-Za-z0-9._-]+/g, '_');
  }

  function extensionFromName(name) {
    const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function parseCsvLine(line) {
    const cells = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function mapKnownFieldName(name) {
    const normalized = String(name || '').trim().toLowerCase().replace(/[^a-z0-9äöüß]+/g, '');
    const aliases = {
      invoicenumber: 'invoiceNumber', rechnungsnummer: 'invoiceNumber', id: 'invoiceNumber',
      issuedate: 'issueDate', rechnungsdatum: 'issueDate',
      duedate: 'dueDate', faelligkeitsdatum: 'dueDate', fälligkeitsdatum: 'dueDate',
      buyerreference: 'buyerReference', leitwegid: 'buyerReference', leitweg: 'buyerReference',
      buyerreferencebt10: 'buyerReference',
      ordernumber: 'orderNumber', auftragsnummer: 'orderNumber', bestellreferenz: 'orderNumber',
      paymentiban: 'paymentIban', iban: 'paymentIban',
      paymentterms: 'paymentTerms', zahlungsbedingungen: 'paymentTerms',
      sellername: 'sellerName', rechnungssteller: 'sellerName',
      sellerendpointid: 'sellerEndpointId', selleremail: 'sellerEndpointId', email: 'sellerEndpointId',
      selleridentifier: 'sellerIdentifier', verkaeuferkennung: 'sellerIdentifier', verkäuferkennung: 'sellerIdentifier',
      sellertelephone: 'sellerTelephone', telefon: 'sellerTelephone', telephone: 'sellerTelephone', phone: 'sellerTelephone',
      buyername: 'buyerName', empfaenger: 'buyerName', empfänger: 'buyerName',
      linedescription: 'lineDescription', beschreibung: 'lineDescription',
      linequantity: 'lineQuantity', menge: 'lineQuantity',
      linenetprice: 'lineNetPrice', nettopreis: 'lineNetPrice',
    };
    return aliases[normalized];
  }

  function parseTextFields(text) {
    const fields = {};
    const patterns = [
      ['invoiceNumber', /(?:Rechnungsnummer|Invoice\s*Number)\s*[:#-]\s*([^\n\r]+)/i],
      ['buyerReference', /(?:Leitweg-ID|Buyer\s*Reference|Leitweg)\s*[:#-]\s*([^\n\r]+)/i],
      ['orderNumber', /(?:Auftragsnummer|Bestellreferenz|Order\s*Number)\s*[:#-]\s*([^\n\r]+)/i],
      ['paymentIban', /(?:IBAN)\s*[:#-]\s*([^\n\r]+)/i],
      ['paymentTerms', /(?:Zahlungsbedingungen|Payment\s*Terms)\s*[:#-]\s*([^\n\r]+)/i],
      ['sellerEndpointId', /(?:E-Mail|Email|Endpoint-ID)\s*[:#-]\s*([^\n\r]+)/i],
      ['sellerTelephone', /(?:Telefon|Telephone|Phone)\s*[:#-]\s*([^\n\r]+)/i],
    ];
    for (const [key, pattern] of patterns) {
      const match = String(text || '').match(pattern);
      if (match) fields[key] = match[1].trim();
    }
    return fields;
  }

  function parseXmlFields(text) {
    const fields = {};
    const xml = String(text || '');
    const cleanText = (value) => String(value || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
    const tag = (localName) => String(localName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const valueOf = (localName, source = xml) => {
      const pattern = new RegExp(`<(?:[A-Za-z0-9_-]+:)?${tag(localName)}\\b[^>]*>([\\s\\S]*?)</(?:[A-Za-z0-9_-]+:)?${tag(localName)}>`, 'i');
      const match = String(source || '').match(pattern);
      return match ? cleanText(match[1]) : '';
    };
    const section = (containerName, source = xml) => {
      const pattern = new RegExp(`<(?:[A-Za-z0-9_-]+:)?${tag(containerName)}\\b[^>]*>([\\s\\S]*?)</(?:[A-Za-z0-9_-]+:)?${tag(containerName)}>`, 'i');
      return String(source || '').match(pattern)?.[1] || '';
    };
    const attrOf = (localName, attrName, source = xml) => {
      const pattern = new RegExp(`<(?:[A-Za-z0-9_-]+:)?${tag(localName)}\\b([^>]*)>`, 'i');
      const attrs = String(source || '').match(pattern)?.[1] || '';
      const attrPattern = new RegExp(`${tag(attrName)}\\s*=\\s*["']([^"']+)["']`, 'i');
      return attrs.match(attrPattern)?.[1] || '';
    };
    const firstOf = (...names) => names.map((name) => valueOf(name)).find(Boolean) || '';
    const firstOfIn = (source, ...names) => names.map((name) => valueOf(name, source)).find(Boolean) || '';
    const dateFromXml = (value) => {
      const raw = String(value || '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      return '';
    };
    const assign = (key, value) => {
      const normalized = cleanText(value);
      if (normalized && fields[key] == null) fields[key] = normalized;
    };

    const exchangedDocument = section('ExchangedDocument');
    const context = section('ExchangedDocumentContext');
    const supplierParty = section('AccountingSupplierParty') || section('SellerTradeParty');
    const customerParty = section('AccountingCustomerParty') || section('BuyerTradeParty');
    const supplierPostal = section('PostalAddress', supplierParty) || section('PostalTradeAddress', supplierParty);
    const customerPostal = section('PostalAddress', customerParty) || section('PostalTradeAddress', customerParty);
    const supplierContact = section('Contact', supplierParty) || section('DefinedTradeContact', supplierParty);
    const firstUblLine = section('InvoiceLine') || section('CreditNoteLine');
    const firstCiiLine = section('IncludedSupplyChainTradeLineItem');
    const firstLine = firstUblLine || firstCiiLine;

    assign('invoiceNumber', valueOf('ID', exchangedDocument) || firstOf('ID', 'InvoiceNumber'));
    assign('issueDate', dateFromXml(firstOf('IssueDate', 'DateTimeString')));
    assign('invoiceTypeCode', firstOf('InvoiceTypeCode') || valueOf('TypeCode', exchangedDocument));
    assign('dueDate', dateFromXml(firstOf('DueDate')));
    assign('currency', firstOf('DocumentCurrencyCode', 'InvoiceCurrencyCode'));
    assign('businessProcessType', firstOf('ProfileID') || firstOfIn(section('BusinessProcessSpecifiedDocumentContextParameter', context), 'ID'));
    assign('buyerReference', firstOf('BuyerReference', 'BuyerReferenceBT10'));
    assign('orderNumber', valueOf('ID', section('OrderReference')) || valueOf('IssuerAssignedID', section('BuyerOrderReferencedDocument')));
    assign('paymentIban', firstOf('IBANID', 'IBAN', 'PayeeAccountID') || valueOf('ID', section('PayeeFinancialAccount')));
    assign('paymentTerms', firstOf('Note', 'PaymentTerms') || valueOf('Description', section('SpecifiedTradePaymentTerms')));

    assign('sellerName', valueOf('Name', supplierParty));
    assign('sellerStreet', valueOf('StreetName', supplierPostal) || valueOf('LineOne', supplierPostal));
    assign('sellerPostalCode', valueOf('PostalZone', supplierPostal) || valueOf('PostcodeCode', supplierPostal));
    assign('sellerCity', valueOf('CityName', supplierPostal));
    assign('sellerCountry', valueOf('IdentificationCode', section('Country', supplierPostal)) || valueOf('CountryID', supplierPostal));
    assign('sellerEndpointId', valueOf('EndpointID', supplierParty) || valueOf('URIID', section('URIUniversalCommunication', supplierParty)) || valueOf('URIID', section('EmailURIUniversalCommunication', supplierParty)));
    assign('sellerEndpointSchemeId', attrOf('EndpointID', 'schemeID', supplierParty) || attrOf('URIID', 'schemeID', section('URIUniversalCommunication', supplierParty)));
    assign('sellerIdentifier', valueOf('ID', section('PartyIdentification', supplierParty)) || valueOf('ID', supplierParty));
    assign('sellerVatId', valueOf('CompanyID', section('PartyTaxScheme', supplierParty)) || valueOf('ID', section('SpecifiedTaxRegistration', supplierParty)));
    assign('sellerTelephone', valueOf('Telephone', supplierContact) || valueOf('CompleteNumber', supplierContact));

    assign('buyerName', valueOf('Name', customerParty));
    assign('buyerStreet', valueOf('StreetName', customerPostal) || valueOf('LineOne', customerPostal));
    assign('buyerPostalCode', valueOf('PostalZone', customerPostal) || valueOf('PostcodeCode', customerPostal));
    assign('buyerCity', valueOf('CityName', customerPostal));
    assign('buyerCountry', valueOf('IdentificationCode', section('Country', customerPostal)) || valueOf('CountryID', customerPostal));
    assign('buyerEndpointId', valueOf('EndpointID', customerParty) || valueOf('URIID', section('URIUniversalCommunication', customerParty)));
    assign('buyerEndpointSchemeId', attrOf('EndpointID', 'schemeID', customerParty) || attrOf('URIID', 'schemeID', section('URIUniversalCommunication', customerParty)));

    assign('lineDescription', valueOf('Name', section('Item', firstLine)) || valueOf('Name', section('SpecifiedTradeProduct', firstLine)) || valueOf('Description', firstLine));
    assign('lineQuantity', valueOf('InvoicedQuantity', firstLine) || valueOf('BilledQuantity', firstLine));
    assign('lineUnitCode', attrOf('InvoicedQuantity', 'unitCode', firstLine) || attrOf('BilledQuantity', 'unitCode', firstLine));
    assign('lineNetPrice', valueOf('PriceAmount', section('Price', firstLine)) || valueOf('ChargeAmount', section('NetPriceProductTradePrice', firstLine)));
    assign('lineTaxPercent', valueOf('Percent', section('ClassifiedTaxCategory', firstLine)) || valueOf('RateApplicablePercent', section('ApplicableTradeTax', firstLine)));

    return fields;
  }

  function parseCsvFields(text) {
    const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return parseTextFields(text);
    const headers = parseCsvLine(lines[0]);
    const values = parseCsvLine(lines[1]);
    const fields = {};
    headers.forEach((header, index) => {
      const mapped = mapKnownFieldName(header);
      if (mapped && values[index]) fields[mapped] = values[index].trim();
    });
    return fields;
  }

  const LOCAL_EXTRACTORS = {};

  function registerLocalExtractor(kind, extractor) {
    const normalized = String(kind || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!normalized || typeof extractor !== 'function') {
      return { ok: false, errors: ['Lokale Extraktoren brauchen einen Typ und eine Funktion.'] };
    }
    LOCAL_EXTRACTORS[normalized] = extractor;
    return { ok: true, kind: normalized };
  }

  function getLocalExtractor(ext, options = {}) {
    const injected = options.localExtractors || {};
    const globals = typeof globalThis !== 'undefined' && globalThis.XInvoiceLocalExtractors ? globalThis.XInvoiceLocalExtractors : {};
    return injected[ext] || injected.document || LOCAL_EXTRACTORS[ext] || LOCAL_EXTRACTORS.document || globals[ext] || globals.document;
  }

  function fieldsFromDocumentText(ext, text) {
    if (ext === 'csv') return parseCsvFields(text);
    if (ext === 'xml') return parseXmlFields(text);
    return parseTextFields(text);
  }

  function localExtractionFailure(message, details = {}) {
    return {
      ok: false,
      requiresLocalOcrEngine: details.requiresLocalOcrEngine !== false,
      requiresHumanReview: details.requiresHumanReview !== false,
      requiresServer: false,
      errors: [message || 'Lokale OCR/PDF-Engine konnte keine Rechnungsdaten erkennen.'],
      warnings: details.warnings || [],
      fields: {},
      usedLocalExtractor: Boolean(details.usedLocalExtractor),
      extractionMethod: details.extractionMethod,
      confidence: details.confidence ?? 0,
    };
  }

  function hasSuggestedFields(fields) {
    return Object.keys(fields || {}).length > 0;
  }

  function buildFieldSources(fields, sourceLabel) {
    return Object.fromEntries(Object.keys(fields || {}).map((key) => [key, sourceLabel]));
  }

  function resultFromLocalExtraction(ext, extraction) {
    if (!extraction || extraction.ok === false) {
      return localExtractionFailure(extraction?.error || extraction?.message, {
        usedLocalExtractor: Boolean(extraction),
        extractionMethod: extraction?.method || `${ext}-local-extractor`,
        confidence: extraction?.confidence ?? 0,
        requiresHumanReview: true,
      });
    }
    const text = String(extraction.text || '');
    const sourceExt = extraction.embeddedXml ? 'xml' : 'txt';
    const parsedFromText = text ? fieldsFromDocumentText(sourceExt, text) : {};
    const fields = { ...parsedFromText, ...(extraction.fields || {}) };
    if (!hasSuggestedFields(fields)) {
      return localExtractionFailure(
        extraction.message || 'Lokale PDF-Text-Extraktion hat keinen eingebetteten PDF-Text mit Rechnungsfeldern gefunden. Scan-/Bild-PDFs brauchen eine echte lokale OCR-Engine und Human Review.',
        { usedLocalExtractor: true, extractionMethod: extraction.method || `${ext}-local-extractor`, confidence: Math.min(extraction.confidence ?? 0.1, 0.2), requiresHumanReview: true }
      );
    }
    const sourceLabel = extraction.embeddedXml
      ? `PDF-Anhang ${extraction.embeddedXml.filename || 'XML'}`
      : `${ext.toUpperCase()} lokale Texterkennung`;
    return {
      ok: true,
      errors: [],
      warnings: ['Lokale OCR/PDF-Erkennung liefert nur Vorschläge. Bitte alle Felder vor der Konvertierung prüfen.'],
      fields,
      fieldSources: buildFieldSources(fields, sourceLabel),
      usedLocalExtractor: true,
      extractionMethod: extraction.method || `${ext}-local-extractor`,
      confidence: extraction.confidence,
      embeddedXml: extraction.embeddedXml,
      requiresHumanReview: true,
      requiresServer: false,
    };
  }

  function bytesToBinaryString(bytes) {
    if (!bytes) return '';
    if (typeof bytes === 'string') return bytes;
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let output = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < view.length; index += chunkSize) {
      output += String.fromCharCode(...view.subarray(index, index + chunkSize));
    }
    return output;
  }

  function decodePdfLiteralString(value) {
    let output = '';
    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      if (char !== '\\') {
        output += char;
        continue;
      }
      const next = value[index + 1];
      if (next == null) break;
      if (next === 'n') output += '\n';
      else if (next === 'r') output += '\r';
      else if (next === 't') output += '\t';
      else if (next === 'b') output += '\b';
      else if (next === 'f') output += '\f';
      else if (next === '\n' || next === '\r') {
        if (next === '\r' && value[index + 2] === '\n') index += 1;
      } else if (/[0-7]/.test(next)) {
        const octal = value.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] || '';
        output += String.fromCharCode(Number.parseInt(octal, 8));
        index += octal.length - 1;
      } else output += next;
      index += 1;
    }
    return output;
  }

  function decodePdfHexString(value) {
    const clean = value.replace(/[^0-9a-f]/gi, '');
    let output = '';
    for (let index = 0; index < clean.length; index += 2) {
      output += String.fromCharCode(Number.parseInt(clean.slice(index, index + 2).padEnd(2, '0'), 16));
    }
    return output;
  }

  function extractPdfStringLiterals(source) {
    const texts = [];
    const tokenPattern = /\((?:\\.|[^\\()])*\)\s*(?:Tj|'|")|\[(.*?)\]\s*TJ|<([0-9A-Fa-f\s]+)>\s*Tj/gs;
    let match;
    while ((match = tokenPattern.exec(source))) {
      const token = match[0];
      if (match[1] != null) {
        const arraySource = match[1];
        const itemPattern = /\((?:\\.|[^\\()])*\)|<([0-9A-Fa-f\s]+)>/g;
        let item;
        let joined = '';
        while ((item = itemPattern.exec(arraySource))) {
          const part = item[0];
          joined += part.startsWith('(')
            ? decodePdfLiteralString(part.slice(1, -1))
            : decodePdfHexString(part.slice(1, -1));
        }
        if (joined.trim()) texts.push(joined);
      } else if (match[2] != null) {
        const decoded = decodePdfHexString(match[2]);
        if (decoded.trim()) texts.push(decoded);
      } else {
        const literal = token.match(/^\((?:\\.|[^\\()])*\)/s)?.[0];
        if (literal) {
          const decoded = decodePdfLiteralString(literal.slice(1, -1));
          if (decoded.trim()) texts.push(decoded);
        }
      }
    }
    return texts;
  }

  async function bytesFromLocalPdfInput(file) {
    if (file?.bytes) return file.bytes;
    if (file?.arrayBuffer) return new Uint8Array(await file.arrayBuffer());
    if (file?.file?.arrayBuffer) return new Uint8Array(await file.file.arrayBuffer());
    return null;
  }

  function decodePdfAttachmentName(source, objectNumber) {
    const objectPattern = new RegExp(`${objectNumber}\\s+0\\s+obj([\\s\\S]*?)endobj`, 'i');
    const objectMatch = source.match(objectPattern);
    const objectBody = objectMatch?.[1] || '';
    const nameMatch = objectBody.match(/\/(?:UF|F)\s*\((?:\\.|[^\\()])*\)/);
    if (!nameMatch) return '';
    const literal = nameMatch[0].match(/\((?:\\.|[^\\()])*\)/)?.[0];
    return literal ? decodePdfLiteralString(literal.slice(1, -1)) : '';
  }

  function parsePdfDictionaryNumber(dictionaryText, name) {
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(dictionaryText || '').match(new RegExp(`/${escaped}\\s+(\\d+)\\b(?!\\s+\\d+\\s+R)`, 'i'));
    return match ? Number.parseInt(match[1], 10) : null;
  }

  function parsePdfObjects(source) {
    const objects = [];
    const startPattern = /(\d+)\s+0\s+obj\b/g;
    let start;
    while ((start = startPattern.exec(source))) {
      const objectNumber = start[1];
      const bodyStart = startPattern.lastIndex;
      const chunk = source.slice(bodyStart);
      const streamStart = chunk.search(/\bstream\r?\n/);
      const firstEndObjIndex = chunk.indexOf('endobj');
      if (firstEndObjIndex < 0) break;
      let objectEndRelative = firstEndObjIndex + 'endobj'.length;
      if (streamStart >= 0 && streamStart < firstEndObjIndex) {
        const streamHeader = chunk.match(/\bstream(\r?\n)/);
        const streamDataStart = streamStart + (streamHeader ? streamHeader[0].length : 'stream\n'.length);
        const dictionaryText = chunk.slice(0, streamStart);
        const declaredLength = parsePdfDictionaryNumber(dictionaryText, 'Length');
        if (Number.isInteger(declaredLength) && declaredLength >= 0) {
          const expectedEnd = streamDataStart + declaredLength;
          const afterStreamData = chunk.slice(expectedEnd);
          const declaredEndMatch = afterStreamData.match(/^\r?\n?endstream\s*endobj/i);
          if (declaredEndMatch) objectEndRelative = expectedEnd + declaredEndMatch[0].length;
          else objectEndRelative = expectedEnd;
        } else {
          return objects;
        }
      }
      const objectEnd = bodyStart + objectEndRelative;
      const body = source.slice(bodyStart, objectEnd).replace(/endobj\s*$/i, '').trim();
      const streamIndex = body.search(/\bstream\r?\n/);
      const dictionaryText = streamIndex >= 0 ? body.slice(0, streamIndex) : body;
      const hasStream = streamIndex >= 0;
      const streamMatch = hasStream ? body.match(/stream\r?\n([\s\S]*?)\r?\nendstream\s*$/i) : null;
      objects.push({ objectNumber, body, dictionaryText, hasStream, stream: streamMatch?.[1] || '' });
      startPattern.lastIndex = objectEnd;
    }
    return objects;
  }

  function getPdfRenderedObjectReferences(source, objects = parsePdfObjects(source)) {
    const rendered = new Set();
    const addRefs = (text) => {
      const refPattern = /(\d+)\s+0\s+R/g;
      let ref;
      while ((ref = refPattern.exec(text || ''))) rendered.add(ref[1]);
    };
    for (const object of objects) {
      if (/\/Type\s*\/Page\b/i.test(object.dictionaryText)) addRefs(object.dictionaryText);
      if (/\/Contents\b|\/Resources\b|\/XObject\b|\/Font\b|\/Pattern\b|\/Shading\b/i.test(object.dictionaryText)
          && !/\/Type\s*\/Filespec\b/i.test(object.dictionaryText)) {
        addRefs(object.dictionaryText);
      }
    }
    return rendered;
  }

  function getPdfFacturXMetadata(source, objects = parsePdfObjects(source)) {
    let metadata = '';
    const catalog = objects.find((object) => /\/Type\s*\/Catalog\b/i.test(object.dictionaryText));
    const refs = [];
    const catalogMetadata = catalog?.dictionaryText.match(/\/Metadata\s+(\d+)\s+0\s+R/i)?.[1];
    if (catalogMetadata) refs.push(catalogMetadata);
    for (const object of objects) {
      if (/\/Type\s*\/Metadata\b/i.test(object.dictionaryText) && object.stream) refs.push(object.objectNumber);
    }
    for (const ref of new Set(refs)) {
      const object = objects.find((candidate) => candidate.objectNumber === ref);
      if (object?.stream && /\/Type\s*\/Metadata\b/i.test(object.dictionaryText)) metadata += `\n${object.stream}`;
    }
    const metadataFilename = metadata.match(/<fx:DocumentFileName>([^<]+)</i)?.[1]
      || metadata.match(/<zf:DocumentFileName>([^<]+)</i)?.[1]
      || '';
    const hasFacturXMetadata = /urn:factur-x:pdfa:CrossIndustryDocument:invoice/i.test(metadata)
      || /urn:ferd:CrossIndustryDocument:invoice/i.test(metadata)
      || Boolean(metadataFilename);
    return { hasFacturXMetadata, metadataFilename };
  }

  function getPdfEmbeddedFileReferences(source) {
    const refs = new Map();
    const objects = parsePdfObjects(source);
    for (const object of objects) {
      const fileSpecObjectNumber = object.objectNumber;
      const dictionary = object.dictionaryText;
      if (object.hasStream) continue;
      if (!/\/EF\s*<</i.test(dictionary)) continue;
      if (!/\/Type\s*\/Filespec\b/i.test(dictionary)) continue;
      const efMatch = dictionary.match(/\/EF\s*<<([\s\S]*?)>>/i);
      if (!efMatch) continue;
      const filename = decodePdfAttachmentName(source, fileSpecObjectNumber) || 'embedded-invoice.xml';
      const refPattern = /\/(?:F|UF)\s+(\d+)\s+0\s+R/g;
      let ref;
      while ((ref = refPattern.exec(efMatch[1]))) {
        refs.set(ref[1], { filename, fileSpecObjectNumber, viaFileSpec: true });
      }
    }
    const { hasFacturXMetadata, metadataFilename } = getPdfFacturXMetadata(source, objects);
    if (hasFacturXMetadata) {
      const renderedRefs = getPdfRenderedObjectReferences(source, objects);
      for (const object of objects) {
        const objectNumber = object.objectNumber;
        if (renderedRefs.has(objectNumber)) continue;
        const descriptor = object.dictionaryText || '';
        const stream = object.stream || '';
        if (!stream) continue;
        if (!/\/Type\s*\/EmbeddedFile\b/i.test(descriptor)) continue;
        if (/\/Filter\b/i.test(descriptor)) continue;
        if (!/<(?:[A-Za-z0-9_-]+:)?CrossIndustryInvoice\b/i.test(stream)) continue;
        refs.set(objectNumber, { filename: metadataFilename || 'factur-x.xml', fileSpecObjectNumber: null, viaMetadata: true });
      }
    }
    return refs;
  }

  function hasInvoiceProfileMarker(text) {
    const xml = String(text || '');
    return /urn:xeinkauf\.de:kosit:xrechnung/i.test(xml)
      || /urn:cen\.eu:en16931:2017/i.test(xml)
      || /urn:factur-x:pdfa:CrossIndustryDocument:invoice/i.test(xml)
      || /urn:ferd:CrossIndustryDocument:invoice/i.test(xml)
      || /<[^>]*CustomizationID[^>]*>[\s\S]*(?:xrechnung|en16931)/i.test(xml)
      || /<[^>]*GuidelineSpecifiedDocumentContextParameter[^>]*>[\s\S]*(?:xrechnung|en16931|factur-x|ferd)/i.test(xml);
  }

  function extractEmbeddedXmlFromPdfSource(source) {
    if (!/\/EmbeddedFiles\b|\/EmbeddedFile\b/i.test(source)) return null;
    const embeddedRefs = getPdfEmbeddedFileReferences(source);
    if (embeddedRefs.size === 0) return null;
    const xmlStreams = [];
    const objects = parsePdfObjects(source);
    for (const object of objects) {
      const objectNumber = object.objectNumber;
      const attachment = embeddedRefs.get(objectNumber);
      if (!attachment) continue;
      const descriptor = object.dictionaryText || '';
      const stream = object.stream || '';
      if (!stream) continue;
      if (/\/Filter\b/i.test(descriptor)) continue;
      if (!/\/Type\s*\/EmbeddedFile\b/i.test(descriptor)) continue;
      if (!/<(?:[A-Za-z0-9_-]+:)?(?:CrossIndustryInvoice|Invoice|CreditNote)\b/i.test(stream)) continue;
      if (!hasInvoiceProfileMarker(stream)) continue;
      xmlStreams.push({ filename: attachment.filename, content: stream.trim() });
    }
    return xmlStreams[0] || null;
  }

  function looksLikeInvoiceXml(text) {
    return /<(?:[A-Za-z0-9_-]+:)?(?:CrossIndustryInvoice|Invoice|CreditNote)\b/i.test(String(text || '')) && hasInvoiceProfileMarker(text);
  }

  async function browserLocalPdfTextExtractor(file) {
    const bytes = await bytesFromLocalPdfInput(file);
    const source = bytesToBinaryString(bytes);
    if (!source.startsWith('%PDF-')) {
      return { ok: false, method: 'browser-local-pdf-text', confidence: 0, message: 'PDF-Datei konnte lokal nicht als PDF gelesen werden.' };
    }
    const embeddedXml = extractEmbeddedXmlFromPdfSource(source);
    if (embeddedXml) {
      const fields = parseXmlFields(embeddedXml.content);
      if (looksLikeInvoiceXml(embeddedXml.content) && hasSuggestedFields(fields)) {
        return {
          ok: true,
          method: 'browser-local-pdf-embedded-xml',
          confidence: 0.9,
          text: embeddedXml.content,
          fields,
          embeddedXml: {
            filename: embeddedXml.filename,
            format: /CrossIndustryInvoice/i.test(embeddedXml.content) ? 'cii' : 'xml',
          },
        };
      }
      return { ok: false, method: 'browser-local-pdf-embedded-xml', confidence: 0.1, message: 'Eingebettetes XML im PDF ist kein erkennbares Factur-X/ZUGFeRD/XRechnung-Rechnungs-XML oder enthält keine zuordenbaren Rechnungsfelder.' };
    }
    if (/\/EmbeddedFiles\b|\/EmbeddedFile\b/i.test(source)) {
      return { ok: false, method: 'browser-local-pdf-embedded-xml', confidence: 0.1, message: 'PDF enthält Anhänge, aber kein erkennbares eingebettetes Rechnungs-XML für Factur-X/ZUGFeRD/XRechnung.' };
    }
    if (/\/Filter\s*\/FlateDecode/i.test(source)) {
      return { ok: false, method: 'browser-local-pdf-text', confidence: 0.15, message: 'PDF enthält komprimierte Textstreams. Dieser lokale Spike liest nur einfachen eingebetteten PDF-Text; für diese Datei ist eine erweiterte lokale PDF-Engine oder OCR mit Human Review nötig.' };
    }
    const texts = [];
    const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let stream;
    while ((stream = streamPattern.exec(source))) {
      texts.push(...extractPdfStringLiterals(stream[1]));
    }
    const text = texts.join('\n').trim();
    if (!text) {
      return { ok: false, method: 'browser-local-pdf-text', confidence: 0.1, message: 'Keinen eingebetteten PDF-Text gefunden. Scan-/Bild-PDFs brauchen eine echte lokale OCR-Engine und Human Review.' };
    }
    return { ok: true, method: 'browser-local-pdf-text', confidence: 0.68, text };
  }

  LOCAL_EXTRACTORS.pdf = browserLocalPdfTextExtractor;

  function parseLocalDocument(file, options = {}) {
    const ext = extensionFromName(file?.name);
    const text = String(file?.text || '');
    if (['pdf', 'doc', 'docx'].includes(ext)) {
      const extractor = getLocalExtractor(ext, options);
      if (!extractor) {
        return {
          ok: false,
          requiresLocalOcrEngine: true,
          requiresDesktopExtraction: true,
          requiresServer: false,
          errors: ['PDF/DOC/DOCX brauchen eine lokale OCR/PDF-Engine im Browser oder ein lokales Desktop/CLI-Modul mit Sichtprüfung. Die Browser-Seite lädt nichts hoch und erfindet keine Rechnungsdaten.'],
          warnings: [],
          fields: {},
        };
      }
      try {
        const extraction = extractor(file);
        if (extraction && typeof extraction.then === 'function') {
          return extraction
            .then((resolved) => resultFromLocalExtraction(ext, resolved))
            .catch((error) => localExtractionFailure(`Lokale OCR/PDF-Engine ist fehlgeschlagen: ${error.message || error}`));
        }
        return resultFromLocalExtraction(ext, extraction);
      } catch (error) {
        return localExtractionFailure(`Lokale OCR/PDF-Engine ist fehlgeschlagen: ${error.message || error}`);
      }
    }
    if (!['txt', 'csv', 'xml'].includes(ext)) {
      return { ok: false, requiresServer: false, errors: ['Unbekannter Dateityp. Unterstützt im Browser: TXT, CSV, XML. PDF/DOC/DOCX brauchen eine lokale OCR/PDF-Engine oder Desktop/CLI-Extraktion.'], fields: {} };
    }
    const fields = fieldsFromDocumentText(ext, text);
    return {
      ok: true,
      requiresServer: false,
      requiresHumanReview: true,
      errors: [],
      warnings: ['Automatisch erkannte Felder müssen vor der Konvertierung geprüft werden.'],
      fields,
      fieldSources: buildFieldSources(fields, `${ext.toUpperCase()} lokale Dateierkennung`),
    };
  }

  function getBrowserExecutionModel() {
    return {
      githubPages: 'static-hosting-only',
      workflow: ['source-file', 'local-recognition', 'review-and-complete', 'browser-validation', 'export'],
      runsOnUserHardware: true,
      requiresApplicationServer: false,
      dataLeavesDeviceByDefault: false,
      review: {
        required: true,
        fieldSources: true,
        pattern: 'source-file-recognition-review-export funnel, implemented local-first without cloud AI or uploads',
      },
      generation: { mode: 'browser-only', output: ['UBL XML', 'CII XML', 'ZUGFeRD/Factur-X preparation package'] },
      validation: getBrowserValidationStrategy(),
      ocr: {
        mode: 'browser-local-engine-for-scans-or-documents',
        activeWhen: 'A reviewed local OCR/DOC/DOCX extractor is registered via registerLocalExtractor or XInvoiceLocalExtractors. The built-in PDF path extracts embedded XML first, then simple embedded text; it is not OCR.',
        builtInPdfTextExtraction: {
          mode: 'embedded-xml-first-then-simple-embedded-text',
          method: 'browser-local-pdf-embedded-xml-or-text',
          requiresServer: false,
          requiresHumanReview: true,
          limitations: ['no OCR for scanned/image PDFs', 'no compressed PDF stream decoding in this minimal slice', 'suggestions only'],
        },
        browserValidationStrategy: getBrowserValidationStrategy(),
        requiresHumanReview: true,
      },
      kosit: {
        officialValidator: 'KoSIT validator + validator-configuration-xrechnung',
        browserOnlyStatus: 'not shipped as a pure browser runtime in this product yet',
        explainsWhyNotPureBrowser: 'KoSIT is a Java validator stack with XRechnung ZIP artifacts, XSD, Schematron, code lists and report files. It can run on the user device today via local CLI/Desktop; a pure browser/WebAssembly port is possible but must be packaged and tested separately before any KoSIT-PASS claim.',
      },
    };
  }

  function getBrowserValidationStrategy() {
    return {
      goal: 'browser-local-xrechnung-validation',
      officialKoSITInBrowser: {
        feasible: 'theoretical-heavy-port',
        recommendation: 'do-not-port-java-first',
        reason: 'Official KoSIT is a Java CLI validator. A browser port would need JVM/WebAssembly, filesystem emulation, validator JAR, XRechnung ZIP/config handling, Schematron/XSLT and report plumbing.',
      },
      browserNativePipeline: {
        recommendation: 'build-browser-native-xsd-schematron-first',
        steps: ['xml-parse', 'syntax-detect', 'xsd-wasm', 'schematron-xslt', 'codelists', 'kosit-cli-parity-corpus'],
        candidateRuntimes: ['xmllint-wasm/libxml2 for XSD', 'SaxonJS or precompiled Schematron XSLT for Schematron'],
      },
      claimPolicy: {
        beforeParity: 'Browser validator in progress; KoSIT CLI remains reference.',
        afterParity: 'Browser validation using bundled XRechnung/KoSIT rule artifacts; parity-checked against KoSIT CLI for the shipped smoke corpus.',
        neverWithoutProof: ['official KoSIT ran in browser', 'KoSIT-valid', 'rechtssicher', '100% DSGVO'],
      },
    };
  }

  function xmlWellFormednessError(content) {
    const source = String(content || '');
    if (!/^\s*</.test(source)) return 'XML ist leer oder kein XML.';
    if (/<script[\s>]/i.test(source)) return 'XML enthält Script-Markup.';
    if (typeof DOMParser === 'function') {
      const parsed = new DOMParser().parseFromString(source, 'application/xml');
      if (parsed.getElementsByTagName('parsererror').length) return 'XML ist nicht wohlgeformt.';
      return '';
    }
    let index = 0;
    const stack = [];
    const tagPattern = /<([^<>]+)>/g;
    let token;
    while ((token = tagPattern.exec(source))) {
      const between = source.slice(index, token.index);
      if (/[<>]/.test(between)) return 'XML ist nicht wohlgeformt: ungültiges Markup.';
      index = tagPattern.lastIndex;
      const raw = token[1].trim();
      if (!raw || raw.startsWith('?') || raw.startsWith('!')) continue;
      const closing = raw.startsWith('/');
      const body = closing ? raw.slice(1).trim() : raw;
      if (closing) {
        if (!/^[A-Za-z_][\w:.-]*\s*$/.test(body)) return 'XML ist nicht wohlgeformt: ungültiger schließender Tag.';
        if (stack.pop() !== body) return 'XML ist nicht wohlgeformt: schließende Tags passen nicht.';
        continue;
      }
      const selfClosing = body.endsWith('/');
      const openBody = selfClosing ? body.slice(0, -1).trim() : body;
      const nameMatch = openBody.match(/^([A-Za-z_][\w:.-]*)(?:\s+([\s\S]*))?$/);
      if (!nameMatch) return 'XML ist nicht wohlgeformt: ungültiger Start-Tag.';
      const attrs = nameMatch[2] || '';
      let cursor = 0;
      const attrPattern = /([A-Za-z_][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g;
      let attr;
      while ((attr = attrPattern.exec(attrs))) {
        if (attrs.slice(cursor, attr.index).trim()) return 'XML ist nicht wohlgeformt: ungültiges Attribut.';
        cursor = attrPattern.lastIndex;
      }
      if (attrs.slice(cursor).trim()) return 'XML ist nicht wohlgeformt: ungültiges Attribut.';
      if (!selfClosing) stack.push(nameMatch[1]);
    }
    if (/[<>]/.test(source.slice(index))) return 'XML ist nicht wohlgeformt: ungültiges Markup.';
    return stack.length ? 'XML ist nicht wohlgeformt: Tags sind nicht geschlossen.' : '';
  }

  function validateXRechnungInBrowser(xml, options = {}) {
    const content = String(xml || '');
    const formatId = options.formatId || (/<rsm:CrossIndustryInvoice\b|<CrossIndustryInvoice\b/i.test(content) ? 'xrechnung-cii' : 'xrechnung-ubl');
    const checks = [];
    const errors = [];
    const wellFormednessError = xmlWellFormednessError(content);
    function check(name, condition, message) {
      const ok = Boolean(condition);
      checks.push({ name, ok });
      if (!ok) errors.push(message);
    }
    check('well-formed XML', !wellFormednessError, wellFormednessError || 'XML ist nicht wohlgeformt.');
    if (formatId === 'xrechnung-cii') {
      check('CII root', /<(?:[A-Za-z0-9_-]+:)?CrossIndustryInvoice\b/i.test(content), 'CII CrossIndustryInvoice Root fehlt.');
      check('XRechnung guideline', /urn:xeinkauf\.de:kosit:xrechnung_3\.0/i.test(content), 'XRechnung Guideline/Customization fehlt.');
      check('BuyerReference', /<(?:[A-Za-z0-9_-]+:)?BuyerReference\b[^>]*>\s*[^<\s]/i.test(content), 'BuyerReference fehlt.');
    } else {
      check('UBL Invoice or CreditNote root', /<(?:Invoice|CreditNote)\b/i.test(content), 'UBL Invoice/CreditNote Root fehlt.');
      check('CustomizationID', /<(?:[A-Za-z0-9_-]+:)?CustomizationID\b[^>]*>[\s\S]*urn:xeinkauf\.de:kosit:xrechnung_3\.0/i.test(content), 'XRechnung CustomizationID fehlt.');
      check('BuyerReference', /<(?:[A-Za-z0-9_-]+:)?BuyerReference\b[^>]*>\s*[^<\s]/i.test(content), 'BuyerReference fehlt.');
    }
    return {
      ok: errors.length === 0,
      engine: 'browser-xrechnung-sanity',
      officialKoSIT: false,
      parityWithKoSIT: 'not-established',
      requiresServer: false,
      formatId,
      artifacts: ['xrechnung-3.0.2-validator-configuration-2026-01-31.zip', 'xrechnung-3.0.2-bundle-2026-01-31.zip'],
      checks,
      errors,
      warnings: ['Browser-Sanity ist noch kein offizieller KoSIT-PASS. KoSIT CLI bleibt Referenz, bis XSD/Schematron/Codelist-Parität nachgewiesen ist.'],
    };
  }

  function renderExtractionReview(document, report) {
    const panel = document.getElementById('extractionReview');
    const summary = document.getElementById('extractionSummary');
    const list = document.getElementById('recognizedFieldList');
    if (!panel || !summary || !list) return;
    panel.hidden = false;
    list.textContent = '';
    const filled = report.filled || [];
    const missingRequired = report.missingRequired || [];
    summary.className = missingRequired.length ? 'helper extraction-warning' : 'helper extraction-ok';
    summary.textContent = `${filled.length} Felder automatisch vorgeschlagen. ${missingRequired.length ? `${missingRequired.length} Pflichtfelder fehlen noch.` : 'Alle aktuell markierten Pflichtfelder sind gefüllt.'} Bitte alles prüfen.`;
    for (const item of filled) {
      const row = document.createElement('div');
      row.className = 'recognized-field';
      const label = document.createElement('strong');
      label.textContent = item.label || item.id;
      const value = document.createElement('span');
      value.textContent = item.value;
      const source = document.createElement('small');
      source.textContent = `Quelle: ${item.source || 'lokale Erkennung'}`;
      row.appendChild(label);
      row.appendChild(value);
      row.appendChild(source);
      list.appendChild(row);
    }
    for (const id of missingRequired) {
      const field = REQUIRED_FIELDS.find((candidate) => candidate.id === id);
      const row = document.createElement('div');
      row.className = 'recognized-field missing';
      const label = document.createElement('strong');
      label.textContent = field?.label || id;
      const value = document.createElement('span');
      value.textContent = 'fehlt noch';
      row.appendChild(label);
      row.appendChild(value);
      list.appendChild(row);
    }
  }

  function applyParsedFields(document, fields, fieldSources = {}) {
    const assignments = {
      invoiceNumber: 'invoiceNumber', issueDate: 'issueDate', invoiceTypeCode: 'invoiceTypeCode', dueDate: 'dueDate', currency: 'currency', businessProcessType: 'businessProcessType', buyerReference: 'buyerReference', orderNumber: 'orderNumber', paymentIban: 'paymentIban', paymentTerms: 'paymentTerms', sellerName: 'sellerName', sellerStreet: 'sellerStreet', sellerPostalCode: 'sellerPostalCode', sellerCity: 'sellerCity', sellerCountry: 'sellerCountry', sellerVatId: 'sellerVatId', sellerEndpointId: 'sellerEndpointId', sellerEndpointSchemeId: 'sellerEndpointSchemeId', sellerIdentifier: 'sellerIdentifier', sellerTelephone: 'sellerTelephone', buyerName: 'buyerName', buyerStreet: 'buyerStreet', buyerPostalCode: 'buyerPostalCode', buyerCity: 'buyerCity', buyerCountry: 'buyerCountry', buyerEndpointId: 'buyerEndpointId', buyerEndpointSchemeId: 'buyerEndpointSchemeId', lineDescription: 'lineDescription', lineQuantity: 'lineQuantity', lineUnitCode: 'lineUnitCode', lineNetPrice: 'lineNetPrice', lineTaxPercent: 'lineTaxPercent',
    };
    const labels = Object.fromEntries([...getFormFieldBindings(), ...REQUIRED_FIELDS].map((field) => [field.id, field.catalogName || field.label || field.id]));
    const filled = [];
    for (const [key, id] of Object.entries(assignments)) {
      if (!fields[key]) continue;
      const input = document.getElementById(id);
      if (input) {
        input.value = fields[key];
        input.dataset.source = fieldSources[key] || 'lokale Erkennung';
        input.classList?.add?.('auto-filled');
        filled.push({ id, key, label: labels[id] || id, value: String(fields[key]), source: fieldSources[key] || 'lokale Erkennung' });
      }
    }
    const missingRequired = REQUIRED_FIELDS
      .map((field) => field.id)
      .filter((id) => {
        const input = document.getElementById(id);
        if (!String(input?.value || '').trim()) return true;
        return input?.dataset?.defaultValue === 'true' && input?.dataset?.userConfirmed !== 'true' && !input?.dataset?.source;
      });
    const report = { filled, missingRequired };
    renderExtractionReview(document, report);
    return report;
  }

  function validationPlan(formatId) {
    const fmt = FORMATS[formatId];
    return {
      formatId,
      label: fmt?.label,
      requiredLocalValidators: fmt?.requiredLocalValidators || [],
      validation: fmt?.validation || [],
      note: fmt?.syntax === 'cii-package'
        ? 'Browser erzeugt ein XML-Paket. PDF/A-3 Montage und finale Validierung laufen lokal mit nativen Tools.'
        : 'Browser erzeugt XML. Finale Validierung läuft lokal mit den angegebenen Validatoren.',
    };
  }

  function validateGeneratedArtifact(artifact) {
    const checks = [];
    const errors = [];
    const content = String(artifact?.content || '');
    const formatId = artifact?.formatId;
    function check(name, condition, message) {
      checks.push({ name, ok: Boolean(condition) });
      if (!condition) errors.push(message);
    }
    check('non-empty artifact', content.length > 50, 'Artefakt ist leer oder zu kurz.');
    check('no executable HTML/script injection', !/<script[\s>]/i.test(content), 'Artefakt enthält Script-Markup.');
    if (formatId === 'xrechnung-ubl') {
      check('UBL Invoice root', content.includes('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"'), 'UBL Invoice Root fehlt.');
      check('XRechnung customization', content.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'XRechnung CustomizationID fehlt.');
      check('BuyerReference present', content.includes('<cbc:BuyerReference>'), 'BuyerReference fehlt.');
      check('OrderReference present', content.includes('<cac:OrderReference>'), 'OrderReference fehlt.');
    } else if (formatId === 'ubl') {
      check('UBL Invoice root', content.includes('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"'), 'UBL Invoice Root fehlt.');
      check('EN16931 marker', content.includes('urn:cen.eu:en16931:2017'), 'EN16931 Marker fehlt.');
      check('No XRechnung claim', !content.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'Generisches UBL darf keine XRechnung-CIUS behaupten.');
    } else if (formatId === 'xrechnung-cii') {
      check('CII root', content.includes('<rsm:CrossIndustryInvoice'), 'CrossIndustryInvoice Root fehlt.');
      check('XRechnung guideline', content.includes('urn:xeinkauf.de:kosit:xrechnung_3.0'), 'XRechnung Guideline fehlt.');
      check('BuyerReference present', content.includes('<ram:BuyerReference>'), 'BuyerReference fehlt.');
    } else if (formatId === 'zugferd-pdf' || formatId === 'factur-x-pdf') {
      check('Hybrid package root', content.includes('<browserHybridInvoicePackage'), 'Hybrid-Paket Root fehlt.');
      check('Local PDF/A-3 assembly flag', content.includes('requiresLocalPdfA3Assembly="true"'), 'PDF/A-3 Montage-Hinweis fehlt.');
      check('Embedded CII CDATA', content.includes('<embeddedCiiXml><![CDATA['), 'Eingebettetes CII XML fehlt.');
      check('Mustangproject validator notice', content.includes('Mustangproject'), 'Mustangproject-Hinweis fehlt.');
      check('veraPDF validator notice', content.includes('veraPDF'), 'veraPDF-Hinweis fehlt.');
    } else {
      check('known format', false, `Unbekanntes Zielformat: ${formatId}`);
    }
    return { ok: errors.length === 0, errors, checks };
  }

  function generateInvoice(invoice, formatId) {
    const check = preflightInvoice(invoice, formatId);
    if (!check.ok) throw new Error(check.errors.join('\n'));
    const fmt = FORMATS[formatId];
    let content;
    if (formatId === 'xrechnung-ubl') content = generateUblXml(invoice, { xrechnung: true });
    else if (formatId === 'ubl') content = generateUblXml(invoice, { xrechnung: false });
    else if (formatId === 'xrechnung-cii') content = generateCiiXml(invoice, { xrechnung: true });
    else if (formatId === 'zugferd-pdf' || formatId === 'factur-x-pdf') content = generateHybridPackage(invoice, formatId);
    else throw new Error(`Unbekanntes Zielformat: ${formatId}`);
    const artifact = {
      ok: true,
      formatId,
      filename: `${filenameBase(invoice)}-${formatId}${fmt.extension}`,
      mimeType: fmt.mimeType,
      content,
      validationPlan: validationPlan(formatId),
    };
    artifact.browserValidation = validateGeneratedArtifact(artifact);
    if (!artifact.browserValidation.ok) throw new Error(artifact.browserValidation.errors.join('\n'));
    return artifact;
  }

  function convertForAgent(invoice, formatId) {
    const check = preflightInvoice(invoice, formatId);
    if (!check.ok) return { ok: false, errors: check.errors, warnings: check.warnings, requiredFields: getRequiredFields(formatId) };
    const artifact = generateInvoice(invoice, formatId);
    return { ok: true, errors: [], warnings: check.warnings, artifact, validationPlan: artifact.validationPlan, requiredFields: getRequiredFields(formatId) };
  }

  function collectInvoiceFromDom(document) {
    const value = (id) => document.getElementById(id)?.value?.trim() || '';
    return {
      invoiceNumber: value('invoiceNumber'),
      issueDate: value('issueDate'),
      dueDate: value('dueDate'),
      invoiceTypeCode: value('invoiceTypeCode'),
      currency: value('currency'),
      buyerReference: value('buyerReference'),
      businessProcessType: value('businessProcessType'),
      projectReference: value('projectReference'),
      contractReference: value('contractReference'),
      orderNumber: value('orderNumber'),
      sellerOrderReference: value('sellerOrderReference'),
      seller: {
        name: value('sellerName'), street: value('sellerStreet'), postalCode: value('sellerPostalCode'), city: value('sellerCity'), country: value('sellerCountry'), vatId: value('sellerVatId'), endpointId: value('sellerEndpointId'), endpointSchemeId: value('sellerEndpointSchemeId'), sellerIdentifier: value('sellerIdentifier'), telephone: value('sellerTelephone'),
      },
      buyer: {
        name: value('buyerName'), street: value('buyerStreet'), postalCode: value('buyerPostalCode'), city: value('buyerCity'), country: value('buyerCountry'), endpointId: value('buyerEndpointId'), endpointSchemeId: value('buyerEndpointSchemeId'),
      },
      delivery: { date: value('deliveryDate'), recipientName: value('deliveryRecipientName'), street: value('deliveryStreet'), city: value('deliveryCity'), country: value('deliveryCountry') },
      allowance: { amount: value('allowanceAmount'), reasonCode: value('allowanceReasonCode') },
      charge: { amount: value('chargeAmount'), reasonCode: value('chargeReasonCode') },
      tax: { exemptionReason: value('taxExemptionReason') },
      attachment: { id: value('attachmentId'), description: value('attachmentDescription') },
      paymentIban: value('paymentIban'),
      paymentTerms: value('paymentTerms'),
      lines: [{ description: value('lineDescription'), quantity: value('lineQuantity'), unitCode: value('lineUnitCode'), netPrice: value('lineNetPrice'), taxCategory: 'S', taxPercent: value('lineTaxPercent') }],
    };
  }

  function showResult(document, result) {
    const box = document.getElementById('result');
    if (!box) return;
    box.hidden = false;
    box.className = result.ok ? 'result ok' : 'result bad';
    box.textContent = [
      ...(result.errors || []),
      ...(result.warnings || []).map((warning) => `Warnung: ${warning}`),
      result.message || '',
    ].filter(Boolean).join('\n');
  }

  function downloadText(document, artifact) {
    const blob = new Blob([artifact.content], { type: `${artifact.mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function markRequiredFields(document) {
    for (const field of REQUIRED_FIELDS) {
      const input = document.getElementById(field.id);
      if (!input) continue;
      input.required = true;
      const label = input.closest('label');
      if (label && !label.querySelector('.required-star')) {
        const star = document.createElement('span');
        star.className = 'required-star';
        star.textContent = ' *';
        star.setAttribute?.('aria-label', 'Pflichtfeld');
        star.title = 'Pflichtfeld';
        const labelText = label.querySelector('.label-text');
        if (labelText) labelText.appendChild(star);
        else label.insertBefore(star, input);
      }
    }
  }

  function initBrowser(document) {
    const form = document.getElementById('invoiceForm');
    const formatSelect = document.getElementById('format');
    const plan = document.getElementById('validationPlan');
    const sourceFile = document.getElementById('sourceFile');
    if (!form || !formatSelect) return;
    markRequiredFields(document);
    applyXRechnungFieldMetadata(document);

    function renderPlan() {
      const fmt = FORMATS[formatSelect.value];
      plan.textContent = `${fmt.label}\nAusgabe: ${fmt.output}\nStatus: Browser-Export implementiert\nValidierung: ${fmt.validation.join(' + ')}`;
    }
    formatSelect.addEventListener('change', renderPlan);
    renderPlan();

    if (sourceFile) {
      sourceFile.addEventListener('change', () => {
        const selected = sourceFile.files && sourceFile.files[0];
        if (!selected) return;
        const ext = extensionFromName(selected.name);
        const handleParsed = (parsed) => {
          if (parsed.ok) {
            applyXRechnungFieldMetadata(document);
            applyParsedFields(document, parsed.fields, parsed.fieldSources || {});
          }
          const filledCount = parsed.ok ? Object.keys(parsed.fields || {}).length : 0;
          showResult(document, parsed.ok
            ? { ok: true, warnings: parsed.warnings, message: `Lokale Datei gelesen: ${selected.name}. ${filledCount} Felder automatisch vorgeschlagen; bitte Feldquellen prüfen und fehlende Pflichtfelder ergänzen.` }
            : parsed);
        };
        const handleMaybeAsync = (parsed) => {
          if (parsed && typeof parsed.then === 'function') {
            parsed.then(handleParsed).catch((error) => showResult(document, { ok: false, errors: [`Lokale Dokumentextraktion fehlgeschlagen: ${error.message || error}`] }));
            return;
          }
          handleParsed(parsed);
        };
        if (['pdf', 'doc', 'docx'].includes(ext)) {
          handleMaybeAsync(parseLocalDocument({ name: selected.name, type: selected.type, file: selected }));
          return;
        }
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          const parsed = parseLocalDocument({ name: selected.name, type: selected.type, text: String(reader.result || ''), file: selected });
          handleMaybeAsync(parsed);
        });
        reader.addEventListener('error', () => showResult(document, { ok: false, errors: [`Datei konnte nicht lokal gelesen werden: ${selected.name}`] }));
        reader.readAsText(selected);
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const invoice = collectInvoiceFromDom(document);
      const formatId = formatSelect.value;
      const result = convertForAgent(invoice, formatId);
      if (!result.ok) {
        showResult(document, result);
        return;
      }
      document.getElementById('xmlPreview').value = result.artifact.content;
      const packageWarning = FORMATS[formatId].syntax === 'cii-package'
        ? ' Browser hat ein XML-Paket erzeugt; echtes PDF/A-3 muss lokal assembliert und validiert werden.'
        : '';
      showResult(document, { ok: true, warnings: result.warnings, message: `Artefakt erzeugt. Finale Validierung: ${result.validationPlan.requiredLocalValidators.join(' + ')}.${packageWarning}` });
      downloadText(document, result.artifact);
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => initBrowser(document));
  }

  return { FORMATS, preflightInvoice, generateInvoice, calculateTotals, escapeXml, getRequiredFields, getXRechnungFieldCatalog, getAdvancedFieldGroups, getFormFieldBindings, getFieldPriority, getFieldsByPriority, applyXRechnungFieldMetadata, applyParsedFields, convertForAgent, validationPlan, validateGeneratedArtifact, validateXRechnungInBrowser, getBrowserValidationStrategy, parseLocalDocument, registerLocalExtractor, getBrowserExecutionModel, markRequiredFields, initBrowser };
});
