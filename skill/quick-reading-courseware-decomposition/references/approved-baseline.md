# Quick Reading of Courseware — Decomposition Skill
## Consolidated specification, requirements audit, phased implementation plan, and Work-mode brief

**Baseline:** Decomposition Skill DS-001–DS-072; application requirements FR-001–FR-051  
**Status:** Requirements elicitation closed; ready for implementation design.  
**Scope note:** This document consolidates the confirmed decisions available in the conversation; wording is normalized for implementation and is not a verbatim transcript of every prior choice.

---

## 1. Executive decision

Proceed to Work mode after using this document as the implementation baseline. Do **not** reopen one-by-one requirements discovery. Resolve engineering choices using the principles and acceptance tests below; request user input only for genuinely consequential product choices that cannot be inferred. Build a thin, testable, end-to-end vertical slice before adding optimization and resilience. Do not promise guaranteed perfect extraction or completeness from arbitrary documents: instrument and verify it, report unresolved items, and block successful completion on critical failures.

### Objective

Given multiple PDFs, PPT/PPTX, and DOCX STEM learning materials, identify a coherent subject, construct a discipline-informed initial framework (V1), extract and trace substantive source elements, reconstruct a fully source-grounded learning hierarchy (V2), iteratively evaluate it, and attach original physical-page reference nodes and validate (V3). The final tree supports progressive learning, easy source verification, and transparent uncertainty reporting.

### Primary deliverables
1. **V1**: initial general disciplinary hierarchy (knowledge beyond documents permitted at this stage), followed by one structured revision.
2. **Source Coverage Register (SCR)**: stable records for substantive source elements, extraction evidence, locations, identity, verification, uncertainties, and mappings.
3. **V2**: conceptual parent–child learning hierarchy comprising only independently meaningful learning objectives supported by uploaded source content; with hidden learning-objective metadata.
4. **V3**: validated V2 preserving its conceptual nodes, adding document/page reference navigation at terminal points and separate unresolved-supplement navigation.
5. **Machine-readable results**: hierarchy, source mappings, audit report, correction history, configuration, and checkpoint metadata.
6. **Application integration**: interactive left-to-right mind map, page preview, full converted PDF viewer, save/edit/search/export/backup through the wider product.

## 2. Non-negotiable invariants

- **Source boundary**: General knowledge may form V1, but no unsupported knowledge may survive in V2/V3. Domain knowledge may aid interpretation and organization, not invent source claims or missing prerequisites.
- **Completeness**: Every substantive identifiable source element must be captured or explicitly tracked as unresolved; percentage coverage is diagnostic, never a substitute for full accounting. Unresolved elements cannot silently disappear.
- **Traceability**: Each source element has a persistent identity and original document/1-based physical-page provenance. Each retained knowledge claim must be substantively supported by its linked source material.
- **Pedagogical granularity**: Terminal knowledge points correspond to meaningful independent learning goals, not to arbitrary pages, figure counts, intermediate algebra, or cosmetic chapter headings.
- **Hierarchy**: Conceptual relationships are parent–child only. Repetition across different meaningful conceptual contexts is allowed; redundant duplication within the same branch is corrected.
- **Validation**: A V2 convergence decision requires mandatory tests and a stable confirming review; V3 critical failures block *successful finalization*, with an actionable diagnostic report.
- **No fake precision**: Do not invent missing information, citations, corrections, mappings, confidence calibration, or certainty.
- **Recoverability**: Save and reuse validated stage outputs, subject to schema, source, configuration, and consistency checks.

## 3. Consolidated requirement registry (DS-001–DS-072)

