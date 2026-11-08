# Decomposition guide

How to turn registered source elements into a structure that teaches. Read with [quality-rubric.md](quality-rubric.md).

## 1. Think in concepts, not slides

Lecture slides are ordered for delivery: a concept is introduced, interrupted by an example, revisited three modules later, summarized in a review slide. A learning map is ordered for understanding. So:

- Build the structure from the **concept inventory**, never by walking the slides.
- One concept that appears on several slides or in several modules becomes **one** learning point citing all of its pages. A genuinely different use of the concept in another context (for example, the two-beam intensity law inside interferometry and again inside lithography) may appear in both branches; a mere repetition may not.
- Course or module boundaries are not chapter boundaries unless they coincide with conceptual ones.

## 2. Top-down shape

| Level | Role | Typical size |
|---|---|---|
| Root | The course | 1 |
| Chapters | Major conceptual areas, ordered by dependence (foundations before applications) | 4–9 |
| Groups | Coherent sub-topics a student would study in one sitting | 3–7 children each |
| Learning points | One examinable concept, model, method or comparison | 1–6 key points each |

These are targets, not caps. Use another level when a group would exceed about 9 children: find the hidden sub-topic (by mechanism, by component, by process step, by material class). Do not add a level just to look deep; a group with one child is usually a wrapper to remove.

### Ordering siblings
Use the order a good teacher would use, which is usually:
**phenomenon / principle → quantitative model → method or procedure → comparison and selection → applications → limits and trade-offs.**
For process chapters (manufacturing, fabrication) use: purpose → mechanism → equipment and parameters → quality and defects → applications. Context (history, market) goes first if it motivates, last if it is background, and is labeled `context`.

## 3. Choosing leaf granularity

A leaf is right-sized when one exam-style question maps to it. Apply the leaf test (rubric D) and these content-type rules:

| Source content | Becomes | Not |
|---|---|---|
| Definition or principle | Leaf if examinable on its own; otherwise a key point of the concept that uses it | A leaf for every defined term |
| Equation or model | Leaf when students must apply or derive it; the equation, symbols, units and conditions are key points | Separate leaves for intermediate algebra steps |
| Derivation spanning slides | One leaf ("Derive X from Y"), citing all pages | One leaf per slide of the derivation |
| Chart or data plot | Key point (trend, magnitude, condition) of the concept it supports | A leaf per chart |
| Table / spec sheet | Comparison or selection leaf if it teaches how to choose; otherwise key points | A leaf per row or per table |
| Photo, micrograph, part example | `example` key point | A leaf |
| Worked example | `example` or `procedure` key point; a leaf only if it teaches a distinct method | A leaf per example |
| Unsolved exercise | Cite as evidence of the method it practises | Invented solutions |
| Process / mechanism | Leaf per step only if each step must be explained separately; else one leaf with a `procedure` key point | — |
| Advantages / disadvantages | One comparison leaf per technology, or one selection leaf across technologies | Separate "advantages" and "limitations" leaves for every technology |

When unsure between merging and splitting: **split** if the parts need different explanations or would be examined separately; **merge** if one cannot be understood without the other.

## 4. Writing learner-facing text

- **Titles:** 1–8 words naming the concept ("Numerical aperture", "Q-switching"), not a sentence and not a slide label.
- **Objectives:** one sentence, an action verb plus the capability: *Calculate*, *Derive*, *Explain why*, *Compare*, *Select*, *Predict*, *Identify*. Describe the concept, not the slide ("Compare how ceramics absorb across UV, visible and IR", not "Compare the illustrated ceramic curves"). Group objectives summarize their children without adding claims.
- **Key points:** short, factual and complete enough to revise from. Each one has a `kind`:
  - `definition`
  - `equation`: write it in readable text, define every symbol with SI units, and state the conditions, for example "NA = n₀·sin θₐ = √(n₁² − n₂²); n₁ core index, n₂ cladding index, n₀ index outside the fibre, θₐ maximum acceptance angle; step-index fibre, meridional rays"
  - `condition`
  - `fact`
  - `procedure`: steps in order
  - `comparison`: what differs and why it matters
  - `example`
  - `caution`: a common confusion that the source itself warns about

  Every key point cites the element IDs that support it.
