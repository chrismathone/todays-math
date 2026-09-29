# 트랙 english-ai — 만들기 세 길: ChatGPT 붙여넣기 · 원문 복원 · DeepSeek 직접 생성 (D-148)

공통 지시 `english-common.md` 를 먼저. 25 §4 가 규칙이다. 검증기 `src/lib/english/validate.ts` · 원문 복원 `src/lib/english/cloze.ts` 는 **리드가 만들었다 — 고치지 않는다**(모자라면 보고서에).

## 1. 순수 함수 (`src/lib/english/`)

### 1.1 `chatgpt.ts` — ChatGPT 로 제작(키 없음, 주 경로)
- `buildChatgptRequest({ exam, request, materialText? })` → 요청문 문자열. 들어갈 것: 학교·학년 · 제작 방식(new/original/variation) · 소재 또는 원문 · 난이도 · 문항 수 · 지문 길이 · 고른 유형 · **규칙**(25 §4.3 프롬프트 요지를 한국어로: 보기 5개 서로 다름 · 정답은 1~5 번호 문자열 · 서술형은 보기 없음 + 부분점수 기준 · `evidence` 는 지문의 연속 인용 · 고른 유형만, 각 하나 이상 · 빈칸/어법/삽입은 문제용 변형 지문을 발문 안에 · 지어낸 통계·출처 금지) · **답 형식**: JSON 하나 `{"title","passage","questions":[{"type","prompt","options","answer","explanation","evidence"}]}` 를 코드펜스로, 다른 말 없이.
- `parseChatgptResult(text)` → `{ ok: true, draft } | { ok: false, issues }`. 붙여 넣은 글에서 JSON 을 찾는다(코드펜스 안 · 앞뒤 잡설 · 후행 쉼표 — `src/lib/ai/jsonRepair.ts` 의 복구 단계를 **객체용으로** 재사용: `parseAiJsonObject` 를 거기 더한다, 배열 함수는 손대지 않음) → `source: "chatgpt"` 를 붙여 `validateEnglishDraft(value, expect?)`.

### 1.2 `generate.ts` — DeepSeek 직접 생성
- `generateEnglishDraft(input: EnglishGenerateRequest, grade)` — `callAi`(`src/lib/ai/client.ts`) + 프롬프트 `src/lib/ai/prompts/englishExam.ts`(`ENGLISH_EXAM_PROMPT_VERSION` 상수 + 사유 JSDoc, `buildEnglishSystemPrompt()` · `buildEnglishUserPrompt(input, grade)` — 사용자 글은 신뢰하지 않는 자료로 감싼다). 응답은 **객체 하나** → `parseAiJsonObject` → `validateEnglishDraft(value, input)` → `source: "deepseek"`. 파싱 실패는 `AiParseError` 로 던져 `withOneRetryOnParseFailure` 가 한 번 더. `finish_reason==="length"` 는 client 가 `AiCapacityError`.
- `maxTokens` 는 client 의 하한을 따른다(추론 예산 — 64000).

## 2. 라우트 `src/app/api/english/generate/route.ts`
- `export const maxDuration = 300` · `withErrorLog("/api/english/generate", …)` · 세션 401 · 같은 출처 검사 · `englishGenerateRequestSchema` 400 · 시험 소유(`requireOwnedEnglishExam` 은 base 소유 — **없으면** 이 트랙에서는 `db.englishExam.findUnique` + `withinOwnerScope` 로 직접, 보고서에 적어 리드가 base 병합 뒤 헬퍼로 바꾼다; Prisma 모델이 워크트리에 없으므로 **`db` 접근은 `(db as any).englishExam` 이 아니라** 시험 소유 확인을 `src/lib/english/examLookup.ts`(이 트랙 소유, `findEnglishExamGrade(db, id)` 하나) 로 빼고 시험에서 모킹) → `generateEnglishDraft` → 200 `englishDraftResponseSchema`(저장하지 않는다 — 클라이언트가 sets POST).
- 오류 순서: `AiCapacityError` 502 → `AiConfigError` 503(«AI 연결이 설정되지 않았습니다.») → 검증기 실패 502 `ENGLISH_DRAFT_REJECTED`(details 에 issues) → `AiGenerationError` 502. 비밀 값·프롬프트 전문은 응답·로그에 싣지 않는다.
- 🔴 실호출 금지 — 시험은 `vi.mock("openai")` + `vi.stubEnv("DEEPSEEK_API_KEY", …)`(`src/__tests__/unit/aiGenerator.test.ts` 본보기). 키가 없는 분기(503)도 시험.

