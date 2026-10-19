# 기출 작업트리 최신 main 통합 — 2026-10-19

사용자의 최신 커밋 pull 및 중복 확인·보존 병합 요청에 따라 명령 실행과 실제 원격 fetch를 확인했다. 이전 Windows 샌드박스 초기화 실패와 달리 이번 명령은 정상 실행됐다. 권한 설정을 코드나 저장소 파일에서 변경하지 않았다.

- 기존 feature HEAD/원격 feature: `116048ddcb6cade1a375e294f91d6a75051b4c87`.
- 실제 fetch한 main: `9d33e0cfbd4fe96a59c08d3c3bbe2d7a0ce5aab9`. 기존 feature에 없던 main 커밋 450개를 통합했다.
- 통합 커밋: `5a00a94dcd876ffc4f87224b16c53f8ce3640333`. 기존 feature 이력을 재작성하지 않았다. `git cherry` 기준 feature 비병합 패치 66개 중 이미 main에 같은 패치로 들어간 것은 0개였다.
- main을 feature로 가져왔으며 main 브랜치 작업본, 운영 DB, 배포는 변경하지 않았다.

미완료 로컬 변경 6개는 별도 파일 사본·패치·Git 보존 가지·stash로 먼저 보존했다. main 통합 후 다시 복원했고 현재도 원래처럼 미커밋 상태다.

1. `src/lib/engine/deriveFormats.ts`
2. `scripts/qa/count-loaded-unsimplified-choices.ts`
3. `scripts/qa/scan-choice-exact-values.ts`
4. `src/__tests__/unit/deriveFormatsExactDistractors.test.ts`
5. `src/__tests__/unit/exactChoiceValue.test.ts`
6. `src/lib/math/exactChoiceValue.ts`

겹친 파일은 `deriveFormats.ts` 하나였다. 이 파일은 원래 로컬 초안에 main의 추가 5줄만 더해진 것임을 비교했다. 분수·근호 정확값 및 정리된 오답 처리와 최신 main의 양수 정답에 대한 0 오답 제외·오답 후보 보충이 함께 남아 있다. 새 파일 5개는 원래 바이트와 모두 일치한다. stash 복원 과정에서 생긴 줄바꿈 변환 4건도 사본과 대조해 원래 바이트로 되돌렸다. 충돌 표시나 미해결 경로는 없다.

기존 검수 증거·지시서·보호 원장 5,393개는 통합 전후 SHA-256이 모두 같다. 원본 기출 수동 등록 시 `directUseAllowed=false`로 시작하는 코드도 최신 문제 조회·문항 형식 변경과 함께 보존됐다. 새 작성·독립 검수·권리·적재 승인 집계를 이 Git 통합으로 올리지 않았다.

검증은 통합 전 엔진 검사 42개, 통합 후 기출 도구 Node 검사 33개와 Vitest 12파일 298개를 통과했다. 통합 후 합계는 331개다. 엔진의 기존·소수·분수/근호 보기, 출제 자격, 그림·출처, 문제 API, 바구니, 예측 시험지 관문, 계약을 포함한다. API 검사는 mock이며 운영 DB를 쓰지 않았다.

공유 node_modules 정션과 Prisma Client는 변경·재생성하지 않았다. 통합한 스키마의 `actualFormat`은 현재 공유 생성 Client 스키마에 없으므로, 이 기록은 전체 타입 검사·실제 DB 연결·앱 빌드 통과를 주장하지 않는다. 해당 실행 환경 동기화가 필요할 경우 독립 의존성 경로를 사용해야 한다. npm install·prisma generate를 공유 정션에 실행하지 않았다.

보존 자료는 `C:/Users/user/orca/artifacts/outputs/exam-git-integration-20261019T045933Z`에 있으며, 보존 가지는 `archive/exam-pre-pull-20261019T045933Z`, stash는 `2c06ab121329d094f49a84d8b91b9e058fbfe1c7`이다. 상세 실행 기록은 `.qa-artifacts/exam-resume-20261008/integration-result-20261019-r2.json` 및 외부 보존 폴더의 manifest에 연결했다. 원격 푸시는 기존 승인 범위의 기출 feature 체크포인트만 대상으로 하며 직전 target/main 재조회·포함 관계 확인 후 fast-forward로 수행한다. 최종 원격 SHA 영수증은 별도로 보존한다.
