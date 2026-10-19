# 시험지 만들기 «간단하게» — Wire A–D

2026-10-18 · `phase/12-builder-wire` · 조사 기준 HEAD `27b66e0ad`.

지시서 `docs/planning/tracks/brief-builder-simple-wire-codex.md`의 Wire 작업을 수행했다. 제품 부품은 수정하지 않았다. 커밋·스테이징·push·외부 호출·DB 접근·`.env` 접근·`prisma generate`를 하지 않았다.

## 확인 경로와 범위

- 경로: `/dev/exam-builder-simple-wire`.
- `page.tsx`에서 `connection()` 다음 `devPageVisible({ directorOnly: true })`를 확인하고, 허용되지 않으면 `notFound()`로 끝낸다.
- A–D 각 1·2단계, 총 8장이다. 3단계는 기존 양식 구성·출력을 유지한다.
- 흑백 상자·실제 차시명·실제 제작 문구로 구조를 비교한다. 입력·실행 버튼은 그림이다. 장면 이동 링크와 native 펼침(정답·해설, 상태 예 등)만 동작한다. 제품 구현이나 Hi-fi 선택으로 취급하지 않는다.
- 차시 이름은 `src/lib/concept-blank/bank/e3-plus.ts`의 실제 초3 차시다. 전체 범위 735개와 출처별 수는 지시서의 값이다. 현재 조회를 수행하지 않았다. 필터 결과 29범위·표시 20개, 범위별 가능 수, 배분, 문항·상태는 직접 만든 픽스처다.
- 34·40·50·36개 배열에서 문항 수, 형식, 난이도, 차시별 합을 센다. 화면에 보이는 문항 발췌와 전체 통계를 구분한다.

## 안별 요약

| 안                               | 1단계                                                                      | 2단계                                                                              | 출처 처리                                                                             | 약점                                                |
| -------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| A · 범위는 넓게, 조건은 오른쪽에 | 넓은 단원 트리 + 짧은 조건 칸. 총수·단계는 보이고 세부 수·추가 선택은 펼침 | 왼쪽 통계·순서표 + 오른쪽 문항. 40문항을 정한 뒤 6개를 뺀 34문항 예                | `전체 출처 / 교과서만` 한 줄. 책·자료 종류는 교과서에서만, 개별 다른 출처는 추가 조건 | 범위별 수·고정을 자주 바꾸면 구성표를 더 펼쳐야 함  |
| B · 범위와 구성표를 바로 연결    | 기존 범위·구성표 두 칸. 체크 즉시 반영, 한 줄 요약 + 구성 조건             | 조건은 접힌 한 줄, 통계 아래 넓은 문항 목록. 40문항, 다음 단계 가능                | 출처를 범위 칸 안으로. 교과서의 책·자료 종류까지 같은 자리                            | 처음 만드는 사람에게 두 칸의 정보가 많음            |
| C · 위에서 아래로, 한 줄씩       | 학년·범위·조건을 한 열로 배치                                              | 상단 통계·순서표, 아래 문항. 50문항이지만 단답형 20→18, 서술형 6→8로 지정과 불일치 | 전체 출처로 시작, 필요할 때만 `출처 제한` 펼침                                        | 범위와 문항이 길면 위아래 이동이 늘어남             |
| D · 고른 범위를 작업의 중심에    | 좁은 범위 찾기 + 넓은 선택 구성표, 아래 조건 한 줄                         | 차시 묶음별 문항 + 오른쪽 구성·출력 안내. 36문항, 출력 권한 없는 예                | `범위로 시작 / 교과서로 시작`. 교과서 경로에서만 책 창                                | 범위를 고르기 전 넓은 구성 영역이 비어 보일 수 있음 |

### 보유 수 줄·출처·차단 안내

네 안 모두 제작 화면에서 보유 수 줄을 제거했다. 선택 범위의 가능 수·고른 범위 수·담은 문항 수는 남겼다. 공용 풀의 수는 제작 화면 바깥의 ‘출처 판단 근거’와 각 안의 장단 설명에만 있다. 현재 선택의 출제 가능 수로 표시하지 않는다.

| 출처   | 지시서의 관측값 |
| ------ | --------------: |
| 엔진   |          53,514 |
| 교과서 |          12,301 |
| 기출   |             101 |
| 그 밖  |           4,452 |