### A. Scope, organization, language and V1 (DS-001–DS-017)
| ID | Confirmed requirement |
|---|---|
| DS-001 | Adapt hierarchy and reasoning to detected STEM subject/discipline. |
| DS-002 | Review and revise V1 once before mapping source knowledge. |
| DS-003 | Iterate V2 review/correction until mandatory criteria are satisfied or configurable maximum reached; report unresolved items. |
| DS-004 | Evaluate grounding, coverage, reference validity, tree integrity, conceptual organization, granularity, and learning utility. |
| DS-005 | Maintain element-level SCR for definitions, principles, equations, figures, tables, methods, examples, etc., with original pages and knowledge-point mappings; do not erase separate source occurrences. |
| DS-006 | Attempt to resolve unmapped source elements through existing/new knowledge nodes, then report unresolved. |
| DS-007 | Set knowledge-point granularity by independent learning objective; group supporting details under nodes. |
| DS-008 | Use only parent–child relationships within conceptual hierarchy; no knowledge cross-links or relationship graph. |
| DS-009 | Use concise, specific technical knowledge-point titles. |
| DS-010 | Preserve source technical terminology rather than replacing it unnecessarily. |
| DS-011 | Use predominant source-document language for node titles, translating others where needed. |
| DS-012 | Auto-detect output language; require user confirmation or override before generation. |
| DS-013 | Detect a coherent common STEM domain across documents; flag mixed/ambiguous collections. |
| DS-014 | On ambiguity, let user enter a coherent domain subject and validate that choice. |
| DS-015 | Adapt V1 breadth to discipline/subdiscipline/specialized topic; construct its framework using general expertise rather than detailed source extraction. |
| DS-016 | Organize conceptually, adapting prerequisite progression, theory, models, methods, and applications to the subject. |
| DS-017 | Differentiate principles, mathematical models, methods, and applications when independent goals justify them; avoid empty/artificial categories. |

### B. Knowledge identity, coverage, citations and V3 (DS-018–DS-034)
| ID | Confirmed requirement |
|---|---|
| DS-018 | Merge equivalent points in the same conceptual branch; retain meaningful repetitions in different branches. |
| DS-019 | Preserve union of source elements and page evidence during merges; deduplicate identical displayed document/page references. |
| DS-020 | Check document/page existence and substantive semantic support for each reference; repair/report unsupported links. |
| DS-021 | Narrow, rename, split, or restructure partially supported knowledge rather than retaining unsupported claims or discarding supported parts. |
| DS-022 | Interpret ambiguous content using uploaded-document context; external expertise may assist interpretation but not add claims. |
| DS-023 | Include all substantively supporting pages, even discontiguous or from multiple documents. |
| DS-024 | References are 1-based physical page positions of original PDFs or converted preview PDFs, not printed page labels. |
| DS-025 | Order document refs by upload sequence and pages numerically ascending. |
| DS-026 | Validate final V3 structure, reference validity, preservation of V2 knowledge, element traceability, and absence of unsupported knowledge; autocorrect/report. |
| DS-027 | Classify unresolved V3 issues by severity; critical ones block successful delivery; noncritical ones can accompany delivery with report. |
| DS-028 | Always critical: structural corruption, invalid required references, or unsupported retained knowledge. Other problems assessed by actual effect. |
| DS-029 | Full substantive source coverage is required; percentages diagnostic only. Standalone unexplained supplemental media may map to adjacent technical points by evidence, not become invented conceptual nodes. |
| DS-030 | For ambiguous standalone videos/images/links, inspect prior and following pages and technical context; choose best-supported point, preceding point as tie-breaker. |
| DS-031 | Preserve uninterpretable supplementary material by original page and flag/report unresolved without inventing meaning. |
| DS-032 | Expose unresolved supplementary material in a separate V3 navigation section outside the conceptual hierarchy. |
| DS-033 | Order siblings for progressive learning where supported; avoid a rigid universal prerequisite sequence. |
| DS-034 | Omit source-unsupported prerequisites from V2/V3 even when generally useful. |

