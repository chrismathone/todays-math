# 오늘의 영어 자료 개선 — 합의 계획 v2.1 과 M0 구현 기록 (2026-10-02)

> **이 문서가 하는 일.** Grok · Codex 교차 검토를 거친 «영어 자료 개선 계획 v2.1» 을 그대로 보존하고(§A),
> 그 첫 단계 **M0** 에서 실제로 만든 것 · 잰 것 · **안 한 것**을 적는다(§B~§D).
> 영어 문항의 v2 계약 · 자료 수입(PDF · ZIP · HWP) · `english_*` 표의 형식 판(`schemaVersion`)을 만지기 **전에 필독.**
>
> - 기준 main `13e9c330a` · 구현 Claude Opus 5.5(effort xhigh) · 작업트리 `chrismathone/english-material-m0`
> - 계획 원문: 저장소 밖 `D:/todays-math/.qa-artifacts/english-plan-consensus/plan-v2.txt`(v2.1) — 아래 §A 가 그 전문이다
> - 요구사항 원문: 저장소 밖 `영어시스템_개선요구사항.txt`(2026-10-02 검토). **수집 자료의 원문은 저장소 · 외부 AI 어디에도 싣지 않았다** — 구조만 참고했고 fixture 는 우리가 지었다.
> - 번호 없는 문서다(파일 이름에 날짜) — 번호 문서 `25-english-studio.md` 의 뒤를 잇되 번호 충돌을 피했다. 번호를 붙일 때는 원장님께 먼저 알린다.
>
> 🔴 **M0 는 «기반»이다.** 새 화면 · PDF/OCR/ZIP/HWP 수입 · 4MB 상한 변경 · 공유 DB 적용 · v2 운영 저장은 **하지 않았다.**
> M0 의 시험은 계약 · 변환 · 요청 거절 수준이다 — **DB 영속 왕복 · 새 인쇄 · PDF 기능이 됐다는 뜻이 아니다.**

## A. 합의된 계획 v2.1 (전문 — 글자 그대로)

영어 자료 개선 계획 v2.1 — Grok/Codex 교차 검토 반영안
2026-10-02 / 기준 main 13e9c330a / 구현 담당 Claude Opus 5.5, effort xhigh

### 1. 목표와 자료 근거

자료 등록 -> 원문·번역·주석·문항·정답 분리 -> 교사 검수 -> 유형별 문항 구성 -> 학생/교사 인쇄를 연결한다. ZIP 14개(10of16,16of16 없음), PDF 46개 827쪽, 4MiB 초과 5개/최대8430916바이트를 확인했다. 1076행 카탈로그는 실제 파일 수가 아니다. HWP/MP3는 실물 미확인이다. 이 자료는 구조 참고이며 앱 탑재·외부 AI 전송·코퍼스 적재 권한을 받은 것으로 간주하지 않는다. 개발 fixture는 자체 제작 또는 허가된 자료만 쓴다.

### 2. 검토 반영 결정

- 원래 PDF end-to-end를 첫 착수로 묶은 범위를 M0 기반 구현과 M1 PDF 흐름으로 나눈다. 지금 시작할 것은 M0이며, M0 완료를 PDF 기능 완료라고 보고하지 않는다.

- Codex 제안인 명시적 schemaVersion의 별도 v2 계약을 채택한다. 기존 v1 문항에 optional targets를 무분별하게 섞지 않는다. Grok의 target별 answer 정본, 기존 문항/생성 개수 상한 유지, 새 interaction을 기존 생성 유형 목록에 넣지 않는 원칙은 수용한다.

- Grok 제안대로 부분점수 강제는 프롬프트와 품질 검사 양쪽에서 제거한다. 원본/교사 루브릭이 없다고 결함으로 판정하지 않는다.

- 4MiB 제품 제한은 M0에서 유지한다. 8.5MB 파일을 작은 fixture로 바꿔 요구를 충족했다고 보고하지 않는다. 실제 대용량 업로드는 M1의 필수 인수이며 저장·실행 방식 확정이 선행한다.

- 새 검수/편집 UI, DB 운영 적용, PDF/OCR/ZIP/HWP/TypeSafe 연동은 M0에 포함하지 않는다. 사용자의 자동 착수 지시는 M0 구현을 이미 승인한 것이다. 일상 구현 선택에 재승인을 요구하지 않는다.

### 3. 즉시 구현 M0 — 기존 화면을 유지하는 기반 작업

#### A. 별도 v2 도메인 계약과 순수 변환/검증

schemaVersion, source revision, passage/item/target stable ID, interactionType과 target별 alternatives/answer/evidence를 정한다. 첫 fixture는 자체 1지문·2표적 inline alternatives이며 여러 답을 상위 answer 문자열에 합치지 않는다. 제약/해설출처/사용권한은 구조화 계약과 확장 지점을 준비하되 구현하지 않은 interaction이나 채점기를 지원한다고 표시하지 않는다. 필수 ID 유일성, passage 대응, 보기 밖 정답, 표적별 답 누락, source span 경계·겹침 규칙을 코드로 검사한다. span은 변경 불가한 passage revision의 JS UTF-16 [start,end) 기준이며 text.slice와 인용문이 일치해야 한다. 원문 revision 변경 시 표적 재검토 및 관련 평가 무효화가 필요하다.

v1 읽기 adapter는 기존 원문과 meta=null을 손실 없이 보존한다. adapter로 만든 임시 ID를 승인된 영구 ID/출처 근거로 취급하지 않는다. v2 round-trip fixture는 parse -> serialize -> parse 후 표적/정답/출처가 유지되어야 한다. 알 수 없는 version/필드는 명시 거절하고 조용히 제거하지 않는다. 기존 API에서 v2 요청을 v1으로 처리하지 않도록 거절 검사를 준비·테스트한다. M0는 운영 v2 저장·노출을 켜지 않는다.

