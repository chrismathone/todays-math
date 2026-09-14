# 맞붙은 인라인 수식 정규화 결함 처리 보고

작성일: 2026-09-14 · 인계 문서: [math-glue-handoff.md](../docs/qa/math-glue-handoff.md)

## 결과와 범위

`todays-math`의 적재 정규화기가 `$A$$B$`에서 닫는 `$`를 건너뛰던 결함을 수정했다. 정상 입력을 그대로 보존하고, 반복 실행해도 달러 기호가 늘어나지 않는다. 원본 `mathg-gen`에서도 같은 합성 입력을 실행했으며, 별도로 발견된 정답 수식 누락과 닫히지 않은 `$$` 뒤의 중복 감싸기를 함께 수정했다. 두 저장소의 코드 커밋은 각각 main에 fast-forward 병합했다.

이번 작업에서 **DB 조회·쓰기, 76행 수리·재적재·재정규화, 제품의 OCR·해설 생성을 위한 모델 API/구독 CLI 호출은 하지 않았다.** 아래 데이터 수리 절차는 실행하지 않은 제안이다. 코드 수정이 이미 저장된 내용을 자동으로 복구하지는 않는다.

## 원본과 이식본의 관계

원본 기준 커밋은 `9b52813710ab62748d6129787408c69738a166fe`, 이식본 기준 커밋은 `dbe1d77f8a8ec41a00e4f95e40d2556949cb1759`이다. 원본의 `sanitize.ts`와 `textPreprocess.ts`에는 이식본의 `mapSpans`나 `open === "$" && text[end + 1] === "$"` 규칙이 없다.

| 입력/경로 | 수정 전 이식본 | 수정 전 원본 | 수정 후 |
|---|---|---|---|
| `따라서 $\frac{N}{M}$$\angle CAM=15°$ 이다.` | 달러 기호 삽입, 반복할수록 변형 | `sanitizeText`/`sanitizeAnswer` 모두 원문 보존 | 양쪽 적재 단계에서 원문 보존 |
| 위 입력에서 `°`만 제거 | 달러 기호 삽입 | 원문 보존 | 양쪽 원문 보존 |
| `$a=1$$b=2$$c=3$ 이다.` | 원문 보존 | `sanitizeText`는 정상, `sanitizeAnswer`는 가운데 수식을 내부 표식으로 바꿈 | 양쪽 본문·정답 경로 모두 원문 보존 |
| `값은 $$\angle CAM=15° 이다.` | 느슨한 LaTeX로 처리해 추가로 감쌈 | 두 sanitizer가 `값은 $$$\angle$ CAM=15° 이다.`로 바꿈 | 불명확한 수식 꼬리를 그대로 보존 |
| 공백으로 분리한 수식 / 정상 `$$\frac{N}{M}$$` | 정상 | 정상 | 기존 동작 유지 |

원본 정답 경로의 정확한 실패 출력은 `$a=1<U+E002>B0<U+E002>c=3$ 이다.`였다. 여기서 `<U+E002>`는 실제 내부 문자 위치를 사람이 읽도록 표기한 것이다. display와 inline을 따로 마스킹하면서 표식이 중첩되어 `b=2`가 유실됐다. 이는 이식본의 달러 증가와 다른 원인이다. 원본에서 관찰한 8개 합성 입력·8개 경로는 첫 실행 후 5회까지 안정적이었지만, 일부 첫 출력 자체가 틀렸다. 멱등성만으로 정확성을 판정하지 않았다.

원본 `preprocessMathText`는 표시 단계에서 수식 사이 공백과 `\displaystyle`, 직립 기하 라벨 등을 넣는다. 이 의도된 표시 변환도 정확한 기대값과 5회 반복으로 검증했으며, 해당 파일은 수정하지 않았다. 상세 원문·1회·2회·5회 출력과 검사 증거는 `D:/mathg-gen/scripts/mathGlueEvidence.json`에 있다.

## 고친 규칙

