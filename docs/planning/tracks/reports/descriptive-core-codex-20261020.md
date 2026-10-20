# 서술형 엔진 1단계 실행 보고 — 2026-10-20

## 1. 어디에 세웠나: nativeDescriptive r2 저작 계층 → examStudy 초안

**두 체계를 연결한다.** `nativeDescriptive`의 자작 문항 계약을 하위 호환 r2로 넓히고, `descriptiveAuthor/`에 주 저자와 보조 엔진의 조립 계층을 뒀다. `toExamStudyDraft()`는 그 결과를 기존 `ExamStudyDraft`로 투영한다. `examStudy`의 요구 ID·학교 프로필·공통 가족 등록부·API·승격 규칙은 수정하지 않았다.

이유:

- `examStudy/requirements.ts`의 50개 요구와 `profiles.ts`는 학교 시험 연습의 **선택 체계**다. `families/middle/written.ts`에는 이미 상황 모델·과정 서술·채점표가 있으며 `evidence.ts`는 검사 파일·표본·경계·시각 정보·채점표 증거가 없는 가족을 완결 대응으로 승격하지 않는다. 이 체계를 새로 만들 필요가 없다.
- 기존 `nativeDescriptive.contract.ts`는 버전 있는 정의·문항 ID와 교사용 채점표 직렬화를 이미 갖고 있지만 학년·그림·부분점수·선행 오류·요구 연결이 부족했다. 이 부분을 r2로 확장하면 기존 자작 6정의와 저장된 r1 문항을 유지할 수 있다.
- 보조 계산 유형의 발문에 “과정을 쓰시오”만 붙이지 않는다. 주 저자가 목표·학생 증거·상황·소문항·채점표를 먼저 소유하고, 계산·그림 출력은 조립 재료로만 쓴다.
- 이번 변환 결과는 **미등록 초안**이다. 승격 근거를 자동 생성하거나 학교 프로필에 새 지원을 주장하지 않는다. `algebra.linear-model`은 시연의 관계식 요소 대응이며, 연립방정식 전체의 완결 대응은 새 요구 후보로 별도 제시한다.
- 미등록 정의의 `unitId`는 선택값이다. 실제 DB 단원 UUID를 지어내지 않고 학년·장·정확한 `unitSection`을 둔다. 등록 시 실제 단원을 연결해야 한다.

## 2. 중단된 변경에서 살린 것과 완성한 것

시작 작업트리 `phase/13-descriptive-core`에 남아 있던 r2 계약, `nativeDescriptiveGates.ts`, `descriptiveVerification/types.ts`·`legacy.ts`, 주 저자 계약·조립기·어댑터, fixture 및 회귀 시험, 기존 30행의 payload 해시 증거를 먼저 읽고 유지했다. 최초 실행은 core 23시험이 통과했고, 누락된 `rectangleDemo`와 `nativeDescriptiveLegacyAudit` 때문에 2개 파일이 실패했다. 이 실패를 출발점으로 구현했다.

주요 파일:

| 책임 | 파일 |
|---|---|
| r1/r2 문항·채점표·교육과정·facts·요구·추론 단계 | `src/contracts/nativeDescriptive.contract.ts` |
| 주 저자 1명 + 보조 0~n, 계산·도형·그래프 요청/응답 | `src/contracts/descriptiveAuthor.contract.ts` |
| 조립·정체/소문항/그림 일치·examStudy 초안 | `src/lib/engine/descriptiveAuthor/compose.ts` |
| 기존 middle 및 strict FigureSpec/SVG 어댑터 | `src/lib/engine/descriptiveAuthor/adapters.ts` |
| 실제 계산·도형을 연결한 미등록 시연 | `src/lib/engine/descriptiveAuthor/rectangleDemo.ts` |
| 최종 발문·그림에서만 독립 재계산 | `src/lib/engine/descriptiveVerification/rectangleDemo.ts` |
| G1~G6 및 기존 정의 감사 | `src/lib/engine/nativeDescriptiveGates.ts`, `nativeDescriptiveLegacyAudit.ts` |
| 재현 가능한 로컬 산출 | `scripts/qa/inspect-descriptive-core.ts` |

보조의 예외·실패·정체 불일치·빈 SVG·누락된 필수 치수는 해당 문항 생성 전체를 실패시킨다. 다른 문항으로 조용히 채우지 않는다. 앞 보조 결과는 복제하여 다음 요청과 주 저자에 전달한다. 현재 인쇄 계약은 그림 슬롯 하나이므로 여러 시각 결과의 임의 합성을 거부한다. 계산 보조 여러 개와 시각 보조 하나, 또는 보조 없는 글 문항은 계약상 가능하다.