#### B. 루브릭 강제 제거

src/lib/ai/prompts/englishExam.ts의 부분점수/감점 생성 강제와 src/lib/english/quality.ts의 open.criteria 강제를 함께 수정한다. 근거·해설의 품질 검사는 남기고, 명시적 원본/교사 기준이 없으면 점수 공식을 만들도록 요구하지 않는다. 이미 저장된 해설 문자열은 수정하거나 재분류하지 않는다. v2 해설 상태는 none/source/ai_suggested/teacher_confirmed이며 teacher_confirmed는 실제 행위 기록이 있을 때만 쓴다. 기존 status=검토 완료를 answerVerified=true로 바꾸지 않는다.

#### C. 저장/권한 이행 설계와 SQL 초안

schemaVersion 및 별도 v2 payload의 additive SQL 초안, CHECK/FK/RLS·다운로드/삭제/고아 asset 이행 체크, 드라이런·롤포워드 검증 절차를 준비한다. M0에는 공유 DB 적용, Prisma migrate dev/deploy, db push, 운영 저장소 생성·배포가 없다. 기존 english_material CHECK(bytes 또는 content 필요), EnglishExam 소유권, 영어/수학 fence를 유지한다. 새 asset은 기존 CHECK를 깨며 nullable 칸만 끼워 넣지 않도록 별도 영어 문서/asset 설계로 M1에서 확정한다. DB 미적용 상태에서 동작 코드가 신규 컬럼을 조회하도록 배포하지 않는다. provenance/user_supplied도 M0에는 계약·fixture만이며 기존 meta에 새 필드를 억지로 넣어 null 소실을 일으키지 않는다.

#### D. M0 인수

자체 1지문2표적의 정답/위치/버전 손실 테스트, legacy v1/meta=null/출처 미상 유지, v2/미지원 버전을 구 PUT·AI parser가 v1으로 축소하지 않음, 근거 없는 부분점수 요구가 사라짐을 검증한다. 실제 운영 v2 쓰기가 꺼져 있으므로 M0의 시험은 계약/adapter/요청 거절 수준이고 DB 영속 왕복·신규 인쇄 완료라고 주장하지 않는다. 기존 5개 수정(저장 중 입력, seed 갱신, 메뉴 이동 초안·재시도, 실제 빈칸, UTF8) 및 영어 권한·인쇄·누출·fence·CAS/clientKey 회귀를 실행한다. 타입/관련 lint/저장소 필수 검사를 통과한 뒤 커밋한다. unrelated 파일은 건드리지 않는다.

### 4. M1 진입 전 확정할 저장·작업 실행 게이트

src/lib/privateAssets.ts의 1MiB 청크/64MiB/SHA256/CAS 구현을 재사용 후보로 평가하되 WorkspaceAsset이나 studio/export 메뉴 권한을 영어에 그대로 연결하지 않는다. 영어 전용 소유권/정책 아래 같은 전송 원리를 쓸지, 별도 객체 저장을 쓸지 실제 배포 환경에서 8.5MB 자체 PDF 전송으로 검증한다. 공급자는 아직 확정하지 않았으며 미구축 서비스를 이미 있다고 전제하지 않는다.

durable runner가 현재 있다고 가정하지 않는다. 실행 주체/저장 위치/운영 비용·권한을 결정한 후 job 상태 queued/running/needs_review/succeeded/failed/cancelled, lease/attempt/idempotency, 최대 재시도·동시 claim·강제종료 재개·중복 완료 방지·미완성 업로드 정리를 구현한다. 원문·기록의 삭제/보존 정책도 결정한다. 이 게이트가 통과하기 전에는 durable PDF 수입 기능 완료나 운영 활성화를 선언하지 않는다.

### 5. v2 출시 및 복구 순서

새 계약은 기존 parser/serializer/editor/API/print 모두를 통과해야 한다. 기존 question JSON 배열 CHECK와 meta 의미, source=deepseek 역사값, CAS revision/clientKey 의미를 유지한다. schemaVersion은 저장된 row/payload 및 요청에서 확인하고, 요청 version+CAS를 동시에 검사한다. v2 row의 표적 필드를 누락한 v1 PUT, 알 수 없는 version은 명시 오류로 거절한다.

1단계는 필요한 단일 additive SQL 드라이런/운영 적용 절차와 v1/v2 읽기·손실 쓰기 차단 코드 전파, v2 쓰기는 off. 모든 경로에서 호환성이 검증된 뒤 2단계에서 v2 쓰기를 켠다. v2 데이터를 만든 뒤 v1-only 빌드로 롤백하지 않는다. 쓰기 off 후 v2 호환 읽기를 유지하는 복구 또는 forward-fix를 사용한다. 기존 bytes/content/세트 본문을 삭제·일괄 변환하지 않는다.

이 과정에서도 기존 v1 행에 대한 정상 v1 PUT은 계속 허용한다. 영어 API 전체나 v1 저장을 일시 중단하는 출시가 아니다. schemaVersion은 자료 형식 판별자이고 revision은 동시 수정 CAS이므로 서로 같은 필드로 합치지 않는다.

### 6. 권한과 파생 자료 정책

기존 시험/자료 소유권과 메뉴 접근 검사는 그대로다. EnglishExam에 현재 없는 branchId를 M0에서 추가하거나 공유 범위를 넓히지 않는다. 계정/지점·메뉴 변경 후 새 요청의 접근 권한도 재평가한다.

