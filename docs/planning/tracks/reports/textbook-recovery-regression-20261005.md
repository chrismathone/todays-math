# 교재 복구 — 독립 회귀 검증

작성일: 2026-10-05. 대상: 조율 담당 가지 `BIGSHOL/testbook`. 이 작업에서 바꾼 파일은 **이 문서 하나**다 — 제품 코드도 기존 검사도 고치지 않았다.

**결론**: 계약 · 편집기 저장 · 작성 요청 · API · 자동 제작 · 원본 고정 영역의 검사는 `d5c0ba944` 에서 **통과 1,389 · 실패 8 · 건너뜀 34**(91개 파일)다. 실패 8건은 회귀가 아니다: 7건은 **새 화면을 따라오지 못한 기존 검사**(이전부터 실패), 1건은 **흔들리는 검사**(같은 커밋에서 세 번 다시 돌려 모두 통과). 둘 다 조율 담당이 정해야 한다(§4).

## 1. 검증한 커밋

| 시점 | 커밋 | 돌린 것 |
| --- | --- | --- |
| 기준선(원본 문항 머리 · 행 커밋 전) | `83e10b9b2` | 전체 17묶음 |
| 공지된 커밋 병합 직후 | `c761012f6` | 전체 17묶음 |
| **전체 결과의 기준** | **`d5c0ba944`** | 전체 17묶음 |
| 가지 끝(작성 시점) | `065c8d4f7` | 렌더 · 모델에 걸리는 6묶음만(§3) |

`d5c0ba944` 뒤의 두 커밋은 렌더 · 모델 파일 다섯(과 문서 하나)만 바꿨다. 그래서 그 파일을 지나는 묶음만 다시 돌렸다. `065c8d4f7` **이후의 커밋은 보지 않았다.**

## 2. 실행 방법

묶음 하나에 검사 프로세스 하나, 작업자 하나, 차례대로:

```
node node_modules/vitest/vitest.mjs run --config <설정> <파일들> \
  --pool=threads --maxWorkers=1 --no-file-parallelism \
  --reporter=json --outputFile=<묶음>.json
```

- 단위 검사: `scripts/qa/textbook/vitest.config.mts`(순수 노드 — 화면용 MSW 설정 없음).
- 화면 · API · 라이브러리 검사: `vitest.config.mts`(jsdom 과 MSW 설정 파일).
- 실행 환경에서 `TEXTBOOK_*` · `DATABASE_URL` · `DIRECT_URL` · `POSTGRES*` · `DEEPSEEK*` · `OPENAI*` · `AUTH_SECRET` 을 지웠다. 이 작업 폴더에는 `.env` 가 없다. 실제 DB · Vercel · 외부 API 호출은 없다(PGlite 와 모의 객체). `prisma generate` 는 돌리지 않았다. 자격 증명을 출력한 곳은 없다.
- 묶음마다 확인한 것: 보고된 파일 수 = 요청한 파일 수 · 종료 코드 · 적재에 실패한 파일 수 · 로그의 처리 안 된 오류(Unhandled) 수.

실행기(`run-batches.mjs`)와 묶음별 요약은 저장소 밖 `C:/Users/user/Downloads/교재_복구_실행검증_20261005/regression-evidence-c761012f6/` 에 있다(검사 이름과 수치뿐이다).

## 3. 결과 — `d5c0ba944`, 17묶음

| 묶음 | 설정 | 파일 | 통과 | 실패 | 건너뜀 | 종료 | 처리 안 된 오류 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U1 계약 · 직렬화 · DDL | 노드 | 9 / 9 | 236 | 0 | 0 | 0 | 0 |
| U2 편집 상태 · 클라이언트 | 노드 | 6 / 6 | 70 | 0 | 0 | 0 | 0 |
| U3 자동 제작 · 대본 · 도입 | 노드 | 6 / 6 | 121 | 0 | 0 | 0 | 0 |
| U4 작성기 | 노드 | 1 / 1 | 31 | 0 | 0 | 0 | 0 |
| U5 원본 고정 · 시험 확정본 | 노드 | 6 / 6 | 142 | 0 | 0 | 0 | 0 |
| U6 모델 · 조판 · 렌더(Chromium 없이) | 노드 | 18 / 18 | 218 | 0 | 1 | 0 | 0 |
| U7 학생 | 노드 | 7 / 7 | 117 | 0 | 0 | 0 | 0 |
| U8 PDF 관문이 닫힌 파일 | 노드 | 8 / 8 | 6 | 0 | 30 | 0 | 0 |
| A1 API 경로 | 기본 | 4 / 4 | 48 | 0 | 0 | 0 | 0 |
| A2 API 통합 | 기본 | 1 / 1 | 4 | 0 | 2 | 0 | 0 |
| C1 작성 요청 화면 외 | 기본 | 5 / 5 | 57 | **7** | 0 | **1** | 0 |
| C2 편집 화면 | 기본 | 1 / 1 | 36 | 0 | 0 | 0 | 0 |
| C3 편집 화면 사용성 | 기본 | 1 / 1 | 39 | **1** | 0 | **1** | 0 |
| C4 통합 · 학생 화면 | 기본 | 2 / 2 | 36 | 0 | 0 | 0 | 0 |
| L1 편집 저장 · 미리보기 | 기본 | 4 / 4 | 90 | 0 | 0 | 0 | 0 |
| L2 발행 | 기본 | 5 / 5 | 50 | 0 | 1 | 0 | 0 |
| L3 원본 고정 · 운영 | 기본 | 7 / 7 | 88 | 0 | 0 | 0 | 0 |
| **합계** | | **91 / 91** | **1,389** | **8** | **34** | | **0** |

