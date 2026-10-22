# Teacher learning insight synthetic QA

This fixture uses the production CourseDashboard entry, Workroom stylesheet on
representative shell markup, global tokens, Pretendard and KaTeX. All people, records and API responses are
synthetic and held in memory. It reads no environment files or real database and
must reject every request outside the fixture's explicit local routes.

The coordinator must grant the single browser/server lease before running the
verification script. The script owns one local Vite server and one Chromium
engine and closes both in `finally`.

Acceptance includes 390px and 1440px layouts; real font readiness; no document
overflow; labeled controls and visible keyboard focus; loading, empty, error,
unavailable and inconsistent responses; explicit AI requests only; retained
deterministic evidence after AI failure; and stale GET/POST protection when
student, class, branch or reload changes. These checks do not establish real
account authorization, production readiness or educational effectiveness.

`generated.json` freezes actual DTOs and teacher prose from backend commit
`6f78cfaa7`. `generate.ts` checks the snapshot/inference/policy/contract source
blobs against that commit, then uses the backend's pure course transitions,
candidate policy and snapshot/result composers. It creates two separated failed
first-pass sessions, an old excluded record, both synthetic enrollment scopes,
and an outside-pilot snapshot. It stores only public projections, with no
problem answers. No database, credentials, model calls or environment-file
loading are involved. When the backend source is in a checkout, regenerate with:

```sh
node node_modules/tsx/dist/cli.mjs --tsconfig /path/to/backend/tsconfig.json \
  scripts/qa/math-insight-ui/generate.ts /path/to/backend \
  scripts/qa/math-insight-ui/generated.json
```

The final material followup uses `--material-only` with `verify.mjs` after a new
lease grant. It checks ready/current/trigger citations, the explicit question,
and outside-pilot static candidates at both widths; earlier broad-state results
remain separate. A clipped, noninteractive, fixture-only MathText probe loads
KaTeX fonts without adding artificial mathematics to actual server prose.
