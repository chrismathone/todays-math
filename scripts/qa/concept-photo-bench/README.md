# 개념 백지 사진 채점: 로컬 비교 실험

학생 답을 사진에서 **읽는 단계**와 읽힌 답을 **채점하는 단계**를 분리해서 평가한다. 현재 앱에 자동 채점을 적용하지 않으며 원본 PDF는 수정하지 않는다.

## 2026-11-24 개념 백지 스캔 확장

기존 파일럿의 PDF 전체 렌더·구독 CLI 길을 확장했다. [사전 등록](scan-protocol.md),
[결과 보고서](../../../docs/planning/tracks/reports/cb-scan-read.md)를 먼저 읽는다.
새 스캔은 선택형 파일럿의 참값·정답표를 쓰지 않는다. 원본의 이름 줄을 가린 뒤
Sonnet/Opus의 독립 판독 일치만 참값 **후보**로 삼고, 불일치는 사람 확인 대기다.
`scan-inventory.json`은 원본의 인쇄 답란을 별도로 센 비식별 위치 목록이다.

새 도구는 유료 API를 호출하지 않는다. `claude auth status`의 구독 로그인과 실제
5.5 모델 ID를 확인한다. 기존 Jev/Gateway 실행 명령은 이 측정에 사용하지 않는다.
한 실행의 모델 호출은 최대 3개이며 서로 다른 모델 실행 스크립트를 동시에 켜지 않는다.
브라우저나 운영 빌드는 필요 없다. Python PyMuPDF/Pillow/NumPy, macOS Apple Vision,
로그인한 Claude CLI가 필요하다. 이미지를 포함한 모든 출력 경로는 저장소 밖이어야 한다.

```sh
# PRIVATE는 원본 폴더 아래 out/scan-read 같은 저장소 밖 전용 폴더다.
python scan-prepare.py render SOURCE PRIVATE
# 자동 이름 표지 탐지가 실패하면 가림을 확인한 다음에만 명시적으로 지정한다.
python scan-prepare.py render SOURCE PRIVATE --reviewed-header-bottom 0.12
python scan-prepare.py variants SOURCE PRIVATE --pages d1-p01,d1-p04,d1-p05,d1-p06,d1-p07,d1-p08,d2-p02,d2-p05
node scan-run.mjs reference PRIVATE
node scan-run.mjs boxes PRIVATE
python scan-crops.py PRIVATE
# crop-review.jpg의 실제 크롭 경계를 확인한다.
node scan-run.mjs screen PRIVATE
node scan-run.mjs finalists PRIVATE
node scan-semantic.mjs PRIVATE
node scan-contamination.mjs PRIVATE
node scan-run.mjs summarize PRIVATE
node scan-report.mjs PRIVATE
```

명령은 이 폴더에서 실행하거나 파일 앞에 `scripts/qa/concept-photo-bench/`를 붙인다.
`reference`는 16회, `boxes`는 24회, `screen`은 576쪽 시행이다(문항별 팔은 쪽마다
여러 호출). `finalists`는 사전 등록 순위의 상위 두 조합과 whole/raw-high 대조군을
세 모델의 low/high로 각 3회 측정한다. 같은 screening 시행을 다시 독립 시행으로 세지 않는다.
중간 오류 검토에서 발견한 표기 차이는 [채점 수정 v1.1](scan-scoring-v1.1.md)에 따로 고정했다.
원래 점수와 수정 점수의 상위 두 조합 합집합을 최종 격자에 포함한다. 참값 후보와 독립 2회
판독의 보류 판정은 수정하지 않는다. 각도 기호만 빠진 경우는 경미한 단위 누락 열로 분리한다.
전체 측정 후 발견한 `60˚` 1건은 [사후 수정 v1.2](scan-scoring-v1.2.md)로 집계에서만
면제한다. 시행 파일과 최종 격자 선택의 v1.1 점수는 유지하고 보고서에 두 점수를 남긴다.
`semantic-cases.json.currentBankSuite`의 36개 합성 답은 현재 은행에서 문항과 루브릭을
읽는다. 기존 12개 `cases`와 그 시험은 그대로 유지한다.

