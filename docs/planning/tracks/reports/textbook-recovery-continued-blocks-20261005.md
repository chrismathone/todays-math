# 교재 복구 — 이어지는 블록의 «계속» 표시와 조판 확인 도우미

작성일: 2026-10-05. 대상: 조율 담당 커밋 `e91d198b3` 위. 앞 보고: [원본 암기 지면의 행 기하](textbook-recovery-source-memory-20261005.md).

내가 바꾼 파일: `render/blocks/concept.ts` · `render/blocks/recall.ts` · `render/blocks/contentCss.ts` · `textbookQuickCreate.test.ts`(도우미와 그 검사) · `textbookRecoveryContentRender.test.ts`(단정 하나) · 새 `textbookRecoveryContinuedBlocks.test.ts` · 새 `textbookRecoveryContinuedBlocks.integration.test.ts` · 이 문서. 모델 · 조판 · 측정 · `html.ts` · 서버 · 계약은 건드리지 않았다. 원문 · 해시 · TeX · ID 수정, 얼린 기준선 재동결, 운영 DB 쓰기 · 푸시 · 배포는 없다.

## 1. 커밋

| 커밋 | 내용 |
| --- | --- |
| `430b080df` | `e91d198b3` 병합 — 충돌 없음, 원본 암기 지면 작업 그대로 |
| `4eb2a79c9` | «계속» 표시 둘 · 조판 확인 도우미 · 단위 검사 |
| `f2f032f23` | 실제 Chromium 검사 |

## 2. 이어지는 개념 조각

모델은 한 차시의 개념을 여러 블록으로 나누고 둘째 블록부터 `continuation` 을 켠다(`….part-1` · `….part-2`). 지금까지 그 블록은 **제목 없이** 찍혔다 — 검수에서 나온 초3 12쪽(초4 · 초5 도 같은 꼴)의 이름 없는 개념 카드가 이것이다.

- `block.continuation` 이면 제목 `h3` 대신 `<div class="tb-concept-continuation" data-continuation data-anchor="concept-continuation">제목<small>계속</small></div>` 를 찍는다.
- 제목은 **그 블록의 원래 제목 그대로**다: 개념 노드가 있으면 그 개념의 이름, 저장 본문이면 저장된 제목, 원본 조각이면 블록 제목. 글자를 바꾸지 않고 이스케이프만 한다.
- 번호 칩은 찍지 않는다.
- 이어지지 않는 블록은 한 글자도 달라지지 않았다(제목 · 번호 칩 · 원본 조각의 기하).
- 스타일: 7.5pt · 줄 높이 1.5 · 아래 여백 1.5mm, «계속»은 6.5pt 옅은 색. 셈으로 약 5.5mm 가 블록 높이에 더해진다(재지 않은 값).

## 3. 이어지는 은행 암기 블록

은행에서 쓴 암기 블록(`rows` 노드)은 개념 이름이 없고, 이어지는 블록은 지시 줄도 없다. 모델이 주는 `memoryContinuationTitle`(소단원 제목)을 이미 잡아 둔 줄에 찍는다.

- 조건: `rows` 노드 · `semantic.source` 없음 · `block.continuation` 또는 `semantic.continuation`.
- 자리: `header.tb-memory-title.tb-memory-title-bare` 안에 `<span class="tb-memory-continuation" data-continuation><span class="tb-memory-continuation-title">제목</span><small>계속</small></span>`. 개념학습 · 빈칸 · 통문장 **세 단계 모두**. 개념학습은 그 옆에 1~4회 표시를 그대로 둔다.
- 제목이 없으면 «계속»만 찍는다.
- 크기: 8pt · 줄 높이 1.5 — 7mm 줄을 키우지 않는다. 제목은 한 줄로 두고 넘치면 줄임표로 자른다.
- **바뀌지 않는 것**: 원본에서 옮긴 암기 지면(`semantic.source`) · 자기 개념 제목이 있는 은행 블록(`concept` 노드) · 이어지지 않는 블록. 앞의 둘은 `memoryContinuationTitle` 이 있든 없든 HTML 이 글자까지 같다(검사가 문자열로 견준다).

실제 Chromium(제품 글꼴): 이어지는 줄의 높이는 빈 줄(7mm)과 0.05mm 안에서 같고, 긴 제목도 줄을 키우지 않는다. «계속»은 줄 안에 온전히 있고 1~4회 표시와 겹치지 않는다. 세 단계에서 줄과 행의 위치가 0.05mm 안에서 같다.

## 4. 조판 확인 도우미 (`textbookQuickCreate.test.ts`)

병합 뒤 3건이 실패했다. 조판이 단원 도입을 «왼쪽+오른쪽» 또는 «한 쪽» 가운데 하나로 놓는데, 옛 도우미는 세 대안을 **전부** 놓으라고 요구했고 경고를 하나도 허용하지 않았다.

`paginationFaults(model, layout, measurements)` 가 빈 목록이어야 한다:

