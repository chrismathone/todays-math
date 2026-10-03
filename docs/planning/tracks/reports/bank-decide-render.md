# bank-decide-render — 보기 그림 조판 B1

2026-10-03 · 기준 커밋 `d1af62dc46c73922d6adfd845e2062e233f40e73` · 가지 `chrismathone/bank-decide-render`

구현/시험 커밋: `7a1556670` (`fix(print): place linked choice figures in numbered two-column cells`). 화면 증거와 이 보고서는 별도 묶음으로 커밋한다.

## 한 일

`ProblemContent`가 리드의 `planChoiceFigures`를 읽도록 했다. 짝을 아는 문항은 발문 그림만 원래 차례로 발문 아래에 남기고, 보기 그림은 해당 번호의 칸에 한 번씩 그린다. 격자는 창 폭과 `choiceLayout`에 관계없이 두 열이며 번호는 왼쪽 위에 붙는다. 보기 그림에는 통단용 `figureSourceMm` 인라인 폭을 쓰지 않고 칸 폭과 원본 비율을 적용한다. 글 보기는 그대로 남고, 칸마다 `print:break-inside-avoid`를 유지한다.

짝을 모르면 기존 경로를 그대로 쓴다. 빈 배열, 길이 불일치, 중복 번호, 범위 밖 번호, 비정수, 글 보기를 가리키는 연결, 그림을 못 받은 보기 모두 연결을 안 준 HTML과 동일하다. 실제 두 문항의 수정 전 HTML 해시도 회귀 시험으로 잠갔다.

높이 자 `estimateProblemPx`도 같은 계획을 읽는다. 발문 그림 높이와 두 열 보기의 행별 최대 높이를 더하며, 보기 이미지 높이는 칸 안쪽 폭과 이미지 비율로 계산한다. 혼합 문항의 긴 글 보기도 칸 폭으로 줄 수를 센다. `assessSeat`, `estimateProblemLines`, 시험지 자, 자동 출제의 좁은 칸 판정까지 연결 정보를 전달했다. 새 통단 전환이나 페이지 배치 규칙은 만들지 않았다.

배선은 일반 응답 계약/직렬화, 검수 계약/행 매퍼, 통합 조회, 문제 카드/발췌, 검수 콘솔, 통합 미리보기, 인쇄 매퍼/본문, 작업실 저장본, 해당 개발 미리보기까지 보완했다. 계약의 옛 응답 기본값은 `[]`이고 옛 호출자의 타입 호환을 위해 필드는 선택적이다. 옛 작업실 저장본은 부재 상태를 유지하면서 다시 열리고, 새 저장본의 연결은 보존된다.

실물 인쇄 목록에 `bank-choice-figures`를 `대기`로 추가했다. 다섯째 보기의 마지막 행, 발문 그림과의 간격, 쪽 넘김, 학생지/교사용을 확인하게 했고 항목 수 시험은 99에서 100으로 올렸다.

## 눈으로 재현한 결함과 수정 결과

원본 초안의 대구일중 3번과 신명여중 9번을 그대로 읽는 별도 Vite 하네스를 만들었다. 두 문항 모두 연결 배열은 `[1,2,3,4,5,0]`이다. Next 서버, `.env`, DB 없이 저장소의 원본 PNG를 로드했고, 수정 전에 Chromium 화면을 직접 확인한 뒤 수정 후 화면과 인쇄 미디어도 확인했다.

| 관찰                | 수정 전, 각 문항     | 수정 후, 각 문항   |
| ------------------- | -------------------- | ------------------ |
| 발문 아래 그림      | 번호 없는 여섯 장    | 발문 그림 한 장    |
| 보기 칸 안의 이미지 | 0장                  | 5장                |
| `[그림]` 자리표시자 | 5개                  | 0개                |
| 보기 그림 폭        | 발문 묶음의 개별 폭  | 다섯 장 모두 128px |
| 보기 배치           | 번호와 그림이 분리됨 | ①② / ③④ / ⑤        |

학생용 화면과 교사용 인쇄 미디어에서 같은 결과였다. 창 폭 375px에서도 두 열, 번호/이미지의 위쪽 정렬, 칸 안 수용, 원본 종횡비 유지가 브라우저 단언을 통과했다. 브라우저 `pageerror`는 0건이다. 이 하네스는 실제 `ProblemContent`와 공용 CSS로 만든 A4 검수 지면이며, 전체 제품 인쇄 흐름이나 실물 프린터 검수의 대체는 아니다.

