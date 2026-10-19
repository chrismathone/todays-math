# H2 / S2 신규 회귀 테스트 구현·독립 실행 결과

2026-10-19. 작업 대상: `/Users/pss/Desktop/creative/today-builder-wire`.

**신규 테스트 16개 전부 통과. 해당 파일 ESLint와 독립 타입 검사도 통과했다.** 제품 코드와 저장소 config는 수정하지 않았다.

## 변경 범위

저장소에 작성한 파일은 `src/components/exam-builder/ExamBuilder.h2.test.tsx` 하나다. `ExamBuilder`, `ScopeSequencePicker`, `QuickConditions`를 실제로 렌더하며 출처 포트와 문항 데이터만 메모리에 둔다. 초기 단원 안내·ID 매핑·출력 준비 완료를 제어 가능한 Promise로 재현한다.

실행용 config·타입 검사 config·로그는 `/tmp/builder-h2-new-tests.fQXLy5/`에만 작성했다. 저장소의 config 확장은 주 구현자에게 맡겼다. Next 설치본의 Vitest 가이드를 읽고 작업했으며, 서버·빌드·DB·실제 API는 실행하지 않았다. 스테이징·커밋·push·배포·추가 작업자 생성도 하지 않았다.

## 검증한 행동 계약

| 영역 | 시험 수 | 검증 내용 |
| --- | ---: | --- |
| S2 범위 탐색·복원 | 5 | 초기에는 학년 목록만 존재하고 숨긴 단원·차시 DOM도 없음. 학년→단원→차시와 접힌 요약·단계 제목 초점. 상위 변경 뒤 query/page 초기화, 기존 배분 수·고정·누적 순서 보존. 늦은 저장 범위 경로 복원과 이후 사용자 탐색 보존. 구 저장 문항의 지연 ID 매핑 후 배분 복원·재조회 후 수 보존. 0/미확인 재고 구분. |
| QuickConditions | 2 | 여섯 단계·직접 입력, 난이도 합, 형식 지정 없음(null)/0 구분, 기본 최근 14일 제외, 작업 중 입력 비활성화. |
| H2 출력 안내 | 6 | 왼쪽 aside의 순서표 바로 다음에 안내 위치. 다섯 차단 이유(작업 중·0문항·권한·총수·형식), 버튼의 실제 `aria-describedby`와 접근 가능한 설명, 상단 출력 단계도 차단. 지연 출력 확인 중 중복 실행·조기 출력 방지. 완전한 실제 표현 메타데이터가 있는 문항의 총수/형식 불일치, 형식 0 지정, 조건 해소 후 출력. 총수를 비웠을 때 부분 구성도 원래 요청 행의 합을 유지해 출력 차단. |
| 둘째 쪽 전역 순서 | 3 | 순서표 7번의 Alt+아래(7↔8), Alt+위(6↔7 쪽 경계) 이동과 undo. 본문 7번 Space·방향키·Enter 이동 및 Escape 취소. 전체 배열 순서와 표/본문의 전역 7·8번 번호·내용 일치. |

CSS 클래스나 내부 상태값으로 결과를 대신하지 않고, 역할·이름·초점·렌더된 내용·콜백 인수로 검사했다. ‘순서표 바로 다음’은 실제 형제 DOM 위치를 검사한다. 출력 차단은 표시뿐 아니라 `prepareOutput` 미호출과 출력기 미노출도 확인한다.

문항 픽스처는 각각 questionId와 비어 있지 않은 `questionFormats`를 갖는다. 표현에는 실제 problemId·format·revision·available 상태를 넣었으므로, 능력 자체가 없는 기본 모의 출처로 총수/형식 차단 분기를 건너뛰는 시험이 아니다. 실제 은행 저장 레코드 조회를 했다는 뜻은 아니다.

## 전체 로그에서 발견된 신규 실패 처리

요청한 `/tmp/builder-h2-impl-tests.log`를 읽었다. 그 로그는 238개 중 232개 통과이며 H2 신규 15개 중 3개 실패와 API 시험 3개 실패를 기록한다.

- 총수·형식 불일치에서 `status`만 찾던 헬퍼를 수정했다. 안내 영역 안에 `status` 또는 `alert` 설명이 정확히 하나 존재하는지 확인하고 그 ID를 다음 버튼의 `aria-describedby`와 연결해 검사한다. 각 사례에서는 계약도 명시한다: 의도 불일치 세 사례는 `role=alert`, 작업 중·0문항·권한은 `role=status`.
- 여섯 난이도 단계 시험의 초기 8문항 픽스처는 정수 배분 후 서로 다른 단계가 같은 수로 환산될 수 있었다. 단계 표시를 구분하는 사례에는 30문항을 사용했다. 여섯 버튼의 선택 표시와 합, 직접 입력 검증은 유지했다. 제품 계산기를 수정하거나 실패를 skip하지 않았다.
- 총수를 비운 부분 구성의 차단 사례를 더해 최종 신규 시험은 16개다.
- 로그의 `src/__tests__/api/examBuilderConditions.test.ts` 세 실패(형식별 수, 지정 없음 자리, 난이도 의도 결합)는 이 파일 밖이므로 수정·재실행하지 않았다. API 결과의 원인을 이 UI 시험 결과로 판정하지 않는다. 기존 SavedConditions 50개 통과는 주 구현자가 전달한 결과이며 이 세션의 독립 재실행 결과와 구분한다.

## 최종 실행과 증거

작업 디렉터리는 위 주 작업트리다. 로컬에 설치된 실행 파일만 사용했다.

```sh
node_modules/.bin/vitest run --config /tmp/builder-h2-new-tests.fQXLy5/vitest.config.mts --configLoader runner --reporter verbose
node_modules/.bin/eslint src/components/exam-builder/ExamBuilder.h2.test.tsx
node_modules/.bin/tsc --noEmit --project /tmp/builder-h2-new-tests.fQXLy5/tsconfig.json
```

| 검사 | 최종 결과 | 로그 |
| --- | --- | --- |
| 신규 파일 독립 Vitest | exit 0, 1파일·16/16 통과, 2.08초 | `/tmp/builder-h2-new-tests.fQXLy5/vitest-final.log` |
| 해당 파일 ESLint | exit 0, 오류 출력 없음 | `/tmp/builder-h2-new-tests.fQXLy5/eslint.log` |
| 독립 타입 검사 | exit 0, 오류 출력 없음 | `/tmp/builder-h2-new-tests.fQXLy5/type-check.log` |

독립 Vitest config는 `envDir:false`, `setupFiles:[]`로 루트 환경·DB/MSW 셋업을 로드하지 않는다. 가용 재고·후보·구성·출력은 메모리 포트이며, 각 시험에서 전역 fetch를 즉시 실패하는 함수로 바꾸고 종료 시 호출 0회를 검증했다. 캐시도 위 `/tmp` 디렉터리에 둔다. 타입 검사는 `incremental:false`이므로 저장소에 tsbuildinfo를 쓰지 않는다.

이 결과는 실행 시점의 제품 소스에 대한 jsdom 회귀 검증이다. 전체 238개 시험 재통과, 실제 브라우저 배치·드래그 포인터 실측, 실계정 권한, 실제 API·DB 동작 또는 성능을 확인한 결과로 확대하지 않는다. 주 구현의 후속 변경이 반영된 뒤에는 주 구현자가 확장한 config로 이 신규 파일을 기존 회귀 시험과 함께 실행하면 된다.
