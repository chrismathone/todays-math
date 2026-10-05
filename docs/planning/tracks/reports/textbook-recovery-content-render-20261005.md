# 교재 복구 P3·P4·P5 — 개념·회상·문제의 의미 렌더러

작성일: 2026-10-05. 근거: [복구 실행 계획 최종 표결본](../../textbook-v15-recovery-plan-final-20261005.md)(SHA-256 `0ab8ac18…04bb7`) §4·§5·§6, [분리 선행 작업 보고](textbook-recovery-extraction-20261005.md).

커밋 `8683356be` (main `b0901f34a` 위, 빨리 감기 가능). 바꾼 파일은 `render/blocks/{concept,recall,problem}.ts` 와 새 `render/blocks/contentCss.ts`, 그리고 내 시험 두 파일뿐이다. `html.ts` · `editorialCss.ts` · `model.ts` · `markdown.ts` · 계약 · `shared` · `front` · `dialogue` · 작성기 · 원본 QA 는 건드리지 않았다.

🔴 **이것은 렌더러다. 지면에 실제로 나오려면 조율 담당의 배선 셋이 필요하다(§5).** 그 전까지 새 마크업은 옛 규칙으로 그려진다.

## 1. 무엇이 달라지나

### 개념 (P3) — `blocks/concept.ts`

- 모델이 `semantic.node.kind === "concept"` 을 주면 **그 개념의 실제 이름**(`node.title`)과 **행**(뜻 · 예 …)을 한 카드에 그린다. 행마다 `data-row-key` · `data-concept-id`.
- 번호는 모델이 센 **책 안의 차례**(`ordinal`)이거나 저자가 쓴 코드(`C03` · `concept-12`)다. 🔴 `concept-<uuid>` 같은 생성된 열쇠에서 숫자를 캐지 않는다 — 차례가 없으면 번호 칸을 그리지 않는다.
- 원천 행이 없으면(선생님이 고친 정의 · 옛 초안) **저장된 본문을 그대로** 그린다. 모델의 `frozenConceptGroups` 가 «수정본이 동결 카드와 다르면 노드를 안 준다»를 이미 지키므로 수정본이 이긴다.
- 개념 블록에 `fragments` 노드가 오면 조율 담당의 `renderSourceFragments` 로 그린다.

### 회상 (P4) — `blocks/recall.ts`

- 개념학습 · 핵심어 빈칸 · 통문장은 **한 행 목록**을 한 변환기로 읽는다. 행의 열쇠 · 차례 · 묶음 · 줄 수가 세 단계에서 같다(`data-row-key` · `data-row-group` · `data-concept-id` · `data-phase`).
- 변환기 `recallDisplayRows(rows, phase, reveal)` 는 `bank-blank`(`{핵심어}`) · `v15-tex`(`{{핵심어}}` · `[[TeX]]`) · `markdown` 을 읽는다. TeX 은 글자를 옮길 뿐 고쳐 쓰지 않는다. `[[\frac{1}{\sqrt{2}}]]` 안의 `}}` 를 핵심어 끝으로 읽지 않는다.
- 🔴 **학생용에서 숨긴 글은 마크업이 되기 전에 버린다.** 핵심어는 폭만 남기고(`width:Nem` — 숨긴 글의 길이에서 어림한 값), 통문장은 본문 전체를 필기선으로 바꾼다. DOM 에 숨긴 글 · 보이지 않는 대역 글 · TeX 이 없다. 닫히지 않은 `{{` 뒤는 공개 글로 풀리지 않고 숨긴 채로 남는다.
- 1~4회 반복 표시는 **개념학습에만**. 단계 탭은 모델이 준 `memoryPhases`(켜진 단계)만 적는다 — 모델이 말하지 않으면 탭을 그리지 않는다(꺼진 단계를 지면에 적지 않으려고).
- 오류 점검(`activity: "errorCheck"`)과 용어 암기(`"termRecall"`)는 **제 지시문을 가진 독립 활동**이다. 세 단계 탭 · «개념학습으로 채점한다» 꼬리말이 없다. 오류 점검은 문장마다 ○ · × 표시 칸과 이유 두 줄.
- 의미 정보가 없는 옛 원고는 옛 문단 지면 그대로다. 달라진 것은 통문장 칸이 **벡터 선 세 줄**이 된 것뿐이다.

### 문제 (P5) — `blocks/problem.ts`

