# 개념 백지 하단 지면 전환 동기화

2026-11-12 · Codex · 기준 `bd759237b84070b51fa444caf69e955bc574d026`.

사용자 추가 요청: «개념 백지 하단 미리보기에도 상단처럼 학생지/채점표/전체 추가».

## 결과

- 하단 미리보기에 기존 학생지·채점표와 함께 **전체**를 제공한다.
- 상단의 기존 `printView`·`setPrintView` 한 벌을 상단/하단/실제 미리보기/인쇄 주소가 공유한다. 보기 목록도 `PAPER_VIEWS` 한 벌이다. 분리돼 있던 `paperView`를 제거했다.
- 상단의 기존 기본값 **전체**를 유지하므로 초기 미리보기도 학생지 뒤에 채점표를 보여 준다. 어느 쪽에서 바꿔도 양쪽 `aria-pressed`, 실제 A4 지면, 인쇄 URL의 `view=student|key|both`가 일치한다.
- 기존 `ConceptBlankPreview → conceptBlankPages`가 이미 `both`를 지원하므로 지면·쪽 나누기·학생지/채점표 내용은 바꾸지 않았다. 저장 계약·은행·H2·DB 변경도 없다. 지면 전환이 고른 문항 URL을 변경하지 않는다.
- 두 그룹은 기존 native 버튼/그룹 이름을 유지한다. 키보드 Space로 바꿔도 누른 단추에 초점을 유지하며, 두 그룹의 focus-visible outline은 인접 흰 면과 충분한 대비를 갖는 기존 accent 토큰의 3px 선을 사용한다.

## 검증

- 새 `ConceptBlankView.paperView.test.tsx`는 미리보기를 모형으로 대체하지 않는다. 실제 `ConceptBlankView`, `ConceptBlankPreview`, `PaperStrip`, A4 renderer를 렌더하고 상단/하단 각각에서 학생지→채점표→전체로 바꾸며 실제 `data-cb-part`의 종류·순서, 양쪽 버튼 상태, 인쇄 주소, 선택 URL 보존을 확인한다. 수정 전 두 시험은 학생지만 그려져 RED였고([RED](red.log)), 수정 후 통과했다.
- 관련 **7파일·152시험 통과**, `--maxWorkers=3`([로그](related-tests.log)). 기존 View·H2 고르기·Paper·공용 PaperStrip·인쇄 검수·인쇄 페이지 회귀를 포함한다.
- 타입 검사 통과([로그](type-check.log)), ESLint **오류 0·기존 미사용 docs 경고 1**([로그](eslint.log)), affordance·Prettier·`git diff --check` 통과. 전체 시험과 운영 빌드는 반복하지 않았다.
- 실제 `/dev/workspace-alignment`의 작업실과 초5 은행에서 **1920×1080, 1280×800, 390×844, 320×740**를 확인했다. 위/아래 × 세 보기 × 네 폭 = **24 전환** 모두 양쪽 선택·실제 지면·인쇄 주소 일치, 선택 URL 보존, 문서 가로 넘침 0이었다. 하단은 실제 키보드 Space를 사용했고 초점을 유지했다. 세 라벨은 320px에서도 그룹 안에 들어갔고 작은 화면에서는 그룹이 제목 아래로 자연스럽게 내려간다. [측정](browser-check.json), [1920 전체 지면](preview-1920-both.png), [위/아래 선택](both-controls-1920.png), [390 전체 지면](preview-390-both.png).
- 개발 서버는 연결 불가능한 DATABASE_URL과 일회성 AUTH_SECRET, 기존 dev 화면의 메모리 API를 사용했다. 실계정·공유 DB 저장·`.env` 수정·실물 인쇄·의존성 생성/설치는 하지 않았다. 이 검증은 실제 부품의 합성/격리 smoke이며 운영 계정 편집 검증은 아니다.

## 독립 검토와 릴리스

[별도 독립 검토](adversarial-review.md)에서 남은 actionable introduced finding은 **0건**이다. 검토자가 1920·320px에서 위 포인터/아래 키보드로 12회 전환하여 동일 지면의 텍스트 보존·상태·인쇄 주소·초점·작은 화면을 재검증했다. 원자료는 `review-evidence/`에 보존했다. 정상 훅을 거쳐 커밋·푸시한다. 정확한 추가 SHA의 배포 상태와 배포 뒤 읽기 전용 smoke는 `/Users/pss/tmp/claude-today-codex-handoff-20261112/completed/preview-toggle/` 및 최종 인계에 별도로 남긴다. 이전 쪽 순서 변경은 `bd759237b`로 이미 Production success였으며 두 요청의 릴리스 증거를 구분한다.
