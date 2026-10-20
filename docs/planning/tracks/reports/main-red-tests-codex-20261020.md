# main 빨간 시험 정리 — 2026-10-20

작업 지시: `docs/planning/tracks/brief-main-red-tests-codex.md`.
기준은 작업 시작 직전 `git fetch origin main`으로 확인한 **`e7d29628018d5224bbbcbe8c8e5e34cd7a12119f`**이다. `HEAD...origin/main`은 0/0이었고 추적 파일 변경은 없었다. 사용자 제공 브리프만 untracked였다. 브랜치는 `fix/main-red-tests-20261020`이다.

## 결과

**최종 전체 Vitest는 2파일·2단언 실패로 줄었다.** 남은 두 실패는 고치지 말라는 지시를 따른 실제 도구 위반이다. 기대값·대역·픽스처 수정은 시험 및 헬퍼 24파일에만 적용했다. 전체가 초록이라는 뜻은 아니며, 후속 판정기의 출력 버퍼 결함도 별도로 보고한다.

최초 전체 Vitest: **1,647파일 중 23실패·1,592통과·32건너뜀**, **42,591시험 중 66실패·42,153통과·371건너뜀**. 23실패 파일에는 `geometryAngleDrill`의 **종료 훅 실패 1건**이 포함된다. 이는 66개 단언 실패와 별개다. 빠진 파일이 있는지를 검사하는 저장소 래퍼를 그대로 실행했다.

66개 단언 실패는 **(a) 15건, (c) 45건, (c+b 혼합 가드) 2건, (d) 4건**이다. 가드 2개 안의 11지점은 시험 하네스/픽스처 (c) 9곳을 수정하고 실제 도구 (b) 2곳은 그대로 남겼다. 종료 훅 1건도 (d)다. 따라서 정당한 기대값·픽스처로 고친 최초 실패는 60건이다. 시간/경합 4건과 종료 훅은 제품·시험 수정 없이 집중 실행 및 최종 전체 실행에서 모두 통과했다.

제품 코드·실제/공유 DB·스키마·원본 콘텐츠·동결 gzip 픽스처를 바꾸지 않았다. 프로젝트 `git add`·커밋·push 없음. `node_modules` 심볼릭 링크도 유지했으며 스테이징하지 않았다. Vitest의 DB 시험은 대역·인메모리 Prisma/PGlite를 사용했다. 전체 래퍼의 후속 `probe-figure-dependent.ts` 및 해당 도구의 원인 재현은 실제 DB를 **조회**했다. 확인한 호출은 `problem.findMany`와 disconnect이며 쓰기는 없었다. 승인 SHA를 확인하는 기존 시험이 만드는 임시 Git 저장소의 커밋은 프로젝트 커밋과 무관하다.

## 실패별 분류 표

경로는 `src/__tests__/` 기준. (a) 승인된 동작을 반영하지 않은 기대값, (b) 실제 제품/도구 결함으로 보고만, (c) 대역·픽스처·하네스 미갱신, (d) 시간/부하·경합이다. 매개변수 시험의 이름이 같은 경우도 별도 실패로 센다. 아래 표의 각 행에 속하는 원래 실패 이름 전부는 마지막 부록에 보존한다.

