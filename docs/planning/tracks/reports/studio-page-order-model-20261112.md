# 쪽 순서 순수 모델 · 자동 제외 판정 — 2026-11-12

담당 범위: `studioPageOrder.ts`, `studioPageAnalysis.ts`, 각각의 단위 시험, 이 보고서. 지시서와 루트 `CLAUDE.md` 절대 규칙, 로컬 Next Vitest 가이드를 읽고 진행했다. coordinator의 `msg_08086c40862b` 지시에 따라 공유 작업트리에서 담당 파일만 수정하고 **개별 커밋하지 않았다**. 최종 커밋은 coordinator 담당이다.

## 구현과 경계

- 원본 신분은 `studioPageKey({sourceId,page})`로 유지한다. 초기 차례, 복원 시 중복·알 수 없는 쪽 제거, 빠진 쪽·추가 파일 뒤에 붙이기, 파일 사이 이동, 제외·복구, 활성 쪽만의 새 번호, 여러 단계 되돌리기를 제공한다.
- 이전/다음은 활성 쪽 한 장을 건너 옮기며 맨 앞/뒤도 활성 쪽의 끝을 기준으로 한다. 제외된 쪽은 배열에 남는다. 끌기 `{before:key}`는 제외된 쪽도 목표로 삼고 `{before:null}`은 실제 배열 끝에 놓는다. 이동·제외 함수는 입력을 바꾸지 않고, history는 스냅숏을 저장하며 값이 같은 변경은 기록하지 않는다.
- RGBA는 흰색 위에 합성한 뒤 어느 색 채널이든 **252 미만**인 픽셀 비율을 센다. 누락·불완전 raster는 `NaN`으로 알려 빈 쪽 근거로 삼지 않는다.
- 빈 쪽은 **추출 글이 없고 `0 <= inkRatio < 0.000001`**일 때만 판정한다. 100만 픽셀 중 한 픽셀의 잉크도 경계에서 보존하는 의도적으로 엄격한 초깃값이다. 252~255의 거의 흰 배경은 무시한다. 이 수치는 실제 PDF로 보정한 값이 아니며, 극도로 옅은 획이나 문턱보다 작은 획까지 보존한다고 주장하지 않는다.
- 표지는 명시적인 표지 제목과 제한된 신상·시험 정보만 있는 경우다. 정답표는 명시적인 제목, 연속된 번호/답 두 쌍 이상, 본문 전체가 표 형식인 경우다. 번호가 있는 정답표도 판정하지만, 발문·수식·알 수 없는 본문은 보존한다. 공백·줄바꿈·전각 문자를 정리해 검사한다.
- 텍스트 없는 스캔은 빈 쪽만 판정한다. 그림만으로 표지·정답표를 추측하지 않는다. 실제 시연 PDF와 다른 실물의 렌더·잉크 측정은 coordinator 담당이며 이 작업에서는 시행하지 않았다.

## 실제 실행 근거

| 단계                     | 정확한 명령                                                                                                                                                                                            | 결과                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| RED · 구현 파일 생성 전  | `npx vitest run src/__tests__/unit/studioPageOrder.test.ts src/__tests__/unit/studioPageAnalysis.test.ts --maxWorkers=3`                                                                               | exit 1, 두 모듈 import 해석 실패, 2 suites failed / 0 tests. 이 시점에는 단언이 실행되지 않았다. |
| GREEN · 구현 후          | 위와 같은 명령                                                                                                                                                                                         | exit 0, 2 files / 67 tests passed                                                                |
| 포맷 정리 후 호출자 포함 | `npx vitest run src/__tests__/unit/studioPageOrder.test.ts src/__tests__/unit/studioPageAnalysis.test.ts src/__tests__/unit/studioPagePreview.test.ts --maxWorkers=3`                                  | exit 0, 3 files / 69 tests passed                                                                |
| ESLint                   | `npx eslint src/components/unified/studioPageOrder.ts src/components/unified/studioPageAnalysis.ts src/__tests__/unit/studioPageOrder.test.ts src/__tests__/unit/studioPageAnalysis.test.ts`           | exit 0                                                                                           |
| Prettier                 | `npx prettier --check src/components/unified/studioPageOrder.ts src/components/unified/studioPageAnalysis.ts src/__tests__/unit/studioPageOrder.test.ts src/__tests__/unit/studioPageAnalysis.test.ts` | 첫 실행 exit 1(4파일 포맷), 같은 파일들에 `--write` 적용 후 재실행 exit 0                        |
| 전체 타입 검사           | `npm run type-check -- --incremental false`                                                                                                                                                            | exit 2, 동시 구현 중인 외부 파일의 문제. 아래 기재.                                              |
| 담당 4파일 타입 검사     | `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --project /tmp/studio-page-order-model-20261112.tsconfig.json`                                                                | exit 0                                                                                           |

