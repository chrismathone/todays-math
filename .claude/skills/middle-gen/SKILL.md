---
name: middle-gen
description: 자체 중학 엔진(중1~중3, AI 아님)으로 RPM 유형 단위 중등 문항 세트를 생성·검수한다. 원장님이 중등 문항 생성·샘플·유형별/단원별 출제를 요청할 때 사용. 바로 생성하지 말고 질문으로 세부를 확정한 뒤 생성한다.
---

# 중등 출제 (middle-gen)

자체 중학 출제 엔진(`src/lib/middle/`)을 세션에서 바로 부르는 스킬이다.
**AI 생성이 아니다** — 순수 엔진이라 씨앗이 같으면 결과가 같고, 정답은 생성기가
같은 숫자로 계산한다. 그림은 FigureSpec v2 로 나와 도형 엔진이 그린다.

문항은 **RPM 유형 색인**(책|중단원|번호)을 단위로 등록돼 있다. 교재 문항을 옮긴 것이
아니라 **그 유형을 보고 새로 지은 것**이다.

## 절차 — **바로 생성하지 않는다**

**① 커버리지부터 확인한다.** 질문의 선택지는 추측이 아니라 실제 목록에서 나와야 한다.
715유형·110단원이라 **전량을 뿌리면 대화가 안 된다** — 반드시 좁혀서 본다.

```bash
npx tsx scripts/middle/gen-cli.ts --sections --grade 중3    # 그 학년의 단원 목록 (짧다)
npx tsx scripts/middle/gen-cli.ts --list --q "원주각"        # 자유 검색 (제목까지 본다)
npx tsx scripts/middle/type-census.ts                        # 책별 등록/미등록 한눈에
```

⚠️ **「없다」를 말하기 전에 `--q` 로 한 번 더 찾아라.** 원장님이 부르는 이름과 RPM
중단원 이름이 다를 수 있다(예: 「이차함수」→ 단원명은 `이차함수와 그래프`·
`이차함수 y=ax^2+bx+c의 그래프`·`이차함수의 최댓값과 최솟값` 셋이다).

**② AskUserQuestion 으로 세부를 확정한다.** 원장님이 **이미 말한 것은 다시 묻지 않는다.**
빠진 것만 묻되, 보통 이 셋이다:

1. **범위** — 단원(`--section`) 또는 유형 하나(`--type`). 원장님이 주제로 말하면
   `--sections`/`--q` 로 찾아 **실제 단원명을 선택지로** 낸다. 여러 단원에 걸친
   세트면 단원마다 몇 문항인지도 받는다.
2. **문항 수** — 4 / 6 / 8 / 12 같은 선택지.
3. **출력** — HTML 미리보기(기본) / JSON / 둘 다.

⚠️ **난이도는 고를 수 없다.** 중등 엔진은 난이도가 **유형에 붙어 있다**
(`easy`/`mid`/`hard` 가 유형 속성이다). 초등의 4단(D-71)과 다르다 — 원장님이
난이도를 물으시면 「단원 안에서 유형을 고르면 그게 난이도」라고 설명하고,
필요하면 `--list` 로 그 단원 유형을 보여 드리고 고르시게 한다.

**③ 확정 내용을 한 줄로 요약해 보여 주고 생성한다.** 씨앗은 그날 날짜 기반
(예: 20260824)으로 정하되 **반드시 보고에 남긴다** — 씨앗이 있어야 같은 세트를 다시 만든다.

**④ HTML 을 SendUserFile 로 보낸다** (`display: "render"`). 그림 실패(종료 코드 1)가
있으면 숨기지 말고 어느 문항이 왜 실패했는지 그대로 보고한다.

## 명령