| 파일 | 최초 실패 | 분류 | 원인·수정·검증 범위 | 근거 커밋/문서 |
|---|---:|---|---|---|
| unit/examStudyCompletion.test.ts | 26 | c | 요청은 localhost인데 실행 환경 AUTH_URL이 달라 실제 same-origin 검사에서 403. AUTH_URL/NEXTAUTH_URL 픽스처를 고정·복구한다. | 5b40d88c5; 정상 보안 정책 df1eb9049 |
| unit/examStudyRoutes.test.ts | 9 | c | 같은 출처 픽스처 누락. 생성/출력 확인의 외부·누락 Origin 및 cross-site 거부 검증을 유지·보강한다. | 291327800 |
| unit/examStudyIntegration.test.ts | 1 | c | 동일한 환경 출처 불일치로 실제 수학·Python SVG 검증 전에 거절됐다. 실제 통합 단언을 유지한다. | d1a1ae2b0 |
| unit/exportPerMenu.test.ts | 3 | a | exam/practice의 textbook 단독 사용을 제외한 승인 정책을 별도로 검증한다. 일반 출력 API의 textbook 허용은 유지한다. | 2fac1748c; 선행 84d58378f |
| unit/proxyStudentGate.test.ts | 2 | a | 추가된 Eywa branch-menus 통합 경로의 6메서드를 정확한 허용 집합에 반영한다. | a42d51752 |
| components/JeongtongHeader.test.tsx | 1 | a | 승인 C2 공통 머릿글이 HTML table을 대체. 9개 정보의 정확한 위치·순서·중복 없음 검증으로 갱신한다. | 99fbf71df |
| components/mathgenTemplates.test.tsx | 3 | a | 양식별 학교명·날짜 생략은 승인된 C2 구성. 독립 기대표로 표시·생략 모두 확인하고 crop 바이트를 유지한다. | 99fbf71df |
| components/ProblemSourceReference.test.tsx | 3 | c | 초기 BankData에 countUnit=question/version/queryKey 추가. 출처·코드 fallback·추가 요청 없음 검증 유지. | 98b2a2f23 |
| components/perProblemFractionView.test.tsx | 5 | c | 상세 BankData의 문항 단위 메타 누락. 5사례×13화면의 분수 기대와 렌더러는 그대로. | 98b2a2f23 |
| components/mixedFractionScreens.test.tsx | 1 | c | 20초 시간 초과지만 부하가 원인이 아니다. MSW 응답 countUnit 누락으로 loadProblems가 거절됨. 메타만 추가했다. | 98b2a2f23 |
| components/PrintCheck.test.tsx | 1 | a | 스마트 여백 검수 항목 추가 후 고정 개수 미갱신(139→140). 새 항목 ID·대기·날짜도 검증한다. | e8d1769cf |
| unit/arithmeticV2Geometry.test.ts | 1 | a | 메타데이터만 읽는 성능 개선으로 생성기 호출이 1→0. 두 도형 유형 모두 0호출, 저장 문항 수·SVG·정답·스냅샷 불변 검증. | 6bc01b85b |
| unit/bankDecideMiddleLoader.test.ts | 1 | a | 0 포함 카드의 자연수가→숫자가 교정. 동결 파일을 다시 쓰지 않고 그 문구만 되돌린 전체 행 SHA가 기존과 같고 정확히 3씨앗인지 확인. | cfbb07daf |
| unit/planDailyReview.test.ts | 1 | a | 학생별 problemCount 필드가 정당하게 추가됨. 전체 객체 동등성 유지, 기본 8과 다른 12를 각각 검증. | 39f14382a |
| unit/problemOrder.test.ts | 1 | a | 문항 단위 서버 재조회가 화면의 삽입 정렬을 대체. sort/toSorted/reverse 금지와 실제 목록 수용·재조회 배선을 잠근다. 기존 ProblemBank 행위 시험도 실행. | 98b2a2f23 |
| unit/mathSrsQuickFence.test.ts | 1 | a | 명시 승인된 READ ONLY 집계 QA 진입점 누락. 정확한 1파일·승인 원문 SHA로만 예외, 그래프·다른 금지 루트·직접 quick import 금지는 유지. | 6bc01b85b; brief-browser-sweep-perf-codex 규칙2 |
| unit/noRmSync.test.ts | 1 | c + b | 시험 cleanup 6곳을 await rm으로 수정. 실제 측정 스크립트의 1곳은 보고만 하므로 가드 실패 유지. | 잔여 2f625b5e37 |
| unit/examWiringAudit.test.ts | 1 | c + b | 실제 인메모리 픽스처 3곳에 배선 성격 선언. 운영 적재 어댑터 1곳은 보고만 하므로 가드 실패 유지. | 잔여 e566e6673a |
| unit/chooseAllRule.test.ts | 1 | d | 전량 생성 쓸기 20초 시간 초과. 무수정 단일 워커 18/18 통과, 실패했던 쓸기 4.96초. | 시간/부하; 상한 변경 없음 |
| unit/choiceCountRule.test.ts | 1 | d | 전량 생성 쓸기 20초 시간 초과. 무수정 단일 워커 18/18 통과, 실패했던 쓸기 4.77초. | 시간/부하; 상한 변경 없음 |
| unit/examStudyCoreLegacy.test.ts | 1 | d | 등록부 확인 20초 시간 초과. 무수정 단독 15/15 통과, 해당 시험 4.12초. | b2c94c3d1 도입; 상한 변경 없음 |
| unit/devAiCliProcess.test.ts | 1 | d (경합 의심) | 취소 직후 자손 PID의 process.kill(pid,0)가 즉시 예외를 던지지 않음. 무수정 단일 워커 8/8 통과. 지속 프로세스 누수/제품 결함은 확정하지 않았고 시험도 완화하지 않았다. | d1d0bb20e; POSIX killTree는 SIGKILL 뒤 즉시 반환 |
| unit/geometryAngleDrill.test.ts | 훅 1 (단언 실패 0) | d | afterAll browser.close의 10초 시간 초과. 무수정 단일 워커 6/6 및 훅 통과, 파일 1.52초. | 단언 실패 수 66과 별도 집계 |

