from pathlib import Path

from xrechnung_converter.cli import build_parser


def test_cli_help_calls_output_a_candidate_until_official_validation_passes():
    parser = build_parser()
    help_text = parser.format_help()

    assert "XRechnung candidate" in help_text
    assert "official KoSIT validation" in help_text
    assert "Output XRechnung UBL XML path" not in help_text
