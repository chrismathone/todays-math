# cb-scan-core — 개념 백지 사진 채점의 뒷단

2026-11-25 · `phase/cb-scan-core` · 시작 `f46263117` · [지시서](../briefs/cb-scan-core.md).

## 지은 것

- `src/contracts/conceptBlankScan.contract.ts`: 인쇄 스냅숏·칸·판정 대상·읽기·직접 입력·교사 수정·제출 상태의 엄격한 Zod v1 계약.
- `src/lib/concept-blank/scan/snapshot.ts`: selection+bank만 받아 결정적으로 생성한다. 학생지의 장 수/문항 차례는
  `composeSheets → filter(sheetHasContent) → planSheet(...).student`를 그대로 쓴다. 인쇄 때 저장하는 배선은 아직 없다.
- `read.ts`: 측정의 `READ_PROMPT`를 그대로 복사하고 판 `cb-scan-whole-20261125-v1`과 실제 칸 목록을 붙였다.
  답·기준·학생 신원은 읽기 요청에 넣지 않는다. 한 쪽 전체 이미지 한 번. 관측 tags는 판정 입력으로 쓰지 않는다.
- `grade.ts`: 측정 `currentBankSuite.rubric`의 뜻 기준을 옮겼다. 판 `cb-scan-semantic-20261125-v1`.
  필수 뜻 모두+모순 없음 ○, 일부+명시적 오류 없음 △, 없음/오개념/빈 답 ×, 불확실은 확인 필요.
- `model.ts` / `usage.ts`: 기존 `studio-ai/runModelApi` 호출, 설정, 월 사용량 저장 인터페이스와 시험용 메모리 구현.
  새 SDK나 별도 HTTP 배관은 없다. `studio-ai/api.ts`에 선택적 `onAnthropicUsage`만 더했다.
