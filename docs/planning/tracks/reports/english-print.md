# 트랙 english-print — 학생용·교사용 A4 지면 · print-check 항목 둘 (D-148)

브랜치 `BIGSHOL/english-print` · 기준 main `0150e9db6` · 2026-09-30 · **DB 접근 없음 · AI 호출 없음 · 남의 파일은 `PrintCheck.test.tsx` 의 숫자 한 줄만**

> 다시 확인하기:
> ```
> npx vitest run src/__tests__/unit/englishPrintLayout.test.ts src/__tests__/components/EnglishPrintPaper.test.tsx src/__tests__/components/EnglishPrintClient.test.tsx src/__tests__/components/PrintCheck.test.tsx
> npx eslint src/components/english/print src/__tests__/components/EnglishPrint*.test.tsx src/__tests__/unit/englishPrintLayout.test.ts src/app/dev/print-check/items.ts
> npm run lint:affordance
> npx tsc --noEmit        # 리드 파일의 기존 오류 1건(§4 ⑤)만 남는다
> ```

---

## 0. 한눈에

| | |
| --- | --- |
| 커밋 | `c84515f6b` 지면·측정·미리보기·print-check 항목·시험 · `ecd24a7fa` M2 봉합 · `69b22384c` 보고서 → 리드 검토 뒤 `9e03aad25`(D1~D4·D6·D7) → **`11ad6254d` 라우트**(§7) |
| 만든 것 | `src/components/english/print/` 다섯 파일 · 시험 셋 + 픽스처 · print-check 항목 둘 |
| 시험 | **43 통과 / 4 파일** (단위 10 · 지면 14 · 미리보기 9 · print-check 10) · ESLint 0 · 어포던스 0 · tsc 내 파일 0 |
| 변이 | 넷 중 넷이 문다 — M2 는 처음엔 안 물어 시험을 고쳤다(§2.2) |
| 못 한 것 | ~~라우트~~(§7 에서 붙였다 — `11ad6254d`) · **실물 인쇄 검수**(절대 규칙 6 — 항목 «대기» · 리드가 main 에서 한 번 열어 볼 것 §3 ③) |
| 리드가 정할 것 | 울타리 허용 목록에 `src/components/english/**`(§4 ①) · 시험 파일 이름(§4 ②) · 서체·보기 번호·꼬리 같은 지면 세부(§4 ③) · 학원 이름의 출처(§4 ④) · tsc 기존 오류(§4 ⑤) |

---

## 1. 한 것

### 1.1 지면 `src/components/english/print/`

| 파일 | 하는 일 |
| --- | --- |
| `EnglishPaper.tsx` | **순수 컴포넌트.** `{ set, exam, view, academyName, pages? }` → `A4Page` 안 **1단**. 머리(«오늘의 영어 · 학원» \| «학생용/교사용 · 정답 및 해설 · 검토 상태» · 세트 제목 · «학교 학년 · 시험» · 이름·날짜 줄) → 지문 상자 → 문항(«1. 발문» · 보기 ①~⑤ · 학생용 서술형·원문 복원엔 50px 밑줄 답란 · 교사용엔 정답·해설·근거 상자) → 꼬리 «p. N / M». 이어지는 쪽은 작은 머리(«오늘의 영어 · 세트 제목» \| «학생용 · p. N»). **배점 글자 없음.** 수학 2단 폭·`.paperParity`·장당 2문항(D-28)은 안 쓴다 |
| `EnglishPrint.module.css` | 위 배치. 본문은 지면 명조 `--paper-font-serif`(지문·보기 12pt · 줄 간격 1.9 · `pre-wrap`), 이름표·머리 딱지·꼬리는 `--paper-font-sans`. 교사용 상자 = 회색 면 `#e8e8eb` + 왼쪽 3px `#a0a0a8`(지면 규약 — D-30 과 무관). `.question`·`.passageBox` 에 `break-inside: avoid`. **`@page` 를 다시 선언하지 않는다** — `A4Page` 가 부르는 `TestPrint.module.css` 가 이미 `size: A4; margin: 0` 과 쪽 나눔을 선언한다 |
| `englishPaperLayout.ts` | 순수 함수. `splitPassageParagraphs`(빈 줄 → 문단) · `englishPaperBlocks`(문단 → 문항 순 블록) · `packEnglishBlocks`(순서대로 채우고 넘치면 다음 쪽 · 블록 간격 14 · 문단 간격 10 · 지문 상자 여분은 **쪽마다 한 번** · 한 쪽보다 큰 블록은 혼자 한 쪽 + `oversized`) |
| `useEnglishPages.tsx` | `useMeasuredPages` 결. 화면 밖 숨은 틀에 같은 컴포넌트를 두 벌(블록 전부 한 쪽 · 빈 쪽 둘) 그려 블록 높이·지문 상자 여분·첫 쪽/이어지는 쪽 본문 높이를 잰다. `document.fonts.ready` → 두 프레임 → 측정 → `ResizeObserver`. 인쇄 매체에서 틀이 `display:none` 이면 지난 측정을 지킨다 |
| `EnglishPrintClient.tsx` | 도구 줄(학생용/교사용 `aria-pressed` · «인쇄하기» `window.print()` · «닫기» `window.close()`) + 지면 묶음 + 측정 틀. 검토 완료가 아니면 «아직 검토 완료하지 않은 문제입니다.» 한 줄(`role=status`). **쪽 나눔을 재기 전엔 «지면 준비 중»으로 잠긴다**(한 쪽짜리 임시 지면이 종이로 나가지 않게). 전환하면 `?view=` 를 `replaceState` 로 남긴다. 도구 줄·지면 묶음 클래스는 수학 `TestPrint.module.css` 를 **그대로 쓴다**(한 자리를 고치면 두 미리보기가 같이 바뀐다) |

