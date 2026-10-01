# me-form — 값은 맞고 꼴이 틀린 답 가르기 (1걸음: 세기 + 판정 순수 함수 · 학생 화면은 아직 안 바꾼다)

> 먼저 읽을 것: `docs/planning/27-explorers-teacher-visibility.md` §5(안건 3) · `docs/planning/tracks/reports/consult-27/consensus.md` §1 안건 2 · §1.1 ·
> `src/lib/math-srs/elementary/answers.ts`(전부 — `needsComparison` · `getCourseProblemInput` · `gradeCourseAnswer`) · `choiceAnswers.ts` ·
> 그 시험들(`src/__tests__/` 에서 `answers` · `choiceAnswers` 로 찾는다).
> 가지: 워크트리는 이미 제 가지(로컬 main 에서 갈렸다) 위에 있다 — 새 가지를 만들지 않는다.

## 왜

초등 기억 학습은 4지선다가 기본이고, 보기 넷을 못 만들 때만 직접 입력이다. 그런데 «기약분수로 · 대분수로 · 약분하여»처럼 **꼴을 요구하는 문항**은
자동 판정하지 않고 «스스로 확인»(`self-check`)으로 돌린다(`needsComparison`). 학생이 틀린 꼴을 «맞음»으로 누르면 그 기록이 복습 간격까지 민다.
3자 합의(codex · grok 2:1 — 리드의 «먼저 센다»가 졌다): **기약분수 · 대분수 두 꼴만 자동으로 가른다.** «값은 맞고 꼴이 틀림»은 오답도 완료 정답도 아닌 셋째 상태다.

## 이번 걸음에서 하는 것 (학생이 보는 것은 하나도 안 바뀐다)

1. **세기** — `scripts/qa/math-srs/count-form-items.ts`(읽기 전용). 초등 기억 학습이 실제로 내는 문항 모집단에서:
   전체 · 4지선다가 되는 것 · 직접 입력 · `self-check` · 그 가운데 꼴 요구(`needsComparison` 이 걸린 까닭별: 기약분수 · 대분수 · 가분수 · 소수 · 약분 · 통분 · 그리기 · 설명 · 식 쓰기).
   모집단이 코드(자체 엔진)에서 나오면 DB 없이 돌게 하고, DB(문제은행)에서 나오면 **워크트리에는 `.env` 가 없다** — 스크립트만 쓰고
   «리드가 main 에서 돌려야 한다»고 보고서에 적어라(네가 돌리지 마라 · 시험에서 DB 를 부르지 마라).
   🔴 분모를 적어라 — 무엇의 몇 %인가(교훈 «들어온 것을 세지 말고 살아남은 것을 세라» · «현행이라는 분모가 정말 현행인지»).
2. **판정 순수 함수**(빨강 먼저) — `answers.ts` 옆에.
   - `requiredForm(problem) → "irreducible" | "mixed" | null` — 발문이 요구하는 꼴. 두 가지만. 그 밖(가분수 · 소수 · 통분 · 그리기 · 설명 …)은 null 이고 지금처럼 `self-check`.
   - `gradeValueAndForm(problem, input) → { value: boolean; form: "ok" | "not-irreducible" | "not-mixed" | "not-applicable" }`.
     값은 지금의 정확한 유리수 교차 곱을 그대로 쓴다(새 파서를 짓지 않는다). 꼴은 **학생이 쓴 글자**에서 본다 — `6/8` 은 값이 맞아도 `not-irreducible`.
   - 🔴 **옳은 표기를 거절하지 않는다**(두 모델이 짚은 가장 큰 위험): 띄어쓰기(`1 1/2` · `1  1/2`) · 정수로 떨어지는 답(`2` — 기약분수 요구에 `2/1` 을 요구하지 않는다) ·
     대분수 요구인데 값이 진분수 · 정수인 경우 · 음수 · 단위가 붙은 답. 경우마다 시험으로 적어라. 확신이 없는 입력은 `form: "not-applicable"`(= 지금처럼 값만).
   - 기존 `gradeCourseAnswer` 의 결과는 **바꾸지 않는다**(이번 걸음에서 아무도 새 함수를 부르지 않는다 — 배선은 다음 걸음).
3. **보고서** `docs/planning/tracks/reports/me-form.md` — 세기 결과(또는 «리드가 돌릴 것») · 판정 규칙 표 · 거절하지 않기로 한 표기 목록 ·
   다음 걸음에 필요한 것(`CourseProblem["input"]` 계약 · 제출 경로 · 학생 문구 자리 — **문구는 짓지 말고 자리만** 적어라. 문구는 원장님이 시안에서 고르신다).

## 하지 않는 것

학생 화면 · 문구 · 제출 API · 저장 꼴 · DB. `needsComparison` 의 동작 변경. 기약분수 · 대분수 밖의 꼴.

## 끝났다는 것

- 새 시험 초록 + `answers` · `choiceAnswers` 기존 시험 그대로 초록.
- 변이 하나를 걸어 본다 — 꼴 검사를 `return "ok"` 로 바꾸면 시험이 빨개지는가(보고서에 결과).
- 가지에 커밋(main 에 밀지 않는다) → `worker_done`.

## 공통

node_modules 는 main 을 가리키는 정션 — `npm install` · `npx prisma generate` 금지. 전체 `npm run type-check` 금지.
vitest 는 파일 이름을 적고 `--pool=threads --maxWorkers=1`. 무거운 검사 전에 `C:\Users\user\orca\cb-verify.lock` 가 있으면 기다리고, 없으면 만들고
(내용: 트랙 이름) 돌린 뒤 지운다. 답과 보고서는 한국어.
