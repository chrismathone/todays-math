# C2/P1 출력 경로 독립 읽기 전용 감사

2026-10-19. 실제 조사 대상: `/Users/pss/Desktop/creative/today-print-color`. 기준 HEAD `86fb78a678942904f9cfc5e31f79d2e3cb10f5bb`, 브랜치 `phase/12-print-color`. 경로 대조의 마지막 상태 확인은 **11:34:49 KST**, 이후 작성 중 추가된 시험 파일까지 읽었다. 주 작업자가 같은 트리에서 계속 구현 중이므로 아래는 최종 제품 승인이나 고정 커밋의 회귀 검증이 아니다.

## 핵심 판정

- **저장 형식 변경은 필요 없다.** 일반 시험지의 `payload.tag`, 연산의 `payload.presentation.tag`를 그대로 읽고 출력 시에만 전달하면 된다. 워크북의 새 유형·전략 자리도 기존 `printMeta.patternName/patternStrategy`를 쓸 수 있다.
- 감사 시작 때에는 태그 선택·저장은 연결되어 있었지만 출력 전달은 없었다. **조사 도중 주 작업자의 미커밋 구현에 필요한 연결이 들어왔다.** 마지막 대조에서는 연산·시험지 만들기·문제 추출의 공통 출력·내 시험지 재열기에서 태그가 공통 렌더 경로로 도달하는 것을 확인했다. 이를 감사자가 고친 것으로 기록하지 않는다.
- 미리보기·인쇄·서버 PDF·HWPX는 같은 문제지 DOM을 출발점으로 쓴다. PDF/HWPX에 `sheetTag`나 새 메타 키를 별도 API 인자로 추가할 필요가 없다. **DOM에 표시한 실제 내용**이 전달 대상이다.
- **HWPX는 C2의 단색 머리 면·번호 면·흑백 글자·새 유형/전략 텍스트를 수집할 수 있다.** “HWPX는 색/새 칸을 못 싣는다”는 일괄 판정은 코드와 다르다. 종이 전체 배경, 반투명 합성, CSS 효과, 원래 양식의 표/입력칸 구조 및 한글에서 열린 뒤의 정확한 재배치는 별도 한계다.

## 범위와 근거의 성격

읽은 요구는 [제품 구현 브리프](/Users/pss/Desktop/creative/today-print-color/docs/planning/tracks/brief-print-color-impl-codex.md:5), 선행 브리프, [이전 보고서](/Users/pss/Desktop/creative/today-print-color/docs/planning/tracks/reports/print-info-color-codex-20261019.md:45), 그 보고서에 보관된 독립 감사 원문이다. 시안 페이지·fixture·CSS·시험·QA 스크립트, 기존 미커밋 `ExamDetails` 대비 수정과 이후 추가된 제품 전달 코드·머리 컴포넌트·칸 구성표·관련 시험도 읽었다. 이전 보고서의 “기존 자리 배선 누락 0건”은 당시 PrintMeta와 기존 템플릿에 대한 판정이다. 이번에 태그를 찍으라는 새 요구에 필요한 전달 연결과 혼동하지 않았다.

소스·계약·저장/재열기 함수·내보내기 수집기·Python XML writer를 정적으로 조사했다. DB 접근, API 호출, 서버 실행, 브라우저/한글 실행, 테스트·빌드·lint 실행을 하지 않았다. UI/제품 파일 수정, `node_modules` 변경, git add/commit/push, 다른 에이전트 실행도 하지 않았다. 작성물은 이 `/tmp/print-c2-output-audit.md` 하나다. 아래 파일·줄은 실제 대상 작업트리 기준이며 주 작업자의 후속 편집으로 이동할 수 있다.

## 1. 저장된 값의 소유권

