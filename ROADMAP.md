# Roadmap

This project is MIT-licensed and intentionally agent-friendly: humans and other agents can inspect the browser APIs, pick a focused milestone, run the checks, and send small, reviewable improvements.

## Product stance

- Local-first by default: invoice data should not need to leave the user's device.
- Honest e-invoice wording: generated files are candidates until official local validation passes.
- Human review stays in the loop for extracted PDF/DOC/DOCX/TXT values.
- Official validators are adopted, not reimplemented from scratch.
- Public-sector transmission is modeled before it is automated: portal, method, recipient email/Peppol address, and delivery evidence belong in the workflow, but real sending is a later explicit integration.
- Source-grounded planning note: `docs/e-rechnung-bund-software-companies.md` maps the official federal guidance for software companies/developers to repo tasks.

## Official federal guidance distilled

From the federal e-invoicing page for software companies/developers:

- XRechnung is Germany's EN 16931 CIUS; the exchange artifact is structured machine-readable XML, not a plain PDF.
- Mandatory XRechnung syntaxes are UBL 2.1 and UN/CEFACT CII. Outgoing software can choose one syntax; incoming software must be able to process both.
- KoSIT resources matter: specification/business rules, validator configuration, test suite/sample invoices/test messages, and visualization resources.
- `BT-10` buyer reference maps to the federal `Leitweg-ID` context and must stay first-class for public-sector invoices.
- Real workflows also need recipient portal, transmission method, and recipient email/Peppol address metadata.
- OZG-RE supports web submission, manual upload, email and Peppol; email/Peppol fit higher volumes better than manual portal flows.
- XRechnung releases happen twice yearly: 31 January and 31 July, becoming valid six months later on 1 August and 1 February.

## Current baseline

Implemented today:

- Static browser app without database, cookies, browser storage, server uploads, fetch/XHR/WebSocket runtime paths, or remote invoice processing.
- Browser generation for XRechnung UBL, XRechnung CII, generic EN16931 UBL, and XML preparation packages for ZUGFeRD/Factur-X.
- Machine-readable browser APIs for agents:
  - `window.XInvoice.convertForAgent(invoice, formatId)`
  - `window.XInvoice.validateXRechnungInBrowser(xml, formatId)`
  - `window.XInvoice.getBrowserExecutionModel()`
  - `window.XInvoice.getXRechnungFieldCatalog()`
  - `window.XInvoice.getFormFieldBindings()`
- Python CLI for structured JSON/CSV -> XRechnung UBL.
- Local KoSIT bootstrap script and CLI validator hook.
- Generated XRechnung BT/BG field catalog bound to form metadata.

Important limits:

- Browser validation is still a structured sanity report, not an official KoSIT PASS.
- CLI field coverage is still minimal and needs more XRechnung hardening.
- PDF extraction is suggestions-only and fail-closed; scan/image OCR is not implemented.
- DOC/DOCX extraction needs a trusted local engine and human review workflow.
- ZUGFeRD/Factur-X still need real PDF/A-3 container generation and Mustang/veraPDF validation.

## Milestones

### 1. Trustworthy XRechnung UBL core

Goal: make the smallest useful JSON/CSV -> XRechnung UBL workflow repeatedly pass official local KoSIT validation.

Needed:

- Expand canonical invoice fields only where required by KoSIT failures and common SME invoices.
- Add anonymized fixture invoices and expected KoSIT report assertions.
- Normalize validator reports into stable JSON for CI/local review.
- Document exactly which business cases are supported and which still fail.

Good agent task:

- Pick one KoSIT failure from an anonymized fixture, add the failing test, fix only that field/rule, and update docs.

### 2. Browser validator parity slice

Goal: improve browser-local validation without pretending it replaces KoSIT too early.

Needed:

- Browser-loadable XSD/Schematron/codelist artifact slice.
- Parity corpus comparing browser reports against KoSIT CLI reports.
- Clear severity mapping: blocker, warning, unsupported, needs official validation.
- Size/performance budget for static GitHub Pages delivery.

Good agent task:

- Add one browser-side business-rule check with a KoSIT-backed fixture and a test proving the browser report matches the expected category.

### 3. Human-reviewed document intake

