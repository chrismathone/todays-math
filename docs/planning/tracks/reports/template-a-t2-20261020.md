# 템플릿 A · T2 제품 구현 — 2026-10-20

## 커밋 · 바꾼 파일

H2 회귀 수정·전체 검사 보고를 먼저 마친 뒤 시작했다([H2 보고](h2-regression-20261020.md)). 지시서 보존 `7720195e8`, T2 제품 연결 `28db96bde`, 제목의 문항 수 중복 방지 `a77cdf20f`. 최종 검증·보고 커밋은 이 파일의 Git 이력에서 확인한다. push하지 않았다.

- 여섯 `*Template.tsx`: A의 각 원형과 T2 머리·번호·쓰기 공간 연결. 워크북은 1단 내장 풀이를 40% 문항/오른쪽 풀이로, 자습은 1단 내장 모눈을 문항 아래 85px로 옮겼다. 모던 본문의 장식용 왼쪽 들여쓰기를 걷었다.
- `PrintHeader.tsx`, `T2PrintHeader.tsx`, `T2PrintHeader.module.css`: 첫 쪽의 남색 윗선·정보표·안내/개념/전략 상자. 기존 문항 제목·메타를 사용하며 시안의 표본 문장을 제품에 복사하지 않는다.
- `LegacyPrintHeader.tsx`: 기존 C2 머리를 그대로 보존해 시안에 없는 이어지는 쪽에서 사용한다. 회차 표시의 부모 구조도 기존 CSS/DOM으로 유지했다.
- `templates/ProblemMeta.tsx`: 흰 바탕, 1.5px 테두리, 25px 번호, 12px 글자와 4px 모서리. 기본 남색과 기존 색상 선택의 가독성 보정은 유지한다.
- `templateFields.ts`: 모던 안내에 **이미 존재하는** `PrintMeta.todayGoal`을 연결했다. 새 저장 필드·옵션·프리셋 키·schema를 추가하지 않았다. 입력하지 않은 정보는 종전처럼 출력하지 않는다.
- `items.ts`, `PrintCheck.test.tsx`: 묶음 실물 검수 대기 항목 추가, 총 항목 수 **142**. 앞선 H2·스마트 여백 항목을 유지했다.
- 시험: `TemplateT2`, `PrintColorImplementation`, `mathgenTemplates`, `PrintCheck`. QA: `scripts/qa/print-templates/{t2.html,t2-production.tsx,t2-specimen.ts,measure-template-t2.mjs}`.

`pack.ts`·`settings.ts`·`BodyContainer.tsx`·`geometry.ts`·`useMeasuredPages.tsx`의 여백/패킹 로직과 `PrintOptions` 꼴은 바꾸지 않았다. 여섯 저장 키도 그대로다. 수식·분수·보기·그림은 기존 `ProblemBody`와 그 문항 렌더러를 그대로 지나며 미리보기·인쇄·PDF·HWPX 수집에 별도 양식 DOM을 만들지 않았다.

## 시험

양식별 RTL을 먼저 작성하고 현재 제품에서 **4 통과 / 8 실패**를 확인한 뒤 연결했다. 13파일의 양식·색상·입력값 보존·연산 회차·영어 어댑터·미리보기·스마트 여백·프리셋·검수 목록 시험 **104/104 통과**. 그 뒤 빈 학교 정보·개념 상자와 직접 쓴 제목의 문항 수 중복 경계를 보강해 `TemplateT2` **14/14 통과**(앞의 12개와 중복, 합계 고유 시험 **106개**).

기존 main 빨강을 다룬 까닭:

- `JeongtongHeader`: 학교 정보를 실제 `table`로 구성했으므로 원래 시험을 변경하지 않고 통과했다. 제목·학교명·학년·과목·학기·날짜·출제자·시간은 한 번씩 출력한다.
- `mathgenTemplates`의 workbook/jaseup/yuhyung 3개: 모든 양식에 학교명·시험일을 무조건 요구하던 기대가 현재 출력 필드 계약과 달랐다. 학교명을 숨기는 양식에서는 숨김을 검증하고, 시험일도 활성 양식에서만 요구하도록 바로잡았다. 문항 crop 보존 검사는 유지했다. 출력 필드 계약은 별도 색상 시험의 독립 기대 목록으로 검사한다.
- 현대형 안내에 기존 목표 필드를 쓰는 T2 결정만 색상/입력 패널 시험의 기대 목록에 명시했다. 이전 C2 시안 fixture는 역사 자료로 유지했다.

시험 원자료: [수정 전·회귀·경계 시험과 고유 106개 집계](template-a-t2-20261020/tests.json). H2 단계에서 main에 재현한 연산 도형 `problemAt` 기대 실패와 API 오류 기록 기대·로컬 Prisma 환경 실패는 이번에 수정하지 않았다.

