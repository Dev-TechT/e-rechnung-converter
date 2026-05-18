from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable


MONEY = Decimal("0.01")


def money(value: Decimal | str | int | float) -> Decimal:
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


@dataclass
class TaxCategory:
    category_id: str = "S"
    percent: Decimal = Decimal("19")


@dataclass
class Party:
    name: str
    street: str = ""
    city: str = ""
    postal_code: str = ""
    country: str = "DE"
    vat_id: str = ""
    endpoint_id: str = ""
    endpoint_scheme_id: str = "EM"


@dataclass
class InvoiceLine:
    description: str
    quantity: Decimal
    unit_code: str
    net_price: Decimal
    tax: TaxCategory = field(default_factory=TaxCategory)

    @property
    def net_amount(self) -> Decimal:
        return money(self.quantity * self.net_price)

    @property
    def tax_amount(self) -> Decimal:
        return money(self.net_amount * self.tax.percent / Decimal("100"))


def calculate_tax_breakdowns(lines: Iterable[InvoiceLine]) -> Iterable[tuple[TaxCategory, Decimal, Decimal]]:
    groups: dict[tuple[str, Decimal], tuple[TaxCategory, Decimal]] = {}
    for line in lines:
        key = (line.tax.category_id, line.tax.percent)
        _, taxable = groups.get(key, (line.tax, Decimal("0")))
        groups[key] = (line.tax, taxable + line.net_amount)
    for tax_category, taxable in groups.values():
        taxable = money(taxable)
        tax = money(taxable * tax_category.percent / Decimal("100"))
        yield tax_category, taxable, tax


@dataclass
class Invoice:
    invoice_number: str
    issue_date: str
    due_date: str
    currency: str
    buyer_reference: str
    seller: Party
    buyer: Party
    lines: list[InvoiceLine]
    payment_iban: str = ""
    note: str = ""

    @property
    def tax_exclusive_amount(self) -> Decimal:
        return money(sum((line.net_amount for line in self.lines), Decimal("0")))

    @property
    def tax_amount(self) -> Decimal:
        return money(sum((tax for _, _, tax in self.tax_groups()), Decimal("0")))

    @property
    def tax_inclusive_amount(self) -> Decimal:
        return money(self.tax_exclusive_amount + self.tax_amount)

    @property
    def payable_amount(self) -> Decimal:
        return self.tax_inclusive_amount

    def tax_groups(self) -> Iterable[tuple[TaxCategory, Decimal, Decimal]]:
        return calculate_tax_breakdowns(self.lines)