1. **이식본 `src/lib/math/normalizeMathgenText.ts`**: inline 수식에 들어간 뒤에는 다음 이스케이프되지 않은 `$`를 닫는 구분자로 소비한다. 뒤에 또 `$`가 있다는 이유로 건너뛰지 않는다. 따라서 B의 LaTeX가 산문으로 떨어져 `protectLooseLatex`에서 다시 감싸지는 경로가 사라진다.
2. 같은 파일에서 닫는 구분자가 없는 `$$`를 만나면, 그 앞 산문만 처리하고 불명확한 꼬리는 그대로 남긴다. 전역 `$$` 치환이나 손상된 수식의 추측 복원은 하지 않는다. 기존 `repairProsePrefixedInlineMath`가 먼저 실행되므로 `\displaystyle $$이동 거리= $x(b)-x(a)=8.$` 수리는 유지된다.
3. **원본 `src/services/ai/sanitize.ts`**: 정답 쉼표 처리에 기존 sanitizer의 좌→우 수식 분리 규칙을 재사용해 중첩 마스킹을 없앴다. 완결된 수식을 분리한 뒤 산문에 남은 `$$` 이후에는 느슨한 명령어 감싸기를 멈춘다. 기존 HTML escape, 표 보존, 일반 산문 쉼표 처리는 유지한다.
4. 이식본 파일 머리말의 “렌더와 공유” 설명을 실제 용도인 적재 단계로 정정했다. 확인된 호출부는 `src/lib/mathgen/ocr.ts`와 `src/lib/dev-ai/tasks.ts`이며, 렌더 호출부는 없다. Native OCR 및 CLI/API 공용 결과 파싱 경로를 합성 응답으로 검증했다.

## 검증

| 구분 | 결과 |
|---|---|
| 이식본 기존 계약, 수정 전 | 기존 파일 **40/40 통과**: 결함을 잡지 못하는 상태 확인 |
| 이식본 RED | 제품 코드 수정 전 신규 회귀 **16개 중 9개 실패** |
| 이식본 최종 GREEN | 기존 **40/40** + 신규 **20/20**, 합계 **60/60 통과** |
| 이식본 변이 1: inline 닫는 `$` 건너뛰기 복원 | 실제 코드와 출력이 바뀌고 신규 **20개 중 12개 실패** |
| 이식본 변이 2: 닫히지 않은 display 보호 제거 | 실제 코드와 출력이 바뀌고 신규 **20개 중 1개 실패** |
| 이식본 변이 후 복원 | 원본 바이트/SHA-256 일치 확인, 최종 **60/60 재통과** |
| 이식본 정적 검사 | 변경 4개 파일 ESLint 통과, 전체 `tsc --noEmit --incremental false` 통과 |
| 원본 RED → GREEN | 신규 검사 **47/56 → 56/56 통과** |
| 원본 변이: 옛 정답 마스킹 / display 보호 제거 | 각각 **3/56**, **6/56 실패**, 바이트 단위 복원 후 **56/56 재통과** |
| 원본 기존 검사 | KaTeX 수식 21 + fallback 16 + 조건 상자 5 = **42/42 통과**, 측정 단위 harness 통과 |

이식본 신규 20개에는 인계 입력 6개를 두 정규화 함수에 10회씩 적용하는 검사, 실제 inline 토큰 경계, 정상 display/inline 혼합, 이스케이프된 달러, SVG·표·코드 보존, 느슨한 LaTeX 보정 유지, Native OCR 변환과 `ocr`/`page-ocr`/`solution` 결과 파싱 검사가 포함된다. 초기 RED 16개 이후 실제 호출부 검사 4개를 추가했다. 원본은 정확한 출력과 내부 표식 누출 여부를 5회씩 검증한다.

재현 명령은 각 저장소 루트에서 실행한다. 변이 스크립트는 소스를 일시 변경하므로 작업이 없는 별도 브랜치/워크트리에서만 실행하며 main/master 실행을 거부한다. 다음 명령은 DB나 모델을 사용하지 않는다.

```powershell
# todays-math
node node_modules/vitest/vitest.mjs run src/__tests__/unit/normalizeMathgenText.test.tsx src/__tests__/unit/normalizeMathgenText.glue.test.ts
node node_modules/tsx/dist/cli.mjs scripts/qa/check-math-glue.ts
node scripts/qa/mutate-math-glue.mjs

# mathg-gen
node node_modules/tsx/dist/cli.mjs scripts/mathGlueHarness.mts
node node_modules/tsx/dist/cli.mjs scripts/katexRenderHarness.mts
node node_modules/tsx/dist/cli.mjs scripts/measurementUnitsHarness.mts
```

이식본 실행 로그, 최종 GREEN JSON 및 변이별 출력·실패 수·복원 SHA는 `D:/todays-math/.qa-artifacts/math-glue-20260914/`에 보관했다. 원본 증거 JSON과 회귀 harness는 원본 코드와 함께 커밋했다.

## 커밋

| 저장소 | 코드 커밋 | main 반영 |
|---|---|---|
| `D:/todays-math` | `c3f819aef3b8dbb85ca4f9c54a8d2980c4cae9d1` | 완료 |
| `D:/mathg-gen` | `b2dfa5f89d6a6f1ad7fe928d541a920c487672be` | 완료 |

## 76행 수리안 — 미실행