전체 `npm run type-check`는 다른 tsc **0개**, 가용 메모리 **4.86GiB**를 확인한 뒤 이 단계 끝에 **1회** 실행했다. exit 2, **485파일 2,944진단**으로 실패했다. `Prisma.ProblemWhereInput`·`PrismaClientKnownRequestError` 등 생성 타입 누락과 관련 진단이 포함된다. **T2 변경 파일·새 TS 측정 도구의 진단은 0**이다. 전체 타입 검사 통과를 주장하지 않으며 install·Prisma 생성·전체 재실행으로 환경을 바꾸지 않았다. [집계](template-a-t2-20261020/type-check-summary.json) / [원문](template-a-t2-20261020/type-check.txt).

## 25문항 쪽 수 비교

동일한 자체 작성 25문항(분수·객관식·문장제·SVG 도형·짧고 긴 발문 혼합), 같은 메타·시스템 글꼴 옵션·보통 여백·스마트 여백 18, 2단 구분선 켬. `showAnswers=false`인 **문제지** 쪽 수다. 변경 전과 후 모두 같은 실제 WorksheetPrint를 사용했다.

| 양식 | 1단 전→후 | 2단 전→후 | 첫 머리 높이(px) 전→후 |
|---|---:|---:|---:|
| 평가원 | 5 → 5 | 3 → 3 | 157.78 → 174.00 |
| 정통 | 5 → 5 | 3 → 3 | 210.17 → 281.38 |
| 모던 | 6 → 6 | 3 → 3 | 230.97 → 227.59 |
| 워크북 | 7 → 7 | 3 → 3 | 267.17 → 227.19 |
| 자습 | **7 → 8** | 4 → 4 | 245.36 → 223.09 |
| 유형 | 5 → 5 | 3 → 3 | 192.38 → 231.19 |

자습 1단은 모눈을 문항 옆에서 **아래**로 옮겨 세로 높이가 늘어난 결과다. 모눈을 잘라 쪽 수를 맞추지 않았다. 실제 측정 노드와 페이지가 같은 renderItem을 사용하므로 새 머리 높이와 쓰기 공간을 실측해 기존 스마트 패커에 전달한다.

최종 12조합에서 번호 1~25의 누락·중복·역순 **0**, 문항·수식의 가로 넘침·본문 쪽 이탈 **0**. 변경 전 12조합도 넘침 0이었다. 첫 쪽 머리 높이·본문 가용 높이·전 쪽의 문항 수와 제품 소스 지문은 [변경 전](template-a-t2-20261020/before/measurements.json) / [변경 후](template-a-t2-20261020/after/measurements.json)에 기록했다. Windows Chromium의 LCD 가장자리 색이 비교를 방해하지 않도록 두 시점 모두 `--disable-lcd-text`로 캡처했다. 제품 설정을 바꾼 것은 아니다.

이는 해당 표본과 옵션의 Chromium 실측이다. 모든 원문 문항·글꼴·메타 길이, 서버 PDF 글꼴 환경과 HWPX native 재조판, 실물 프린터 통과를 뜻하지 않는다.

## 캡처

첫 쪽 비교판 [1단](template-a-t2-20261020/overview-first-1col.png) / [2단](template-a-t2-20261020/overview-first-2col.png), 마지막 쪽 비교판 [1단](template-a-t2-20261020/overview-last-1col.png) / [2단](template-a-t2-20261020/overview-last-2col.png).

전체 48 PNG의 잉크 픽셀을 검사해 빈 캡처가 없음을 확인하고 비교판·대표 원본 크기를 눈으로 검토했다([이미지 검사](template-a-t2-20261020/image-checks.json)). 평가원은 사용자가 쓴 제목에 문항 수를 덧붙이지 않아 중복 표기를 방지했다.

