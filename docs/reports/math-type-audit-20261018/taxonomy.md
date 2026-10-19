# Math bank taxonomy and family identity audit — 2026-10-18

The stored inventory is fully enumerated; the semantic review is a targeted sample. Current family counts are counts of stored identities, **not a verified count of different reasoning types**. The audit finds both unnecessary splits and legitimate distinctions, plus source/snapshot registration drift. No product, identifier, approved batch, student record or database value was changed.

The complete machine-readable evidence is [taxonomy.json](taxonomy.json). It contains every stored family, every current registration, both index-label catalogs, every exact/numeric overlap group, every wording candidate and the 51 authored pair decisions. Original textbook questions, solutions and images remain in private `.qa-artifacts`; the committed evidence contains metadata, IDs, counts and hashes.

## Basis and coverage

- Product source: `cd067a49a90283749ea9f525073a4a469eef54bd`. The initially supplied worktree was on a divergent branch; that branch was preserved and this audit uses a fresh branch at the requested product baseline.
- Snapshot: coordinator's read-only `RepeatableRead` export, completed `2026-10-18T04:58:16.934Z`, SHA256 `daf90c9a97e0630bb8be372e873187603f1fdbf5a201de18c009e266f7cfbac3`.
- All **118,020 rows**, including **115,575 eligible rows**, were streamed through the actual `parseProblemContent` implementation; parser exceptions: **0**. Successful parsing does not certify mathematical correctness.
- All **16,367 stored `(unitId, familyKey)` identities** correspond to the family registry; no empty registry entry, missing registry identity, null key or blank key was observed. **15,878 identities have eligible rows**.
- All **4,197 current code registrations** were enumerated: elementary 2,485; middle 1,517; middle combos 6; judgment 15; high 168; native descriptive 6. Elementary combo definitions are also included separately; they have no observed importer family mapping in this audit.
- Automated comparison covers exact payload, content with figure reference, content alone, numeric full-content/solution and numeric parsed-question/solution signatures. A supplemental engine wording screen compared **222,514 shape pairs** within units, using up to four frequent shapes per family, producing **408 candidate family pairs**.
- Semantic review: **51 representative pairs, 93 distinct rows, 91 families** — **27 same, 22 different, 2 uncertain**. These are judgments about the inspected tasks; only explicitly source-proven cases extend to a whole family. This is about **0.56% of stored families**, not a complete semantic or mathematical review of the bank.

| Namespace | Stored identities | Eligible identities | Stored rows | Eligible rows |
|---|---:|---:|---:|---:|
| `elem:` | 2,499 | 2,499 | 55,914 | 54,163 |
| ordinary `mid:` | 1,530 | 1,517 | 45,017 | 44,889 |
| `mid:` combos | 6 | 6 | 144 | 144 |
| `mid:judge:` | 15 | 14 | 180 | 168 |
| `native-desc:` | 6 | 6 | 12 | 12 |
| `solo:` | 12,311 | 11,836 | 16,753 | 16,199 |
| Total | 16,367 | 15,878 | 118,020 | 115,575 |

The snapshot includes 101 `past_exam` rows, **all ineligible**. They are not available exercise stock. Source counts and availability gates are preserved in `snapshot` in the JSON.

## What a current “type” means

The selection identity is [`familyIdOf`](../../../src/lib/generator/familyKey.ts): a nonblank key plus unit ID; absent keys fall back to one row per identity. The DB family key is also composite. Equal key strings in different units are intentionally distinct.

The [engine importer](../../../scripts/import/load-engine-problems.ts) constructs elementary keys from grade/section/form, ordinary middle keys from the registered key, combo keys from the combo ID and judgment keys through their dedicated contract. A seed or answer format is a variant, not a new family. `expandFamily` preserves the family key across short-answer and multiple-choice output and does not create descriptive tasks by changing the final instruction. Native descriptive tasks have their own namespace and authored reasoning requirements.

The [availability UI query](../../../src/lib/bankSourceAvailability.ts) counts eligible keyed identities per unit, with absent keys counted independently. The random panel reports these as `갈래`. That arithmetic follows the product contract, but cannot detect two different keys containing the same exercise. List/source `held` and `available` are row counts; `unitFamilies` is an identity count. These numbers should not be presented interchangeably as semantic diversity. The [source-group contract](../../../src/contracts/bankSource.contract.ts) groups `manual` under “engine”; the 168 registered high generators do not establish that 168 high types are stored or usable.

