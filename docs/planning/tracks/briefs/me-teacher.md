# me-teacher — 개념 카드(탐험) 기록을 교사에게: 투영 · 계약 · 끝점 (화면 없음)

> 먼저 읽을 것: `docs/planning/27-explorers-teacher-visibility.md`(전부) · `docs/reviews/unified-expedition-decision.md` ·
> `docs/planning/07-coding-convention.md` 의 D-141 · D-142 · D-144 줄 · `src/lib/math-explorers/PROVENANCE.md`.
> 가지: 워크트리는 이미 `chrismathone/me-teacher`(로컬 main 에서 갈렸다) 위에 있다 — 새 가지를 만들지 않는다.

## 무엇을

학생의 개념 카드 기록은 이미 `student_srs_state.payload.explorers` 에 있다. **읽기만 하는** 교사용 요약을 만든다.
새 저장 · DB 마이그레이션 · 학생 화면 변경 · 저장 꼴 변경 · 교사 화면(컴포넌트)은 **하지 않는다.**

1. **순수 투영** `src/lib/math-explorers/teacherSummary.ts` — 입력: 저장된 탐험 기록(`StoredExplorer` 또는 그 `profile`) + 오늘(KST 날짜 글).
   출력(학생 한 명):
   - 모은 카드 수 / 230 · 단원별 모은 수(5장 중) · 오늘 복습할 카드 수 · 밀린 카드 수와 가장 오래 밀린 날 수
   - 카드 목록(학생 상세용): 카드 id · 이름 · 단원 · 학년 · `level` · `due` · `lastRecall` · `missed` · `reviewStep` · 밀린 날 수
   - 최근 세션(이력 끝에서 10건): 날짜 · 단원 이름 · 길(`unit`/`memory`/`repair`) · 첫 시도 정답 `first`/15 · 미해결 `unresolved` · 별
   - 열린 세션: 시작 날 · 진행 · 미해결 수(있을 때)
   - 마지막으로 하루를 끝낸 날(`completedDays`)
   - **도움 사유**(27번 문서 §4.2 의 표 그대로 — 사유 코드 · 근거 값 · 관련 카드 이름): 미해결을 남김 · 거듭 막힘 · 복습 밀림 · 임무가 날을 넘김 · 오래 쉼 · 시작 전.
     문턱은 그 파일의 **이름 붙은 상수** + `TEACHER_FLAG_POLICY = 1`. «계정 없음»은 끝점이 학생 행에서 붙인다.
   - 🔴 **문항 글 · 보기 · 학생이 고른 답은 싣지 않는다**(D-141 ⑵). 카드 이름과 단원 이름은 교육과정 내용이라 싣는다.
2. **계약** `src/contracts/mathExplorersTeacher.contract.ts` — strict Zod. 반 응답(학생마다 요약 — 카드 목록은 빼고) · 학생 응답(카드 목록 포함).
3. **끝점 둘**(둘 다 GET · `withErrorLog` · `noStore`):
   - `src/app/api/classes/[id]/math-srs/explorers/route.ts` — 문지기는 `src/app/api/classes/[id]/math-srs/route.ts` 와 **같게**(계정 · 메뉴/역할 · `requireOwnedClass`).
     반 학생 전원(탈퇴 제외)의 요약. 기록 없는 학생도 줄에 나온다.
   - `src/app/api/students/[id]/math-srs/explorers/route.ts` — 문지기는 `…/students/[id]/math-srs/course/route.ts` 와 **같게**(`srs` 메뉴 · `requireOwnedStudent`). 학생 한 명의 상세.
   - 경로가 계정 관문(`src/lib/accountRouteAccess.ts` · `routeAccess.ts`)에서 허용되는지 보고, 필요하면 **같은 메뉴 조건으로만** 한 줄 더한다.
   - 기록을 읽는 모듈은 `src/__tests__/unit/mathSrsRecordIsolation.test.ts` 의 허용 목록 안에 둔다(`src/lib/math-explorers/` · `src/app/api/classes/[id]/math-srs/` · `src/app/api/students/[id]/math-srs/` 는 이미 허용 — **목록을 넓히지 마라**. 넓혀야 하면 멈추고 리드에게 물어라).
   - 저장소 접근은 기존 길(`src/lib/math-srs/serverStore.ts` · `serverContext.ts` 의 읽기)을 쓴다. 새 Prisma 질의를 손으로 짓지 않는다(지점 분리 — `ownerScope`).
4. **시험(TDD — 빨강 먼저)**:
   - 투영 단위 시험: 사유마다 문턱 바로 안 · 밖 · KST 자정 앞뒤 · 기록 없음 · 열린 세션 · 재도전 연장(continuation).
   - 계약 시험: 응답 꼴에 문항 글 · 보기 · 답 열쇠가 **들어갈 수 없다**(키 이름으로 잠근다).
   - 경로 시험: 로그인 없음 401 · 다른 소유자 403 · **다른 지점 관리자 403**(27 §4 공백 4) · 제 반 200 · 탈퇴 학생 제외.
   - **덧붙여**: 기존 교사 끝점 셋(`/api/classes/[id]/math-srs` · `/api/students/[id]/math-srs/course` · `/api/math-srs/course`)에도 «다른 지점 관리자» 경로 시험을 더한다(지금은 `ownerScope` 단위 시험뿐).
   - 새 라우트는 `src/__tests__/unit/errorLogRouteCoverage.test.ts` 같은 **전수 가드**에 걸린다 — 관련 시험으로 같이 돌린다.

## 끝났다는 것

- 위 시험 + 기존 `mathExplorers*` · `mathSrs*` 시험 가운데 고친 파일을 무는 것 통과(파일 이름을 적어 `--pool=threads --maxWorkers=1`).
- `npx eslint <고친 파일>` · `npx prettier --check <고친 파일>` · `npm run lint:affordance`(컴포넌트를 안 건드리면 생략).
- 보고서 `docs/planning/tracks/reports/me-teacher.md` — 응답 꼴 예시(가짜 학생) · 사유 문턱 · 시험 목록 · 못 한 것.
- 가지에 커밋(main 에 밀지 않는다) → `worker_done`.

## 공통

node_modules 는 main 을 가리키는 정션 — `npm install` · `npx prisma generate` 금지. 전체 `npm run type-check` 금지(리드가 병합 뒤).
무거운 검사 전에 `C:\Users\user\orca\cb-verify.lock` 가 있으면 기다리고, 없으면 만들고(내용: 트랙 이름) 돌린 뒤 지운다. 답과 보고서는 한국어.