| 양식 | 1단 전 | 1단 후 | 2단 전 | 2단 후 |
|---|---|---|---|---|
| 평가원 | [첫](template-a-t2-20261020/before/pyeongga-1col-first.png) · [끝](template-a-t2-20261020/before/pyeongga-1col-last.png) | [첫](template-a-t2-20261020/after/pyeongga-1col-first.png) · [끝](template-a-t2-20261020/after/pyeongga-1col-last.png) | [첫](template-a-t2-20261020/before/pyeongga-2col-first.png) · [끝](template-a-t2-20261020/before/pyeongga-2col-last.png) | [첫](template-a-t2-20261020/after/pyeongga-2col-first.png) · [끝](template-a-t2-20261020/after/pyeongga-2col-last.png) |
| 정통 | [첫](template-a-t2-20261020/before/jeongtong-1col-first.png) · [끝](template-a-t2-20261020/before/jeongtong-1col-last.png) | [첫](template-a-t2-20261020/after/jeongtong-1col-first.png) · [끝](template-a-t2-20261020/after/jeongtong-1col-last.png) | [첫](template-a-t2-20261020/before/jeongtong-2col-first.png) · [끝](template-a-t2-20261020/before/jeongtong-2col-last.png) | [첫](template-a-t2-20261020/after/jeongtong-2col-first.png) · [끝](template-a-t2-20261020/after/jeongtong-2col-last.png) |
| 모던 | [첫](template-a-t2-20261020/before/modern-1col-first.png) · [끝](template-a-t2-20261020/before/modern-1col-last.png) | [첫](template-a-t2-20261020/after/modern-1col-first.png) · [끝](template-a-t2-20261020/after/modern-1col-last.png) | [첫](template-a-t2-20261020/before/modern-2col-first.png) · [끝](template-a-t2-20261020/before/modern-2col-last.png) | [첫](template-a-t2-20261020/after/modern-2col-first.png) · [끝](template-a-t2-20261020/after/modern-2col-last.png) |
| 워크북 | [첫](template-a-t2-20261020/before/workbook-1col-first.png) · [끝](template-a-t2-20261020/before/workbook-1col-last.png) | [첫](template-a-t2-20261020/after/workbook-1col-first.png) · [끝](template-a-t2-20261020/after/workbook-1col-last.png) | [첫](template-a-t2-20261020/before/workbook-2col-first.png) · [끝](template-a-t2-20261020/before/workbook-2col-last.png) | [첫](template-a-t2-20261020/after/workbook-2col-first.png) · [끝](template-a-t2-20261020/after/workbook-2col-last.png) |
| 자습 | [첫](template-a-t2-20261020/before/jaseup-1col-first.png) · [끝](template-a-t2-20261020/before/jaseup-1col-last.png) | [첫](template-a-t2-20261020/after/jaseup-1col-first.png) · [끝](template-a-t2-20261020/after/jaseup-1col-last.png) | [첫](template-a-t2-20261020/before/jaseup-2col-first.png) · [끝](template-a-t2-20261020/before/jaseup-2col-last.png) | [첫](template-a-t2-20261020/after/jaseup-2col-first.png) · [끝](template-a-t2-20261020/after/jaseup-2col-last.png) |
| 유형 | [첫](template-a-t2-20261020/before/yuhyung-1col-first.png) · [끝](template-a-t2-20261020/before/yuhyung-1col-last.png) | [첫](template-a-t2-20261020/after/yuhyung-1col-first.png) · [끝](template-a-t2-20261020/after/yuhyung-1col-last.png) | [첫](template-a-t2-20261020/before/yuhyung-2col-first.png) · [끝](template-a-t2-20261020/before/yuhyung-2col-last.png) | [첫](template-a-t2-20261020/after/yuhyung-2col-first.png) · [끝](template-a-t2-20261020/after/yuhyung-2col-last.png) |

## /dev/print-check

**시험지 여섯 양식 A · T2 머리·번호·풀이 공간**, id `template-a-t2-20261020`, 상태 **대기**. 여섯 양식의 1·2단, 짧고 긴 25문항, 첫 쪽·마지막 쪽, 번호·수식·도형·쓰기 공간과 스마트 여백을 실물에서 대조한다. 완료로 표시하지 않았다.

## 원장님께 물을 것 — 그동안 현재 동작 유지

1. **이어지는 쪽 머리:** 일반 시험지는 종전처럼 두 번째 쪽부터 머리를 생략하고, 연산은 기존 C2의 회차 머리를 유지했다. 다음 쪽에도 T2 머리를 반복할지, 더 작은 T2 머리가 필요한지 확인이 필요하다.
2. **학교 정보가 비었을 때:** 입력하지 않은 값은 기존처럼 생략한다. 빈 칸도 고정 정보표와 필기선으로 남길지 확인이 필요하다. 임의 학교·날짜·대시 값을 채워 넣지 않았다.
3. **자습 개념이 비었을 때:** 기존처럼 개념 상자 자체를 생략한다. 빈 개념 필기 상자를 남길지 확인이 필요하다.
4. **2단/별도 풀이 공간:** Hi-fi의 워크북·자습 내장 쓰기는 1단 표본이었다. 2단이나 별도 `풀이 공간`을 고르면 기존 우선순위를 유지했다(내장 오른쪽 풀이·모눈은 1단이며 별도 풀이 공간이 꺼졌을 때). 2단에도 내장 쓰기를 넣을지, 기존 칸을 어떻게 나눌지 확인이 필요하다.
5. **권장 단 수와 기존 부가 정보:** 평가원 2단·모던 1단은 선택 가능한 설정으로 측정했으며 사용자의 기존 단 수를 강제로 바꾸지 않았다. 양식 선택 시 권장 단 수로 바꿀지, 시안에 없던 기존 교시·워크북 유형/전략 정보·개별 푸터를 간소화할지도 확인이 필요하다. 그 값과 동작은 유지했다.

## 재현·메모리

`node scripts/qa/print-templates/measure-template-t2.mjs before|after`는 실제 WorksheetPrint의 12조합을 차례로 실행하고 Vite·Chromium을 `finally`에서 닫는다. 변경 전 소스에서 before를, 변경 후 소스에서 after를 실행한다. 시험과 Vite·Chromium은 3GiB 이상일 때 하나씩 실행했다. install·Prisma 생성·새 작업트리·하위 작업자를 사용하지 않았다.
