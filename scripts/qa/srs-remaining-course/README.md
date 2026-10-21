# Remaining course checks, 2026-10-22

Run from the repository root **only after the coordinator explicitly grants the single browser/server slot**:

```sh
QA_CHROMIUM_EXECUTABLE=/Users/pss/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell \
QA_OUTPUT=/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/course \
  node scripts/qa/srs-remaining-course/verify.mjs --browser-granted
```

The Vite harness renders the real `StudentAppShell`, `StudentCourseSrs`, preview book, problem/solution components, globals, KaTeX and product Pretendard font. Next navigation/dynamic import adapters are local only. The API import is replaced only in `StudentCourseSrs`: the fixture uses pure production course start/answer/follow-up/hint/public-reader functions and validates each result with the strict stored schema. Synthetic records live only in page memory/sessionStorage; all external and `/api/` browser requests are blocked. No Next server, authentication, account, database or reset is used. `finally` closes Chromium and Vite.

The 14 preview cards come directly from `PREVIEW_CARDS`, and every left/right leaf is actually opened, captured and practised at 390 and 1440 widths. The verifier records titles/IDs, font/math status, input/submit reachability and no-write snapshots. `case=relearn` deliberately supplies the server's existing `relearn: true` display flag; the real server's derivation/header gate is covered by `courseRelearnFlag.test.ts`.

Typed equivalent-answer and long fixtures use a contract-valid public no-choice problem to exercise the existing text control; they do not assert that the ordinary generator always chooses a text field for fractions. Synthetic question text is labelled local verification and is never offered by the product. Actual validation/grading and follow-up persistence remain the production functions. Preview practice uses the existing card checker. A separate actual choice-generator fixture checks number-key submission and preserved MathML/accessible value names.

The browser matrix includes malformed/duplicate/list-unit answers, first/follow-up zero-write format failures, service retry, equivalent fractions/decimals/mixed answers, unhinted self-check (including legacy list mode), reload restoration, disabled/forced-color styles and long problem/figure/solution reachability at 390×844, 844×390 and 1440×900. The run writes `browser-results.json` and PNGs outside the repository. Inspect PNGs directly before claiming visual completion.

`--interactions-only` repeats the input/restore/choice/scroll matrix without reopening the already verified 14-card matrix. `--long-only` runs only the three long viewports. The long probe uses an exact DOM text Range for the final sentence (a MathText container can span many paragraphs), records the ink rectangle and hit target, then captures and activates «알겠어요» and the next question button separately. Each rerun still requires its own current coordinator browser slot. The executable above is the existing installed Chromium used for this evidence; no browser/package installation was performed.