## 권한 분석

exam-study POST의 36실패는 권한 fixture 자체보다 **출처 환경의 불일치**가 직접 원인이다. 실제 응답은 `FORBIDDEN` / “같은 사이트에서 요청해 주세요.”였다. 요청 URL과 Origin은 localhost로 서로 일치했지만 시험 실행 내부의 `AUTH_URL`과는 달랐다. 셸에는 없고 Vitest 안에는 있었으며 정확한 주입 경로까지 단정하지 않는다. 환경 값은 비밀을 노출하지 않고 일치 여부만 검사했다. 세 시험에서 `vi.stubEnv`로 요청 기준을 고정하고 `vi.unstubAllEnvs`로 복구하며, 제품의 same-origin/권한 가드를 모킹하거나 우회하지 않는다.

`df1eb9049`부터 존재한 정상 보안 정책이며, 위 표의 시험 도입 커밋들이 localhost 요청의 출처 환경을 고정하지 않았다. 기존 `261a5e263`의 export→bank 메뉴 픽스처 교정은 이번 36실패의 직접 원인이 아니다. 다른 세션 소유 exam-study에서는 세 시험의 환경 고정·복구와 실제 출처 거절 단언만 손댔다. 성공·본문 400·digest 409·그림 누락 거절·동시 렌더 2개·SVG 상한 단언을 유지했다. 일부러 다른 상위 AUTH_URL/NEXTAUTH_URL을 지정한 집중 검증에서도 담당 5파일 **131/131**이 통과했다.

export 3건은 별개다. 일반 출력의 `canOutputFrom` 변경 `84d58378f`만 보면 textbook도 허용되지만, 후속 exam-study 전용 정책 `2fac1748c`는 textbook 단독 사용을 제외한다. 따라서 일반 출력 행 전체를 좁히지 않고 exam/practice GET/POST/resolve의 기대만 분리한다. proxy의 6개 추가 메서드 경로도 인증을 우회하라는 뜻이 아니라 자체 연동 인증 경계가 있는 등록 경로의 정확한 집합 검증이다.

## 보고만 한 실제 도구 결함

1. **`scripts/qa/bank/question-backfill-scale.ts:238`** — `rmSync(scratch, ...)`가 한글 작업 경로를 포함할 수 있는 실제 도구에서 사용된다. 도입 커밋 **`2f625b5e3784f172e64262a9f54368461415b5b3`**. 기존 금지 가드는 `1a6ae29db`의 비ASCII 경로 Node 충돌 근거를 지킨다. 측정 도구 자체와 가드를 바꾸지 않았다. 후속 담당자는 async `main`에서 비동기 정리를 적용해야 한다.
2. **`scripts/import/verified-engine-batch.ts:808`** — `createPrismaVerifiedBatchStore().insert()`의 실제 `tx.problem.create`에 감사용 배선 성격 선언이 없다. 도입 커밋 **`e566e6673a5e1ce8d0240250a6b8effd11defa49`**. 후보는 엔진 생성이고 `source: manual`을 강제하므로 확인한 결함은 **감사 선언 누락**이다. 실제 기출이 잘못 적재되었다고 단정하지 않는다. 주석을 포함해 이 제품 파일은 수정하지 않았다.
3. **`scripts/qa/sweep-elem-probes.mjs:112`** — 전체 시험 래퍼의 후속 판정기 실행이 `spawnSync`의 기본 출력 버퍼를 넘는다. 해당 호출 도입 커밋 **`99ff3c2467`**. `probe-figure-dependent.ts`를 파일로 직접 받으면 종료 0, 출력 **2,027,507바이트**인데, 래퍼와 동일한 호출은 **종료 143, `ENOBUFS`, stdout 1,048,863바이트**로 잘렸다. 따라서 래퍼의 “판정기가 결함을 찾았다”는 이번 사례에서는 도구 실행 실패다. 도형 콘텐츠 결함으로 판정할 수 없으며 출력 제한/스트림 처리 개선은 후속 담당 범위로 남겼다.

가드의 탐지 규칙·허용목록·최종 기대 `[]`는 그대로다. noRmSync는 7→1지점, examWiringAudit은 판단불가 4→1지점으로 줄었지만 두 시험은 계속 빨간 것이 맞다.