Goal: accept messy source documents while making uncertainty visible.

Needed:

- Local DOC/DOCX adapter or desktop/CLI module.
- Optional local OCR path for scan/image PDFs.
- Confidence/trace UI: every suggested field should show source and review status.
- No silent auto-submit from extracted values.

Good agent task:

- Add a small import fixture for one local format, mark all extracted values as review-required, and prove no network/storage APIs are used.

### 4. ZUGFeRD / Factur-X PDF/A-3 export

Goal: create real hybrid PDF/A-3 documents, not fake PDF downloads.

Needed:

- CII XML generation for the selected profile.
- PDF/A-3 embedding with correct metadata/AFRelationship.
- Mustangproject validation for profile/container logic.
- veraPDF validation for PDF/A-3 carrier conformance.
- Tests proving the embedded XML can be extracted and validated separately.

Good agent task:

- Build a local-only proof slice around one sample PDF/A-3 fixture and a validator report, without making production claims.

### 5. Contributor and agent workflow

Goal: make outside contributions easy but safe.

Needed:

- Issue templates for validator failures, format requests, transmission-readiness requests, and extraction adapters.
- Contribution guide with local setup, test commands, privacy rules, and claim wording.
- More machine-readable task contracts for agent workers.
- Small labeled issues: `good first issue`, `agent-friendly`, `needs-kosit-fixture`, `needs-validator-evidence`, `docs`.

Good agent task:

- Turn one roadmap item into a focused issue with acceptance criteria and exact verification commands.

### 6. Public-sector delivery readiness

Goal: support the metadata needed before a user can choose a real submission path, without silently sending invoices.

Needed:

- Canonical delivery profile with recipient portal, transmission method (`web`, `manual-upload`, `email`, `peppol`), recipient email/Peppol address, and delivery evidence fields.
- Browser UI and agent API fields for transmission readiness, separate from invoice XML generation.
- Validation/report wording that says whether the invoice artifact is valid and whether delivery metadata is complete.
- OZG-RE test-environment runbook for safe manual testing with synthetic/anonymized artifacts.
- Explicit non-goal: no live email/Peppol/OZG-RE submission without a separate integration, credentials handling, and tests.

Good agent task:

- Add a non-sending delivery-profile schema plus tests that missing method/address blocks “ready to submit” status but does not block candidate XML generation.

### 7. Release cadence and artifact freshness

Goal: prevent stale XRechnung/KoSIT assumptions.

Needed:

- Record the pinned KoSIT validator and validator-configuration release in machine-readable status.
- Add a checklist or script that reminds maintainers around the 31 January / 31 July release dates and the 1 August / 1 February validity dates.
- Keep old/new validator reports side by side when upgrading.

Good agent task:

- Add a read-only release-cadence check that reports the current pinned release, latest known release, next expected release window, and docs that must be updated.

## Questions worth asking maintainers/users

Use these before building a larger slice:

1. Are you building outgoing invoices only, or do you also need incoming invoice processing?
2. Which output matters first for your real workflow: XRechnung UBL, XRechnung CII, ZUGFeRD, Factur-X, or generic UBL?
3. Which source files are most common: structured JSON/CSV, existing XML, PDF text, scanned PDF, DOCX, or a manual form?
4. Which portal/submission path receives the invoice: OZG-RE, another public portal, manual upload, email, or Peppol?
5. For email/Peppol, which recipient address/Peppol ID and delivery evidence must be stored?
6. Can you provide anonymized invoices plus the real recipient rejection/validation messages?
7. Which validator report is required by your customer/authority: KoSIT, Mustangproject, veraPDF, Peppol, or something else?
8. Which XRechnung/validator-configuration release does the recipient currently enforce?
9. Is the priority strict correctness, speed of manual entry, batch conversion, or integration into an existing invoicing workflow?
10. What data must never leave the device/network?

## Definition of done for any contribution

- Tests run locally and are listed in the PR/commit message.
- Claims stay honest: no legal/compliance guarantees and no official-validation claim without validator evidence.
- Generated invoice artifacts are called candidates unless official validation passed.
- New extraction logic is local-first, review-required, and privacy-scanned.
- Docs distinguish implemented formats from planned formats.