All **4,442 origin-linked variants** point to an origin inside the snapshot and inherit exactly its unit/family identity. The observed under-grouping is therefore across independent origins/materials as well as engine keys; it is not a missing inheritance assignment on these children.

## Exhaustive overlap inventory

Every group below crosses at least two stored identities. Groups, pairs and distinct types are different denominators. A family can share several identical payloads with another family, so pair occurrences must not be subtracted from the 15,878 available-family count.

| Comparison | Cross-family groups | Rows in groups | Families touched | Same-unit eligible pair occurrences |
|---|---:|---:|---:|---:|
| Raw content + answer + solution + SVG/URLs/choice-image mapping | 735 | 1,476 | 886 | 725 |
| Whitespace/NFC content + exact figure reference | 1,142 | 2,290 | 1,270 | 1,116 |
| Whitespace/NFC content only | 1,434 | 3,120 | 2,024 | 2,199 |
| Numeric full content + solution skeleton | 1,004 | 6,505 | 1,469 | 1,168 |
| Numeric parsed question + solution skeleton | 827 | 6,546 | 1,473 | 1,156 |

The five screens together identify **2,877 distinct family pairs**. Raw payload matches represent **452 distinct family pairs**, including **430 same-unit pairs with eligible rows on both sides**; 449 of the 452 pairs are solo/solo, and the other three are the delegated combo/base pairs below. Of the 735 raw groups, 699 involve solo identities and 223 contain textbook rows. These counts demonstrate repeated exercise stock across distinct identities; they do not authorize automatic merging of every original family and its other variants.

Content-only comparison finds **292 groups with different figure-reference hashes**. Their stems may be generic instructions whose actual conditions live in a diagram. The numeric screen deliberately masks all numeric tokens, including exponents, angle values and decimal place information; it is lossy. Parsed questions may omit options that carry the entire judgment task. All automated groups therefore retain `decision: uncertain`; explicit inspected decisions are in `reviewDecisions`, with their scope and matching group IDs. Wording candidates are also candidates, not conclusions.

## Concrete merge and alias candidates

“Same” means the inspected task has the same necessary solving action. Keep representation, target position and source provenance as metadata where they do not add a reasoning requirement. “Partial overlap” means only a branch of a broader family is redundant; do not blindly merge the complete families.

| Review IDs | Candidate | Evidence and proposed boundary |
|---|---|---|
| T01–T03 | Combo aliases → `mid:3-1\|이차방정식의 풀이\|06`, `mid:2-1\|연립일차방정식\|20`, `mid:2-1\|연립일차방정식\|19` | Whole-family source proof: `generateMiddleComboProblem` calls the existing generator with exactly the same seed/variant and no salt; stored payloads also match. Preserve combo retrieval membership as metadata and share the base semantic identity. |
| T05–T06, T29–T32 | `mid:2-1\|연립일차방정식\|19A/21A/23A/25A` and separately `20A/22A/24A/26A` | Eight families call the same `specialExtra` helper. Within each logical case, only which coefficient is hidden changes. Use two reasoning parents, one for infinitely many solutions and one for no solution. Keep the two cases distinct (T33). All eight have 24 eligible rows/12 parsed stems each; `응용` versus `심화하` labels on position variants do not supply an additional step. |
| T04 | `elem:초6\|1-6-3 ㎥ 알아보기\|01` / `06` | Confirmed overlapping inverse-conversion branch. Form01 has both directions; form06 only cm³→m³. Two inspected identical questions/answers differ only in explanatory wording. Alias the inverse subcase, keeping direction explicit. |
| T10 | `elem:초5\|2-1-5 버림 알아보기\|03` / `06` | Form03 selects place value; form06 repeats its hundreds/remainder branch. Partial overlap, not equality of every output. |
| T23 | `mid:1-1\|소인수분해\|05` / `19` | Source05 chooses prime-factor sum, maximum or count; source19 repeats the count action. Alias the count branch while retaining the other two asks. |
| T15 | `elem:초3\|2-3-2 원의 성질\|06` / `09` | Both multiply the radius by an explicitly given number of radii. Changing the count does not add a reasoning step. |
| T09, T11–T14, T17, T20 | Part-whole ratio; named face area; first/second ratio term; graph first/last point; proportional share; one/two-place decimal shift | Inspected tasks support common reasoning parents with target/position/count parameters. These remain representative candidates until all handler branches are checked. Exact keys and row pairs are recorded in the JSON. |
| T27 | `mid:3-1\|이차함수의 그래프 ⑴\|11` / `18` | Both explicitly give a y-axis vertex and another point. The inspected graph adds no missing condition; both solve the same parameter equation. Candidate parent alias for this representation branch. |
| T40–T45 | Different textbook/solo origins containing equal exercises | Complete choices, answers and solutions were inspected. Preserve each source/origin/slot and row ID; add a semantic duplicate alias instead of counting the repeat as independent stock. Two apparent answer-string conflicts were only positive-sign or spacing differences. |

