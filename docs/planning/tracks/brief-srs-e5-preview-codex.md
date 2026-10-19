# 지시서 — 초5 혼자 공부: 예습 카드(«배우기») 화면 (codex, 2026-10-20)

확정: `05-design-system.md` §8.25(구조 E · 틀 C — 예습 = «뜻과 그림» 면 + «예와 연습» 면 → «문제 풀기») · 시안 `docs/design/mockups/srs-e5-hifi-20261019.html`(C 탭 · C. 예습 카드) · 계획서 §3.4.
데이터는 리드가 지었다 — `src/lib/math-srs/preview/`(`85854ddc2`): `previewCardFor(sectionId)` · `previewMeaning(card)` · `previewFigureSvg(card)`(정확한 수직선 SVG 문자열) · `checkPreviewAnswer(card, input)` · 카드 꼴 `PreviewCard`(`cards.ts`). **데이터 · 서버는 고치지 않는다.** 시범 단원 5-2-1 여섯 장뿐이다 — 카드가 없는 소단원은 지금처럼 바로 문제.

## 1. 무엇을

| 자리 | 화면 |
| --- | --- |
| 언제 | 코스 회차가 **학습(`mode: "learn"`)이고 첫 문제 전(`attempts.length === 0`)이며 그 소단원 카드가 있을 때** — 은행 문제 화면(`StudentCoursePractice` · 탐험 안의 `ExplorerBankActivity`)에서 첫 문제 앞에 한 장. «문제 풀기»를 누르면 지금의 첫 문제. 같은 회차에서 다시 들어오면(새로고침) 다시 보여도 된다 — 저장하지 않는다 |
| 왼쪽 면 «뜻과 그림» | 카드 제목(`title`) · 딱지(이 소단원의 첫 배움) · 뜻(`previewMeaning`) · 줄(`note`) · 그림(`previewFigureSvg` — 그대로 넣는다, 크기만 맞춘다) · 그림 설명(`figureCaption`) |
| 오른쪽 면 «예와 연습» | «함께 풀어 봐요» — `worked` 둘(문제 · 단계 줄 · 답) · «따라 풀어 봐요» — `practice.prompt` · 입력 칸(+ `unit`) · «확인» → 맞으면 «맞았어요» + `explanation`, 틀리면 `hint`(답을 바로 보이지 않는다 · 다시 확인 가능) · 아래 «문제 풀기»(맞히지 않아도 누를 수 있다) |
| 폰 390 | §8.25 C 의 표 둘 «뜻과 그림 / 예와 연습» · 옆으로 밀기 · 면 끝 «예와 연습 보기» — 첫 화면 넘김책(`ExplorerStudyBook`)의 부품을 같이 쓴다(절대 규칙 11) |
| 테마 | 첫 화면과 같은 학원 테마 머리띠 · 코발트 제본 |

## 2. 지킬 것

- 서버 · 계약 · 저장 꼴 · `src/lib/math-srs/preview/**` 불변. 필요한 것이 없으면 보고.
- §8.16 · §8.18(«확인»의 ⏎ 키) · D-30 · D-08 · `prefers-reduced-motion` · 학생에게 어른 말 없음(소단원 번호 · 난이도 글자 X).
- TDD — RTL: 카드가 있는 소단원의 학습 회차 첫 문제 앞에만 뜬다(복습 회차 · 둘째 문제부터 · 카드 없는 소단원은 안 뜬다) · «문제 풀기»로 첫 문제 · 따라 풀기 맞음/틀림 · 폰 표 넘김.
- 정션 `node_modules` · `npm install` / `prisma generate` 금지 · 전체 `type-check` 는 끝에 한 번(알림) · 단위마다 커밋 · **푸시하지 않는다**.
- 다 되면 커밋 · 바꾼 파일 · 시험 결과 · PC 1366 / 폰 390 캡처(5-2-1-1 · 5-2-1-6) · 원장님께 물을 세부(같은 소단원 둘째 학습 회차에도 보일지 등).
