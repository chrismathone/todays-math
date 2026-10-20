# 지시서 보강 — 다시 뽑은 문제의 그림이 문장과 어긋난다 (리드, 2026-10-20 17:40)

## 결함 (리드가 코드로 확인)

학생 화면은 그림을 저장된 `figureSpec` 으로 그리지 않는다.

- `src/components/math-srs/ElementaryPractice.tsx` 의 `useProblemFigure` 는 `problem.figureSpec` 이 있으면 `/lab/math-srs/figure?sectionId&seed&tier` 를 부른다.
- `src/app/lab/math-srs/figure/route.ts:51` 은 `generateElementaryProblem(section.unit, seed, tier)` 로 그림을 **다시 만든다.**
- 이 가지의 다시 뽑기는 `generateCourseEngineRedraw` 가 고른 틀(`generateElementaryForm(unit, seed, form.id)` · `extraCourseFrames`)의 그림을 저장한다. 같은 씨앗이라도 기본 엔진이 고르는 틀과 다르다.
- 그래서 그림이 있는 소단원(합동 · 대칭 · 직육면체 · 전개도 · 넓이 등)에서 다시 뽑은 문제는 **문장과 다른 그림이 학생에게 나간다.**
- 보고에 쓴 «저장된 figureSpec 이 그림의 정본» 주석(`generator.ts`)은 사실이 아니다.

## 고칠 것 — 읽는 쪽을 따로 커밋해 먼저 낸다

1. **라우트 (읽는 쪽).** `/lab/math-srs/figure` 가 선택 인자 `spec` 을 받는다.
   - `spec` 은 `figureSpec` 의 안정된 지문이다. 키를 정렬한 JSON 의 짧은 해시 같은 것으로, 클라이언트와 서버가 같은 함수를 쓴다. 함수는 `src/lib/math-srs/elementary/` 에 하나 둔다.
   - 서버는 후보 `[generateElementaryProblem(unit, seed, tier), generateCourseEngineRedraw(unit, seed, tier)]` 를 차례로 만들어, 지문이 `spec` 과 같은 후보의 `figureSpec` 만 그린다.
   - `spec` 이 없으면 지금처럼 첫 후보를 그린다(옛 화면 호환).
   - `spec` 이 있는데 맞는 후보가 없으면 그리지 않는다. 다른 문제의 그림을 내지 말고, 404 와 지금의 «그림이 없는 문제입니다» 갈래를 쓴다.
   - 캐시 열쇠에 `spec` 을 넣는다.
   - 서버는 클라이언트가 보낸 `figureSpec` 을 그리지 않는다. 엔진이 만든 것만 그린다.
2. **학생 화면.** `useProblemFigure` 가 `spec=<지문(problem.figureSpec)>` 을 붙인다.
3. **시험 (RED 먼저).**
   - 다시 뽑은 그림 문제(새 틀) 하나를 골라 둔다. 그 문제의 `spec` 으로 라우트를 부르면 저장된 `figureSpec` 과 같은 그림이 나와야 한다.
   - `spec` 없이 부르면 옛 동작이어야 한다.
   - 틀린 `spec` 이면 404 여야 한다.
   - `ElementaryPractice` 가 `spec` 을 붙이는지도 본다.
   - 변이 확인: 라우트가 후보를 고르지 않고 첫 후보만 쓰게 바꾸면 첫 시험이 빨개져야 한다.
4. **이 커밋을 생성기 커밋들과 갈라 «읽는 쪽» 하나로 커밋한다.** 리드가 이것만 먼저 운영에 내고 Ready 를 본 뒤 나머지를 낸다. 지금 가지 위에 커밋해도 된다. 리드가 cherry-pick 한다. 그러니 이 커밋은 `generateCourseEngineRedraw` 가 있어야 컴파일되는 꼴이면 안 된다. 다음 둘 중 하나로 한다.
   - (권장) 후보 목록을 주입할 수 있게 한다. 라우트가 `courseFigureCandidates(unit, seed, tier)` 같은 함수 하나를 부르게 하고, 그 함수를 먼저 «기본 엔진 하나만» 돌려주는 꼴로 이 커밋에 넣는다. 그다음 커밋에서 `generateCourseEngineRedraw` 를 더한다.
   - 또는 리드가 그 함수 파일까지 같이 가져가도 되게, 새 틀 파일에 대한 의존 없이 서게 한다.
5. `generator.ts` 의 주석을 사실대로 고친다. 그림은 학생 화면이 씨앗 + 지문으로 다시 만든다.

## 같이 고칠 시험

`src/__tests__/unit/courseSessionVariety.test.ts`(리드가 넣은 것)가 이 가지에서 깨질 것이다.

- «다시 뽑은 문제도 저장한 씨앗으로 엔진이 그대로 다시 만든다»는 다음으로 바꾼다: 저장된 문제의 `content` · `figureSpec` 이 `courseFigureCandidates` 중 하나와 같고, 라우트가 그 하나를 고른다.
- «되풀이는 다른 틀을 뽑을 수 없을 때만 남는다»의 마지막 `expect(repeats).toBeGreaterThan(0)` 과 «대안이 모두 앞 틀» 확인은 새 다시 뽑기 함수 기준으로 고친다. 잰 값(2/1,680 등)을 주석에 적는다.

## 보기의 단위 (리드가 터미널 출력에서 봄)

`5-2-3-2` 표본의 보기에 `["$36^\circ$","$160^\circ$","$70^\circ$","$46$"]` · `["$38^\circ$","$70^\circ$","$60$","$63^\circ$"]` 가 있다. 단위(°)가 없는 보기 하나가 끼어, 보기만 보고 오답을 거를 수 있다.

- 고치고 있는 «가까운 값부터» 수정과 함께 손본다. 정답에 단위가 있으면 오답 보기도 같은 단위 꼴로 만든다.
- 시험을 둔다: 초5 전 소단원 × 씨앗 여럿에서, 보기 넷의 단위 꼴(°, cm, kg, 분수 · 소수 꼴)이 정답과 같아야 한다.
- 이것이 기존 `makeCourseAnswerChoices` 의 결함이면, 이 가지의 새 틀과 따로 커밋한다(리드가 먼저 낼 수 있게).

## 그대로인 것

- 메모리: 3GB 이상일 때 하나씩. 새 작업트리 · 하위 작업자 금지. 푸시 금지. 단위마다 커밋.
- 보고: 위 결과 + 원래 지시서 §4(표본 문제 포함 — 그림 문제는 그림 사양 요약도).
