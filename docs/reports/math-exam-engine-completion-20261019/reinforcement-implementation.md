# Six existing examStudy demands and statement-count choices

2026-10-19 · base `261a5e263e4e104949d7a21673c9c9ad5850a380`

The six existing registrations now generate complete exercises for their declared demands and carry executed verification evidence. `legacyReinforcement.ts` overlays examStudy generation, titles, individual versions, canonical domains, solutions and verification; it adds **zero registrations**. The legacy registration count remains **4,190**. The original middle/native bank and SRS handlers, student data, source-original absence, registry, route authorization and UI are unchanged.

| Existing registration suffix | Change | Executed base scope |
| --- | --- | ---: |
| `1-1\|일차방정식의 풀이\|11` | Five different equations, each with its own different candidate; evaluate both sides, each row's truth and the requested subset/count | Complete 120-case finite domain |
| `1-1\|일차방정식의 풀이\|06` | Four signed nonunit premises; universal identities, actual false witnesses and undefined division at `b=0` | Complete 32-case finite domain |
| `1-1\|일차방정식의 풀이\|09` | Preserve existing math; exact polynomial subtraction distinguishes quadratic, linear, zero/identity and nonzero-constant/impossible branches | 256 seeds × 2 variants = 512 records |
| `1-1\|일차방정식의 활용\|01` | Preserve existing situations; print both original calculations and their comparison after substitution | 256 seeds × 2 variants = 512 records |
| `1-1\|문자의 사용과 식의 계산\|13` | Expansion → collection → coefficient `A`, constant `B` → `A+B`, all within one family | Complete 144-case finite domain |
| `m3-quadratic-domain-r1` | `L₀+pt`, `W₀−qt`; initial-area recovery, every root including zero, strict positive time and lengths, original-area check; native 8-point/four-criterion rubric | Complete 60-case finite domain |

The first five remain short answer/derived MC; rectangle remains native written only. Unsupported formats still return no questions. Linear model's separate `written.dependent-formula-min-time` component remains unverified. Other legacy versions/evidence are preserved.

## Independent mathematics and evidence

Production verifiers parse printed task content, solutions and rubric semantics using bounded exact rational/polynomial arithmetic. They do not use generator facts, parameters, seeds, regeneration or string equality as a mathematical oracle. Division restrictions survive cancellation; universal equality is proved symbolically rather than by checking a few values. The serialized-rubric consistency check is additional to semantic checks of its numerical model, roots, time domain and original substitution.

The executable evidence is [examStudyReinforcement.test.ts](../../../src/__tests__/unit/examStudyReinforcement.test.ts) and [examStudyChoiceBounds.test.ts](../../../src/__tests__/unit/examStudyChoiceBounds.test.ts): **25 tests pass**. Tests also use separate printed-field arithmetic, forced polynomial-cancellation/identity/impossible fixtures, all three feasible linear-model sign/relation branches, and all rectangle branches. The rectangle domain contains **34 positive returns, 17 negative second roots and 9 repeated-zero cases**.

The raw audit recorded **1,380 base outputs**, **1,320 verified MC repackagings**, and **8,940 rejected negative mutations; zero accepted**. Each base output was challenged with an impossible answer, a plausible wrong answer, a removed essential condition, damaged intermediate mathematics and an unrelated solution. MC mutations select a different valid mark. Native rubric mutations replace each of four criteria's expected/alternative/error semantics, while keeping the structured and printed rubric consistent, so rejection is not attributable merely to serialization mismatch. Extra tests reject wrong roots, admitting `t=0`, a closed/wrong upper bound, wrong changing lengths and false zero-denominator witnesses.

These are output/verification records, not unique-question or family counts. The 512 model records contain **441 unique canonical keys**; all other declared samples have distinct keys. Only the four explicit finite domains are exhaustively tested. Classification/model remain honestly sampled existing scopes, with `maxAttempts:48` as a retry budget rather than a capacity claim.

## Count-choice defect

`studyChoiceBounds.ts` reads the actual statement count and supplies four mathematically distinct distractors in `0..n`; existing MC packaging still shuffles the resulting five choices. Injected impossible/equivalent/fractional/malformed alternatives are rejected, and fewer than five possible counts fails closed. Catalog MC support uses the same conversion probe. Conversion preserves base parameters, logical identity and mathematical content digest; response format/order/seeds do not create families. Existing core recipes may choose different underlying seeds when the requested format changes; each converted item's identity is still that of its own base task.

Coverage includes **1,620** synthetic but mathematically consistent count/domain/order cases (`n=4..12`, every answer `0..n`, twenty orders), plus the actual old EQ06/EQ09 family seeds `1638860089`, `648800451`, `1360768244` with twenty orders each. Actual core requests for EQ06/EQ09 at seeds **71 / 20261019** deliver twelve checked MC records. Wrong marks and out-of-range/equivalent injected choices reject. Non-list numeric conversion is preserved.

## Validation and integration notes

- Node **24.22.0**, `env -i`, fixed Node/system PATH, `NODE_ENV=test`, custom Vitest `envDir:false`; no `.env`, DB, provider, installation, build, push or deployment.
- Owned 25 tests, ESLint, full 8 GB TypeScript check and final scoped TypeScript check pass. Default-heap TypeScript first exhausted memory; the configured 8 GB retry exposed one return-type inference issue, which was fixed and checked.
- Broad existing examStudy run: **227 pass / 4 fail / 6 skip**. One expected parent-owned update is `examStudyCoreLegacy.test.ts:308`, evidence-count expectation **6 → 12**. Three failures are the unrelated strict Python renderer/integration path under sanitized PATH without `python`; coordinator owns its configured Python run and final integration/build.
- Raw evidence is in ignored `.qa-artifacts/math-exam-engine-completion-20261019/`: `reinforcement-final-results.json`, `reinforcement-cases.jsonl` (1,380 complete records), `reinforcement-measured.json`, test/config scripts, lint/type logs and broad-run failures. Coordinator must copy it before worktree cleanup.

No claim is made about restored school originals, coverage of entire school exams, measured difficulty/learning effects, visual/print QA or production deployment. The remaining six unavailable demands are owned by other workers. The worker completion receipt supplies this implementation commit's SHA.
