/**
 * 실물 출력 검수 목록이 **조용히 망가지지 않게** 잡아 두는 테스트.
 *
 * 이 화면은 「무엇이 아직 종이로 확인 안 됐나」의 유일한 집계다. 항목 하나가 id 중복으로
 * 덮이거나 「종이에서 볼 것」이 빈 채로 들어가면, 화면은 멀쩡해 보이는데 그 항목은
 * 사실상 사라진다 — 검수 잔고가 실제보다 적어 보인다. 그게 이 프로젝트가 반복해서 낸
 * 결함이라(CLAUDE.md 「지표가 실패를 셀 수 있는 형태인지 먼저 확인하라」) 데이터부터 막는다.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ITEMS } from "@/app/dev/print-check/items";
import { PrintCheckList } from "@/app/dev/print-check/PrintCheckList";

describe("실물 출력 검수 목록 — 데이터", () => {
  /**
   * 적대적 리뷰가 실증했다 — 항목을 **통째로 지워도** 모든 시험이 초록이었다.
   * 「덮이는」 경로만 막고 「사라지는」 경로를 열어 뒀던 것이다. 검수 잔고가 조용히 줄면
   * 아무도 모른다. 항목을 늘리거나 줄이면 이 숫자도 같이 고쳐야 한다 — 그게 의도다.
   */
  it("항목 수가 바뀌면 알아차린다", () => {
    // 43: figure-origin-quadrant 추가 (2026-08-28 — 좌표평면 `O` 가 **그래프를
    //     비켜** 앉는다. 종전에는 원점에서 한 자리에 못 박혀 있어 기울기가 양수인
    //     직선 위에 그대로 앉았다. RPM 1학기 함수 단원 291개에서 규칙을 뽑았다
    //     (정본은 79.9% 가 빈 사분면). 좌표평면 **21장**이 달라진다.)
    // 42: figure-label-outward 추가 (2026-08-28 — 꼭짓점 이름표가 도형 **바깥**으로
    //     나갔다. 종전에는 방향 후보가 고정 순서라 도형 안쪽(비어 있다)을 집어
    //     삼각형에서도 셋 중 둘이 안으로 들어갔다. 점 이름이 **정자체**가 됐고,
    //     축척 상한을 걷어 냈다. **인쇄 크기 등급이 6장 바뀐다** — 종이 확인이 필요하다.
    // 41: figure-label-mathjax 추가 (2026-08-28 — 그림 라벨을 MathJax 가 조판한다.
    //     글자가 `<text>` 에서 **외곽선**으로 바뀌었고, 한글은 글리프가 없어 종전
    //     `<text>` 그대로다 — **한 그림 안에 두 글꼴이 섞인다.** 그 어우러짐은
    //     종이에서만 판정된다. 라벨 폭을 세는 자도 바뀌어 214장 중 18장의 viewBox
    //     폭이 달라졌다(인쇄 크기 등급 변화는 0).
    // 40: print-paragraph-break 추가 (2026-08-27 — 발문 뒤 나열 대상이 **줄을 바꿔**
    //     앉는다. `collapseWhitespace` 가 엔진의 이중 개행을 다 접고 있었다.
    //     발문이 한 줄 늘어나므로 **문항 칸 높이가 커진다** — 칸을 꽉 채우던 문항이
    //     넘쳐 잘리는지는 종이에서만 보인다. 실측 393문항 / 17,513, 초3~중2 전 학년).
    // 27: chart-pair-frame 추가 (2026-08-23 — 그래프 짝(chartPair)이 문항 열을
    //     통째로 쓰는 새 폭 등급(364px/97mm)을 연다. 지금은 0건, elem-g4 배선 뒤
    //     초4 그래프 단원에서 생긴다. 화면 검수로 대신할 수 없다 — 배율이 다르다).
    // 26: lsub-combination 추가 (2026-08-21 — ₁₀C₂ 가 «LSUB10C_2» 로 찍혔다)
    // 25: solution-hwp-latex 추가 (2026-08-21 — 정답지에 HWP 수식 스크립트가 글자로
    //     나가고 있었다. 해설 4,576문항을 LaTeX 로 바꿨다. 9.98% → 0.33%).
    // 24: math-script-residue 추가 (2026-08-21 — 보기에 `87·0/2` 가 찍히고 있었다.
    //     빈 분수 73자리를 되살리고 극한 화살표 530자리를 고쳤다. 값이 바뀌므로
    //     「보기 다섯이 말이 되는가」는 종이에서만 확인된다).
    // 23: figure-fallback-mm 추가 (2026-08-21 — mm 를 **모르는** 그림 1,765자리가
    //     상한(70mm)=최대로 그려지던 것을 픽셀 환산으로 바꿨다. 1,565문항의 그림이
    //     실제로 작아진다. 「작아져서 안 읽히는가」는 종이에서만 확인된다).
    // 21: figure-raster-300dpi 추가 (2026-08-20 — 그림 1,344장을 300dpi 재크롭본으로
    //     바꿨다. **지면 크기는 안 바뀌고** 또렷함만 바뀐다. 종이에서만 확인된다).
    // 20: figure-blend-multiply 추가 (2026-08-20 — 그림의 흰 배경(#FFFFFF)이
    //     지면 종이색(#FCFCF8)과 달라 밝은 사각형으로 떠 보였다. 곱셈 혼합으로
    //     녹인다. 화면은 배경이 흰색이라 변화가 없고 **인쇄에서만** 눈에 띈다).
    // 19: figure-print-size-mm 추가 (2026-08-19 — 그림 크기를 픽셀이 아니라
    //     물리 크기(mm)로 정한다. 값이 들어오는 순간 그림 문항 전량의 지면 크기가
    //     바뀐다. 지금은 값이 0건이라 종이에 변화가 없다).
    // 18: inline-choice-repair-r2 추가 (D-58, 2026-08-19 — 한 줄에 붙어 있던 보기
    //     다섯이 처음 지면에 선다. 문항 높이가 커지므로 칸을 넘칠 수 있다).
    // 17: short-answer-badge 추가 (2026-08-19 — 단답형에 「단답형 n」 배지가
    //     처음 지면에 나간다. 원장님 확정: 서답형은 서술형으로 합치고 단답형은 그대로).
    // 30: stat-figure-frame 추가 (2026-08-23, main — 히스토그램·도수분포다각형이
    //     처음 지면에 나간다. 같은 커밋이 `table` 열 폭을 **내용 기반**으로 바꿨는데,
    //     그것이 초4 두 소단원(1-5-2 · 2-5-3)의 잘린 표를 **드러냈다** — 옛 균등 규칙은
    //     「학생 수(명)」을 44.8 칸에 넣어 조용히 자르고 있었다. 종이에서만 확인된다).
    // 29: chart-unknown-bar 추가 (2026-08-23 — 초4 1-5-3 심화가 막대 하나를 지우고
    //     역산하게 한다. 점선 상자와 「?」가 지면에 처음 나간다. 무늬 4 3 이 인쇄
    //     해상도에서 실선으로 뭉개지는지는 종이에서만 확인된다).
    // 28: m2-shade-figures 추가 (2026-08-23 — 채색 축 회전판·색칠하기 도형이 처음
    //     지면에 나간다. 폭 224 고정이라 등급은 mid 하나지만 **종이에서 잰 값은 아니다**).
    // 16: figure-svg-inline 추가 (D-55, 2026-08-19 — figureSvg 가 처음 지면에 나간다)
    // 31: curve-graph-frame 추가 (2026-08-24 — curveGraph·netCone 이 처음 나가고,
    //     **이미 나가 있던 linearGraph 의 지면 크기가 같이 바뀐다**: 폭이 126~238 로
    //     떠다니던 것을 240 에 박았다. 옛 그림 중 셋은 눈금 글자가 본문보다 작았다).
    // 33: elem-line-tiling-figures 추가 (2026-08-24 — 초등 난이도 갈래에 `lineRelation`
    //     (초4 2-4-2·2-4-3, 이미 배선)·`tiling`(초4 2-6-4 표준, 오늘 배선)이 처음
    //     지면에 나간다. 둘 다 위젯 폭(140px/37mm) 등급이라 종이에서 처음 확인된다).
    // 32: wave6-geometry-stat-frame 추가 (2026-08-24 — FigureSpec v2 기하가 처음
    //     실사용됐다(작도 컴퍼스 자국·부채꼴 색칠·외심·무게중심). boxPlot·scatterPlot
    //     도 이 저장소의 첫 통계 차트로 처음 지면에 나간다. 이 물결로 중학 엔진
    //     873/873 전량 등록 완료).
    // 34: op-limit-scale 추가 (2026-08-24 — 원장님 지시로 ∫·lim·∑ 의 위·아래끝을
    //     0.7 → 0.6 으로 줄였다. KaTeX 기본은 연산자 첨자와 지수가 **같은 0.7배**라
    //     본문과 같은 무게로 읽혔다. 화면에서는 차이가 미묘하고 **종이에서 갈린다** —
    //     너무 줄여 안 읽히는지도 종이에서만 확인된다).
    // 35: stem-formula-break 추가 (2026-08-25 — 원장님 지시로 「…하시오.」 다음 줄에
    //     수식이 서게 했다. `collapseWhitespace` 가 모든 개행을 공백으로 녹이고 있었다.
    //     ⚠️ **문항마다 한 줄이 늘어난다** — 칸이 빠듯하던 시험지가 넘칠 수 있고,
    //     그건 종이에서만 갈린다).
    // 36: choice-marks 추가 (2026-08-25 — 원장님 확정 「보기번호는 바꾸고」로
    //     일차함수 3유형과 공유 DB 6건의 보기 표식을 ㉠~㉤ → ①~⑤ 로 바꿨다).
    // 37: print-problem-code-badge 추가 (2026-08-26 — 원장님 지시: 문제지 [단답형1] 이중번호 제거 → 문항번호 A05 표기).
    // 38: print-answer-key-layout 추가 (2026-08-26 — 원장님 지시: 정답지 문항번호/우측정렬 답/해설 3단 배치).
    // 39: print-quick-answer-1col 추가 (2026-08-26 — 원장님 지시: 정답지 빠른 정답 상자 1단 압축).
    // 44: figure-dim-label-outside 추가 (2026-08-28 — 원장님 지시 「치수 라벨도 이어서 고쳐」.
    //     입체 치수 라벨이 도형 실선 위에 앉던 것을 RPM 0849·0845 규칙으로 밖으로 뺐다:
    //     그림 149장에서 16개 → 6개. 실물에서 볼 것은 «치수 점선이 도형을 가로지르나»다).
    // 45: figure-solid-scale-weight 추가 (2026-08-28 — 원장님 확정: 치수 점선을 도형선보다
    //     가늘게(0.6/1.4) + 입체 크기를 정본 비율로. 지면에서 그림·글자 크기 관계가 바뀐다).
    // 46: round-solid-max-scale 추가 (2026-08-29 — 원장님 지시 「회전체도 등급 안 넘게
    //     최대로 키워봐」. 막던 것은 인쇄 등급이 아니라 **놀던 여백**이었다:
    //     `_fitted_cabinet` 이 라벨을 안 봐서 라벨 없는 쪽 여백(원기둥 오른쪽 22.8·
    //     구멍 원기둥 왼쪽 21.0)이 비어 있었다. 그것을 깎고 ROUND_UNITS 98 → 112.7.
    //     등급은 한 장도 안 넘었다(폭 정확히 160.0). 실물에서 볼 것은 «커진 도형에서
    //     치수 라벨이 안 잘리나»다).
    // 47: figure-svg-overflow-count 추가 (2026-08-29 적대적 점검 — 둘이 같이 나왔다:
    //     ① **엔진 그림이 시험지에 한 장도 안 나가고 있었다**(지면 경로도 인쇄
    //     페이지 매핑도 `figureSvg` 를 안 넘겼다 — 화면에는 나오는데 종이에만 없었다).
    //     ② 지면 자도 그 높이를 0으로 세고 있었다. 그림이 새로 나오고 분할도 바뀐다).
    // 48: figure-label-70pct 추가 (2026-08-29 원장님 확정 — 「70%로 전부 적용해」.
    //     정본 비 8.072 → 11.182(정본 11.88). 중등 v2 그림의 점·각·치수 글자가 24 → 16.8 로
    //     줄었다. 종이에서 볼 것은 «작아서 안 읽히지 않나»다 — 화면은 확대되니 못 본다).
    // 49: middle-length-dimension 추가 (2026-08-29 원장님 지적 「길이 치수선은 왜 자꾸 빠지나?」.
    //     중2-2 26유형이 유령 점에 날 글자를 얹고 있었다 → `withDims` 로 옮겼다.
    //     종이에서 볼 것은 «치수 점선이 도형을 감싸듯 크게 휘지 않나»다).
    // 51: middle-midseg-figure-aspect 추가 (2026-09-04 — 그림용 높이를 밑변과 **따로**
    //     뽑아 `fitPts` 의 비 유지 맞춤이 표시 붙은 선분을 9.33px 로 줄였고, 렌더러가
    //     스펙을 통째로 거부해 **그림 없이** 지면에 나갔다. 종이에서 볼 것은
    //     «발문이 「그림과 같이」라는데 그림이 있나»와 «삼각형이 바늘처럼 길쭉하지 않나»다).
    // 52: exam-2col-h2 추가 (2026-09-05 원장님 확정 D-119 — 기출 시험지 지면이 **새 틀**로
    //     처음 나간다(2단 · 머리띠 · 금색 띠). 쪽 나눔을 CSS 다단이 아니라 **잰 높이**로
    //     정하므로 종이에서 볼 것은 «단 밑이 넘치거나 겹쳐 찍히지 않나»다. 자의 성적이
    //     한 편(19문항)에서만 나왔고 과소 최악 −22px 를 24px 안전여유로 덮었다 —
    //     그 여유가 정말 충분한지는 종이에서만 알 수 있다).
    // 53: exam-headerless-box 추가 (2026-09-06 — 기출 문3 이 원본에 **없는** 〈상자〉를
    //     라벨로 달고 나갔다(원장님이 화면에서 찾으셨다). 고친 뒤 지면은 «테두리만 있고
    //     머리 없는» 상자다. 🔴 처음 고침은 적재기가 `<나열>` 을 넣게 한 것이었는데
    //     `나열` 은 입력 마커가 아니라 내부 표기라 상자가 아예 안 서고 **날 글자로
    //     지면에 찍혔다** — `tsc`·lint·관문·적재 검증이 전부 초록이었고 **스크린샷으로만**
    //     잡혔다. 종이에서 볼 것은 «〈상자〉·〈나열〉이라는 없던 이름이 찍히지 않나»와
    //     «`<상자>` 가 날 글자로 남지 않았나»다).
    // 54: solution-line-split 추가 (2026-09-06 — 해설이 여러 줄로 갈려 나가기 시작했고,
    //     그날 **자만 원문을 재고 있었다**(16,168행을 낮게 봤다). 종이에서 볼 것은
    //     «해설이 문장마다 갈리나»와 «넘쳐 사라진 문항이 없나»다 — 정답지는 2단
    //     `overflow:hidden` 이라 넘친 해설은 잘리는 게 아니라 통째로 없어진다).
    // 55: serif-selfhost 추가 (2026-09-08 — 시험지 명조를 **자체 적재**했다. 실측상 이
    //     PC 는 스택이 Noto Serif KR 로 풀리는데 그 글꼴이 Windows 기본에 없어, 없는
    //     기계는 Batang 으로 떨어지고 같은 글이 6~7% 넓어진다(224.66px vs 241px).
    //     자는 이 PC 눈금이라 그 지면의 넘침을 놓치고, 정답지는 통째로 사라진다.
    //     🔵 **이 PC 에서는 한 픽셀도 안 바뀐다** — 실은 것이 이 PC 에 깔린 그 파일을
    //     자른 것이라 본문 400 에서 0.00px 차이다. 그래서 종이에서 볼 것은 «달라졌나»가
    //     아니라 **«안 달라졌나»**이고, 굵은 자리(문항 번호·핵심 개념 정리)가 가늘어지지
    //     않았는지다 — 가변 굵기를 그대로 실었는지가 거기서 드러난다).
    // 56: exam-table-crop 추가 (2026-09-12 — 기출 둘째~넷째 편에서 **표**가 처음 지면에
    //     나간다. HWP 가 표를 한 줄에 한 칸씩 풀고 렌더러는 표를 몰라, 원본 지면의 표를
    //     오려 그림으로 붙였다. 원본 표 폭 98.7~106.5mm 가 그림 상한 70mm 로 줄어
    //     0.66~0.71 배로 찍힌다 — 칸 글자가 읽히는지는 종이에서만 안다. 그리고 동도중 문1 은
    //     그림이 〈보기〉 뒤에 서서 원본과 읽는 순서가 다르다).
    // 57·58: studio-native-hwpx-pdf · studio-export-condition-and-solve-layout
    //     (2026-09-14, 283841ec·8749b02c). 두 항목이 들어오면서 이 숫자를 안 올려
    //     main 에서 이 시험이 58 ≠ 56 으로 빨강이었다 — 2026-09-18 hwpx-writer-port 가 찾았다.
    // 59: hwpx-hancom-layout 추가 (2026-09-18 — mathg-gen 의 HWPX writer 수정 이식.
    //     수식 상자 폭을 한글이 잴 폭으로 · 넓은 간격을 탭으로 · 줄 고정 · 구역 위 여백을
    //     쪽 내용 시작점으로. 한글이 그 XML 을 어떻게 그리는지는 COM 을 안 돌려 못 봤다.
    //     그리고 우리 미리보기는 흰 전면 rect 때문에 위 여백이 전 쪽 8px 가 된다).
    // 60: achievement-report-a4 추가 (2026-09-18 D-134 Hi-fi — 학부모 성취 리포트 A4 한 장이
    //     새로 생긴다. 형태가 아직 미확정이라 `형태미확정`. 종이에서 볼 것은 «한 장에 다 나오나»와
    //     «배경 그래픽 꺼짐 · 흑백에서 칸 선·막대 채움이 남나»다 — 크롬 PDF 로는 20장이 다 1쪽이었다).
    // 61: figure-editor-text-background 추가 (2026-09-19 — 도형 편집기 글자 배경색. 저장 이미지에
    //     글자 뒤 채운 상자가 들어간다. 한글 «일반 글자»는 치수를 어림으로 잰다).
    // 62: studio-figure-transparent-background 추가 (2026-09-19 — 작업실 AI 도형 재작도의 v2 흰 바탕
    //     rect 를 뺐다. 저장 이미지가 실제 선·글자 기준으로 재어져 둘레 여백이 한 겹이 되고, 원본 폭(mm)을
    //     아는 문항은 그림이 약 1.08배 커진다. HWPX 는 투명 PNG — 한글이 어떻게 그리는지는 못 봤다).
    // 63: figure-editor-faces 추가 (2026-09-19 — 도형 편집기 면 만들기. 채우기·다각형·안쪽 채우기의 면이 선 뒤
    //     채운 path·polygon 으로 저장 이미지에 들어가고, 사각형은 노란 점으로 기울이면 polygon 이 된다).
    // 64: elementary-mixed-fraction-test-print 추가 (2026-09-19 — 옛 시험지 인쇄 `/tests/{id}/print` 가
    //     초등 가분수를 화면과 같은 함수로 대분수로 찍는다. 대분수는 폭이 조금 넓어 넘침이 바뀔 수 있다).
    // 65: elementary-mixed-fraction-per-problem 추가 (2026-09-19 — 대분수 결정을 문항 단위로. 해설이
    //     «가분수»를 부르는 초6 «(가분수)÷(분수)» 문항의 문제지 본문이 3½ 에서 7/2 로 돌아온다).
    // 66: choice-number-layout-option 추가 (2026-09-20 — 시험지 설정의 «보기 번호 배치».
    //     기본값 «자동»은 지면이 안 바뀌고, 값을 고르면 그 시험지의 보기가 고른 열 수로 선다.
    //     3열 칸은 실측 87.7px 라 긴 보기가 있는 **그 문항만** 2열·1열로 내려간다 —
    //     내려가는 것이 그 문항 하나뿐인지는 종이에서 본다).
    // 67: studio-svg-figure-width 추가 (2026-09-20 — 작업실이 다시 그린 SVG 도형이
    //     스캔 자(28mm 바닥)를 타던 것을 엔진 SVG 자(64mm)로 옮겼다. 등급 틀의 폭도
    //     화면 px·인쇄 mm 두 벌에서 mm 하나로 합쳤다).
    // 68: studio-typed-spaces 추가 (2026-09-21 — 작업실 편집기에서 친 여러 칸을 고정 공백으로
    //     저장해 지면에 그 폭 그대로 세운다. 기존 문항은 0 — 보통 공백은 예전처럼 한 칸이다).
    // 69: box-layout-columns 추가 (2026-09-21 — 〈보기〉 열 수를 검수 카드·지면이 한 규칙으로.
    //     문제 22 그림 넷이 2열 2행, 지면이 정본 <보기:cols=N> 을 읽는다).
    // 70: hwpx-grid-order 추가 (2026-09-21 — HWPX 격자 한 행 한 문단·원문 차례, 분수 보기가 번호 옆,
    //     친 여러 칸이 탭으로. 9번이 한글에서 (바)를 (마)보다 먼저 적던 것).
    // 71: box-narrow-columns 추가 (2026-09-21 트랙 51 — 좁은 단의 여러 열 〈보기〉 는 여백부터 줄이고,
    //     그래도 한 줄에 안 들면 그리는 열 수를 줄인다. 적힌 cols=N 은 그대로).
    // 72: grid-baseline-align 추가 (2026-09-21 트랙 51 — 격자 글 칸은 기준선 맞춤, 그림 칸은 위쪽).
    // 73: hwpx-equation-height 추가 (2026-09-21 — HWPX 수식 상자·줄 높이를 한글이 그릴 높이로.
    //     분수의 분모가 아래 줄을 덮던 것. 한글에서 여는 것까지가 검수다).
    // 74: table-cell-math 추가 (2026-09-21 — 인식한 표의 수·문자 칸이 본문과 같은 수식 글꼴).
    // 75: figure-label-upright 추가 (2026-09-21 — 다시 그린 도형의 수·단위 라벨이 카드·지면에서도 정자).
    // 76: figure-mid-label-line-gap 추가 (2026-09-22 — 도형 편집기 «가운데 글자»: 치수선 위 글자 뒤로
    //     선에 구멍(마스크)을 낸다. 배경색이 아니다).
    // 77: side-by-side-columns 추가 (2026-09-22 — «나란히» 칸 묶음. 서답형 소문항·그림을 제목·테두리 없이
    //     1~4열로. 좁은 단은 4 → 3 → 2 → 1 로 줄여 그린다. 새 표기라 기존 문항은 0건).
    // 78: answer-sheet-solution-postprocess 추가 (2026-09-26 후보정 T3 — 학습지 정답지 해설이 `SolutionText`
    //     (줄 나눔)를 지나고, 붙은 수식·여러 줄 수식·`\$` 가 새지 않는다).
    // 79: hwpx-repeat-dot 추가 (2026-09-26 후보정 T3 — HWPX 순환소수 점이 `dot {d}` 로. 한글에서 여는 것까지가 검수).
    // 80: english-student-a4 추가 (2026-09-30 트랙 english-print — 오늘의 영어 학생용 A4. 새 제품의 새 지면,
    //     1단 · 배점 없음 · 문단·문항 높이로 쪽 나눔. 라우트는 base 병합 뒤).
    // 81: english-teacher-a4 추가 (2026-09-30 트랙 english-print — 교사용 A4. 정답·해설·근거 상자의 회색 면이
    //     종이에 찍히는지가 핵심).
    // 82~87: concept-blank-recall · term · cloze · map · figure · key-a4 추가 (2026-09-30 트랙 cb-paper —
    //     개념 백지(D-150) 새 지면 다섯 형식 + 채점표. 은행이 차기 전에는 하네스로 뽑는다).
    // 88: english-bundle-sheets 추가 (2026-10-01 D-151 — 영어 학생용이 순서가 있는 묶음으로 갈려 하나씩 뽑힌다.
    //     변형 묶음에 원 지문이 없는지 · 머리의 «문제 묶음 1 · 3~4번» · 고른 묶음만 나오는지).
    // 89: english-grammar-underline 추가 (2026-10-01 D-151 — 어법의 `<u>` 를 글자 밑줄로. 1px · 0.3em 은
    //     검수 시작값 — g · y · p 와 닿는지는 종이에서만 정한다).
    // 90: english-teacher-head-notes 추가 (2026-10-01 D-151 — 교사용 첫 쪽 머리의 배부 순서 · 답이 보이는 문항).
    // 91: english-bare-choice-marks 추가 (2026-10-01 D-151 — 번호뿐인 보기는 보기 줄을 찍지 않는다).
    // 92: concept-blank-sheet-code 추가 (2026-10-01 트랙 cb-code — 개념 백지 모든 장 맨 아래 지면 코드 줄.
    //     영어 91 과 같은 날 따로 갈라져 병합에서 겹쳤다).
    // 93: english-vocab-underline 추가 (2026-10-01 — 어휘 밑줄은 어법과 같은 규칙. 실물 검수 대기).
    // 94: concept-blank-ten-per-level 추가 (2026-10-01 D-150 은행 3차 — 하 · 중 · 상 10개씩. 그 커밋이 이 수를
    //     안 올려 main 이 92 ≠ 93 으로 빨갰고, 영어 93 과 따로 갈라져 병합에서 겹쳤다 — 2026-10-02 리드가 맞춤).
    // 95: concept-blank-review-key-notes 추가 (2026-10-02 전수 검토 반영 — 채점 안내 문구 · 그림 속 한 글자 단위).
    // 96: concept-blank-review-terms 추가 (2026-10-03 전수 검토 반영 — 용어 칸에 조건을 실어 용어가 길어졌다).
    // 97: concept-blank-havruta-apply 추가 (2026-10-03 «개념을 묻는다» — «나» 머리말 · 채점 안내 · 문장 답).
    // 98: english-listening-student-teacher 추가 (2026-10-03 영어듣기 학생용 · 교사용 A4.
    //     그 커밋이 이 수를 안 올려 main 이 97 ≠ 98 로 빨갰다 — 같은 날 리드가 병합하며 맞춤).
    // 99: elementary-bank-net-and-hidden-dimensions 추가 (2026-10-03 일반 문제은행 외부 검토 반영 —
    //     원기둥 전개도의 두 밑면 자리 · 한 모서리를 묻는 정육면체 그림의 치수 숨김).
    // 100: textbook-studio 출력 검수 추가 — 디지털 QR 판독과 실물 스캔을 구별해 대기로 남긴다.
    // 101: bank-choice-figures 추가 — 그림 보기를 번호와 함께 고정 2열에 배치(같은 날 교재 트랙의 100 과
    //      따로 갈라져 병합에서 겹쳤다 — 리드가 맞춤).
    // 102 ~ 108: 일곱이 더해졌고 다섯 커밋 모두 이 수를 안 올렸다(2026-10-06 전체 시험에서 찾아 맞춤) —
    //   english-listening-bank-original-crops(10-04 `d19d8e0e0`) · english-listening-native-visual(10-04 `e35b6e53f`) ·
    //   textbook-v15-recovery-20261005(10-05 `8540a87ff`) · paper-readable-accent-20261005(10-05 `ceebd9ff2`) ·
    //   textbook-draft-copy-structure-refs · textbook-structure-edit-intro · textbook-structure-edit-writing-board(10-06 `0b56a388c`).
    expect(ITEMS.length).toBe(108);
  });

  /**
   * 근거가 썩는 것도 조용하다 — 없는 파일을 가리켜도 초록이었다.
   * 커밋 해시·줄 번호는 못 보지만 **파일이 있는지**는 볼 수 있다.
   */
  it("근거가 가리키는 파일은 실재한다", () => {
    for (const item of ITEMS) {
      for (const ev of item.evidence) {
        const path = ev.split(/[\s:(]/)[0];
        if (!path.includes("/") || path.startsWith("커밋")) continue;
        expect(existsSync(path), `${item.id}: ${path}`).toBe(true);
      }
    }
  });

  /**
   * 🔴 **«있다»는 «커밋됐다»가 아니다.** 위 검사는 `existsSync` 뿐이라, 근거가
   * `.tmp-orca/`(gitignore) 를 가리켜도 **그 파일을 만든 워크트리에서만** 초록이다.
   * 2026-08-30 에 실제로 그랬다 — `middle-dimension-outside` 가
   * `.tmp-orca/chordgap.ts` 를 인용했고, 그것을 만든 창에서는 관문이 초록인데
   * 초3 파일럿의 새 워크트리에서는 **빨강**이었다. 「우리 컴퓨터에서 되는가와
   * 배포본에서 되는가는 다른 질문」(2026-08-20)의 또 한 얼굴이다.
   *
   * 그래서 **git 에게 묻는다.** 한 번에 물어야 한다 — 근거마다 프로세스를 띄우면
   * 느려지고, 느린 시험은 사람이 안 돌린다.
   */
  it("🔴 근거는 **커밋되는** 파일이어야 한다 (있기만 한 것은 그 창에서만 초록이다)", () => {
    const paths = [
      ...new Set(
        ITEMS.flatMap((i) => i.evidence)
          .map((ev) => ev.split(/[\s:(]/)[0])
          .filter((p) => p.includes("/") && !p.startsWith("커밋")),
      ),
    ];
    expect(
      paths.length,
      "근거 경로를 하나도 못 모았다 — 이 검사는 아무것도 안 재고 있다",
    ).toBeGreaterThan(10);
    // `check-ignore` 는 무시되는 것만 찍고, 하나도 없으면 종료 코드 1 이다.
    let ignored = "";
    try {
      ignored = execFileSync("git", ["check-ignore", "--stdin"], {
        input: paths.join("\n"),
        encoding: "utf-8",
      });
    } catch {
      ignored = ""; // 종료 1 = 무시되는 것이 없다
    }
    expect(
      ignored.trim().split("\n").filter(Boolean),
      "gitignore 에 걸린 근거 — 다른 워크트리에서는 없는 파일이다",
    ).toEqual([]);
  });

  it("id 가 겹치지 않는다 — 겹치면 한 항목이 조용히 덮인다", () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 항목에 「종이에서 볼 것」과 근거가 있다", () => {
    for (const item of ITEMS) {
      expect(item.look.trim(), `${item.id} 의 look`).not.toBe("");
      expect(item.evidence.length, `${item.id} 의 근거`).toBeGreaterThan(0);
      expect(item.title.trim(), `${item.id} 의 제목`).not.toBe("");
    }
  });

  it("검수 통과로 표시한 항목은 날짜를 남긴다", () => {
    for (const item of ITEMS.filter((i) => i.status === "통과")) {
      expect(
        item.verifiedOn,
        `${item.id} 는 통과인데 verifiedOn 이 없다`,
      ).toBeTruthy();
    }
  });
});