후속 판정기는 최초 전체 회차에서 **37개 중 빨강 1·측정 불가 2**였다. 빨강 1은 위 출력 버퍼 결함이고, 두 측정 불가는 저장소 밖 말뭉치·어휘 파일 누락이다. 전자는 (b), 후자는 (c) 실행 입력 미준비로 분리한다. `probe-middle-algebra-combo.ts`의 기본 입력 `C:/tmp/middle-combo/corpus-0825.json`은 `9ab8826c7`, `probe-middle-combo.ts`의 작업트리별 기본 입력 경로는 `45e0e57f5`에서 도입됐다. 기본 경로를 수정하거나 저장소 안에 `C:` 디렉터리를 만들지 않았다. 대신 현재 생성기로 `/tmp/main-red-tests-20261020/`에 말뭉치와 어휘를 만들고 명시 경로로 별도 실행했다. **1,517유형 전부 생성 성공, 실패 0, 유형당 2씨앗×2갈래**다.

두 독립 실행은 모두 **종료 0**이다. algebra 판정기의 눈금 8건이 통과했고 대수 867유형을 분류했다. combo 판정기는 기존 눈금 25/25·새 양성 5/5·새 음성 7/7을 통과했고 1,517유형을 결합형 58·아님 1,176·미분류 283·생성 실패 0으로 집계했다. 미분류는 결함 없음이나 완전한 내용 검수를 뜻하지 않는다. 입력 미준비를 해소한 별도 실행과 기본 경로가 비어 있는 전체 래퍼의 결과는 구분한다.

```sh
node node_modules/tsx/dist/cli.mjs scripts/qa/build-middle-corpus.ts --out=/tmp/main-red-tests-20261020/middle-corpus.json
node node_modules/tsx/dist/cli.mjs scripts/qa/census-middle-solution-vocab.ts --corpus=/tmp/main-red-tests-20261020/middle-corpus.json --json=/tmp/main-red-tests-20261020/middle-vocab.json --tsv=/tmp/main-red-tests-20261020/middle-vocab.tsv
node node_modules/tsx/dist/cli.mjs scripts/qa/probe-middle-algebra-combo.ts --corpus=/tmp/main-red-tests-20261020/middle-corpus.json
node node_modules/tsx/dist/cli.mjs scripts/qa/probe-middle-combo.ts --corpus=/tmp/main-red-tests-20261020/middle-corpus.json --vocab=/tmp/main-red-tests-20261020/middle-vocab.json --json=/tmp/main-red-tests-20261020/middle-classifications.json --out=/tmp/main-red-tests-20261020/middle-combo-report.md
```

가드가 지적한 시험 코드 9곳의 수정은 다음과 같다. 줄 번호는 수정 전이다.

| 수정 위치 | 조치 | 원인 커밋 |
|---|---|---|
| `src/__tests__/unit/nativeDescriptive20261018.test.ts:381` | finally 정리를 `await rm`으로 | e566e6673a |
| `src/__tests__/unit/questionIdentityDdl.test.ts:901` | 같은 임시 디렉터리를 비동기로 정리 | 2f625b5e37 |
| `src/__tests__/unit/verifiedEngineBatch.test.ts:63` | afterAll에서 비동기 정리 완료 대기 | e566e6673a |
| `scripts/qa/bank/maintenance-approval.test.ts:53` | 임시 Git 저장소의 finally 정리만 변경 | 61816b89ee |
| `scripts/qa/bank/maintenance-approval.test.ts:150` | 동일 | 9a75adccef |
| `scripts/qa/bank/math-question-reinforcement.test.ts:79` | afterEach에서 비동기 정리 완료 대기 | 9a75adccef |
| `src/__tests__/api/questionBankProjection.test.ts:39` | 실제 인메모리 대역임을 배선 규약 주석으로 선언 | d1f078f7bc |
| `src/__tests__/api/unifiedBankPickerDemand.test.ts:70` | 동일 | 2ffd8833af |
| `src/__tests__/helpers/builderSpeedFixture.ts:26` | 동일 | 0ed024b852 |

## 추가 관찰 (최초 실패 66건에 합산하지 않음)

- `ProblemTransformPanel.tsx:196`의 `<p>` 아래 `MathText → MarkdownRenderer`가 `<div>`를 반환하여 React가 잘못된 HTML 중첩 경고를 낸다. 해당 조합 도입은 `ce868173e0`, 렌더러 선행 변경은 `c64f5bb6f2`다. 수정 전후 모두 보였으며 제품 수정·경고 억제 없이 보고만 했다. 실제 브라우저 hydration 장애를 새로 재현한 것은 아니다.
- `scripts/qa/english-listening/retirement/inventory-local.test.mjs:18`에도 `fs.rmSync`가 있다(`c0d934456e`). 현재 noRmSync 정규식의 점 앞 제외로 탐지되지 않는 범위 밖 호출이다. “가드가 7곳을 찾았다”와 “실제 호출이 7곳뿐이다”를 구분한다. 이 파일 및 가드 확장은 변경하지 않았다.

## 검증 강도를 유지한 부분

