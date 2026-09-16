# 브리프 — 관리자 화면의 «누구의 반» 담당 딱지 (D-132)

확정: **07 D-132** · **05 §8.11**(표가 SSOT — 색·크기·글자 전부 거기) · 관리자 범위 **D-130**. **먼저 읽어라.**
시안: `docs/design/mockups/hifi-d132-class-owner.html` **3 탭 «꼬리표»**(Wire 는 `wire-d130-class-owner.html` C 탭).

## 0. 왜

D-130 으로 관리자(원장님 계정 `st2000423@gmail.com`)는 모든 계정의 반을 본다. 반 목록에 역할 계정(강선생 · 원장 · 걷기원장 …)의
반이 섞였는데 **누구의 반인지가 안 보인다.** 원장님이 정한 답: 반 이름이 나오는 **화면 전부**에 **담당 딱지**, 원장님 반은 **«내 반»**, **맨 위**.

## 1. 만들 것

### 1.1 뒷단 — 담당을 싣는다 (관리자일 때만)

- 반 목록 `GET /api/classes` 와 반 이름을 내보내는 응답들에 **담당**을 싣는다 — 계정 이름(`User.name`)과 «이 반이 보는 사람의 것인가».
  칸 이름·모양은 네가 정하되 **계약(`src/contracts/`)에 먼저** 적고 보고서 ①에 표로 남겨라.
- 🔴 **관리자가 아니면 응답이 지금과 글자 그대로 같아야 한다**(칸을 안 싣거나 화면이 안 그리거나 — 어느 쪽이든 «관리자 아님» 짝 시험으로 잠가라).
  관리자 판정은 `src/lib/ownerScope.ts` 의 `crossesOwnerFence` **하나만** 묻는다 — 라우트·화면에서 `isAdmin` 을 새로 읽지 마라.
- **순서**: 관리자 반 목록은 **보는 사람의 반이 맨 위**, 나머지는 지금 순서(`createdAt desc`) 그대로.
- 담당 이름을 읽느라 반마다 조회가 늘지 않게 — `include`/`select` 한 번.

### 1.2 화면 — 반 이름이 나오는 곳 전부 (05 §8.11 표 그대로)

| 자리 | 파일(찾은 것 — 더 있으면 보고서에 ★) | 모양 |
|---|---|---|
| 반 · 학생 관리 반 표 | `src/components/class/ClassTable.tsx` | 반 · 학년 · **담당** 열 |
| 메인 반별 표 | `src/components/main/LedgerTable.tsx` (`src/lib/main/pipeline.ts` · `loadMainDashboard.ts`) | 반 · **담당** · 현재 진도 … |
| 메인 카드 보기 | `src/components/main/ClassCard.tsx` | 반 이름 뒤 딱지 |
| 출제 반 고르기 | `src/components/test/GenerateSetup.tsx` · `useGenerateSetup.ts` | 선택 상자 **글자** «반 이름 · 담당» |
| 장바구니 반 고르기 | `src/components/problem/BasketPanel.tsx` | 〃 |
| 오늘의 개념 판 | `src/components/unified/ConceptView.tsx` · `src/lib/concept/adminService.ts` · 계약 | 반 · **담당** · 이번 주 진도 (작업실 결 딱지) |
| 작업실 개요 «최근 등록한 반» | `src/components/unified/TeachingOverview.tsx` · `api/studio/overview` | 반 이름 뒤 딱지 |
| 시험지 검토 머리 | `src/components/test/TestReview.tsx` | «반 · 학생» 뒤 딱지 |

- **딱지**: 05 §8.11 — 장부 결은 바탕 `--side`(Tailwind `bg-side`)·글자 `ink`, 내 반은 먹색 바탕·흰 글자 «내 반». 작업실 결은 표에 적힌 값.
  **딱지 컴포넌트 하나**로 만들어 모든 자리가 그것을 쓴다(같은 뜻이 두 벌이면 한쪽만 고쳐진다 — `rowSelection.ts` 머리말).
