# 자료 제작 AI 연결 — 개발 CLI/API · 운영 API

`/dev/unified`의 자료 제작은 **구독 CLI / 서버 모델 API**를 선택한다. CLI를 선택하면 기존 Claude/Codex 구독 로그인을 사용하고, API를 선택하면 서버 환경변수의 모델 키를 사용한다. 실행 방식 변경은 사용자가 직접 선택하며, CLI 실패를 API 호출로 자동 전환하지 않는다.

운영 화면은 **`/studio`**(첫 화면 `/` 포함)이며 오늘수학 로그인과 기존 역할 제한을 적용한다. 자료 제작의 PDF·문제은행·수업 자료 조회는 인증된 `/api/studio/**` 경로를 사용한다. **AI 요청의 경로는 빌드가 정한다**(원장님 2026-09-18 — 「dev 모드인데 왜 구독요금제가 아니라 서버로 되어있지?」): 운영 빌드는 `/api/studio/ai`(서버 모델 API), development 는 `/`·`/studio` 에서도 AI 요청만 구독 CLI 다리 `/api/dev/unified/ai`(`DEV_AI_MODE=subscription-cli`, 도구는 `DEV_AI_PROVIDER`)로 보낸다 — `src/lib/studio-ai/endpoints.ts` 의 `ai`. 운영에서는 `/api/dev/**` CLI 경로가 열리지 않는다(404). 작업실의 AI 상태판은 **운영 빌드에서만 연결 상태 한 줄**(모델 자동 고정)이고, 개발 모드에서는 어느 화면이든 기존 칸(도구 고르기)이다 — `getStudioEndpoints().productionBuild`.

> 2026-09-14 `ce1a16d4` 가 첫 화면 `/` 를 작업실 표면으로 넣으면서, 표면 판정 하나가 데이터 경로와 AI 경로를 같이 정해 development 의 `/` 도 서버 모델 API(과금 키)로 갔다. 2026-09-18 에 두 판정을 갈랐다.
>
> 같은 날 관리자 아닌 계정(`test_t`)의 상태판이 «연결 확인 중»에서 멈췄다 — 계정 관문(`src/lib/accountRouteAccess.ts`)이 `/api/dev/**` 를 **관리자만** 열어 두어 403 이었다. 이 다리는 운영의 `/api/studio/ai` 와 같은 기능이라 **development 빌드에서 이 한 경로만** 같은 메뉴(`studio`)로 연다. `/dev/unified` 화면과 나머지 `/api/dev/**` 는 그대로 관리자만.

## 서버 모델 API

`.env.example`을 참고해 실제 키를 Git에서 제외되는 로컬 환경 파일 또는 배포 환경에 설정한다. `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`는 모두 서버 전용이다. 자동 배정의 전체 흐름에는 앞의 세 제공자 키가 필요하고 OpenAI는 선택 사항이다.

| 작업                                | 자동 배정 기본 모델        |
| ----------------------------------- | -------------------------- |
| 페이지 영역 탐지·개별 OCR·도형 검수 | Gemini `gemini-3.8-flash`  |
| 해설 생성·경고에 따른 1회 재생성    | DeepSeek `deepseek-v4-pro` |
| 도형 구조 생성·수정                 | Gemini `gemini-3.8-flash`  |

**도형 구조 생성은 2026-09-18 부터 Gemini 3.8 Flash(생각 LOW)**다(원장님 «가장 빠른 걸 정해 주면 운영에 돌려 보겠다»). 전에는 Anthropic `claude-opus-5` 였다.
그림 3장(함수 그래프·삼각형·사다리 삽화)으로 사양 생성 한 번씩 쟀다.
- Flash LOW: 4~7초. 둘은 원본에 가깝게 그렸고, 삽화 하나는 «엔진으로 못 그림»으로 원본을 남겼다.
- Opus 5 medium: 8~40초. Codex astra·sol·terra·luna(low·medium): 10~72초. sol·terra 는 엔진 검증 오류가 잦았다.
- Flash MEDIUM 은 생각 토큰 1.5만으로 53초 — 느리고 비싸다.

표본이 3장이라 운영 기록으로 다시 본다. 되돌리기는 코드 없이 운영 환경변수 `STUDIO_AI_FIGURE_VENDOR=anthropic`(또는 `openai`)이다. 운영 로그에 단계별 한 줄(`figure-redraw generate gemini/gemini-3.8-flash 5321ms ok`)과 실패 사유가 남는다. 측정 스크립트는 `.qa-artifacts/sim/figure-timing.ts`(저장소 밖 보관)다.

