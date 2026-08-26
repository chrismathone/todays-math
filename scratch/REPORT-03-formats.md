# REPORT-03 — 🅰 형식 파생 · 변형 3개

작성: 2026-08-26
분모: **360** 소단원 (초등 230 + 중등 130)

## 한 줄

단답형 산출 직후 **한 모듈**에서 객·단·서를 파생하고, 문항류마다 변형 3개를 모은다. `familyKey`는 형식에 갈라지지 않는다. 시험 28개 초록. 360곳 전량 센서: 변형 3개는 초등 920갈래 중 919 · 중등 873유형 전부. 객관식 5지는 수 정답만 — 초등 591/920 · 중등 209/873이 변형 3개 모두 객관식을 낸다. 나머지는 단답·서술만 남기고 객관식은 건너뛴 이유를 적는다.

## 모듈

| 파일 | 역할 |
|---|---|
| `src/lib/engine/deriveFormats.ts` | 단답 → 서술형(발문 끝) · 객관식(5지, 계산 실수 오답) |
| `src/lib/engine/variants.ts` | 발문+정답이 다른 변형 n개. 못 채우면 던짐 |
| `src/lib/engine/expandEngine.ts` | 위 둘을 이음. 객관식을 못 만들면 그 변형만 건너뜀 |
| `src/__tests__/unit/deriveFormats.test.ts` | classifyFormat 왕복 · familyKey 불변 · 5지 리터럴 · 999 금지 |
| `src/__tests__/unit/engineVariants.test.ts` | 중복 글자 제외 · 공간 좁으면 throw |
| `src/__tests__/unit/expandEngine.test.ts` | 픽스처 + 초등·중등 실물 각 1갈래, unknown 0 |

`generateElementaryProblem` / `generateMiddleProblem` 본문은 안 바꿨다. 그 산출을 펼칠 뿐이다.

서술형은 `questionType: "서술형"`을 적는다. 엔진 표지(`elem:`/`mid:`)만 있으면 `classifyFormat`이 단답으로 읽기 때문이다. `problemType`은 덮어쓰지 않는다(난이도 축).

## 360곳 센서

`npx tsx scripts/engine/census-expand.ts` → `scratch/census-expand.json`

분모 검산: elemSections 230 + midSections 130 = **360**.

| | 갈래/유형 | 변형 3 성공 | 객관식 3개 전부 | 일부만 | 객관식 0 | 변형 실패 |
|---|---:|---:|---:|---:|---:|---:|
| 초등 (230×4) | 920 | 919 | 591 | 41 | 287 | 1 |
| 중등 | 873 | 873 | 209 | 58 | 606 | 0 |

변형 실패 1건: **초3 `2-3-1 원의 중심, 지름, 반지름` 연산** — 서로 다른 발문+정답이 2개뿐. 3개를 조용히 안 채운다.

객관식 0은 정답이 수·분수·소수가 아니어서 계산 실수 오답 4개를 못 만든 경우다. 무작위 수로 채우지 않는다. 단답·서술은 그 갈래에도 있다.

## 아직 안 한 것

- DB 적재 없음 (브리프).
- 360곳 문항 파일을 전부 쓰지는 않았다. 펼치는 함수와 전량 센서가 있다.
- 초등 4갈래 상한은 이 배선으로 안 풀린다 → `REPORT-02`.
