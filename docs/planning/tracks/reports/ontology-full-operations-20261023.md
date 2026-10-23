# 정식 온톨로지 운영 계층 · 교사 작업실

기준: `origin/main` `34742b2f02456930d911e60a69ee020ccee56d64`. 이 보고는 정식 전원천 RDF/OWL/SHACL·GraphRAG 목표의 **운영 계층**을 다룬다. 4소단원 또는 읽기 전용으로 완료 조건을 바꾸지 않았다. 엔진·원천·모델 판단 생산자는 해당 worker 소유이고, 리드가 통합·실제 모델·브라우저·빌드·운영 검수를 담당한다.

현재 상태는 통합 검수용이다. 이 worker는 공유 DB에 migration을 적용하거나 운영 학생 기록을 쓰지 않았고, 모델 호출·앱 서버·브라우저·빌드·push를 실행하지 않았다. 기능은 `MATH_ONTOLOGY_OPERATIONS=on`에서만 열린다. 기본 off는 새 표를 조회하기 전에 503으로 닫는다. 실제 운영 활성화와 전체 납품 완료를 주장하지 않는다.

## 구현과 경계

| 경로 | 실제 동작과 보존 조건 |
|---|---|
| 교사 작업실 | 사용자가 선택한 B 독립 작업실 + H3 단계별 근거. 기존 Workroom CSS·Pretendard·PickerDialog·MathText를 재사용한다. 짧은 요청, 결과, 근거 경로, 구체적 diff, 한 번 확인이 기본이다. 원천·검증·감사는 펼쳐서 본다. |
| 학생 연결 | 현재 `student:read` 범위로 읽는다. `progress:write`가 없는 읽기 가능 교사도 연결할 수 있다. 계획 준비·승인·실행에는 기존 쓰기 권한이 별도로 필요하다. |
| 근거 봉인 | 실제 닫힌 질의와 SHACL/증명 검사, 실제 학생 원천 읽기를 같은 DB tx에서 수행하고 서버가 opaque snapshot ID를 만든다. 원천 객체는 source worker의 WeakMap tx 바인딩도 확인한다. 관찰 asOf는 고정하고 권한 시계는 새로 읽는다. |
| 계획 제안 | args/source/evidence/preview/context 각각의 canonical bytes와 해시, 서버 확인 graphVersion, 학생 revision, 만료, actor/target을 봉인한다. 그래프 이름이나 ID membership만으로 교육적 추천의 진실을 주장하지 않는다. |
| 승인·실행 | 현재 계정·토큰 version·관리 계정/지점 lease·소유권·수강·capability를 다시 확인한다. approval 소비 + 기존 SRS CAS 전이 + receipt + 필수 audit + outbox + 상태를 같은 실제 DB tx에 쓴다. |
| 기존 SRS | `serverStore.ts`는 수정하지 않았다. `srsStateTableIn(tx)`와 `changeSrsState`를 그대로 같은 tx에서 사용한다. 기존 `setCoursePlan` 및 daily journey/expedition 전이를 사용하며 같은 args는 원래 상태를 돌려 configuredAt/revision/journey를 바꾸지 않는다. 직접 교사 endpoint, FSRS, 학생 reader floor는 변경하지 않았다. |
| 결과 복구 | 실행 응답이 끊긴 뒤 같은 approval/execute를 다시 보내면 현재 권한 확인 후 같은 영수증을 반환한다. 학생 기록은 한 번만 바뀐다. no-op도 별도 영수증과 감사 기록을 갖는다. |
| outbox | 실제 앱 소비자가 stable outbox ID로 내부 교사 이력을 중복 제거하고 lease generation으로 fence한다. 외부 메시지는 보내지 않는다. execute 이후 best effort로 전달하며 실패해도 이미 commit된 receipt/audit를 취소하지 않는다. 명시적 resume API가 있다. 외부 exactly-once를 주장하지 않는다. |
| feedback | 실제 보존된 첫 풀이 중 action commit **이후**의 관찰을 현재 scope에서 읽는다. 독립 정답/오답, 제외를 별도 집계하고 immutable descriptive feedback으로 저장한다. 탐험·fading의 날짜 집계를 시간 있는 첫 풀이로 재구성하지 않으며 인과·숙달·효과를 주장하지 않는다. |
| 관계 초안 | 일반 HTTP 작성은 `authored`로 기록한다. 실제 AI 제안은 실제 provider receipt, 반환 텍스트 해시, 정확한 candidate/evidence 해시, actor/token version, 만료를 server-only model run에 봉인한 `draftModel`만 사용한다. synthetic fixture는 실제 AI 생산 증거가 아니다. |
| 관계 검토 | 실제 격리 SHACL와 현재 source/endpoint binding을 확인한다. 사람의 source/meaning 검토와 expected revision/validation hash를 요구하며 draft→validated→approved/rejected→retired 이력을 남긴다. 승인과 활성 게시를 구분한다. 폐기는 다음 게시에서 제외되기 전까지 현재 지식 판의 즉시 삭제로 표시하지 않는다. |
| 게시 | 고정 배포 catalog의 full-source base와 승인된 관계 delta만 서버에서 조립한다. source authority 승인과 durable job 생성은 같은 tx다. 실제 컴파일은 tx 밖에서 실행하고, **exact frozen input**에 대한 `verifyOntologyCompiledArtifactForInput`으로 누락/추가 delta·native premise·전체 반환 proof를 검증한 뒤 generation CAS로 활성화한다. |
| 게시 회복 | DB lease는 300초이고 Node/Python의 55초 요청 인증 시작 창과 구분한다. queued/failed/만료 lease를 현재 publisher 권한으로 재개한다. stale은 다시 준비하도록 한다. UI의 게시 결과 확인과 이력의 pending job이 같은 ID를 사용한다. 승인·작업은 durable하나 무제한 자동 scheduler를 주장하지 않는다. |
| 게시 철회 | 명시적 preview/확인 후 active pointer/generation, release와 해당 source authority의 revokedAt, 감사 이력을 같은 tx로 갱신한다. 과거 artifact와 승인은 보존한다. 철회된 판에 묶인 새 조회·실행은 current graph gate에서 거절한다. |

