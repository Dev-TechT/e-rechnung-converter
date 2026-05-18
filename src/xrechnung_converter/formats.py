from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ValidationEngine(StrEnum):
    BASIC = "basic"
    KOSIT = "kosit"
    MUSTANG = "mustang"
    VERAPDF = "verapdf"
    PHIVE = "phive"


@dataclass(frozen=True)
class ValidationStep:
    name: str
    tool: str
    purpose: str
    required_for_release: bool = True


@dataclass(frozen=True)
class OutputFormat:
    id: str
    label: str
    container: str
    syntax: str
    profile: str
    extension: str
    local_only_capable: bool
    primary_validation: ValidationEngine
    validation_steps: tuple[ValidationStep, ...]
    implementation_status: str
    notes: str


_FORMATS: tuple[OutputFormat, ...] = (
    OutputFormat(
        id="xrechnung-ubl",
        label="XRechnung UBL XML",
        container="xml",
        syntax="ubl",
        profile="XRechnung 3.0.x / EN16931",
        extension=".xml",
        local_only_capable=True,
        primary_validation=ValidationEngine.KOSIT,
        validation_steps=(
            ValidationStep("UBL/XRechnung XML", "KoSIT Validator", "XSD, EN16931 Schematron, XRechnung rules and codelists"),
            ValidationStep("Preview", "KoSIT xrechnung-visualization", "Optional local HTML/PDF visualization", False),
        ),
        implementation_status="candidate-exporter-started",
        notes="Best first target for German B2G/B2B structured XML. Current MVP writes only a candidate until KoSIT passes.",
    ),
    OutputFormat(
        id="xrechnung-cii",
        label="XRechnung CII XML",
        container="xml",
        syntax="cii",
        profile="XRechnung 3.0.x / EN16931",
        extension=".xml",
        local_only_capable=True,
        primary_validation=ValidationEngine.KOSIT,
        validation_steps=(
            ValidationStep("CII/XRechnung XML", "KoSIT Validator", "CII D16B XSD, EN16931 Schematron, XRechnung rules and codelists"),
            ValidationStep("Generation/parsing", "Mustangproject", "Optional local CII generation and cross-check", False),
        ),
        implementation_status="planned",
        notes="Good bridge to ZUGFeRD/Factur-X because those embed CII XML.",
    ),
    OutputFormat(
        id="zugferd-pdf",
        label="ZUGFeRD PDF/A-3",
        container="pdf-a-3",
        syntax="cii",
        profile="ZUGFeRD 2.x EN16931/XRECHNUNG as selected",
        extension=".pdf",
        local_only_capable=True,
        primary_validation=ValidationEngine.MUSTANG,
        validation_steps=(
            ValidationStep("Hybrid invoice", "Mustangproject", "Validate ZUGFeRD profile, embedded CII XML and container rules"),
            ValidationStep("PDF/A-3 carrier", "veraPDF", "Validate PDF/A-3 conformance"),
            ValidationStep("XRechnung profile if selected", "KoSIT Validator", "Validate extracted xrechnung.xml/CII against XRechnung rules", False),
        ),
        implementation_status="planned",
        notes="Requires both valid XML and valid PDF/A-3 carrier; embedding XML into any PDF is not enough.",
    ),
    OutputFormat(
        id="factur-x-pdf",
        label="Factur-X PDF/A-3",
        container="pdf-a-3",
        syntax="cii",
        profile="Factur-X/ZUGFeRD EN16931 as selected",
        extension=".pdf",
        local_only_capable=True,
        primary_validation=ValidationEngine.MUSTANG,
        validation_steps=(
            ValidationStep("Hybrid invoice", "Mustangproject", "Validate Factur-X/ZUGFeRD profile, embedded CII XML and container rules"),
            ValidationStep("PDF/A-3 carrier", "veraPDF", "Validate PDF/A-3 conformance"),
            ValidationStep("EN16931/CII", "Mustangproject", "Validate embedded CII business rules"),
        ),
        implementation_status="planned",
        notes="Factur-X and ZUGFeRD 2.x are harmonized sibling names; UX can show both labels.",
    ),
    OutputFormat(
        id="ubl",
        label="Generic EN16931 UBL XML",
        container="xml",
        syntax="ubl",
        profile="EN16931 / optional Peppol BIS later",
        extension=".xml",
        local_only_capable=True,
        primary_validation=ValidationEngine.PHIVE,
        validation_steps=(
            ValidationStep("UBL XML", "CEN EN16931 artefacts or phive", "Validate UBL 2.1 XSD and EN16931 Schematron"),
            ValidationStep("Peppol if selected", "phive/phive-rules", "Optional Peppol BIS and national rules", False),
        ),
        implementation_status="planned",
        notes="Useful beyond German XRechnung; not the same as XRechnung unless XRechnung CIUS is selected.",
    ),
)


def list_output_formats() -> tuple[OutputFormat, ...]:
    return _FORMATS


def get_output_format(format_id: str) -> OutputFormat:
    for fmt in _FORMATS:
        if fmt.id == format_id:
            return fmt
    supported = ", ".join(fmt.id for fmt in _FORMATS)
    raise ValueError(f"Unsupported output format: {format_id}. Supported: {supported}")


def output_format_choices() -> tuple[str, ...]:
    return tuple(fmt.id for fmt in _FORMATS)


def validation_plan(format_id: str) -> dict[str, object]:
    fmt = get_output_format(format_id)
    return {
        "id": fmt.id,
        "label": fmt.label,
        "container": fmt.container,
        "syntax": fmt.syntax,
        "profile": fmt.profile,
        "local_only_capable": fmt.local_only_capable,
        "primary_validation": fmt.primary_validation.value,
        "implementation_status": fmt.implementation_status,
        "notes": fmt.notes,
        "validation_steps": [
            {
                "name": step.name,
                "tool": step.tool,
                "purpose": step.purpose,
                "required_for_release": step.required_for_release,
            }
            for step in fmt.validation_steps
        ],
    }
