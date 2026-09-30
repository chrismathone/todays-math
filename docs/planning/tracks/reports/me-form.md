# me-form — 꼴 요구 문항 세기와 값·꼴 판정 (2026-10-01)

## 먼저 확인한 출제 경로

학생이 `self-check`를 만나는 길은 **자체 생성분에 남아 있다**. 현재 문제은행은 `courseBank.ts:45-54`에서 `getCourseProblemInput(row).mode !== "number"`인 문항을 모두 제외한다. 살아남은 은행 후보가 난이도별로 부족하면 `elementary/generator.ts:41-53`이 자체 생성기로 채우고, `:63`에서 입력 방식을 정한다. 생성분에는 `self-check`를 다시 제외하는 필터가 없으며, `choiceAnswers.ts`도 그 문항을 자동 입력으로 바꾸지 않는다.

- 실제 서버 시작 경로: `courseRoutes.ts:81-98` → 은행 후보 로드 → `courseAutomation.ts:386-392` → `generateCourseSession`.
- 자체 생성기의 명시적인 사례: `elementary/g3.ts:1414`의 대분수 변환, `elementary/g5.ts:594`의 기약분수 변환. 은행 후보로 해당 자리가 채워지지 않을 때 이 문항도 세션에 들어갈 수 있다.
- 은행에서 빠진 문항 수와 최종 세션에서 학생이 만나는 `self-check` 수는 다른 분모다. 실제 빈도는 아직 측정하지 않았다. 아래 스크립트를 리드가 main에서 실행해야 한다.
- 현행 서버는 `selfAssessed`를 독립 정답에서 제외하고(`courseAutomation.ts:676-677`), 자기 확인만으로 `mastery`를 올리지 않는다(`:688-689`). 자기 확인이 들어간 세션은 `early`에 포함되어(`:698-700`) `intervalDays`가 1이다(`:727`). `elementary/progress.ts`의 `reviewInterval`도 자기 확인이 있으면 1일을 반환한다. 이 보고서는 자기 확인이 복습 간격을 늘린다고 단정하지 않는다.

## 세기

리드 확인: 현행 모든 소단원 × 고정 seed 0~31로 만든 최종 세션 문항을 **표본**으로 세고, 은행의 유입·제외·생존 후보를 별도 집계한다. 전체 가능한 seed나 운영 중 학생 노출 빈도의 전수조사가 아니다. 워크트리에서 DB 스크립트를 실행하지 않았고 학생 자료를 읽지 않았다.

**집계 결과: 리드가 main에서 돌릴 것.** `scripts/qa/math-srs/count-form-items.ts`는 `main` 가지와 `DATABASE_URL`을 확인한 다음에만 DB 모듈을 불러온다. 아래 명령은 실행 안내이며 이 워크트리에서 실행하지 않았다.

```powershell
node --env-file=.env --conditions=react-server --import tsx scripts/qa/math-srs/count-form-items.ts
```

리드도 공용 `C:\Users\user\orca\cb-verify.lock`을 확보한 뒤 실행하고 끝나면 해제한다. stdout은 JSON 집계이며 stderr는 소단원별 진행 상태다.

| 분모 | 구성 | 출력 |
|---|---|---|
| 최종 세션 표본 | 현재 코드 기준 230소단원 × seed 32개 × 5문항 = **36,800문항**, 세션 7,360개. 실행 시 소단원 수를 다시 읽는다 | 전체, 보기 4개 생성 가능, 실제 4지선다 표시, 직접 입력, 분수 칠하기, `self-check`, 현행 `needsComparison` 사유별 수, 새 함수가 인식한 두 꼴 수 |
| 은행 유입 | 공용 가시성·출제 자격·해당 소단원·단답형 조건을 통과한 전체 행. 이는 문제은행 전체 원본이 아니다 | `eligibleBeforeLimit` |
| 은행 조회창 | 운영과 같은 소단원별 id순 상위 200행. 뒤의 행으로 다시 채우지 않는다 | `loaded` → `selfCheckExcluded` → 다른 이유 제외 → `survivors` |
| 은행 생존 후보 | `loadCourseBankCandidates`를 그대로 호출한 결과. 전체 난이도 후보와 세션 난이도(연산·기본·응용) 후보 수를 구별 | `survivors`, `survivorsInSessionTiers` |

최종 표본의 비율은 `finalItems`를 분모로 출력하고, 사유별 비율은 최종 `selfCheck`를 분모로 출력한다. 은행의 자기 확인 제외 비율은 `loaded`, 은행의 사유별 비율은 `selfCheckExcluded`가 분모다. 분모 0의 비율은 `null`이다. 사유는 중복 집계하므로 합이 100%를 넘을 수 있다.

