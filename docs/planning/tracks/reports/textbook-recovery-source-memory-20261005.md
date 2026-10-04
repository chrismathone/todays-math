# 교재 복구 — 원본 v15 암기 지면의 행 기하

작성일: 2026-10-05. 대상: 조율 담당 커밋 `a246dd1cd` 위. 근거: [복구 실행 계획 최종 표결본](../../textbook-v15-recovery-plan-final-20261005.md), [내용 렌더러 보고](textbook-recovery-content-render-20261005.md), [작성기 검사 보고](textbook-recovery-writer-checks-20261005.md).

원본 교재(인재원 v15)의 개념학습 · 빈칸개념암기 · 통문장개념암기 지면을 옮긴 블록이 **원본과 같은 높이**로 찍히게 했다. 은행에서 자동으로 쓴 암기 지면은 그대로다.

내가 바꾼 파일: `render/blocks/recall.ts` · `render/blocks/concept.ts` · `render/blocks/contentCss.ts` · 새 검사 `textbookRecoverySourceMemory.test.ts` · `textbookRecoverySourceMemory.integration.test.ts` · 이 문서. 그리고 조율 담당이 이번 작업 중에 요청한 `textbookRecoveryWriter.test.ts` 의 단정 하나(§9). 측정 · 계약 · 조판 · `semantic.ts` · `problem.ts` · `html.ts` · 서버 · 계획 · 얼린 기준선은 건드리지 않았다. 운영 DB 쓰기 · 푸시 · 배포는 없다.

## 1. 커밋

| 커밋 | 내용 |
| --- | --- |
| `d52ab524f` | `a246dd1cd` 병합 |
| `258a94dee` | 원본 표지 · 원본 전용 기하 · 수식 표시 · 검사 둘 |
| `f6c7c01e4` | 줄 하나짜리 쓰기 칸 규칙을 «줄이 하나일 때»로 · 행 이름 칸 · 넘침 · 표지 검사 · 작성기 단정 |
| `5f495a7cc` | 변이 검사가 놓친 자리의 검사 |
| `3957be1bc` | 새 검사 픽스처의 타입 오류 1건 |

## 2. 원본 표지 — 조율 담당이 고를 자리

조건은 하나다: 암기 블록(`rows` · `concept` 노드)에 **`semantic.source` 가 있다**. 자동 작성기는 이 칸을 쓰지 않는다(`server/quickCreate/` 에 0건).

| 어디 | 표지 |
| --- | --- |
| 구획 | `section.tb-memory.tb-memory-source[data-memory-origin="source"][data-source-kind="fullmaster"]` |
| 행 | `.tb-memory-row.tb-memory-row-source[data-row-origin="source"]` |
| 코드 | `blocks/recall.ts` 의 `RECALL_SOURCE_CLASS = "tb-memory-source"` · `RECALL_ROW_PADDING_MM = { bank: 2.2, source: 3 }` |

은행 지면에는 이 넷 가운데 아무것도 없다.

## 3. 원본 전용 규칙

`contentCss.ts` 의 다섯 줄이고, 전부 `.tb-memory-source` 아래에만 걸린다. 은행 규칙(행 여백 1.1mm · 본문 7mm 바닥 · 제목 줄 높이 1.5 · 7mm 쓰기 줄)은 한 글자도 바꾸지 않았다.

| 무엇 | 값 | 원본 근거 |
| --- | --- | --- |
| 제목 줄 높이 | 1.65 | `.master-title` 은 지면의 줄 높이를 물려받는다 — 계산값 22px ÷ 13.333px |
| 행 위아래 여백 | 1.5mm | `full.css` `.fullmaster .master-row{padding-block:1.5mm}` |
| 본문 · 쓰기 칸 최소 높이 | 0 | 원본 계산값 `min-height:0px` |
| 행 이름 줄 높이 | **건드리지 않음**(1.9 상속) | 원본 계산값 18.7467px = 1.9 × 9.8667px (§5) |
| 쓰기 줄이 하나일 때 | 행 본문을 채우는 밑줄 하나 | 원본 `.sentence-mask` 는 가린 글 아래 밑줄 하나 |

