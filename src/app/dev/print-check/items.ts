/**
 * 실물 프린터 출력 검수 대기 목록 — **CLAUDE.md 절대 규칙 6 의 미결 잔고.**
 *
 * 「인쇄 관련 변경은 실물 프린터 출력 검수까지가 완료 조건」인데, 2026-08-17~18 이틀
 * 동안 지면이 바뀌는 변경이 대량으로 main 에 들어갔고 **그중 종이로 확인된 것은 하나도
 * 없다.** 어디에 무엇이 밀려 있는지 한 장에 모은다.
 *
 * ## 이 파일이 SSOT 다
 *
 * 항목을 추가·해제할 때는 이 파일을 고친다. 화면(`page.tsx`)은 여기 적힌 것만 그린다.
 * 검수를 마쳤으면 `status` 를 `"통과"` 로 바꾸고 `verifiedOn` 에 날짜를 적는다 —
 * 체크박스 표시는 브라우저에만 남는 진행 메모라, **완료 기록은 여기 코드에 남겨야 한다.**
 *
 * ## 「무엇을 봐야 하나」를 반드시 적는다
 *
 * 「인쇄해 보세요」만으로는 아무도 판정할 수 없다. 종이에서 **무엇이 보이면 불합격인지**를
 * 적는다. 근거 문서에 그 지시가 있으면 그대로 옮기고, 없으면 `제안` 으로 표시한다 —
 * 남이 쓴 것과 내가 지어낸 것을 섞지 않는다.
 */

export type CheckStatus = "대기" | "통과" | "형태미확정";

export interface PrintCheckItem {
  id: string;
  /** 무엇을 검수하는가 — 짧은 이름 */
  title: string;
  /** 지면이 어떻게 바뀌었나 */
  changed: string;
  /** 종이에서 무엇을 보면 되나. `fromSource` 가 false 면 근거 문서에 없는 **제안**이다. */
  look: string;
  lookFromSource: boolean;
  /** 근거 위치 (파일:줄 또는 커밋) */
  evidence: string[];
  /** 규모 — 몇 문항이 영향을 받나 */
  scale?: string;
  status: CheckStatus;
  verifiedOn?: string;
  /** 이 항목이 드러나려면 시험지에 무엇이 들어가야 하나 */
  needs?: string;
  /**
   * **원장님이 지금 정할 수 없는 이유.** 값이 있으면 「원장님 차례」가 아니다 —
   * 우리가 선행 작업을 해야 시안이 나온다.
   *
   * ⚠️ `status: "형태미확정"` 만으로는 「원장님이 고르시면 되는 것」과 「고를 것이
   * 아직 없는 것」이 **안 갈린다.** 2026-08-25 에 원장님이 목록을 보시고
   * 「뭘 결정해야 하는지 하나도 모르겠다」고 하신 자리가 정확히 여기다.
   * 열거형에 값을 더하지 않고 이 칸으로 가른다(D-106 교훈 — 값을 더하면
   * 손으로 셋을 나열한 자리가 조용히 눈이 먼다).
   */
  blockedBy?: string;
  changedOn: string;
}

/** 검수는 전부 이 화면에서 뽑는다. 시험지 id 는 출제할 때마다 다르다. */
export const PRINT_ROUTE = "/tests/{시험지id}/print";

/**
 * 그림 관련 넷은 **한 시험지에 다 안 나온다** — 벡터로 바뀐 문항 · mm 를 아는 문항 ·
 * 배경이 흰 그림 · 재크롭본이 서로 다른 문항이라, 시험지를 몇 장 뽑아도 넷이 같이
 * 찍힐 보장이 없다. 그래서 넷을 한 장에 모은 **견본지**를 따로 둔다.
 *
 * 첫 장에 100mm 자가 있다 — 인쇄 배율이 100% 가 아니면 아래 판정이 전부 무효다.
 */
export const SPECIMEN_ROUTE = "/dev/print-specimen";

/**
 * 나머지 미결은 **시험지를 뽑아 봐야** 드러난다. 그런데 출제 엔진이 고른 문항이
 * 그 항목들을 다 건드릴 보장이 없다 — 서술형이 하나도 안 뽑히면 「서술형 배지」는
 * 영영 못 본다. 이 화면은 **일부러 그 종류를 넣어** 제품 지면에 그대로 얹는다.
 * 못 채운 자리는 화면 위에 크게 찍는다(그 항목은 검수했다고 적으면 안 된다).
 */
export const PAPER_SPECIMEN_ROUTE = "/dev/print-paper";

/** 견본지가 대신 판정해 주는 항목들. */
export const SPECIMEN_ITEM_IDS = [
  "figure-print-size-mm",
  "figure-svg-adopt",
  "figure-blend-multiply",
  "figure-raster-300dpi",
] as const;

