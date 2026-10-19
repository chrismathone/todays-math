# 중등 잔여 5요구 저작·검산

기준 `261a5e263e4e104949d7a21673c9c9ad5850a380` · 2026-10-19 · 중등 담당 작업트리

새 자작 가족 5개를 `families/middle/remaining.ts`에 구현하고 중등 배열에 추가했다. **유한 정규 입력 64개 전부에서 인쇄 조건으로 독립 계산한 정답·4단계 풀이 검산이 통과**했고, 순수 공개 생성 경로에서 5요구 × 혼합/단답형 10건이 실제 단답형 문항과 `full` 판정을 반환했다. `full`의 근거는 아래 실행 범위이며 학교 전체 출제 범위·보정 난도·학습 효과의 판정이 아니다.

| 과정·요구 | 가족 ID 접두 `study-middle-` 뒤 | 정규 입력 | 실제 연결 |
|---|---|---:|---|
| 중1 `model.doubling-time-offset` | `doubling-time-offset` | 12 | 초기 수의 반복 두 배 표 → 공통 목표까지의 횟수차 → 분 단위 시차 → 시간 단위 문자식 |
| 중1 `model.circle-revolution-percentage` | `circle-revolution-percentage` | 10 | 새 반지름 → 지름·원주 → 같은 거리에서 회전수 역비 → 원래 회전수 기준 증가율 → 반올림 |
| 중1 `number.coprime-symbolic-sum` | `coprime-symbolic-sum` | 14 | 완전한 나머지 목록·서로소 판별 → 유일한 분자 분해 → 나머지 짝의 합 → 임의 양의 정수 문자 경계의 합 |
| 중2 `coord.intercept-integer-area` | `intercept-integer-area` | 12 | 두 축절편 → 음의 정수점의 유한 범위·전체 후보 → 유일한 점 → 양의 두 삼각형 넓이·비교 |
| 중2 `graph.translated-coefficient-reuse` | `translated-coefficient-reuse-linear` | 16 | 이동 후 두 점의 좌표 → 역이동·첫 직선 복원 → 두 절편 → 절편을 둘째 직선의 계수로 재사용 → 제외 사분면 |

## 수학과 검산의 분리

생성기는 유한 영역만 선택한다. `solve(content)`는 정답·매개변수·generator facts를 받지 않고 발문의 필수 조건과 수치를 읽는다. 그 결과에서 정답·논리 매개변수·풀이의 각 단계를 검산하며, 필수 행 누락·변경·추가, 영역 이탈, 잘못된 중간 계산을 거절한다. 공용 코드는 수치·목록·문장 표시를 담당하고, 생성과 검산의 계산 경로는 다음처럼 나뉜다.

- 배증: 생성의 배증비 선택과 별도로 검산은 실제 공통 목표에 두 초기 수를 반복해서 두 배로 올려 도달 분을 비교한다. 학생 풀이도 반복 표를 쓰며 로그를 쓰지 않는다. 공통 시점·주기와 같은 목표, 초기량보다 큰 목표가 명시되어 음의 도달 시각을 허용하지 않는다.
- 회전: 검산은 공통 거리 `D·(2R)·π`에서 원래/새 회전수를 각각 구한다. 증가율과 반올림은 안전한 정수의 유리수·나머지 연산이다. 별도 시험은 최소 공통 거리와 BigInt 반올림 구간 비교를 쓴다. `1.2%`, 정확히 `1.25%`, `1.3%` 및 다른 아래쪽 경계를 확인했다. 전체 회전·미끄러짐 없음·원래 기준량이 발문에 있다.
- 문자 합: 생성의 gcd 선별과 별도로 검산은 합성 분모의 모든 진약수로 나머지를 거른다. `a=D(k+s)+r`의 유일성, 선택/탈락 나머지 전체, `r↔D−r` 짝을 통해 **모든 양의 정수 n**에 대한 합을 증명한다. 검산의 작은 구간 직접 합과 독립 시험의 분자 전수 gcd 합은 이 증명의 대조 검사이며 유한 대입만으로 일반화를 주장하지 않는다. 분모는 `6,8,9,10,12,15,18`, 하한은 `1,3`이다.
- 정수점: 생성의 합동식 구성과 별도로 검산은 두 음의 좌표의 엄격한 전체 범위를 검색한다. `pi+qj=N`, `i,j>0`이므로 `i<N/p`, `j<N/q`; 유일한 생존점만 채택한다. 두 넓이는 검산의 행렬식 분자와 시험의 BigInt 유리수 행렬식으로 따로 계산한다. 정수 조건·각 부호를 없앤 반례, 후보 0개/복수, 축 위와 공선 퇴화를 확인했다.
- 직선 재사용: 생성의 기울기 계산과 별도로 검산은 역이동한 두 점의 연립식 행렬식으로 첫 계수를 복원한다. 축절편을 원식에 대입하고 둘째 직선으로 넘긴다. 검산은 축 교점 사이 구간의 부호, 별도 시험은 각 사분면의 일차부등식으로 존재 여부를 조사한다. 네 제외 사분면이 모두 실행되며 0 기울기·0 절편·같은 재사용 계수는 제외했다.