기본값은 `D:/mathg-gen`의 현재 실행 코드에서 옮겼다. API 제공자를 직접 선택할 수도 있다. DeepSeek는 해설 전용이며 이미지 작업 선택 시 실행 전에 안내한다. 모델 변경은 `STUDIO_AI_<VENDOR>_MODEL`로 하되 `src/lib/studio-ai/routing.ts`의 허용 목록에 있는 모델만 받는다. 키가 없는 제공자는 상태판에 표시되고 실행되지 않는다.

실제 API 과금 호출은 이번 이전 검증에 포함하지 않았다. 가짜 응답을 사용하는 전송·토큰 초과·취소·429 재시도 검사와 실제 Python/Chromium 출력 검사를 구분해 수행했다.

## 운영 도형·HWPX 엔진

로컬/자체 호스팅에서는 기존 Python을 직접 실행한다. Vercel에서는 `api/mathgen-engine.py`를 별도 Python 함수로 배포하고 Node API가 같은 배포의 엔진을 호출한다. `vercel.json`에 엔진·템플릿 포함 설정을 추가했으며 기존 Next 경로와 cron은 유지한다.

🔴 **배포 보호(2026-09-18 실측)** — `STUDIO_ENGINE_URL` 이 없으면 Node API 는 엔진을 **배포 고유 주소**(`https://$VERCEL_URL`)로 부르는데, 그 주소는 Vercel 배포 보호가 막는다(«Protected deployment» 401). 우회 비밀값(`VERCEL_AUTOMATION_BYPASS_SECRET`)은 9/15 에 회수했다. 그래서 운영의 SVG 도형 생성이 전부 502 «AI 결과를 처리하지 못했습니다»로 떨어졌다(HWPX 내보내기도 같은 길). 운영 환경변수 `STUDIO_ENGINE_URL=https://todays-math.vercel.app`(Production 만)로 엔진을 운영 도메인으로 부른다 — 엔진은 HMAC 서명(`STUDIO_ENGINE_SECRET`·`AUTH_SECRET`)으로 따로 잠겨 있어 서명 없는 요청은 스스로 401 이다. ⚠️ 이 문장을 적은 뒤에도 운영 변수는 **실제로 비어 있었다**. 2026-09-18 20시 `vercel env ls` 에 없었고, 그때 원장님 승인으로 넣었다(Production). 문서에 «설정한다»고 적힌 값은 `vercel env ls` 로 이름을 확인한다.

`functions`의 `includeFiles`·`excludeFiles`는 각각 최대 256자다. 2026-09-15 배포 실패는 362자였던 제외 패턴 때문이었다. Python 빌더가 기본 제외하는 `node_modules`, `.next`, `.git`, `public`, `__pycache__`의 중복을 제거하고 패턴을 묶어 246자로 줄였다. 공식 Vercel 스키마로 이전 설정의 실패와 수정 설정의 통과를 확인했으며, 추적 파일 24,774개와 Vercel 빌더의 실제 glob 결과를 대조해 엔진 파일·도형 자산·HWPX 템플릿 포함 목록이 동일함을 검증했다. 별도 임시 폴더의 Python 도형 렌더링도 통과했다. `next build`만으로는 이 Vercel 설정 오류를 검사하지 못한다.

`VERCEL=1`이고 개발 환경이 아니면 `https://VERCEL_URL/api/mathgen-engine`을 자동 선택한다. 다른 엔진 호스트를 쓸 때만 `STUDIO_ENGINE_URL`을 설정한다. Node/Python 간 요청은 서버의 `STUDIO_ENGINE_SECRET` 또는 기존 `AUTH_SECRET`으로 본문과 타임스탬프에 서명하며, 브라우저는 이 키를 받지 않는다. 별도 엔진 호스트에서는 양쪽 서명 키를 일치시킨다. Vercel 배포 보호가 켜져 있으면 `VERCEL_AUTOMATION_BYPASS_SECRET`을 설정해야 하며 이 값은 동일 배포 주소로만 전달한다.

요청은 3.5 MB, 압축 응답은 4 MB로 제한한다. 도형 스펙은 64 KiB, 엔진 실행은 도형 15초/HWPX 30초로 제한한다. 취소하면 호출을 중단하며 이미 시작한 Python 작업은 자체 시간 제한 안에서 정리된다. 실제 Vercel 배포 및 과금 모델 호출은 별도 환경에서 확인해야 한다.