- QR 을 필기 칸 밖, **발문 옆**으로 옮겼다. 필기선은 문항 열 폭 전체를 쓴다.
- 줄 수는 저장된 `layout.preferredWorkLines` 그대로다 — **0 은 0 으로 남는다.** 정답 판에는 줄이 없고, 학생 판에는 일반 문항의 답 · 풀이가 없다(공개 풀이 대표예제만 예외 — 종전과 같다).
- `exampleGroup` 노드가 있으면 작성기가 이은 대로 읽는다: `exampleItemId` 는 대표예제, `confirmItemIds` 는 **확인문제**. 같은 부모(`workedExamples`) 아래 있어도 확인문제에는 «대표예제» 표지를 붙이지 않는다. `data-example-group` · `data-example-role` · `data-activity`.
- 표시 번호 · 그림 · 글리프는 원천 그대로다.

### 내용 CSS — `blocks/contentCss.ts`

- `TEXTBOOK_CONTENT_CSS`. 개념 · 회상 · 문제의 선택자만 있다(대화 · 앞부분 · 쪽 머리말 선택자 0 — 시험이 지킨다).
- 필기 공간은 **벡터 선뿐**이다: 두께 0.265mm, 간격 7mm, 채움 없음, 그라데이션 없음.
- 원본 개념 쪽(14~16)의 구조 클래스(`section-label` · `rule-box` · `definition-figure` · `decimal-pair` · `note` · `example-strip` · `cycle-strip` · `grid-table` · `index-table` · `explain-grid`)는 `.tb-source-fragments[data-source-kind^="concept"]` 아래에서만 건다. 값은 v15 원본 스타일시트에서 옮겼다(`--accent` → `--tb-accent` 등).

## 2. 세 단계의 행 높이를 어떻게 같게 하나

원본은 통문장 칸에 숨긴 글을 `visibility:hidden` 으로 넣어 높이를 맞췄다. 그 방법은 쓸 수 없다(숨긴 글을 DOM 에 넣지 않는다). 그래서 두 겹이다.

1. **측정 없이도 같다** — 행 높이는 «줄 수 × 7mm»이고, 줄 수는 행의 정본 글에서 셈하는 **한 순수 함수**라 세 단계에서 같은 값이 나온다. 본문 칸의 최소 높이가 그 값이므로, 어림이 실제 줄 수보다 작지 않으면 세 단계가 구조적으로 같다. 통문장은 그 줄 수만큼 7mm 간격 선을 긋는다.
2. **재면 정확하다** — 모델이 `rowHeightsMm[rowKey]` 를 주면 그 높이를 그대로 쓴다. 통문장은 `floor((h − 2.2) / 7)` 줄.

조율 담당의 측정 통합이 할 일(정확한 명세):

```ts
import { commonRecallRowHeights } from "@/lib/textbook/render/blocks/recall";
// ⑴ rowHeightsMm 없이 켜진 단계 전부를 측정용으로 그린다
// ⑵ 브라우저에서 .tb-memory-row[data-row-key] 의 border-box 높이(mm)를 모은다
// ⑶ 열쇠별 최댓값(0.1mm 올림)
const rowHeightsMm = commonRecallRowHeights(measured); // { rowKey, heightMm }[]
// ⑷ 같은 맵을 모든 회상 블록의 rowHeightsMm 로 넣고 다시 그린다
```

## 3. 실제 Chromium 으로 잰 것

`TEXTBOOK_PDF_TEST=1 npx vitest run src/__tests__/unit/textbookRecoveryContentRender.integration.test.ts`

제품 글꼴(`NotoSansKR` — PDF 에 내장 확인)과 제품 스타일시트 + 내용 CSS 로 5쪽을 찍고, **독립 검증기 `scripts/qa/textbook/recovery/geometry.py` 가 판정**했다. 시험은 증인(DOM 좌표)만 댄다. 원고는 전부 합성이다(네 개념 × 세 행 — 분수, 두 줄로 넘치는 행, 핵심어 없는 행 포함 · 단답 문항 · 서술형 문항 · 오류 점검 · 용어 암기 · 옛 원고).