신규 수입 자료 기본 rightsStatus=unknown, allowedUses=[]; reference_only도 생성·검색 인덱스·외부모델·배포의 허가가 아니다. approved와 용도별 허용을 모두 확인한다. 권리 설정 변경은 소유권 검사와 별도 인가된 서버 명령/행위자/시각/증빙 이력을 갖고 클라이언트가 보내는 approved 값을 신뢰하지 않는다. 보관 허가가 없으면 원본 bytes를 신규 보관하지 않고 metadata-only로 유지한다. 보관/교사 검수와 외부 전송/재배포는 다른 행위다.

기존 직접 작성·붙여넣기 생성 및 기존 자료 열람·편집·검토 인쇄를 M0에서 갑자기 잠그지 않는다. 이후 새 자료 경로에는 source/material/revision ID 또는 user_supplied 선언(작성자·시각·사용 근거)을 남긴다. user_supplied는 검증된 권리나 재배포/코퍼스 허가가 아니다. 이미 source ID로 연결된 자료는 문자열 복사나 요청문 복사 버튼으로 정책을 우회하지 못하게 한다. 출처 없이 사용자가 새로 붙여넣는 임의 텍스트의 원소유권을 기술적으로 판별했다고 주장하지 않는다.

권한 취소 시 원문/파생 세트는 자동 삭제하거나 본문을 바꾸지 않는다. 새로운 파생 생성·활성화·외부 전송·배포 출력은 현재 허용을 다시 확인하며 실행중 job도 최종 저장/활성화 직전에 재검사한다. 복구는 권한 재부여와 필요한 재검토를 기록한다. 문서 개정은 새 revision이며 옛 세트의 본문을 자동 동기화하지 않는다. 참조 불일치 표시와 재검토가 필요하다. M0는 이 정책 계약·시험만이며 모든 기존 API가 이미 집행한다고 주장하지 않는다. 신규 v2 활성화 전 서버 모든 행위 경로 배선이 필수다.

### 7. M1 PDF 수입 -> 검수 -> 인쇄

확정된 저장/runner 위에 PDF text layer 우선 + 필요한 영역 OCR, 물리 page index/인쇄 쪽 번호/bbox/읽기 순서, 원문/번역/주석/question/answer_key/장식 블록 분리, 다중 문항·target별 답 연결을 구현한다. 원본과 추출 내용을 대조하는 검수 화면은 기존 디자인을 재사용해 구체 시안과 실제 fixture로 점검한 뒤 연결한다. 자체 2단 문서·단/페이지 연속 문항·정답지 쪽 번호 재시작·스캔/깨진 텍스트 fixture를 사용한다. staging 초안은 보존하고 구조 오류가 있는 문항의 확정만 차단한다.

생성 목록은 준비된 유형만 연다. 기존 생성 8/세트30 제한을 일괄 해제하지 않는다. 91문항 문서는 import batch -> 지문별 items -> 시험지 구성 참조로 연결한다. TypeSafe/Jev 설계·연동 착수 때 프로젝트 skill과 live 공식 문서를 다시 적용하며 의미/모호성만 좁게 판단하고 실패/불확실은 교사 검토로 보낸다. 모델 confidence를 정답 인증·실측 난도로 쓰지 않는다. AI 검사는 revision/hash에 결합하며 수정 시 무효화한다.

학생용 출력에 정답/해설/주석/번역 블록을 전달하지 않는다. 누출 0의 기본 인수는 학생용으로 전달되는 전용 export payload 및 최종 종이/PDF/DOM이다. 교사가 편집·교사용 탭을 쓰기 위해 가진 권한 있는 데이터와 학생에게 제공되는 payload를 혼동하지 않는다. 기존 초안 인쇄는 M0에서 바꾸지 않고, 새 기능의 검토 출력/배포 출력 구분은 권한 게이트와 함께 명시한다.

### 8. 후속 M2/M3

M2 ZIP: signature/path traversal/중첩/파일수·해제량·압축비 제한, CP949 이름 보존·복구, 파일별 hash 및 재시도. HWP는 자체/허가 실물로 품질 검증 후 동일 블록 계약에 연결한다. HWPX·MP3 전사·사이트 유료 수집 자동화는 이번 확정 범위 밖이다.

M3 중복/효용/난도: 파일/지문/표적/문항 수 분리, passage family와 item target+interaction 중복 구분, 같은 family 평가 분할 누출 차단. 요청 난도/추정/교사 판단/실측은 별도이며 응답이 없으면 실측 null. 실제 학생 제출·부분점수 채점 제품은 별도 범위다.

### 9. 구현 운영

Claude는 claude-opus-5-5 --effort xhigh가 적용된 세션으로 시작한다. M0 A/C(계약·호환·SQL 준비)와 B(루브릭·품질 회귀)는 독립 Orca Claude 작업으로 나눌 수 있고, 모든 Claude 작업은 동일 모델/effort를 사용한다. 코드 수정 전 AGENTS/CLAUDE 및 해당 로컬 Next 가이드를 읽는다. TypeSafe 통합은 M0 범위 밖이다. 검토 자료 원문을 외부 모델에 전송하지 않는다. 공유 DB/운영 배포·스토리지 생성은 실제 검토 가능한 migration/runbook과 권한 범위를 갖춘 별도 단계다. 완료 작업은 검사 후 main에 병합하고 깨끗하고 종료된 작업트리만 가지 보존하여 정리한다. 현재 루트의 미추적 개인 문서/HTML과 다른 작업트리는 건드리지 않는다.

### 10. 이번 검토 판정 대상

M0는 구현 계약과 안전 경계가 구체화되어 즉시 착수할 수 있는지 판정한다. M1 이후에는 위에 적은 진입 게이트가 남아 있으며 전체 로드맵이 운영 준비 완료라는 뜻은 아니다. Grok/Codex가 수정안을 실제 읽고 남은 M0 차단사항이 없다고 판정한 뒤 Claude에 이 문서와 인수 기준을 넘긴다.

