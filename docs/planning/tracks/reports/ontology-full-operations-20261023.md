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

root의 실제 Next 390px 검수에서 하단 11개 메뉴가 각 33px로 줄어 글자가 겹친 결함을 인수했다(`msg_ce4db8851bcd`). 모바일에만 최소 76px implicit grid column과 메뉴 내부 가로 scroll을 적용했고 조작은 최소 44px를 유지한다. 실제 `WorkspaceNavigation` presentation을 얇게 분리해 UnifiedWorkspace와 fixture가 같은 DOM/CSS를 사용한다. 현재 메뉴가 가려진 경우 가로 메뉴만 이동하고 본문은 스크롤하지 않는다. 기존 prefetch·계정별 권한·제품 전환은 유지한다. 실제 셸의 권한/로딩/카트 및 nav 회귀 4파일 89시험이 `mobile-navigation-shell-GREEN.txt`에서 통과했다. 기존 4실패는 이미 추가한 ontology의 SRS 권한 상속을 이전 기대 목록에 반영하지 않은 것이었고, 새 상속 positive/negative를 추가했다. jsdom은 조작/이동을 검증하며 최종 390/768/1440 기하 검수는 root의 실제 브라우저 증거로 인수한다. fixture 서버를 이 worker가 실행하지 않았다.

후속 root 실측(`msg_faed8e818422`, root pin 5bc)은 폭 76px·높이 53.8px·문서 가로 넘침 0을 확인했지만, 데스크톱에서 390px로 바꿀 때 active 지식 메뉴가 x764에 남는 결함을 찾았다. `view/identity`만 보던 effect를 수정해 breakpoint change, window resize, 메뉴/active의 scoped ResizeObserver, font loadingdone 때 가로 영역을 다시 확인하고 listener/observer를 해제한다. `mobile-breakpoint-RED.txt` → `mobile-breakpoint-GREEN-final.txt` 실제 셸 회귀 4파일 **91시험 PASS**, 전체 TypeScript/ESLint/diff 진단 0이다. 87시험 운영 묶음 뒤 바뀐 nav에 대한 별도 집중 검증이며, root의 후속 실제 기하 판정과 구분한다.

외부 evidence root는 `/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/operations/`이다. 학생 자료·정답·문항 본문을 모델로 전송하지 않았다. 이 보고에는 비밀 헤더·인증 값이 없다.

