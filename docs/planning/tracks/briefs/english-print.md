# 트랙 english-print — 학생용 · 교사용 A4 지면 · print-check (D-148)

공통 지시 `english-common.md` 를 먼저. 25 §5 · 05 §8.5(지면 규칙) · 절대 규칙 6. **배점 없음**(원장님 ⑻).

## 1. 지면 컴포넌트 `src/components/english/print/`
- `EnglishPaper.tsx` — 순수: `{ set: EnglishSet; exam: Pick<EnglishExam,"school"|"grade"|"title">; view: "student"|"teacher"; academyName: string }` → `A4Page`(`src/components/print/A4Page.tsx` · `print/tokens.ts` 의 A4 값·`PAPER_FONTS`) 안에 **1단**. 🔴 수학 2단 폭(`PAPER_COLUMN_WIDTH`)·`.paperParity`·장당 2문항(D-28)은 쓰지 않는다 — 문항은 흐르는 대로, `break-inside: avoid` 로 문항이 쪽에서 안 잘리게. 여러 쪽이면 `useMeasuredPages` 결로 쪽을 나눈다(간단히: 문항 단위로 높이를 재어 쪽 배열).
- 머리: «오늘의 영어 · {학원 이름}» | «{학생용|교사용 · 정답 및 해설} · {검토 상태}» · 세트 제목 · «{학교} {학년} · {시험 이름}» · 이름·날짜 줄.
- 지문 상자(세리프 12pt · 줄 간격 1.9 · 얇은 테두리 · `white-space: pre-wrap`). 문항: «1. 발문»(`pre-wrap` — 빈칸·번호 표지가 발문에 있다) · 보기 1~5(세리프) · 서술형·원문 복원은 답란(높이 50px 밑줄) · 교사용에만 정답·해설·근거 상자(회색 면 + 왼쪽 3px 회색 선 — 이 선은 «지면 규약»이라 D-30 색 막대 금지와 무관).
- `EnglishPrint.module.css` — `@media print { @page { size: A4; margin: 0 } }` 는 `A4Page`/`TestPrint.module.css` 결을 따르되 **전역에 두 번 선언하지 않는다**(`Workspace.module.css:1692` 의 `margin:14mm` 과 같은 창에 실리지 않게).
- `EnglishPrintClient.tsx` — 미리보기 도구 줄(학생용/교사용 `aria-pressed` 전환 · «인쇄하기» → `window.print()` · «닫기»). 검토 완료가 아니면 도구 줄에 «아직 검토 완료하지 않은 문제입니다.» 한 줄.

## 2. 라우트 `src/app/(main)/english/sets/[id]/print/page.tsx` (+ `loading.tsx`)
- 서버 컴포넌트, 크롬 없음. `getSessionUser()` 없으면 `/login` · 세트를 **부모 시험의 `ownedRowsWhere`** 로 읽는다(`db.englishQuestionSet.findFirst({ where: { id, exam: ownedRowsWhere(session) 모양 } })`) · 없으면 `notFound()` · `searchParams.view`.
- 🔴 Prisma 모델은 base 트랙이 만든다 — **base 가 main 에 병합된 뒤 리드가 알리면** `git rebase`(또는 merge main) 하고 이 파일을 붙인다. 그 전에는 §1 컴포넌트 · §3 시험 · §4 항목까지 끝내고 «검토 요청 1차».
- 관문은 리드가 이미 `accountRouteAccess.ts` 에 `/english` → `english` 메뉴로 적었다(`englishMenu.test.ts`).

## 3. 시험
- `src/__tests__/components/EnglishPaper.test.tsx` — 학생용엔 정답·해설 없음 / 교사용엔 있음 · 서술형 답란 · 1단(`.paperParity` 없음) · 문항 `break-inside` · 지문 `pre-wrap` · 배점 글자 없음.
- `src/__tests__/components/EnglishPrintClient.test.tsx` — 전환 · 인쇄 단추 · 검토 상태 문구.

## 4. `src/app/dev/print-check/items.ts` — `ITEMS` 끝에 둘
- `english-student-a4` · `english-teacher-a4`: `changed`(새 지면) · `look`(종이에서 무엇이 보이면 불합격인가 — 지문 상자 잘림 · 문항이 쪽 경계에서 갈림 · 세리프 글꼴 대체 · 답란 밑줄 옅음 · 교사용 근거 상자 회색 면 인쇄 · 배점이 보이면 불합격) · `lookFromSource: false`(제안) · `evidence`(25 §5 · 05 §8.23) · `status: "대기"` · `needs`(«검토 완료 세트 하나 — 객관식 2 · 서술형 1 · 원문 복원 1») · `changedOn: "2026-09-30"`. `PRINT_ROUTE` 상수는 수학 것이라 건드리지 않고 항목 `evidence` 에 영어 경로를 적는다.

## 5. 보고서 `docs/planning/tracks/reports/english-print.md`
