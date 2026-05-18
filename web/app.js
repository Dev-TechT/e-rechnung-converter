(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XInvoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const REQUIRED_FIELDS = [
    { id: 'invoiceNumber', label: 'Rechnungsnummer', required: true },
    { id: 'issueDate', label: 'Rechnungsdatum', required: true },
    { id: 'dueDate', label: 'Fälligkeitsdatum', required: true },
    { id: 'buyerReference', label: 'Leitweg-ID / BuyerReference', required: true },
    { id: 'orderNumber', label: 'Auftragsnummer / Bestellreferenz', required: true },
    { id: 'sellerName', label: 'Name des Rechnungsstellers', required: true },
    { id: 'sellerEndpointId', label: 'E-Mail-Adresse des Rechnungsstellers / Endpoint-ID', required: true },
    { id: 'sellerIdentifier', label: 'Seller Identifier / Verkäuferkennung', required: true },
    { id: 'sellerTelephone', label: 'Telefon des Rechnungsstellers', required: true },
    { id: 'buyerName', label: 'Name des Empfängers', required: true },
    { id: 'paymentIban', label: 'IBAN', required: true },
    { id: 'paymentTerms', label: 'Zahlungsbedingungen', required: true },
    { id: 'lineDescription', label: 'Beschreibung Position 1', required: true },
    { id: 'lineQuantity', label: 'Menge Position 1', required: true },
    { id: 'lineNetPrice', label: 'Nettopreis Position 1', required: true },
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
      currency: invoice?.currency || 'EUR',
      buyerReference: invoice?.buyerReference,
      orderNumber: invoice?.orderNumber,
      seller: {
        ...(invoice?.seller || {}),
      },
      buyer: {
        ...(invoice?.buyer || {}),
      },
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
    requireStringField(errors, invoice.dueDate, 'Fälligkeitsdatum');
    requireStringField(errors, invoice.buyerReference, 'Leitweg-ID / BuyerReference');
    requireStringField(errors, invoice.orderNumber, 'Auftragsnummer / Bestellreferenz');
    requireStringField(errors, invoice.seller?.name, 'Name des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.endpointId, 'E-Mail-Adresse des Rechnungsstellers / Endpoint-ID');
    requireStringField(errors, invoice.seller?.sellerIdentifier, 'Seller Identifier / Verkäuferkennung');
    requireStringField(errors, invoice.seller?.telephone, 'Telefon des Rechnungsstellers');
    requireStringField(errors, invoice.buyer?.name, 'Name des Empfängers');
    requireStringField(errors, invoice.paymentIban, 'IBAN');
    requireStringField(errors, invoice.paymentTerms, 'Zahlungsbedingungen');

    if (!Array.isArray(invoice.lines) || invoice.lines.length === 0) {
      errors.push('Mindestens eine Rechnungsposition fehlt.');
    } else {
      invoice.lines.forEach((line, index) => {
        requireStringField(errors, line.description, `Beschreibung Position ${index + 1}`);
        requireStringField(errors, line.quantity, `Menge Position ${index + 1}`);
        requireStringField(errors, line.netPrice, `Nettopreis Position ${index + 1}`);
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

    return { ok: errors.length === 0, errors, warnings };
  }

  function calculateTotals(lines) {
    const taxable = lines.reduce((sum, line) => sum + decimal(line.quantity) * decimal(line.netPrice), 0);
    const firstTax = lines[0] ? decimal(lines[0].taxPercent, 19) : 19;
    const tax = money(taxable * firstTax / 100);
    return { taxable: money(taxable), tax, payable: money(taxable + tax), taxPercent: firstTax };
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
    const totals = calculateTotals(invoice.lines);
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

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>${customization}</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(invoice.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${escapeXml(invoice.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:Note>${escapeXml(invoice.paymentTerms)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${escapeXml(currency)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escapeXml(invoice.buyerReference)}</cbc:BuyerReference>
  <cac:OrderReference><cbc:ID>${escapeXml(invoice.orderNumber)}</cbc:ID></cac:OrderReference>
  <cac:AccountingSupplierParty>${partyUblXml(invoice.seller)}
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${partyUblXml(invoice.buyer)}
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>${escapeXml(invoice.paymentIban)}</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>
  <cac:TaxTotal><cbc:TaxAmount currencyID="${currency}">${formatMoney(totals.tax)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="${currency}">${formatMoney(totals.taxable)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="${currency}">${formatMoney(totals.tax)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${formatMoney(totals.taxPercent)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="${currency}">${formatMoney(totals.taxable)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="${currency}">${formatMoney(totals.taxable)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="${currency}">${formatMoney(totals.payable)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="${currency}">${formatMoney(totals.payable)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lineXml}
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
  <rsm:ExchangedDocumentContext><ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${guideline}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument><ram:ID>${escapeXml(invoice.invoiceNumber)}</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${escapeXml(invoice.issueDate.replaceAll('-', ''))}</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
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
    const valueOf = (localName) => {
      const match = String(text || '').match(new RegExp(`<(?:[A-Za-z0-9_-]+:)?${localName}[^>]*>([^<]+)</(?:[A-Za-z0-9_-]+:)?${localName}>`, 'i'));
      return match ? match[1].trim() : '';
    };
    const id = valueOf('ID');
    const buyerReference = valueOf('BuyerReference');
    if (id) fields.invoiceNumber = id;
    if (buyerReference) fields.buyerReference = buyerReference;
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

  function parseLocalDocument(file) {
    const ext = extensionFromName(file?.name);
    const text = String(file?.text || '');
    if (['pdf', 'doc', 'docx'].includes(ext)) {
      return {
        ok: false,
        requiresDesktopExtraction: true,
        errors: ['PDF/DOC/DOCX brauchen eine lokale Desktop-Extraktion mit Sichtprüfung. Die Browser-Seite lädt nichts hoch und behauptet keine fehlerfreie OCR.'],
        fields: {},
      };
    }
    if (!['txt', 'csv', 'xml'].includes(ext)) {
      return { ok: false, errors: ['Unbekannter Dateityp. Unterstützt im Browser: TXT, CSV, XML. PDF/DOC/DOCX folgen über lokale Desktop-Extraktion.'], fields: {} };
    }
    const fields = ext === 'csv' ? parseCsvFields(text) : ext === 'xml' ? parseXmlFields(text) : parseTextFields(text);
    return { ok: true, errors: [], warnings: ['Automatisch erkannte Felder müssen vor der Konvertierung geprüft werden.'], fields };
  }

  function applyParsedFields(document, fields) {
    const assignments = {
      invoiceNumber: 'invoiceNumber', issueDate: 'issueDate', dueDate: 'dueDate', buyerReference: 'buyerReference', orderNumber: 'orderNumber', paymentIban: 'paymentIban', paymentTerms: 'paymentTerms', sellerName: 'sellerName', sellerEndpointId: 'sellerEndpointId', sellerIdentifier: 'sellerIdentifier', sellerTelephone: 'sellerTelephone', buyerName: 'buyerName', lineDescription: 'lineDescription', lineQuantity: 'lineQuantity', lineNetPrice: 'lineNetPrice',
    };
    for (const [key, id] of Object.entries(assignments)) {
      if (!fields[key]) continue;
      const input = document.getElementById(id);
      if (input) input.value = fields[key];
    }
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
      currency: value('currency') || 'EUR',
      buyerReference: value('buyerReference'),
      orderNumber: value('orderNumber'),
      seller: {
        name: value('sellerName'), street: value('sellerStreet'), postalCode: value('sellerPostalCode'), city: value('sellerCity'), country: value('sellerCountry') || 'DE', vatId: value('sellerVatId'), endpointId: value('sellerEndpointId'), endpointSchemeId: value('sellerEndpointSchemeId') || 'EM', sellerIdentifier: value('sellerIdentifier'), telephone: value('sellerTelephone'),
      },
      buyer: {
        name: value('buyerName'), street: value('buyerStreet'), postalCode: value('buyerPostalCode'), city: value('buyerCity'), country: value('buyerCountry') || 'DE', endpointId: value('buyerEndpointId'), endpointSchemeId: value('buyerEndpointSchemeId') || 'EM',
      },
      paymentIban: value('paymentIban'),
      paymentTerms: value('paymentTerms'),
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
        if (['pdf', 'doc', 'docx'].includes(ext)) {
          showResult(document, parseLocalDocument({ name: selected.name, text: '' }));
          return;
        }
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          const parsed = parseLocalDocument({ name: selected.name, type: selected.type, text: String(reader.result || '') });
          if (parsed.ok) applyParsedFields(document, parsed.fields);
          showResult(document, parsed.ok
            ? { ok: true, warnings: parsed.warnings, message: `Lokale Datei gelesen: ${selected.name}. Bitte erkannte Felder prüfen.` }
            : parsed);
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

  return { FORMATS, preflightInvoice, generateInvoice, calculateTotals, escapeXml, getRequiredFields, convertForAgent, validationPlan, validateGeneratedArtifact, parseLocalDocument, markRequiredFields, initBrowser };
});