적재에 실패한 파일 0, 빠진 파일 0.

세 시점:

| 커밋 | 파일 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- | --- |
| `83e10b9b2` | 89 | 1,360 | 7 | 22 |
| `c761012f6` | 91 | 1,389 | 7 | 34 |
| `d5c0ba944` | 91 | 1,389 | 8 | 34 |

파일이 둘 늘어난 것은 조율 담당의 새 검사 파일(`textbookRecoveryIntro.test.ts` · `textbookRecoveryMeasurement.integration.test.ts`)이다. 기준선에서 통과하던 검사가 새 커밋에서 실패로 바뀐 것은 §4 ② 한 건뿐이고, 그것은 흔들림이다.

가지 끝 `065c8d4f7`: U3 121 · U4 31 · U6 218(건너뜀 1) · U8 6(건너뜀 30) · L1 90 · L2 50(건너뜀 1) — **실패 0**, 종료 코드 0, 처리 안 된 오류 0.

## 4. 실패 8건 — 조율 담당이 정할 것

**① `TextbookAutoCreatePanel.test.tsx` 7건 — 검사가 옛 화면을 기대한다.** 세 시점 모두 같은 7건이다(11건 중 통과 4).

- 여섯 건은 파일 안의 도우미 `enableAllComponents()`(87줄)에서 멈춘다: 구성 스위치가 **18개**라고 단정하는데 화면은 **28개**를 그린다(`expected … to have a length of 18 but got 28`).
- 한 건(«retries an unchanged failed creation with the same request ID», 453줄)은 보낸 구성이 `기본 구성 + 대표예제` 와 같다고 단정한다. 화면(`AutoCreatePanel.tsx`)은 이제 **추천 구성**에서 시작한다 — 학습 안내 · 목차 · 개념학습이 더 켜져 있고 용어 암기가 꺼져 있다.
- 검사 파일의 마지막 수정은 `bfc760f8c`, 화면의 수정은 그 뒤 `5bbbe5a08` · `d052d888a` 다. 화면은 28개 구성 계약과 맞고 검사만 옛 모습이다.
- **정할 것**: 일곱 기대값을 28개 스위치와 추천 구성으로 고칠지, 18개 · 옛 기본값이 의도였다면 화면이 회귀한 것인지. 기대값을 내가 바꾸지 않았다.

**② `TextbookStudioUsability.test.tsx` 1건 — 흔들린다.** «T07 — 원고를 저장해 판본이 바뀌면 지난 내보내기 링크를 거둔다»(961줄): `revoke` 가 `'blob:old'` 로 불렸어야 하는데 0번.

- `d5c0ba944` 의 전체 실행에서 한 번 실패했다. **같은 커밋에서 그 파일만 세 번 다시 돌려 40 / 40 × 3.** 앞 두 시점의 실행에서도 통과했다.
- 검사는 링크가 사라지기를 `waitFor` 로 기다린 뒤, 주소 해제는 **기다리지 않고** 바로 단정한다. 링크가 사라진 렌더와 주소 해제 사이의 틈에 걸리면 실패한다. 그 커밋이 바꾼 파일(렌더 HTML · CSS)은 이 검사가 지나지 않는다.
- **정할 것**: 단정을 `waitFor` 안으로 옮길지(검사 수정), 아니면 화면이 링크를 지우는 것과 **같은 순간에** 주소를 해제해야 하는지(제품 수정).

## 5. 지시서가 꼽은 항목

