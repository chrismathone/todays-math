# 개념 백지 사진 채점: 로컬 비교 실험

학생 답을 사진에서 **읽는 단계**와 읽힌 답을 **채점하는 단계**를 분리해서 평가한다. 현재 앱에 자동 채점을 적용하지 않으며 원본 PDF는 수정하지 않는다.

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

`jev.mjs`는 AI SDK 7의 `experimental_evaluate`와 `createGateway().evaluationModel('typesafe-ai/jev')`를 사용한다. 서로 다른 학생 답안은 별도 요청으로 보낸다. 루브릭과 모범 답안을 주되, 실험용 기대 분류는 전달하지 않는다.

첫 실제 요청은 로컬 Gateway 키로 호출했으며 `Free tier users do not have access to this model`로 거절됐다. 완료된 Jev 평가 결과는 **0개**다. 이어 확인한 결과 CLI는 예전 `bigshol` 계정에 로그인돼 있었고, 로컬 프로젝트 연결도 예전 팀을 가리켰다. 사용자가 알려준 `chrismathone` Pro 팀 이전 이력은 `docs/planning/10-handoff.md`의 §0-A.0에서도 확인했다. **이 오류는 현재 운영 Pro 팀의 Jev 접근 여부를 증명하지 않는다.** 별도 CLI 설정 폴더에서 올바른 계정의 인증을 준비했지만, 사용자가 지금은 로그인하기 어렵다고 하여 대기를 종료했다. 결제·키 교체·프로젝트 재연결은 수행하지 않았다. 후속 실험은 `chrismathone` 인증과 올바른 프로젝트의 Gateway 설정 확인부터 이어간다.

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

저장소 루트에서 실행한다. Node 24, PyMuPDF, 로그인된 Codex / Antigravity CLI가 필요하다. Codex는 기존 ChatGPT 로그인으로 강제하고 자식 프로세스에서 `OPENAI_API_KEY`를 제거한다. Jev만 프로젝트의 기존 `AI_GATEWAY_API_KEY`를 사용한다.

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

Jev 접근이 해결된 뒤 새 출력 폴더로 실행:

```powershell
node --env-file=.env scripts/qa/concept-photo-bench/jev.mjs semantic scripts/qa/concept-photo-bench/semantic-cases.json .qa-artifacts/concept-photo-bench/jev-semantic-2
node --env-file=.env scripts/qa/concept-photo-bench/jev.mjs ocr .qa-artifacts/concept-photo-bench/run-2 .qa-artifacts/concept-photo-bench/jev-ocr-2 all .qa-artifacts/concept-photo-bench/samples/manifest.json
```

마지막 선택 인자로 사진 실험과 semantic 실험의 건수를 제한할 수 있다. 인증·크레딧 오류에서는 즉시 중단한다. 재실험은 새 출력 폴더를 사용한다. 새 실행에는 입력 해시가 저장되며 다른 입력의 기존 결과를 캐시로 재사용하지 않는다. 최초 파일럿은 해시 도입 전 자료이므로 `results` 폴더를 재실행에 사용하지 않는다.

보고서는 `report.html`과 `report.json`이다. 첫 보고서에는 사진과 모델의 원문이 들어 있으므로 원본과 같은 범위에서 취급한다. 공유용 비식별 집계는 `pilot-summary.json`에 보존한다.

## 제품에 적용할 때

기존 `sheetCode`로 문항·개념 버전을 복원하고, 문항 영역별로 사진을 읽어 관찰 결과를 보존한다. 빈 답, 판독 불가, 체크와 필기 충돌을 구분한다. 확실한 선택 번호는 정답표와 비교하고, 개념 서술은 교사 루브릭으로 별도 채점한다. 불확실한 결과는 원본 크롭과 함께 교사에게 보여준다. 모델의 자신감 수치를 곧바로 자동 채점 승인 기준으로 삼지 않는다.

후속 자료에서는 개념 백지 5개 형식(recall/term/cloze/map/figure)을 포함하고, 독립적인 교사 라벨을 먼저 확정한다. 학생·시험지 단위로 개발용과 평가용을 나누며, 정답을 미작성·판독 불가에 채워 넣는 비율과 교사 검토량을 함께 측정한다.
