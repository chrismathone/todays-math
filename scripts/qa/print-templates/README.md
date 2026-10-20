# 인쇄 템플릿 검토 도구

제품 `src/**`를 수정하지 않는 DB 없는 지면 검토다. 외부 API를 호출하거나 문제은행·학생 기록을 읽지 않는다. `npm install`, `prisma generate`를 실행하지 않는다.

## 현재 상태 (2026-10-20)

- 빠른 채점표 4안 완료: `6c52d6869`.
- `build-quick-key.mjs`는 제품의 `fractionViewFor`, `MathText`, `SolutionText`를 가져와 자체 제작 정답을 조판하고 서버 없이 여는 HTML을 저장한다.
- `verify-wires.mjs --quick-only`로 저장 HTML을 다시 열어 12사례의 문항 번호 완전성, 셀·쪽 넘침과 외부 요청을 확인했다.
- 템플릿 실측은 별도 Orca Codex 워크트리 `print-template-measure`에서 완료해 `7e0e09382`로 통합했다. 실제 첫/마지막 12면, 30쌍 픽셀 비교와 한글 글꼴 확인을 보존했다.
- Hi-fi B의 5안·두 판·25/50/100문항, 총 30사례 검증과 캡처 완료: `ce23d039f`. 결과와 30장 캡처는 `docs/planning/tracks/reports/answer-quick-key-hifi-20261020.md`를 참조한다.
- 리드가 실행을 재개했다. **Hi-fi → 템플릿 측정 → Wire 순서로 한 단계씩 실행하며 Vite·브라우저 기동 전 가용 메모리 3GiB 이상을 확인한다.** 전체 타입 검사는 이 트랙에서 실행하지 않는다.

## 재현 순서

한 단계가 끝나고 프로세스가 종료된 것을 확인한 뒤 다음 단계를 실행한다. 작업 관리자 또는 `Get-CimInstance`로 해당 작업의 프로세스와 가용 메모리를 확인한다. 다른 작업의 프로세스는 종료하지 않는다.

1. 별도 워크트리의 실제 `WorksheetPrint` 측정 완료와 커밋을 확인하고 이 브랜치에 통합한다. 캡처 12장과 수치·코드 비교표를 검토한다.
2. `evidence/rendered-pages.json`이 준비되면 `node scripts/qa/print-templates/build-template-wire.mjs`로 Wire HTML을 만든다. 이 단계 자체는 파일을 읽어 HTML을 만드는 작업이며 브라우저를 띄우지 않는다.
3. 가용 메모리와 리드의 실행 가능 상태를 확인한 뒤 `node scripts/qa/print-templates/verify-wires.mjs`를 단독 실행한다. 종료 후 남은 Vite·크로뮴 프로세스가 없는지 확인한다.
4. 4방향의 스크린샷을 눈으로 확인하고, 넘침이 있으면 코드 수정 → 해당 검증만 다시 실행한다.
5. 최종 측정 보고와 추천을 기록하고 작업 단위 커밋. 푸시하지 않는다.

## 템플릿 Wire 입력

`evidence/rendered-pages.json`:

```json
{
  "styles": "캡처 지면에 쓰인 CSS (또는 CSS 문자열 배열)",
  "templates": {
    "pyeongga": { "first": "첫 쪽 HTML", "last": "마지막 쪽 HTML", "items": ["문항 HTML"] },
    "jeongtong": { "first": "...", "last": "...", "items": ["..."] },
    "modern": { "first": "...", "last": "...", "items": ["..."] },
    "workbook": { "first": "...", "last": "...", "items": ["..."] },
    "jaseup": { "first": "...", "last": "...", "items": ["..."] },
    "yuhyung": { "first": "...", "last": "...", "items": ["..."] }
  }
}
```

`first` / `last`는 실제 A4 루트(`[data-unified-paper]`)를 포함한다. `items`는 숨은 측정 호스트를 제외한 실제 페이지의 `[data-measure-idx]` 전체를 원래 번호순으로 담는다. CSS는 원래 지면의 토큰과 CSS 모듈을 포함하되, 캡처를 위한 전체 화면 숨김 규칙은 제외한다. 이미지와 글꼴을 외부 서버에서 가져오는 입력은 최종 저장 전 포함하거나 로컬 자원으로 바꿔야 한다.

현재 여섯 지면은 원래 DOM을 보존한다. 제안 22면은 모두 같은 정통 지면의 문항 DOM과 원래 document 래퍼를 사용하여 머리·문항 배치·풀이 공간의 차이만 보게 한다. C안은 기존 여섯 이름의 대응표를 보여 주되, 통합 후의 네 지면만 그린다. 두 단의 문항은 왼쪽 단을 위에서 아래로 읽은 뒤 오른쪽 단으로 이어진다.

## 해석의 한계

