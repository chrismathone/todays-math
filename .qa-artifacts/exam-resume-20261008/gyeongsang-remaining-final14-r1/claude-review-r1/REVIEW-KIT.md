# GF14 최종검수 r1 — Claude 검수자 절차

경상 나머지 14문항(1–9, 16, 17, 19–21)의 쌍둥이 후보를 검수한다. 문항마다 검수자 하나가 **먼저 답을 모른 채 풀고(1단계), 그 풀이가 커밋으로 봉인된 뒤에(2단계) 후보를 공개받아 검토한다.** 방법 이름은 `independent-solve-then-review`.

- 대상 학년·교육과정: 중3, 2015 개정(2025 시험 — 중3 의 2022 적용은 2027부터).
- 원래 Geometry 검수자의 원시 풀이(`blind/solve/`)와 사후 수학 대조(`evidence/math-review.json`)는 그 검수자의 기록이다. 이 검수는 **새 검수자의 새 풀이**로 한다. 1단계에서는 그 파일들을 열지 않는다.
- 18번은 학년·복잡성 보류로 이 범위에 없다.
- 이 검수는 수학·학년·내용 판정이다. 권리·출처·유사성·native·적재 관문은 따로 보류로 남는다(`loadable=false`).

## 1단계 — 답을 모른 채 풀기

읽어도 되는 것은 둘뿐이다.

1. `blind/student-problems.json` 에서 자기 문항 번호의 항목
2. 그 항목의 `figures[].svgPath` 가 가리키는 `blind/` 아래 SVG(라벨은 `data-label` 속성에 LaTeX 로 있다 — 좌표와 함께 읽는다)

다른 파일·폴더(`package/` · `review/` · `evidence/` · `inspection/` · `context/` · `blind/solve/` · 다른 문항의 풀이 · 저장소의 다른 파일 · git 이력)는 열지 않는다. 답을 검색하지 않는다.

- 중3(2015)이 배운 방법만으로 푼다. 다섯 보기를 모두 판정하고, 해의 존재·유일성, 양수 길이, 부호, 단위, 그림과 조건의 일치를 확인한다.
- 계산은 정확값으로(분수·근호) 검산한다. python 을 써도 되고, 쓰면 코드와 출력을 기록에 넣는다.
- 조건이 모자라거나 학년 밖 방법이 꼭 필요하면 `pending` 과 그 까닭.
- 결과는 `claude-review-r1/solve/qNN.json` 에 쓴다(아래 꼴). 저장소의 다른 파일은 고치지 않는다. 커밋하지 않는다.

```json
{
  "questionNumber": 7,
  "twinExternalId": "…(student-problems 의 값)",
  "studentDigest": "…(student-problems 의 값)",
  "solverId": "claude-opus-5-5-gf14-r1-q07",
  "status": "solved",
  "answer": "③",
  "parts": [ { "label": "(1)", "answer": "…" } ],
  "solution": "학생용 풀이(한국어, 중3 방법)",
  "evidence": {
    "choiceChecks": [ { "choice": "①", "value": "…", "verdict": "false — 까닭" } ],
    "existenceUniqueness": "…",
    "figureReading": "그림에서 읽은 점·각·길이와 문장 조건의 대조",
    "gradeMethod": "쓴 개념과 성취기준 후보, 학년 밖일 수 있는 것",
    "calculation": { "code": "…", "output": "…" }
  },
  "pendingReason": null
}
```

객관식이 아니면 `parts` 에 소문항별 답을 쓰고 `answer` 는 한 줄 요약.

## 2단계 — 봉인 뒤 후보 검토

부모가 1단계 풀이를 커밋으로 봉인한 뒤에 다음을 연다.

| 자료 | 경로 |
|---|---|
| 후보(본문·보기·답·해설·메타데이터·변형 기록) | `package/private/qNN/candidate.json` |
| 후보 그림 스펙·SVG | `package/private/qNN/figure-*.spec.json` · `figure-*.svg` |
| 70mm 지면(답·해설 포함) | `inspection/qNN-expanded.png` (이미지로 본다) · `inspection/layout.json` |
| 엄격 렌더 | `evidence/strict-render.json` |
| 원문(비교용 — 답 대조에 쓰지 않는다) | `evidence/selected-source-questions.json` 의 같은 번호 · `context/packet/images/qNN-part1.png` |
| 앞 검수자의 사후 수학 대조(참고) | `evidence/math-review.json` |
| 공식 성취기준·제한 | `claude-review-r1/official-provisions.json` (id 로 인용) |
| 단원·유형 스냅샷(2026-10-08 r3, 현재 DB 아님) | `context/bank-read-fresh-r3-20261008.json` |
| 보고서 양식 예 | `../gyeongsan-q22-final-review-r2/reports/q22.json` · `../gyeongsang-stat-final-review-r1/reports/q13.json` |

