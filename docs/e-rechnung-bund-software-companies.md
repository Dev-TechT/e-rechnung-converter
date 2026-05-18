# Source notes: e-rechnung-bund.de for software companies

Source: https://e-rechnung-bund.de/en/e-invoicing-for-software-companies/
Checked: 2026-05-18

This note maps the official federal guidance for software companies/developers to concrete repository work. Treat the source as product guidance, not as a legal opinion.

## What the source says that matters here

### Product role

Software companies are expected to help suppliers create, transmit, receive, process, and archive standard-compliant e-invoices for public-sector workflows.

Repository implication:
- The product should not stop at XML generation. It needs a workflow around review, validation reports, transmission metadata, and archival evidence.
- Public wording must stay honest: generated artifacts are candidates until the concrete artifact passes the relevant local validator.

### Standard and syntaxes

XRechnung is Germany's national CIUS of EN 16931. An e-invoice is a structured, machine-readable XML file, not a plain paper/PDF invoice.

The mandatory syntaxes are:
- UBL 2.1
- UN/CEFACT Cross Industry Invoice (CII)

The source distinguishes outgoing and incoming software:
- For outgoing invoices, software can choose either approved syntax.
- For incoming invoices, software must be able to process both approved syntaxes.

Repository implication:
- The current `xrechnung-ubl` exporter is the right first production-hardening target.
- `xrechnung-cii` should stay on the roadmap because receiving/incoming workflows need both UBL and CII.
- Format labels must keep XML, PDF/A-3 hybrid documents, and XSL/XSLT visualization separate.

### KoSIT components

KoSIT provides and maintains important implementation resources:
- XRechnung specification and business rules
- validator configuration / reference validation implementation
- test suite with test cases, sample invoices and test messages
- visualization resources

Repository implication:
- KoSIT validator + validator-configuration-xrechnung remain the local XRechnung gate.
- Tests should increasingly use KoSIT-provided/anonymized fixture behavior instead of only custom sanity checks.
- xrechnung-visualization is useful for preview, not for validation.

### Invoice content requirements

The source calls out:
- codelists and standard/regulatory data model requirements;
- buyer reference `BT-10`, corresponding to the `Leitweg-ID` under the federal E-Invoicing Ordinance context;
- practical recipient-specific reference data such as customer number, purchase order reference, sales order number;
- recipient submission portal, transmission method, and associated email/Peppol address.

Repository implication:
- `BT-10` / Leitweg-ID must remain a first-class required field for federal public-sector use cases.
- The canonical model should grow an explicit public-sector delivery profile: recipient portal, transmission method, recipient email/Peppol address, and reference IDs.
- Example data must stay synthetic; never copy real Leitweg-IDs, order numbers, customer IDs, tax IDs, or bank data into docs/tests.

### Transmission methods

The federal portal context includes these transmission methods:
- web submission
- manual upload
- email
- Peppol

For higher invoice volumes, email and especially Peppol are positioned as better suited. Peppol enables machine-to-machine exchange and delivery confirmation; the federal web service is available via SOAP or REST in the Peppol context.

Repository implication:
- Do not implement real transmission by default in the browser app.
- Add a local, non-sending transmission readiness model first: selected method, recipient address, and validation checklist.
- Any future email/Peppol/OZG-RE sending must be an explicit integration with separate credentials, tests, and approval gates.

### Testing phase

The source emphasizes validation before exchange and points to:
- KoSIT validator configuration and reference implementations;
- OZG-RE test environment;
- KoSIT test messages and test invoices.

Repository implication:
- A useful next documentation slice is an OZG-RE/test-environment runbook that explains what can be tested without sending real invoices.
- A useful code slice is normalized validation-report JSON that records validator/artifact versions and report paths.

### Production and release cadence

KoSIT releases a new XRechnung specification twice a year:
- 31 January winter release, valid six months later on 1 August;
- 31 July summer release, valid six months later on 1 February.

Repository implication:
- Validator artifacts should be pinned and updateable.
- Add a release-cadence checklist or watcher so the repo does not silently age past the next XRechnung release.
- Status docs should record which validator/configuration release was last tested.

## Source-grounded next tasks

1. Harden XRechnung UBL against KoSIT with more anonymized fixtures and normalized report JSON.
2. Add a public-sector delivery profile to the canonical model and browser/agent API: Leitweg-ID, recipient portal, transmission method, recipient email/Peppol address, and reference IDs.
3. Add UBL/CII receiving-detection tests so incoming workflows can process both mandatory syntaxes.
4. Add an OZG-RE/test-environment documentation slice without implementing real sending.
5. Add a release-cadence check for KoSIT/XRechnung validator configuration updates.
6. Keep ZUGFeRD/Factur-X PDF/A-3 work gated by Mustangproject + veraPDF validation.

## Better questions to ask users/contributors

- Are you building outgoing invoices only, or do you also need incoming invoice processing?
- Which syntax do your recipients require today: XRechnung UBL, XRechnung CII, or a ZUGFeRD/Factur-X XRECHNUNG profile?
- Which federal/state/customer portal receives the invoice: OZG-RE, another portal, email, or Peppol?
- For Peppol/email, which recipient address/Peppol ID and delivery evidence do you need to store?
- Which fields caused real rejection messages: BT-10/Leitweg-ID, order reference, codelists, VAT, totals, endpoint IDs, or attachment/container rules?
- Can you provide anonymized validator reports and synthetic fixtures that reproduce the rejection?
- What release of XRechnung/validator configuration does the recipient currently enforce?
