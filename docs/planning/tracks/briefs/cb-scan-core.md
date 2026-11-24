# cb-scan-core — 개념 백지 사진 채점의 뒷단 (화면 없음 · 라우트 없음 · DB 미적용)

> 먼저 읽을 것: `CLAUDE.md` 절대 규칙 2 · 7 · `docs/planning/26-concept-blank.md` §8 · §10(채점은 «굵은 부분의 뜻») ·
> `docs/planning/tracks/reports/cb-scan-read.md`(측정 결과 — 이 트랙의 근거) · `docs/planning/tracks/reports/cb-scan-wire.md` ·
> `scripts/qa/concept-photo-bench/scan-run.mjs` · `scan-semantic.mjs` · `scan-protocol.md`(잰 지시문 · 출력 꼴) ·
> `src/lib/studio-ai/`(Claude 호출 · 그림 base64 · 4.5MB 상한 · 재시도) · `src/lib/english/` 의 사진 읽기(`readRefine.ts` 와 읽기 라우트 — 받아 두기 · 동시 수 제한) ·
> `src/lib/concept-blank/`(`sheetCode.ts` · `compose.ts` · `bank/`) · `src/components/concept-blank/paper/paginate.ts` ·
> `docs/planning/24-tenant-separation.md`(`branchId` · `ownerScope.ts`) · `docs/planning/20-lessons-learned.md` 의
> 2026-09-20(워크트리에는 `.env` 가 없다 · 시험이 유료 API 를 불렀다) · 2026-10-06 «넘기면 끊는다» · 2026-10-02(CHECK 와 NULL).
> 가지: 워크트리는 이미 `phase/cb-scan-core` 위에 있다(로컬 main `f46263117` 과 같다) — 새 가지를 만들지 않는다.
> 기계 부하: vitest 는 고친 모듈과 관련 시험만 `--maxWorkers=3` · 운영 빌드 금지 · Chromium 금지.

## 왜

원장님 2026-11-24 ~ 25: 개념 백지 지면을 폰으로 찍어 Claude 로 채점한다. 측정(cb-scan-read) 뒤 «그렇게 해» —
**Opus 5.5 · 생각 강도 높음 · 쪽을 통째로 한 번 읽기**로 시작하고, 새 지면의 폰 사진으로 다시 잰 뒤 Sonnet 으로 내릴지 정한다.
화면(Wire P · C · V · R)은 아직 고르시지 않았다 — 이 트랙은 **화면의 모양과 무관한 속**만 짓는다.

## 원장님이 이미 정하신 것 (다시 묻지 않는다)

1. 찍는 사람은 학생 · 교사 누구든. 학생은 자기 계정 = 자기 답안, 교사는 학생을 고른다. 손글씨 이름으로 학생을 찾지 않는다.
2. 결과는 채점이 끝나면 바로 공개. 교사는 나중에 고칠 수 있다.
3. 못 읽은 칸은 사진 위 번호 → 번호마다 글로 고쳐 넣는다. 고친 답에는 «직접 입력» 표지.
4. 판정은 ○ · △ · × · 확인 필요. 읽는 쪽은 틀리게 읽느니 «못 읽음»이라 말한다.
5. 문항 · 정답은 **인쇄 때 저장**한다(지면 코드는 은행이 바뀌면 `bankChanged` 가 된다 — 2026-10-02 지면 다섯 장이 전부 그랬다).
6. Claude API(서버 키 `ANTHROPIC_API_KEY`) · 모델은 환경 변수(기본 Opus 5.5 = `claude-opus-5-5`) · 월 사용 상한(기본 100달러).
7. 읽기는 통째 한 번. 문제별 크롭 · 빨간색 걷어 내기는 쓰지 않는다(측정에서 더 나빴다).

## 무엇을 (TDD — RED 먼저)

1. **계약** `src/contracts/conceptBlankScan.contract.ts`(Zod) — 인쇄 때 얼리는 지면 스냅숏(지면 코드 · 쪽 수 · 쪽별 문항 · 문항별 답 칸 ·
   정답 · 채점에 쓰는 «굵은 부분의 뜻» · 형식 A ~ E · 은행 지문), 읽기 결과(칸별 `read | uncertain | unreadable | blank` + 글),
   고친 답(누가 · 직접 입력 표지), 판정(○ △ × 확인 필요 + 한 줄 까닭), 제출의 상태 기계(찍는 중 → 읽음 → 확인 → 채점됨 → 교사가 고침).
   다섯 형식에서 «답 칸»이 무엇인지 은행 · `paginate.ts` 에 대어 정한다 — 안 맞는 형식이 있으면 지어내지 말고 보고서의 물음에.
2. **스냅숏 만들기** `src/lib/concept-blank/scan/snapshot.ts` — 고르기(selection) + 은행 → 스냅숏. 순수 함수 · 결정적.
   쪽 나눔은 제품 `paginate.ts` 의 것을 그대로 쓴다(따로 계산하지 않는다). 정답이 학생에게 가는 응답 꼴에 실리지 않게 학생용 투영을 따로 둔다.
