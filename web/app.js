(function (root, factory) {
  let fieldCatalog = root.XRECHNUNG_FIELD_CATALOG;
  let agentFieldFillSchema = root.XINVOICE_AGENT_FIELD_FILL_SCHEMA;
  if (!fieldCatalog && typeof require === 'function') {
    try { fieldCatalog = require('./xrechnung-field-catalog.js'); } catch (error) { fieldCatalog = null; }
  }
  if (!agentFieldFillSchema && typeof require === 'function') {
    try { agentFieldFillSchema = require('./ai-agent-schema.js'); } catch (error) { agentFieldFillSchema = null; }
  }
  const api = factory(fieldCatalog, agentFieldFillSchema);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XInvoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (fieldCatalog, agentFieldFillSchema) {
  'use strict';

  const OFFICIAL_SOURCES = Object.freeze({
    xrechnungModel: 'KoSIT/IT-PLR XRechnung CIUS model, xrechnung-3.0.2-bundle-2026-01-31.zip, xrechnung-cius-model.xml',
    erechnungBund: 'e-rechnung-bund.de FAQ: § 5 E-RechV Mindestangaben, Leitweg-ID BT-10, Bankverbindung BG-17, Zahlungsbedingungen BT-9/BT-20, E-Mail BT-43, Lieferanten-/Bestellnummer falls übermittelt',
  });

  const FIELD_HELP = Object.freeze([
    { id: 'invoiceNumber', label: 'Rechnungsnummer', bt: 'BT-1', bg: 'INVOICE', requirementLevel: 'required', purpose: 'Eindeutige Identifikation der Rechnung im System des Verkäufers.', fillHelp: 'Trage die eigene Rechnungsnummer genau wie auf der sichtbaren Rechnung ein, z. B. RE-2025-0001 oder 2026-021.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'invoice.invoiceNumber' },
    { id: 'issueDate', label: 'Rechnungsdatum', bt: 'BT-2', bg: 'INVOICE', requirementLevel: 'required', purpose: 'Ausstellungsdatum der Rechnung.', fillHelp: 'Datum der Rechnung im Format JJJJ-MM-TT eintragen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'invoice.issueDate' },
    { id: 'invoiceTypeCode', label: 'Rechnungsart-Code', bt: 'BT-3', bg: 'INVOICE', requirementLevel: 'required', purpose: 'Kennzeichnet den Funktionstyp der Rechnung.', fillHelp: 'Meist 380 für normale Rechnung; 326 für Abschlags-/Anzahlungsrechnung; 381/384 für Gutschrift/Korrektur nur wenn fachlich richtig.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'invoice.invoiceTypeCode' },
    { id: 'currency', label: 'Währung', bt: 'BT-5', bg: 'INVOICE', requirementLevel: 'required', purpose: 'Währung, in der die Rechnungsbeträge angegeben sind.', fillHelp: 'ISO-Währungscode eintragen, in Deutschland normalerweise EUR.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'invoice.currency' },
    { id: 'dueDate', label: 'Fälligkeitsdatum', bt: 'BT-9', bg: 'INVOICE', requirementLevel: 'required', purpose: 'Fälligkeit des Rechnungsbetrags; nach E-RechV alternativ/zusätzlich Zahlungsbedingungen.', fillHelp: 'Datum eintragen, bis wann bezahlt werden soll. Wenn nur Text vorhanden ist, Zahlungsbedingungen zusätzlich ausfüllen.', officialSource: OFFICIAL_SOURCES.erechnungBund, role: 'invoice.dueDate' },
    { id: 'deliveryDate', label: 'Leistungs-/Lieferdatum', bt: 'BT-72', bg: 'BG-13', requirementLevel: 'recommended', purpose: 'Datum, an dem Lieferung oder Dienstleistung erbracht wurde.', fillHelp: 'Wenn auf der Rechnung vorhanden, Leistungsdatum oder Lieferdatum im Format JJJJ-MM-TT eintragen; nichts erfinden.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'delivery.actualDate' },
    { id: 'buyerReference', label: 'Leitweg-ID / BuyerReference', bt: 'BT-10', bg: 'INVOICE', requirementLevel: 'required', purpose: 'Lenkungs-/Routingkennzeichen des öffentlichen Auftraggebers.', fillHelp: 'Leitweg-ID genau vom Auftraggeber übernehmen. Nicht die Auftragsnummer einsetzen. Wenn sie fehlt, beim Empfänger erfragen.', officialSource: OFFICIAL_SOURCES.erechnungBund, role: 'invoice.buyerReference' },
    { id: 'orderNumber', label: 'Auftragsnummer / Bestellreferenz', bt: 'BT-13', bg: 'INVOICE', requirementLevel: 'required', purpose: 'Vom Erwerber ausgegebene Bestellung/Auftragsreferenz; bei Bundesrechnungen Pflicht, sofern übermittelt.', fillHelp: 'Bestellnummer, Auftragsnummer oder Purchase Order des Kunden eintragen, z. B. A-70764-708. Nicht mit der Leitweg-ID verwechseln.', officialSource: OFFICIAL_SOURCES.erechnungBund, role: 'invoice.orderNumber' },
    { id: 'paymentTerms', label: 'Zahlungsbedingungen', bt: 'BT-20', bg: 'INVOICE', requirementLevel: 'required', purpose: 'Textbeschreibung der Zahlungsbedingungen.', fillHelp: 'Zahlungsziel als Text eintragen, z. B. Zahlbar innerhalb von 14 Tagen ohne Abzug.', officialSource: OFFICIAL_SOURCES.erechnungBund, role: 'invoice.paymentTerms' },
    { id: 'paymentMeansTypeCode', label: 'Zahlungsart-Code', bt: 'BT-81', bg: 'BG-16', requirementLevel: 'required', purpose: 'Code des erwarteten Zahlungsmittels.', fillHelp: 'Für SEPA-/Banküberweisung normalerweise 58. Andere Codes nur verwenden, wenn die Zahlungsart wirklich anders ist.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'payment.meansTypeCode' },
    { id: 'paymentIban', label: 'IBAN', bt: 'BT-84', bg: 'BG-17', requirementLevel: 'required', purpose: 'Konto, auf das der Rechnungsbetrag überwiesen werden soll.', fillHelp: 'IBAN des Zahlungsempfängers ohne Tippfehler eintragen; im XML am besten ohne Leerzeichen.', officialSource: OFFICIAL_SOURCES.erechnungBund, role: 'payment.iban' },
    { id: 'paymentAccountName', label: 'Kontoinhaber', bt: 'BT-85', bg: 'BG-17', requirementLevel: 'recommended', purpose: 'Name des Kontos bzw. Kontoinhabers.', fillHelp: 'Kontoinhaber angeben, wenn bekannt; hilfreich für Prüfung und Zahlungsabgleich.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'payment.accountName' },
    { id: 'paymentServiceProviderId', label: 'BIC / Zahlungsdienstleister', bt: 'BT-86', bg: 'BG-17', requirementLevel: 'recommended', purpose: 'Kennung des kontoführenden Zahlungsdienstleisters.', fillHelp: 'BIC oder Zahlungsdienstleisterkennung eintragen, wenn vorhanden; bei SEPA oft aus IBAN ableitbar, aber für Menschen hilfreich.', officialSource: OFFICIAL_SOURCES.erechnungBund, role: 'payment.serviceProviderId' },
    { id: 'sellerName', label: 'Name des Rechnungsstellers', bt: 'BT-27', bg: 'BG-4', requirementLevel: 'required', purpose: 'Vollständiger rechtlicher Name des Verkäufers/Rechnungsstellers.', fillHelp: 'Firmenname oder Name exakt wie in der Rechnung bzw. Registrierung eintragen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.name' },
    { id: 'sellerStreet', label: 'Straße Rechnungssteller', bt: 'BT-35', bg: 'BG-5', requirementLevel: 'recommended', purpose: 'Hauptzeile der Verkäuferanschrift.', fillHelp: 'Straße und Hausnummer oder Postfach des Rechnungsstellers eintragen, wenn vorhanden.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.street' },
    { id: 'sellerPostalCode', label: 'PLZ Rechnungssteller', bt: 'BT-38', bg: 'BG-5', requirementLevel: 'required', purpose: 'Postleitzahl der Verkäuferanschrift.', fillHelp: 'Postleitzahl des Rechnungsstellers eintragen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.postalCode' },
    { id: 'sellerCity', label: 'Stadt Rechnungssteller', bt: 'BT-37', bg: 'BG-5', requirementLevel: 'required', purpose: 'Stadt/Gemeinde der Verkäuferanschrift.', fillHelp: 'Ort des Rechnungsstellers eintragen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.city' },
    { id: 'sellerCountry', label: 'Land Rechnungssteller', bt: 'BT-40', bg: 'BG-5', requirementLevel: 'required', purpose: 'ISO-Ländercode der Verkäuferanschrift.', fillHelp: 'Zweistelligen ISO-Code eintragen, z. B. DE für Deutschland.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.country' },
    { id: 'sellerVatId', label: 'USt-ID', bt: 'BT-31', bg: 'BG-4', requirementLevel: 'recommended', purpose: 'Umsatzsteuer-Identifikationsnummer des Verkäufers, falls vorhanden.', fillHelp: 'USt-IdNr. eintragen, falls vorhanden. Keine Steuernummer mit DE-Präfix erfinden.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.vatId' },
    { id: 'sellerIdentifier', label: 'Seller Identifier / Verkäuferkennung', bt: 'BT-29', bg: 'BG-4', requirementLevel: 'required', purpose: 'Vom Erwerber vergebene Lieferanten-/Kreditorennummer; bei Bundesrechnungen Pflicht, sofern übermittelt.', fillHelp: 'Lieferantennummer/Kreditorennummer des Auftraggebers eintragen. Wenn nicht übermittelt, als fehlend markieren statt erfinden.', officialSource: OFFICIAL_SOURCES.erechnungBund, role: 'seller.identifier' },
    { id: 'sellerEndpointId', label: 'Elektronische Adresse Rechnungssteller', bt: 'BT-34', bg: 'BG-4', requirementLevel: 'required', purpose: 'Elektronische Adresse des Verkäufers für technische Rückantworten.', fillHelp: 'Elektronische Adresse des Rechnungsstellers eintragen, z. B. E-Mail mit schemeID EM oder Peppol-ID mit passender schemeID.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.endpointId' },
    { id: 'sellerEndpointSchemeId', label: 'Endpoint schemeID Rechnungssteller', bt: 'BT-34', bg: 'BG-4', requirementLevel: 'recommended', purpose: 'Kennzeichnet das Identifikationsschema der elektronischen Adresse.', fillHelp: 'Für einfache E-Mail meist EM. Bei Peppol oder anderen IDs den passenden Scheme-Code verwenden.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.endpointSchemeId' },
    { id: 'sellerTelephone', label: 'Telefon des Rechnungsstellers', bt: 'BT-42', bg: 'BG-6', requirementLevel: 'required', purpose: 'Telefonnummer der Kontaktstelle des Verkäufers.', fillHelp: 'Telefonnummer für Rückfragen eintragen, inklusive Landesvorwahl wenn möglich.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'seller.telephone' },
    { id: 'sellerContactEmail', label: 'Kontakt-E-Mail Rechnungssteller', bt: 'BT-43', bg: 'BG-6', requirementLevel: 'required', purpose: 'E-Mail-Adresse der Kontaktstelle; nach E-RechV Mindestangabe für Bundesrechnungen.', fillHelp: 'Kontakt-E-Mail des Rechnungsstellers eintragen. Kann mit der Endpoint-ID identisch sein, bleibt aber fachlich das Kontaktfeld BT-43.', officialSource: OFFICIAL_SOURCES.erechnungBund, role: 'seller.contactEmail' },
    { id: 'buyerName', label: 'Name des Empfängers', bt: 'BT-44', bg: 'BG-7', requirementLevel: 'required', purpose: 'Vollständiger Name des Erwerbers/Rechnungsempfängers.', fillHelp: 'Name der Behörde, Firma oder Person eintragen, die die Rechnung erhält.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'buyer.name' },
    { id: 'buyerStreet', label: 'Straße Empfänger', bt: 'BT-50', bg: 'BG-8', requirementLevel: 'recommended', purpose: 'Hauptzeile der Erwerberanschrift.', fillHelp: 'Straße und Hausnummer oder Postfach des Empfängers eintragen, wenn vorhanden.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'buyer.street' },
    { id: 'buyerPostalCode', label: 'PLZ Empfänger', bt: 'BT-53', bg: 'BG-8', requirementLevel: 'required', purpose: 'Postleitzahl der Erwerberanschrift.', fillHelp: 'Postleitzahl des Empfängers eintragen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'buyer.postalCode' },
    { id: 'buyerCity', label: 'Stadt Empfänger', bt: 'BT-52', bg: 'BG-8', requirementLevel: 'required', purpose: 'Stadt/Gemeinde der Erwerberanschrift.', fillHelp: 'Ort des Rechnungsempfängers eintragen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'buyer.city' },
    { id: 'buyerCountry', label: 'Land Empfänger', bt: 'BT-55', bg: 'BG-8', requirementLevel: 'required', purpose: 'ISO-Ländercode der Erwerberanschrift.', fillHelp: 'Zweistelligen ISO-Code eintragen, z. B. DE für Deutschland.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'buyer.country' },
    { id: 'buyerEndpointId', label: 'Elektronische Adresse Empfänger', bt: 'BT-49', bg: 'BG-7', requirementLevel: 'required', purpose: 'Elektronische Adresse, an die die Rechnung gesendet werden sollte.', fillHelp: 'E-Mail, Peppol-ID oder anderes vom Empfänger genanntes elektronisches Adresskennzeichen eintragen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'buyer.endpointId' },
    { id: 'buyerEndpointSchemeId', label: 'Endpoint schemeID Empfänger', bt: 'BT-49', bg: 'BG-7', requirementLevel: 'recommended', purpose: 'Kennzeichnet das Identifikationsschema der Empfängeradresse.', fillHelp: 'Für einfache E-Mail meist EM. Bei Peppol oder Behördenplattformen den angegebenen Scheme-Code verwenden.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'buyer.endpointSchemeId' },
    { id: 'lineId', label: 'Positions-ID', bt: 'BT-126', bg: 'BG-25', requirementLevel: 'required', purpose: 'Eindeutige Kennung der Rechnungsposition.', fillHelp: 'Positionsnummer eintragen, z. B. 1. Bei mehreren Positionen eindeutig je Zeile.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'line.id' },
    { id: 'lineDescription', label: 'Beschreibung Position 1', bt: 'BT-153', bg: 'BG-31', requirementLevel: 'required', purpose: 'Name/Beschreibung der abgerechneten Ware oder Leistung.', fillHelp: 'Kurze, prüfbare Bezeichnung der Leistung/Ware eintragen; Details können aus der sichtbaren Rechnung übernommen werden.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'line.itemName' },
    { id: 'lineQuantity', label: 'Menge Position 1', bt: 'BT-129', bg: 'BG-25', requirementLevel: 'required', purpose: 'Abgerechnete Menge der Position.', fillHelp: 'Menge als Zahl eintragen, z. B. 1 oder 2.5.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'line.quantity' },
    { id: 'lineUnitCode', label: 'Einheit Position 1', bt: 'BT-130', bg: 'BG-25', requirementLevel: 'required', purpose: 'Einheitencode der Menge.', fillHelp: 'UN/ECE-Einheitencode eintragen, z. B. C62 für Stück oder HUR für Stunde.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'line.unitCode' },
    { id: 'lineNetPrice', label: 'Nettopreis Position 1', bt: 'BT-146', bg: 'BG-29', requirementLevel: 'required', purpose: 'Netto-Einzelpreis ohne Umsatzsteuer.', fillHelp: 'Netto-Einzelpreis mit Punkt oder Komma als Dezimaltrennzeichen eintragen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'line.netPrice' },
    { id: 'lineTaxPercent', label: 'MwSt % Position 1', bt: 'BT-152', bg: 'BG-30', requirementLevel: 'recommended', purpose: 'Umsatzsteuersatz der Position.', fillHelp: 'Steuersatz als Prozentzahl eintragen, z. B. 19 oder 7. Bei steuerfreiem Umsatz weitere Steuerfelder prüfen.', officialSource: OFFICIAL_SOURCES.xrechnungModel, role: 'line.taxPercent' },
  ]);

  const REQUIRED_FIELDS = FIELD_HELP
    .filter((field) => field.requirementLevel === 'required')
    .map((field) => ({ ...field, required: true }));

  const RECOMMENDED_FIELDS = FIELD_HELP
    .filter((field) => field.requirementLevel === 'recommended')
    .map((field) => ({ ...field, required: false }));

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

  const FORM_FIELD_BINDINGS = FIELD_HELP.map(({ id, bt, bg, role }) => ({ id, bt, bg, role }));

  function getCatalogTerm(id) {
    const catalog = getXRechnungFieldCatalog();
    return (catalog.terms || []).find((term) => term.id === id) || null;
  }

  function getFieldHelpInfo() {
    return FIELD_HELP.map((field) => ({ ...field, required: field.requirementLevel === 'required' }));
  }

  function getHelpForField(id) {
    return FIELD_HELP.find((field) => field.id === id) || null;
  }

  function getFormFieldBindings() {
    return FORM_FIELD_BINDINGS.map((binding) => {
      const term = getCatalogTerm(binding.bt);
      const group = binding.bg === 'INVOICE' ? { name: 'INVOICE' } : getCatalogTerm(binding.bg);
      const help = getHelpForField(binding.id) || {};
      return {
        ...binding,
        label: help.label || binding.id,
        catalogName: term?.name || binding.bt,
        datatype: term?.datatype || '',
        requiredInModel: Boolean(term?.required),
        requirementLevel: help.requirementLevel || (term?.required ? 'required' : 'optional'),
        purpose: help.purpose || term?.description || '',
        fillHelp: help.fillHelp || term?.description || '',
        officialSource: help.officialSource || OFFICIAL_SOURCES.xrechnungModel,
        groupName: group?.name || binding.bg,
      };
    });
  }

  function insertFieldInfoPopover(document, input, binding) {
    const label = input.closest?.('label');
    if (!label || label.querySelector?.('.field-info')) return false;
    const container = label.querySelector?.('.label-text') || label;
    const details = document.createElement('details');
    details.className = 'field-info';
    const summary = document.createElement('summary');
    summary.textContent = 'i';
    summary.setAttribute?.('aria-label', `Info zu ${binding.label}`);
    const body = document.createElement('div');
    body.className = 'field-info-body';
    body.textContent = `${binding.bt} ${binding.catalogName}. Zweck: ${binding.purpose} Ausfüllen: ${binding.fillHelp} Quelle: ${binding.officialSource}`;
    details.appendChild(summary);
    details.appendChild(body);
    container.appendChild(details);
    return true;
  }

  function applyXRechnungFieldMetadata(document) {
    let annotated = 0;
    let infoPopovers = 0;
    for (const binding of getFormFieldBindings()) {
      const input = document.getElementById(binding.id);
      if (!input) continue;
      input.dataset.bt = binding.bt;
      input.dataset.bg = binding.bg;
      input.dataset.xrechnungName = binding.catalogName;
      input.dataset.xrechnungGroup = binding.groupName;
      input.dataset.requirementLevel = binding.requirementLevel;
      input.dataset.purpose = binding.purpose;
      input.dataset.fillHelp = binding.fillHelp;
      input.dataset.officialSource = binding.officialSource;
      const title = `${binding.bt} ${binding.catalogName} · ${binding.bg} ${binding.groupName} · Ausfüllen: ${binding.fillHelp}`;
      input.setAttribute?.('title', title);
      input.setAttribute?.('aria-description', title);
      if (insertFieldInfoPopover(document, input, binding)) infoPopovers += 1;
      annotated += 1;
    }
    return { ok: true, annotated, infoPopovers };
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

  function getRecommendedFields() {
    return RECOMMENDED_FIELDS.map((field) => ({ ...field }));
  }

  function normalizeInvoice(invoice) {
    return {
      invoiceNumber: invoice?.invoiceNumber,
      issueDate: invoice?.issueDate,
      invoiceTypeCode: invoice?.invoiceTypeCode || '380',
      dueDate: invoice?.dueDate,
      deliveryDate: invoice?.deliveryDate,
      currency: invoice?.currency || 'EUR',
      buyerReference: invoice?.buyerReference,
      orderNumber: invoice?.orderNumber,
      seller: {
        ...(invoice?.seller || {}),
      },
      buyer: {
        ...(invoice?.buyer || {}),
      },
      paymentMeansTypeCode: invoice?.paymentMeansTypeCode || '58',
      paymentIban: invoice?.paymentIban,
      paymentAccountName: invoice?.paymentAccountName,
      paymentServiceProviderId: invoice?.paymentServiceProviderId,
      paymentTerms: invoice?.paymentTerms,
      lines: Array.isArray(invoice?.lines) ? invoice.lines.map((line, index) => ({ id: String(index + 1), ...(line || {}) })) : [],
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
    requireStringField(errors, invoice.invoiceTypeCode, 'Rechnungsart-Code');
    requireStringField(errors, invoice.currency, 'Währung');
    requireStringField(errors, invoice.dueDate, 'Fälligkeitsdatum');
    requireStringField(errors, invoice.buyerReference, 'Leitweg-ID / BuyerReference');
    requireStringField(errors, invoice.orderNumber, 'Auftragsnummer / Bestellreferenz');
    requireStringField(errors, invoice.seller?.name, 'Name des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.postalCode, 'PLZ Rechnungssteller');
    requireStringField(errors, invoice.seller?.city, 'Stadt Rechnungssteller');
    requireStringField(errors, invoice.seller?.country, 'Land Rechnungssteller');
    requireStringField(errors, invoice.seller?.endpointId, 'E-Mail-Adresse / elektronische Adresse des Rechnungsstellers / Endpoint-ID');
    requireStringField(errors, invoice.seller?.sellerIdentifier, 'Seller Identifier / Verkäuferkennung');
    requireStringField(errors, invoice.seller?.telephone, 'Telefon des Rechnungsstellers');
    requireStringField(errors, invoice.seller?.contactEmail || invoice.seller?.endpointId, 'Kontakt-E-Mail des Rechnungsstellers');
    requireStringField(errors, invoice.buyer?.name, 'Name des Empfängers');
    requireStringField(errors, invoice.buyer?.postalCode, 'PLZ Empfänger');
    requireStringField(errors, invoice.buyer?.city, 'Stadt Empfänger');
    requireStringField(errors, invoice.buyer?.country, 'Land Empfänger');
    requireStringField(errors, invoice.buyer?.endpointId, 'Elektronische Adresse des Empfängers / Endpoint-ID');
    requireStringField(errors, invoice.paymentMeansTypeCode, 'Zahlungsart-Code');
    requireStringField(errors, invoice.paymentIban, 'IBAN');
    requireStringField(errors, invoice.paymentTerms, 'Zahlungsbedingungen');

    if (!Array.isArray(invoice.lines) || invoice.lines.length === 0) {
      errors.push('Mindestens eine Rechnungsposition fehlt.');
    } else {
      invoice.lines.forEach((line, index) => {
        requireStringField(errors, line.id, `Positions-ID Position ${index + 1}`);
        requireStringField(errors, line.description, `Beschreibung Position ${index + 1}`);
        requireStringField(errors, line.quantity, `Menge Position ${index + 1}`);
        requireStringField(errors, line.unitCode, `Einheit Position ${index + 1}`);
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
      ${(party.endpointId || party.telephone || party.contactEmail) ? `<cac:Contact><cbc:Name>${escapeXml(party.name)}</cbc:Name>${party.telephone ? `<cbc:Telephone>${escapeXml(party.telephone)}</cbc:Telephone>` : ''}${(party.contactEmail || party.endpointId) ? `<cbc:ElectronicMail>${escapeXml(party.contactEmail || party.endpointId)}</cbc:ElectronicMail>` : ''}</cac:Contact>` : ''}
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
    <cbc:ID>${escapeXml(line.id || String(index + 1))}</cbc:ID>
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
  <cbc:InvoiceTypeCode>${escapeXml(invoice.invoiceTypeCode || '380')}</cbc:InvoiceTypeCode>
  <cbc:Note>${escapeXml(invoice.paymentTerms)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${escapeXml(currency)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escapeXml(invoice.buyerReference)}</cbc:BuyerReference>
  <cac:OrderReference><cbc:ID>${escapeXml(invoice.orderNumber)}</cbc:ID></cac:OrderReference>
  <cac:AccountingSupplierParty>${partyUblXml(invoice.seller)}
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${partyUblXml(invoice.buyer)}
  </cac:AccountingCustomerParty>${invoice.deliveryDate ? `
  <cac:Delivery><cbc:ActualDeliveryDate>${escapeXml(invoice.deliveryDate)}</cbc:ActualDeliveryDate></cac:Delivery>` : ''}
  <cac:PaymentMeans><cbc:PaymentMeansCode>${escapeXml(invoice.paymentMeansTypeCode || '58')}</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>${escapeXml(invoice.paymentIban)}</cbc:ID>${invoice.paymentAccountName ? `<cbc:Name>${escapeXml(invoice.paymentAccountName)}</cbc:Name>` : ''}${invoice.paymentServiceProviderId ? `<cac:FinancialInstitutionBranch><cbc:ID>${escapeXml(invoice.paymentServiceProviderId)}</cbc:ID></cac:FinancialInstitutionBranch>` : ''}</cac:PayeeFinancialAccount></cac:PaymentMeans>
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
        <ram:AssociatedDocumentLineDocument><ram:LineID>${escapeXml(line.id || String(index + 1))}</ram:LineID></ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct><ram:Name>${escapeXml(line.description)}</ram:Name></ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${formatMoney(decimal(line.netPrice))}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${escapeXml(line.unitCode || 'C62')}">${escapeXml(line.quantity)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${escapeXml(line.taxCategory || 'S')}</ram:CategoryCode><ram:RateApplicablePercent>${formatMoney(decimal(line.taxPercent, 19))}</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${formatMoney(lineAmount)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext><ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${guideline}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument><ram:ID>${escapeXml(invoice.invoiceNumber)}</ram:ID><ram:TypeCode>${escapeXml(invoice.invoiceTypeCode || '380')}</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${escapeXml(invoice.issueDate.replaceAll('-', ''))}</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lineXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${escapeXml(invoice.buyerReference)}</ram:BuyerReference>
      <ram:SellerTradeParty><ram:ID>${escapeXml(invoice.seller.sellerIdentifier)}</ram:ID><ram:Name>${escapeXml(invoice.seller.name)}</ram:Name><ram:DefinedTradeContact><ram:PersonName>${escapeXml(invoice.seller.name)}</ram:PersonName><ram:TelephoneUniversalCommunication><ram:CompleteNumber>${escapeXml(invoice.seller.telephone)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication><ram:EmailURIUniversalCommunication><ram:URIID>${escapeXml(invoice.seller.contactEmail || invoice.seller.endpointId)}</ram:URIID></ram:EmailURIUniversalCommunication></ram:DefinedTradeContact><ram:PostalTradeAddress><ram:PostcodeCode>${escapeXml(invoice.seller.postalCode)}</ram:PostcodeCode><ram:LineOne>${escapeXml(invoice.seller.street)}</ram:LineOne><ram:CityName>${escapeXml(invoice.seller.city)}</ram:CityName><ram:CountryID>${escapeXml(invoice.seller.country || 'DE')}</ram:CountryID></ram:PostalTradeAddress><ram:URIUniversalCommunication><ram:URIID schemeID="${escapeXml(invoice.seller.endpointSchemeId || 'EM')}">${escapeXml(invoice.seller.endpointId)}</ram:URIID></ram:URIUniversalCommunication>${invoice.seller.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(invoice.seller.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}</ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>${escapeXml(invoice.buyer.name)}</ram:Name><ram:PostalTradeAddress><ram:PostcodeCode>${escapeXml(invoice.buyer.postalCode)}</ram:PostcodeCode><ram:LineOne>${escapeXml(invoice.buyer.street)}</ram:LineOne><ram:CityName>${escapeXml(invoice.buyer.city)}</ram:CityName><ram:CountryID>${escapeXml(invoice.buyer.country || 'DE')}</ram:CountryID></ram:PostalTradeAddress>${invoice.buyer.endpointId ? `<ram:URIUniversalCommunication><ram:URIID schemeID="${escapeXml(invoice.buyer.endpointSchemeId || 'EM')}">${escapeXml(invoice.buyer.endpointId)}</ram:URIID></ram:URIUniversalCommunication>` : ''}</ram:BuyerTradeParty>
      <ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${escapeXml(invoice.orderNumber)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>${invoice.deliveryDate ? `<ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${escapeXml(invoice.deliveryDate.replaceAll('-', ''))}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>` : ''}</ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${escapeXml(currency)}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>${escapeXml(invoice.paymentMeansTypeCode || '58')}</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${escapeXml(invoice.paymentIban)}</ram:IBANID>${invoice.paymentAccountName ? `<ram:AccountName>${escapeXml(invoice.paymentAccountName)}</ram:AccountName>` : ''}</ram:PayeePartyCreditorFinancialAccount>${invoice.paymentServiceProviderId ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${escapeXml(invoice.paymentServiceProviderId)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}</ram:SpecifiedTradeSettlementPaymentMeans>
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
      invoicetypecode: 'invoiceTypeCode', rechnungsartcode: 'invoiceTypeCode', typecode: 'invoiceTypeCode',
      duedate: 'dueDate', faelligkeitsdatum: 'dueDate', fälligkeitsdatum: 'dueDate',
      deliverydate: 'deliveryDate', leistungsdatum: 'deliveryDate', lieferdatum: 'deliveryDate',
      currency: 'currency', waehrung: 'currency', währung: 'currency',
      buyerreference: 'buyerReference', leitwegid: 'buyerReference', leitweg: 'buyerReference',
      buyerreferencebt10: 'buyerReference',
      ordernumber: 'orderNumber', auftragsnummer: 'orderNumber', bestellreferenz: 'orderNumber', bestellnummer: 'orderNumber',
      paymentmeanstypecode: 'paymentMeansTypeCode', zahlungsartcode: 'paymentMeansTypeCode',
      paymentiban: 'paymentIban', iban: 'paymentIban',
      paymentaccountname: 'paymentAccountName', kontoinhaber: 'paymentAccountName',
      paymentserviceproviderid: 'paymentServiceProviderId', bic: 'paymentServiceProviderId', bankkennung: 'paymentServiceProviderId',
      paymentterms: 'paymentTerms', zahlungsbedingungen: 'paymentTerms',
      sellername: 'sellerName', rechnungssteller: 'sellerName',
      sellerendpointid: 'sellerEndpointId', selleremail: 'sellerContactEmail', email: 'sellerContactEmail',
      sellercontactemail: 'sellerContactEmail', kontaktemail: 'sellerContactEmail',
      selleridentifier: 'sellerIdentifier', verkaeuferkennung: 'sellerIdentifier', verkäuferkennung: 'sellerIdentifier', lieferantennummer: 'sellerIdentifier',
      sellertelephone: 'sellerTelephone', telefon: 'sellerTelephone', telephone: 'sellerTelephone', phone: 'sellerTelephone',
      buyername: 'buyerName', empfaenger: 'buyerName', empfänger: 'buyerName',
      buyerendpointid: 'buyerEndpointId', empfaengerendpoint: 'buyerEndpointId', empfängerendpoint: 'buyerEndpointId',
      lineid: 'lineId', positionsid: 'lineId', positionsnummer: 'lineId',
      linedescription: 'lineDescription', beschreibung: 'lineDescription',
      linequantity: 'lineQuantity', menge: 'lineQuantity',
      lineunitcode: 'lineUnitCode', einheit: 'lineUnitCode', einheitencode: 'lineUnitCode',
      linenetprice: 'lineNetPrice', nettopreis: 'lineNetPrice',
    };
    return aliases[normalized];
  }

  function parseTextFields(text) {
    const fields = {};
    const patterns = [
      ['invoiceNumber', /(?:Rechnungsnummer|Invoice\s*Number)\s*[:#-]\s*([^\n\r]+)/i],
      ['invoiceTypeCode', /(?:Rechnungsart\s*Code|Invoice\s*Type\s*Code|TypeCode)\s*[:#-]\s*([^\n\r]+)/i],
      ['issueDate', /(?:Rechnungsdatum|Issue\s*Date)\s*[:#-]\s*([^\n\r]+)/i],
      ['dueDate', /(?:Fälligkeitsdatum|Faelligkeitsdatum|Due\s*Date)\s*[:#-]\s*([^\n\r]+)/i],
      ['deliveryDate', /(?:Leistungsdatum|Lieferdatum|Delivery\s*Date)\s*[:#-]\s*([^\n\r]+)/i],
      ['currency', /(?:Währung|Waehrung|Currency)\s*[:#-]\s*([^\n\r]+)/i],
      ['buyerReference', /(?:Leitweg-ID|Buyer\s*Reference|Leitweg)\s*[:#-]\s*([^\n\r]+)/i],
      ['orderNumber', /(?:Auftragsnummer|Bestellnummer|Bestellreferenz|Order\s*Number|Purchase\s*Order)\s*[:#-]\s*([^\n\r]+)/i],
      ['paymentMeansTypeCode', /(?:Zahlungsart\s*Code|Payment\s*Means\s*Type\s*Code)\s*[:#-]\s*([^\n\r]+)/i],
      ['paymentIban', /(?:IBAN)\s*[:#-]\s*([^\n\r]+)/i],
      ['paymentAccountName', /(?:Kontoinhaber|Payment\s*Account\s*Name)\s*[:#-]\s*([^\n\r]+)/i],
      ['paymentServiceProviderId', /(?:BIC|Zahlungsdienstleister|Payment\s*Service\s*Provider)\s*[:#-]\s*([^\n\r]+)/i],
      ['paymentTerms', /(?:Zahlungsbedingungen|Payment\s*Terms)\s*[:#-]\s*([^\n\r]+)/i],
      ['sellerEndpointId', /(?:Endpoint-ID|Seller\s*Endpoint)\s*[:#-]\s*([^\n\r]+)/i],
      ['sellerContactEmail', /(?:Kontakt-E-Mail|E-Mail|Email|Seller\s*Contact\s*Email)\s*[:#-]\s*([^\n\r]+)/i],
      ['sellerTelephone', /(?:Telefon|Telephone|Phone)\s*[:#-]\s*([^\n\r]+)/i],
      ['buyerEndpointId', /(?:Empfänger\s*Endpoint|Buyer\s*Endpoint)\s*[:#-]\s*([^\n\r]+)/i],
      ['lineId', /(?:Positionsnummer|Positions-ID|Line\s*ID)\s*[:#-]\s*([^\n\r]+)/i],
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
    const supplierParty = section('AccountingSupplierParty') || section('SellerTradeParty');
    const customerParty = section('AccountingCustomerParty') || section('BuyerTradeParty');
    const supplierPostal = section('PostalAddress', supplierParty) || section('PostalTradeAddress', supplierParty);
    const customerPostal = section('PostalAddress', customerParty) || section('PostalTradeAddress', customerParty);
    const supplierContact = section('Contact', supplierParty) || section('DefinedTradeContact', supplierParty);
    const firstUblLine = section('InvoiceLine') || section('CreditNoteLine');
    const firstCiiLine = section('IncludedSupplyChainTradeLineItem');
    const firstLine = firstUblLine || firstCiiLine;

    const paymentMeans = section('PaymentMeans') || section('SpecifiedTradeSettlementPaymentMeans');
    const payeeAccount = section('PayeeFinancialAccount', paymentMeans) || section('PayeePartyCreditorFinancialAccount', paymentMeans);
    const financialInstitution = section('FinancialInstitutionBranch', paymentMeans) || section('PayeeSpecifiedCreditorFinancialInstitution', paymentMeans);

    assign('invoiceNumber', valueOf('ID', exchangedDocument) || firstOf('ID', 'InvoiceNumber'));
    assign('invoiceTypeCode', valueOf('InvoiceTypeCode') || valueOf('TypeCode', exchangedDocument));
    assign('issueDate', dateFromXml(firstOf('IssueDate', 'DateTimeString')));
    assign('dueDate', dateFromXml(firstOf('DueDate')));
    assign('deliveryDate', dateFromXml(valueOf('ActualDeliveryDate') || valueOf('DateTimeString', section('ActualDeliverySupplyChainEvent'))));
    assign('currency', firstOf('DocumentCurrencyCode', 'InvoiceCurrencyCode'));
    assign('buyerReference', firstOf('BuyerReference', 'BuyerReferenceBT10'));
    assign('orderNumber', valueOf('ID', section('OrderReference')) || valueOf('IssuerAssignedID', section('BuyerOrderReferencedDocument')));
    assign('paymentMeansTypeCode', valueOf('PaymentMeansCode', paymentMeans) || valueOf('TypeCode', paymentMeans));
    assign('paymentIban', firstOf('IBANID', 'IBAN', 'PayeeAccountID') || valueOf('ID', payeeAccount));
    assign('paymentAccountName', valueOf('Name', payeeAccount) || valueOf('AccountName', payeeAccount));
    assign('paymentServiceProviderId', valueOf('ID', financialInstitution) || valueOf('BICID', financialInstitution));
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
    assign('sellerContactEmail', valueOf('ElectronicMail', supplierContact) || valueOf('URIID', section('EmailURIUniversalCommunication', supplierContact)) || valueOf('URIID', section('EmailURIUniversalCommunication', supplierParty)) || fields.sellerEndpointId);

    assign('buyerName', valueOf('Name', customerParty));
    assign('buyerStreet', valueOf('StreetName', customerPostal) || valueOf('LineOne', customerPostal));
    assign('buyerPostalCode', valueOf('PostalZone', customerPostal) || valueOf('PostcodeCode', customerPostal));
    assign('buyerCity', valueOf('CityName', customerPostal));
    assign('buyerCountry', valueOf('IdentificationCode', section('Country', customerPostal)) || valueOf('CountryID', customerPostal));
    assign('buyerEndpointId', valueOf('EndpointID', customerParty) || valueOf('URIID', section('URIUniversalCommunication', customerParty)));
    assign('buyerEndpointSchemeId', attrOf('EndpointID', 'schemeID', customerParty) || attrOf('URIID', 'schemeID', section('URIUniversalCommunication', customerParty)));

    assign('lineId', valueOf('ID', section('InvoiceLine')) || valueOf('LineID', section('AssociatedDocumentLineDocument', firstLine)));
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
        pattern: 'PDF24/invoice-converter-style upload-extract-review-export funnel, implemented local-first without cloud AI or uploads',
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

  function validateXRechnungInBrowser(xml, options = {}) {
    const content = String(xml || '');
    const formatId = options.formatId || (/<rsm:CrossIndustryInvoice\b|<CrossIndustryInvoice\b/i.test(content) ? 'xrechnung-cii' : 'xrechnung-ubl');
    const checks = [];
    const errors = [];
    function check(name, condition, message) {
      const ok = Boolean(condition);
      checks.push({ name, ok });
      if (!ok) errors.push(message);
    }
    check('well-formed-ish XML', /^\s*</.test(content) && !/<script[\s>]/i.test(content), 'XML ist leer, kein XML oder enthält Script-Markup.');
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
    const assignments = Object.fromEntries(FIELD_HELP.map((field) => [field.id, field.id]));
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
      .filter((id) => !String(document.getElementById(id)?.value || '').trim());
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
    invoice = normalizeInvoice(invoice);
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

  const AGENT_FIELD_FILL_SCHEMA = agentFieldFillSchema || {
    version: '2026-05-18',
    task: 'fill_xrechnung_invoice_fields',
    locale: 'de-DE',
    connectionPolicy: {
      noApiKeyInBrowser: true,
      secretsInFrontend: false,
      allowedModes: ['hermes-copy-paste', 'local-hermes-bridge', 'secure-inbox-outbox'],
      forbiddenModes: ['browser-byok', 'direct-cloud-api-key', 'frontend-bearer-token'],
    },
    securityRules: ['no-api-key-in-browser', 'do-not-invent-values', 'return-only-json', 'source-required-per-field', 'confidence-required-per-field', 'human-review-required'],
    responseContract: { fieldObjectRequiredKeys: ['value', 'confidence', 'source', 'reviewRequired'] },
  };

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getAgentFieldFillSchema() {
    return cloneJson(AGENT_FIELD_FILL_SCHEMA);
  }

  function agentFieldCatalogForRequest() {
    const requiredById = new Set(REQUIRED_FIELDS.map((field) => field.id));
    return getFormFieldBindings().map((field) => ({
      id: field.id,
      label: field.catalogName || field.label || field.id,
      bt: field.bt,
      bg: field.bg,
      groupName: field.groupName,
      required: requiredById.has(field.id),
      requirementLevel: field.requirementLevel,
      purpose: field.purpose,
      fillHelp: field.fillHelp,
      officialSource: field.officialSource,
    }));
  }

  function buildAgentFieldFillRequest(options = {}) {
    const schema = getAgentFieldFillSchema();
    const transport = String(options.transport || 'hermes-copy-paste');
    if (!schema.connectionPolicy.allowedModes.includes(transport)) {
      const isBrowserKeyMode = /byok|api-key|bearer|cloud/i.test(transport);
      return {
        ok: false,
        errors: [isBrowserKeyMode
          ? 'API-Key im Browser ist für diese App verboten. Nutze hermes-copy-paste, local-hermes-bridge oder secure-inbox-outbox.'
          : `Nicht erlaubter Agent-Transport: ${transport}`],
      };
    }
    const targetFormat = options.targetFormat || 'xrechnung-ubl';
    if (!FORMATS[targetFormat]) return { ok: false, errors: [`Unbekanntes Zielformat: ${targetFormat}`] };
    const payload = {
      task: schema.task,
      version: schema.version,
      locale: options.locale || schema.locale || 'de-DE',
      targetFormat,
      documentKind: options.documentKind || 'manual',
      transport,
      sourceText: String(options.sourceText || ''),
      existingFields: options.existingFields && typeof options.existingFields === 'object' ? cloneJson(options.existingFields) : {},
      requiredFields: getRequiredFields(targetFormat).map((field) => ({ id: field.id, label: field.label, bt: field.bt, required: true, purpose: field.purpose, fillHelp: field.fillHelp, officialSource: field.officialSource })),
      recommendedFields: getRecommendedFields(targetFormat).map((field) => ({ id: field.id, label: field.label, bt: field.bt, required: false, purpose: field.purpose, fillHelp: field.fillHelp, officialSource: field.officialSource })),
      fieldCatalog: agentFieldCatalogForRequest(),
      rules: {
        doNotInvent: true,
        returnOnlyJson: true,
        humanReviewRequired: true,
        markUncertainFields: true,
        sourceRequiredPerField: true,
        confidenceRequiredPerField: true,
      },
      connectionPolicy: schema.connectionPolicy,
      responseContract: schema.responseContract,
    };
    return { ok: true, errors: [], payload };
  }

  function validateAgentFieldFillResponse(response) {
    const errors = [];
    const normalized = { ok: Boolean(response?.ok), fields: {}, missingRequired: [], warnings: [], cannotDetermine: [] };
    if (!response || typeof response !== 'object') return { ok: false, errors: ['Agent-Antwort muss ein JSON-Objekt sein.'] };
    if (response.ok !== true) errors.push('Agent-Antwort muss ok=true setzen, wenn Felder vorgeschlagen werden.');
    if (!response.fields || typeof response.fields !== 'object' || Array.isArray(response.fields)) {
      errors.push('Agent-Antwort braucht fields als Objekt.');
    } else {
      for (const [field, candidate] of Object.entries(response.fields)) {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
          errors.push(`${field}: Feldvorschlag muss ein Objekt sein.`);
          continue;
        }
        const value = candidate.value == null ? '' : String(candidate.value).trim();
        const source = candidate.source == null ? '' : String(candidate.source).trim();
        const confidence = Number(candidate.confidence);
        if (!value) errors.push(`${field}: value fehlt.`);
        if (!source) errors.push(`${field}: source fehlt.`);
        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) errors.push(`${field}: confidence muss Zahl zwischen 0 und 1 sein.`);
        if (typeof candidate.reviewRequired !== 'boolean') errors.push(`${field}: reviewRequired muss boolean sein.`);
        if (value && source && Number.isFinite(confidence) && typeof candidate.reviewRequired === 'boolean') {
          normalized.fields[field] = { value, confidence, source, reviewRequired: candidate.reviewRequired };
        }
      }
    }
    normalized.missingRequired = Array.isArray(response.missingRequired) ? response.missingRequired.map(String) : [];
    normalized.warnings = Array.isArray(response.warnings) ? response.warnings.map(String) : [];
    normalized.cannotDetermine = Array.isArray(response.cannotDetermine)
      ? response.cannotDetermine.map((entry) => ({ field: String(entry?.field || ''), reason: String(entry?.reason || '') })).filter((entry) => entry.field && entry.reason)
      : [];
    return { ok: errors.length === 0, errors, normalized };
  }

  function buildHermesFieldFillPrompt(payload) {
    const promptPayload = cloneJson(payload || {});
    if (promptPayload.connectionPolicy) delete promptPayload.connectionPolicy.forbiddenModes;
    return [
      'Hermes Aufgabe: Fülle fehlende E-Rechnung/XRechnung-Felder als prüfbare Vorschläge.',
      '',
      'Gib ausschließlich JSON zurück. Kein Markdown, keine Erklärung außerhalb des JSON.',
      'Erfinde keine Werte. Wenn ein Feld nicht aus der Quelle bestimmbar ist, nutze cannotDetermine.',
      'Jeder Feldvorschlag braucht value, source, confidence (0..1) und reviewRequired.',
      '',
      'REQUEST_JSON:',
      JSON.stringify(promptPayload, null, 2),
      '',
      'RESPONSE_JSON_SCHEMA:',
      JSON.stringify(getAgentFieldFillSchema().responseContract, null, 2),
    ].join('\n');
  }

  function importAgentFieldFillResponse(document, response) {
    const validation = validateAgentFieldFillResponse(response);
    if (!validation.ok) return { ok: false, errors: validation.errors, validation };
    const fields = {};
    const fieldSources = {};
    for (const [field, candidate] of Object.entries(validation.normalized.fields)) {
      fields[field] = candidate.value;
      fieldSources[field] = `Hermes: ${candidate.source} (Confidence ${Math.round(candidate.confidence * 100)}%)`;
    }
    const report = applyParsedFields(document, fields, fieldSources);
    report.missingRequired = Array.from(new Set([...(report.missingRequired || []), ...validation.normalized.missingRequired]));
    return { ok: true, errors: [], validation, report };
  }

  function collectInvoiceFromDom(document) {
    const value = (id) => document.getElementById(id)?.value?.trim() || '';
    return {
      invoiceNumber: value('invoiceNumber'),
      issueDate: value('issueDate'),
      invoiceTypeCode: value('invoiceTypeCode') || '380',
      dueDate: value('dueDate'),
      deliveryDate: value('deliveryDate'),
      currency: value('currency') || 'EUR',
      buyerReference: value('buyerReference'),
      orderNumber: value('orderNumber'),
      seller: {
        name: value('sellerName'), street: value('sellerStreet'), postalCode: value('sellerPostalCode'), city: value('sellerCity'), country: value('sellerCountry') || 'DE', vatId: value('sellerVatId'), endpointId: value('sellerEndpointId'), endpointSchemeId: value('sellerEndpointSchemeId') || 'EM', sellerIdentifier: value('sellerIdentifier'), telephone: value('sellerTelephone'), contactEmail: value('sellerContactEmail') || value('sellerEndpointId'),
      },
      buyer: {
        name: value('buyerName'), street: value('buyerStreet'), postalCode: value('buyerPostalCode'), city: value('buyerCity'), country: value('buyerCountry') || 'DE', endpointId: value('buyerEndpointId'), endpointSchemeId: value('buyerEndpointSchemeId') || 'EM',
      },
      paymentMeansTypeCode: value('paymentMeansTypeCode') || '58',
      paymentIban: value('paymentIban'),
      paymentAccountName: value('paymentAccountName'),
      paymentServiceProviderId: value('paymentServiceProviderId'),
      paymentTerms: value('paymentTerms'),
      lines: [{ id: value('lineId') || '1', description: value('lineDescription'), quantity: value('lineQuantity'), unitCode: value('lineUnitCode') || 'C62', netPrice: value('lineNetPrice'), taxCategory: 'S', taxPercent: value('lineTaxPercent') || '19' }],
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

    const promptButton = document.getElementById('copyHermesPrompt');
    const promptBox = document.getElementById('agentPrompt');
    const responseBox = document.getElementById('agentResponseJson');
    const importButton = document.getElementById('importAgentResponse');
    if (promptButton && promptBox) {
      promptButton.addEventListener('click', () => {
        const request = buildAgentFieldFillRequest({
          targetFormat: formatSelect.value,
          documentKind: 'manual',
          sourceText: '',
          existingFields: collectInvoiceFromDom(document),
          transport: 'hermes-copy-paste',
        });
        if (!request.ok) {
          showResult(document, request);
          return;
        }
        promptBox.value = buildHermesFieldFillPrompt(request.payload);
        showResult(document, { ok: true, message: 'Hermes Prompt erzeugt. An Hermes senden und JSON-Antwort unten importieren.' });
      });
    }
    if (importButton && responseBox) {
      importButton.addEventListener('click', () => {
        let parsed;
        try { parsed = JSON.parse(responseBox.value || '{}'); }
        catch (error) {
          showResult(document, { ok: false, errors: [`Hermes JSON-Antwort konnte nicht gelesen werden: ${error.message}`] });
          return;
        }
        const imported = importAgentFieldFillResponse(document, parsed);
        showResult(document, imported.ok
          ? { ok: true, warnings: imported.validation.normalized.warnings, message: `Hermes Vorschläge importiert: ${imported.report.filled.length} Felder; ${imported.report.missingRequired.length} Pflichtfelder offen.` }
          : imported);
      });
    }

    if (sourceFile) {
      sourceFile.addEventListener('change', () => {
        const selected = sourceFile.files && sourceFile.files[0];
        if (!selected) return;
        const ext = extensionFromName(selected.name);
        const handleParsed = (parsed) => {
          if (parsed.ok) applyParsedFields(document, parsed.fields, parsed.fieldSources || {});
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

  return { FORMATS, preflightInvoice, generateInvoice, calculateTotals, escapeXml, getRequiredFields, getRecommendedFields, getFieldHelpInfo, getXRechnungFieldCatalog, getAdvancedFieldGroups, getFormFieldBindings, applyXRechnungFieldMetadata, applyParsedFields, convertForAgent, getAgentFieldFillSchema, buildAgentFieldFillRequest, validateAgentFieldFillResponse, buildHermesFieldFillPrompt, importAgentFieldFillResponse, validationPlan, validateGeneratedArtifact, validateXRechnungInBrowser, getBrowserValidationStrategy, parseLocalDocument, registerLocalExtractor, getBrowserExecutionModel, markRequiredFields, initBrowser };
});
