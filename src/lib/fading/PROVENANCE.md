# Fading (concept recall) — schedule

`fsrs.ts` is our implementation of the **FSRS-5 long-term schedule**. It was written from the
formulas of the open reference implementation and checked against that project's own test vectors.

| Reference             | Value                                                               |
| --------------------- | ------------------------------------------------------------------- |
| Project               | `open-spaced-repetition/ts-fsrs`, tag `v4.7.1` ("using FSRS-5.0")   |
| License               | MIT — Copyright (c) 2025 Open Spaced Repetition                     |
| Formulas, rounding    | `src/fsrs/algorithm.ts`, `src/fsrs/impl/long_term_scheduler.ts`     |
| Default weights (19)  | `src/fsrs/default.ts` (`default_w`)                                 |
| Test vectors (5 runs) | `__tests__/impl/long-term_scheduler.test.ts` → `fadingFsrs.test.ts` |

## Kept

- Forgetting curve `R = (1 + 19/81 · t / S)^-0.5`; stability is the number of days to 90% recall.
- First-review stability and difficulty per rating, linear damping and mean reversion of difficulty.
- Recall and lapse stability formulas, including the hard penalty and easy bonus.
- Rounding to eight decimals at the same points, so the reference histories replay exactly.
- Interval ordering `again < hard < good < easy`, at least one day, at most 36,500 days.

## Changed

- No dependency is added — the worktree shares `node_modules` with the main checkout.
- Day granularity only: no same-day (short-term) steps, no learning/relearning states, no fuzz.
- Target retention is fixed at 0.9. Per-student weight fitting is not implemented.
- No dates inside: callers pass whole elapsed days (Korean calendar days in this product).
- `schedule.ts` pins the interval after "again" to one day. The memory values after a lapse are
  still the ones this schedule computes; only the next date is ours (a failed concept comes back
  tomorrow instead of in several days).
