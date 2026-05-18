from xrechnung_converter.cli import build_parser
from xrechnung_converter.formats import list_output_formats


def test_cli_exposes_output_format_choices():
    parser = build_parser()
    help_text = parser.format_help()
    format_ids = {fmt.id for fmt in list_output_formats()}

    assert "--output-format" in help_text
    for expected in ["xrechnung-ubl", "xrechnung-cii", "zugferd-pdf", "factur-x-pdf", "ubl"]:
        assert expected in format_ids
        assert expected in help_text


def test_cli_mentions_local_validation_plan_flag():
    parser = build_parser()
    help_text = parser.format_help()

    assert "--print-validation-plan" in help_text
