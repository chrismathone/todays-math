# Native descriptive C — implementation and pure verification

2026-10-18. 기준 commit `eb5d6e285`의 Claude R2 원장을 먼저 확인했다.
계획 파일의 실제 SHA-256은
`15ecaf3edcea3e018f1e5b20e6e2108654122bb249b4e38e3a5713b7f84211a3`와 일치했다.
승인은 계획 실행에 한정된다. **최종 문항 내용·전체 배치 SHA·공유 DB 쓰기는 이 보고서에서 승인하거나 실행하지 않았다.**

C 산출은 **6문형 × 2변형 = 12문항**이다. 초4 6문항, 중3 6문항이며 모두 처음부터
근거·오류 판단·검산을 요구하도록 저작했다. 각 문항의 `modelAnswer`, 독립 기준 3개(각 2점,
총 6점), 허용 다른 풀이, 흔한 오류를 저작 JSON에 두고 교사용 `solution`의 `채점 기준` 절에도
직렬화했다. 기준별 기대 근거·과정의 충족 여부를 독립 채점하여 총점의 부분점수를 구성한다.
자동 서술형 채점이나 학생 점수 변경은 구현하지 않았다.

## 실제 후보와 exact selector

- [native-plan.json](native-plan.json): 실제 loader/rebuild가 읽는 계획. `seedBase=20261018`, `variants=2`.
- [native-candidates.json](native-candidates.json): **실제 12개**의 `definitionId / familyKey / externalId / seed / variant / unitId / content / answer / modelAnswer / solution / rubric`.
- [native-manifest-preview.json](native-manifest-preview.json): C 12행만의 정렬·digest 목록. 전체 A/B/C 최종 승인 목록은 root가 만든다.
- [native-comparison.json](native-comparison.json): 기준선 등록부의 문형/유형별 실제 표본 발문과 새 해결 행동 비교.
- [native-verification.json](native-verification.json): 검증 수치·범위·미실행 항목.

C preview 파일 바이트 SHA-256:
`9cabde6cc32cebf85f4106244e46c8a227150ff7b0cb7bea4c82ba001a67634d`.
이는 **C preview**의 식별자이며 최종 배치 승인 SHA가 아니다.

| 유일한 definitionId (family는 `native-desc:` + ID) | 기존에서 관측한 해결 행동 | 새 문형에서 반드시 할 행동 | 검증·한계 |
| --- | --- | --- | --- |
| `e4-equilateral-audit-r1` | `01/05`: 다른 변, `06`: 한 각, `09`: 둘레에서 한 변 계산 | 길이·각의 잘못된 설계안을 각각 반박·정정하고 세 변 합과 내각합으로 확인 | 발문의 둘레/한 변에서 독립 계산; 정삼각형 1개에 한정 |
| `e4-triangle-dual-proof-r1` | `01/03/05`: 각 분류, `07/09`: 정삼각형의 각 분류 | 두 기준을 근거로 분리 적용하고 정삼각형∩직각삼각형이 불가능함을 입증 | 세 각의 합/최대각 재판정; 직각 경계 90도와 예각·둔각 포함, 포함 정의 명시 |
| `e4-trapezoid-sufficiency-r1` | `02`: 이름·둘레, `05/08`: 도형 식별, `06`: 평행 쌍 수 | 정의 만족·불만족을 설명하고 같은 길이 두 변이라는 잘못된 충분조건에 반례 제시 | 나의 실현 가능한 볼록 사각형을 좌표로 별도 구성; 포함 정의와 꼭짓점 순서 명시 |
| `m3-factor-error-proof-r1` | `3-1\|다항식의 인수분해\|07/08/09`: 인수분해 결과 산출 | 제시한 오답을 전개해 항별 오류 진단, 정정 후 항등식 검산, 수치 대입의 한계 설명 | 발문 계수에서 정수 인수쌍 완전탐색·여러 x 대입·모델 전개 계수 재확인; 최고차항 계수 1 |
| `m3-quadratic-domain-r1` | `3-1\|이차방정식의 활용\|12/19`: 상황의 길이 답 산출 | 정의역과 방정식 제시, 두 해를 모두 구해 음수 해 배제 이유 설명, 차·넓이 원조건 확인 | 발문 차·넓이로 정수 해 완전탐색; 양의 해 유일성 검사; 직사각형 상황에 한정 |
| `m3-statistics-shift-spread-r1` | `3-2\|산포도\|04/07`: 변량 변환에 따른 분산/표준편차, `08`: 분산 계산 | 실제 세 자료의 편차 변화를 비교해 수정안을 선택하고 평균 증가⇒분산 증가 주장을 반례로 판단 | 발문 자료를 다시 읽고 모든 쌍의 차 제곱 합으로 분산 독립 계산; 모분산 정의 명시 |

