## Summary

-
-

## Type of change

- [ ] Documentation only
- [ ] XRechnung UBL/CII generation
- [ ] Browser app / browser API
- [ ] Browser-local validation
- [ ] Local document extraction
- [ ] Public-sector delivery readiness / transmission metadata
- [ ] XRechnung / KoSIT release cadence
- [ ] KoSIT/Mustang/veraPDF validator workflow
- [ ] ZUGFeRD / Factur-X PDF/A-3

## Safety / privacy checklist

- [ ] I used only synthetic or anonymized invoice data.
- [ ] I did not add invoice-content uploads, telemetry, analytics, hidden persistence, network calls, or live transmission.
- [ ] I did not claim legal certainty, guaranteed compliance, or official validation without concrete validator evidence.
- [ ] Generated XML/PDF artifacts are still described as candidates unless official validation passed.
- [ ] Extracted PDF/DOC/DOCX/TXT values remain human-review-required.
- [ ] Delivery/transmission changes are non-sending unless this PR explicitly scopes credentials, test environment, and safety gates.

## Verification

Paste exact commands and results:

```text
python3 -m pytest -q
node tests/webapp.test.js
```

If official validation is relevant, paste anonymized validator version/report summary only.

## Linked issue

Closes #
