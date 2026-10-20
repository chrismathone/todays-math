# 지시서 — 서술형 엔진 첫 묶음: 실제로 만들고 같이 검수 (2026-10-20)

한국어로 보고한다(코드 · 경로 · 식별자만 원문).

## 원장님 지시

«실제로 엔진으로 문제를 만들어보고 코덱스와 같이 검수해봐. 내부 요금제 사용.»

- 앞서 정하신 것: 겨울 선행부터(다음 학년 1학기) · 학교 시험 연습용(기출을 보고 요구를 정함) · 서술형 엔진이 주 저자, 도형·그래프·계산 엔진은 보조 팀원 · 일일·확인에도 싣고 서술형만 배점(D-163).
- 🔴 **내부 요금제만 쓴다.** 유료 API(DeepSeek · OpenAI · Gemini · Anthropic API 키) 호출 금지. 문항은 결정적 엔진 코드로 만든다. 검수·풀이에 모델이 필요하면 구독 CLI(`codex exec -m gpt-6-astra -c model_reasoning_effort=xhigh`, `claude -p`)만 쓴다.

## 읽을 것

- `docs/planning/tracks/reports/descriptive-core-codex-20261020.md` — §6 첫 후보 10개 표(C01~C10)와 새 요구 후보. C05 는 이미 구현됐다(`src/lib/engine/descriptiveAuthor/rectangleDemo.ts`, 검증 `src/lib/engine/descriptiveVerification/rectangleDemo.ts`).
- `docs/planning/descriptive-engine-middle-20261020.md` — 계획 · 3자 합의(품질 장치 · 채점표 규칙 · 가짜 서술형 차단 · 독립 검산).
- `src/contracts/nativeDescriptive.contract.ts` r2, `src/contracts/descriptiveAuthor.contract.ts`, `src/lib/engine/nativeDescriptiveGates.ts`(G1~G6).
- 지면: `src/lib/print/descriptive.ts`, `src/components/print/DescriptiveAnswerArea.tsx` · `DescriptiveRubricPage.tsx`, 개발 화면 `/dev/descriptive-paper`.
- `docs/planning/18-qa-playbook.md` 의 «판정 코드 쓰기 전 점검표» · «해 보고 버린 것».

## 할 일

### 1. 정의 아홉 개 (C01~C04, C06~C10)

C05 와 같은 꼴로 주 저자 정의를 만든다(보조 엔진은 표의 typeKey 를 그대로 재사용, 그림이 필요한 C06 은 기존 그래프 보조).

정의마다 순서: 평가 목표 · 요구 ID ↔ 학생이 쓸 증거 ↔ 채점 기준 ID → 발문 · 생성 → **독립 검산**(인쇄될 발문 · 그림 정보만 읽고 생성기의 정답 · facts 를 입력으로 쓰지 않는다 · 배점 대상 중간값까지) → 배점 확정(4~12점 · 기준 수×2 고정 아님) → 지면.

- 가짜 서술형 차단: 단답 쌍둥이와 끝맺음만 다르고 요구 증거가 같으면 반려. 정답만 쓴 답안과 근거까지 쓴 답안이 같은 점수면 반려.
- 변형 · 실패 검증: 작은 영역은 전수, 나머지는 매개변수 조합 · 조건 갈래 · 경계. 부호 · 중간값 · 그림 라벨을 일부러 훼손한 사례가 검증에서 떨어져야 한다. 씨앗 수와 고유 조합 수를 따로 센다.
- G1~G6 통과. TDD(빨강 → 초록). 기존 시험 단정을 느슨하게 하지 않는다.
- **미등록 · DB 무변경.** examStudy 레지스트리 · 출제 배선 · 공유 DB 적재는 이번 범위가 아니다.

### 2. 실제로 만들어 보기

- 정의마다 씨앗 5개 이상으로 문항을 만든다(C05 포함 10정의 · 50문항 이상).
- `/dev/descriptive-paper` 에 열 정의를 고를 수 있게 넓혀, 학생용 · 교사용 지면을 제품 렌더러로 Chromium A4 PDF 로 뽑는다(일일 · 기출 별도 답안지 · 교사용). 넘침 · 잘림 · 학생지 답 노출 0 을 잰다.

### 3. 같이 검수 — 둘이 따로 풀고 대조

생성기 정답을 보여 주지 않은 채, **인쇄될 발문 · 그림만** 주고 두 검토자가 각각 푼다.

- 검토자 A: `codex exec -m gpt-6-astra -c model_reasoning_effort=xhigh`(새 세션 · 이 작업의 문맥 없음).
- 검토자 B: `claude -p`(구독 CLI · 새 세션). 안 되면 «못 돌렸다»고 적고 A 만으로 하지 말고 리드에게 알린다.

각 검토자는 문항마다 다음을 낸다.

- 자기 풀이 · 최종값.
- 판정: 수학 오류 / 조건 모순 · 답이 여럿 / 발문 모호 / 그림과 글 어긋남 / 가짜 서술형(근거 없이 답만으로 풀림) / 채점표가 묻지 않은 것에 배점 / 학교 시험 연습용으로 어색함 / 통과.
- 채점표 검토: 기준별 부분점수가 실제 답안에서 갈리는가.

대조: 두 검토자의 최종값 · 생성기 정답 · 독립 검산이 다르면 전부 목록으로. 지적은 «은행(생성기)에 대어» 진짜인지 가린다(틀린 지적은 틀렸다고 적는다). 진짜 결함은 고치고 **고친 것을 다시 검산**한다.

## 보고

`docs/planning/tracks/reports/descriptive-batch1-20261020.md`:

1. 정의 열 개 표: 학년 · 단원 · 평가 목표 · 배점 · 기준 · 보조 엔진 · 고유 조합 수 · 게이트 결과.
2. 실제 문항 견본: 정의마다 한 문항의 학생용 발문 · 교사용 채점표(글로).
3. 검수 결과: 검토자 A/B 판정 집계, 불일치 목록, 진짜 결함 · 틀린 지적 · 고친 것 · 재검산.
4. 지면 측정(넘침 · 노출 0), PDF 경로(큰 이미지 · PDF 는 저장소 밖 `/Volumes/새 볼륨/today-worktrees/desc-batch1-out/` 에, 보고서에는 경로만).
5. 원장님께 물을 것(있으면).

## 규칙

- 작업 폴더: 이 워크트리(외장 SSD · ExFAT). `._*` 커밋 금지. `node_modules` 는 심볼릭 링크 — `npm ci` · `prisma generate` · `git add` 금지. `git add -A` 금지.
- 커밋 · 푸시하지 않는다(리드가 검토 후 올린다). DB 무변경.
- 전체 `vitest` 대신 관련 시험 묶음 + `npx tsc --noEmit -p tsconfig.json` + 대상 ESLint + `npm run lint:affordance`.
- 기출 원문 · 수치 · 그림을 저장소나 생성 입력에 옮기지 않는다.