**수식**: 원본은 모든 수식을 `\displaystyle` 로 조판한다(`app.js` 6줄). 원본 행과 원본 개념 카드의 수식을 **찍는 순간에만** display style 로 바꾼다 — 대화 블록이 쓰는 `displayStyleMath` 를 그대로 쓴다. 저장된 행 · 모델이 만든 `displayRows` · 은행 행은 바뀌지 않고, 이미 `\displaystyle` 이 붙은 수식에 또 붙이지 않는다.

**통문장 쓰기 칸**(원본 행만):

- 높이를 받기 전: 밑줄 하나. 최소 높이는 «어림한 글줄 수 × 1.9em» — 7mm 바닥이 아니다.
- `rowHeightsMm` 을 받은 뒤: 줄 수 = `max(1, floor((높이 − 3) ÷ 7))`. 하나면 밑줄 하나가 행 본문을 채우고(`.tb-blank-rule`), 둘 이상이면 7mm 줄.
- CSS 는 `.tb-memory-source .tb-blank-sentence>.tb-write-line:only-child` 에 걸었다. **측정 쪽이 DOM 에 줄 하나를 써 넣어도** 같은 모양이 된다.

## 4. 자연 높이의 셈 (탐침 행)

정답 판 개념학습 행에 높이를 주지 않았을 때:

- 한 줄 행 = 여백 3mm + 행 이름 칸(위 0.7mm + 7.4pt × 1.9) → **8.644mm**(셈으로는 8.66mm, 실측은 원본과 같은 값). 본문 한 줄(8.3pt × 1.9 = 5.563mm)이 행 이름 칸(5.66mm)보다 낮아 **행 이름이 높이를 정한다**.
- 분수가 있는 행: display style 분수(수식 글자 1.12em)가 글줄을 키운다 → **9.211mm** · **9.575mm**.
- 제목: 개념 코드 칩(7pt × 1.65 + 위아래 1.3mm) + 아래 여백 1.5mm + 선 → **8.429mm**.

## 5. 행 이름 줄 높이 — 지시서와 다른 값

지시서는 행 이름 줄 높이 1.65 였다. 원본 기준 파일의 계산값은 1.9 였고, 1.65 는 **제목**이 물려받는 값이었다. 둘을 실제로 재서 조율 담당에게 물었고 «원본 계산값대로»로 답을 받았다.

| | 제목 | 한 줄 행 | 블록 높이(넷) |
| --- | --- | --- | --- |
| 원본 | 8.429 | 8.644 | 45.612 · 45.045 · 44.115 · 44.115 |
| 제목 1.65 · 행 이름 1.9 (**채택**) | 8.429 | 8.644 | 차 0.000 |
| 행 이름 1.65 · 제목 1.5 | 8.057 | 8.553 | −0.463 · −0.554 · −0.645 · −0.645 |

## 6. 원본 기하와의 대조 — 실제 Chromium

U01 의 원본 18 · 19 · 20쪽(네 개념 × 세 행)을 제품 글꼴과 제품 스타일로 찍어, 원본 조판기에서 잰 `requested-row-paired-geometry.json` 과 견줬다. 쪽마다 68자리: 제목 높이 · 블록 높이 · 행 높이 · 행 위치 · 행 이름 칸의 위치 · 높이 · 폭.

| 무엇 | 가장 큰 차 |
| --- | --- |
| 탐침(정답 판 개념학습, 자연 높이) | **0.0000mm** — 68자리 전부 |
| 학생용 개념학습 · 빈칸 · 통문장 (탐침 높이를 0.01mm 로 올림) | **0.0165mm** — 세 쪽 모두, 0.5mm 넘는 자리 0 |
| 세 단계 사이 행 위치 | 어긋남 0 (0.05mm 기준) |
| 고정한 행보다 내용이 높은 행 | 0 |
| 대조군: 같은 행에 은행 기본값 | 68자리 가운데 26자리가 0.5mm 를 넘음(가장 큰 차 8.3mm) |

