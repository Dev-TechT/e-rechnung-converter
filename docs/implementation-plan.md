# XRechnung Converter Implementation Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: Build a cross-platform, local-first app that converts structured and semi-structured invoices into valid German XRechnung XML, with official local KoSIT validation and human review for uncertain extractions.

Architecture: Keep a canonical invoice model at the center. Source adapters extract candidate data from JSON/CSV/XML/DOCX/PDF/TXT. A review UI resolves missing/uncertain fields. Exporters produce UBL 2.1 first, CII later. A validation sidecar runs KoSIT validator-configuration-xrechnung; visualization uses KoSIT XSLT.

Tech Stack: Python core CLI for MVP; later local web UI via FastAPI + static frontend or Tauri/Electron wrapper. Java required for official KoSIT validator. Optional Mustangproject Java sidecar for production eInvoice operations.

---

## Current status

Implemented MVP spike in `/home/neon/xrechnung-converter`:

- Canonical invoice dataclasses.
- UBL XML generator for a minimal invoice.
- Output format catalog for XRechnung UBL, XRechnung CII, ZUGFeRD PDF/A-3, Factur-X PDF/A-3, generic UBL.
- CLI `--output-format` and `--print-validation-plan`.
- JSON/CSV input CLI.
- Basic sanity validator.
- KoSIT validator hook.
- Tests and example files.

Verified:

```bash
cd /home/neon/xrechnung-converter
. .venv/bin/activate
pytest -q
# 11 passed
xrechnung-converter --output-format factur-x-pdf --print-validation-plan
xrechnung-converter examples/minimal-invoice.json -o out/minimal-invoice.xml --output-format xrechnung-ubl
xrechnung-converter examples/minimal-invoice.csv -o out/minimal-invoice-csv.xml --output-format xrechnung-ubl
```

## Task 1: Pin and run official KoSIT validation

Objective: Make validation authoritative, not just local sanity checks.

Files:
- Create: `scripts/bootstrap_kosit.py`
- Create: `tools/kosit/` downloaded artifacts, gitignored if large
- Modify: `README.md`
- Test: `tests/test_kosit_bootstrap.py`

Steps:
1. Write failing test that bootstrap resolves URLs for:
   - validator v1.6.2
   - validator-configuration-xrechnung v2026-01-31
2. Implement downloader with SHA256 recording.
3. Extract configuration zip.
4. Discover `scenarios.xml` path.
5. Run CLI with `--kosit-validator` and `--kosit-scenarios` against generated example.
6. Save report under `reports/validation/`.
7. Document exact command and validator versions.

## Task 2: Fix UBL completeness against KoSIT report

Objective: Iterate from MVP XML to KoSIT-valid XRechnung 3.0.x minimal invoice.

Files:
- Modify: `src/xrechnung_converter/ubl.py`
- Modify: `src/xrechnung_converter/canonical.py`
- Test: `tests/test_canonical_and_ubl.py`
- Add: `tests/fixtures/valid-minimal.json`

Steps:
1. Run official validator and capture first failures.
2. For each missing field/rule, write failing test.
3. Add required UBL elements/attributes.
4. Re-run KoSIT until valid.
5. Keep generated XML deterministic.

Likely missing/fragile areas:
- CustomizationID exact value.
- Seller/buyer tax/legal identifiers.
- Payment terms.
- VAT breakdown category/rates.
- Endpoint scheme codes.
- Monetary totals and rounding.

## Task 3: Implement output format orchestration

Objective: Let users choose XRechnung UBL, XRechnung CII, ZUGFeRD PDF/A-3, Factur-X PDF/A-3, or generic UBL with an explicit local validation plan.

Status: catalog and CLI plan printing are implemented; real exporters beyond XRechnung UBL are still planned.

Files:
- Modify: `src/xrechnung_converter/formats.py`
- Modify: `src/xrechnung_converter/cli.py`
- Test: `tests/test_formats.py`
- Test: `tests/test_cli_formats.py`

Steps:
1. Keep format metadata honest: status planned vs implemented.
2. Add CII exporter behind `xrechnung-cii`.
3. Add ZUGFeRD/Factur-X PDF/A-3 exporter via Mustangproject or another vetted local component.
4. Make validator orchestration format-specific.
5. Block export if required validator artifacts are missing unless user asks for candidate-only mode.

## Task 4: XML/ZUGFeRD source adapter

Objective: If input already contains eInvoice XML, parse/revalidate instead of OCRing.

Files:
- Create: `src/xrechnung_converter/adapters/xml_adapter.py`
- Test: `tests/test_xml_adapter.py`

Steps:
1. Test UBL XML input detection.
2. Test CII XML input detection.
3. Test Factur-X/ZUGFeRD embedded XML extraction from PDF if dependency available.
4. Return canonical model or pass-through with validation report.

## Task 5: DOCX/TXT extraction with review flags

Objective: Extract candidates, never silently trust uncertain text.

Files:
- Create: `src/xrechnung_converter/extraction.py`
- Create: `src/xrechnung_converter/adapters/docx_adapter.py`
- Create: `src/xrechnung_converter/adapters/text_adapter.py`
- Test: `tests/test_extraction.py`

Steps:
1. Define `ExtractedField(value, confidence, source_span)`.
2. Write tests for invoice number/date/amount/VAT/IBAN regex candidates.
3. Implement TXT adapter.
4. Implement DOCX adapter using python-docx.
5. Mark fields below confidence threshold as requiring review.

## Task 6: PDF extraction pipeline

Objective: Handle text-layer PDFs first; OCR later.

Files:
- Create: `src/xrechnung_converter/adapters/pdf_adapter.py`
- Test: `tests/test_pdf_adapter.py`

Steps:
1. Use PyMuPDF for text-layer extraction.
2. Detect scanned/empty text PDFs and return `needs_ocr=true`.
3. Do not add cloud OCR in MVP.
4. Add optional local OCR interface later.

## Task 7: Review UI

Objective: Human-in-the-loop field correction before XML generation.

Files:
- Create: `src/xrechnung_converter/web_app.py`
- Create: `web/` minimal static frontend or HTMX templates
- Test: CLI smoke or browser smoke

Steps:
1. Upload/select local file.
2. Show extracted fields and confidence.
3. Require missing mandatory fields.
4. Generate XML only after review confirmation.
5. Run validator and show report.

## Task 8: Visualization

Objective: Render generated XRechnung for human preview.

Files:
- Create: `src/xrechnung_converter/visualization.py`
- Test: `tests/test_visualization.py`

Steps:
1. Bootstrap xrechnung-visualization artifact.
2. Apply XSLT locally.
3. Produce HTML preview.
4. Optional PDF render later.

## Task 9: Packaging

Objective: Cross-OS delivery.

Options:
- CLI package via uv/pipx for technical users.
- Tauri/Electron wrapper for Windows/macOS/Linux desktop.
- Docker/self-hosted web app for teams.

Acceptance:
- No external network required for conversion/validation after bootstrap.
- Java dependency handled or bundled.
- Clear update path for KoSIT artifacts.

## Stop/approval gates

Ask Antonios before:
- Publishing GitHub repo.
- Using paid APIs/OCR.
- Uploading real invoices to any external service.
- Making legal/compliance marketing claims.
- Creating SaaS infrastructure or processing customer data.