```bash
# 단원 하나를 고루 — 유형들을 돌아가며 뽑는다
npx tsx scripts/middle/gen-cli.ts --section "이차함수와 그래프" \
  --count 8 --seed 20260824 --html preview.html

# 유형 하나만 — 씨앗 안에서 variant 로 갈린다
npx tsx scripts/middle/gen-cli.ts --type "3-1|이차함수의 그래프 ⑴|01" \
  --count 4 --seed 20260824 --out set.json --html preview.html

# 목록
npx tsx scripts/middle/gen-cli.ts --sections [--grade 중2] [--book 2-1] [--q 연립]
npx tsx scripts/middle/gen-cli.ts --list     [--grade 중2] [--book 2-1] [--q 연립]
```

- `--section` 은 **우리 `Unit.section`** 이름이다(RPM 중단원 이름이 아니다).
  `--type` 의 키는 `책|RPM중단원|번호` 다 — 둘을 헷갈리지 말 것.
- **여러 단원에 걸친 세트는 단원마다 한 번씩 부른다**(범위 혼합은 아직 CLI 밖).
  HTML 도 단원마다 나오니 파일을 여러 개 보내거나, 한 단원씩 확인받는다.

## 규칙 (어기면 안 되는 것)

1. **커버리지를 손으로 단정하지 말 것** — 항상 CLI 에 묻는다. 안 만든 유형이
   **158개** 있다(2026-08-24 기준: 1-2 기하 84 · 2-2 기하 57 · 3-2 통계 17).
   없는 단원을 `--section` 에 주면 엔진이 던진다(조용히 딴 걸 내지 않는다).
2. **DB 에 넣지 않는다.** 이 스킬은 생성·검수까지다 (D-22·D-31).
   ⚠️ **적재를 요청받으면 그 자리에서 하지 말고 «아직 준비가 안 됐다»고 알려라** —
   지금 `MidProblem` 에 **출처 칸이 없고**, `ProblemSource` enum 에 「자체 엔진」 값이
   없어 `manual`(원장님 자작)과 **한 칸에 섞인다.** D-51 과 같은 사고가 난다
   (그때 `SOURCE_RANK` 가 못 갈라 4,862건이 한 등급 밀렸다). 유형 키·씨앗도 저장되지
   않아 「이 문항이 어느 유형에서 나왔나」를 되짚을 수 없다.
3. **HTML 은 검수용 미리보기다** — 시험지 지면이 아니다. 인쇄물이 필요하면 제품
   화면으로 간다. 새 지면을 만들려면 D-07(원장님 확정) + 절대 규칙 6(실물 인쇄 검수).
4. **그림이 실패하면 그 문항의 좌표를 고치지 말 것** — 엔진 상한이 말하는 것이다.
   `docs/planning/09-figure-engine-guide.md` §4(재발 금지)를 먼저 읽고, 고칠 것이
   있으면 kind(스키마) 쪽을 고친다.
5. **문항 본문을 손으로 고치지 말 것.** 이상하면 그 유형의 생성기(`src/lib/middle/m*.ts`)를
   고치고 시험을 같이 손본다 — 손으로 고치면 다음 씨앗에서 그대로 다시 나온다.
6. **RPM 원본은 보기만 한다**(`C:/Creative/testautocreator/.rpm-src/`). 본문·수치를
   옮기지 말 것(저작권).

## 구조

- `src/lib/middle/generate.ts` — 유형 등록표(`registeredTypes`)·생성(`generateMiddleProblem`)
  · 단원 조회(`typesForSection`). 유형은 `m1*.ts`/`m2*.ts`/`m3*.ts` 에 나뉘어 있다.
- `scripts/middle/listing.ts` — 목록 거르기·단원 접기 (시험: `src/__tests__/unit/middleGenListing.test.ts`)
- `scripts/middle/gen-cli.ts` — 인자 처리 + JSON/HTML 출력 (수식은 제품 렌더러
  `renderMathHtml`, 그림은 `renderFigureSpec` — 지면과 같은 것을 본다)
- `scripts/middle/type-census.ts` — 책별 등록/미등록 (RPM 색인 대조)
- 계획·진행: `docs/planning/tracks/middle-engine-wave3-plan.md` (§11 물결4 · §12 물결5)
