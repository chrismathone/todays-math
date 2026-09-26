# Math Explorers concept engine

Imported from the user-provided `Math_Explorers_Codex_Package.zip`, source snapshot
`ae8dcb8f80d93b737fc9157324d3fdd559723fbd` (handoff dated 2026-09-26).

Original SHA-256:

| File                        | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `lib/definition-content.ts` | `b58df583ee469dfc69b8a565794a1435675be17dcc8ff12c4fbbecf0f0a75633` |
| `lib/definition-cards.ts`   | `11753bf8628fd84d8394f2b918c6fa06b378cd109d98ca4de3fcac9e4ed116ac` |

## Preserved

- All 46 unit IDs, 230 concept IDs, authored definitions/examples and prerequisites.
- Ordered two-word assembly, multiple example selection, and immediate true/false grading.
- Five-card / 15-activity unit, memory and prerequisite repair routes.
- Three wrong-answer retry rounds; first-attempt accuracy remains separate from recovery.
- 1/3/7/14/30-day review intervals, actual completion date anchoring, early-practice protection.
- At most three card stars and one star per unit chest, without duplicate rewards.
- Base growth costs 3/6/12 stars across three upgrades; lifetime earned stars remain unchanged.

## Integration changes

- The original demo/game profile and hosting/database dependencies are replaced by an
  authenticated student's minimal `ExplorerProfile` and immutable transition wrapper.
- The caller supplies the server's Asia/Seoul learning date; clients cannot select it.
- Strict action/state schemas and request receipts support conflict checks and safe retries.
- Public choice IDs represent shuffled display positions. Curriculum answer keys remain
  in the server engine and are absent from ordinary activity responses.
- New-card definition reading remains educational content. During activities there is no
  definition hint or automatic solution. Explicit solution requests are allowed after
  the full session, including retries, finishes.
- A complete, resolved daily session advances the durable journey once per server date.
  Individual answers and extra same-day sessions never advance it.
- Replaying a completed day leaves card schedules, stars, history and journey unchanged.

The scope remains core concepts, not every textbook standard or an exhaustive problem
bank. The existing generated problem-bank practice continues separately.
