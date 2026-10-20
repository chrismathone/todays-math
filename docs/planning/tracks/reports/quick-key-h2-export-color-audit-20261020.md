# H2 빠른 채점표 — 내보내기·색 정적 감사

2026-10-20. 감독 범위: stage 1의 읽기 전용 조사. 부모 `C:/Users/user/orca/workspaces/todays-math/print-templates`의 최신 소스를 직접 읽었다. 조사 시 HEAD는 `ac57ef533d8909b9d32319c7a8abb5fb8e102f80`, 작업 트리 변경 표시는 없었다. H2 제품 구현 전의 기존 `AnswerPage`를 기준으로 하며 부모의 후속 구현을 검증한 보고가 아니다. 본 작업은 이 보고서만 작성한다. Vite·브라우저·vitest·tsc·네트워크·내보내기 엔진을 실행하지 않았다.

## 결론

- **HWPX도 정답을 포함한다.** `showAnswers`와 `quickAnswerOnly`는 export API의 별도 옵션이 아니라, 먼저 `WorksheetPrint`의 export DOM을 구성하는 옵션이다. HWPX·PDF는 그 전체 DOM의 페이지를 읽으므로 문제지 뒤에 붙은 답지를 함께 내보낸다. `quickAnswerOnly=true`만으로는 답지를 켜지 않으며 `showAnswers=true`도 필요하다.
- **HWPX는 브라우저 답지의 내용을 수집하되 수식·문장을 native 한글 요소로 다시 쓴다.** PDF처럼 HTML을 그대로 인쇄하는 경로는 아니다. H2 표의 내용이 수집되는 배선과 한글 앱에서의 표 모양·행 나눔 보장은 구별해야 한다. 후자는 이번에 실행 검증하지 않았다.
- **문제의 세 답에 주황·파랑을 지정한 정적 근거는 발견하지 못했다.** 저장 Hi-fi DOM에 색 속성·색 LaTeX 명령·KaTeX 오류 표지가 없고, 답 영역 CSS는 지면의 `#0e0e10`을 상속하도록 되어 있다. 내장 글꼴도 배포 KaTeX 바이트와 일치했다. 따라서 ‘시안이 답을 주황·파랑으로 덧칠했다’거나 ‘특정 폰트가 원인이다’라고 확정할 수 없다. 최종 색 원인은 부모의 실제 Chromium 점검이 남는다.

## 내보내기 경로

| 경로 | 답지 포함을 결정하는 곳 | 실제 출력 경로 | 확인 범위 |
|---|---|---|---|
| 미리보기 | `WorksheetPrint.tsx:70`의 `showAnswers ? problems : EMPTY` | `useMeasuredPages(AnswerPage, …)` → `AnswerPage` | 문제·답지 쪽을 한 `pages` 배열에 순서대로 담음 |
| 인쇄 / 브라우저의 PDF 저장 | 위와 같은 DOM | `WorksheetEditor.tsx:217` → `preflight("print")` → `window.print()` | 제품 인쇄 CSS를 사용. 브라우저 PDF 저장은 별도 서버 경로가 아님 |
| PDF 다운로드 | 이미 생성된 `[data-mathgen-document]`의 전체 자식 페이지 | `WorksheetEditor.tsx:266` → `exportPreviewPdf` → `/api/exports/pdf` → `buildPdf` | HTML·활성 CSS·상속 폰트 변수를 복제. 페이지 배치를 분할 전송해도 답지 kind를 거르지 않음 |
| HWPX 다운로드 | 같은 전체 export DOM | `exportPreviewHwpx` → `collectHwpxLayout` → `/api/exports/hwpx` → `buildHwpxParts` → Python native writer → `hwpxZip` | 모든 `[data-unified-paper]`를 수집. 답지만 제외하는 필터 없음 |

`WorksheetEditor`의 이 출력 화면에서 직접 제공하는 파일 경로는 PDF·HWPX이며, 직접 `.hwp`·DOCX 내보내기 분기는 확인되지 않았다. 다른 학생·영어·성적표 화면의 독립 출력까지 같은 배선이라고 일반화하지 않는다.

### 옵션과 답 조판의 소유자

`WorksheetPrint.tsx:125`에서 `answers.pages`를 문제 페이지 뒤에 붙이고, `:222`의 export document 안에 `data-page-kind="answers"` 페이지도 그대로 렌더한다. `showAnswers=false`이면 답지 측정 입력이 비어 답지 페이지가 없다.

현재 `AnswerPage.tsx:35`는 문제마다 `fractionViewFor(p)`를 한 번 정한다. 수학 정답은 `shown(p.answer || "정답 미입력")` → `MathText`, 해설은 `shown(p.solution)` → `SolutionText`다. `:60`의 `!options.quickAnswerOnly && p.solution`만 해설 유무를 가른다. 즉 조사 기준의 ‘정답만’은 정답 행을 유지하고 해설을 생략한다. **현재 기준에 H2 채점표는 아직 없다.** 영어 문제는 같은 파일의 별도 `EnglishAnswer`에 `quick`을 넘긴다.