계획·이미지 해시가 달라지면 새 출력 폴더를 쓴다. 성공 파일을 지우고 같은 실행 번호로
재호출하지 않는다. JSON 형식 실패도 시행 분모와 비용에 포함한다. `summary.json`의
`newPage*`는 측정된 읽기와 Opus high 위치 검출의 시간·환산 비용을 합한 **신규 사진
시나리오**다. CLI 시작·서비스 요청 전송·응답 시간은 포함하고, 이미지 준비와
폰에서 서버로 보내는 시간은 제외한다. 실제 모바일/운영 API 지연은 아니다.
두 번 독립 읽기는 호출 상한을 지키기 위해 직렬로 쟀다.

```sh
node --test scripts/qa/concept-photo-bench/scan-core.test.mjs scripts/qa/concept-photo-bench/scan-artifacts.test.mjs scripts/qa/concept-photo-bench/pipeline.test.mjs
```

## 2026-10-02 파일럿

기출 시험지 PDF 3개에서 문항 10개를 잘라 기존 Antigravity / ChatGPT 구독 CLI로 각 1회 실행했다. 두 PDF에는 손글씨가 있고 한 PDF는 미작성 대조군이다. 이름·학교 머리말은 크롭에서 제외했다. 필기자와 실제 채점 시점은 확인되지 않았다.

| 모델                    | 상태+선택 번호 일치 | 애매한 기준 1개 제외 | 확인 필요로 전달 | CLI 중앙 시간 |
| ----------------------- | ------------------: | -------------------: | ---------------: | ------------: |
| Gemini 3.8 Flash low    |               10/10 |                  9/9 |                1 |        19.2초 |
| Gemini 3.8 Flash medium |                9/10 |                  8/9 |                2 |        28.4초 |
| GPT-6 Luna medium       |                6/10 |                  6/9 |                4 |         6.0초 |
| GPT-6.1 Sol medium      |               10/10 |                  9/9 |                1 |        12.1초 |

이는 교사 검증 전 임시 기준과의 일치 건수다. 개념 서술 채점 정확도나 모집단 정확도로 해석할 수 없다. 상태와 번호를 동시에 맞혀야 일치이므로 보수적으로 검토를 요청한 경우도 불일치에 포함한다. 각 모델 그룹은 병렬 실행했으며 CLI의 초기화와 도구 실행 시간이 포함된다. API 응답 속도로 해석하지 않는다.

- 선택 체크와 손글씨가 충돌하는 문항은 모두 확인 필요로 보냈다.
- Luna는 최종 번호를 읽고도 불필요하게 검토로 보낸 2개 사례가 있었다. 또 한 사례에서는 손글씨 `1`을 읽었지만 `choice=null`을 반환했다. 이 조합은 코드에서 검토로 처리한다.
- `blank-q6`은 인쇄 얼룩인지 답 표시인지 원본 스캔만으로 단정하기 어려워 사후 민감도 분석에서 제외했다. 원래 임시 라벨과 모든 모델 응답은 그대로 보존했다. 이 문항의 Luna 자동 답 판정을 확정 오판이라고 단정하지 않는다.
- Flash medium은 흐린 필기 한 문항을 검토로 보냈다. 이 표본에서는 추론 강도를 높인 이득이 없었다.

초기 기본 후보는 Flash low, 애매한 사진의 재검토 후보는 Sol이다. Luna는 더 저렴하지만 이 작은 실험만으로 사진 자동 판독의 기본값으로 정하지 않는다. 실제 개념 백지와 교사가 확정한 채점 기준으로 후속 평가가 필요하다.

## Jev / Vercel

`jev.mjs`는 `--provider typesafe`로 공식 HTTP API(`https://api.typesafe.ai/v1/systemone`)를 직접 호출한다. 기본 `--provider gateway`는 AI SDK 7의 `experimental_evaluate`와 `createGateway().evaluationModel('typesafe-ai/jev')`를 사용한다. 서로 다른 학생 답안은 별도 요청으로 보낸다. 루브릭과 모범 답안을 주되, 실험용 기대 분류는 전달하지 않는다.

### TypeSafe 직접 연결 결과

사용자가 제공한 `TYPESAFE_API_KEY`로 **52개 요청이 성공**했다. `jev-latest`를 요청했고 전부 `jev-1.13.0`으로 응답했다.