- 인쇄는 제품의 메타 목록을 기대값으로 재사용하지 않았다. 독립 승인 구성표로 표시·생략·한 번 출력·crop 실제 src를 확인한다.
- 문항 단위 메타만 fixture에 추가했고 분수의 5사례×13화면 기대, 출처 fallback, 추가 요청 없음, timeout은 유지했다.
- 은행 동결 fixture는 재생성하지 않았다. `숫자가→자연수가`라는 승인 차이만 역변환한 **전체 행** 해시가 원래 것과 같은 3행을 요구한다. 기존 명령 경계 공백 6행의 동일성 검증도 그대로다.
- 읽기 QA 예외는 승인 스크립트 **한 파일의 LF 정규화 SHA256** (`7b61f93ae5ba0712f43ce68d2099cb2a9f8da68648ec2ea5c89ec08f204abeb8`)에 묶었다. 원문 변경은 실패하며, 그래프에서 노드를 삭제하지 않아 다른 제품 경로가 이를 경유해 quick에 닿는 경우도 계속 실패한다. 직접 quick import, 종이 엔진, 연구실 경계는 그대로다. 해당 읽기 스크립트는 실행하지 않았다.
- 임시 정리는 같은 디렉터리를 `finally`/hook에서 `await rm`으로 지우며 오류를 삼키지 않는다. 데이터·승인·복원 단언은 바꾸지 않았다.

## ESLint (수정 범위 밖)

최초 전체 `npm run lint -- --format json --output-file /tmp/main-red-tests-20261020/eslint.json`: 종료 1, **5,740파일·오류 275·경고 84**.

| 수준 | 규칙 | 수 |
|---|---|---:|
| 오류 | `@typescript-eslint/no-explicit-any` | 274 |
| 오류 | `@next/next/no-assign-module-variable` | 1 |
| 경고 | `@typescript-eslint/no-unused-vars` | 67 |
| 경고 | `@next/next/no-img-element` | 13 |
| 경고 | `import/no-anonymous-default-export` | 3 |
| 경고 | 규칙 ID 없음 | 1 |

오류·경고를 이번 범위에서 일괄 수정하지 않았다. 변경한 시험·헬퍼 24파일의 별도 ESLint는 종료 0, 오류·경고 0이다.

## 실행 및 증거

Node `v24.22.0`, npm `11.19.1`, Vitest `4.1.11`. 전체 최초 회차는 기본 병렬 설정, 집중 재검증은 1~2워커를 사용했다. `BANK_DECIDE_CAPTURE_LOADER=0`으로 동결 파일 캡처를 닫았고 실제 PostgreSQL 시험용 URL 다섯은 빈 값으로 지정했다. 이 변수들은 후속 읽기 판정기의 DB 연결을 닫는 설정은 아니다. 실제 DB 조회 범위는 위에 명시했으며, DB 쓰기나 비밀 환경값 출력은 하지 않았다.

```sh
BANK_DECIDE_CAPTURE_LOADER=0 \
LISTENING_TEST_DATABASE_URL= LISTENING_STYLE_TEST_DATABASE_URL= \
LISTENING_MEDIA_TEST_DATABASE_URL= ENGLISH_BANK_TEST_DATABASE_URL= \
BRANCH_ADMIN_TEST_DATABASE_URL= npm run test
```

- `baseline.log`: 최초 전체 원본 로그. Vitest 시작 16:27:01 KST, 531.94초. 후속 실데이터 판정기와 wrapper 종료도 같은 파일에 기록된다.
- `load-recheck.log`: 코드 무수정 `--maxWorkers=1`의 chooseAllRule·choiceCountRule·geometryAngleDrill·devAiCliProcess **4파일·50시험 통과**, 종료 0. 시간 상한·skip·retry를 바꾸지 않았다.
- `render-before.log` / `render-printcheck-before.log` / `render-final.log`: 14실패 재현 후 **6파일·43시험 통과**, 종료 0.
- `guards-before.log` / `guards-after.log` / `guards-ddl.log` / `guards-bank.log`: 변경 실행 시험 **130건 통과**. 가드 포함 9파일·144시험은 **142통과·보고 대상 2실패**.
- `unit-after.log`: 부모 단위/실제 ProblemBank 검증. 최초 작성한 정적 검사 슬라이스의 종료 위치를 잘못 잡아 1개 실패했고 수정했다. 이 작업 중 오류는 최초 66건에 합산하지 않는다. 나머지 120건 통과.
- `unit-final.log`: 슬라이스 수정 및 CRLF 호환 보강 후 해당 **3파일·22시험 통과**, 종료 0.
- `exam-before.log` / `exam-origin-probe.log` / `exam-after.log`: 권한·출처 분류 및 보강 검증, **5파일·131시험 통과**, 종료 0.
- `exam-core-legacy.log`: 무수정 단독 **15시험 통과**, 종료 0. 위 시간/경합 4파일과 합쳐 5파일·65시험 및 종료 훅 통과.
- `figure-dependent-direct.log` / `probe-buffer-actual.json`: 직접 실행과 래퍼 동일 호출의 종료 0 대 ENOBUFS 증거. 출력 자체는 검토 후보 목록이며 전체 콘텐츠가 유효하다는 증명은 아니다.
- `middle-corpus-build.log` / `middle-vocab.log` / `middle-algebra.log` / `middle-combo.log`: 임시 말뭉치 생성과 두 측정 불가 도구의 독립 재검증.
- `eslint.json` / `eslint-summary.json`: 전체 lint 분포 원본.