### 1.2 print-check 항목 둘 (`src/app/dev/print-check/items.ts` 끝)

`english-student-a4` · `english-teacher-a4` — `lookFromSource: false`(제안) · `status: "대기"` · `needs` «검토 완료 세트 하나 — 객관식 2 · 서술형 1 · 원문 복원 1» · `changedOn: "2026-09-30"`. `look` 은 «무엇이 보이면 불합격인가»로 적었다 — 지문 상자 잘림 · 문항이 쪽 경계에서 갈림 · 세리프 대체(고딕으로 나오면) · 답란 밑줄 옅음 · 교사용 회색 면 안 찍힘 · **배점 글자가 보이면 불합격**. `PRINT_ROUTE` 상수는 안 건드리고 `evidence` 에 영어 경로를 적었다. 🔴 항목 수 단정 `PrintCheck.test.tsx` 를 79 → 81 로 고쳤다(그 파일은 소유 표에 없다 — §4 ②).

### 1.3 시험

| 파일 | 무엇을 잠그나 |
| --- | --- |
| `src/__tests__/unit/englishPrintLayout.test.ts` (10) | 문단 나누기(빈 줄·CRLF·공백 줄) · 블록 순서 · 채우기(간격·상자 여분·이어지는 상자·oversized·첫/이어지는 쪽 높이 차·빈 지면) |
| `src/__tests__/components/EnglishPrintPaper.test.tsx` (14) | 학생용엔 정답·해설·근거 없음 / 교사용엔 문항마다 있음(객관식 정답은 ③ 글자) · 답란은 학생용 서술형·원문 복원에만(50px 밑줄은 CSS 원문) · 학생용 `questions`/교사용 `answers` 경계 · **1단**(`.paperParity` 없음 · CSS 에 2단 흔적 없음) · `break-inside: avoid`(주석 걷은 CSS 원문 + 그 클래스가 실제로 붙는가) · 지문·발문 `pre-wrap`(문단 안 줄바꿈이 글자로 남음) · 보기 ①~⑤ · **배점 글자 없음**(두 지면) · 머리 문구 · `pages` 로 쪽 나눔(이어진 상자 «지문 (이어짐)» · 작은 머리 · 꼬리) · 빈 쪽 |
| `src/__tests__/components/EnglishPrintClient.test.tsx` (9) | 전환(눌림 표시·지면 종류·`?view=`) · `initialView` · «준비 중» → «인쇄하기» → `window.print` · 못 재면 계속 잠김 · 잰 높이대로 쪽 수 · oversized 알림 · 닫기 · 검토 상태 문구 · 도구 줄 머리(느낌표·이모지 없음) |
| `src/__tests__/fixtures/englishPrintSet.ts` | 표본 세트(객관식 2 · 서술형 1 · 원문 복원 1). **지문은 우리가 지은 글**(공통 지시 §2) |

⚠️ vitest 는 CSS 를 안 읽는다(`css: false`) — `break-inside`·`pre-wrap`·`50px` 은 **CSS 원문**에서 그 클래스의 선언을 찾고 그 클래스가 요소에 붙는지를 같이 본다. 종이에서의 사실은 절대 규칙 6 대로 `/dev/print-check` 에 남겼다.

---

## 2. 시험 결과 · 변이

### 2.1 관문

