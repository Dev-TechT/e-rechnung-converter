from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import urlparse

VALIDATOR_VERSION = "1.6.2"
XRECHNUNG_CONFIG_VERSION = "3.0.2"
XRECHNUNG_RELEASE_DATE = "2026-01-31"

VALIDATOR_FILENAME = f"validator-{VALIDATOR_VERSION}-standalone.jar"
CONFIG_FILENAME = f"xrechnung-{XRECHNUNG_CONFIG_VERSION}-validator-configuration-{XRECHNUNG_RELEASE_DATE}.zip"
VISUALIZATION_FILENAME = f"xrechnung-{XRECHNUNG_CONFIG_VERSION}-visualization-{XRECHNUNG_RELEASE_DATE}.zip"

DEFAULT_VALIDATOR_URL = (
    "https://github.com/itplr-kosit/validator/releases/download/"
    f"v{VALIDATOR_VERSION}/{VALIDATOR_FILENAME}"
)
DEFAULT_CONFIG_URL = (
    "https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/"
    f"v{XRECHNUNG_RELEASE_DATE}/{CONFIG_FILENAME}"
)
DEFAULT_VISUALIZATION_URL = (
    "https://github.com/itplr-kosit/xrechnung-visualization/releases/download/"
    f"v{XRECHNUNG_RELEASE_DATE}/{VISUALIZATION_FILENAME}"
)

MANIFEST_FILENAME = "manifest.json"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _copy_file_url(url: str, destination: Path) -> None:
    parsed = urlparse(url)
    source = Path(urllib.request.url2pathname(parsed.path))
    if not source.is_file():
        raise RuntimeError(f"Download source does not exist: {source}")
    shutil.copyfile(source, destination)


def download_file(url: str, destination: Path, *, retries: int = 3, timeout: int = 60) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        tmp_path = destination.with_name(f".{destination.name}.part")
        try:
            if tmp_path.exists():
                tmp_path.unlink()
            if urlparse(url).scheme == "file":
                _copy_file_url(url, tmp_path)
            else:
                request = urllib.request.Request(url, headers={"User-Agent": "xrechnung-converter-bootstrap/0.1"})
                with urllib.request.urlopen(request, timeout=timeout) as response, tmp_path.open("wb") as handle:
                    shutil.copyfileobj(response, handle)
            if not tmp_path.is_file() or tmp_path.stat().st_size == 0:
                raise RuntimeError(f"Empty download: {url}")
            tmp_path.replace(destination)
            return destination
        except (OSError, urllib.error.URLError, RuntimeError) as exc:
            last_error = exc
            if tmp_path.exists():
                tmp_path.unlink()
            if attempt < retries:
                time.sleep(1.5 * attempt)
    raise RuntimeError(f"Could not download {url}: {last_error}")


def assert_jar(path: Path, label: str = "validator") -> None:
    if not path.is_file():
        raise RuntimeError(f"Missing {label}: {path}")
    with path.open("rb") as handle:
        magic = handle.read(4)
    if magic != b"PK\x03\x04":
        raise RuntimeError(f"Downloaded {label} is not a JAR/ZIP file: {path}")


def assert_zip(path: Path, label: str) -> None:
    if not path.is_file():
        raise RuntimeError(f"Missing {label}: {path}")
    if not zipfile.is_zipfile(path):
        raise RuntimeError(f"Downloaded {label} is not a valid ZIP file: {path}")