비교 JSON은 기준 commit 등록부의 문형당 1개 표본을 관측한 것이다. 모든 씨앗의 의미 동치나
통합 후 A/B 새 문형과의 차별성을 자동 증명했다고 주장하지 않는다. 그 판단은 실제 후보 전체를
보는 Claude 내용 검토에서 확정한다. 교과서 원문이나 풀이를 새 문항으로 복사하지 않았다.

## 독립 검산과 렌더

각 문형에 서로 다른 **0..99의 100씨앗 × 2변형**을 검사했다. 추가로
`-2147483648`, `2147483647`, 최종 씨앗 `20261018`도 같은 두 변형으로 확인했다.
합계 **1,236개 생성 사례**에서 발문의 수치·조건을 다시 읽어 풀었다. 생성기 facts는 없으며,
answer를 oracle 입력으로 사용하지 않았다. 모델답안에 인쇄되는 수치 등식도 별도 산술 파서로
확인하고 잘못된 인수분해의 전개 계수도 발문의 오답으로부터 다시 계산했다.
한국어 풀이의 모든 의미를 기계적으로 증명했다는 뜻은 아니다.

최종 씨앗에서 문형별 **3개 발문**을 실제 `MarkdownRenderer`와 `renderMathHtml`에 넣어
본문·정답·해설을 확인했다. variant 2는 렌더 탐침용이며 후보/적재에는 포함하지 않는다.
최종 12문항은 정답·해설·교사 전용 고유 표식을 가진 전체 입력으로 기존 학생용 `ProblemBody`
및 교사용 `PrintAnswerKeyPage`를 SSR 렌더했다. raw TeX, red, merror는 0이며 학생 DOM에
`solution`/채점 기준/교사 표식이 나오지 않고 교사 DOM에는 채점 기준·허용 풀이·오류가 남았다.

**Chromium의 실제 CSS/A4 배치·잘림·물리 인쇄는 이 worker의 SSR 검사로 대체하지 않았다.**
root가 제품 TestPrint의 지면 검증과 print-check `대기` 등록을 맡는다. 실물 확인은 계속 대기이다.

실행:

```sh
node node_modules/vitest/vitest.mjs run --config src/__tests__/native-vitest.config.mts
npm run type-check
git diff --check
```

pure suite는 **8파일, 82검사 통과**. 기존 combo/judge/unloaded/variant 회귀도 포함한다.
Vite `envDir:false`, 별도 pure setup, Prisma 생성자 대체, fetch 차단으로 `.env`·공유 DB·유료 API를
사용하지 않는다. 실제 공유 DB 검증 통과로 표현하지 않는다. 전체 타입 검사는 프로젝트의
8GB 명령을 사용한다. 초기 plain tsc의 기본 힙 한도 종료는 최종 검사 결과와 구분한다.

## R2-1부터 R2-6까지의 연결

