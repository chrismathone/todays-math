# 브리프 — «나란히» 묶음: 소문항·그림을 1~4열로 (2026-09-22)

> 메인 세션이 쓴 브리프. 가지 `chrismathone/side-by-side` · 기준 main(`aa7f9b94` 이후).
> **푸시 금지 · 운영 DB 무관 · 결정 번호(D-xxx) 붙이지 말 것**(초안만). 끝나면 `scratch/REPORT-side-by-side.md` 에 보고하고 메인에게 한 줄 신호.

## 원장님 요청

«이런 보기들도 2열 4열 등으로 배치가능하게. 1열 고정같은데» — 서답형 문제의 소문항 (1)(2)(3)(4) 가 저마다 그림을 달고
**한 줄에 하나씩** 세로로만 쌓인다(보기 화면·내용 수정 둘 다). 원문 모양(인식 결과):

```
[서답형 3] 그림에서 □ABCD가 평행사변형인 이유를 … [각 2점, 총 10점] [10점]
(1)
[그림1]
[2점] (2)
[그림2]
[2점]
(3)
[그림3]
[2점] (4)
[그림4]
```

## 원장님 확정 (2026-09-22, AskUserQuestion)

**«나란히» 묶음** — 내용 수정에서 소문항들을 고르고 **[나란히]** 를 누르면 **테두리·제목 없는** 칸 묶음이 된다.
〈보기〉 상자처럼 묶음 위의 **1열·2열·3열·4열** 단추로 바꾼다. 〈보기〉 상자의 칸 배치를 그대로 쓴다.
지면(인쇄)·한글(HWPX) 내보내기까지 같은 칸.

(버린 안: 문제 머리에 «소문항 열 수» 한 칸 — 인식 결과가 «[2점] (2)» 처럼 섞이면 잘못 나눈다.)

## 조사 결과 (메인의 Explore, 2026-09-22 — 줄 번호는 그때 main 기준, 확인하고 쓸 것)

- 저장은 Markdown + LaTeX. 그림은 `[그림N]`(`visualDocument.ts:147-151`). 소문항은 줄머리 `(n)` 일 뿐 배치 장치가 없다.
- 렌더 길 **셋**: 작업실 카드 `SourceEditorRenderer`(보기 화면) · 편집기(TipTap, `prepareVisualDocument` 로 `SourceEditorRenderer` HTML 을 받음)
  · 지면 `MarkdownRenderer`(문제은행·미리보기·인쇄 — `ProblemContent`, `NativeProblem`). **같은 문제는 같은 뷰**(원장님 최우선 규칙) — 셋 다 같은 칸이어야 한다.
- 이미 있는 칸 묶음 = 〈보기〉 상자: `> <보기:cols=N>` (N=2|3, `boxHeader.ts`), 한 줄 = 한 칸(`boxBlock.ts`), `layoutQuotedBoxes`(`boxLayout.ts`),
  카드(`SourceEditorRenderer.tsx` 1157-1237 근처) · 지면(`MarkdownRenderer.tsx` 205-241) · `NativeProblem` · HWPX(`BoxQuoteCard` 의 `data-hwpx-grid` → `hwpxLayout.ts gridCellMarks` → `writer.py grid_rows`, 열 수 제한 없음).
  편집기 `ConditionBox` 노드에 1/2/3열 단추(`conditionBox.ts` 200-235, `setBoxColumns`), 저장 때 머리를 다시 씀(`visualDocument.ts` 163-181).
  상자 안 `[그림N]` 은 인라인으로 그린다(`conditionBoxFigureCells.test.tsx` 가 잠금).
- `<상자:cols=N>` 은 지면에선 제목이 없지만 카드가 칸 묶음으로 안 보고(`SourceEditorRenderer.tsx:1167`), 편집기가 저장 때 열 수를 버린다(`visualDocument.ts:170`) — 그대로 못 쓴다.

## 만들 것 (권장 — 더 나은 길이 있으면 보고에 까닭과 함께)