def safe_extract_zip(zip_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    root = destination.resolve()
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            target = (destination / member.filename).resolve()
            if root != target and root not in target.parents:
                raise RuntimeError(f"Unsafe ZIP member outside target directory: {member.filename}")
        archive.extractall(destination)


def find_file(root: Path, filename: str) -> Path | None:
    matches = sorted(root.rglob(filename))
    return matches[0] if matches else None


def load_manifest(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_manifest(target_dir: Path, manifest: dict[str, object]) -> Path:
    manifest_path = target_dir / MANIFEST_FILENAME
    manifest["manifest_path"] = str(manifest_path)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest_path


def bootstrap_kosit(
    *,
    target_dir: Path = Path("tools/kosit"),
    validator_url: str = DEFAULT_VALIDATOR_URL,
    config_url: str = DEFAULT_CONFIG_URL,
    visualization_url: str = DEFAULT_VISUALIZATION_URL,
    include_visualization: bool = False,
) -> dict[str, object]:
    target_dir = Path(target_dir)
    downloads_dir = target_dir / "downloads"
    config_dir = target_dir / "xrechnung-config"
    visualization_dir = target_dir / "xrechnung-visualization"
    target_dir.mkdir(parents=True, exist_ok=True)

    validator_path = target_dir / VALIDATOR_FILENAME
    config_zip_path = downloads_dir / CONFIG_FILENAME
    visualization_zip_path = downloads_dir / VISUALIZATION_FILENAME

    download_file(validator_url, validator_path)
    assert_jar(validator_path, "validator")

    download_file(config_url, config_zip_path)
    assert_zip(config_zip_path, "XRechnung configuration")
    if config_dir.exists():
        shutil.rmtree(config_dir)
    safe_extract_zip(config_zip_path, config_dir)
    scenarios_xml = find_file(config_dir, "scenarios.xml")
    if scenarios_xml is None:
        raise RuntimeError(f"XRechnung configuration ZIP did not contain scenarios.xml: {config_zip_path}")

    visualization: dict[str, object] = {"installed": False}
    if include_visualization:
        download_file(visualization_url, visualization_zip_path)
        assert_zip(visualization_zip_path, "XRechnung visualization")
        if visualization_dir.exists():
            shutil.rmtree(visualization_dir)
        safe_extract_zip(visualization_zip_path, visualization_dir)
        visualization = {
            "installed": True,
            "version": XRECHNUNG_CONFIG_VERSION,
            "release_date": XRECHNUNG_RELEASE_DATE,
            "archive_path": str(visualization_zip_path),
            "path": str(visualization_dir),
            "sha256": sha256_file(visualization_zip_path),
            "source_url": visualization_url,
        }

    manifest: dict[str, object] = {
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "KoSIT public GitHub release assets",
        "target_dir": str(target_dir),
        "validator": {
            "version": VALIDATOR_VERSION,
            "path": str(validator_path),
            "sha256": sha256_file(validator_path),
            "source_url": validator_url,
        },
        "xrechnung_config": {
            "version": XRECHNUNG_CONFIG_VERSION,
            "release_date": XRECHNUNG_RELEASE_DATE,
            "archive_path": str(config_zip_path),
            "path": str(config_dir),
            "scenarios_xml": str(scenarios_xml),
            "sha256": sha256_file(config_zip_path),
            "source_url": config_url,
        },
        "visualization": visualization,
    }
    write_manifest(target_dir, manifest)
    return manifest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Bootstrap local KoSIT validator assets for xrechnung-converter.")
    parser.add_argument("--target-dir", default="tools/kosit", help="Target directory for KoSIT assets")
    parser.add_argument("--validator-url", default=DEFAULT_VALIDATOR_URL, help="KoSIT validator JAR URL")
    parser.add_argument("--config-url", default=DEFAULT_CONFIG_URL, help="validator-configuration-xrechnung ZIP URL")
    parser.add_argument("--visualization-url", default=DEFAULT_VISUALIZATION_URL, help="xrechnung-visualization ZIP URL")
    parser.add_argument("--include-visualization", action="store_true", help="Also download and extract xrechnung-visualization")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        manifest = bootstrap_kosit(
            target_dir=Path(args.target_dir),
            validator_url=args.validator_url,
            config_url=args.config_url,
            visualization_url=args.visualization_url,
            include_visualization=args.include_visualization,
        )
    except RuntimeError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2
    print(json.dumps({"ok": True, "manifest": manifest}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
