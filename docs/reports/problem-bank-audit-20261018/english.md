# 영어 문제은행 전수 검토 — 2026-10-18

기준 코드: `70ed24137711172408134a15fa695183f31fb878`. 현재 DB의 영어 **2세트·13문항**, 활성 자작 듣기 **3세트·3그룹·9문항**, 연결 음원 **3개**를 전수 기계검사했다. 기본 형식·필수 내용·정답 범위·연결 검사는 통과했다. **문장 삽입 1문항에서 저장 정답 위치와 원문 복원 위치의 불일치를 확인**했고, 별도 2문항은 문맥 분량 경고로 교사 검토가 필요하다. 의미상 정답의 유일성이나 전체 문항의 정답 정확성을 보증하는 검토는 아니다.

제품 코드·공유 DB·Storage 객체를 변경하지 않았다. 새 자료 제작, AI 호출, 발행·배정, 배포·푸시도 하지 않았다. 커밋 대상은 이 보고서와 [english-counts.json](english-counts.json)뿐이다.

## 1. 측정 범위와 방법

- `AGENTS.md`, `docs/listening-production/PATTERN-GUIDE.md`, `RETIREMENT.md`를 읽었다. Next.js 라우트 규칙은 설치된 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`를 참조했다.
- `/Users/pss/Desktop/creative/today_/.env`를 프로세스 안에서만 읽었다. 연결 URL이 그 파일의 값과 같음을 값 출력 없이 확인했다. 없는 `node_modules`는 승인된 경로로 symlink했다.
- 모든 실제 DB 조회는 Prisma 트랜잭션의 **첫 실행 문장 `SET TRANSACTION READ ONLY`** 뒤에 수행했다. 성공한 각 실행에서 `transaction_read_only=on`을 확인했다. 격리 수준은 `read committed`다. 집계 전 과정이 하나의 고정 DB 스냅샷이라는 주장은 하지 않는다. 문항·문서 전수 데이터는 한 SELECT로 읽었고, 마지막 조회에서 문항 22개와 듣기 문서의 지문이 변하지 않았음을 재확인했다.
- 원문은 프로세스 메모리에서만 검사했다. 보고서·JSON·실행 로그에 문항 본문, 선지 원문, 해설 원문, 지문 원문, 대본 원문, 오디오 바이트, 환경 변수 값, Storage 비공개 경로를 저장하지 않았다. ID·수치·상태·검사 결과·SHA-256만 보존했다.
- 음원은 기존 Storage 읽기 함수를 사용했다. HTTP 메서드를 GET/HEAD로 제한하고 실제 객체 전체를 메모리로 읽어 해시·크기·WAV 구조·길이를 검사했다. 청취나 ASR은 하지 않았다.
- DB 코드 경로의 직접 호출은 감사용 전체 범위 뷰어로 수행했다. 실제 로그인·브라우저·배포 API의 종단 검증과 구분한다. 소유·메뉴 경계의 회귀 검증은 아래 집중 테스트 결과다.

| 실행명 | 관측 시각(KST) | 확인 범위 | 로컬 증거 |
| --- | --- | --- | --- |
| `english-db-inventory-20261018` | 09:37:48 | public의 `english_*` 기본 테이블 21개 전체 건수·RLS·상태 | `.qa-artifacts/english-audit-20261018/inventory.json` |
| `english-db-content-20261018` | 09:40:23 | 영어 13문항·듣기 9문항 전수, 원문 2개, 대본 3개, 미디어 3개 연결, 실제 조회 함수 | 같은 폴더 `content-audit.json` |
| `english-evidence-recheck-20261018` | 09:42:00–09:42:03 | 경고 재검증, 학생/교사 인쇄 권한, 음원 3개 전체 바이트 | 같은 폴더 `recheck.json` |
| `english-runtime-read-recheck-20261018` | 09:43:25 | 은행 목록·폐기 참조 목록, 원문 SHA-256 재대조 | 같은 폴더 `runtime-read-recheck.json` |
| `english-focused-tests-20261018` | 당일, 약 40.5초 | 관련 테스트 52파일, `maxWorkers=2`, 1회 | 같은 폴더 `tests.json`, `test-selection.json`, `tests.log` |

스크립트·결과 파일의 SHA-256, 전체 테이블별 수량, 문항별 검사 메타데이터, 테스트 파일별 결과는 `english-counts.json`에 남겼다. `.qa-artifacts` 실행 파일과 로그는 커밋하지 않는다. 초기 점검의 격리 수준 변경 시도는 SQLSTATE `25001`로 실패했으며, 해당 설정을 제외한 읽기 전용 실행이 성공했다. 제품 오류나 테스트 실패로 집계하지 않았다.

`english-privacy-check-20261018`은 보고서·메타데이터·실행 결과/로그 15파일을 원문 후보 86개(32자 이상) 및 연속 영문 12단어 창과 대조했다. 원문 일치 0, 환경 비밀 값 일치 0이었다. 짧은 일반 표현이나 의미상 유사성까지 검증한 결과는 아니다.

## 2. 현재 DB 전수 수량과 상태

영어 문제은행은 별도 `EnglishQuestion` 테이블이 아니라 `english_question_set.questions` 배열을 투영한다(`src/lib/english/questionBank.ts:291`). `Problem` 테이블의 수학 문제 수량과 합치지 않는다. 지문은행 `english_passage`는 세트의 `passage`와 별도다.

| 데이터 | 현재 수량 | 상태·해석 |
| --- | ---: | --- |
| `english_exam` | 1 | 연결된 영어 세트의 학년은 전부 중3 |
| `english_question_set` | 2 | 모두 `초안`, `source=deepseek`, revision 2 |
| 위 세트의 문항 / 서로 다른 원문 | 13 / 2 | 객관식 11, 서술형 2; 정확한 원문 SHA-256 중복 0그룹 |
| `english_material` | 0 | 원본 파일·텍스트 자료 없음 |
| `english_passage` / revision / use / receipt | 0 / 0 / 0 / 0 | 독립 지문은행의 실제 내용·이력·연결 사례는 없음 |
| `english_listening_set` | 3 | `deleted_at IS NULL` 3, 삭제 표기 0; 모두 `teacher_authored`, schemaVersion 1, row/document revision 4 |
| 듣기 그룹 / 문항 | 3 / 9 | 세트당 1그룹·3문항; 문항 출처 메타데이터도 모두 `teacher_authored` |
| `english_listening_media_asset` | 3 | row·record·completion 모두 `ready`, 그룹 참조와 일치 |
| 미디어 DB blob / Storage blob 참조 행 | 0 / 0 | 3개 모두 record의 직접 private Storage 참조를 사용; 이 두 테이블 0건은 누락 증거가 아님 |
| `english_listening_publication` | 0 | 발행본 없음 |
| assignment / assignment_revision / target | 0 / 0 / 0 | 학생 배정 없음 |
| attempt / receipt / release / broadcast | 0 / 0 / 0 / 0 | 학생 응시·채점·공개·방송 이력 없음 |
| `english_listening_source_transcript` | 0 | 별도 ASR 원본 대본 행 없음; 활성 문서 내 대본은 3개 모두 존재 |
| `english_listening_audit` | 12 | `set_created` 3, `set_updated` 6, `review_rights` 3 |

영어 13문항 유형은 내용 일치 4, 어법 3, 주제 2, 서술형 2, 문장 삽입 1, 빈칸 추론 1이다. 다른 학년이나 유형의 현재 문항이 없다는 사실을 자료 오류로 판정하지 않는다.

| 세트 ID | 문항 수 | 현재 용도 |
| --- | ---: | --- |
| `15fad5d9-c85d-4657-9524-9d40ed7808a6` | 8 | 영어 초안; EN-01·EN-02 검토 대상 포함 |
| `6c7cec12-cad0-4085-aa3d-50bc3501e870` | 5 | 영어 초안; 이번 기계검사 경고 없음 |
| `3e8bdaa9-c3d7-46d4-b9fe-3f82d7425b01` | 3 | 자작 듣기, 미발행·미배정 |
| `5208fc63-de72-4e06-ba40-2e528f68105e` | 3 | 자작 듣기, 미발행·미배정 |
| `a097511d-21ab-4f12-86ec-143b8d6da463` | 3 | 자작 듣기, 미발행·미배정 |

## 3. 전수 기계검사 결과

| 검사 | 분모·관측값 | 판정·한계 |
| --- | --- | --- |
| 영어 V1 strict 문항 계약·세트 계약 | 13/13문항, 2/2세트 통과 | 알 수 없는 V2 전용 문항 필드 0 |
| 현재 저장 검증기 `validateEnglishDraft` | 2/2세트 통과 | 정답 내용·문장 삽입 위치까지 보증하지 않음 |
| 영어 본문·정답·해설 공백 | 각각 0/13 | 해설의 의미·충분성은 별도 |
| 영어 선지 수·빈 선지·정규화 중복·객관식 정답 범위 | 오류 각각 0; 객관식 11/11 범위 내, 서술형 2/2 보기 없음 | 정답 번호가 범위 안이라는 검사 |
| 영어 근거 | 13/13 비어 있지 않고 공백 정규화 후 원문에 연속 포함 | 실제로 답을 지지하는지는 미확인 |
| 기존 품질 검사 `reviewEnglishDraft` | 109개 조건 중 104 통과, 5경고, 대상 3문항 | EN-01·EN-02로 분류; 기본 계약 실패와 구분 |
| 변형 간 문자열 누출·밑줄 표기 | 탐지 누출 쌍 0, 밑줄 차단/경고 0 | 바꿔 쓴 단서·기억·문맥상 누출까지 검사한 결과가 아님 |
| 듣기 strict 문서 계약·ID·정답 참조 | 3/3문서 통과, 9/9 정답이 자기 선택지에 속함 | 선지 의미 중복·복수 정답 여부는 미확인 |
| 듣기 발문·해설·선지 | 빈 값 0/9, 5개 선지 9/9, 선지 ID·정규화 글 중복 0 | 의미상 오답성은 미확인 |
| 듣기 대본·spokenText | 3/3그룹 모두 존재 | 녹음과 대본의 일치 여부는 미청취 |
| 듣기 근거 시간 | 19/19 구간이 양수 길이·음원 범위 내 | 답과 맞는 구간인지 미확인 |
| 선택적 `audioRange` | 9/9 없음 | 계약상 optional이며 공유 그룹 음원이 있음; 누락 오류로 판정하지 않음 |
| 세트·자료의 시험 연결 / 미디어의 세트 연결 | 고아 행 0 | 발행·배정은 모집단 0으로 실사례 검증 없음 |
| 듣기 row·document 정체·소유/지점·오디오 SHA/길이 | 3/3 일치 | 미디어 `ready`는 콘텐츠 검수 완료를 뜻하지 않음 |
| 실제 Storage 객체 | 3/3 전체 읽기·SHA-256·바이트·WAV 길이 일치 | 총 6,079,506바이트, 126,655ms; 청취 품질 미확인 |

영어 목록·resolve·compose는 각각 13문항을 반환했고 범위 목록은 2세트였다. 목록 문항의 SHA-256은 저장 JSON과 13/13 같았다. 지문은행 목록 0, 듣기은행 목록 3세트·9문항, 폐기된 외부 참조 목록 0을 실제 읽기 함수로 확인했다. 최종 재조회에서 영어 문항과 듣기 문서의 해시가 최초 전수 검사와 같았다.

| 음원 asset ID | 실제 바이트 | 길이(ms) | 객체·DB 대응 |
| --- | ---: | ---: | --- |
| `79d2382e-4dd4-47fe-bf2d-5da031a55ee1` | 1,943,654 | 40,492 | SHA·크기·길이 일치, WAV 검사 통과 |
| `96ce8798-a9cb-44ce-8ad5-8cf4f17ec281` | 2,013,856 | 41,955 | SHA·크기·길이 일치, WAV 검사 통과 |
| `ecc19690-074e-4189-81a3-a5116275b276` | 2,121,996 | 44,208 | SHA·크기·길이 일치, WAV 검사 통과 |

WAV 검사는 `src/lib/english/listening/media/inspect.ts:8`의 PCM 구조·길이 검사다. 해당 함수도 가청 정확성을 증명하지 않는다고 명시한다. 요청은 GET 9회(200 6회, 206 3회), HEAD 3회(모두 200)뿐이었다.

## 4. 우선순위별 보완 체크

P0로 확인된 서비스 차단·손실 문제는 없다. **확정된 원문 정렬 불일치는 EN-01 한 건**이다. EN-02는 의심, EN-03은 학생 사용 전 준비 상태, EN-04는 허용된 legacy 메타데이터 공백, EN-05는 이번 검증의 공백이다. 아래 항목은 수정 완료가 아니라 **보완 대상 식별 완료**를 의미한다.

### EN-01 · P1 · 문장 삽입 정답 위치와 원문 복원 위치 불일치 — 확인

- **위치:** `15fad5d9-c85d-4657-9524-9d40ed7808a6:2:5` — revision 2, 0-based index 5, 화면 6번. 문항 SHA-256 `1a49d7eecdf7a5f22daba68d1e7e72ee26df13b4af027a0503e3cfc696fd2f55`.
- **근거:** `english-db-content-20261018`에서 `insert.answer-slot=false`(`src/lib/english/quality.ts:463`). `english-evidence-recheck-20261018`에서 동일 토크나이저를 사용하되 LCS 품질 판정을 쓰지 않고 삽입 경계 51곳을 전부 대조했다. 주어진 문장 16토큰·남은 본문 50토큰을 원문에 정확히 복원하는 위치는 **offset 25 한 곳**, 표지 **②**였다. 저장 정답 표지 **③**의 위치는 offset 34로 복원되지 않았다. 표지 위치는 `[17,25,34,46,50]`이다.
- **영향:** 정답 번호는 정상 범위이므로 현재 저장 검증기는 통과한다(`src/lib/english/validate.ts:85`, `:114`). 은행 조회도 문항 형식을 검사할 뿐 원문 삽입 정렬을 재검사하지 않는다(`src/lib/english/questionBank.ts:117`). 초안을 인쇄·재사용할 때 교사 정답지와 원문 정렬이 어긋날 수 있다. 현재 해당 세트는 초안이며 학생 채점 피해가 있었다는 관측은 없다.
- **완료조건:** 교사가 원문·표지·지정 정답·해설을 함께 검토하여 대응을 확정하고, 원문 정렬 불일치를 해소한다. 현재 수치만으로 정답을 자동 변경하지 않는다. 의미상 다른 삽입 위치도 성립하는지는 별도 확인해야 한다.
- **체크:** [x] 품질 경고 재현 [x] 별도 완전 대조로 불일치 확인 [ ] 교사 확정·자료 보완 후 재검사

### EN-02 · P2 · 변형 문항 2개의 독립 문맥 충분성 — 의심

| 문항 ID(동일 세트·revision 2) | 유형 | 원문 일치 토큰 / 문제용 토큰 | 관측 |
| --- | --- | ---: | --- |
| `15fad5d9-c85d-4657-9524-9d40ed7808a6:2:3` | 어법 | 33 / 34 | 원문 265토큰, 밑줄 표지 5개 |
| `15fad5d9-c85d-4657-9524-9d40ed7808a6:2:4` | 빈칸 추론 | 7 / 7 | 빈칸 표지 1개, prompt 66자 |

- **근거:** 두 실행에서 모두 품질 기준 40토큰보다 짧아 `variant.has-passage=false`였다(`src/lib/english/quality.ts:359`, `:482`). 각 문항의 `variant.single-edit=false`는 같은 분량 조건에 종속되므로 별도의 추가 변형 오류 두 건으로 세지 않았다(`:504`, `:533`).
- **영향:** 현재 번들 계획에서 두 문항은 원문 상자가 없는 변형 묶음에 들어간다. 출력 경로도 `bundle.passage`를 따르고 있다(`src/components/english/englishWorksheetAdapter.ts:63`). 그 상태에서 발문만으로 판단할 문맥이 충분한지 확인할 필요가 있다.
- **완료조건:** 교사가 원문 없이 실제 변형 묶음에서 각 문항을 풀어 보고 문맥 충분성·정답 유일성을 확인한다. 짧아도 성립하면 확인 근거를 남기고, 성립하지 않으면 문제용 문맥을 보완한다. **40토큰은 휴리스틱이며 분량 미달 자체를 확정 오답이나 절단으로 판정하지 않는다.**
- **체크:** [x] 분량 경고 2문항 확인 [ ] 실제 문맥·의미 검토

### EN-03 · P2 · 자작 듣기 3세트의 학생 사용 전 검수·배포 준비 — 상태 확인

- **위치:** 위 수량 표의 듣기 3세트 전체, 각 document revision 4.
- **관측:** 권리 상태 `approved`·권리 확인 이력은 3/3 있으나 `distribution` 허용은 0/3이다. 내용·오디오·정렬 검수 도장은 **0/9**이며 발행·배정도 각각 0이다. `ready` 음원 3개를 검수 완료 자료 3개로 계산하면 안 된다.
- **현재 정책 체크:** `printableDraft` 직접 읽기에서 교사용은 3/3 허용, 학생용은 3/3 `404 NOT_FOUND`였다(`src/lib/english/listening/runtime/compose.ts:858`). 발행은 배포 권리와 현재 contentHash/revision의 검수 도장을 요구한다(`src/lib/english/listening/publication.ts:53`, `:66`). **차단 정책이 작동하는 현재 상태이며 서비스 오류로 판정하지 않는다.**
- **영향·완료조건:** 학생 사용을 계획할 때 새로 녹음을 만들 필요가 있다고 단정할 수는 없다. 기존 3개 녹음을 청취하고 대본·정답·근거 시간·오답의 타당성을 교사가 확인한 뒤, 실제 배포 허용 근거와 현재 개정의 검수 도장을 갖추고 발행·배정 절차를 검증해야 한다. 이번 감사는 이를 수행하거나 권한을 변경하지 않았다.
- **체크:** [x] 권리·검수 상태 전수 확인 [x] 학생용 인쇄 차단 [ ] 청취·내용 검수 [ ] 학생 사용 준비

### EN-04 · P3 · 영어 2세트의 제작 메타데이터 공백 — 허용된 legacy 상태

- **위치:** 영어 2세트 모두 `meta=NULL`, `passageRef` 없음. 관측 수량 2/2세트·13문항이다.
- **근거·영향:** 계약은 옛 세트·수동 자료의 NULL을 허용한다(`src/contracts/english.contract.ts:281`). 문제은행은 읽을 수 없는 난이도를 `null`로 표시한다(`src/lib/english/questionBank.ts:119`, `:134`). 이 자료의 난이도·정확한 모델·프롬프트 판·당시 제작 조건은 확인하지 못했다. 현재의 `source=deepseek`만으로 나머지를 복원할 수 없다.
- **완료조건:** 필요하다면 소유자가 보유한 당시 기록과 대조해 확인 가능한 메타데이터만 보완한다. 근거가 없으면 미지정 상태를 유지한다. 현재 사용 불능·무결성 오류로 집계하지 않는다.
- **체크:** [x] 공백과 하위 호환 동작 확인 [ ] 과거 제작 근거 유무는 소유자 확인 필요

### EN-05 · P2 · 실 PostgreSQL 듣기 런타임 53시험 미실행 — 검증 공백

- **위치:** `englishListeningRuntime.test.ts` 11개, `englishListeningComposeRuntime.test.ts` 28개, `englishListeningQuestionAudioRuntime.test.ts` 14개.
- **근거:** 세 파일은 전용 loopback `LISTENING_TEST_DATABASE_URL`이 있을 때만 실 DB를 사용한다(각 파일 `:17`, `:54`, `:40`). 이번 실행은 공유 DB 쓰기를 차단하기 위해 모든 DB URL 환경 변수를 제거했으며 53개가 skip됐다. 실패를 통과로 바꾼 것이 아니다.
- **영향·완료조건:** 실제 DB의 발행·배정·응시·명령 멱등성·동시성·오디오 조합을 이번 감사에서 종단 검증한 것으로 볼 수 없다. 학생 사용을 준비할 때 독립 로컬 DB로 해당 3파일의 53시험을 실행하고 원인을 확인한 실패가 없어야 한다. 현 DB의 발행·배정·응시 모집단도 0이라 실사례 검증은 불가능했다.
- **체크:** [x] 미실행 수·조건 확인 [ ] 독립 DB 런타임 검증

## 5. 사용·출력·폐기 정책 검토

| 영역 | 코드 근거 | 이번 확인·한계 |
| --- | --- | --- |
| 교사 문제은행 권한 | `src/lib/accountRouteAccess.ts:47`, `src/lib/english/routeSupport.ts:31` | 문제 조회·resolve·compose는 library 메뉴, 세션, 필요한 동일 출처 관문; scope와 revision은 `questionBank.ts:342`에서 확인. API/PGlite 회귀 테스트 통과 |
| 지문 소유·권리·개정 연결 | `src/lib/english/bank/service.ts:155`, `src/lib/english/bank/policy.ts:42` | immutable revision의 해시와 입력 글 대조, 보관 지문 거절, 생성 입력/외부 모델 용도 구분. 현 DB 0건이므로 실제 지문 이력의 정합성은 확인할 사례 없음 |
| 영어 출력 | `src/components/english/englishWorksheetAdapter.ts:22`, `:97`; `src/components/english/EnglishExamOutput.tsx:157` | 변형/독해 번들 분리, 밑줄 오류 차단, 초안 확인란, 출력 전 resolve. 현재 전수 자료는 각 세트 2묶음·누출 탐지 0쌍. 실제 종이·브라우저 육안 검수는 하지 않음 |
| 듣기 발행·학생 노출 | `src/lib/english/listening/publication.ts:48`, `src/lib/english/listening/projection.ts:37` | 발행 권리·검수·미디어 대응과 공개 시점별 allowlist. 학생 출력은 정답/해설/대본 필드를 제외(`draftPrint.ts:29`, `print.ts:53`). 현재 3문서의 학생용 투영에서 비공개 필드 0; 학생 실제 배정은 없음 |
| 선택 학생 메뉴 | `src/lib/learn/studentLearningMenuPolicy.ts:17`, `src/proxy.ts:154`; `src/app/api/english/learn/listening/[[...path]]/route.ts:6` | 영어 듣기 경로는 proxy와 route의 선택 메뉴 관문 대상. 관련 경로/HTTP 테스트 통과. 실제 학생 인증 세션의 종단 접근은 미실행 |
| private 오디오 | `src/lib/english/listening/media/storageApi.ts:144`, `:174`; `runtime/sets.ts:226` | bucket 비공개, ETag·Range·바이트 검증, 소유/지점·검증 완료 범위 대응. 현재 3개 실제 객체 읽기 통과. 학생 playback HTTP 종단 검증과 구분 |
| DB 브라우저 접근 경계 | `english-db-inventory-20261018` | 영어 21테이블 모두 RLS on·정책 0. 초기 시험/자료/세트 3테이블은 anon/authenticated SELECT grant가 있으나 정책 없는 RLS의 차단과 grant를 구분해야 함. 이를 실제 정보 누출로 판정하지 않았고, 익명 REST 전 경로 탐침도 하지 않음 |

DB 권한 해석은 grants와 행 정책을 별개 층으로 설명하는 [Supabase 공식 안내](https://supabase.com/docs/guides/api/securing-your-api)를 참고했다. 실제 외부 노출 여부를 설정 집계만으로 확정하지 않는다.

외부 듣기 폐기 여부는 이름·파일명으로 추측하지 않고 현재 정책의 source/question 메타데이터로 판정했다(`src/lib/english/listening/externalSourcePolicy.ts:28`). 한 문항이 폐기 출처여도 조합 문서 전체를 차단하며 SQL 목록은 pagination 전에 같은 조건을 적용한다(`runtime/database.ts:60`, `runtime/bank.ts:40`). 현재 문서 3개·문항 9개 중 일치 **0**, SQL/JS 가용 문서 수 모두 **3**, 참조 목록은 **0**이었다. 관련 23시험이 통과했다. 알려지지 않은 출처를 메타데이터만으로 찾아냈다는 의미는 아니다.

`RETIREMENT.md:3`의 자작 3세트·9문항 보존 기록과 현재 수량은 같다. 그러나 과거 보존 해시를 이번에 다시 읽을 수 없어 **2026-10-06 당시와 바이트가 그대로인지는 재입증하지 않았다.** `RETIREMENT.md:7`의 193세트·386 DB 대본·1,029객체 폐기 확인은 **기존 보고서의 역사적 주장**이다. 이번에는 옛 객체·백업·provider tombstone 전수를 재검사하지 않았다.

`PATTERN-GUIDE.md:3` 및 `:9`의 193원본·3,699문항(공식 121/2,417, 재구성 72/1,282)은 **현재 활성 문제 수가 아니라 보존된 추상 패턴의 과거 모집단**이다. 정적 영어 경로의 현재 JSON 런타임 데이터는 `src/lib/english/listening/creation/assessment-patterns.json`이며, 원문 없이 strict 집계 스키마·공식/재구성 분리·학년별 할당을 검사하는 관련 9시험이 통과했다. 폐기된 입력을 복원하거나 신규 제작에 사용하지 않았다. 원자료 기반 재현은 폐기 후 불가능하다는 정책(`PATTERN-GUIDE.md:135`)을 유지했다.

V2 계약·변환 코드의 존재, 빈 외부 참조 호환 함수, source transcript 런타임 코드의 존재를 미사용 legacy 오류로 세지 않았다. V2는 대응 저장 API를 켜지 않는 M0 계약임이 명시되어 있다(`src/contracts/englishV2.contract.ts:4`). 현재 영어 문항은 전부 V1이고 V2 필드 혼입은 0이다.

## 6. 집중 테스트

실행: `node .qa-artifacts/english-audit-20261018/run-tests.mjs`. 실행기가 메타데이터에 기록된 **52개 파일만** Vitest에 전달하고 `--maxWorkers=2 --reporter=json`을 사용했다. 전체 프로젝트 테스트·빌드·전역 타입 검사는 실행하지 않았다. 보고서 외 제품 수정이 없어 추가 회귀 반복도 하지 않았다.

| 구분 | 파일 수 | 통과 | 실패 | skip |
| --- | ---: | ---: | ---: | ---: |
| 실제 실행 파일 | 49 | 674 | 0 | 0 |
| 전용 DB 필요 파일 | 3 | 0 | 0 | 53 |
| 선택한 전체 범위 | 52 | 674 | 0 | 53 |

문제은행 SQL/페이지/소유/resolve·대용량 응답, 시험/세트/자료 API, V1/V2 손실 방지, 공통 검증기·품질·선지·번들·누출·인쇄, 듣기 계약·권리·발행·노출·응시 도메인·메타데이터·외부 출처 차단·미디어/Storage 읽기·추상 패턴을 포함했다. 일부 SQL 테스트는 PGlite, 일부 API·미디어 테스트는 메모리 더블을 쓴다. **성공한 합성 시험이 현재 실제 문항의 정답 검수를 대신하지 않는다.**

실패 시험은 없어 재현할 실패가 없었다. 53개 skip은 EN-05의 미실행 범위로 남겼다. 선택 파일 전체와 파일별 통과/skip 수는 JSON의 `tests.files`에 있다.

## 7. 확인하지 못한 것

- **현재 문항 원문 육안 검수 0/22, 실제 녹음 청취 0/3, 실제 브라우저/인쇄물 육안 검수 0회.** 전수 기계검사와 구분한다. 이번 수치는 표본 육안 검토나 전수 의미 검토의 결과가 아니다.
- 정답 의미의 유일성, 서술형 인정 답안의 범위, 해설의 정확성·충분성, 근거가 실제 답을 뒷받침하는지, 듣기 대본과 발화의 일치·목소리·발음·잘림, 교육과정·학년 난이도 적합성은 확인하지 못했다.
- empty 테이블은 수량·구조·코드/테스트만 확인했다. 존재하지 않는 현재 지문은행 이력·발행·응시 사례를 검사 완료로 세지 않았다.
- DB와 Storage의 현재 읽기·메타데이터 정책 일치 범위이며, 배포된 인증 세션·모든 API·백업·Git 과거 원문·미등록 Storage 객체 전수 조사나 저작권 적법성 인증이 아니다.

보완 담당자가 우선 확인할 자료는 EN-01의 6번 문항, EN-02의 4·5번 문항이며, 듣기는 EN-03의 검수·배포 준비가 선행 조건이다. 본 감사에서 식별한 항목을 수정하거나 100% 정답을 보증하지 않았다.