| 자료 | 기존 저장 위치와 읽는 길 | 감사 판정 |
|---|---|---|
| 시험지 `draft` | `payload.tag`, `payload.printMeta`, `payload.printOptions`. `WorkspaceDraft`는 tag와 메타를 별도로 가진다. `parseImport`가 tag를 `readSheetTag`로, 메타를 `parsePrintMeta`로 복원한다. | 출력하기 위해 메타 안으로 tag를 이주할 필요 없음. tag가 없거나 일반 draft에서 알 수 없는 값이면 태그 없음. |
| 연산 연습지 `arithmeticSheet` | `payload.presentation.tag`, `.printMeta`, `.printOptions`. presentation은 optional이고 그 안의 version은 기존 1이다. | 연산 본문·생성 시드·payloadVersion을 바꿀 이유 없음. 없는 presentation은 기존 기본값을 사용. **잘못된 연산 tag는 strict schema가 거절**하므로 일반 draft의 unknown fallback과 구분. |
| 추출한 자료 `extraction` | 원본/자르기/검토 상태인 `data`와 `assets`를 저장. 출력 양식 메타를 소유하는 자료가 아님. | 추출 자료 자체에 tag/printMeta를 새로 저장할 필요 없음. 출력할 때 담은 문항의 공통 draft가 소유한 값을 사용. |
| 내 양식 `printPreset` | `PrintOptions` 전체 + 학교/기관·과목·시험 시간·출제자·총점·학원·강사 7개 `head`. | tag·유형명·전략·목표·개념·제목·시험일·학년·학기는 저장 대상 아님. 새 출력 자리가 생겨도 preset 저장 대상을 확장하지 않는다. |

근거:

- [태그 계약:6–8, 23–31](/Users/pss/Desktop/creative/today-print-color/src/contracts/sheetTag.contract.ts:6), [draft 데이터:28–45 및 복원:439–460](/Users/pss/Desktop/creative/today-print-color/src/components/unified/draftStore.ts:439), [연산 presentation:13–51](/Users/pss/Desktop/creative/today-print-color/src/contracts/arithmeticPresentation.contract.ts:13).
- 연산 구형/신형 payload 모두 presentation optional: `src/contracts/arithmeticSheet.contract.ts:41–46`, `src/contracts/arithmeticV2.contract.ts:185–190`. 실제 재열기는 `src/lib/arithmetic/reopen.ts:36–56`, `src/lib/arithmetic-v2/reopen.ts:10–41`에서 저장 스냅샷을 검증해 반환한다.
- 추출 자료의 데이터 범위는 `src/components/unified/studioSessionStore.ts:18–29`; 실제 payload 저장은 [privateStudioSessionStore:307–313](/Users/pss/Desktop/creative/today-print-color/src/components/unified/privateStudioSessionStore.ts:307)의 `{ data: externalized, assets }`다. tag 허용 kind는 `draft/arithmeticSheet`뿐이며 `src/lib/privateDocumentActions.ts:178–184`도 다른 kind의 최상위 tag를 거절한다.
- [내 양식 저장 범위:7–12, 59–80](/Users/pss/Desktop/creative/today-print-color/src/contracts/printPreset.contract.ts:7), 추출/적용은 같은 파일 `155–181`. 적용은 현재 메타에 `preset.head`만 덮어 담지 않은 값을 유지한다. 워크북 유형/전략은 **시험지 전체 저장에는 남지만 내 양식에는 저장하지 않는 기존 계약**이다.

일반 시험지의 클라우드 저장도 전체 draft를 externalize하여 `kind:"draft"`로 보내므로 기존 tag/printMeta가 빠지는 별도 직렬화는 없었다. [privateDraftStore:171–179](/Users/pss/Desktop/creative/today-print-color/src/components/unified/privateDraftStore.ts:171). 재열기는 같은 파일 `32–35`의 `fromDocument → parseImport`, `388–417`의 문서 읽기·materialize·local.openDraft를 거친다. 연산은 `GradeArithmeticWorkbench:138–140`의 `{...sheet,presentation}`을 `475–480`에서 저장하고 `309–317`에서 presentation과 제목을 복원한다. 구형도 `LegacyArithmeticWorkbench:177–178,307–317,472–477`에서 같은 구조다.

## 2. 네 진입 경로와 필요한 연결

