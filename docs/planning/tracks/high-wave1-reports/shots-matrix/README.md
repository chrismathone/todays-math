# 행렬 렌더 증거 (2026-09-13 세션 `h1-poly` 미리보기 캡처)

물결 1 병합 검수에서 남긴 것이다. 세션 워크트리를 닫으면 사라지므로 여기로 옮겼다.

무엇이 보이나 (10-handoff §0-V.4 「리드가 올릴 공용 일」):

1. **문장 속 행렬이 블록으로 떨어진다** — 「두 행렬 $A=\begin{pmatrix}…\end{pmatrix}$, $B=…$에 대하여」가
   `두 행렬 [가운데 블록] , [가운데 블록] 에 대하여` 로 문장이 끊긴다.
   원인 후보: `src/lib/math/textPreprocess.ts` 의 `MULTILINE_ENV` 가 `pmatrix` 를 여러 줄 환경으로 다룬다(미확인).
2. **행렬 곱 `AB`·`XY` 가 정자(곧은 글꼴)로 나온다** — 같은 파일 `ROMAN_LABEL_RE`(대문자 두 자 이상 → `\mathrm`,
   도형 라벨 규칙)가 행렬 곱을 라벨로 읽는다. 행렬에서는 기울인 $AB$ 가 맞다.

둘 다 **지면 모양**이라 D-07(원장님 확정)이고, 고치면 **인쇄 검수**(절대 규칙 6)까지가 완료 조건이다 —
고등 행렬이 종이에 처음 나가는 자리다.

미리보기 자체는 언제든 다시 만든다:
`npx tsx scripts/high/gen-cli.ts --minor "행렬" --per-type 2 --html scratch/preview-matrix.html`
