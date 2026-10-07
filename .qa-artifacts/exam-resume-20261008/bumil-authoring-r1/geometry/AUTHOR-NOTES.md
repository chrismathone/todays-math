# Geometry author r1 — q15 · q21

2026-10-08, `orca-codex-exam-twin-author-geometry-20261008`. Parent addenda 1/2를 적용한 실제 저자 후보이며 운영 사용 승인이 아니다.

| 문항 | 새 구성과 답 | 유지한 학생용 절차 |
| --- | --- | --- |
| q15 · 4점 객관식 | 원형 전시 안내판의 둘레 15πcm·현 12cm → 작은 장식 부분의 높이 MP. 짧은 호와 `0<MP<반지름`을 명시. **②, 3cm** | 원주에서 반지름 → 현의 수직이등분선 → 피타고라스 → 반지름에서 중심-현 거리 빼기 |
| q21 · 8점 서술형 | 측정 기록의 지름 10cm·오른쪽 BC=25/8cm → 빠진 왼쪽 AD. 같은 반평면·AD>BC>0·E가 CD 내부임을 명시. **8cm** | DE=DA, CE=CB → **CD=AD+BC** → 수선 H와 직사각형 → 피타고라스 → 전개하여 일차방정식 |

- 입력은 로컬 v2 `prepared/preparation.json`, 정답 없는 `source-reference/problems.json`, q15/q21 참고 PNG뿐이다. 원문 정답·해설·재생성 파일은 열지 않았다. 원본 그림을 복사하거나 트레이싱하지 않았다.
- 중3/2015 제안 메타데이터·출처/학교 표시 정책·성취기준 원자료 위치를 v2에서 연결했다. q15 family `mid:3-2|원과 직선|03`, q21 family `mid:3-2|원과 직선|11`. 주 기준 9수04-19, 선수 기준은 각 JSON의 `standardCodes`에 기록했다. 학년군 기준만으로 개별 학년 승인을 주장하지 않는다.
- 본문·보기·그림·답·해설·필수 절차·선수 개념의 7개 표면 모두 `author-proposed`. 학년 밖 절차는 reject, 범위 불명은 hold. 학생 풀이에 거듭제곱 정리·원과 비례·좌표/원의 방정식·고등 수학 도구를 쓰지 않았다. 작도 좌표는 자산 제작용이다.
- **저자 자체 계산만 수행:** q15 r=15/2, OM=9/2, MP=3 및 보기 5개의 유일성·양의 짧은 높이 확인. q21 전개식 `(25/2)x=100`, `(89/8)²=10²+(39/8)²` 확인. 작도용 정확한 접점 E=(640/89,400/89)는 D에서 C로 64/89 지점이며 OE=5, OE⊥CD, DE=8, CE=25/8이다. 새 FigureSpec의 실제 좌표·배율도 이 관계와 대조했다.
- 두 SVG는 현 작업트리의 `src/lib/figure/renderFigureSpec.ts` → `scripts/figure/render_spec.py` → vendored engine, `strict:true`, 기본 MathJax 조판으로 생성했다. HTTP 환경을 제거하고 로컬 vendor 경로를 지정했다. 치수 누락 0, 외부 이미지·스크립트·미치환 수식 라벨 0. `exam-thin` 기본 스타일을 사용했다. q21 그림의 주어진 BC만 `25/8 cm`로 표기하고 지름·미지 AD 수치를 중복 표기하지 않았다.
- `qNN.preview.png`는 새 학생 지면, `qNN.solution-preview.png`는 새 저자 해설이다. 모두 로컬 Chromium으로 캡처해 실제 이미지를 확인했다. 발문·보기·해설의 모든 수식을 KaTeX로 렌더했다. 원본 참고 PNG와 혼동하지 않는다.
- `independentVerification:null`, 모든 review는 pending, `directUseAllowed:false`. 독립 블라인드 검산에는 content·choices·facts·학생용 SVG만 전달하고 answer·solution·이 노트·해설 PNG는 제외한다. 학년·권리·유사성·출처 확인은 부모 작업이 별도로 수행한다.

| 자산 | SHA-256 |
| --- | --- |
| q15.json | `6e948da15efef5177bf65592bbd9099e1a78b404a63a637b342aacfe09908aeb` |
| q15.figure-spec.json | `10fcbadf7ec9c6ac6d9a51728fc2302f3d9b299e4f16dae7b48496364afb7391` |
| q15.svg | `f6f27e2e04d7f98fde4f6236f6e3fedef555fee37f160fefd2ca1573d97928e2` |
| q21.json | `8f3489c6e162d8df86c0978a8942b26ced1c53ee28d67c542c1d628513bcecea` |
| q21.figure-spec.json | `e1eb1787df56f758f8336984dd8826f954681530ecec1f75fc235aa9bdac106a` |
| q21.svg | `ad84c6b289eef08dd2679624c2d7eb4279e97becb5e9cbe50c1921f06e573861` |