| 진입 | 저장/상태 → 출력까지 | 마지막으로 읽은 미커밋 상태 |
|---|---|---|
| 연산대장 | 구형/신형 Workbench의 presentation → `ArithmeticWorkflow` → `WorksheetEditor` | [ArithmeticWorkflow:204](/Users/pss/Desktop/creative/today-print-color/src/components/arithmetic/ArithmeticWorkflow.tsx:204)가 `currentPresentation.tag ?? null`, 같은 파일 `234–237`이 printOptions/printMeta와 setter를 전달한다. 태그 선택은 `210–216`에서 presentation.tag만 변경/제거한다. |
| 시험지 만들기 | `UnifiedWorkspace.draft` → 공통 `editorProps` → `MathExamBuilder` → `WorksheetEditor` | [UnifiedWorkspace:1318–1327](/Users/pss/Desktop/creative/today-print-color/src/components/unified/UnifiedWorkspace.tsx:1318)에 `sheetTag: draft.tag ?? null`과 메타. [MathExamBuilder:563](/Users/pss/Desktop/creative/today-print-color/src/components/exam-builder/MathExamBuilder.tsx:563)가 태그 값을 명시적으로 전달한다. picker의 저장 변경은 `UnifiedWorkspace:1870–1873`의 setSheetTag. |
| 문제 추출 | `StudioView`가 pending crops를 cart에 담음 → 일반 draft 문항 → `onExport` → 공통 `WorksheetEditor` | `StudioView:1966–1978`, `UnifiedWorkspace:1063–1069,1915–1922`. export 화면은 [UnifiedWorkspace:2067–2068](/Users/pss/Desktop/creative/today-print-color/src/components/unified/UnifiedWorkspace.tsx:2067)의 `<WorksheetEditor {...editorProps}/>`라 공통 태그 연결을 함께 사용한다. |
| 내 시험지 | 라이브러리가 문서 ID로 draft 또는 연산을 다시 열고 각 출력 경로에 진입 | [PrivateLibrary:337–353](/Users/pss/Desktop/creative/today-print-color/src/components/unified/PrivateLibrary.tsx:337). draft는 `UnifiedWorkspace:1206–1238`에서 저장된 workflow에 따라 bank 또는 export로, 연산은 `2078–2094`에서 initialStep output으로 연다. 독립 출력 엔진이 아님. |

문제 추출에는 현재 태그 picker 덧붙임 slot이 없다. 이것과 **이미 draft에 저장된 태그의 출력 전달**은 다른 문제다. 문항을 담는 함수는 workflow와 problems를 변경하며 tag/printMeta를 비우지 않는다(`UnifiedWorkspace:1063–1069`). 추출을 거쳐 만든 시험지를 `kind:"draft"`로 저장하면 그 시험지의 tag/printMeta로 재열린다. `kind:"extraction"` 원본 자료를 여는 일을 출력 양식 복원으로 오해하면 안 된다.

내 시험지 목록의 `summary.tag`는 거르기용 짧은 projection이고 printMeta를 포함하지 않는다. `src/lib/privateDocumentTags.ts:15–17,29–32`가 기존 두 저장 위치를 읽는다. 실제 출력은 목록 행의 값으로 새 메타를 만들지 않고 **문서 전체를 다시 읽는 위 경로**를 사용한다.

필요했던 연결은 ① 연산의 presentation.tag 전달, ② 일반 공통 editorProps의 draft.tag 전달, ③ MathExamBuilder 덧붙임 슬롯을 출력 데이터와 연결, ④ 실제 템플릿에 도달하는 렌더 값이었다. 감사 시작 때에는 picker만 있었으나 현재 읽은 코드에는 이 네 연결이 있다. 특히 ② 없이 MathExamBuilder에만 연결하면 문제 추출 export 및 extraction 출처 저장본의 재열기를 놓친다. 마지막 대조에서 그런 별도 누락은 확인되지 않았다.

## 3. 저장 형식을 유지하는 현재 전달 방식과 조건