The first two rows are the strongest whole-family proposals. The remaining proposals explicitly distinguish subcase overlap from full-family equivalence. No merge was applied, and no adjusted global “true type count” is claimed.

Representative proof pairs, with full payload hashes in the JSON:

| Review | Problem IDs | Decision |
|---|---|---|
| T01 | `0f467ac8-8a87-450c-a212-34f002c3d02c` ↔ `325a8688-a0ad-43c0-973f-9fc8e25fb05d` | same, delegated quadratic/factorization combo |
| T04 | `dc22c1fc-fcc9-4177-8f23-965c5b027d6f` ↔ `eeee16eb-00d3-45d7-bbde-d89b98c26067` | same task, partial family overlap |
| T05 | `88c90eec-b2f9-4810-9049-8749140303f2` ↔ `004ef592-9e8e-4ea8-8878-c7322766a2db` | same, coefficient position |
| T40 | `49c6c635-2dd2-4cdf-84f4-0b8d8fff17fa` ↔ `bcdf4490-67a3-4517-aef4-d2d6aa51ef76` | same textbook exercise, different material/origin |
| T41 | `623ed4a3-d076-40e4-91d9-7cf124725dfe` ↔ `bc4e2b77-c713-47be-b36c-b66f2d5e4bf3` | same textbook exercise, different material/origin |

## Distinctions that should survive

The inspected counterexamples are equally important to the alias list:

- **T07:** acute versus obtuse triangle-area configurations. The obtuse task requires the supplementary angle; inspected diagrams confirm the difference.
- **T16, T22:** reversing the given/unknown length, or deriving a ratio share from a whole versus solving for a different side, changes the required intermediate step.
- **T18–T19:** recovering an addend versus a minuend changes the inverse operation; inner versus outer terms test named ratio concepts before multiplication.
- **T21, T26:** a nonrepeating decimal prefix requires an extra shift before cancellation; a sum of radicals requires distribution after rationalization.
- **T25:** identical captured labels for trigonometry types08/13 hide a source-enforced distinction: type08 uses30/45/60 degrees; type13 requires at least one0/90-degree term. Label equality is not identity proof.
- **T28:** first/third quartiles share sorting but target different halves/ranks. A common parent can retain the quartile parameter without claiming the quantities are identical.
- **T34–T35:** the two-position coefficient task must generate and reject candidates; the native factorization task requires error diagnosis and identity-versus-one-point justification. Neither should collapse into a one-step/result-only family.
- **T36–T39:** judgment tasks must be compared with their choices. Signed subtraction adds a negation rule; powers/mixed operations add work; ordering five distinct values differs from finding one exceptional value among four equal values.
- **T46–T51:** a generic diagram prompt can conceal a different number of subparts or entirely different geometry. Identical stem text is not a safe alias.

**T08 remains uncertain:** triangular tiling and square tiling have similarly terse multiplication solutions, but different spatial arrangements. The displayed outlines do not establish a common partition argument. **T46 is also uncertain:** the pyramid tasks share the same volume rule, but one has a rectangular base and the other contains two square-base subparts. They are different exercises, while a common reasoning parent may still be appropriate. Preserve their structure until these boundaries are reviewed.

## Row-specific mapping controls and source drift

### A mixed-unit prompt group is a negative control, not a mapping error

All three rows below correctly belong to unit ID `bd419f09-50f5-4e63-a83b-9cbb445c766b` (`중1 / 다각형의 내각과 외각`) and source material `c4f7c7f5-24e0-4ec6-a43b-e8bc1944d1bc`. They share a generic prompt with rows from isosceles-triangle and right-triangle-congruence units. The entire two-part task, scanned figures and solutions were inspected; their actual conditions require polygon interior/exterior angle totals and do not require an isosceles-triangle fact. This is evidence that the cross-unit prompt match must not be merged, not evidence of an incorrect stored assignment.

