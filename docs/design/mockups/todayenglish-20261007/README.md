# 오늘의 영어 — Hi-fi 5안

**선택 확정: D + 오늘의 수학 구성.** `index.html#D` 또는 `d-question-library.html`을 열면 최신 선택안을 확인할 수 있다. A·B·C·E는 최초 비교 기록으로 보존한다. D에는 수학 작업실의 공통 탐색·시험지 구성과 AI로 원문부터 제작하는 흐름을 반영한다.

`index.html`은 다섯 시안과 첫 화면 이미지를 모두 포함한 독립 HTML이다. 브라우저로 직접 열거나 Orca artifact로 공유할 수 있다. 폰트 CDN이 닿지 않으면 설치된 한국어 글꼴로 표시한다.

| 파일 | 시작점 |
|---|---|
| `a-exam-desk.html` | 학교·시험 준비 작업대 |
| `b-source-editor.html` | 원문과 문항의 분할 편집실 |
| `c-workflow-board.html` | 초안·검토 중·검토 완료 보드 |
| `d-question-library.html` | 문제은행 검색과 시험지 조합 |
| `e-class-packet.html` | 수업 자료집 구성과 지면 |

모든 시안은 예시 데이터로 동작한다. 제작 버튼은 준비된 예시 초안을 보여 준다. 실제 생성 모델·DB·학생 배정과 연결하지 않는다. 각 HTML의 변경 상태는 새로고침하면 초기화된다. 이번 산출물은 운영 화면 교체와 독립된 디자인 제안이다.

설계와 실제 기능의 차이, 구현 순서는 `docs/planning/todayenglish-redesign-20261007.md`에 정리했다. 정답·근거 확인과 교사 검토 상태를 형식 검사와 구분하고, 문제은행과 원문 자료은행을 구별한다.

다섯 안을 고친 뒤 저장소 루트에서 아래 두 명령을 순서대로 실행하면 갤러리를 다시 만들 수 있다.

```powershell
node scripts/design/capture-todayenglish-hifi.mjs
node scripts/design/build-todayenglish-hifi-gallery.mjs
```

기존 다섯 썸네일이 있으면 D 후속 변경은 `node scripts/design/capture-todayenglish-hifi.mjs --only=d`로 D만 다시 캡처한 후 갤러리를 빌드한다.

캡처는 기존 Playwright 의존성을 사용한다. Windows에서는 설치된 Edge를 사용하며, 다른 브라우저 실행 파일은 `HIFI_BROWSER_EXECUTABLE`로 지정할 수 있다. 캡처와 보고서는 `.qa-artifacts/english-hifi/`에 생성되고 갤러리의 썸네일은 HTML에 내장된다.

PC 1440×1000 및 모바일 390×844에서 화면 오류·가로 넘침을 확인한다. 인터랙션 검증과 시각 검토 결과는 `docs/design/reviews/todayenglish-hifi-20261007.md`에 남긴다.