현재 미커밋 구현은 `WorksheetEditor`의 별도 `sheetTag?: SheetTag|null` prop을 받아 **렌더 중에만** `{...(printMeta ?? localMeta), sheetTag: sheetTag ?? undefined}`를 만든다. [WorksheetEditor:40–41,153–155](/Users/pss/Desktop/creative/today-print-color/src/components/unified/WorksheetEditor.tsx:153). 이것은 저장본의 `printMeta`를 수정하는 코드가 아니다. `PrintMeta` 타입에 optional sheetTag를 추가했지만 [DEFAULT_PRINT_META:175–191](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/types.ts:175)에는 넣지 않았다.

이 방식이 기존 저장 계약을 유지하는 이유와 유지해야 할 조건은 다음과 같다.

1. `parsePrintMeta`는 `DEFAULT_PRINT_META`에 있는 키만 골라 반환한다([settings:89–105](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/settings.ts:89)). 일반 draft setter도 `draft.printMeta + patch`를 이 함수로 정규화한다(`draftStore:880–883`). 렌더용 sheetTag를 이 기본 키 목록에 넣지 않아야 한다.
2. 연산 메타는 `DEFAULT_PRINT_META` 외의 키를 **거절**한다(`arithmeticPresentation.contract:38–46`). 따라서 렌더용 meta 객체 전체를 presentation.printMeta로 역저장하면 호환되지 않는다. 현재 `ArithmeticWorkflow:89–94`는 원래 printMeta에 입력 patch만 병합하며, WorksheetEditor의 파생 meta 객체 전체를 돌려주지 않는다.
3. 내 양식은 정해진 7개 head만 추출하고 options/head 모두 strict다(`printPreset.contract:31–55,59–80,155–167`). 현재 `MathExamBuilder:530–537`은 저장 원본인 `editor.printMeta`를 SavedLayouts에 넘긴다. 태그를 preset head 또는 options에 추가할 필요가 없다.
4. 새 워크북 자리의 값은 이미 `PrintMeta.patternName/patternStrategy`에 있고 기본값도 있다(`types:54–57,189–190`). DB 키/새 저장 버전 없이 현재 [PrintHeader:173–178](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintHeader.tsx:173)가 사용한다.
5. P1은 비활성화만 하고 데이터를 지우지 않아야 한다. 현재 `PrintOptionsPanel:59–61,68–112,184–195`는 field map으로 disabled/설명을 정하고 실제 입력 사건에서만 patch를 보낸다. `templateFields:23–58`의 출력 구성표와 [PrintHeader:37–45](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintHeader.tsx:37)의 렌더 필터를 쓰며 저장 값을 prune하지 않는다.

제목은 기존처럼 별도 `title` prop이 최종 소유자다. `WorksheetPrint:50–67`이 문자열 앞뒤 공백/빈 값을 정리하고 title·subject·grade·examDate의 기존 fallback을 적용한다. Object.entries로 파생 meta를 복사하므로 렌더용 sheetTag도 보존된다. “없음”은 저장 시 tag 키 제거, 렌더 시 undefined이며 새 문자열 “없음”을 저장하지 않는다. [PrintHeader:65–69](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintHeader.tsx:65)는 값이 있을 때만 꼬리표를 만든다.

**재측정·출력 준비 상태에도 태그가 포함되어 있다.** 파생 meta는 sheetTag에 의존하는 useMemo이므로 태그 변경 때 새 객체가 된다. `WorksheetEditor:165–169,188–199,222–225`는 그 meta의 동일성을 준비/비동기 preflight에서 확인한다. `WorksheetPrint:69–75`가 넘긴 meta는 `useMeasuredPages:40–42`의 측정 key와 `175–203`의 첫 쪽/이어지는 쪽 probe에도 들어간다. 태그를 보이는 머리에만 직접 붙이고 측정값/준비 상태에서 빼는 방식은 피해야 한다. 현재 연결에는 그 빠짐이 없다.

## 4. 미리보기·인쇄·PDF 공통 경로