은행의 `selfCheckGroups`는 기약분수 언급만/대분수 언급만/그 밖으로 나눈 서로 겹치지 않는 묶음이다. 두 꼴이 함께 나오거나 수로 읽을 수 없어 걸린 문항은 그 밖에 들어가며 상세 `reasons`에는 모든 걸린 이유가 남는다. `selfCheckExcluded`에는 그림·풀이 없음 등의 다른 제외 사유가 겹칠 수 있다. **자동 판정을 넣으면 모두 되살아나는 문항 수라는 뜻은 아니다.** 은행 수에는 최종 학생 노출 수를 합산하지 않는다. 실제 세션의 은행 선택·난이도 배분·자체 생성 보충·보기 만들기는 모두 `generateCourseSession`이 수행한다.

`StudentCoursePractice.tsx:270-271`은 분수 칠하기를 보기보다 먼저 표시한다. 따라서 보기 4개 생성 가능 수와 실제 4지선다 표시 수가 다를 수 있고, **실제 4지선다 + 직접 입력 + 분수 칠하기 + self-check = 최종 문항 수**가 된다. 현행 사유 정규식의 `분수로`도 누락하지 않고 별도 항목으로 센다. 현행 gate가 놓치는 `대분수를 쓰시오`는 새 `requiredForm`이 인식할 수 있으므로 새 두 꼴 수를 현행 사유 수와 동일시하지 않는다.

은행 읽기는 순차 실행이며 운영 중 동시 수정에 대한 한 시점의 스냅샷은 아니다. 고정 seed 표본을 학생 사용 빈도로 해석하지 않는다.

## 판정 규칙

`answerForms.ts`의 순수 함수 둘만 새로 만들었다. 기존 파서를 `parseCourseAnswerQuantity`로 공개하고, 정규화하되 약분하기 전 숫자 표기를 함께 돌려준다. 값은 기존 BigInt 교차 곱을 `sameCourseAnswerValue`로 옮겨 그대로 공유한다. 새 수치 파서는 만들지 않았고 기존 `gradeCourseAnswer`의 `self-check → null`과 단위 검증을 유지한다. `needsComparison`은 집계용으로 공개만 했으며 정규식은 바꾸지 않았다.

| 상황 | 값 | 꼴 |
|---|---|---|
| 직접 `기약분수로/꼴로 …` 명령 | 기존 정확한 유리수·단위 비교 | 학생 표기의 분자·분모 최대공약수 1이면 `ok`, 아니면 `not-irreducible` |
| 기약분수 요구에 `3/4` 대신 `6/8` | `true` | `not-irreducible` |
| 기약분수 요구에 정수 `2` | `true` | `ok` — `2/1`을 요구하지 않음 |
| 직접 `대분수로/꼴로 …`, `대분수를 쓰시오` 명령 | 기존 비교 | 대분수 표기면 `ok`; 절댓값이 1보다 큰 비정수 가분수면 `not-mixed` |
| 대분수 요구인데 값이 진분수·정수 | 기존 비교 | 진분수·정수 표기를 `ok`로 둠 |
| 대분수만 요구한 `1 2/4` | 기존 비교 | `ok` — 기약분수를 추가로 요구하지 않음 |
| 소수 표기·소수 분자/분모 | 기존 비교 | `not-applicable` — 이번 단계에서 꼴 때문에 거절하지 않음 |
| 해석 불가 답·알 수 없거나 맞지 않는 단위 | `false` | `not-applicable` |
| 꼴 요구 없음·가분수·소수·통분·그림·설명·식 쓰기 | 기존 비교 | `not-applicable` |
| 두 꼴을 동시에 요구하거나 변환 뒤 분자·분모·개수를 묻는 발문 | 기존 비교 | `not-applicable` — 단순 언급을 답의 요구 꼴로 추측하지 않음 |

`requiredForm`은 명시적인 명령형(`고치시오`, `고쳐 쓰시오`, `고쳐 보시오`, `나타내시오`, `쓰시오`, `바꾸시오`)만 읽는다. 단순 `약분하시오` 또는 `2로 약분하시오`는 기약분수를 반드시 요구한다고 추측하지 않는다. 미인식 문형은 `null`이며 이후 표본 검토 없이 범위를 넓히지 않는다. `form`과 `value`는 별도 결과이므로 값이 틀린 `4/8`도 `not-irreducible`일 수 있고, 소비자는 항상 `value`를 먼저 확인해야 한다.