- `checkpoint-b1-b2-b3-final.txt`: 격리 PostgreSQL + Request + 실제 NextAuth + 실제 React + source server clock 묶음 14파일 **70시험 PASS**. 별도 `publisher-actual-http-first.txt`는 합성 inline 입력을 실제 durable publisher → Node HMAC → 실제 Python OWL/SHACL → 제어된 65초 지연 → 활성화 1시험 PASS(67.05초). 각 PID/port/lease/종료 영수증은 `postgres-run-*.json`, `publisher-python-http-*.json`이다.
- `operations-cleanup-77.txt`: 초기 게시/철회·이력·sealer 최종 쓰기 만료 rollback, MathText/operator UI와 staging writer gate까지 16파일 **77시험 PASS**. 실제 65초 HTTP 검사는 앞선 단독 통과를 유지했다. `typecheck-operations-cleanup.txt`는 전체 TypeScript 진단 0, `eslint-operations-cleanup.txt`와 diff 검사도 0이다. 동일 시험 재실행을 새 시험으로 더하지 않는다.
- `native-flow-core.txt`: 실제 전원천 native base 게시부터 scoped snapshot·계획 승인/실행·outbox 이력·feedback까지 연결한 시험을 더해 17파일 **78시험 PASS**다. 이 추가 시험은 concrete native input builder, 실제 Node/Python compiler transport, exact-input verifier, 활성 판 runtime을 사용하고 학생·계정만 합성한다. 명시적 원천 연결 3단계와 파생 shortcut을 포함한 실제 최단 2홉 proof를 각각 확인했다. 처음 경로 길이를 3으로 고정한 시험 실패는 `native-flow-first.txt`에 보존했다. `native-flow-typecheck.txt`, `native-flow-eslint.txt`는 진단 0이며 child Python 및 격리 PG 종료 영수증을 남겼다.
- `support-policy-core.txt`: 근거/배포 gate와 UI 거절 사유, 실제 전원천 관계 검토→delta 게시까지 포함한 최신 묶음은 18파일 **81시험 PASS**(76.10초)다. `support-policy-typecheck-final.txt`, `support-policy-eslint.txt`와 diff 검사는 진단 0이다. 앞선 78시험이나 단독 9시험을 여기에 합산하지 않는다.
- `reprepare-ui-core.txt`: 전임 후보를 보존한 재준비 API/UI와 실제 공용 navigation까지 포함해 최신 운영 묶음 19파일 **87시험 PASS**(86.51초)다. 실제 full-source delta 게시 시험도 포함한다. 별도 실제 셸 회귀는 4파일 89시험 PASS이며 겹치는 nav 시험을 합산하지 않는다. 최신 전체 TypeScript·해당 ESLint·diff는 진단 0, 격리 PG/Python 종료를 확인했다. 실제 Next/브라우저·모델 생산자 검수는 root 증거로 구분한다.
- no-op, 동시 8승인/실행의 영수증 하나, 결과 재전송, args/seal/source/evidence/graph tamper, 현재 학생 revision·계정·메뉴·이동/수강·관리 lease 철회, 실제 별도 연결의 잠금/철회 경합, 단계별 5 failpoint, 실제 audit constraint 실패 rollback을 검증했다. 종료된 lease generation의 outbox ack도 거절한다.
- 독립 B1: 잠금 대기 후 이전 시각을 쓰는 결함을 인정하고 clock 함수 및 근거 검사/마지막 mutation 뒤 권한 재검사를 추가했다. 실제 PG `pg_stat_activity`의 Lock을 확인한 뒤 clock 만료 negative/정상 positive, 마지막 outbox write 뒤 만료 시 전체 rollback이 `clock-lock-GREEN.txt`에서 통과했다.
- 독립 B2: self-consistent zero-delta artifact를 다른 승인 delta의 출력으로 받아들이는 결함을 인정했다. formal worker의 exact-input verifier를 production callback에 필수로 연결했다. 엔진이 반환한 identity 자체와 source 문자열만 비교하는 이전 경로는 제거했다.
- 독립 B3: native/private source 조회의 await 사이 lease 만료를 인정했다. 리드가 이 worker에 지정한 source server 3파일만 수정해 fresh authorization clock 및 최종 export guard를 넣었다. `source-clock-first.txt` 8시험은 실제 native 정의 positive, awaited managed read 중 만료, shard 읽기 뒤 만료, private source export 전 만료를 포함한다. 관찰 asOf는 보존했다.
- sealer에서도 같은 captured-Date 결함을 추가 수정했다. default/injected clock 함수와 event insert 후 same-tx guard를 사용한다. 독립 검수의 원본 negative는 보존되었고, 실제 PG insert 후 만료 시 rollback 회귀도 추가했다.
- root의 실제 React 브라우저 검수는 1440/390의 상태·재시도·권한·stale·유실 결과·중복·키보드·뒤로·맥락 취소를 포함한다. root가 22 기본/키보드 case 및 MathText/nonplan 4 case 통과를 보고했다. 이는 합성 fixture 검수이며 실제 API/DB/모델 브라우저 검수와 구분한다. fixture·실제 앱 서버·브라우저 lease는 root 소유다.

시험 파일들이 하나의 global active pointer를 공유하므로 QA 파일은 직렬화했다. 제품 동시성은 시험 내부의 실제 여러 Prisma 연결로 검증하며 maxWorkers 3을 넘지 않는다. 전체 61시험 중 1건이 타 fixture의 정상 generation 교체로 STALE을 받은 중간 실패는 `operations-model-history-clock.txt`에 보존했다. 방어 조건을 완화하지 않고 시험 간 publication을 격리했다.