| 출력 | 실제 대상 | C2/필드 전달 판정 |
|---|---|---|
| 미리보기 | `WorksheetPrint:105–143`에서 구성한 `page.content`를 `194–215`의 PaperStrip에 표시 | 같은 Template/meta/options를 사용한다. |
| 인쇄 / 브라우저 PDF 저장 | `WorksheetEditor:205–212`의 preflight 후 window.print; `WorksheetPrint:218–234`의 별도 비축소 문서 DOM | 미리보기와 같은 page.content를 재사용. 축소 thumbnail이나 확대 dialog를 인쇄 대상으로 삼지 않는다. |
| 서버 PDF 내려받기 | `WorksheetEditor:258–278` → `exportPreviewPdf` → DOM·CSS·글꼴 변수 복제 → PDF route/buildPdf | 별도 메타 선별/머리 재생성 경로가 없다. 표시된 태그·새 칸·단색 면이 HTML/CSS에 포함된다. |

핵심 근거는 [WorksheetPrint:110–121](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/WorksheetPrint.tsx:110), [동일 내용의 출력 DOM:218–234](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/WorksheetPrint.tsx:218), [pdfClient:12–44](/Users/pss/Desktop/creative/today-print-color/src/lib/export/pdfClient.ts:12)다. PDF가 클 경우에도 같은 물리 페이지들을 나누어 전송/합친다(`pdfClient:48–65,88–125`).

PDF 서버는 `src/app/api/exports/pdf/route.ts:26`에서 buildPdf로 연결된다. `pdfServer:83`은 받은 HTML/CSS를 문서에 넣고 `99–102`에서 print media로 로드한다. [pdfServer:237–242](/Users/pss/Desktop/creative/today-print-color/src/lib/export/pdfServer.ts:237)는 A4·printBackground true·여백 0이다. 지면 CSS도 `WorksheetPrint.module.css:98–123`에서 색 exact와 A4를 지정한다. 코드에 PDF만 태그/메타/배경색을 제거하는 분기는 없었다. 실제 PDF 호출·프린터 출력·색 재현까지 검증한 뜻은 아니다.

현재 여섯 템플릿은 모두 공통 PrintHeader로 meta/options를 넘긴다: `templates/PyeonggaTemplate.tsx:95`, `JeongtongTemplate.tsx:101`, `ModernTemplate.tsx:98`, `WorkbookTemplate.tsx:138`, `JaseupTemplate.tsx:170`, `YuhyungTemplate.tsx:95`. 머리 면은 `PrintHeader.module.css:37–46,88–96,139–150`, 번호 면은 `templates/ProblemMeta.tsx:168–189`에서 고른 색/inkOnColor를 쓴다. 필드 구성은 `templateFields.ts:23–58`이다.

**쪽/정답지 범위:** 일반 문제지는 첫 문제 쪽에 상세 머리를 싣고, 연산은 회차별 첫 쪽을 `WorksheetPrint:94–103`에서 계산한다. 새 PrintHeader는 `26`의 first와 `242`의 조건을 사용하고 전용 전략/개념도 first 조건을 따른다. 별도 정답지는 `WorksheetPrint:125–141`의 AnswerPage이며 `AnswerPage:85–116`은 제목/회차를 표시한다. 여섯 문제지의 태그·새 칸 표시를 “정답지 모든 쪽에도 동일한 머리/태그”로 확대해서 보고하면 안 된다.

## 5. HWPX: 실제 지원 범위와 정확한 한계

HWPX도 [WorksheetEditor:258–274](/Users/pss/Desktop/creative/today-print-color/src/components/unified/WorksheetEditor.tsx:258)의 같은 `[data-mathgen-document]`에서 시작한다. [hwpxClient:9–16](/Users/pss/Desktop/creative/today-print-color/src/lib/export/hwpxClient.ts:9)는 collectHwpxLayout의 pages를 전송하고, route는 `src/app/api/exports/hwpx/route.ts:16–24`에서 검증 후 writer로 보낸다. layout payload는 메타 필드 목록이 아니라 **text/equation/image/rect 객체 + 위치/색/글꼴/본문 영역**이다(`hwpxLayout:2–24`, `hwpxServer:7–75`). title 외에 tag·printMeta를 새 API 필드로 붙여도 출력 자리를 만들 수 없다.