Orca의 Codex 검토 세션 둘을 기출 조사와 게이트 반례 검토로 나눴다. [독립 게이트 검토](descriptive-core-20261020/gate-review.md)의 증분을 파일 해시와 대조하여 통합했다. 통합 당시 지적된 단답 쌍둥이의 fact 키, 미등록 정의의 선택적 `unitId`, 독립적인 소문항에 선행 기준을 강요하던 제약도 해결했다. 실제 추론 단계의 의존 관계가 있는 경우의 선행 오류 보호는 G2에서 계속 검사한다.

## 3. 미등록 시연과 문지기

시연 정의는 `m2-rectangle-system-evidence-r2`, 2027년 중2 1학기, 2022 개정의 연립일차방정식 활용이다. 계산 보조는 실제 등록된 `2-1|연립일차방정식의 활용|29A`를 같은 seed/variant로 호출한다. 도형 보조는 기존 FigureSpec v2 → Python → 정제 SVG → MathJax 경로를 strict로 호출한다.

예시 seed `20261020`, variant `0`: 둘레 48 cm, 가로·세로 차 16 cm인 전시판에 대해 ① 두 식과 이유 3점 ② 소거 과정과 두 길이 3점 ③ 두 조건 검토와 넓이 2점. 모범답은 `x+y=24`, `x-y=16`, `2x=40`, 가로 20 cm·세로 4 cm, 넓이 80 cm²이다. 단답 쌍둥이는 세로 길이만 요구한다. 정답만 쓴 답안은 1점, 근거까지 쓴 모범답은 8점인 **저자 작성 채점 예시**로 대조한다. 자연어 답안 자동채점기는 만들지 않았다.

| 문지기 | 실제 검사 |
|---|---|
| G1 | 같은 seed/variant의 실제 단답 발문·풀이와 추가 요구 fact를 대조 |
| G2 | 두 관계식·두 길이를 중간값으로 두고 입력 조건 → 관계 → 새 결과와 채점 기준 연결 확인 |
| G3 | `content`와 복제·동결된 `figureSpec`만 검산기로 전달. 양의 정수 길이 쌍을 독립 탐색하고 넓이는 반복덧셈으로 재구성. 배점 중간값·모범답·최종답 대조 |
| G4 | 최종 발문 안의 요구 ID ↔ 볼 증거 ↔ 기준 ID, 소문항 배점, 답만/근거 답안의 차이 |
| G5 | 가로 8~24, 세로 3~(가로−2)의 204쌍 × 상황 2개 = 408조합 전수. 부호·단위·중간값·그림 라벨 훼손 탐지 |
| G6 | 3+3+2=8점, 각 기준 1점 이상, 답 기준 2/8 ≤ 1/3 |

전체 **766표본**으로 408조합과 seed 경계를 검사했고 G1~G6가 모두 통과했다. 그림은 비율과 무관한 개략도라는 조건을 명시하고 `x cm`, `y cm`만 그린다. 정답 길이가 그림에 새지 않는다. 그림 스펙은 모든 수치 사례에서 같으므로 실제 strict 렌더는 스펙별 1회 캐시하고, 문항별 검산은 각각 수행한다.

학생용은 기존 `ProblemBody`, 교사용은 기존 `AnswerPage`를 통해 렌더했다. 수식 오류·날 LaTeX·학생용 정답/채점표 노출·교사용 체크칸과 부분점수/선행 오류 문구를 시험한다. HTML/PNG는 **현행 렌더 검증 증거**이며 새 지면 시안이나 승인된 답안지 설계가 아니다.

## 4. 배점 결정과 범위

`docs/planning/07-coding-convention.md`의 마지막 D-162 다음에 **D-163**을 기록했다. 일일·확인 시험지에도 자작 서술형을 싣고 배점을 표시하되 D-28의 예외는 서술형뿐이다. 위치·답란·소문항 칸·별도 답안지 모양은 Wire 트랙이 정한다. 이 작업에서 운영 인쇄 템플릿이나 표시 정책을 변경하지 않았다.

교육과정에 대한 세부 근거, 기출 집계와 첫 10개 후보는 아래 조사 결과에 둔다. 실제 교사 2인의 채점 일치·30~60초 채점 시간·원장님 눈가림 승인·학생 답안 효과는 아직 측정하지 않았고 이번 코드 검증으로 대신 주장하지 않는다.

