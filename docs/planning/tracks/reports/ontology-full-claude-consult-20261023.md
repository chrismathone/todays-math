# 정식 온톨로지 — 실제 Claude 전체 구조 협의

상태: 독립 준비 조사 및 실제 협의 기록. 제품 구현·공유 DB 적용·운영 검증의 완료 보고가 아니다.
기준: `34742b2f02456930d911e60a69ee020ccee56d64` (`HEAD` 일치, 시작 시 clean).
소유: 이 보고서 한 파일. 외부 원자료: `/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/consult/private/`.

## 목표와 조사 경계

GOAL 전문은 `/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/GOAL.md`이며 첫 동결 SHA256은 `2d7f78628cb061b5dc83977a0feb0aedd0fa06460988ebb7b20d608cf3ba7967`이다. 전원천 의미 등록, 실제 RDF/OWL 및 SHACL, 권한을 보존하는 다중 홉 GraphRAG, 사람 승인 후 기존 action 실행·감사·결과 피드백을 앱에 연결하는 목표를 유지한다. 기존 경량 v2나 4소단원 읽기 전용 시범은 완료가 아니다. 원천 전체를 등록하는 것과 모든 교육적 관계를 검수한 것은 다른 분모이며, 미확인 관계를 지어내어 채우지 않는다.

`AGENTS.md`, `CLAUDE.md` 절대규칙, Orca orchestration/CLI 스킬과 프로젝트 TypeSafe 스킬을 읽었다. 실제 학생 행·정답·문항 본문은 읽거나 외부 전송하지 않았다. 공유 DB/API, 브라우저, 서버, build, push, env, 공유 의존성, 제품 파일을 변경하지 않았다. 별도의 구현 worker를 시작하지 않았다. 모델 인증은 전담 호출 프로세스 메모리에서만 취급했고 요청 증거에는 인증 헤더를 저장하지 않았다.

## 기존 작업이 축소된 근거

이는 과거 사용자 의도를 추측한 진술이 아니라, 코드와 당시 동결 결정을 대조한 결과다.

| 관측 근거 | 실제 경계 | 이번 적용 |
| --- | --- | --- |
| 이전 `ontology-plan-20261023/consult/final-goal.txt`, `lead-final-decision.json` | opt-in v2의 관찰 조회, v1 유지, 기본계획·explorer·mission 재계산 및 새 writer 제외를 명시 | 이전 과제의 합의일 뿐, 새 GOAL의 완료경계로 승계하지 않음 |
| `src/lib/math-prerequisite/mapping.ts` | 4소단원→2편집 단원의 수기 대응. 밖은 `null/unmapped` | 기존 선수 공급 규칙은 보호하되 전체 등록·탐색 범위를 제한하지 않음 |
| `src/lib/math-prerequisite/graph.ts` | 정적 JSON + Zod/끝점·순환·집계 수기검사 | 실제 OWL 추론/SHACL 검증으로 이름 바꾸지 않음 |
| `src/contracts/mathPrerequisite.contract.ts` | `editorial_curriculum_summary`, 빈 성취기준 ID, `needsCurriculumAudit: true`; 간선 `pedagogical_inference` | 공식/승인 관계로 일괄 승격하지 않음 |
| `src/lib/math-insight/v2Snapshot.ts` | 초3~6 보존 코스 관측은 넓혔지만 후보·판정은 기존 4소단원. 저장계획/기본계획 등의 차이 표시 | 첫 풀이·힌트·자기채점·재시도·보존 범위의 의미를 원천 adapter에서 유지 |
| `src/lib/math-insight/routes.ts`, `v2Routes.ts` | 무헤더 v1, 명시 v2; 초기 및 모델 후 최신 로컬 권한/맥락/기록 대조 | 기존 버전 호환과 권한 검사를 보존하는 출발점 |
| `src/lib/math-srs/courseTeacherRoutes.ts`, `serverStore.ts` | 실제 계획 action, `progress:write`, 반/지점/재적 확인, CAS `expectedRevision` | 승인 실행이 기존 검증을 우회하지 않도록 재사용할 후보 |
| 같은 route 저장 이후 `recordAudit`; `src/lib/audit.ts` | 감사 create 실패를 삼키며 학생 상태 저장과 같은 transaction으로 묶였다는 증거 없음 | 원자적 실행 영수증/idempotency/outbox는 별도 설계·시험 필요 |

