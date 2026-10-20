# 개념 백지 답란 공용화 — 2026-10-20

지시서: [cb-writing-area-brief](../brief-concept-blank-writing-area-codex.md).

## 범위

개념 백지 A의 왼쪽 줄·그림 모눈·예 상자 내부, B의 쓰기·까닭 줄,
C 적용의 빈 내부, D의 새 질문·옛 뜻 가지 줄, E의 쓰기 줄을
`WritingArea`로 그린다. 외곽 요소의 크기·최소 높이·flex·테두리는
기존 개념 백지 CSS가 유지한다.

`WritingArea`에 외곽 레이아웃 없이 기존 div를 대체하는 `surface`와
CSS 길이·색·줄의 시작 위치 선택 속성을 추가했다. 기존 서술형 B의
기본값은 그대로다.

| 바꾼 자리                  | 파일:줄                                                            | 보존 방법                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 공용 답란                  | `src/components/print/WritingArea.tsx:4` · `:62`                   | `surface`는 추가 래퍼 없는 div. 형식별 class·style·자식·data 속성을 받는다. 기본 경로는 기존 section·머리표·분할을 유지한다. |
| 아래쪽에 긋는 줄           | `src/components/print/WritingArea.module.css:48`                   | 기존 서술형의 위쪽 선은 기본값. 개념 백지만 `linePosition="bottom"`으로 30px 구간 아래쪽에 1px 선을 긋는다.                  |
| A 왼쪽 줄 · 오른쪽 그림/예 | `src/components/concept-blank/paper/StudentBody.tsx:79` · `:84`    | 16px 모눈과 기존 색. 오른쪽 170px·30px 배수 내림·점선 테두리·이름표는 기존 CSS에 남긴다.                                     |
| B 쓰기 줄 · ○× 까닭 줄     | 같은 파일 `:120` · `:152`                                          | `termRuledLines`·최소 높이·flex·첫 줄 정렬 유지. ○× 표시 자체는 그대로다.                                                    |
| C 적용 풀 자리             | 같은 파일 `:210`                                                   | 기존 적용 div를 빈 무늬 surface로 대체. 120px 최소 높이·빈 내부·발문과 답 밑줄 위치를 유지한다.                              |
| D 새 질문 · 옛 뜻 줄       | 같은 파일 `:311` · `:323`                                          | 가지 배치·최소 줄 수·물음·예·연결선 그대로.                                                                                  |
| E 그림 아래/옆 쓰기 줄     | 같은 파일 `:487`                                                   | 카드의 남는 높이를 채우는 기존 flex와 최소 30px 그대로.                                                                      |
| 개념 백지 CSS              | `src/components/concept-blank/paper/paper.module.css:347` · `:464` | 중복 줄·모눈 배경 선언만 공용 CSS로 이동. 형식별 치수와 배치는 남긴다.                                                       |
| 실물 검수 대기             | `src/app/dev/print-check/items.ts:86`                              | 새 항목 하나. 정확한 개수 단정은 `src/__tests__/components/PrintCheck.test.tsx:258`에서 143→144, 기존 항목 단정 유지.        |

## 회귀 기준과 검증

제품 변경 전 기준 HEAD: `431eb7d5fd5bfb4ee0d2eeeb23f1241c9d2c1770`.
새 질문·옛 자료 각각 A~E 학생지와 채점표, 서술형 B 학생지·채점표의
컬러·흑백 답란 토큰 표본을 사용했다. 서술형 학생지에는 72mm 분할 답란과
48mm 통답란을 함께 넣었다.

**24개 문서 · A4 35쪽 · 화면 PNG 35개 + PDF PNG 35개 모두 바뀐 픽셀 0,
최대 채널 차이 0이다.** 안티에일리어싱 허용치도 두지 않았다.
기존 요소의 좌표·크기·텍스트·쪽 수·글꼴 상태도 정확히 일치한다.