- A 장점: 책 선택이 필요한 교과서 12,301문항을 두 선택 중 하나로 분리한다. 대가: 엔진 53,514·기출 101·그 밖 4,452 각각만 고르려면 추가 조건을 열어야 한다.
- B 장점: 12,301 교과서 문항의 학년·책·차시를 한 자리에서 좁히면서 53,514 엔진 문항도 직접 선택한다. 대가: 기출 101·그 밖 4,452까지 유지해 범위 칸이 길어진다.
- C 장점: 엔진 53,514문항을 포함한 전체로 시작해 불필요한 출처 선택을 줄인다. 대가: 교과서 12,301·기출 101·그 밖 4,452를 제한하려면 펼침이 필요하다.
- D 장점: 교과서 12,301문항의 책·자료 선택에 창을 집중하고 엔진 53,514문항은 범위 경로로 바로 찾는다. 대가: 기출 101·그 밖 4,452는 범위 경로의 추가 선택이며 두 진입의 의미를 구분해야 한다.

교과서 로딩은 A의 책 선택 영역, B의 범위 내부 책 목록, C의 출처 제한, D의 교과서 전용 창 안에 각각 배치했다. 내용 칸을 확보하고 안내를 가로·세로 중앙에 둔다. 범위·추가·교체 로딩도 해당 목록 안에 둔다. 실패는 ‘목록을 불러오지 못했습니다 / 선택은 유지됩니다 / 다시 불러오기’로 구분했다. 가짜 진행률·대기 시간은 넣지 않았다. 속도 개선은 이번 변경에 포함하지 않았다.

차단 원인은 A·B·C의 검토 하단, D의 오른쪽 다음 버튼 바로 위에 적었다. A는 ‘총 40문항 지정 · 현재 34문항. 6문항이 모자랍니다’와 문항 추가·총수 수정, C는 형식별 지정/현재 수와 교체·형식 수정, D는 출력 권한 요청을 표시한다. 복구 행동과 비활성 다음 버튼의 모양을 구분했다.

## 유지한 선택과 변경 제안

아래는 관측된 기존 선택이다. 시안에서 다르게 제시한 구조는 각 안의 **‘바뀌는 것’**에 적었다. 이번에 새로 확정한 제품 결정은 없다.

| 기존 선택                                                           | 근거                                                                                                        | 이번 처리                                                                                                                                               |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1·2단계 완전 분리, Wire B / Hi-fi H1, 체크 즉시 구성표 반영         | `src/app/dev/exam-builder-steps-hifi/StepsHifi.tsx:14`, `src/components/exam-builder/ScopePicker.tsx:10`    | 분리·즉시 반영 유지. A·C·D의 열 비중/배치 변경은 명시                                                                                                   |
| W3 B / Hi-fi 1: 원문·선택 후보 대조 + 후보 목록, 명시적 교체        | `src/app/dev/exam-builder-hifi/BuilderHifi.tsx:10`, `src/components/exam-builder/ReplaceDialog.tsx:9`       | 안마다 교체 창 배치 예 제공. 두 후보 층, 자리·순서·되돌리기와 별도 지정 복습 변형 유지                                                                  |
| W4 D / Hi-fi 2: 한 줄 요약 + 넓은 조건/배정 미리보기 창             | `src/components/exam-builder/ComposeConditions.tsx:20`                                                      | 좁은 구성표 속에서 조건을 편집하는 구조로 바꾸지 않음. 화면에는 창 진입 요약, 각 안 설명에 최대 880px의 창 내부 배치 예. A의 빠른 조작 노출은 변경 제안 |
| W5 B / Hi-fi 1 + 4의 적용 조건 한 줄                                | `src/components/exam-builder/SavedConditions.tsx:15`, `src/components/exam-builder/SavedConditions.tsx:370` | 이름·범위·조건 목록, 적용·이름 변경·삭제와 줄 안 확인, 적용 뒤 한 줄을 보존                                                                             |
| M3 Hi-fi H1: 1~6단계·직접, 객관식·단답형·서술형, 객관식 먼저        | `docs/planning/monthly-exam-plan-20261017.md:345`                                                           | 참고 서비스의 다섯 난이도/주관식 합치기를 가져오지 않음. 여섯 사다리·‘–’와 0 구분 유지                                                                  |
| 최근 14일 출제 제외 기본 켬, 부족분을 다른 범위로 채우지 않음       | `src/app/dev/exam-builder-hifi/BuilderHifi.tsx:83`, `src/components/exam-builder/conditionsPlan.ts:233`     | 유지. 예시 총수는 이미 정한 상태이며 새 작업의 고정 기본값이 아님                                                                                       |
| 출처 Wire B / Hi-fi H1: 한 칸 요약·다섯 출처·교과서 세 단·적용/취소 | `docs/planning/05-design-system.md:519`, `src/components/unified/BankSourcePicker.tsx:19`                   | 네 안 모두 대체 구조 제안임을 ‘바뀌는 것’에 명시. 공용 출처 선택기 자체는 수정하지 않음                                                                 |
| 정답·해설 기본 숨김                                                 | `src/components/exam-builder/ExamBuilder.tsx:170`, `src/components/exam-builder/ExamBuilder.tsx:1394`       | 각 문항에 처음 접힌 ‘정답·해설 보기’                                                                                                                    |