기존 그래프 메타데이터는 unit 100/topic 356/prerequisite 186/support 2/contains 356이다. 이는 현재 지원하는 모든 원천의 모집단도, 공식 교육과정 전수 검증 수치도 아니다. `package.json`에는 전용 RDF/OWL/SHACL 의존성이 나열되지 않았으나 저장소 밖 런타임의 부재까지 증명한 것은 아니다. `prisma/schema.prisma`에서 여러 원천 도메인을 확인했으며 실제 공유 DB 행수는 조사하지 않았다. 파일별 원본 SHA256과 검토 행 범위는 외부 `source-review.json`에 보존했다.

## 실제 협의 영수증

공식 Anthropic API를 사용했다. 이전 증거의 provider 코드를 읽어 이번 외부 private 디렉터리에 별도로 작성했고 기존 증거를 수정하지 않았다. GET 모델 목록 1회에서 `claude-opus-5-5`가 실제 제공됨을 확인했다. 계획 요청은 최대 2회, 각 별도 동결·자동 retry 0·timeout 150초다.

| 요청 | 모델/설정 | 결과 | 해석 |
| --- | --- | --- | --- |
| inventory GET 1 | 공식 모델 목록 | HTTP 200, hasMore false | 모델 사용 가능성 확인이며 계획 협의가 아님 |
| 계획 1 | `claude-opus-5-5`, medium, max_tokens 8000 | HTTP 200, 82.49초, input 6682/output 8000(thinking 1173), `max_tokens`, JSON 불완전 | **실패**. 부분 제안만 읽었으며 완성 계획·수용기준 합의로 취급하지 않음 |

첫 요청 해시: prompt `a84ba8576b2562019ceb0e708c665625aa40694f06d5908b05aceac8a07995c1`, request `ab969996942394d0b16d2342cce35f75d8183cf4c095055c5759febbd77e0b53`, raw response `8cfc42143e25eb4696338f7cbd84f70f67744c5af66b187c6aecafbadfc97b0f`. provider의 `held` 상태와 별개로 `round1/adjudication.json`에 실패 판정을 추가해 원 영수증을 덮어쓰지 않았다.

원본: `round1/prompt.txt`, `request.json`, `freeze.json`, `round1-attempt.json`, `round1-raw.json`, `round1-result.json`, `round1/response-text.txt`. 실제 모델/usage/stop reason과 원응답을 보존했다. 첫 회수 즉시 리드에게 상태 `msg_9d6f6924f9c7`로 부분 제안·반대·채택 전제·미해결을 전달했고, 두 번째 요청 전에 blocking ask로 반론을 요청했다.

## 실제 반론과 최종 회수

리드의 blocking ask 답변은 RDF 1.1 named graph/reified assertion/PROV-O 우선, 미지원 shape/query 거절, 원천·규칙·버전·witness 검증, 인가별 격리, 전원천의 유한 분모, 기존 action의 동일 transaction 감사/영수증, UI/DB의 구체 검토 뒤 결정 순서를 확정했다. 정확 원문은 외부 `lead-round2-response.txt`에 보존했다. 두 번째 요청은 이 반론을 받은 뒤에만 시작했다.

| 요청 | 모델/설정 | 결과 | 해석 |
| --- | --- | --- | --- |
| 계획 2 (최종) | `claude-opus-5-5`, medium, max_tokens 8000 | HTTP 200, 66.74초, input 4919/output 6868(thinking 1325), `end_turn`, 완전 JSON | 실제 완성 계획 회수. 실행 검증·원장 승인과는 다름 |

