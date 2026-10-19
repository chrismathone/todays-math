# 중1·중2 자작 기출 대비 가족 구현

2026-10-18 · 기준 `9cfbb86836c8d05c7f1e3e8801dd3a9b8d82a39e` · 담당 `task_5559f9a5c813`

동결된 `examStudy.contract.ts` 위에 우선 요구 12개를 구현했다. `src/lib/examStudy/families/middle/index.ts`의 `MIDDLE_STUDY_FAMILIES`만 새 가족을 내보낸다. 기존 중등·고등·native 등록부, 학생 SRS, 은행 적재기, 예측기, API/UI/권한/공통 출력은 수정하지 않았다. 공용 계약과 Python 엔진도 수정하지 않았다.

아래 수는 **유한 열거기로 공개하는 서로 다른 논리 매개변수 튜플**이다. 새로운 사고 구조 120개라는 뜻이 아니다. seed와 variant는 이 영역을 결정적으로 순환하며 양을 늘리지 않는다. 객관식·단답·서술 형식의 수를 곱하지 않았다. 모든 가족의 구조 난도는 `심화하` 하나이며, 학생 반응이나 학교 난도에 맞춘 실측 보정은 아니다.

| 요구 ID                              | 튜플 수 | 형식·표상            | 완결 과제와 검산                                                                                                                                                       |
| ------------------------------------ | ------: | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graph.piecewise-multi-claim`        |      12 | 단답·그림 필수       | 동일 꺾은선에서 방향별 시간, 총 이동거리, 최초 도달, 반복 통과의 참인 진술 집합. 정지·음의 위치·꼭짓점 중복을 포함하며 독립적인 1/4분 시간 탐색으로 검산               |
| `coord.shared-side-square`           |       8 | 단답·그림 필수       | 두 정비례식의 입사와 정사각형의 공통 가로·세로 변, 오른쪽 좌표를 함께 사용해 C 좌표 결정. 정사각형 대신 직사각형/회전을 허용하거나 입사를 빼는 반례 확인               |
| `coord.inverse-area-ratio`           |      12 | 단답·그림 필수       | 두 반비례점, 수선의 발, 보조 삼각형의 비로 B를 복원한 뒤 OAB 넓이. 비 1:2/1:1/2:1, 좌우 구별, 발/두 번째 입사 제거 반례 확인                                           |
| `coord.inverse-equal-legs`           |       4 | 단답·텍스트          | 서로 다른 두 x좌표만 주고 두 y좌표는 미지수로 둠. 같은 곡선과 좌표차의 동일 길이에서 k/u/v를 결정. 한 점을 완전히 주어 같은 길이 조건을 무력화하지 않음                |
| `coord.ray-area-partition`           |      12 | 단답·그림 필수       | 축절편 삼각형의 세 넓이비에서 두 내부 분점과 두 기울기 연결. 세 가지 비의 갈래, AB 입사를 빼면 같은 세 넓이에도 기울기가 달라지는 반례 확인                            |
| `coord.signed-inverse-trapezoid`     |       4 | 본래 서술·그림 필수  | 부호가 다른 두 반비례식에 네 점을 의존시키고 공통 수평선과 두 수직선을 사용. 네 좌표·두 평행변·가로 간격·넓이의 t 소거·t=0 제외를 설명. 사각형 분할 면적으로 별도 검산 |
| `algebra.shifted-system-coupling`    |      16 | 단답·텍스트          | 두 독립 수치식으로 원래 좌표를 정한 뒤 서로 독립인 두 계수조건으로 a/b 복원. 네 원식 대입과 두 연립식의 유일성, 수치식/계수식 각각의 제거 반례 확인                    |
| `coord.intercept-trapezoid-cases`    |       8 | 단답·그림 필수       | PQ∥RS와 QR∥SP 두 경우를 모두 찾음. a<c/a>c, 두 음수 해, a≠c로 평행사변형을 제외하는 경계 확인. 그림은 가능한 한 경우임을 명시                                          |
| `written.dependent-formula-min-time` |      12 | 본래 서술·텍스트     | 트레이 수→사용량→잔량→초당/분당 용량→최소 정수 분의 의존. 잔량 2510/2520/2530과 분당 420에서 6/6/7분 경계 확인. 직전 정수 분의 불가능성까지 설명                       |
| `written.linear-fuel-model`          |       8 | 본래 서술·텍스트     | 연료 효율의 역수를 기울기로 하는 잔량 모델, 노선 정의역, 도중 잔량, 도착 후 추가 거리와 단위 설명. 노선 끝과 연료가 비는 거리를 구분                                   |
| `written.stopped-travel`             |      16 | 본래 서술·텍스트     | 이동·정지·재이동의 세 식, 분/시간 환산, 연속 경계, 도착 시각과 정지시간을 뺀 오답의 이유. 같거나 다른 이동속도, 분수 거리, 두 정지 길이를 포함                         |
| `written.two-work-rates`             |       8 | 본래 서술·텍스트     | 독립적인 두 급수 일정에서 각 작업률과 단독 시간을 복원하고 양수·비넘침·두 원조건·빠름/동률을 설명                                                                      |
| 합계                                 | **120** | 단답 72·본래 서술 48 | 그림 필수 56                                                                                                                                                           |

서술 다섯 가족은 모두 배점 합 8점의 네 기준, 모델 결과, 허용 대안, 흔한 오류를 가진다. 같은 가족을 단답으로 바꾸는 경로를 제공하지 않는다. 새 객관식 형식은 선언하지 않았으며 요청된 형식이 없으면 공통 계획기가 부족으로 표시해야 한다.

검증기는 발문의 숫자/관계와 FigureSpec의 좌표·라벨에서 다시 풀고 저장된 `parameters`와 정답을 검산 결과에 대조한다. `parameters`나 생성기의 중간 사실을 정답 oracle로 사용하지 않는다. 틀린 정답, 필수 관계 삭제, 다른 논리 매개변수, 그림·핵심 라벨·곡선·도형의 누락/변형, 서술 rubric 누락·총점·모델·대안 누락을 거절한다. 양수·사분면·유일해 같은 영역 가드는 서로 중복될 수 있으므로, 모든 가드를 독립적인 새 수학 조건이라고 세지 않는다. 필수 관계의 수학적 제거 반례와 발문 계약의 삭제 검사는 따로 둔다.

그림의 핵심 숫자는 본문에 전량 반복하지 않았다. 두 그래프 식과 오른쪽 좌표, A의 좌표, 삼각형 축절편, 반비례식의 계수, 사다리꼴 절편 등은 그림을 읽어야 얻는다. `graph-1`의 기존 점·곡선·선분·다각형·라벨만 사용한다. TS로 SVG를 쓰거나 새로운 FigureSpec 종류를 만들지 않았다.

## 실행한 검사와 재현

독립 환경의 별도 Vitest 설정에서 `envDir:false`를 사용했다. 저장소 기본 Vitest 설정은 `.env`를 읽으므로 사용하지 않았다. 설치·DB·자격 증명·provider·외부 네트워크·Prisma generate·package build·push·deploy는 실행하지 않았다. 기존 의존성의 `node_modules` 심볼릭 링크만 사용했다.

재현 파일과 로그는 다음 위치에 보존한다.

`/Users/pss/orca/workspaces/today_/problem_make/.qa-artifacts/math-exam-engine-upgrade-20261018/task_5559f9a5c813-evidence`

이 폴더의 내용을 기준 checkout의 `.qa-artifacts/math-exam-middle/`에 복사한 뒤, checkout에서 실행한다. Python은 이미 설치된 **3.12.15**를 썼다. 시스템 3.9를 사용하지 않는다.

```sh
env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/Users/pss/.local/bin:/usr/bin:/bin \
  PYTHON_BIN=/Users/pss/.local/bin/python3.12 MIDDLE_RENDER=1 \
  MIDDLE_EVIDENCE_DIR="$PWD/.qa-artifacts/math-exam-middle/renders" \
  node node_modules/vitest/vitest.mjs run \
  --config .qa-artifacts/math-exam-middle/vitest.config.mts --no-color

