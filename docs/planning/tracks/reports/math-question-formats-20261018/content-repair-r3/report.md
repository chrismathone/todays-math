# 17행 오류 수정 R3 · 실제 지면에서 구별되는 비예

2026-10-18 · Codex · 읽기 전용 후보 준비 완료. coordinator는 exact R3 Claude 승인 커밋 `f135f34b0`을 통보했으며, 보고서 바이트 일치 커밋과 소스 ancestry 병합이 실행 조건이다.

R2의 [Claude 거절](../content-repair-r2/claude-content-review.json)에 나온 두 도형을 수정했다. **R2는 적용하지 않았으며 R1/R2와 거절 증거를 보존했다.** 공유 DB 쓰기, push, 배포는 0회다. 계획 파일은 수정하지 않았다.

도형·검산·보호 도구 소스 커밋은 `be6b4d39ad535b8694ff5f2f57d14ccfd8220ce9`다. coordinator의 후속 요청으로 중2 경우의 수 11번의 0 포함 카드 설명 두 곳만 `자연수`에서 `숫자`로 고친 커밋은 그 자손인 `cfbb07daff5b7416081413604d43815696d31c4e`다. R3 manifest의 sourceCommit은 후자이며 두 소스 커밋의 ancestry를 유지해 병합해야 한다.

## 수정과 독립 검산

| 항목 | R3 실제 SVG 검산 |
| --- | --- |
| `choiceScaleneTri` — 삼각형 6행 | 변 길이 30.800 / 45.937 / 62.225, 각 28.301° / 45.000° / 106.699°. 모든 변 쌍의 `abs(a-b)/min(a,b)` 최솟값 **35.457%**, 모든 각 쌍 차의 최솟값 **16.699°**. |
| `quad244Pick`의 기존 `irregQuad` 자리 — 3행 | 새 opt-in `choiceSkewQuad`로만 교체. 반대쪽 변 두 쌍의 방향 차는 **21.023° / 23.385°**. |
| 유지한 `choiceNonparallelQuad` | 반대쪽 변 방향 차 최솟값 **16.991°**. 좌표 변경 없음. |
| 유지한 도형 | `choiceRightScaleneTri`, `isoTri`, `trap`과 공유 `eqTri/rightTri/wideTri/irregQuad`를 변경하지 않았다. 공유 `markedShape`에는 새 비예를 허용하지 않는다. |

`verify-question-repairs.py`는 렌더러를 import하지 않고 **후보의 실제 SVG polygon 좌표**에서 길이·내각·반대쪽 변의 정규화 외적과 방향 차를 계산한다. 비이등변 오답은 모든 변 쌍 15% 이상 및 모든 내각 쌍 10° 이상, 비평행 변 쌍은 10° 이상이어야 한다. 정확한 외적 0 여부도 함께 남긴다. 결과는 [coordinate-verification.json](coordinate-verification.json)에 있다.

회귀 시험은 R2 삼각형의 실제 좌표를 새 이름 아래 넣어도 변 간격 부족으로 거절하고, 변 길이 조건은 통과하지만 두 각 차가 8.13°인 별도 반례도 거절한다. R2 `irregQuad` 실제 좌표 역시 외적이 0이 아니어도 0.046° 차의 평행 모호성 때문에 거절한다. 공유/승인 도형 좌표와 새 비예의 opt-in 범위도 검사한다.

17개 ID·문항 코드·externalId·familyKey·형식·seed·보기 순서·정답 위치는 유지했다. R2와 비교해 삼각형/사다리꼴 **9행의 SVG만 달라졌고**, 수선 4행과 정다각형 4행의 수정 payload는 동일하다. 수선은 그림에서 개수를 읽는 발문이며 답 개수를 미리 주지 않는다. 정다각형에는 같은 변과 같은 각 조건이 모두 남아 있다. [r2-comparison.json](r2-comparison.json)이 대응을 기록한다.

## 새 post-DDL 원장

root가 DDL을 적용한 뒤 **새 READ ONLY / RepeatableRead 트랜잭션**으로 17행 전체를 읽었다. 모든 행에 `question_group_key: null`이 존재한다. R2 전체 원장을 재사용하지 않았으며, 비교 결과 R2 before와의 차이는 새 nullable 열뿐이다. 새 소스는 해당 열이 없거나 NULL이 아닌 before snapshot을 거절한다.

| 바이트 결합 | SHA-256 |
| --- | --- |
| 승인 계획 | `50c525785cae16825d23d7bd55de81f7a779fa54cd98e8933d470a126acccc61` |
| [manifest.json](manifest.json) | `d81ebc1a641c92703ddb9885558c5e31adf483097bf5e24e150e97ba80445355` |
| [before-ledger.json](before-ledger.json) | `436f318361f46593f38813b51085aa9e069aef8564f593cb5be3865ab1ce7825` |
| private before | `34e291572646317a287e4603fa06a0b0feeef1e37bc666176d1684b3e4e2fc8c` |
| private candidates | `22ecd5b9e6cd0234aa21e9d64f86212e55eb31640228e41a2ecac683d69f3955` |