### C. STEM-specific content and learning objectives (DS-035–DS-048)
| ID | Confirmed requirement |
|---|---|
| DS-035 | Make examples/exercises nodes only where they teach distinct goals or procedures; repetitive practice is supporting material. |
| DS-036 | Preserve unsolved exercises as practice without fabricating solutions. |
| DS-037 | Tables/datasets may become nodes for meaningful classification/comparison/selection principles; otherwise source evidence. |
| DS-038 | Equations, models, derivation methods, and analytical procedures can be independent objectives; intermediate manipulation/notation/assumptions often remain supporting details. |
| DS-039 | Interpret figures as structural/functional/process objectives only with supporting evidence; otherwise use as evidence. |
| DS-040 | Interpret scientific charts primarily from captions, titles, and adjacent explanation; avoid unsupported freeform inference. |
| DS-041 | Analyze explanations spanning consecutive pages as wholes and retain all supporting page refs. |
| DS-042 | Synthesize complementary information across nonconsecutive pages/documents; retain distinct objectives and complete refs. |
| DS-043 | Compare apparent contradictions by assumptions, units, scope, and conditions; reconcile only with source support, otherwise preserve/report. |
| DS-044 | Mark unresolved contradictions on affected V3 nodes and show both claims and their references, not a separate contradictions branch. |
| DS-045 | Give terminal nodes concise, hidden, source-grounded learning-objective metadata. |
| DS-046 | Give intermediate nodes concise, hidden aggregate objectives derived from descendants, with no new claims. |
| DS-047 | Generate objectives during V2; selectively refresh changed nodes and ancestors; run final consistency check. |
| DS-048 | Split only for source-supported independent learning objectives; stop when further divisions are only supporting details. No fixed depth. |

### D. Evaluation, convergence and corrections (DS-049–DS-058)
| ID | Confirmed requirement |
|---|---|
| DS-049 | Each V2 review detects under-decomposition and splits broad nodes; remap/revalidate evidence. |
| DS-050 | Each V2 review detects over-decomposition and merges/restructures fragments without losing objectives/evidence. |
| DS-051 | Each V2 review tests conceptual parent–child suitability and repairs misplaced nodes while retaining context-specific repeats. |
| DS-052 | Each V2 review tests each branch for source-grounded completeness, missing objectives, misplaced content, and missing categories. |
| DS-053 | Log significant corrections with source justification, detect split/merge oscillations, and resolve/report. |
| DS-054 | Convergence requires all mandatory checks and one additional verifying review without material structural corrections; otherwise continue to maximum and report. |
| DS-055 | Maximum V2 review rounds is configurable; default five; DS-054 early stop remains. |
| DS-056 | Comprehensive first V2 evaluation; incremental affected-branch reviews thereafter; global coverage, structure, and semantic-support verification before convergence. |
| DS-057 | Impact analysis must include ancestors, descendants, branches, source mappings, and objectives; fall back to comprehensive review if scope uncertain. |
| DS-058 | Preserve structured per-round findings, node IDs, change types, justifications, outcomes, and unresolved issues outside visible map. |

### E. Recovery, extraction integrity and uncertainty (DS-059–DS-072)
| ID | Confirmed requirement |
|---|---|
| DS-059 | Save validated stage checkpoints after V1, extraction, SCR, V2, each V2 review, and V3 validation. |
| DS-060 | Validate checkpoint completeness, schema, source identity, configuration dependencies, and consistency; fall back to most recent valid checkpoint and report repeats. |
| DS-061 | On configuration changes, selectively invalidate dependent stages; retain compatible checkpoints and report rework. |
| DS-062 | Retry transient API failures with exponential backoff and user-configurable limit; preserve checkpoints, avoid duplicate validated processing, pause/report on exhaustion. |
| DS-063 | Default three automatic retries, add jitter, respect server Retry-After, and do not retry permanent failures (e.g., invalid credentials). |
| DS-064 | Validate outputs, repair recoverable formatting without changing meaning, selectively regenerate invalid/missing parts when safe, revalidate before checkpoint. |
| DS-065 | Adaptively chunk large source documents around coherent technical sections; preserve boundary context; consolidate globally with exact page refs. |
| DS-066 | Stable IDs; reconcile overlap-induced duplicate extraction records but retain distinct real source occurrences; boundary omissions audit before V2. |
| DS-067 | Persistent occurrence IDs matched across reprocessing by document, physical page, location, content; reuse confident matches; new IDs for new elements; flag ambiguity. |
| DS-068 | Reconcile uncertain identities with adjacent text, technical context, visual coordinates, neighbors; retain separate provisional records if insufficient evidence. |
| DS-069 | V2 may proceed with flagged provisional identities only if full, technically reliable source representation remains possible; block if ambiguity compromises coverage or meaning. |
| DS-070 | Store uncertainty status, type, affected content, source evidence, attempted corrections, across extraction/identity/interpretation/coverage; avoid uncalibrated numeric certainty. |
| DS-071 | Verify uncertainty by revisiting source page visuals, nearby context, corroborating uploaded sources; preserve unresolved ambiguity, do not invent corrections. |
| DS-072 | Prioritize verification by risk to meaning, objectives, coverage, dependencies; track all, attempt all resolvable cases within limits, explicitly report unresolved. |