| 규칙 | 어기면 |
| --- | --- |
| 도입 대안이 아닌 블록은 정확히 한 번 | 빠짐 · 두 번 · 모르는 블록 — 모두 보고 |
| 구획 제목만 다른 쪽에 다시 놓일 수 있다 | 같은 쪽에 두 번이면 보고 |
| 도입은 정확히 «왼쪽+오른쪽»(왼쪽이 짝수 쪽, 오른쪽이 그다음 쪽) 또는 정확히 «한 쪽» | 셋 다 · 반쪽 · 없음 · 홀수 쪽에서 시작하는 펼침 — 모두 보고 |
| «한 쪽»에는 그 쪽을 가리키는 `AUTO_INTRO_SINGLE_PAGE` 경고가 정확히 하나 | 없음 · 펼침인데 경고 · 다른 구획을 가리킴 — 모두 보고 |
| 그 경고에는 실제 까닭이 있다: 홀수 시작 쪽, 또는 준 측정값으로 펼침이 안 들어감 | 짝수 쪽인데 펼침이 들어가면 보고 · 적힌 까닭이 실제와 다르면 보고 |
| 그 밖의 문제는 하나도 없다 | 어떤 코드든 보고 |

도우미 자체의 검사 여섯: 실제 조판 결과를 손으로 어그러뜨려 위 자리마다 보고가 나오는지, 그리고 정상인 세 경우(짝수 시작의 펼침 · 홀수 시작의 한 쪽 · 측정 높이로 인한 한 쪽)가 빈 목록인지 본다. 지금 60 / 60.

## 5. 변이 검사

코드를 일부러 깨뜨려 봤다(커밋하지 않고 되돌림). **열네 가지 전부 빨개졌다.** 기록은 저장소 밖 `C:/Users/user/Downloads/교재_복구_실행검증_20261005/continued-blocks-evidence-f2f032f23/continued-blocks-mutations.json` 에 있다(검사 이름만 들어 있다).

| 깨뜨린 것 | 빨개진 검사 |
| --- | --- |
| 이어지는 개념 조각에 표시 없음(옛 동작) | 5 |
| 이어지지 않는 조각에 표시 | 9 |
| 원본 암기 지면에도 표시 | 1 |
| 이어지지 않는 은행 블록에도 표시 | 2 |
| 개념학습 지면에만 표시 | 3 |
| 제목을 이스케이프하지 않음 | 1 |
| 표시를 제목 크기로(줄이 커짐) | 1 |
| 제목이 줄바꿈될 수 있음 | 1 |
| 도우미: 어떤 블록이든 두 번 허용 | 1 |
| 도우미: 빠진 블록 허용 | 1 |
| 도우미: 도입 대안의 아무 조합 허용 | 1 |
| 도우미: «한 쪽»에 까닭이 필요 없음 | 1 |
| 도우미: 적힌 까닭을 보지 않음 | 1 |
| 도우미: 무관한 문제 허용 | 1 |

## 6. 돌린 검사 (`f2f032f23`)

| 검사 | 결과 |
| --- | --- |
| `textbookQuickCreate.test.ts` | 통과 60 / 60 (병합 직후 3건 실패) |
| `textbookRecoveryContinuedBlocks.test.ts` | 통과 15 / 15 |
| `textbookRecoveryContinuedBlocks.integration.test.ts` — 실제 Chromium | 통과 2 / 2 |
| `textbookRecoveryContentRender.test.ts` | 통과 29 / 29 |
| `textbookRecoverySourceMemory.test.ts` | 통과 17 / 17 |
| 좁은 `tsc` — 대상 여덟 파일과 그것이 끌어오는 프로젝트 파일(모두 147개) | 오류 0 |
| ESLint · Prettier(바꾼 파일) | 오류 0 |

## 7. 한계 — 정확히

- **돌리지 않은 것**: 교재 검사 전체 · 저장소 전체 `tsc` · API 통합 검사 · 조율 담당의 Chromium 검사 · 원본 암기 지면의 Chromium 대조(`textbookRecoverySourceMemory.integration.test.ts`) · 얼린 추출 증명. 메모리 경합을 피하라는 지시대로 좁은 검사만 했다.
- 좁은 `tsc` 는 `tsconfig.json` 을 물려받고 대상만 좁힌 임시 설정으로 돌렸다(설정 파일은 지웠다). 저장소 전체의 타입 일관성은 보지 않았다.
- 이어지는 개념 조각의 높이 증가(약 5.5mm)는 셈이다. 실제 쪽 조판에서 12쪽이 어떻게 달라지는지는 조율 담당의 측정과 조판을 거쳐야 알 수 있다 — 보지 않았다.
- 모델은 개념 조각마다 번호를 하나씩 올린다. 이어지는 조각에는 번호 칩을 찍지 않으므로 지면의 번호는 건너뛰어 보일 수 있다(코드 읽기로만 확인).
- 은행 블록의 «계속» 제목은 **소단원 제목**이다 — 모델이 그 값을 준다. 블록마다 다른 개념 이름을 찍지는 않는다.
- 도우미의 조판은 블록 높이를 고정값(제목 16mm · 그 밖 75mm)으로 준다. 어떤 블록이 놓이는지만 보고 **지면 기하는 증명하지 않는다**. «측정 높이» 까닭은 왼쪽 도입에 300mm 를 줘서 만든 경우 하나로 봤다.
- 도우미는 펼침이 들어가는지 스스로 판정하려고 조판의 높이 한도 254mm 를 따로 적었고(폭 허용값은 조판의 `A4.toleranceMm` 를 쓴다), 적힌 까닭은 경고 문구의 «홀수 시작 쪽»으로 가른다. 조판에서 그 한도나 문구를 바꾸면 도우미도 고쳐야 한다.
- 실물 인쇄는 하지 않았다.