### 검토 결과

Codex는 v2 본판을 읽고 M0 한정 PASS(worker_done, task_8590c946641f / ctx_4ecc49bd41fd). 이후 v2.1은 정상 v1 PUT을 계속 허용하고 schemaVersion과 CAS revision이 별개라는 기존 의미를 명시했다. Grok는 v2.1을 읽고 M0 한정 PASS(worker_done, task_ed64b81e5cdd / ctx_2b2676334712). 양쪽 모두 M1 운영 게이트 유보를 명시했다. Run run_e7e0f029e725의 두 검토 작업은 성공 종료 및 agent terminal release 완료다.

## B. M0 구현 기록 (2026-10-02)

작업은 둘로 나눴다(오르카 작업트리 · 파일 소유를 갈랐다 · 둘 다 Claude Opus 5.5 · effort xhigh).

| 갈래 | 누가 | 가지 · 커밋 | 고친 것 |
|---|---|---|---|
| A/C — 2판 계약 · 호환 · SQL 초안 | 코디네이터 | `chrismathone/english-material-m0` · `b463fefd1` | 아래 §B.1~§B.4 · §C |
| B — 부분점수 강제 제거 | 워커(`english-m0-rubric`) | `chrismathone/english-m0-rubric` · `eb0876a91` | 아래 §B.5 |

### B.1 2판 계약 — `src/contracts/englishV2.contract.ts`

1판(`english.contract.ts`)과 **따로 둔다.** 1판 문항에 `targets` 를 선택 칸으로 섞지 않았다.

- 전부 `z.strictObject` — 모르는 칸은 거절한다. 🔴 **변환이 없다**(`trim` · 기본값 없음): 읽은 값이 쓴 값과 글자까지 같아야
  자리(span)가 안 밀린다. 1판 계약은 `trim` 을 하므로 이 점이 다르다.
- `schemaVersion: 2` 는 payload 안에 있다. 세트의 `revision`(동시 수정 CAS)과 **다른 칸**이다.
- 지문 `{passageId, sourceRevision, text}` · 문항 `{itemId, passageId, sourceRevision, interactionType, prompt, targets[]}` ·
  표적 `{targetId, span, alternatives[2~5], answer{alternativeId}, answerVerification, evidence[], explanation, skillTag}`.
  **문항에는 `answer` 칸이 없다** — 정답은 표적마다 하나다.
- 상호작용은 **`inline_alternatives` 하나뿐**(지문 속 표적마다 표현 둘 이상 가운데 고르기). 순서 · 삽입 · 조건 영작은 이름도 올리지 않았다.
  1판의 생성 유형 목록(`ENGLISH_GENERATED_TYPES`)에도 넣지 않았다(시험이 지킨다).
- 해설 `none | source | ai_suggested | teacher_confirmed` — `teacher_confirmed` 는 `confirmedBy{actorId, at}` 가 **있어야** 통과한다.
  정답 확인 `verified: true` 도 `verifiedBy` 가 있어야 한다.
- 출처 `material{sourceId, materialId, materialRevision}` 또는 `user_supplied{declaredBy, declaredAt, basis}`.
  권한 `unknown | reference_only`(허락된 용도 없음) · `approved`(용도를 하나 이상, 중복 없이).
- 서술 조건 `englishV2ConstraintSchema`(단어 수 · 제시어 · 문장 수)는 **모양만** 정했다. 재는 검사기 · 채점기는 없고,
  `inline_alternatives` 문항은 `constraints` 칸을 받지 않는다. 배점 · 부분점수 · 감점 칸은 어디에도 없다.
- 상한은 1판 그대로다(문항 30 · 생성 8) — 늘리지 않았다(시험이 지킨다).

### B.2 검증 · 왕복 · 1판 읽기 — `src/lib/english/v2/`

| 파일 | 하는 일 |
|---|---|
| `validate.ts` | `validateEnglishV2Document` — 형식 판 → 계약 → 뜻. 사유 코드: `unsupported_version` · `unknown_field` · `shape` · `target_answer_missing` · `duplicate_id` · `unknown_passage` · `stale_source_revision` · `span_out_of_bounds` · `span_splits_surrogate` · `span_quote_mismatch` · `span_blank` · `target_span_overlap` · `duplicate_alternative` · `answer_not_in_alternatives` |
| `serialize.ts` | `serializeEnglishV2Document`(정준 JSON — 칸은 이름순, 배열은 순서 그대로 · 깨진 문서는 던진다) · `parseEnglishV2Json` |
| `legacy.ts` | `readEnglishV1Set` / `restoreEnglishV1Set`(1판을 감쌀 뿐 바꾸지 않는다) · `readEnglishVersioned`(판을 보고 읽는다) |
| `versionGate.ts` | `probeEnglishSchemaVersion` · `englishV2Markers` · `gateEnglishV1Write` · `englishV1PayloadIssues` · `storedEnglishSetVersion` |
| `rights.ts` | `ENGLISH_V2_INTAKE_RIGHTS` · `englishV2UseAllowed`(approved **이고** 그 용도가 적혀 있을 때만) · `withIntakeRights`(요청이 보낸 권리 값을 처음 값으로) |

자리의 규칙: JS UTF-16 `[start, end)` · `quote === text.slice(start, end)` · 서로게이트 쌍 가운데를 끊지 않는다 ·
**한 문항 안의** 표적끼리 겹치지 않는다(맞닿는 것은 된다 · 다른 문항이 같은 자리를 쓰는 것은 된다 · 근거 자리는 겹쳐도 된다).
지문 개정이 문항의 `sourceRevision` 과 다르면 자리가 우연히 맞아도 `stale_source_revision` — 재검토 대상이다.

