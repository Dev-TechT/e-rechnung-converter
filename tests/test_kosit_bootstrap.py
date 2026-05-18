import json
import zipfile
import importlib.util
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "bootstrap_validators.py"
SPEC = importlib.util.spec_from_file_location("bootstrap_validators", SCRIPT_PATH)
bootstrap_validators = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(bootstrap_validators)
bootstrap_kosit = bootstrap_validators.bootstrap_kosit
load_manifest = bootstrap_validators.load_manifest


def make_zip(path: Path, members: dict[str, str]) -> None:
    with zipfile.ZipFile(path, "w") as archive:
        for name, content in members.items():
            archive.writestr(name, content)


def test_bootstrap_downloads_extracts_config_and_writes_manifest(tmp_path):
    source = tmp_path / "source"
    source.mkdir()
    jar = source / "validator-1.6.2-standalone.jar"
    jar.write_bytes(b"PK\x03\x04fake jar content with zip magic")
    config_zip = source / "xrechnung-3.0.2-validator-configuration-2026-01-31.zip"
    make_zip(config_zip, {"scenarios.xml": "<scenarios/>", "schema/readme.txt": "ok"})

    target = tmp_path / "tools" / "kosit"
    manifest = bootstrap_kosit(
        target_dir=target,
        validator_url=jar.as_uri(),
        config_url=config_zip.as_uri(),
        include_visualization=False,
    )

    assert manifest["validator"]["version"] == "1.6.2"
    assert Path(manifest["validator"]["path"]).is_file()
    assert manifest["validator"]["sha256"]
    assert manifest["xrechnung_config"]["version"] == "3.0.2"
    assert Path(manifest["xrechnung_config"]["scenarios_xml"]).is_file()
    assert Path(manifest["manifest_path"]).is_file()

    loaded = load_manifest(Path(manifest["manifest_path"]))
    assert loaded["validator"]["path"] == manifest["validator"]["path"]
    assert loaded["xrechnung_config"]["scenarios_xml"] == manifest["xrechnung_config"]["scenarios_xml"]


def test_bootstrap_rejects_tiny_or_non_zip_validator_download(tmp_path):
    bad_jar = tmp_path / "validator.jar"
    bad_jar.write_bytes(b"not a jar")
    config_zip = tmp_path / "config.zip"
    make_zip(config_zip, {"scenarios.xml": "<scenarios/>"})

    try:
        bootstrap_kosit(
            target_dir=tmp_path / "tools" / "kosit",
            validator_url=bad_jar.as_uri(),
            config_url=config_zip.as_uri(),
            include_visualization=False,
        )
    except RuntimeError as exc:
        assert "validator" in str(exc).lower()
    else:
        raise AssertionError("invalid validator download should be rejected")


def test_bootstrap_requires_scenarios_xml_in_configuration_zip(tmp_path):
    jar = tmp_path / "validator.jar"
    jar.write_bytes(b"PK\x03\x04fake jar content with zip magic")
    bad_config = tmp_path / "config.zip"
    make_zip(bad_config, {"README.txt": "missing scenarios"})

    try:
        bootstrap_kosit(
            target_dir=tmp_path / "tools" / "kosit",
            validator_url=jar.as_uri(),
            config_url=bad_config.as_uri(),
            include_visualization=False,
        )
    except RuntimeError as exc:
        assert "scenarios.xml" in str(exc)
    else:
        raise AssertionError("configuration without scenarios.xml should be rejected")


def test_bootstrap_optionally_installs_visualization(tmp_path):
    jar = tmp_path / "validator.jar"
    jar.write_bytes(b"PK\x03\x04fake jar content with zip magic")
    config_zip = tmp_path / "config.zip"
    make_zip(config_zip, {"scenarios.xml": "<scenarios/>"})
    visualization_zip = tmp_path / "visualization.zip"
    make_zip(visualization_zip, {"xrechnung-html.xsl": "<xsl:stylesheet/>"})

    manifest = bootstrap_kosit(
        target_dir=tmp_path / "tools" / "kosit",
        validator_url=jar.as_uri(),
        config_url=config_zip.as_uri(),
        visualization_url=visualization_zip.as_uri(),
        include_visualization=True,
    )

    assert manifest["visualization"]["installed"] is True
    assert Path(manifest["visualization"]["path"]).is_dir()
    assert manifest["visualization"]["sha256"]