- [수정 전 화면](bank-decide-render/before-screen.png) · [수정 후 화면](bank-decide-render/after-screen.png)
- [수정 전 인쇄 미디어](bank-decide-render/before-print.png) · [수정 후 인쇄 미디어](bank-decide-render/after-print.png)
- [수정 전 PDF](bank-decide-render/before-print.pdf) · [수정 후 PDF](bank-decide-render/after-print.pdf)
- [수정 전 측정값](bank-decide-render/before-measurements.json) · [수정 후 측정값](bank-decide-render/after-measurements.json)

재현 명령은 아래와 같다. 두 번째 명령은 Vite 서버가 실행 중인 상태에서 별도 터미널로 실행한다. `before` 산출은 실제 수정 전 코드에서 저장한 증거이므로 현재 코드로 덮어쓰지 않는다.

```powershell
npx vite --config e2e/body-typeset/vite.config.mts --port 4217
node e2e/body-typeset/choice-figures.capture.mjs after
```

전용 Playwright Chromium 및 `agent-browser` CLI가 없어 설치된 Chrome을 `channel: "chrome"`으로 실행했다. 패키지나 브라우저를 설치하지 않았다.

## 빨강 → 초록 → 되돌림 빨강

| 시험                              | 수정 전                  | 구현 후                     | 되돌림 검증                             |
| --------------------------------- | ------------------------ | --------------------------- | --------------------------------------- |
| `bankChoiceFigures.test.tsx`      | 16개 중 8개 실패         | 16개 통과                   | 렌더러에 연결을 넘기지 않으면 8개 실패  |
| `bankChoiceFigureRuler.test.ts`   | 9개 중 4개 실패          | 9개 통과                    | 자에 연결을 넘기지 않으면 4개 실패      |
| `bankChoiceFigureWiring.test.tsx` | 4개 중 3개 실패          | 4개 통과                    | 렌더러/인쇄 매퍼 연결을 끊으면 2개 실패 |
| `PrintCheck.test.tsx`             | 기대 100, 실제 99로 실패 | 새 검수 항목을 더한 뒤 통과 | 항목 수의 최초 빨강 확인                |

되돌림은 `ProblemContent`와 `estimateProblemPx`의 계획 입력을 `undefined`로, 인쇄 매퍼의 연결을 빈 배열로 바꿔 수행했다. 새 시험 29개 중 14개가 실패했고 모든 임시 되돌림을 복구했다. 복구 뒤 새 시험 29개는 다시 통과했다. 시험은 그림이 실제 번호 칸 안에 있는지, 발문에 중복으로 남지 않는지, 대응이 맞는지, 행/비율/긴 글에 따라 높이가 변하는지를 묻는다.

추가 관련 회귀에서 API 시험 27개가 `prismaTestDouble`의 `choiceFigureIndex` 누락으로 실패했다. 리드에게 소유 범위를 확인한 후 `src/mocks/prismaTestDouble.ts`의 행 타입, 기존 픽스처 기본값, 단건/대량 생성 입력 및 기본값만 9줄 추가했다. 리드 지시대로 이 파일의 LF를 유지하고 다른 줄은 수정하지 않았다. 운영 DB나 Prisma 스키마는 건드리지 않았다.

## 관문

- 최초 핵심 묶음: 15파일, 235개 통과.
- 복구 후 추가 관련 묶음: 16파일 중 13파일 통과, 총 286개 중 27개가 위 대역 누락으로 실패. 새 조판/자/배선 29개는 전부 통과.
- 대역 보완 후 API 3묶음 및 대역 시험: 4파일, 100개 통과. 위 묶음들의 중복을 제외하면 관련 29파일 495개가 모두 초록이다.
- `npm run type-check`: 조판 및 배선 구현 후 통과, 대역 보완 후에도 통과.
- 변경 파일 한정 ESLint: 오류 0, 기존 경고 2개. `review.contract.ts`의 `problemSchema`, `unifiedPreview.ts`의 `_count` 미사용은 기준 커밋에도 있어 그대로 남겼다.
- 수정한 소스/시험/하네스 44파일의 0x08/0x0C 제어 문자 검사 및 `git diff --check` 통과.
- 이름을 적은 파일에만 Prettier를 적용했다. 커밋 훅의 ESLint/Prettier/affordance 검사도 통과했고, 대역 파일은 LF이며 최종 diff는 해당 배선 9줄뿐이다.
- 전체 `npm run test`, 패키지 설치, Prisma 생성/마이그레이션, DB 접속은 하지 않았다. PNG와 그림 엔진 코드는 바꾸지 않아 그림 생성기 검사는 이 트랙의 변경 검증에 포함하지 않았다.