거절하지 않기로 시험한 표기는 다음과 같다.

- `1 1/2`, `1  1/2`, 탭과 분수 양옆 공백, LaTeX `frac/dfrac/tfrac`, `$…$`.
- 정수 `2`, `0`, 음의 정수, 천 단위 쉼표. 대분수 요구에서 진분수·정수 및 정수 값인 `4/2`.
- `-1 1/2`, 유니코드 음수 부호, 음수 분모, 분자·분모 양쪽 음수, LaTeX 바깥 음수 부호.
- 기존 파서가 읽는 단위가 붙은 분수·대분수, 단위 생략, 같은 차원의 환산. 다른 단위는 기존 값 판정대로 거절한다.
- 소수와 소수로 된 분자·분모는 `not-applicable`로 유보한다. 이는 두 꼴의 완전한 판정기가 아니라 옳은 표기 오거절을 피하는 첫 단계다.

학생 화면, 문구, 제출 경로, 저장 계약, DB는 변경하지 않았다. 새 함수의 호출자는 시험과 읽기 전용 집계뿐이다.

## 다음 걸음의 자리

- `CourseProblem["input"]` (`elementary/types.ts`) 및 `mathSrsCourse.contract.ts`의 공개 입력 계약, `elementary/progress.ts`의 저장 문제 스키마: 꼴 판정 대상의 입력 방식과 요구 꼴 전달 여부를 먼저 결정해야 한다.
- `courseBank.ts`의 후보 필터: 현재 `self-check`인 기약분수·대분수 문항을 다시 들일지 리드가 결정해야 한다.
- `courseRoutes.ts` 제출 처리 → `courseAutomation.ts`의 첫 제출·재도전 처리 → `elementary/progress.ts`의 검증: 값이 맞지만 꼴을 고쳐야 하는 경우를 현재의 정답/오답 `boolean`에 억지로 넣지 않도록 다음 계약을 정해야 한다. 완료, 시도 소모, 재시도, 복습 간격, 중복 요청을 함께 정해야 한다.
- 학생 문구 자리: `StudentCoursePractice.tsx`의 입력 안내·제출 피드백·재입력 흐름. 시안에서 원장님이 고른 문구를 연결할 자리만 기록하며, 이번 작업은 문구를 만들지 않는다.

## 검증

최소 구현(두 함수를 유보 결과만 반환하도록 둔 상태)에서 새 시험 101개 중 **95개 실패, 6개 통과**를 확인했다. 구현 후 새 시험과 기존 회귀 시험 **4파일 191개가 모두 통과**했다. 기존 시험은 수정하지 않았다.

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/elementaryAnswerForms.test.ts src/__tests__/unit/countCourseFormItems.test.ts src/__tests__/unit/mathSrsElementaryCourse.test.ts src/__tests__/unit/mathSrsCourseServer.test.ts --pool=threads --maxWorkers=1 --reporter=dot
```

`mathSrsElementaryCourse.test.ts`가 `answers.ts`의 기존 값을, `mathSrsCourseServer.test.ts`가 `choiceAnswers.ts`와 서버 제출의 기존 동작을 검증한다. 새 시험의 집계 모듈 import는 DB 모듈을 불러오지 않으며 고정 문항만 사용한다. 검사 때마다 공용 잠금을 확보하고 끝나면 해제했다. 변이 검증: 꼴 검사 함수 시작에 `return "ok"`를 넣자 36개 시험이 실패하여 기약분수·대분수 검사 제거를 모두 검출했다. 변이를 원복한 뒤 같은 4파일 191개가 다시 통과했고 변경 TypeScript 파일 5개의 ESLint도 통과했다. 전체 타입 검사는 리드가 병합 뒤 main에서 수행한다.

## 리드가 main 에서 돌린 집계 (2026-10-01)

`.env` 로 운영 DB 은행을 읽기만 했다. 세션 표본 36,800문항: 4지선다 32,112(87.3%) · 조작 1,032(2.8%) · 스스로 채점 3,655(9.9%) · 직접 입력 1 ·
두 꼴 판정이 붙을 수 있는 문항 5(대분수 · 3-2-4-5). 은행 28,410행 중 스스로 채점 제외 4,859행 · 그중 기약분수 88 · 대분수 53(다섯 소단원).
→ 3자 합의 3회전에서 **2단계 보류 3:0**(`consult-27/consensus.md` §5). 연결 전에 고칠 것 둘(양방향 발문 · 값만으로 채점되는 «…인 대분수를 쓰시오»)도 거기에 적었다.
