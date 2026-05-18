from __future__ import annotations

from decimal import Decimal
import xml.etree.ElementTree as ET
from xml.dom import minidom

from .canonical import Invoice, Party, money

INV_NS = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
CAC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
CBC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

ET.register_namespace("", INV_NS)
ET.register_namespace("cac", CAC_NS)
ET.register_namespace("cbc", CBC_NS)


def cbc(name: str) -> str:
    return f"{{{CBC_NS}}}{name}"


def cac(name: str) -> str:
    return f"{{{CAC_NS}}}{name}"


def fmt_amount(value: Decimal) -> str:
    return f"{money(value):.2f}"


def _sub(parent: ET.Element, tag: str, text: str | None = None, **attrs: str) -> ET.Element:
    child = ET.SubElement(parent, tag, attrs)
    if text is not None:
        child.text = text
    return child


def _party(parent: ET.Element, party: Party) -> None:
    party_el = _sub(parent, cac("Party"))
    if party.endpoint_id:
        _sub(party_el, cbc("EndpointID"), party.endpoint_id, schemeID=party.endpoint_scheme_id)
    name = _sub(party_el, cac("PartyName"))
    _sub(name, cbc("Name"), party.name)
    address = _sub(party_el, cac("PostalAddress"))
    if party.street:
        _sub(address, cbc("StreetName"), party.street)
    if party.city:
        _sub(address, cbc("CityName"), party.city)
    if party.postal_code:
        _sub(address, cbc("PostalZone"), party.postal_code)
    country = _sub(address, cac("Country"))
    _sub(country, cbc("IdentificationCode"), party.country)
    if party.vat_id:
        party_tax = _sub(party_el, cac("PartyTaxScheme"))
        _sub(party_tax, cbc("CompanyID"), party.vat_id)
        tax_scheme = _sub(party_tax, cac("TaxScheme"))
        _sub(tax_scheme, cbc("ID"), "VAT")
    legal = _sub(party_el, cac("PartyLegalEntity"))
    _sub(legal, cbc("RegistrationName"), party.name)
    if party.endpoint_id:
        contact = _sub(party_el, cac("Contact"))
        _sub(contact, cbc("Name"), party.name)
        if party.telephone:
            _sub(contact, cbc("Telephone"), party.telephone)
        _sub(contact, cbc("ElectronicMail"), party.endpoint_id)


def invoice_to_ubl_xml(invoice: Invoice) -> str:
    root = ET.Element(f"{{{INV_NS}}}Invoice")
    _sub(root, cbc("CustomizationID"), "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0")
    _sub(root, cbc("ProfileID"), "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0")
    _sub(root, cbc("ID"), invoice.invoice_number)
    _sub(root, cbc("IssueDate"), invoice.issue_date)
    _sub(root, cbc("DueDate"), invoice.due_date)
    _sub(root, cbc("InvoiceTypeCode"), "380")
    if invoice.note:
        _sub(root, cbc("Note"), invoice.note)
    _sub(root, cbc("DocumentCurrencyCode"), invoice.currency)
    _sub(root, cbc("BuyerReference"), invoice.buyer_reference)

    supplier = _sub(root, cac("AccountingSupplierParty"))
    _party(supplier, invoice.seller)
    customer = _sub(root, cac("AccountingCustomerParty"))
    _party(customer, invoice.buyer)

    if invoice.payment_iban:
        payment = _sub(root, cac("PaymentMeans"))
        _sub(payment, cbc("PaymentMeansCode"), "58")
        account = _sub(payment, cac("PayeeFinancialAccount"))
        _sub(account, cbc("ID"), invoice.payment_iban)

    tax_total = _sub(root, cac("TaxTotal"))
    _sub(tax_total, cbc("TaxAmount"), fmt_amount(invoice.tax_amount), currencyID=invoice.currency)
    for tax_category, taxable, tax in invoice.tax_groups():
        subtotal = _sub(tax_total, cac("TaxSubtotal"))
        _sub(subtotal, cbc("TaxableAmount"), fmt_amount(taxable), currencyID=invoice.currency)
        _sub(subtotal, cbc("TaxAmount"), fmt_amount(tax), currencyID=invoice.currency)
        category = _sub(subtotal, cac("TaxCategory"))
        _sub(category, cbc("ID"), tax_category.category_id)
        _sub(category, cbc("Percent"), fmt_amount(tax_category.percent))
        scheme = _sub(category, cac("TaxScheme"))
        _sub(scheme, cbc("ID"), "VAT")

    totals = _sub(root, cac("LegalMonetaryTotal"))
    _sub(totals, cbc("LineExtensionAmount"), fmt_amount(invoice.tax_exclusive_amount), currencyID=invoice.currency)
    _sub(totals, cbc("TaxExclusiveAmount"), fmt_amount(invoice.tax_exclusive_amount), currencyID=invoice.currency)
    _sub(totals, cbc("TaxInclusiveAmount"), fmt_amount(invoice.tax_inclusive_amount), currencyID=invoice.currency)
    _sub(totals, cbc("PayableAmount"), fmt_amount(invoice.payable_amount), currencyID=invoice.currency)

    for idx, line in enumerate(invoice.lines, start=1):
        line_el = _sub(root, cac("InvoiceLine"))
        _sub(line_el, cbc("ID"), str(idx))
        _sub(line_el, cbc("InvoicedQuantity"), str(line.quantity), unitCode=line.unit_code)
        _sub(line_el, cbc("LineExtensionAmount"), fmt_amount(line.net_amount), currencyID=invoice.currency)
        item = _sub(line_el, cac("Item"))
        _sub(item, cbc("Name"), line.description)
        classified = _sub(item, cac("ClassifiedTaxCategory"))
        _sub(classified, cbc("ID"), line.tax.category_id)
        _sub(classified, cbc("Percent"), fmt_amount(line.tax.percent))
        scheme = _sub(classified, cac("TaxScheme"))
        _sub(scheme, cbc("ID"), "VAT")
        price = _sub(line_el, cac("Price"))
        _sub(price, cbc("PriceAmount"), fmt_amount(line.net_price), currencyID=invoice.currency)

    rough = ET.tostring(root, encoding="utf-8")
    return minidom.parseString(rough).toprettyxml(indent="  ", encoding="utf-8").decode("utf-8")
