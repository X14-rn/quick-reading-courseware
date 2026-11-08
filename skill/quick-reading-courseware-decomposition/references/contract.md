# Formats

## Working draft (`draft.json`, `qr-draft/1`)

Authored by the model, started by `scripts/init-draft.mjs`, turned into the export by `scripts/assemble.mjs`. See `tests/fixtures/synthetic-draft-1.1.json` for a complete small example.

| Field | Content |
|---|---|
| `project` | `id`, `title`, `language` (confirmed), `scope` (`full_source` / `representative_subset` / `synthetic_fixture`), `provenance` (`ai_reviewed`) |
| `documents[]` | From init-draft: `id`, `filename`, `pdf_sha256`, `page_count`, in upload order. Do not edit. |
| `pages[]` | `document_id`, `page`, `inspection` (`inspected` / `pending` / `unreadable`), optional `note` |
| `elements[]` | `id`, `document_id`, `page`, `kind`, `locator`, `verification`, optional `uncertainty`, and for uncited elements `status` (`excluded_administrative` / `unresolved`) plus `note`. Do not write `node_ids`. |
| `v1` | `candidate[]`, `revision[]` (scaffold lines), `review_note` |
| `nodes[]` | See below. Parent order = sibling order. |
| `reviews[]` | `round`, `findings[]`, `corrections[]`, `confirming_pass` |
| `issues[]` | `severity`, `code`, `description`, optional `category`, `node_id`, `element_id`, `standard_form` (errata only) |
| `coverage_scope` | Plain statement of what was actually inspected and any assumption made |
| `requested_status` | Optional `incomplete` to prevent automatic `complete` |

### Node
```json
{"id": "fibre-na", "parent_id": "fibre-guidance", "kind": "learning_point",
 "title": "Acceptance angle and NA",
 "objective": "Calculate the numerical aperture and acceptance angle of a step-index fibre.",
 "importance": "core",
 "evidence_ids": ["d2-p62-e1", "d2-p63-e1"],
 "key_points": [
   {"kind": "equation", "text": "NA = n₀ sin θₐ = √(n₁² − n₂²); n₁ core, n₂ cladding, n₀ outside index; θₐ max acceptance angle", "element_ids": ["d2-p63-e1"]},
   {"kind": "fact", "text": "Rays launched within ±θₐ are guided by total internal reflection.", "element_ids": ["d2-p62-e1"]}
 ],
 "supplements": [{"purpose": "intuition", "text": "A larger index contrast means a wider acceptance cone, so light is easier to couple in."}]}
```
- `kind`: `group` (has children, no evidence, no key points, no importance) or `learning_point` (no children; needs evidence, `importance` and ≥ 1 key point).
- `key_points`: ≤ 8, each ≤ 500 characters, `kind` ∈ definition, equation, condition, fact, procedure, comparison, example, caution. Their `element_ids` must be in the node's `evidence_ids`.
- `supplements`: ≤ 3, `purpose` ∈ bridge, definition, intuition, context. Uncited by design.
- Optional `uncertainty`: `category` (extraction, identity, interpretation, coverage, contradiction, other), `affected_content`, `source_evidence`, `attempts[]`.

## Export (`qr-courseware-map/1.1`)
Normative schema: [qr-courseware-map-1.1.schema.json](qr-courseware-map-1.1.schema.json). It is a superset of 1.0, and the viewer reads both versions. `assemble.mjs` writes:
- **`source_coverage_register`:** derived `status` and `node_ids`.
- **`page_inventory`:** derived `element_ids`.
- **`v2`:** your nodes and reviews.
- **`v3`:** an exact copy of the nodes, plus derived `references` and `unresolved_supplements`.
- **`validation`:** derived `status` and `counts`; your `coverage_scope` and `issues`.

Cross-record rules (enforced by `scripts/relations.mjs`, shared with the viewer):
- **Identity:** IDs are unique and document hashes distinct. Every physical page appears exactly once. Page and element links are reciprocal.
- **Tree:** exactly one root, no cycles, leaves are learning points, groups have children.
- **Evidence:** evidence links are reciprocal; every evidence item is reachable through a page reference; references are ordered.
- **Counts and status:** counts match the register. `complete` and `blocked` follow SKILL.md. Source errata are noncritical.
- **Version gating:** the 1.1 fields are present only when the version is 1.1.

## Deliberate changes from the earlier DS-001–DS-072 baseline
[approved-baseline.md](approved-baseline.md) records the original requirements and remains background. Changes agreed with the user on 2026-11-01:
1. **Learning quality is the stated goal,** measured by the rubric. Source fidelity remains a hard precondition.
2. **Leaves carry cited `key_points` and an `importance` label** (schema 1.1).
3. **Reliable standard-knowledge `supplements` are allowed,** clearly separated and labeled. This relaxes DS-022 and DS-034.
4. **Slide errata are noncritical `source_erratum` issues,** with an optional `standard_form`. They no longer block completion.
5. **Bookkeeping is derived by scripts** instead of maintained by the model. The separate run sidecar (`run.json`, checkpoint manifests) is replaced by the draft file plus the `reviews` log.
