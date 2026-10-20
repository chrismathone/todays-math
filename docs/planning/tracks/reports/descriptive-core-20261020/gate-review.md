서술형 G1~G6 / r2 독립 검토·보완 — 2026-10-20

결론: 부모의 r1/r2 분리, 주 저자·보조 계약, 발문/그림만 전달하는 독립 검산 경계, G1~G6 분리 구조는 유지한다. 누락 legacy audit과 재현된 게이트 결함만 5개 파일의 증분 patch로 보완했다. 부모 편집·DB 접근/쓰기·적재·git add·커밋·push·추가 에이전트 실행은 하지 않았다. 모든 편집과 실행은 /tmp/desc-gates-review/workspace 사본에서 했다. rectangleDemo 및 author 파일은 읽고 사본에서 통합 검사만 했으며 patch에 포함하지 않았다.

산출물

- 통합 patch: /tmp/desc-gates-review/desc-gates-review.patch
- 개별 patch: /tmp/desc-gates-review/patches/
- 교체/추가 가능한 전체 파일: /tmp/desc-gates-review/files/ (저장소 상대 경로 유지)
- 파일별 baseline/결과 SHA-256: /tmp/desc-gates-review/manifest.json
- 인계 시 부모 해시 대조: /tmp/desc-gates-review/parent-handoff-hashes.json
- audit 기계 판독 결과: /tmp/desc-gates-review/legacy-audit.json

이 patch는 부모의 미커밋 계약/게이트/legacy 검산기 위에 적용하는 증분이다. 깨끗한 main에 직접 적용하는 patch가 아니다. 인계 시 해당 3개 부모 파일은 검토 baseline과 동일했고 신규 2개 파일은 없었다. 부모에서 `git apply --check /tmp/desc-gates-review/desc-gates-review.patch`가 종료 코드 0으로 통과했다(실제 적용은 하지 않음).

읽은 기준

- 부모 docs/planning/tracks/brief-descriptive-core-codex.md
- 부모 docs/planning/descriptive-engine-middle-20261020.md 전체 및 마지막 「3자 검토와 합의안」
- 부모 nativeDescriptive.contract.ts, descriptiveAuthor.contract.ts, nativeDescriptiveGates.ts, descriptiveVerification/types.ts·legacy.ts, descriptiveAuthor/compose.ts·adapters.ts
- 신규 core/legacy/author 시험, fixture/oracle, 기존 생성기/검산/렌더 시험
- 설치된 Next 문서 node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md

보존할 부분

r1 생성기와 정의 ID, namespace/external ID 정규형, 기존 solution 직렬화는 그대로 두었다. r2의 부분점수·선행 오류·교육과정·요구 연결 구조, 보조 실패 시 문항 실패, detached/frozen 발문·FigureSpec 투영도 보존했다. descriptiveAuthor.contract.ts와 examStudy 공통 계약/등록부에는 변경이 없다. 자동 학생 채점이나 AI 판단을 추가하지 않았다.

수정한 결함