describe("실물 출력 검수 목록 — 화면", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("항목을 전부 그린다", () => {
    render(<PrintCheckList items={ITEMS} />);
    for (const item of ITEMS) {
      expect(
        screen.getByRole("heading", { name: item.title }),
      ).toBeInTheDocument();
    }
  });

  it("체크하면 진행 수가 오르고 다시 열어도 남아 있다", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PrintCheckList items={ITEMS} />);

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.every((b) => !(b as HTMLInputElement).checked)).toBe(true);

    await user.click(boxes[0]!);
    expect(
      (screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked,
    ).toBe(true);

    // 다시 그려도 남아야 한다 — 종이를 넘기다 새로고침해도 어디까지 봤는지 잃지 않는다.
    unmount();
    render(<PrintCheckList items={ITEMS} />);
    expect(
      (screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("「체크 지우기」는 전부 되돌린다", async () => {
    const user = userEvent.setup();
    render(<PrintCheckList items={ITEMS} />);

    await user.click(screen.getAllByRole("checkbox")[0]!);
    await user.click(screen.getByRole("button", { name: "체크 지우기" }));

    expect(
      screen
        .getAllByRole("checkbox")
        .every((b) => !(b as HTMLInputElement).checked),
    ).toBe(true);
  });

  it("근거에 없는 판정 기준은 (제안) 으로 구분한다", () => {
    render(<PrintCheckList items={ITEMS} />);
    const suggested = ITEMS.filter((i) => !i.lookFromSource).length;
    expect(screen.getAllByText(/종이에서 볼 것 \(제안\)/)).toHaveLength(
      suggested,
    );
  });
});
