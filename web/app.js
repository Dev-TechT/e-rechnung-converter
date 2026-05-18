(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XInvoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const FORMATS = {
    'xrechnung-ubl': {
      label: 'XRechnung UBL XML',
      implemented: true,
      output: 'XML-Datei',
      validation: ['KoSIT Validator lokal', 'validator-configuration-xrechnung lokal'],
    },
    'xrechnung-cii': {
      label: 'XRechnung CII XML',
      implemented: false,
      output: 'XML-Datei',
      validation: ['KoSIT Validator lokal', 'Mustangproject optional'],
    },
    'zugferd-pdf': {
      label: 'ZUGFeRD PDF/A-3',
      implemented: false,
      output: 'PDF/A-3 mit eingebettetem CII-XML',
      validation: ['Mustangproject lokal', 'veraPDF lokal', 'KoSIT lokal falls XRechnung-Profil'],
    },
    'factur-x-pdf': {
      label: 'Factur-X PDF/A-3',
      implemented: false,
      output: 'PDF/A-3 mit eingebettetem CII-XML',
      validation: ['Mustangproject lokal', 'veraPDF lokal'],
    },
  };

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

  function requireField(errors, value, label) {
    if (!String(value ?? '').trim()) errors.push(`${label} fehlt.`);
  }

  function preflightInvoice(invoice, formatId) {
    const errors = [];
    const warnings = [];
    const format = FORMATS[formatId];
    if (!format) {
      errors.push(`Unbekanntes Zielformat: ${formatId}`);
      return { ok: false, errors, warnings };
    }
    if (!format.implemented) {
      errors.push(`${format.label} ist im Browser-Demo noch nicht im Browser implementiert. Der lokale Validierungsworkflow ist dokumentiert.`);
      return { ok: false, errors, warnings };
    }

    requireField(errors, invoice.invoiceNumber, 'Rechnungsnummer');
    requireField(errors, invoice.issueDate, 'Rechnungsdatum');
    requireField(errors, invoice.dueDate, 'Fälligkeitsdatum');
    requireField(errors, invoice.buyerReference, 'Leitweg-ID / BuyerReference');
    requireField(errors, invoice.orderNumber, 'Auftragsnummer / Bestellreferenz');
    requireField(errors, invoice.seller?.name, 'Name des Rechnungsstellers');
    requireField(errors, invoice.buyer?.name, 'Name des Empfängers');
    requireField(errors, invoice.paymentIban, 'IBAN');

    if (!Array.isArray(invoice.lines) || invoice.lines.length === 0) {
      errors.push('Mindestens eine Rechnungsposition fehlt.');
    } else {
      invoice.lines.forEach((line, index) => {
        requireField(errors, line.description, `Beschreibung Position ${index + 1}`);
        if (decimal(line.quantity) <= 0) errors.push(`Menge Position ${index + 1} muss größer als 0 sein.`);
        if (decimal(line.netPrice) < 0) errors.push(`Nettopreis Position ${index + 1} darf nicht negativ sein.`);
      });
    }

    if (!String(invoice.buyerReference ?? '').match(/^[0-9A-Za-z][0-9A-Za-z\-]{4,}$/)) {
      warnings.push('Leitweg-ID-Format wirkt ungewöhnlich; bitte Empfängerangabe prüfen.');
    }
    if (!String(invoice.orderNumber ?? '').match(/[A-Za-z0-9]/)) {
      warnings.push('Auftragsnummer wirkt ungewöhnlich; bei öffentlichen Empfängern oft Pflicht.');
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  function calculateTotals(lines) {
    const taxable = lines.reduce((sum, line) => sum + decimal(line.quantity) * decimal(line.netPrice), 0);
    const firstTax = lines[0] ? decimal(lines[0].taxPercent, 19) : 19;
    const tax = money(taxable * firstTax / 100);
    return { taxable: money(taxable), tax, payable: money(taxable + tax), taxPercent: firstTax };
  }

  function partyXml(party) {
    return `
    <cac:Party>
      ${party.endpointId ? `<cbc:EndpointID schemeID="${escapeXml(party.endpointSchemeId || 'EM')}">${escapeXml(party.endpointId)}</cbc:EndpointID>` : ''}
      <cac:PartyName><cbc:Name>${escapeXml(party.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(party.street)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(party.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(party.postalCode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${escapeXml(party.country || 'DE')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${party.vatId ? `<cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(party.vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(party.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>`;
  }

  function generateInvoice(invoice, formatId) {
    const check = preflightInvoice(invoice, formatId);
    if (!check.ok) throw new Error(check.errors.join('\n'));
    const totals = calculateTotals(invoice.lines);
    const currency = invoice.currency || 'EUR';
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

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(invoice.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${escapeXml(invoice.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escapeXml(currency)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escapeXml(invoice.buyerReference)}</cbc:BuyerReference>
  <cac:OrderReference><cbc:ID>${escapeXml(invoice.orderNumber)}</cbc:ID></cac:OrderReference>
  <cac:AccountingSupplierParty>${partyXml(invoice.seller)}
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${partyXml(invoice.buyer)}
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>${escapeXml(invoice.paymentIban)}</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>
  <cac:TaxTotal><cbc:TaxAmount currencyID="${currency}">${formatMoney(totals.tax)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="${currency}">${formatMoney(totals.taxable)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="${currency}">${formatMoney(totals.tax)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${formatMoney(totals.taxPercent)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="${currency}">${formatMoney(totals.taxable)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="${currency}">${formatMoney(totals.taxable)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="${currency}">${formatMoney(totals.payable)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="${currency}">${formatMoney(totals.payable)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lineXml}
</Invoice>`;
  }

  function collectInvoiceFromDom(document) {
    const value = (id) => document.getElementById(id)?.value?.trim() || '';
    return {
      invoiceNumber: value('invoiceNumber'),
      issueDate: value('issueDate'),
      dueDate: value('dueDate'),
      currency: value('currency') || 'EUR',
      buyerReference: value('buyerReference'),
      orderNumber: value('orderNumber'),
      seller: {
        name: value('sellerName'), street: value('sellerStreet'), postalCode: value('sellerPostalCode'), city: value('sellerCity'), country: value('sellerCountry') || 'DE', vatId: value('sellerVatId'), endpointId: value('sellerEndpointId'), endpointSchemeId: value('sellerEndpointSchemeId') || 'EM',
      },
      buyer: {
        name: value('buyerName'), street: value('buyerStreet'), postalCode: value('buyerPostalCode'), city: value('buyerCity'), country: value('buyerCountry') || 'DE', endpointId: value('buyerEndpointId'), endpointSchemeId: value('buyerEndpointSchemeId') || 'EM',
      },
      paymentIban: value('paymentIban'),
      lines: [{ description: value('lineDescription'), quantity: value('lineQuantity'), unitCode: value('lineUnitCode') || 'C62', netPrice: value('lineNetPrice'), taxCategory: 'S', taxPercent: value('lineTaxPercent') || '19' }],
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

  function downloadText(document, filename, text) {
    const blob = new Blob([text], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function initBrowser(document) {
    const form = document.getElementById('invoiceForm');
    const formatSelect = document.getElementById('format');
    const plan = document.getElementById('validationPlan');
    if (!form || !formatSelect) return;

    function renderPlan() {
      const fmt = FORMATS[formatSelect.value];
      plan.textContent = `${fmt.label}\nAusgabe: ${fmt.output}\nStatus: ${fmt.implemented ? 'Browser-Demo implementiert' : 'Geplant, lokal validierbar'}\nValidierung: ${fmt.validation.join(' + ')}`;
    }
    formatSelect.addEventListener('change', renderPlan);
    renderPlan();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const invoice = collectInvoiceFromDom(document);
      const formatId = formatSelect.value;
      const check = preflightInvoice(invoice, formatId);
      if (!check.ok) {
        showResult(document, check);
        return;
      }
      const xml = generateInvoice(invoice, formatId);
      document.getElementById('xmlPreview').value = xml;
      showResult(document, { ok: true, warnings: check.warnings, message: 'XML-Kandidat erzeugt. Für Produktion bitte lokal mit KoSIT validieren.' });
      downloadText(document, `${invoice.invoiceNumber || 'rechnung'}-xrechnung.xml`, xml);
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => initBrowser(document));
  }

  return { FORMATS, preflightInvoice, generateInvoice, calculateTotals, escapeXml, initBrowser };
});