2차 prompt SHA256 `ff25db49309ae237230b1b51834e9d2ef98cf170f8e1e6d958be8906611dfa52`, request `1e4360c6df62fdc785e7ee9d417cf707cef27cd1d057633ef875ab86a9ab8618`, raw `9dec67ab954ee98be355fdcb82b452a6202450f380c2e00a680ca4da365e3747`. 원본과 envelope는 외부 `round2-raw.json`, 완전 JSON은 `round2/parsed.json`, 동결 request/prompt는 `round2/`에 있다. GET 1회·계획 POST 2회로 종료했으며 자동 retry나 제3 요청은 없었다. 1차 실패는 성공 결과에 합쳐 지우지 않았다.

Claude는 리드 7개 결정과 worker 비판 A~G를 수용하고, Jena 완전 RL/두 엔진 전체 hash 동일/closure 자체가 provenance라는 주장을 철회했다. CI publish artifact + Node runtime을 우선 제안하고, 가장 먼저 풀 blocker로 기존 mutation의 transaction seam을 들었다. T1~T13 DAG와 GOAL별 G1~G7 수용기준을 제출했으며 전원천/실제 엔진/GraphRAG/승인 실행의 전체 경계를 유지했다. 회수 직후 `msg_540c9fc1e9b8`로 실제 model/usage/stop, 완성 제안과 남은 독립 반론을 리드에게 전달했다.

## 1차의 구체 제안과 독립 반론

Claude 부분 응답은 기존 v2에 전원천 등록·실제 의미 엔진·lifecycle·GraphRAG·승인 실행이 없어 현 GOAL을 충족하지 못한다고 명시했다. 재사용 대상은 v1/v2 호환, 보존 관측 의미, 최신 권한/맥락 대조, 기존 계획 action/CAS, stable ID/order이며 기존 간선은 미검수 후보로 가져오자고 제안했다.

제안은 공개 콘텐츠의 게시 시 OWL closure, 요청별 학습 overlay, generator family/version과 materialized instance의 분모 분리, 관계 검수와 학생 action 승인 분리, 다중 홉별 인가 및 출처 묶음, `course_plan_update`부터 실제 승인→기존 action→동일 transaction outbox→감사 복구→서술적 결과 피드백이다. 계획 action 하나의 완전한 경로는 출발점이며 FSRS/채점을 임의 새 writer로 만들어 전체 목표를 충족한 것처럼 처리하지 않는다.

다음은 **채택하지 않은 주장 또는 추가 검증 전제**다.

