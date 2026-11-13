2026-11-13 staged read-only Codex 재검토.
대상은 `/Volumes/새 볼륨/today-worktrees/today_/arithmetic-figure-quality-20261112`이며
이 파일만 자신의 adversarial worktree에 작성했다.
먼저 대상 CHECKPOINT와 provisional README를 읽었다.
검토 도중 두 batch가 완료되었다는 부모 메시지와 두 새 자산을 확인했으나,
후속 glyph/측정 수정·새 브라우저/생산 PDF 증거는 아직 완료되지 않았다.
따라서 이것은 최종 승인 보고서가 아니다.

**확인된 P2: 공통 dimension 배치가 contained chord의 tick 잉크와 교차할 수 있다.**

- `vendor/figure-engine/core/figure_scene.py:2479–2500`의 대칭 포함 판정은
  정확히 공선인 부분 선분을 전체 치수의 현으로 인식하는 타당한 기하 교정이다.
  비공선 실선 검사, label-box 여백, 직각 검증을 통째로 끄는 수정은 아니다.
- 다만 `_dimension_layout`은 그 현의 equality/parallel mark 잉크를 별도로
  검사하지 않는다: own-chord 분기에서는 본선 label clearance만 보고 continue하며,
  이후에도 angle mark와 circle 등은 검사하지만 `_segment_mark_lines`를 검사하지 않는다.
  점 이름 배치 쪽은 이 marks를 실제로 검사한다(2192 부근).
- 단일 프로세스에서 다음 짧은 실제 FigureScene spec을 실행해 재현했다:
  `A=(0,0), M=(20,0), B=(40,0)`;
  `AM`과 `MB`에 각각 `ticks:1`;
  전체 `AB` 치수에 `label:'10 cm', offset:1, inset:0`, `labels:{}`.
  `resolve`와 실제 `render_svg`가 성공하지만 선택한 quadratic은
  `M 0 0 Q 20 2 40 0`이고 첫 tick은 `(10,-4)–(10,4)`다.
  `(10,0.75)`에서 교차하며 해당 arc-length 약 10은 `5 3` dash의 실제 ink 구간이다.
  번역된 실제 SVG path는
  `M 13.11 16.95 Q 33.11 18.95 53.11 16.95`였다.
- 현재 registered proof 중 offset=1과 segment marks를 함께 채택한 15개 spec도
  별도로 검사했으며 그 15개에서는 dimension/mark 교차를 찾지 못했다.
  따라서 493개 예외나 현재 모든 납품 그림의 실패라고 확대해서 말하지 않는다.
  그러나 새 공통 엔진의 허용 사례에서 재현되는 실제 mark 충돌은 남아 있다.
- 제안: 공선 현의 false-positive 교정은 유지하고, tick/parallel marks에 대한
  dimension curve·label clearance 검사를 추가하여 기존 큰-offset 후보를 고르게 한다.
  위 short-chord 사례를 “resolve 성공”만 보는 positive test가 아닌 실제 mark-ink
  보존 adversarial test로 추가한다.

**부모가 수정 중인 P2 / 최종 승인 전 확인할 실제 품질 문제.**

- 부모가 current browser에서 `whole-side-4-4-2`의 `4 cm`/DE 접촉을 발견했다고
  통지했다; 이 리뷰에서 그 브라우저 관측을 새로 실행하지는 않았다.
  소스상 원인 경로는 확인된다: engine `scene_spec`에는 `label_metrics`가 없고
  (engine.py:43), 엔진의 `label_pieces_svg`는 tspan을 만들지만
  arithmetic `typography.ts:214–221`은 자식 markup이 있는 text를 그대로 반환한다.
  codec의 byte-exact 성공은 이 최종 글꼴·glyph 여백의 성공을 뜻하지 않는다.
  authoritative 측정/조판을 연결한 뒤 최종 SVG/hash/실제 화면·PDF를 다시 검증해야 한다.
