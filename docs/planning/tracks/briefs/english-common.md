# 오늘의 영어 — 트랙 공통 지시 (D-148, 2026-09-30)

리드는 `C:\Creative\testautocreator` 메인 세션이다. 트랙 넷(`english-base` · `english-shell` · `english-ai` · `english-print`)이
**같은 계약** 위에서 병행한다. 자기 브리프(`english-<트랙>.md`)와 이 문서를 먼저 읽는다.

## 0. 먼저 읽을 것 (이 순서)

1. 자기 브리프 → 이 문서
2. `docs/planning/25-english-studio.md` — **설계 SSOT** (§1 화면 · §2 표 · §3 API · §4 만들기 · §5 인쇄 · §6 울타리 · §8 트랙 · §9 합의)
3. `src/contracts/english.contract.ts` · `src/lib/english/validate.ts` · `src/lib/english/cloze.ts` (리드가 만든 뼈대 — **고치지 않는다**, 고칠 게 있으면 보고서에)
4. `src/contracts/accountAccess.contract.ts`(제품 표 `WORKSPACE_PRODUCTS` · 메뉴 `english`) · `src/lib/accountRouteAccess.ts`(관문)
5. `docs/planning/05-design-system.md` §8.23 · §8.9 · `docs/planning/07-coding-convention.md` **D-148** · D-30 · D-08 · `CLAUDE.md` 절대 규칙
6. 교훈 색인(`CLAUDE.md`)에서 「워크트리에는 `.env` 가 없어 …」(2026-09-20) · 「훅이 아예 안 돌고 있었다」 · 「전수 가드는 이름에 내 기능이 없어도 관련 시험이다」(2026-09-26)

## 1. 워크트리 준비

- `npx prisma generate` 먼저(안 하면 무관한 tsc 오류 수백). 오르카 셋업이 고친 `package-lock.json` 은 **커밋에 싣지 않는다**(`git checkout -- package-lock.json`).
- `.env` 없다 — **DB 에 닿지 않는다**(드라이런도 안 돌린다) · **유료 AI 실호출 금지**(시험은 `vi.mock("openai")`).
- 개발 서버가 필요하면 포트 **3117~3127**, `DATABASE_URL=postgresql://x:x@127.0.0.1:9/x` + 임시 `AUTH_SECRET`. 3000 금지.

## 2. 규칙

- **자기 소유 파일만** 만진다(25 §8 표 · 자기 브리프 «소유»). 남의 파일이 필요하면 보고서 «리드가 정할 것»에 적고 기다린다.
- 계약 `english.contract.ts` 가 모자라면 **리드에게 먼저** — 트랙이 계약을 고치지 않는다.
- 표본 영어 지문은 **우리가 짧게 지은 글**만 — 교과서·출판사·모의고사 지문을 붙이지 않는다(원장님 원칙: 교재 원문은 저장소 밖).
- D-08(느낌표·이모지 없음, 사무적) · D-30(손가락 커서·hover 는 실제 단추에만 — ChatGPT 앱의 전역 `cursor:pointer` 금지) · 작업실 토큰만(05 §8.9, 새 색·글꼴 없음).
- 모든 route.ts 는 `withErrorLog("<경로>", …)` · 응답 `{data}`/`{error}` · `jsonOk(계약, …)`.
- TDD: RED → GREEN. 관문: `npx vitest run <내 시험 파일들>` → `npm run lint` → `npx tsc --noEmit`. 전체 시험은 리드가 병합 뒤 main 에서(트랙 넷이면 워커가 굶는다).
- 커밋은 작게, 메시지는 영어 한 줄 + 본문(저장소 관례). **«검토 요청»을 보낸 뒤에는 amend 금지** — 새 커밋으로. 리드는 커밋 id 로 병합한다.
- 끝나면 보고서 `docs/planning/tracks/reports/english-<트랙>.md`(한 것 · 시험 · 못 한 것 · 리드가 정할 것 · 위험) 를 커밋하고, 마지막 메시지에 **커밋 id · 보고서 경로 · 시험 결과 줄**을 적는다. 채팅 답은 잘리니 산출물은 파일로.

## 3. 트랙 사이 약속 (같은 파일을 둘이 쓰지 않는다)

| 파일 | 소유 |
|---|---|
| `prisma/schema.prisma` · `prisma/migrations/20260930120000_english_studio/` · `scripts/qa/apply-english-studio-migration.ts` · `src/mocks/englishTestDouble.ts` · `src/mocks/prismaTestDouble.ts`(import 한 줄) · `src/lib/ownership.ts`(헬퍼 추가) · `src/app/api/english/**`(generate 제외) · `src/__tests__/unit/englishFence.test.ts` · `src/__tests__/api/english*.test.ts` | **base** |
| `src/components/unified/UnifiedWorkspace.tsx` · `Workroom.module.css` · `WorkspaceIcon.tsx` · `src/components/english/**`(**`EnglishMakerView.tsx` 제외**) · `src/mocks/handlers/english.ts` + `handlers/index.ts`(등록 한 줄) · `src/__tests__/components/English*.test.tsx` · `UnifiedWorkspace.access.test.tsx` | **shell** |
| `src/lib/english/chatgpt.ts` · `src/lib/english/generate.ts` · `src/lib/ai/prompts/englishExam.ts` · `src/lib/ai/jsonRepair.ts`(`parseAiJsonObject` 추가만) · `src/app/api/english/generate/route.ts` · `src/components/english/EnglishMakerView.tsx`(+ 그 CSS) · `src/__tests__/unit/englishChatgpt.test.ts` · `englishGenerate.test.ts` · `src/__tests__/api/englishGenerate.test.ts` | **ai** |
| `src/app/(main)/english/**` · `src/components/english/print/**` · `src/app/dev/print-check/items.ts`(항목 둘) · `src/__tests__/components/EnglishPrint*.test.tsx` | **print** |
| 계약 둘 · `validate.ts` · `cloze.ts` · `accountRouteAccess.ts` · 문서 | **리드** |

- shell 이 «문제 만들기» 탭에 마운트하는 `EnglishMakerView` 는 **ai 소유** — shell 은 같은 경로에 **자리표 파일**(«문제 만들기 — 준비 중» 한 줄, props 는 아래 약속)만 두고, 병합 때 리드가 ai 판을 택한다.
- `EnglishMakerView` props 약속: `{ exam: EnglishExam; materials: EnglishMaterial[]; onSaved: (setId: string) => void; onNotice: (message: string, tone: "status" | "alert") => void }` — 만들기가 끝나면 세트를 `POST /api/english/exams/{id}/sets` 로 저장하고 `onSaved(id)`.
- shell 의 인쇄 단추는 `/english/sets/{id}/print?view=student|teacher` 를 새 탭으로 연다(print 가 만든다).
- shell 은 API 를 `fetch` 로 부르고 시험은 MSW(`src/mocks/handlers/english.ts`)로 — base 의 라우트가 워크트리에 없어도 화면 시험은 돈다. 실제 연결은 리드가 병합 뒤 main 에서 본다.
- print 의 `page.tsx`(DB 읽기)는 base 병합 뒤 리드가 알리면 rebase 해 붙인다. 그 전에는 지면 컴포넌트(계약 `EnglishSet` 을 받는 순수 컴포넌트) · 시험 · print-check 항목까지.