| 실험                       | 결과                                         | HTTP 중앙 시간 |
| -------------------------- | -------------------------------------------- | -------------: |
| 합성 한국어 개념 답안 12개 | 기대 분류 12/12 일치                         |        0.194초 |
| 기존 사진 판독 결과 40개   | 임시 기준 35/40, 결정적 비교 규칙 40/40 일치 |        0.200초 |

표현이 다른 정답, 약수/배수 혼동, 1을 소수로 보는 오개념, 조건 누락의 부분점수, 기약분수 형식, 빈 답, 판독 불가, 답안에 섞인 명령을 모두 준비한 기준대로 분류했다. 이는 명시적인 루브릭을 둔 합성 예시의 기능 확인이며, 실제 학생 개념 답안 정확도나 Gemini/Luna 대비 우위를 증명하지 않는다.

사진 후속 채점은 Flash low 10/10, Flash medium 9/10, Luna 6/10, Sol 10/10으로 기존 규칙의 결과와 같았다. 판독기가 요청한 검토를 다른 분류로 바꾼 경우는 0건이다. 이 선택형 표본에서는 Jev 추가로 얻는 정확도 개선이 관찰되지 않았다. 개념 서술 채점 후보로는 후속 검증 가치가 있다.

합계 입력 39,547토큰, 출력 2,704토큰을 기록했다. 청구 금액은 확인하지 않았다. confidence는 정답률이 아니며 교사 확인 없이 자동 승인하는 임계값으로 사용하지 않았다. 상세 결과는 HTML 보고서와 `typesafe-direct-summary.json`에 보존했다.

### 앞선 Gateway 접근 실패 이력

앞선 Gateway 요청은 로컬 Gateway 키로 호출했으며 반복 확인에서도 `Free tier users do not have access to this model`로 거절됐다. Gateway 경유로 완료된 Jev 평가 결과는 **0개**다. 사용자 화면은 `Injaewon's projects · Pro`와 활성 키를 보여 주며, 화면의 키 끝자리도 로컬 키와 일치한다. 따라서 잘못된 팀의 키라고 추정했던 초기 진단은 철회한다. CLI는 예전 계정이지만, Gateway 키로 직접 호출할 때 CLI 로그인은 필요하지 않다.