1판 읽기 변환이 지키는 것: 세트는 한 글자도 안 바뀐다(`meta: null` 은 null 로, 칸이 없던 것은 없는 채로) ·
저장된 해설을 다시 분류하지 않는다 · «검토 완료»를 정답 확인으로 올리지 않는다(`answerVerified: false`) ·
출처는 `legacy_unknown` · 권한은 처음 값 · 🔴 변환이 짓는 ID(`legacy:<세트 id>:…`)는 임시라 2판 ID(uuid)로 통하지 않는다.

표본은 **우리가 지은 지문 하나 · 표적 둘**(`src/mocks/englishV2Fixtures.ts`). 자리는 손으로 적은 숫자이고 시험이 `slice` 로 다시 잰다.

### B.3 🔴 1판 경로가 2판 값을 «줄여서» 받고 있었다 — 형식 판 관문

만들기 전에 RED 시험으로 확인한 사실: 붙여넣기 · 서버 AI 는 모르는 칸을 버리고 초안을 세운다
(`coerceEnglishDraftShape` — AI 가 덧붙이는 번호 · 난이도 때문). 그 길로 **표적(`targets`)이 든 문항이 들어오면 표적과
표적별 정답이 사라진 1판 세트가 그대로 통과했다.** 문항에 2판 칸이 든 행에 1판 PUT 을 보내면 200 으로 덮어썼다.

고친 것(정상 1판 요청은 전과 같다 — 1판 저장을 멈추는 장치가 아니다):

- `coerceEnglishDraftShape` — 형식 판 표지(1 이 아닌 값)와 2판 칸(`ENGLISH_V2_ONLY_*`)은 **버리지 않고 실어 넘긴다.**
- `validateEnglishDraft` — 맨 먼저 판을 본다. 2판 · 모르는 판 · 2판 칸이 든 값은 세트 단위 사유 한 줄로 거절한다.
  세 길(붙여넣기 · 서버 AI · 저장 라우트)이 다 이 검증기를 지난다.
- `buildChatgptFixRequest` — 그런 값에는 «고쳐 달라 요청문»을 만들지 않는다(1판 꼴로 다시 써 달라는 요청이 곧 표적을 버리는 일).
- `POST /api/english/exams/[id]/sets` · `PUT /api/english/sets/[id]` — `readEnglishV1Body` 로 요청을 먼저 본다.
  2판 · 모르는 판 · 2판 칸이 든 본문은 **400 `VALIDATION_ERROR`** + 사유 문구 + `details[{field, message}]`.
  `schemaVersion: 1` 을 밝힌 요청은 그 표지만 떼고 지난다. 소유 검사가 관문보다 먼저다(남의 세트면 403).
- `PUT` — 저장된 행이 1판이 아니면 **409 `CONFLICT`**(«이 세트는 새 형식으로 저장돼 있어 이 화면에서 고칠 수 없습니다.»).
  🔴 `schema_version` 칸은 아직 없어서 **있는 칸(`questions`)의 꼴로만** 본다. 칸이 생기면 `storedEnglishSetVersion` 에 그 값을 같이 넘긴다.
- 판과 `revision` 은 따로 본다 — 판이 틀리면 `revision` 이 맞아도 400, 판이 맞고 `revision` 이 낡으면 409 `REVISION_MISMATCH`.

### B.4 M0 가 **하지 않은 것** (2판 쪽)

- 2판을 저장하거나 내는 경로가 없다 — API · 화면 · 인쇄 어디도 2판 문서를 만들거나 읽지 않는다.
- 2판 **읽기 호환**(목록 · 세트 · 인쇄가 2판 행을 만났을 때)은 배선하지 않았다. 지금 2판 꼴의 행을 읽으면 응답 계약에 걸려 500 이다
  (조용히 줄여 보여 주지는 않는다). 2판 쓰기를 켜기 **전에** 이 배선이 먼저다(§A-5 의 1단계).
- 사용 권한 · 출처 정책은 **계약과 시험**까지다. 지금 있는 영어 API 가 그 정책을 집행하지 않는다.
- 2판 문서의 «DB 영속 왕복»은 재지 않았다 — 잰 것은 글자열 왕복(parse → serialize → parse)이다.

### B.5 부분점수 강제 제거 (프롬프트 v6 · 품질 검사)

- `src/lib/ai/prompts/englishExam.ts` **v5 → v6** — 서술형 안내 줄과 공통 규칙 2 가 «explanation 에 요소별 부분점수 채점 기준»을
  쓰라고 **강제**하던 것을 뺐다. 새 문장: «explanation 에 그 답이 정답인 근거 … 주어진 자료에 채점 기준이 있을 때만 그 기준을
  그대로 옮기고, 없으면 배점 · 부분점수 · 감점 공식을 지어내지 않습니다». 모범 답안 · 인정 답안 나열 · 발문의 조건 · 해설은 그대로 요구한다.
  ChatGPT 요청문은 같은 규칙 한 벌을 쓰므로 함께 바뀐다.
- `src/lib/english/quality.ts` — `open.criteria`(«채점 기준에 부분점수 요소가 둘 이상 있어야 합니다»)와 `scoringElements` 삭제.
  `open.answer` · `evidence.*` · `answer.explanation-consistent` 는 그대로다. 반대 방향 규칙(«부분점수가 있으면 결함»)은 만들지 않았다.
- 🔵 둘이 한 묶음이어야 하는 까닭: `generate.ts` 는 검증기에 걸린 초안을 품질 검사 실패 줄과 함께 되먹여 한 번 고쳐 쓰게 한다.
  `open.criteria` 가 남으면 프롬프트를 고쳐도 고쳐 쓰기 요청문에 «채점 기준에 부분점수 요소가 …» 가 실려 모델이 배점을 지어낸다. 시험으로 잠갔다.