W5 v1은 형식·차례를 저장하지 않는다(`monthly-exam-plan-20261017.md:350`). 시안의 저장 조건 예에도 포함시키지 않았다.

## 다음 단계가 막히는 까닭 — 코드 조사

### 2 → 3: «다음: 양식 구성·출력»이 비활성인 조건 전부

`src/components/exam-builder/ExamBuilder.tsx:977`:

```ts
actionsDisabled || !questions.length || !outputAllowed;
```

상단의 ‘3 양식 구성·출력’도 같은 조건이다(`ExamBuilder.tsx:967`). `actionsDisabled = disabled || busy`(`:869`), `outputAllowed = canOutput && !intentWarning`(`:302`)다.

| 원인                                                          | 코드 file:line                                                                                                                                               | 사용자 안내 예                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 문항 구성 또는 출력 준비 작업 중                              | `src/components/exam-builder/ExamBuilder.tsx:719`, `:869`                                                                                                    | 출력할 문항을 확인하는 중입니다. 확인이 끝나면 다음 단계로 이동합니다.                             |
| 담은 문항 0개                                                 | `src/components/exam-builder/ExamBuilder.tsx:977`                                                                                                            | 담은 문항이 없습니다. 범위를 정하고 문항을 구성해 주세요.                                          |
| 출력 권한 없음                                                | `src/components/exam-builder/ExamBuilder.tsx:302`, `src/components/exam-builder/MathExamBuilder.tsx:328`, `src/components/unified/UnifiedWorkspace.tsx:1834` | 양식 구성·출력 권한이 없습니다. 원장님에게 출력 권한을 요청해 주세요.                              |
| 지정 총수와 담은 수가 다름 — 부족·초과 모두                   | `src/components/exam-builder/ExamBuilder.tsx:277`, `:295`                                                                                                    | 총 40문항 지정 · 현재 34문항. 6문항을 더 담거나 총 문항 수를 바꿔 주세요.                          |
| 지정한 형식별 수와 실제 수가 다름 — 객관식·단답형·서술형 각각 | `src/components/exam-builder/ExamBuilder.tsx:281`, `:290`, `:299`                                                                                            | 단답형 20문항 지정 · 현재 18문항. 문항을 바꾸거나 형식별 수를 바꿔 주세요.                         |
| 외부 `disabled` 속성                                          | `src/components/exam-builder/ExamBuilder.tsx:72`, `:869`                                                                                                     | 공통 부품의 계약에 있음. 현재 `MathExamBuilder`는 전달하지 않으므로 새 제품 원인으로 표시하지 않음 |

`canOutput`은 작업실의 `can("export")`에서 온다. 허용 메뉴 집합을 검사하는 함수는 `src/components/unified/UnifiedWorkspace.tsx:410`이다.

총수는 명시한 `applied.total`을 우선한다. 없으면 한 번 구성한 뒤부터 범위 행의 합 `requested`를 지킨다(`ExamBuilder.tsx:277`). 지운 문항 수만큼 목표를 자동으로 낮추지 않는다. 형식의 `0`도 명시한 값이다. 현재 원인 경고는 이미 검토 목록 머리에 있지만(`:1437`), 버튼과 떨어져 있어 이번 Wire에서는 같은 영역에 붙였다.