## 5. 검증 및 산출물

**이 작업의 관련 검증은 통과했다. 다만 기존 전체 회귀·전체 eslint 실패가 남아 있어 “저장소 전체 초록” 조건은 충족하지 못했다.** 이번 구현을 위해 기존 시험을 삭제·완화하거나 실패를 숨기지 않았다.

| 검사 | 결과 |
|---|---|
| 서술형 기존/신규 단위·인쇄 회귀 | 7파일 **91시험 통과**, 종료 0 |
| D-163 반영 후 Decision Log 검사 | 1파일 **5시험 통과**, 종료 0 |
| `npm run type-check` | 종료 0 |
| 변경 TypeScript/TSX 파일 ESLint | 종료 0 |
| `npm run lint:affordance` | 종료 0 |
| `git diff --check` | 종료 0 |
| 전체 `npm test -- --maxWorkers=4` | 1,643파일: 1,585통과·26실패·32건너뜀. 42,557시험: 42,064통과·121실패·371건너뜀. 종료 1 |
| 전체 실패의 변경 전 재현 | D-163 머리글 오류 1건은 고친 뒤 위 5시험으로 재검사. 나머지 **25파일·120실패 전부 clean HEAD에서도 같은 개수·제목으로 재현** |
| `npm run lint` | 기존 67파일에서 **275오류·84경고**, 종료 1. 해당 67파일은 전부 HEAD와 바이트 단위로 동일 |
| 전체 시험 뒤 기존 판정기 쓸기 | 37개 중 34개 통과. `probe-figure-dependent.ts` 종료 143, 외부 말뭉치/어휘 파일 부재로 중등 판정기 2개 미측정 |

전체 실행 수치는 D-163 머리글을 고치기 전의 실제 기록이다. 수정 후 전체 실행을 다시 했다고 바꿔 적지 않았다. 별도 Orca 작업트리에서 부모 HEAD `b553ad38f84e0b5fdec98359b2309ee855d2a657`을 checkout하여 실패 25파일을 검사했고, 원래 브랜치와 clean 상태로 복구했다. 120실패 가운데 `mixedFractionScreens` 한 건은 두 실행 모두 20초 시간 초과였다. 부하와 코드 중 어느 원인인지 단정하지 않는다. 판정기 종료 143의 원인도 확정하지 않았으므로 성공이나 수학 결함으로 바꾸어 해석하지 않는다.

기존 6정의는 6,060표본과 18개 훼손으로 감사했다. G3는 모두 통과하지만 r2의 G1·G2·G4·G6 증거가 없어 승격할 수 없고, 사다리꼴은 배점 대상 수치 변화가 없어 G5도 실패한다. 기존 solution 바이트와 앞서 캡처한 30행 payload 해시는 유지했다. 현재 DB 30행을 다시 읽어 확인했다는 뜻은 아니다.

검증 자료:

- [시연 JSON](descriptive-core-20261020/demo.json), [G1~G6 결과](descriptive-core-20261020/gates.json), [기존 6정의 감사](descriptive-core-20261020/legacy-audit.json)
- 학생용 [HTML](descriptive-core-20261020/student.html) · [PNG](descriptive-core-20261020/student.png), 교사용 [HTML](descriptive-core-20261020/teacher.html) · [PNG](descriptive-core-20261020/teacher.png)
- [렌더 계측](descriptive-core-20261020/render-metrics.json): print media, 두 페이지 모두 문서 폭 850px/뷰포트 850px, KaTeX 오류·날 수식 0. PNG를 열어 수식·그림·채점표의 잘림과 겹침을 확인했다.
- [최종 검증 요약 JSON](descriptive-core-20261020/validation.json), [관련 91시험 로그](descriptive-core-20261020/focused-tests.log), [전체 실행 요약](descriptive-core-20261020/full-test-summary.log)
- [기존 실패 독립 재현 보고](descriptive-core-20261020/baseline-tests.md), [실패 제목 대조](descriptive-core-20261020/baseline-test-comparison.json), [실행·복구 기록](descriptive-core-20261020/baseline-test-runs.json), [eslint 기존 파일 해시](descriptive-core-20261020/eslint-baseline.json)

재현:

```sh
node_modules/.bin/tsx scripts/qa/inspect-descriptive-core.ts
DESCRIPTIVE_CORE_RENDER_DIR=docs/planning/tracks/reports/descriptive-core-20261020 \
  npm test -- src/__tests__/components/nativeDescriptiveAuthorPrint.test.tsx
npm test -- --maxWorkers=4
npm run type-check
npm run lint
npm run lint:affordance
```

