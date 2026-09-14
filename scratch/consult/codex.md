Reading additional input from stdin...
2026-09-08T11:56:15.720452Z ERROR codex_models_manager::manager: failed to refresh available models: unexpected status 401 Unauthorized: Provided authentication token is expired., url: https://chatgpt.com/backend-api/codex/models?client_version=0.153.4, cf-ray: a37dc5bb5cdadb80-ICN, request id: req_8f772aeb19a44c2592c817ffda6187f3, auth error: 401, auth error code: token_expired
2026-09-08T11:56:15.725728Z ERROR codex_models_manager::manager: failed to refresh available models: unexpected status 401 Unauthorized: Provided authentication token is expired., url: https://chatgpt.com/backend-api/codex/models?client_version=0.153.4, cf-ray: a37dc5bb4851fa46-ICN, request id: req_369d2be608644577959c0a7829f9a5e0, auth error: 401, auth error code: token_expired
OpenAI Codex v0.153.4
--------
workdir: D:\todays-math
model: gpt-6-astra
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR]
reasoning effort: xhigh
reasoning summaries: none
session id: 01a080e0-41e9-7623-9a50-3e6297c80760
--------
user
# 협의 브리프 — 「다음에 무엇을 만들 것인가」

## 제품
수학학원 원장 **한 사람**이 쓰는 도구. 진도만 입력하면 일일/확인테스트가 자동 출제된다.
목표는 매일 30분~1시간의 출제 수작업 제거. Next.js 15 + Prisma + PostgreSQL.
사용자는 원장 1인 (학생 앱 없음, 학생은 원장이 관리하는 DB 행일 뿐).

## 지금 있는 것 (코드로 확인)
- 진도 기반 자동 출제 · 난이도 4단 배분 · 단원 고루 분산
- 문제은행(적재 100,828행) + 자체 생성 엔진(초등·중등, AI 아님) + AI 변형
- A4 인쇄(실측 페이지 패킹, 정답지, 넘침 판정) — 실물 검수 완료
- 기출 예상 점수 예측 (경쟁사 아무도 안 함)
- eywa 외부 진도 연동
- 문항 검수 콘솔·신고

## 🔴 핵심 발견
채점·결과·분석 리포트가 **API·모델·계약·목데이터·시험까지 전부 있는데 화면이 0개**다.
- 모델: TestResult / ProblemAnswer(문항별 isCorrect) / AnalysisReport(단원별 정답률,
  난이도 분포, recommendedUnits=복습 추천 단원)
- API: POST /api/tests/{id}/submit (자동채점+예상점수), GET /results, PATCH /scores
- recommendedUnits 를 계산해 저장하고 **읽는 코드가 어디에도 없다**

## 경쟁 조사 결과 (매쓰플랫·매쓰홀릭·메타수학·매쓰프로·포켓매쓰·수학대왕·모두매쓰·족보닷컴 등 10곳)
경쟁사 **전부**가 가진 축인데 우리가 0인 것:
- 오답 → 재출제 (오답 그대로 / 쌍둥이 / 유형 클리닉) ← 예외 없이 전부
- 채점 (QR·앱 자동채점)
- 학생별 유형 성취도 리포트
- 학부모 문자·성적표 발송
- 교재 연동 (시중교재 1,268~2,500종 쌍둥이 매칭)
- 출제 설정/디자인 저장
- 객관식/주관식/서술형 비중 지정

## 후보 (내 초안 우선순위)
① 출제 설정 저장 + 유형 비중 지정 — 작음, 기존 화면 안
② 채점 화면 — 큼, 새 화면. 이것 하나가 ③④⑤를 전부 연다
③ 오답 → 재출제 — 중간. familyKey(유형)로 「같은 유형 다른 문항」은 AI 없이 즉시 됨
④ 리포트 화면 — 중간. AnalysisReport 를 그리기만 하면 됨
⑤ 학부모 성적표 — 중간. 발송 수단부터 정해야
제외: 교재 연동(저작권+우리 무기 자멸) · 출결/교육비(범위 밖) · 학생 앱(제품 정의 변경) · 경시대회

## 물음 — 짧고 단호하게, 근거와 함께
1. **내 우선순위가 틀렸나?** 특히 ①을 ② 앞에 둔 것. 반대할 이유가 있으면 그것부터.
2. **②(채점 화면)의 진짜 위험**은 무엇인가? 원장 1인이 종이 시험지를 보고 O/X 만
   찍는 화면인데, 학생 수 × 문항 수 만큼 입력이 필요하다. 이게 「30분 수작업 제거」라는
   제품 목표와 **정면으로 충돌**하지 않나? 채점 입력이 출제보다 더 오래 걸리면?
3. **②를 건너뛰고 ③(오답 재출제)만 하는 길**이 있나? 오답 데이터 없이 «복습»을
   만들 다른 열쇠가 있나 (예: 진도 경과 시간, 유형별 출제 이력, 원장의 주관 표시).
4. 내가 **놓친 축**이 있나? 경쟁사 조사가 홍보 페이지 기반이라 광고 안 하는 기능은
   구조적으로 안 보인다.
5. 하나만 고른다면 무엇이고, **왜 나머지가 아닌가**.