## 4. Wider application constraints — FR-001–FR-051 (integration summary)

The Skill is a processing component; the application supplies the user experience and file/project lifecycle. Preserve traceability to the wider FR registry:

- **Inputs:** PDF, PPT/PPTX and DOCX; batch upload, drag-and-drop/file picker, configurable file count/size limits, per-file status and metadata, local preprocessing on upload; AI generation starts only on Generate (FR-001, FR-010, FR-042–FR-047).
- **Preprocessing:** Convert PPT/PPTX and DOCX to page-addressable PDFs for preview; block generation for failed preprocessing until resolved; preserve original metadata and original file identity (FR-030–FR-031, FR-046–FR-047).
- **Generation:** Domain detection, V1 and source mapping, source-only final hierarchies, iterative refinement, multimodal extraction, adaptive depth, progress, checkpoints, resume/restart, cancellation (FR-002–FR-007, FR-015–FR-017, FR-032–FR-035, FR-048–FR-051).
- **Editing:** Manual node edits, explicit Save, unsaved warnings, undo/redo within session, merge/split/delete/reparent handling and citation rules. File set remains locked after completed generation; user-provided new unsupported conceptual points require source references. (FR-012–FR-023).
- **Presentation:** Left-to-right tree, root and first-level children initially expanded, zoom/pan/fit, search; expandable filename/page reference nodes; page preview and full PDF viewing (FR-008–FR-009, FR-024–FR-029).
- **Persistence and export:** Multiple projects, project rename/delete, stable IDs, name uniqueness, PNG/SVG/JSON export, ZIP backup/restore (FR-013–FR-014, FR-036–FR-041).
- **Output fidelity:** The application must preserve the Skill's final validated node set, including meaningful contextual repetitions; it must **not** apply blanket deduplication to an approved final tree (FR-050–FR-051). Same-branch semantic dedup is a **Skill** responsibility under DS-018.

**Ownership boundary:** The Skill defines extraction, reasoning, quality rules, output schemas, and references. The application implements UI interactions, project lifecycle, persistent storage, previews, backups, and user overrides. Shared schemas connect both.

## 5. Consistency audit: clarifications and resolutions