1. **새 머리 `<나란히:cols=N>`** (N = 1~4). 제목 없음 · 테두리 없음. 한 줄 = 한 칸(보기 상자와 같은 규칙).
   - `boxHeader.ts` 열 형에 4 · 새 이름 · 정규식 `[1-4]` · `boxLayout.ts` · `boxBlock.ts` · `textPreprocess.ts`(편집기 `[123]`) · `MarkdownRenderer.tsx` 머리 인식.
   - 〈보기〉·〈조건〉 상자도 4열을 받게 할지는 보고에 적되, **이번 범위는 나란히**. 기존 상자의 모양·동작은 바꾸지 않는다(회귀 시험으로 잠금).
2. **그리기**: 지면(`MarkdownRenderer` — 제목 없는 이름 목록 · 테두리 없는 클래스 · Tailwind 는 문자열 그대로 `md:grid-cols-4 print:grid-cols-4`) · 카드(`SourceEditorRenderer`) · `NativeProblem`.
   칸 안 그림은 칸 폭에 맞춰 줄인다. 좁은 지면(2단 시험지)에서 `boxFit` 이 4→3→2→1 로 줄이는 규칙을 따른다.
3. **편집기**: 도구줄에 **[나란히]** — 고른 문단들을 묶음으로 감싼다(칸 = 문단). 묶음 위 **1열·2열·3열·4열** 단추(상자 단추와 같은 꼴). 풀기(묶음 해제)도.
   저장하면 `> <나란히:cols=N>` 원문으로 돌아온다(`visualDocument.ts`). `math-text-editor.css` 에 4열 규칙.
   🔴 화면 문구·단추 모양은 기존 상자 단추와 **같은 꼴** — 새 모양을 지어내지 말 것(D-07). 새 모양이 꼭 필요하면 멈추고 보고.
4. **인쇄 높이 추정**: `printOverflow.ts` 391-401 근처가 칸 줄마다 글 한 줄로 센다 — 제목 없는 경우 · 한 줄에서 가장 큰 그림 높이를 세야 쪽이 넘치지 않는다.
5. **HWPX**: 쓰개는 안 바꿔도 될 것 — `hwpxGridRows.test.ts` 로 4열·제목 없음 확인.
6. **인쇄 검수**(절대 규칙 6): `src/app/dev/print-check/items.ts` 에 항목 하나(`box-layout-columns` 근처) — 무엇을 종이로 보나·합격 기준.
   `PrintCheck.test.tsx` 의 개수와 이력 주석 갱신.

## 시험 (TDD — RED 먼저)

- 원문 → 카드 · 지면 · 편집기 문서가 **같은 칸 수·같은 칸 내용**(renderParity 유지) — 위 예시 원문을 픽스처로.
- 편집기에서 [나란히] → 저장 → 다시 열기 왕복이 원문을 보존. 열 바꾸기 → 머리의 cols 가 바뀐다.
- 상자 안 그림이 한 칸(라벨+그림)으로 남는다(`conditionBoxFigureCells` 와 같은 함정).
- 기존 〈보기〉 2·3열 · `<상자>` 동작 불변.
- `boxFit` 4→3→2→1.
- 변이 한두 개로 가드가 우는지 확인하고 보고에 적는다.

## 지킬 것

- 워크트리에는 `.env` 가 없다 — 실DB·AI 호출 없음(메모리: 오르카 워크트리엔 .env 없음). 새 워크트리 tsc 전에 `npx prisma generate`.
- **메모리가 빠듯하다**(여유 1GB 미만) — 전체 `npm run test`·`next build` 는 돌리지 말고 관련 시험만. 끝난 vitest 작업자는 정리.
- `src/components/unified/figure-editor/` 는 메인이 만지는 중 — 건드리지 말 것.
- prettier 는 파일 이름을 적어서만(폴더로 돌리면 소음).
- 커밋은 이 가지에만, 푸시 금지. 끝나면 보고 파일 + 메인에게 한 줄.