각 답은 400자 이내. 동의는 짧게, 반대는 근거를 대라.
2026-09-08T11:56:16.383699Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when UnexpectedServerResponse("HTTP 401: {\n  \"error\": {\n    \"message\": \"Provided authentication token is expired.\",\n    \"type\": null,\n    \"code\": \"token_expired\",\n    \"param\": null\n  },\n  \"status\": 401,\n  \"detail\": {\n    \"code\": \"token_expired\",\n    \"message\": \"Provided authentication token is expired.\"\n  }\n}")
2026-09-08T11:56:16.859116Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when UnexpectedServerResponse("HTTP 401: {\n  \"error\": {\n    \"message\": \"Provided authentication token is expired.\",\n    \"type\": null,\n    \"code\": \"token_expired\",\n    \"param\": null\n  },\n  \"status\": 401,\n  \"detail\": {\n    \"code\": \"token_expired\",\n    \"message\": \"Provided authentication token is expired.\"\n  }\n}")
2026-09-08T11:56:17.089492Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when AuthRequired(AuthRequiredError { www_authenticate_header: "Bearer error=\"invalid_request\", error_description=\"No access token was provided in this request\", resource_metadata=\"https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/\"" })
2026-09-08T11:56:17.797108Z ERROR codex_api::endpoint::responses_websocket: failed to connect to websocket: HTTP error: 401 Unauthorized, url: wss://chatgpt.com/backend-api/codex/responses
2026-09-08T11:56:18.003968Z ERROR codex_api::endpoint::responses_websocket: failed to connect to websocket: HTTP error: 401 Unauthorized, url: wss://chatgpt.com/backend-api/codex/responses
2026-09-08T11:56:19.706573Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when AuthRequired(AuthRequiredError { www_authenticate_header: "Bearer error=\"invalid_request\", error_description=\"No access token was provided in this request\", resource_metadata=\"https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/\"" })
hook: SessionStart
hook: SessionStart Completed
hook: UserPromptSubmit
hook: UserPromptSubmit Completed
codex
코드와 채점 입력 흐름을 확인하고, 경쟁사 공식 자료도 대조해 우선순위의 반대 근거부터 짚겠습니다.
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse Completed
hook: PreToolUse Completed
hook: PreToolUse Completed
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n --glob '"'!package-lock.json'"' --glob '"'!pnpm-lock.yaml'"' 'recommendedUnits|model TestResult|model ProblemAnswer|model AnalysisReport|familyKey' prisma src app tests" in D:\todays-math
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'AGENTS.md'; Get-Content -LiteralPath 'package.json'" in D:\todays-math
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'C:\\Users\\user\\.agents\\skills\\orca-cli\\SKILL.md'; Get-Content -LiteralPath 'C:\\Users\\user\\.agents\\skills\\orchestration\\SKILL.md'" in D:\todays-math
 succeeded in 1945ms:
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes ??APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` ??verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Orca ??default parallel workflow

If work can be split into independent sessions, do that with Orca by default
(worktrees), then merge completed sessions into `main`. Sequential solo work
is only for tasks that cannot be split.

# Orca session cleanup

When an Orca-managed task is fully complete, its changes have been merged into
`main`, its worktree is clean, and it has no running work, remove the Orca
worktree so the finished session no longer appears in the workspace list.
Preserve its Git branch by default. Never remove an unmerged, dirty, or active
worktree.
{
  "name": "todays-math",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "lint:affordance": "node src/lint/check-affordance.mjs",
    "analyze": "next build --experimental-analyze && node scripts/perf/report-bundle.mjs",
    "analyze:webpack": "node scripts/perf/analyze-webpack.mjs",
    "bundle:report": "node scripts/perf/report-bundle.mjs",
    "type-check": "tsc --noEmit",
    "prepare": "husky",
    "test": "node scripts/qa/run-tests.mjs",
    "test:raw": "vitest run",
    "test:adv": "vitest run --config vitest.adversarial.mts",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "transfer:audit": "tsx scripts/transfer/audit-ocr-transfer.ts",
    "transfer:inventory": "tsx scripts/transfer/inventory-math-corpus.ts",
    "transfer:verify-engine": "tsx scripts/transfer/verify-engine-adapter.ts",
    "transfer:visual": "tsx scripts/transfer/run-visual-qa.ts",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "prisma db seed",
    "check:figures": "tsx scripts/qa/checkDeployedFigures.ts",
    "check:raw-latex": "tsx scripts/qa/checkLoadedRawLatex.ts"
  },
  "prisma": {
    "seed": "node prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.19.3",
    "bcryptjs": "^3.0.3",
    "katex": "^0.16.47",
    "mathjax-full": "^3.2.1",
    "next": "16.3.0",
    "next-auth": "^5.0.0-beta.32",
    "openai": "^7.4.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-markdown": "^10.1.0",
    "rehype-katex": "^7.0.1",
    "remark-math": "^6.0.0",
    "server-only": "0.0.1",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^16.3.1",
    "@playwright/test": "^1.62.1",
    "@tailwindcss/postcss": "^4",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.5",
    "@vitest/coverage-v8": "^4.1.10",
    "eslint": "^9",
    "eslint-config-next": "16.3.0",
    "eslint-config-prettier": "^10.1.8",
    "husky": "^9.1.7",
    "jsdom": "^29.1.1",
    "lint-staged": "^17.3.0",
    "msw": "^2.15.0",
    "prettier": "^3.9.6",
    "prisma": "^6.19.3",
    "tailwindcss": "^4",
    "tsx": "4.20.5",
    "typescript": "^5",
    "vite": "^8.2.1",
    "vitest": "^4.1.10"
  }
}

hook: PostToolUse
 succeeded in 2269ms:
---
name: orca-cli
description: >-
  Use the public `orca` CLI to operate Orca-managed worktrees, folder contexts,
  terminals, repos, automations, artifacts, skill sharing, worktree comments, and the browser
  embedded inside the Orca app. Use when the user says "$orca-cli", "use orca cli",
  "Orca worktree", "child worktree", "cardStatus", "spawn codex/claude in a worktree",
  "read/wait/send Orca terminal", "terminal send", "full handoff", "handover",
  "give this to another agent", "another worktree", "Orca browser", "orca artifacts",
  "share HTML/Markdown", "public artifact link", "share skills", or "control the browser inside
  Orca". Prefer this over raw `git worktree`, ad hoc
  PTYs, Playwright, or Computer Use when the task touches Orca-managed state.
  Use Computer Use for browser windows, webviews, or desktop UI outside Orca's
  embedded browser.
---

# Orca CLI

This file is a discovery stub, not the usage guide. The full, version-matched Orca CLI
reference is served by the `orca` binary itself ??kept out of this file on purpose so it
can never drift from the binary that will actually run your commands.

Engage Orca whenever its running editor/runtime is the source of truth: Orca-managed
worktrees, folder contexts, terminals, repos, automations, worktree comments, and the
browser embedded inside the Orca app. Triggers include "$orca-cli", "Orca worktree",
"child worktree", "spawn codex/claude in a worktree", "read/wait/send Orca terminal",
"full handoff" / "handover" / "give this to another agent", and "control the browser
inside Orca". Use plain shell tools when Orca state does not matter.

## Resolve the CLI for this session

Choose the executable once and reuse it for every later command:

- If the `ORCA_CLI_COMMAND` environment variable is set, use its value. Orca exports this
  for managed WSL sessions.
- Otherwise, in a dev checkout whose session exposes `ORCA_DEV_REPO_ROOT`, use `orca-dev`.
- Otherwise, on Linux outside an Orca-managed terminal, use `orca-ide`. Never run bare
  `orca` there ??outside Orca's terminals it normally resolves to the
  GNOME Orca screen reader (`/usr/bin/orca`) and starts speech on the user's machine.
- Otherwise, use `orca`.

Below, `ORCA` is a placeholder for the executable you resolved. Substitute it before
running anything; do not create a shell variable or run `ORCA` literally. This works the
same way in POSIX shells, PowerShell, and cmd.exe.

If the selected executable cannot run, report its exact error and stop. Do not fall through
to another executable, which could silently target a different Orca build.

## Load the full guide before running Orca commands

```text
ORCA skills get orca-cli
```

That prints the complete, version-matched guide for the exact binary that will handle your
next commands ??worktrees, handoffs, terminals, automations, and the built-in browser.
Read it first, then run the specific command you need.

Don't guess subcommands or flags from memory or from a cached copy of this stub. They
change between Orca releases, and this file deliberately no longer lists them. Confirm the
app is up with `ORCA status --json` (start it with `ORCA open --json` if needed), and
prefer `--json` for agent-driven calls.

## If an older Orca does not recognize `skills get`

Use this fallback only when the selected binary explicitly reports that `skills get` is an
unknown command. Another failure is not proof of an older binary; report it rather than
guessing or changing executables. For a confirmed pre-guide binary, use only this bounded,
read-only bootstrap to orient. Do not dead-end and do not invent commands:

```text
ORCA status --json
ORCA worktree ps --json
ORCA terminal list --json
```

Then tell the user that updating Orca restores the full, version-matched guide via
`ORCA skills get orca-cli`. Beyond these commands, ask the user rather than guessing a
command surface this older binary may not support.
---
name: orchestration
description: >-
  Use Orca orchestration for structured multi-agent coordination: threaded
  messages, blocking ask/reply flows, task dispatch, worker_done/escalation
  waits, task DAGs, decision gates, coordinator loops, or decomposing work
  across agents. Use `orca-cli` instead for full ownership handoffs, including
  requests phrased as "hand off", "handoff", "handover", "give this to another
  agent", or "another worktree" when the user did not explicitly ask to
  supervise, monitor, wait for results, or coordinate a DAG. Use `orca-cli` for
  terminal control, lightweight terminal prompts, shell commands, Orca
  worktree management, reading or waiting on terminals, and automation of the
  browser embedded inside Orca. Use Computer Use for external browser windows,
  webviews, Orca app UI, or desktop UI outside Orca's embedded browser only when
  the task requires OS/window-level control such as focus, menus, dialogs,
  coordinates, or screenshots. Use `orca-cli` for Orca's embedded pages and a
  page-automation tool such as Playwright or CDP for external pages.
---

# Orca Orchestration

This file is a discovery stub, not the usage guide. The full, version-matched Orca
orchestration reference is served by the `orca` binary itself ??kept out of this file on
purpose so it can never drift from the binary that will actually run your commands.

Engage Orca orchestration whenever you need structured multi-agent coordination: threaded
messages, blocking ask/reply flows, task dispatch, worker_done/escalation waits, task DAGs,
decision gates, coordinator loops, or decomposing work across agents. Use the orca-cli skill
instead for full ownership handoffs ("hand off", "handoff", "handover", "give this to
another agent", "another worktree") when the user did not ask to supervise, monitor, wait
for results, or coordinate a DAG ??and for ordinary terminal control, shell commands,
worktree management, and the built-in browser. Coordination requires real Orca runtime
state; never substitute a non-Orca subagent tool.

## Resolve the CLI for this session

Choose the executable once and reuse it for every later command:

- If the `ORCA_CLI_COMMAND` environment variable is set, use its value. Orca exports this
  for managed WSL sessions.
- Otherwise, in a dev checkout whose session exposes `ORCA_DEV_REPO_ROOT`, use `orca-dev`.
- Otherwise, on Linux outside an Orca-managed terminal, use `orca-ide`. Never run bare
  `orca` there ??outside Orca's terminals it normally resolves to the
  GNOME Orca screen reader (`/usr/bin/orca`) and starts speech on the user's machine.
- Otherwise, use `orca`.

Below, `ORCA` is a placeholder for the executable you resolved. Substitute it before
running anything; do not create a shell variable or run `ORCA` literally. This works the
same way in POSIX shells, PowerShell, and cmd.exe.

If the selected executable cannot run, report its exact error and stop. Do not fall through
to another executable, which could silently target a different Orca build.

## Load the full guide before running Orca commands

```text
ORCA skills get orchestration
```

That prints the complete, version-matched guide for the exact binary that will handle your
next commands ??task creation and dispatch, injected lifecycle preambles, worker_done
authority, decision gates, and coordinator loops. Read it first, then run the specific
command you need.

Don't guess subcommands or flags from memory or from a cached copy of this stub. They
change between Orca releases, and this file deliberately no longer lists them. Confirm the
app is up with `ORCA status --json` (start it with `ORCA open --json` if needed), and
prefer `--json` for agent-driven calls.

## If an older Orca does not recognize `skills get`

Use this fallback only when the selected binary explicitly reports that `skills get` is an
unknown command. Another failure is not proof of an older binary; report it rather than
guessing or changing executables. For a confirmed pre-guide binary, use only this bounded,
read-only bootstrap to orient. Do not dead-end and do not invent commands:

```text
ORCA status --json
ORCA orchestration task-list --json
ORCA terminal list --json
```

Then tell the user that updating Orca restores the full, version-matched guide via
`ORCA skills get orchestration`. Beyond these commands, ask the user rather than guessing a
command surface this older binary may not support.

hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
 exited 1 in 8246ms:
rg : 'rg' 용어가 cmdlet, 함수, 스크립트 파일 또는 실행할 수 있는 프로그램 이름으로 인식되지 않습니다. 이름이 정확한지 확인하고 경로가 포함된 경우 경로가 올바른지 검증한 다음 다시 시도하십시오.
위치 줄:2 문자:1
+ rg -n --glob '!package-lock.json' --glob '!pnpm-lock.yaml' 'recommend ...
+ ~~
    + CategoryInfo          : ObjectNotFound: (rg:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
 

hook: PostToolUse
hook: PostToolUse Completed
codex
저장소 규칙에 따라 `orca-cli`와 `orchestration` 스킬로 코드 검토를 분리하겠습니다. 판단의 핵심은 채점 화면의 크기보다, 종이 채점 결과를 다시 입력하는 시간을 얼마나 줄이느냐입니다.
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse Completed
hook: PreToolUse Completed
hook: PreToolUse Completed
web search: 
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Item Env:ORCA_CLI_COMMAND,Env:ORCA_DEV_REPO_ROOT -ErrorAction SilentlyContinue; Get-Command orca -ErrorAction SilentlyContinue' in D:\todays-math
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "git grep -n -E 'recommendedUnits|model TestResult|model ProblemAnswer|model AnalysisReport|familyKey' -- prisma src" in D:\todays-math
 succeeded in 300ms:
prisma/schema.prisma:311:  /// 엔진이 적는 유형 정체. `Problem.familyKey` 와 같은 값이다.
prisma/schema.prisma:312:  familyKey  String   @map("family_key")
prisma/schema.prisma:321:  @@id([unitId, familyKey])
prisma/schema.prisma:467:  familyKey        String?      @map("family_key")
prisma/schema.prisma:514:  @@index([unitId, familyKey])
prisma/schema.prisma:721:model TestResult {
prisma/schema.prisma:745:model ProblemAnswer {
prisma/schema.prisma:767:model AnalysisReport {
prisma/schema.prisma:779:  recommendedUnits       String[] @map("recommended_units")
src/__tests__/api/aiGenerateQuestionType.test.ts:55:  familyKey: string | null;
src/__tests__/api/problem.test.ts:601:  it("🔴 문항류 정체(`familyKey`)를 **실어 보낸다** — 안 실으면 규칙이 조용히 꺼진다", async () => {
src/__tests__/api/problem.test.ts:603:    // 그런데 이 조회가 `familyKey` 를 select 하지 않으면 전량이 «키 없음» 으로 도착하고,
src/__tests__/api/problem.test.ts:609:    // `familyKey` 를 빼면 이 시험이 빨개진다.
src/__tests__/api/problem.test.ts:615:      // ⚠️ `toHaveProperty("familyKey")` 로 쓰면 **초록인 가드**가 된다 — 매핑이
src/__tests__/api/problem.test.ts:616:      //    `familyKey: row.familyKey` 로 키를 **언제나 만들기** 때문에, select 에서
src/__tests__/api/problem.test.ts:619:      expect(row.familyKey).not.toBeUndefined();
src/__tests__/api/problemFormatFilter.test.ts:23: * 엔진 문항(`familyKey` 가 `elem:`/`mid:`)이 여는 갈래는 여기서 못 심는다 — 이 대역의
src/__tests__/api/problemFormatFilter.test.ts:24: * `problem.create` 가 `familyKey` 를 **무조건 null 로** 덮는다. 그 갈래는 위 단위 시험이
src/__tests__/api/problemTransform.test.ts:522:   * `classifyFormat` 은 주관식 문항을 가를 때 ㉠ `questionType` ㉡ `familyKey` 의 엔진
src/__tests__/api/problemTransform.test.ts:524:   * `familyKey` 를 `solo:` 로 채우므로 ㉡ 로 구제되지 않는다 — 그래서 ㉠ 을 여기서
src/__tests__/api/testresult.test.ts:177:    expect(report.recommendedUnits).toContain(MOCK_UNITS[1]!.id);
src/__tests__/api/testresult.test.ts:212:    expect(body.data.analysisReport.recommendedUnits).toEqual([]);
src/__tests__/components/aiDraftReview.test.tsx:51:    familyKey: `solo:a0000000-0000-4000-8000-00000000000${index}`,
src/__tests__/components/provenanceBadges.test.tsx:35:    familyKey: null,
src/__tests__/components/provenanceBadges.test.tsx:44:  familyKey: "elem:초6|2-5-1 원주와 원주율 알아보기|연산",
src/__tests__/components/provenanceBadges.test.tsx:48:  familyKey: "elem:초5|2-2-4 분수의 곱셈|응용",
src/__tests__/components/provenanceBadges.test.tsx:94:const 옛수동 = problem({ familyKey: null, questionType: null });
src/__tests__/fixtures/aiGeneratedRows.json:9:    "familyKey": "solo:ac3cc66e-c567-402d-a815-308e6a6531bc",
src/__tests__/fixtures/aiGeneratedRows.json:21:    "familyKey": "solo:d322a7ef-4741-455a-9d23-994e273c17b7",
src/__tests__/fixtures/aiGeneratedRows.json:33:    "familyKey": "solo:ddcb990b-286b-4e88-a7dc-19f34f5146fd",
src/__tests__/fixtures/aiGeneratedRows.json:45:    "familyKey": "solo:3b6f8a37-a9c2-4a6e-bb9a-d5c63d89b4c2",
src/__tests__/fixtures/aiGeneratedRows.json:57:    "familyKey": "solo:c0a288f0-7864-4a5a-97a7-f4752f0ce2bf",
src/__tests__/fixtures/aiGeneratedRows.json:69:    "familyKey": "solo:84afcd3e-04dd-4f26-a588-6232b183d466",
src/__tests__/fixtures/aiGeneratedRows.json:81:    "familyKey": "solo:500efa7e-7edb-4f7a-9116-154790f82a0a",
src/__tests__/fixtures/aiGeneratedRows.json:93:    "familyKey": "solo:f97d57e4-c8d8-489c-a44b-72032cf2e08c",
src/__tests__/fixtures/aiGeneratedRows.json:105:    "familyKey": "solo:653aee37-de4b-4a59-a0c7-f023f8ffa888",
src/__tests__/fixtures/aiGeneratedRows.json:117:    "familyKey": "solo:1e475a06-ce10-4562-9978-ef68d50cfaea",
src/__tests__/unit/aiQuestionType.test.ts:12: * 단답형/서술형이거나 ㉡ `familyKey` 가 `elem:`/`mid:` 이거나 ㉢ `questionType` 이
src/__tests__/unit/aiQuestionType.test.ts:14: * `familyKey` 가 `solo:<uuid>` 라 ㉡ 도 아니어서 **`unknown` 으로 떨어진다.**
src/__tests__/unit/aiQuestionType.test.ts:39:    familyKey: "solo:00000000-0000-4000-8000-000000000000",
src/__tests__/unit/balanceDifficultyLadder.test.ts:27:    familyKey: `mid:fixture|${tier}|${String(i).padStart(2, "0")}`,
src/__tests__/unit/balanceDifficultyLadder.test.ts:46:    expect(new Set(problems.map((p) => p.familyKey)).size).toBe(10);
src/__tests__/unit/contracts.smoke.test.ts:168:      familyKey: null,
src/__tests__/unit/deriveFormats.test.ts:6: *         familyKey 는 형식에 갈라지지 않는다.
src/__tests__/unit/deriveFormats.test.ts:36:  familyKey: FAMILY,
src/__tests__/unit/deriveFormats.test.ts:43:  familyKey: string;
src/__tests__/unit/deriveFormats.test.ts:50:    familyKey: p.familyKey,
src/__tests__/unit/deriveFormats.test.ts:57:  it("본문·정답·familyKey·problemType 을 그대로 두고 questionType 만 단답형이다", () => {
src/__tests__/unit/deriveFormats.test.ts:61:    expect(got.familyKey).toBe(FAMILY);
src/__tests__/unit/deriveFormats.test.ts:103:  it("familyKey 는 그대로다", () => {
src/__tests__/unit/deriveFormats.test.ts:104:    expect(asDescriptive(STEM).familyKey).toBe(FAMILY);
src/__tests__/unit/deriveFormats.test.ts:192:    expect(got.familyKey).toBe(FAMILY);
src/__tests__/unit/deriveFormats.test.ts:267:describe("세 형식 — familyKey 가 갈라지지 않는다", () => {
src/__tests__/unit/deriveFormats.test.ts:268:  it("객·단·서의 familyKey 는 하나다", () => {
src/__tests__/unit/deriveFormats.test.ts:272:        three.단답형.familyKey,
src/__tests__/unit/deriveFormats.test.ts:273:        three.객관식.familyKey,
src/__tests__/unit/deriveFormats.test.ts:274:        three.서술형.familyKey,
src/__tests__/unit/deriveFormats.test.ts:277:    expect(three.단답형.familyKey).toBe(FAMILY);
src/__tests__/unit/deriveFormats.test.ts:414:      familyKey: "elem:초3|1-1-1|01",
src/__tests__/unit/deriveFormats.test.ts:465:      familyKey: "mid:test",
src/__tests__/unit/deriveFormats.test.ts:511:      familyKey: "mid:test",
src/__tests__/unit/deriveFormats.test.ts:551:      familyKey: "mid:test",
src/__tests__/unit/deriveFormats.test.ts:582:      familyKey: "mid:test",
src/__tests__/unit/deriveFormats.test.ts:662:      familyKey: "mid:test",
src/__tests__/unit/deriveFormats.test.ts:686:      familyKey: "mid:test",
src/__tests__/unit/elemFamilyPilot.test.ts:4: * 적재기 familyKey 조립은 이 파일이 소스 문자열로 잠근다. 바꾸면 이관이 시작된다.
src/__tests__/unit/elemFamilyPilot.test.ts:25:import { familyIdOf } from "@/lib/generator/familyKey";
src/__tests__/unit/elemFamilyPilot.test.ts:55:describe("적재기 familyKey 는 소단원×문형", () => {
src/__tests__/unit/elemFamilyPilot.test.ts:72:      /familyKey = `elem:\$\{unit\.grade\}\|\$\{unit\.section\}\|\$\{form\.id\}`/,
src/__tests__/unit/elemFamilyPilot.test.ts:75:    expect(src).not.toMatch(/familyKey: `elem:[^`]*\$\{tier\}`/);
src/__tests__/unit/elemFamilyPilot.test.ts:185:  it("문형마다 변형 3 × 단답이 나오고 familyKey 는 문형 id 다", () => {
src/__tests__/unit/elemFamilyPilot.test.ts:190:        const familyKey = pilotFamilyKey(unit, form.id);
src/__tests__/unit/elemFamilyPilot.test.ts:204:              familyKey,
src/__tests__/unit/elemFamilyPilot.test.ts:220:        expect(new Set(got.items.map((i) => i.familyKey))).toEqual(
src/__tests__/unit/elemFamilyPilot.test.ts:221:          new Set([familyKey]),
src/__tests__/unit/elemFamilyPilot.test.ts:239:        const familyKey = pilotFamilyKey(unit, form.id);
src/__tests__/unit/elemFamilyPilot.test.ts:251:              familyKey,
src/__tests__/unit/elemFamilyPilot.test.ts:267:              familyKey,
src/__tests__/unit/expandEngine.test.ts:17:  it("수 정답이면 변형 3 × 형식 2 = 6행이고 familyKey 는 하나다", () => {
src/__tests__/unit/expandEngine.test.ts:18:    const familyKey = "elem:fixture|최대공약수|기본";
src/__tests__/unit/expandEngine.test.ts:23:      familyKey,
src/__tests__/unit/expandEngine.test.ts:28:    expect(new Set(got.items.map((i) => i.familyKey)).size).toBe(1);
src/__tests__/unit/expandEngine.test.ts:39:      familyKey: "elem:fixture|정비례|기본",
src/__tests__/unit/expandEngine.test.ts:73:        familyKey: "elem:fixture|파생금지|기본",
src/__tests__/unit/expandEngine.test.ts:88:    const familyKey = `elem:${unit!.grade}|${unit!.section}|기본`;
src/__tests__/unit/expandEngine.test.ts:95:        familyKey,
src/__tests__/unit/expandEngine.test.ts:104:        familyKey: item.familyKey,
src/__tests__/unit/expandEngine.test.ts:109:      expect(item.familyKey).toBe(familyKey);
src/__tests__/unit/expandEngine.test.ts:117:    const familyKey = `mid:${entry.key}`;
src/__tests__/unit/expandEngine.test.ts:124:        familyKey,
src/__tests__/unit/expandEngine.test.ts:134:        familyKey: item.familyKey,
src/__tests__/unit/expandEngine.test.ts:139:      expect(item.familyKey).toBe(familyKey);
src/__tests__/unit/expandEngine.test.ts:164:      familyKey: "mid:2-1|일차부등식|01",
src/__tests__/unit/expandEngine.test.ts:202:      familyKey: "mid:2-1|일차함수와 그 그래프|01",
src/__tests__/unit/expandEngine.test.ts:221:          familyKey: item.familyKey,
src/__tests__/unit/familyDedupe.test.ts:14: * 1. 정체 판정이 **단원과 함께** 본다 — DB 가 `@@id([unitId, familyKey])` 로 잠근다.
src/__tests__/unit/familyDedupe.test.ts:30:import { countFamilies, familyIdOf } from "@/lib/generator/familyKey";
src/__tests__/unit/familyDedupe.test.ts:71:    const a = problem("a", { unitId: UNIT_A, familyKey: "elem:초6|구|연산" });
src/__tests__/unit/familyDedupe.test.ts:72:    const b = problem("b", { unitId: UNIT_B, familyKey: "elem:초6|구|연산" });
src/__tests__/unit/familyDedupe.test.ts:77:    const a = problem("a", { familyKey: "elem:초6|구|연산" });
src/__tests__/unit/familyDedupe.test.ts:78:    const b = problem("b", { familyKey: "elem:초6|구|연산" });
src/__tests__/unit/familyDedupe.test.ts:84:      problem("n1", { familyKey: null }),
src/__tests__/unit/familyDedupe.test.ts:85:      problem("n2", { familyKey: null }),
src/__tests__/unit/familyDedupe.test.ts:86:      problem("n3", { familyKey: "" }),
src/__tests__/unit/familyDedupe.test.ts:87:      problem("n4", { familyKey: "   " }),
src/__tests__/unit/familyDedupe.test.ts:95:    expect(familyIdOf(problem("a", { familyKey: " k " }))).toBe(
src/__tests__/unit/familyDedupe.test.ts:96:      familyIdOf(problem("b", { familyKey: "k" })),
src/__tests__/unit/familyDedupe.test.ts:104:      problem("a", { familyKey: "k1" }),
src/__tests__/unit/familyDedupe.test.ts:105:      problem("b", { familyKey: "k1" }),
src/__tests__/unit/familyDedupe.test.ts:106:      problem("c", { familyKey: "k1" }),
src/__tests__/unit/familyDedupe.test.ts:107:      problem("d", { familyKey: "k2" }),
src/__tests__/unit/familyDedupe.test.ts:121:      problem("s1", { familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:122:      problem("s2", { familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:123:      problem("s3", { familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:124:      problem("s4", { familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:135:      problem("a1", { difficulty: "응용", familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:136:      problem("b1", { difficulty: "기본", familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:137:      problem("b2", { difficulty: "기본", familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:146:      problem("x1", { difficulty: "기본", familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:147:      problem("x2", { difficulty: "응용", familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:148:      problem("y1", { difficulty: "응용", familyKey: "원" }),
src/__tests__/unit/familyDedupe.test.ts:161:      problem("p1", { familyKey: null }),
src/__tests__/unit/familyDedupe.test.ts:162:      problem("p2", { familyKey: null }),
src/__tests__/unit/familyDedupe.test.ts:163:      problem("p3", { familyKey: null }),
src/__tests__/unit/familyDedupe.test.ts:164:      problem("p4", { familyKey: null }),
src/__tests__/unit/familyDedupe.test.ts:173:      problem("s1", { familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:174:      problem("s2", { familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:175:      problem("s3", { familyKey: "구" }),
src/__tests__/unit/familyDedupe.test.ts:176:      problem("s4", { familyKey: "원" }),
src/__tests__/unit/familyDedupe.test.ts:177:      problem("s5", { familyKey: "원" }),
src/__tests__/unit/familyDedupe.test.ts:203:        pool.push(problem(`${key}-${i}`, { difficulty: tier, familyKey: key }));
src/__tests__/unit/familyDedupe.test.ts:229:        pool.push(problem(`k${k}-${i}`, { familyKey: `key-${k}` }));
src/__tests__/unit/familyMainProblem.test.ts:15:  familyKey: "mid:1-1|소인수분해|02",
src/__tests__/unit/familyMainProblem.test.ts:21:  familyKey: "mid:1-1|소인수분해|02",
src/__tests__/unit/familyMainProblem.test.ts:27:  familyKey: "mid:1-1|소인수분해|02",
src/__tests__/unit/familyMainProblem.test.ts:52:    const 원본 = { ...대표, familyKey: KEY };
src/__tests__/unit/familyMainProblem.test.ts:53:    const 변형 = { ...변형2, familyKey: KEY };
src/__tests__/unit/familyMainProblem.test.ts:60:      familyKey: "solo:11111111-2222-4333-8444-555555555555",
src/__tests__/unit/familyMainProblem.test.ts:64:      familyKey: "solo:99999999-2222-4333-8444-555555555555",
src/__tests__/unit/familyMainProblem.test.ts:70:    const 레거시 = { ...변형2, familyKey: null };
src/__tests__/unit/familyMainProblem.test.ts:71:    expect(pickFamilyMain(레거시, [{ ...대표, familyKey: null }]).id).toBe(
src/__tests__/unit/familyMainProblem.test.ts:77:   * 🔴 **단원이 다르면 다른 류다** — `ProblemFamily` 의 복합키 `@@id([unitId, familyKey])`
src/__tests__/unit/loadComboRows.test.ts:40:    const ids = new Set(rows.map((r) => r.familyKey));
src/__tests__/unit/middleM1Top4.test.ts:1175:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5a.test.ts:1031:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5b.test.ts:1260:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5c.test.ts:1390:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5d.test.ts:1197:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5e.test.ts:1239:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5f.test.ts:1666:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5g.test.ts:1292:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5h.test.ts:1349:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Top5i.test.ts:1337:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM1Types10.test.ts:577:          familyKey: `mid:${entry.key}`,
src/__tests__/unit/middleM1Types10.test.ts:594:    expect(new Set(problems.map((p) => p.familyKey)).size).toBe(10);
src/__tests__/unit/middleM3Top5a.test.ts:1172:              familyKey: `mid:${e.key}`,
src/__tests__/unit/middleM3Top5b.test.ts:887:            familyKey: `mid:${e.key}`,
src/__tests__/unit/poolSlotOccupancy.test.ts:6: * 적재기의 DB 대조가 `familyKey` 로만 골라 **출제할 수 없는 행까지** 「이미 있다」로
src/__tests__/unit/problemFormatFilter.test.ts:8: * 보기 칸 수를 세고, 거기에 `answer`·`questionType`·`familyKey`·`problemType` 을 함께 본다.
src/__tests__/unit/problemFormatFilter.test.ts:90:        for (const familyKey of FAMILY_KEYS) {
src/__tests__/unit/problemFormatFilter.test.ts:91:          rows.push({ answer, questionType, problemType, familyKey });
src/__tests__/unit/problemFormatFilter.test.ts:100:  return `answer=${ev.answer} qt=${ev.questionType ?? "null"} pt=${ev.problemType ?? "null"} family=${ev.familyKey ?? "null"}`;
src/__tests__/unit/problemFormatFilter.test.ts:269:        familyKey: null,
src/__tests__/unit/problemFormatFilter.test.ts:279:        familyKey: null,
src/__tests__/unit/problemFormatFilter.test.ts:290:        familyKey: "elem:초6|x|연산",
src/__tests__/unit/problemFormatFilter.test.ts:300:        familyKey: "mid:3-1|y|06",
src/__tests__/unit/problemFormatFilter.test.ts:311:        familyKey: "solo:abc",
src/__tests__/unit/problemFormatFilter.test.ts:322:        familyKey: null,
src/__tests__/unit/problemFormatFilter.test.ts:332:        familyKey: null,
src/__tests__/unit/problemFormatFilter.test.ts:339:      { answer: "①", questionType: null, problemType: "개념", familyKey: null },
src/__tests__/unit/problemFormatFilter.test.ts:348:        familyKey: null,
src/__tests__/unit/problemFormatFilter.test.ts:359:        familyKey: null,
src/__tests__/unit/problemFormatFilter.test.ts:366:      { answer: "3", questionType: null, problemType: "개념", familyKey: null },
src/__tests__/unit/problemFormatFilter.test.ts:377:    for (const familyKey of ["elem:초6|x|연산", "mid:3-1|y|06"]) {
src/__tests__/unit/problemFormatFilter.test.ts:382:        familyKey,
src/__tests__/unit/problemFormatFilter.test.ts:384:      expect(formatSuperset(ev, "short_answer"), familyKey).toBe(true);
src/__tests__/unit/problemFormatFilter.test.ts:385:      expect(formatSuperset(ev, "descriptive"), familyKey).toBe(false);
src/__tests__/unit/problemFormatFilter.test.ts:501:            { familyKey: { startsWith: "elem:" } },
src/__tests__/unit/problemFormatFilter.test.ts:515:            { familyKey: null },
src/__tests__/unit/problemFormatFilter.test.ts:516:            { familyKey: "" },
src/__tests__/unit/problemFormatFilter.test.ts:517:            { NOT: { familyKey: { startsWith: "mid:" } } },
src/__tests__/unit/problemFormatFilter.test.ts:591:      familyKey: null,
src/__tests__/unit/problemProvenance.test.ts:15: *    그 한 줄이 이 시험에 있다 — 없으면 「왜 familyKey 를 쓰는가」가 주장으로만 남는다.
src/__tests__/unit/problemProvenance.test.ts:48:  familyKey: null,
src/__tests__/unit/problemProvenance.test.ts:79:    familyKey: "elem:초6|2-5-1 원주와 원주율 알아보기|연산",
src/__tests__/unit/problemProvenance.test.ts:82:  중등: { ...BLANK, familyKey: "mid:3-1|근호를 포함한 식의 계산|06" },
src/__tests__/unit/problemProvenance.test.ts:87:  옛수동: { ...BLANK, familyKey: null },
src/__tests__/unit/problemProvenance.test.ts:92:  손등록: { ...BLANK, familyKey: "solo:11111111-2222-4333-8444-555555555555" },
src/__tests__/unit/problemProvenance.test.ts:119:      classifyOrigin({ ...SHAPES.AI변형, familyKey: "elem:x|y|연산" }),
src/__tests__/unit/problemProvenance.test.ts:208:      "초등 엔진(familyKey) → 단답형",
src/__tests__/unit/problemProvenance.test.ts:212:        familyKey: "elem:초6|단원|연산",
src/__tests__/unit/problemProvenance.test.ts:217:      "중등 엔진(familyKey) → 단답형",
src/__tests__/unit/problemProvenance.test.ts:221:        familyKey: "mid:3-1|단원|01",
src/__tests__/unit/problemProvenance.test.ts:509:        return { familyKey: "elem:x|y|연산" };
src/__tests__/unit/problemProvenance.test.ts:511:        return { familyKey: "mid:x|y|01" };
src/app/api/problems/route.ts:136:      familyKey: true,
src/app/api/problems/transform/adopt/route.ts:66:    askedOrigin.familyKey?.trim()
src/app/api/problems/transform/adopt/route.ts:70:            familyKey: askedOrigin.familyKey,
src/app/api/problems/transform/adopt/route.ts:72:          select: { id: true, unitId: true, familyKey: true, createdAt: true },
src/app/api/problems/transform/adopt/route.ts:149:      familyKey: origin.familyKey,
src/app/api/problems/transform/adopt/route.ts:154:      // (원장님 지적 2026-08-26). 변형본의 `familyKey` 도 트리거가 `solo:` 로 채우므로
src/app/api/problems/transform/route.ts:67:    asked.familyKey?.trim()
src/app/api/problems/transform/route.ts:69:          where: { unitId: asked.unitId, familyKey: asked.familyKey },
src/app/api/problems/transform/route.ts:70:          select: { id: true, unitId: true, familyKey: true, createdAt: true },
src/app/dev/render-a-preview/fixtures.ts:10:  familyKey: null,
src/contracts/problem.contract.ts:149:  familyKey: z.string().nullable(),
src/contracts/testresult.contract.ts:100:  recommendedUnits: z.array(uuidSchema),
src/lib/ai/generator.ts:59:   *    `familyKey` 가 `solo:<uuid>` 라 엔진 표지로도 구제되지 않는다.
src/lib/ai/questionType.ts:8: * 못 찾아 `unknown` 을 낸다 — 초등·중등 엔진은 `familyKey` 가 `elem:`/`mid:` 라
src/lib/ai/questionType.ts:9: * 그 표지로 구제되지만, AI 문항의 `familyKey` 는 트리거가 넣는 `solo:<uuid>` 다.
src/lib/elementary/forms.ts:5: * 문형 id 는 엔진에만 둔다. 적재기 `familyKey` 조립은 손대지 않는다
src/lib/elementary/types.ts:17:   * 파일럿 3소단원만 채운다. 적재기 `familyKey` 에는 안 실는다.
src/lib/engine/deriveFormats.ts:5: * 나가는 자리 **한 곳**만 거친다. familyKey 는 형식에 갈라지지 않는다 —
src/lib/engine/deriveFormats.ts:22:  familyKey: string;
src/lib/engine/expandEngine.ts:5: * 그 함수들의 산출을 여기서만 펼친다. familyKey 는 호출부가 넘긴 값을
src/lib/engine/variants.ts:117: * 적재기의 DB 대조가 `familyKey` 로만 골라 **잠긴 행까지** 자리로 셌다. 초등에는
src/lib/findEligibleProblems.ts:107:      familyKey: true,
src/lib/findEligibleProblems.ts:128:    familyKey: row.familyKey,
src/lib/generator/balanceDifficulty.ts:21:import { countFamilies, familyIdOf } from "./familyKey";
src/lib/generator/balanceDifficulty.ts:53:  familyKey?: string | null;
Binary file src/lib/generator/familyKey.ts matches
src/lib/problem/familyMainProblem.ts:22: *    대신 **같은 `(unitId, familyKey)` 안에서 가장 먼저 만들어진 행**을 고른다.
src/lib/problem/familyMainProblem.ts:32: *    묶는 기준은 `familyIdOf`(generator/familyKey.ts)와 **같다**: 키 문자열이 같고
src/lib/problem/familyMainProblem.ts:39:  familyKey: string | null;
src/lib/problem/familyMainProblem.ts:47: * @param siblings 같은 `(unitId, familyKey)` 인 행들 — 호출부가 조회해서 넘긴다.
src/lib/problem/familyMainProblem.ts:54:  const key = self.familyKey?.trim();
src/lib/problem/familyMainProblem.ts:60:    (s) => s.unitId === self.unitId && s.familyKey?.trim() === key,
src/lib/problem/provenance.ts:37: *    가르는 값은 코드가 아니라 **`familyKey`** 다. 엔진이 «자기 유형 정체»를 직접 적는
src/lib/problem/provenance.ts:48: * `familyKey` 가 없는 옛 행이고, 전량 `pool=private`·`rejected`·출제불가(격리)다.
src/lib/problem/provenance.ts:134:  familyKey: string | null;
src/lib/problem/provenance.ts:151:   * ⚠️ `familyKey`(위 `FormatEvidence`)를 **널로 두면 「엔진이 아니다」가 된다.** 그래서
src/lib/problem/provenance.ts:162:/** 엔진이 `familyKey` 앞에 붙이는 표지. 엔진 말고는 아무도 이 접두사를 안 쓴다(D-105). */
src/lib/problem/provenance.ts:196:  const family = problem.familyKey ?? "";
src/lib/problem/provenance.ts:226: *    - `familyKey` 가 `elem:` / `mid:` 인 엔진 생성 문항(전량 단답형)
src/lib/problem/provenance.ts:263:    if (isEngineFamily(problem.familyKey)) return "short_answer";
src/lib/problem/provenance.ts:286:function isEngineFamily(familyKey: string | null | undefined): boolean {
src/lib/problem/provenance.ts:287:  const family = familyKey ?? "";
src/lib/problem/provenance.ts:358:  if (isEngineFamily(problem.familyKey)) return null;
src/lib/problem/provenance.ts:378:type FormatCol = "questionType" | "problemType" | "familyKey";
src/lib/problem/provenance.ts:428:  or(eq("questionType", "서술형"), prefix("familyKey", "elem:")),
src/lib/problem/provenance.ts:430:  not(prefix("familyKey", "mid:")),
src/lib/problem/provenance.ts:448:  ...ENGINE_PREFIX.map(([value]) => prefix("familyKey", value)),
src/lib/serializers.ts:83:    familyKey: row.familyKey,
src/lib/serializers.ts:179:    recommendedUnits: row.recommendedUnits,
src/lib/testResults/buildAnalysisReport.ts:6: * - recommendedUnits: 정답률이 RECOMMEND_THRESHOLD(60%) 미만인 단원을 낮은 순으로 최대
src/lib/testResults/buildAnalysisReport.ts:30:  recommendedUnits: string[];
src/lib/testResults/buildAnalysisReport.ts:63:  const recommendedUnits = unitRatios
src/lib/testResults/buildAnalysisReport.ts:69:  return { unitScores, difficultyDistribution, recommendedUnits };
src/lib/testResults/submitTestResult.ts:87:  const { unitScores, difficultyDistribution, recommendedUnits } =
src/lib/testResults/submitTestResult.ts:120:        recommendedUnits,
src/lib/tests/generateDraftTest.ts:15:import { countFamilies } from "@/lib/generator/familyKey";
src/lib/tests/replaceTestProblem.ts:13:import { familyIdOf } from "@/lib/generator/familyKey";
src/mocks/data/aiProblems.ts:55:    familyKey: null,
src/mocks/data/aiProblems.ts:78:    familyKey: null,
src/mocks/data/aiProblems.ts:100:    familyKey: null,
src/mocks/data/aiProblems.ts:123:    familyKey: null,
src/mocks/data/aiProblems.ts:145:    familyKey: null,
src/mocks/data/aiProblems.ts:171:    familyKey: null,
src/mocks/data/aiProblems.ts:192:    familyKey: null,
src/mocks/data/aiProblems.ts:213:    familyKey: null,
src/mocks/data/problems.ts:430:    familyKey: null,
src/mocks/data/problems.ts:475:  familyKey: null,
src/mocks/data/problems.ts:502:  familyKey: null,
src/mocks/data/problems.ts:534:  familyKey: null,
src/mocks/data/problems.ts:558:  familyKey: null,
src/mocks/handlers/problem.ts:123:          familyKey: null,
src/mocks/handlers/problem.ts:409:      familyKey: null,
src/mocks/prismaTestDouble.ts:124:  familyKey: string | null;
src/mocks/prismaTestDouble.ts:239:  recommendedUnits: string[];
src/mocks/prismaTestDouble.ts:399:      familyKey: null,
src/mocks/prismaTestDouble.ts:489:    familyKey: null,
src/mocks/prismaTestDouble.ts:1310:        familyKey: null,
src/mocks/prismaTestDouble.ts:1354:          familyKey: null,
src/mocks/prismaTestDouble.ts:1961:        recommendedUnits: string[];
src/mocks/prismaTestDouble.ts:1971:        recommendedUnits: data.recommendedUnits,

hook: PostToolUse
web search: site.mathflat.com 채점 오답 번호 입력 일괄 채점 ...
hook: PostToolUse
hook: PostToolUse Completed
hook: PostToolUse Completed
 exited 1 in 2765ms:
hook: PostToolUse
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse Completed
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'orca skills get orchestration' in D:\todays-math
 exited 1 in 2232ms:
orca : 'orca' 용어가 cmdlet, 함수, 스크립트 파일 또는 실행할 수 있는 프로그램 이름으로 인식되지 않습니다. 이름이 정확한지 확인하고 경로가 포함된 경우 경로가 올바른지 검증한 다음 다시 시도하십
시오.
위치 줄:2 문자:1
+ orca skills get orchestration
+ ~~~~
    + CategoryInfo          : ObjectNotFound: (orca:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
 

hook: PostToolUse
hook: PostToolUse Completed
codex
`orca` 실행 시 “명령으로 인식되지 않습니다” 오류가 나서 병렬 세션은 사용할 수 없습니다. 직접 읽기 검토를 이어가겠습니다. 경쟁사 공식 가이드에는 이미 오답 번호만 입력하는 방식이 있어, ②를 모든 문항의 O/X 입력으로 설계할 이유는 없습니다.
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse Completed
hook: PreToolUse Completed
web search: 
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "git grep -n -E 'recommendedUnits|studentAnswer|isCorrect|scores' -- 'src/app/api/tests/*' 'src/lib/services/*' 'src/lib/contracts/*'; Get-Content -LiteralPath 'prisma/schema.prisma' | Select-Object -Skip 670 -First 135; Get-Content -LiteralPath 'src/app/api/tests/[id]/submit/route.ts'" in D:\todays-math
 succeeded in 427ms:
src/app/api/tests/[id]/scores/route.ts:2: * PATCH /api/tests/{id}/scores — 원장 수동 배점 조정 (T7.9, 11 §10.4).
src/app/api/tests/[id]/scores/route.ts:52:    scores: parsed.data.scores,
  @@index([problemId])
  @@map("test_problem")
}

// ?????????????????????????????????????????????
// ?닿린 諛붽뎄????臾몄젣??됱뿉??怨좊Ⅸ 臾명빆 (2026-09-04, ?먯옣???뺤젙)
// 怨꾩빟: src/contracts/basket.contract.ts
// ?????????????????????????????????????????????

/// ?먯옣??臾몄젣??됱뿉???댁븘 ??臾명빆. **怨꾩젙???섎굹**??諛붽뎄?덈떎.
///
/// ?뵶 釉뚮씪?곗?媛 ?꾨땲??**?쒕쾭**???붾떎 ???먯옣?섏씠 ?뚯쭛?먯꽌 怨좊Ⅴ怨??숈썝?먯꽌 ?댁뼱?쒌띾?
///    ?붽뎄?섏뀲?? 釉뚮씪?곗????먮㈃ 洹??쎌냽???덈컲留?李몄씠 ?쒕떎.
model BasketItem {
  id        String @id @default(uuid()) @db.Uuid
  userId    String @map("user_id") @db.Uuid
  problemId String @map("problem_id") @db.Uuid

  /// ?댁? 李⑤?. **?쒗뿕吏??臾명빆 踰덊샇媛 ???쒖꽌瑜??곕Ⅸ??**
  ///
  /// ?좑툘 ?됱쓣 鍮쇰룄 **?ㅼ떆 留ㅺ린吏 ?딅뒗??* ???ㅼ떆 留ㅺ린硫??⑥? ?됱쓽 踰덊샇媛 ?듭㎏濡?
  ///    ?붾뱾???뚯뀑吏몃줈 ?댁? 寃껁띿씠 ?ㅻⅨ 臾명빆??媛由ы궓?? 鍮??먮━??洹몃?濡??먭퀬
  ///    ?쒗뿕吏濡???만 ??李⑤??濡??ㅼ떆 ?몄뼱 1..N ??遺숈씤??
  orderIndex Int      @map("order_index")
  addedAt    DateTime @default(now()) @map("added_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// ?뵶 **Restrict 媛 ?꾨땲??Cascade ??** 諛붽뎄?덈뒗 짬怨좊Ⅴ??以뫢살씤 ?꾩떆 紐⑸줉?대씪
  ///    臾명빆???щ씪吏硫?媛숈씠 ?щ씪?몄빞 ?쒕떎. Restrict 濡??먮㈃ 臾명빆 ?섎굹 ?뚮Ц??
  ///    ?곸옱 ?섎룎由ш린媛 ?듭㎏濡?留됲엺??2026-09-04 ??`98X` 24?됱쓣 吏????寃れ? ?먮━).
  problem Problem @relation(fields: [problemId], references: [id], onDelete: Cascade)

  /// 媛숈? 臾명빆????踰??댁쓣 ???녿떎 ???닿린??**硫깅벑**?대떎.
  @@unique([userId, problemId])
  @@index([userId, orderIndex])
  @@map("basket_item")
}

// ?????????????????????????????????????????????
// v2 "?ㅻ뒛???쒗뿕"(湲곗텧 ?덉긽 ?먯닔 ?먮룆湲? T7.1 ???숈깮 ?묒떆 寃곌낵
// 李몄“: docs/planning/11-score-predictor.md 짠1 (?곗텧臾?A/B/C)
//
// ?좑툘 ??3媛?紐⑤뜽? 06-database-design.md(v1 ERD)?먮뒗 ?녿떎 ??v2 ?좉퇋 湲곕뒫?대씪
//    ???ㅽ궎留??뚯씪 ?덉뿉??SSOT瑜??덈줈 ?뺤쓽?쒕떎(T7.1 吏?쒖꽌 湲곗?).
// 李몄“: docs/planning/07-coding-convention.md 짠2.2 (?ㅼ씠諛?洹쒖튃)
// ?????????????????????????????????????????????

/// ?쒗뿕 ?묒떆 寃곌낵 ?????숈깮?????쒗뿕吏(Test)瑜???1??梨꾩젏 湲곕줉.
/// 媛숈? (testId, studentId) ?ъ쓳???ъ콈?먯쓣 留됱? ?딅뒗???ъ떆?샕룹젙???낅젰 ?덉슜) ??理쒖떊媛믪?
/// takenAt ?대┝李⑥닚 議고쉶濡?媛瑜몃떎.
model TestResult {
  id             String   @id @default(uuid()) @db.Uuid
  testId         String   @map("test_id") @db.Uuid
  studentId      String   @map("student_id") @db.Uuid
  /// ?묒떆(梨꾩젏 ?낅젰) ?쇱떆 ??蹂꾨룄 ?낅젰???놁쑝硫??쒕쾭 泥섎━ ?쒓컖
  takenAt        DateTime @default(now()) @map("taken_at")
  /// ?먮룞 梨꾩젏 珥앹젏
  score          Float
  /// ?먮룆湲?怨꾩궛媛???src/lib/predictor/predictStudentScore.ts (v0, ?좎젙) ?곗텧臾?
  /// ?좑툘 吏꾩쭨 ?λ젰 異붿젙 ?붿쭊(11-score-predictor.md 짠1-B)???꾩쭅 ?놁뼱 ?좎젙 異붿젙移섎떎.
  predictedScore Float    @map("predicted_score")
  createdAt      DateTime @default(now()) @map("created_at")

  test           Test            @relation(fields: [testId], references: [id], onDelete: Cascade)
  student        Student         @relation(fields: [studentId], references: [id], onDelete: Cascade)
  answers        ProblemAnswer[]
  /// 1:1 ???ㅼ젣 FK??AnalysisReport.testResultId(unique)媛 ?뚯쑀?쒕떎(?쒗솚 FK ?뚰뵾).
  analysisReport AnalysisReport?

  @@index([testId, studentId, takenAt])
  @@map("test_result")
}

/// 臾명빆蹂??숈깮 ?묐떟 + ?먮룞 梨꾩젏 寃곌낵.
model ProblemAnswer {
  id           String @id @default(uuid()) @db.Uuid
  testResultId String @map("test_result_id") @db.Uuid
  problemId    String @map("problem_id") @db.Uuid

  /// 媛앷????좏깮 踰덊샇(1~5) ???쒖닠?뺤씠嫄곕굹 誘몃떟?대㈃ NULL
  selectedChoice Int?    @map("selected_choice")
  /// ?쒖닠??梨꾩젏 ?먯닔(0~100, 諛곗젏 ?鍮?鍮꾩쑉) ??媛앷??앹씠嫄곕굹 誘몃떟?대㈃ NULL
  essayScore     Float?  @map("essay_score")
  /// ?먮룞 梨꾩젏 寃곌낵 ??媛앷??앹? ?뺣떟 ?쇱튂, ?쒖닠?뺤? essayScore 湲곗????먯젙(?좎젙 60??
  isCorrect      Boolean @map("is_correct")
  /// ?쒗뿕吏 ??臾명빆 ?쒖꽌(TestProblem.orderIndex ???
  sequence       Int

  testResult TestResult @relation(fields: [testResultId], references: [id], onDelete: Cascade)
  problem    Problem    @relation(fields: [problemId], references: [id], onDelete: Restrict)

  @@index([testResultId, sequence])
  @@map("problem_answer")
}

/// ?묒떆 1嫄댁뿉 ???遺꾩꽍 由ы룷?????⑥썝蹂??깆쟻쨌?쒖씠??遺꾪룷쨌蹂듭뒿 異붿쿇 ?⑥썝.
model AnalysisReport {
  id           String @id @default(uuid()) @db.Uuid
  /// 1:1 FK(unique) ????紐⑤뜽??愿怨꾨? ?뚯쑀?쒕떎.
  testResultId String @unique @map("test_result_id") @db.Uuid

  totalScore             Float    @map("total_score")
  predictedScore         Float    @map("predicted_score")
  /// {unitId: ?뺣떟瑜?0~100)} ??04-database-design.md ?ㅽ??쇨낵 ?щ━ v2 ?좉퇋??jsonb濡??좎?
  unitScores             Json     @map("unit_scores") @db.JsonB
  /// {difficulty(easy|mid|hard): {correct, total}}
  difficultyDistribution Json     @map("difficulty_distribution") @db.JsonB
  /// 蹂듭뒿 異붿쿇 ?⑥썝 id 諛곗뿴 ???뺣떟瑜???? ??理쒕? 3媛??좎젙 湲곗???60%)
  recommendedUnits       String[] @map("recommended_units")

  createdAt DateTime @default(now()) @map("created_at")

  testResult TestResult @relation(fields: [testResultId], references: [id], onDelete: Cascade)

  @@map("analysis_report")
}

// ?????????????????????????????????????????????
// Auth.js (NextAuth v5) ??@auth/prisma-adapter ?쒖? ?ㅽ궎留?
// 李몄“: https://authjs.dev/getting-started/adapters/prisma
// 二쇱쓽: Account??OAuth ?좏겙 ?꾨뱶???대뙌?곌? Prisma Client ?꾨뱶紐낆쓣
// 洹몃?濡?snake_case) ?쎌쑝誘濡?@map?쇰줈 camelCase 留ㅽ븨?섏? ?딅뒗??
// ?????????????????????????????????????????????

model Account {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String  @map("user_id") @db.Uuid
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
/**
 * POST /api/tests/{id}/submit ??梨꾩젏 寃곌낵 ?낅젰(?먮룞 梨꾩젏 + ?덉긽 ?먯닔 ?곗텧).
 * ???怨꾩빟: src/contracts/testresult.contract.ts
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { testResultSubmitRequestSchema } from "@/contracts/testresult.contract";
import {
  jsonError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { getSessionUser } from "@/lib/session";
import { submitTestResult } from "@/lib/testResults/submitTestResult";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const body = await request.json().catch(() => undefined);
  const parsed = testResultSubmitRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    return await submitTestResult(session, id, parsed.data);
  } catch {
    console.error("[POST /api/tests/{id}/submit] submission failed");
    return jsonError("INTERNAL_ERROR", "梨꾩젏 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", 500);
  }
}

hook: PostToolUse
hook: PostToolUse Completed
web search: site:pod.mathflat.com "오답 번호" ...
hook: PostToolUse
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse Completed
hook: PreToolUse Completed
web search: 
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Encoding UTF8 -LiteralPath 'src/contracts/testresult.contract.ts'; Get-Content -Encoding UTF8 -LiteralPath 'src/lib/testResults/submitTestResult.ts'; Get-Content -Encoding UTF8 -LiteralPath 'src/lib/predictor/predictStudentScore.ts'" in D:\todays-math
 succeeded in 508ms:
/**
 * 학생 응시 결과 계약 — v2 "오늘의 시험"(기출 예상 점수 판독기) T7.1.
 *
 * 대응 API 경로:
 *   POST   /api/tests/{id}/submit                — 채점 결과 입력(자동 채점 + 예상 점수 산출)
 *   GET    /api/tests/{id}/results                — 학생별 응시 결과 목록
 *   GET    /api/tests/{id}/results/{studentId}    — 특정 학생의 상세 분석 리포트(최신 1건)
 *
 * 참조: docs/planning/11-score-predictor.md §1 (산출물 A/B/C, "1차 산출물: 엔진 + 리포트 먼저")
 *       prisma/schema.prisma의 TestResult/ProblemAnswer/AnalysisReport
 *
 * ⚠️ T7.1 지시서의 예시 스키마는 SubmitTestResultSchema.testId를 요청 본문에 포함했으나,
 *    이 API는 testId를 경로 파라미터({id})로 이미 받으므로 본문에 중복·불일치 위험이 있는
 *    testId를 넣지 않는다(REST 관례 + idParamSchema 재사용, 다른 /api/tests/{id}/* 엔드포인트와
 *    일관). studentId만 본문에 남긴다 — 완료 보고에 근거 명시.
 * ⚠️ predictedScore(판독기 계산값)는 잠정 placeholder다 —
 *    src/lib/predictor/predictStudentScore.ts 상단 주석 참조.
 */
import { z } from "zod";

import {
  dataResponseSchema,
  difficultySchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";

// ─────────────────────────────────────────────
// 채점 결과 입력 (POST /api/tests/{id}/submit)
// ─────────────────────────────────────────────

/**
 * 문항 1개에 대한 학생 응답 — 객관식(selectedChoice)과 서술형(essayScore) 중 하나만 값을 갖고,
 * 둘 다 NULL이면 미답으로 채점한다(오답 처리, 0점).
 */
export const problemAnswerInputSchema = z.strictObject({
  problemId: uuidSchema,
  /** 객관식 선택 번호(1~5). 서술형/미답이면 NULL. */
  selectedChoice: z
    .number()
    .int()
    .min(1, { error: "선택 번호는 1 이상이어야 합니다." })
    .max(5, { error: "선택 번호는 5 이하여야 합니다." })
    .nullable(),
  /** 서술형 채점 점수(0~100, 배점 대비 비율). 객관식/미답이면 NULL. */
  essayScore: z
    .number()
    .min(0, { error: "서술형 점수는 0 이상이어야 합니다." })
    .max(100, { error: "서술형 점수는 100 이하여야 합니다." })
    .nullable(),
  /** 시험지 내 문항 순서 — TestProblem.orderIndex와 대응. */
  sequence: z.number().int().min(0),
});
export type ProblemAnswerInput = z.infer<typeof problemAnswerInputSchema>;

export const testResultSubmitRequestSchema = z.strictObject({
  studentId: uuidSchema,
  answers: z
    .array(problemAnswerInputSchema)
    .min(1, { error: "채점할 응답이 최소 1건 이상이어야 합니다." }),
});
export type TestResultSubmitRequest = z.infer<
  typeof testResultSubmitRequestSchema
>;

// ─────────────────────────────────────────────
// 엔티티
// ─────────────────────────────────────────────

export const problemAnswerSchema = z.strictObject({
  id: uuidSchema,
  problemId: uuidSchema,
  selectedChoice: z.number().int().min(1).max(5).nullable(),
  essayScore: z.number().min(0).max(100).nullable(),
  isCorrect: z.boolean(),
  sequence: z.number().int().min(0),
});
export type ProblemAnswerEntity = z.infer<typeof problemAnswerSchema>;

/** 난이도별 정답/전체 문항 수. */
export const difficultyDistributionEntrySchema = z.strictObject({
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
});

export const analysisReportSchema = z.strictObject({
  id: uuidSchema,
  testResultId: uuidSchema,
  totalScore: z.number(),
  /** 잠정 placeholder — src/lib/predictor/predictStudentScore.ts 참조. */
  predictedScore: z.number(),
  /** {unitId: 정답률(0~100)} */
  unitScores: z.record(uuidSchema, z.number()),
  /** {difficulty(연산|기본|응용|심화): {correct, total}} — 네 갈래가 **전부** 있어야 한다 (D-106) */
  difficultyDistribution: z.record(
    difficultySchema,
    difficultyDistributionEntrySchema,
  ),
  /** 복습 추천 단원 id — 정답률 낮은 순 최대 3개(잠정 기준선 60%). */
  recommendedUnits: z.array(uuidSchema),
  createdAt: isoDateTimeSchema,
});
export type AnalysisReportEntity = z.infer<typeof analysisReportSchema>;

export const testResultSchema = z.strictObject({
  id: uuidSchema,
  testId: uuidSchema,
  studentId: uuidSchema,
  takenAt: isoDateTimeSchema,
  score: z.number(),
  /** 잠정 placeholder — src/lib/predictor/predictStudentScore.ts 참조. */
  predictedScore: z.number(),
  createdAt: isoDateTimeSchema,
});
export type TestResultEntity = z.infer<typeof testResultSchema>;

// ─────────────────────────────────────────────
// 응답 (제출 직후 — 자동 채점 + 분석 리포트 동봉)
// ─────────────────────────────────────────────

export const testResultSubmitResponseSchema = dataResponseSchema(
  z.strictObject({
    testResult: testResultSchema,
    analysisReport: analysisReportSchema,
  }),
);
export type TestResultSubmitResponse = z.infer<
  typeof testResultSubmitResponseSchema
>;

// ─────────────────────────────────────────────
// 목록 조회 (GET /api/tests/{id}/results)
// ─────────────────────────────────────────────

export const testResultListResponseSchema = dataResponseSchema(
  z.array(testResultSchema),
);
export type TestResultListResponse = z.infer<
  typeof testResultListResponseSchema
>;

// ─────────────────────────────────────────────
// 학생별 상세 조회 (GET /api/tests/{id}/results/{studentId}) — 최신 1건
// ─────────────────────────────────────────────

export const testResultDetailResponseSchema = dataResponseSchema(
  z.strictObject({
    testResult: testResultSchema,
    answers: z.array(problemAnswerSchema),
    analysisReport: analysisReportSchema,
  }),
);
export type TestResultDetailResponse = z.infer<
  typeof testResultDetailResponseSchema
>;
/**
 * POST /api/tests/{id}/submit — 채점 결과 입력 → 자동 채점 → 판독기(v0) 예상 점수 → 분석 리포트.
 * TestResult/ProblemAnswer/AnalysisReport를 하나의 트랜잭션으로 원자 생성한다.
 */
import type { TestResultSubmitRequest } from "@/contracts/testresult.contract";
import { testResultSubmitResponseSchema } from "@/contracts/testresult.contract";
import { jsonError, jsonOk } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { requireOwnedStudentInClass, requireOwnedTest } from "@/lib/ownership";
import { predictStudentScore } from "@/lib/predictor/predictStudentScore";
import {
  serializeAnalysisReport,
  serializeTestResult,
} from "@/lib/serializers";
import type { SessionUser } from "@/lib/session";
import { buildAnalysisReport } from "@/lib/testResults/buildAnalysisReport";
import { gradeAnswers } from "@/lib/testResults/gradeAnswers";

export async function submitTestResult(
  session: SessionUser,
  testId: string,
  input: TestResultSubmitRequest,
) {
  const owned = await requireOwnedTest(testId, session.id);
  if (!owned.ok) return owned.response;

  // 🔴 보안 순서는 그대로다 — **시험지 소유권이 먼저**(위 `requireOwnedTest`) 통과해야
  //    여기까지 온다. 그 관문을 지난 뒤의 두 조회는 서로 독립이라 같이 보낸다:
  //    학생 소유권 확인은 studentId·classId 로, 문항 조회는 testId 로만 좁힌다.
  //    문항 조회 결과는 학생 판정이 실패하면 **쓰이지 않고 버려진다** — 내가 소유한
  //    시험지의 문항이므로 새어 나갈 것도 없다.
  const [studentOwned, testProblems] = await Promise.all([
    requireOwnedStudentInClass(input.studentId, owned.data.classId, session.id),
    db.testProblem.findMany({
      where: { testId },
      include: { problem: true },
    }),
  ]);
  if (!studentOwned.ok) return studentOwned.response;

  const testProblemIds = new Set(testProblems.map((tp) => tp.problemId));
  const answerProblemIds = new Set(input.answers.map((a) => a.problemId));

  const unknownAnswer = input.answers.find(
    (a) => !testProblemIds.has(a.problemId),
  );
  if (unknownAnswer) {
    return jsonError(
      "VALIDATION_ERROR",
      "이 시험지에 출제되지 않은 문항이 포함되어 있습니다.",
      400,
      [{ field: "answers", message: unknownAnswer.problemId }],
    );
  }
  // 🔴 `Set` 크기만 보면 중복이 사라져 `[p1, p1, p2, p3]` 이 3 === 3 으로 통과한다.
  //    그러면 그 문항의 배점이 **두 번 더해져** 학생 점수가 만점을 넘고, ProblemAnswer
  //    에도 중복 행이 남는다(스키마에 (testResultId, problemId) 유일 제약이 없다).
  //    배점 없는 시험지의 균등배분은 `answers.length` 로 나누므로 문항당 배점까지 흔들린다.
  if (answerProblemIds.size !== input.answers.length) {
    return jsonError(
      "VALIDATION_ERROR",
      "같은 문항에 응답이 두 번 들어왔습니다.",
      400,
    );
  }
  if (answerProblemIds.size !== testProblems.length) {
    return jsonError(
      "VALIDATION_ERROR",
      "시험지의 모든 문항에 대한 응답이 필요합니다.",
      400,
    );
  }

  const gradingProblems = testProblems.map((tp) => ({
    id: tp.problem.id,
    unitId: tp.problem.unitId,
    difficulty: tp.problem.difficulty,
    answer: tp.problem.answer,
    score: tp.problem.score ?? null,
    // 배점 보정기가 이 시험지에 매긴 조정 배점(11 §10, D-42). 있으면 원본보다 우선한다 —
    // 짜깁기 시험지의 만점을 100으로 맞추는 경로가 여기다. 없으면 기존 규칙 그대로.
    adjustedScore: tp.score ?? null,
  }));

  const { graded, score } = gradeAnswers(input.answers, gradingProblems);
  const predictedScore = predictStudentScore(score, graded);
  const { unitScores, difficultyDistribution, recommendedUnits } =
    buildAnalysisReport(graded);

  const created = await db.$transaction(async (tx) => {
    const testResult = await tx.testResult.create({
      data: {
        testId,
        studentId: input.studentId,
        score,
        predictedScore,
      },
    });

    // 🔴 문항 수만큼 INSERT 를 순차로 await 하던 자리다. 한 INSERT 로 넣는다 —
    //    같은 트랜잭션 안이라 TestResult·ProblemAnswer·AnalysisReport 원자 생성은 그대로다.
    await tx.problemAnswer.createMany({
      data: graded.map((g) => ({
        testResultId: testResult.id,
        problemId: g.problemId,
        selectedChoice: g.selectedChoice,
        essayScore: g.essayScore,
        isCorrect: g.isCorrect,
        sequence: g.sequence,
      })),
    });

    const analysisReport = await tx.analysisReport.create({
      data: {
        testResultId: testResult.id,
        totalScore: score,
        predictedScore,
        unitScores,
        difficultyDistribution,
        recommendedUnits,
      },
    });

    return { testResult, analysisReport };
  });

  return jsonOk(
    testResultSubmitResponseSchema,
    {
      data: {
        testResult: serializeTestResult(created.testResult),
        analysisReport: serializeAnalysisReport(created.analysisReport),
      },
    },
    { status: 201 },
  );
}
/**
 * 학생 개인 예상 점수 — v0 잠정 placeholder.
 *
 * ⚠️ 반드시 읽을 것 (T7.1 완료 보고에도 동일 내용을 남겼다):
 *
 * docs/planning/11-score-predictor.md §1은 예측 산출물을 3가지로 나눈다 —
 *   A. 시험 청사진(그 학교 다음 시험의 문항 수·유형·난이도·배점 구조)
 *   B. 학생 개인 예상 점수("과거 기출 문항별 정오 → 능력 추정 → A의 청사진에 적용")
 *   C. 예측 문제지
 *
 * 이 프로젝트(워크트리 `기출-예상-점수-판독기`, 브랜치 BIGSHOL/기출-예상-점수-판독기)에는
 * A만 구현되어 있다(`src/lib/predictor/{blueprint,distance,series,predictBlueprint}.ts` +
 * `src/contracts/predictor.contract.ts`, 2026-08-15 확인). 그 A 엔진은 "학교가 다음에 낼
 * 시험의 구조"를 과거 시험지들의 청사진으로 예측하는 것이지, "이 학생이 이번 시험에서 몇 점을
 * 받을지"를 계산하지 않는다 — 함수 시그니처(PredictInput: series/target/history/cohort)에
 * 학생 응답이 아예 들어가지 않는다. B(능력 추정 알고리즘)는 설계 문서에도 개념만 있고
 * 구체적인 산식이 아직 없다("설계 확정 전 초안" 상태, 11-score-predictor.md 상단).
 *
 * 또한 이 태스크(T7.1)가 실행된 워크트리(agent-a8499cba62ba084a9)는 위 predictor 엔진 파일들이
 * 존재하지 않는 별도 브랜치라, 그대로 import할 수도 없다 — 가져오려면 스키마 정합
 * (그쪽 난이도 라벨 하/중/상 vs 이 프로젝트의 Difficulty easy/mid/hard, ExamSeriesKey 등)까지
 * 맞추는 별도 이식 작업이 필요하다.
 *
 * 그래서 v0는 지금 이 제출 건에서 실제로 갖고 있는 신호(자동 채점 결과 + 문항 난이도)만으로,
 * 원장이 화면에 "예상 점수(잠정)"로 바로 노출할 수 있는 최소한의 추정치를 낸다. 원리는 실제
 * 엔진(predictBlueprint.ts)의 설계 철학과 같은 축소(shrinkage) — 근거가 약할수록 안전한 값
 * (=실채점 점수 자체) 쪽으로 당기고, 보정 폭을 작게 제한한다:
 *
 *   predictedScore = score + adjustment
 *   adjustment = clamp(-MAX_ADJUSTMENT, MAX_ADJUSTMENT, avgDifficultyWeight(오답 문항) × MAX_ADJUSTMENT)
 *
 * 오답이 어려운(상) 문항에 몰려 있으면 양의 보정(실력은 점수보다 나을 가능성), 오답이 쉬운(하)
 * 문항에 몰려 있으면 음의 보정(쉬운 문제를 놓쳐 실수/기초 결손 가능성)을 준다. 오답이 없으면
 * 보정 없음(=score 그대로).
 *
 * 후속 작업: predictor 엔진(A)을 이 프로젝트로 이식하고, B(능력 추정)를 실제로 설계·구현하는
 * 별도 태스크가 필요하다. 그 전까지 이 함수의 결과는 "예상 점수(잠정)"로만 표기해야 한다.
 */
import {
  CORE_DIFFICULTIES,
  DIFFICULTY_LADDER,
  type Difficulty,
} from "@/contracts/difficulty";

import type { GradedAnswer } from "@/lib/testResults/gradeAnswers";

/**
 * 오답 문항 난이도별 보정 방향 — 어려운 갈래를 틀렸으면 +, 쉬운 갈래를 틀렸으면 −.
 *
 * ⚠️ 2026-08-25(D-106) 에 갈래가 넷이 되었다. 예전 셋(−1 / 0 / +1)을 그대로 옮기면
 *    밑단이 하나 늘어난 만큼 아래가 비어 버린다. 한 칸에 ⅔씩 — 연산 −1 · 기본 −⅓ ·
 *    응용 +⅓ · 심화하 +1. (v0 잠정치라 정밀한 값이 아니다. 방향과 폭만 지킨다.)
 *
 * 🔴 **눈금을 사다리 «길이»로 나누면 안 된다** (D-113, 2026-08-30).
 *    종전에는 `(2 * i) / (사다리 길이 - 1) - 1` 이었다. 그러면 축을 넓히는 순간
 *    **기존 갈래의 무게가 통째로 옮겨 간다** — 축이 여섯이 되자 `심화하` 가
 *    **+1 → +0.2** 로 주저앉아, 콘텐츠는 한 문항도 안 바뀌었는데 원장님이 보시는
 *    예상 점수가 **75 → 71** 로 움직였다(`testresult.test.ts` 가 잡았다).
 *    「분모가 바뀌면 같은 숫자가 다른 것을 가리킨다」(2026-08-17)의 그 자리다.
 *
 *    그래서 **칸 간격을 못 박는다** — 밑단이 −1, 한 칸에 ⅔. 눈금이 축의 길이에
 *    안 매이므로 갈래를 더해도 **이미 있는 갈래의 값은 그대로다.**
 *    확대 갈래는 +1 위로 나간다(심화중 +5/3 · 심화상 +7/3) — 보정 자체는
 *    `MAX_ADJUSTMENT` 로 이미 잘리므로 「가장 어려운 것만 틀렸다」가 상한에 닿는다.
 */
/** 한 칸의 무게 — **핵심 넷이 −1 … +1 을 채우도록** 정한다(=⅔). 축 길이에 안 매인다. */
const WEIGHT_STEP = 2 / (CORE_DIFFICULTIES.length - 1);

const DIFFICULTY_WEIGHT: Record<Difficulty, number> = Object.fromEntries(
  DIFFICULTY_LADDER.map((tier, i) => [tier, -1 + WEIGHT_STEP * i]),
) as Record<Difficulty, number>;

/** 보정 폭 상한(점) — 근거가 얇은 v0 추정치가 실채점 점수와 크게 어긋나지 않도록 제한한다. */
export const MAX_ADJUSTMENT = 5;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * v0 잠정 예상 점수 — score(자동 채점 점수)를 오답 문항의 난이도 분포로 소폭 보정한다.
 * 0~100 범위로 clamp한다(만점을 100으로 정규화한 grade 결과를 전제로 함, 06-tasks.md T7.1).
 */
export function predictStudentScore(
  score: number,
  graded: GradedAnswer[],
): number {
  const wrong = graded.filter((g) => !g.isCorrect);
  if (wrong.length === 0) return round2(clamp(score, 0, 100));

  const avgWeight =
    wrong.reduce((sum, g) => sum + DIFFICULTY_WEIGHT[g.difficulty], 0) /
    wrong.length;
  const adjustment = clamp(
    avgWeight * MAX_ADJUSTMENT,
    -MAX_ADJUSTMENT,
    MAX_ADJUSTMENT,
  );

  return round2(clamp(score + adjustment, 0, 100));
}

hook: PostToolUse
hook: PostToolUse Completed
web search: site:pod.mathflat.com "채점하기" ...
hook: PostToolUse
hook: PostToolUse Completed
hook: PreToolUse
hook: PreToolUse
hook: PreToolUse Completed
hook: PreToolUse Completed
web search: 
web search: https://pod.mathflat.com/12944fe2-8170-4dfa-9ac5-c6ea47c05d0d
hook: PostToolUse
hook: PostToolUse Completed
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Encoding UTF8 -LiteralPath 'src/lib/testResults/buildAnalysisReport.ts'; Get-Content -Encoding UTF8 -LiteralPath 'src/lib/testResults/gradeAnswers.ts'; Get-Content -Encoding UTF8 -LiteralPath 'src/lib/generator/familyKey.ts'; git grep -n 'recommendedUnits' -- src ':"'!src/__tests__'"' ':"'!src/mocks'"'; git grep -n -E '일괄|미채점|재인쇄|최근 출제|중복' -- 'src/app/*page.tsx' 'src/components/*' | Select-Object -First 35" in D:\todays-math
 succeeded in 592ms:
/**
 * 분석 리포트 집계 — 순수 함수. gradeAnswers()의 결과만으로 계산한다(06-tasks.md T7.1).
 *
 * - unitScores: 단원별 정답률(0~100) — (해당 단원 획득 점수 합) / (해당 단원 배점 합) × 100.
 * - difficultyDistribution: 난이도별 정답/전체 문항 수.
 * - recommendedUnits: 정답률이 RECOMMEND_THRESHOLD(60%) 미만인 단원을 낮은 순으로 최대
 *   RECOMMEND_LIMIT(3)개 추천한다. 전부 임계값 이상이면 빈 배열.
 */
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";

import type { GradedAnswer } from "./gradeAnswers";

export const RECOMMEND_THRESHOLD = 0.6;
export const RECOMMEND_LIMIT = 3;

/**
 * ⚠️ **손으로 나열하지 않는다** (D-106). 2026-08-25 에 갈래가 넷이 되었을 때
 *    여기가 셋으로 남아 `연산` 칸이 통째로 빠졌고, 그러면 계약(`z.record(difficultySchema,…)`)
 *    검증이 상세 조회에서 500 을 냈다. 타입이 `Difficulty[]` 라 **셋만 적어도 컴파일은
 *    통과한다** — 배열 길이는 타입이 안 세기 때문이다.
 */
const DIFFICULTY_KEYS: readonly Difficulty[] = DIFFICULTY_LADDER;

export interface AnalysisReportData {
  unitScores: Record<string, number>;
  difficultyDistribution: Record<
    Difficulty,
    { correct: number; total: number }
  >;
  recommendedUnits: string[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildAnalysisReport(
  graded: GradedAnswer[],
): AnalysisReportData {
  const unitAgg = new Map<string, { earned: number; possible: number }>();
  const difficultyDistribution = Object.fromEntries(
    DIFFICULTY_KEYS.map((d) => [d, { correct: 0, total: 0 }]),
  ) as Record<Difficulty, { correct: number; total: number }>;

  for (const g of graded) {
    const agg = unitAgg.get(g.unitId) ?? { earned: 0, possible: 0 };
    agg.earned += g.pointsEarned;
    agg.possible += g.maxPoints;
    unitAgg.set(g.unitId, agg);

    difficultyDistribution[g.difficulty].total += 1;
    if (g.isCorrect) difficultyDistribution[g.difficulty].correct += 1;
  }

  const unitScores: Record<string, number> = {};
  const unitRatios: Array<{ unitId: string; ratio: number }> = [];
  for (const [unitId, { earned, possible }] of unitAgg) {
    const ratio = possible > 0 ? earned / possible : 0;
    unitScores[unitId] = round1(ratio * 100);
    unitRatios.push({ unitId, ratio });
  }

  const recommendedUnits = unitRatios
    .filter((u) => u.ratio < RECOMMEND_THRESHOLD)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, RECOMMEND_LIMIT)
    .map((u) => u.unitId);

  return { unitScores, difficultyDistribution, recommendedUnits };
}
/**
 * 자동 채점 — 순수 함수. DB/AI에 의존하지 않는다(테스트 용이성 우선, 06-tasks.md T7.1).
 *
 * 채점 규칙:
 * - 객관식(selectedChoice != null): Problem.answer(정답 텍스트)와 선택 번호 문자열이 일치하면 정답.
 *   정답이면 배점 전액, 오답이면 0점.
 * - 서술형(essayScore != null): 0~100점(배점 대비 비율)으로 이미 채점되어 들어온다 —
 *   pointsEarned = essayScore/100 * 배점. ESSAY_PASS_THRESHOLD(60점) 이상이면 "정답"으로 집계한다
 *   (난이도 분포 통계용 — 부분점수 자체는 essayScore를 그대로 쓴다).
 * - 미답(둘 다 null): 오답·0점.
 *
 * 배점(maxPoints)은 다음 순서로 정한다:
 *   1. TestProblem.score — 배점 보정기가 이 시험지에 매긴 조정 배점(11 §10, D-42).
 *      짜깁기 시험지(기출+자작 혼합)의 만점을 정확히 100으로 만드는 유일한 경로다.
 *   2. Problem.score — 원본 시험지 배점(08-import-ledger.md 이관 메타데이터).
 *   3. 둘 다 없으면(자작/AI 생성 문제 등) 응답 문항 수로 100점을 균등 배분.
 *
 * ⚠️ 2번만 쓰면 만점이 100이 아니게 된다 — 기출은 score가 있고 자작·AI는 NULL이라
 *    섞으면 합이 어긋난다(11 §10.1: 5문항 중 2개가 3.5점, 3개가 NULL → 만점 67).
 *    보정을 거치지 않은 시험지는 여전히 이 문제가 남아 있다(REPORT.md 참조).
 */
import type { Difficulty } from "@/contracts/common.contract";

/** 서술형 정답 판정 기준선(0~100점 중) — 잠정. 확정 필요 시 계약에 노출해 조정한다. */
export const ESSAY_PASS_THRESHOLD = 60;

export interface AnswerInput {
  problemId: string;
  selectedChoice: number | null;
  essayScore: number | null;
  sequence: number;
}

/** 채점에 필요한 문제 정보 — Prisma Problem row의 부분집합. */
export interface GradingProblem {
  id: string;
  unitId: string;
  difficulty: Difficulty;
  /** 정답 텍스트 — 객관식은 정답 선택 번호를 문자열로 저장한다고 전제(예: "3"). */
  answer: string;
  /** 원본 배점(`Problem.score`). 없으면 균등 배분. */
  score: number | null;
  /**
   * 시험지 쪽 조정 배점(`TestProblem.score`) — 배점 보정기가 매긴 값(11 §10, D-42).
   *
   * 있으면 원본 배점보다 **우선한다.** 이게 §10.1 버그의 실제 수리다: 기출은 `Problem.score`가
   * 있고 자작·AI는 NULL이라 둘을 섞으면 만점이 100이 아니게 되는데, 보정기가 시험지 단위로
   * 다시 매긴 배점을 여기서 읽어야 만점이 100으로 맞는다.
   *
   * NULL이면 기존 규칙(`score ?? 균등배분`) 그대로다 — 보정을 거치지 않은 기존 시험지의
   * 채점 결과는 바뀌지 않는다.
   */
  adjustedScore?: number | null;
}

export interface GradedAnswer {
  problemId: string;
  sequence: number;
  selectedChoice: number | null;
  essayScore: number | null;
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  unitId: string;
  difficulty: Difficulty;
}

export interface GradeAnswersResult {
  graded: GradedAnswer[];
  score: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function gradeAnswers(
  answers: AnswerInput[],
  problems: GradingProblem[],
): GradeAnswersResult {
  const byId = new Map(problems.map((p) => [p.id, p]));
  const equalShare = answers.length > 0 ? 100 / answers.length : 0;

  const graded = answers.map((answer): GradedAnswer => {
    const problem = byId.get(answer.problemId);
    if (!problem) {
      throw new Error(`채점 대상 문제를 찾을 수 없습니다: ${answer.problemId}`);
    }
    // 조정 배점(TestProblem.score)이 있으면 그것이 이 시험지의 배점이다(11 §10.2-4).
    // 원본 Problem.score 는 학습 코퍼스용이라 시험지 만점을 100으로 맞추지 못한다.
    const maxPoints = problem.adjustedScore ?? problem.score ?? equalShare;

    let isCorrect = false;
    let pointsEarned = 0;
    if (answer.essayScore !== null) {
      pointsEarned = (answer.essayScore / 100) * maxPoints;
      isCorrect = answer.essayScore >= ESSAY_PASS_THRESHOLD;
    } else if (answer.selectedChoice !== null) {
      isCorrect = String(answer.selectedChoice) === problem.answer.trim();
      pointsEarned = isCorrect ? maxPoints : 0;
    }
    // 둘 다 null(미답)이면 isCorrect=false, pointsEarned=0 기본값 유지.

    return {
      problemId: answer.problemId,
      sequence: answer.sequence,
      selectedChoice: answer.selectedChoice,
      essayScore: answer.essayScore,
      isCorrect,
      pointsEarned: round2(pointsEarned),
      maxPoints: round2(maxPoints),
      unitId: problem.unitId,
      difficulty: problem.difficulty,
    };
  });

  const score = round2(graded.reduce((sum, g) => sum + g.pointsEarned, 0));
  return { graded, score };
}
/**
 * **문항류 정체** — 「이 두 문항이 같은 류인가」를 판정하는 **유일한 자리**.
 *
 * 원장님 지시 2026-08-26: 「같은 문제류는 1개만 출제되도록 해」.
 * 보신 것은 초6 「2-6-4 구 알아보기」 일일테스트에서
 *   문1 「반지름이 16cm 인 구를 …」 / 문2 「반지름이 6cm 인 구를 …」
 * 가 **숫자만 다른 같은 문항**으로 나란히 나온 것이다.
 *
 * ## 왜 `familyKey` 문자열만으로는 안 되나
 *
 * DB 가 문항류를 `ProblemFamily`의 **복합키 `@@id([unitId, familyKey])`** 로 잠근다.
 * 즉 같은 키 문자열이라도 **단원이 다르면 다른 류**다. 문자열만 비교하면 확인테스트
 * (여러 단원을 묶는다)에서 다른 단원의 다른 류가 한 무리로 접혀 **멀쩡한 문항이
 * 조용히 빠진다.** 그래서 이 함수는 언제나 둘을 함께 본다.
 *
 * ## 왜 NULL 을 한 무리로 묶으면 안 되나 (실측 근거)
 *
 * D-105 는 「키가 없으면 혼자 한 무리」라고 정했다. 그런데 실제 DB 를 세어 보면
 * 기출 **41,084행**·변형 **3,526행**이 `solo:<uuid>` 가 아니라 **NULL** 인 레거시다
 * (`docs/planning/tracks/family-dedupe-20260826.md` §3). NULL 을 한 무리로 묶으면
 * **그 44,610행이 통째로 한 류**가 되어 시험지에 **한 문항밖에** 못 들어간다.
 * 빈 문자열·공백뿐인 값도 같은 이유로 «혼자»다.
 *
 * ⚠️ 그래서 여기서 NULL 을 «모른다»로 두고 나중에 판단하게 넘기면 안 된다. 「모른다」가
 *    «같다»로 미끄러지는 순간 출제가 통째로 막히고, **에러가 아니라 시험지가 얇아질
 *    뿐**이라 아무도 못 본다 — 이 저장소가 여러 번 낸 결함의 자리다.
 */

/** 단원 구분자 — 키 문자열에 나올 수 없는 글자여야 한다. */
const SEP = " ";

export interface FamilyIdentifiable {
  id: string;
  unitId: string;
  /** 엔진이 적는 유형 정체. 사람이 넣은 것·AI 변형·레거시는 없을 수 있다. */
  familyKey?: string | null;
}

/**
 * 이 문항이 속한 **문항류의 식별자**.
 *
 * 키가 있으면 `<unitId>\0<familyKey>`, 없으면 그 문항 하나만의 `solo:<problemId>`.
 * `solo:` 는 문항 id 를 물고 있으므로 **어떤 두 문항도 같아질 수 없다** — 그것이
 * 「키가 없으면 혼자 한 무리」(D-105)를 실제로 성립시키는 부분이다.
 */
export function familyIdOf(problem: FamilyIdentifiable): string {
  const key = problem.familyKey?.trim();
  if (!key) return `solo:${problem.id}`;
  return `${problem.unitId}${SEP}${key}`;
}

/**
 * 후보 목록에 **서로 다른 문항류가 몇 갈래** 있는가.
 *
 * ⚠️ 부족 안내(`shortfall.available`)에 넣을 수 있는 유일한 정직한 수다. 행 수를 쓰면
 *    「15개 있는데 8개를 못 냈다」는 앞뒤가 안 맞는 안내가 나간다 — 실제로 쓸 수 있는
 *    것은 4갈래뿐이기 때문이다. 실측으로 가족 크기가 최대 4라
 *    (`1행 5 · 2행 328 · 3행 39 · 4행 408`), 행으로 세면 **최대 네 배** 부풀려 센다.
 */
export function countFamilies(problems: readonly FamilyIdentifiable[]): number {
  return new Set(problems.map(familyIdOf)).size;
}
src/contracts/testresult.contract.ts:100:  recommendedUnits: z.array(uuidSchema),
src/lib/serializers.ts:179:    recommendedUnits: row.recommendedUnits,
src/lib/testResults/buildAnalysisReport.ts:6: * - recommendedUnits: 정답률이 RECOMMEND_THRESHOLD(60%) 미만인 단원을 낮은 순으로 최대
src/lib/testResults/buildAnalysisReport.ts:30:  recommendedUnits: string[];
src/lib/testResults/buildAnalysisReport.ts:63:  const recommendedUnits = unitRatios
src/lib/testResults/buildAnalysisReport.ts:69:  return { unitScores, difficultyDistribution, recommendedUnits };
src/lib/testResults/submitTestResult.ts:87:  const { unitScores, difficultyDistribution, recommendedUnits } =
src/lib/testResults/submitTestResult.ts:120:        recommendedUnits,
src/components/exam/ActualScoreCell.tsx:12: * 별도 화면이나 일괄 입력 모드로 빼지 않는다 — 시안이 대조표 안에서 입력하게 정했고,
src/components/main/DailyReviewSection.tsx:18: *   중복 초안을 만들지 않는다.

hook: PostToolUse
hook: PostToolUse Completed
codex
1. **①을 통째로 먼저 하는 데 반대합니다.** 설정 저장과 형식 비중은 분리하세요. 전자는 반복 클릭을 줄이지만, 후자는 난이도·단원 배분에 제약을 추가하므로 ‘작은 화면 수정’이 아닙니다. 추천 순서는 **② 최소 입력→③→① 설정 저장→④→형식 비중→⑤**입니다. 기존 API가 많다는 사실보다, 입력 직후 원장에게 돌아오는 이득이 우선입니다.

2. **충돌할 수 있습니다. 진짜 위험은 종이 채점 뒤의 이중 입력입니다.** 가령 30명×20문항×2초면 입력만 20분입니다. 일괄 정답 후 오답만 표시하세요. [매쓰플랫도 지원합니다](https://pod.mathflat.com/12944fe2-8170-4dfa-9ac5-c6ea47c05d0d). 미채점은 정답과 구분해야 합니다. 실제 하루치로 ‘추가 입력·수정 시간 < 절약한 출제 시간’을 검증하세요. 또한 [현재 API 계약](/D:/todays-math/src/contracts/testresult.contract.ts:39)은 선택지·서술형 점수를 받으므로 O/X 입력용 보완도 필요합니다.

3. **전체 채점 화면은 건너뛸 수 있지만, 오답이라는 신호는 필요합니다.** 학생·시험·오답 번호만 받거나, 원장이 ‘다시 풀릴 문항’을 고르면 됩니다. 진도 경과 시간·유형별 출제 이력으로도 복습은 만들 수 있지만 취약도 진단은 아닙니다. 선택하지 않은 문항을 정답으로 추정해서도 안 됩니다. 또 [유형 식별 코드](/D:/todays-math/src/lib/generator/familyKey.ts)는 단원까지 함께 비교하며, 키가 없는 문항은 개별 취급합니다. 전 문제은행에서 쌍둥이가 즉시 된다는 전제는 틀립니다.

4. **놓친 축은 업무의 이어짐과 분석의 신뢰도입니다.** 미채점 학생 찾기, 중단 후 이어하기, 입력 수정, 복습 후 재확인까지 봐야 합니다. 경쟁사 조사는 홍보보다 사용 매뉴얼과 실제 하루 작업을 기준으로 하세요. 특히 ④는 ‘그리기만’ 하면 끝나지 않습니다. 현재 리포트는 시험 1회 단위이며 누적 유형 성취도가 아닙니다. 제출 API의 [학생 예상 점수](/D:/todays-math/src/lib/predictor/predictStudentScore.ts)는 실제 점수를 최대 ±5점 보정하는 잠정 구현입니다.

5. **하나면 ③ ‘오답 번호 입력→복습지 바로 인쇄’입니다.** 번호 입력이 최소한의 ② 역할을 겸하게 하세요. 입력의 보상이 즉시 나오고, 기존 출제·인쇄 자산으로 복습지 제작 시간을 줄일 수 있습니다. ①은 편의 개선이고, 독립된 ②는 입력 부담부터 생깁니다. ④⑤는 데이터가 쌓여야 가치가 납니다. 첫 범위는 원문 재출제와 검증된 동일 유형의 다른 문항까지면 충분합니다.
hook: Stop
hook: Stop Completed
tokens used
71,018
1. **①을 통째로 먼저 하는 데 반대합니다.** 설정 저장과 형식 비중은 분리하세요. 전자는 반복 클릭을 줄이지만, 후자는 난이도·단원 배분에 제약을 추가하므로 ‘작은 화면 수정’이 아닙니다. 추천 순서는 **② 최소 입력→③→① 설정 저장→④→형식 비중→⑤**입니다. 기존 API가 많다는 사실보다, 입력 직후 원장에게 돌아오는 이득이 우선입니다.

2. **충돌할 수 있습니다. 진짜 위험은 종이 채점 뒤의 이중 입력입니다.** 가령 30명×20문항×2초면 입력만 20분입니다. 일괄 정답 후 오답만 표시하세요. [매쓰플랫도 지원합니다](https://pod.mathflat.com/12944fe2-8170-4dfa-9ac5-c6ea47c05d0d). 미채점은 정답과 구분해야 합니다. 실제 하루치로 ‘추가 입력·수정 시간 < 절약한 출제 시간’을 검증하세요. 또한 [현재 API 계약](/D:/todays-math/src/contracts/testresult.contract.ts:39)은 선택지·서술형 점수를 받으므로 O/X 입력용 보완도 필요합니다.

3. **전체 채점 화면은 건너뛸 수 있지만, 오답이라는 신호는 필요합니다.** 학생·시험·오답 번호만 받거나, 원장이 ‘다시 풀릴 문항’을 고르면 됩니다. 진도 경과 시간·유형별 출제 이력으로도 복습은 만들 수 있지만 취약도 진단은 아닙니다. 선택하지 않은 문항을 정답으로 추정해서도 안 됩니다. 또 [유형 식별 코드](/D:/todays-math/src/lib/generator/familyKey.ts)는 단원까지 함께 비교하며, 키가 없는 문항은 개별 취급합니다. 전 문제은행에서 쌍둥이가 즉시 된다는 전제는 틀립니다.

4. **놓친 축은 업무의 이어짐과 분석의 신뢰도입니다.** 미채점 학생 찾기, 중단 후 이어하기, 입력 수정, 복습 후 재확인까지 봐야 합니다. 경쟁사 조사는 홍보보다 사용 매뉴얼과 실제 하루 작업을 기준으로 하세요. 특히 ④는 ‘그리기만’ 하면 끝나지 않습니다. 현재 리포트는 시험 1회 단위이며 누적 유형 성취도가 아닙니다. 제출 API의 [학생 예상 점수](/D:/todays-math/src/lib/predictor/predictStudentScore.ts)는 실제 점수를 최대 ±5점 보정하는 잠정 구현입니다.

5. **하나면 ③ ‘오답 번호 입력→복습지 바로 인쇄’입니다.** 번호 입력이 최소한의 ② 역할을 겸하게 하세요. 입력의 보상이 즉시 나오고, 기존 출제·인쇄 자산으로 복습지 제작 시간을 줄일 수 있습니다. ①은 편의 개선이고, 독립된 ②는 입력 부담부터 생깁니다. ④⑤는 데이터가 쌓여야 가치가 납니다. 첫 범위는 원문 재출제와 검증된 동일 유형의 다른 문항까지면 충분합니다.