| Topic | Potential apparent conflict | Implementation resolution |
|---|---|---|
| Full coverage vs unresolved supplements (DS-005/029/031/032) | Requirement to cover all source content vs inability to interpret every standalone medium | Distinguish **accounted for** from **semantically understood and mapped**. Every detectable item is registered. Unknown media stay in unresolved navigation/report; no invented conceptual node. Project must not claim full semantic coverage when substantive elements remain unresolved. |
| Provisional identities vs complete SCR pre-V2 (DS-066/068/069) | Reconcile before V2 yet permit provisional records | Require complete and reliable **source occurrence accounting**, not forced identity certainty. Maintain separate provisional records, block only when material coverage/meaning compromised, and explicitly recheck later. |
| Convergence check vs five rounds (DS-003/054/055) | Stable confirming review needs an extra round | Define each *evaluation pass* as one round. All checks must pass with enough remaining budget for a verifying pass; at maximum without confirmation, report **not converged** even if last pass appears clean. This is a proposed engineering interpretation, not a newly user-approved rule. |
| Incremental review vs global verification (DS-056/057) | Local correction could affect remote branches | Maintain dependency graph of affected metadata and mappings, escalate uncertain impact to full review; run global invariant/audit checks at convergence. |
| Stable IDs vs changing extraction (DS-066–068) | Changes to chunk boundaries alter extraction locations/text | Persistent IDs are stored identifiers with evidence-based matching, **not** content hash as sole primary key. Keep source-occurrence fingerprint as matching aid. |
| Same-branch merging vs contextual repetitions (DS-018/FR-050–051) | Skill deduplicates but application must not | Skill normalizes in-branch equivalence; application preserves Skill output exactly unless user edits. |
| Parent–child-only vs source mappings/reports (DS-008/023/032/044) | Need evidence links and contradictions | Restriction applies to **conceptual knowledge tree relations**. Evidence mappings, node metadata, audit records, and external unresolved navigation are separate non-conceptual data structures. |
| All refs vs reference-node dedup (DS-019/023/025) | Same document/page may support multiple elements | Union evidence internally by source occurrence; show unique document+page navigation refs for each terminal node. Preserve granular SCR associations even when UI pages are deduplicated. |
| Critical issues block delivery vs usable diagnostics (DS-027/028) | Need communicate failures | Block **successful/finalized** status, not access to diagnostic report or checkpointed drafts. Distinguish final deliverable from incomplete preview. |
| No external unsupported facts vs V1 expertise (DS-015/034) | V1 initially can contain general knowledge not in source | Make V1 explicitly a candidate scaffold. Strip or replace unsupported nodes while constructing V2; nothing unsupported reaches V3. |
| Retry/repair vs no duplicate charges (DS-062–064) | Repeating remote requests may still incur fees | Avoid duplicate **validated local stage processing** and implement request identifiers where supported; cannot promise no duplicate remote billing after network ambiguity. |
| Language translation vs source terminology (DS-010/011) | Translation might distort technical terms | Store source label/original term alongside translated display title; cross-check against pages. No replacement with new terminology beyond supported meaning. |
| Fixed page numbers vs converted docs (DS-024/FR-030) | PPT/DOCX pagination can change on conversion | Treat each project's stored canonical preview PDF as the page-indexed reference artifact; retain conversion metadata and stable converted PDF. Re-conversion may invalidate page references. |

**No irreconcilable contradictions identified in the consolidated baseline.** The most significant remaining questions are implementational interpretations requiring explicit tests, not more product discovery.

## 6. Open implementation details (decide inside Work; do not restart long elicitation)

1. **Precise schemas and versioning:** JSON Schema/Pydantic for documents, pages, source elements, evidence mappings, V1/V2/V3 nodes, objectives, unresolved items, review findings, checkpoints, and configurations.
2. **Processing budgets:** practical per-request input/output size, context window budget, chunk limits, token/cost budgets, OCR/image processing strategy, concurrency, and cancellation. Defaults must be configurable where requirements already say so.
3. **Native source fidelity:** PDF text/layout + page image; PPT/DOCX conversion fidelity; hyperlink targets and embedded media handling; scanned math and tables; technical formula transcription and human-readable evidence snippets.
4. **Completeness instrumentation:** measurable source occurrence inventory, page-element ledger, coverage reconciliation, and non-silent omissions. Avoid declaring perfect semantic coverage based only on an LLM assertion.
5. **Verification-round semantics:** define final confirming pass relative to configured maximum, and an explicit state when max is reached without convergence.
6. **Failure severity rubric:** explicit rules for critical vs noncritical coverage/ambiguity/organizational issues consistent with DS-027/028/069/072.
7. **ID and reprocessing model:** stable file identity (hash + project ID), source element UUID, location signatures, ambiguity queue, node ID migration for split/merge, and referential integrity.
8. **Prompt/model orchestration:** task-specific extraction, construction, critic, and verification calls, structured outputs, independent review context when useful; validate outputs rather than trusting model self-assessment.
9. **Page reference presentation:** distinguish conceptual terminal nodes, document ref nodes, page ref nodes and unresolved supplemental navigation; prevent evidence-reference nodes from being counted as independent knowledge goals.
10. **Storage/privacy:** local-first project directory/DB, secrets in OS secure store/environment, explicit cloud OpenAI API sending of courseware, deletion and retention policy, ZIP export and restore, API cost transparency.
11. **Model selection:** support configurable supported OpenAI API models without embedding a model name that may become obsolete; test actual schema/vision capabilities.
12. **Tests and fixtures:** representative original materials must be supplied or chosen for evaluation. Do not claim user-provided files were tested unless actually available in Work.

## 7. Proposed technical architecture

> **Proposed implementation**, not previously approved technology choices. Work should inspect repository/environment and adapt accordingly.