분수 행 셋(9.211 · 9.575 · 9.575mm)도 0.000mm 다. 높이를 0.1mm 로 올리면(은행 지면의 올림) 가장 큰 차가 0.165mm 로 쌓인다 — 조율 담당의 측정은 원본 행에 0.01mm 를 쓴다.

합성 행으로 본 것(원본 자료 없이도 돈다): 한 줄 행 8.644mm · 제목 8.43mm · 여백 1.5mm · 본문 최소 높이 0 · 분수는 display style · 세 단계 같은 위치 · 짧은 행은 본문 바닥에 닿는 밑줄 하나 · 긴 행은 본문 안의 7mm 줄 · 옆의 은행 지면은 여백 1.1mm 와 9.2mm 행 그대로.

## 7. 학생 지면과 DTO

| 어디 | 확인한 것 |
| --- | --- |
| 학생 빈칸 지면 HTML | 핵심어 글과 핵심어 분수가 없다. 핵심어마다 빈칸 하나, 핵심어 표시(`.tb-memory-key`) 0개. 공개된 글과 공개된 수식은 남는다 |
| 학생 통문장 지면 HTML | 행 본문의 글자 0자 · 수식 0개 |
| 모델이 핵심어를 잘못 실어 보낸 경우 | 학생 블록이면 렌더러가 한 번 더 지운다 |
| 학생 모델(DTO) | 숨김 두 단계의 행 `rawText` 는 전부 빈 글 · `displayRows` 에 핵심어 조각 없음 · 통문장은 조각 0개 |
| 정답 판 | 핵심어와 분수 셋이 모두 찍힌다 |

합성 원고는 `교환 형식 → 모델 → HTML` 전체를, 원본 U01 은 실제 모델과 Chromium 지면을 봤다.

## 8. 변이 검사

코드를 일부러 깨뜨려 검사가 빨개지는지 봤다(커밋하지 않고 되돌림). 열일곱 가지 가운데 **열여섯은 바로 잡혔고 하나는 놓쳤다** — 놓친 것은 검사를 더한 뒤 다시 깨뜨려 잡히는 것을 확인했다.

| 깨뜨린 것 | 빨개진 검사 |
| --- | --- |
| 원본 행 여백을 은행 값 1.1mm 로 | 단위 1 · Chromium 2 |
| 원본 본문에 7mm 바닥을 남김 | 단위 1 · Chromium 2 |
| 원본 제목 줄 높이를 은행 값 1.5 로 | 단위 1 · Chromium 2 |
| 행 이름에 줄 높이 1.65 를 줌 | 단위 1 · Chromium 2 |
| 줄 하나짜리 쓰기 칸을 7mm 고정 줄로 | 단위 1 · Chromium 1 |
| 원본 여백을 모든 암기 지면에 적용 | 단위 1 · Chromium 1 |
| 원본 수식을 display style 로 바꾸지 않음 | 단위 4 · Chromium 2 |
| 은행 수식까지 display style 로 | 단위 1 · Chromium 1 |
| 원본 표지를 붙이지 않음 | 단위 7 · Chromium 3 |
| 모든 지면에 원본 표지를 붙임 | 단위 4 · Chromium 2 · 기존 내용 렌더 검사 2 |
| 원본 줄 수를 은행 여백(2.2mm)으로 셈 | 단위 1 |
| 원본 통문장을 늘 7mm 줄로 | 단위 2 · Chromium 2 |
| 높이를 받기 전 원본 통문장에 어림 줄 수만큼 7mm 줄 | **놓침** → 검사를 더한 뒤(`5f495a7cc`) 단위 1 |
| 학생 블록이 받은 핵심어를 그대로 찍음 | 단위 2 |
| 원본 개념 카드 수식을 display style 로 바꾸지 않음 | 단위 1 |
| 작성기: 준비 학습에 다른 활동의 표지 | 작성기 2 |
| 작성기: 단원 도입에 다른 활동의 표지 | 작성기 4 |