env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin \
  node node_modules/typescript/bin/tsc \
  --project .qa-artifacts/math-exam-middle/tsconfig.json --noEmit

env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin \
  node node_modules/eslint/bin/eslint.js \
  src/lib/examStudy/families/middle/*.ts src/__tests__/unit/examStudyMiddle*.test.ts

env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin \
  node .qa-artifacts/math-exam-middle/raster.cjs
```

- Vitest **55/55 통과**: 발문에서 다시 푼 120개 전수, 경계/경우·조건 반례, 결정성/중복, 훼손 거절, 서술 기준, 모든 발문/풀이의 KaTeX 파싱.
- 로컬 `renderFigureSpec(...,{strict:true})` 실제 Python 렌더 **56/56 성공**, droppedDimensions 0. 생성 스펙의 모든 라벨이 SVG에 남는지 확인했다.
- 실제 SVG의 MathJax 글자 상자와 선분/다각형/샘플 곡선의 교차, 글자끼리의 겹침, viewBox 밖 잘림을 전수 검사했다. 공통 70 mm 폭에서 글자 크기 12.5 px 이상도 검사했다.
- 56개 SVG/JSON과 여섯 가족별 PNG 접촉표를 보존했다. PNG에서 발견한 점 이름/식 겹침을 수정하고 최종본을 다시 확인했다. 도형을 채워 좌표축을 가리던 부분은 없앴다.
- 담당 파일의 독립 TypeScript 검사와 ESLint 통과. 기존 엔진과 앱 전체의 회귀·통합·권한·출력 재확인은 coordinator 소유다.

## 남은 범위

우선 배정된 12개 요구에는 미구현이 없다. 선택 사항인 `model.doubling-time-offset`, `model.circle-revolution-percentage`, `number.coprime-symbolic-sum`은 구현하지 않았다. 그 밖의 M1/M2 전체 요구, 기존 adapter의 승격, 공식 교육과정 전수 정합성, 학교 시험 적중률, 학생 학습 효과, 실측 난도는 이 구현의 검증 범위가 아니다. 실제 종이 인쇄 검수 완료도 주장하지 않는다.
