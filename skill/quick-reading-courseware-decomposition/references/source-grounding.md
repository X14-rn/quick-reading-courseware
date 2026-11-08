# Source grounding

Rules that keep the map traceable to the exact PDFs. They protect trust in the map; they are not its purpose.

## Identity and pages
- Documents are identified by the SHA-256 of the exact PDF bytes and their physical page count, as produced by `scripts/init-draft.mjs`. Keep upload order; it is the document order everywhere.
- Page numbers are **1-based physical PDF pages**, never printed slide numbers.
- Every physical page has one `pages` entry: `inspected` (page image viewed and its content registered), `pending` (not yet processed) or `unreadable` (could not be read; add a `note`). Parsing the text layer alone never makes a page `inspected`.
- For Office files, convert to PDF first and bind the PDF; mention the conversion in `coverage_scope`.

## Elements (source coverage register)
- One element per distinct substantive occurrence. Identical statements on different pages are separate elements; the same item seen twice because chunks overlapped is one element.
- Stable IDs, for example `d3-p17-e2`. Never reuse an ID for different content.
- `locator` is a compact factual summary of the content, including equations in readable text.
- `kind`: text, equation, figure, table, chart, example, exercise, link, other.
- `verification`: `verified` once compared against the page image. Use `pending` or `unresolved` with an `uncertainty` record (category, affected content, source evidence, attempts) when the reading itself is doubtful.
- Status is derived by `assemble.mjs`. Any element cited by a learning point is `mapped`. Otherwise you must set `excluded_administrative` (title, agenda, references, housekeeping) or `unresolved` (meaning cannot be determined), each with a `note`.

## Citations
- A learning point's `evidence_ids` list every element that supports it, across all pages and documents. Each key point cites the subset supporting it.
- Re-open the cited page whenever a key point states a number, sign, unit or condition, and check it against the image.
- `assemble.mjs` builds `v3.references`: one button per (learning point, document, page), ordered by node, upload order and page.

## Source errata
When the slide content is wrong, inconsistent or misprinted:
1. Register the element as it actually appears (verified).
2. Add an issue to `issues`:
   ```json
   {"severity": "noncritical", "category": "source_erratum", "code": "fibre-na-outside-index",
    "description": "Slide calls NA an angle and drops n₀ in the approximate form.",
    "node_id": "fibre-na", "element_id": "d2-p63-e1",
    "standard_form": "NA = n₀ sin θₐ = √(n₁² − n₂²)"}
   ```
   Include `standard_form` only when the correct form is standard textbook knowledge and unambiguous.
3. Keep the learning point's title, objective and key points clean. The key point may give the standard form when it is unambiguous; otherwise omit the faulty detail.

Errata are never critical. They do not block the map.

## Critical issues (these block)
Use `severity: critical` only for:
- Structural corruption.
- A claim retained in learner text that the sources do not support and that is not a labeled supplement.
- An ambiguity that makes a learning point technically unreliable, for example an equation whose reading cannot be determined at all.

Fix these before export whenever possible.

## Supplements
Supplements are not citations and are never presented as course content. See SKILL.md step 4 and decomposition-guide.md §4.

## Other issue categories
`structure`, `evidence`, `coverage`, `uncertainty` and `other` are for anything else the user should know, such as pages that remain pending or unclear figures. Use `noncritical` unless they meet the critical criteria above.