놓친 까닭: 검사에 쓴 원본 행이 전부 한 줄로 어림돼서 «밑줄 하나»와 «어림 줄 수만큼의 7mm 줄»이 같은 결과였다. 여러 줄로 어림되는 행을 더해 은행 행과 갈리는 것을 본다.

첫 실행은 너무 느려 중간에 멈췄다. 멈추면서 변이 하나가 작업 사본에 남았고, `git checkout` 으로 되돌린 뒤 처음부터 다시 돌렸다. 위 표는 다시 돌린 결과다.

## 9. 작성기 검사의 단정 (조율 담당 요청)

`a246dd1cd` 부터 단원 도입과 준비 학습 블록에 활동 표지가 붙는다. `textbookRecoveryWriter.test.ts` 의 «하나만 켬» 검사는 이 둘을 틀 이름과 제목으로 알아봤고, 표지가 **없어야** 통과했다 — 그래서 실패했다. 이제 표지를 뺀 모든 활동을 **자기 블록의 활동 표지**로만 알아본다. 31 / 31(추천 구성 검사도 이제 돈다).

## 10. 글꼴 · 원본 · 해시 · 증거물

| 무엇 | 값 |
| --- | --- |
| 본문 · 행 이름 글꼴 | 계산값 `TextbookPretendard, sans-serif`. 실리는 파일은 `public/textbook/editorial/fonts/NotoSansKR-400.ttf` · `-700.ttf` |
| 글꼴 파일 SHA-256 | 400: `2f840a5d2d8bf48581dd1a28407920673e765140676a8af6d5d6af1d72421453` · 700: `030b934a58b2fd48b589d311549f6af2da6a56b6b20a9cd35bc74701c3aa07f2` — **원본 `assets/fonts/` 의 두 파일과 같다**(원본의 글꼴 이름은 `NotoKR`) |
| 수식 글꼴 | `KaTeX_Main` · `KaTeX_Math`. 제품 katex 0.16.47 · 원본 katex 0.18.9. 수식 글자 크기는 양쪽 1.12em |
| 원본 조판기 | `full.css` `b711f57857f425870a7aee65327728928dd24846d4574603327972dce35f3150` · `styles.css` `64e7d6135d7b553198c8a0b17c552a6dbe91b37535b58220ad8dffa6160d8fda` · `editorial.css` `283627cf0c582b303579f10c40f349a1e912e641609fdd9444343f2979d6d66b` · `full.js` `08db4db9f2d0cdea8fe64790a8730343b16c2669bbfeb92f197330fde7c349ed` · `app.js` `a86db8d5c501940bbac09c71c2ea744551ba37c935fb41f82464d23075fa8530` |
| 원본 원고 | `manuscript.json` `520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb` — 기준 파일이 적은 값과 같다 |
| 기준 파일 | `requested-row-paired-geometry.json` `d7b269033d31b92f3d1dfc454899a65b9534ab2ae6a09c2f8ba13fd1bea31164` |
| 제품에 넣은 변환본 | `exchange-semantic.json` `6e141a111dd38f5bfd691e0456873012e8d4d522b6d21f930ebbcee88d1e0881` |
| 증거물 | `C:/Users/user/Downloads/교재_복구_실행검증_20261005/source-memory-evidence-5f495a7cc/` — 저장소 밖. 상자 · 행 열쇠 · 글꼴 이름 · 해시만 있고 원고 글은 없다 |

증거물 파일: `source-original-comparison.json`(자리마다 원본 값과 잰 값) · `source-original-probe.json` · `source-original-student.json` · `source-original-bank-defaults.json` · `source-synthetic-*.json` · `source-memory-mutations.json`.

## 11. 남은 차이