| 대상 | 수집/기록 근거 | 판정 및 한계 |
|---|---|---|
| 태그·유형명·전략·목표·개념의 실제 텍스트 | `hwpxLayout:347–375`는 보이는 Text node를 줄 조각으로 수집. `scripts/hwpx/writer.py:155–156`은 hp:t 기록. | **새 메타 이름을 모른다는 이유로 빠지지 않는다.** 일반 DOM 텍스트로 렌더되면 포함된다. Markdown도 렌더된 텍스트/수식/그림이 대상이다. 숨긴 필드·DOM에 없는 값은 생성하지 않는다. |
| C2 머리/번호 단색 면 | `hwpxLayout:220–226`의 computed backgroundColor → rect; `writer.py:178–184`의 winBrush faceColor | **지원 경로 있음.** CSS 변수의 computed RGB를 수집하고 #RRGGBB를 전달한다. 머리/번호 같은 부분 배경은 전체 종이 제외 조건에 걸리지 않는다. |
| 면 위 흑/백 글자·정보 글자색 | `hwpxLayout:190–201`의 computed color; `writer.py:115–130`의 charPr textColor, `163`의 equation textColor | **지원 경로 있음.** readablePaperColor/inkOnColor가 결정한 결과색을 가져간다. HWPX에서 다시 대비 계산하지 않는다. |
| 칸 경계·머리선·점선 | `hwpxLayout:262–289`의 네 방향 border → 직사각형 조각 | 선색/폭과 점선·파선 조각은 전달된다. 브라우저의 모든 border 모양을 네이티브 선 스타일로 보존하는 방식은 아니다. |
| 새 워크북 유형·전략 상자 | `PrintHeader:173–179`의 일반 DOM, `PrintHeader.module.css:117–126`의 단색 배경/경계 | **글자와 직사각형 면/선은 현재 수집 범위다.** HWPX 전용 메타 매핑이나 새 저장 칸이 없어도 된다. 원래 HTML 상자와 동일한 한글 입력 서식/통합 표로 바뀌지는 않는다. |
| 전체 종이 바탕 | `hwpxLayout:213–226`의 coversPage/`el!==page` 제외 | **의도적으로 생략한다.** 자습의 전체 따뜻한 종이색까지 HWPX에 보존된다고 말할 수 없다. 한글에서 여백 계산이 틀어지는 기존 문제를 피하기 위한 조건이며 부분 칸 배경은 보존한다. 기존 시험 `hwpxLayout.test.ts:60–79`도 둘을 구분한다. |
| 반투명색 | `hwpxLayout:82–94`는 alpha를 흰색 255와 혼합해 불투명 hex로 변환 | **실제 아래의 유색 면과 합성하지 않는다.** `rgba` 꼬리표/옅은 면을 유색 머리 위에 올리면 PDF와 색이 달라질 수 있다. 현재 C2 머리/번호의 불투명 색에는 직접 해당하지 않는다. |
| CSS 그라데이션/모눈 | `hwpxLayout:227–260`은 linear-gradient의 첫 RGB/크기를 읽어 줄 격자를 만듦 | 모눈/노트 줄용 제한 구현이다. 일반 다색 그라데이션을 그대로 그리는 지원이 아니다. |
| 곡선·그림자·필터·의사요소 등 | `HwpxObject`와 서버 schema에는 해당 속성이 없고, 수집기는 실제 Element/Text node와 rect에 한정(`hwpxLayout:2–24,220–291,347–355`) | border-radius, box-shadow, CSS filter, ::before/::after의 generated content를 보존하는 별도 경로가 없다. fractional opacity/클리핑/임의 회전·CSS 쌓임순서의 완전한 재현도 이 객체 모델로 보장하지 않는다. SVG/img는 별도 PNG 변환(`98–135,332–344`)이다. |
| 양식의 표/입력칸 구조·글꼴/쪽 재배치 | `writer.py:246–286`의 줄/탭/떠 있는 1×1 표, `318–344`의 본문·바깥 분리 | 머리글은 편집 가능한 텍스트지만 **원래 HTML의 다중 셀/의미 있는 시험정보 필드 구조로 복원하는 것이 아니다.** 수기 밑줄은 텍스트·선으로 남고 입력 폼이 되지 않는다. 글꼴은 이름을 참조(`115–125`)하며 한글이 열 때 재조판한다. 원래 CSS와 픽셀 단위 동등성을 보장할 수 없다. |