## 로컬 설정

Git에서 제외되는 `.env.development.local`에 다음 값을 설정하고 dev 서버를 실행한다.

```dotenv
DEV_AI_MODE=subscription-cli
DEV_AI_PROVIDER=claude
```

**모델**(원장님 2026-09-18 — 「codex도 astra, sol 이런거 그리고 claude에서도 fable, opus, sonnet」): 상태판 도구 아래 «AI 모델» 칸에서 고른다. Claude 는 별칭 fable·opus·sonnet·haiku — 설치된 CLI 가 아는 그 가족의 최신 모델로 풀린다.
비워 두면(«CLI 설정») **원장님 CLI 설정의 모델**을 서버가 넘긴다 — 구독 호출은 훅·MCP 를 끌어오지 않으려고 사용자 설정을 끄고
돌기 때문에(Codex `--ignore-user-config` · Claude `--setting-sources ""`), `src/lib/dev-ai/cli-models.ts` 가 모델 칸만 읽는다:
Codex 는 `CODEX_HOME`(없으면 `~/.codex`)의 `config.toml` 맨 위 `model`·`model_reasoning_effort` 와 `models_cache.json`(목록 표시 모델 ·
모델별 추론 강도), Claude 는 `CLAUDE_CONFIG_DIR`(없으면 `~/.claude`)의 `settings.json` `model`. 추론 강도는 **그 모델이 받을 때만**
넘기고, 목록 밖 모델은 줄 서기·로그인 확인 전에 거절한다(`invalid-model`). 인증 파일은 읽지 않는다.

**도형 작업의 추론 강도는 medium**(원장님 2026-09-18 «도형 AI 추론 강도 하자» — `figure-engine.ts` `FIGURE_REASONING_EFFORT`).
사양 생성·원본 대조 모두 CLI 설정의 강도 대신 medium 을 넘긴다(Codex `-c model_reasoning_effort` — 그 모델이 받을 때만 · Claude `--effort`).
모델 고르기는 그대로 따른다. 작업실 세션 실측(그림 1662/q08): Codex astra 사양 생성 xhigh **242초** → medium 65초 · 대조 26초 → 7~9초 ·
Claude opus 기본 101초 → medium 32초. xhigh 로는 사양 생성 한 번이 240초 도형 예산을 넘겼다. 해설·인식은 CLI 설정 강도 그대로다.

Codex 기본 로그인과 Orca에서 선택한 계정이 다르면 `DEV_AI_CODEX_HOME`에 **이미 로그인되어 있는 프로필 디렉터리의 절대 경로**를 지정한다. 계정 파일을 복사하거나 토큰을 추출할 필요가 없다. 개인 프로필 경로는 저장소에 커밋하지 않는다.

개발 접속 주소는 `http://127.0.0.1:3000/dev/unified`이다. 개발 브리지는 development 모드의 loopback 접속에서만 제공되고, POST는 브라우저의 정확한 동일 출처를 요구한다. production에서는 404를 반환한다. CLI 환경 설정이 없어도 상태판에서 서버 모델 API를 선택할 수 있다.

## 사용 흐름

1. 자료 제작에서 PDF·이미지를 가져오거나 예제로 시작한다.
2. 페이지 전체의 문제 인식을 실행하거나, 직접 자른 영역의 OCR을 실행한다. 업로드만으로 AI 요청이 발생하지 않는다.
3. 원본과 인식한 문제를 대조하고 필요한 내용을 수정한다. 검수한 내용을 기준으로 정답·해설을 생성한다.
4. 문제를 시험지에 담고 기존 Mathgen 서식으로 미리보기·인쇄하거나 HWPX/PDF를 내려받는다. 인식 완료 문항은 디지털 출력을 기본으로 하며, 사용자가 선택한 원본 이미지 출력은 유지한다.

원본 PDF/이미지 Blob, 크롭·수정·도형·검수 위치는 IndexedDB에 저장한다. 운영 저장 공간은 로그인 계정별로 분리한다. 새로고침 후 완료 결과를 복원하며 진행 중 AI를 자동 재호출하지 않는다. 저장한 시험지의 「원본에서 수정」은 보관한 크롭과 도형 편집 정보를 다시 연다. 「새로 시작」은 제작 중인 원본/작업 상태를 함께 초기화하며 별도로 저장한 시험지는 유지한다.

