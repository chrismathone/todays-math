# 지시서 3 — 성적표 원장님 화면 Hi-fi 4안 (codex · 2026-10-18)

워크트리 `/Users/pss/Desktop/creative/today-exam-report` · 가지 `phase/11-exam-report-eywa`. **커밋하지 않는다** — 바꾼 파일을 남기고 보고만 한다. 금지 · 안전은 지시서 1 §2 그대로(DB · `.env` · prisma generate · push · 외부 호출 금지).

## 0. 정해진 것
- 원장님이 Wire `/dev/exam-report-screen-wire` 에서 **A «목록 + 미리보기»** 를 골랐다. 여쭐 것 셋은 추천대로(계획서 §14.3 끝): 문장 없이 확정 됨 · 확정 전 인쇄 됨(기본은 «확정된 학생만») · 문장 길이 상한 + 남은 글자 수.
- 이후 형태 결정은 원장님이 **리드와 codex 합의**에 맡겼다. 그래서 Hi-fi 를 만든 뒤 **너의 추천을 따로 봉한 파일**에 적는다(아래 3). 리드는 그 파일을 보기 전에 자기 선택을 따로 적는다.
- 지면은 H1 이다 — `src/components/exam-report/` 부품을 그대로 쓴다(새 지면 모양을 만들지 않는다).

## 1. 할 일
1. `/dev/exam-report-screen-hifi` — A 짜임의 Hi-fi **H1 ~ H4**. 실제 작업실 화면의 토큰 · 글꼴 · 단추를 쓴다(다른 작업실 화면과 같은 얼굴 — `src/components/unified/` · `ExamPublication.module.css` · 채점표 `GradeSheet` 를 본다). 미리보기는 공용 `PaperStrip`(D-159), 학생이 많을 때 고르기가 필요하면 `PickerDialog` 를 먼저 검토한다.
2. 안끼리 다른 것은 세부다: 목록 칸(상태 표시 방식 · 점수 표시) · 문장 칸 위치(미리보기 아래 / 옆) · 확정 단추와 «다시 확정» 알림 · 반 단위 지면 설정 자리 · 인쇄 단추 묶음. 한 안에 한 축씩 바꾸는 것을 권한다(기준안 + 변형).
3. 상태 넷(문장 없음 · 문장 씀 · 확정 · 다시 확정)과 결시 · 문장 길이 상한(남은 글자 수 — H1 한 장 기준 상한을 실제 지면 부품으로 재서 정하고 근거를 적는다) · 저장 중 · 저장 실패 · 확정 실패를 예시 상황 토글로 보인다.
4. 지어낸 픽스처만(학생 이름은 지어낸 것). 상호작용은 로컬 상태로만 — 서버 호출 없음. 페이지 가드 `devPageVisible({ directorOnly: true })`, D-30 어포던스.
5. `docs/planning/tracks/reports/exam-report-screen-hifi-codex-pick.md` — 너의 추천 하나와 까닭, 안마다 약점. **리드가 열기 전까지 다른 문서에 추천을 쓰지 않는다**(페이지의 안 이름에 «추천»을 붙이지 않는다).

## 2. 하지 않을 것
- 실제 화면 · 라우트 · API · DB · 확정 쓰기. 원장님 승인 전이다.

## 3. 끝맺음
- 시험: 시안 렌더 시험 1개 이상 · `devPageGuardCoverage` · `npm run type-check` · 바꾼 파일 eslint · `npm run lint:affordance`.
- 마지막 답에 바꾼 파일과 시험 결과(추천은 답에 쓰지 말고 위 파일에만).