| 관문 | 구현과 pure 검증 |
| --- | --- |
| R2-1 선택 | 기존 loader에 선택적 `formIds`/`typeKeys`, native의 필수 `definitionIds`. 누락·빈 목록·중복·모르는 키 거부. 선택자를 생략한 기존 계획은 유지. verified builder는 선택자가 필수이고 최대 138행이며 원문 참조를 붙이지 않음. 대상 family에 frozen 목록 밖 기존 행이 있으면 중단 |
| R2-2 정체성 | `nativeDescriptive.contract.ts` 한 곳의 exact 키 생성·해석을 등록/생성/loader/unloaded/refresh/verified revert가 공유. native는 `elem:`/`mid:` 파생 삭제 SQL과 불일치. native의 기존 광역 loader 쓰기는 차단하고 verified 경로만 허용 |
| R2-3 내용 CAS | 같은 externalId도 unit/family/questionType/difficulty/problemType와 본문·정답·해설·실제 SVG tuple SHA 전부 재대조. UUID 충돌·내용 충돌은 첫 INSERT 이전 중단. 일치한 기존 행은 갱신하지 않음 |
| R2-4 사전 원장 | root가 모든 신규 UUID를 미리 할당하는 prewrite ledger. `writePreparedBatch`는 wx+fsync로 이전 파일을 덮지 않음. manifest/ledger/승인/계획이 HEAD에 실제 바이트로 커밋되어 있어야 실행. 전체 배치 한 트랜잭션, 결과 JSONL은 append+fsync. 실패 후 같은 원장으로 복구/재실행 |
| R2-5 최종 승인 | 외부 키를 JS 문자열 순서로 정렬하여 `JSON.stringify(entries,null,2)+newline` 직렬화. tuple SHA는 정확히 UTF-8 `JSON.stringify([content,answer,solution,figureSvg??null])`. 실제 파일 바이트 SHA·계획 SHA·sourceCommit·추가 prewrite SHA를 Claude final approval과 결박. 재생성의 추가·누락·메타/수치/해설/SVG 변경을 첫 쓰기 이전 거부 |
| R2-6 참조 보호 | 모든 실제 FK와 `problem_id`/`origin_problem_id`, snapshot JSON source_ref와 source_key를 발견·점검. 현재 스키마의 필수 11개 참조 위치 중 누락이 있으면 중단. 참조 테이블을 먼저 잠그고 다시 읽음. 원장 ownership=new이며 ID/외부 키/메타/digest가 같은 미참조 행만 삭제. 참조 행은 directUseAllowed=false로 잠그고 참조별 수 보고, 타인이 고친 행은 held. 학생·시험·검수·신고·원문 참조는 변경/연쇄 삭제하지 않음 |

실 어댑터는 먼저 `problem`을 잠그고, 발견한 참조 테이블을 결정적 순서로 잠근 다음 데이터
검사를 시작한다. `ReadCommitted`를 써 잠금 대기 중 먼저 끝난 참조 INSERT도 이후 SELECT의
최신 스냅샷에 포함시키도록 설계했다. 재생성·SVG 렌더·파일 SHA 검사는 잠금 전에 끝낸다.
이는 [PostgreSQL의 SELECT 스냅샷 규칙](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED)과
[테이블 잠금 규칙](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-TABLES)에 근거한 구현 판단이다.
현재 pure 검사는 어댑터의 호출/잠금/옵션 계약을 확인했다. **실제 DB 권한·트리거·잠금 대기·실패 rollback은 root 검증이 남아 있다.**
참조 잠금은 실행 중 관련 쓰기를 잠시 기다리게 할 수 있다. 실제 실패는 자동 재시도하지 않는다.
참조 수는 위치별 수이며 같은 snapshot이 여러 위치에서 계수될 수 있다.
빈 problem_family의 전역 정리는 수행하지 않으며 되돌린 뒤 번호의 빈칸이 남을 수 있다.

결과 로그를 커밋 직후 기록하지 못해도 선할당 ID/외부 키/digest 원장은 이미 커밋되어 있으므로
그 목록의 재조회로 소유 행을 확인할 수 있다. `committed-result-log-failed`와 정상 rollback은
다르게 보고한다. readback 실패는 트랜잭션 안에서 검사하여 전체 rollback된다.

## Root 사용 계약