- Jena 내장 OWL을 완전한 OWL 2 RL 교차 기준이라 한 표현은 부정확하다. [Jena 공식 문서](https://jena.apache.org/documentation/inference/)는 내장 OWL 계열의 불완전성을 명시한다. 선언한 프로파일의 entailment/non-entailment와 제한사항을 실제로 시험해야 한다.
- 서로 다른 엔진의 closure/report 전체 hash 일치는 보편적 기준이 아니다. 공리 삼중항, 검증 보고서 blank node·메시지·순서가 다를 수 있다. 동일 pinned 엔진의 결정적 산출과 독립 엔진의 의미적 기대값 비교를 구분해야 한다.
- owlrl 실행만으로 모든 파생 사실의 규칙·전제 추적이 생긴다고 볼 수 없다. 설명 추적 또는 별도 재현 증거를 구현해야 한다.
- `public/content`라는 명칭은 공개 권한이 아니다. 소유자 전용 문제은행·교과서도 콘텐츠이며 전역 closure·벡터·캐시에 넣으면 유출될 수 있다. 분류/투영/추론 경계를 실제 인가와 일치시켜야 한다.
- 숨긴 경로가 있을 때만 `truncated: policy`를 보여도 존재 유출이 된다. 숨긴 자료가 없는 그래프와 허용 사용자 관측이 구별되지 않는 반례 시험이 필요하다.
- 기존 route를 HTTP로 연달아 호출하면 원자적 학생 action/승인 소비/감사라는 보증이 생기지 않는다. 기존 정책·순수 mutation 의미를 유지하는 transaction 경계가 필요하다. `changeSrsState`가 daily journey/expedition에도 미치는 효과는 승인 화면의 payload와 함께 검토해야 한다.
- 모델 키를 메모리에 두는 것은 이 협의 worker의 규칙이다. 그 운영 절차를 제품의 모든 AI 요청에도 전담 worker가 필요하다는 아키텍처로 옮기지 않는다.

리드 선행 지적 `msg_6c216fda91d4`도 수신했다. [RDF 1.2 Concepts](https://www.w3.org/TR/rdf12-concepts/)는 확인 시 2026-04-07 Candidate Recommendation이며 triple term은 object 위치에 도입된다. 임의 quoted triple subject를 가정하지 않고 RDF 1.1 named graph/reification을 우선 검토하며 실제 라이브러리 지원을 별도로 확인한다. OWL domain/range의 타입 추론은 인가 필터가 아니고, SHACL 합격은 권한이나 교육적 진실의 증명이 아니다.

## 채택 조건과 남은 확인

[OWL 2 Profiles](https://www.w3.org/TR/owl2-profiles/)의 실제 프로파일을 선언하고, [SHACL](https://www.w3.org/TR/shacl/) data/shapes graph와 실제 validation report를 산출해야 한다. primary 후보 `owlrl`/`pySHACL`은 [OWL-RL 원전](https://github.com/RDFLib/OWL-RL), [pySHACL 원전](https://github.com/RDFLib/pySHACL)을 확인한 라이브러리 제안이다. 설치·버전 pin·프로파일 적합성·성능·배포 적합성은 이 worker가 실행하지 않았으며 확인 완료로 쓰지 않는다.

프로젝트 TypeSafe의 [state](https://docs.typesafe.ai/concepts/state.md) 및 [citation check](https://docs.typesafe.ai/cookbooks/citation_check.md) live 문서를 읽었다. 판단에는 충분한 맥락을 주고, 인용 존재 검사와 주장 지지 판단을 분리한다는 설계 원칙만 반영한다. Jev 실행/SDK 도입이나 예제 confidence 문턱의 채택은 이 조사 범위에 없다.

기술 미확인: 전체 원천별 실제 분모, 엔진의 정확한 지원 프로파일/미지원 구문, canonicalization 규칙, 파생 증거 추적, 격리된 runtime overlay, artifact 크기/지연/증분 갱신, transaction/idempotency/audit 복구, 새 저장 표와 rollout reader floor, 실제 UI/운영.
교육콘텐츠 미확인: 공식 기준 원문/판/라이선스/대응, 기존 편집 선수 간선의 타당성, 모든 소단원과 문항의 교육적 관계, 추천의 학습효과. 교사 승인은 권한 있는 결정의 기록이며 공식성·사실성·교육효과를 자동 부여하지 않는다.

## 전체 요구의 수용기준 — 리드 초안과 대조

리드 외부 `ACCEPTANCE.md`를 확인했다. 아래는 앞으로 구현·검수할 기준이며 이 조사에서 통과한 결과가 아니다. 후보 관계의 제안→실제 SHACL 격리검증→사람의 출처/의미 검수→명시적 승인→버전 게시까지 포함한다. 단순 inventory를 완성품으로 보지 않는다.

| GOAL | 제품 수용기준 | 반례/납품 증거 |
| --- | --- | --- |
| 1. 전원천·신분·계보 | 모든 현재 지원 원천 family의 adapter, 안정 native ID, 판/개정/digest/계보; 실패도 분모에 잔존 | 같은 제목·다른 ID/교육과정 판, orphan, 중복 source, digest 바꿔치기. 원천별 census manifest와 누락/격리 원장 |
| 2. 실제 의미·검증 엔진 | RDF/OWL 선언 프로파일을 실제 pinned 엔진으로 실행; 실제 SHACL shapes/report; asserted/derived/unknown/위반 분리; 불변 release | positive/negative entailment, 미지원 구문 거절, SHACL 대상 누락, 좋은/나쁜 data graph, 두 번 compile 재현, source/manifest/proof 변조 거절. closure만으로 proof를 주장하지 않음 |
| 3. GraphRAG | 실제 RDF query로 bounded 다중 홉; 각 노드·간선·premise의 인가·shape·출판 상태; provenance packet을 거친 모델 근거 선택 | 비공개 중간노드·closure·벡터·캐시/수량 누출, 인용 ID는 맞지만 무관한 근거, draft를 trusted로 인용, 그래프/기록/권한 변경. runtime query+shape·actual model raw/strict 평가 |
| 4. 승인 운영 | 관측→계획/관계 후보→preview→권한 있는 사람 승인; 검증된 기존 계획 action→CAS/idempotent receipt/audit-outbox→후속 관측 연결 | 승인 bytes/args/evidence 변조, 중복 클릭·응답 유실, no-op, stale revision/graph, 학생 이동·계정폐기·권한 철회, tx failpoint/rollback, crash repair. 기존 best-effort audit만으로 성공 불가 |
| 5. 커버리지 | 모든 지원 원천을 등록 대상으로 포함하되 관계·공식기준 미확인을 별도 표기 | 등록률을 관계 검수율/공식성/효과로 바꾸지 않음. 분모별 numerator/denominator/기준시각/판/격리·중복 상태를 보고 |
| 6. 호환·소유권 | 기존 v1/v2/학생학습/인증/소유·지점 경계 및 reader floor 보존; 모델이 FSRS/채점/기록을 임의 변경하지 않음 | 무헤더 v1/명시 v2 frozen parity, 학습기록 reader fixtures, 실제 인가 helper 대조, 구버전 탭/승인 경주. 새필드 reader→writer 순서 증거 |
| 7. 연결·운영 완료 | 위 기능이 앱에 연결되고 독립 반례·통합·typecheck·maxWorkers3 관련검사·리드 build와 실제 배포 확인 | 단일 browser lease E2E, fresh-fetch 통합 후 정상 push, 정확 SHA Vercel/운영 확인. 문서·도구 갯수나 이 협의만으로 완료 선언 불가 |

분모는 `원천 family × 기준 release`별로 고정한다. 유한 native 객체의 발견/등록/격리/유효 source link를 각각 센다. 생성기는 family/엔진 version/실제 materialized instance를 나누며 무한 잠재 문항을 등록 완료로 세지 않는다. 관계는 특정 원천·생성 run에 묶인 유한 candidate universe(중복/대체 상태 명시)를 두고 검수·승인·거절을 각각 센다. 공식기준 연결은 census의 연결 대상 집합과 공식 원문/판의 확인 분모를 별도로 두며 미연결·미확인·부적용을 혼동하지 않는다. 분모를 작게 골라 높은 등록률로 제시하지 않는다.

`relationReview`와 `actionApproval`은 역할과 효력이 다르다. 기존 간선의 historical editorial 상태를 보존하면서 새 검수/승인을 별도 버전 사건으로 기록한다. 승인된 교육적 직접 관계도 무조건 전이시키거나 학생 숙달로 전파하지 않는다. 피드백은 action 이후 관찰한 사실이며 학습효과·인과의 증명이나 관계 자동 승격의 입력이 아니다.


## 최종 응답에서도 그대로 채택하지 않은 것

완전 JSON은 비판 검토의 완료이지 모든 문장의 타당성 보증이 아니다. 다음 보완은 **worker의 독립 검토 조건**이며 Claude에 세 번째 확인을 받았다고 표현하지 않는다.

1. 최종 `identity.basisKind`를 official/observed/AI/human/unknown 중 하나로 둔 문장은 같은 응답의 `separations` 및 리드의 직교축 요구와 충돌한다. source basis와 observation support, model proposal provenance, review status, approval authority, publication state, verification confidence는 각각 따로 기록한다. 공식 근거가 있는 AI 제안을 단일 enum 하나로 잃지 않는다.
2. 제품용 `server/ai/proposal`에 “key-holding worker only”, G6에 “keys stay in worker memory only”라고 옮긴 것은 이 협의 worker의 인증 규칙과 제품 아키텍처의 혼동이다. 현 제품의 서버 전용 인증·provider 흐름을 유지하며 필요 없는 전담 worker 도입을 확정하지 않는다.
3. T8 acceptance의 schema/evidence membership만으로는 질문 관련성·주장 지지·필요한 기권과 불필요한 기권을 검증하지 못한다. 원천 문맥/범위/기간/관계 상태까지 고정한 독립 기대값으로 실제 모델 출력과 인용을 평가한다. 학생 자료·문항/정답 본문 없는 합성 평가와 운영 콘텐츠의 검수 범위를 구분한다.
4. 최종 DAG에는 feedback의 독립 owner/구현 시험, 관계 수정→재검증→과거 release 재현, review-state 저장과 실제 runtime frontier SHACL 검증, 전원천 adapter 병렬 세분화가 충분히 드러나지 않는다. 아래 DAG는 그 누락을 보완한 후속 제안이다.
5. “v1/v2/student/auth parity is byte-identical”은 전체에 그대로 적용할 요구가 아니다. 기존 v1/v2 API의 고정 clock/config/source 출력은 byte/strict contract parity, 학생 reader·인가·학습 engine은 해당 불변식 및 회귀 시험으로 검증한다. 보안상 새 경로의 적절한 거절을 옛 전체 응답 바이트에 억지로 맞추지 않는다.
6. 독립 검수자를 “implementation access가 없는 사람”으로 제한할 필요는 없다. 기대값/음성 반례를 결과에 맞춰 바꾸지 않고 구현과 독립적으로 세우되, 검수자는 실제 코드·산출물·실행 증거를 읽어야 한다. 별도 worker의 이름만으로 독립 검증이 되지 않는다.
7. 캐시 키가 상세해도 인가를 대신하지 않는다. graph 권한/폐기 epoch가 바뀌면 캐시·witness·proposal을 재평가하고, 전역 graph pointer와 학생 action 승인 사이 경주도 검증해야 한다. 완전한 timing 비간섭을 이 문서만으로 보장하지 않는다.

## 실현 가능한 전체 구현 DAG — worker 보완 제안

실제 파일은 후속 리드가 소유권을 배정할 때 확정한다. 아래 경로는 **새로 만들 후보**이며 현재 존재하거나 구현됐다는 뜻이 아니다. contracts/통합 지점은 리드 한 소유자가 담당하고 각 adapter·엔진·인가·action·화면·검수를 독립 Orca Codex 작업트리로 분리한다. 나열 순서대로 혼자 하는 계획이 아니다.

| 작업 | 의존 | 소유 후보/납품 | 먼저 실패시킬 검사와 통과 조건 |
| --- | --- | --- | --- |
| D0 전체 census | 없음 | `scripts/ontology/census/`; 현재 지원 원천 family 레지스트리·유한 ID/판 manifest·분모표 | adapter 하나 빠짐/중복/격리 은닉을 RED로. 실제 읽기 권한이 있는 담당자가 각 분모·기준시각·해시를 재현 |
| D1 신분·계약·의미 모델 | 없음, D0와 대조 | `src/contracts/mathOntology*`, `ontology/model/`; entity/version/assertion/provenance/직교축·lifecycle, 선언 OWL 프로파일 | 제목 동치/판 혼합/후보→승인 자동 승격/허용 밖 공리를 거절. CQ/positive·negative entailment 고정 |
| D2a~e 전원천 adapter 병렬 | D1, 최종 D0 | `src/lib/math-ontology/adapters/{curriculum,concept,generated,bank,textbook,learning}/`; 각 모집단·계보·eligibility | 기존 stable ID/order/정의·assessment 분리. 생성 family/version/실제 instance 분모분리. 모든 원천 누락·orphan를 보존하고 private 행 투영은 인가 후 수행 |
| D3 실제 엔진·shapes·proof | D1 | `ontology/shapes/`, `scripts/ontology/engine/`; pinned owlrl+pySHACL, 지원구문표, target coverage, 추적 가능한 witness | 실제 엔진 positive/negative·위반/target 누락/미지원 reject. asserted data와 closure 검증의 순서/대상 명시. 인용 witness가 없으면 제외·집계 |
| D4 후보/검수/게시 저장 | D1,D3; 전체 적재 D2 | `src/lib/math-ontology/review/`, migration 초안; 후보→격리 SHACL→출처/의미 검수→별도 관계승인→immutable release | 권한 없는 관계 게시/판 byte 교체/잘못된 검증보고 해시/검수 후 내용 변경을 거절. 과거 결과를 당시 source/model/shapes/rules/engine/review/closure/proof로 재현 |
| D5 runtime 실제 RDF 질의/shape | D1,D3; 실제 release D4 | `src/lib/math-ontology/runtime/`; 실제 RDF/JS SPARQL·지원 SHACL Core·artifact 로딩/검증 | shape/query 미지원·publish/runtime 버전 불일치 fail closed. Node/Vercel에서 기능·크기·지연·cold start 실측 후 배치 결정 |
| D6 인가·overlay·GraphRAG | D2 learning,D5 | `src/lib/math-ontology/access/`, `retrieval/`; 권한별 partition, 요청 overlay, bounded hop/fanout, frontier 실제 SHACL, provenance packet | foreign node/edge/premise/cache/vector/에러·prune 수량을 바꿔도 허용 관측이 같음. 최신 인가/폐기·기록/graph 변화 거절. draft/미추적/위반은 trusted evidence에서 제외 |
| D7 typed AI 후보 | D1; 실제 통합 D6 | `src/lib/math-ontology/proposals/`; 근거 선택·관계/계획 후보·모델 실패/usage 원장 | ID 일치지만 무관/미지지인 근거·숨어 있는 후보 확정·잘린 JSON·과잉 기권 반례. 새 draft만 만들며 학생 학습 writer 직접 접근 없음 |
| D8 기존 action transaction seam | D1, D0와 DB 초안 대조 | `src/lib/math-ontology/actions/`; 기존 course-plan 검증/동작 재사용, canonical preview/payload, CAS+승인소비+unique receipt+durable audit/outbox 같은 tx | replay/동시호출/응답유실/no-op/실패/bytes 변조/권한철회/학생이동/graph 교체 및 모든 tx failpoint. 한 durable 결과 또는 완전 rollback. 외부 side effect exactly-once 주장 없음 |
| D9 action 승인·복구·feedback | D7,D8 | `approval/`, `feedback/`, `outbox/`; preview→명시승인→최신 재검증 실행→결과→이후 descriptive observation | 변경된 args/evidence/graph로 승인 재사용 불가. crash 전후 승인/학생상태/receipt/audit 정합, 복구 중복 없음. 실패/no-op도 결과 보존하고 FSRS·채점·숙달·인과로 변환 안 함 |
| D10 화면·커버리지 | D1로 Wire 준비; 통합 D4,D6,D9 | `src/components/math-ontology/` 후보; 기존 workspace 진입과 full explorer/검수queue/preview/승인·실행/결과/분모 | D07 Wire→사용자선택→Hi-fi→선택. 모든 상태가 실제 backend에 연결. 후보/격리/unknown/미검수/구버전/stale/실패/no-op과 재현 가능 표시. 리드 단일 browser lease |
| D11 독립 통합·교육콘텐츠 원장 | 각 완성 계약부터 병렬, 최종 D10 | 별도 adversarial/integration 작업트리 및 review ledger | 실제 권한 helper 비교, DB tx failpoint/concurrency/replay, v1/v2 frozen parity·학생 reader floor, model 의미반례. 공식/관계 미검수 수치를 기술 통과와 분리. maxWorkers3 |
| D12 rollout·운영 증거 | D11; 필요한 UI/DB 결정 완료 | 리드 통합·build·배포만 | 새DB dry-run/수치/rollback 준비 뒤 필요한 운영적용 결정; reader→writer. fresh fetch→원격 통합→정상 push→정확 SHA Vercel 및 운영 확인 |

D0와 D1은 독립 시작하며 D2 각 원천, D3 엔진, D8 action seam, D10 Wire 준비는 계약이 정리되는 대로 병행 가능하다. D4/D8의 DB 초안·정합 시험과 독립 backend는 운영 적용 결정 대기 중에도 진전시킨다. UI/DB 결정은 전체 목표의 실제 이행 순서이며 read-only 축소 근거가 아니다. 변경 종류별 정확한 reader floor는 실제 additive schema가 정해진 뒤 기록해야 하며 과거 floor를 낮추지 않는다.

## 리드 최종 채택/미채택

리드는 최종 JSON 전체를 읽고 외부 `lead-consult-decisions.json`으로 판단을 분리했다(`msg_75bece174c0f`). 실제 OWL/SHACL, 전원천, 권한별 GraphRAG, witness, 관계/action draft, 원자적 승인 실행, descriptive feedback의 방향은 채택했으며 단일 basisKind, 개발 credential 규칙의 제품 복사, ID membership만의 의미검증, 정적 CI-only 출판은 채택하지 않았다. 추가 모델 요청 없이 이 결정과 원응답을 구분해 납품하라는 지시를 따랐다.

특히 CI 또는 Python publish는 실행 배치의 후보일 뿐이다. 앱의 새 관계 승인→내구 job→실제 compile/SHACL/추론 및 proof 검증→immutable version 게시→runtime 활성화 및 실패복구가 연결돼야 한다. 개발자가 수동 CI를 돌려 정적 artifact를 올리는 것만으로 full 목표를 충족하지 않는다. private Python service 등 실제 배치 대안은 리드의 별도 architecture 조사와 실증 결과로 결정한다. 위 D4는 이 출판 loop를 포함하도록 구체화해야 하며 job 실패/재시작, 중복 실행, 구판 pointer 경주도 검증한다.

## 결정권과 다음 통합에 남기는 것

- 리드가 우선 실증할 것: publish를 CI에서 하고 runtime은 Node로 두는 안의 실제 지원 shape/query·엔진 프로파일·witness/성능 표, 기존 course-plan action이 공유할 수 있는 transaction seam. 서비스/별도 저장소가 필요하면 결과를 비교한 뒤 선택한다. 라이브러리 이름만으로 배포 가능하다고 확정하지 않는다.
- 원장에게 필요한 선택: 실제 D07 Wire/Hi-fi, 관계 게시 권한(원장 전용 또는 명시 위임 capability), dry-run·영향 수치·rollback이 준비된 새DB 운영 적용. 기존 action 승인과 관계 게시권한은 분리한다. 이 조사 자체는 제품 쓰기나 운영 DB 적용 승인이 아니다.
- 콘텐츠 담당에게 남는 것: 공식 교육과정 원문/판/근거 대조와 관계별 검수. 기존 186간선과 새 AI 후보를 구별해 역사·원문·검수 버전을 보존하고, 등록이 끝나도 미검수/미확인 공식 연결을 열린 수치로 납품한다.
- 통합 완료 판정: 기술 기능이 앱에 연결돼 검증됐는지와 교육콘텐츠/관계/공식기준 검수가 얼마나 남았는지를 따로 보고한다. 기술 미완료를 교육 검수 잔고로 가리거나 그 반대로 표현하지 않는다.

이 worker는 문서와 외부 협의 증거만 납품한다. 제품 시험·build·브라우저·공유DB·운영 검증을 실행하지 않았으므로 해당 항목의 합격을 주장하지 않는다. 보고서의 작업 범위·공백·해시/JSON/요청 횟수/단계별 판정만 검사하고, 제품 구현과 main 통합·배포는 리드 후속 소유다.
