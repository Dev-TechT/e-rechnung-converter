from __future__ import annotations

import argparse
import csv
import json
from decimal import Decimal
from pathlib import Path

from .canonical import Invoice, InvoiceLine, Party, TaxCategory
from .formats import get_output_format, output_format_choices, validation_plan
from .ubl import invoice_to_ubl_xml
from .validation import basic_validate_ubl, run_kosit_validator


def invoice_from_json(path: Path) -> Invoice:
    data = json.loads(path.read_text(encoding="utf-8"))
    lines = [
        InvoiceLine(
            description=line["description"],
            quantity=Decimal(str(line.get("quantity", "1"))),
            unit_code=line.get("unit_code", "C62"),
            net_price=Decimal(str(line["net_price"])),
            tax=TaxCategory(
                category_id=line.get("tax_category", "S"),
                percent=Decimal(str(line.get("tax_percent", "19"))),
            ),
        )
        for line in data["lines"]
    ]
    return Invoice(
        invoice_number=data["invoice_number"],
        issue_date=data["issue_date"],
        due_date=data.get("due_date", data["issue_date"]),
        currency=data.get("currency", "EUR"),
        buyer_reference=data.get("buyer_reference", ""),
        seller=Party(**data["seller"]),
        buyer=Party(**data["buyer"]),
        lines=lines,
        payment_iban=data.get("payment_iban", ""),
        payment_terms=data.get("payment_terms", data.get("note", "")),
        order_reference=data.get("order_reference", data.get("order_number", "")),
        note=data.get("note", ""),
    )


def invoice_from_csv(path: Path) -> Invoice:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError("CSV contains no rows")
    first = rows[0]
    lines = [
        InvoiceLine(
            description=row["line_description"],
            quantity=Decimal(str(row.get("line_quantity") or "1")),
            unit_code=row.get("line_unit_code") or "C62",
            net_price=Decimal(str(row["line_net_price"])),
            tax=TaxCategory(
                category_id=row.get("line_tax_category") or "S",
                percent=Decimal(str(row.get("line_tax_percent") or "19")),
            ),
        )
        for row in rows
    ]
    return Invoice(
        invoice_number=first["invoice_number"],
        issue_date=first["issue_date"],
        due_date=first.get("due_date") or first["issue_date"],
        currency=first.get("currency") or "EUR",
        buyer_reference=first.get("buyer_reference") or "",
        seller=Party(
            name=first["seller_name"],
            street=first.get("seller_street", ""),
            city=first.get("seller_city", ""),
            postal_code=first.get("seller_postal_code", ""),
            country=first.get("seller_country", "DE"),
            vat_id=first.get("seller_vat_id", ""),
            endpoint_id=first.get("seller_endpoint_id", ""),
            endpoint_scheme_id=first.get("seller_endpoint_scheme_id", "EM"),
            telephone=first.get("seller_telephone", ""),
            identifier=first.get("seller_identifier", ""),
        ),
        buyer=Party(
            name=first["buyer_name"],
            street=first.get("buyer_street", ""),
            city=first.get("buyer_city", ""),
            postal_code=first.get("buyer_postal_code", ""),
            country=first.get("buyer_country", "DE"),
            vat_id=first.get("buyer_vat_id", ""),
            endpoint_id=first.get("buyer_endpoint_id", ""),
            endpoint_scheme_id=first.get("buyer_endpoint_scheme_id", "EM"),
            telephone=first.get("buyer_telephone", ""),
        ),
        lines=lines,
        payment_iban=first.get("payment_iban", ""),
        payment_terms=first.get("payment_terms") or first.get("note", ""),
        order_reference=first.get("order_reference") or first.get("order_number", ""),
        note=first.get("note", ""),
    )


def convert(args: argparse.Namespace) -> int:
    selected_format = get_output_format(args.output_format)
    if args.print_validation_plan:
        print(json.dumps(validation_plan(selected_format.id), ensure_ascii=False, indent=2))
        return 0

    if not args.input or not args.output:
        raise SystemExit("input and --output are required unless --print-validation-plan is used")

    if selected_format.id != "xrechnung-ubl":
        raise SystemExit(
            f"Output format '{selected_format.id}' is planned but not implemented in this CLI yet. "
            "Use --print-validation-plan to inspect its local validation workflow."
        )

    if bool(args.kosit_validator) != bool(args.kosit_scenarios):
        print(json.dumps({
            "ok": False,
            "engine": "kosit",
            "output_format": selected_format.id,
            "errors": ["--kosit-validator and --kosit-scenarios must be provided together."],
            "warnings": [],
            "report_path": None,
        }, ensure_ascii=False, indent=2))
        return 2

    src = Path(args.input)
    if args.format == "json" or src.suffix.lower() == ".json":
        invoice = invoice_from_json(src)
    elif args.format == "csv" or src.suffix.lower() == ".csv":
        invoice = invoice_from_csv(src)
    else:
        raise SystemExit("Structured JSON/CSV is supported first. PDF/DOC/DOCX/TXT extraction needs local OCR/PDF tooling and human review.")

    xml_text = invoice_to_ubl_xml(invoice)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(xml_text, encoding="utf-8")

    report = basic_validate_ubl(xml_text)
    if args.kosit_validator and args.kosit_scenarios:
        report = run_kosit_validator(
            output,
            Path(args.kosit_validator),
            Path(args.kosit_scenarios),
            Path(args.report_dir),
        )

    print(json.dumps({
        "ok": report.ok,
        "engine": report.engine,
        "output_format": selected_format.id,
        "output": str(output),
        "errors": report.errors,
        "warnings": report.warnings,
        "report_path": report.report_path,
    }, ensure_ascii=False, indent=2))
    return 0 if report.ok else 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Local-first invoice to XRechnung candidate XML converter; "
            "production use requires official KoSIT validation."
        )
    )
    parser.add_argument("input", nargs="?", help="Input JSON or CSV with canonical invoice fields")
    parser.add_argument("-o", "--output", help="Output UBL XML candidate path")
    parser.add_argument(
        "--output-format",
        choices=output_format_choices(),
        default="xrechnung-ubl",
        help="Target format/profile. Only xrechnung-ubl generation is implemented; other formats expose local validation plans.",
    )
    parser.add_argument("--print-validation-plan", action="store_true", help="Print the local validation workflow for --output-format and exit")
    parser.add_argument("--format", choices=["json", "csv"], help="Input format override")
    parser.add_argument("--kosit-validator", help="Path to KoSIT validator standalone JAR")
    parser.add_argument("--kosit-scenarios", help="Path to validator-configuration-xrechnung scenarios.xml")
    parser.add_argument("--report-dir", default="reports/validation", help="Directory for validator reports")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return convert(args)


if __name__ == "__main__":
    raise SystemExit(main())