난이도 불일치·출처 보유량 로딩·범위 로딩·저장 실패·저장 중·제목 공백·문항 정체 확인 실패·교체 후보 로딩은 이 비활성 식에 직접 들어가지 않는다. 저장에 성공해야 다음 단계로 간다는 조건도 없다.

### 1 → 2: «문항 구성» 비활성 조건 전부

단추 식은 `src/components/exam-builder/ExamBuilder.tsx:1322`의 `actionsDisabled || !valid`이며 `valid`는 `:311`에서 계산한다. 준비 중·외부 disabled는 위와 같은 공통 조건이다.

| 원인                                         | 코드 file:line                                                                                          | 안내 예                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 선택한 유효 범위 없음                        | `src/components/exam-builder/ExamBuilder.tsx:313`                                                       | 출제할 범위를 한 개 이상 골라 주세요.                                          |
| 구성 수 합계 0 이하                          | `src/components/exam-builder/ExamBuilder.tsx:314`                                                       | 문항 수를 1문항 이상 정해 주세요.                                              |
| 구성 수 합계 100 초과                        | `src/components/exam-builder/ExamBuilder.tsx:315`, `src/components/exam-builder/mathSource.ts:25`       | 최대 100문항까지 구성할 수 있습니다. 문항 수를 줄여 주세요.                    |
| 남아 있는 배분 행의 범위를 찾을 수 없음      | `src/components/exam-builder/ExamBuilder.tsx:317`, `src/components/exam-builder/scopeAvailability.ts:8` | 선택한 범위를 확인하지 못했습니다. 범위를 다시 골라 주세요.                    |
| 수 확인 필수인 출처에서 범위 가능 수 미확인  | `src/components/exam-builder/scopeAvailability.ts:9`, `src/components/exam-builder/mathSource.ts:154`   | 출제 가능 수를 확인하는 중입니다. 확인이 끝나면 문항을 구성할 수 있습니다.     |
| 범위 가능 수가 양의 안전 정수가 아님         | `src/components/exam-builder/scopeAvailability.ts:10`                                                   | 이 범위의 출제 가능 문항을 확인해 주세요.                                      |
| 행의 요청 수가 해당 범위 가능 수보다 큼      | `src/components/exam-builder/ExamBuilder.tsx:320`                                                       | 이 범위는 8문항을 고를 수 있는데 10문항으로 정했습니다. 문항 수를 줄여 주세요. |
| 지정 난이도 합이 총수보다 큼                 | `src/components/exam-builder/ExamBuilder.tsx:307`, `src/components/exam-builder/conditionsPlan.ts:174`  | 난이도 합(45)이 총 문항(40)보다 큽니다.                                        |
| 모든 난이도 칸을 지정했는데 합이 총수와 다름 | `src/components/exam-builder/conditionsPlan.ts:176`                                                     | 난이도 합(34)이 총 문항(40)과 다릅니다. 수를 맞추거나 한 칸을 ‘–’로 비우세요.  |
| 지정 형식 합이 총수보다 큼                   | `src/components/exam-builder/ExamBuilder.tsx:309`, `src/components/exam-builder/conditionsPlan.ts:155`  | 형식 합(45)이 총 문항(40)보다 큽니다.                                          |
| 세 형식을 모두 지정했는데 합이 총수와 다름   | `src/components/exam-builder/conditionsPlan.ts:157`                                                     | 형식 합(34)이 총 문항(40)과 다릅니다. 수를 맞추거나 한 칸을 ‘–’로 비우세요.    |

0문항으로 확인된 범위는 새로 체크할 수 없고(`ScopePicker.tsx:255`), 복원 배분에서도 제외한다(`ExamBuilder.tsx:266`). 다른 유효 범위가 남아 있으면 그것만으로 구성할 수 있다. 0문항 범위가 있었다는 사실 하나로 모든 다음 이동을 막는 것은 아니다. 기존 저장 문항도 삭제하지 않는다(`:1061`).

