import xml.etree.ElementTree as ET
from decimal import Decimal
from pathlib import Path

from xrechnung_converter.canonical import Invoice, Party, InvoiceLine, TaxCategory
from xrechnung_converter.ubl import invoice_to_ubl_xml
from xrechnung_converter.validation import basic_validate_ubl


def minimal_invoice() -> Invoice:
    return Invoice(
        invoice_number="RE-2026-0001",
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
            vat_id="DEMO-VAT-ID",
            endpoint_id="seller@example.invalid",
            endpoint_scheme_id="EM",
        ),
        buyer=Party(
            name="Demo Empfänger",
            street="Empfängerweg 1",
            city="Demostadt",
            postal_code="00000",
            country="DE",
            endpoint_id="buyer@example.invalid",
            endpoint_scheme_id="EM",
        ),
        lines=[
            InvoiceLine(
                description="Beratungsleistung",
                quantity=Decimal("2"),
                unit_code="HUR",
                net_price=Decimal("100.00"),
                tax=TaxCategory(category_id="S", percent=Decimal("19")),
            )
        ],
        payment_iban="DE00DEMO00000000000000",
    )


def test_invoice_to_ubl_contains_xrechnung_customization_and_valid_totals():
    xml_text = invoice_to_ubl_xml(minimal_invoice())
    root = ET.fromstring(xml_text)

    ns = {
        "ubl": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
        "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
        "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    }

    assert root.tag == "{urn:oasis:names:specification:ubl:schema:xsd:Invoice-2}Invoice"
    assert "xrechnung_3.0" in root.findtext("cbc:CustomizationID", namespaces=ns).lower()
    assert root.findtext("cbc:ID", namespaces=ns) == "RE-2026-0001"
    assert root.findtext("cbc:BuyerReference", namespaces=ns) == "DEMO-LEITWEG-ID"
    assert root.findtext("cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount", namespaces=ns) == "200.00"
    assert root.findtext("cac:TaxTotal/cbc:TaxAmount", namespaces=ns) == "38.00"
    assert root.findtext("cac:LegalMonetaryTotal/cbc:PayableAmount", namespaces=ns) == "238.00"


def test_basic_validator_rejects_missing_buyer_reference():
    invoice = minimal_invoice()
    invoice.buyer_reference = ""
    xml_text = invoice_to_ubl_xml(invoice)

    report = basic_validate_ubl(xml_text)

    assert report.ok is False
    assert any("BuyerReference" in error for error in report.errors)


def test_basic_validator_accepts_generated_minimal_invoice():
    xml_text = invoice_to_ubl_xml(minimal_invoice())

    report = basic_validate_ubl(xml_text)

    assert report.ok is True
    assert report.errors == []