export const ITEMS: PrintCheckItem[] = [
  {
    id: "figure-raster-300dpi",
    title: "그림 1,344장을 **300dpi 재크롭본**으로 바꿨다",
    changed:
      "원본 시험지 PDF 에서 그림을 **다시 오려** 픽셀을 촘촘하게 만들었다(대체로 1.5배). " +
      "**지면 크기는 안 바뀐다** — 앞서 물리 폭(mm)을 넣어 두었기 때문에 픽셀이 늘어도 " +
      "그리는 크기가 그대로다(실측 1,641자리 전부 0px 변화). 바뀌는 것은 **또렷함뿐**이다. " +
      "이 무리의 150dpi 미만이 879 → 418 로 줄었다. " +
      "파일을 바꾸면서 DB 의 픽셀 치수(`figure_dims`)도 같은 실행에서 고쳤다 — " +
      "하나만 하면 넘침 판정이 옛 픽셀로 재고 지면은 새 파일을 그린다.",
    look:
      "① 바뀐 그림의 **선·글자·눈금이 종전보다 또렷한가.** 이게 이 변경의 유일한 목적이다. " +
      "② 그림이 종전과 **같은 크기**로 나오는가 — 커지거나 작아졌으면 그건 결함이다(0건이어야 한다). " +
      "③ 다시 오리면서 **가장자리가 잘리거나** 옆 문항 글자가 딸려 들어오지 않았는가. " +
      "④ 안 바꾼 그림(가로가 안 늘어 그대로 둔 11,383장)과 **한 지면에 섞여** 있을 때 " +
      "또렷함 차이가 눈에 거슬리지 않는가. " +
      "⑤ 사진처럼 흐릿한 그림이 남아 있는가 — 그건 원본이 스캔이라 다시 오려도 안 나아진다(벡터가 다음 수다).",
    lookFromSource: false,
    evidence: [
      "scripts/qa/swap-figure-files.ts (고르는 규칙 · 되돌리기)",
      "scripts/qa/survey-figure-swap.py (계획 만들기)",
      "src/__tests__/unit/swapFigureFiles.test.ts",
      "scripts/qa/mutate-swap.sh (가드 5개 · 5개 다 빨강)",
      "scripts/qa/reports/figure-swap-ledger.json (되돌리기 원장 1,344행)",
      "docs/planning/tracks/report-figure-apply.md",
    ],
    scale:
      "계획 13,911장 중 **1,344장**만 바꿨다(문항 1,249건). 나머지는 사유를 다 세어 두었다 — " +
      "가로가 안 늘어 이득이 0 인 것 11,383 · **아무 문항도 안 쓰는 고아 파일 1,172** " +
      "(371개 시험지 폴더가 통째로 고아다) · 확장자가 달라져 URL 을 바꿔야 하는 것 11 · " +
      "지면 폭이 달라지는 것 1(mm 를 몰라 폭이 아직 픽셀에서 나오는 그림이라 뺐다).",
    status: "대기",
    needs: "실물 출력",
    changedOn: "2026-08-20",
  },
  {
    id: "figure-print-size-mm",
    title: "그림 크기를 **픽셀이 아니라 물리 크기(mm)** 로 정한다",
    changed:
      "종전 규칙은 「픽셀 폭이 264.567(=70mm)을 넘으면 70mm 로 줄이고, 아니면 픽셀 그대로(96dpi)」뿐이었다. " +
      "**「얼마로 그린다」가 없다** — 원본 가로가 41~7,343px(중앙 425)이라 같은 삼각형이 문항마다 다른 크기로 인쇄된다. " +
      '이제 그림마다 「원본 지면에서 차지하던 물리 폭(mm)」을 알면 `<img style="width: Xmm">` 로 그리고, ' +
      "넘침 판정도 **같은 함수**로 그 크기를 잰다. **모르면 종전과 한 글자도 다르지 않다**(회귀 0). " +
      "원장님 지시 2026-08-19 「모든 그림이나 도형 크기가 일관성이 있어야 하니까」.",
    look:
      "① 같은 종류의 도형(삼각형·수직선·좌표평면)이 문항마다 **같은 크기**로 나오는가 — 이게 이 변경의 목적이다. " +
      "② 작아진 그림의 글자·눈금이 **읽히는가.** 물리 크기를 따르면 종전보다 작아지는 그림이 생긴다(종전에 70mm 로 확대되던 것). " +
      "③ 그림이 문항 열(약 96mm)을 넘어 옆 칸을 침범하지 않는가 — 어떤 그림도 70mm 를 넘으면 안 된다. " +
      "④ 그림 아래 보기·정답란이 밀려 다음 문항과 겹치지 않는가(넘침은 잘림이 아니라 **겹침**으로 나타난다). " +
      "⑤ mm 를 모르는 그림과 아는 그림이 **한 지면에 섞여** 있을 때 어색하지 않은가.",
    lookFromSource: false,
    evidence: [
      "src/lib/figurePrintSize.ts (규칙 한 곳 — 자와 지면이 같이 부른다)",
      "src/lib/printOverflow.ts `estimateFigureBlockPx`",
      "src/components/math/ProblemContent.tsx (인라인 `width: Xmm`)",
      "src/__tests__/unit/figurePrintSize.test.ts · printFigureHeight.test.ts · problemFigures.test.tsx",
      "scripts/qa/mutate-figure-print-size.mjs (변이 20 · 잡힘 18 · 동치 2 · 안 잡힘 0)",
      "docs/planning/tracks/figure-quality-brief.md §9 · §14",
      "docs/planning/tracks/report-figure-print-size.md",
      "docs/planning/tracks/report-figure-apply.md (적재 전후 실측 · 새로 넘치는 3문항)",
      "scripts/qa/reports/figure-source-mm-apply.json (되돌리기 원장 8,238행)",
    ],
    scale:
      "🔴 **값이 들어왔다 (2026-08-20, 원장님 확정 「끝까지 — 지면·출제까지」).** " +
      "`figure_source_mm` 에 **8,238문항 · 그림 9,312장**을 적재했고 조회·인쇄 배선까지 넣었다 — " +
      "**이 항목은 이제 실제로 종이가 바뀐다.** 그림은 대체로 **작아진다**(문항 높이 중앙 −75px). " +
      "그림이 있는데 mm 를 모르는 1,490문항은 **종전과 한 픽셀도 같다**(회귀 0)  — ⑤ 가 보는 자리다. " +
      "넘침 판정 2,655 → 1,034 이고, **3문항이 새로 넘친다**(원본에서 크던 그림이 제 크기를 되찾아서다): " +
      "중2 다항식의 덧셈과 뺄셈 · 중2 여러 가지 경우의 수(그림 두 장이 나란히 94mm 라 접힌다) · 공통수학2 무리함수(1). " +
      "바닥값(최소 mm)은 **두지 않기로** 확정했다 — 원본 시험지에 실린 크기 그대로 간다.",
    status: "대기",
    needs:
      "값이 DB 에 들어오기 전에는 `/dev/figure-print-size` 에서 **전후 비교 지면**으로 본다 " +
      "(같은 문항을 종전 규칙 / 새 규칙으로 나란히 그린다). " +
      "그 화면은 실측 원장(`scripts/qa/reports/figure-rect-ledger.json`)을 읽는다. " +
      "원장이 없으면 가정값으로 내려가지 않고 「원장이 없다」고 적고 멈춘다. " +
      "값이 컬럼에 들어오면 실제 인쇄 화면이 바뀌고 그때 이 항목이 실물 검수 대상이 된다.",
    changedOn: "2026-08-19",
  },
  {
    id: "figure-blend-multiply",
    title: "그림의 **흰 배경**을 지면 종이색에 녹인다 (곱셈 혼합)",
    changed:
      "오려 온 그림은 배경이 **순백(#FFFFFF)** 인데 지면은 `--paper-warm`(#FCFCF8) 이라, " +
      "그림 자리마다 **더 밝은 사각형**이 떠 보였다(원장님 2026-08-20: 「그림은 배경이 흰색인데, " +
      "문제지는 배경이 흰색이 아니라 좀 이상한건 있긴하네」). " +
      "그림에 `mix-blend-multiply` 를 걸어 흰 배경이 종이색에 녹게 했다 — 흰색을 곱하면 바탕이 " +
      "그대로 남고 검은 획·글자는 진하게 남는다. **그림 파일은 하나도 안 건드린다.** " +
      "화면(흰 배경)에서는 곱셈이 아무 일도 안 하므로 문제은행·검수 화면은 종전 그대로다.",
    look:
      "🔴 ① **그림 둘레의 밝은 사각형이 사라졌는가** — 이 변경의 목적이다. " +
      "② 그림 안의 **검은 선·글자가 옅어지지 않았는가.** 곱셈은 진한 쪽을 남기므로 그대로여야 한다. " +
      "③ **색 있는 그림**(노란 바탕 삽화·빨간 도형)의 색이 탁해지지 않았는가 — 종이색이 곱해진다. " +
      "④ 그림 안에 **원래 흰색으로 칠한 부분**(가림·지우개 역할)이 있으면 그 자리가 비쳐 보이지 않는가. " +
      "🔴 ⑤ **프린터가 혼합을 제대로 찍는가** — 브라우저·드라이버마다 다르게 나올 수 있는 부류다. " +
      "화면 미리보기가 멀쩡해도 종이에서 회색 사각형으로 나오는 일이 있는지 반드시 확인한다.",
    lookFromSource: false,
    evidence: [
      "src/components/math/ProblemContent.tsx `FIGURE_BLEND_CLASS`",
      "src/__tests__/unit/problemFigures.test.tsx (「흰 배경을 지면 색에 녹인다」)",
      "src/components/print/TestPrint.module.css `--paper-warm` = #FCFCF8",
    ],
    scale:
      "그림이 붙은 문항 **전량**이 대상이다(그림 16,000여 장). 되돌리기는 상수 한 줄을 지우는 것이다.",
    status: "대기",
    needs:
      "혼합은 **인쇄에서만 눈에 띄는** 변경이다(화면은 배경이 흰색이라 아무 일도 안 한다). " +
      "그래서 미리보기로는 판정이 안 되고 실물 출력이 필요하다. " +
      "특히 색 있는 그림 한 장과 흰색으로 가린 부분이 있는 그림 한 장을 같은 지면에 넣어 본다.",
    changedOn: "2026-08-20",
  },
  {
    id: "inline-choice-repair-r2",
    title:
      "R2 — 한 줄에 붙어 있던 보기 다섯이 **처음 지면에 서는** 문항 (D-58)",
    changed:
      "`parseProblemContent` 가 줄 중간 보기 마커를 보기 경계로 본다. 그 전까지 이 문항들은 " +
      "**보기가 0칸**이라 발문만 찍히고 학생이 고를 칸이 아예 없었다. 이제 보기 다섯 칸이 " +
      "새로 생기므로 **문항 높이가 커진다** — 칸을 넘치거나 다음 문항을 밀 수 있다. " +
      "실측: 옛 파서와 전량 대조에서 판정이 바뀐 것은 2건뿐이고(둘 다 개선), 잠금이 풀리면 32건이 지면에 새로 선다.",
    look:
      "① 보기 다섯이 문항 칸 안에 다 들어가는가 — 다섯째 보기가 잘리거나 다음 장으로 넘어가지 않는가. " +
      "② 보기가 두 열로 앉을 때 좌우가 겹치지 않는가(원본이 두 열이던 문항들이다). " +
      "③ 보기 번호 ①②③④⑤ 가 빠짐없이 차례로 찍히는가. " +
      "④ 발문 끝에 보기 글자가 **남아 있지 않은가** — 잘라 낸 자리가 발문에 다시 보이면 불합격이다.",
    lookFromSource: false,
    evidence: [
      "src/lib/problem/choiceRepairRules.ts (규칙 한 벌)",
      "src/lib/problem/parseProblemContent.ts (가드: 1..n 이고 n>=4 일 때만 받는다)",
      "src/__tests__/unit/inlineChoiceRepair.test.ts",
      "docs/planning/tracks/reports/hwp-rescue.md §2",
    ],
    scale:
      "판정이 바뀌는 문항 32건(현재 전량 `directUseAllowed=false` 로 잠겨 있어 지면에 안 나간다). " +
      "잠금이 풀리는 순간부터 종이에 나간다 — 그전에 검수해야 한다.",
    status: "대기",
    needs:
      "보기가 한 줄에 붙어 있던 문항이 시험지에 들어가야 한다. 잠금이 풀리기 전에는 " +
      "`/dev/print-check` 표본이나 mock 문항(`…000002`·`…000025`)으로 봐야 한다 — " +
      "그 둘이 R2 로 보기 0칸 → 4칸이 된 실제 사례다.",
    changedOn: "2026-08-19",
  },
  {
    id: "chart-pair-frame",
    title: "그래프 짝(chartPair) — 문항 열을 통째로 쓰는 **새 폭 등급**",
    changed:
      "두 그래프에서 값을 읽어 곱하는 유형(D-70 계열)을 그리려고 `chartPair` 를 넣으면서 " +
      "`figureSvgFrame` 에 **네 번째 폭 등급**을 만들었다 — 화면 364px / 지면 **97mm**. " +
      "지금까지 지면 폭은 70·64·37mm 셋뿐이었고, 97mm 는 그중 어느 것보다 넓다(문항 열 전체). " +
      "짝은 viewBox 가 405단위라 기존 `wide`(70mm)에 넣으면 눈금 글자가 2.9mm 로 줄어 " +
      "본문보다 작아진다. 97mm 에서 3.35mm(현행 단독 그래프의 90%)가 된다.",
    look:
      "① 짝이 문항 열 밖으로 넘치지 않는가 — 97mm 는 열을 꽉 채우는 폭이라 좌우 여백이 없다. " +
      "② 두 그래프의 **눈금 숫자**가 본문 글자보다 작아 보이지 않는가(계산상 90%, 종이에서 확인). " +
      "③ 가로 막대의 「0 10 20 30 40 (개)」가 서로 붙지 않고 읽히는가. " +
      "④ 두 그래프의 가로축이 같은 줄에 서는가(값을 견주는 유형이라 이게 어긋나면 못 읽는다). " +
      "⑤ 짝이 든 문항이 칸을 넘겨 다음 문항을 밀지 않는가(계산상 그림 197px · 칸 여유 225px). " +
      "⑥ **⚠️ 이 등급이 실제로 안 걸린다** — 실측(2026-08-23, 초4 1-5-3 짝 53장 전량 렌더): " +
      "viewBox 가 **273~360단위**라 `FIGURE_SVG_PAIR_VIEWBOX`(380) 띠에 **한 번도 안 들어간다.** " +
      "위 「405단위」는 지금 나오는 짝과 다르다. `268.8 < w ≤ 320` 인 **17장(32%)** 은 " +
      "`mid`(240px)로 떨어져 눈금 글자가 **11.45~12.30px** — 본문 12.5px 미만이다. " +
      "파이썬 `_assert_ticks_readable` 은 틀을 **늘 364 로** 잡아 그 17장을 통과시킨다. " +
      "인쇄 검수 때 **이 띠를 같이 볼 것** — 폭이 아니라 kind 로 등급을 정해야 갈린다. " +
      "⑦ **수리 완료(2026-08-23) — 그래서 이 항목은 이제 «진짜 97mm» 를 검수한다.** " +
      "폭이 아니라 kind 로 가른다: 파이썬 `_chart_pair` 가 `<desc>chartPair</desc>` 를 심고 " +
      "`figureSvgSize` 가 **폭보다 먼저** 그것을 본다(`FIGURE_SVG_PAIR_VIEWBOX` 는 `@deprecated`). " +
      "**폭으로는 애초에 못 갈랐다** — 실측 2,924개 렌더에서 단독 `cuboid` 가 128.17~324.97 이라 " +
      "짝(273.21~359.61)과 **겹친다.** 어느 문턱을 놓아도 한쪽이 틀린다(문턱이 아니라 축이 틀렸다). " +
      "⚠️ **여기까지는 화면 이야기다.** 종이에서 확인할 것은 그대로 ①~⑤ 이고, 특히 지금까지 " +
      "`mid` 로 작게 나가던 **17장이 이제 97mm 로 커진다** — 그 17장이 칸을 넘기지 않는지(⑤) " +
      "**새로 봐야 한다.** 수리 전 지면과 수리 후 지면은 다른 물건이다.",
    lookFromSource: false,
    evidence: [
      "src/lib/figure/figureSvgFrame.ts (FIGURE_SVG_PAIR_MAX_PX · FIGURE_SVG_PAIR_MM)",
      "scripts/figure/elem_advanced.py (_chart_pair · PAIR_FRAME_PX · _assert_ticks_readable)",
      "docs/planning/07-coding-convention.md D-70",
    ],
    scale:
      "지금은 0건 — elem-g4 가 판매 결합 유형을 배선하면 생긴다. 초4 그래프 단원 몫",
    needs:
      "짝이 든 문항을 시험지에 넣어 실제로 뽑아야 드러난다. 화면으로는 364px 로 보여 " +
      "지면 97mm 와 배율이 달라, **화면 검수로 대신할 수 없다**",
    status: "대기",
    changedOn: "2026-08-23",
  },
  {
    id: "chart-unknown-bar",
    title: "지워진 막대(unknown) — 점선 상자와 「?」가 종이에서 읽히는가",
    changed:
      "초4 1-5-3 심화(D-72)가 막대 하나를 지우고 전체에서 역산하게 한다. 지워진 항목은 " +
      "값 축 전체를 점선 상자(무늬 4 3 — 겨냥도 숨은 모서리 5 4 와 다른 무늬)로 두르고 " +
      "가운데 「?」를 넣는다(원장님 확정 2026-08-23). 값 0 인 막대는 rect 없이 이름표 「0」만 " +
      "그린다. 둘 다 지면에 처음 나가는 표현이다.",
    look:
      "① 점선이 종이에서 점선으로 보이는가 — 무늬 4 3 이 인쇄 해상도에서 실선으로 뭉개지지 " +
      "않는가. ② 「?」가 눈금 숫자·격자선과 겹쳐 읽기 어렵지 않은가. ③ 점선 상자와 이웃 " +
      "막대의 간격이 종이에서 구분되는가. ④ 값 0 항목의 이름표 「0」이 축과 겹치지 않는가.",
    lookFromSource: false,
    evidence: [
      "scripts/figure/elem_advanced.py (UNKNOWN_DASH · _bar_chart · _bar_chart_h)",
      "src/lib/elementary/g4.ts (tier53Deep — 지워진 막대 스펙)",
      "docs/planning/07-coding-convention.md D-72 · D-66⑺",
    ],
    scale:
      "초4 1-5-3 심화 갈래 전량 — 갈래가 출제에 실리는 순간부터 지면에 나간다",
    needs:
      "심화 갈래 문항이 든 시험지를 실제로 뽑아야 한다. 점선 인쇄 품질은 화면으로 대신할 수 없다",
    status: "대기",
    changedOn: "2026-08-23",
  },
  {
    id: "figure-svg-inline",
    title:
      "AI 변형이 새로 그린 도형(SVG)의 지면 배치 — 처음 종이에 나가는 갈래",
    changed:
      "`Problem.figureSvg` 가 계약·직렬화·지면에 처음 이어졌다(D-55). 그 전까지는 DB 컬럼만 있고 0건이라 **한 번도 인쇄된 적이 없다.** 스캔 그림(`figureUrls`, `<img>`)과 달리 이쪽은 inline `<svg>` 이고 폭 규칙도 따로다 — 큰 도형 360px / 70mm, 중간(각·상자 연쇄) 240px / 64mm, 위젯 140px / 37mm. `sanitize_svg` 가 width/class 를 버리므로 판정은 viewBox 만 본다.",
    look: "① 도형이 문항 칸 안에 들어가는가(넘쳐서 다음 문항을 밀거나 겹치지 않는가). ② 선 굵기가 인쇄에서 사라지거나 뭉개지지 않는가 — 벡터라 화면에서 멀쩡해도 종이에서 다르다. ③ 도형 안 글자(꼭짓점 이름·치수)가 읽히는 크기인가. ④ 스캔 그림과 같은 문항에 함께 있을 때 두 그림이 나란히 서는가.",
    lookFromSource: false,
    evidence: [
      "src/components/math/ProblemContent.tsx (figureSvg 블록)",
      "docs/planning/09-figure-engine-guide.md §0.1",
      "docs/planning/07-coding-convention.md D-55",
    ],
    scale:
      "지금은 0건 — AI 변형으로 채택한 문항에서만 생긴다. 원본 후보는 그림 문항 9,419건(출제 가능의 20.2%)",
    needs:
      "그림 문항을 변형해 도형이 그려진 후보를 채택하고, 그 문항을 시험지에 넣어야 드러난다",
    status: "대기",
    changedOn: "2026-08-19",
  },
  {
    id: "figures-multi",
    title: "그림 회수 590건 — 다장 문항의 지면 배치",
    changed:
      "그림이 없던 1,420문항에서 기출 그림을 되붙였다(기출 745 → 174). 매퍼가 그림을 「바로 앞 문항」에 붙이므로 옆 문항 그림이 딸려 온 경우가 있다. **현재 수치는 문서 16 §2 를 볼 것** — 여기 적힌 숫자는 낡는다.",
    look: "한 문항에 그림이 2장 이상 붙은 문항이 칸을 넘겨 다음 문항을 밀거나 겹치는지, 남의 그림이 섞여 있지 않은지. 그림 폭은 인쇄 70mm 고정이다.",
    lookFromSource: true,
    evidence: [
      "docs/planning/16-figure-recovery-ledger.md §3.3",
      "커밋 4681cf43",
    ],
    scale: "새로 생긴 다장 문항 78건",
    needs: "그림이 2장 이상 붙은 문항을 일부러 포함시켜야 드러난다",
    status: "대기",
    changedOn: "2026-08-18",
  },
  {
    id: "body-typeset",
    title: "본문 조판 8건 — 세부 문항 줄바꿈·다단 등식·조건 상자",
    changed:
      "세부 문항(⑴⑵⑶) 앞에서 줄을 바꾸고, 계산 과정 등식을 단계마다 나누고, 「다음 조건」을 상자로 만들었다. 지면이 세로로 길어져 넘침 경고가 폭 605 → 709건, 줄 수 474 → 623건이 됐다.",
    look: "① ⑴⑵ 가 각각 새 줄에서 시작하는지 ② 등식이 단계마다 끊기되 끊긴 줄이 들뜨지 않는지 ③ 「□」 뒤 공백이 사라졌는지 ④ 한 장에 2문항이 들어가되 아래 문항과 겹치지 않는지 — 넘침은 잘림이 아니라 겹침이다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/body-typeset.md:42",
      "커밋 1faea81b (1,783문항) 외 6건",
    ],
    scale: "1,988문항 (합산치 — 근거 문서에 이 숫자가 그대로 적혀 있지는 않다)",
    status: "대기",
    changedOn: "2026-08-18",
  },
  {
    id: "two-column",
    title: "보기 2열 → 1열 707문항",
    changed:
      "표시폭 계산이 연산자 여백을 세기 시작해 1열로 내려가는 문항이 6.0%(2,063건) → 8.0%(2,770건)이 됐다. 지면 세로 배분이 바뀐다.",
    look: "1열로 내려간 문항에서 보기가 3줄 → 5줄이 되며 칸 밖으로 밀리는지. 반대로 2열로 남은 문항에서 보기가 한 칸 안에서 두 줄로 접히는지(원장님이 처음 지적한 증상).",
    lookFromSource: false,
    evidence: ["src/lib/math/displayWidth.ts:161", "커밋 9f6814e4"],
    scale: "707문항 증가",
    status: "대기",
    changedOn: "2026-08-18",
  },
  {
    id: "math-residue",
    title: "수식 잔재 후보정 — 본문 1,706행 직접 변경",
    changed:
      "지면에 날 글자로 나가던 `le` `ge` `3times5` `\\overarc` 를 고쳤다. content 1,185행 · answer 17행 · solution 504행. 붉게 나가는 문항 671 → 619.",
    look: "① 부등호 ≤ ≥ 가 제대로 그려지는지(`le`/`ge` 가 남아 있지 않은지) ② 붉은 글씨가 흑백 인쇄에서 회색이 되어 「안 보이는 오류」가 되지 않는지 ③ 호 기호 ⌒ 와 순환마디 점이 12.5px 지면에서 실제로 보이는지.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/render-d-math-residue.md:294",
      "커밋 5172b238 외",
    ],
    scale: "1,706행",
    status: "대기",
    changedOn: "2026-08-18",
  },
  {
    id: "box-card",
    title: "〈보기〉·〈조건〉 상자 카드 3,573문항",
    changed:
      "상자에 테두리 1px + 안쪽 여백을 줬다. 상자가 있던 문항의 세로 높이가 대략 2줄분 늘어난다. 보기 2,065문항도 1열로 내려갔다.",
    look: "① 상자 테두리가 흑백 인쇄에서 나오는지 ② 상자가 페이지 경계에서 잘리지 않는지 ③ 2줄 증가분 때문에 문항이 칸을 넘치는지 — 자습 지면은 고정 높이라 넘치면 조용히 잘린다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/render-b-box.md:196",
      "src/components/math/ProblemContent.tsx (2열 판정 주석)",
    ],
    scale: "상자 3,573 + 1열 2,065",
    status: "대기",
    changedOn: "2026-08-17",
  },
  {
    id: "essay-badge",
    title: "서술형 배지 — 1px 금색 테두리 + 10px 글자",
    changed:
      "본문에 박혀 있던 `[서술형 3]` 을 DB 에서 8,436행 걷어내고 그 자리를 조판이 배지로 채운다.",
    look: "배지 테두리가 **1px 금색 실선**이고 글자가 10px 다(`TestPrint.module.css:301`). 근거 문서는 「10px 테두리」라 적었지만 실물은 1px 이다 — 흑백 레이저에서 그 얇은 선이 아예 안 나오거나 회색으로 뭉개지지 않는지. 그리고 배지가 붙은 문항이 정말 서술형인지 — 단답형↔서술형 275행이 뒤바뀌어 있던 것을 고친 뒤 종이 확인이 없다.",
    lookFromSource: true,
    evidence: [
      "docs/planning/tracks/reports/render-c-body-postfix.md:185",
      "src/components/print/TestPrint.module.css:301",
    ],
    scale: "8,436행",
    needs: "서술형 문항이 포함돼야 배지가 찍힌다",
    status: "대기",
    changedOn: "2026-08-17",
  },
  {
    id: "multi-answer",
    title: "복수정답 지면 표기 `③, ④` (D-50)",
    changed:
      "학교가 두 답을 모두 정답 처리한 문항 15건을 원문자 + 쉼표 + 한 칸으로 인쇄한다.",
    look: "정답지 「빠른 정답」 그리드 칸에서 `③, ④` 두 글자가 한 칸 안에서 줄바꿈되거나 잘리지 않는지. 원문자는 KaTeX 없이 평문으로 흐른다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/07-coding-convention.md D-50",
      "track-b-report.md:255",
    ],
    scale: "15건",
    status: "대기",
    changedOn: "2026-08-16",
  },
  {
    id: "paper-parity",
    title: "PaperProblemView 신설 — 화면·지면 통일",
    changed:
      "「모든 문제를 인쇄와 같은 뷰로」 지시에 따라 문제은행·검수·인쇄를 한 컴포넌트로 통일하면서 인쇄 템플릿과 A4Page 의 마크업·CSS 변수가 실제로 바뀌었다. 커밋은 화면 통일만 근거로 들고 지면 검수를 언급하지 않았다.",
    look: "화면(`/problems`)에서 본 문항과 종이에 인쇄된 같은 문항의 줄바꿈 위치가 글자 단위로 같은지. 어긋나면 통일 자체가 깨진 것이다.",
    lookFromSource: false,
    evidence: ["커밋 2c3c6d0d", "src/components/print/PaperProblemView.tsx"],
    status: "대기",
    changedOn: "2026-08-17",
  },
  {
    id: "perf-lazy",
    title: "성능 변경 — 그림 지연 로딩·KaTeX 지연 import",
    changed:
      "그림 지연 로딩과 KaTeX 406KB dynamic import 를 넣으며 「인쇄 지면은 종전 그대로」를 설계 제약으로 삼았으나, 빌드 산출물로만 검증했다.",
    look: "인쇄 미리보기에서 Ctrl+P 를 즉시 눌렀을 때 ① 수식이 이미 다 그려져 있는지(늦으면 빈 자리로 인쇄된다) ② 그림이 빠진 문항이 없는지 — 지연 로딩이 지면에 새면 학생이 못 푸는 시험지가 나간다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/perf-c-bundle.md:258",
      "커밋 cebddecd 외",
    ],
    status: "대기",
    changedOn: "2026-08-17",
  },
  {
    id: "t52-base",
    title: "T5.2 인쇄 미리보기 + 인쇄 CSS 전체 (태스크 자체가 미완)",
    changed:
      "Mathgen 자습 템플릿 일체를 이식했다. 태스크 제목이 「코드 GREEN, 실물 검수 대기」다. T5.1 은 시안 선택용 출력이었고 제품 지면은 아직 한 번도 종이로 검수되지 않았다.",
    look: "명조 가독성 · 모눈 농도 · 여백 · 수식 깨짐 · 4장 스테이플 — 05 문서가 T5.2 로 넘긴 다섯 가지.",
    lookFromSource: true,
    evidence: [
      "docs/planning/06-tasks.md:713",
      "docs/planning/05-design-system.md:337",
    ],
    status: "대기",
    changedOn: "2026-08-14",
  },
  {
    id: "overflow-first-page",
    title:
      "**문항 길이가 장당 문항 수를 정한다** — 긴 문항은 장을 통째로 쓴다 (원장님 확정 반영)",
    changed:
      "원장님 확정(2026-08-21): 「문항 길이에 따라 배치를 다르게. 길이가 긴 문항은 2개를 넣을 수 없음. " +
      "길이가 길면 1개로.」 그대로 `packProblems` 가 문항 높이를 보고 나눈다. " +
      "문항 칸은 `.problemItem { flex: 1 1 0% }` 라 **«그 장에 몇 개인가»**로 갈린다 — " +
      "첫 장 반 칸 405px · 이어지는 장 반 칸 484px · 혼자 쓰면 838px / 997px. " +
      "그래서 **같은 문항이 첫 장이면 혼자 쓰고 뒤 장에서는 짝을 이룬다.** " +
      "전수 재실측(2026-08-21): 첫 장 반 칸에 안 들어가는 문항 3,653건(7.8%) · 이어지는 장 반 칸 1,275건(2.7%). " +
      "제품 엔진으로 시험지 6,270장을 만들어 재니 25문항 기준 **겹치는 문항 0.040 → 0.014건/장(−65%)**, " +
      "대가는 **장 수 13.000 → 13.021장**(시험지 48장에 한 장꼴로 한 장 는다). " +
      "인쇄 경고가 뜨는 시험지 1.5% → **0.0%**.",
    look:
      "① `/dev/pack-by-height` 를 열면 **같은 문항 여섯**을 분할만 바꿔 그린 지면이 나란히 있다 " +
      "(왼쪽은 git 에서 꺼낸 옛 분할). 왼쪽에서 겹쳐 찍히던 문항이 오른쪽에서 제 장을 쓰는지. " +
      "② 실제로 25문항을 뽑아 인쇄해 **긴 문항이 혼자 있는 장**의 아래 「오늘의 메모」 칸이 " +
      "너무 넓어 허전하지 않은지 — 이건 숫자로 못 재고 종이에서만 보인다. " +
      "③ 장 수가 늘어난 것이 받아들일 만한지(25문항이면 대개 그대로, 가끔 한 장). " +
      "④ 정답지 1쪽 마지막 문항 해설이 통째로 사라지는지 — **이건 아직 안 고쳤다**(아래 별도 항목).",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/report-print-overflow-20260821.md (전수 재실측 · 전후 비교)",
      "src/app/dev/pack-by-height/page.tsx (실물 지면 전후 비교)",
      "src/lib/printOverflow.ts (packProblems — 분할과 판정이 한 규칙)",
      "scripts/qa/mutate-pack-by-height.sh (변이 5개 전부 빨강)",
      "scripts/qa/measure-first-page-header.tsx (79px 을 조각으로 가른다)",
    ],
    scale:
      "출제 가능 43,587건 중 장을 통째로 쓰게 되는 문항 **1,106건(2.5%)**. " +
      "남는 겹침 0.014건/장은 정책이 아니라 자(`estimateProblemPx`)의 놓침과 같은 자리다 " +
      "(484px 칸 재현율 98.2% · 놓침 20건 = 0.046%). 더 내리려면 정책이 아니라 자를 손봐야 한다. " +
      "구조적으로 못 고치는 것 12건(0.03%) — 혼자 써도 안 들어간다. 경고는 11/12 를 본다.",
    needs: "25문항짜리로 뽑아야 «긴 문항이 혼자 있는 장»이 나온다",
    status: "대기",
    changedOn: "2026-08-21",
  },
  {
    id: "d07-align",
    title: "다단 등식은 **문단으로 쌓는다** — 등호 세로 맞춤은 안 쓴다 (D-108)",
    changed:
      "원장님이 2026-08-25 에 판단을 위임하셨다(「그냥 최적으로 다 선택해」). **현행 유지**로 정했다. " +
      "이유는 취향이 아니라 폭이다 — 이 규칙이 발동하는 조건 자체가 「수식이 열보다 넓다」라, " +
      "걸린 53건(0.112% · 수식 71개)은 **이미 열 폭 한계에 있는 문항**이다. " +
      "등호를 세로로 맞추면 블록 폭이 `max(좌변)+max(우변)` 이 되어 **가장 넓은 한 단계보다 넓어질 수 있다** — " +
      "두 단 시험지에서 그것은 넘침이고, 넘침은 겹쳐 찍힌 지면으로 간다. 넓히는 조판을 " +
      "「넓어서 자른 자리」에 얹지 않는다.",
    look: "판정이 끝난 항목이다. 종이에서 볼 것은 없다 — 지면이 안 바뀌었다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/body-typeset.md:261, :352",
      "07-coding-convention.md D-108",
    ],
    scale: "53건(0.112%) · 수식 71개",
    status: "통과",
    verifiedOn: "2026-08-25",
    changedOn: "2026-08-18",
  },
  {
    id: "d07-box-label",
    title: "상자 라벨을 **가운데**로, 괄호를 **〈 〉** 로 (D-108)",
    changed:
      "원장님이 2026-08-25 에 판단을 위임하셨다(「그냥 최적으로 다 선택해」). 셋 중 둘을 바꿨다. " +
      "⑴ **위치 — 가운데**: 한국 시험지·교과서에서 〈보기〉 라벨은 상자 위 가운데다(근거 문서가 대안으로 적어 둔 그것). " +
      "⑵ **괄호 — `〈보기〉`**: ASCII `<보기>` 는 태그처럼 읽힌다. 이 저장소에서 실제로 `<나열1>` 이 " +
      "날문자로 지면에 나간 사고가 있었다. **본문 규약은 안 바꾼다** — 파서·DB·`BOX_HEADER_RE` 는 " +
      "여전히 ASCII `<보기>` 이고, 지면에 그리는 순간에만 바꾼다(`MarkdownRenderer` 의 `LABEL_OPEN`). " +
      "낱말은 원본대로 둔다(원본이 `<조건>` 이면 `〈조건〉`). " +
      "⑶ **항목 간격 — 현행 유지**: 바꿀 근거가 없고, 간격을 건드리면 지면 높이가 달라져 " +
      "넘침 판정 캐시가 통째로 낡는다.",
    look:
      "상자 라벨이 **가운데**에 있고 **〈보기〉** 로 찍히는가. 홑화살괄호가 " +
      "부등호(`<`)처럼 좁고 뾰족하게 나오면 글꼴이 그 글자를 못 그린 것이다 — 그러면 불합격.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/render-b-box.md:215",
      "src/components/math/MarkdownRenderer.tsx (LABEL_OPEN)",
      "07-coding-convention.md D-108",
    ],
    scale: "상자가 있는 문항 2,987건(6.33%)",
    needs:
      "〈보기〉 상자가 있는 문항. ⚠️ **2026-08-25 실측 — 지금은 종이로 확인할 방법이 없다.** " +
      "`/dev/print-paper` 가 `box-card` 자리를 **못 채운다고 스스로 신고한다**(못 채운 자리 5개 중 하나). " +
      "공유 풀 2,410건이 전부 엔진 문항이라 상자가 없고, 상자가 있는 기출 3,573건은 격리돼 있다. " +
      "이 항목과 `box-card` 는 **상자 있는 문항이 출제 풀에 들어온 뒤에야** 검수할 수 있다.",
    status: "대기",
    changedOn: "2026-08-25",
  },
  {
    id: "d07-score",
    title: "예측 문제지 배점의 지면 위치·서체 (D-07 형태 미확정)",
    changed:
      "D-41 로 「예측 문제지에는 배점을 지면에 찍는다」가 확정됐으나 위치·서체가 미정이고, 예측 문제지에는 아직 인쇄 화면 자체가 없다.",
    look:
      "**원장님이 지금 정할 수 있는 것이 아니다.** 예측 문제지에는 인쇄 화면 자체가 " +
      "아직 없어서 보여 드릴 종이가 없다. 인쇄 화면을 우리가 먼저 만들어야 하고, " +
      "그때 시안을 내서 여쭙는다. 이 항목이 이 목록에 있는 이유는 잊지 않기 위해서다.",
    lookFromSource: false,
    evidence: ["docs/planning/05-design-system.md:493"],
    status: "형태미확정",
    blockedBy:
      "예측 문제지에 인쇄 화면이 아직 없다 — 우리가 먼저 만들어야 시안이 나온다.",
    changedOn: "2026-08-16",
  },
  {
    id: "short-answer-badge",
    title: "「단답형 n」 배지 — 서술형과 **다른 말**이 찍힌다",
    changed:
      "종전에는 `questionType` 이 서술형인 문항에만 「서술형 n」을 붙였고 단답형은 아무 표시가 없었다. 원장님 확정(2026-08-19)으로 단답형에는 「단답형 n」을 붙이고, 번호는 유형마다 **따로** 센다(서술형 1·2 / 단답형 1·2).",
    look: "배지 모양(1px 금색 테두리·10px)은 그대로다. 볼 것은 ㉠ 「단답형」 네 글자가 배지 폭 안에서 안 넘치는가 — 「서술형」보다 글자가 길지 않으니 괜찮아야 한다, ㉡ 한 시험지에 둘이 섞였을 때 번호가 각각 1부터 이어지는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/tests/essayLabels.ts",
      "src/components/print/templates/JaseupTemplate.tsx:99",
    ],
    scale: "questionType='단답형' 763건 (전체 47,152 중 1.6%)",
    needs: "단답형 문항과 서술형 문항이 **함께** 든 시험지",
    status: "대기",
    changedOn: "2026-08-19",
  },
  {
    id: "figure-svg-adopt",
    title:
      "그림 716문항을 **벡터 SVG 로** 바꿨다 — 종이에서 선이 연하지 않은가",
    changed:
      "래스터 그림을 벡터 SVG 로 갈아 끼웠다(716문항 · 727자리). " +
      "인쇄 폭(mm)은 안 바꿨고, 높이는 비율을 따라 최대 1.85% 움직인다.",
    look:
      "화면에서 벡터가 또렷한 것은 확인했다. 종이에서는 **선이 너무 가늘어 " +
      "흐릴 수 있다** — 래스터보다 일관되게 가늘고 연했다. 특히 눈금·해칭·점선이 " +
      "학생 자리에서 보이는지. 그림 높이가 조금 변했으니 칸을 넘치는 문항이 " +
      "생겼는지도 같이 본다.",
    lookFromSource: false,
    evidence: [
      "scripts/qa/adopt-figure-svg.ts",
      "scripts/qa/reports/svg-whitelist.txt",
      "scripts/qa/reports/figure-svg-adopt.json",
    ],
    scale:
      "716문항 / 727자리. 채택 후보 1,576자리 중 **눈으로 본 810자리**에서만 골랐다 " +
      "— 나머지 766자리는 아직 래스터다(검수 미완).",
    needs:
      "그림이 붙은 문항이 여러 개 든 시험지. 가는 선(눈금·해칭)이 있는 도형을 일부러 넣을 것",
    status: "대기",
    changedOn: "2026-08-20",
  },
  {
    id: "figure-fallback-mm",
    title:
      "mm 를 **모르는** 그림 1,565문항 — 「모르면 최대(70mm)」를 픽셀 환산으로 바꿨다",
    changed:
      "원본 지면의 물리 폭(mm)을 모르는 그림 1,765자리는 인라인 폭을 안 붙여 " +
      "CSS 상한(70mm)이 걸렸다 — 상한은 곧 **최대 크기**다. 그래서 그중 1,297자리" +
      "(73.5%)가 «아는 그림»보다 크게 나갔다. 이제 가로 픽셀에서 dpi 로 환산한다" +
      "(RPM 벡터 72dpi · 기출 스캔 253dpi, 바닥 28mm · 상한 70mm).",
    look:
      "**작아진 쪽이 문제다.** 환산 중앙이 43.1mm 라 예전보다 최대 40% 가까이 " +
      "줄어든 그림이 있다 — 눈금 숫자·꼭짓점 이름·치수가 학생 자리에서 읽히는지 " +
      "종이에 대고 본다. 특히 바닥(28mm)에 걸린 작은 그림. 반대로 아직 상한에 " +
      "걸리는 444자리는 예전과 같은 크기다.",
    lookFromSource: false,
    evidence: [
      "src/lib/figurePrintSize.ts",
      "src/__tests__/unit/figureFallbackMm.test.ts",
      "src/app/dev/print-specimen/page.tsx",
    ],
    scale:
      "그림 자리 11,077 중 mm 를 모르는 **1,765자리 / 1,565문항**. " +
      "환산 중앙 43.1mm 는 mm 를 아는 9,312자리의 중앙(45.9mm)과 맞는다 — 눈금이 맞았다.",
    needs:
      "**`/dev/print-specimen` 5쪽짜리 견본**을 그대로 뽑으면 된다 — ⑤장에 " +
      "같은 그림의 전(70mm)·후(환산)가 나란히 있다. 100mm 자가 정말 100mm 인지 먼저 확인할 것.",
    status: "대기",
    changedOn: "2026-08-21",
  },
  {
    id: "math-script-residue",
    title:
      "**보기에 「87·0/2」이 찍히고 있었다** — 빈 분수 73자리 · 극한 화살표 530자리",
    changed:
      "㉠ 지면 전처리가 `\frac{}{b}` 를 **`\frac{0}{b}`** 로 채우고 있었다. " +
      "기출 보기 ①이 `87\frac{}{2}`(정답 87/2)라 종이에 `87·0/2` 로 찍혔다. " +
      "자료 73자리를 되살리고(분자는 분수 **밖**에 남아 있었다), 되살릴 수 없는 " +
      "5문항은 출제에서 뺐다. 전처리는 이제 숫자를 넣지 않고 **□** 로 남긴다. " +
      "㉡ `\lim_{x⇒0}` 을 `\lim_{x→0}` 으로 고쳤다(HWP `rarrow` 가 ⇒ 로 갔다). " +
      "극한 **밖**의 ⇒ 451자리는 진짜 함의라 손대지 않았다.",
    look:
      "**보기 다섯이 서로 말이 되는지** 본다 — 고친 자리는 대부분 객관식 보기다. " +
      "`J30503-LNCC` 는 ②③④⑤가 전부 그랬다. 분수가 한 층으로 제대로 서는지, " +
      "그리고 **□ 가 보이면 그 문항은 아직 깨진 것**이니 적어 주시면 된다. " +
      "극한은 `lim` 아래 화살표가 →(가까워진다)인지, ⇒(함의)가 아닌지.",
    lookFromSource: false,
    evidence: [
      "scripts/qa/emptyFracRules.ts",
      "scripts/qa/limArrowRules.ts",
      "scripts/qa/reports/empty-frac-repair.json",
      "docs/planning/tracks/report-math-script-residue.md",
    ],
    scale:
      "빈 분수 73자리 / 42문항(+ 못 살린 5문항 제외) · 극한 화살표 530자리 / 290문항. " +
      "고친 자리는 **본문·해설 둘 다**이고 대부분 고1~고3 미적분·확률과통계다.",
    needs:
      "고2·고3 범위로 뽑은 시험지. 극한(`lim`)이 든 문항과 근호가 든 객관식 보기를 " +
      "일부러 넣을 것. 정답지도 같이 뽑아 해설의 분수를 본다.",
    status: "대기",
    changedOn: "2026-08-21",
  },
  {
    id: "solution-hwp-latex",
    title:
      "**정답지에 «LEFT ( 3x^2 +ax-5 RIGHT )» 가 글자로 나가고 있었다** — 해설 4,576문항",
    changed:
      "잔재 지표가 **본문만** 재고 있었다(0.31%). 해설을 재니 **9.98%(4,694문항)** 였다 — " +
      "변환을 본문에만 돌리고 해설은 안 돌린 자리다. 정본 변환기로 30,293덩어리를 " +
      "LaTeX 로 바꿨다. **9.98% → 0.33%**(같은 계량기로 다시 잼). 덤으로 붉게 나가던 " +
      "문항이 741 → 480 으로 줄었다.",
    look:
      "**정답지(해설)를 같이 뽑아서 본다.** 분수가 한 층으로 서는지, 근호가 씌워지는지, " +
      "`lim` 아래 화살표가 →인지. 그리고 **글자로 남은 영문 낱말**(`over`·`LEFT`·`ln`)이 " +
      "보이면 적어 주시면 된다 — 118문항이 아직 그 상태로 남아 있다.",
    lookFromSource: false,
    evidence: [
      "scripts/qa/convert-hwp-spans.py",
      "scripts/qa/solutionHwpScope.ts",
      "scripts/qa/reports/solution-hwp-repair.json",
      "docs/planning/tracks/report-math-script-residue.md",
    ],
    scale:
      "해설이 있는 14,116문항 중 **4,576문항**을 고쳤다. 해설은 **정답지에만** 나가므로 " +
      "문제지 지면은 안 바뀐다 — 이 항목은 정답지 검수다.",
    needs:
      "고1~고3 범위(미적분·확률과통계·기하)로 뽑은 시험지 + **정답지**. " +
      "해설이 긴 서술형을 일부러 넣을 것.",
    status: "대기",
    changedOn: "2026-08-21",
  },
  {
    id: "lsub-combination",
    title: "**₁₀C₂ 가 «LSUB10C_2» 로 찍히고 있었다** — 순열·조합 표기 87문항",
    changed:
      "한국 교과서의 순열·조합은 아래첨자가 **왼쪽에** 붙는다(₅P₃·₁₀C₂·₄H₃·₅Π₃). " +
      "HWP 는 그것을 `LSUB` 로 적는데 **정본 변환기가 그 키워드를 모른다**(core 전체 grep 0). " +
      "그래서 글자로 새어 나갔다 — 97문항 203자리. 178자리를 고쳤다(97 → 15문항). " +
      "고친 값은 **셈으로 검산**했다 — ₅P₃=60 · ₄H₃=₆C₃=20 처럼 해설이 스스로 적어 둔 " +
      "숫자와 맞는지 26덩어리를 실제로 계산해 대조했다.",
    look:
      "**정답지와 문제지를 같이** 뽑아 확률과통계·경우의 수 단원을 본다. " +
      "`₅P₃`·`₁₀C₂`·`₄H₃` 의 **왼쪽 아래첨자가 C 앞에** 붙어 있는지, 크기가 본문보다 " +
      "작게 내려앉는지. `LSUB`·`RSUB` 라는 **영문 글자가 보이면** 적어 주시면 된다 — " +
      "15문항이 아직 그 상태다(어디까지가 첨자인지 원본에 안 남아 손으로 봐야 한다).",
    lookFromSource: false,
    evidence: [
      "scripts/qa/lsubRules.ts",
      "scripts/qa/repair-lsub.ts",
      "scripts/qa/reports/lsub-repair.json",
      "scripts/qa/mutate-lsub.sh",
    ],
    scale:
      "본문·해설·정답 합쳐 **91칸 87문항**. 확률과통계(HPS)와 경우의 수(HC)에 몰려 있다.",
    needs:
      "**확률과통계 / 경우의 수** 범위로 뽑은 시험지 + 정답지. " +
      "중복조합(H)·중복순열(Π)이 든 문항을 일부러 넣을 것.",
    status: "대기",
    changedOn: "2026-08-21",
  },
  {
    id: "m2-shade-figures",
    title: "회전판·색칠하기 그림이 종이에서 읽히는가 (중2 자체 엔진)",
    changed:
      "채색 축(`regions`)으로 회전판(원판 등분)과 색칠하기 부분 나누기 도형을 낸다. " +
      "다섯 갈래 모두 **폭 224 고정 캔버스**라 제품 등급이 `mid`(64mm)로 하나다. " +
      "처음엔 캔버스를 안 박아 폭이 내용 따라 정해졌고, 그때 지면 이름표가 " +
      "11.57~16.14px 로 갈려 **셋이 본문 12.5px 아래**였다. 지금은 13.9px 하나다 — " +
      "다만 이 수치는 화면 계산이지 **종이에서 잰 것이 아니다.**",
    look:
      "회전판은 **칸 안의 숫자**가 발문 글자보다 작아 보이면 안 된다. 색칠하기는 " +
      "부분 경계선이 끊기지 않고 A·B·C·D 이름표가 **자기 칸 안에** 있어야 한다. " +
      "칸 바탕색은 흑백 프린터에서 옅은 회색으로 나오는데, **회색이 숫자·이름표를 " +
      "먹으면** 적어 주시면 된다(색이 아니라 글자로 풀게 만든 이유가 그것이다).",
    lookFromSource: false,
    evidence: [
      "src/lib/middle/m2Shade.ts",
      "src/lib/figure/figureSvgFrame.ts",
      "src/__tests__/unit/middleM2NumProb.test.ts (채색 그림 실렌더)",
    ],
    scale:
      "RPM 2-2 경우의 수 15 · 확률 01·03·06 의 회전판 갈래. 그림 갈래는 열넷.",
    needs:
      "**이 유형이 DB 에 적재된 뒤**라야 시험지에 실린다(지금은 생성·검수까지, D-22·D-31). " +
      '그전에는 `npx tsx scripts/middle/gen-cli.ts --type "2-2|경우의 수|15" ' +
      "--count 8 --seed 20260823 --html preview.html` 로 뽑은 미리보기를 인쇄해 본다.",
    status: "대기",
    changedOn: "2026-08-23",
  },
  {
    id: "stat-figure-frame",
    title:
      "히스토그램·도수분포다각형·도수분포표가 종이에서 읽히는가 (중1 통계)",
    changed:
      "`histogram`·`freqPolygon` kind 를 새로 냈다. 둘 다 **viewBox 폭 240 고정**이라 " +
      "제품 등급이 `mid`(64mm) 하나다 — 안 박으면 계급 수·라벨 길이에 따라 폭이 " +
      "떠다녀 그림마다 눈금 글자 크기가 뒤집힌다. 눈금 글자는 14단위, 본문은 12.5px. " +
      "그리고 `table` 열 폭을 **내용 기반**으로 바꿨다: 「10이상~20미만」 같은 긴 계급 " +
      "라벨이 든 표는 폭이 128 → 184.7 로 커져 **등급이 `compact`(37mm)에서 " +
      "`mid`(64mm)로 올라간다**(옛 규칙에서는 그 라벨의 첫 글자가 잘리고 있었다). " +
      "짧은 표는 폭이 한 단위도 안 바뀐다 — 옛 총 폭을 바닥으로 깔았다. " +
      "다만 이 수치는 전부 **화면 계산이지 종이에서 잰 것이 아니다.**",
    look:
      "① 히스토그램의 **직사각형이 서로 붙어** 있어야 한다(틈이 보이면 불합격 — 넓이가 " +
      "도수에 비례한다는 근거가 사라진다). ② 계급의 양 끝 값(10 15 20 …)이 **막대 " +
      "경계에** 오고 이웃 숫자와 붙지 않아야 한다. ③ 도수분포다각형은 **양끝이 " +
      "가로축에 닿아** 닫혀야 한다. ④ 「일부가 찢어져 보이지 않는」 그림은 찢긴 " +
      "물결 자국이 옅은 회색인데, 흑백 프린터에서 **사라지면** 「도수 0」과 구별이 " +
      "안 된다 — 안 보이면 적어 주십시오. ⑤ 모눈(연한 청색)이 흑백에서 너무 진해 " +
      "막대·꺾은선을 먹지 않아야 한다. ⑥ 도수분포표의 긴 계급 라벨이 **칸 밖으로 " +
      "삐져나오거나 잘리지** 않아야 한다.",
    lookFromSource: false,
    evidence: [
      "scripts/figure/elem_advanced.py (_stat_chart)",
      "scripts/figure/elementary.py (_table_widths)",
      "src/lib/figure/figureSvgFrame.ts",
      "src/__tests__/unit/figureStatKinds.test.ts",
      "docs/planning/09-figure-engine-guide.md §4-24",
    ],
    scale:
      "중1 히스토그램·도수분포다각형 두 단원(DB 자격 5·7건으로 얇다) + RPM 1-2 " +
      "「도수분포표와 상대도수」 19유형. 기존 `table` 중 긴 라벨이 든 것도 등급이 바뀐다.",
    needs:
      "**이 유형이 DB 에 적재된 뒤**라야 시험지에 실린다(지금은 엔진까지, D-22·D-31). " +
      "그전에는 `node scripts/qa/probe-stat-kinds.mjs` 가 남기는 " +
      "`C:/tmp/wave3-stat-{table,hist,poly}.png` 를 인쇄해 본다 — 지면 등급을 실제로 " +
      "적용하고 본문 12.5px 을 옆에 나란히 찍는다.",
    status: "대기",
    changedOn: "2026-08-23",
  },
  {
    id: "curve-graph-frame",
    title:
      "좌표평면 그래프와 원뿔 전개도가 종이에서 읽히는가 (중1 반비례·중3 이차함수)",
    changed:
      "`curveGraph`(쌍곡선·포물선·직선)와 `netCone`(원뿔 전개도) kind 를 새로 냈고, " +
      "그러면서 **이미 나가 있던 `linearGraph` 의 지면 크기가 바뀐다.** " +
      "옛 `linearGraph` 는 viewBox 폭이 범위·라벨에 따라 **126~238 로 떠다녀** " +
      "눈금 글자가 지면에서 10.50px ~ 17.78px 이었고, 그중 셋(폭 142·144·160)은 " +
      "본문 12.5px **아래**였다(실측 1,314장). 이제 셋 다 폭 **240 고정**이라 " +
      "제품 등급이 `mid`(64mm) 하나이고 글자는 13단위 → 지면 13px 이다. " +
      "즉 **좁은 범위 그래프는 커지고, 넓은 범위 그래프는 글자가 조금 커진다.** " +
      "다만 이 수치는 전부 **화면 계산이지 종이에서 잰 것이 아니다.**",
    look:
      "① 좌표평면의 **눈금 숫자와 식 라벨이 발문 글자보다 작지 않은가** — 이게 이 " +
      "변경의 목적이다(옛 그림 중 셋은 작았다). ② 반비례 그래프가 **두 가지**로 " +
      "보이고 좌표축에 닿지 않는가. ③ 포물선의 곡선이 **각지지 않고** 매끄러운가 " +
      "(꺾은선으로 그리므로 확대하면 각이 보일 수 있다). ④ 축 화살촉·원점 O·x·y 가 " +
      "흑백에서 또렷한가. ⑤ 좁은 범위 그래프(±2)와 넓은 범위 그래프(±6)가 **한 " +
      "지면에 섞여** 있을 때 칸 크기가 달라 보이는 것이 어색하지 않은가 — 폭을 " +
      "박았으므로 칸(한 눈금 간격)은 범위에 따라 달라진다. ⑥ 원뿔 전개도의 밑면 " +
      "원이 부채꼴 호에 **붙어** 보이는가, 「9 cm」·「120°」가 도형에 안 겹치는가.",
    lookFromSource: false,
    evidence: [
      "scripts/figure/elem_advanced.py (_cp_*, _curve_graph, _net_cone)",
      "src/lib/figure/figureSvgFrame.ts",
      "src/__tests__/unit/figureCurveGraph.test.ts",
      "src/__tests__/unit/figureNetCone.test.ts",
      "docs/planning/09-figure-engine-guide.md §4-25",
    ],
    scale:
      "중1 「정비례와 반비례」 21유형 + 중3 「이차함수의 그래프 ⑴⑵」 42유형 + " +
      "회전체·겉넓이의 원뿔 전개도 2유형이 이 그림으로 열린다. " +
      "**이미 나가 있던 `m2Func` 의 linearGraph 세 갈래도 크기가 바뀐다.**",
    needs:
      "**이 유형이 DB 에 적재된 뒤**라야 시험지에 실린다(지금은 엔진까지, D-22·D-31). " +
      "그전에는 `python scripts/figure/probe-curve-graph.py` 가 남기는 " +
      "`docs/planning/tracks/wave4a-curve-sheet/index.html` 을 인쇄해 본다 — " +
      "지면 등급을 실제로 적용하고 본문 12.5px 을 옆에 나란히 찍는다.",
    status: "대기",
    changedOn: "2026-08-24",
  },
  {
    id: "wave6-geometry-stat-frame",
    title:
      "작도 컴퍼스 자국·부채꼴 색칠·상자그림·산점도가 종이에서 읽히는가 (중1·2 기하 + 중3 통계)",
    changed:
      "물결 6 으로 FigureSpec v2 기하가 **처음** 실사용됐다(1-2·2-2, 141유형) — " +
      "맞꼭지각·평행선과 엇각(`parallel`)·**작도 컴퍼스 자국**(`arcs`+`draw:false` " +
      "원)·다각형 대각선·부채꼴 색칠(`regions`)·외접원·평행사변형·무게중심·" +
      "피타고라스. 착수 전 실렌더 판정(양성 9·음성 4)으로 전량 그려짐을 확인했지만 " +
      "그 판정은 **화면 SVG 이지 종이가 아니다.** 더해 `boxPlot`·`scatterPlot` " +
      "kind 를 새로 냈다(3-2 통계 17유형) — 이 저장소에서 **첫 통계 차트**다.",
    look:
      "① 작도 문항의 **컴퍼스 호 자국이 실선과 구별되는가**(점선·가는 선인지) — " +
      "지금은 실선과 같은 굵기다. ② 부채꼴 색칠(`regions`)이 **흑백 인쇄에서도 " +
      "칠해진 부분과 안 칠해진 부분이 구별되는가**(옅은 회색이 흑백에서 안 보일 " +
      "수 있다). ③ 상자그림의 **상자·수염·중앙값 선이 겹쳐 보이지 않는가**, 두 " +
      "반을 비교하는 상자그림(`series2`)이 세로로 안 붙어 보이는가. ④ 산점도의 " +
      "**점이 흑백에서 뭉개지지 않는가**(점 반지름 2.6px, 6개 이상 겹치면). ⑤ " +
      "외심·무게중심 그림의 **점 이름표(O·G·M)가 선에 안 겹치는가**.",
    lookFromSource: false,
    evidence: [
      "scripts/figure/probe-wave6-geometry.py",
      "docs/planning/tracks/wave6-geometry-sheet/index.html",
      "scripts/figure/elem_advanced.py (_box_plot, _scatter_plot)",
      "docs/planning/09-figure-engine-guide.md (boxPlot·scatterPlot 항목, §4-26·§4-27)",
    ],
    scale:
      "1-2 기하 84유형 + 2-2 기하 57유형 + 3-2 통계 17유형 = 158유형 " +
      "(이 물결로 중학 엔진이 873/873 전량 등록 완료됐다).",
    needs:
      "**이 유형이 DB 에 적재된 뒤**라야 시험지에 실린다(지금은 엔진까지, D-22·D-31). " +
      "그전에는 `docs/planning/tracks/wave6-geometry-sheet/index.html` 과 각 세션이 " +
      "남긴 미리보기(6A~6E 커밋의 preview/*.html)를 인쇄해 본다.",
    status: "대기",
    changedOn: "2026-08-24",
  },
  {
    id: "elem-line-tiling-figures",
    title:
      "초등 4단 그림 둘 — 두 직선 관계(`lineRelation`) · 조각 채우기(`tiling`)",
    changed:
      "초등 난이도 갈래(D-72)에 그림 종류 둘이 처음 이어졌다. `lineRelation` 은 " +
      "초4 2-4-2·2-4-3(평행 표시·수선·평행선 사이 거리)에 이미 배선됐고, `tiling` 은 " +
      "이번에 초4 2-6-4 «표준»(갈래 없는 기본 문항) 세 갈래에 배선했다 — 조각 하나와 " +
      "목표 도형 하나를 크기 비대로 나란히 그린다. 2-6-4 의 난이도 갈래(연산·기본·응용· " +
      "심화)에는 그림이 없다 — 그릴 수 있는 짝(정삼각형↔정육각형)이 하나뿐이라 붙이면 " +
      "그림 있는 문항의 정답이 늘 «육각형 여섯 개」로 굳는다(09 §2.2 ⑥, R9-c).",
    look:
      "① `lineRelation` — 평행 표시(겹화살표)가 두 직선에 같은 개수로 찍히는가, " +
      "수선(세로선)이 있는 문항에서 직각 기호가 뚜렷한가, 직선 이름(가·나…)이 " +
      "글자와 안 겹치는가. ② `tiling` — 조각과 «만들 모양» 두 도형이 나란히 서고 " +
      "크기 차이가 발문의 배수(2배·3배)와 눈으로 맞아 보이는가, 도형 아래 «조각»· " +
      "«만들 모양» 글자가 도형과 안 겹치는가. ③ 둘 다 위젯 폭(140px/37mm) 등급이라 " +
      "본문 글자보다 작게 나가지 않는가.",
    lookFromSource: false,
    evidence: [
      "scripts/figure/elementary.py (_line_relation · _tiling)",
      "src/lib/elementary/g4.ts (tier242Calc·tier243Calc·quad() 2-6-4)",
      "docs/planning/09-figure-engine-guide.md §2.2 규칙 ①~⑥",
    ],
    scale:
      "출제 가능 문항 기준 — 씨앗 200 표본으로 2-4-2 26문항 · 2-4-3 다수 · 2-6-4 표준 3갈래 전량",
    needs:
      "DB 적재 뒤에 시험지에 실린다(지금은 엔진까지, D-22·D-31). 그전에는 `/dev/figure-glyph-size` 나 `dump-elem-tiers.ts` 로 SVG만 눈으로 볼 수 있다",
    status: "대기",
    changedOn: "2026-08-24",
  },
  {
    id: "op-limit-scale",
    title: "적분·극한·시그마의 위·아래끝이 종이에서 작아졌는가 (지수와 견줘서)",
    changed:
      "원장님 지시 2026-08-24 — 「인테그랄이나 리미트에서 아랫첨자 윗첨자가 일반수식들과 " +
      "폰트사이즈가 똑같아서 읽기 불편하다. 지수의 윗첨자처럼 글자크기 줄여」. " +
      "KaTeX 기본은 연산자 첨자와 지수가 **같은 0.7배**다(둘 다 scriptstyle) — 실측으로 " +
      "확인했다. 지수는 «올라가 있어» 작아 보이는데 연산자 첨자는 옆·아래에 나란히 서서 " +
      "본문과 같은 무게로 읽힌다. `--op-limit-scale` 을 0.6 으로 두어 한 칸 줄였다. " +
      "가르는 열쇠는 조상 요소다 — 연산자 첨자는 `.mop` 안, 지수는 `.mord` 안이라 " +
      "$x^2$·$a_n$ 은 안 건드린다.",
    look:
      "① ∫ 의 위·아래끝과 lim 아래끝이 **본문보다 확실히 작아 보이는가** — 화면에서는 " +
      "차이가 미묘한데 종이에서는 갈린다. ② 그런데 **읽을 수는 있는가**: 지면 문항 본문 " +
      "12.5px 기준 8.75px → 7.5px 로 내려갔다. `n \\to \\infty` 처럼 긴 아래끝이 " +
      "뭉개지면 값을 올려야 한다(`--op-limit-scale` 한 곳만 고치면 된다). " +
      "③ **지수는 그대로인가** — $x^2$ 이 같이 작아졌으면 선택자가 샌 것이다. " +
      "④ ∑ 의 위·아래끝이 기호와 겹치지 않는가.",
    lookFromSource: false,
    evidence: [
      "src/app/globals.css (--op-limit-scale · .katex .mop .sizing)",
      "src/__tests__/unit/opLimitScale.test.ts",
      "docs/planning/07-coding-convention.md (D-104)",
    ],
    scale:
      "고등 문항 전량 — 미적분·수열의 ∫·lim·∑ 이 든 문항. 중등에는 이 기호가 없어 " +
      "영향이 없다.",
    needs:
      "∫ 또는 lim 이 든 고등 문항으로 시험지를 뽑아야 한다. 같은 지면에 지수($x^2$)가 " +
      "있는 문항을 함께 넣어야 «지수는 그대로인가»를 나란히 볼 수 있다.",
    status: "대기",
    changedOn: "2026-08-24",
  },
  {
    id: "stem-formula-break",
    title:
      "발문 다음 줄에 수식이 서는가 — 그리고 한 줄이 늘어난 만큼 칸이 버티는가",
    changed:
      '원장님 지시 2026-08-25 「"하시오." 하고 줄바꿔서 수식이 있어야 문제답다」. ' +
      "엔진은 이미 줄바꿈을 넣고 있었는데 `collapseWhitespace` 가 **모든 개행을 공백으로** " +
      "녹여(OCR 이관본의 줄바꿈은 글줄 넘김이라 뜻이 없다) 화면·지면이 붙여 그렸다. " +
      "이제 「앞이 문장으로 끝나고 · 수식이 글의 마지막이고 · 홑수식 줄이 하나뿐」인 " +
      "경우에만 문단을 나눈다(`markStandaloneFormula`). " +
      "⚠️ **문항마다 한 줄이 늘어난다** — 칸이 빠듯하던 시험지가 넘칠 수 있다. " +
      "자(`estimateProblemPx`)는 같은 파서를 부르므로 갈라지지는 않는다.",
    look:
      "① 「다음 식을 계산하시오.」 같은 발문 **다음 줄**에 수식이 서는가. " +
      "② 문장 **중간**에 낀 수식(「자연수 $m,n$ 의 개수는?」)은 **안 갈려야** 한다 — " +
      "갈렸으면 규칙이 넓은 것이다. ③ 표시 없는 보기(수식 여러 줄)가 발문에서 " +
      "떨어져 나가지 않았는가. ④ **문항이 칸을 넘지 않는가** — 한 줄이 늘었으므로 " +
      "마지막 문항이 잘리거나 다음 장으로 밀렸는지 본다.",
    lookFromSource: true,
    evidence: [
      "src/lib/problem/parseProblemContent.ts (markStandaloneFormula)",
      "src/__tests__/unit/parseProblemContent.test.ts (경계 3건)",
      "src/__tests__/unit/renderParity.test.tsx (20키 전부 무변화 확인)",
    ],
    scale:
      "엔진이 낸 문항 전부(발문 뒤 수식이 표준 문형이다). OCR 이관본은 실측으로 " +
      "renderParity 20키가 **한 글자도 안 바뀌었다** — 좁힌 열쇠가 그것들을 안 건드린다.",
    needs:
      "엔진 문항이 실린 시험지. 파일럿(초5 MS1A · 초6 MS2A)을 뽑으면 그대로 드러난다.",
    status: "대기",
    changedOn: "2026-08-25",
  },
  {
    id: "choice-marks",
    title: "보기 표식 ㉠~㉤ → ①~⑤ — 지면이 **보기 목록으로** 그린다",
    changed:
      "일차함수 3유형(중2)이 보기를 ㉠~㉤ 로 내고 있었다. 제품 파서는 개행 뒤 ①~⑮·`1.` 만 보기로 읽으므로 그 목록은 **본문 글줄**로 그려졌다 — 표식이 제 자리에 서지 않고 인쇄 2단 배치도 안 걸린다. 원장님 확정(2026-08-25 「보기번호는 바꾸고」)으로 엔진 3유형과 공유 DB 6건을 ①~⑤ 로 맞췄다.",
    look: "㉠ 보기 다섯 줄이 **표식 열을 맞춰** 서는가 (긴 보기가 두 줄이 될 때 넘친 줄이 표식 아래로 파고들지 않고 본문 왼쪽에 맞춰 들어가는가 — 이게 «본문 글줄»과 «보기 목록»의 차이다). ㉡ 보기가 짧으면 **두 단**으로 앉는가. ㉢ ① 이 발문 숫자와 헷갈리지 않는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/problem/choiceCountRule.ts (CHOICE_MARKS · assertChoiceMarks)",
      "scripts/qa/apply-choice-marks-fix.ts",
      "docs/planning/07-coding-convention.md D-81",
    ],
    scale: "엔진 3유형 · 공유 DB 출제 가능 6건 (화면 대조는 /dev/choice-marks)",
    needs:
      "중2 4. 함수 단원 문항이 실린 시험지 — 「함수와 함숫값」·「일차함수의 그래프의 성질」.",
    status: "대기",
    changedOn: "2026-08-25",
  },
  {
    id: "prod-print",
    title: "프로덕션 실물 인쇄 최종 검수 (T6.2)",
    changed: "배포 태스크의 인수 조건. 배포 자체가 미완이라 착수 전이다.",
    look: "로컬과 Vercel 프로덕션의 폰트 폴백이 다를 수 있다. 프로덕션에서 뽑은 종이가 로컬과 같은 글꼴인지 대조.",
    lookFromSource: false,
    evidence: ["docs/planning/06-tasks.md:798"],
    status: "대기",
    changedOn: "미착수",
  },
];

/** 한 번에 다 보려면 어떤 시험지를 뽑아야 하나. */
export const SAMPLING_PLAN = [
  "8문항짜리 일일테스트 1건(문제지 4장 + 정답지)이면 대부분 한 번에 검증된다.",
  "그림이 2장 이상 붙은 문항을 일부러 넣어야 다장 배치가 드러난다.",
  "정답지 1쪽 정원은 25문항짜리로 뽑아야 「빠른 정답」 상자가 커져 해설이 사라진다.",
  "서술형 문항과 **단답형 문항이 함께** 들어가야 배지 두 갈래가 다 찍힌다.",
];