`fractionDisplay.ts:35`는 학년·본문·정답·해설로 분수의 표시를 정하는 문자열 변환이며 색을 지정하지 않는다. 중1인 Hi-fi 픽스처는 초등 대분수 변환 대상이 아니다. `MathText.tsx:19` → `normalizeOcrText` → `MarkdownRenderer` → remark/rehype/KaTeX가 답 HTML을 만든다. 수식 출력과 일반 텍스트 색을 결정하는 일은 분수 정책과 분리되어 있다.

### HWPX는 무엇을 옮기는가

- `hwpxClient.ts:9`는 `collectHwpxLayout(root)` 결과인 `pages`와 자산만 사용한다. POST 본문은 `{title, pages}`이며 답 문자열·`showAnswers`·`quickAnswerOnly`를 따로 전달하지 않는다. API schema도 이 두 플래그를 받지 않는다.
- `hwpxLayout.ts:141`부터 source를 복제해 body에 붙이고, `:164`부터 모든 `[data-unified-paper]`를 순회한다. `:192`의 `styleFor`는 `getComputedStyle`의 글꼴·크기·색·굵기·밑줄을 수집한다. 보이지 않는 요소를 거르는 조건은 있으나 `data-page-kind="answers"`를 제외하는 조건은 없다.
- `:293`의 KaTeX는 `data-export-tex` 또는 `annotation[encoding="application/x-tex"]`의 원식을 읽어 `equation` 객체로 옮긴다. KaTeX의 접근성·화면 텍스트를 중복 수집하지 않는다. 일반 텍스트는 `:347`의 TreeWalker로 모으며 그림/SVG는 PNG 자산으로 옮긴다. 배경·테두리 등은 장식 객체로 별도 수집한다.
- `hwpxServer.ts:87`은 환경에 따라 engine transport 또는 `scripts/hwpx/export_parts.py`를 호출한다. 후자는 `writer.build_parts`의 adapter다. `writer.py:45`에서 LaTeX를 한글 수식으로 바꾸고 한글 수식 상자 크기를 계산하며, `:117`의 문자 스타일 키에는 수집한 색도 포함한다. 파일 이름만 HWPX인 페이지 스크린샷이 아니라 편집 가능한 native 문장·수식이다.
- 기존 grid 전용 보조 계약은 `[data-hwpx-grid]` 직계 자식과 문서 순서/좌표로 행·열을 식별한다(`hwpxLayout.ts:45`). 새 H2의 CSS grid가 native 표·문단에서 정확히 같은 행 경계를 갖는지는 이 일반 배선만으로 증명되지 않는다. 수식 폭·테두리·병합칸·이어지는 쪽의 검증은 별도다. 이번 범위에서는 HWPX 코드를 수정하지 않는다.

PDF는 `pdfClient.ts:27`에서 원본 DOM을 clone하고 폰트 변수와 활성 CSS를 보존하며, 페이지 수·요청 바이트 한도로 나누어 보낸다. `pdfServer.ts:103`은 인쇄 매체, `:193`은 A4 PDF와 `printBackground:true`를 사용한다. 따라서 H2 구현 후에는 같은 export DOM에 들어간 채점표가 이 경로로 전달된다. 서버의 폰트·한글 앱의 재조판까지 브라우저와 픽셀 일치한다고 보장하지 않는다.

## H2 Hi-fi의 색 — 정적으로 확인한 것

대상은 `docs/design/mockups/answer-quick-key-hifi-20261020.html`. JSON `captured.source`는 `answer-quick-key-wire-20261020.html`, `sourceCommit`은 `6c52d6869`다. 색 관련 보고 대상은 10번 `5/8`, 19번 `2(a+b)`, 25번 소문항 목록이다.

| 대상 | 저장 DOM/원식 | 명시 색 / 오류 표지 |
|---|---|---|
| 10번 | `.katex`, 원식 `\displaystyle \dfrac{5}{8}` | color·mathcolor·색 명령 없음; `katex-error`, `#cc0000`, `math-raw` 없음 |
| 19번 | `.katex`, 원식 `\displaystyle 2(a+b)` | 같음 |
| 25번 | `(1)` … `(10)` 일반 번호 사이에 KaTeX 숫자 12, 24, …, 120 | 같음. 원래 Wire의 5개 답과 구별해야 함 |

25번은 `refresh-hifi-long-answer.mjs`가 `fractionViewFor` + 제품 `MathText`로 열 소문항 답을 다시 렌더하고 JSON의 `answers[24]`를 교체했다. 즉 목록 전체가 별도의 유색 그림인 것이 아니다. 첫 두 답은 `quick-key.tsx`의 자체 제작 25답에서 같은 조합으로 생성된 HTML이다.

저장 HTML의 `cell(i, span)`은 `<span class="number">번호</span><span class="answer">captured.answers[…]</span>`를 삽입한다. 정답에 색을 덧씌우는 JS setter는 없었다. 관련 CSS는 다음과 같다.