root의 실제 실패 화면 검수(`msg_3275c41cd403`)에서 오류 아래 내용 없는 결과/다음 작업 카드가 남는 것을 인수했다. 첫 준비의 loading/error에는 접근 가능한 상태/오류를 유지하며 빈 결과 면과 실행할 일 없는 다음 작업 면을 렌더하지 않는다. 이전 결과가 있을 때 복귀 동작은 남기고 현재 권한 철회 시에는 기존처럼 private 내용을 걷는다. `empty-failure-RED.txt` → `empty-failure-GREEN.txt` React/HTTP 2파일 12시험, 전체 TypeScript/ESLint/diff 진단 0이다. 엔진·DB 전이는 이 수정에서 바꾸지 않았다.

root의 후속 실제 판정(`msg_81455cbeeda4`, 통합 f9a6a2ba)은 새 local tab·visible·실제 390px media 상태에서 bounded 400ms 후 nav scrollLeft 469, 현재 메뉴 left 295/right 371로 client 375 안에 보이며 문서 넘침 0임을 확인했다. 초기 화면의 비활성 next card도 없다. 앞선 즉시 eval/HMR·정지된 background rAF 진단은 제품 실패로 세지 않는다. 이는 root의 실행 증거이며 이 worker의 브라우저 실행이 아니다. 전체 1440→390→768→390 PNG matrix와 실제 AI producer/교육적 검수는 root의 인수 범위에 남는다.

독립 B4(`msg_2e618c6726fe`, root 승인 `msg_f2f75b3f9c59`)는 최종 게시 tx가 scope/job 잠금 전 시각으로 lease를 검사해 301초에도 게시하는 결함이었다. 원본 시험은 수정하지 않고 import root만 own으로 바꾼 외부 사본에서 2음성 RED → 4시험 GREEN을 확인했다(`operations/independent-b4/`). 잠금/행 읽기 뒤 fresh clock, source rebuild 뒤 deadline, 최종 activation/audit/auth await 뒤 실제 job의 state/generation/input/engine와 **원래 lease deadline**을 같은 tx에서 검사한다. published row가 leaseUntil을 비워도 원래 deadline은 최종 commit 전까지 유효해야 한다.

`publisher-lease-final-write-RED.txt`는 실제 격리 PG에서 마지막 event insert 뒤 301초에 published가 되는 원본 결함을 단독 재현한다. 수정 후 `publisher-lease-GREEN-final.txt` 3파일 **14시험 PASS**는 실제 PG scope 행 잠금 대기, release insert·최종 activation event 뒤 만료, 마지막 generation 변경에서 새 release/pointer/activation event를 rollback하고 audit/outbox 추가가 없음을 확인한다. 이미 commit된 queued/leased 이력은 보존한다. 정상 게시 후 301초의 재전송은 같은 판을 반환하며 컴파일 횟수는 1이다. 실제 E01 runtime/proof/SHACL artifact를 사용하되 compiler/clock은 합성 port로 명시했고 모델/공유 DB/실제 compiler IO를 호출하지 않았다. 최초 다중 RED의 잘못된 게시가 후속 fixture에 graphVersion 중복을 만든 로그와 첫 GREEN의 outbox relation-filter 오류도 원본을 보존했으며, 단독 RED와 최종 격리 GREEN으로 구분했다. 전체 TypeScript·해당 ESLint·diff 진단 0이다.

root의 후속 지시 `msg_029dce9da20a`에 따라 같은 유형의 deadline 경계 16묶음을 한 번에 점검했다. 경로별 TTL·최종 guard·replay 의미는 외부 `operations/deadline-audit.json`에 기록했다.