실행한 Vitest 묶음은 다음과 같다. 모든 명령에 `--maxWorkers=1`을 적용했다.

```powershell
npx vitest run src/__tests__/unit/bankChoiceFigures.test.tsx src/__tests__/unit/bankChoiceFigureRuler.test.ts src/__tests__/unit/bankChoiceFigureWiring.test.tsx src/__tests__/unit/choiceFigurePlan.test.ts src/__tests__/unit/choiceFigureIndex.test.ts src/__tests__/unit/choiceLayoutRender.test.tsx src/__tests__/unit/problemFigures.test.tsx src/__tests__/unit/printFigureHeight.test.ts src/__tests__/unit/printOverflow.test.ts src/__tests__/unit/printOverflowFigureSvg.test.ts src/__tests__/unit/examRuler.test.ts src/__tests__/unit/toPrintProblem.test.ts src/__tests__/unit/reviewConsoleRow.test.ts src/__tests__/unit/workspaceDraftStore.test.ts src/__tests__/components/PrintCheck.test.tsx --maxWorkers=1
npx vitest run src/__tests__/unit/bankChoiceFigures.test.tsx src/__tests__/unit/bankChoiceFigureRuler.test.ts src/__tests__/unit/bankChoiceFigureWiring.test.tsx src/__tests__/unit/renderParity.test.tsx src/__tests__/unit/paperProbeParity.test.tsx src/__tests__/unit/examPaperProbeParity.test.tsx src/__tests__/unit/contracts.smoke.test.ts src/__tests__/unit/mockHandlers.contract.test.ts src/__tests__/unit/selectFitsPage.test.ts src/__tests__/unit/selectSpreadsUnits.test.ts src/__tests__/components/ProblemCard.test.tsx src/__tests__/components/ReviewConsole.test.tsx src/__tests__/api/reviewQueue.test.ts src/__tests__/api/unifiedBankFilters.test.ts src/__tests__/api/problem.test.ts src/__tests__/api/test.test.ts --maxWorkers=1
npx vitest run src/__tests__/api/problem.test.ts src/__tests__/api/test.test.ts src/__tests__/api/unifiedBankFilters.test.ts src/__tests__/unit/prismaTestDoubleSnapshot.test.ts --maxWorkers=1
```

## 산출 무변화 대조

[수정 전 지문](bank-decide-render/before-fingerprint.json)과 [수정 후 지문](bank-decide-render/after-fingerprint.json)이 모두 일치한다. 지문 도구는 `e2e/body-typeset/choice-figures.baseline.tsx`이고 `npx tsx e2e/body-typeset/choice-figures.baseline.tsx after`로 다시 확인할 수 있다.

| 모집단                                                   | 비교 대상                       | 전후 SHA-256                                                       |
| -------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| 씨앗 0~299 × 중등 삼각비 18/16, 고등 인수분해 04 = 900건 | `content`, `answer`, `solution` | `fa0a83ffef45b8a8fc4e34a73b3d4a29be69c3217a4fe2ab873698f15ec7bf60` |
| 초안 25편 533행                                          | `content`, `answer`, `solution` | `fbc341f0c5c9e59b348d70da2509d5ec69129a4fbc4f00fd240e169ce1eee815` |
| 대구일중 3번의 연결을 모르는 렌더                        | HTML 전체                       | `c25eafb5a4d6b5068a7dd5dee284c645a3bd289ec82ace1f88fd52d2acc47705` |
| 신명여중 9번의 연결을 모르는 렌더                        | HTML 전체                       | `b8ebecb702c5e08cd19ca48a60a0f766b55ea08517f68fa6e2c2b76d2831ecb9` |

이 트랙은 엔진/파서/난수 코드를 바꾸지 않았다. 900건은 위 세 유형의 표본이며 엔진 전체 전수 검사가 아니다. 엔진 트랙의 의도된 해설 변경은 이 가지에 포함하지 않아 그 병합 뒤의 엔진 지문은 리드가 별도로 판정해야 한다. 초안과 원본 그림 파일도 이 트랙의 diff에 없다.