| 우선순위 | 결함·재현 | 보완 |
|---|---|---|
| P1 | nativeDescriptiveLegacyAudit.ts가 없어 신규 legacy 시험 import 실패 | auditLegacyNativeDefinitions 구현. 6정의마다 1,010표본, 정적 선언 범위와 독립 oracle 관찰 대조, 부호/단위/중간결과 훼손 |
| P1 | G3가 modelAnswer만 확인하여 교사용 solution을 999 cm로 바꿔도 통과 | solution이 검산된 모범답·rubric의 직렬화와 일치하는지 검사 |
| P1 | 부분문자열 검사로 2→20, 5 cm→-5 cm/15 cm/5 cm² 같은 훼손 통과 | 숫자·부호·소수·단위 거듭제곱 경계 검사. 문장 마침표와 소수점은 구분 |
| P1 | 빈 oracle 문자열은 항상 포함되어 통과; coverage=null은 보고서 대신 예외 발생 | oracle 결과·증거·coverage 런타임 검사, 실패 보고서로 반환 |
| P1 | 통계 oracle이 유효한 0/음수 자료를 거부하면서 인쇄된 이동량 999 및 분산 정의 변경은 무시 | 정수 자료를 허용하고 인쇄 이동량·모분산 정의를 독립 계산과 대조 |
| P2 | r2 revision을 지우고 figure를 null로 만들면 r2 증거를 legacy로 읽음 | r2 전용 problem/criterion 필드가 남은 downgrade 거부. 정상 r1 직렬화는 유지 |
| P2 | G1 쌍둥이의 존재하지 않는 factKey도 차이의 증거로 인정 | 쌍둥이 요구 키가 authored non-given fact에 실제 연결되는지 검사 |
| P2 | G2 선행 오류가 실제 의존하지 않는 앞 기준을 가리켜도 통과 | 단계의 전이 의존 관계를 확인하고, 방법 기준이 의존하는 앞 기준의 보호 누락도 검사 |
| P2 | G5는 seed가 아니라 variant만 숫자를 바꿔도 통과 | 같은 variant 안에서 서로 다른 seed의 정렬된 배점 대상 값 비교 |
| P2 | 일부 경계값만 선언하거나 그림을 건드리지 않은 훼손을 figure-label로 붙여도 통과 | 미선언 관찰값/차원·중복 표본 검출, 실제 그림 변화와 중복 훼손 검사 |

solution 일치 검사와 독립 oracle 거부를 분리했다. G5의 훼손 탐지 실적은 oracleIssues에만 근거하므로, 모범답 변경 뒤 solution을 갱신하지 않아 생긴 단순 불일치를 독립 검산 성공으로 세지 않는다. 인수분해 oracle은 원래 식 뒤 문맥도 읽어 무단 단위 삽입을 놓치지 않게 했다.

legacy 감사 결과

| 정의 | G3 | G5 | 실패 게이트 |
|---|---|---|---|
| e4-equilateral-audit-r1 | 통과 | 통과 | G1 G2 G4 G6 |
| e4-triangle-dual-proof-r1 | 통과 | 통과 | G1 G2 G4 G6 |
| e4-trapezoid-sufficiency-r1 | 통과 | 실패 | G1 G2 G4 G5 G6 |
| m3-factor-error-proof-r1 | 통과 | 통과 | G1 G2 G4 G6 |
| m3-quadratic-domain-r1 | 통과 | 통과 | G1 G2 G4 G6 |
| m3-statistics-shift-spread-r1 | 통과 | 통과 | G1 G2 G4 G6 |

총 6,060표본, 18개 훼손 모두 탐지, 선언한 범위 누락 0. 표본은 seed 0~499와 int32 양끝·20261018·safe integer 양끝, variant 0/1이다. 범위는 관찰 결과에서 거꾸로 만들지 않고 동결 생성기에서 선언했다. 이는 각 축의 값/갈래 검사이며 모든 수치 조합의 Cartesian 전수 검사는 아니다. legacy에는 그림이 없어 figure-label은 비해당이다.

사다리꼴의 씨앗은 주어진 변 길이를 바꾸지만 배점 대상 논리 판단의 수치를 바꾸지 않는다. 따라서 합의한 G5를 통과시켰다고 꾸미지 않았다. 모든 r1은 r2의 G1/G2/G4/G6 증거가 없으므로 미통과로 보고하며, 기록을 r2로 승격하거나 다시 저장하지 않는다. 위 실패 목록은 부모 기존 legacy 감사 시험의 기대값과 일치한다.

검증