| 항목 | 값 |
| --- | --- |
| 검증기 판정 (어림 높이 / 측정 높이) | `passed` · 지적 0 / `passed` · 지적 0 |
| 검사한 수 | 5쪽 · 행 36 · 필기 칸 35 · QR 2 · 글 조각 219 |
| 세 단계 사이 행의 위쪽 · 높이 차 | 0.000mm · 0.000mm (허용 0.5mm) |
| 행 높이 | 한 줄 9.20mm · 두 줄 16.20mm — 세 단계 동일 |
| 본문 열의 시작 | 세 단계 모두 44.00mm |
| 필기 칸 안의 벡터 선 | 47개 · 전부 두께 0.265mm(`vector-fill`) |
| 선 간격 | 6.88~7.14mm (허용 7±0.5mm — PDF 화소 맞춤) |
| 서술형 선 길이 | 문항 열 폭의 100% (기준 ≥95%) |
| 회색 채움 띠 | 5쪽 모두 0 |
| QR 과 필기 칸 겹침 | 0 |

증거(PDF · HTML · 증인 · 판정 JSON · 쪽 그림)는 저장소 밖에 있다: 시험이 `TEXTBOOK_RECOVERY_EVIDENCE_DIR`(없으면 시스템 임시 폴더)에 쓴다.

독립 검수가 쓸 표지: 행 `data-row-key` · `data-row-group` · `data-concept-id` · `data-phase`(· `data-relative-page-index`), 필기 칸 `data-writing-space="work|keyword|sentence"`(클래스는 `.tb-work-lines` · `.tb-blank` 그대로), 기준점 `data-anchor="memory-title|row-label|row-body|problem-head|concept-title"`.

## 4. 돌린 검사

| 검사 | 결과 |
| --- | --- |
| `textbookRecoveryContentRender.test.ts` (새 단위 검사) | 통과 29 / 29 |
| `textbookRecoveryContentRender.integration.test.ts` (실제 Chromium) | 통과 2 / 2 |
| 기존 렌더러 · 투영 · 배치 · 미리보기 등 14파일 | 통과 169 / 169 |
| ESLint · Prettier (내 파일) | 오류 0 |
| `tsc --noEmit` 저장소 전체, 8GB, `8683356be` | 오류 0 |

새 검사가 «무는지»도 봤다. 커밋 뒤 여섯 군데를 일부러 깨뜨렸고 여섯 번 다 빨개졌다(되돌린 뒤 29/29).

| 변이 | 실패한 검사 |
| --- | ---: |
| 학생 판에서도 늘 공개 | 8 |
| 통문장 본문을 지우지 않음 | 4 |
| 반복 표시를 모든 단계에 | 1 |
| 번호를 열쇠의 숫자에서 캠 | 3 |
| 확인문제에 «대표예제» 표지 | 1 |
| 선 두께를 원본의 0.45pt 로 | 1 |

### 얼려 둔 추출 증명은 일부러 빨개진다

`scripts/qa/textbook/extraction-proof` 는 «P3 이전 출력»을 얼린 것이라 이번 변경으로 빨개지는 것이 정상이다. **매니페스트는 다시 얼리지 않았다.**

- 내 커밋 **직전**(main `b0901f34a` 의 렌더러)에는 얼린 증명이 그대로 통과한다 — 추출 때의 덤프와 0건 차이.
- 내 커밋 **뒤**에는 3,066개 가운데 **542개가 다르다. 전부 HTML 이다** — 모델 · 조판 계획 · SQL 흔적 · 저장 행 · 결과 JSON 은 0건.

| 달라진 산출물 | 수 | 까닭 |
| --- | ---: | --- |
| 회상 블록 | 108 | 통문장 칸에 벡터 선 세 줄이 들어갔다 · 빈칸에 `data-writing-space` |
| 문제 블록 | 64 | QR 이 발문 옆으로(`tb-problem-main`) · 필기 영역 높이에서 QR 몫 제거 · `data-anchor` |
| 개념 블록 | 28 | 생성 열쇠에서 캐던 번호를 뺐다(`plain` → 번호 없음) · 제목에 `data-anchor` |
| URL 문지기 사례 | 66 | 위 블록들을 그리는 사례 |
| 원고 통째 · 손으로 놓은 쪽 | 22 | 위 블록들이 들어 있다 |
| 자동 제작 사례의 학생/정답 HTML | 254 | 위 블록들이 들어 있다 |

조율 담당이 P2~P7 을 다 합친 뒤 한 번에 다시 얼리거나 이 하네스를 거두면 된다.

## 5. 조율 담당에게 필요한 것