범위 한정 타입 검사 설정은 저장소 `tsconfig.json`을 절대경로로 extends하고 `compilerOptions.incremental=false`, `include=위 담당 TS 4파일의 절대경로`, `exclude=[]`로 만든 임시 파일이다. 공유 증분 캐시는 쓰지 않았다.

전체 타입 검사의 당시 오류는 `StudioPageOrder` UI import와 `studioPageOrder.ts`의 대소문자 충돌(TS1149·기본 내보내기 없음), 이에 따른 UI 콜백 추론, `studioPagePreview.ts`의 `TextMarkedContent` 타입, `WorksheetEditor.tsx`의 `order` 단계 누락이었다. coordinator에 `msg_d8ce73fa1888`로 전달했다. 담당 파일 밖은 수정하지 않았다. 전체 시험·최종 타입 및 affordance 관문은 coordinator의 통합 검증에 남긴다.

## 합성 입력 판정 — 실물 PDF 측정값 아님

| 단위 시험 입력                                 | 측정/주어진 비율 | 판정   |
| ---------------------------------------------- | ---------------: | ------ |
| 흰 raster, 글 없음                             |                0 | 빈 쪽  |
| RGBA 254 배경 10,000픽셀 중 RGBA 245의 한 픽셀 |           0.0001 | 보존   |
| 글 없는 스캔의 주어진 잉크 비율                |             0.03 | 보존   |
| 경계값, 글 없음                                |         0.000001 | 보존   |
| `수학 문제지` + `01 다음 식을 계산하시오.`     |             0.02 | 보존   |
| `정답` + `1. ③` + `2. ⑤`                       |             0.02 | 정답표 |
| `정답` + 번호가 있는 실제 발문·수식            |             0.02 | 보존   |

공유 DB·운영 빌드·브라우저·환경 파일 복사·push·병합은 실행하지 않았다. 실제 시연 PDF의 정답 대조표와 최종 커밋 hash는 coordinator의 통합 보고에서 채워야 한다.

## 추가 요청 · 저장본 손상 방어 (`msg_6b5218619b0f`)

`reconcilePageOrder`는 런타임에 배열이 아닌 저장값이면 처음 차례를 사용한다. null·원시값·중첩 배열·잘못된 신분 항목을 건너뛰고, 알려진 쪽의 `out`은 정확히 boolean `true`일 때만 제외한다. 잘못된 `autoOut`과 알 수 없는 칸은 버리며, 유효한 boolean 제외·복구 상태와 세 가지 자동 사유, 쪽 차례는 유지한다. 자동 사유만으로 제외를 유추하지 않으며 첫 알려진 신분이 중복보다 우선한다. 입력은 바꾸지 않는다.

- RED: `npx vitest run src/__tests__/unit/studioPageOrder.test.ts --maxWorkers=3` → exit 1, **22 failed / 20 passed (42)**. 잘못된 배열·null 항목의 예외, 비boolean 제외와 잘못된 사유 유지가 실제로 재현됐다.
- GREEN: `npx vitest run src/__tests__/unit/studioPageOrder.test.ts src/__tests__/unit/studioPageAnalysis.test.ts src/__tests__/unit/studioPagePreview.test.ts --maxWorkers=3` → exit 0, **3 files / 93 tests passed**(모델·판정만 91개).
- 위 표와 같은 담당 4파일 ESLint 및 범위 한정 TypeScript 명령도 다시 exit 0이다. 전체 검증은 coordinator 담당으로 유지했다.
- 번호가 있는 정답표는 여전히 **명시적인 제목 + 두 쌍 이상의 연속 번호/답 + 본문 전체 표 형식**에서만 판정한다. 번호 있는 실제 발문·수식·알 수 없는 본문 보존 시험을 그대로 통과했다.
- 문턱의 구체적인 뜻: **728×1031 = 750,568픽셀**에서는 한 잉크 픽셀이 약 `0.0000013323`이므로 `inkRatio < 0.000001`은 실질적으로 **잉크 0픽셀만** 빈 쪽으로 분류한다. 이는 문턱의 산술적 설명이며 실물 렌더 측정 결과가 아니다. 실제 `renderStudioPagePreview` 측정은 coordinator가 수행한다.

최종 통합에서 제품 렌더 함수로 실제 시연 8쪽과 합성 6쪽을 측정했다. 문턱은 유지했으며 결과·제약은 [통합 기록](studio-page-order-20261112/README.md#실제-pdf-측정)에 있다.