범위 로딩/실패는 `ExamBuilder.tsx:214`, `:1068`에서 표시한다. 로딩 플래그 자체가 2→3을 끄는 것은 아니며, 1→2에서는 유효 범위 없음·가능 수 미확인으로 영향을 준다. 현재 수학은 가능 수를 다시 확인한다(`MathExamBuilder.tsx:263`).

### «구성 조건» 창의 적용 제한

`src/components/exam-builder/ComposeConditions.tsx:211`, `:232`의 식은 `plan.block.length > 0 || loading`이다.

| 원인                                                            | 코드 file:line                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| 선택한 최근 출제 조건의 범위 가능 수 미확인                     | `src/components/exam-builder/ComposeConditions.tsx:181`, `:503`     |
| 지정 총수 1 미만 또는 100 초과                                  | `src/components/exam-builder/conditionsPlan.ts:200`, `:204`         |
| 고정 행의 합이 지정 총수 초과                                   | `src/components/exam-builder/conditionsPlan.ts:205`                 |
| 모든 행이 고정이고 지정 총수와 고정 합이 달라 다시 나눌 행 없음 | `src/components/exam-builder/conditionsPlan.ts:209`                 |
| 난이도 합 초과 / 모든 난이도 지정 뒤 합 불일치                  | `src/components/exam-builder/conditionsPlan.ts:240`, `:174`, `:176` |
| 형식 합 초과 / 모든 형식 지정 뒤 합 불일치                      | `src/components/exam-builder/conditionsPlan.ts:249`, `:155`, `:157` |

범위 재고 부족 자체는 `note`이며 적용을 막지 않는다(`conditionsPlan.ts:233`). 가능한 수까지만 배정하고 다른 범위로 채우지 않는다. 난이도·형식 합은 이 배정 후 합과 대조한다(`:238`). 총수 지정도 없고 난이도·형식 지정도 없는 0문항 상태는 창의 적용이 가능할 수 있으며, 이후 문항 구성에서 0문항으로 막힌다.

반대 최근 출제 조건의 수 조회 실패는 `ExamBuilder.tsx:240`부터의 요청에서 빈 catch로 끝난다(`:257`). 그 조건으로 바꾼 창은 계속 미확인으로 남을 수 있다. 이번 Wire의 실패·다시 불러오기 모양은 이런 대기와 실패를 구분하는 제안이며, 요청 처리 로직은 고치지 않았다.

### 비활성 원인이 아니라, 누른 뒤 출력 확인에서 거절되는 경우

`run("output")`은 `source.prepareOutput`을 기다린다(`ExamBuilder.tsx:735`). 실패는 문항 검토에 오류로 남고(`:812`, `:992`), 준비 중을 해제한다(`:821`). 토스트만 띄우는 동작이 아니다.

| 거절 이유                                                                      | 코드 file:line                                                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 100문항 초과                                                                   | `src/components/exam-builder/mathSource.ts:417`                                               |
| 같은 실제 문항 중복                                                            | `src/components/exam-builder/mathSource.ts:419`                                               |
| 출제할 실제 형식 확인 실패                                                     | `src/components/exam-builder/mathSource.ts:425`                                               |
| 출력 직전 문항 없음·출제 불가: 공용 풀 아님, 검수 미통과, 출제 잠금, 정답 없음 | `src/components/exam-builder/mathSource.ts:449`, `src/contracts/bankReadiness.contract.ts:32` |
| 단원 또는 출처가 바뀜                                                          | `src/components/exam-builder/mathSource.ts:461`                                               |
| 통신 실패·비정상 응답·응답 계약 불일치                                         | `src/components/exam-builder/mathSource.ts:117`, `:433`                                       |
| 준비 결과 중복·100문항 초과·출력 문항 0개                                      | `src/components/exam-builder/ExamBuilder.tsx:772`, `:782`, `:784`                             |

검토의 중복 경고(`ExamBuilder.tsx:1443`) 역시 다음 버튼의 비활성 식에는 없다. 잠금 사유를 화면이 추측하지 않는다. 교과서 슬롯 로딩과 조건 저장의 별도 `busy`도 출력 준비의 `busy`와 혼동하지 않는다.

## 변경한 파일

모두 신규 파일이다. 기존 제품 부품·공유 가드·설계 규격은 수정하지 않았다. 처음부터 있던 미추적 지시서는 그대로 두었다.