| 경계 | 최종 조건 |
|---|---|
| 계획 제안/근거 snapshot 발급·해결 | 현재 권한과 발급/사용 deadline을 마지막 await 뒤 검사 |
| 계획 승인/실행 | 새 승인은 마지막 approval/proposal 쓰기 후 expiry 검사, 실행은 기존 최종 proposal/evidence 경계 유지; 완료 receipt replay 우선 |
| 게시 preview/철회 preview | 잠금 뒤 fresh time, 새 authority/job 또는 철회/audit 마지막 쓰기 후 원래 preview expiry; 이미 기록한 성공 확인은 replay |
| compile claim/activation | fresh lease 발급과 final claim 확인; B4의 실제 generation/input/engine/deadline commit fence 유지 |
| model intake seal/draft/revision | 만료된 새 봉인/새 후보 금지; 새 후보의 최종 expiry guard 유지, 이미 만든 같은 후보의 replay는 intake TTL보다 우선 |
| outbox claim/ack/retry/history | 현재 행 lock/generation/원래 deadline을 쓰기 뒤 다시 검사; 만료 worker의 ack/retry는 rollback, primary receipt/audit 보존 |
| staging accept/read | signed expiry와 현재 job lease를 lock·chunk write·검증 뒤 재검사; published artifact의 역사 읽기는 허용 |
| durable 관계 검토/폐기·feedback | 새 TTL을 만들지 않는다. 현재 source/권한/revision·관찰 asOf 계약을 유지한다. |

`confirmation-deadlines-RED.txt`의 실제 격리 PG 10시험은 8실패/2정상 control로, 잠금 대기 중 게시 preview 만료, 마지막 authority/job·철회 audit·계획 approval·outbox history/ack·chunk 쓰기 만료 및 이미 만든 model 후보의 TTL 뒤 replay를 재현했다. 수정 후 10시험 GREEN이며 outbox claim/retry의 마지막 쓰기 만료 2종도 추가했다. 새 상태를 성공 처리하지 않고 같은 tx를 rollback하며, 실제로 완료한 결과의 재전송은 새 mutation으로 보지 않는다. generic outbox sink는 여전히 at-least-once이며 외부 효과를 DB rollback할 수 있다고 주장하지 않는다. 모델/교육/source/UI 정책과 기존 학생 floor는 바꾸지 않았다.

최종 `confirmation-deadlines-core-final.txt`는 실제 full-source delta·B1/B3/B4·추가 TTL 12종을 포함해 **21파일 107시험 PASS**(88.94초)다. 독립 B4 사본도 4/4 PASS를 유지했다. 전체 TypeScript·해당 ESLint·diff 진단 0과 격리 프로세스 종료를 확인했다. 직전 106/107 실행의 유일 실패는 기존 audit CHECK가 새 cohort의 보존된 과거 철회 이력까지 거절한 fixture 충돌이었다. 해당 confirmation ID의 새 audit만 실패시키도록 CHECK를 한정했고 실제 audit 실패/rollback 기대값은 유지했다. 중간 로그는 보존했다.

원천 포함 범위 버튼의 기존 AI 문장 질의는 정확한 모집단 집계를 보장하지 못하므로 root 지시 `msg_046decc96c88`에 따라 `source.coverage(signal)` → `GET /api/math-ontology/coverage` 직접 조회로 분리했다. 서버가 반환한 WorkspaceAnswer의 모집단/한계만 표시하고, 기존 요청 칸·접힌 원천 맥락은 보존한다. production source에는 coverage port가 항상 있으므로 실패 때 AI로 집계를 우회하지 않는다. port 없는 합성 fixture만 기존 질의 fallback을 유지한다. `coverage-direct-ui-RED.txt` → `coverage-direct-ui-GREEN.txt` React/실제 HTTP source 2파일 **14시험 PASS**는 AI run/confirm 호출 0과 직접 GET·입력 보존을 확인한다. 실제 승인된 원천의 결정적 집계/권한/라우트 구현과 실제 앱 인수는 formal/root 소유이며 합성 fixture 수치를 실제 모집단으로 보고하지 않는다.