## 실제 실행

실행 파일은 [examStudyMiddleRemaining.test.ts](../../../src/__tests__/unit/examStudyMiddleRemaining.test.ts), 요약과 지문은 [middle-verification.json](middle-verification.json)이다. Node `v24.22.0`과 기존 공용 의존성의 심볼릭 링크만 사용했다. 설치·DB/Prisma 실행·환경 파일 읽기·provider/유료 AI 호출·네트워크 요청은 수행하지 않았다. 전용 Vitest 설정은 `envDir:false`; 소켓/HTTP/fetch·환경 파일 읽기·DB/provider import guard의 최종 차단 관측은 0건이다. 기존 adapter의 순수 단원 상수 `prisma/seed-data/units.ts`는 DB client가 아니므로 정확한 그 import만 허용했다.

- **13 tests 통과**, 정규 입력 **64/64**를 발문만 읽는 별도 수학 oracle로 대조.
- **1,286건 거절 검사**: 실제로 틀린 수치 정답, 매개변수 손상, 미지원 MC, 예상 밖 그림, 필수 조건 행 삭제와 핵심 조건 변경, 4단계 각각의 의미 있는 계산 변경·삭제.
- 배증의 실제 공통 목표 **60건**, 문자 합의 분자 전수 gcd **168구간** (`n=1..12`), 모든 정수점/넓이 및 네 사분면 분기 검사.
- 공개 `generateExamStudy`에 새 가족 cohort를 주입한 **10/10 생성 성공**: 대륜중 중1/중2 프로필의 해당 요구별 혼합·단답형. 기존 학교 프로필·요구 매핑·생성기·레거시 엔진은 수정하지 않았다.
- 모든 본문·정답·풀이의 `$...$` 구간을 기존 KaTeX로 실제 해석했다. TypeScript scoped project, 대상 3파일 ESLint, `git diff --check` 통과.

재현 명령(모두 저장소 루트, 기본 Vitest 설정 사용 금지):

```sh
env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin NODE_ENV=test MIDDLE_REMAINING_EVIDENCE_DIR=.qa-artifacts/math-exam-engine-completion-20261019 node node_modules/vitest/vitest.mjs run --config .qa-artifacts/math-exam-engine-completion-20261019/vitest.middle.config.mts
env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin NODE_ENV=test node node_modules/typescript/bin/tsc --project .qa-artifacts/math-exam-engine-completion-20261019/tsconfig.middle.json --pretty false
env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin NODE_ENV=test node node_modules/eslint/bin/eslint.js src/lib/examStudy/families/middle/remaining.ts src/lib/examStudy/families/middle/index.ts src/__tests__/unit/examStudyMiddleRemaining.test.ts
```

초기 guard는 `prisma` 경로 이름만으로 순수 단원 상수를 오인해 수집 전에 중단했다. 해당 상수만 허용한 재실행은 통과했다. 초기 TypeScript의 `Set<1|2|3|4>` 추론 오류는 `Set<number>`로 정정했다. 초기 로그와 76개 잠정 입력의 실행은 보존했고, A/B 이름만 바꾼 12개를 제거한 **최종 영역은 64개**다. seed·응답 형식·보기 순서로 표본 수를 늘리지 않았다. 64개는 입력 tuple 수이며 64개의 서로 다른 사고 구조라는 뜻이 아니다.

## 범위와 통합 인계

출처는 [요구 정의](../../../src/lib/examStudy/requirements.ts), [잔여 감사](../math-exam-engine-remaining-20261019/unavailable-audit.md), [추상 출처 프로필](../math-engine-study-readiness-20261018/source-profiles.json)의 요구 연결만 읽었다. 원학교 문장·수치·그림·정답은 복사하거나 저장하지 않았다. 두 좌표 과제는 figure-optional 정의에 따른 **발문 좌표 자료형**이다. 실제 그림/FigureSpec이 없으므로 그림 해독·Python 렌더 성능을 입증하지 않는다. 새 가족은 단답형과 혼합 요청만 지원하며 MC·서술형 지원을 주장하지 않는다.

UI/화면/레이아웃/CSS/인쇄 템플릿, 인증·메뉴 권한·export-alone 차단, DB·환경·스키마는 변경하지 않았다. 중3의 같은 graph ID, 고등 가족과 레거시 보강은 다른 담당 범위다. 기존 중등 시험의 원래 12가족/120입력 cohort 고정, 전체 회귀·빌드·HEAD:main push·Vercel 상태 확인은 coordinator가 통합한다. 로컬 main 및 원격은 이 worker가 변경하지 않았다.

원시 정답·풀이·독립 계산·거절 횟수·생성 결과, 최종/초기 로그, 재현 설정은 ignored `.qa-artifacts/math-exam-engine-completion-20261019/`에 보존했다. 정리 전에 coordinator가 이 디렉터리의 `middle-evidence.tar.gz`와 JSON 지문의 실제 파일을 복사해야 한다.
