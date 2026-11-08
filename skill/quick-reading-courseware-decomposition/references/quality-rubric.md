# Learning-quality rubric

The map exists so a student can learn the course faster: see its shape, revise each point without reopening slides, and jump to the original page when needed. Judge every draft against this rubric. Source grounding is a precondition, not the goal.

## A. Judged criteria (score each 0–2)

| # | Criterion | 2 = good | 1 = partial | 0 = poor |
|---|---|---|---|---|
| J1 | **Atomic leaves** | Each leaf is one concept, model, method or comparison a student could be examined on in one question | Some leaves bundle several ideas or are slide-sized fragments | Leaves follow slides, figures or tables rather than ideas |
| J2 | **Self-sufficient leaves** | Key points (definitions, equations with symbols, conditions, comparisons) let a student revise without opening the PDF | Key points present but thin or vague | Leaves are titles/pointers only |
| J3 | **Coherent grouping** | Parent title truly covers its children; siblings don't overlap and nothing obvious is missing (MECE) | Occasional overlap, a leaf restating its siblings, or a misplaced node | Groups are loose bags or mirror lecture structure |
| J4 | **Learning order** | Prerequisites before dependents; principle → model → method → application → limits | Mostly sensible with local exceptions | Order is arbitrary or follows slide sequence regardless of dependence |
| J5 | **Learner-facing wording** | Titles name concepts; objectives state what the student can do ("Calculate…", "Compare…"); no audit notes | Some objectives describe the slides ("the illustrated…") | Objectives are reviewer notes about the source |
| J6 | **Prioritization** | `importance` separates core concepts from supporting detail and context; core ≈ 30–60 % of leaves | Labels present but uncalibrated | No prioritization |

Score a whole map by sampling at least one branch per top-level chapter (or every branch for a small map). Report the mean per criterion and quote the weakest examples. 10–12 is the release target; below 8 needs restructuring, not polishing.

## B. Deterministic symptoms

Run `node scripts/quality-check.mjs MAP.json`. Treat failed metrics as prompts to look, not as targets to game: never split, merge or rename only to move a number.

| Metric | Target | What a failure usually means |
|---|---|---|
| Learning points with key points | ≥ 95 % | Leaves are pointers (J2) |
| Importance labelled | 100 % | No prioritization (J6) |
| Audit wording in titles/objectives | 0 | Errata or uncertainty leaking into learner text (J5) |
| Objectives phrased about the slides | ≤ 10 % | Describing pages instead of concepts (J5) |
| Groups with 3–7 children | ≥ 80 % | Too flat or too fragmented (J3) |
| Groups with > 9 children | 0 | Missing intermediate concept (J3) |
| Single-child groups | 0 | Pointless wrapper, unless it names a genuinely distinct concept that the course covers only once |
| Broad leaves (≥ 7 occurrences or ≥ 5 pages) | ≤ 5 % | Leaf bundles several goals (J1) — or a recurring core idea, which is fine if the key points stay focused |
| Concise titles | ≥ 95 % | Titles are sentences or page labels |
| Supplements per key point | ≤ 0.5 | Map drifting away from the course |
| Source errata marked critical | 0 | Slide errors are noncritical `source_erratum` issues |

## C. Common defects and their fixes

| Defect | Example | Fix |
|---|---|---|
| One leaf per chart/table/photo | "Metal absorption spectra", "Ceramic absorption spectra", "Sapphire and deep UV" as three leaves | One leaf "Wavelength dependence of absorptivity"; each chart becomes evidence and one key point |
| Leaf restates its siblings | "Factors controlling absorptivity" beside one leaf per factor | Make it the parent group, or keep one leaf with a key point per factor |
| Overpacked leaf | "Stimulated laser generation" covering pumping, inversion, stimulated emission, feedback, output coupling | Split into the steps a student must explain separately, under a group "How a laser produces light" |
| Example or spec sheet as a leaf | "SLM500HL table limitations", "SLM component examples" | Fold into the concept they illustrate as key points of kind `example`; keep the citation |
| Framework buried in a branch | "Five main laser parameters" placed under Absorption | Promote it to introduce the chapter whose structure it defines |
| Audit note as objective | "…while retaining the inconsistent numerical threshold label" | Objective states the learning goal; the inconsistency goes in a `source_erratum` issue linked to the node |
| Slide-referential objective | "Compare the illustrated ceramic curves" | "Compare how ceramics absorb across UV, visible and IR" |
| Wide group (> 9) | 14 fibre children | Insert concept subgroups: structure → guidance/NA → modes → fibre types → materials/fabrication |

## D. Leaf test

Before accepting a leaf, answer yes to all four:
1. Can I write one exam-style question whose answer is exactly this leaf?
2. Do its key points let a student answer that question without opening the slides?
3. Would removing it leave a visible gap in its parent's objective?
4. Is it not merely an example, figure, table or page of a concept that already has a leaf?