root의 실제 데스크톱 검수 `msg_e34a4ec2cf33`에서 자료 제작용 CLI 연결 판이 지식 작업실의 서버 AI 경로를 설명하는 것처럼 보인 문제를 인수했다. ontology view에서만 별개 DevAiStatusPanel을 숨기며 다른 수학/영어 메뉴·provider/settings·학생/인쇄 경로는 유지한다. `studio-panel-scope-RED.txt` → `studio-panel-scope-GREEN.txt` 실제 셸 4파일 **92시험 PASS**는 ontology에서 숨고 다른 수학 메뉴에서 다시 보이는 것을 확인한다. 추가 기술 안내나 키 설정 UI는 만들지 않았다. 이 묶음과 앞선 107/14시험을 합산하지 않는다.

root의 실제 production-mode 질의 반례 `msg_08bc38759772`에 따라 `retrieval/assist.ts`의 seed/frontier/proof 배분 부분만 추가 소유했다. 10b를 clean fast-forward한 뒤 기존 전원천 artifact·동일 정확 구절/의도·합성 model port에서 요청 정의가 packet에 없는 `retrieval-grounding-RED.txt`를 재현했다. 긴 일치 구절의 relevance를 namespace/identity 정렬보다 먼저 적용하고, 서로 다른 stable identity를 이름으로 합치지 않는다. 순위가 높은 seed와 incoming 문항을 교차 배분하며, 실제 closed query를 통과한 문항→정의 bridge를 먼저 보존한 뒤 노드별로 proof를 공평하게 배분한다. 다음 frontier도 이미 방문한 개체를 제외하고 생산 노드별로 나눠 단일 fan-out의 독점을 막는다.

frontier 8·3홉·개체당 neighbors 12·packet facts 30을 늘리지 않았고, source-specific 라벨/ID 예외나 unknown 승격은 없다. runtime/base/modelSelection/modelSchemas는 수정하지 않았다. `retrieval-grounding-GREEN-first.txt`는 정확 정의와 문항→정의·정의→단원 연결이 남는 실제 RDF/SHACL packet 및 broad collision/20 incoming/늦은 bridge 배분 4시험 PASS다. 기존 기대값을 바꾸지 않은 `retrieval-grounding-regression.txt`는 assist/selection/plan/private join/context까지 **9파일 30시험 PASS**, 전체 TypeScript·해당 ESLint·diff 진단 0이다. 실제 모델/provider/DB/browser/build는 호출하지 않았으며, 실제 모델 선택·최종 사용자 답의 적합성은 root/formal의 새 앱 인수로 검증한다.

## 실제 앱 출처·이력 문자열 표시 수정

root가 실제 앱 af9548b에서 URN·`model-packet`·`rdf-validate-shacl 0.6.5`가 자동 수식 추론으로 분해되고, 이력의 `26. 10. 23. 오후 8:17` 날짜 접두부가 사라지는 반례를 전달했다. 온톨로지 화면의 summary/title/note/details만 로컬 explicit-math 구간 분리로 표시한다. 일반 증거 문자열·URL·실제 줄바꿈·literal escape는 React 텍스트로 보존하고, 명시 수식은 기존 공용 MathText로 렌더링한다. 글로벌 OCR/MathText·source contract는 바꾸지 않았다. markdown 이미지 표기도 일반 문자열이므로 외부 이미지 요청을 만들지 않는다.

`provenance-detail-RED.txt`의 388/1440 폭 두 회귀와 `provenance-date-RED.txt`의 날짜 회귀는 기존 렌더러에서 실패했다. `provenance-detail-GREEN-final.txt`는 날짜 전체·URN·엔진/packet 식별자·실제 줄바꿈·명시 분수·외부 이미지 없음 및 기존 UI/API 흐름 **2파일 17시험 PASS**, 전체 TypeScript·해당 ESLint·diff 진단 0이다. 이 폭은 DOM fixture 경계이며 실제 브라우저 overflow 측정으로 주장하지 않는다. 합성 React fixture `?case=relation`에도 같은 식별자·날짜·분수를 넣어 root의 388/1440 직접 검수 대상으로 전달했다. 이 worker의 모델/API/브라우저/서버/build/공유 DB 실행은 없으며 최종 실제 앱 재검수는 root 소유다.

