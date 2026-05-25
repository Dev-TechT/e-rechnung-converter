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
        "OrderReference": "cac:OrderReference/cbc:ID",
        "AccountingSupplierParty": "cac:AccountingSupplierParty",
        "AccountingCustomerParty": "cac:AccountingCustomerParty",
        "PaymentMeans IBAN": "cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:ID",
        "PaymentTerms": "cac:PaymentTerms/cbc:Note",
        "InvoiceLine": "cac:InvoiceLine",
    }
    aggregate_labels = {"AccountingSupplierParty", "AccountingCustomerParty", "InvoiceLine"}
    for label, path in required.items():
        found = root.find(path, namespaces=NS)
        text = _text(root, path)
        if found is None or (label not in aggregate_labels and not text):
            errors.append(f"Missing required field: {label}")

    if not _text(root, "cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID"):
        errors.append("Missing required field: SellerPartyIdentification")
    if not _text(root, "cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telephone"):
        errors.append("Missing required field: SellerContactTelephone")
    if not _text(root, "cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:ElectronicMail"):
        errors.append("Missing required field: SellerContactEmail")

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


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _element_text(element: ET.Element) -> str:
    return " ".join("".join(element.itertext()).split())


def parse_kosit_report(report_path: Path) -> tuple[list[str], list[str]]:
    """Extract human-readable KoSIT/Schematron findings from a validator report.

    KoSIT report XML has changed namespace/details across versions and nested
    report formats. Keep this parser intentionally tolerant: look for local XML
    names that signal failed assertions/errors/warnings, then include test/id and
    location attributes when present.
    """
    try:
        root = ET.parse(report_path).getroot()
    except ET.ParseError as exc:
        return [f"Could not parse KoSIT report {report_path}: {exc}"], []

    errors: list[str] = []
    warnings: list[str] = []
    error_names = {"failed-assert", "error", "fatal", "failedassert"}
    warning_names = {"warning", "successful-report", "successfulreport"}
    for element in root.iter():
        name = _local_name(element.tag)
        level = element.attrib.get("level", "").lower()
        is_error = name in error_names or (name == "message" and level in {"error", "fatal"})
        is_warning = name in warning_names or (name == "message" and level == "warning")
        if not is_error and not is_warning:
            continue
        text = _element_text(element)
        parts = []
        for attr in ("code", "id", "test", "location", "xpathLocation", "flag"):
            value = element.attrib.get(attr)
            if value:
                parts.append(value)
        if text:
            parts.append(text)
        message = " — ".join(parts) if parts else name
        if is_error:
            errors.append(message)
        else:
            warnings.append(message)
    return errors, warnings


def _latest_report_file(output_dir: Path) -> Path | None:
    candidates = [path for path in output_dir.rglob("*") if path.is_file()]
    if not candidates:
        return None
    xml_reports = [path for path in candidates if path.suffix.lower() == ".xml"]
    return max(xml_reports or candidates, key=lambda p: p.stat().st_mtime)


def run_kosit_validator(xml_path: Path, validator_jar: Path, scenarios_xml: Path, output_dir: Path) -> ValidationReport:
    if not validator_jar.is_file():
        return ValidationReport(False, [f"KoSIT validator JAR not found: {validator_jar}"], [], engine="kosit")
    if not scenarios_xml.is_file():
        return ValidationReport(False, [f"KoSIT scenarios.xml not found: {scenarios_xml}"], [], engine="kosit")

    output_dir.mkdir(parents=True, exist_ok=True)
    before = {path.resolve() for path in output_dir.rglob("*") if path.is_file()}
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
    report_files = [path for path in output_dir.rglob("*") if path.is_file() and path.resolve() not in before]
    report_path = max(report_files, key=lambda p: p.stat().st_mtime) if report_files else _latest_report_file(output_dir)

    report_errors: list[str] = []
    report_warnings: list[str] = []
    if report_path and report_path.suffix.lower() == ".xml":
        report_errors, report_warnings = parse_kosit_report(report_path)

    if proc.returncode == 0:
        errors: list[str] = []
    else:
        process_error = proc.stderr.strip() or proc.stdout.strip() or f"KoSIT exited {proc.returncode}"
        errors = report_errors or [process_error]

    warnings = report_warnings
    if proc.returncode != 0:
        warnings = [*warnings, "Official KoSIT validation failed; inspect generated report."]

    return ValidationReport(
        ok=proc.returncode == 0,
        errors=errors,
        warnings=warnings,
        engine="kosit",
        report_path=str(report_path) if report_path else None,
    )