| 항목 | 근거가 된 검사 | 결과 |
| --- | --- | --- |
| 옛 판의 바이트가 바뀌지 않는다 | `textbookSemanticCompatibility` «does not add optional fields to old stored sections or change their canonical bytes» · `textbookCanonical` 23건(JSON 바이트 경계 · UTF-8 직렬화) · `textbookPrintMapping` «keeps absent and historical empty mappings byte-equivalent» · `textbookRecoveryWriter` «reads an old 18-key request with the new activities off» · `textbookLayout` 옛 조판 기대값 | 통과 |
| 작성기 플래그가 없거나 `false` 면 쓰기 거절 | `api/textbookQuickCreateRoute` «keeps new writes disabled until the reader release is activated» — 플래그가 없을 때와 `"false"` 일 때 둘 다 POST 가 409 이고 제작 함수가 불리지 않는다 | 통과 |
| 새 28개 구성 | `textbookSemanticCompatibility`(활동 28개) · `textbookRecoveryWriter` «28 independent activities» 3건 · `textbookQuickCreate` «creates all 28 components across eight middle-2 sections…» | 통과. 화면이 28개를 그린다는 것은 §4 ① 의 실패 문구가 보여 준다 |
| 등장인물 10명씩 | `lib/textbookVisualLibrary` «exposes five identities per role/gender…»(전체 20명 · 역할과 성별마다 5명 → 선생님 10 · 학생 10) · `TextbookAutoCreatePanel` «submits component switches and the selected character»(선생님 선택지 10개) · `textbookConceptScripts` «…all ten students…» | 통과. **화면에서 학생 선택지 수를 세는 단정은 없다** — 학생 10명은 목록과 대본 검사로만 확인된다 |
| 요청 범위와 문항 몫 | `textbookRecoveryWriter` «fills exactly the requested 7..30 different questions and refuses fewer than the groups»(0 · 31 거절 포함) · «gives a single group the whole maximum» · `textbookQuickCreate` «rejects … bad cast and missing stage quota» · «single-unit range works and wrong/reversed endpoints leave no book» · «all components together cover every selected problem group within the shared maximum» · «distributes the total quota…» · `api/textbookQuickCreateRoute` 잘못된 범위 질의 7건과 «rejects extra keys, all-off, malformed JSON and duplicate keys…» | 통과 |

앞서 실패하던 API 통합 검사(여덟 소단원 · 64문항)는 지금 통과한다.

## 6. 건너뛴 검사 34건 — 관문이 닫혀 있었다

실제 Chromium 과 PDF 를 쓰는 검사는 조율 담당과 QA 담당의 몫이라 관문(`TEXTBOOK_PDF_TEST` · `TEXTBOOK_VISUAL_TEST`)을 열지 않았다. 파일은 적재됐고(오류 0) 검사는 건너뛰었다.

| 파일 | 건너뜀 | 비고 |
| --- | --- | --- |
| `textbookRecoveryMeasurement.integration.test.ts` | 12 | 관문 밖의 6건은 통과 |
| `textbookAnswerLayout.integration.test.ts` | 4 | |
| `textbookRender.integration.test.ts` | 4 | |
| `textbookRecoveryContentRender.integration.test.ts` | 3 | |
| `textbookRecoverySourceMemory.integration.test.ts` | 3 | |
| `textbookRecoveryContinuedBlocks.integration.test.ts` | 2 | |
| `api/textbookQuickCreateIntegration.test.ts` | 2 | 나머지 4건은 통과 |
| `textbookIndependentAnswers.integration.test.ts` | 1 | |
| `textbookVisualRender.integration.test.ts` | 1 | 시각 관문 |
| `textbookRecoveryDialogueRender.test.ts` | 1 | 시각 관문. 나머지 13건은 통과 |
| `lib/textbookPublishReal.integration.test.ts` | 1 | |

## 7. 하지 않은 것

- 실제 Chromium · PDF 검사 전부, 14묶음 전체와 G0 — QA 담당과 조율 담당의 몫이고 무거운 렌더를 겹쳐 돌리지 않았다.
- 저장소 전체 타입 검사 · 린트 · 빌드 — 조율 담당의 몫.
- 얼린 추출 증명(`scripts/qa/textbook/extraction-proof`) — 의도적으로 빨간 상태이고 돌리지 않았다.
- 발행 전용 설정(`publish.vitest.config.mts`) — 그 세 파일은 기본 · 노드 설정으로 이미 돌렸다.
- 교재 밖의 검사 전체, 브라우저 종단 검사(Playwright).
- `065c8d4f7` 이후의 커밋. 가지 끝에서는 6묶음만 다시 돌렸다 — 나머지 11묶음의 결과는 `d5c0ba944` 의 것이다.
- 이 검증은 **있는 검사가 통과하는지**를 본 것이다. 검사가 없는 자리(예: 화면의 학생 선택지 수)는 드러나는 대로 §5 에 적었고, 새 검사는 쓰지 않았다.
