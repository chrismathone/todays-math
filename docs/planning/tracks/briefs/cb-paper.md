# 트랙 cb-paper — 개념 백지 A4 지면 다섯 형식 + 채점표 + 인쇄 페이지 (D-150 · 26 §6)

공통 규칙: `docs/planning/tracks/briefs/cb-common.md`.

## 소유
- `src/components/concept-blank/ConceptBlankPaper.tsx` — 🔴 **겉(이름 · `ConceptBlankPaperProps`)은 그대로**, 속만 바꾼다.
  하위 조각은 `src/components/concept-blank/paper/*` + `paper.module.css`.
- 새 인쇄 페이지 `src/app/(main)/concept-blank/print/page.tsx`(+ `loading.tsx`) — 본보기 `src/app/(main)/english/sets/[id]/print/page.tsx`:
  서버 컴포넌트 · 크롬 없음 · 세션 없으면 `/login` · `?s=` 를 `decodeSelection` 으로 읽고 틀리면 «주소를 확인해 주세요» 한 줄 ·
  `?view=student|key|both`(기본 both). 관문(메뉴 `conceptBlank`)은 cb-app 이 `accountRouteAccess.ts` 에 건다.
- `src/app/dev/print-check/items.ts` — 항목 추가(형식 다섯 · 채점표) — 절대 규칙 6.
- 시험: 새 `src/__tests__/components/ConceptBlankPaper.test.tsx`(+ 필요하면 인쇄 페이지 시험).
- 🔴 메뉴 형 때문에 `accountAccess.contract.ts` 가 필요하면 **cb-app 브리프의 두 곳을 같은 글자 그대로** 넣는다(그 외 고치지 않는다).

## 읽기만
`conceptBlank.contract.ts`(지면 모델 `ConceptBlankSheet`) · `src/lib/concept-blank/*` · 시험 자료는 `FIXTURE_BANK` + `composeSheets`.

## 지면 — 시안을 그대로 옮긴다
- 시안(저장소 밖, 읽기만): `D:\tmp\concept-blank\concept-blank-5-two-units.html` + `paper.css` + `paper2.css` + `build2.cjs`.
  🔴 시안의 **채점표 «교재 문장» 칸은 교재 원문**이라 옮기지 않는다 — 채점표는 은행의 우리 문장(뜻 · `{핵심어}` 굵게 · 예 답 ·
  ○× 답과 까닭 · 적용 답 · 그림 이름표 답 · 줄 답)으로 채운다. 모양 · 여백 · 글꼴 · 색만 옮긴다.
- 얼굴(05 §8.5): 따뜻한 흰 종이 `#FCFCF8` · 금색 `#A57F00` · 본문 명조(제품 지면 글꼴 스택 그대로 — 시험지 지면 코드에서 찾아 쓴다) ·
  라벨 고딕 · 머리(오늘의수학 · 영문 라벨 · 제목 · 목표 · 학습일 · 이름/반 · 단원) · 발(맞은 개수 칸 · 오늘의 메모 · p. N) · 배점 없음.
- 형식별: A 소단원 칸(옆 칸은 `side` 가 «그림»이면 모눈, «예»면 예 칸) · B 용어 목록 + ○× · C 빈칸 문장(`{ }` 자리를 밑줄 빈칸으로,
  길이는 핵심어 글자 수에 비례) + «나 · 적용» · D 지도(가운데 원 + 가지 여섯, 가지마다 뜻 줄 + 예 칸 — 예가 없으면 빈 예 칸) ·
  E 그림 카드(2×3, `svg` 를 `viewBox` 로 감싸 그리고 `tags` 자리에 점선 네모, 아래 `lines` 줄).
- **쪽 나누기는 고정 규칙**(DOM 재기 없이): A 네 칸 · B 아홉 문항 · C 문장 여덟 + 적용 · D 지도 하나 · E 여섯 · 채점표 열두 줄 —
  넘치면 다음 장(간소 머리 `오늘의수학 · 제목` + `p. N`). 긴 뜻 문장에서 안 넘치는지 Playwright 로 재서 보고(시안처럼 쪽마다 넘침 px).
- 수식 `$...$` 은 제품의 KaTeX 경로로(예: `src/components/math-explorers/ExplorerMath.tsx` 나 시험지 본문 렌더러 — 같은 문제는 같은 뷰).
- 인쇄 CSS: `@page { size: A4; margin: 0 }` · 장마다 `break-after: page` · 화면 미리보기에서는 축소(시안처럼).

## 받아들임
- RTL: 형식 다섯이 FIXTURE 에서 그려짐 · C 빈칸 수 = 핵심어 수 · 채점표에 핵심어 굵게 · E 이름표 수 = tags 수 · 쪽 나누기 규칙(10문항 B → 2장).
- Playwright(인쇄 매체) 쪽마다 넘침 0 캡처 · `/dev/print-check` 항목 «대기».
- `npm run type-check` · `lint:affordance` · 관련 vitest 초록.