```
Application (UI + file/project manager)
  |
  +-- Canonical source store (originals + preview PDFs + page metadata)
  +-- Job orchestrator / checkpoint manager
  |     +-- Document preprocessors / page extractor
  |     +-- Adaptive semantic chunker
  |     +-- Multimodal element extractor
  |     +-- SCR reconciler / identity and uncertainty tracker
  |     +-- V1 generator + once-off critic
  |     +-- V2 constructor + grounded objective metadata
  |     +-- V2 evaluator / correction executor / convergence controller
  |     +-- V3 reference builder / final verifier
  +-- Typed, versioned local database / JSON artifact store
  +-- Interactive tree + PDF viewer + editor + exports
  |
OpenAI API (cloud inference for relevant analysis stages)
```

**Suggested canonical records**:

- `Project`: project ID, source order, subject, language, config fingerprint, status.
- `SourceDocument`: immutable document ID/hash, original name/type, canonical preview PDF ID, page count, conversion version, upload order.
- `SourcePage`: document ID, physical page index, extraction assets, structured page inventory.
- `SourceElement`: persistent occurrence ID, document ID, physical page, location box/region, element type, normalized content, evidence, extraction run, verification state, uncertainty objects.
- `CoverageMapping`: source-element ID ↔ V2 knowledge-point ID; mapping type, supporting evidence, validation status; many-to-many allowed.
- `KnowledgeNode`: stable ID, parent ID, order, title, hidden learning objective, node type (conceptual only), source support provenance.
- `ReferenceNode`: terminal knowledge node ID, source document ID, physical page; display order and preview targets; not treated as independent learning goal.
- `ReviewRecord`: round, check type, severity, affected node/element IDs, proposed/applied corrections, source evidence, outcome, unresolved flags.
- `Checkpoint`: stage, schema version, input/source/config hashes, artifact checksums, dependencies, validation status.
- `SkillResult`: V1/V2/V3 artifacts, SCR, audits, evaluation history, unresolved navigation, status (complete / incomplete / blocked).

**Processing algorithm:**

1. Verify input and conversion; create stable canonical page references.
2. Detect subject and language; obtain required user confirmation/subject resolution.
3. Generate and once revise general V1.
4. Inventory pages and extract source elements adaptively, retaining page positions and visual context.
5. Reconcile overlaps and source identities; create SCR; resolve material extraction uncertainty; block if meaningful coverage cannot be established.
6. Construct source-grounded V2 using V1 as organizational scaffold only; generate node learning-objective metadata.
7. Run full first evaluation; make source-backed corrections, remap affected source elements, log changes.
8. Incrementally review affected branches with global verification, subject to convergence and maximum rounds.
9. Attach complete ordered document/page reference navigation; add unresolved supplements outside conceptual tree.
10. Run comprehensive V3 audit; finalize if critical tests pass; otherwise preserve incomplete result and diagnostic report.
11. Expose saved result to application viewer/editor/export, retaining provenance and audit data.

## 8. Delivery phases / acceptance gates

### P0 — Data foundation and representative ingestion
**Implement:** versioned schemas, canonical PDFs, page indexing, source-element ledger, storage identity, sample fixtures, test runner, project/job structure.  
**Gate:** PDFs and converted PPT/DOCX preview page references are consistent, reproducible, and openable. A multi-page example yields distinct traceable source records.

### P1 — Minimum viable end-to-end Skill
**Implement:** subject/language confirmation, V1 + critique, source extraction/SCR, grounded V2 hierarchy, essential full evaluation, V3 reference nodes, basic unresolved report, exportable JSON.  
**Gate:** one representative multi-document STEM project completes V1→V2→V3, shows meaningful nontrivial hierarchy and opens real original/converted supporting pages. Unsupported V1 scaffolding does not persist in V2/V3.

### P2 — Quality and multimodal robustness
**Implement:** image/diagram/table/equation handling, cross-page synthesis, duplicate/repetition rules, under/over-decomposition, contradiction support, source-semantic reference audit, uncertainty and risk workflow, global coverage accounting.  
**Gate:** targeted adversarial fixtures verify no silent missing source elements, no invented equations, correct multi-page references, correct duplicate handling, and explicit unresolved cases.

