# 교과서 쌍둥이 시범 (2026-10-21)

원장님 2026-10-21 «교과서 문제의 쌍둥이 문제를 전부 만들어서 교과서 문제가 아니지만, 교과서 문제가 공부되도록» →
고르심 «대조 먼저 + 시범 책 하나». 대조는 `../textbook-verify/`, 시범은 여기. 결과와 판단은
`docs/planning/tracks/reports/textbook-twins-20261021.md`.

🔴 **적재하지 않는다** — 모든 후보가 `loadable: false` · `productionWrites: false`. DB 를 안 만진다.
🔴 교과서 글 · 원본 그림은 저장소 밖(`display-survey/textbook-twins/`). 저장소의 묶음에는 **새 글만** 있고 원본은 해시로만 잇는다.
🔴 유료 API 금지 — 구독 CLI 만(`claude -p` · `codex exec`; 한도 시 `agy --model gemini-3.8-flash-high -p=…`). API 키 환경변수는 자식 CLI에 전달하지 않는다. Codex 는 한 번에 하나(리드 규칙 ⑤).

## 역할 (Codex 1회차 E · 2회차 A1)

| 역할 | 모델 | 받는 것 |
|---|---|---|
| 저자 | `claude -p --model claude-opus-5-5` (2026-10-21 사용자 전환 뒤; 앞선 Fable 기록은 보존) | 원본 글 · 정답 · 풀이 · 그림, 그 단원의 엔진 유형 목록(유형마다 견본), 그림 엔진 정본 목록 |
| 엔진 | 중등 엔진 `src/lib/middle/` (저자가 유형을 고르면) | 유형 키 · 문항 코드에서 낸 씨앗 |
| 풀이자 1 | `codex exec -m gpt-6-astra -c model_reasoning_effort=xhigh` (문항마다 새 실행) | **학생 면만**(발문 · 보기 · 그림 PNG) |
| 풀이자 2 | 전환 전 Fable 저작은 Opus, Opus 저작·그림 보완본은 `agy --model gemini-3.8-flash-high` (문항마다 새 세션) | **학생 면만** — 실제 도구 기록에서 해당 학생 JSON/PNG 읽기만 허용 |
| 검수자 | `claude -p --model claude-sonnet-5-5 --restricted` (문항마다 새 세션) | 원본 · 쌍둥이 · 두 풀이의 답 · 너무 닮음 수치(엔진 갈래는 저자의 근거를 가린다) |

## 차례

```bash
T=/Users/pss/Desktop/creative/display-survey/textbook-twins      # 저장소 밖(교과서 글)
V=/Users/pss/Desktop/creative/display-survey/textbook-verify
B=docs/planning/tracks/reports/textbook-twins-20261021/r1        # 저장소 안(새 글만)
PY=$V/.venv/bin/python
# 1. 원본 묶음(책 하나) — DB 덤프 · SSD 원본 추출 · 대조 원장에서
$PY scripts/qa/textbook-twin/build_sources.py $V/db-20261021.jsonl $V/orig $V/ledger-20261021.jsonl "2022/미래엔/중2/황선욱" $T
# 2. 단원마다 엔진 유형 목록(견본 · 그림 스펙)
npx tsx scripts/qa/textbook-twin/engine.ts catalog $T/sources.jsonl $T/catalog.json
# 3. 저자 — 단원마다 «엔진 유형 고름 · 새로 씀 · 보류»
$PY scripts/qa/textbook-twin/author.py $T/sources.jsonl $T/catalog.json $T --jobs 3
# 4. 후보 · 엔진 생성 · 그림 · 너무 닮음 · 동결 · 학생 면 (기존 동결 후보는 재작성하지 않음)
$PY scripts/qa/textbook-twin/materialize.py $T/sources.jsonl $T $B
# 후보·freeze·학생 면을 명시적 경로로 먼저 커밋한다. ._* 제외, git add -A 금지.
# 5. 블라인드 풀이 — 원 풀이를 답 공개 전에 커밋한다(봉인)
$PY scripts/qa/textbook-twin/solve.py $B $T/run --solver codex
$PY scripts/qa/textbook-twin/solve.py $B $T/run --solver opus --jobs 2
# Opus 저작/그림 보완 후보는 Opus 풀이에서 건너뛴다. 그 ID만 --only로 Gemini에 준다.
$PY scripts/qa/textbook-twin/solve.py $B $T/run --solver gemini --jobs 2 --only <Opus가-저작한-ID-목록>
# 6. 짝이 모인 풀이 파일만 명시적으로 커밋한 뒤 검수한다(이미 있는 다른 staged 파일이 있으면 거절).
$PY scripts/qa/textbook-twin/review_ready.py $T/sources.jsonl $B $T/run --watch
# 7. 모으기 → 8. 미리보기 (B는 r1 또는 r2 회차 폴더)
$PY scripts/qa/textbook-twin/collect.py $B
npx tsx scripts/qa/textbook-twin/preview.ts $T/sources.jsonl $B $T
# 시험
$PY -m pytest scripts/qa/textbook-twin/test_twin.py -q -p no:cacheprovider
npx vitest run src/__tests__/unit/textbookTwinHelpers.test.ts --maxWorkers=3
# 운영 빌드·DB 적재·푸시는 하지 않는다.
```