- 이미 저장된 해설은 고치지도 다시 가르지도 않는다(DB 에 접속하지 않았다 · 그런 코드도 없다).
- 🔴 **프롬프트 v6 은 벤치로 재지 않았다**(유료 실호출 — M0 범위 밖). 통과율 · 품질이 v5 와 같다는 근거는 없다.

안 고친 것: `scripts/qa/english-bench/promptV1~V3.ts` · `promptStrict.ts`(잰 때의 기록) ·
🔴 `judge.ts:160` 의 채점관 눈금 «서술형은 채점 기준의 명확성(부분점수 요소)» — **다음 벤치 전에 고쳐야 한다**(안 고치면 v6 이 나빠 보인다) ·
답 형식 예시의 `"explanation":"해설 또는 채점 기준"` · 화면 문구 «해설 · 채점 기준».

## C. 저장 · 권한 이행 설계와 SQL 초안

### C.1 초안 — `prisma/drafts/english-set-schema-version/draft.sql` (🔴 미적용)

`english_question_set` 에 **더하기만** 한다: `schema_version SMALLINT NOT NULL DEFAULT 1` · `payload_v2 JSONB` · CHECK 하나.

```sql
CHECK (
  (schema_version = 1 AND payload_v2 IS NULL)
  OR (schema_version = 2
      AND payload_v2 IS NOT NULL
      AND payload_v2 @> '{"schemaVersion": 2}'::jsonb
      AND jsonb_array_length(questions) = 0)
)
```

- 지금 있는 행은 모두 1판이 된다. `questions` · `meta`(NULL 그대로) · `source` 의 옛 값(deepseek) · `revision` 의 뜻은 그대로다.
- 옛 코드(칸을 모르는 빌드)는 그대로 돈다 — INSERT 는 DEFAULT 1 을 받고 읽기는 칸을 안 읽는다.
- **2판 행의 `questions` 는 빈 배열**이어야 한다. 옛 코드가 2판 행에 1판 문항 배열을 덮어쓰면 DB 가 거절한다(섞인 행이 안 생긴다).
- `payload_v2` 안의 판과 칸의 판이 같아야 한다.
- 🔴 초안은 `prisma/migrations/` **밖**에 있고 `prisma/schema.prisma` 에 칸이 **없다.** 칸이 스키마에 들어가는 순간 Prisma 가 모든 세트 읽기에서
  그 칸을 SELECT 해, 칸 없는 DB 에서 전부 500 이다. `englishSchemaVersionDraft.test.ts` 가 이 둘을 지킨다 — M1 에서 실제로 적용할 때 **적용 기록과 함께** 고친다.

열어 둔 것(M1 에서 확정): 2판 행의 `passage`(NOT NULL)에 무엇을 둘지 · 2판 본문을 이 칸에 둘지 따로 표로 둘지의 최종 결정.

### C.2 이 초안을 재면서 고친 것 셋 (로컬 드라이런의 변이)

1. **판만 재는 CHECK 를 따로 뒀더니 한 번도 울지 않았다.** `schema_version IN (1, 2)` 를 `IN (1, 2, 3)` 으로 바꿔도 표본이 다 통과 —
   판 3 의 행은 다른 CHECK 에 먼저 걸렸다. CHECK 하나로 합쳤다.
2. 🔴 **`payload_v2 -> 'schemaVersion' = '2'` 는 빈 객체 `{}` 를 통과시켰다.** 칸이 없으면 식이 NULL 이고 CHECK 는 NULL 을 통과로 본다.
   `@>` 로 바꿨다(표본 «2판 본문에 판 표지가 없다»가 잡았다).
3. `jsonb_typeof(payload_v2) = 'object'` 는 `@>` 에 가려 안 울었다(배열 · 글자는 `@>` 가 이미 거짓) — 뺐다.

### C.3 이행 점검표 (M1 에서 채운다 — 지금은 «정해야 할 것»의 목록이다)

| 갈래 | M1 에서 정하고 확인할 것 |
|---|---|
| CHECK | 위 CHECK 의 표본 열하나 통과 · 옛 CHECK 다섯(status · source · questions 배열 · revision · meta 객체) 그대로 · 새 판을 더할 때는 새 마이그레이션 |
| FK | 세트 → 시험 `ON DELETE CASCADE` 그대로. 새 asset · 문서 표를 만들면 그 FK 의 삭제 동작(시험 삭제 → 자료 → 추출 블록 → 파생 세트)을 표마다 적는다 |
| RLS | `english_question_set` 은 켜져 있다(칸을 더해도 그대로 — 드라이런이 확인). **새 표는 만들 때 `ENABLE ROW LEVEL SECURITY`**, 정책 없음(공개 API 로 못 읽는다) |
| 내려받기 | 지금은 `GET /api/english/materials/[id]` 가 부모 시험의 소유로 판정한다. 새 asset 도 **영어 전용 소유 검사**를 지난다 — `WorkspaceAsset` · studio/export 메뉴 권한에 얹지 않는다 |
| 삭제 | 원문을 지울 때 파생 세트를 자동으로 지우거나 본문을 바꾸지 않는다(§A-6). 참조가 끊긴 세트는 «참조 불일치»로 표시하고 재검토 |
| 고아 asset | 올리다 만 조각 · 세트가 가리키지 않는 원본의 정리 규칙(누가 · 언제 · 며칠 뒤)과 그 실행 주체 — durable runner 가 정해진 뒤 |
| 기존 CHECK | `english_material` 의 «bytes 또는 content» CHECK 를 깨지 않는다 — 원본 · 추출 블록 · 권리 이력은 그 표에 NULL 칸을 끼우지 않고 **따로 영어 문서/asset 표**로 설계한다 |
| 권한 이력 | 권리 변경은 소유 검사와 따로 인가된 서버 명령 — 행위자 · 시각 · 증빙을 남기는 표. 요청이 보낸 `approved` 는 믿지 않는다(`withIntakeRights`) |