수집은 DOM을 body에 임시 복제해 210mm/비축소 상태에서 재고(`hwpxLayout:142–162`), 보이지 않는 요소를 제외한다(`204–210`). 그 뒤 장식을 먼저, 내용을 뒤에 담는다(`436`). Python writer는 모든 rect를 BEHIND_TEXT로 놓는다(`178–184,318–323`). 따라서 임의 z-index/overlay 디자인까지 보존되는 엔진으로 해석하면 안 된다.

새 칸의 긴 내용은 같은 지면 측정을 거치지만 HWPX의 한글 수식은 별도의 자연 크기로 바꾸고(`writer.py:45–57,295–298`), 머리/바닥 글은 preview 위치의 네이티브 표로 묶는다(`324–332`). **C2의 새 텍스트/면을 표현할 수 있다는 코드 판정과, 한글에서 긴 메타/수식이 겹치지 않는다는 실제 검수는 별개**다. 현재 감사에서는 HWPX 생성/열기/인쇄를 실행하지 않았다.

출력량 제한도 유지된다: 120쪽, 쪽당 12,000객체, 문서 합계 60,000객체(`hwpxServer:58–80`). 새 선/면은 객체 수에 포함된다. 이것은 새 칸만을 막는 조건이 아니라 기존 공통 내보내기 상한이다.

## 6. 주 작업자의 완료판에서 확인할 항목

현재 경로 조사에서 남은 **확정적인 tag/printMeta 전달 누락은 발견하지 못했다.** 다음은 이번 정적 감사가 대신하지 않은 완료 검증이다.

1. 실제 저장을 호출하지 않는 fixture로 일반 draft/연산 presentation의 태그 있음·없음·메타를 복원하고, 네 진입의 WorksheetEditor props와 실제 출력 DOM까지 대조한다. 태그가 없는 옛 저장본에 가짜 기본 “일일TEST”가 생기면 안 된다.
2. 태그 변경 직후와 비동기 beforeOutput 중 태그 변경 시 재측정/출력 차단을 확인한다. 현재 meta useMemo 경로를 통과하는 시험이 필요하며, 템플릿에 meta.sheetTag를 직접 주는 렌더 시험만으로 네 진입 전달을 검증했다고 할 수 없다.
3. 워크북 유형·전략, 숨긴 날짜, P1 미사용 필드, 템플릿 왕복 후 값 보존을 확인한다. 새 칸을 preset에 저장시키거나 render-only sheetTag를 연산 printMeta에 역저장하지 않는지도 확인한다.
4. HWPX 검증은 DOM 수집 결과의 text/rect 색과 XML의 textColor/faceColor를 확인하고, 전체 종이 바탕 생략·반투명 합성·네이티브 표 구조 한계를 보고서에 유지한다. 실제 한글/실물 검수 없이 완전 동등성을 주장하지 않는다.

읽은 미커밋 `src/__tests__/components/PrintColorImplementation.test.tsx:45–101`은 여섯 양식×9색의 직접 렌더/태그/필드, `105–170`은 P1과 값 보존을 다룬다. `SheetTagPicker.test.tsx` 안내문 및 `ArithmeticRoundForm.test.tsx`도 바뀌었고, `src/app/dev/print-check/items.ts:85` 이하에는 여섯 C2 항목이 대기로 추가됐다. **시험 파일을 읽었다는 사실이며 이 감사자가 실행하여 통과를 확인한 것이 아니다.** 미커밋 구현이 더 진행되면 이 보고서의 경로 근거와 완료판을 다시 대조할 수 있다.