새 시연·독립 검산·기출 집계는 DB 없이 실행했다. 전체 `npm test`의 기존 후속 판정기 `probe-figure-dependent.ts`는 운영 문항을 읽는 조회를 포함했다. **DB 쓰기·스키마 변경·문항 등록/적재·git add·커밋·push는 하지 않았다.** `node_modules`는 원래 심볼릭 링크를 유지하며 스테이징하지 않았다. 커밋 금지 지시에 따라 구현은 현재 작업트리에 미커밋 변경으로 남긴다.

검토용 Orca 작업트리 두 개는 결과를 회수하고, 고유 커밋 없음·`origin/main` 포함·clean 상태·작업 종료를 확인한 뒤 제거했다. `BIGSHOL/desc-requirements-review`, `BIGSHOL/desc-gates-review` 브랜치는 원래 SHA로 보존했다([정리 기록](descriptive-core-20261020/worker-cleanup.json)). 미커밋 구현이 있는 현재 작업트리는 유지한다.

## 6. 학교 서술형 요구와 첫 후보 10개

삭제 원장의 중학 수학 서술형 4,033행 중 파일명으로 학년·1학기를 확인한 **3,040행·737편**을 재집계했다. 중1 1,092행·중2 1,001행·중3 947행이다. 확인 가능한 배점 3,036행 중 **2,893행(95.3%)이 4~12점**, 가장 많은 배점은 8점(700행)이다. 두 개 이상 줄머리 소문항 표지가 있는 365행 가운데 346행(94.8%)은 2~3개 표지였다. 표지 수는 OCR·조건 목록에 영향을 받으므로 실제 소문항 수와 동일하다고 단정하지 않는다.

| 물음 꼴 | 중1-1 | 중2-1 | 중3-1 |
|---|---:|---:|---:|
| 식 계산·값 | 265 | 146 | 247 |
| 조건·후보·범위 | 306 | 244 | 175 |
| 상황 모델 | 133 | 131 | 17 |
| 그래프·좌표 | 134 | 138 | 237 |
| 도형량·관계 | 81 | 110 | 154 |
| 오류 진단·정정 | 45 | 68 | 26 |
| 이유·설명·증명 | 33 | 20 | 22 |
| 미상 | 95 | 144 | 69 |

관측은 **정규식 전수 선별**이고 아래 목표·증거·배점은 **새 저작 제안**이다. 단원 미상 713행(23.5%)을 남겼다. 기출 원문·수치·그림은 생성 입력이나 보고서에 옮기지 않았다. 세부 규칙·소문항/배점 분포·기존 요구 50개 전체 대조·자료 해시는 [상세 조사](descriptive-core-20261020/school-requirements.md)에 있다. 학교 공식 채점표의 부분점수는 원장에서 확인할 수 없다.

**첫 후보 10개.** 교육과정은 모두 2027학년도·2022 개정, 학기는 1학기다. 보조 유형 키는 실제 등록 여부와 3개 seed 생성까지 확인했다. 아래 그림의 “원 보조”는 기존 계산 유형의 출력이고, 새 그림은 별도 도형 보조가 책임진다.