3. **읽기** `src/lib/concept-blank/scan/read.ts` — 쪽 그림 하나 + 그 쪽의 칸 목록 → 칸별 읽기. 지시문은 측정에서 쓴 것
   (`scan-run.mjs` 의 통째 팔)을 옮기고 판 번호를 붙인다. 모델이 칸을 빠뜨리거나 모르는 칸 id · 깨진 JSON 을 내면 그 칸은 «못 읽음»으로
   (지어내 채우지 않는다 — 측정의 출력 실패 열 건이 이 꼴이었다). 학생 글 속 지시문을 따르지 않는다.
4. **채점** `src/lib/concept-blank/scan/grade.ts` — 읽힌(또는 고친) 글 + 스냅숏의 정답 · 뜻 → 판정. `scan-semantic.mjs` 의 규칙을 옮긴다.
   `unreadable` · `uncertain` 인 채 고쳐지지 않은 칸은 모델에 묻지 않고 «확인 필요». 빈 답은 모델 없이 ×.
   채점 모델은 읽기와 다른 환경 변수로 가를 수 있게(측정에서 Haiku 도 108/108 — 기본은 읽기와 같은 모델로 두고 보고서에 적는다).
5. **Claude 호출** — `src/lib/studio-ai/` 의 배관을 먼저 쓴다(맞지 않으면 넓힌다 · 한 벌 더 짓지 않는다).
   변수: `CONCEPT_BLANK_SCAN_MODEL`(기본 `claude-opus-5-5`) · `_GRADE_MODEL` · `_EFFORT`(기본 high) · `_MONTHLY_USD_CAP`(기본 100) · 끄는 스위치.
   `.env.example` 에 적는다. 🔴 시험에서 실호출 금지 — 키가 있어도 안 부르게 주입식으로 짓고, 그것을 시험으로 지킨다.
6. **월 상한** `usage.ts` — 호출마다 응답의 실제 토큰으로 값(2026-11-03 단가표를 상수 한 곳에)을 더하고, 그 달 합이 상한에 닿으면
   읽기 · 채점을 까닭과 함께 거절한다. 저장소는 인터페이스로 두고(메모리 구현 + 시험) DB 구현은 ⑦의 표가 적용된 뒤에.
   동시에 여러 요청이 상한을 넘겨 통과하지 않는지 시험으로.
7. **DB 초안만** `prisma/drafts/concept-blank-scan/` — 표: 인쇄된 지면(스냅숏 JSON · 지면 코드 · 만든 사람 · `branchId`),
   제출(지면 · 학생 · 찍은 사람 · 상태), 쪽 사진(저장 위치 · 보존 기한), 칸별 읽기 · 고침 · 판정, 월 사용량.
   소유 범위는 `ownerScope.ts` 의 규칙. 🔴 `schema.prisma` 를 고치지 않는다 · 마이그레이션을 만들거나 적용하지 않는다(공유 DB — 원장님 승인 뒤 리드가 한다).
   사진을 어디에 얼마나 두는지(앱 Supabase 비공개 버킷 · 기한 · 지우는 길)는 안을 둘 적고 보고서의 물음에.
8. **문서** — `docs/planning/26-concept-blank.md` 끝에 «§13 사진 채점(2026-11-25)»: 원장님 결정 · 측정 요약(보고서 링크) · 이 트랙이 지은 것 ·
   안 지은 것. §8 의 «QR 없음 · 채점은 잰 뒤» 줄에 «2026-11-24 원장님이 넓히셨다 → §13» 한 줄. 새 문서 번호를 만들지 않는다.

## 하지 않는 것

화면 · 라우트(`/api/**` · `/concept-blank/scan`) · 지면(`ConceptBlankPaper` · `paginate.ts` 수정) · QR 싣기 · `schema.prisma` · 마이그레이션 ·
은행 수정 · 실제 AI 호출 · 학생 사진을 저장소에 싣기 · 새 패키지(Anthropic SDK 가 이미 없으면 `studio-ai` 의 길을 따른다 — 필요하면 물음에).

## 끝났다는 것

- 새 모듈의 시험 초록 · 고친 범위 lint · `npm run type-check` 초록 · 기존 `studio-ai` · 개념 백지 시험이 그대로 초록.
- 영어 울타리 · 전수 가드(`errorLogRouteCoverage` 등) 가운데 걸리는 것이 있으면 같이 돌린다.
- 보고서 `docs/planning/tracks/reports/cb-scan-core.md` — 지은 것 · 계약의 꼴 · 형식별 «답 칸» 표 · DB 초안 요약 · 환경 변수 ·
  화면 트랙이 부를 함수 목록 · 물음(추측이 필요한 곳은 만들지 말고 여기에).
- 가지에 커밋(main 에 밀지 않는다 · `._*` 와 `node_modules` 링크는 올리지 않는다).