모든 위 로그·작업자 세부 보고·패치는 `/tmp/main-red-tests-20261020/`에 있다. 이 문서에는 실패 이름과 근거를 보존하므로 임시 로그가 제거되어도 분류를 확인할 수 있다. Orca Codex 독립 작업트리 세 곳에서 검토한 패치를 부모가 읽고 통합했다. 커밋 금지 지시 때문에 main 병합이나 작업트리 삭제를 하지 않았다. 변경을 가진 작업트리는 보존하고 담당 작업자 터미널 세 개는 완료 후 해제했다.

## 최종 검증

전체 재검증은 같은 환경 접두어에 `npm run test -- --maxWorkers=4`로 저장소 래퍼를 유지했다. timeout·retry·skip은 바꾸지 않았고, 최초 전체 실행과 병렬 워커 수만 다르다. 16:42:38 KST 시작, Vitest **502.91초**였다.

| 항목 | 최초 전체 | 최종 전체 |
|---|---:|---:|
| 파일 | 1,647 | 1,647 |
| 실패 파일 | 23 | **2** |
| 통과 파일 | 1,592 | **1,613** |
| 건너뛴 파일 | 32 | 32 |
| 시험 총수(Vitest 원문) | 42,591 | 42,593 |
| 실패 단언 | 66 | **2** |
| 통과 단언 | 42,153 | **42,219** |
| 건너뛴 시험 | 371 | 371 |

시험 총수는 학생별 quota의 추가 매개변수 1건과 읽기 QA 승인 원문 검사 1건으로 2개 늘었다. 위 수는 Vitest 출력 그대로이며 총수와 표시된 상태별 수의 합에는 두 회차 모두 1건 차이가 있다. 이를 임의로 통과 수에 더하지 않았다.

남은 정확한 실패는 `examWiringAudit.test.ts`의 적재 어댑터 감사 선언 누락과 `noRmSync.test.ts`의 측정 도구 정리 호출이다. 두 가드의 빈 배열 기대를 유지했다. 최초 시간/부하·경합 사례의 최종 전체 파일 실행 시간은 chooseAllRule 4.96초, choiceCountRule 4.97초, examStudyCoreLegacy 5.76초, geometryAngleDrill 1.27초, devAiCliProcess 0.44초이며 모두 통과했다.

- `npm run type-check`: 종료 0 (`type-check.log`).
- 변경 24파일 ESLint: 종료 0 (`changed-eslint.log`).
- `git diff --check`: 종료 0.
- `HEAD`는 기준 `e7d296280` 유지. 스테이징 파일 0, 제품 코드 변경 0, `node_modules`는 기존 대상의 심볼릭 링크·미추적 상태 유지 (`final-repository-check.json`).
- 후속 판정기 **37개·빨강 1·기본 입력 부재 2**, 최초와 동일. 빨강은 앞서 재현한 출력 버퍼 초과이며, 입력 부재 2개는 임시 입력을 지정한 독립 실행에서 종료 0이다.
- 전체 `npm run test` 래퍼 **종료 1** (`final-full.log`). 남겨 둔 실제 도구 가드 2건 및 후속 판정기 실행 실패 때문에 전체 초록으로 보고하지 않는다. 래퍼의 **파일 누락·미처리 오류 경고는 없었다**.

## 최초 실패 이름 전부

중복된 매개변수 이름도 원본 로그와 같은 횟수로 적었다. 첫 행의 훅을 제외한 나머지 66행이 단언 실패다.

