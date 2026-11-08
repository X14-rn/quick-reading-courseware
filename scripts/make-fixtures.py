"""Build deterministic synthetic PDFs and an explicitly synthetic V3 map."""
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "fixtures"
OUT.mkdir(exist_ok=True)


from fixture_pdf import pdf as write_pdf


def pdf(name, pages):
    return write_pdf(OUT, name, pages)


documents = [pdf("waves.pdf", ["Wave speed is frequency times wavelength.", "A wave reflects at a boundary."]),
             pdf("optics.pdf", ["Light waves reflect at an interface."])]
elements = [
    {"id": "E1", "document_id": "waves", "page": 1, "kind": "text", "locator": "Wave speed is frequency times wavelength.", "status": "mapped", "node_ids": ["N2"], "verification": "verified"},
    {"id": "E2", "document_id": "waves", "page": 2, "kind": "text", "locator": "A wave reflects at a boundary.", "status": "mapped", "node_ids": ["N3"], "verification": "verified"},
    {"id": "E3", "document_id": "optics", "page": 1, "kind": "text", "locator": "Light waves reflect at an interface.", "status": "mapped", "node_ids": ["N3"], "verification": "verified"},
]
nodes = [
    {"id": "N1", "parent_id": None, "title": "Wave concepts", "objective": "Explain the supported wave relations and boundary behavior.", "kind": "group", "evidence_ids": []},
    {"id": "N2", "parent_id": "N1", "title": "Relate wave speed, frequency and wavelength", "objective": "Apply the wave speed relation to frequency and wavelength.", "kind": "learning_point", "evidence_ids": ["E1"]},
    {"id": "N3", "parent_id": "N1", "title": "Describe wave reflection at a boundary", "objective": "Identify reflection at a boundary or interface.", "kind": "learning_point", "evidence_ids": ["E2", "E3"]},
]
data = {
    "schema_version": "qr-courseware-map/1.0",
    "project": {"id": "synthetic-waves", "title": "Synthetic wave demonstration", "language": "en", "scope": "synthetic_fixture", "provenance": "synthetic_fixture"},
    "documents": documents,
    "page_inventory": [
        {"document_id": "waves", "page": 1, "inspection": "inspected", "element_ids": ["E1"]},
        {"document_id": "waves", "page": 2, "inspection": "inspected", "element_ids": ["E2"]},
        {"document_id": "optics", "page": 1, "inspection": "inspected", "element_ids": ["E3"]},
    ],
    "source_coverage_register": elements,
    "v1": {"candidate": ["Wave behavior"], "revision": ["Wave relations", "Boundary behavior"], "review_note": "Synthetic example only."},
    "v2": {"nodes": nodes, "reviews": [{"round": 1, "findings": [], "corrections": [], "confirming_pass": False}]},
    "v3": {"nodes": nodes, "references": [
        {"node_id": "N2", "document_id": "waves", "page": 1, "element_ids": ["E1"]},
        {"node_id": "N3", "document_id": "waves", "page": 2, "element_ids": ["E2"]},
        {"node_id": "N3", "document_id": "optics", "page": 1, "element_ids": ["E3"]}], "unresolved_supplements": []},
    "validation": {"status": "incomplete", "coverage_scope": "Synthetic three-occurrence demonstration; not a real course decomposition.",
                   "counts": {"registered": 3, "mapped": 3, "excluded_administrative": 0, "unresolved": 0}, "issues": []},
}
(OUT / "synthetic-valid.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
bad = json.loads(json.dumps(data))
bad["v3"]["references"][0]["page"] = 99
(OUT / "synthetic-invalid-page.json").write_text(json.dumps(bad, indent=2) + "\n", encoding="utf-8")
