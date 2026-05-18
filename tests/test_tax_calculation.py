from decimal import Decimal

from xrechnung_converter.canonical import InvoiceLine, TaxCategory, calculate_tax_breakdowns


def test_tax_breakdowns_round_tax_per_group_not_per_line():
    lines = [
        InvoiceLine("Kleinstbetrag A", Decimal("1"), "C62", Decimal("0.03"), TaxCategory("S", Decimal("19"))),
        InvoiceLine("Kleinstbetrag B", Decimal("1"), "C62", Decimal("0.03"), TaxCategory("S", Decimal("19"))),
    ]

    breakdowns = list(calculate_tax_breakdowns(lines))

    assert len(breakdowns) == 1
    tax_category, taxable_amount, tax_amount = breakdowns[0]
    assert tax_category.category_id == "S"
    assert taxable_amount == Decimal("0.06")
    assert tax_amount == Decimal("0.01")