| 번호 | 파일 | 원래 실패 이름 |
|---:|---|---|
| 1 | `unit/geometryAngleDrill.test.ts` | opt-in triangle angle drills |
| 2 | `components/JeongtongHeader.test.tsx` | school exam header > prints each exam field once in the table, including the semester |
| 3 | `components/PrintCheck.test.tsx` | 실물 출력 검수 목록 — 데이터 > 항목 수가 바뀌면 알아차린다 |
| 4 | `components/ProblemSourceReference.test.tsx` | teacher problem source references > shows the same supplied reference in a bank card and its selected detail without a request |
| 5 | `components/ProblemSourceReference.test.tsx` | teacher problem source references > keeps a missing exam readable through its source code in the selected detail |
| 6 | `components/ProblemSourceReference.test.tsx` | teacher problem source references > omits the reference row in the selected detail when the response has none |
| 7 | `components/mathgenTemplates.test.tsx` | original Mathgen template adapters > renders workbook with real metadata and the unchanged crop |
| 8 | `components/mathgenTemplates.test.tsx` | original Mathgen template adapters > renders jaseup with real metadata and the unchanged crop |
| 9 | `components/mathgenTemplates.test.tsx` | original Mathgen template adapters > renders yuhyung with real metadata and the unchanged crop |
| 10 | `components/mixedFractionScreens.test.tsx` | 배선 — 단원 목록으로 학년을 찾아 카드에 넘긴다 > 문제은행(/problems) |
| 11 | `components/perProblemFractionView.test.tsx` | 같은 문항을 모든 화면에 넣으면 분수 모양이 모두 같다 > '초6 «(가분수)÷(분수)» — 해설이 «가분수»를 부른다' |
| 12 | `components/perProblemFractionView.test.tsx` | 같은 문항을 모든 화면에 넣으면 분수 모양이 모두 같다 > '초4 받아내림 — 이름을 안 부른다(«고칩니다»)' |
| 13 | `components/perProblemFractionView.test.tsx` | 같은 문항을 모든 화면에 넣으면 분수 모양이 모두 같다 > '초4 받아내림 — 본문이 «대분수»를 부른다' |
| 14 | `components/perProblemFractionView.test.tsx` | 같은 문항을 모든 화면에 넣으면 분수 모양이 모두 같다 > '평범한 초5' |
| 15 | `components/perProblemFractionView.test.tsx` | 같은 문항을 모든 화면에 넣으면 분수 모양이 모두 같다 > '중1' |
| 16 | `unit/arithmeticV2Geometry.test.ts` | live geometry arithmetic > projects saved SVG and degree answers without calling a geometry generator |
| 17 | `unit/bankDecideMiddleLoader.test.ts` | B5: 중등 적재 행의 실제 오답 배선 > 등록 유형 전부 × 씨앗 세 개: 삼각비 18 객관식 외의 산출은 한 글자도 바뀌지 않는다 |
| 18 | `unit/choiceCountRule.test.ts` | 초등 엔진 — 보기가 있으면 언제나 다섯 > 소단원 전량 × 갈래 × 씨앗 8 |
| 19 | `unit/chooseAllRule.test.ts` | 초등 엔진 — 「모두 고르시오」 부류를 내지 않는다 > 소단원 전량 × 갈래 × 씨앗 12 에서 0건 (내기 시작하면 여기가 빨개진다) |
| 20 | `unit/devAiCliProcess.test.ts` | owned subscription subprocess lifecycle > cancels both the owned parent and its live descendant before cleanup |
| 21 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > fulfills every selected demand for 'daeryun-m1' |
| 22 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > fulfills every selected demand for 'daeryun-m2' |
| 23 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > fulfills every selected demand for 'kyungmyung-m1' |
| 24 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > fulfills every selected demand for 'kyungmyung-m3' |
| 25 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > fulfills every selected demand for 'kyungshin-common2' |
| 26 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing daeryun-m1 / model.doubling-time-offset without component substitution |
| 27 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing daeryun-m1 / model.circle-revolution-percentage without component substitution |
| 28 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing daeryun-m1 / number.coprime-symbolic-sum without component substitution |
| 29 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing daeryun-m2 / coord.intercept-integer-area without component substitution |
| 30 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing daeryun-m2 / graph.translated-coefficient-reuse without component substitution |
| 31 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing kyungmyung-m1 / algebra.candidate-verification without component substitution |
| 32 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing kyungmyung-m1 / algebra.equality-truth without component substitution |
| 33 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing kyungmyung-m1 / algebra.equation-classification without component substitution |
| 34 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing kyungmyung-m1 / algebra.linear-model without component substitution |
| 35 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing kyungmyung-m1 / algebra.linear-simplify without component substitution |
| 36 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing kyungmyung-m3 / graph.translated-coefficient-reuse without component substitution |
| 37 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing kyungmyung-m3 / written.rectangle-domain without component substitution |
| 38 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > delivers the formerly missing kyungshin-common2 / function.radical-inverse-circle without component substitution |
| 39 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > keeps the approved per-menu output rule for bank |
| 40 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > keeps the approved per-menu output rule for arithmetic |
| 41 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > keeps the approved per-menu output rule for studio |
| 42 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > keeps the approved per-menu output rule for library |
| 43 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > keeps the approved per-menu output rule for conceptBlank |
| 44 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > bounds actual count-question choices for reproduced seed 71 |
| 45 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > bounds actual count-question choices for reproduced seed 20261019 |
| 46 | `unit/examStudyCompletion.test.ts` | completed selected school-study demands through the actual API > keeps native writing unavailable as short answer without silently changing the requested format |
| 47 | `unit/examStudyCoreLegacy.test.ts` | readonly adapters and conservative catalogs > preserves original registry identities/counts and exposes actual supported courses only |
| 48 | `unit/examStudyIntegration.test.ts` | integrated registered exam-study generation > runs authenticated API → actual math → strict Python SVG → reproducible output confirmation |
| 49 | `unit/examStudyRoutes.test.ts` | exam study authenticated route boundary > authorizes an approved teacher and keeps generated questions private |
| 50 | `unit/examStudyRoutes.test.ts` | exam study authenticated route boundary > rejects original fields, unbounded bodies and duplicate JSON keys before generation |
| 51 | `unit/examStudyRoutes.test.ts` | exam study authenticated route boundary > rejects original fields, unbounded bodies and duplicate JSON keys before generation |
| 52 | `unit/examStudyRoutes.test.ts` | exam study authenticated route boundary > rejects original fields, unbounded bodies and duplicate JSON keys before generation |
| 53 | `unit/examStudyRoutes.test.ts` | exam study authenticated route boundary > rejects original fields, unbounded bodies and duplicate JSON keys before generation |
| 54 | `unit/examStudyRoutes.test.ts` | exam study authenticated route boundary > pins output to the same recipe and refuses a changed digest or empty generation |
| 55 | `unit/examStudyRoutes.test.ts` | figure preparation is strict and bounded > does not accept a figure when rendering dropped required dimensions |
| 56 | `unit/examStudyRoutes.test.ts` | figure preparation is strict and bounded > limits simultaneous Python calls to two |
| 57 | `unit/examStudyRoutes.test.ts` | figure preparation is strict and bounded > refuses oversized SVG instead of delivering a figureless replacement |
| 58 | `unit/examWiringAudit.test.ts` | auditCodePaths — 저장소 전수 > ⭐ 기출을 넣는 경로 중 배선 없는 곳이 하나도 없다 |
| 59 | `unit/exportPerMenu.test.ts` | 공용 출력 API 전수 관문 > POST /api/exam/practice/resolve는 각 출력 메뉴에서 열리고 메뉴 없는 계정·export 단독은 거절한다 |
| 60 | `unit/exportPerMenu.test.ts` | 공용 출력 API 전수 관문 > GET /api/exam/practice는 각 출력 메뉴에서 열리고 메뉴 없는 계정·export 단독은 거절한다 |
| 61 | `unit/exportPerMenu.test.ts` | 공용 출력 API 전수 관문 > POST /api/exam/practice는 각 출력 메뉴에서 열리고 메뉴 없는 계정·export 단독은 거절한다 |
| 62 | `unit/mathSrsQuickFence.test.ts` | 한 걸음 문항 격리 울타리 > 문제은행·시험지·엔진·스크립트 쪽에서는 몇 단계를 돌아가도 quick 에 닿지 않는다 |
| 63 | `unit/noRmSync.test.ts` | `rmSync` 금지 — 한글 경로에서 노드가 죽는다 > 저장소 어디에도 `rmSync` 호출이 없다 |
| 64 | `unit/planDailyReview.test.ts` | [planDailyReview] 오늘의 학생별 확인테스트 계획 > 오늘 진도 행이 없으면 examOrUnread — 원문 줄 그대로, 중복 제거 |
| 65 | `unit/problemOrder.test.ts` | 문제은행 정렬 — 화면이 두 번째 규칙을 만들지 않는다 > ProblemBank 의 모든 .sort( 는 compareProblemsForBank 를 지난다 |
| 66 | `unit/proxyStudentGate.test.ts` | 🔴 첫 비밀번호를 바꾼 학생 — 지나가는 것의 집합이 정확히 이것이다 > 학생 학습 화면 · 학생 API · 나가기 · 세션 · 브랜드 이미지 · 랩실 읽기뿐 |
| 67 | `unit/proxyStudentGate.test.ts` | 🔴 첫 로그인 학생 — 비밀번호 바꾸기 외에는 못 간다 > 지나가는 것은 바꾸기 화면·바꾸기 API · 나가기 · 세션 · 브랜드 · 랩실 읽기뿐 |