1. **빈칸의 폭.** 원본은 가린 글의 실제 폭이고, 제품은 글자 수로 어림한다(가린 글을 싣지 않으므로). 빈칸 뒤 글의 가로 위치가 다르다. U01 열두 행에서는 줄 수가 달라지지 않았다(넘침 0). 다른 단원은 재지 않았다.
2. **빈칸과 쓰기 칸의 모양.** 원본은 빈칸에 옅은 바탕(`#f0f5ec`)과 0.7pt 밑줄, 통문장에 옅은 가로 바림과 0.6pt 밑줄을 쓴다. 제품은 채움 없는 0.265mm 선뿐이다(쓰기 공간은 벡터 선만 — 계획의 규칙).
3. **여러 줄 통문장.** 원본은 줄 수와 무관하게 밑줄 하나다. 제품은 7mm 줄이 둘 이상 들어가는 높이부터 7mm 줄을 긋는다(조율 담당 결정). U01 열두 행은 전부 밑줄 하나다.
4. **수식 판.** katex 판이 다르다. U01 의 분수 행은 0.000mm 로 맞았고, 다른 수식 구조는 재지 않았다.
5. **글줄 위치.** 상자만 견줬다. 기준 파일의 글 범위(`textRangeBoxMm`)는 견주지 않았다.
6. **쪽 안의 위치.** 블록 안의 상대 위치만 쟀다. 쪽 위에서의 위치 · 블록 사이 간격 · 지시 줄 · 쪽 머리는 조판 소관이다.
7. **범위.** U01 한 단원의 열두 행 × 세 쪽이다. 여러 줄로 넘어가는 원본 행은 원본 자료에서 재지 못했다(합성 행으로만).
8. 원본 출처가 붙은 용어 암기 · 오류 점검 블록의 수식은 display style 로 바꾸지 않았다(이번 범위 밖).

## 12. 돌린 검사

| 검사 | 결과 |
| --- | --- |
| `textbookRecoverySourceMemory.test.ts` | 통과 17 / 17 (`3957be1bc`) |
| `textbookRecoverySourceMemory.integration.test.ts` — 실제 Chromium, 원본 기준 폴더 포함 | 통과 3 / 3 (`5f495a7cc`. 그 뒤 바뀐 것은 단위 검사의 픽스처 한 칸뿐) |
| 위 둘 + `textbookRecoveryContentRender.test.ts` · 그 Chromium 검사 · `textbookRecoveryDialogueRender.test.ts` | 다섯 파일 통과 64 · 건너뜀 1 (`f6c7c01e4` 의 내용) |
| `textbookRecoveryWriter.test.ts` | 통과 31 / 31 (`f6c7c01e4` 의 내용) |
| `tsc --noEmit` 저장소 전체, 8GB | 오류 0 (`3957be1bc` 의 내용). 그 앞 실행이 새 검사 파일의 오류 1건을 찾았고 고쳤다 |
| ESLint · Prettier(바꾼 파일) | 오류 0 |
| 교재 검사 전체(`src/__tests__/unit/textbook*` · `api/textbook*`, Chromium 포함) | **끝내지 못했다.** 백그라운드 실행이 시스템 메모리 부족으로 중단됐다. 결과가 없고, 다시 돌리지 않았다 |
| 얼린 추출 증명 | 이번에는 돌리지 않았다. 다시 얼리지 않았다 |

전체 묶음이 없으므로 **`a246dd1cd` 병합 뒤의 `textbookQuickCreate.test.ts` · API 통합 검사 · 조율 담당의 Chromium 검사는 이 작업에서 확인되지 않았다.**

## 13. 한계

- 원본 대조 검사는 저장소 밖 기준 폴더가 있어야 돈다(`TEXTBOOK_RECOVERY_REFERENCE_DIR`). 없으면 건너뛴다 — CI 에서는 합성 행 검사만 돈다.
- 여기 측정은 블록을 179mm 폭 틀에 놓고 잰 것이다. 조율 담당의 실제 쪽 조판을 거친 PDF 는 재지 않았다.
- 공통 높이는 내가 탐침에서 뽑아 넣었다. 조율 담당의 측정 함수(`measureRecoveryDom`)가 고르는 값으로는 돌려 보지 않았다 — 그 변경은 아직 받지 못했다.
- 중단된 전체 묶음 실행은 내 작업 폴더의 검사 프로세스(3.6GB)와 그 자식을 남겼다. 그것만 종료했고, 그 실행이 저장소에 만든 합성 산출물 폴더 `output/` 을 지웠다.
- 실물 인쇄는 하지 않았다.