```
Test Files  4 passed (4) · Tests  43 passed (43)     # 내 시험 넷
eslint(내 파일 8)      0 오류 0 경고
npm run lint:affordance  0건
npx tsc --noEmit         내 파일 0 · 리드 파일 1건 (§4 ⑤)
```

`npm run lint` 전체는 내 오류 0 · 기존 경고 61(남의 `no-unused-vars`). pre-commit 훅(lint-staged → eslint · prettier · 어포던스)이 커밋 때 실제로 돌았다(출력 확인 — 교훈 2026-08-19).

### 2.2 변이 — 시험이 결함을 실제로 무는가

| # | 변이 | 결과 |
| :-: | --- | --- |
| M1 | 꼬리에 `· 배점 5점` 삽입 | 🔴 «배점 글자가 어디에도 없다» + 쪽 시험 빨강 → 문다 |
| M2 | `.question` 의 `break-inside: avoid;` 삭제 | 🟢 **처음엔 초록** — `page-break-inside: avoid` 가 남아 `/break-inside:\s*avoid/` 에 맞았다. 앞에 `-`·글자가 없는 선언만 세도록 `(?<![-\w])` 로 좁힘 → 🔴 문다 |
| M3 | 채우기의 블록 간격 `ENGLISH_BLOCK_GAP` → 0 | 🔴 간격·쪽 높이 시험 둘 빨강 → 문다 |
| M4 | 인쇄 단추 `disabled={!ready}` → `false` | 🔴 «준비 중» 시험 둘 빨강 → 문다 |

덤 — 변이를 `git checkout --` 로 되돌리면 파일이 **CRLF** 로 돌아온다(메모리 «텍스트 복원의 줄끝 거짓말»). 두 번째 M2 는 `\n` 패턴이 안 맞아 «변이 0건»으로 초록이 났다 — `\r?\n` 으로 다시 넣어 확인했다. 변이가 «안 들어갔는데 초록»인 것과 «들어갔는데 초록»인 것은 다르다 — 치환 수를 늘 찍었다.

---

## 3. 못 한 것

1. **라우트 `src/app/(main)/english/sets/[id]/print/page.tsx` + `loading.tsx`** — Prisma 모델(`englishQuestionSet`)이 base 트랙 것이라 이 워크트리에선 tsc 가 못 지난다. 브리프 §2 대로 **base 가 main 에 병합된 뒤 리드가 알리면** `merge main` 하고 §6 초안을 붙인다. 그때 같이 도는 관련 시험: `accountRouteAccess.test.ts`(이미 `/english` → `english` 메뉴) · 필요하면 페이지 시험 하나(세션 없음 → `/login` · 범위 밖 → 404 · `?view=teacher`).
2. **실물 인쇄 검수** — 절대 규칙 6. 항목 둘이 «대기». 라우트가 붙기 전엔 뽑을 화면이 없다.
3. **브라우저 실측** — 워크트리엔 `.env` 가 없고 라우트도 없어 dev 서버로 지면을 눈으로 보지 못했다. 쪽 나눔은 jsdom 에서 크기를 흉내 내어 검증했다(§1.3). 리드가 main 에서 한 번 열어 보면 좋은 것: ① 글꼴이 실린 뒤 쪽 수가 바뀌지 않는가(`document.fonts.ready` 뒤 측정) ② 인쇄 미리보기에서 숨은 측정 틀이 안 찍히는가(`@media print { display:none }`) ③ 교사용 회색 면.

---

## 4. 리드가 정할 것

① **영어 울타리 허용 목록(25 §6.2)에 `src/components/english/**` 가 없다.** `EnglishPaper`·`EnglishPrintClient` 는 브리프 §1 대로 계약 타입 `EnglishSet`·`EnglishExam` 을 쓴다 — 울타리가 «`EnglishExam|EnglishQuestionSet` 글자» 를 그 목록 밖에서 잡으면 이 폴더(그리고 shell 의 화면 컴포넌트)가 걸린다. base 가 울타리를 세울 때 `src/components/english/**` 를 허용하거나, 표 이름 검사는 **Prisma 접근(`db.english…`)** 만 보게 하는 것이 맞다.

② **파일 이름 셋.** 브리프 §3 은 `EnglishPaper.test.tsx` 라 했는데 공통 지시 표에서 shell 이 `src/__tests__/components/English*.test.tsx` 를, print 가 `EnglishPrint*.test.tsx` 를 소유한다 — 겹치지 않게 **`EnglishPrintPaper.test.tsx`** 로 두었다. 소유 표에 없는 새 파일 둘: `src/__tests__/unit/englishPrintLayout.test.ts` · `src/__tests__/fixtures/englishPrintSet.ts`. 남의 파일은 `PrintCheck.test.tsx` 의 숫자 한 줄(79 → 81)뿐이다.