| Review | Problem ID | Actual necessary reasoning |
|---|---|---|
| T48 | `7bd9a4fd-396f-43cf-9ed0-2632c659c328` | Pentagon/hexagon interior-angle totals |
| T49 | `2e5e96ec-4b97-4cc9-a75f-b023b68c63ad` | Interior/exterior angle conversion and polygon totals |
| T50 | `16a0ec01-41fa-4091-970c-7f70d0c7f4a1` | Exterior-angle total around quadrilateral/pentagon |

Their raw content/answer/solution SHA256, figure-file bytes SHA256, row-specific unit grade/chapter/section, source material ID, question number and family keys are retained in `reviewDecisions[].rowEvidence`. Other rows under the same generic prompt include genuine isosceles-angle tasks and an RHS-congruence task in their respective units; the seven-family content-only group must not be merged. A preliminary interpretation incorrectly applied one representative's unit to the entire group; independent row-specific reconciliation corrected it before this report was committed.

### Snapshot and source do not have the same registered engine keys

The snapshot has **14 extra elementary families /42 eligible rows**, forms31/32 in seven sections. They are absent from baseline `listedForms`. The preserved starting branch contains `e331f90c6` (statement forms) and `550096afc` (load ledger), which explains the observed branch/source divergence. This report does not treat the absence at `cd067a49a` as proof that those rows are invalid; their IDs, counts and keys remain in the inventory. Thirteen additional `mid:E*` keys are unregistered in the current generator and hold **17 blocked past-exam rows**; they add no eligible capacity.

### High registrations and index labels

All873 middle catalog keys have exactly matching registered label text;644 additional middle registrations are outside that catalog. In high,168 registrations cover168 of170 common-math1 index keys, with two explicit holds. The catalog also contains177 common-math2 keys. Among the168 registered high labels,150 match bytes and18 differ from the extracted label text, generally in punctuation or restored mathematics; the JSON records every difference. These are **label comparisons only**, not verification against original textbook/exam questions or curricular achievement standards.

No `high:` family mapping is present in the inspected importer or snapshot. High-grade stock in this snapshot is under solo identities. Consequently registered high-generator availability cannot be used as a count of stored high reasoning types, and this audit makes no original-exam authenticity claim.

## Reproduction and validation

Run from this worktree with the completed private export and the installed dependencies. Neither script loads an environment file, imports a DB client, opens a network service or calls a generation API.

```sh
node_modules/.bin/tsx scripts/qa/bank/type-audit-taxonomy.ts \
  --snapshot-dir /Users/pss/orca/workspaces/today_/problem_make/.qa-artifacts/math-type-audit-20261018 \
  --out .qa-artifacts/taxonomy

python3 scripts/qa/bank/type-audit-taxonomy.py \
  --snapshot-dir /Users/pss/orca/workspaces/today_/problem_make/.qa-artifacts/math-type-audit-20261018 \
  --private .qa-artifacts/taxonomy \
  --reviews docs/reports/math-type-audit-20261018/taxonomy.json \
  --out .qa-artifacts/taxonomy/reproduced.json
```

The TS stage verifies the complete snapshot hash, total and eligible count. The Python stage reconciles counts, builds complete inventories and retains authored decisions from `--reviews`; it does not manufacture semantic judgments. `sourceHead` records the checkout used for the registry export. For byte-identical reproduction, reuse the recorded registry export or run the TS stage with the product source at the recorded baseline.

For a candidate's full private text, add `--explain payload-exact:00c131e5965120b1888f` to the Python command; do not commit that output. Candidate IDs, full signatures and each family member's representative problem ID/payload hash permit reproducing any reported group. Pair hashes are SHA256 of compact UTF-8 JSON containing sorted payload-hash strings. Full row payload hashes include raw inline SVG and figure URL/choice mapping; local external image bytes were additionally hashed for the inspected review rows, not for every bank image.

Private visual evidence: `.qa-artifacts/taxonomy/figures.png` (16 engine comparison panels; SHA256 `e117b4d74acebaf330da7d8daf02d27a093cc4f3f971a680cc25ac35763cbb48`) and `solo-figures.png` (9 scanned-figure records; SHA256 `7c76b85bb192fe4d5fca19f4224903691e5623e3c1de3165b3864e85ad88cd2f`). These are private inspection sheets, not print-layout certification.

Scoped checks: TS lint and formatting; Python compilation; snapshot/checksum/count validation; deterministic second report generation; cross-check of current capacity totals against the coordinator's independent all-family inventory. The full repository test suite was not run. Remaining work is the explicitly unreviewed semantic candidate queue and any separately authorized product alias/mapping changes; no automatic correction or global semantic completeness claim is part of this audit.
