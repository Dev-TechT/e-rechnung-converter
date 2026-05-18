import json
import sys
from pathlib import Path

from xrechnung_converter.cli import main
from xrechnung_converter.validation import parse_kosit_report


class FakeCompletedProcess:
    def __init__(self, returncode=0, stdout="", stderr=""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


def test_cli_requires_validator_and_scenarios_together(tmp_path, capsys):
    input_path = tmp_path / "invoice.json"
    input_path.write_text(Path("examples/minimal-invoice.json").read_text(encoding="utf-8"), encoding="utf-8")
    output_path = tmp_path / "invoice.xml"

    exit_code = main([str(input_path), "-o", str(output_path), "--kosit-validator", str(tmp_path / "validator.jar")])

    assert exit_code == 2
    payload = json.loads(capsys.readouterr().out)
    assert payload["ok"] is False
    assert "--kosit-validator and --kosit-scenarios" in payload["errors"][0]


def test_cli_runs_kosit_and_returns_generated_report_path(tmp_path, monkeypatch, capsys):
    input_path = tmp_path / "invoice.json"
    input_path.write_text(Path("examples/minimal-invoice.json").read_text(encoding="utf-8"), encoding="utf-8")
    output_path = tmp_path / "invoice.xml"
    validator = tmp_path / "validator.jar"
    validator.write_bytes(b"PK\x03\x04fake jar")
    scenarios = tmp_path / "scenarios.xml"
    scenarios.write_text("<scenarios/>", encoding="utf-8")
    report_dir = tmp_path / "reports"

    def fake_run(cmd, text, capture_output, check):
        assert cmd[:3] == ["java", "-jar", str(validator)]
        assert "-s" in cmd
        assert str(scenarios) in cmd
        assert "-o" in cmd
        assert str(output_path) in cmd
        report_dir.mkdir(parents=True, exist_ok=True)
        (report_dir / "invoice-report.xml").write_text("<validation><summary status='valid'/></validation>", encoding="utf-8")
        return FakeCompletedProcess(returncode=0, stdout="validated", stderr="")

    monkeypatch.setattr("xrechnung_converter.validation.subprocess.run", fake_run)

    exit_code = main([
        str(input_path),
        "-o", str(output_path),
        "--kosit-validator", str(validator),
        "--kosit-scenarios", str(scenarios),
        "--report-dir", str(report_dir),
    ])

    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["ok"] is True
    assert payload["engine"] == "kosit"
    assert payload["report_path"].endswith("invoice-report.xml")


def test_parse_kosit_report_extracts_errors_from_failed_report(tmp_path):
    report = tmp_path / "report.xml"
    report.write_text(
        """<?xml version='1.0'?>
<rep:report xmlns:rep='http://www.xoev.de/de/validator/varl/1'>
  <rep:failed-assert location='/Invoice/cbc:BuyerReference' test='BR-DE-15'>Buyer reference missing</rep:failed-assert>
  <rep:warning location='/Invoice'>Hinweistext</rep:warning>
</rep:report>
""",
        encoding="utf-8",
    )

    errors, warnings = parse_kosit_report(report)

    assert any("BR-DE-15" in error and "Buyer reference missing" in error for error in errors)
    assert any("Hinweistext" in warning for warning in warnings)


def test_parse_kosit_report_extracts_varl_message_levels(tmp_path):
    report = tmp_path / "report.xml"
    report.write_text(
        """<?xml version='1.0'?>
<rep:report xmlns:rep='http://www.xoev.de/de/validator/varl/1' valid='false'>
  <rep:message id='val-sch.2.2' level='error' code='BR-DE-6'>Seller contact telephone number fehlt.</rep:message>
  <rep:message id='val-sch.2.3' level='warning' code='BR-DE-19'>IBAN wirkt falsch.</rep:message>
</rep:report>
""",
        encoding="utf-8",
    )

    errors, warnings = parse_kosit_report(report)

    assert any("BR-DE-6" in error and "telephone" in error for error in errors)
    assert any("BR-DE-19" in warning and "IBAN" in warning for warning in warnings)


def test_cli_surfaces_kosit_report_errors_on_failure(tmp_path, monkeypatch, capsys):
    input_path = tmp_path / "invoice.json"
    input_path.write_text(Path("examples/minimal-invoice.json").read_text(encoding="utf-8"), encoding="utf-8")
    output_path = tmp_path / "invoice.xml"
    validator = tmp_path / "validator.jar"
    validator.write_bytes(b"PK\x03\x04fake jar")
    scenarios = tmp_path / "scenarios.xml"
    scenarios.write_text("<scenarios/>", encoding="utf-8")
    report_dir = tmp_path / "reports"

    def fake_run(cmd, text, capture_output, check):
        report_dir.mkdir(parents=True, exist_ok=True)
        (report_dir / "invoice-report.xml").write_text(
            "<report><failed-assert test='BR-DE-1'>KoSIT sagt nein</failed-assert></report>",
            encoding="utf-8",
        )
        return FakeCompletedProcess(returncode=1, stdout="invalid", stderr="")

    monkeypatch.setattr("xrechnung_converter.validation.subprocess.run", fake_run)

    exit_code = main([
        str(input_path),
        "-o", str(output_path),
        "--kosit-validator", str(validator),
        "--kosit-scenarios", str(scenarios),
        "--report-dir", str(report_dir),
    ])

    assert exit_code == 2
    payload = json.loads(capsys.readouterr().out)
    assert payload["ok"] is False
    assert payload["report_path"].endswith("invoice-report.xml")
    assert any("KoSIT sagt nein" in error for error in payload["errors"])
