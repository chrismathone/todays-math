# 생성기 TeX 명령 경계 보강 — 2026-10-18

기준 커밋 `2ae266866`. [기존 감사 ENG-P1-01~03](../problem-bank-audit-20261018/engine.md)의 세 해설 오류를 수정했다. **세 유형 각각 seed 0~~99 × variant 0~~2, 합계 900판에서 실제 MarkdownRenderer SSR과 renderMathHtml의 raw/red 오류가 모두 0**이다. 상세 수치·수정 전 지문은 [engine-evidence.json](engine-evidence.json)에 있다.

## 변경과 완료 조건

| 소유 파일·범위                                       | 변경                                               | 완료 확인                                            |
| ---------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `src/lib/middle/m3Poly.ts` 유형 `02`                 | 해설의 문자항 곱셈 네 템플릿에서 `\times` 뒤 공백  | `\timesx` 제거, 300판 양쪽 렌더 성공                 |
| `src/lib/middle/m2Top.ts` 유형 `90`의 `mulTex`       | `\times` 뒤 공백                                   | `\timest` 제거, 300판 양쪽 렌더 성공                 |
| `src/lib/high/numbers.ts`의 `surdPmTex`              | 근호 본체가 정확히 `i`일 때 `\pm` 뒤 공백          | `\pmi` 제거, 300판 및 ±i 네 출력 분기 양쪽 렌더 성공 |
| `src/__tests__/unit/bankTexCommandBoundary.test.tsx` | 실제 렌더·수식 개수·기존 출력/RNG/객관식 지문 회귀 | 수정 전 6실패·1통과 → 수정 후 7통과                  |

수학 계산·추첨 조건·난수 호출 코드를 바꾸지 않았다. 문항 ID, parser/API/UI/인쇄 규칙도 변경하지 않았다. `surdPmTex`의 숫자 계수·근호·기존 분수 출력은 그대로 두고, 영문자 `i`가 명령 이름으로 흡수되는 경우만 구분한다. Next 코드 작성 전 설치된 `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`를 읽었다.

## 수정 전후 실제 렌더

아래 오류 판 수는 **해설이 실패한 판 수**이며, 서로 다른 식 개수가 아니다. 오류 검사는 `math-raw`, `katex-error`, `#cc0000`, `<merror`를 함께 본다. `katex-error` 클래스만으로 통과시키지 않는다.

| 유형 키                           |   판 수 | 수정 전 SSR/문자열 오류 판 | 수정 후 SSR/문자열 오류 판 | 렌더 필드 수/경로 | 전처리 후 수식 수/경로 |
| --------------------------------- | ------: | -------------------------: | -------------------------: | ----------------: | ---------------------: |
| `3-1\|다항식의 곱셈\|02`          |     300 |                    56 / 56 |                  **0 / 0** |               900 |                  2,100 |
| `2-1\|연립일차방정식\|90`         |     300 |                    53 / 53 |                  **0 / 0** |               900 |                  9,900 |
| `공통수학1\|여러 가지 방정식\|03` |     300 |                      2 / 2 |                  **0 / 0** |             1,244 |                  4,030 |
| 합계                              | **900** |              **111 / 111** |                  **0 / 0** |         **3,044** |             **16,030** |

각 판의 본문·정답·해설과 직접 오답 344개를 실제 두 경로에 넣었다. SSR은 원문을 실제 `MarkdownRenderer`에 전달해 내부 `preprocessMarkdown`을 거친다. 문자열 경로도 실제 `renderMathHtml`의 전처리를 거친다. 회귀 테스트는 `preprocessMarkdown`과 제품 `tokenizeMath`로 센 수식 수가 각 HTML의 실제 `.katex` 수와 같은지도 확인해, 수식이 사라지면서 오류가 0이 되는 상황을 막는다. 합계는 두 경로를 더하면 필드 렌더 6,088회·수식 32,060회다.

공용 함수의 ±i는 실수부 0/2, 분모 1/2/3 조합 네 출력 분기를 따로 확인했다. `\pm\dfrac{i}{2}`는 이미 경계가 있어 원문을 유지한다.

## 기존 대비 보존 증거

수정 전에 원본 출력과 RNG 추적을 저장하고 수정 후 같은 입력으로 다시 생성했다. 900판 모두 해설을 제외한 객체 전체가 정확히 같았다. 본문·정답·난이도·메타데이터·facts·직접 오답·그림 필드를 포함한다. 제품 `asMultipleChoice`와 고정 RNG로 만든 **객관식 900건**도 해설 외 필드 전체가 같아 선지와 정답 번호를 보존했다.

| 유형             | RNG 호출 수(전후 동일) | 바뀐 해설 | 삽입된 ASCII 공백 |
| ---------------- | ---------------------: | --------: | ----------------: |
| 중3 곱셈 `02`    |                  1,824 |       300 |               600 |
| 중2 연립 `90`    |                 14,769 |       300 |               493 |
| 고등 방정식 `03` |                  1,440 |         2 |                 2 |
| 합계             |             **18,033** |   **602** |         **1,095** |

RNG 추적은 제품 진입점이 실제 `createRng`에 준 seed와 모든 반환값의 순서를 기록했다. 전후 배열이 정확히 같다. 해설은 문자열을 앞에서부터 대조해 **기존 문자를 하나도 삭제·교체하지 않고, 기존 `\times`/`\pm` 직후에 ASCII 공백만 삽입했는지** 확인했다. 수학 내용을 새 규칙으로 재해석하는 검사가 아니다. 회귀에는 기존 필드·명령 직후 공백만 제거한 해설·RNG·객관식의 SHA-256 네 지문을 유형별로 고정했다.