| 표본                         |      학생지 |   채점표 | 화면/PDF 이미지 비교 |
| ---------------------------- | ----------: | -------: | -------------------- |
| 옛 자료 A/B/C/D/E            | 2/2/2/2/1쪽 |   각 1쪽 | 28개 PNG 차이 0      |
| 새 질문 A/B/C/D/E            | 2/2/2/5/1쪽 |   각 1쪽 | 34개 PNG 차이 0      |
| 서술형 B 컬러·흑백 답란 토큰 |    각각 1쪽 | 각각 1쪽 | 8개 PNG 차이 0       |

환경은 macOS의 Chromium 계열 Chrome `155.0.8059.85`, 인쇄 매체,
A4·배경 그래픽 켬, Poppler 144dpi이다. Next/DB 없이 Vite 하네스에서
제품 컴포넌트를 직접 실행했다. 제품 명조 파일을 사용하며 개념 백지의
글꼴 적재와 모든 표본의 글꼴 오류 없음도 확인한다.
대표 A~E·서술형 B 렌더를 직접 열어 줄·모눈·상자·기존 이름표를 확인했다.

TDD 순서:

1. 제품 수정 전 `conceptBlankWritingAreaRegression.test.ts`의 스냅샷 2개로
   전체 `planSheet` 결과의 SHA-256과 지면 코드를 고정했다.
2. 공용 답란 공유 범위 시험을 추가해 새 질문·옛 자료 모두 실패함을 확인했다.
3. 제품 수정 전 PDF/PNG를 확보하고 소스 해시를 기록했다.
4. 구현 후 스냅샷 갱신 없이 전체 관련 시험을 통과하고 픽셀 차이 0을 확인했다.

쪽 나눔 SHA-256:

- 옛 자료: `e8aa9e7a40a4458c851590b524b17bf0796497fb41d9ba1ed5f26777f246561b`
- 새 질문: `2de4f2fc54cd3687b93db7c8c199dd7ad1a2ec56a53194273856e3880dbe1f24`

지면 코드:

- 옛 자료: `1E4Q.NTQR.P1C2.S2R5.GB4B.0P1C.RSRE.EQ`
- 새 질문: `1E4Q.NTQR.P1C2.S2R5.GB4B.0P1C.R2KZ.A8`

### 실행 결과

| 검사                                | 결과                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 관련 Vitest 12파일                  | **142/142 통과** — 개념 백지 지면·새 질문·코드·쪽 나눔 코드·정확 선택·합치기·서술형 B·print-check·표본 선택·추가 회귀 |
| `npx tsc --noEmit -p tsconfig.json` | 종료 0 (`NODE_OPTIONS=--max-old-space-size=8192`)                                                                     |
| 변경 대상 TS/TSX/MJS ESLint         | 종료 0                                                                                                                |
| `npm run lint:affordance`           | 종료 0                                                                                                                |
| `git diff --check`                  | 통과                                                                                                                  |
| 기존 Playwright 관련 11개           | **9 통과 · 기존 실패 2**. 아래에 변경 전 대조 결과를 남긴다.                                                          |

기존 브라우저 시험은 `fixture`·`stress`·`math`·`counts` 넘침/줄맞춤,
수식·극단 표본 높이 추정, 코드 줄, 빈칸 폭, 새 질문 지도,
7학년 새 질문 B/C 표본을 실행했다. 넘침 측정은 기본 14쪽·극단 50쪽·수식
2쪽·문항 수 57쪽, 합계 **123쪽 모두 0px**다.

남은 기존 실패는 다음과 같다. `HEAD`의 수정 전 TSX/CSS 네 파일을 저장소
밖에 추출하고 Vite `load`로 제공해 동일한 시험 두 개를 재실행했다.
변경 전·후의 측정 JSON은 CSS Modules 식별자 접미사 외에 같았다.
trace의 공용 답란 표지는 변경 전 0개, 변경 후 166개여서
변경 전 렌더러를 실제로 실행했음도 확인했다.

- `estimate.spec.ts` stress: 적용 채점표 7행의 추정 82.7px / 실측 84.6px,
  기록된 여유 −2px. 변경 전에도 동일하게 실패한다.
- `overflow.spec.ts` stress: B 채점표 2쪽 빈 공간 291.2px가 기존 한도
  280.75px를 넘는다. 변경 전에도 동일하다. 지면 넘침 실패는 아니다.