## 3. 화면 `src/components/english/EnglishMakerView.tsx` (+ `EnglishMaker.module.css`)
props: `{ exam: EnglishExam; materials: EnglishMaterial[]; onSaved: (setId: string) => void; onNotice: (message: string, tone: "status" | "alert") => void }` (공통 지시 §3). 머리 `WorkspacePageHeader`(«문제 만들기» · «ChatGPT 에서 문제를 만들고, 수업에 맞게 검토하세요.»). 탭 셋(ARIA tablist — `TeachingView.tsx` 본보기):
1. **ChatGPT 로 제작** — 안내 카드(«ChatGPT 대화에서 만든 뒤 붙여 넣으면 초안으로 저장됩니다. API 키가 필요 없습니다.») · 조건(제작 방식 · 소재/원문(저장한 텍스트 자료 불러오기 `<select>`) · 난이도 · 문항 수 3/5/8 · 지문 길이 · 유형 체크 + «이 시험의 출제 설정 불러오기») · **«요청문 복사»**(`navigator.clipboard.writeText`, 실패하면 textarea 에 보여 주고 «복사되지 않았습니다. 아래 글을 직접 복사해 주세요.») · **결과 붙여넣기** `textarea` + «가져오기» → `parseChatgptResult` → 실패는 문항별 사유 목록(`role="alert"`) · 성공은 `POST /api/english/exams/{id}/sets`(제목·source chatgpt) → `onSaved(id)`.
2. **원문 복원** — 지문 `textarea`(세리프, 자료 불러오기) · 최대 문항 수 3/5/10/15 · «연습문제 만들기» → `makeCloze` → 저장 → `onSaved`. 설명 «입력한 원문의 단어를 빈칸으로 바꾸는 연습입니다. AI 추론형 문항과 다릅니다.»
3. **API 직접 생성** — 상태 줄(«AI 연결됨 / 연결 대기» — `GET /api/english/generate` 은 없으니 첫 호출의 503 으로 안다: 503 이면 상태 줄을 «연결 대기»로 바꾸고 단추를 잠근다) · 같은 조건 칸(ChatGPT 탭과 상태 공유) · 요금 고지 «생성 시 소재·지문을 AI 서버로 보냅니다.» · «AI 지문·문제 생성»(진행 중 `WorkProgress` inline · 취소 없음) → 200 이면 저장 → `onSaved`; 오류는 `message` 그대로 alert 줄.
- 세 탭 모두 저장 전 미리보기 없음(편집 화면이 곧 검토) — 저장은 항상 «초안».
- D-08 · D-30 · 작업실 토큰. 폰 폭에서 탭이 두 줄로 꺾여도 된다(`flex-wrap`).

## 4. 시험
- `src/__tests__/unit/englishChatgpt.test.ts` — 요청문에 조건·규칙·답 형식이 다 들어감 · 코드펜스/잡설/후행 쉼표 붙여넣기 읽기 · 검증기 실패 전달.
- `src/__tests__/unit/englishGenerate.test.ts` — 모킹된 openai 로 요청 본문(system·user·max_tokens) · 응답 객체 읽기 · 재시도 한 번 · length → `AiCapacityError` · 검증기 실패 → 예외 종류 · 외부 호출 0 확인.
- `src/__tests__/api/englishGenerate.test.ts` — 400/401/403/404/502/503 순서.
- `src/__tests__/components/EnglishMakerView.test.tsx` — 세 탭 · 복사 실패 대체 · 붙여넣기 실패 사유 · 저장 뒤 `onSaved`. MSW 핸들러는 shell 소유이므로 이 시험은 `fetch` 를 `vi.stubGlobal` 로.

## 5. 보고서 `docs/planning/tracks/reports/english-ai.md`
`examLookup.ts` 임시 우회를 적을 것 · 프롬프트 버전 · 리드가 main 에서 표본 한 번 돌릴 명령(키 있는 곳에서만).