`verified-engine-batch.ts`는 import만으로 DB에 연결하거나 쓰지 않는 utility/adapter이다.
loader의 기본 Prisma 생성도 실제 실행 시점으로 미뤄 pure 행 생성에서 env 경로를 열지 않게 했다.
standalone CLI가 아니며 root는 본인 실행기에서 `--apply`와 `ALLOW_SHARED_IMPORT=1`을 읽어
`executeVerifiedBatch`의 `apply`/`allowSharedImport` 인자로 전달한다.

1. A/B/C를 통합한 **root의 소스 commit**을 `sourceCommit`으로 고정한다. cherry-pick 전 worker SHA를 root의 조상 commit으로 취급하지 않는다.
2. 각 exact plan에 `buildVerifiedCandidates(plan, units)`를 호출하고 결과를 합친다. plan마다 seed가 달라도 된다. `regenerate` callback은 동일 source 함수와 실제 SVG를 다시 만들어 합친다.
3. root가 최신 DB의 같은 외부 키·unit/family 범위를 읽어 `preparePrewriteLedger(rows, scope, {planSha256,sourceCommit})`에 준다. 이 worker의 census나 가짜 store를 실제 baseline으로 쓰지 않는다.
4. `writePreparedBatch`로 고유한 manifest/prewrite 경로에 쓰고 커밋한다. 최종 승인 JSON은 다음 필드를 모두 사용하고 실제 내용/렌더를 검토한 후 별도로 커밋한다.

```ts
{
  reviewer: "Claude",
  verdict: "approved",
  kind: "final-engine-batch",
  planSha256,
  sourceCommit,
  batchSha256: sha256(actualManifestBytes),
  prewriteSha256: sha256(actualCommittedPrewriteBytes),
}
```

5. `createPrismaVerifiedBatchStore(rootClient)`와 함께 `executeVerifiedBatch({files,regenerate,apply,allowSharedImport}, store)`를 호출한다. `files`는 repoDir/manifestPath/prewritePath/approvalPath/planPath/resultJournalPath이다. `planPath`는 승인 SHA와 일치하는 상위 Markdown 계획이다.
6. 동일 사전 원장과 callback으로 재실행하여 inserted=0을 관측한다. 되돌리기는 같은 함수를 mode=`revert`로 호출한다. 기존 일치 행은 ownership=existing이므로 되돌리지 않는다. 모든 결과·잠금·보류/참조 수를 보관한다.

## 추가로 승인받은 A 형식 정책 연결

coordinator의 2026-10-18 요청에 따라 `ElemForm.allowMultipleChoice?: boolean`과
`expandFamily`의 같은 이름 옵션을 최소 추가했다. undefined/true는 기존 출력을 유지한다.
false는 원래 단답·ID·RNG를 보존하고 객관식 파생만 생략하며 skipped count와 이유를 남긴다.
새 f33/f39의 실제 등록 메타데이터 연결은 root 소유이다. 새 범용 오답 엔진을 만들지 않았으며
서술형 파생 금지는 유지한다.

## 남은 일과 실행하지 않은 일

기준 census는 `/Users/pss/orca/workspaces/today_/problem_make/.qa-artifacts/math-bank-reinforcement-20261018/before/census.json`의
출제 가능 **115,425행**이다. 이 숫자를 이번 C의 적재 후 수로 재사용하지 않는다.
신규 적재 0행이며 actual prewrite UUID 원장은 root가 최신 DB를 읽은 뒤 준비한다.
다른 세션 초5 42행 원장 `559774350`이나 기존 행·학생 기록을 변경하지 않았다.

남은 작업은 통합 후 A/B/C 의미 중복 검토, 전체 실제 후보의 Claude 승인, 제품 Chromium/A4 확인,
print-check 대기 등록, root DB 사전 읽기/실제 어댑터 검증, 승인된 전체 manifest 쓰기와 되읽기,
멱등성 드라이런·용량 재측정이다. 공유 DB 연결/쓰기, `.env` 복사·출력, 유료 API, push, 배포,
main 병합, 추가 worker 생성, UI/양식/schema 변경은 이 worker가 수행하지 않았다.
공식 성취기준의 완전 대응이나 학생 학습 효과를 입증한 결과로 표현하지 않는다.