## 승인 결과와 준비 자료의 시점 구분

root의 실제 production e556 교사 검수에서 승인 receipt가 성공해도 보존된 준비 답의 후보/미게시 상태가 현재 상태처럼 보이는 문제와, 새 review 응답도 승인된 관계를 후보로 표시하는 결함을 전달받았다. e556을 clean fast-forward한 뒤 성공 receipt가 있는 경우에만 기존 coverage/근거에 `준비 시점의 범위`/`준비 시점의 근거`를 표시하고, 관계 실행 결과의 `현재 검토 보기`가 기존 review port로 명시 조회한다. 준비 답은 그대로 보존하며 자동 조회·모델 호출·클라이언트 승인/게시 상태 치환은 없다. 게시 준비 중과 결과 불명 상태는 기존 결과 확인 경로를 유지한다.

서버 수정은 `production.server.ts` review 응답의 둘째 step state 한 곳뿐이다. 저장된 state가 approved일 때 reviewed, 그 외에는 기존 candidate로 표시한다. 모델 제안 출처·교육적 효과 미확인 문구와 권한/검증/승인/게시 동작은 유지한다. `snapshot-current-review-RED.txt`는 실제 production review HTTP projection의 approved→candidate 오류와 성공 후 시점 표시 누락 두 회귀를 재현했다. GREEN은 UI/API/실제 review handler **3파일 23시험 PASS**로, 한 번의 명시 승인·자동조회 없음·준비 후보 보존·한 번의 현재 검토 조회·서버 approved/validated/rejected/retired 분기·게시 preparing/결과 불명 경로를 확인한다. 서버 시험의 인증·DB·서비스 ports는 합성이며 DB/모델/브라우저 실행 증거가 아니다. 전체 TypeScript·해당 ESLint·diff 진단 0이고 실제 production 후속 검수는 root 소유다.

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

검토 중 `support=unknown/missing` 후보가 사람 승인을 받아도 엔진은 direct/indirect만 premise로 사용하는 불일치를 발견했다. 리드는 실제 compiler 반례를 검토한 뒤 `msg_3bd704d0829d` 응답으로 unknown/missing 또는 distribution != allowed의 승인·새 게시 차단과 후보 보존, 자동 support 승격 금지를 확정했다. 승인 guard, 새 job enqueue, 과거 미실행 job 시작, native builder가 `EVIDENCE_INSUFFICIENT`로 거절한다. 이미 게시된 과거 결과의 replay는 보존한다. 실제 source/hash/endpoint/SHACL 검증과 current authorization은 별도로 계속 요구한다.

게시 준비에 사람 승인 총수, 실제 질의 전제 조건 충족 수, 근거/배포 조건에 따른 제외 수를 분리했다. 이 수는 봉인된 review state hash의 정확한 행에서 산출하며 기존 persisted preview v1 형식은 바꾸지 않는다. 이전의 미지원 승인 행이 있으면 제외 분모와 짧은 보류 사유를 보여주고 게시 확인 단추도 제공하지 않는다. HTTP 직접 confirm은 source authority·job 모두 rollback한다. `support-unknown-actual-engine.json`은 실제 inline OWL/SHACL에서 승인·게시 입력 2개 중 전제로 쓰인 관계가 1개인 반례다. `support-policy-RED.txt`는 unknown 후보가 실제 DB에서 승인되는 기존 결함을 재현한다. 수정 후 `support-policy-GREEN-first.txt`의 3파일 9시험은 근거 부족/배포 불허 4종 거절, 후보 bytes 보존·명시적 반려, 이전 미지원 승인 preview·enqueue/confirm 차단과 과거 게시 replay를 확인했다.