공용 `surdPmTex`의 실제 호출처가 있는 다섯 모듈(`h1Complex`, `h1QuadEq`, `h1QuadFunc`, `h1Equations`, `h1QuadIneq`)은 모듈 내 **80등록 유형 × 300판 = 24,000판**도 전후 대조했다. 해설 외 객체는 모두 같고, 해설 차이는 위 고등 `03`의 2판·공백 2개뿐이다. 이 24,000판 전체를 새로 렌더했다는 뜻은 아니다.

## 실행·검증

공유 DB 접속·쓰기 0회, push·배포·main 병합 0회. `.env` 값을 출력하지 않았다. 검사에서는 `loadEnv` 주입과 전역 setup이 없는 로컬 임시 Vitest 설정으로 순수 생성·렌더 모듈만 실행했다. 최종 회귀 검사에는 Vite의 기본 env 파일 탐색도 끄는 `envDir: false`를 적용했다. 추가 worker는 사용하지 않았다.

로컬 증거 위치: `.qa-artifacts/problem-bank-reinforcement-20261018/engine/`. 아래 실행은 모두 해당 폴더의 `vitest.config.mts`를 `--config`로 사용했다. 설정의 핵심은 `resolve.tsconfigPaths: true`, React 플러그인, `environment: "node"`, `css: false`이며 `loadEnv`·`setupFiles`가 없다. 최종 설정은 `envDir: false`도 명시한다.

- 수정 전 측정: `ENGINE_BOUNDARY_PHASE=baseline ... measure.test.tsx --maxWorkers=1` — 4통과, 실패 판 56/53/2 재현.
- 새 회귀를 원본에 실행: `... bankTexCommandBoundary.test.tsx --maxWorkers=1` — 6실패·1통과. 세 생성기 렌더와 세 ±i 경계가 실제로 실패한다.
- 수정 후 측정: `ENGINE_BOUNDARY_PHASE=fixed ... measure.test.tsx --maxWorkers=1` — 4통과, 900판 렌더 오류 0.
- 관련 회귀: `node node_modules/vitest/vitest.mjs run --config .qa-artifacts/problem-bank-reinforcement-20261018/engine/vitest.config.mts src/__tests__/unit/bankTexCommandBoundary.test.tsx src/__tests__/unit/middleM3Poly.test.ts src/__tests__/unit/middleTopM2.test.ts src/__tests__/unit/highNumbers.test.ts src/__tests__/unit/highEquations.test.ts src/__tests__/unit/highComplex.test.ts src/__tests__/unit/highQuadEq.test.ts src/__tests__/unit/highQuadFunc.test.ts src/__tests__/unit/highQuadIneq.test.ts --maxWorkers=2` — **9파일 634통과·0실패·0건너뜀**.
- 소유 코드 네 파일 ESLint, Prettier 및 `git diff --check` 통과. 기존 160파일 전체 검사는 재실행하지 않았다.

증거 JSON은 원문 대신 수치와 지문만 남긴다. 측정 원본·실행 로그의 SHA-256도 함께 남겼다.

## root의 저장 해설 12건 교정에 적용할 방법

이 세션은 저장 해설을 읽거나 고치지 않았다. 다음은 root가 원문을 확보한 뒤 사용할 **구분자 삽입 한정 검증 방법**이다. 원본 seed 재생성으로 저장 문항 전체를 덮어쓰지 않는다.

1. root가 확인한 대상 ID와 원래 해설 SHA-256을 고정한다. 제품 `tokenizeMath`로 원문을 나누고 `$`/`$$`를 복원한 값이 원문과 정확히 같은지 먼저 확인한다. 복원 불일치는 자동 교정 대상에서 제외한다.
2. 수식 세그먼트 안에서만 `/(?<!\\)\\times(?=[xt](?:[^A-Za-z]|$))/g` → `"\\times "`, `/(?<!\\)\\pm(?=i(?:[^A-Za-z]|$))/g` → `"\\pm "`를 후보로 만든다. 문장·메타데이터·정답·선지에는 적용하지 않는다. 모르는 붙임꼴은 자동 확장하지 않는다.
3. 전후 문자열을 두 포인터로 대조한다. 같은 문자는 함께 전진한다. 다르면 **수정본의 현재 문자가 공백이며 원본의 직전 접미사가 `\times` 또는 `\pm`일 때만 수정본 포인터를 한 칸 전진**한다. 나머지는 모두 거절한다. 수식 밖 text 세그먼트도 원문 그대로여야 한다. 이 방법을 위 900판의 실제 전후 대조에 사용했다.
4. 후보를 실제 `MarkdownRenderer` SSR과 `renderMathHtml` 양쪽에 통과시킨다. raw/red/merror 0과 전처리 후 수식 수 보존을 요구한다. 원래 해설의 지문·대상 행·그 외 필드 불변을 함께 대조한 뒤 root의 기존 안전 교정 절차로만 반영한다.

이는 새 범용 parser나 자동 정답 검산기가 아니다. 교정 대상 12건의 실제 원문 일치·반영·재조회는 root의 별도 완료 조건이다.

## 한계

완료 범위는 세 확정 생성기 오류, 900판의 실제 전처리/SSR/문자열 렌더, 고정 입력 대비 보존, 공용 함수 호출처 영향 대조와 관련 회귀다. 가능한 전체 난수 공간·저장 DB 전체·다른 생성기·브라우저/인쇄 래스터 전수 검사는 하지 않았다. 이번 표본을 문제은행 전체의 정확성이나 수량 충분성 증명으로 확장하지 않는다. 저장 해설 12건과 실제 DB 문항 용량 판단은 root가 맡는다.