| 후보·칸 | 평가 목표 | 학생이 쓸 증거·단답 쌍둥이와 다른 요구 | 보조 엔진 typeKey·그림 | 예상 총점 | 성취기준 |
|---|---|---|---|---:|---|
| C01 중1 소인수분해·설명 | 최소공배수의 지수 선택 이유 | 소인수 비교표 → 큰 지수가 필요한 이유 → 결과. 단답의 최종 수 이외 비교·설명 요구 | `1-1\|최대공약수와 최소공배수\|07`; 저자 비교표, 그림 없음 | 6 | 9수01-01·02 |
| C02 중1 정수·유리수·오류 | 잘못 적용한 연산에서 원 수 복원 | 잘못된 관계 → 원 수 → 정정과 차이 이유. 바른 결과만 쓰면 설명 점수 없음 | `1-1\|정수와 유리수의 계산\|08`; 없음 | 6 | 9수01-05 |
| C03 중1 일차방정식·상황 | 할인 기준량을 식으로 표현 | 변수·할인 기준량 → 식·해 → 원상황 확인. 정가 숫자 외 모델·검산 요구 | `1-1\|일차방정식의 활용\|34`; 없음 | 6 | 9수02-01·04 |
| C04 중2 부등식·경계 | 고정비·단가에서 정수 최댓값 정당화 | 비용 부등식 → 경계 → 선택 정수와 다음 정수 대입. “하나 더는 안 됨”의 증거 | `2-1\|일차부등식의 활용\|04`; 없음 | 7 | 9수02-11·12 |
| **C05 중2 연립식·직사각형** | 두 관계를 연립하고 소거 | 두 식의 이유 → 소거·두 길이 → 원조건·넓이. 세로 값 외 과정·검토 요구 | **`2-1\|연립일차방정식의 활용\|29A` + 새 FigureSpec v2 개략도** | **8 (3+3+2), 구현** | **9수02-13** |
| C06 중2 함수·교점·도형 | 교점과 연립식 해, 밑변·높이 연결 | 축 교점 → 두 직선 교점 → 길이 근거·넓이. 넓이 외 좌표 해석·검산 | `2-1\|일차함수와 일차방정식의 관계\|12`; 원 보조 `linearGraph` | 8 | 9수02-16·18 |
| C07 중3 실수·부호 | 제곱근의 비음성과 부호 설명 | 정수·제곱근 비교 → 부호 선택 이유 → 정리. 최종식 외 비교·설명 | `3-1\|제곱근의 뜻과 성질\|16`; 없음 | 6 | 9수01-07·09 |
| C08 중3 인수분해·오류 | 보존된 계수 복원과 항등식 검산 | 두 전개·오류 항 → 원식·정정 → 항별 일치. 최종 인수분해 외 진단·검산 한계 | `3-1\|다항식의 인수분해\|12`; 없음 | 8 | 9수02-19 |
| C09 중3 이차방정식·넓이 | 대수적 해와 실제 길이 구별 | 넓이식 → 두 해 → 음수 배제·원 넓이 검토. 버리는 해와 이유 필수 | `3-1\|이차방정식의 활용\|19`; 원 보조 그림 없음. 직사각형/삼각형/평행사변형 갈래 명시 필요 | 8 | 9수02-20 |
| C10 중3 이차함수·이동 | 꼭짓점 이동과 식 연결 | 원 꼭짓점 → 이동 좌표·축 → 식·검산. 계수 답 외 좌표 의미·중간식 | `3-1\|이차함수의 그래프 ⑵\|07`; 원 보조 그림 없음. 필요하면 기존 그래프 보조로 제작 | 8 | 9수02-22 |

| 후보 | 기존 examStudy 요구와의 관계 | 새 요구 후보(미등록) |
|---|---|---|
| C01 | `number.coprime-symbolic-sum`은 다른 과제 | `written.lcm-exponent-reason` |
| C02 | `algebra.error-identity`는 인수분해·항등식 과제 | `written.rational-operation-repair` |
| C03 | `algebra.linear-model` 재사용 검토, 서술 형식 승격은 별도 | — |
| C04 | `algebra.inequality-solution-count`는 개수로 계수 역산 | `written.inequality-integer-bound` |
| C05 | `algebra.linear-model`은 관계식 요소만. 작업률·이동 시스템 요구와 직접 대응하지 않음 | `written.system-rectangle-model` |
| C06 | `coord.two-lines-dependent-area`의 관련 요소, full 아님 | `written.line-intersection-area` |
| C07 | `algebra.absolute-sign-cases`의 구간별 후보해 요구와 다름 | `written.root-sign-reason` |
| C08 | `algebra.error-identity` 재사용 검토 | — |
| C09 | `written.rectangle-domain`은 변화하는 직사각형, 정적 모델은 부분 대응 | `written.quadratic-area-domain` |
| C10 | `graph.translated-coefficient-reuse`의 추가 계수 재사용이 빠져 부분 대응 | `written.parabola-translation-evidence` |

2027년 세 학년 모두 2022 개정 대상임과 위 성취기준 코드는 [교육부 고시 제2022-33호 최종본](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&search=)에서 확인했다. 국가 성취기준은 중학교 1~3학년군 기준이고, 학기 배치는 저장소 분류와 겨울 선행 지시를 따른다. 학교별 2027 평가계획까지 확인한 것은 아니다. 후보의 성취기준 매핑은 내용에 근거한 판단이다.

재현: `python3 scripts/qa/aggregate-descriptive-school-requirements.py --repo . --json /tmp/desc-requirements-aggregate.json`. 원문 없는 [집계 JSON](descriptive-core-20261020/school-requirements.json)과 동일해야 한다. 이 10개 중 이번에 구현한 정의는 C05 하나이며 나머지 아홉 개는 요청대로 후보 표다.
