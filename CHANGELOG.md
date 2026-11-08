# Changelog

## 1.0.0 — 2026-11-08

First public release.

**Decomposition skill (v3)**
- Quality-first workflow: source register → concept inventory → structure design → atomic learning points → review rounds → validated export.
- Schema `qr-courseware-map/1.1`: importance labels, cited key points, labelled supplements, source-erratum issues with standard forms.
- Scripts: `init-draft`, `assemble`, `validate-export` (with PDF hash/page checks), `quality-check`, `outline`.
- PDF page counts need no Python: a built-in parser (`pdf-pages.mjs`) reads the page tree, including compressed object streams; pypdf / pdfinfo are only a fallback.

**Viewer (v2)**
- Compact single-line cards; columns stay fixed when branches open; learning-point count in the status bar.
- Keyboard: arrows, Enter, F (full screen), +/−, Ctrl+Enter.
- Resizable side panel, details/preview split and study panel; pin / auto-hide in normal and full-screen mode.
- Full-screen reader fits whole pages; optional page-locked translation | original view (`AA_tr.pdf`).
- Notes with export/import, saved sessions, search with match navigation.
- Local server and Windows desktop launcher.
