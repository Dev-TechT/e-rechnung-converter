#!/usr/bin/env python3
"""Generate a browser-loadable XRechnung BT/BG field catalog from the CIUS model.

The generated catalog contains only public model metadata from the official
XRechnung bundle. It must never include invoice samples or private data.
"""
from __future__ import annotations

import argparse
import json
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from typing import Any

NS = {"m": "http://semo-xml.org/2025/model"}
BUNDLE_NAME = "xrechnung-3.0.2-bundle-2026-01-31.zip"
DEFAULT_MODEL = Path(
    "private-samples/xrechnung-bundle/"
    "xrechnung-3.0.2-xrechnung-model-2026-01-31/model/"
    "xrechnung-cius-model.xml"
)
DEFAULT_OUTPUT = Path("web/xrechnung-field-catalog.js")

PRODUCT_GROUPS = [
    {
        "key": "references",
        "label": "Referenzen",
        "description": "Projekt, Vertrag, Bestellung, Versand-/Empfangsavis, Ausschreibung/Los und Buchungsreferenzen.",
        "groups": ["BG-3"],
        "terms": ["BT-10", "BT-11", "BT-12", "BT-13", "BT-14", "BT-15", "BT-16", "BT-17", "BT-18", "BT-19"],
    },
    {
        "key": "parties",
        "label": "Parteien",
        "description": "Verkäufer, Erwerber, Zahlungsempfänger, Steuervertreter, Adressen, IDs und Kontakte.",
        "groups": ["BG-4", "BG-5", "BG-6", "BG-7", "BG-8", "BG-9", "BG-10", "BG-11", "BG-12"],
        "terms": ["BT-27", "BT-34", "BT-41", "BT-44", "BT-49", "BT-56", "BT-59", "BT-62"],
    },
    {
        "key": "delivery",
        "label": "Lieferung",
        "description": "Lieferinformationen, Lieferort, Lieferanschrift und Liefer-/Leistungsdatum.",
        "groups": ["BG-13", "BG-14", "BG-15"],
        "terms": ["BT-70", "BT-71", "BT-72", "BT-73", "BT-74"],
    },
    {
        "key": "payment",
        "label": "Zahlung",
        "description": "Zahlungsbedingungen, Zahlungsart, Verwendungszweck, Konto, BIC und Lastschrift-/Kartendaten.",
        "groups": ["BG-16", "BG-17", "BG-18", "BG-19"],
        "terms": ["BT-9", "BT-20", "BT-81", "BT-83", "BT-84", "BT-85", "BT-86", "BT-89", "BT-90", "BT-91"],
    },
    {
        "key": "allowances-charges",
        "label": "Zu-/Abschläge",
        "description": "Dokument- und Positionsabschläge/-zuschläge mit Basisbetrag, Prozent, Grund und Steuerkategorie.",
        "groups": ["BG-20", "BG-21", "BG-27", "BG-28"],
        "terms": ["BT-92", "BT-93", "BT-94", "BT-95", "BT-96", "BT-97", "BT-98", "BT-99", "BT-100", "BT-101", "BT-102", "BT-103", "BT-104", "BT-105", "BT-136", "BT-141"],
    },
    {
        "key": "taxes",
        "label": "Steuern",
        "description": "Mehrere Umsatzsteuer-Breakdowns, Kategoriecodes, Sätze, Befreiungsgründe und VATEX-Codes.",
        "groups": ["BG-23"],
        "terms": ["BT-110", "BT-111", "BT-116", "BT-117", "BT-118", "BT-119", "BT-120", "BT-121"],
    },
    {
        "key": "lines-advanced",
        "label": "Positionen erweitert",
        "description": "Positionsnotizen, Zeiträume, Preise, Mengen, Artikel-IDs, Klassifikation, Herkunft und Attribute.",
        "groups": ["BG-25", "BG-26", "BG-27", "BG-28", "BG-29", "BG-30", "BG-31", "BG-32"],
        "terms": ["BT-126", "BT-127", "BT-129", "BT-130", "BT-131", "BT-146", "BT-149", "BT-153", "BT-154", "BT-158", "BT-159", "BT-160", "BT-161"],
    },
    {
        "key": "attachments",
        "label": "Anhänge",
        "description": "Rechnungsbegründende Unterlagen, externe Dokumentreferenzen und eingebettete Anhänge.",
        "groups": ["BG-24"],
        "terms": ["BT-122", "BT-123", "BT-124", "BT-125"],
    },
]


def text_of(parent: ET.Element, tag: str) -> str:
    found = parent.find(f"m:{tag}", NS)
    if found is None:
        return ""
    text = " ".join("".join(found.itertext()).split())
    return text.strip()


