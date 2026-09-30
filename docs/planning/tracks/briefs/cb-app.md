# 트랙 cb-app — «개념 백지» 탭 화면 (D-150 · 26 §4)

공통 규칙: `docs/planning/tracks/briefs/cb-common.md`.

## 소유 (이 파일들만)
- `src/contracts/accountAccess.contract.ts` — 메뉴 더하기. 🔴 **아래 두 곳을 이 글자 그대로**(cb-paper 도 같은 글자를 넣어 병합이 겹치지 않게):
  - `WORKSPACE_MENUS` 의 `{ id: "concept", label: "오늘의 개념" },` 바로 아래에
    ```
      // D-150 — «오늘의 개념» 바로 아래(원장님 캡처). 고정 문항 개념 백지 · 인쇄 페이지 관문 `/concept-blank`.
      { id: "conceptBlank", label: "개념 백지" },
    ```
  - `workspaceMenuSchema` 의 `"concept",` 바로 아래에 `"conceptBlank",`
- `src/lib/accountRouteAccess.ts` — `/concept-blank` → `conceptBlank` 메뉴(영어 `/english` 줄 본보기).
- `src/components/unified/UnifiedWorkspace.tsx` — 옆 메뉴 줄(«오늘의 개념» 바로 아래 · 아이콘은 기존 아이콘 모음에서) + 뷰 붙이기.
- 새 파일: `src/components/concept-blank/ConceptBlankView.tsx` (+ 하위 조각 · `concept-blank.module.css`).
- 시험: 새 `src/__tests__/components/ConceptBlankView.test.tsx` · 메뉴 수를 세는 기존 시험 고침
  (`UnifiedWorkspace.access.test.tsx` · `englishMenu.test.ts` 등 — 메뉴 하나를 더하면 네 곳이 빨개진다, 리드가 확인함).

## 읽기만 (고치지 않는다)
`conceptBlank.contract.ts` · `src/lib/concept-blank/*`(compose · sections · selectionCodec · bank · fixture) ·
`ConceptBlankPaper.tsx`(겉 props 로만 부른다 — 속은 cb-paper 가 만든다).

## 만들 것
1. **나무**(왼쪽): `BLANK_TREE` — 학년 → 대단원 → 소단원 체크. 대단원 체크 = 그 아래 전부, 일부만이면 반쯤 표시.
   소단원 옆 재고 `stockCounts()` — «개념 n · ○× n · 적용 n · 그림 n». 재고 0 소단원은 흐리게 · 고를 수 없음.
   `CONCEPT_BLANK_GRADES` 밖(초1~2)은 «준비 중». 학년은 접힘(고른 학년만 펼침).
2. **형식 카드 다섯**(오른쪽, `CONCEPT_BLANK_FORM_LABELS`): 켜기/끄기 + 하 · 중 · 상 숫자 칸(최대 = 고른 소단원의 그 난이도 재고,
   기본 = 전부). B 는 «○×», C 는 «적용» 줄(난이도별)이 하나 더. A · D 는 «개념 수». 재고가 0 이면 그 카드는 끔 + 까닭 한 줄
   (예: «고른 소단원에 그림 문항이 없습니다»).
3. **제목 · 날짜** 칸(선택) · **미리보기**(`<ConceptBlankPaper sheets={composeSheets(sel, bank)} view=…/>`, 학생지/채점표 전환) ·
   **인쇄하기** = 새 창 `/concept-blank/print?s=${encodeSelection(sel)}&view=both`.
4. 은행 주입: 컴포넌트 props `bank?: ConceptBlankBank`(기본 `CONCEPT_BLANK_BANK`) — 실제 은행이 비어 있는 동안 시험은 `FIXTURE_BANK`.
   주소 해시로 고르기 되살리기(`#concept-blank?s=…`)는 있으면 좋음.

## 모양
새 화면이다 — D-07. 확정 문법(05 §2 색 토큰 · §3 글꼴 · §5 버튼 · 작업실 · 영어 화면의 두 칸 배치)을 따르는 **첫 판**으로 만들고,
보고서에 1280 · 390 폭 캡처(Playwright)를 붙인다. 원장님이 보고 고친다. 기성 컴포넌트 킷 금지.

## 받아들임
- RTL: 대단원 체크 → 소단원 전부 · 재고 0 흐림 · 숫자 칸이 재고를 못 넘음 · E 재고 0 이면 꺼짐 · 인쇄 주소가 `decodeSelection` 으로 되돌아옴.
- 메뉴 시험 초록(«수학 메뉴 아홉») · 계정 권한 화면에 «개념 백지» 체크 칸 · `/concept-blank` 가 메뉴 꺼진 계정에 막힘.
- `npm run type-check` · `npm run lint:affordance` · 관련 vitest 초록.