같은 GREEN 묶음의 확장 native-flow는 실제 원천에서 이미 증명된 구조 연결을 authored 후보로 재검토한다. 새 교육적·선수 관계를 만들지 않는다. 실제 SHACL → 사람 source/meaning 승인 → 실제 전원천 delta compiler → 새 활성 판 → scoped 근거/action/history/feedback까지 성공했다. 묶음 82.73초 중 시험 78.69초이며 zero-delta base 게시의 짧은 실행과 혼동하지 않는다. 실제 모델은 호출하지 않았다. genuinely unknown인 새 의미는 자동으로 indirect로 올리지 않는다. 실제 고정 triple witness 또는 새 검토 근거에 묶인 새 후보를 준비하는 생산자·전임 후보 이력 연결을 formal worker/root와 이어서 검수한다.

재준비의 server-only ABI는 `relations.draftModelRevision(actor, { previousReviewId, expectedPreviousRevision, assertion, evidenceRef, modelRunId })`다. 새 provider/evidence 봉인에 묶인 새 후보를 만들고 같은 tx에 immutable `relation.reprepared` 전임 ID/검토 판 이력을 쓴다. 이전 후보 bytes/결정은 바꾸지 않는다. stale 전임, 다른 전임으로 바꾼 replay를 거절하며 동일 새 run은 같은 후보를 돌려준다. `model-revision-RED.txt` → `model-revision-GREEN-final.txt` 실제 PG 6시험은 마지막 전임 audit insert 직후 failpoint에서 새 draft/이력 전체 rollback과 원래 후보 보존까지 확인한다. 이 묶음의 provider·witness는 명시적 합성 fixture이며 실제 모델 생산 증거는 formal/root 소유다. 전체 TypeScript·해당 ESLint·diff는 진단 0이다.

재준비 UI는 같은 짧은 요청 칸과 `새 근거로 다시 준비` 버튼을 사용한다. 편집한 요청을 우선하고, 이력에서 요청 칸이 비었으면 봉인된 후보의 짧은 재준비 요청을 사용한다. `WorkspaceAnswer.reprepare`의 전임 ID/검토 판을 기존 assist body로 전달하고 새 답을 준비한다. 버튼은 모델에게 새 후보 준비를 요청하며 관계 승인이나 학생 쓰기를 실행하지 않는다. 준비 중 중복, 이전 결과 복귀, HTTP 왕복의 전임 metadata 보존은 `reprepare-ui-RED.txt` → `reprepare-ui-GREEN-final.txt` 2파일 11시험에서 확인했다. query에는 support/hash 편집 UI가 없다. fixture `?case=reprepare`도 추가했으며 실제 모델 생산/브라우저는 root와 formal의 별도 증거로 확인한다.

최초 근거 snapshot은 RepeatableRead로 읽어 여러 원천 행의 일관성을 보존한다. 기존 승인/실행의 동시 idempotency 경로를 RepeatableRead로 바꾸지는 않았다.

staging machine API도 writer off에서 새 표를 조회하지 않으며 Node/Python과 같은 명시적 MATH_ONTOLOGY_ENGINE_SECRET 우선순위를 사용한다. 만료된 미실행 제안은 이력에서 다시 준비가 필요한 것으로 표시한다. 철회/제거된 판의 개체 표기를 찾을 수 없는 과거 승인 관계는 **미확인**으로 표시하고 폐기만 준비할 수 있게 해 복구 경로가 막히지 않도록 했다. 이 fallback은 새 승인이나 근거 승격을 허용하지 않는다.

게시 job의 engine fingerprint는 최상위 `requirements.txt`의 include 한 줄 대신 실제 `scripts/ontology/compiler/requirements.lock`, `compiler.py`, `packaged.py`의 canonical bytes를 묶는다. 이 세 파일은 formal worker의 Node 배포 trace에도 포함된다. source/ontology/shapes/rules/base와 exact compile input의 별도 바인딩은 그대로 유지한다.

이 worker는 이 항목들을 읽기 전용/경량 시범으로 대신하거나, 아직 미확인인 교육 콘텐츠·관계를 공식 확정으로 표시하지 않는다.