| 무엇 | 왜 |
| --- | --- |
| `TEXTBOOK_CONTENT_CSS` 를 `EDITORIAL_CSS` **뒤에** 붙이기 | 그 전에는 새 마크업이 옛 규칙(빈칸의 회색 채움 · 0.159mm 선)으로 그려진다 |
| 회상 블록: `answersVisible`(= 정답 판) | 지금은 «`pieces` 에 빈칸이 있으면 숨김»으로 어림한다. 원고의 표기와 행이 어긋나면 어림이 틀릴 수 있다 |
| 회상 블록: 의미 노드가 있으면 **문단으로 쪼개지 않기** | 지금 모델은 쪼갠 조각마다 노드 전체를 실어, 행이 조각 수만큼 되풀이된다 |
| 회상 블록: `continuation` — 같은 구획의 앞 블록이 같은 활동의 회상이면 참 | 원본 한 쪽에 개념 블록이 넷이다. 지시문이 한 번만 나와야 한다 |
| 회상 블록: `memoryPhases` — 켜진 단계 목록 | 없으면 탭을 그리지 않는다 |
| 회상 블록: `rowHeightsMm` (§2) · `relativePageIndex` | 측정 높이 · 쪽 나눔 검사 |
| 회상 블록: 원고 표기가 행과 달라졌으면 노드를 주지 않기 | 선생님 수정본이 이기게(개념의 `frozenConceptGroups` 와 같은 규칙) |
| 개념 블록: `ordinal` — 책 안의 차례(1부터) | 없으면 저자 코드가 있을 때만 번호를 그린다 |
| `renderSourceFragments` 가 v15 `[[TeX]]` 를 수식으로 바꾸기 | 원본 조각의 글은 `[[\frac ab]]` 꼴인데 지금은 글자 그대로 찍힌다. `v15TexToMarkdown` 을 내보냈다 |
| `src/app/dev/print-check/items.ts` 에 대기 항목 등록 | 지면이 바뀌었다(계획 §10 · CLAUDE.md 절대 규칙 6). 내 소유 파일이 아니다 |

모든 모델 필드는 선택이다 — 없어도 깨지지 않고, 위에 적은 대체 동작으로 그린다.

## 6. 원본에 없는 형태 — 확정이 필요하다

계획 §11 은 원본을 넘어서는 형태를 시안으로 확정받으라고 한다. 아래는 내가 정한 것이고 **원장님 확정을 받지 않았다.**

- **QR 의 자리**(발문 오른쪽). 계획은 «필기 상자 밖»까지만 정했다. 원본에는 문항 QR 이 없다.
- **자동 개념 카드의 행 모양**(첫 행을 강조한 표). 원본 개념 쪽은 저자가 그린 도식이라 대응 지면이 없다.
- **오류 점검의 ○ · × 칸과 이유 두 줄**, **용어 암기의 «빈칸 + 뜻» 행**. 원본 clinic 쪽은 문항 형식이다.
- **통문장 칸 왼쪽의 옅은 그라데이션을 뺐다.** 원본에는 있지만 계획 §5 의 «회색 채움 띠 금지»와 부딪힌다. 핵심어 빈칸의 옅은 채움도 같은 까닭으로 뺐다.
- **표지 글**: 묶음의 예제에 «대표예제», 확인에 «확인문제». 원본은 «대표문제» · «확인문제»다. 제품의 다른 글(구성 이름 «대표예제와 확인» · 안내문)에 맞췄다.

## 7. 한계

- 줄 수 어림은 본문 폭을 약 150mm(전체 폭 지면)로 본다. 한 단 폭 회상 지면이면 어림이 작게 나올 수 있다 — 그때는 측정 높이(§2)가 필요하다.
- 실제 Chromium 검사는 **합성 원고 한 벌**이다. 원본 U01 12행을 실제로 찍어 원본 PDF 와 0.5mm 로 견준 것이 아니다 — 그것은 조율 담당의 배선 뒤 `render-reference.ts semantic` 으로 할 일이다. 기준점(`anchors`)의 원본 좌표 대조는 하지 않았다.
- 지시문 · 탭 · 꼬리말 가운데 «쪽에 한 번»인 것(원본의 쪽 끝 주석 «조건과 예를 함께 확인한다.»)은 블록이 그리지 않는다. 쪽 틀의 몫이다.
- 오류 점검 · 용어 암기는 지금 `pieces`(옛 표기)를 읽는다. 작성기가 이 둘에 행 노드를 주기 시작하면 용어 암기는 읽지만 오류 점검의 행 꼴은 아직 정해지지 않았다.
- 예제 묶음의 «왼쪽 예제 · 오른쪽 확인 둘» 배치는 조판(`paginate`)의 몫이다. 렌더러는 표지와 묶음 열쇠만 단다.
- 실물 인쇄는 하지 않았다. 병합 · 푸시 · 배포도 하지 않았다.
