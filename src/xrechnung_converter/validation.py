from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET


@dataclass
class ValidationReport:
    ok: bool
    errors: list[str]
    warnings: list[str]
    engine: str = "basic"
    report_path: str | None = None


NS = {
    "ubl": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
}


def _text(root: ET.Element, path: str) -> str:
    return (root.findtext(path, namespaces=NS) or "").strip()


def basic_validate_ubl(xml_text: str) -> ValidationReport:
    """Fast local sanity checks.

    This is not a replacement for KoSIT EN16931/XRechnung validation. It catches
    missing MVP-critical fields before invoking the official validator hook.
    """
    errors: list[str] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        return ValidationReport(False, [f"XML parse error: {exc}"], [])

    if root.tag != "{urn:oasis:names:specification:ubl:schema:xsd:Invoice-2}Invoice":
        errors.append("Root element must be UBL Invoice")

    required = {
        "CustomizationID": "cbc:CustomizationID",
        "ID": "cbc:ID",
        "IssueDate": "cbc:IssueDate",
        "DocumentCurrencyCode": "cbc:DocumentCurrencyCode",
        "BuyerReference": "cbc:BuyerReference",
        "AccountingSupplierParty": "cac:AccountingSupplierParty",
        "AccountingCustomerParty": "cac:AccountingCustomerParty",
        "InvoiceLine": "cac:InvoiceLine",
    }
    for label, path in required.items():
        found = root.find(path, namespaces=NS)
        text = _text(root, path)
        if found is None or (label not in {"AccountingSupplierParty", "AccountingCustomerParty", "InvoiceLine"} and not text):
            errors.append(f"Missing required field: {label}")

    for amount_path in [
        "cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount",
        "cac:TaxTotal/cbc:TaxAmount",
        "cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount",
        "cac:LegalMonetaryTotal/cbc:PayableAmount",
    ]:
        value = _text(root, amount_path)
        if not value:
            errors.append(f"Missing amount: {amount_path}")
        else:
            try:
                float(value)
            except ValueError:
                errors.append(f"Invalid decimal amount at {amount_path}: {value}")

    return ValidationReport(not errors, errors, [])


def run_kosit_validator(xml_path: Path, validator_jar: Path, scenarios_xml: Path, output_dir: Path) -> ValidationReport:
    output_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "java",
        "-jar",
        str(validator_jar),
        "-s",
        str(scenarios_xml),
        "-o",
        str(output_dir),
        str(xml_path),
    ]
    proc = subprocess.run(cmd, text=True, capture_output=True, check=False)
    report_files = sorted(output_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True)
    errors = [] if proc.returncode == 0 else [proc.stderr.strip() or proc.stdout.strip() or f"KoSIT exited {proc.returncode}"]
    return ValidationReport(
        ok=proc.returncode == 0,
        errors=errors,
        warnings=[] if proc.returncode == 0 else ["Official KoSIT validation failed; inspect generated report."],
        engine="kosit",
        report_path=str(report_files[0]) if report_files else None,
    )