- /tmp/desc-gates-review/final-tests.log: 5파일 79시험 통과. 기존 nativeDescriptive20261018 생성기/렌더, 부모 core/legacy audit, 추가 adversarial 회귀 포함.
- 30개 payload: 부모의 read-only legacy-db30.json fixture와 content/answer/solution/null SHA-256 전부 일치. 현재 DB를 조회한 주장이 아니다.
- 동결 12개 candidate와 기존 solution 바이트, 생성기 소스 SHA 검사가 통과했다. 기존 생성기 시험의 1,236사례도 포함된다.
- /tmp/desc-gates-review/regressions-before.log: 같은 17개 추가 회귀를 baseline에 실행하면 16개 실패. 보완 후 17개 모두 통과. 나머지 1개는 새 solution 검사가 G5 실적을 잘못 늘리지 않는지 보호한다.
- /tmp/desc-gates-review/scoped-typecheck.log: 검토 대상 TypeScript 검사 종료 0.
- /tmp/desc-gates-review/lint.log: 변경 5파일 ESLint 종료 0.
- 테스트는 envDir=false, 네트워크 차단과 Prisma mock을 쓰는 native-pure setup으로 실행. DB 또는 유료 API 호출 없음.

재현 명령(임시 사본에서):

```sh
cd /tmp/desc-gates-review/workspace
node node_modules/vitest/vitest.mjs run --config review-vitest.config.mjs
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project tsconfig.review.json --noEmit
```

전체 저장소 type-check 통과를 주장하지 않는다. 초기 전체 사본 검사에는 복사하지 않은 별도 baseline/루트 fixture와 당시 미완성 rectangleDemo 참조 오류가 있었으며 기록은 typecheck.log에 있다. 최종 전체 회귀와 통합 수정은 사용자 요청대로 부모가 이어간다.

부모 author 통합 참고 — 현재 상태의 판정이 아님

부모가 계속 편집 중이므로 아래는 15:51경 읽은 사본의 결과다. 이후 변경과 다를 수 있다. author/rectangleDemo 파일은 수정하거나 patch에 넣지 않았다.

1. /tmp/desc-gates-review/parent-integration.log: author 9시험 중 8통과, G1 1실패. 당시 twin.requiredFactKeys는 ["height"]였으나 authored facts에는 height가 없고 lengths라는 묶음만 있었다. 같은 namespace로 명시적으로 대응해야 한다. 예를 들어 이 시연의 쌍둥이 세로 길이를 lengths 그룹에 대응시키거나, 세로 길이를 독립 fact로 선언하는 결정을 부모가 해야 한다. 단답의 최종답이 새 문항의 최종답과 같아야 한다는 제약은 추가하지 않았다.
2. /tmp/desc-gates-review/parent-integration-typecheck.log: 당시 rectangleAuthor.definition에 필수 unitId가 없어 TS2322. 실제 연결할 unit을 부모가 지정해야 한다. 임의 ID는 만들지 않았다.
3. 기존 r2 rubric 검사는 두 번째 이후 method 기준에 무조건 선행 키를 요구한다. 서로 독립적인 병렬 소문항에는 과도한 제약일 수 있다. 기존 신규 시험을 유지하기 위해 이번 patch에서 이 일반 정책은 바꾸지 않았다. 향후 계약 차원에서 단계 의존성에 따라 요구할지 정리할 사안이다.

남은 검토 한계

G1 추가 요구의 교육적 실질, G2 관계 문장의 진위, G4 발문의 의미와 scoringExamples의 교사 판단까지 이 구조 검사만으로 증명하지 않는다. expectedContains/modelContains는 숫자 경계를 보강한 단편 검사이며 모든 자연어 모순을 판독하는 완전한 정리 증명기가 아니다. G3의 입력은 발문과 FigureSpec이므로 실제 최종 SVG/인쇄물 일치도 별도 렌더 검수가 필요하다. 등록 승인·교육과정 매핑·실제 답안 채점 일치율의 근거로 확대 해석하지 않는다.

검토 작업은 여기서 종료한다. 부모 통합용 파일과 증거는 위 경로에 모두 남겼다.