```css
.sheet { color:#0e0e10; --ink:#0e0e10; /* … */ }
.key-cell .answer { font-size:12px; line-height:1.8; /* 색 선언 없음 */ }
.key-cell .answer .katex { font-size:1.1em; }
.h2 { --rule:#b9b9be; --ink:#1b2a4e; }
.h2 .paper-head h2 { color:var(--ink); }
.h2 .number { color:var(--ink); /* … */ }
```

H2의 남색은 제목·번호 요소에 지정된다. 답은 `.number`의 자식이 아니라 형제라서 그 `color`를 상속하지 않는다. 이 파일에 함께 보존된 KaTeX CSS에도 답을 주황·파랑으로 지정하는 규칙은 확인되지 않았다. `prose prose-slate` 클래스 문자열은 캡처 DOM에 남아 있으나 이 Hi-fi의 스타일 블록은 KaTeX CSS와 시안 CSS 두 개다. 클래스 이름만으로 실제 색이 적용되었다고 단정할 수 없다. 원래 제품 globals 전체를 불러오는 화면과도 구별해야 한다.

### 글꼴 바이트와 렌더 단계

`build-quick-key.mjs:100`은 CSS의 font URL을 fetch한 바이트 그대로 data URI로 바꾸어 독립 HTML에 보존한다. 저장 Hi-fi에는 **60개 font data URI가 있고, 60/60이 부모 `node_modules/katex/dist/fonts/*` 파일 중 하나와 SHA-256이 일치**했다. 조사한 원본 KaTeX TTF 20개에는 COLR·CPAL·CBDT·CBLC·sbix·SVG 컬러 폰트 테이블이 없었다. 이는 ‘내장 KaTeX 글꼴 바이트가 교체·손상되었거나 컬러 폰트가 답의 주황/파랑을 담는다’는 추정을 지지하지 않는다. 실제로 어떤 face가 사용되었는지, OS fallback이나 rasterization 결과가 어떤지는 브라우저에서 확인해야 한다.

Hi-fi는 기본 비교에서 `.paper-stage { transform:scale(.55) }`, `body.full`에서는 `transform:none`이다. 축소·뷰어 보간·서브픽셀 rasterization은 확인할 후보이지만 **색의 원인으로 입증하지 않았다**. 저장 DOM/CSS와 폰트 바이트를 조사한 것만으로 PNG의 RGB 결과를 설명할 수 없다. KaTeX 일반 오류가 `#cc0000`을 낼 수 있다는 제품 주석도 있으나, 이번 세 답에는 그 오류 표지가 없어서 그 주석을 원인 증거로 재사용하지 않는다.

## 부모의 순차 Chromium 확인으로 남긴 것

1. H2의 10·19·25번에서 번호와 답을 따로 잡고, 보이는 텍스트 잎 및 `.katex`/`.mord`의 `getComputedStyle(color)`·상속 경로를 기록한다. computed color와 PNG glyph 픽셀 색을 구별한다.
2. 직접 텍스트를 가진 잎을 CDP 플랫폼 폰트 조회 대상으로 삼는다. `.answer` 같은 중첩 wrapper의 `fonts=[]`를 실제 폰트 증거로 쓰지 않는다.
3. 같은 DOM을 `.55` 비교 배율과 full/무배율에서 각각 확인하고, 실제 PNG 파일과 뷰어에서 보이는 색을 대조한다. 색이 CSS에서 나오면 matched rule을, computed color가 검정인데 RGB만 다르면 해당 조건·캡처를 남긴다. 원인을 먼저 가정하지 않는다.
4. 제품 H2 정답 잎의 색은 기존 `AnswerPage` 지면의 `#0E0E10`을 기준으로 확인한다. 기존 번호의 `options.color`까지 답의 색으로 옮기지 않는다. HWPX는 별도 native 재조판 검증 잔고로 남긴다.

이 목록은 이번 감사에서 실행하지 않았다. stage 2 템플릿 Hi-fi도 조사·변경하지 않았다.

## 조사 바이트 식별

| 부모 파일 | SHA-256 |
|---|---|
| Hi-fi HTML | `c659e020343017db65c43bbb2e9cc33c1f20b57b144dd3280422ba083fe8ef7b` |
| `WorksheetEditor.tsx` | `fa0ee05441091135ecaa8a90210a01f567030a454d8a4bbe0f0ec5650f0b277f` |
| `print/AnswerPage.tsx` | `c4f829342a5c7d0249a1d23e3f0677d411471ee3f8c5a6b56ffce97e9641a2cc` |
| `export/hwpxLayout.ts` | `01818118b465c4db4e1de9cfc5acc9fb6fe3fba9e73418cc7bd29d6cf82cdd07` |

부모가 구현 중인 파일은 이후 달라질 수 있으므로 이 지문과 기준 커밋을 함께 읽는다. 보고서 신원 SUN / chrismathone@gmail.com. 부모 소스 수정·push·main 병합 없음.