단정·허용치는 수정하지 않았다. 이를 해결하려면 쪽 나눔/높이 추정 정책을
바꿔야 하므로 지면 불변을 요구한 이번 범위에서 남긴다.

### 증거와 재현

큰 증거 파일은 모두 `/Users/pss/tmp/cb-writing-area-20261020/`에 둔다.

- `before/manifest.json`, `after/manifest.json`: 24문서의 페이지별 좌표·글·글꼴,
  브라우저 버전과 소스 해시. 같은 폴더의 PDF/PNG가 실제 증거다(각 약 18MB).
- `comparison.json`: PNG 70개별 변경 픽셀·최대 채널 차이, 소스 해시.
- `vitest.log`, `tsc.log`, `eslint.log`, `affordance.log`: 필수 검사 결과.
- `playwright-filtered.log`, `e2e-after/`: 구현 후 기존 브라우저 시험과 측정값.
- `playwright-baseline.log`, `baseline-sources/`, `baseline-vite.config.mts`,
  `baseline-playwright.config.ts`, `e2e-baseline-runs/`: 기존 실패의 변경 전 재현.
- `baseline-runtime-markers.json`, `baseline-estimate-stress.json`,
  `baseline-report-stress.json`: 변경 전 렌더러/측정값 대조.

Poppler의 `Bad bounding box in Type 3 glyph` 경고는 전후 같은 8개 문서에서
발생했고 종료 코드는 0이다. `manifest.json`에 원문을 보존했다.
이 경고를 숨긴 통과가 아니라 같은 환경에서의 픽셀 불변 결과다.

최초 하네스 준비 중 화면용 body padding이 PDF에 빈 쪽을 만들던 문제와,
명조를 쓰지 않는 서술형 표본에 명조 적재를 요구하던 가드를 바로잡았다.
해당 불완전 실행은 `failed-harness-*`에 분리했고 기준으로 사용하지 않았다.
제품 수정 전에 최종 `before/`를 완료했다.
ExFAT `._*.spec.ts`를 Playwright가 TS로 읽던 수집 오류는 파일 정규식을
`/(overflow|estimate|student-clear|code|ink)\.spec\.ts$`로 한정해 해결했다.
메타데이터 파일이나 기존 시험은 수정하지 않았다.

재현 명령(새 비교를 할 때는 새 저장소 밖 경로를 선택한다):

```sh
npx vite --config e2e/concept-blank-paper/vite.config.mts
# 별도 터미널, 변경 전 소스에서:
node scripts/qa/concept-blank/writing-area-regression.mjs before /절대/증거경로
# 변경 후 소스에서:
node scripts/qa/concept-blank/writing-area-regression.mjs after /절대/증거경로
node scripts/qa/concept-blank/writing-area-regression.mjs compare /절대/증거경로
```

스크립트는 기준 폴더가 이미 있으면 중단해 기준을 자동 덮어쓰지 않는다.
원래 판에서 기준을 다시 만들려면 제품 네 파일만 변경 전 판으로 제공하고,
이번에 추가한 fixture·하네스·캡처 스크립트는 그대로 사용한다.

## 보존한 것과 후속 확인

30px 줄·`#d4d4d8`, A 그림 16px 모눈·`#e8e8eb`, 점선 예 상자,
최소 높이와 남은 높이 채움, `planSheet`, 지면 코드, 머리말과 채점표를
유지한다. 문장 속 빈칸·이름표·지도 연결선·○× 표시는 공유 대상에서 제외했다.

C 적용의 답 밑줄 확장과 양면 인쇄 시 채점표 분리는 기존 별도 결정으로 남긴다.
실물 프린터·복사기는 검증하지 않았으며 `/dev/print-check`에
`concept-blank-writing-area-20261020`을 **대기**로 추가했다.
DB 변경·스테이징·커밋·푸시는 하지 않았다. `node_modules`는 원래
심볼릭 링크를 유지하며 `npm ci`·`prisma generate`·`git add`를 실행하지 않았다.
이번 지시서의 같은 워크트리·커밋/푸시 금지 범위에서 구현과 회귀 대조를 완료했다.
