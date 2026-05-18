# Contributing

Thanks for helping. This project is MIT-licensed and meant to be easy for both humans and coding agents to improve, but invoice software needs a higher honesty bar than a normal file converter.

## Ground rules

- Keep the workflow local-first. Do not add server uploads, telemetry, analytics, hidden persistence, or network calls for invoice contents without a separate design discussion.
- Do not claim legal certainty, guaranteed compliance, or official validation unless the relevant local validator report proves it for the concrete artifact.
- Treat generated XML/PDF as a candidate until official validation passes.
- Treat extracted PDF/DOC/DOCX/TXT values as suggestions requiring human review.
- Do not commit real invoice data, real Leitweg-IDs, real order numbers, customer data, credentials, or private validator reports.

## Local setup

```bash
git clone https://github.com/Dev-TechT/e-rechnung-converter.git
cd e-rechnung-converter
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -e '.[dev,pdf,docx]'
```

Run checks:

```bash
python3 -m pytest -q
node tests/webapp.test.js
```

Optional local KoSIT setup:

```bash
python3 scripts/bootstrap_validators.py --include-visualization
xrechnung-converter examples/minimal-invoice.json -o out/minimal-invoice.xml \
  --kosit-validator tools/kosit/validator-1.6.2-standalone.jar \
  --kosit-scenarios tools/kosit/xrechnung-config/scenarios.xml \
  --report-dir reports/validation
```

## Good contribution shapes

Best first contributions are small and evidence-backed:

- Add one missing XRechnung field with tests.
- Add one anonymized fixture and expected validation behavior.
- Improve one browser validation rule and compare it to KoSIT behavior.
- Improve documentation around a supported vs planned format boundary.
- Add one local-only extraction adapter that clearly marks suggested fields as review-required.
- Add one non-sending delivery-readiness check for portal/method/address metadata.
- Add one release-cadence or validator-artifact freshness check.
- Improve agent/browser API docs without changing runtime behavior.

Avoid broad rewrites, generic refactors, or adding new dependencies unless the roadmap item really needs them.

## For coding agents

Before changing files:

1. Read `README.md`, `ROADMAP.md`, `docs/status.json`, and the relevant test file.
2. Pick exactly one small roadmap item.
3. Write or update a failing test first when changing behavior.
4. Make the minimal code/docs change.
5. Run the targeted test, then the full relevant suite.
6. Report exact commands and results.

Agent-safe task contract template:

```text
Goal:
  <one focused XRechnung/e-invoice improvement>

Scope:
  <files and behavior to change>

Non-goals:
  No server upload, no legal/compliance guarantee, no unrelated refactor.

Acceptance criteria:
  - Tests cover the new behavior.
  - Generated artifacts remain candidates unless official validation passed.
  - Browser changes do not introduce invoice-data network/storage APIs.
  - README/ROADMAP/docs are updated if support status changes.

Verification:
  - <targeted pytest or node test>
  - python3 -m pytest -q, if Python behavior changed
  - node tests/webapp.test.js, if browser behavior changed
```

## Pull request checklist

- [ ] I used only anonymized/synthetic invoice examples.
- [ ] I ran the relevant tests and pasted the command results.
- [ ] I did not add invoice-content network calls, analytics, telemetry, hidden storage, or live transmission.
- [ ] I did not overclaim compliance, legal certainty, or validator status.
- [ ] I updated docs if a format, validator, release cadence, delivery method, or support boundary changed.