- 기존 `contacts/contact-17.png`를 실제로 열었다.
  `inline:m3-trig-side-from-area-sine:960`은 A/C 및 짧은 x 치수의 구별이 어렵고,
  `inline:m3-trig-sine-from-area:1515`는 B/C 쪽 꼭짓점과 거의 붙은 두 변이 읽기 어렵다.
  이 contact는 기존 visual-review의 해시에 해당하므로 최종 수정 이미지의 대용으로
  승인하지 않는다; 부모도 current 후보를 별도로 지적했다.
  두 경우 모두 정확한 bounding aspect가 72:1이며 200-unit 본체 높이는 약 2.78이다.
  960의 공개 조건은 AB=12, S=1, sin A=2/3이므로 AC=1/4,
  1515는 AB=AC=12, S=1이므로 sin A=1/72다.
  이 수치는 검토 설명이며 학생 target에 숫자를 넣으라는 뜻이 아니다.
  clamp 복귀 대신 명확한 원래 개요 + 동일 좌표의 균일 확대 상세도는 검토 가능하다:
  상세도임을 표시하고 위치·점 이름을 연결하며 새 numeric answer를 주입하지 않아야 한다.

**이전 지적의 교정 상태와 실제 보존 검사.**

- 금지된 `data-target-segment` 속성은 제거되어 sanitizer를 통과하는 속성만 쓴다
  (`engine.py:80–86`); 이전 P1은 소스와 실제 새 자산에서 교정됐다.
- 사다리꼴 `AE:EB=p:q`는 `figureFirstTriangles.ts:237–247`에서 남는 공개 조건으로
  보존한다; ratio가 좌표만으로 암시되던 이전 P1은 교정됐다.
- `engine.py:154–157`은 전체 성공 전 application pack을 교체하지 않고,
  기존 출시 asset와 다른 내용이면 새 버전을 요구한다; 이전 부분-pack 성공 게시
  지적은 교정됐다.
- census는 실제 생산 screen/rounded-mm sizing 함수를 사용하고
  (`census.ts:117–130`), browser helper는 그 값을 읽는다
  (`check-browser.js:27–35`); 가짜 240px print frame은 제거됐다.
  실제 print-media/PDF는 별도 최종 증거가 필요하다.
- census는 raw drawing 성공 후 typesetting 실패도 fallback으로 기록한다
  (`census.ts:98–104`); compiled 소유 유형은 전체 원문이 맞지 않으면
  예전 clamp/custom renderer로 돌아가지 않는다 (`figureFirst.ts:118–121,149–159`).
- 등록 2,219개와 inline 24,474개, 합계 26,693개의 완료 proof를 읽었다.
  치수 요청 54,759 = 실제 54,091 + 최종 잔존 668이며 잔존 ID는 493개다.
  등록 잔존은 given 506 / target 162이고 inline 최종 잔존은 0이다.
  거부 **시도** 10,717은 이 최종 누락 668과 다른 수다.
- 모든 등록 행에서 initial dimensions = fitted dimensions ∪ residual이고
  중복·분실은 없었다; 잔존 행은 7개 공통 설정을 모두 시도했다.
  public given/target의 initial 요청, angle label, 전체 target 선분,
  equality/parallel/right flags를 실제 plan/spec 2,219개에 대조해 불일치 0개였다.
  이전 prose-only rhombus/external-bisector 163개 행도 자동 면제하지 않고 시도했으며
  그 예외 조건 308개는 여전히 최종 residual에 남는다.
- 남은 예외 중 nested whole/part dimensions 등을 선택해 다른 공통 offset/inset과
  순서를 짧게 도전했지만, 동시에 모든 치수가 들어가는 반례를 얻지는 못했다.
  “공간이 충분한데 arbitrary omission”을 새 결함으로 입증한 것은 아니다.
  반대로 7개 유한 공통 설정에서의 최소 누락이 모든 가능한 배치의 불가능성 증명도 아니다.
  최종 예외는 이름·단위·target x가 남은 상태로 육안 평가해야 한다.

**Codec / gate / 동결 snapshot.**

- 현재 `engineFigures.ts`를 읽기 전용 in-memory transpile하여 실제 두 JSON 자산과
  실제 fflate를 연결한 decoder 함수를 실행했다: 모든 26,693개 SVG가 완료 engine proof의
  SHA-256과 byte-exact였고, 24,474개 inline prompt의 JSON key 역순도 모두 같은 SVG였다.
  text/latex/instruction/answerUnit 변경 및 unknown field gate는 4개 유형 20회 거부됐다.
