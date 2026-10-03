# Codex actual Hi-fi vote — 2026-10-03

**Verdict: approve. Preferred variant: H1.** This is an independent visual selection for implementation, not evidence that the product UI or browser closed loop is finished.

- Authoritative artifact: `docs/design/mockups/math-prerequisite-hifi.html` in Grok's worktree, commit `564d540dd42ec07470be505983cd759bf2eb66ef`.
- Exact SHA-256: **`fd9b495022a954025143062675e96b71249322fd162eaa307b9dd82ae1c39869`**. Node's SHA-256 of the Git blob and the on-disk file both match; bytes are identical.
- Wire structure remains the approved W2 at `8109a7ee826b9a6ed7d5b8f5bbfeb6e46b4d005a24ea8dfe0eb85537e7e04423`.
- I actually viewed 18 original-resolution PNGs: all four variants' teacher, reason, and supply desktop images; H1 teacher, reason, and supply at both 320 and 390 pixels. The supply captures include both the outer expedition card and the existing recommendation card, with unavailable and safe-target fallback examples.

## Why H1

H1 keeps unit names, grade/course/domain metadata, and the expanded detail in the same reading order. Its quiet blue selected row, white relationship controls, and modest subsection headings preserve W2's single-column panel. The E56 scope restriction and M3 automatic-supply limitation remain explicit. Search, reset, disclosure, and relationship controls are visible at 320 pixels, without horizontal clipping in the supplied captures. Student selection stays optional and separate from curriculum browsing.

H2 hides metadata on collapsed units and makes expanded titles much larger. That weakens comparison between similarly named units across courses. H3 adds status pills and three competing pieces of information in each row; the long fraction title wraps on desktop, and a unit-level green supply pill needs extra care to avoid suggesting whole-unit support. H4 is denser, but its inline metadata and much larger subsection headings make the hierarchy less consistent. H1 gives this read-heavy panel the clearest balance.

The student heading shows the actual check chapter in semester 1 and the returned target in semester 2. The return wording refers to viewing a check scope, without claiming a pass. Supply exhaustion uses an explicit reason and disabled starts; check exhaustion with a safely available target keeps the target start enabled. These distinguish the outcomes students need to understand.

## Objections and implementation requirements

These do not block selecting H1; they must be respected in the production binding and browser verification.

1. Replace the teacher example's “최근 완료된 첫 통과가 둘” with **“최근 완료한 첫 풀이 세션 두 번”**. The requirement is two failed completed first-pass sessions, not two passed sessions or two wrong problems. Show that claim only when retained source supports it; otherwise use the actual section evidence, including unknown/inconclusive. Do not infer it from an aggregate wrong count.
2. The mock's `16 / 100`, `2 / 9`, `1 / 5`, selected scope, and sample students are illustrative. Product counts, candidates, scope, and progress must come from the graph/current student state. In particular an elementary expedition's frozen goal is 10; supply shortage must not manufacture progress or a completed result.
3. At 320 pixels H1's back control wraps “학습 홈”, and the optional evidence definition list leaves a narrow value column. A non-wrapping back label and stacked evidence label/value at narrow widths would improve readability without changing W2/H1's approved structure.
4. Preserve native keyboard controls, actual expansion state and focus visibility. Relationship navigation must reveal the requested unit even when filters hide it, with a clear reset/navigation behavior. Static screenshots do not prove working filters, ownership, or keyboard navigation.
5. Bind unavailable to the server's `canStart:false` at both auto-start and visible start controls. Retain active/retry resume, defer budget-limited return accurately, and enable safe-target fallback only when the server actually supplied it. Do not make every `kind:"unavailable"` context disable starts: the current display contract uses that kind with `canStart:true` for a safe target fallback.

No product UI was edited, server started, package installed, DB accessed, or AI invoked for this vote. The coordinator still owns live UI integration and the actual A/B fixture browser proof.