### P3 — Efficiency, recovery and resilience
**Implement:** comprehensive/incremental evaluation with impact fallback, five-round default and configurable convergence, checkpoints/compatibility/setting invalidation, bounded retries and output repair, structured correction history, cancellation/resume.  
**Gate:** injected interruption, config change, invalid checkpoint, transient API error, and malformed output produce deterministic safe recovery with no silent corruption.

### P4 — Full application integration
**Implement:** projects, editing and save behavior, left-to-right map, PDF preview/full reader, search/navigation, exports/backup/restore.  
**Gate:** all applicable FR requirements are demonstrated in an end-to-end UI test; source mappings remain valid after approved edits.

**Dependency note:** P4 UI may be prototyped in parallel with P1, but integration is not an excuse to delay validating the core Skill. Production requirements are not waived because staged implementation is used.

## 9. Acceptance test matrix

| Test | Fixture / assertion | Expected outcome |
|---|---|---|
| Topic and language | Multi-document coherent STEM set; mixed-language sources | Coherent subject detected; user confirms output language; terminology trace preserved. |
| Mixed subjects | Two unrelated collections | Explicit ambiguity; user-selected subject coherence checked; no forced false classification. |
| Page locations | PDF with printed labels differing from physical pages | Reference links open correct 1-based physical page. |
| Derived/conversion pages | PPT and DOCX fixtures | Every referenced page opens against stored canonical preview PDF. |
| Cross-page derivation | Explanation and equation spanning pages | Coherent knowledge objective with all supporting pages. |
| Cross-document synthesis | Two sources contributing complementary parts | One source-grounded objective can retain references to both. |
| Grounding | V1 includes familiar principle absent from materials | Principle removed from V2/V3, not cited to unrelated page. |
| Citation semantics | Existent but irrelevant page supplied | Fails semantic support check; corrected/flagged. |
| Coverage | Every substantive source element tagged in fixture | All inventoried elements mapped or explicitly unresolved; never silently omitted. |
| Same-page overlap | Same source equation processed twice across chunks | One source occurrence ID retained. |
| Genuine repetition | Identical equation occurs on two pages | Two occurrence IDs; deduplicated UI pages only where exact doc/page repeats. |
| Identity ambiguity | Two similar equations same page | Separate provisional records until evidence supports merge. |
| Pedagogical granularity | Long technical derivation with intermediate steps | Goals split appropriately; supporting algebra not exploded into meaningless leaves. |
| Figure/table | Diagram with supported structural goal; decorative figure | Independent objective only for distinct learnable concept. |
| Unsolved exercise | Exercise without answer in source | Preserved as exercise; no invented solution. |
| Contradiction | Two source claims with incompatible assumptions | Reconciled only with documentary evidence or both retained/flagged at node. |
| Convergence | Round requires a later verifying review | Cannot mark converged without confirmation; respects max; reports exhaustion. |
| Correction impact | Node moved to new parent | Both branches, ancestors, source mappings, and objectives revalidated. |
| Checkpoint integrity | Truncated or mismatched stored checkpoint | Rewind to last valid; report reprocessing. |
| Config change | Review limit changed without source modification | Reuse unaffected checkpointed extraction and V2 artifacts when compatible. |
| Transient API error | Mock 429/5xx vs invalid key | Three default retries with jitter/Retry-After; no retry on permanent auth failure. |
| Invalid model output | Truncated structured JSON or omitted required fields | Repair/re-generate safe sections; revalidate; do not checkpoint malformed data. |
| Critical V3 issue | Unresolvable invalid page reference or unsupported retained node | Block successful finalization; diagnostic available. |
| UI/editing | Merge/split/move, Save, undo/redo, click page | Source refs and IDs remain consistent with FR editing behavior. |

### Definition of done

