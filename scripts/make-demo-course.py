"""Generate the synthetic demo course used by the tests and the README screenshot.

Outputs (deterministic, re-runnable):
  fixtures/demo-laser-optics.pdf       45 slides written for this repository
  fixtures/demo-laser-optics_tr.pdf    a demo "translation" (slide titles in Chinese)
  fixtures/demo-laser-optics.draft.json  skill draft (qr-draft/1)
  fixtures/demo-laser-optics.json      qr-courseware-map/1.1, built with the skill's assemble.mjs

Requires: Python 3 with reportlab (pip install reportlab), Node.js 22.
Run from the repository root:  python scripts/make-demo-course.py
"""
import hashlib, json, subprocess, sys
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.utils import simpleSplit

sys.path.insert(0, str(Path(__file__).parent))
from demo_course import TITLE, SUBTITLE, CHAPTERS, ERRATA

ROOT = Path(__file__).resolve().parents[1]
FIX = ROOT / "fixtures"
SKILL = ROOT / "skill" / "quick-reading-courseware-decomposition"
W, H = 960, 540
NAME = "demo-laser-optics"
pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
SANS = "Helvetica"


def slides():
    """[(kind, title, title_zh, bullets, leaf_id)] in page order."""
    out = [("title", TITLE, "材料加工中的激光光学", [SUBTITLE, "Synthetic course written for testing and demonstration."], None)]
    for cid, ctitle, ctitle_zh, _obj, leaves in CHAPTERS:
        out.append(("divider", ctitle, ctitle_zh, [], cid))
        for lid, title, title_zh, _o, _i, bullets, _k, _s in leaves:
            out.append(("leaf", title, title_zh, bullets, lid))
    return out


def draw(path, pages, translated):
    c = canvas.Canvas(str(path), pagesize=(W, H), invariant=1)
    c.setTitle(("Demo translation — " if translated else "") + TITLE)
    for n, (kind, title, title_zh, bullets, _id) in enumerate(pages, 1):
        c.setFillColorRGB(0.07, 0.16, 0.27); c.rect(0, H - 70, W, 70, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        if translated:
            c.setFont("STSong-Light", 28); c.drawString(40, H - 48, title_zh)
        else:
            c.setFont(SANS + "-Bold", 26); c.drawString(40, H - 48, title)
        c.setFillColorRGB(0.1, 0.1, 0.1)
        y = H - 120
        if kind == "divider":
            c.setFont(SANS, 20); c.drawString(40, y, "Chapter" if not translated else "")
            if translated: c.setFont("STSong-Light", 20); c.drawString(40, y, "章节")
        if translated and kind == "leaf":
            c.setFont("STSong-Light", 15); c.setFillColorRGB(0.45, 0.3, 0.1)
            c.drawString(40, y, "（演示翻译：本页仅翻译标题，要点保留英文）"); y -= 34; c.setFillColorRGB(0.1, 0.1, 0.1)
        for item in bullets:
            kind_b, text = item if isinstance(item, tuple) else ("text", item)
            font, size = (SANS + "-Oblique", 19) if kind_b == "equation" else (SANS, 19)
            prefix = {"figure": "[Figure] ", "table": "[Table] ", "example": "Example: "}.get(kind_b, "• ")
            lines = simpleSplit(prefix + text, font, size, W - 100)
            c.setFont(font, size)
            for line in lines:
                c.drawString(50, y, line); y -= 27
            y -= 14
        c.setFont(SANS, 10); c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(40, 20, "Laser Optics Primer — synthetic demo, MIT licensed"); c.drawRightString(W - 40, 20, str(n))
        c.showPage()
    c.save()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    pages = slides()
    pdf, tr = FIX / f"{NAME}.pdf", FIX / f"{NAME}_tr.pdf"
    draw(pdf, pages, False); draw(tr, pages, True)
    doc = {"id": "demo", "filename": pdf.name, "pdf_sha256": sha(pdf), "page_count": len(pages)}
    elements, nodes, page_of = [], [], {}
    for n, (kind, title, _zh, bullets, ident) in enumerate(pages, 1):
        if kind != "leaf":
            elements.append({"id": f"p{n:02d}-a", "document_id": "demo", "page": n, "kind": "other", "locator": f"{kind.capitalize()} slide: {title}.",
                             "verification": "verified", "status": "excluded_administrative", "note": "Title or chapter divider; no learning content."})
            continue
        page_of[ident] = n
        for i, (bkind, text) in enumerate(bullets, 1):
            elements.append({"id": f"p{n:02d}-{i}", "document_id": "demo", "page": n,
                             "kind": bkind if bkind in ("text", "equation", "figure", "table") else "text",
                             "locator": text, "verification": "verified"})
    nodes.append({"id": "demo", "parent_id": None, "title": TITLE, "kind": "group", "evidence_ids": [],
                  "objective": "Explain how lasers work and how their beams are conditioned and delivered for material processing."})
    for cid, ctitle, _zh, cobj, leaves in CHAPTERS:
        nodes.append({"id": cid, "parent_id": "demo", "title": ctitle, "objective": cobj, "kind": "group", "evidence_ids": []})
        for lid, title, _tzh, obj, imp, bullets, kps, supps in leaves:
            p = page_of[lid]
            ids = [f"p{p:02d}-{i}" for i in range(1, len(bullets) + 1)]
            node = {"id": lid, "parent_id": cid, "title": title, "objective": obj, "kind": "learning_point", "evidence_ids": ids,
                    "importance": imp, "key_points": [{"kind": k, "text": t, "element_ids": [ids[j] for j in idx]} for k, t, idx in kps]}
            if supps: node["supplements"] = [{"purpose": pu, "text": t} for pu, t in supps]
            nodes.append(node)
    issues = [{"severity": "noncritical", "code": code, "category": "source_erratum", "description": desc,
               "node_id": lid, "element_id": f"p{page_of[lid]:02d}-{b + 1}", "standard_form": std} for lid, b, code, desc, std in ERRATA]
    draft = {"draft_version": "qr-draft/1",
             "project": {"id": "demo-laser-optics", "title": "Laser Optics Primer (synthetic demo)", "language": "en",
                         "scope": "synthetic_fixture", "provenance": "synthetic_fixture"},
             "documents": [doc],
             "pages": [{"document_id": "demo", "page": n, "inspection": "inspected"} for n in range(1, len(pages) + 1)],
             "elements": elements,
             "v1": {"candidate": [c[1] for c in CHAPTERS], "revision": [c[1] for c in CHAPTERS],
                    "review_note": "Synthetic demo course; structure written directly in learning order."},
             "nodes": nodes,
             "reviews": [{"round": 1, "findings": ["Synthetic demo: content written for this repository; checked against the slides."], "corrections": [], "confirming_pass": False},
                         {"round": 2, "findings": ["Confirming pass: no change needed."], "corrections": [], "confirming_pass": True}],
             "issues": issues,
             "coverage_scope": "Synthetic demo course written for this repository (45 slides); not real course material."}
    draft_path = FIX / f"{NAME}.draft.json"
    draft_path.write_text(json.dumps(draft, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    subprocess.run(["node", str(SKILL / "scripts" / "assemble.mjs"), str(draft_path), "--out", str(FIX / f"{NAME}.json")], check=True)
    print(f"{pdf.name}: {len(pages)} pages, sha256 {doc['pdf_sha256'][:12]}…; map written to fixtures/{NAME}.json")


if __name__ == "__main__":
    main()