1. `src/app/dev/exam-builder-simple-wire/page.tsx` — 원장 전용 개발 페이지 가드.
2. `src/app/dev/exam-builder-simple-wire/SimpleWire.tsx` — 8장, 출처 네 방식, 차단·로딩/실패·기존 창 배치 예.
3. `src/app/dev/exam-builder-simple-wire/SimpleWire.module.css` — 흑백·상자·가용 폭별 한 열 전환, 표 내부 넘침 처리, 중앙 대기 안내.
4. `src/app/dev/exam-builder-simple-wire/fixtures.ts` — 실제 차시명과 출처 관측값, 독립 34~50문항 픽스처.
5. `src/app/dev/exam-builder-simple-wire/wire.test.tsx` — 렌더·장면 링크·수량·차단 이유·답 접힘 확인.
6. `src/app/dev/exam-builder-simple-wire/page.test.tsx` — 가드 거절/허용 확인.
7. `src/app/dev/exam-builder-simple-wire/test.setup.ts` — DB 없는 최소 셋업, fetch 차단.
8. `src/app/dev/exam-builder-simple-wire/vitest.config.mts` — `.env`를 로드하지 않는 독립 설정과 기존 `devPageGuardCoverage` 실행 대상.
9. `docs/planning/tracks/reports/builder-simple-wire-codex-20261018.md` — 이 보고서.

## 검증

| 검사                                                | 명령                                                                                                                 | 결과                                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 렌더 + 페이지 가드 + 전체 개발 페이지 가드 커버리지 | `node_modules/.bin/vitest run --config src/app/dev/exam-builder-simple-wire/vitest.config.mts --configLoader runner` | 3파일 23시험 통과                                                                    |
| 전체 type-check                                     | `npm run type-check -- --incremental false`                                                                          | 통과. 지시서에서 허용한 기존 `questionGroupKey` 오류도 현재 환경에서는 발생하지 않음 |
| 변경 폴더 eslint                                    | `node_modules/.bin/eslint src/app/dev/exam-builder-simple-wire`                                                      | 통과                                                                                 |
| 전체 affordance 검사                                | `npm run lint:affordance`                                                                                            | 통과                                                                                 |
| 서식                                                | `node_modules/.bin/prettier --check src/app/dev/exam-builder-simple-wire`                                            | 통과                                                                                 |

루트 Vitest 설정은 `.env`를 읽으므로 사용하지 않았다. 첫 기본 config loader 시도는 공용 `node_modules/.vite-temp` 쓰기가 샌드박스에서 거절됐다. 파일을 바꾸거나 권한을 확장하지 않고 `--configLoader runner`로 실행했다. 테스트가 DB를 읽는 기존 `/dev` 페이지를 import할 때에는 기존 guard coverage 시험 자체의 DB 접근 감시 mock을 사용한다. 외부 fetch도 최소 셋업에서 차단한다.

별도 읽기 전용 검토로 차단 식·기존 결정·수량·표/창 배치를 교차 확인했다. 복구 행동의 비활성 표시, 순서표 첫 열 너비, 좁은 패널 속 조건 편집, 저장 조건의 이름 변경·삭제 누락을 수정했다. A의 빠른 조건 칸도 세부 수와 추가 선택을 접어 긴 폼 전체를 고정하지 않게 했다.

**브라우저 시각 검수는 미확인이다.** 자체 픽스처를 정적 HTML로 렌더하는 것까지 확인했으나, headless Chrome 프로세스 실행이 샌드박스에서 실패했다. 이어 Google Chrome으로 로컬 시안 파일을 열려는 작업은 자동 승인 검토에서 거부됐고 도구 사유는 `Computer Use was not approved to use Google Chrome`이었다. 폭별 브라우저 실측·스크린샷 통과를 주장하지 않는다. 반응형은 CSS 구조와 렌더 시험으로만 검토했다. Next 개발 서버는 시작하지 않았고 실계정·실DB·실제 저장·추출·출력도 실행하지 않았다.

Orca 작업트리 병렬 실행은 `runtime_access_denied (EPERM)`으로 연결이 차단되어 읽기 전용 코드 검토만 별도 에이전트로 수행했다. Orca를 재시작하거나 새 작업트리·커밋·병합을 만들지 않았다.
