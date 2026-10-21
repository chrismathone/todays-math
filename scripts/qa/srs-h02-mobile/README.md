# H-02: course paper in the student shell

This local Vite fixture imports the real `StudentAppShell`, `StudentReviewPage`,
course stage CSS, `StudentCoursePractice`, problem renderer and follow-up UI.
It also checks the older standalone, viewport-sized practice frame. No Next build,
account, server route, database or paid API is needed. Session replies are explicit
in-memory fixtures; this is a layout/interaction check, not a grading test.

The browser runner requires the lead's Chromium turn and an explicit switch:

```sh
QA_OUTPUT=/absolute/external/evidence/path \
  node scripts/qa/srs-h02-mobile/verify.mjs --browser-granted
```

Set `QA_CHROMIUM_EXECUTABLE` to an existing compatible headless Chromium binary
when the shared Playwright installation and downloaded browser revision differ.
Only Chromium is launched, one browser at a time, and both browser and Vite server
close in `finally`. Every request outside the local fixture origin is blocked;
the single figure URL is fulfilled with a synthetic SVG, and other API requests
fail the run. Fonts and CSS come from this checkout.

The matrix covers 390×844, 844×390, 768×1024, 1280×900 and 1440×900. Managed
shell scenes include choices, a list input and a long problem with a figure and
long solution. Each scene checks the problem's actual text, region geometry,
scroll reachability and hit testing, then clicks through first wrong answer →
second try → solution → understood → next question. A standalone choice scene
at each size guards the existing fixed frame.

For before captures, provide the original stylesheet via `QA_BASELINE_CSS` and
add `--before`. It is loaded only by Vite's fixture adapter; no source is reverted.
The same baseline without `--before` must fail the regression assertion. `--before`
records dimensions and captures without attempting to click the collapsed UI.

`server.mjs --serve-only` starts only the local fixture server, without a browser.
The fixture deliberately does not invent a height for the managed shell: doing
so would hide H-02. Full-page captures taken while scrolled can show the sticky
header in the middle; the `*-viewport.png` files capture the actual visible
viewport for the figure and solution footer.