- **선택 상자**: `<option>` 글자 «반 이름 · 담당». 🔴 **담당은 앞 6자만 — «…» 없이 자른다.** 전체 이름은 **마우스를 올리면** 보인다 —
  `<option title>` 과, 닫힌 `<select title>`(지금 고른 반의 전체 «반 이름 · 담당»)에 둘 다. 내 반은 «내 반».
  ⚠️ 크롬은 펼친 목록의 `option title` 을 안 띄울 수 있다 — 실물 브라우저에서 확인하고 보고서 ②에 적어라(닫힌 상자의 `title` 은 뜬다).
  자르는 규칙은 **한 함수**(글자 수는 코드 포인트로 — 한글·이모지를 반쪽으로 자르지 마라).
- **표에 담당 열** — 관리자일 때만 열이 선다. 관리자가 아니면 머리·칸 모두 없다(지금 화면 그대로).
- 🔴 **인쇄 지면에는 넣지 않는다**(`src/components/print/**` · `app/(main)/tests/[id]/print` — 손대지 마라).
- D-30: 딱지는 누르는 것이 아니다 — 손가락 커서·hover 금지. `npm run lint:affordance`.

## 2. 안 하는 것

- 🔴 **메인 «오늘의 확인테스트» 한 줄**(`src/components/main/DailyReviewSection.tsx` · `api/tests/daily-review`)은 **건드리지 마라.**
  다른 워크트리(`plan-screen`)가 지금 그 두 파일을 크게 고치고 있다. 리드가 두 트랙 병합 뒤에 네 딱지 컴포넌트로 붙인다 —
  보고서 ⑤에 «붙일 자리와 넘길 칸»만 적어라.
- 반 관리의 수업 계획·이번 주 예정 카드(`plan-screen` 트랙) · `ClassManage.tsx` 의 계획 부분.
- 인쇄 · 예측 회차 화면(관리자도 안 넘는다 — D-130 ⑶) · 공유 DB 쓰기 · 마이그레이션(필요 없다 — `User.name` 은 이미 있다).
- 시안에 없는 모양을 지어내지 마라 — 막히면 **가장 작게** 두고 보고서 ⑥에 적어라.

## 3. 시험 · 검수

- TDD(RED→GREEN). **같은 픽스처 · 같은 계정 · 관리자 표시만 다르게** 짝으로(`src/__tests__/api/adminSeesAll.test.ts` 관례):
  - API — 관리자면 담당·내 반이 실리고 **내 반이 맨 위** / 관리자 아니면 지금 응답과 같다.
  - RTL — 자리마다 관리자면 딱지(내 반은 «내 반»), 아니면 없다 · 표 머리 «담당» 유무 · 선택 상자 글자와 `title`.
  - 단위 — 6자 자르기(«이어하기선생님» → «이어하기선생» · 6자 이하 그대로 · 코드 포인트 · «…» 없음).
- 🔴 **실물 브라우저로 한 번** — 관리자 화면 넓은 폭 · 휴대폰 폭을 Hi-fi 3 탭과 나란히 캡처(`side-by-side-*.png` 관례).
  이 워크트리엔 `.env` 가 없다 — 임시 `AUTH_SECRET` + `DATABASE_URL=postgresql://x:y@127.0.0.1:1/db`, 데이터는 목(MSW)이나 dev 시안 경로로.
- 변이 하네스 `scripts/qa/mutate-class-owner.ts` — 관리자 판정을 **두 방향**(늘 그린다 / 안 그린다) · 내 반 맨 위 · 6자 · 인쇄 무변화.
  ⚠️ `rmSync` 금지(임시 파일 + `unlinkSync`). 커밋한 상태에서 돌린다.
- 관문: `npx prisma generate` → `tsc --noEmit` 0 · 관련 시험 · `npm run lint` · `npm run lint:affordance` · `npm run build`.

## 4. 보고

`docs/planning/tracks/reports/class-owner-tag.md` — ① 만든 것(계약 칸 표 포함) · ② 시안과 다른 점 표(까닭) · ③ 캡처 ·
④ 시험·변이 표 · ⑤ 리드가 정할 것(오늘의 확인테스트 한 줄 붙일 자리 포함) · ⑥ 원장님께 여쭐 것(D-07). 끝나면 보고서를 커밋하고 멈춰라. **푸시하지 마라.**

CLAUDE.md 절대 규칙 — D-07 · TDD · 문구(D-08) · 어포던스(D-30). 커밋 계정 `SUN <chrismathone@gmail.com>`.