graphVersion은 서버가 확인하는 opaque identity다. `sourceSnapshotHash`, `argumentHash`, `evidencePacketHash`, `previewHash`, `contextHash`를 같은 종류의 identity로 혼용하지 않는다. 운영 canonical은 한정된 `tm-json-1`이며 RFC 8785 전체 구현이라고 부르지 않는다. 숫자형 문자열 key 순서, 비유한 수/-0/unsafe integer, getter, cycle, 깊이와 크기를 검사한다.

`auth.ts`의 최소 additive seam은 리드 승인 `msg_db25731b6018`에 따라 JWT의 expected sessionVersion을 typed session.user로 전달한다. 인증 뒤 DB의 최신 version을 복사해 기대값으로 삼지 않는다. 실제 NextAuth 쿠키·legacy version zero·version 변경 로그아웃 회귀로 검사했다.

## 실제 검증과 반례

외부 evidence root는 `/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/operations/`이다. 학생 자료·정답·문항 본문을 모델로 전송하지 않았다. 이 보고에는 비밀 헤더·인증 값이 없다.

- `checkpoint-b1-b2-b3-final.txt`: 격리 PostgreSQL + Request + 실제 NextAuth + 실제 React + source server clock 묶음 14파일 **70시험 PASS**. 별도 `publisher-actual-http-first.txt`는 합성 inline 입력을 실제 durable publisher → Node HMAC → 실제 Python OWL/SHACL → 제어된 65초 지연 → 활성화 1시험 PASS(67.05초). 각 PID/port/lease/종료 영수증은 `postgres-run-*.json`, `publisher-python-http-*.json`이다.
- `operations-cleanup-77.txt`: 초기 게시/철회·이력·sealer 최종 쓰기 만료 rollback, MathText/operator UI와 staging writer gate까지 16파일 **77시험 PASS**. 실제 65초 HTTP 검사는 앞선 단독 통과를 유지했다. `typecheck-operations-cleanup.txt`는 전체 TypeScript 진단 0, `eslint-operations-cleanup.txt`와 diff 검사도 0이다. 동일 시험 재실행을 새 시험으로 더하지 않는다.
- no-op, 동시 8승인/실행의 영수증 하나, 결과 재전송, args/seal/source/evidence/graph tamper, 현재 학생 revision·계정·메뉴·이동/수강·관리 lease 철회, 실제 별도 연결의 잠금/철회 경합, 단계별 5 failpoint, 실제 audit constraint 실패 rollback을 검증했다. 종료된 lease generation의 outbox ack도 거절한다.
- 독립 B1: 잠금 대기 후 이전 시각을 쓰는 결함을 인정하고 clock 함수 및 근거 검사/마지막 mutation 뒤 권한 재검사를 추가했다. 실제 PG `pg_stat_activity`의 Lock을 확인한 뒤 clock 만료 negative/정상 positive, 마지막 outbox write 뒤 만료 시 전체 rollback이 `clock-lock-GREEN.txt`에서 통과했다.
- 독립 B2: self-consistent zero-delta artifact를 다른 승인 delta의 출력으로 받아들이는 결함을 인정했다. formal worker의 exact-input verifier를 production callback에 필수로 연결했다. 엔진이 반환한 identity 자체와 source 문자열만 비교하는 이전 경로는 제거했다.
- 독립 B3: native/private source 조회의 await 사이 lease 만료를 인정했다. 리드가 이 worker에 지정한 source server 3파일만 수정해 fresh authorization clock 및 최종 export guard를 넣었다. `source-clock-first.txt` 8시험은 실제 native 정의 positive, awaited managed read 중 만료, shard 읽기 뒤 만료, private source export 전 만료를 포함한다. 관찰 asOf는 보존했다.
- sealer에서도 같은 captured-Date 결함을 추가 수정했다. default/injected clock 함수와 event insert 후 same-tx guard를 사용한다. 독립 검수의 원본 negative는 보존되었고, 실제 PG insert 후 만료 시 rollback 회귀도 추가했다.
- root의 실제 React 브라우저 검수는 1440/390의 상태·재시도·권한·stale·유실 결과·중복·키보드·뒤로·맥락 취소를 포함한다. root가 22 기본/키보드 case 및 MathText/nonplan 4 case 통과를 보고했다. 이는 합성 fixture 검수이며 실제 API/DB/모델 브라우저 검수와 구분한다. fixture·실제 앱 서버·브라우저 lease는 root 소유다.