### C.4 드라이런 · 앞으로 가기 절차

**지금 돌릴 수 있는 것**(DB 에 닿지 않는다):

```bash
npx tsx scripts/qa/check-english-schema-version-draft.ts          # 정적 검사 — 더하기만 하는가
npx vitest run src/__tests__/unit/englishSchemaVersionDraft.test.ts
```

**원장님께 여쭌 뒤 돌릴 것**(공유 DB 에 짧은 잠금이 선다 · 반드시 ROLLBACK · 🔴 아직 한 번도 안 돌렸다):

```bash
ALLOW_SHARED_DRYRUN=1 npx tsx scripts/qa/check-english-schema-version-draft.ts --dry-run
```

확인하는 것: ⑴ 앞 조건(표 있음 · 새 칸 없음) ⑵ 칸의 형 · NULL · 기본값 ⑶ 새 CHECK 의 정의문 · 옛 CHECK 다섯 ⑷ 기존 행 무변경(행 수 · 전부 1판 ·
`meta` NULL 인 행 수 · 지문/문항/meta/상태/출처/revision 의 md5) · RLS ⑸ CHECK 의 동작 — DB 에 들어간 제약의 식을 표본 열하나에 대고 셈한다(행을 넣지 않는다).
이 도구에는 **`--apply` 가 없다.**

**M1 에서 실제로 적용할 때**(순서 — DB 먼저 · 코드 나중):

1. 초안을 `prisma/migrations/<날짜>_english_set_schema_version/migration.sql` 로 옮기고, 전용 적용 도구를 만든다
   (본보기 `scripts/qa/apply-english-set-meta-migration.ts` — 드라이런 기본 · `ALLOW_SHARED_IMPORT=1 --apply` · `_prisma_migrations` 한 줄 · `--revert`).
   🔴 `prisma migrate dev/deploy/db push` 금지(다른 트랙의 미적용 마이그레이션까지 같이 적용한다).
2. 공유 DB 에 드라이런 → 원장님 승인 → 적용. 옛 코드는 그대로 돈다.
3. 그 뒤에 `schema.prisma` 에 칸을 넣고 **1단계 코드**를 민다: 2판 읽기 호환(목록 · 세트 · 인쇄) + 손실 쓰기 차단(이번 M0 의 관문이 칸을 읽게).
   **2판 쓰기는 꺼 둔다.**
4. 모든 경로에서 호환이 확인되면 **2단계**로 2판 쓰기를 켠다.
5. 2판 행이 생긴 뒤에는 1판만 아는 빌드로 되돌리지 않는다 — 쓰기를 끄고 읽기 호환을 유지하거나 앞으로 고친다.
   되돌리기 SQL(`REVERT_STATEMENTS`)은 2판 행이 **0 일 때만** 쓴다.

**로컬에서 실제로 돌려 본 것**(2026-10-02 · 공유 DB 아님 — 메모리 Postgres 18.3(pglite), 저장소 밖 임시 폴더):
저장소의 영어 마이그레이션 둘로 지금 운영 표의 꼴을 세우고 옛 세트 셋을 넣은 뒤 —
초안 적용 → 확인 ⑴~⑸ 통과 → ROLLBACK 뒤 칸 없음 · 행 그대로 → 다시 실제 적용 → 옛 코드의 INSERT · PUT 통과(전부 1판) →
2판 행에 옛 코드의 PUT 은 DB 가 거절 → 되돌리기 뒤 11칸. 운영 도구(`--dry-run`, Prisma 경유)도 그 로컬 서버에 대고 끝까지 돌았다.
초안의 절을 하나씩 바꾼 변이 여덟이 전부 잡혔다. 기록: 저장소 밖 `.qa-artifacts/english-plan-consensus/m0-sql-local-dryrun/`.
🔴 pglite 는 Postgres 를 WASM 으로 묶은 것이다 — Supabase 의 Postgres 와 같은 판 · 같은 설정이라는 뜻이 아니다. 공유 DB 드라이런은 따로 해야 한다.

## D. 검증 (2026-10-02 — 가지 `chrismathone/english-material-m0`, B 가지 병합 뒤)

