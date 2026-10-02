# English listening component browser harness

This isolated development harness renders the actual `ListeningTeacherWorkspace`
and `ListeningStudentView`. Every screen is labeled **개발 검증용 · 저장/인증은 대역**.
It imports the current `src/app/globals.css` tokens and the components' own CSS.
It adds no product route, menu, dependency, authentication or persistent storage.

From the repository root, using the already installed packages and Chromium:

```powershell
node node_modules/@playwright/test/cli.js test --config e2e/english-listening/playwright.config.ts
node node_modules/eslint/bin/eslint.js e2e/english-listening
node node_modules/typescript/bin/tsc -p e2e/english-listening/tsconfig.json --noEmit
```

For manual inspection:

```powershell
node node_modules/vite/bin/vite.js --config e2e/english-listening/vite.config.mts
```

- `http://127.0.0.1:4198/`: teacher selection, playback and review.
- `http://127.0.0.1:4198/student.html`: student device sound check and answers.
- `http://127.0.0.1:4198/student.html?audio=teacher_device`: classroom broadcast.

Port 4198 is strict and binds only to loopback. Playwright starts its own Vite
process with `reuseExistingServer: false` and stops it at the end. Manual Vite
processes must be stopped by their operator.

`fixture-server.ts` runs only via Vite `ssrLoadModule`. It builds the existing Node
domain fixture and uses the real attempt reducer and student projection. The
student HTML entry imports no teacher component or domain fixture, and initially
receives only the locked student DTO, a minimal attempt snapshot and test media
URLs. Teacher documents use a separate fixture endpoint and entry. These local
endpoints have no authentication and must never be deployed as a learner API.

Each page load creates an in-memory attempt. The first answer is committed on the
server, then an explicit fixture failure envelope simulates losing its response.
The component retries the same request ID, revision and answer; the domain reducer
deduplicates it. This deliberate application error uses HTTP 200 so browser
resource errors remain observable rather than being excluded from assertions.
The fixture clock and readiness facts are synthetic, not production authorization.

Answer callbacks return only attempt snapshots. Review content arrives only when
the operator clicks **서버 공개 상태 새로 확인**, which requests a fresh projection.
Completing a two-question group makes the server projection eligible for release;
answer acknowledgement or advancing the browser clock alone never changes the
component's DTO. This explicitly tests the component boundary rather than claiming
to implement production synchronization.

Audio is generated PCM WAV sine tone with single-byte-range support. The real
browser `HTMLAudioElement.play()` runs, media time advances, pause/seek/restart and
retirement are checked; no media methods are mocked. The tone is not spoken lesson
audio, and a headless test does not prove physical speakers or human audibility.
Teacher-device student mode must create zero audio/video elements and issue zero
media requests before and after review release.

The suite covers desktop 1440×1000 and mobile 390×844, saves full-page screenshots
for selection, review, sound check, question, answer failure, submission and
broadcast states, and checks horizontal overflow at each capture. Browser page
errors, console errors, failed resources and framework error overlays fail tests.
Screenshots, attachments and failure traces are written under the OS temporary
directory `english-listening-playwright`; each screenshot's absolute path is
printed as `SCREENSHOT ...` in the run output. No screenshots enter Git.