- [DB 초안](../../../../prisma/drafts/concept-blank-scan/README.md), `.env.example`, 계획 문서 [§13](../../26-concept-blank.md#13-사진-채점2026-11-25).

## 계약의 꼴

스냅숏은 `{ version: 1, selection, sheetCode, bankFingerprint, pageCount, pages }`다.
각 쪽은 `{ number, form, questions, slots, targets }`다. q/slot/target id는 전체 학생지의 쪽을 접두어로 가져
형식마다 문항 번호가 다시 시작해도 충돌하지 않는다. `pageCount`는 **학생지만** 센다.
은행 지문은 선택된 원문 지면 내용의 SHA-256이며 legacy 코드 자체도 당시 은행/쪽 나눔 지문을 포함한다.
스냅숏에 보관한 답·requiredIdeas·그림 원문을 나중 은행 내용으로 보충하거나 바꾸지 않는다.
`sheetCode`는 정확한 선택 또는 제품의 60기호 인쇄 정원을 넘은 코드라면 NULL이다. 존재하지 않는 인쇄 코드를 만들지 않는다.

`slots`는 실제 읽는 칸, `targets`는 판정 단위다. target은 같은 문항의 slot id들을 참조하고 정답·`requiredIdeas[].anyOf`를
가진다. anyOf는 같은 뜻의 표현 예이지 문자열 일치 검사 목록이 아니다. 현재 B/D는 은행의 `bQuestion`을 그대로 쓰고,
C는 `clozeQuestion.acceptedAnswers`를 보존한다. 옛 뜻 문항에서 굵은 글이 용어 자체면 이름만으로 맞다고 하지 않도록
전체 정의의 뜻을 남긴다. E는 SVG/viewBox/이름표 자리/답을 서버 스냅숏에 동결한다.

학생 투영은 명시적 허용 목록만 복사한다. selection·은행 지문·정답·targets·원문 그림 객체·채점 기준은 빼며
C의 인쇄 질문은 핵심어 자리가 □다. 투영 함수와 서버 모듈은 `server-only`다. 공용 계약에 값으로 된 정답 데이터는 없다.

읽기: `{ id, status: read | uncertain | unreadable | blank, text }`.
고침: `{ slotId, text, directlyEntered: true, actor: { kind, id }, at }`.
판정: `{ id: targetId, label: correct | partial | incorrect | review, reason, directlyEntered }`.
`SCAN_GRADE_MARKS`가 ○·△·×·확인 필요로 바꾼다. reason은 240자 이내 한 줄이다.
직접 입력은 원래 읽기를 덮지 않고 시간 순 이력의 마지막 글을 쓴다. 학생 신원은 인증된 studentId이며 계정 id/손글씨 이름이 아니다.
교사 수정은 원래 모델 판정을 덮지 않는 별도 이력 계약이다. 교사 actor와 실제 소유 권한 확인은 미래 서버 쓰기 경로가 책임진다.

상태: `capturing → read → checking → graded → teacher-corrected`.
교사 수정은 교사만 가능하며 반복 수정은 같은 상태에서 추가 이력이다. 미수정 확인 필요가 있어도 나머지 결과 공개를 막지 않는다.
상태 함수는 순서/행위자 종류만 확인한다. 모든 쪽 존재, student/branch 권한, CAS와 이력 원자 저장은 후속 배선의 조건이다.

## 형식별 답 칸 — 제품과 대조한 결과

| 형식 | 실제 읽는 칸 | 판정 단위와 스냅숏 | 이번 자동 판정 |
|---|---|---|---|
| A 완전 백지 | 소단원별 자유 서술 영역 전체 | 그 영역에 속한 선택 개념별 기준. 그림/예는 별도 점수 칸이 아님 | 교사 확인. 자유 서술의 개념 대응과 보조 그림을 임의 규칙으로 만들지 않음 |
| B 개념 질문 | 질문의 답 줄 전체 | 현재 `bQuestion.answer/requiredIdeas`; 옛 지면은 정의의 굵은 뜻 | 뜻 기준 모델 |
| B ○× | 표시와 까닭 **각각 읽기** | 두 칸을 묶어 한 문항 판정. 둘 중 불확실이 있으면 확인 필요 | 두 내용을 함께 모델에 보냄 |
| C 문장 빈칸 | 인쇄 `{ }` 하나마다 왼쪽→오른쪽/위→아래 | 빈칸마다 정답과 인정 표현 | 칸별 판정 |
| C 적용 | 최종 답 줄 전체 | 결론·까닭이 담긴 은행 답 전체 | 문항별 판정 |
| D 현재 질문 지도 | 가지 질문의 답 영역 하나 | `questionMode/nodeStart`를 따른 질문·필수 뜻 | 질문별 판정, 요구하지 않은 예는 없음 |
| D 옛 뜻·예 지도 | 가지의 뜻 하나·예 하나 | 정의와 예의 질문/답. 열린 예는 지면 안내대로 뜻에 맞는 예 | 두 칸 별도 판정; 실물 읽기 성능 미측정 |
| E 그림 | 그림 이름표별 + 아래 설명 줄별 | 이름표 좌표/viewBox와 답, 설명 줄 label/answer | 각 칸 판정; 그림만 그린 답은 읽기에서 못 읽음 |

대조 근거: 은행 계약/질문 헬퍼, `compose.ts`, `paper/paginate.ts`의 `studentPages`, `keyRows`, `keyNotes`,
`ConceptBlankPaper`의 학생지 누적 쪽 수. 제품 지면/쪽 나눔 코드는 수정하지 않았다.

## 출력 실패와 호출 경계

모델이 모르는 id를 내면 버리고 위치로 재배정하지 않는다. 알려진 칸의 미반환·중복·깨진 필드·깨진 JSON은 그 칸을 못 읽음으로
남긴다. grade의 같은 실패는 확인 필요다. 정상으로 검증된 다른 칸은 유지한다. 문법 실패로 모델을 다시 부르지 않는다.
네트워크/상류 실패는 못 읽음으로 위장하지 않고 오류로 올린다. 학생 글 속 명령은 데이터로만 다루도록 두 지시문에 명시했다.
이 시험은 프롬프트/분기/파싱 계약의 확인이지 실제 주입 공격 방어 성능이나 학생 채점 정확도 측정은 아니다.

읽기 이미지 형식은 기존 배관과 같은 PNG/JPEG/WebP base64, data URL 3,000,000자 예산, 요청 JSON 4,500,000바이트 미만이다.
크롭·빨강 제거·이름 가리기·리사이즈·업로드는 구현하지 않았다. 미래 업로드 경로는 실제 이미지 검증과 사진 전송 고지가 필요하다.
`readScanPage`/`gradeScanPage`는 호출 함수를 반드시 받는다. 기본 실전송 어댑터도 VITEST/NODE_ENV=test에서는 거절하므로
서버 키가 있어도 시험에서 자동으로 유료 API가 열리지 않는다. 어댑터 시험은 fake key + fetch mock만 쓴다.

## 환경 변수와 월 상한

| 변수 | 기본/동작 |
|---|---|
| `ANTHROPIC_API_KEY` | 기존 서버 키. 브라우저에 내보내지 않음 |
| `CONCEPT_BLANK_SCAN_ENABLED` | unset/on 켜짐, off/모르는 값 꺼짐 |
| `CONCEPT_BLANK_SCAN_MODEL` | `claude-opus-5-5` |
| `CONCEPT_BLANK_SCAN_GRADE_MODEL` | 비면 읽기와 같은 모델. Haiku는 별도 선택 가능하지만 기본은 Opus |
| `CONCEPT_BLANK_SCAN_EFFORT` | high; low/medium/high만 |
| `CONCEPT_BLANK_SCAN_MONTHLY_USD_CAP` | 100 USD; 0은 유료 호출 차단. 잘못된 값은 오류 |

단가 상수는 `SCAN_TOKEN_PRICES_20261103` 한 곳이다. 백만 입력/출력당 Opus $4/$20, Sonnet $2/$10,
Haiku $0.10/$0.50. 실제 input+cache read+cache create, output을 센다. 생각 토큰은 출력에 다시 더하지 않고 캐시 할인도 넣지 않는다.
이 값은 지시서의 고정 환산표이며 현재 제공자 청구서와 일치한다는 주장이 아니다. 단가 없는 모델 설정은 거절한다.
합계는 정수 nano-USD. 읽기/채점 공통 한도이며 학생·교사·지점별로 $100씩 새로 주지 않는다.

서비스 키 하나의 UTC 시작 월을 기준으로 `begin → 호출 → settle`한다. 같은 저장소를 쓰는 독립 어댑터에서도 한 월에 한 호출만
진행하므로 동시에 남은 한도를 보고 여러 건이 시작하지 않는다. 바쁜 경우 이유와 함께 거절한다. 월이 바뀌어 완료되어도 시작 월에 정산한다.
합계가 상한에 닿으면 이후 호출을 거절한다. **진행 중 단일 호출이 잔액을 초과할 수 있다.** 엄격한 선예약 한도 여부는 아래 물음이다.
빈 답/불확실 답의 결정적 처리는 비용이 없으므로 모델을 부르지 않는다.

`singleAttempt: true`로 기존 배관의 숨은 재시도 비용을 피한다. 선택적 `onAnthropicUsage`는 모델 응답 검증 전 토큰을 관측하고
재시도 루프 밖에서 전달하여 잘림/거절 응답도 정산한다. 다른 기존 호출은 원래 재시도 정책을 유지한다.
끊긴 요청에서 토큰 증거가 없으면 0달러로 풀지 않고 unresolved로 닫는다. 화면을 떠나도 운영 모델 호출이 계속될 수 있다.
메모리 구현은 시험 전용이다. 다중 프로세스에서 공유하는 DB 구현과 미확인 사용량 복구는 아직 없다.

## DB 초안과 사진 보존

8개 표: 인쇄 지면, 제출, 쪽 사진, 칸별 읽기, 직접 입력, 판정 이력, 월 합계, 호출 원장.
`ownerScope.ts`의 기존 헬퍼로 지면/학생을 각각 확인하고 자식은 부모로 소유를 상속한다. NULL 지점을 전체로 취급하지 않는다.
브라우저 역할은 권한 회수+RLS, 서비스 키는 서버에만. `CHECK (...) IS TRUE`로 빠진 JSON 키의 NULL 통과를 막는 초안이다.
학생 지점 이동/개인 소유와 지면 공유를 다루는 쓰기 트랜잭션·추가 FK/트리거는 리드 검토 후라 SQL을 운영 보장으로 부르지 않는다.

사진은 앱 Supabase 비공개 전용 버킷을 전제로 **7일/30일** 두 제안만 적었다. 버킷·업로드·삭제 작업을 만들지 않았다.
기한은 코드 기본값으로 정하지 않았다. 삭제는 Storage API 성공 뒤 deleted_at 기록; SQL 메타데이터 삭제만으로 객체가 지워지지 않는다.
근거와 삭제 재시도 흐름은 [DB 초안 README](../../../../prisma/drafts/concept-blank-scan/README.md)에 있다.

## 화면/서버 트랙이 부를 함수

| 함수 | 호출 위치·역할 |
|---|---|
| `createScanSnapshot(selection, bank)` | 서버 인쇄 확정 시 생성해 저장; 화면에서 정답 포함 객체를 받지 않음 |
| `toStudentScanSnapshot(snapshot)` | 서버 응답 직전 정답 없는 쪽/칸 목록으로 투영 |
| `scanSnapshotSchema` 등 계약 | 저장 전/읽을 때 검증. 오래된 스냅숏은 현재 은행으로 덮지 않음 |
| `transitionScanSubmission(state, event, actor)` | 서버 상태 순서 검사. 실제 인증/페이지 완성/CAS를 대신하지 않음 |
| `readScanPage({page,imageDataUrl,signal}, model)` | 서버 쪽 읽기. 한 쪽의 칸별 결과 반환 |
| `gradeScanPage({page,readings,corrections,signal}, model)` | 서버 쪽 판정. target 순서 결과 반환 |
| `createScanModel({store,...})` / `scanConfig()` | 서버 주입 경계. 반드시 공유 영속 store를 구현한 뒤 운영 연결 |
| `createMemoryScanUsageStore()` / `scanTokenCostNanoUsd()` | 시험/단가 계산. 메모리 구현을 운영으로 쓰지 않음 |
| `normalizeScanRead(raw, ids)` | 받아 둔 모델 출력을 재해석하는 시험/복구용, 추가 AI 호출 없음 |

미래 화면은 인증된 라우트를 통해 학생 투영/읽기/판정을 받는다. 이번에 브라우저 호출 가능한 서버 액션이나 라우트는 만들지 않았다.

## 검증

RED: 새 시험 두 파일을 먼저 실행해 신규 계약/모델 모듈 미존재로 실패한 것을 확인했다.
그 뒤 GREEN. 측정 프롬프트·루브릭은 저장소 파일과 바이트 대조하며 벤치마크 실행기는 실행하지 않는다.
스냅숏/현재 B·D/옛 다섯 형식/pick, 정답 투영, 출력 누락·중복·이상 필드, 직접 입력, 상태 전이,
실호출 방지, 단가·동시 admission·월 경계·중복 정산·사용량 불명·상류 잘림의 실제 어댑터 mock을 시험했다.

최종 검사:

| 검사 | 결과 |
|---|---|
| 새 모듈 + 개념 백지 + studio API/라우트/전송 + 영어 읽기 회귀 | **36파일 · 493시험 통과**, `--maxWorkers=3` |
| 변경 TS 9파일 ESLint | **0 오류 · 0 경고** |
| `npm run type-check` | **통과** |
| `git diff --check` | **통과** |
| 기존 3파일의 확대 가드 | 아래 **4개 기존 실패** 재현. 전부 초록이라고 보고하지 않음 |

통과 묶음 재현 명령:

```sh
npx vitest run src/__tests__/unit/conceptBlank*.test.ts src/__tests__/unit/studioApi*.test.ts src/__tests__/unit/studioAi*.test.ts src/__tests__/unit/studioGrade.test.ts src/__tests__/unit/studioUpstreamErrorLog.test.ts src/__tests__/api/studioAiRoute.test.ts src/__tests__/api/studioAiErrorLog.test.ts src/__tests__/api/conceptBlankPrintPage.test.ts src/__tests__/components/conceptBlank*.test.tsx src/__tests__/components/studioAiTransport.test.tsx src/__tests__/unit/englishReadPhoto.test.ts src/__tests__/unit/englishReadRefine.test.ts --maxWorkers=3
npx eslint src/contracts/conceptBlankScan.contract.ts src/lib/concept-blank/scan/*.ts src/lib/studio-ai/api.ts src/__tests__/unit/conceptBlankScan.test.ts src/__tests__/unit/conceptBlankScanUsage.test.ts
npm run type-check
```

확대 실행은 처음 **37파일, 461통과/4실패(465개)**였다. 실패를 가리거나 테스트를 바꾸지 않았다.
이번에 수정한 유일한 기존 제품 모듈 `src/lib/studio-ai/api.ts`를 `HEAD=f46263117` 원문으로 잠시 대체해
아래 3파일을 다시 실행했으며 **30통과/동일 4실패**였다. 종료 뒤 작업 중 API 파일을 바이트 동일하게 복원했다.
실패에 나온 테스트·routing·온톨로지 라우트·스크립트는 모두 HEAD와 차이가 없다.

- `studioAiFigureEdit.test.ts`: 예상 모델 `gemini-3.8-flash`, 현재 기본 `claude-sonnet-5-5` 불일치 1개.
- `englishFence.test.ts`: import 사슬 검사 1개. `scripts/qa/claude-api-evaluation/features/{features,guards}.test.ts → english/readPhoto.ts`,
  `scripts/qa/srs-remaining-policy/fixture.tsx → UnifiedWorkspace.tsx → english/views.ts`의 기존 3경로.
- `errorLogRouteCoverage.test.ts`: 소스 검사·행동 검사 2개. `/api/math-ontology/{assist,catalog,coverage,publish/stage,query,validate}`와
  `/api/students/[id]/math-ontology/evidence` 7라우트의 withErrorLog 누락.

```sh
npx vitest run src/__tests__/api/studioAiFigureEdit.test.ts src/__tests__/unit/englishFence.test.ts src/__tests__/unit/errorLogRouteCoverage.test.ts --maxWorkers=3
```

지시서의 기존 studio-ai 전부 초록 조건은 **기존 모델 기대값 실패 때문에 충족되지 않았다**. 이 트랙의 신규 회귀는 없지만
전체 가드 초록을 요구하는 병합 단계에서는 위 기존 실패를 별도 정리해야 한다. 특히 라우트 수정은 이 지시서에서 금지한 범위라 하지 않았다.
운영 빌드·브라우저·실제 AI·DB 적용은 검증에도 사용하지 않았다.

## 물음 — 추측으로 구현하지 않은 곳

1. **A 판정**: 자유 서술 영역에서 개념별 근거를 어떻게 연결하며 보조 그림/예와 채점표 밖 맞는 개념을 어떻게 인정할까?
   이번에는 문항/기준은 저장하되 자동 판정을 확인 필요로 둔다. 그림을 새 OCR 규칙으로 읽거나 점수를 만들지 않았다.
2. **코드 없는 지면**: 정확한 선택 `pick`에는 legacy 코드가 없고, 자동 선택에도 코드 길이로 인쇄가 생략될 수 있다.
   어떤 발행 id/QR/글자 복구 흐름을 택할까? NULL은 현재 제품 사실이며 새 식별자는 만들지 않았다.
3. **사진 보존**: 비공개 버킷 7일/30일 중 어느 쪽인가? 실패·재촬영의 이전 사진 기한, 명시적 삭제 권한,
   읽은 글/직접 입력/판정 이력의 별도 기한은? 두 보존안과 삭제 경로만 문서화했다.
4. **상한 의미**: «도달 뒤 중지»로 충분한가, 단일 호출도 남은 금액을 넘지 않는 선예약이 필요한가?
   현재 전역 직렬 admission은 동시에 여러 호출이 한도를 통과하지 않게 한다. 선예약액은 임의로 정하지 않았다.
   UTC 시작 월/서비스 키 전체 합계를 썼다. 한국 달력 월이나 지점별 배분이 필요하면 DB 구현 전에 확정해야 한다.
5. **운영 복구/동시성**: 토큰을 못 받은 호출의 사용량 확인·해제 담당과 증거, 한 월 한 호출의 직렬 제한을 넓힐 예약 정책은?
   TTL만으로 풀거나 자동 재요청하지 않는다. DB 구현/쓰기 경로가 생기기 전에는 운영으로 연결할 수 없다.
6. **발행·학생 연결**: 코드만 아는 학생이 어떤 인쇄 지면에 제출할 수 있는가? 교사의 개인 작업물과 같은 지점 공유,
   전반한 학생·이동한 교사의 과거 제출 열람을 어떻게 정할까? 기존 ownerScope를 따르는 초안만 두고 새 권한을 열지 않았다.
7. **사진 위 번호**: `planSheet`에는 실제 촬영 사진의 칸 bbox가 없다. Wire 선택 후 기울어진 폰 사진의 표시 위치를 어떻게 얻을까?
   여기서는 쪽/문항/slot id만 확정했고, 위치 탐지 모델이나 추측 좌표를 만들지 않았다(E의 은행 좌표는 지면 내부 좌표다).
8. **재측정**: 시작 기본은 지시대로 Opus high다. 새 폰 사진의 사람 참값, A~E 및 옛 D의 판독·의미 채점을 확인한 뒤
   Sonnet/Haiku로 낮출지 정해야 한다. 이번 시험에서 실제 AI를 부르거나 새 성능 수치를 만들지 않았다.

## 하지 않은 것과 인계

화면·라우트·지면·QR·은행·`schema.prisma`·마이그레이션·새 패키지·실제 AI·학생 사진 저장·공유 DB 접근·운영 빌드·Chromium 없음.
지시서가 현 가지 유지/새 가지 금지/main에 밀지 않음을 정해 이 가지에서 순차 진행했다. 다른 세션의 파일을 지우거나 병합하지 않았다.
보고서와 코드를 가지에 커밋하며 push/main 병합/워크트리 제거는 하지 않는다(미병합 가지 보존).

스킬 참조: 프로젝트 TypeSafe의 [상태/판단 분리](https://docs.typesafe.ai/concepts/state.md)를 확인했지만
지시서의 Claude 스택을 유지했다. Supabase 스킬/공식 문서는 비공개 저장·삭제 **제안** 검토에만 썼고 DB 도구는 호출하지 않았다.