- **Supplements:** see SKILL.md step 4. Good uses: a missing definition the slides assume ("Population inversion: more atoms in the upper than the lower lasing level"), or a one-line bridge between two slide statements. Bad uses: new topics, numbers not in the course, or opinions.

## 5. Importance calibration

- **core:** the course clearly builds on it, examines it, or returns to it. Main equations, central mechanisms, key selection criteria.
- **supporting:** refines a core idea: special cases, secondary parameters, detailed variants.
- **context:** history, market figures, example parts, equipment brands.

Expect core ≈ 30–60 % of leaves. If almost everything is core, the labels carry no information.

## 6. Errata and uncertainty stay out of the learner text

If a slide is wrong or inconsistent:
- Keep the learning point about the concept.
- Write the key point in the correct standard form only if that form is textbook-level and unambiguous. Otherwise write the key point without the faulty detail.
- Record a `source_erratum` issue on the node: what the slide shows, why it is inconsistent, and `standard_form` when known.
- The viewer shows the issue next to the node, so students are warned without the objective turning into an audit note.

Genuine uncertainty about meaning goes into the node's `uncertainty` record (category, affected content, evidence, attempts), never into the title or objective.

## 7. Worked example: optical fibres

**Before:** one group "Optical-fibre guidance and modes" with 14 leaves in roughly slide order. Some objectives contained audit notes ("…while flagging inconsistent outside-index conventions"), and leaves such as "Named fibre fabrication routes" sat beside the core NA equation with equal weight.

**After:** the same evidence, regrouped by concept:

```
Optical fibres
├─ Fibre structure                                  (group, 2)
│   ├─ Core, cladding and coating        supporting   key points: layers, n₁ > n₂, typical dimensions
│   └─ Step-index vs graded-index        core         comparison: index profile, relative index Δ = (n₁ − n₂)/n₁
├─ Light guidance                                   (group, 3)
│   ├─ Guidance by total internal reflection  core    condition: θ inside core > θc = arcsin(n₂/n₁)
│   ├─ Acceptance angle and NA           core         equation: NA = n₀ sin θₐ = √(n₁² − n₂²) …  [erratum issue on outside-index factor]
│   └─ Bending loss                      supporting   fact: bends reduce the incidence angle below θc → radiation loss
├─ Modes                                            (group, 4)
│   ├─ Normalized frequency V            core         equation: V = (2πa/λ)·NA; a core radius (m), λ wavelength (m)
│   ├─ Single-mode condition             core         condition: V < 2.405 (step-index); consequence for a and λ
│   ├─ Number of guided modes            supporting   equation: M ≈ V²/2 (step-index, V ≫ 1)
│   └─ LP mode patterns                  supporting   fact: LPₗₘ indices count azimuthal/radial intensity features
├─ Fibre types                                      (group, 3)
│   ├─ Single-mode vs multimode          core         comparison: modes, core size, dispersion, applications
│   ├─ Polarization-maintaining fibres   supporting   fact: elliptical core or stress rods create birefringence
│   └─ Planar and rectangular waveguides context
└─ Materials and fabrication             context      key points: drawability, transparency, index matching; deposition and double-crucible routes
```

What changed and why:
- **Wide group split:** 14 flat leaves became 5 subgroups (J3), ordered structure → guidance → modes → types → making (J4).
- **Merged leaves:** "Fibre material requirements" and "Named fibre fabrication routes" became one `context` leaf, because neither is examinable alone (J1, J6).
- **Audit notes removed:** they moved out of the objectives into an erratum issue (J5).
- **Self-sufficient leaves:** each leaf now carries its equation with symbols, units and validity conditions (J2).

The equations in this example illustrate the format. In a real map, every key point must cite the course's own pages.