### 먼저 수리 대상 판정을 보완해야 한다

인계 문서의 전체 100,891행, 후보 76행, 풀이 48·본문 28, 접두사 11종이라는 수치는 **인계받은 값이며 이번 작업에서 DB로 재조회하지 않았다.** `scratch/probe-glue-scope.ts`의 코드만 읽고 판정식을 합성 입력에 대입했다.

기존 판정은 `text.includes("$$") && tokenizeMath(text).every(seg => seg.type !== "display")`이다. 이는 정상적인 `$A$$B$`도 잡는다. 실제 수정 후 원문 보존·멱등성 검사를 통과한 인계 입력 1·2·3도 이 조건에 걸린다. 따라서 “진짜 display가 없으니 76행 전부 손상”이라는 결론은 이 조건만으로 성립하지 않는다. **76행은 검토 후보 집합으로 취급하고, 확정 손상 행 수는 미정으로 남긴다.** 단순 `$$` 개수 감소를 성공 기준으로 삼지 않는다.

### 향후 별도 승인 후의 절차

1. 당시 후보 목록과 현재 상태를 읽기 전용으로 대조하고, 정확한 ID·문항코드·대상 필드·원문 바이트·`updatedAt`·SHA-256을 스냅샷으로 고정한다. content/solution별 수와 행 합집합 수를 분리한다. 후보 수가 바뀌었으면 범위를 자동 확장하지 않는다.
2. 원본 OCR/적재 전 JSON 또는 검증된 문서의 해당 문항과 대조한다. 정상 인접 수식은 `no-op`, 근거로 복구 가능한 손상만 `proposed`, 근거가 부족한 것은 `unresolved`로 분류한다. 이미 손상된 DB 문자열을 정규화기에 다시 넣거나 `$`를 일괄 줄여 복원안을 만들지 않는다.
3. 각 필드의 변경 전·후와 원문 근거를 사람이 검토할 수 있게 제시한다. 복원안의 수식·숫자·문장·실제 display 경계를 대조하고 오프라인 렌더도 확인한다. 반복 정규화 검사는 오염 전 합성/원본 입력에서 수행한다. `unresolved`는 쓰기 대상에서 제외한다.
4. 아래 형식의 **실행별 되돌리기 원장**을 먼저 저장하고 커밋한다. 원장과 구체적인 변경 전·후 목록을 바탕으로 원장님의 별도 승인을 받기 전에는 DB를 쓰지 않는다. 이번 보고서는 그 승인을 대신하지 않는다.
5. 승인된 필드만 트랜잭션에서 변경한다. ID·필드·변경 전 원문/hash·`updatedAt`가 스냅샷과 일치할 때만 갱신하고, 불일치 시 중단해 동시 편집을 보존한다. 재실행 시 이미 승인된 after 값이면 no-op, 그 외 차이는 자동 덮어쓰지 않는다. 변경 수와 승인된 항목 수를 대조한다.
6. 되돌리기는 현재 값이 해당 실행의 after와 일치하는 항목만 최초 before로 복원한다. 다른 세션의 후속 변경은 충돌로 남긴다. 실행·검증·rollback 사건을 별도 append-only 로그에 추가한다.

원장 형식 예시(실제 행 데이터가 없는 스키마):

```json
{
  "schemaVersion": 1,
  "runId": "<unique repair run id>",
  "status": "planned",
  "createdAt": "<timestamp>",
  "databaseFingerprint": "<non-secret database identifier>",
  "codeCommit": "<reviewed repair code SHA>",
  "snapshotSha256": "<immutable snapshot hash>",
  "approvedBy": null,
  "approvedAt": null,
  "entries": [
    {
      "id": "<row id>",
      "problemCode": "<code>",
      "field": "content | solution",
      "before": "<exact original stored text>",
      "beforeSha256": "<hash>",
      "beforeUpdatedAt": "<timestamp>",
      "proposedAfter": "<reviewed text or null>",
      "afterSha256": "<hash or null>",
      "evidence": { "source": "<original file>", "sha256": "<hash>", "location": "<page/problem>" },
      "decision": "no-op | proposed | unresolved",
      "appliedAt": null
    }
  ]
}
```

실행마다 `runId`에 대응하는 고유한 새 파일을 만들고 기존 원장을 덮어쓰지 않는다. 동일 ID·필드의 최초 before는 유지하고 복원안 수정·실제 after·충돌·rollback 결과를 실행 이벤트로 추가한다. 새 실행도 기존 원장을 참조해 최초 복구 지점을 보존한다. 이 원장 파일 자체와 DB 수리 코드는 이번 작업에서 생성하거나 실행하지 않았다.