시험 파일들이 하나의 global active pointer를 공유하므로 QA 파일은 직렬화했다. 제품 동시성은 시험 내부의 실제 여러 Prisma 연결로 검증하며 maxWorkers 3을 넘지 않는다. 전체 61시험 중 1건이 타 fixture의 정상 generation 교체로 STALE을 받은 중간 실패는 `operations-model-history-clock.txt`에 보존했다. 방어 조건을 완화하지 않고 시험 간 publication을 격리했다.

## DB 적용 검토물

`prisma/drafts/ontology-full-operations-20261023/`의 `draft.sql`, `preflight.sql`, `rollback.sql`, README가 적용 전 검토물이다. Prisma에는 기존 모델의 필드를 바꾸지 않고 14개 분리 표만 추가했다.

| 격리 PostgreSQL 18.1에서 확인한 영향 | 값 |
|---|---:|
| 새 표 / 컬럼 / 인덱스 | 14 / 139 / 30 |
| FK / CHECK / 함수 / trigger | 7 / 11 / 3 / 9 |
| 빈 저장소 전체 크기 / 인덱스 크기 | 344,064 / 245,760 bytes |
| 기존 표 컬럼·기본값 catalog 변경 | 0 |
| 새 표 RLS / browser 권한 | 모두 on / anon·authenticated 직접 권한 없음 |
| 동일 DDL 재실행 | 기존 namespace precondition에서 거절 |
| 빈 상태 rollback 뒤 남은 표 | 0 |
| 빈 rollback 후 재적용 | PASS |

이 수치는 PostgreSQL 18.1의 빈 격리 저장소 실측이다. 운영 17.6의 절대 용량·처리량 예측이나 실사용 행 수 추정으로 일반화하지 않는다. 한 action의 기본 durable 행은 proposal/approval/receipt/audit/outbox 각각 1개와 evidence snapshot이며, relation review/model run/review history, compile job/release/chunk는 사용한 경로에 따라 추가된다. 실제 volume, 보존 기간, 백업 용량은 운영 계획에서 정해야 한다. post-QA 행 수/크기도 최신 `postgres-run-*.json`에 기록한다.

DDL은 BEGIN/COMMIT, 3초 lock timeout, 60초 statement timeout, advisory tx lock, namespace 사전 조건을 가진다. 부분 상태를 `IF NOT EXISTS`로 숨기지 않는다. rollback은 **어느 새 표에든 데이터가 있으면** 거절한다. 사용 후에는 writer off → 기록 보존/내보내기 → 별도 복구 결정을 거친다. source/receipt/audit/history를 버리는 rollback은 승인되지 않았다.