③ **지면 세부 — 브리프에 없어 내가 정한 것(D-07 결 — 원장님 확인 대상).**
- 본문 서체: 지문·보기·발문·해설·근거 **모두 지면 명조**(`--paper-font-serif` — 라틴 세리프는 그 글꼴의 것, 05 §8.5), 이름표·머리 딱지·꼬리만 sans. 25 §1.4 «발문·해설은 한글 본문 글꼴» 을 지면에서는 명조로 읽었다(화면의 한글 본문 글꼴은 Pretendard 지만 지면의 본문 글꼴은 명조). 발문을 sans 로 하려면 `.prompt`·`.teacherText` 한 줄씩이다.
- 보기 번호 **①~⑤**, 교사용 정답도 같은 글자(«정답 ③»). 서술형·원문 복원은 정답 글.
- 교사용엔 **답란이 없다**(그 자리에 정답·해설·근거 상자). 학생용과 같은 답란을 교사용에도 두려면 `QuestionBlock` 의 조건 한 줄.
- 문항 유형(«어법» 등)은 **지면에 찍지 않는다**(편집 화면의 «QUESTION 01 · 유형» 머리는 화면 것). 교사용 상자에 유형을 넣으려면 한 줄.
- 꼬리 «{학원} · {학교} {학년}» \| «p. N / M». 이름·날짜 줄은 `이름 ________________ · 날짜 ____ . ____ . ____`.
- 이어지는 쪽의 지문 상자 이름표 «지문 (이어짐)».

④ **학원 이름의 출처.** `academyName` 은 prop 이다. 라우트 초안(§6)은 `Branch.name`(지점) → 없으면 `"오늘의수학"` 로 두었다 — 수학 지면은 `"오늘의수학"` 상수다(`TestPrint.tsx`). 지점 이름을 쓸지 상수로 둘지 리드·원장님 결정.

⑤ **tsc 기존 오류 1건 — 리드 파일.** `src/__tests__/unit/englishValidate.test.ts:117` 의 정규식 `s` 플래그: `TS1501 This regular expression flag is only available when targeting 'es2018' or later.` 기준 커밋 `0150e9db6` 부터 있다(내 변경과 무관). `/…/s` 를 `[\s\S]` 로 바꾸거나 tsconfig `target` 을 올리면 된다.

⑥ **지문이 빈 줄 없이 한 쪽보다 길면** 문단 하나라 쪽을 못 넘긴다 — 혼자 한 쪽을 차지하고 미리보기가 «지문 1번째 문단 — 잘릴 수 있습니다» 로 알린다(잘라 버리거나 축소하지 않는다). 내신 지문(150~400단어)은 한 쪽 안이라 실제로는 드물다. 문장 단위로 더 잘게 나누는 것은 지문 상자를 문장마다 쪼개는 일이라 형태 결정(D-07)이다 — 필요하면 그때.

---

## 5. 위험

- **`@page` 겹침.** 이 지면은 `TestPrint.module.css` 의 `@page { margin: 0 }` 을 탄다. 작업실 `Workspace.module.css:1692` 의 `@page { margin: 14mm }` 이 같은 창에 실리면 늦게 실린 쪽이 이긴다 — 라우트는 **크롬 없이** `EnglishPrintClient` 하나만 그려야 한다(초안 §6 이 그렇다).
- **측정 틀은 화면에만.** `useEnglishPages` 의 숨은 틀은 `position: fixed; left: -100000px; visibility: hidden` 이고 인쇄 매체에선 `display: none` — 브라우저 인쇄 미리보기에 두 벌이 더 찍히면 그 CSS 가 안 실린 것이다(§3 ③).
- **«닫기»는 새 탭에서만 닫힌다.** `window.close()` 는 스크립트가 연 창만 닫는다 — shell 이 인쇄를 새 탭으로 여는 약속(공통 지시 §3)이라 맞지만, 주소를 직접 친 창에선 아무 일도 안 일어난다.
- **울타리(§4 ①)** 가 이 폴더를 잡으면 병합 뒤 main 전체 시험에서 빨강이 «남의 일»로 보인다(교훈 2026-09-26).

---

## 6. 라우트 초안 (base 병합 뒤 붙인다 — 지금은 tsc 가 못 지난다)

`src/app/(main)/english/sets/[id]/print/page.tsx` — 서버 컴포넌트 · 크롬 없음 · 부모 시험의 `ownedRowsWhere`:

```tsx
import { notFound, redirect } from "next/navigation";

import {
  EnglishPrintClient,
  parseEnglishPrintView,
} from "@/components/english/print/EnglishPrintClient";
import { idParamSchema } from "@/contracts/common.contract";
import { db } from "@/lib/db";
import { ownedRowsWhere } from "@/lib/ownerScope";
import { getSessionUser } from "@/lib/session";
// base 가 만든 행 → 계약 변환기(이름은 base 보고서에서) — 없으면 englishSetSchema.parse 로 읽는다
import { toEnglishSet } from "@/lib/english/...";

export const metadata = { title: "오늘의 영어 · 인쇄" };

export default async function EnglishSetPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [session, routeParams, query] = await Promise.all([
    getSessionUser(),
    params,
    searchParams,
  ]);
  if (!session) redirect("/login");
  const parsed = idParamSchema.safeParse(routeParams);
  if (!parsed.success) notFound();

  const row = await db.englishQuestionSet.findFirst({
    // 소유는 부모 시험의 범위(25 §2 · D-130) — 지점 관리자는 지점 전체, 강사는 자기 것
    where: { id: parsed.data.id, exam: ownedRowsWhere(session) },
    include: {
      exam: {
        select: {
          school: true,
          grade: true,
          title: true,
          user: { select: { branch: { select: { name: true } } } },
        },
      },
    },
  });
  if (!row) notFound();

  return (
    <EnglishPrintClient
      academyName={row.exam.user.branch?.name ?? "오늘의수학"}
      exam={{ school: row.exam.school, grade: row.exam.grade, title: row.exam.title }}
      initialView={parseEnglishPrintView(query.view)}
      set={toEnglishSet(row)}
    />
  );
}
```

`loading.tsx`:

```tsx
export default function Loading() {
  return (
    <p role="status" style={{ padding: 24, color: "var(--learn-muted)" }}>
      지면을 불러오는 중입니다.
    </p>
  );
}
```

관문은 리드가 이미 적었다(`accountRouteAccess.ts:101` — `/english` → `any("english")`). `exam.grade` 는 DB 가 VarChar(4) 라 계약 enum 으로 읽을 때 변환기가 검증해야 한다(base).

---

## 7. 후속 커밋 (2026-09-30, 리드 검토 뒤)

| 커밋 | 무엇 |
| --- | --- |
| `9e03aad25` | 리드 적대적 검토 D1~D4·D6·D7 — layoutError 면 인쇄 잠금(«인쇄할 수 없음» · oversized·pages-ready 도 무시) · 쪽 여유 `ENGLISH_PAGE_SLACK` 12px · 인쇄 매체 `measureHost` 숨김 CSS 원문 시험 · 첫/이어지는 쪽·상자 여분 배선 시험(mock 이 요소마다 다른 높이) · 답란 `aria-hidden`. 리드 변이 M7·M8·M9·M15·M19 다섯이 새 시험에 문다 |
| `33a199803` · main 병합 | `2de827cc3`(자료 4MB) 병합 → 뒤에 main `0a11aaa7f`(base·ai·print 병합) 빨리감기 |
| **`11ad6254d`** | **라우트** `src/app/(main)/english/sets/[id]/print/page.tsx` + `loading.tsx` — §6 초안 그대로. 서버 컴포넌트 · 크롬 없음 · `EnglishPrintClient` 하나 · 세션 없음 → `/login` · uuid 아님·세트 없음·부모 시험 없음·범위 밖 → 404(`requireOwnedEnglishExam`) · 학원 이름 = 시험 주인의 `Branch.name`, 없으면 «오늘의수학»(리드 결정) · `?view=teacher\|student`. 시험 `src/__tests__/api/englishPrintPage.test.ts`(8) — 돌려받은 **요소의 type·props** 를 본다(페이지는 컴포넌트를 부르지 않는다). print-check evidence 를 page.tsx 로(D7 마무리) · `classOwnerPrintFree` 가드에 영어 인쇄 뿌리 둘 추가 |

라우트 커밋의 관문: 11파일 121 통과(인쇄 넷 · 페이지 · accountRouteAccess · englishMenu · englishFence · proxyStudentGate · classOwnerPrintFree · errorLogRouteCoverage) · ESLint 0 · 어포던스 0 · tsc 0. `errorLogRouteCoverage` 는 `route.ts` 만 센다 — page.tsx 는 대상 밖(빨강 없음). `proxyStudentGate` 는 새 페이지를 학생 세션에 «막힘(307 → /learn)» 으로 센다 — 기대 목록 변경 없이 초록.

남은 것: **실물 인쇄 검수**(항목 둘 «대기») · 지면 세부는 25 §10.1 에서 원장님이 실물을 보고 정하실 때 같이(리드).