일괄 작업은 순서대로 실행되며 취소 시 이미 완료된 결과를 유지한다. 원본·페이지 전환, 새로 시작, 삭제, 직접 편집 이후에 도착한 이전 응답이 현재 내용을 덮어쓰지 않도록 요청 소유권과 수정 이력을 확인한다.

분수 원문은 학년과 관계없이 보존한다. 초등 가분수의 대분수 변환은 기존 출력 표시 규칙에서만 적용하고, 중등 이상은 변환하지 않는다.

## 연결 알림판

왼쪽 메뉴에는 도구 선택, 연결 상태, 새로고침을 압축해서 표시한다. 실행 중에는 새로고침 위치에서 취소할 수 있고, 진행 상태와 경과 시간을 한 줄로 표시한다. 자세한 연결 오류는 상태에 마우스를 올려 확인한다. 남은 구독 한도나 요금은 CLI가 제공하지 않는 수치를 추정해서 표시하지 않는다.

| 도구        | 이 환경에서의 상태                                                                          |
| ----------- | ------------------------------------------------------------------------------------------- |
| Codex       | 기존 ChatGPT 구독 프로필로 실제 이미지 OCR·해설 생성 확인                                   |
| Claude Code | 기존 구독 로그인으로 실제 이미지 OCR·페이지 문제 인식·해설 생성 확인                        |
| Antigravity | 설치 확인. 활성화된 전역 MCP를 요청 단위로 분리하는 방법이 확인되지 않아 연결 미지원        |
| Grok        | 설치 확인. 호환 설정에서 불러온 전역 hooks·MCP의 요청 단위 분리가 확인되지 않아 연결 미지원 |

미지원 도구를 선택하면 이유를 표시하고 실행하지 않는다. 사용자의 전역 CLI 설정을 바꾸지 않았다. 구독 인증이 만료되거나 사용 한도에 도달하면 해당 오류를 표시한다.

## 이전 CLI 연결 검증 기록

2026-09-14 KST 실제 dev API에서 예제의 `125 + 348`, `72 ÷ 8`을 두 제공자로 인식하고, 각각 `473`, `9`의 정답과 풀이를 받았다. Claude 페이지 인식은 예제 3문항과 각 영역 좌표를 반환했다. 시험 응답과 화면 캡처는 Git에서 제외되는 `.qa-artifacts/workroom-hifi/`에 보관한다.

요청 크기, 출처·개발 모드 제한, 인증 구분, API 키 제외, 최종 응답 검증, 프로세스 취소와 정리, 클라이언트 요청 중복 방지를 테스트한다. 구현 및 공식 CLI 근거는 [어댑터 문서](dev-subscription-ai-adapters.md), 서식 복원 범위는 [Mathgen 서식 문서](mathgen-format-restoration.md)를 참고한다.

### 통합 화면 검증

- 관련 14개 파일의 129개 테스트 통과. CLI 환경 타입을 Next의 앱 환경 타입과 분리한 뒤 어댑터 21개 테스트와 ESLint를 다시 통과했다.
- 실제 Next dev 화면에서 Claude 페이지 인식 → 첫 문항 OCR 재실행 → 해설 생성 → 3문항 담기 → 정답·해설 포함 시험지 미리보기를 확인했다. 원본 이미지 3개와 생성된 정답·해설이 보존됐고 브라우저 오류가 없었다.
- 1440×923, 1366×768, 1024×600, 820×900에서 대기·실행·완료 상태 각각 가로 넘침과 왼쪽 메뉴의 세로 스크롤이 없었다. 기본 상태판은 142px, 낮은 화면에서는 92px이고, 낮은 화면의 실행·완료 상태는 중복 연결 행을 숨겨 97px로 유지한다.
- 독립된 Studio 브라우저 검증 3개에서 실제 PNG 가져오기, 실패 후 재시도, 원본 전환·초기화 중 지연 응답, 390px 모바일 및 분수 표시를 확인했다. 상세 기록은 [Studio 검증 문서](qa/studio-ai-workflow.md)에 있다.
- `npm run build` 통과: TypeScript 검사와 64개 정적 페이지 생성 완료. 기존 `dev/tier-bench/g4` 파일 추적 경고 2개와 Prisma 설정의 폐기 예정 안내는 남아 있다.

실제 통합 검증 기록은 `ai-studio-real.json`, 화면은 `ai-studio-recognized.png`, `ai-studio-solved.png`, `ai-studio-export.png`에 있다. 모두 `.qa-artifacts/workroom-hifi/` 아래에 보관하며 실제 사용자 브라우저의 저장 상태를 변경하지 않았다.
