# 수학 문항 검토 정렬 · 2026-10-24

수학 시험지 만들기 → 문항 검토 → 왼쪽 «문항 순서» 위에서 기준을 고르고 «정렬»을 누른다.

- 난이도 낮은 순 / 높은 순: 기존 `DIFFICULTY_LADDER`를 사용한다.
- 객관식 → 주관식 / 주관식 → 객관식: 단답형과 서술형은 주관식 묶음이며, 원래 형식은 바꾸지 않는다.
- 단원 순: 현재 교육과정 `Unit.orderIndex`를 사용한다. 이름·UUID·선택 순서로 교육과정 순서를 추정하지 않는다.

화면에 보이는 6문항뿐 아니라 담은 전체 문항을 정렬한다. 같은 기준의 문항과 미확인 분류는 기존 상대 순서를 유지하고 미확인 분류는 뒤에 둔다. 단원 순서를 전혀 확인하지 못했으면 문항을 유지하고 안내한다. 문항 객체·원문·정답·표현·개수는 그대로이며, 실제 문항 배열을 기존 변경·되돌리기 경로로 전달한다. 정렬 후에도 수동 이동과 같은 기준 재적용이 가능하며 검토·출력 단계 왕복에 순서를 보존한다. 정렬 기준을 고르기만 해서는 문항이 바뀌지 않는다.

## 검증

- `npx vitest run --config src/components/exam-builder/vitest.config.mts`: 20파일, 294시험 통과. 신규 정렬 단위/컴포넌트 회귀 외에 공통 검토·영어·연산·출력 관련 기존 회귀 포함.
- `npx tsc --noEmit --project src/components/exam-builder/tsconfig.check.json`: 통과.
- 변경 TypeScript/TSX ESLint: 통과.
- 변경 파일의 어포던스 검사: 통과. 전역 `lint:affordance`는 변경하지 않은 `CommercialWorkbooks.module.css:292`의 `.workspace .checkbox` 선택자 1건으로 실패했다.
- `node scripts/qa/measure-builder-review-sort.mjs`: 실제 `MathExamBuilder`와 합성 문항 40개로 Chrome에서 1920/1280/1050/768/760/390/320px의 다섯 정렬, 전체 문항 보존, 되돌리기, 첫 쪽 복귀, 최소 44px 조작, 문서 가로 넘침 없음을 확인했다. 페이지 오류 0건. 결과는 [measurements.json](measurements.json), 캡처는 이 폴더의 `review-sort-*.png`다.
- 1280px 및 390px 캡처를 직접 확인했다. 공통 인쇄 레이아웃은 수정하지 않았다.

브라우저 검증은 자체 작성 예시 데이터와 로컬 컴포넌트 대상이다. 운영 계정의 시험지 저장·실제 출력 API 호출·운영 배포 성공으로 확대하지 않는다. API·DB·저장 형식·권한은 이 정렬 변경의 범위에 포함하지 않는다.
