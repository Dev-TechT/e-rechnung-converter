from decimal import Decimal
import xml.etree.ElementTree as ET

from xrechnung_converter.canonical import Invoice, InvoiceLine, Party, TaxCategory
from xrechnung_converter.ubl import invoice_to_ubl_xml


def test_xrechnung_ubl_contains_seller_contact_for_kosit_bg6():
    invoice = Invoice(
        invoice_number="RE-2026-0002",
        issue_date="2026-05-18",
        due_date="2026-06-01",
        currency="EUR",
        buyer_reference="DEMO-LEITWEG-ID",
        seller=Party(
            name="Demo Lieferant GmbH",
            street="Hauptstr. 1",
            city="Berlin",
            postal_code="10115",
            country="DE",
            vat_id="DE123456789",
            endpoint_id="seller@example.invalid",
            endpoint_scheme_id="EM",
            telephone="+49 30 123456",
        ),
        buyer=Party(name="Demo Empfänger", street="Weg 1", city="Stadt", postal_code="00000", country="DE"),
        lines=[InvoiceLine("Beratung", Decimal("1"), "C62", Decimal("100"), TaxCategory("S", Decimal("19")))],
        payment_iban="DE89370400440532013000",
    )
    xml_text = invoice_to_ubl_xml(invoice)
    root = ET.fromstring(xml_text)
    ns = {
        "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
        "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    }

    contact = root.find("cac:AccountingSupplierParty/cac:Party/cac:Contact", namespaces=ns)

    assert contact is not None
    assert contact.findtext("cbc:Name", namespaces=ns) == "Demo Lieferant GmbH"
    assert contact.findtext("cbc:Telephone", namespaces=ns) == "+49 30 123456"
    assert contact.findtext("cbc:ElectronicMail", namespaces=ns) == "seller@example.invalid"