비공개 전체 파일과 지면은 `.qa-artifacts/math-question-formats-20261018/content-repair-r3/` 안에 있다. root는 이 디렉터리 전체를 같은 상대 경로로 복사해야 한다. [private-artifact-index.json](private-artifact-index.json)에 파일별 SHA가 있다.

`prepare` 뒤 `verify`를 두 번 실행했다. 최종 [읽기 검증](verify-readonly.json)은 17행 full-row CAS 일치, 적용 대기 17행, 이미 적용된 행 0, private 파일·소스·재생성·독립 proof SHA 일치를 확인한다. runtime catalog에서 11개 참조 열을 발견했고 17행 모두 참조 0이었다. 참조 집계는 양수만 저장하는 sparse map이며 빈 map이 조회한 모든 열의 0을 뜻한다. root의 실행 직전 재발견·테이블 잠금·참조 0·전체 행 CAS·readback 보호는 유지했다. 실제 쓰기는 committed exact Claude 승인과 두 writer gate 및 `--apply`가 모두 필요하다.

## 실제 학생/교사 지면

새 private fixture가 17개 실제 후보 payload를 그대로 `TestPrint`에 전달했다. 제품 인쇄 컴포넌트·CSS·폰트는 수정하지 않았다. Chromium에서 학생 17문항·그림 13개, 교사 17해설을 15개 A4 페이지로 렌더했고 수식 오류·overflow·콘솔 오류·실패 응답·학생 답/해설 sentinel 누출은 모두 0이었다. 교사 sentinel은 17개였다. [browser-verification.json](browser-verification.json)에 실측이 있다.

10개 PDF를 PDFKit으로 15개 PNG로 다시 렌더해 **15페이지 전부를 시각 검토**했다. 삼각형의 세 변과 세 각, 두 사각형 비예의 기울기가 구별되고 그림의 기호와 교사용 정답이 맞았다. 수선 4/5개와 평행/직각 표시, 객관 보기, 정다각형의 두 조건도 확인했다. 실제 CSS→SVG 변환은 균일 배율이며 새 부등변삼각형의 가장 작은 두 변 차는 지면에서 **4.613 mm**였다. [visual-review.json](visual-review.json)과 [paper-diagram-measurements.json](paper-diagram-measurements.json)이 그 범위를 기록한다. 이는 작성자의 시각 검토이며 Claude의 독립 승인을 대신하지 않는다.

첫 isolated fixture capture는 폰트 링크 누락을 감지해 중단했다. 링크를 보완한 재시도는 모두 통과했고 실패 시도는 private `paper-evidence-attempt1-missing-font/`에 보존했다. 모든 QA 브라우저는 종료했고 본 작업의 Vite 서버(4273)도 종료했다. **물리 프린터 검수는 대기**다.

## 검사와 후속 경계

범위 시험 3파일 **20개**, scoped TypeScript, Python compile, diff 검사가 통과했다. lint 오류는 0이며 변경 범위 밖 `g4.ts:7673`의 기존 unused `p` 경고 1개가 있다. PGlite 시험은 실제 로컬 SQL CAS·미래 FK discovery·참조 중단·코드/시간 불변·키 무효화·멱등/역작업을 확인한다. 운영 role/RLS나 동시 잠금 검증을 대신하지 않는다. 명령과 결과는 [checks.json](checks.json)에 있다.

후속 중2 11번 수정은 0~k 카드의 두 명사구에만 적용했고 결과물의 양의 자연수 표현과 수식은 유지했다. 실제 0 포함 자료로 두 분기·33개 seed를 독립 나열 검산했다. 해당 소스 SHA는 `c44625a234cbcc2fc59f9deffa61bbc88eae43f6ade765517455794b181a53ce`이며 기존 bounded operator의 `git ls-files src/lib/middle`에 이미 포함된다. 기존 8행은 쓰지 않았고 frozen 94내용/146행 파일은 변경·재생성하지 않았다.

root의 ancestry 보존 병합과 private 복사, **Claude R3 exact 승인 조건 충족**, root만의 전량 17행 적용과 fresh backfill이 남아 있다. coordinator는 보고서 마무리 중 별도 중2 wording 8행의 승인·적용 8·readback 8·재실행 0도 완료했다고 통보했다. 본 worker는 그 공유 쓰기를 수행하지 않았으며 후속 final bounded regeneration은 root 소관이다. [handoff.json](handoff.json)에 기계 판독 가능한 인수 정보가 있다.