- All currently implemented requirements have automated tests and documented evidence, and the phase's acceptance gate passes.
- End-to-end sample artifacts have been inspected for conceptual quality and reference fidelity (manual review where machine verification is insufficient).
- Every source element is accounted for in SCR; unresolved cases are visible and cannot be mistaken for verified coverage.
- V3 cannot be reported as successfully finalized with critical structural, grounding, or reference failures.
- Usage and limitations are documented; reproducible setup and configuration provided.
- No claimed support for input types or edge cases that have not been exercised.

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OCR/vision misses content or misreads mathematics | Critical false confidence | Visual inspection passes, uncertainty record, page inventory, adversarial fixtures, unresolved reporting. |
| LLM judges its own output too favorably | False convergence | Deterministic invariant checks, separate verifier context where practical, independently testable evidence mappings. |
| Very large files/costs | Time/cost overruns | Semantic chunking, retries bounded, checkpoints, processing/cost limits, stage summaries, no blanket regeneration. |
| Converted files shift pagination | Broken page links | Persist canonical converted PDFs and conversion metadata; invalidate dependent artifacts on re-conversion. |
| Unclear definition of 'complete' | Premature acceptance | Element-level accounting and non-silent unresolved status; distinguish mapped, unverified, and uninterpretable. |
| Unbounded hierarchy fragmentation | Unusable learning map | Learning objective metadata; under/over-decomposition reviews; no fixed depth but explicit stopping rule. |
| Privacy/IP concerns with cloud APIs | Trust and data governance | Transparent cloud use, user control of source upload and storage, secure credentials, clear retention policy. |
| Scope creep from 72 rules | Delayed first working result | P0/P1 vertical slice first; phase gates and frozen requirement baseline. |

## 11. Work-mode execution brief — copy into ChatGPT Work

> **Project:** Build the Quick Reading of Courseware Decomposition Skill and integrate it with the planned application.
>
> **Source of truth:** Use the attached consolidated specification (`Quick_Reading_Decomposition_Skill_Work_Brief.md`) as the requirement baseline, preserving DS-001–DS-072 and related FR interfaces. Requirements elicitation is complete; do not begin a lengthy question-by-question discovery cycle.
>
> **Objective:** Implement a tested, source-grounded V1 → SCR → V2 → V3 courseware decomposition pipeline for PDF/PPTX/DOCX STEM materials, preserving original physical-page traceability and transparent uncertainty. V1 can use external disciplinary knowledge; V2/V3 must include only source-supported knowledge.
>
> **First actions:** Inspect the current repository, environment, available files, and integration interfaces. If an existing codebase is supplied, extend it; otherwise initialize a maintainable modular project. Write a requirements traceability matrix, architecture decision record, typed schemas, and phase-based implementation plan. Identify unverified assumptions explicitly and use reasonable implementation defaults consistent with the spec.
>
> **Execution:** Implement P0 and P1 as a working vertical slice first. Create representative test fixtures, typed persistent records, document page conversion/indexing, multimodal extraction interfaces, source-element ledger, source-grounded V2 hierarchy, V3 references, validation, and a runnable demonstration. Then continue P2 quality controls and P3 resilience according to phase gates. Integrate with application FR features as interfaces become available. Preserve tests and documentation at every phase.
>
> **Quality constraints:** Do not fabricate knowledge, source references, or successful coverage claims. Verify factual semantic support of references. Account for each substantive source element, including unresolved media. Preserve distinct occurrences and contextual repetitions; never silently merge uncertain records. Treat incomplete/blocked results distinctly from successfully finalized V3 results. Respect configurable V2 review limit (default five) and stable verification requirement.
>
> **Deliverables:** Source code and reproducible setup, schemas/API contracts, tests and fixtures, phase progress/requirement coverage matrix, architecture notes, sample V1/V2/V3 and SCR outputs, unresolved-issues reports, plus an integration guide for the interactive tree/PDF viewer. State accurately which requirements are implemented, tested, partial, or not yet implemented.
>
> **Decision policy:** Make reversible technical implementation decisions without further user interrogation. Ask only if a missing product-level decision is blocking or would materially change cost, security, or functionality. Do not claim the entire 72-requirement system is complete until tests demonstrate it.

## 12. Final recommendation

**Proceed.** Freeze DS-001–DS-072 as the initial product baseline. Consolidated conflicts have reasonable engineering interpretations; prioritize building a demonstrable end-to-end core, and treat advanced reliability/optimization as phased work with explicit acceptance gates. Do not introduce DS-073 unless a genuinely new user decision is required.