**Vercel Pro 구독과 AI Gateway의 무료/유료 크레딧 등급은 별개다.** [공식 가격 문서](https://vercel.com/docs/ai-gateway/pricing)에 따르면 무료 등급은 일부 모델만 지원하며 Gateway 크레딧 구매로 유료 등급으로 전환된다. 확인된 사실은 이 키의 Jev 요청이 Gateway 무료 등급으로 판정된다는 것이다. 다음 확인 대상은 해당 팀의 Gateway 크레딧 구매 이력과 유료 등급 반영 상태다. 이미 구매했다면 Vercel 측 상태 확인이 필요하다. 결제·키 교체·프로젝트 재연결은 수행하지 않았다.

Jev는 텍스트 평가 모델이므로 사진 판독기를 대체하지 않는다. 공식 문서는 영어 중심 학습과 CJK에서의 낮은 정확도를 설명한다. 한국어 개념 답안은 반드시 직접 평가해야 한다. `semantic-cases.json`은 동의 표현, 오개념, 부분점수, 답 형식, 빈 답, 판독 불가, 답안 내부 지시문을 포함한 **합성 텍스트 12개**이며 실제 학생 결과가 아니다.

선택 번호 채점은 결정적 비교로 충분하다. Jev는 의미가 같은 서술 답을 인정하는 등 텍스트 루브릭 평가의 후보로 둔다. 입력 글이 잘못 읽혔으면 Jev가 원본 사진을 보고 복구할 수 없다.

## 비용

아래는 2026-10-02 확인한 API 단가이며 이번 구독 CLI 사용량의 청구액이 아니다. 단위는 USD / 100만 토큰이다.

| 모델                              | 입력 |  출력 |
| --------------------------------- | ---: | ----: |
| GPT-6 Luna                        | 0.10 |  0.50 |
| Gemini 3.8 Flash (2026-12-31까지) | 0.75 |  3.75 |
| Gemini 3.8 Flash (2027-01-01부터) | 1.50 |  7.50 |
| GPT-6.1 Sol                       | 2.00 | 10.00 |

입력 이미지와 추론 토큰 수가 달라 장당 비용은 API 실측이 필요하다. Antigravity의 `usage.output`에는 이미 `usage.reasoning`이 포함돼 있어 두 값을 더하지 않는다. CLI 에이전트 문맥 토큰을 제품의 직접 API 호출 토큰으로 간주하지 않는다.

출처: [Google 가격](https://ai.google.dev/gemini-api/docs/pricing), [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Jev 입력과 언어](https://docs.typesafe.ai/concepts/state), [AI SDK 평가](https://ai-sdk.dev/docs/ai-sdk-core/evaluation), [Vercel Gateway 요금제](https://vercel.com/docs/ai-gateway/pricing).

## 다시 실행하기

저장소 루트에서 실행한다. Node 24, PyMuPDF, 로그인된 Codex / Antigravity CLI가 필요하다. Codex는 기존 ChatGPT 로그인으로 강제하고 자식 프로세스에서 `OPENAI_API_KEY`를 제거한다. Jev 직접 호출은 `TYPESAFE_API_KEY`, Gateway 호출은 `AI_GATEWAY_API_KEY`를 사용하며 서로 자동 대체하지 않는다.

원본 경로·라벨·이미지·모델 원문은 Git에서 제외된 `.qa-artifacts/concept-photo-bench/` 아래에 둔다. 예시 레시피:

```json
{
  "cases": [
    {
      "id": "sample-1",
      "pdf": "C:/private/exam.pdf",
      "page": 1,
      "box": [0.1, 0.2, 0.5, 0.6],
      "questionNumber": "1",
      "category": "handwritten",
      "expected": { "status": "answered", "choice": 2 },
      "answerKey": 2
    }
  ]
}
```

`page`는 1부터, `box`는 페이지 폭·높이에 대한 비율이다. 크롭은 전송 전에 사람이 확인한다. `labelUncertain: true`는 민감도 분석에서 제외할 기준을 표시한다.

```powershell
python -X utf8 scripts/qa/concept-photo-bench/prepare.py .qa-artifacts/concept-photo-bench/recipe.json .qa-artifacts/concept-photo-bench/samples
node scripts/qa/concept-photo-bench/run.mjs .qa-artifacts/concept-photo-bench/samples/manifest.json .qa-artifacts/concept-photo-bench/run-2 gpt-6-luna medium
node scripts/qa/concept-photo-bench/run.mjs .qa-artifacts/concept-photo-bench/samples/manifest.json .qa-artifacts/concept-photo-bench/run-2 gpt-6.1-sol medium
node scripts/qa/concept-photo-bench/run.mjs .qa-artifacts/concept-photo-bench/samples/manifest.json .qa-artifacts/concept-photo-bench/run-2 gemini-3.8-flash-low low
node scripts/qa/concept-photo-bench/run.mjs .qa-artifacts/concept-photo-bench/samples/manifest.json .qa-artifacts/concept-photo-bench/run-2 gemini-3.8-flash-medium medium
node scripts/qa/concept-photo-bench/report.mjs .qa-artifacts/concept-photo-bench/samples/manifest.json .qa-artifacts/concept-photo-bench/run-2
```

TypeSafe에서 직접 발급받은 키를 `.env`의 `TYPESAFE_API_KEY`에 저장하고 실행:

```powershell
node --env-file=.env scripts/qa/concept-photo-bench/jev.mjs semantic scripts/qa/concept-photo-bench/semantic-cases.json .qa-artifacts/concept-photo-bench/typesafe-semantic-2 --provider typesafe
node --env-file=.env scripts/qa/concept-photo-bench/jev.mjs ocr .qa-artifacts/concept-photo-bench/results .qa-artifacts/concept-photo-bench/typesafe-ocr-2 all .qa-artifacts/concept-photo-bench/samples/manifest.json --provider typesafe
node scripts/qa/concept-photo-bench/report.mjs .qa-artifacts/concept-photo-bench/samples/manifest.json .qa-artifacts/concept-photo-bench/results .qa-artifacts/concept-photo-bench/typesafe-semantic-2/summary.json .qa-artifacts/concept-photo-bench/typesafe-ocr-2/summary.json
```

기본 경로는 TypeSafe 직접 API다. 기존 Gateway 경로는 해당 서비스의 접근이 해결된 뒤 `--provider gateway`를 명시하고 새 출력 폴더로 실행:

```powershell
node --env-file=.env scripts/qa/concept-photo-bench/jev.mjs semantic scripts/qa/concept-photo-bench/semantic-cases.json .qa-artifacts/concept-photo-bench/jev-semantic-2 --provider gateway
node --env-file=.env scripts/qa/concept-photo-bench/jev.mjs ocr .qa-artifacts/concept-photo-bench/run-2 .qa-artifacts/concept-photo-bench/jev-ocr-2 all .qa-artifacts/concept-photo-bench/samples/manifest.json --provider gateway
```

마지막 선택 인자로 사진 실험과 semantic 실험의 건수를 제한할 수 있다. 인증·크레딧 오류에서는 즉시 중단한다. 재실험은 새 출력 폴더를 사용한다. 새 실행에는 입력 해시가 저장되며 다른 입력의 기존 결과를 캐시로 재사용하지 않는다. 최초 파일럿은 해시 도입 전 자료이므로 `results` 폴더를 재실행에 사용하지 않는다.

보고서는 `report.html`과 `report.json`이다. 첫 보고서에는 사진과 모델의 원문이 들어 있으므로 원본과 같은 범위에서 취급한다. 공유용 비식별 집계는 `pilot-summary.json`에 보존한다.

## 제품에 적용할 때

기존 `sheetCode`로 문항·개념 버전을 복원하고, 문항 영역별로 사진을 읽어 관찰 결과를 보존한다. 빈 답, 판독 불가, 체크와 필기 충돌을 구분한다. 확실한 선택 번호는 정답표와 비교하고, 개념 서술은 교사 루브릭으로 별도 채점한다. 불확실한 결과는 원본 크롭과 함께 교사에게 보여준다. 모델의 자신감 수치를 곧바로 자동 채점 승인 기준으로 삼지 않는다.

후속 자료에서는 개념 백지 5개 형식(recall/term/cloze/map/figure)을 포함하고, 독립적인 교사 라벨을 먼저 확정한다. 학생·시험지 단위로 개발용과 평가용을 나누며, 정답을 미작성·판독 불가에 채워 넣는 비율과 교사 검토량을 함께 측정한다.

## 같은 사진으로 전체 처리 시간 비교

`pipeline.mjs`는 A(Gemini 판독·채점 한 번)와 B(Gemini 판독 → Jev 채점)를 비교한다. 두 방식의 Gemini는 모두 기존 Antigravity CLI 구독의 `gemini-3.8-flash-low`다. B의 채점은 `TYPESAFE_API_KEY`를 쓰는 TypeSafe 직접 API의 `jev-latest`다. API 키는 Gemini 자식 프로세스 환경에서 제거한다.

사진 10장을 방식별 3회씩 총 60회 새로 호출한다. 사진별 A/B를 연속 실행하면서 순서를 번갈아 배치하고, 회차마다 사진 순서를 순환한다. 호출은 직렬로 진행한다. 실행 전 `plan.json`에 순서, 프롬프트, 이미지 해시를 저장한다. 각 호출은 새 전용 작업 폴더를 사용한다. 동일한 계획으로 재개하면 완료된 시도의 원래 측정값을 유지하며 새로운 독립 시행으로 세지 않는다. 프롬프트·이미지·모델·라벨이 달라지면 재개를 거절한다.

A에는 판독과 함께 정답표·채점 규칙을 주고, B는 Gemini 판독을 마친 다음 Jev에 정답표를 준다. 기대 판정 라벨은 모델에게 보내지 않는다. A와 B의 모델 판정을 코드로 교정하지 않고, 별도로 임시 기준 및 결정적 비교와의 일치를 기록한다. 정답표 노출 단계 차이에 따른 판독 변화도 이 비교의 일부다.

타이머는 이미지 준비 직전부터 최종 판정 파싱까지다. Gemini CLI 시작, 이미지 도구, 어댑터 로그 저장 시간도 포함한다. 각 시도의 결과 JSON 저장과 통계 계산은 제외한다. 일반 Gemini API의 지연이나 실제 제품의 처리량을 측정한 것이 아니다. 실패는 전체 시도 분모에 남기며 시간 차이는 양쪽 성공 쌍에서만 계산한다. 자동 재시도는 없다.

```powershell
node --test scripts/qa/concept-photo-bench/pipeline.test.mjs
node --env-file=.env scripts/qa/concept-photo-bench/pipeline.mjs .qa-artifacts/concept-photo-bench/samples/manifest.json .qa-artifacts/concept-photo-bench/pipeline-new 3
node scripts/qa/concept-photo-bench/pipeline-report.mjs .qa-artifacts/concept-photo-bench/pipeline-new
```

`summary.json`은 중앙값·평균·90백분위, 판독/채점 일치, 실패 수, 동일 사진·회차의 B−A 차이, 실행 순서별 결과, 불확실 라벨 제외 결과를 담는다. 95% 참고 구간은 사진 단위로 반복을 함께 묶어 10,000회 재추출한 평균 차이의 백분위다. 같은 사진 3회를 독립 사진 3장으로 세지 않는다. `report.html`은 모든 시도와 원문 판독을 보여 주므로 비공개로 보관한다.

이 자료의 선택 번호 채점은 정답표와 코드로 비교하면 충분하다. Jev 추가 호출이 필요한 의미 채점·부분점수 또는 실제 개념 백지 사진의 속도와 정확도를 이 실험으로 주장하지 않는다.

### 2026-10-02 실측 결과

60회 모두 응답했고, 이번 표본에서는 전체 채점 속도 개선을 확인하지 못했다. Gemini는 양쪽 모두 Antigravity 구독 CLI이며 Jev 응답 모델은 전부 `jev-1.13.0`이었다.

| 방식                      | 횟수 | 전체 중앙값 | 전체 평균 | 90백분위 | 임시 채점 기준 일치 |
| ------------------------- | ---: | ----------: | --------: | -------: | ------------------: |
| A: Gemini 판독·채점       |   30 |     17.67초 |   17.74초 |  19.97초 |               27/30 |
| B: Gemini 판독 → Jev 채점 |   30 |     17.94초 |   19.65초 |  20.07초 |               28/30 |

Jev 단계 중앙값은 **0.232초**였다. B가 더 빨랐던 쌍은 14/30이며, 쌍별 평균 B−A는 +1.91초, 사진 단위 부트스트랩 95% 참고 구간은 −0.50~+5.86초다. B의 한 건이 75.64초 걸렸는데 Gemini 단계가 75.33초, Jev가 0.31초였다. 이 기록도 제외하지 않았다. 같은 컴퓨터에서 코드 검증도 진행했으며 시스템 부하·제공자 대기열을 통제한 실험실 측정은 아니다.

판정 차이는 처음부터 라벨이 불확실하다고 표시한 `blank-q6`에서만 나왔다. 그 사진을 제외하면 두 방식 모두 **27/27** 일치했다. Jev는 받은 판독 결과에 대해 30/30회 결정적 선택 번호 비교와 같은 판정을 했다. 따라서 이 자료에서 확인된 장점은 추가적인 의미 채점이나 판독 개선이 아니다. 원문·측정 순서는 비공개 보고서, 비식별 집계는 `pipeline-summary.json`에 보존했다.

### 도형 편집 직접 연결 확인

운영 코드 `src/lib/jev/client.ts`도 `TYPESAFE_API_KEY`와 직접 HTTP로 전환했다. 모의 HTTP를 포함한 관련 229개 시험, 병합 후 main의 전체 TypeScript 검사, 최신 개념 백지 은행 70개 시험이 통과했다. 워크트리의 타입 검사는 생성된 Prisma 타입 부족 등으로 실패했으나, 병합된 main의 타입 검사는 성공했다.

별도 합성 도형 명령 3건은 실제 TypeSafe에서 모두 HTTP 200과 `jev-1.13.0` 응답을 받았다. 삭제는 약 295ms에 정확한 명령을 만들었다. 각 표시 요청은 여러 곳 수정으로 분류됐고, 중점 요청은 첫 점을 빠뜨려 두 건 모두 기존 검증에서 `null`로 반환됐다. 이 경우 기존 도형 모델 경로가 처리한다. 문턱을 낮추거나 잘못된 인자를 채워 통과시키지 않았다. 연결 성공 3/3과 빠른 경로 성공 1/3을 구별하며, `typesafe-figure-smoke-summary.json`에 기록했다. 배포·실사용 브라우저 확인은 하지 않았다.