- 빠른 채점표의 해설은 앞 3개만 보여 준다. 전체 정답·해설지의 제품 페이지 수가 아니다.
- 50·100문항은 자체 제작 25문항의 답을 반복한 스트레스 표본이다.
- 템플릿 제안은 첫 2~6문항의 첫 쪽 Wire다. 25문항 전체의 새 페이지 수나 제품 페이지 나눔의 검증 결과로 해석하지 않는다.
- 선택 전 Hi-fi나 제품 구현, `/dev/print-check` 항목 추가, 실물 검수는 하지 않는다.

## WorksheetPrint template measurement

This DB-free harness imports the real `WorksheetPrint`, `useMeasuredPages`, all six product templates, unified math/figure rendering, app global CSS, CSS modules and KaTeX CSS. It creates no Next route and does not install packages or generate Prisma. It does not create template or quick-key Wire designs.

Run from the repository root **only when the supervising parent has cleared the machine's memory gate**:

```powershell
node scripts/qa/print-templates/measure.mjs
python scripts/qa/print-templates/compare.py
```

Requires the existing Vite/React/Playwright packages, Playwright Chromium and Python Pillow. Each Vite/Chromium launch waits for `os.freemem() >= 3GiB`. Vite serves only the small harness root and auto-discovers dependencies from its `index.html`; its cache lives under ignored `.qa-artifacts/`. React transformation excludes dependencies and caches. Tailwind scans only math components, the two unified problem renderers, and the shared choice/figure class definitions; the actual global declarations and print CSS are retained. No renderer, pagination function or font loader is mocked. The app's default `system` print font pack uses installed Windows fonts; browser-reported platform fonts are queried at a direct Korean-text leaf, so these captures must not be described as server-PDF font evidence.

The stable 25-item fixture repeats a deliberately authored five-problem mix five times: fraction short answer, equation multiple choice, inline SVG geometry, long word problem, fraction multiple choice. Thus 10 multiple-choice and 15 short-answer problems, including five figures and five long prompts. This is layout evidence, not a curriculum-valid examination or a bank-content audit. The fixture uses the ordinary markdown problem renderer; OCR/crop/English variants are outside this sample.

All settings except `template` are identical: product defaults, A4, one column, 18px gap, normal margins (top/bottom 12mm, left/right 15mm), system font, navy `#1B2A4E`, automatic choices, chapter/difficulty/date on, answers off, explicit solving area off. Workbook and self-study still render their built-in one-column workspaces. All template-specific metadata is populated to avoid comparing empty headers. This compares selecting templates from one fixed settings state; it does not invent per-template defaults.

Pagination completes in screen media, with `WorksheetPrint.onReady === true`, then the same production export document is captured in print media. After preserving original DOM/metrics, the export document is cloned directly into body, retaining head CSS, as export clients do; app ancestor paint contexts must not obscure capture. Page internals remain unchanged. PNGs use a fixed 794×1123 crop (A4 rounded up at 96dpi), device scale 1; the DOM itself remains 793.6875×1122.515625 CSS px. `metrics.json` records all pages, question rectangles, text-line top counts, computed font values, loaded platform fonts, source SHA-256 fingerprints, browser, platform and base commit. Line counts merge text fragment tops at half-pixel resolution and exclude KaTeX accessibility text; fraction/superscript vertical fragments also count, so these are comparative rendered baselines, not semantic sentence counts or pure prose lines. `compare.py` rejects captures with fewer than 1,001 dark pixels; visual inspection remains necessary.

Artifacts under `evidence/`:

- `{template}-{first,last}.png`: twelve actual A4 captures.
- `contact-{first,last}.png`: six-column reading aids, downscaled from captures.
- `rendered-pages.json`: parent builder schema `{styles, templates:{[template]:{first,last,items}}}`. `first`/`last` preserve the export-document wrapper and its actual A4 `[data-unified-paper]` child; `firstSheet`/`lastSheet` also retain bare sheet outerHTML. `items` contains only actual export-page questions in original order. Capture-only visibility CSS is excluded. CSS font URLs become data URIs; inline fixture figures require no external URL. The wrapper preserves CSS-module ancestry and inherited font variables. A `:root` bridge supplies the same font variables for standalone question snippets. Per-template style snapshots are retained too.
- `fixture.json`, `metrics.json`, `partial-metrics.json`: exact input, completed manifest, checkpoint.
- `pixel-comparisons.json`: all fifteen pairs on first and last pages.
- `capture-ink-checks.json`: size and actual dark/nonwhite pixel counts for every capture.
- `pyeongga-jeongtong-{first,last}-difference.png`: absolute RGB difference images.

Pixel comparisons use same-size, top-left-aligned, full-resolution captures without shifting, masking or background removal. A pixel differs if its largest absolute channel difference exceeds 16/255; report both total-page percentage and the nonwhite-union denominator (either source has a channel below 245). Blank paper can make the total-page ratio small. Different pagination/content on the last page is intentionally included; it measures the complete printed result, not identical-content typography. Do not interpret these numbers as perceptual similarity scores or learning-effect measures.