## 안 고친 것과 까닭

1. `src/lib/problem/choiceFigureIndex.ts`: 리드 소유의 판단 함수를 그대로 사용했다.
2. 짝수 개의 동일한 보기 본문: 기존 파서의 `dedupeRepeatedBlock`이 같은 본문의 앞/뒤 절반을 중복으로 보아 4개의 `[그림]`을 2개, 6개를 3개로 줄인다. 그러면 연결 계획은 안전하게 `null`로 돌아간다. 요구된 실제 다섯 보기 문항은 정상이며, 행 증가 시험은 5/7/9개로 작성했다. 파서는 engine 트랙 소유여서 고치지 않았다.
3. 실측/캐시 도구: `scripts/qa/paperProbe.tsx`의 `SlotInput`/렌더, `scripts/qa/examPaperProbe.tsx`의 `ExamProbeSlot`/렌더에는 아직 연결 정보가 없다. `scripts/qa/heightCacheManifest.ts`의 `DigestRow`/`figureSizeBasis`도 연결을 해시에 포함하지 않는다. 이 경로를 그대로 쓰면 실제 지면과 실측 지면이 다르고, 연결만 바뀐 행의 캐시도 무효화되지 않는다. `scripts/qa/**`는 리드 소유여서 보고만 한다.
4. 다른 그림 출력 경로: `src/components/unified/NativeProblem.tsx`의 OCR/직접 가져오기 갈래는 별도 구조를 렌더링한다. 이 트랙의 B1 처리는 적용하지 않았다. `src/lib/export/hwpxLayout.ts`는 이미 렌더링된 DOM을 복제하므로 문제은행의 `ProblemContent` 결과는 들어가지만, 별도 OCR 갈래와 실제 HWPX 최종 출력은 여기서 검증하지 않았다.
5. `src/app/dev/print-specimen`은 문항 조판이 아닌 개별 그림 크기 비교 지면이므로 바꾸지 않았다. `studioHelpers`의 잘라 가져온 그림 역시 알려진 보기 대응 정보가 없는 입력이다.
6. 운영 DB 검증/적재, 리드 공유 문서, Prisma 스키마, 다른 트랙의 변경, 실물 프린터 검수는 수행하지 않았다.

## 리드가 할 것

- 이 가지의 커밋을 병합한다. `prismaTestDouble.ts`는 origin/main의 eywa 변경과 맞물린다고 리드가 알려 주었으므로 기존 변경을 보존하며 9줄 배선을 합친다.
- 실측 도구의 DB 조회 → 슬롯 입력 → `ProblemContent` 및 자 입력까지 `choiceFigureIndex`를 전달한다. 적어도 `measure-print-overflow.tsx`, `measure-exam-paper-units.tsx`, 두 probe, `heightCacheManifest.ts`를 함께 확인하고 캐시 기준을 갱신한 뒤 다시 측정한다. 기존 실측 parity 시험의 초록은 알려진 보기 그림 경로의 전달을 증명하지 않는다.
- 짝수 개의 같은 `[그림]` 보기와 OCR 중복 제거의 충돌을 engine 트랙과 조율한다. 이 문제를 별도 범위로 다루지 않고 렌더러가 임의로 파서를 우회하면 판단 경로가 갈라진다.
- 운영 DB에서 알려진 연결 배열이 카드/검수/시험지에 도달하는지 확인한다. exams 트랙의 보정 및 짝 모르는 그림 보기의 출제 잠금과 함께 검증한다.
- 새 실물 검수 항목을 학생지/교사용 및 쪽 끝 배치로 확인하고, HWPX를 사용하는 경우 해당 출력도 확인한다.
- 리드가 맡은 전수 대조, 문서 갱신, 최종 병합/푸시와 완료 워크트리 정리를 수행한다. 이 작업자는 push나 main 병합을 하지 않는다.

## 물을 것

합의된 B1 조판 방침에 대한 미결 질문은 없다. 테스트 대역의 소유 범위 질문은 리드의 허용 답변으로 해결했고, 실측 도구 배선과 짝수 보기 파서 문제는 위 후속 목록으로 인계한다. 새 검수 항목의 상태는 실물 확인 전까지 `대기`로 남긴다.