`B`는 `…/textbook-twins-20261021/r1` 또는 `/r2`를 가리킨다. 두 회차를 모을 때는
`select_preview.py <sources.jsonl> <textbook-twins-20261021>`를 실행하고, 미리보기에는 그 상위 폴더를 준다.
`revise.py`는 보류된 문항만 한 번 고쳐 `author-r2/`에 기록한다. `--only`로 이미 처리한 문항과 겹치지 않는
묶음을 지정할 수 있다. 새 판은 새 ID·새 씨앗·새 두 풀이·새 검수를 받는다.

학생 면은 `student.json`과 선언된 `fig-1.png`만 허용한다. 후보→학생 면 내용 일치, 실제 바이트, CLI 성공,
허용 도구·경로, 모델·세션, 검수 전 원시 풀이 커밋을 확인한다. 그림 스펙은 각 풀이의 사전 동결 커밋과
현재 바이트를 비교한다. 엔진도 두 모델이 필요하다. 검수는 정확한
12검사·7면과 근거, 실제 보기·그림의 적용 여부, 별도 검수 답·지적까지 검사한다. 이 관문을 통과해도 적재 가능은 0이다.
`subscription_cli.py`의 `AUTHOR_MODEL`이 저작·수정·그림 보완 기본값이다. Fable 신규 호출은 거절하며, 기존 결과의
모델·세션은 바꾸지 않는다. 그림 보완 모델도 저작 참여자로 세어 같은 모델의 풀이·검수는 독립 증거로 받지 않는다.

원본을 본 검수자의 원응답과 근거는 `$T/run/review/`에만 보존한다. 저장소의 `reviews/*.json`은 외부 파일의
위치·해시·검수자·봉인 연결 정보다. 따라서 다른 컴퓨터에서 최종 수집을 재실행하려면 외부 검토 원장도 필요하다.
원문 전체 복제·긴 그대로 인용이 검출된 새 후보는 외부 `quarantine/`에 보존한다. 유사도 눈금은 별개의 잠정
검사이며, 문턱 미만이라는 이유만으로 저작권·독창성·성취기준 준수를 승인하지 않는다.

미리보기는 외부의 `review.html`(원본 비교·상태/검색), `student.html`(정답 없는 통과 문항),
`answers.html`(정답·풀이)이다. KaTeX CSS와 글꼴도 외부 `assets/`에 복사하므로 인터넷 없이 열린다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `build_sources.py` | 책 하나의 원본 묶음 — DB 글 · SSD 원본 글 · 정답 · 풀이 · 그림(작업트리 `public/figures`) · 해시 |
| `engine.ts` | `catalog`(단원별 엔진 유형 · 견본) · `twins`(고른 유형으로 생성 · 원본 수 피하기 · 형식 파생) · `figures`(저자 스펙을 엔진으로) · `png` |
| `twinHelpers.ts` | 씨앗 · 수 뽑기 · 수 보존율 · 보기 떼기(순수 함수) |
| `author.py` | 저자 세션(단원마다) — 지시문 · 엔진 목록 · 그림 정본 목록 |
| `materialize.py` | 후보 JSON(기출 쌍둥이 계약 꼴) · 그림 · 너무 닮음 · 동결(`freeze.json`) · 학생 면(`blind/`) · 보류(`holds.json`) |
| `similarity.py` | 너무 닮음 — 4글자 겹침 · 이어진 같은 글 · 짧은 글 · 수 보존 · 같은 정답(Codex 1회차 D 잠정 눈금) |
| `solve.py` | 블라인드 풀이(Codex · Opus · Gemini) — 학생 면만 · 문항마다 새 세션 · 도구 사용 기록 |
| `answers.py` | 답 비교 — 표기만 접고 부호 · 단위 · 소문항 순서를 지킨다 |
| `review.py` · `review_ready.py` | 봉인 뒤 검수(Sonnet) — 12 검수 · 7 면 · 엔진 유형 맞춤 · 난이도 · 물음 꼴 |
| `collect.py` | 문항마다 상태 하나(통과 · 보류 — 수학 / 검수 / 너무 닮음 / 봉인) |
| `integrity.py` · `export_guard.py` | 실제 학생 면·그림·후보·커밋 연결과 원문 반출 검사 |
| `subscription_cli.py` | API 키를 넘기지 않는 구독 CLI 환경과 Gemini 대체 경로 |
| `select_preview.py` | 회차를 보존하면서 원본 코드마다 최종 시범 한 행을 선택 |
| `preview.ts` | 원장님 검토용 HTML(원본 ↔ 쌍둥이 · 학생 면) — 저장소 밖 |