| 무엇을 | 결과 |
|---|---|
| 영어 시험 파일 전부(36파일 — 새 것 9 포함) | 669건 통과(B 가지 병합 뒤 · 병합 전에는 663건) |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint`(고친 파일) | exit 0 |
| 코드 변이 31(가드를 하나씩 끔) | 31 모두 시험이 빨강 — 처음에는 30. «정준 정렬 끔»이 안 물려 시험을 더했다(zod 가 칸 순서를 이미 맞춰 주고 있었다) |
| SQL 초안 변이 8(로컬 Postgres) | 8 모두 드라이런이 잡음 — §C.2 의 셋은 그 과정에서 고쳤다 |
| B 의 변이 5(워커) | 5 모두 잡힘(`open.criteria` 되살림 · 반대 규칙 · 강제 문장 둘 · 판 되돌림) |

새 시험: `englishV2Contract` · `englishV2Validate` · `englishV2Serialize` · `englishV2Legacy` · `englishV2VersionGate` ·
`englishV1LossGuard` · `englishSchemaVersionDraft`(unit) · `englishSchemaVersion`(api). B: `englishQuality` · `englishGenerate` · `englishChatgpt` 의 고쳐 쓴 단정과 새 시험.

기존 수정 다섯(저장 중 입력 · seed 갱신 · 메뉴 이동 초안/재시도 · 실제 빈칸 · UTF-8 — `13e9c330a`)과 권한 · 인쇄 · 누출 · 울타리 · CAS/clientKey 회귀는
영어 시험 전부에 들어 있고 통과했다.

### D.1 전체 관문

병합 커밋 `de0599fec`(A/C `b463fefd1` + B `eb0876a91`)에서 쟀다. 기준은 main `13e9c330a`. 기록: 저장소 밖 `.qa-artifacts/english-plan-consensus/m0-gates/`.

| 관문 | 결과 |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 — 오류 0 · 경고 71(전부 이 가지가 안 건드린 파일) |
| `npm run lint:affordance` | 🔴 exit 1 — 위반 1건 `src/components/unified/PrivateLibrary.module.css:35`(`.tools .mineFilter`). **main 에 이미 있다**(`46e4e013b`) · 이 가지는 그 파일을 안 건드렸다 |
| `npm run test`(전체) | 🔴 exit 1 — 951파일 중 926 통과 · 22 실패 · 3 건너뜀 / 29,125건 중 28,968 통과 · 25 실패 · 132 건너뜀. **영어 시험 실패 0** |

실패 25건을 갈랐다.

- **8건(6파일)은 main 기준선에서 똑같이 빨갛다** — 같은 여섯 파일을 `D:/todays-math`(`13e9c330a`)에서 돌려 확인했다. 이 가지가 만든 것이 아니다:
  `conceptBlankMenu`(1) · `DailyReviewSection`(1) · `StudentProgressBoard`(2) · `TodaysExam`(1) · `affordanceGuard`(1 — 위 어포던스 위반과 같은 것) · `workspaceMenuConstraint`(2).
- **17건(16파일)은 시간 초과다** — 수학 엔진 · 그림 · 개념 백지 은행의 무거운 시험이고 영어와 무관하다. 전체 실행 때 이 기계의 남은 메모리가 약 590MB 였다.
  그 16파일만 따로(`--maxWorkers=3`) 다시 돌리니 **16파일 1,200건 전부 통과**했다.
  `choiceCountRule` · `chooseAllRule` · `conceptBlankBank` · `conceptBlankSheetCode` · `devAiFigureDash` · `elementaryDifficulty` · `elementaryFigure`(2) · `elemFigureReference` ·
  `elemNoNegativeAnswer` · `elemStemSelfContained` · `elemTierBacksolveEligibility` · `elemTiersG4Line` · `figureLabelTypeset` · `middleFigureRenderable` · `middleM3Func` · `middleM3Stat2`.
- 전체 실행 끝의 판정기 쓸기는 37개 중 35개를 쟀고 빨강 0 이다. **2개는 못 쟀다**(울타리) — `probe-middle-combo.ts` 가 읽는 말뭉치 파일 둘이 이 작업트리에 없다(`build-middle-corpus.ts` · `census-middle-solution-vocab.ts` 로 만드는 것). 영어와 무관하지만 «전부 깨끗»이 아니다.

🔴 그러니 이 회차의 정직한 줄은 «전체 관문 초록»이 아니다 — **이 가지가 더한 빨강은 0 이고, main 에 이미 있는 빨강 여덟과 어포던스 위반 하나는 그대로 남아 있다.**

### D.2 재지 못한 것

- 공유 DB 에서의 드라이런(안 돌렸다 — 원장님 승인 대기) · 2판 문서의 DB 영속 왕복(2판 저장이 없다) · 새 인쇄(없다).
- 프롬프트 v6 의 통과율 · 품질(벤치 미실행). 운영에서 실제 생성 한 번도 돌려 보지 않았다(워크트리에 `.env` 없음 · 실호출 금지).
- 화면에서의 확인 — M0 는 화면을 바꾸지 않았다. 거절 문구(400 · 409)가 편집 화면 알림 줄에 어떻게 보이는지는 눈으로 보지 않았다
  (1판 화면은 2판 요청을 보내지 않으므로 지금은 닿지 않는 길이다).

## E. 남은 게이트 (M1 에 들어가기 전)

1. **저장 방식** — `privateAssets.ts` 의 전송 원리를 영어 전용 소유 아래 다시 쓸지 · 따로 객체 저장을 쓸지. 실제 배포 환경에서 8.5MB 자체 PDF 로 검증(4MB 상한은 M0 에서 그대로다).
2. **작업 실행 주체** — durable runner 가 지금 없다. 실행 주체 · 저장 위치 · 비용 · 권한 → job 상태 · lease · 재시도 · 중복 완료 방지 · 미완성 업로드 정리.
3. **SQL 적용** — §C.4 의 순서. 공유 DB 드라이런과 적용은 원장님 승인.
4. **2판 읽기 호환 배선** — 목록 · 세트 · 인쇄 · `storedEnglishSetVersion` 이 칸을 읽게. 그 뒤에 2판 쓰기.
5. **권한 정책의 서버 배선** — 새 파생 생성 · 활성화 · 외부 전송 · 배포 출력의 모든 경로. 권리 변경 명령과 이력 표.
6. **검수 화면** — 새 UI 는 D-07 절차(Wire → Hi-fi → 원장님 확정)를 지난다.
7. **다음 벤치 전** — `judge.ts:160` 의 서술형 눈금을 고친다. 프롬프트 v6 을 v5 와 같은 표본에서 잰다.
8. **TypeSafe/Jev** — 연동을 시작할 때 프로젝트 스킬과 live 문서를 다시 읽는다(M0 에서는 건드리지 않았다).