리드는 실제 목표 PG17.6에서 정확한 6e37 SQL을 transaction 안에서 실행해 catalog/RLS/browser privileges를 검사하고 ROLLBACK했다고 보고했다(`ROOT/db-draft-rollback-dryrun.json`). 이는 이 worker의 실행이 아니며 영구 migration 적용도 아니다. 사용자 원문·학생 payload read/write는 없었다고 리드가 확인했다. 실제 executor/DB 동일성·백업·배포 SHA·승인과 최종 SQL hash 대조 후에만 영구 적용한다.

Reader 먼저 순서는: writer off에서 새 schema-aware 서버/Prisma reader 준비 → 검토된 additive SQL 적용 → 실제 서비스 role/RLS·기존 학생 API·reader floor 보존 확인 → 정확한 배포 검증 → writer 활성화다. 기존 학생 JSON에는 새 field를 쓰지 않아 새 학생 reader floor를 만들지 않는다. 이전 floor 아래로 내려가는 rollback 근거도 되지 않는다.

## 남은 통합 인수

운영 계층의 개별 격리 통과를 전체 완료로 부르지 않는다. 실제 formal AI producer의 provider receipt → semantic validation → sealed model draft, 전원천/학생 private join의 현재 권한 경계, 실제 앱의 초기 게시·검토·승인·실행·feedback·이력·폐기·철회·복구를 root가 독립 검수해야 한다. 실제 모델 held-out 결과, 공식 기준 대응/관계의 검수 분모, 교육적 효과 미확인, production migration·build·fresh-fetch push·정확 SHA 배포/운영 검증은 해당 소유자의 증거와 함께 인수해야 한다.

운영 UI에는 펼친 원천 맥락의 이력, publisher의 초기 게시 준비/활성 판 철회 준비, 관계 이력의 다시 검토→두 endpoint 실제 표기→승인/다음 게시에서 제외하는 폐기 확인을 연결했다. 실제 권한 검사는 서버가 한다. 모델 receipt는 root `ModelApiReceipt`를 그대로 사용하며 `responseTextHash`는 반환 텍스트의 해시다. 원본 HTTP 바이트 해시라고 부르지 않고, provider 미보고 model/usage/id는 null로 보존한다.

검토 중 발견한 명시적 미확정 정책: `support=unknown/missing` 후보가 사람 승인을 받아도 엔진은 direct/indirect만 premise로 사용한다. 승인·게시 성공과 실제 그래프 반영이 조용히 달라지지 않도록, 근거 불충분/배포 제한 후보는 승인 거절·미확인 상태로 유지하고 자동 support 승격을 금지하는 기준을 리드에 제안했다. 정책 결정을 기다리는 동안 이 건을 완료로 표시하지 않는다.

정책을 임의 확정하지 않는 독립 조치로 게시 준비에 사람 승인 총수, 실제 질의 전제 조건 충족 수, 근거/배포 조건에 따른 제외 수를 분리했다. 이 수는 봉인된 review state hash의 정확한 행에서 산출하며 기존 persisted preview v1 형식은 바꾸지 않는다. `support-unknown-actual-engine.json`은 실제 inline OWL/SHACL에서 승인·게시 입력 2개 중 전제로 쓰인 관계가 1개인 반례다. 또한 최초 근거 snapshot은 RepeatableRead로 읽어 여러 원천 행의 일관성을 보존한다. 기존 승인/실행의 동시 idempotency 경로를 RepeatableRead로 바꾸지는 않았다.

staging machine API도 writer off에서 새 표를 조회하지 않으며 Node/Python과 같은 명시적 MATH_ONTOLOGY_ENGINE_SECRET 우선순위를 사용한다. 만료된 미실행 제안은 이력에서 다시 준비가 필요한 것으로 표시한다. 철회/제거된 판의 개체 표기를 찾을 수 없는 과거 승인 관계는 **미확인**으로 표시하고 폐기만 준비할 수 있게 해 복구 경로가 막히지 않도록 했다. 이 fallback은 새 승인이나 근거 승격을 허용하지 않는다.

이 worker는 이 항목들을 읽기 전용/경량 시범으로 대신하거나, 아직 미확인인 교육 콘텐츠·관계를 공식 확정으로 표시하지 않는다.