### 판정 12개(`checks` — 모두 참/거짓, 각각 `checkEvidence` 에 구체 근거)

| 키 | 참이 되려면 |
|---|---|
| answerCorrect | 내 봉인 풀이와 후보 답이 수학적으로 같다(표기 차이는 실패가 아니다) |
| solutionCorrect | 후보 해설의 각 단계가 옳다 |
| existenceUniqueness | 조건을 만족하는 상황이 있고 답이 하나다 |
| choicesCorrect | 다섯 보기의 정오가 실제로 하나만 맞고 나머지는 틀린다(객관식이 아니면 소문항·배점 확인) |
| figureConsistent | 그림의 점·선·각·라벨이 본문 조건과 맞고, 지면에서 겹침·잘림이 없다 |
| sameCoreConceptAndProcedure | 원문과 같은 평가 개념·핵심 풀이 원리 |
| distinctPresentation | 발문 구조·소재·표현·질문 대상 가운데 하나 이상이 **실제로** 바뀌었다. 숫자·이름·문장 순서만 바꾼 것은 거짓 |
| naturalKorean | 학생이 자연스럽게 읽는 한국어다 |
| curriculumAppropriate | 2015 중3 성취기준 안이고 제한(특히 «삼각비 사이의 관계는 다루지 않는다», 0°~90°)을 어기지 않는다 |
| allStudentSurfacesInScope | 아래 7면이 모두 `passed` |
| unitFamilyFit | 실제 단원 UUID 와 **전체 목적이 맞는** live family 를 스냅샷에서 증명할 수 있다. 제목이 비슷하다는 것만으로는 거짓 |
| scoreAppropriate | 배점·형식이 원문과 맞고 난이도에 맞다 |

### 학생 7면(`curriculumSurfaces`)

`stem` · `choices` · `figuresAndTables` · `notation` · `answer` · `studentSolution` · `prerequisites` 각각 `{ "status": "passed"|"pending"|"rejected", "basis": "…", "officialProvisions": ["9수04-17", …], "restrictionsReviewed": ["no_trig_ratio_relationships", …] }`.

- 학년 밖 **필수** 방법은 `rejected`, 불명은 `pending`. 원본 학교가 냈다는 것 · 모델 확률 · 코드가 통과했다는 것은 근거가 아니다.
- 해설이 sin²+cos²=1, tan=sin/cos, 여각 관계(sin(90°−x)=cos x) 같은 **삼각비 사이의 관계**를 쓰면 그 면은 `rejected`. 실제 직각삼각형의 변의 비로 직접 구하는 것과 특수각 값을 그림에서 구하는 것은 관계가 아니다.
- 삼각형 넓이를 «½ab sin C» 공식으로 외워 쓰게 하면 `pending` 이상으로 따진다 — 높이를 삼각비로 구해 넓이를 내는 풀이는 9수04-18 활용이다.

### 보고서

`claude-review-r1/reports/qNN.json` 에 쓴다. 디지스트 칸(`studentDigest` · `candidateDigest` · `assetDigest` · `solveDigest`)과 `status` 는 부모의 마무리 스크립트가 채운다 — 비워 두거나 넣지 않는다.

```json
{
  "questionNumber": 7,
  "twinExternalId": "…",
  "method": "independent-solve-then-review",
  "verifierId": "claude-opus-5-5-gf14-r1-q07",
  "checks": { "answerCorrect": true, "…": true },
  "checkEvidence": { "answerCorrect": "…", "…": "…" },
  "curriculumSurfaces": { "stem": { "status": "passed", "basis": "…", "officialProvisions": [], "restrictionsReviewed": [] }, "…": {} },
  "unitFamily": { "unitId": "…또는 null", "familyKey": "…또는 null", "basis": "…" },
  "findings": [ { "severity": "blocker|fix|note", "surface": "…", "text": "…" } ],
  "gates": { "loadable": false, "rightsCleared": false, "nativeApproved": false }
}
```

후보 파일·그림·봉인된 풀이는 고치지 않는다. 고칠 것이 있으면 `findings` 에 적는다.