def collect_structure(message: ET.Element, path: list[str], occurrences: dict[str, dict[str, Any]], children: dict[str, list[str]]) -> None:
    for child in list(message):
        local = child.tag.split("}")[-1]
        ref = child.attrib.get("ref")
        if not ref:
            continue
        min_occurs = child.attrib.get("min-occurs", "1")
        max_occurs = child.attrib.get("max-occurs", "1")
        # required means min-occurs > 0 at the term's immediate parent in the
        # semantic tree. For product UI this is catalog metadata, not a promise
        # that a field is globally mandatory in every invoice context.
        required = min_occurs != "0"
        parent = path[-1] if path else "INVOICE"
        occurrences.setdefault(ref, {"required": False, "parents": set(), "minOccurs": min_occurs, "maxOccurs": max_occurs})
        occurrences[ref]["required"] = occurrences[ref]["required"] or required
        occurrences[ref]["parents"].add(parent)
        occurrences[ref]["minOccurs"] = min_occurs
        occurrences[ref]["maxOccurs"] = max_occurs
        children[parent].append(ref)
        if local == "group":
            collect_structure(child, path + [ref], occurrences, children)


def term_sort_key(term: dict[str, Any]) -> tuple[int, int, str]:
    match = re.match(r"(BT|BG)-(\d+)$", term["id"])
    if not match:
        return (9, 0, term["id"])
    family = 0 if match.group(1) == "BT" else 1
    return (family, int(match.group(2)), term["id"])


def generate(model_path: Path) -> dict[str, Any]:
    root = ET.parse(model_path).getroot()
    definitions = root.find("m:definitions", NS)
    structure = root.find("m:structures/m:structure[@id='invoice']/m:message", NS)
    if definitions is None or structure is None:
        raise SystemExit("XRechnung model is missing definitions or invoice structure")

    occurrences: dict[str, dict[str, Any]] = {}
    children: dict[str, list[str]] = defaultdict(list)
    collect_structure(structure, [], occurrences, children)

    terms = []
    groups = []
    for element in definitions.findall("m:term", NS):
        term_id = element.attrib["id"]
        info = occurrences.get(term_id, {"required": False, "parents": set(), "minOccurs": "0", "maxOccurs": "1"})
        item = {
            "id": term_id,
            "kind": term_id.split("-", 1)[0],
            "name": text_of(element, "name"),
            "datatype": element.attrib.get("datatype", ""),
            "description": text_of(element, "description"),
            "required": bool(info["required"]),
            "minOccurs": info["minOccurs"],
            "maxOccurs": info["maxOccurs"],
            "parents": sorted(info["parents"]),
        }
        if term_id in children:
            item["children"] = children[term_id]
        codelist = element.find("m:codelist", NS)
        if codelist is not None and codelist.attrib.get("ref"):
            item["codelist"] = codelist.attrib["ref"]
        if item["kind"] == "BG":
            groups.append(item)
        terms.append(item)

    terms.sort(key=term_sort_key)
    groups.sort(key=term_sort_key)
    required = [term for term in terms if term["required"]]

    by_id = {term["id"]: term for term in terms}
    product_groups = []
    for group in PRODUCT_GROUPS:
        entries = []
        for ref in group["groups"] + group["terms"]:
            if ref in by_id:
                entries.append({
                    "id": ref,
                    "name": by_id[ref]["name"],
                    "kind": by_id[ref]["kind"],
                    "required": by_id[ref]["required"],
                })
        product_groups.append({**group, "entries": entries, "status": "catalog-first"})

    return {
        "meta": {
            "source": "xrechnung-cius-model.xml",
            "bundle": BUNDLE_NAME,
            "modelShortName": root.findtext("m:meta/m:short-name", default="", namespaces=NS),
            "modelDate": root.findtext("m:meta/m:date", default="", namespaces=NS),
            "termCount": len(terms),
            "groupCount": len(groups),
            "requiredTermCount": len(required),
            "privateDataIncluded": False,
            "note": "Generated from official XRechnung CIUS model metadata; export support is still added progressively.",
        },
        "terms": terms,
        "groups": groups,
        "requiredTerms": required,
        "productGroups": product_groups,
    }


def write_js(catalog: dict[str, Any], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(catalog, ensure_ascii=False, indent=2)
    output.write_text(
        "// Generated by scripts/generate_xrechnung_field_catalog.py. Do not edit manually.\n"
        "// Public XRechnung model metadata only; no invoice samples or private data.\n"
        "(function (root, factory) {\n"
        "  const catalog = factory();\n"
        "  if (typeof module === 'object' && module.exports) module.exports = catalog;\n"
        "  root.XRECHNUNG_FIELD_CATALOG = catalog;\n"
        "})(typeof globalThis !== 'undefined' ? globalThis : window, function () {\n"
        "  'use strict';\n"
        f"  return {payload};\n"
        "});\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    catalog = generate(args.model)
    write_js(catalog, args.output)
    print(f"wrote {args.output} ({catalog['meta']['termCount']} terms, {catalog['meta']['groupCount']} groups)")


if __name__ == "__main__":
    main()
