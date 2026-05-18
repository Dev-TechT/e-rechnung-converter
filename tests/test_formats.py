from xrechnung_converter.formats import (
    OutputFormat,
    ValidationEngine,
    get_output_format,
    list_output_formats,
)


def test_supported_output_formats_include_user_choices():
    ids = {fmt.id for fmt in list_output_formats()}

    assert "xrechnung-ubl" in ids
    assert "xrechnung-cii" in ids
    assert "zugferd-pdf" in ids
    assert "factur-x-pdf" in ids
    assert "ubl" in ids


def test_xrechnung_ubl_validation_is_local_kosit():
    fmt = get_output_format("xrechnung-ubl")

    assert fmt.container == "xml"
    assert fmt.syntax == "ubl"
    assert fmt.local_only_capable is True
    assert fmt.primary_validation == ValidationEngine.KOSIT
    assert "KoSIT" in " ".join(step.tool for step in fmt.validation_steps)


def test_factur_x_pdf_requires_pdfa_and_xml_validation():
    fmt = get_output_format("factur-x-pdf")
    tools = {step.tool for step in fmt.validation_steps}

    assert fmt.container == "pdf-a-3"
    assert fmt.syntax == "cii"
    assert fmt.primary_validation == ValidationEngine.MUSTANG
    assert "veraPDF" in tools
    assert "Mustangproject" in tools
    assert fmt.local_only_capable is True


def test_unknown_format_raises_clear_error():
    try:
        get_output_format("unknown")
    except ValueError as exc:
        assert "Unsupported output format" in str(exc)
    else:
        raise AssertionError("expected ValueError")