- 현재 Python encoder 함수 자체를 AST로 메모리에만 로드해 emoji/한글이 있는
  synthetic prompt 70개(64-row chunk 경계를 넘음)를 만들고 같은 TS decoder로 복원했다:
  UTF-16 slice/offset, Unicode, literal·정수·소수·지수 표기가 모두 손실 없이 복원됐다.
  강제로 hash 충돌을 만들어 다른 후보를 먼저 읽게 해도 정확한 prompt를 찾았고,
  변경 instruction을 원래 ref에 연결해도 승인하지 않았다.
- 관측 cache 최대는 registered family 4 / raw chunk 8 / parsed row 256이었다.
  parsed row hit는 승격하지 않으므로 엄밀한 LRU는 FIFO에 가깝지만 상한은 지킨다
  (`engineFigures.ts:113–114,144–146`); raw/family cache는 hit를 승격한다.
  이 상한은 이미 정적 import한 전체 압축 자산·template 메모리를 제거하지는 않는다.
- 등록 2,219개의 canonical SHA를 작업 전 manifest와 비교해 변경 0개였다.
  geometry.ts / geometryPack.ts / frozen TS core / v1 angle asset / 저장 contract diff도 없다.
  저장 소비자는 `arithmeticOutput.ts:68–75`에서 v1/v2 pack을 먼저 검증하고 projection하며,
  새 등록 자산은 전체 canonical 문자열, inline은 key 순서만 정규화한 전체 공개 prompt를
  대조한다; 임의 제출 압축 데이터를 inflate하는 새 통로는 찾지 못했다.
  target numeric answer가 label에 복사되는 경로도 찾지 못했다.

**이전 20,038개 불일치와 성능 수치의 의미.**

- 유지된 작업 전 실제 SVG 24,474개에서 side ratio / 삼각비 / 알려진 AB로 정규화한
  면적을 독립 계산해 정확히 20,038개 불일치를 재현했다:
  length 2,380 / area 1,889 / side-from-area 14,847 / sine-from-area 922.
  위 세 양은 균일 축척에 불변이다; 단순 “그림 크기 차이”로 설명할 수 없다.
- 기존 비교의 gzip 증가는 7,766,500 − 4,205,879 = **3,560,621 bytes (+84.7%)**다.
  registered/inline 자산을 모두 정적 import하므로 bounded decoder cache가 이 download/
  module-parse 비용을 없애지 않는다; 가벼운 행 조회와 별개로 남는 중요한 비용이다.
  facade esbuild 비교는 동일 entry의 전후 비용 근거이며 Next 배포 chunk 실측은 아니다.
- Node benchmark의 약 334ms/2,000행, sampled heap 약 +44MB는 decoder만 측정한다:
  네트워크·브라우저/모바일 parse·MathJax·DOM·실제 출력 생성 시간이나 전체 resident peak가
  아니다; heapUsed는 외부 ArrayBuffer/RSS 비용과 호출 내부 순간 peak도 전부 포착하지 않는다.
  glyph/asset 수정 후 재측정하고 이 측정 범위를 유지해야 한다.
  typography 등 비교 entry의 다른 dependency가 변경되면 performance-build.mjs:11–15의
  baseline 세 파일만 pin하는 목록도 갱신해야 비교가 오염되지 않는다.

**최종 delta에서 남은 증거.**

glyph/label-metrics 교정과 위 shared-mark 사례 해결, extreme 상세도의 수학·가독성 평가;
그 후 최종 asset/manifest/proof byte replay, 변경 hash별 두 크기 관측과 변경 contact 열람,
실제 catalog/saved v1/v2 consumer/A4·PDF, shared renderFigureSpec 관련 테스트,
최종 bundle/decoder 수치와 README provisional marker 해소가 남는다.
이 리뷰는 브라우저/Chromium, 설치, DB/env, production build, push나 대상 소스 수정을 하지 않았다.

이 리뷰의 byte replay 시점 해시(부모의 후속 glyph 수정 전):
`engineFigures.ts` = `22c43348053cbd5c7268c87a48be53d4237f59c78cb9ce9b634a99b487e60a6a`;
`engine.py` = `001ed0d1977077a120790428e6deac4f1913beaddb9b0dae972e997e9ab840ed`;
`figure_scene.py` = `2a0b32788e6297f833a06eb8e93e956aa58497f2adceca81ce85add995c2cc22`;
registered asset = `ef75adbbae37fd8b9cbc4454b37ad50ca9bfc2e20157d4e0c738c7bffc39b311`;
inline asset = `b5cd756b0b2fe0062787578e08cf763a47b23ecc18e3089167513594e77ff1ee`.
