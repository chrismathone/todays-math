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

import { textbookPrintCheck } from "@/lib/textbook/render/printCheck";

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
    id: "math-question-content-repair-20261018",
    title: "수학 문항 오류 17행 — 선택 도형·수선·정다각형 조건",
    changed:
      "초4 다섯 문항류의 이등변삼각형 오답 2개씩, 사다리꼴 오답, 수선 4·5개 그림과 정다각형의 모든 각 조건을 바로잡는다.",
    look: "① 두 삼각형 선택 문제는 실제 도형에서 정답이 하나뿐인가. ② 사다리꼴 선택의 두 오답에 평행한 변이 없는가. ③ 수선 4·5개가 본문과 그림에서 일치하고 직각 표시가 겹치지 않는가. ④ 정다각형의 모든 변·모든 각 조건이 빠지거나 잘리지 않는가. ⑤ 학생 문제지에 정답·해설이 노출되지 않고 교사용 답지의 기호·풀이가 같은 그림과 대응하는가.",
    lookFromSource: true,
    evidence: [
      "docs/planning/tracks/math-question-formats-20261018.md §5·7",
      "docs/planning/tracks/reports/math-question-formats-20261018/claude-plan-review-r1.md C1·C6",
      "scripts/qa/bank/math-question-repair.ts",
    ],
    scale: "수정 대상 17행 · 5문항류, 물리 출력 미검수",
    needs: "17행 수정 후보를 담은 학생용 문제지와 교사용 정답·해설지",
    status: "대기",
    changedOn: "2026-10-18",
  },
  {
    id: "math-question-format-picker-20261018",
    title: "같은 수학 문항의 실제 형식 선택과 인쇄",
    changed:
      "교사가 같은 문항의 객관·단답 실제 표현을 선택하고 담기에서 형식을 바꾼다. 선택한 실제 행의 본문·보기·정답을 출력한다.",
    look: "객관→단답·단답→객관을 각각 선택해 인쇄한다. 담긴 자리와 문항 수가 유지되고 선택한 실제 본문·보기가 나타나는가. 학생용에는 정답·해설·형식 선택창의 교사용 답이 보이지 않으며, 교사용 답지의 보기 번호가 선택한 실제 표현과 일치하는가. 과거 저장본의 형제 중복과 순서가 그대로 출력되는가.",
    lookFromSource: true,
    evidence: [
      "docs/planning/tracks/math-question-formats-20261018.md §3·4·7",
      "docs/planning/tracks/reports/math-question-formats-20261018/claude-plan-review-r1.md C6",
    ],
    scale: "형식 선택 UI·담기·저장·인쇄 경로, 물리 출력 미검수",
    needs: "실제 단답·객관 형제를 바꾼 시험지와 중복 형제를 가진 과거 저장본",
    status: "대기",
    changedOn: "2026-10-18",
  },
  {
    id: "math-question-bounded-reinforcement-20261018",
    title: "수학 재고 보강 후보 — 원래 객관식·서술형 포함",
    changed:
      "읽기 전용 재집계 후 승인된 53문항류 중 부족분만 기존 생성기로 준비한다. 새 내용 96개·표현 174행은 상한이며 객관 전용과 native 서술형은 단독 행이다.",
    look: "최종 승인 manifest의 새 문항을 학생·교사 두 지면으로 출력한다. 보기 자체가 조건인 객관식의 모든 보기가 유지되고, 그림·수식·단위가 잘리지 않는가. 서술형의 풀이 공간이 충분하며 채점 기준·부분점수·해설은 교사용에서만 보이는가. 단답 전용 f33/f39에 객관식이 생기지 않았는가.",
    lookFromSource: true,
    evidence: [
      "docs/planning/tracks/math-question-formats-20261018.md §6·7",
      "docs/planning/tracks/reports/math-question-formats-20261018/claude-plan-review-r1.md C3·C6",
    ],
    scale:
      "최대 96새 내용 · 174표현, 최종 후보 수는 별도 원장, 물리 출력 미검수",
    needs:
      "별도 Claude 실행 검토를 받을 최종 보강 후보 manifest 전체의 학생·교사 출력",
    status: "대기",
    changedOn: "2026-10-18",
  },
  {
    id: "answer-key-measured-pagination-20261018",
    title: "정답지 — 긴 빠른 정답·서술형 해설의 다음 장 배치",
    changed:
      "실제 글꼴이 준비된 정답지에서 해설이 세 번째 단으로 밀리면 다음 장으로 분리한다. 두 단과 장당 최대 8항목은 유지하며 페이지 계산 중 인쇄 버튼을 비활성화한다.",
    look: "빠른 정답이 긴 17문항 혼합 시험지와 서술형 12문항 시험지에서 빠른 정답·모든 해설·채점 기준이 빠짐없이 보이고 번호가 이어지는지 확인한다. 해설이 세 번째 단이나 A4 아래로 사라지거나 계산이 끝나기 전 인쇄되면 불합격이다.",
    lookFromSource: true,
    evidence: [
      "src/components/print/TestPrint.tsx",
      "src/lib/printLayout.ts",
      "docs/planning/tracks/reports/math-bank-reinforcement-20261018/execution-addendum.md",
    ],
    scale: "긴 정답·해설이 있는 수학 정답지 전체",
    needs: "새 사다리꼴 17문항 혼합과 서술형 12문항, A4 실제 크기 100%",
    status: "대기",
    changedOn: "2026-10-18",
  },
  {
    id: "math-bank-g4-repeat-20261018",
    title: "수학 문제은행 보강 — 초4 삼각형·평행·사다리꼴 새 문형",
    changed:
      "초4의 정삼각형의 성질, 삼각형의 두 기준 분류, 평행과 평행선, 사다리꼴에 새 문형 9개를 보강한다. 기존 인쇄 양식은 유지하며 새 조건·수치·그림이 있는 문항을 확인한다.",
    look: "새 문형을 기존 A4 문제지에 넣어 조건·수식·그림과 답란이 잘리거나 겹치지 않는지 본다. 그림의 주어진 값과 물음이 일치해야 하며, 학생 문제지에 정답이나 교사용 해설이 보이면 불합격이다.",
    lookFromSource: true,
    evidence: [
      "docs/planning/tracks/math-bank-reinforcement-20261018.md §2·§6",
      "docs/planning/tracks/reports/math-bank-reinforcement-20261018/claude-plan-review-r2.md",
    ],
    scale: "초4 4차시 · 새 문형 9개 · 발문 27개 이상",
    status: "대기",
    needs:
      "보강 결과 원장의 초4 신규 문항을 골라 문제지·정답지를 각각 실제 프린터로 출력한다. 브라우저·PDF 검사와 실물 확인을 구분해 기록한다.",
    changedOn: "2026-10-18",
  },
  {
    id: "math-bank-native-descriptive-20261018",
    title: "수학 문제은행 보강 — 본래 서술형과 교사용 채점 기준",
    changed:
      "초4와 중3에 추론·근거 설명을 처음부터 요구하는 서술형 12문항을 보강한다. 교사용 해설에는 모범 풀이와 부분점수 기준을 함께 두며 학생용 문제지와 분리한다.",
    look: "학생용 문제지의 조건·수식·풀이 공간이 잘리지 않고, 모범 답과 채점 기준이 노출되지 않는지 본다. 정답지에는 문항별 모범 풀이와 채점 기준이 빠짐없이 대응해야 하며, 해설이 다음 단이나 페이지 밖으로 사라지면 불합격이다.",
    lookFromSource: true,
    evidence: [
      "docs/planning/tracks/math-bank-reinforcement-20261018.md §4·§6",
      "docs/planning/tracks/reports/math-bank-reinforcement-20261018/claude-plan-review-r2.md",
    ],
    scale: "초4 6문항 · 중3 6문항 · 본래 서술형 6유형",
    status: "대기",
    needs:
      "보강 결과 원장의 서술형 12문항을 포함해 학생용 문제지와 교사용 정답지를 실제 프린터로 출력하고, 번호·부분점수 합계·답안 비노출을 확인한다.",
    changedOn: "2026-10-18",
  },
  {
    id: "arithmetic-basic-preset-heading-20261016",
    title: "연산대장 기초 연산 — 묶음 머리말이 고른 유형 이름으로",
    changed:
      "기초 연산 시험지의 묶음 머리말(검토 화면 · 지면 sectionHeading)이 «한 자리 덧셈 · 받아올림 있음 · 가로셈» 같은 기능 이름에서 원장님이 담은 카드 이름 «3 더하기 · 받아올림 있음 · 가로셈»으로 바뀌었다. 카드와 맞지 않는 직접 설정은 «한 자리 덧셈 · 받아올림 있음 · 더하는 수 4 · 가로셈»처럼 고정된 수를 적는다. 저장본은 그대로이고 머리말만 바뀐다(원장님 2026-10-16 «3 더하기로 추가했는데도 한자리 덧셈 받아올림있음 가로셈으로 나옴»).",
    look: "(제안) 기초 연산 지면에서 묶음 머리말이 담은 카드 이름 그대로인지, 긴 이름(«두 자리 덧셈 · 받아올림 0회 · 세로셈» · «19 빼기 · 받아내림 1회 · 세로셈»)이 2단에서 한 줄에 들고 잘리지 않는지 본다. 머리말이 기능 이름(«두 자리 세로 덧셈 …»)으로 찍히거나 줄이 접혀 문항과 겹치면 불합격이다.",
    lookFromSource: false,
    evidence: [
      "src/lib/arithmeticPresentation.ts (arithmeticSelectionTitle)",
      "src/lib/arithmeticOutput.ts (payloadVersion 1 groupTitle)",
      "src/__tests__/unit/arithmeticOutput.test.ts",
    ],
    scale: "기초 연산 110유형 전부 — 머리말 글자만",
    status: "대기",
    needs:
      "연산대장 → 학년 «기초 연산» → «3 더하기 · 받아올림 있음»과 «두 자리 덧셈 · 받아올림 0회»를 담아 양식 구성·출력 → 2단으로 인쇄",
    changedOn: "2026-10-16",
  },
  {
    id: "arithmetic-figure-first-20261016",
    title: "연산대장 — 그림 우선 도형 유형(삼각비·피타고라스·닮음·원·중1 각)",
    changed:
      "내심·외심에 이어 70유형을 그림 우선으로 바꿨다. gt1 49유형(1,718문항)은 주어진 값을 모두 적고 x를 표시한 그림으로 다시 그리고, gm 14유형(234문항)은 편집기 배치 그대로 빈 각·굵은 선분에 x를 더하며, 삼각비 4유형(24,474문항)은 문장의 값으로 직각삼각형을 새로 그린다. 문항 문장은 없애고 «[11~20] 다음 그림의 직각삼각형 ABC에서 x의 값을 구하세요.» 한 줄을 묶음 위에 둔다. 비·넓이·sin 값처럼 그림에 못 싣는 것만 문항 아래 한 줄로 남는다.",
    look: "(제안) 여섯 템플릿과 연산 인쇄에서 x와 숫자가 자기 변·각 옆에 읽히는지(좁은 자리는 가는 지시선), 머리말 번호 범위가 문항 번호와 맞는지, 사인값·비 한 줄이 그림과 답란 사이에서 잘리지 않는지 본다. 라벨이 선에 겹치거나 x가 어느 변의 것인지 모호하면 불합격이다.",
    lookFromSource: false,
    evidence: [
      "src/lib/arithmetic-v2/presentation/figureFirst.ts",
      "src/lib/arithmetic-v2/presentation/figureFirstTriangles.ts",
      "src/lib/arithmetic-v2/presentation/figureFirstAnnotated.ts",
      "src/lib/arithmetic-v2/presentation/figureFirstTrig.ts",
    ],
    scale: "70유형 · 26,948문항",
    status: "대기",
    needs:
      "/dev/arithmetic/grade-print?type=m3-trig-special-length&count=8 · type=m3-pythagoras-leg-surd · type=m3-circle-chord-length · type=m3-trig-length-given-ratio · 연산대장에서 해당 유형을 담아 양식 구성·출력",
    changedOn: "2026-10-16",
  },
  {
    id: "arithmetic-figure-first-elementary-20261016",
    title: "연산대장 — 초등 각도·둘레·넓이 그림 우선, 미지수는 □",
    changed:
      "초4 각도·삼각형 10유형(993문항)과 초5 다각형의 둘레와 넓이 28유형(3,800문항), 초6 원의 둘레·넓이 4유형(232문항)을 그림 우선으로 바꿨다. " +
      "얼린 표시 배치는 그대로 두고 구할 값만 □로 표시한다 — 각은 빈 호 안쪽에 «□»(교과서 표기 — ° 없음), 길이는 «가로·밑변·높이» 글자가 있던 자리에 «□ cm»(단위 자리는 숫자와 같다). " +
      "둘레·넓이·원주를 구하는 유형은 □ 없이 머리말 «[1~4] 다음 직사각형의 둘레를 구하세요.»가 묻고, 나머지는 «다음 사각형에서 □의 값을 구하세요.»다. " +
      "□는 글꼴 글자가 아니라 숫자 높이·굵기로 그린 네모라 어느 프린터에서나 같다. 원주·넓이에서 반지름·지름을 구하는 원 유형은 그림에 반지름이 없어 문장 그대로다.",
    look:
      "(제안) ① □가 숫자(«4 cm»)와 같은 높이·굵기로 찍히는지, 각의 «□»에 ° 가 붙지 않았는지. " +
      "② □가 각의 호·꼭짓점·같음 표시·직각 표시·점선 높이 위에 겹치지 않는지(높이 안쪽 «□ cm»는 점선에서 2 px 비켜 선다). " +
      "③ 직각삼각형 20°·25° 꼭지각 둘만 가는 지시선으로 밖에 두는데, 지시선이 변을 가로지르지 않는지. " +
      "④ 둘레·넓이 메모(«둘레 36 cm»)가 그림 위에 남아 있고 문항 문장이 사라졌는지, 머리말 번호 범위가 문항 번호와 맞는지.",
    lookFromSource: false,
    evidence: [
      "src/lib/arithmetic-v2/presentation/figureFirstElementary.ts",
      "src/lib/arithmetic-v2/presentation/figurePolicyElementary.ts",
      "src/__tests__/unit/arithmeticFigureFirstElementary.test.ts",
    ],
    scale: "42유형 · 5,025문항",
    status: "대기",
    needs:
      "/dev/arithmetic/grade-print?type=e4-angle-sum&count=8 · type=e4-right-triangle-missing-angle · type=e5-rectangle-perimeter-side · type=e5-triangle-area-height · type=e5-trapezoid-area-top · type=e6-circle-area-radius · 연산대장에서 해당 유형을 담아 양식 구성·출력",
    changedOn: "2026-10-16",
  },
  {
    id: "arithmetic-center-angles-20261016",
    title: "연산대장 — 내심·외심 각도 그림과 묶음 머리말",
    changed:
      "내심·외심 각도 14유형(159문항)을 그림 위주로 바꿨다. 주어진 각을 모두 그림에 적고 구할 각을 x로 표시하며, 문장 대신 같은 유형 묶음 위에 «[1~4] 다음 그림에서 점 I가 △ABC의 내심일 때, ∠x의 크기를 구하세요.» 한 줄을 둔다.",
    look: "(제안) 여섯 템플릿과 연산 인쇄에서 머리말 범위 번호가 실제 문항 번호와 맞고, 각도 숫자와 x가 자기 각 안(좁은 각은 지시선)에 읽히는지 본다. 머리말이 쪽 끝에 홀로 남거나 그림·답란이 잘리면 불합격이다.",
    lookFromSource: false,
    evidence: [
      "src/lib/arithmetic-v2/presentation/centerAngles.ts",
      "src/components/unified/print/templates/ProblemMeta.tsx",
      "src/components/arithmetic/GradeArithmeticPaper.tsx",
    ],
    status: "대기",
    needs:
      "/dev/arithmetic/grade-print?type=m2-incenter-three-half-angles&count=8 (외심은 m2-circum-central-angle) · 연산대장에서 내심·외심 유형을 담아 양식 구성·출력",
    changedOn: "2026-10-16",
  },
  {
    id: "arithmetic-paper-20261014",
    title: "연산대장 — 문제지와 정답지",
    changed:
      "자연수 기초 연산을 쪽당 12·24·40문항으로 출력한다. 세로셈 자릿수를 맞추고 정답은 별도 지면에만 표시한다.",
    look: "(제안) 세 가지 밀도로 가로셈·세로셈을 섞어 출력한다. 식·답란·문항 번호가 셀 밖으로 겹치거나 잘리면 불합격이다. 문제지와 정답지 번호 및 회차가 일치하고, 문제지에는 정답이 없어야 한다.",
    lookFromSource: false,
    evidence: [
      "src/components/arithmetic/ArithmeticPaper.tsx",
      "docs/planning/arithmetic-paper-benchmark-20261014.md",
    ],
    status: "대기",
    needs:
      "/dev/arithmetic 에서 생성 또는 /dev/arithmetic/print?density=12 (24·40도 확인)",
    changedOn: "2026-10-14",
  },
  {
    id: "product-display-name-20261014",
    title: "오늘 수학 · 오늘 영어 — 인쇄 제품명",
    changed:
      "수학 시험지·정답지·개념백지와 영어 시험지·듣기 지면의 제품 표시명을 오늘 수학·오늘 영어로 바꿨다. 새 학습지의 기본 제목도 오늘 수학 학습지로 표시한다.",
    look: "(제안) 첫 쪽과 이어지는 쪽의 머리·꼬리말에서 새 제품명과 띄어쓰기가 보이고 글자가 잘리지 않는지 확인한다. 기존에 저장한 학습지 제목과 사용자가 지정한 학원명은 그대로여야 한다. 문항 번호·답란·쪽 나눔이 유지되지 않으면 불합격이다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/goal-bank-arithmetic-brand-20261014.md",
      "src/components/print/PrintAnswerKeyPage.tsx",
      "src/components/concept-blank/paper/PaperParts.tsx",
      "src/components/english/print/EnglishPaper.tsx",
      "src/components/english/listening/print/ListeningPrint.tsx",
    ],
    scale: "수학·영어 제품명이 표시되는 인쇄 지면",
    status: "대기",
    needs:
      "수학 시험지·정답지·개념백지와 영어 학생용·교사용·듣기 지면 각 첫 쪽 및 이어지는 쪽",
    changedOn: "2026-10-14",
  },
  {
    id: "paper-readable-accent-20261005",
    title: "시험지 선택 색상 — 문항 번호·안내 글자 대비",
    changed:
      "밝은 선택 색상은 장식에 유지하고 문항 번호·안내 글자는 읽을 수 있는 잉크로 보완한다. 색상 상자 안 글자는 배경에 맞춰 표시한다.",
    look: "사이언·노랑·주황과 기본 남색으로 문항 번호, 총점, 학원 표식, 안내·쪽수를 컬러와 흑백으로 확인한다. 숫자와 안내가 흐리거나 구분되지 않으면 불합격이다. A4 크기·열·문항 배치가 유지되는지도 확인한다.",
    lookFromSource: false,
    evidence: [
      "docs/qa/impeccable-audit-2026-10-05.md",
      "src/components/unified/print/readableColor.ts",
    ],
    scale: "수학 시험지 6개 템플릿 · 선택 색상 8개",
    status: "대기",
    needs: "동일 시험지의 밝은 색상·기본색 컬러/흑백 출력",
    changedOn: "2026-10-05",
  },
  {
    id: "textbook-v15-recovery-20261005",
    title: "교재 제작 — 2-1-1 기준 조판 복구",
    changed:
      "대화·판서·개념 묶음과 암기 공통 행을 보존하고, 선택한 구성의 안내·목차·색인을 출력한다. 문제 풀이선과 쪽수 참조는 실측 후 확정한다.",
    look: "A4 100%로 기준 교재와 같은 영역을 비교한다. 제목·본문·열·푸터·암기 행의 차이 ±0.5mm, 은행 풀이선 0.2~0.35mm·간격 7mm±0.5mm, 원본 풀이선은 해당 영역의 7mm·8mm 기준, 서술형 풀이 폭 열의 95% 이상, QR은 풀이 칸 밖인지 확인한다. 답지에서 이어진 예제 묶음의 둘째 쪽에 제목·계속 표시·오른쪽 열 확인문제가 나오고 꼬리말과 겹치지 않는지 확인한다. 휴대폰으로 학생용·답지·펼침면 QR을 실제 스캔한다.",
    lookFromSource: true,
    evidence: [
      "docs/planning/textbook-v15-recovery-plan-final-20261005.md",
      "docs/planning/textbook-v15-recovery-execution-20261005.md",
      "docs/reports/textbook-m3-paired-overflow-20261005.md",
    ],
    scale: "초3~중3 · 두 학기 · 28가지 선택 구성",
    status: "대기",
    needs: "동일 원본 U01·실제 초3·실제 중2 학생용/답지 검수본",
    blockedBy:
      "디지털 조판 검수를 마친 뒤 실물 인쇄·휴대폰 판독 증거를 기록해야 한다.",
    changedOn: "2026-10-05",
  },
  {
    id: "textbook-structure-edit-intro",
    title: "교재 제작 — 단원 도입의 글을 고친 판본",
    changed:
      "세부 편집의 «내용 수정» 으로 자동 단원 도입의 도입 제목 · 질문 · 설명 · 핵심 문구 · 학습 목표 · 학습 순서 · 출발점 질문 · 날짜 문구를 고칠 수 있다. 조판은 그대로다 — 글만 바뀐다.",
    look: "표본 셋을 뽑는다 — ⑴ 모든 칸을 고친 판본 ⑵ 핵심 문구 · 날짜 문구 · 도입 제목을 비운 판본 ⑶ 질문 · 설명을 길게 고쳐 두 면이 한 면으로 바뀐 판본. 불합격: 고친 글이 하나라도 빠졌다 · 옛 글이 남았다 · 왼쪽 면에서 제목 · 질문 · 삽화 · 설명 · 핵심 문구가 겹친다 · 오른쪽 면이나 한 면 배치에서 목표 · 순서 · 출발점이 잘린다 · ⑵ 에서 빈 칸의 자리에 기본 문구(«단원 도입» · «공부를 시작한 날»)가 아닌 것이 찍혔다 · ⑶ 에서 종이는 한 면인데 화면의 미리보기는 그것을 알리지 않았다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/textbook-structure-editor-20261006.md",
      "src/components/textbook/structureFields.ts",
      "src/lib/textbook/render/blocks/automaticIntro.ts",
    ],
    scale: "자동 단원 도입이 든 교재 전부(고친 것만)",
    status: "대기",
    needs:
      "같은 교재의 고치기 전 PDF 와 고친 뒤 PDF — 질문 · 설명을 은행 원고의 가장 긴 것(질문 45자 · 설명 98자)보다 길게 고친 판본 포함",
    changedOn: "2026-10-06",
  },
  {
    id: "textbook-structure-edit-writing-board",
    title: "교재 제작 — 질문 기록 · 판서의 글을 고친 판본",
    changed:
      "질문 기록의 질문 문구와 «질문마다 작성선» 수(1~30), 판서의 제목 · 수식 · 주석을 고칠 수 있다. 질문의 개수는 그대로다.",
    look: "질문 기록 — 작성선을 1줄 · 8줄 · 30줄로 고친 판본 셋. 불합격: 새 질문이 안 찍혔다 · 질문마다 작성선 수가 고른 수와 다르다 · 선 간격이 7mm±0.5mm 를 벗어난다 · 질문 · 선 · 꼬리말이 겹친다 · 30줄 판본이 화면에서는 넘침으로 막혔는데 종이가 나왔다(또는 그 반대). 판서 — 제목 · 수식 · 주석을 고친 판본. 불합격: 새 글이 빠졌다 · 수식이 잘리거나 오류 표시로 찍혔다 · 판서 뒤의 대화가 겹친다 · 같은 단원의 대화 글자가 9.2pt 보다 작다(조판이 허용하는 최소 크기).",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/textbook-structure-editor-20261006.md",
      "src/lib/textbook/render/blocks/semantic.ts",
      "src/lib/textbook/render/blocks/dialogue.ts",
    ],
    scale: "질문 기록 · 판서가 든 교재(고친 것만)",
    status: "대기",
    needs:
      "작성선을 1 · 8 · 30줄로 고친 질문 기록, 수식을 길게 고친 판서가 든 단원의 학생용 PDF",
    changedOn: "2026-10-06",
  },
  {
    id: "textbook-draft-copy-structure-refs",
    title: "교재 제작 — 새 초안으로 복사한 교재의 재발행",
    changed:
      "새 초안 복사 · 가져오기가 구조 안의 문항 번호(유형 묶음의 대표예제 · 확인문제, 색인의 대상)도 새 번호로 바꾼다. 전에는 문제 블록의 번호만 바꿔, 복사한 초안에서 대표예제 역할과 색인의 쪽 번호가 끊겼다.",
    look: "발행한 교재를 ⑴ 새 초안으로 복사해 ⑵ 교환 파일로 내보냈다가 새 원고로 가져와, 각각 그대로 다시 발행하고 원본 PDF 와 나란히 본다. 불합격: 유형 묶음에서 대표예제의 풀이가 빠지거나 확인문제에 풀이가 붙었다(역할이 원본과 다르다) · 유형 색인 · 차례의 쪽 번호가 실제 쪽과 다르거나 비었다 · 학생용 · 해설판의 QR 이 다른 문항을 가리킨다 · 원본 복원 교재의 본문 조각 · 머리말 · 꼬리말 그림이 빠졌다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/textbook-structure-editor-20261006.md",
      "src/lib/textbook/semanticRefs.ts",
      "src/lib/textbook/server/books.ts",
    ],
    scale: "대표예제 묶음이나 유형 색인이 든 교재의 복사본 전부",
    status: "대기",
    needs:
      "간편 생성한 교재(대표예제 · 유형 색인 켬)와 원본 복원 교재(그림이 든 꼬리말)의 원본 PDF · 복사본 PDF · 가져온 원고의 PDF",
    changedOn: "2026-10-06",
  },
  {
    id: "english-listening-native-visual",
    title: "영어듣기 — DB 문항과 시각 자료 인쇄",
    changed:
      "문항 전체 이미지에는 발문·보기를 다시 출력하지 않고, 그림·표만 있는 이미지는 DB의 발문과 실제 보기와 함께 출력한다. 번호뿐인 그림 보기는 중복 출력하지 않는다.",
    look: "(제안) 문항 전체 이미지의 발문이 두 번 나오지 않는지, 그림·표 문항의 발문·보기·필수 시각 자료가 모두 보이는지 확인한다. 원본 번호와 시험지 번호를 구분하고, 공통 지시문이 빠지지 않으며 학생용에는 정답·해설·대본이 없는지 확인한다. 교사용에는 정답과 해설이 보여야 한다.",
    lookFromSource: false,
    evidence: [
      "src/components/english/listening/print/ListeningPrint.tsx",
      "src/__tests__/unit/englishListeningQuestionPresentation.test.tsx",
      "src/contracts/englishListeningSource.contract.ts (question.image.role)",
    ],
    needs:
      "문항 전체 이미지·그림 보기·텍스트 보기·공통 지시문이 함께 있는 듣기 자료",
    scale: "영어듣기 발행본 및 초안 학생용·교사용 인쇄",
    status: "대기",
    changedOn: "2026-10-04",
  },
  { ...textbookPrintCheck, changedOn: "2026-10-03" },
  {
    id: "english-listening-bank-original-crops",
    changedOn: "2026-10-04",
    title: "듣기은행 — 원본 그림·표와 골라 담은 시험지",
    changed:
      "전국 듣기평가·모의고사 문제지에서 문항 그림을 보존하고, 회차 전체나 문항별로 골라 새 시험지를 인쇄한다. 새 번호와 원본 번호를 함께 표시한다.",
    look: "A4 100% 출력에서 그림 보기 다섯 개와 표의 글자가 선명하고 잘리지 않는가. 새 번호·원본 번호와 문항 그림이 같은 쪽에 있는가. 공통 지시문이 있는 두 번째 문항만 골라도 지시문이 남는가. 학생용에는 정답·대본·해설이 없고 교사용에는 지정한 정답이 있는가.",
    lookFromSource: false,
    evidence: [
      "src/components/english/bank/listeningPdfImport.ts",
      "src/components/english/listening/print/ListeningPrint.tsx",
      "docs/planning/tracks/reports/listening-bank-workflow-20261004.md",
    ],
    scale: "검증한 전국 평가 6개 학년 120문항과 고1 학력평가 듣기 17문항",
    status: "대기",
    needs:
      "원본 그림 보기 문항·표 문항·공통 지시문의 두 번째 문항을 담고 학생용·교사용 시험지를 각각 출력한다.",
  },
  {
    id: "bank-choice-figures",
    title: "문제은행 — 그림 보기의 번호와 2열 배치",
    changed:
      "짝이 확인된 보기 그림을 해당 번호 칸 안에 배치한다. 발문 그림은 발문 아래에 남고, " +
      "보기는 설정과 창 폭에 관계없이 두 열이다. 그림 폭은 칸에 맞추며 원본 비율을 유지한다. " +
      "보기가 그림뿐인데 짝을 모르는 문항은 예전 조판 그대로이고, 보기 위에 «보기 그림의 번호를 확인할 수 없는 문항입니다.» 한 줄이 선다" +
      "(3자 합의 A2 — 그런 문항은 출제에서 빠져 있어 보통은 교사 화면에서만 보인다).",
    look:
      "①~⑤ 번호가 각 그림의 왼쪽 위에 있고 원본의 짝과 같은가. 다섯째 보기가 홀로 남는 마지막 행, " +
      "발문 그림과 보기 사이 간격을 확인한다. 쪽 넘김에서 번호와 그림이 갈라지거나 잘리지 않는가. " +
      "학생지와 교사용에서 그림 순서·폭·비율이 같은가. 짝을 모르는 문항의 한 줄 문구가 보기와 겹치지 않는가.",
    lookFromSource: true,
    evidence: [
      "docs/planning/tracks/briefs/bank-decide.md §2",
      "src/components/math/ProblemContent.tsx",
      "src/lib/printOverflow.ts",
      "src/__tests__/unit/bankChoiceFigures.test.tsx",
    ],
    scale: "choiceFigureIndex 로 보기 그림의 짝이 확인된 문항",
    status: "대기",
    needs:
      "대구일중 3번·신명여중 9번을 학생지와 교사용으로 각각 출력하고, 쪽 끝에도 놓아 본다.",
    changedOn: "2026-10-03",
  },
  {
    id: "elementary-bank-net-and-hidden-dimensions",
    title: "초등 원기둥 전개도와 정육면체 역산 그림",
    changed:
      "원기둥의 두 밑면을 옆면의 서로 반대쪽 긴 변에 붙이고, 한 모서리를 구하는 정육면체 그림에서 치수선과 치수 글자를 뺐다.",
    look: "원기둥의 원 둘이 서로 반대쪽 긴 변에 닿아 있어야 한다. 정육면체 역산 그림에 답 길이가 보이면 안 되며, 면과 숨은 모서리 점선은 남아 있어야 한다. 치수를 주는 다른 직육면체 문항에는 기존 치수가 그대로 보여야 한다.",
    lookFromSource: true,
    evidence: [
      "docs/planning/tracks/briefs/bank-fix.md §2 EL-01·EL-02",
      "docs/planning/09-figure-engine-guide.md §2.1·§2.2",
      "src/__tests__/unit/elementaryBankFixFigures.test.ts",
    ],
    status: "대기",
    needs:
      "초6 2-6-2 원기둥 전개도, 초6 1-6-1 문형10, 초5 2-5-2 문형01과 치수가 있는 직육면체 문항을 넣은 시험지",
    changedOn: "2026-10-03",
  },
  {
    id: "english-listening-student-teacher",
    changedOn: "2026-10-03",
    title: "영어듣기 학생용·교사용 A4",
    changed:
      "발행한 듣기 자료를 학생용 문항과 교사용 대본·정답·해설로 나눠 인쇄한다. 학생용은 서버에서 대본과 정답 정보를 제거한다.",
    look: "학생용에 대본·해석·정답·해설이 없어야 한다. 긴 발문·5개 보기·여러 대화의 문항이 잘리거나 겹치지 않아야 한다. 교사용에 정답 번호와 대본이 보여야 한다. A4 100%로 실제 출력해 여백과 다음 쪽 넘어감을 확인한다.",
    lookFromSource: true,
    evidence: [
      "docs/planning/english-listening-plan-20261003.md §11",
      "src/components/english/listening/print/ListeningPrint.tsx",
    ],
    status: "대기",
    needs: "영어듣기에서 발행한 자료의 학생용 인쇄·교사용 인쇄를 각각 연다.",
  },
  {
    id: "studio-export-condition-and-solve-layout",
    title: "시험지 조건 상자·문항 머리와 오른쪽 풀이 공간",
    changed:
      "조건 제목만 작게 가운데에 놓고 글머리표 본문은 보통 굵기·왼쪽 정렬로 분리했다. 문항 번호와 단원·난이도는 첫 행, 본문은 다음 행에 놓는다. 1단 오른쪽 풀이 공간과 2단 구분선은 설정에 맞춰 지면과 측정에 함께 적용한다. 정통 시험지 표 아래 중복 정보 줄을 제거하고 문항 배점 숨기기를 제공한다.",
    look: "〈조건〉 아래의 글머리표·이어지는 줄·수식이 굵거나 가운데 정렬되지 않고 상자 안에 남아야 한다. 번호와 메타는 같은 첫 행, 발문은 다음 행이어야 한다. 1단 풀이 공간 끔·빈칸·노트·칠판을 바꿔도 전체 폭 머리말과 좁아진 문항의 쪽 나눔이 겹치지 않아야 한다. 두 배치 방식에서 2단 구분선 켬·끔을 확인하고 미리보기·PDF·100% A4 실물의 위치와 간격을 비교한다. 정통 표 아래에 시험 정보가 반복되지 않아야 한다. 배점 숨기기를 켜면 본문·소문항의 인식된 배점만 숨겨지고 끄면 원래대로 보이며, 원본 이미지의 글자는 유지되어야 한다.",
    lookFromSource: true,
    evidence: [
      "src/components/math/MarkdownRenderer.tsx",
      "src/lib/mathgen/blocksToMarkdown.ts",
      "src/components/unified/print/templates/ProblemMeta.tsx",
      "src/components/unified/print/templates/BodyContainer.tsx",
      "e2e/export-condition/layout.spec.ts",
    ],
    status: "대기",
    needs:
      "글머리표 조건 상자·긴 조건·수식을 포함한 1단/2단 학습지와 풀이 공간 네 설정",
    changedOn: "2026-09-14",
  },
  {
    id: "studio-native-hwpx-pdf",
    title: "가져온 문제의 원본 구조와 HWPX·PDF 출력",
    changed:
      "typed OCR의 표·번호·배점·보기 열 수·소문항·그림 위치를 학습지에 보존하고, 현재 미리보기에서 편집 가능한 HWPX와 서버 PDF를 내려받는다.",
    look: "제안: 브라우저 인쇄·PDF·HWPX를 같은 100% A4 배율로 비교한다. 표와 그림이 빠지거나 겹치지 않고, 배점은 발문 끝에 한 번, 부정어는 굵은 밑줄로 나오며, 소문항 풀이 여백과 보기 열 수가 미리보기와 같아야 한다.",
    lookFromSource: false,
    evidence: [
      "src/components/unified/NativeProblem.tsx",
      "src/lib/export/hwpxLayout.ts",
      "src/lib/export/pdfServer.ts",
      "e2e/worksheet-figure/exports.spec.ts",
    ],
    status: "대기",
    needs:
      "직접 가져온 문제에 표·선택지별 그림·3.0점 배점·소문항을 포함한 학습지",
    changedOn: "2026-09-14",
  },
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
    changedOn: "2026-08-17",
  },
  {
    id: "t52-base",
    title: "T5.2 인쇄 미리보기 + 인쇄 CSS 전체",
    changed:
      "Mathgen 자습 템플릿 일체를 이식했다. T5.1 은 시안 선택용 출력이었고, 제품 지면은 " +
      "2026-08-29 에 원장님이 실물로 검수해 통과했다(커밋 443a31e5, 그날 43건 통과). " +
      "⚠️ **그때 종이에 찍힌 서체는 기록에 없었는데, 2026-09-07 에 실측했다** " +
      "(scripts/qa/measure-paper-font.tsx — CDP 로 «글리프에 실제 쓰인 글꼴»을 묻는다). " +
      "이 PC 에서 지면 본문은 **Noto Serif KR** 로 나간다(바탕체가 아니다 — 05 §3.1 의 " +
      "「Windows 기본 바탕체」는 실측으로 틀렸고 그 절에 정정 주를 달았다). 화면·자·인쇄 " +
      "매체 셋이 같은 글꼴이라 이 PC 안에서는 어긋남이 없다. " +
      "🔴 **다만 이 통과는 «이 PC 에 Noto Serif KR 이 깔려 있다»에 얹힌 것이다.** 그 글꼴은 " +
      "Windows 기본 설치에 없고, 없는 기계에서는 Batang 으로 떨어지면서 같은 글이 " +
      "6.1~7.1% 넓어져 표본 4개 중 1개가 2줄 → 3줄이 된다. 명조를 적재해 기계 의존을 " +
      "없애면 글자 폭·줄바꿈·문항 높이·쪽 나눔이 함께 달라지므로 **그때 별도 항목으로 " +
      "다시 검수해야 한다.**",
    look: "명조 가독성 · 모눈 농도 · 여백 · 수식 깨짐 · 4장 스테이플 — 05 문서가 T5.2 로 넘긴 다섯 가지.",
    lookFromSource: true,
    evidence: [
      "docs/planning/06-tasks.md:713",
      "docs/planning/05-design-system.md:337",
    ],
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
      "〈보기〉 상자가 있는 문항. ⚠️ **2026-08-25 에는 종이로 확인할 방법이 없었다** — " +
      "공유 풀 2,410건이 전부 엔진 문항이라 상자가 없고, 상자가 있는 기출 3,573건은 격리돼 있었다. " +
      "**2026-09-06 부터는 있다**: 기출 19문항이 풀에 들어왔고 그중 문3(`J30502-A07-022`)에 " +
      "상자가 있다. 다만 그 상자는 **라벨이 없는 테두리**라 이 항목(가운데 정렬·홑화살괄호)을 " +
      "판정하지 못한다 — `exam-headerless-box` 가 그쪽을 본다. 이 항목은 여전히 " +
      "**〈보기〉·〈조건〉 라벨이 붙은** 문항이 풀에 들어와야 다시 볼 수 있다.",
    status: "통과",
    verifiedOn: "2026-08-29",
    changedOn: "2026-08-25",
  },
  {
    id: "d07-score",
    title: "예측 문제지 배점의 지면 위치·서체 (D-07 형태 미확정)",
    changed:
      "D-41 로 「예측 문제지에는 배점을 지면에 찍는다」가 확정됐다. **위치·서체는 D-119(2026-09-05)로 정해졌다** — 문항 머리띠 안 왼쪽 번호, 오른쪽 끝 배점(sans 9.5px). 남은 것은 예측 문제지에 **인쇄 화면 자체가 없다**는 것뿐이다.",
    look:
      "**아직 볼 종이가 없다.** 배점의 모양은 D-119 로 정해졌고 기출 지면에는 " +
      "실제로 나간다(`exam-2col-h2`). 그런데 **예측 문제지에는 인쇄 화면이 없어서** " +
      "그 모양이 예측 지면에서도 맞는지 볼 수 없다. 화면을 만든 뒤 이 항목을 되살린다 — " +
      "이 항목이 목록에 남아 있는 이유는 잊지 않기 위해서다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/05-design-system.md:493",
      "docs/planning/07-coding-convention.md (D-119)",
    ],
    status: "형태미확정",
    blockedBy:
      "예측 문제지에 인쇄 화면이 아직 없다 — 배점의 모양(D-119)은 정해졌으니 남은 것은 화면을 만드는 일이다.",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
      "src/app/globals.css (--op-limit-scale · .katex .mop .katex-sizing)",
      "src/__tests__/unit/opLimitScale.test.ts",
      "docs/planning/07-coding-convention.md (D-104)",
    ],
    scale:
      "고등 문항 전량 — 미적분·수열의 ∫·lim·∑ 이 든 문항. 중등에는 이 기호가 없어 " +
      "영향이 없다.",
    needs:
      "∫ 또는 lim 이 든 고등 문항으로 시험지를 뽑아야 한다. 같은 지면에 지수($x^2$)가 " +
      "있는 문항을 함께 넣어야 «지수는 그대로인가»를 나란히 볼 수 있다.",
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
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
    status: "통과",
    verifiedOn: "2026-08-29",
    changedOn: "2026-08-25",
  },
  {
    id: "print-problem-code-badge",
    title: "문제지: 문 N 옆 `[단답형1]` 이중번호 제거 → 문항번호(문항류) 표기",
    changed:
      "원장님 지시 2026-08-26(「인쇄화면에 문1 옆에 [단답형1] 이라고 되어있는데, 왜 굳이 이중번호를? 문1만 남기고 옆에 문항 번호를 적어」). " +
      "문항 번호 뒤의 `[단답형1]` 배지를 제거하고, 문항 코드의 문항류(예: `A05`)를 번호 옆에 짧게 표기하도록 바꿨다.",
    look:
      "① 문제지 각 문항 번호 옆에 `[단답형1]` 같은 이중 번호 배지가 사라졌는가. " +
      "② 문항 번호 뒤에 문항류(`A01`, `A05` 등)가 적절한 크기(11px)와 회색 톤으로 깔끔하게 들어갔는가. " +
      "③ 1세대 옛 문항의 경우 전체 코드가 보존되어 표기되는가.",
    lookFromSource: true,
    evidence: [
      "src/components/print/templates/JaseupTemplate.tsx",
      "src/components/print/TestPrint.module.css (.problemCodeBadge)",
      "src/contracts/problemCode.contract.ts (formatShortProblemCode)",
    ],
    scale: "인쇄 시험지 전량",
    needs: "단답형·서술형 문항이 포함된 시험지 인쇄",
    status: "통과",
    verifiedOn: "2026-08-29",
    changedOn: "2026-08-26",
  },
  {
    id: "print-answer-key-layout",
    title:
      "정답지: «1줄: 문항번호 / 2줄: 답 우측정렬 / 3줄: 해설» 3단 레이아웃",
    changed:
      "원장님 지시 2026-08-26(「정답지에도 문1 옆에 문항번호 적고, 두번째 줄에 우측정렬로 «답: 답안» 이런식으로 적고, 그 아래에 해설」). " +
      "종전의 `문 1 · 답` 한 줄 표기를 1줄(문 1 + 문항번호), 2줄(우측 정렬 답안), 3줄(해설 본문)로 분리했다.",
    look:
      "① 첫 줄에 `문 1`과 문항번호(예: `A01`)가 좌우로 깔끔하게 정렬되는가. " +
      "② 둘째 줄에 `답: ...`이 단 안에서 오른쪽 정렬되어 시선이 명확히 분리되는가. " +
      "③ 셋째 줄부터 해설 본문이 좌측 골드 보더와 함께 정렬되는가. " +
      "④ 긴 정답(수식·여러 값)에서도 우측 정렬이 깨지지 않고 2단 안에 들어오는가.",
    lookFromSource: true,
    evidence: [
      "src/components/print/PrintAnswerKeyPage.tsx",
      "src/components/print/TestPrint.module.css (.solutionHeading, .solutionAnswerRow)",
    ],
    scale: "정답지 인쇄 지면 전량",
    needs: "단답형·수식 정답·긴 정답이 포함된 시험지 정답지 인쇄",
    status: "통과",
    verifiedOn: "2026-08-29",
    changedOn: "2026-08-26",
  },
  {
    id: "print-quick-answer-1col",
    title: "정답지: 빠른 정답 상자 1단 내 유연 격자(flex-wrap) 압축",
    changed:
      "원장님 지시 2026-08-26(「빠른 정답은 정답 길이에 따라 다르겠지만 더 압축시켜서 1단에만 오도록 해. 1행당 4개 해도 1단에 올 수 있을듯」). " +
      "전폭(2단 폭)을 차지하던 빠른 정답 상자를 2단 흐름의 1단 상단으로 압축하고, 짧은 답은 행당 4개·긴 답은 자동 줄바꿈(flex-wrap)되도록 개선했다.",
    look:
      "① 빠른 정답 상자가 상단 전폭을 차지하지 않고 1단 상단에 깔끔하게 들어앉는가. " +
      "② 8문항 시험지 기준 짧은 정답들이 1행 4개씩 2행으로 컴팩트하게 배치되는가. " +
      "③ 긴 정답 문항이 있어도 깨지지 않고 자연스럽게 다음 행으로 접히는가. " +
      "④ 1단 빠른 정답 아래로 해설들이 2단에 걸쳐 자연스럽게 이어지는가.",
    lookFromSource: true,
    evidence: [
      "src/components/print/PrintAnswerKeyPage.tsx",
      "src/components/print/TestPrint.module.css (.quickAnswerBox, .quickAnswerGrid, .quickAnswerCell)",
    ],
    scale: "정답지 1페이지 전량",
    needs: "8문항 및 25문항 시험지 정답지 인쇄",
    status: "통과",
    verifiedOn: "2026-08-29",
    changedOn: "2026-08-26",
  },
  {
    id: "print-paragraph-break",
    title:
      "발문 뒤 나열 대상이 **줄을 바꿔** 앉는다 (문항 높이가 한 줄 늘어난다)",
    changed:
      "원장님 지적 2026-08-27(「두 수의 합을 구하시오. 485, 342 … 줄바꿈 되어있지 않고」). " +
      "`collapseWhitespace` 가 엔진이 넣은 이중 개행을 **전부 공백으로 접고** 있었다. " +
      "이제 «앞이 문장부호로 끝난» 자리에서만 문단으로 남긴다(`keepMeaningfulParagraphs`). " +
      "발문이 한 줄 늘어나므로 **문항 칸 높이가 커진다** — 칸을 꽉 채우던 문항이 넘칠 수 있다.",
    look:
      "① 「두 수의 합을 구하시오.」 「다음 세 분수 중 …」 같은 문항에서 나열 대상($485$, $342$)이 " +
      "발문 **다음 줄**에 앉는가(발문과 한 줄로 붙어 있으면 불합격). " +
      "② 그 때문에 문항이 칸을 넘쳐 다음 장으로 밀리거나 **잘려 나간 문항**이 없는가. " +
      "③ 「ㄱ. ㄴ. ㄷ.」 보기 묶음·「㈎ ㈏ ㈐」 조건 묶음도 발문과 갈라져 있는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/problem/parseProblemContent.ts (keepMeaningfulParagraphs)",
      "src/__tests__/unit/renderParity.test.tsx (2026-08-27 항목)",
    ],
    scale:
      "공유 DB 전량 실측 — 발문이 바뀌는 문항 393건 / 17,513 (보기는 0건). 초3~중2 전 학년에 걸쳐 있다.",
    needs:
      "초3 1-1-1(「두 수의 합」)과 중1 7단원(「ㄱ.ㄴ.ㄷ. 보기」)이 **같이** 들어간 시험지. " +
      "자(`estimateProblemPx`)가 같은 파서를 부르므로 넘침 판정은 따라오지만, 종이는 따로 봐야 한다.",
    status: "통과",
    verifiedOn: "2026-08-29",
    changedOn: "2026-08-27",
  },
  {
    id: "prod-print",
    title: "프로덕션 실물 인쇄 최종 검수 (T6.2)",
    changed: "배포 태스크의 인수 조건. 배포 자체가 미완이라 착수 전이다.",
    look: "로컬과 Vercel 프로덕션의 폰트 폴백이 다를 수 있다. 프로덕션에서 뽑은 종이가 로컬과 같은 글꼴인지 대조.",
    lookFromSource: false,
    evidence: ["docs/planning/06-tasks.md:798"],
    status: "통과",
    verifiedOn: "2026-08-29",
    changedOn: "미착수",
  },
  {
    id: "figure-label-mathjax",
    title: "그림 라벨을 **MathJax 가 조판**한다 (전학년)",
    changed:
      "라벨 글자가 통째로 달라졌다. 종전에는 SVG `<text>` 한 덩어리(Batang·Cambria 폴백)였고, " +
      "이제는 MathJax 가 그린 **외곽선**(`<path>`)이다 — 글꼴 설치가 필요 없어 어느 프린터에서도 " +
      "같게 나온다. 수학 조판 규칙이 살아난다(문자만 이탤릭 · 숫자·단위는 정자체 · `°` 는 위첨자 · " +
      "연산자 앞뒤 여백). **한글 라벨은 TeX 글꼴에 글리프가 없어 종전 `<text>` 그대로다** — " +
      "한 그림 안에 두 글꼴이 섞인다(예: 막대그래프의 눈금 숫자와 항목 이름). " +
      "그리고 라벨 폭을 세는 자가 바뀌어 그림 214장 중 **18장의 viewBox 폭이 달라졌다**(등급 변화는 0).",
    look:
      "① 숫자·단위(`6 cm`·`125°`)와 **한글 이름표**(`사과`·`(개)`)가 한 지면에 있을 때 " +
      "크기·굵기·회색도가 따로 노는 느낌이 없는가 — 이게 이 변경의 **가장 큰 위험**이다. " +
      "② 치수 글자가 도형 선 위에 있을 때 **글자 일부가 먹히지 않았는가**(흰 테두리 순서 결함, " +
      "화면에서는 고쳤다). ③ 라벨이 그림 테두리 밖으로 **잘려 나가지 않는가**. " +
      "④ 작은 그림(140px 등급)에서 조판된 숫자가 종전보다 흐리거나 가늘어 보이지 않는가 — " +
      "외곽선이라 래스터라이저가 다르게 그릴 수 있다. ⑤ `3x°+5°` 같은 식 라벨에서 " +
      "`x` 만 기울고 숫자는 곧게 서 있는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/figure/mathjaxLabel.ts · mathjaxSubstitute.ts · svgLabels.ts",
      "vendor/figure-engine/core/figure_quality.py (add_mj_marks — 표식의 그물)",
      "scripts/figure/label-widths.json (MathJax 에서 뽑은 글자 폭 표)",
      "src/__tests__/unit/figureLabelTypeset.test.ts (조판·halo·잘림 가드)",
      "scripts/qa/probe-figure-label-collisions.mjs --selftest (눈금 11건)",
      "docs/planning/tracks/reports/rpm-engine-gaps.md",
    ],
    scale:
      "초3~중3 그림 **295종**. 라벨 자리 실측 — 조판 1,672 · 한글이라 그대로 둔 것 105. " +
      "viewBox 폭이 달라진 그림 18/214(넓어짐 16 · 좁아짐 2), **인쇄 크기 등급이 바뀐 그림 0**.",
    status: "통과",
    verifiedOn: "2026-08-29",
    needs:
      "실물 출력 — 한글 이름표와 숫자가 **같이** 있는 그림(막대그래프·표)이 반드시 들어가야 한다",
    changedOn: "2026-08-28",
  },
  {
    id: "figure-label-outward",
    title: "꼭짓점 이름표가 도형 **바깥**으로 나갔다 (전학년)",
    changed:
      "라벨이 앉는 **자리**가 바뀌었다. 방향은 RPM 정본을 재서 정했다 — **바깥으로, 그리고 수평 쪽으로 당겨서**(8방위 중 축 칸 비율 48.3% → 67.1%, 정본 70.6%). 종전에는 방향 후보가 «N, NE, …» 고정 순서라 " +
      "도형 안쪽(대개 비어 있다)을 그대로 집었고, 가장 단순한 삼각형에서도 셋 중 둘이 " +
      "**안으로** 들어갔다. 이제 꼭짓점에 붙은 변들의 반대 방향(외각 이등분선)을 " +
      "먼저 본다. 규칙은 RPM 정본 6권 · 라벨 13,591개를 벡터로 재서 뽑았다. " +
      "함께 바뀐 것 둘 — ① **점 이름이 정자체**가 됐다(RPM 도 `A`·`B`·`O` 가 정자체이고, " +
      "우리 문항 본문은 이미 `\\mathrm{}` 을 쓴다). ② 문항의 cm 값을 좌표로 그대로 쓰던 " +
      "갈래의 **축척**을 맞췄다(아르벨로스는 도형 지름이 글자보다 작았다).",
    look:
      "① 꼭짓점 이름표가 도형 **안쪽**에 들어간 것이 없는가 — 다각형·부채꼴을 특히 보라. " +
      "② 이름표가 선·다른 이름표를 **밟지** 않는가(바깥으로 밀면서 새로 겹칠 수 있다). " +
      "③ 본문의 `△ABC` 와 그림의 `A`·`B`·`C` 가 **같은 글꼴**로 보이는가(둘 다 정자체여야 한다). " +
      "④ 라벨이 도형에서 **너무 붙지** 않은가 — 거리를 원장님 확정으로 RPM 만큼 좁혔다" +
      "(1.05배 → **0.64배**, 정본 0.61배). 좁히면 글자가 선에 닿을까 걱정했는데 실측으로는 " +
      "겹침이 안 늘었다(5.0% → 4.9%). 그래도 **종이에서** 답답해 보이면 말씀해 주십시오. " +
      "⑤ 크기 등급이 바뀐 그림 여섯이 지면에서 갑자기 커지거나 작아 보이지 않는가.",
    lookFromSource: false,
    evidence: [
      "vendor/figure-engine/core/figure_scene.py (_outward_vector)",
      "src/lib/figure/mathjaxLabel.ts (toTex — 홑 대문자는 정자체)",
      "src/lib/figure/drawScale.ts · m1Geo3.ts · m2Pytha.ts (축척 상한 제거)",
      "scripts/qa/probe-middle-label-outward.ts --selftest (눈금 12건)",
      "scripts/qa/measure-rpm-label-placement.py (정본 실측) · label_placement.py",
      "docs/planning/tracks/reports/rpm-engine-gaps.md §②",
    ],
    scale:
      "초3~중3 그림 **296종**. 꼭짓점 이름표가 안쪽인 비율 22.7% → **13.7%**" +
      "(RPM 정본 9.3%). 남은 13.7% 은 대부분 각 크기·치수라 안쪽이 제자리다. " +
      "viewBox 폭 — 같음 124 · 넓어짐 144 · 좁아짐 28, **인쇄 크기 등급이 바뀐 그림 9장**" +
      " — 그중 다섯은 «너무 작던 그림이 제 크기가 된 것»이고(74~154 → 224~253), 넷은 라벨이 밀어낸 것이다. " +
      "**거리를 좁힌 뒤** 지면이 다시 조여져 등급이 **4장 더** 바뀌었다(작아지는 쪽) — " +
      "지면 글자로는 18.8~24.0px 이라 본문(12.5px) 위다.",
    status: "통과",
    verifiedOn: "2026-08-29",
    needs:
      "실물 출력 — **꼭짓점 이름이 많은 그림**(다각형·전개도·원과 현)이 반드시 들어가야 한다",
    changedOn: "2026-08-28",
  },
  {
    id: "figure-origin-quadrant",
    title:
      "좌표평면 `O` 가 **그래프를 비켜** 앉는다 (중1 정비례·중2 일차함수·중3 이차함수)",
    changed:
      "원점 이름표 `O` 의 자리가 바뀌었다. 종전에는 원점에서 **`(-7, +10)` 한 자리에 못 박혀** " +
      "있어서, 기울기가 양수인 직선처럼 왼아래를 지나는 그래프에서는 `O` 가 **그 선 위에 그대로** " +
      "앉았다(실측 `1-1|정비례와 반비례|09`: 직선이 글자 상자 안을 지난다). 이제 RPM 순서" +
      "(왼아래→오른아래→왼위→오른위)로 훑어 **선이 안 지나는 첫 자리**를 고른다. " +
      "자리는 여백에서 거꾸로 유도한다 — 좌표를 손으로 박으면 칸이 좁은 그림에서 첫 눈금 획을 스친다. " +
      "규칙은 RPM 1학기 3권 함수 단원 · 원점 라벨 291개를 재서 뽑았다(정본은 79.9% 가 빈 사분면).",
    look:
      "① `O` 가 **그래프 선 위에** 앉은 것이 없는가 — 기울기가 양수인 직선을 특히 보라. " +
      "② `O` 가 축이나 **눈금 획**에 닿지 않는가. " +
      "③ `O` 가 원점에서 **너무 멀어** 어느 점의 이름인지 헷갈리지 않는가(정본은 글자 크기의 0.79배, 우리는 0.77배). " +
      "④ 오른아래로 옮겨 간 그림에서 **x축 눈금 숫자**와 부딪히지 않는가.",
    lookFromSource: false,
    evidence: [
      "scripts/figure/elem_advanced.py (CP_O_CORNERS · _cp_o_offset · _seg_hits_box)",
      "scripts/qa/measure-rpm-function-labels.py (정본 실측) · scripts/qa/glyph_ink.py",
      "src/__tests__/unit/figureLinearGraph.test.ts (기울기 +/− 로 자리가 갈린다)",
    ],
    scale:
      "좌표평면을 그리는 그림 **21장**이 달라졌다. 꼭짓점 이름표가 선과 겹치는 비율 " +
      "1.4% → **0.6%**(RPM 정본 8.0%), `O` 가 선 위에 앉은 그림 2장 → **0장**.",
    status: "통과",
    verifiedOn: "2026-08-29",
    needs:
      "실물 출력 — **좌표평면 그림**(정비례 직선·반비례 곡선·이차함수 포물선)이 반드시 들어가야 한다",
    changedOn: "2026-08-28",
  },
  {
    id: "figure-dim-label-outside",
    title:
      "입체 그림의 **치수 라벨이 도형 위에 안 앉는다** (중1-2 겉넓이·부피)",
    changed:
      "치수 라벨(`7 cm`)의 자리가 바뀌었다. 종전에는 도형에서 띄우는 거리가 **9로 못 박혀** " +
      "있어서, 도형이 조금만 크면 라벨이 실루엣 **안쪽**에 떨어졌다 — 흰 halo 가 도형 모서리에 " +
      "구멍을 뚫고 숫자가 안 읽혔다(실측 `cutCuboid`: 치수 여섯 중 **넷**). 이제 거리를 정하지 않고 " +
      "**「비켰나」를 직접 물어** 비킬 때까지 밀고, 그래도 안 되면 라벨을 선분 **위에서** 옮긴다. " +
      "반지름처럼 그 선 자체가 치수선인 것은 옆으로 못 미므로 정본과 같이 지시선으로 빼낸다. " +
      "규칙은 RPM 중1-2 원본 지면 0849(잘라 낸 직육면체 — **우리와 같은 문제·같은 치수 여섯**)와 " +
      "0845(구멍 뚫린 원기둥)에서 왔다. 정본은 여섯 중 다섯을 실루엣 **바깥** 둘레에 둔다.",
    look:
      "① `4 cm`·`7 cm` 같은 치수가 **도형 모서리 위**에 앉아 흰 구멍을 뚫은 것이 없는가. " +
      "② 치수 점선이 도형을 가로질러 **무엇을 잰 것인지** 헷갈리는 것이 없는가 — 여기가 이번 수리에서 " +
      "제일 약한 자리다(도형이 정본보다 작아 호가 길다. 아래 «남은 것» 참조). " +
      "③ 구멍 뚫린 원기둥에서 두 반지름(`8 cm`·`5 cm`)이 서로 붙지 않는가. " +
      "④ 라벨이 그림 **프레임 밖**으로 잘려 나간 것이 없는가 — 밖으로 미는 수리라 이쪽이 새 위험이다. " +
      "(다만 149장 전량에서 **viewBox 가 한 장도 안 변했다** — 라벨이 이미 있던 여백 안에서만 움직였다. " +
      "그래서 인쇄 등급도 0장 바뀌었고, 종이에서 **그림 크기는 그대로**다.)",
    lookFromSource: false,
    evidence: [
      "scripts/figure/elem_advanced.py (_dim_place · _DimSpace · _dim_curve_segs · DIM_TS)",
      "scripts/qa/measure-dim-label-clear.py + scripts/qa/build-dim-corpus.ts (전량 자)",
      "src/__tests__/unit/figureDimLabel.test.ts (HEAD 엔진으로 갈아 끼우면 2/3 빨강)",
    ],
    scale:
      "입체를 그리는 그림이 달라졌다. 그림 149장 전량에서 치수 라벨이 도형 실선 위에 앉은 것이 " +
      "**16개(32.0%) → 6개(12.0%)**, 그중 4개는 화살표 치수를 쓰는 삽화라 **거짓 경보**(눈으로 확인). " +
      "치수가 아닌 라벨은 21개 그대로 — 회귀 없음. **바뀐 그림은 149장 중 4장뿐**이고, " +
      "그 넷이 곧 결함이 있던 넷이다(`입체도형의 겉넓이와 부피` 07·08). " +
      "🔴 **남은 것**: 도형 대각 ÷ 라벨 글자 크기가 정본 **13.0** 인데 우리는 **8.0** 이다(같은 문제로 실측). " +
      "도형이 작아 치수 점선이 길게 휘는 것은 자리 문제가 아니라 **크기** 문제라 원장님 확정이 필요하다(D-07).",
    status: "통과",
    verifiedOn: "2026-08-29",
    needs:
      "실물 출력 — **입체 그림**(잘라 낸 직육면체 · 구멍 뚫린 기둥 · 원기둥)이 반드시 들어가야 한다",
    changedOn: "2026-08-28",
  },
  {
    id: "figure-solid-scale-weight",
    title:
      "입체 그림의 **크기와 획 굵기**를 정본에 맞췄다 (원장님 확정 2026-08-28)",
    changed:
      "두 가지가 같이 바뀌었다. ① **굵기** — 도형 실선 1.15 → **1.4**, 치수 점선 1.4 → **0.6**. " +
      "정본 실측(RPM 중1-2 p126·p130)은 도형 윤곽선 0.8pt · 치수 파선 0.3~0.5pt 로 " +
      "**치수가 도형선의 ⅜~⅝** 인데, 우리는 치수가 **더 굵어**(비 1.22) 배경으로 안 물러났다. 이제 비 0.43. " +
      "② **크기** — 가장 긴 모서리를 56 → **84**(회전체 70 → **98**), 치수 라벨 12 → **10.5**, " +
      "여백은 라벨에 비례해 축소. 정본은 「도형(실선) 대각 ÷ 라벨 글자」가 **11.9** 인데 우리는 **7.1** 이었다. " +
      "종전에는 그 배율이 **세 곳에 손으로** 적혀 있어 한쪽만 고치면 같은 지면에 두 크기가 섞였다 — 이제 상수 하나다.",
    look:
      "① 치수 점선이 **배경으로 물러나** 도형선과 구분되는가 — 지금은 치수가 더 굵어 앞으로 튀어나왔다. " +
      "② 도형 실선 1.4 가 **너무 굵지 않은가**(잉크가 번지거나 작은 그림에서 면이 메워지지 않는가). " +
      "③ 치수 글자 10.5 가 종이에서 **읽히는가** — 본문(12.5px)보다 작다. 정본도 본문의 0.76배다. " +
      "④ 입체 그림이 **한 지면에 여럿** 있을 때 크기가 고르게 보이는가. " +
      "⑤ 전개도(`netCylinder`·`netCone`)와 입체가 **나란히** 있을 때 획 굵기가 같아 보이는가.",
    lookFromSource: false,
    evidence: [
      "scripts/figure/elem_advanced.py (SOLID_SW · SOLID_UNITS · ROUND_UNITS · DIM_FS · _dim_pads)",
      "vendor/figure-engine/core/figure_svg.py (DIM_SW — **벤더 사본**이라 상류 갱신 때 1.4 로 돌아오는지 보라)",
      "scripts/qa/build-dim-corpus.ts + scripts/qa/measure-dim-label-clear.py",
    ],
    scale:
      "그림 149장 중 **23장**이 달라졌다(굵기가 23장 · 그중 14장은 크기까지 — 겹친다). " +
      "「도형 대각 ÷ 라벨」이 10 미만인 그림 **13장 → 7장**이고, 남은 7장은 치수가 아니라 " +
      "꼭짓점 이름표(13.0) 계열이라 이 수리 밖이다. 치수 라벨 겹침은 6 → **5**(그중 4는 거짓 경보). " +
      "🔴 **인쇄 등급은 0장 바뀌었다** — `ROUND_UNITS` 를 100 으로 올리면 `elem-cylinder` 가 " +
      "폭 161.3 으로 160 을 넘어 등급이 compact(140px) → mid(240px) 로 뛰고 " +
      "**라벨이 본문보다 커진다**(15.2px). 그래서 회전체는 비 10.3~10.7 에서 멈춘다(정본 11.9).",
    status: "통과",
    verifiedOn: "2026-08-29",
    needs:
      "실물 출력 — **입체 그림과 전개도가 같은 장에** 들어가야 한다(굵기가 어긋나면 거기서 보인다)",
    changedOn: "2026-08-28",
  },
  {
    id: "round-solid-max-scale",
    title:
      "회전체를 **등급 안에서 최대로** 키웠다 (원기둥·원뿔·구·구멍 원기둥)",
    changed:
      "원장님 지시 2026-08-29 「회전체도 등급 안 넘게 최대로 키워봐」. " +
      "종전에는 `ROUND_UNITS = 98` 에서 멈춰 있었는데, **막고 있던 것은 배율이 아니라 «놀던 여백»** 이었다 — " +
      "`_fitted_cabinet` 이 도형 꼭짓점과 **고정 여백**만 보고 라벨을 안 보므로, 라벨이 안 서는 쪽 여백이 " +
      "통째로 비어 있었다(실측: 원기둥 오른쪽 22.8 · 구멍 원기둥 왼쪽 21.0 에 내용 0). " +
      "그 여백을 내용에 맞춰 줄이고 배율을 **98 → 112.7** 로 올렸다. " +
      "「도형 대각 ÷ 라벨」이 원기둥 10.65 → **12.25**, 구멍 원기둥 10.28 → **11.83** (정본 11.88). " +
      "🔴 **구는 그 확대에 혼자 안 따라왔다** — `_sphere` 만 `ROUND_UNITS` 를 안 쓰고 날 리터럴 " +
      "(`pr = 36` · 틀 140)이었다. 같은 반지름인데 종이에서 지름 **72px vs 원기둥 98.6px** 로 27% 작았다. " +
      "구도 상수를 쓰게 고쳐 원기둥과 **같은 «도형 ÷ 틀» 비율**(70.4%)로 맞췄다 — 지름 72 → **98.6px**. " +
      "구는 라벨이 없어 여백을 더 깎으면 더 키울 수 있지만, 그러면 이번엔 원기둥보다 커진다. " +
      "한 지면에 두 입체가 같이 나오므로 **집안의 상한(원기둥)** 에 맞췄다.",
    look:
      "① 원기둥·원뿔·구멍 원기둥이 **종이에서 커졌는데 치수 라벨이 잘리지 않았는가.** " +
      "라벨이 프레임 밖으로 나가거나 도형에 겹쳐 앉으면 불합격. 그림 자체가 차지하는 " +
      "네모(등급)는 **안 바뀌었으므로**, 같은 자리에서 도형만 커져 보여야 정상이다. " +
      "② **구와 원기둥이 한 시험지에 같이 나올 때 크기가 어울리는가** — 같은 반지름이면 " +
      "구의 지름과 원기둥의 밑면 지름이 **같아 보여야** 한다(전에는 구가 27% 작았다). " +
      "구가 든 문항은 초6 2-6-5·중1-2 구의 겉넓이와 부피 계열이다.",
    lookFromSource: false,
    evidence: [
      "scripts/figure/elem_advanced.py ROUND_UNITS · CYL_PADS · SPHERE_PAD_W",
      "src/__tests__/unit/figureWeightRatio.test.ts (경계 160 · 구↔원기둥 같은 크기, 변이 4개 전부 빨강)",
      "07-coding-convention.md D-112",
    ],
    scale:
      "🔴 **인쇄 등급이 바뀐 그림 0장 · 글자가 잘린 그림 0장** — 엔진이 실제로 내는 " +
      "회전체 스펙 **288종 전량**을 전·후로 그려 대조했다(적재기가 부르는 그 함수로 모았다). " +
      "원기둥은 폭 **정확히 160.0** 으로 compact 경계(≤160)에 붙어 **한 칸도 안 남았다.** " +
      "⚠️ 처음 대조는 **모집단이 얇았다** — 「종류마다 한 장」이라 회전체가 6장뿐이었다. " +
      "그리고 첫 판정기는 라벨 상자를 재는 정규식이 깨져 **하나도 못 읽고 있었다**(「잘림 0」이 " +
      "«깨끗»이 아니라 «못 셈»이었다). 고쳐서 라벨 상자 **186개**를 실제로 재고 다시 판정했다.",
    status: "통과",
    verifiedOn: "2026-09-05 (원장님 일괄 승인 — 종이 확인 없이 넘어감)",
    needs:
      "실물 출력 — **원기둥·원뿔·구가 든 문항**이 들어가야 한다(초6 2-6 · 중1-2 입체도형의 겉넓이와 부피 계열)",
    changedOn: "2026-08-29",
  },
  {
    id: "figure-svg-overflow-count",
    title: "🔴 **엔진 그림이 시험지에 나간다** + 자도 그 높이를 센다",
    changed:
      "적대적 점검 2026-08-29 에서 **둘이 같이** 나왔다. " +
      "🔴 **① 엔진 그림이 시험지에 한 장도 안 나가고 있었다.** 엔진 문항의 그림은 " +
      "`problem.figureSvg`(인라인 SVG) 한 컬럼에만 있는데(`figureUrls` 는 4,640건 전량 비었다), " +
      "지면 경로(`JaseupTemplate` → `ProblemBody` → `PaperProblemView`)가 그 값을 **안 넘겼고** " +
      "인쇄 페이지의 매핑도 그 컬럼을 **안 담았다.** 화면(문제은행·검수)은 `ProblemCard` 가 " +
      "넘겨서 보이는데 **종이에만 안 나갔다** — 「다음 그림에서…」라고 적힌 문항이 그림 없이 " +
      "인쇄됐다. 매핑을 `src/lib/print/toPrintProblem.ts` 로 빼서 시험이 「그림 컬럼이 다 갔는가」를 " +
      "묻게 했다(인라인 매핑은 시험할 자리가 없어서 빠진 줄도 몰랐다). " +
      "**② 지면 자도 같은 값을 못 보고 있었다.** `SeatProblem` 이 `figureUrls`·`figureDims`·`figureSourceMm` 만 담고 " +
      "**`figureSvg` 가 타입에 없었다.** 그래서 넘침 판정과 인쇄 분할(`packProblems`)이 엔진 그림을 " +
      "**0으로** 셌다. 실측(공유 DB): 출제 가능 문항 중 `figureSvg` 가 있는 **4,640건 전량**이 " +
      "`figureUrls` 가 비어 있고, 그 그림의 지면 세로는 **중앙값 151px · p90 240px · 최대 367px** — " +
      "문항 칸(484px)의 31%·50%·76% 다. 이만큼을 0으로 세고 두 문항을 한 칸에 짝지으면 뒤 문항이 " +
      "겹쳐 찍힌다. `estimateFigureSvgPx` 를 넣어 등급이 정한 **인쇄 폭(mm)** × viewBox 비율로 잰다. " +
      "`[그림]` 자국 숨김 조건도 지면과 같게 맞췄다(`figures.length > 0 || Boolean(figureSvg)`).",
    look:
      "① 🔴 **엔진 그림이 종이에 실제로 나오는가** — 이게 첫째다. 초등 전 학년과 중등 문항에 " +
      "그림이 붙어 나와야 한다(2026-08-29 이전에는 한 장도 안 나갔다). " +
      "② **그림이 든 문항이 다음 문항과 겹치지 않는가** — 자를 고친 목적이다. " +
      "겹침은 잘림이 아니라 **글자가 포개져** 나타난다. " +
      "③ 반대로 **한 장이 너무 헐거워지지 않았는가** — 자가 그림을 세기 시작했으므로 " +
      "한 장에 문항이 덜 들어가고 시험지가 길어질 수 있다. 빈 자리가 절반을 넘으면 알려 주십시오. " +
      "④ 초6 2-6(원기둥·원뿔·구)처럼 **그림이 큰 문항**을 꼭 넣어야 이 변경이 드러난다.",
    lookFromSource: false,
    evidence: [
      "src/lib/print/toPrintProblem.ts (지면이 받는 컬럼 목록 한 곳 · 변이 4개 전부 빨강)",
      "src/lib/printOverflow.ts `estimateFigureSvgPx` · `SeatProblem`",
      "src/__tests__/components/TestPrint.test.tsx (시험지에 SVG 가 실제로 그려진다 + 음성 대조군)",
      "src/lib/figure/figureSvgFrame.ts `FIGURE_SVG_PRINT_MM` (자와 지면이 같은 mm 를 본다)",
      "src/__tests__/unit/printOverflowFigureSvg.test.ts (변이 4개 전부 빨강)",
      "src/__tests__/unit/figureSvgFrame.test.ts (표 ↔ Tailwind 클래스 대조)",
    ],
    scale:
      "**그림이 새로 나오는 문항 4,640건**(출제 가능 + `figureSvg`) — 초등 전 학년과 중등 엔진 문항 전부다. " +
      "판정이 달라지는 문항도 같은 4,640건. " +
      "⚠️ 자를 고쳤으므로 **분할이 바뀐다** — 같은 문항 묶음이라도 장수가 늘 수 있다. " +
      "종전에는 그림을 0으로 세어 «들어간다»고 판정하던 자리가 이제 «혼자 쓴다»가 된다.",
    status: "통과",
    verifiedOn: "2026-09-05 (원장님 일괄 승인 — 종이 확인 없이 넘어감)",
    needs:
      "실물 출력 — **엔진 그림이 든 문항**(초등 전 학년 · 중등)이 여러 개 든 시험지 1건",
    changedOn: "2026-08-29",
  },
  {
    id: "figure-label-70pct",
    title: "중등 그림의 **라벨 크기를 70%** 로 줄였다 (원장님 확정 2026-08-29)",
    changed:
      "원장님이 RPM 정본과 우리 지면을 나란히 놓고 「라벨이 그림에 비해 상당히 여유로운데」라 " +
      "하셨고, 재 보니 **우리 라벨이 47% 컸다**. 도형 대각 ÷ 라벨 크기가 정본 **11.88** 인데 " +
      "우리는 8.072 였다(90% 8.742 · 80% 9.785 · **70% 11.182**). 실제 엔진으로 네 배율을 " +
      "그려 눈으로 고르셨다. 줄인 것: 점·각·치수 글자 24 → **16.8** · 라벨 띄움 11 → 7.7 · " +
      "각 라벨 거리 25 → 17.5 · 흰 테 4.5 → 3.15. **안 줄인 것**: 도형 선·치수 파선 굵기(선이다) · " +
      "각 표시 반지름 22(줄이면 직각기호가 변 안에 안 들어간다) · 치수 띄움 14(간격이지 글자가 아니다 — " +
      "9.8 로 줄였더니 `삼각비의 활용` 09·10 이 자리를 못 잡고 죽었다). " +
      "🔴 **초등·입체(elem-1)에는 안 걸린다** — `render_spec.py` 가 갈래를 가르고 그쪽은 " +
      "`StyleProfile` 을 안 쓴다. 그쪽 정본 비는 8.0 vs 13.0 인데 **방향이 반대**다(라벨이 이미 " +
      "본문 12.5px 보다 작은 것이 71종 중 35종, 최소 7.15px) — 줄이는 게 아니라 도형을 키워야 한다.",
    look:
      "① 점 이름(A·B·C)과 각도·치수 글자가 **종이에서 읽히는가** — 이번 변경의 유일한 위험이 " +
      "「작아서 안 읽힌다」다. 화면에서는 확대되니 종이로만 판정된다. " +
      "② 글자가 도형 선을 **덮어 구멍을 뚫지** 않는가(흰 테도 30% 줄었다). " +
      "③ 그림이 정본처럼 **글자보다 도형이 주인공**으로 보이는가 — 이것이 바꾼 목적이다. " +
      "④ 그림 크기 자체는 그대로여야 한다(자동 맞춤이 라벨과 같이 줄어 viewBox 도 줄었다).",
    lookFromSource: false,
    evidence: [
      "vendor/figure-engine/core/figure_scene.py `StyleProfile` (근거를 주석에 적었다)",
      "scripts/qa/measure-rpm-weight-ratio.py (정본 11.88 을 낸 자)",
      "scripts/qa/fixtures/figure-marks-compat-baseline.json (28종 중 27종이 바뀌었고 전부 닮음변환)",
      "src/__tests__/unit/figureWeightRatio.test.ts (굵기 비는 안 건드렸다 — 초록 유지)",
    ],
    scale:
      "**v2 로 그리는 중등 그림 전량**(실측 267장). 지면 글자 크기 실측: 100% 는 본문 12.5px 아래가 " +
      "3장·최소 8.85px, 70% 는 4장·**최소 9.61px** — 최악이 오히려 나아졌다(자동 맞춤이 viewBox 를 " +
      "같이 줄이기 때문). 초등·입체는 **0장** 바뀐다.",
    status: "통과",
    verifiedOn: "2026-09-05 (원장님 일괄 승인 — 종이 확인 없이 넘어감)",
    needs:
      "실물 출력 — **중등 도형 문항**(삼각형·사다리꼴·원)이 여러 개 든 시험지 1건",
    changedOn: "2026-08-29",
  },
  {
    id: "middle-length-dimension",
    title:
      "중등 길이를 **치수선**으로 바꿨다 — 떠 있던 맨 글자 26유형 (원장님 지적 2026-08-29)",
    changed:
      "원장님이 「길이 치수선은 왜 자꾸 빠지나?」라 하셨다. 실측하니 중2-2 의 **26유형**이 " +
      "치수선 없이 유령 점(`n1`·`n_ab`·`t_a`)을 만들어 날 글자 「9 cm」를 변 옆에 얹고 있었다 — " +
      "지면에서 「선에서 떨어진 맨 길이 표기」가 되고, 원장님이 2026-08-13 에 물린 바로 그 모양이다. " +
      "규칙(`figureDims.ts`)도 연장(`withDims`)도 이미 있었는데 **가드가 없어** 새 빌더가 계속 " +
      "옛 수법으로 태어났다. 전부 `dimensions` 로 옮기고, 등록 전량을 훑는 시험을 세웠다. " +
      "🔴 좁아서 치수를 못 놓으면 **그 치수만 빠지고 그림은 나온다**(원장님 규칙 ⑵) — " +
      "빠진 28자리를 전량 확인하니 23은 발문이 그 값을 말하고 5는 발문이 변 이름을 직접 부른다" +
      "(「$\\overline{AE}$의 길이를 구하시오」). **잃는 값은 0이다.**",
    look:
      "① 길이가 **점선 치수선과 함께** 나오는가 — 선 없이 숫자만 떠 있으면 불합격이다. " +
      "② 🔴 **치수 점선이 도형을 감싸듯 크게 휘어 「무엇을 잰 선인지」 헷갈리는 것이 없는가.** " +
      "여기가 이번 변경에서 제일 약한 자리다 — 엔진은 충돌 없는 **가장 작은** 벌어짐을 고르지만, " +
      "작은 자리가 다 막히면 최대 60px 까지 밀려난다(실측: 치수 234개 중 벗어남 중앙값 19.5px · " +
      "p90 45.3px · **45px 넘는 것 25개(10.7%)**). 자리 문제가 아니라 **도형 크기** 문제라 " +
      "원장님 확정이 필요하다(D-07). 종이에서 거슬리면 알려 주십시오. " +
      "③ 같은 변에 치수선과 tick(같음 표시)이 **겹쳐** 보이지 않는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/middle/m2GeoSim.ts · m2GeoTri.ts · m2GeoQuad.ts (`withDims` 로 옮긴 자리)",
      "src/lib/middle/figureDims.ts (규칙 한 곳 — `withDims` 는 끝점이 없으면 던진다)",
      "src/__tests__/unit/middleFloatingLength.test.ts (등록 전량 · 양성/음성 대조 · 변이 빨강 확인)",
      "src/lib/figure/renderFigureSpec.ts (못 놓는 치수만 빼고 `droppedDimensions` 로 알린다)",
    ],
    scale:
      "**중2-2 26유형 · 떠 있던 글자 64자리**. 전후 실측(같은 씨앗 460장): 떠 있는 글자가 남은 그림 " +
      "**91 → 0**, 못 그린 그림 0 → 0, 치수가 빠진 그림 5 → 28(전량 발문이 값을 말한다). " +
      "지면 등급이 뒤집힌 것은 **460장 중 2장**(compact 140px → mid 240px, 둘 다 문턱 160 " +
      "바로 아래에 있던 것이 치수가 붙으며 넘어갔다 — 내용이 늘었으니 커지는 방향).",
    status: "통과",
    verifiedOn: "2026-09-05 (원장님 일괄 승인 — 종이 확인 없이 넘어감)",
    needs:
      "실물 출력 — **중2-2 도형 문항**(삼각형의 성질 · 여러 가지 사각형 · 도형의 닮음 · " +
      "평행선 사이의 선분의 길이의 비)이 여러 개 든 시험지 1건",
    changedOn: "2026-08-29",
  },
  {
    id: "middle-dimension-outside",
    title:
      "치수선이 도형 **밖**으로 나간다 — 쪽을 고르는 축이 없었다 (원장님 지적 2026-08-30)",
    changed:
      "원장님이 지면에서 「치수선이 도형 안쪽으로 되어 있는(어색한 위치)」를 짚으셨다 — " +
      "등변사다리꼴의 `9 cm` 가 도형 **안쪽**으로 크게 휘어 있었다. 뿌리가 **둘**이다. " +
      "⑴ 「안쪽인가」를 세는 축이 **아예 없었다.** 대리로 쓰던 `side_crowding` 은 창이 " +
      "`along ∈ [-15%, 115%]` 라, 아랫변이 윗변보다 긴 사다리꼴에서 B·C 가 **둘 다 창 밖**으로 " +
      "나가 붐빔이 0이 된다. 그러면 두 쪽 점수가 **완전히 같아져** `side_rank` 가 갈랐고, " +
      '목록이 `["left","right"]` 라 **늘 left** 였다 — 동전 던지기였다. ' +
      "⑵ 「이 치수의 두 끝이 같은 선분 위」(자기 현) 문턱이 `chord_scale * 1e-7` 이라 " +
      "**좌표 반올림**을 못 견뎠다. 스펙 좌표는 소수 둘째 자리라 「AB 를 1:3 으로 나누는 D」가 " +
      "AB 에서 0.0013px 어긋나 있고 그건 문턱의 **75배**다. 그래서 바깥으로 나가는 곡선이 " +
      "**제 현과 교차한다**고 세어져 바깥이 통째로 막혔다.",
    look:
      "① 길이 치수 점선이 **도형 바깥**을 지나는가 — 도형 선들 사이로 파고들면 불합격이다. " +
      "🔴 다만 **도형 한가운데를 지나는 선분**(접힌 종이의 대각선 · 평행선 사이의 토막)은 " +
      "바깥이 아예 없어 안쪽으로 그린다. 그건 결함이 아니다. " +
      "② 치수 **값 글자**가 각 표시(호)와 겹치지 않는가 — 원장님이 「삼각형의 성질 12」에서 " +
      "짚으셨다. 못 비키면 그 치수만 빠지고 발문이 값을 준다(새로 빠진 8자리 전량 확인). " +
      "③ 각 값(`60°`)이 **도형 안에 들어갈 수 있는데 밖으로 끌려 나가** 있지 않은가. " +
      "④ 같은 변에 치수선과 tick(같음 표시)이 겹쳐 보이지 않는가.",
    lookFromSource: false,
    evidence: [
      "vendor/figure-engine/core/figure_scene.py (`_shape_hull` · `inside_shape` · `chord_tolerance`" +
        " · `arm_taken` · 각 표시를 치수 잉크로)",
      "src/__tests__/unit/figureAngleLabelPlacement.test.ts (각 라벨 자리 · 변이 3개 빨강)",
      "scripts/qa/figureDimSide.ts (판정 자 — 나온 SVG 만 본다, 엔진 안을 안 본다)",
      "src/__tests__/unit/figureDimOutside.test.ts (양성 대조 + 원장님 두 자리 + 떨어짐 0)",
      "scripts/qa/measure-chord-gap.ts (문턱을 손으로 안 고르고 **분포에서** 골랐다)",
    ],
    scale:
      "전후 실측(같은 자 · v2 그림 812장 · 씨앗 2 × 변형 2): 치수 곡선 465 → **477**(+12), " +
      "떨어진 치수 33 → **21**(−12), 안쪽을 지나는 치수 91 → 75, 그중 " +
      "**「바깥이 있었는데 안으로 간 것」 16 → 0**. 남은 75는 전부 바깥이 없는 자리다. " +
      "🔴 그 「0」은 **상한이 아니라 하한**이다 — 자가 도형을 **볼록 껍질**로 보므로 실제보다 " +
      "넓고, 원장님이 그 한계를 바로 짚으셨다(`평행선|02` 의 AB: 삼각형 밖인데 D 가 왼쪽 위에 " +
      "있어 껍질 안으로 잡힌다). 그 자리는 **아직 안 고쳤다.**",
    status: "통과",
    verifiedOn: "2026-09-05 (원장님 일괄 승인 — 종이 확인 없이 넘어감)",
    needs:
      "실물 출력 — **중2-2 사다리꼴·삼각형 문항**(여러 가지 사각형 · 평행선 사이의 선분의 길이의 비)" +
      "이 여러 개 든 시험지 1건",
    changedOn: "2026-08-30",
  },
  {
    id: "middle-midseg-figure-aspect",
    title:
      "그림 높이를 밑변과 **따로** 뽑아 표시가 붙은 선분이 렌더러 최소 길이 아래로 내려갔다",
    changed:
      "「삼각형의 두 변의 중점을 연결한 선분의 성질의 응용⑵」(`2-2|삼각형의 무게중심|04`)이 " +
      "그림용 높이 `h` 를 밑변 `a` 와 **무관하게** 뽑고 있었다(`h = intBetween(rng, 60, 100)`, " +
      "`w = a/2` 이므로 `w ∈ [8,30]`). `fitPts` 는 220×190 상자에 **가로세로 비를 지켜** 맞추므로 " +
      "`h > 1.674w` 이면 배율이 **세로에 묶이고**, 그때 평행 표시가 붙은 $\\overline{PQ}$" +
      "(=$w/2$ 단위)가 **9.33px** 까지 내려가 렌더러가 스펙을 통째로 거부한다 " +
      "(`segment 'PQ' is too short for its tick/parallel marks`). " +
      "🔴 그러면 그 문항은 **그림 없이** 지면에 나가는데 발문이 「그림과 같이 $\\triangle ABC$에서…」라 " +
      "**종이에서 못 푼다.** 이제 `h` 를 밑변에 비례시킨다(`h ∈ [1.0w, 1.6w]`) — 배율이 늘 가로에 " +
      "묶여 $\\overline{PQ}$ 가 **46px 로 고정**된다. " +
      "뽑는 횟수·차례가 그대로라 **발문·정답·해설·facts 는 한 글자도 안 바뀐다**(1200판 대조).",
    look:
      "① 이 유형의 그림이 **아예 있는가** — 발문이 「그림과 같이」라고 하는데 그림이 없으면 불합격이다. " +
      "② 삼각형 안에 $\\overline{MN}$·$\\overline{PQ}$ 두 가로선이 있고, 둘 다 **평행 표시(≫)가 " +
      "보이는가** — $\\overline{PQ}$ 가 너무 짧아 표시가 뭉개지면 불합격이다. " +
      "③ 삼각형이 **바늘처럼 길쭉하지 않은가**(밑변 대 높이가 대략 2:1~1.25:1 사이여야 한다). " +
      "④ 꼭짓점 이름 $A$·$B$·$C$·$M$·$N$·$P$·$Q$ 일곱이 서로 겹치지 않는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/middle/m2Center.ts (`MINOR_CENTROID` 유형 `04` — `h` 를 `w` 에 비례시켰다)",
      "scripts/qa/probe-middle-figure-renderable.ts (등록 전량을 **실제로 렌더**하는 새 축 — " +
        "관문의 판정기 쓸기가 이 결함을 잡았다)",
      "src/lib/engine/figurelessRow.ts + src/__tests__/unit/figurelessRow.test.ts " +
        "(그림이 없는데 발문이 가리키면 출제에서 뺀다 — 변이 4/4 빨강)",
      "docs/planning/tracks/reports/lock-figureless-engine-load-확대갈래-5차물결-3차착지-22유형.json " +
        "(잠갔던 4행의 되돌리기 원장)",
    ],
    scale:
      "적재본 **4행**(`s20260905` 의 `v0`·`v7` × 단답형·객관식)이 그림 없이 들어가 " +
      "`directUseAllowed=false` 로 잠겨 있었다. 엔진 쪽은 실측 1200판(씨앗 400 × 변형 3) 전량에서 " +
      "$\\overline{PQ}$ 가 46.00px 로 **고정**되고 서로 다른 스펙 43종이 전부 그려진다. " +
      "🔴 이 유형 하나만 고쳤다 — 「그림용 치수를 문항 치수와 따로 뽑는」 같은 모양이 다른 유형에도 " +
      "있는지는 **아직 안 셌다.** 새 판정기가 렌더 실패는 잡지만 «길쭉함» 자체는 안 잰다.",
    status: "통과",
    verifiedOn: "2026-09-05 (원장님 일괄 승인 — 종이 확인 없이 넘어감)",
    needs:
      "실물 출력 — **중2-2 「삼각형의 두 변의 중점을 연결한 선분」** 문항이 든 시험지 1건 " +
      "(그림이 붙은 판으로 뽑아야 한다)",
    changedOn: "2026-09-04",
  },
  {
    id: "exam-2col-h2",
    title: "기출 2단 시험지 — H2 금색 톤 띠 (새 지면)",
    changed:
      "기출 시험지 전용 **2단 지면**을 새로 만들었다(D-07 절차: Wire 5안 → **C 머리띠형**, " +
      "Hi-fi 4안 → **H2 금색 톤 띠**, 원장님 확정 2026-09-05). 자습 지면과 다른 점: " +
      "한 장에 **2단** · 문항마다 금색 6% 바탕 머리띠(번호·유형·배점) · 좌측 3px 금색 바 · " +
      "정답란 없음 · 서술형은 소문항마다 답란. 쪽 나눔은 손으로 적지 않고 " +
      "`packExamPaper` 가 **잰 높이**로 정한다.",
    look:
      "㉠ **문항이 겹쳐 찍힌 곳이 없는가** — 단 아래쪽에서 두 문항의 글자가 포개지면 불합격. " +
      "㉡ **번호가 빠진 문항이 없는가** — 문 1~19 가 다 있어야 한다(단을 CSS 에 맡기면 " +
      "브라우저가 셋째 단을 만들어 문항이 조용히 사라지는데, 그 자리를 막았다). " +
      "㉢ 머리띠의 금색 바탕이 **너무 진하거나 흐리지 않은가**(화면 6%는 프린터에서 달라진다). " +
      "㉣ 가운데 세로 구분선이 **두 단을 제대로 가르는가**. " +
      "㉤ **서술형 문항에 답란이 없는 것이 맞는가** — 원장님 확정대로 답안지를 따로 쓰신다면 맞다. " +
      "종이로 보시고 「문제지에도 조금은 있어야겠다」 싶으면 말씀해 주시면 된다.",
    lookFromSource: false,
    evidence: [
      "src/components/print/templates/PastPaperTemplate.tsx (지면)",
      "src/components/print/PastPaper.module.css (H2 · 단 배치)",
      "src/lib/print/packColumns.ts (단 나눔 — 변이 9/9 빨강)",
      "src/lib/print/examRuler.ts (자 — 실측 채점 18/19 · 평균 |오차| 5.8px)",
      "src/lib/printGeometry.ts EXAM_MEASURED_PX (지면 실측)",
      "scripts/qa/measure-exam-paper-units.tsx · scripts/qa/eval-exam-ruler.ts",
    ],
    scale:
      "정화중 25-2-중간 **19문항 → A4 5장**(단 채움 37~97%). 넘치는 문항 0건. " +
      "⚠️ 답란을 뺐는데도 **쪽수는 그대로 5장**이다 — 문항이 낮아져도 단 경계가 그 자리에 " +
      "그대로 걸린다(전체 7,212px + 여유 456px 은 4장의 단 7,870px 에 «거의» 들어가지만 못 들어간다). " +
      "🔴 자의 성적은 **이 한 편(19문항)에서만** 잰 것이다 — 기출이 더 들어오면 " +
      "다시 채점하고 `EXAM_SAFETY_PX`(지금 24px)를 갱신해야 한다.",
    status: "통과",
    verifiedOn: "2026-09-05 (원장님 일괄 승인 — 종이 확인 없이 넘어감)",
    needs:
      "실물 출력 — `/dev/exam-print` 를 그대로 인쇄. " +
      "⚠️ **서술형 답안지는 아직 없다** — 이 검수는 문제지만 본다.",
    changedOn: "2026-09-05",
  },
  {
    id: "exam-headerless-box",
    title: "머리 없는 테두리 상자 — 원문에 없는 〈상자〉를 안 찍는다",
    changed:
      "기출 문3 이 지면에 **원본에 없던 〈상자〉**를 라벨로 달고 나갔다(원장님이 화면에서 " +
      "찾으셨다). 원본은 테두리만 있고 머리 라벨이 없다. 원장님 확정: " +
      "*「원문에 〈보기〉〈조건〉 없으면 붙이지 말 것」*(D-119 ⑹ 을 뒤집는다). " +
      "본문에는 `boxBlock` 이 아는 마커 `<상자>` 를 그대로 두고, **머리를 안 그리는 일은 " +
      "렌더러**(`MarkdownRenderer.HEADERLESS_LABELS`)가 한다. " +
      "🔴 처음엔 적재기가 `<나열>` 을 넣게 고쳤는데 `나열` 은 **입력 마커가 아니라** " +
      "`renderBoxSegment` 가 내부에서 만드는 표기라, 상자가 아예 안 서고 **날 글자로 " +
      "지면에 찍혔다.** `tsc`·lint·관문·적재 검증이 **전부 초록**이었고 지면을 그려 봐서야 " +
      "알았다 — 같은 사고가 이 저장소에서 **두 번째**다(`d07-box-label` 의 `<나열1>`).",
    look:
      "① 상자에 **테두리는 있고 머리 라벨은 없는가** — 〈상자〉·〈나열〉이라는 낱말이 " +
      "종이에 찍히면 **불합격**이다. ② `<상자>`·`<나열>` 이 **날 글자 그대로** 남아 있으면 " +
      "역시 불합격(상자가 아예 안 선 것이다). ③ 원본이 〈보기〉·〈조건〉이라 부른 상자는 " +
      "그 이름이 **그대로** 가운데에 찍혀야 한다(D-108) — 그것까지 사라지면 반대쪽으로 " +
      "지나친 것이다.",
    lookFromSource: false,
    evidence: [
      "src/components/math/MarkdownRenderer.tsx (HEADERLESS_LABELS)",
      "src/__tests__/unit/boxRender.test.tsx (「<상자> 는 서고 <나열> 은 안 선다」 두 짝)",
      "scripts/import/exam-paper/build-exam-drafts.ts (restoreBoxMarker — PDF 가 부른 이름을 그대로)",
      "07-coding-convention.md D-119 ⑹ (뒤집힘)",
    ],
    scale:
      "기출 문3 **1문항**(정화중 25-2-중간). 본문에 `<상자>` 가 든 행 전체가 함께 나아진다 — " +
      "격리된 기출 3,573건이 풀에 들어오면 그때 규모가 커진다.",
    status: "통과",
    verifiedOn: "2026-09-08",
    needs:
      "⚠️ **①② 만 종이로 봤다.** `/dev/exam-print` 를 그대로 인쇄한다(기출 문3 `J30502-A07-022` 가 3번 자리에 " +
      "있다 — 2026-09-08 실측: 상자 카드 1 · 머리 라벨 0 · 날 마커 없음, 테두리 " +
      "1px solid #8A8A88). ⚠️ 화면에서는 이미 확인했다 — 남은 것은 종이다. " +
      "🔴 **③ 은 아직 안 봤다 — 「통과」를 「셋 다 봤다」로 읽지 말 것.** 이 시험지에는 " +
      "〈보기〉·〈조건〉 라벨이 붙은 상자가 한 건도 없어서(`d07-box-label` 이 막힌 것과 " +
      "같은 이유) 「라벨이 반대쪽으로 지워지지 않았나」는 이 종이로 판정할 수 없다. " +
      "라벨 붙은 문항이 풀에 들어오면 그때 `d07-box-label` 과 **함께** 본다. " +
      '🔴 첫 확인 때 셀렉터를 `[class*="box"]` 로 짚어 「상자 0개」가 나왔다 — ' +
      "상자 클래스에 box 라는 글자가 없어서 **구조적으로 0**이었다. 0 은 «없다»가 " +
      "아니라 «못 센다»일 수 있다. 셀 자리는 `[data-box-card]`·`[data-box-header]` 다.",
    changedOn: "2026-09-06",
  },
  {
    id: "solution-line-split",
    title: "해설이 **여러 줄로** 나간다 — 그리고 자가 그 줄을 센다",
    changed:
      "원장님 지적 2026-09-06(*「전체적으로 우리 서술형 해설은 다 한 줄로 되어 있음. " +
      "10만 문제가 다 그럴 듯」*). `solutionForDisplay`(2026-08-21 작성)가 **검수 화면 " +
      "하나에만** 걸려 있던 것을 문제은행·인쇄 정답지·검수 콘솔·시험 검수 **넷 전부**에 " +
      "걸었다. 해설이 문장 끝·소문항 표지(⑴⑵·∴·따라서)·인접 수식 경계에서 줄로 갈린다. " +
      "실측 공유 DB 100,828행 중 **67,280행(66.7%)** 이 지면에서 두 줄 이상이 된다. " +
      "🔴 **그런데 자(`estimateSolutionPx`)는 그날부터 원문을 재고 있었다** — 지면은 " +
      "갈라 그리는데 자는 한 줄로 봐서 **16,168행을 낮게**(평균 22px · 최대 125px) 쟀다. " +
      "해설 과소는 「조금 잘림」이 아니라 **해설 한 건이 통째로 사라짐**이다. 자가 지면과 " +
      "같은 글을 보게 고쳤고, Chromium 실측 채점에서 재현율 **44.4% → 55.6%**(헛것 0 유지), " +
      "덜 센 양 중앙 188px → 152px 로 나아졌다.",
    look:
      "① 해설이 **문장마다 줄이 바뀌어** 나오는가(한 문단으로 뭉쳐 있으면 그 화면은 " +
      "배선이 빠진 것이다). ② 갈린 만큼 세로가 길어졌는데 **해설이 지면 밖으로 사라진 " +
      "문항이 없는가** — 정답지는 2단 `overflow:hidden` 이라 넘친 해설은 잘리는 게 아니라 " +
      "**통째로 없어진다.** 문항 번호가 이어지는지 세어 볼 것. " +
      "③ 줄이 갈린 자리가 어색하지 않은가(수식 한가운데가 아니라 문장 끝인가).",
    lookFromSource: false,
    evidence: [
      "src/lib/solutionSteps.ts (splitSolutionSteps · solutionForDisplay)",
      "src/lib/printOverflow.ts (estimateSolutionPx — 자도 같은 글을 본다)",
      "src/__tests__/unit/solutionWiring.test.ts (배선 + 자, 탐침까지 모집단)",
      "scripts/qa/eval-answerkey-rules.ts (실측 채점 44.4% → 55.6%)",
    ],
    scale:
      "해설 100,828행 중 지면에서 **두 줄 이상이 되는 67,280행(66.7%)**. " +
      "자가 달라진 행 16,169(16.0%). " +
      "🔵 **혼자 한 단(964.8px)을 넘는 해설은 옛 자·새 자 어느 쪽으로도 0건**이다 — " +
      "사라짐은 한 쪽(8건)에 큰 것이 몰렸을 때만 난다. 반 단(482px)을 넘는 해설은 " +
      "377 → **489건**으로, 그것이 한 쪽에 둘 이상 겹치는 조합이 위험한 자리다.",
    status: "통과",
    verifiedOn: "2026-09-08",
    needs:
      "해설이 든 문항으로 뽑은 **정답지**. 해설이 긴 문항(중등 서술형)을 일부러 넣을 것 — " +
      "짧은 해설만 뽑히면 갈릴 자리가 없어 이 항목이 드러나지 않는다. " +
      "✅ 2026-09-08 에 `/dev/print-paper` 로 뽑아 봤다 — 이 항목 자리가 **○ 4/4**" +
      "(`splitSolutionSteps` 로 실제 3조각 이상인 문항만 골라 넣는다). " +
      "정답지에서 줄이 갈려 나오고 **사라진 문항이 없다.**",
    changedOn: "2026-09-06",
  },
  {
    id: "serif-selfhost",
    title:
      "**시험지 명조를 자체 적재했다** — 기계마다 다른 글꼴로 나가던 것을 없앤다 (UI-09 후속)",
    changed:
      "`PAPER_FONTS.serifKR` 맨 앞에 자체 적재분(`var(--font-noto-serif-kr)`)을 넣었다. " +
      "`src/app/fonts.ts` 가 `next/font/local` 로 싣고 루트 레이아웃이 얹는다. " +
      "파일은 `public/fonts/NotoSerifKR-subset.woff2` — 이 PC 에 깔린 " +
      "`NotoSerifKR-VF.ttf`(23.8MB)를 부분집합으로 자른 **1.77MB**(한글 음절 전체 + 라틴 + " +
      "문장부호 + 원문자 + 일부 기호, 가변 굵기 100–900). 지면이 700·800 을 실제로 쓰므로 " +
      "가변 그대로 싣는다. SIL OFL 1.1 이고 고지는 `public/fonts/NotoSerifKR-OFL.txt` 에 " +
      "**글꼴 자신의 name 테이블에서 뽑아** 두었다.",
    look:
      "본문 명조가 종전과 **똑같아 보이는가**(이 PC 에서는 달라지면 안 된다) · 굵은 자리" +
      "(문항 번호·「핵심 개념 정리」·학습일 값)가 가늘어지지 않았는가 · 원문자 ①②③④⑤ 와 " +
      "괄호·따옴표가 제 모양인가 · 줄바꿈과 쪽 나눔이 종전 출력과 같은가.",
    // 05 문서에서 옮겨 온 문장이 아니라 이 변경을 보고 쓴 것이다.
    lookFromSource: false,
    evidence: [
      "src/app/fonts.ts (notoSerifKR — 왜 실었는지·무엇을 잘랐는지)",
      "src/components/print/tokens.ts (PAPER_FONTS.serifKR 맨 앞)",
      "scripts/qa/measure-paper-font.tsx (CDP 로 «실제 쓰인 글꼴»을 묻는다)",
    ],
    scale:
      "🔵 **이 PC 에서는 한 픽셀도 안 바뀐다 — 재서 확인했다.** 실은 것이 이 PC 에 깔린 그 " +
      "파일을 자른 것이라 자형·너비가 같다: 본문 400 에서 **0.00px**, 굵게 800 에서 0.02px" +
      "(반올림). 지면 스택 폭 224.65625 = 자체적재만 = 시스템만. 곧 이 변경의 효과는 " +
      "**「없던 기계가 이 PC 와 같아진다」 하나뿐**이다. 그래서 이 검수는 «달라졌나»가 아니라 " +
      "**«안 달라졌나»**를 확인하는 것이다.",
    status: "통과",
    verifiedOn: "2026-09-08",
    needs:
      "종전 출력물과 **나란히 놓고** 볼 것. 같은 시험지를 고치기 전·후로 뽑아 두면 가장 좋다. " +
      "✅ 2026-09-08 에 이 PC 에서 뽑아 **안 달라진 것**을 확인했다(이 항목이 묻는 것이 " +
      "그것이다). 렌더러에 물어본 값도 같다 — 본문·문항 번호가 **Noto Serif KR**(자체 " +
      "적재분)로 그려지고, 학원명은 의도대로 sans(Pretendard)다. " +
      "⚠️ **아직 안 해 본 것: 명조가 안 깔린 다른 기계에서 한 장.** 이 변경이 실제로 " +
      "고친 것은 «그 기계»뿐이라, 거기서 이 PC 와 같게 나오는 것을 보기 전에는 " +
      "**효과를 종이로 확인한 것이 아니다.** 원장님 다른 컴퓨터로 인쇄하실 일이 " +
      "있을 때 한 장 뽑아 보시면 된다.",
    changedOn: "2026-09-08",
  },
  {
    id: "exam-table-crop",
    title:
      "기출 표를 **원본에서 오려** 그림으로 붙였다 — 70mm 상한에서 칸 글자가 읽히나",
    changed:
      "기출 둘째~넷째 편(동도중·강동중·경산여중 25-2-중간)에 표 문항이 **6개** 있다" +
      "(동도중 1·14 · 강동중 6·9·16·21). HWP 는 표를 한 줄에 한 칸씩 풀어 주고 우리 " +
      "렌더러는 표를 모른다(DB 에 표 0행). 원장님 원칙 「기출은 그림 완전 이전이 생명」대로 " +
      "원본 지면의 표 구역을 300dpi 로 **오려** 그림으로 붙이고, 발문의 풀린 칸 줄은 걷었다" +
      "(`figures/crop_tables.py`). 🔴 원본 표 폭은 **98.7~106.5mm** 인데 지면의 그림 상한이 " +
      "**70mm**(`print:max-w-[70mm]` · `figureWidthStyle`)라 표가 약 **0.66~0.71 배**로 줄어 나간다.",
    look:
      "① 표 안 글자(숫자·√·x)가 **읽히는가** — 줄어든 배율에서 칸 글자가 뭉개지면 불합격이다. " +
      "② 표가 **발문 뒤·보기 앞**에 서는가. ⚠️ **동도중 문1 은 원본과 순서가 다르다** — 원본은 " +
      "표가 〈보기〉 상자 **앞**인데, 우리 지면은 그림을 〈보기〉까지 포함한 발문 **전체 뒤**에 둔다" +
      "(`ProblemContent` — 발문 → 그림 → 보기). 그래서 표가 〈보기〉 뒤에 선다. " +
      "③ 표 테두리가 잘리지 않았는가(사방 3pt 여유를 뒀다).",
    lookFromSource: false,
    evidence: [
      "scripts/import/exam-paper/figures/crop_tables.py (맨 위 괘선 덩이만 — 〈보기〉 상자를 안 삼키게)",
      "scripts/import/exam-paper/build-exam-drafts.ts (stripTableCells — 적은 문항·안 적은 문항 양쪽 검사)",
      "src/components/math/ProblemContent.tsx (그림은 발문 뒤·보기 앞, 인쇄 상한 70mm)",
    ],
    scale:
      "63문항 중 표 문항 6. 통계 단원 기출이 들어올수록 늘어난다 — 대량 이관 전에 여기서 판정할 것.",
    status: "대기",
    needs:
      "`/dev/exam-print` 는 정화중 한 편만 그린다. 문제은행 검색창에 «동도중»·«강동중» 을 쳐서 " +
      "동도중 문1(표+〈보기〉)과 강동중 문16(√ 가 든 표)을 담아 시험지로 뽑는다.",
    changedOn: "2026-09-12",
  },
  {
    id: "hwpx-hancom-layout",
    title:
      "HWPX 를 한글에서 열 때 미리보기와 같게 — 수식 폭·보기 탭·줄 고정·쪽 위 여백",
    changed:
      "mathg-gen 이 먼저 고친 HWPX writer(144ac19·b289619)를 옮겼다. ① 수식 상자 폭을 " +
      "KaTeX 폭 대신 **한글이 잴 폭**(eqsize.py)으로 — 하네스 5쪽의 수식 15개가 전부 바뀌었고 " +
      "평균 0.916배로 좁아졌다. ② 넓은 간격(3열 보기 등)을 공백 개수 대신 **미리보기 위치의 탭**으로 " +
      "(공백 뭉치 12 → 탭 12). ③ 본문 한 줄을 한글에서도 한 줄로(줄 접기 끔) · 줄 높이를 미리보기 " +
      "줄 높이로 고정. ④ 구역 위 여백을 1쪽 머리 아래가 아니라 쪽의 내용 시작점으로. " +
      "이식 직후엔 템플릿 뿌리 div 의 흰 배경이 쪽 전체 rect(y=0)로 실려 모든 쪽 위 여백이 " +
      "8px(약 2mm)였다 — 같은 날 쪽 전체를 덮는 배경은 도형으로 싣지 않게 고쳐(hwpxLayout.ts) " +
      "하네스 5쪽이 **45.3 · 45.3 · 45.3 · 45.3 · 46.3px** 로 섰다. 자습(jaseup)의 옅은 누런 종이색 " +
      "(#FCFCF8)은 HWPX 에서 흰 종이가 된다.",
    look:
      "HWPX 를 한글 2022 에서 100% 로 열고 A4 100% 로 인쇄해 미리보기·PDF 와 견준다. " +
      "① 수식 바로 뒤 글자가 수식에 **겹치거나 틈이 벌지** 않는가. " +
      "② 5지선다 3열 줄에서 ③ 이 **혼자 다음 줄로** 내려가지 않는가. " +
      "③ 〈조건〉 상자 등 배경·테두리가 **자기 글 뒤에** 그대로 있는가(아래로 밀린 글이 없나). " +
      "④ 2쪽 첫 줄이 **쪽 중간**에서 시작하지 않는가 — 그리고 넘친 줄이 있다면 다음 쪽 " +
      "머리 높이(약 12mm)에서 시작하는가.",
    lookFromSource: false,
    evidence: [
      "scripts/hwpx/writer.py",
      "scripts/hwpx/eqsize.py",
      "src/__tests__/unit/hwpxHancomLayout.test.ts",
      "docs/planning/tracks/reports/hwpx-writer-port.md",
    ],
    status: "대기",
    needs:
      "문장 중간에 수식이 든 문항 · 보기가 3열로 서는 5지선다 · 배경이 있는 〈조건〉 상자 문항이 " +
      "든 2쪽 이상 학습지를 HWPX 로 내려받는다.",
    changedOn: "2026-09-18",
  },
  {
    id: "achievement-report-a4",
    title:
      "성취 리포트 학부모 A4 — 흑백 · «배경 그래픽» 꺼짐에서 **한 장**에 다 남나 (D-134 Hi-fi)",
    changed:
      "학부모에게 월 1회 드리는 **성취 리포트 A4 한 장**이 새로 생긴다(23 §7 Q2 · D-134 ⑻). 아직 시안 " +
      "단계라 Hi-fi 5안(`/dev/report-hifi`)만 있고 모양은 미확정이다. 크롬 인쇄 PDF(배경 꺼짐)로는 " +
      "5안 × 실데이터·다 찬 예시 10장과 가장 두꺼운 달(7월) 10장이 **전부 1쪽**이었다 — 그러나 그것은 " +
      "렌더러가 만든 PDF 이지 **종이가 아니다**(절대 규칙 6). 지면의 그래픽은 배경색이 아니라 " +
      "테두리와 SVG 채움으로 그렸다.",
    look:
      "① **한 장에 다 나오는가** — 둘째 장이 나오거나 맨 아래 한 줄(«이번 리포트에 담은 기록: …»)이 " +
      "잘리면 불합격. ② **흑백 프린터 · «배경 그래픽» 꺼짐**(크롬 기본값)에서 난이도 숫자판의 칸 선 · " +
      "칸 안 얇은 막대의 채움 · 회차 칸의 선이 **보이는가** — 사라지거나 막대가 빈 틀로만 보이면 불합격. " +
      "그리고 **실제 0(«0문제» + 빈 막대 바탕)과 평가 보류(막대 없음)가 갈려 읽히는가**. " +
      "③ 가장 작은 글자(9pt — 머리의 «오늘 수학», 근거 밑의 «…셉니다» 줄)가 읽히는가. " +
      "④ 소단원 이름이 «…»로 잘린 곳이 있으면 불합격. ①②③④ 는 브리프 §2 규칙 1·2 에서 왔다. " +
      "⑤ (제안) 금색 영역 이름이 흑백에서 너무 옅어 제목으로 안 읽히면 불합격.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/briefs/achievement-hifi.md",
      "src/app/dev/report-hifi/ParentSheet.tsx",
      "src/app/dev/report-hifi/ReportHifi.module.css",
      "scratch/shot-report-hifi.mjs",
    ],
    scale: "학생 한 명당 한 장 · 월 1회",
    status: "대기",
    blockedBy:
      "모양은 확정됐다(2026-09-18 리드·codex 합의 — H3 + 숫자판 칸 안 얇은 막대, 05 §8.13 · 23 §7.3). " +
      "트랙 3 이 학생 상세에서 들어가는 **진짜 리포트 화면 · 인쇄 경로**를 만든 뒤 종이로 본다. " +
      "지금 `/dev/report-hifi` 의 H3 는 칸 안 막대가 **없는** 시안이다.",
    needs:
      "실데이터 한 장(진도만 — 지면이 짧다)과 **다 찬 예시(ⓑ) 한 장**(시험 9회 · 결시 · 영상 · 숙제 · " +
      "긴 의견 — 한 장을 가장 꽉 채운다). 인쇄 대화상자에서 «배경 그래픽»을 **끈 채**(기본값) · 여백 없음 · " +
      "배율 100%.",
    changedOn: "2026-09-18",
  },
  {
    id: "elementary-mixed-fraction-test-print",
    title:
      "옛 시험지 인쇄(일일·확인테스트) — 초등 가분수가 대분수로, 중학 이상은 가분수 그대로 찍히나",
    changed:
      "원장님 2026-09-19 «항상 모든 화면이 일치하도록». 작업실·새 문제은행·학습지 인쇄는 초등이면 가분수를 " +
      "대분수로 보였는데, 반 → 시험지 인쇄(`/tests/{id}/print`)만 가분수였다. 이제 같은 함수(`fractionViewFor`)로 " +
      "**초등 문항의 본문·정답지·해설**이 대분수로 찍힌다(10/3 → 3⅓, 정수로 떨어지면 정수). 중학 이상은 그대로다. " +
      "바꾸지 않는 자리: 발문이나 해설이 «가분수·대분수·진분수»를 부르는 문항(바꾸기·가르기 문제), " +
      "등호 건너편과 같아지는 계산 단계(«1500/5=300» 이 «300=300» 이 되지 않게). " +
      "대분수는 분수보다 폭이 조금 넓어 넘침 판정도 같은 글로 다시 잰다.",
    look:
      "(제안) ① 초등 시험지에서 가분수가 **대분수로** 나오는가(정답지 «빠른 정답»·해설 포함). " +
      "② 중학 시험지의 가분수가 **그대로** 나오는가 — 대분수가 보이면 불합격. " +
      "③ «가분수를 대분수로 나타내시오»·«진분수와 가분수 중 무엇인지» 발문의 분수가 **원문 그대로**인가 — " +
      "발문에 정답이 찍히면 불합격. ④ 초6 «분수의 나눗셈» 해설 «대분수를 가분수로 고칩니다. 2⅝=21/8» 이 " +
      "«2⅝=2⅝» 로 나오면 불합격. ⑤ 대분수의 정수와 분수 사이가 **붙거나 너무 벌어져** 두 수로 읽히면 불합격. " +
      "⑥ 넓어진 식 때문에 문항이 **다음 쪽으로 밀리거나 잘리지** 않는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/print/toPrintProblem.ts",
      "src/app/(main)/tests/[id]/print/page.tsx",
      "src/components/unified/fractionDisplay.ts",
      "src/__tests__/unit/toPrintProblem.test.ts",
    ],
    scale: "초등 문항에 가분수가 든 시험지만 — 중학 이상은 0건",
    status: "대기",
    needs:
      "초등 반 일일테스트 한 장 — 초3 «분수»(가르기 발문)·초5 «분수의 덧셈과 뺄셈»·초6 «분수의 나눗셈»이 " +
      "섞인 범위로 뽑으면 ①③④ 가 한 번에 나온다. 비교용으로 중1 시험지 한 장(②).",
    changedOn: "2026-09-19",
  },
  {
    id: "figure-editor-text-background",
    title:
      "도형 편집기 글자 배경색 — 글자 뒤 채운 상자가 종이에 제자리·제 크기로 나오나",
    changed:
      "도형 편집기에서 글자 요소에 **배경색**을 줄 수 있다(원장님 2026-09-19 «글자 배경색도 추가할 수 있도록»). " +
      "원문 `<text>` 에는 `data-text-bg` 만 남고, 저장 이미지(학습지·PDF·HWPX 가 싣는 그림)에는 조판할 때 " +
      "글자 뒤에 채운 `<rect>` 가 들어간다. 상자는 조판한 라벨의 치수(`data-w`·`data-a`·`data-d`)에 " +
      "글자 크기의 15% 여백을 두르고, 조판하지 못하는 글자(한글 «일반 글자» 등)는 **어림**(한글 1em · " +
      "나머지 0.55em)으로 잰다. 배경색을 주지 않은 그림은 바뀌지 않는다.",
    look:
      "(제안) ① 상자가 글자를 **다 덮는가** — 글자 끝이 상자 밖으로 삐져나오거나, 한글 «일반 글자»의 " +
      "상자가 글자보다 눈에 띄게 짧거나 길면 불합격. ② 상자가 **글자를 가리지 않는가** — 상자가 글자 " +
      "위에 찍혀 글자가 안 보이면 불합격. ③ 흑백 프린터에서 **옅은 배경색**(노랑·연두)이 회색으로 " +
      "남는가, 사라지는가 — 사라져도 불합격은 아니지만 원장님께 여쭐 것(흰 바탕과 구분이 필요한 " +
      "쓰임이면 진한 색을 권해야 한다). ④ 상자가 그림의 선을 덮어 **선이 끊겨 보이면** 의도대로다 " +
      "(글자를 선 위에서 읽히게 하는 쓰임) — 다만 여백이 넓어 이웃 꼭짓점·점을 덮으면 불합격.",
    lookFromSource: false,
    evidence: [
      "src/components/unified/figure-editor/figureTextBackground.ts",
      "src/components/unified/figure-editor/figureTypeset.ts",
      "src/__tests__/unit/figureTextBackground.test.ts",
    ],
    scale: "배경색을 준 글자만 — 이 변경 전에 만든 그림은 0건",
    status: "대기",
    needs:
      "작업실 → 도형 편집에서 글자 셋에 배경색을 준다 — 수식 라벨(`$x$`) 하나 · 영문 «일반 글자» 하나 · " +
      "한글 «일반 글자»(예: «넓이») 하나, 옅은 노랑과 진한 파랑 둘 다. 선 위에 얹힌 글자를 하나 넣는다. " +
      "그 문항을 학습지에 담아 인쇄 · PDF · HWPX 로 한 장씩 뽑는다.",
    changedOn: "2026-09-19",
  },
  {
    id: "studio-figure-transparent-background",
    title:
      "작업실 AI 도형 재작도 그림 — 흰 바탕이 빠져 둘레 여백이 한 겹으로 (투명 바탕) · 각도 숫자는 정자",
    changed:
      "원장님 2026-09-19 «도형 생성 시 사각형이 왜 생기나». 도형 엔진 v2(기하 도형)는 캔버스 전체에 흰 바탕 " +
      "사각형을 깔았고, 도형 편집기가 그것을 1번 «사각형»으로 셌다. 이제 작업실 재작도는 **투명 바탕**으로 그리고, " +
      "이미 만든 그림은 도형 편집기에서 열어 «도형 적용»을 누르면 바탕이 빠진다(열지 않은 그림은 그대로다). " +
      "저장 이미지의 크기를 재는 단계(fitFigureViewport)가 이제 바탕이 아니라 **실제 선·글자**를 재어, 엔진 자체 " +
      "여백이 빠지고 바깥 여백 한 겹(10px 또는 4%)만 남는다. 실측(삼각형 ABC · 점 I·O·D·E): 이미지 " +
      "341.99×272.66 → 315.41×246.47(폭 −7.8% · 높이 −9.6%). 원본 폭(mm)을 아는 문항은 그 폭에 맞춰 찍으므로 " +
      "**선·글자가 약 1.08배 커지고**, 모르는 문항은 선·글자 크기는 같고 **둘레 여백만 약 7mm 줄어** 본문이 그림에 " +
      "가까워진다. 지면은 `<img>`(곱셈 혼합)로, HWPX 는 투명 PNG 로 나간다 — JPEG 로 바꾸는 경로는 없다. " +
      "엔진 기본값(흰 바탕)은 그대로라 DB 문항 그림은 바뀌지 않는다. " +
      "또 원장님 같은 날 «각도가 자꾸 기울어지는데» — 편집기 조판이 엔진 각도 라벨의 바깥 기울임 표시를 보고 " +
      "«60°»의 **숫자까지** 기울였다. 이제 각도 라벨은 문자 한 글자(x·θ)만 기울이고 숫자·°·단위는 정자로 조판한다 " +
      "(편집기 «기울임» 단추로 켠 것은 그대로). DB 문항 그림의 지면 조판(src/lib/figure)은 원래 정자라 바뀌지 않는다.",
    look:
      "① 그림 둘레 여백이 좁아져 라벨(A·B·C 등)이 그림 칸 **가장자리에 붙거나 잘리지** 않는가. " +
      "② 원본 폭을 아는 문항에서 그림이 커져 **줄이 밀리거나 쪽을 넘기지** 않는가. " +
      "③ HWPX 를 한글에서 열고 인쇄했을 때 그림 바탕이 **검게·회색으로** 보이지 않고 흰 종이 그대로인가(투명 PNG). " +
      "④ 자습 템플릿(옅은 종이색)에서 그림 자리에 **밝은 사각형이** 뜨지 않는가. " +
      "⑤ 각도 «60°»의 숫자가 **곧게** 서 있고, «x°» 는 x 만 기울어 있는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/dev-ai/figure-spec.ts",
      "src/components/unified/figure-editor/figureSvgEditing.ts",
      "src/__tests__/unit/figureEngineBackground.test.ts",
      "src/__tests__/unit/figureEngineAngleUpright.test.ts",
      "vendor/figure-engine/core/figure_scene.py:2906",
      "src/lib/export/hwpxLayout.ts:49",
      "src/components/unified/studioHelpers.ts:135",
    ],
    scale:
      "작업실에서 AI 로 다시 그린 v2 기하 도형(그래프·초등 도형은 원래 바탕이 없어 그대로)",
    status: "대기",
    needs:
      "작업실 AI 도형 재작도로 만든 기하 도형(삼각형·원 등)이 든 문항 둘 — 원본 폭(mm)을 아는 PDF 에서 가져온 것 " +
      "하나와 사진에서 가져온 것 하나, 그중 하나는 **각도 숫자(60° 등)가 적힌 것** — 을 학습지에 넣고 브라우저 인쇄와 " +
      "HWPX(한글) 로 같이 뽑는다. " +
      "옛 그림은 편집기에서 한 번 열어 «도형 적용»을 눌러야 바뀐다.",
    changedOn: "2026-09-19",
  },
  {
    id: "figure-editor-faces",
    title:
      "도형 편집기 면 만들기 — 채운 면 · 기울인 사각형 · 삼각형이 종이에 제자리 · 제 색으로 나오나",
    changed:
      "원장님 2026-09-19 «면을 쉽게 만들 수 있어야 색칠을 할 수가 있음» · «사각형 자체를 각을 기울여서 평행사변형» · " +
      "«삼각형도 추가해 주고» · «그룹화했을 때 내부에 색을 넣을 수 있는». 도형 편집기 도구 줄에 «채우기»(선이 두른 칸 안을 " +
      "누르면 면)·«다각형»(점을 찍어 면)·«삼각형», 사각형·삼각형의 **노란 조절점**(사각형 → 평행사변형, 삼각형 꼭짓점), " +
      "선을 여럿 고르면 오른쪽 칸 «안쪽 채우기». 면은 **선 뒤**에 선 없는 채운 `<path>`·`<polygon>`(fill-rule evenodd)으로 " +
      "저장 이미지에 그대로 들어간다 — 기본 옅은 회색 `#d9d9d9`(흑백 약 15% 망점). 원·호·곡선 경계는 촘촘히 편 꺾은선이라 " +
      "면 가장자리가 선 굵기 밑에 숨는다(시위 오차 0.05 미만). 직각 표시·각의 호(엔진이 가늘게 긋는 표시)는 경계가 아니라 " +
      "**그 밑까지** 채운다. 기울인 사각형은 `<polygon>` 으로 바뀐다. 면을 쓰지 않은 그림은 바뀌지 않는다.",
    look:
      "(제안) ① 채운 면이 선 **밖으로 삐져나오거나**, 선과 면 사이에 **흰 틈**이 보이면 불합격 — 특히 원·호 가장자리와 " +
      "선 끝이 조금 안 맞는 꼭짓점. ② 면이 선·글자·라벨을 **가리면** 불합격(면은 늘 선 뒤). ③ 직각 표시·각의 호 안쪽이 " +
      "**하얗게 비어** 있으면 불합격. ④ 흑백 프린터에서 기본 회색이 **보이는가** — 사라지거나 글자를 먹을 만큼 짙으면 " +
      "원장님께 여쭐 것. ⑤ 평행사변형·삼각형 꼭짓점이 **날카롭게** 맞물리는가(선이 겹쳐 두꺼워 보이면 불합격). " +
      "⑥ PDF·HWPX(한글)에서도 같은 색·같은 자리인가.",
    lookFromSource: false,
    evidence: [
      "src/components/unified/figure-editor/figureFaceEditing.ts",
      "src/components/unified/figure-editor/figureFaceSources.ts",
      "src/components/unified/figure-editor/figureFaceGeometry.ts",
      "src/components/unified/figure-editor/figureShapeAdjust.ts",
      "src/__tests__/unit/figureFaceEditing.test.ts",
      "src/__tests__/components/StudioFigureEditor.faces.test.tsx",
    ],
    scale: "면·기울인 사각형·삼각형을 쓴 그림만 — 이 변경 전에 만든 그림은 0건",
    status: "대기",
    needs:
      "작업실 → 도형 편집에서 한 그림에: 선분 셋 삼각형에 보조선 하나를 긋고 **한쪽 칸만** 채우기(기본 회색) · 원과 현의 " +
      "활꼴을 옅은 노랑으로 · 직각 표시가 있는 엔진 삼각형 **전체** 채우기 · 사각형 하나를 노란 점으로 기울이기 · 삼각형 " +
      "도구로 직각삼각형 하나 · 선분 넷 묶음에 «안쪽 채우기». 그 문항을 학습지에 담아 브라우저 인쇄 · PDF · HWPX 로 한 장씩.",
    changedOn: "2026-09-19",
  },
  {
    id: "elementary-mixed-fraction-per-problem",
    title:
      "초등 대분수 표시를 문항 단위로 — 한 문항의 문제지 본문과 정답지 해설이 같은 분수 모양으로 찍히나",
    changed:
      "원장님 2026-09-19 «항상 뷰는 통일이야». 대분수로 바꿀지를 글마다 정하던 것을 **문항 하나에 한 번** 정한다. " +
      "전에는 초6 «(가분수)÷(분수)» 문항이 문제지 본문 «3½ ÷ 2/3», 정답지 해설 «가분수는 그대로 두고 7/2×3/2» 로 " +
      "갈렸다. 이제 문항의 본문·정답·해설 가운데 하나라도 «가분수·대분수·진분수»를 부르면 그 문항 전체를 원문으로 " +
      "찍는다 — 그 문항의 문제지 본문이 «7/2 ÷ 2/3» 으로 돌아온다. 이름을 부르지 않는 초등 문항은 전처럼 대분수, " +
      "중학 이상은 그대로다. 학습지 인쇄(문제지·정답지)와 옛 시험지 인쇄(`/tests/{id}/print`)가 같은 결정을 쓴다.",
    look:
      "(제안) ① 초6 «분수의 나눗셈» «(가분수)÷(분수)» 문항의 문제지 본문이 **가분수**(7/2 ÷ 2/3)이고 정답지 " +
      "해설의 7/2×3/2 와 같은 수인가 — 본문에 3½ 가 보이면 불합격. ② 같은 지면의 다른 초등 문항(이름을 부르지 " +
      "않는 문항)은 여전히 **대분수**인가. ③ 가분수로 돌아온 본문이 넘침 없이 제자리에 서는가(대분수보다 폭이 좁다).",
    lookFromSource: false,
    evidence: [
      "src/components/unified/fractionDisplay.ts",
      "src/lib/print/toPrintProblem.ts",
      "src/components/unified/NativeProblem.tsx",
      "src/components/unified/print/AnswerPage.tsx",
      "src/__tests__/components/perProblemFractionView.test.tsx",
    ],
    scale:
      "초등 엔진 표본 1,380문항 중 3문항(초6 «(가분수)÷(분수)» 본문) — 나머지 초등·중학 이상은 0건",
    status: "대기",
    needs:
      "초6 «분수의 나눗셈» 단원의 «(가분수)÷(분수)» 문항 하나와, 대분수로 보이는 초5 문항 하나를 같은 시험지(또는 " +
      "학습지)에 넣고 문제지와 정답지(해설 포함)를 함께 뽑는다.",
    changedOn: "2026-09-19",
  },
  {
    id: "choice-number-layout-option",
    title:
      "보기 번호 배치 — 원장님이 고른 열 수대로 ①~⑤ 가 종이에 서나 (5행 · 3열 2행 · 2열 3행 · 자동)",
    changed:
      "원장님 2026-09-20 요청으로 시험지 설정에 «보기 번호 배치» 칸을 넣었다. 고를 값은 넷이고 **기본값은 «자동»** — " +
      "자동은 지금 동작 그대로라 지면이 한 글자도 안 바뀐다(마크다운 문항의 클래스 문자열·OCR 문항의 원본 배치 힌트 둘 다 " +
      "종전 그대로). 값을 고르면 그 시험지의 **모든 문항**이 그 열 수로 선다 — 마크다운 문항(`ProblemContent`)과 " +
      "OCR·오려낸 문항(`NativeProblem`)이 같은 규칙(`src/lib/math/choiceLayout.ts`)을 쓴다. " +
      "정하는 것은 **열 수 하나**이고 행 수는 보기 수를 따라간다(보기 넷 + «3열 2행» → ①②③/④). " +
      "넘침: «3열 2행»만, 3열 한 칸(표시폭 13)에 안 들어가는 **그 문항 하나**를 2열로, 2열(24)에도 안 들어가면 1열로 내린다. " +
      "«5행»·«2열 3행»은 보기가 길어 칸 안에서 접히더라도 고른 열 수를 지킨다.",
    look:
      "(제안) ① 설정에서 «3열 2행»을 고르고 뽑았을 때 보기가 짧은 문항이 종이에서 ①②③ / ④⑤ 로 서는가 — 한 칸 안에서 " +
      "두 줄로 접히면 불합격. ② 같은 시험지에 보기가 긴 문항을 넣고, 그 문항만 2열(또는 1열)로 내려가 있는가 — " +
      "다른 문항까지 같이 내려갔으면 불합격. ③ «5행»으로 뽑으면 모든 문항의 보기가 한 줄에 하나씩인가. " +
      "④ «자동»으로 뽑은 종이가 이 변경 **이전**에 뽑은 종이와 같은가(회귀 확인). " +
      "⑤ 3열의 칸 사이 간격(gap 2rem)이 종이에서 너무 벌어져 보이지 않는가 — 벌어져 보이면 간격을 다시 정해야 한다.",
    lookFromSource: false,
    evidence: [
      "src/lib/math/choiceLayout.ts",
      "src/components/math/ProblemContent.tsx",
      "src/components/unified/NativeProblem.tsx",
      "src/components/unified/print/templates/ProblemBody.tsx",
      "src/__tests__/unit/choiceLayout.test.ts",
      "src/__tests__/unit/choiceLayoutRender.test.tsx",
    ],
    scale:
      "«자동»(기본값)은 0문항 — 지면이 안 바뀐다. 값을 고르면 그 시험지의 보기 있는 문항 전부",
    status: "대기",
    needs:
      "보기가 짧은 객관식(①~⑤ 가 수식 한두 글자)과 보기가 긴 객관식(문장형)을 **한 시험지에** 넣고, 설정 값을 " +
      "«3열 2행»·«5행»·«자동» 으로 바꿔 세 번 뽑는다. OCR 로 읽어들인 문항이 하나 이상 섞여야 두 렌더러가 다 찍힌다.",
    changedOn: "2026-09-20",
  },
  {
    id: "studio-svg-figure-width",
    title:
      "작업실이 다시 그린 도형이 지면·HWPX 에서 제 크기로 나오나 — 치수 숫자가 본문 글자만큼 읽히나",
    changed:
      "원장님 2026-09-20 «검수 단계에서의 도형과 텍스트 크기 비례가, hwpx로 내보내기했을때의 도형과 텍스트 크기 " +
      "비례가 일치하지 않음». 작업실이 AI 로 다시 그린 SVG 도형은 `figureUrls` 의 data URL 로 실려 **스캔 그림 " +
      "자**(253dpi 환산 · 바닥 28mm)를 타고 있었다. 이등변삼각형 ABC(치수 5·3·4, viewBox 236.7) 실측으로 검수 " +
      "화면 236.6px 이던 것이 지면·HWPX 에서 **105.8px(28mm)** — 글자 대비 2.2배 작았고 치수 숫자가 16.8px → " +
      "7.5px 로 본문(13.5px)보다 작아졌다. 이제 엔진 SVG 자(`figureSvgFrame` 37/64/70/97mm)를 타 **64mm(241.9px)** " +
      "로 나간다. 같이 고친 것 둘: ① 등급 틀의 폭을 화면 px·인쇄 mm 두 벌로 적던 것을 **mm 하나**로 합쳤다 — " +
      "`wide` 등급이 화면·HWPX 360px 대 종이 70mm(264.6px)로 36% 갈려 있었다. ② `viewBox` 원점이 0 이 아닌 " +
      "그림(작업실 저장본이 그렇다)을 «못 읽음»으로 흘려 통째로 `wide` 로 떨어뜨리던 것을 읽게 했다.",
    look:
      "(제안) ① 작업실에서 도형을 다시 그린 문항을 인쇄하고, 도형 안 치수 숫자(5·3·4 같은 것)가 **본문 글자보다 " +
      "작지 않은가** — 작으면 불합격. ② 같은 문항을 HWPX 로 내보내 한글에서 열었을 때 도형 크기가 인쇄물과 같은가. " +
      "③ 초등 엔진 도형(수 카드·각·연산 흐름)이 예전과 같은 크기인가 — 37mm·64mm 등급은 각각 140px·240px 과 1% " +
      "안이라 눈에 띄면 불합격. ④ 아주 넓은 엔진 도형이 문항 열을 안 넘고 70mm 안에 서는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/figurePrintSize.ts (figureSvgFromUrl · figureSvgUrlPrintMm · parseFigureDimensions)",
      "src/lib/figure/figureSvgFrame.ts (FRAME 을 mm 한 단위로 · viewBox 원점)",
      "src/__tests__/unit/figureSvgDataUrlWidth.test.ts",
      "e2e/hwpx-figure-scale/scale.spec.ts (검수·화면·인쇄·HWPX 네 자리 실측)",
    ],
    scale:
      "작업실에서 SVG 로 다시 그린 도형 **전부**(그 경로는 전에 예외 없이 28mm~70mm 스캔 자를 탔다) · " +
      "화면 폭이 바뀌는 것은 엔진 인라인 SVG 중 `wide` 등급(360px → 264.6px)뿐이고 compact·mid·pair 는 1% 안이다.",
    status: "형태미확정",
    needs:
      "작업실에서 도형이 있는 문항을 하나 인식·재작도한 뒤 시험지에 넣어, 문제지를 인쇄하고 같은 시험지를 HWPX 로 " +
      "내보내 한글에서 함께 연다. 초등 엔진 문항(수 카드·각)도 같은 지면에 한 문항 넣어 예전 크기와 견준다.",
    blockedBy:
      "화면에서 `wide` 등급 엔진 도형이 360px → 264.6px(70mm)로 줄어든다 — 종이로 나가던 폭 그대로지만 **화면 " +
      "모양이 바뀌는 변경**이라 원장님 확인이 필요하다(절대 규칙 1). 작업실 도형이 64mm 로 커지는 쪽은 원장님이 " +
      "직접 지적하신 결함의 수정이다.",
    changedOn: "2026-09-20",
  },
  {
    id: "studio-typed-spaces",
    title: "작업실 편집기에서 여러 칸 띄운 자리가 지면에 그 폭 그대로 나오나",
    changed:
      "원장님 2026-09-21 «띄워쓰기를 해놓고 저장해보면 다시 띄워쓰기가 사라지네». 저장 원문은 멀쩡했고, 검수 카드·지면의 " +
      "HTML 접힘 · 지면 파서의 공백 정리(`collapseWhitespace`) · 편집기를 다시 열 때의 재파싱이 여러 칸을 한 칸으로 " +
      "줄였다. 이제 작업실 «내용 수정» 편집기에서 **친** 여러 칸은 고정 공백(U+00A0)으로 저장되어 검수 카드·지면에 그 " +
      "폭 그대로 선다. 보통 공백 여럿(엔진이 넣은 두 칸 1,827문항 · 옛 변환본)은 예전처럼 한 칸이다.",
    look:
      "(제안) ① 작업실에서 한 줄 가운데를 네 칸 띄워 저장한 문항을 인쇄해, 종이에서도 한 칸일 때보다 뚜렷이(약 네 배) " +
      "벌어지는가 — 한 칸으로 붙으면 불합격. ② 그 줄이 문항 칸 밖으로 넘치지 않는가. ③ 같은 시험지를 HWPX 로 내보내 " +
      "한글에서 열면 종이와 같은 폭으로 벌어지는가 — 트랙 46 이 수집기(`hwpxLayout.ts`)가 고정 공백을 접던 것을 고쳐 " +
      "그 자리를 미리보기 간격의 탭으로 옮긴다(항목 `hwpx-grid-order` 와 함께 본다).",
    lookFromSource: false,
    evidence: [
      "src/components/math/editor/visualDocument.ts (keepTypedSpaces)",
      "src/__tests__/unit/typedSpaces.test.ts",
      "src/__tests__/components/typedSpacesRender.test.tsx",
      "e2e/body-typeset/body-typeset.spec.ts (편집기·검수 카드·지면 간격 실측)",
    ],
    scale:
      "작업실 편집기에서 두 칸 이상 띄워 저장한 문항만 — 기존 문항은 0 (보통 공백은 지면에서 예전처럼 한 칸)",
    status: "대기",
    needs:
      "작업실에서 문항 하나를 «내용 수정»으로 열어 한 줄 가운데를 네 칸 띄워 저장하고, 그 문항을 시험지에 넣어 " +
      "인쇄한다. 같은 시험지를 HWPX 로도 내보내 견준다.",
    changedOn: "2026-09-21",
  },
  {
    id: "box-layout-columns",
    title:
      "〈보기〉 상자 안 항목·그림이 원본의 열 배치대로 서나 (문제 22 2열 2행)",
    changed:
      "원장님 2026-09-21 «그림이 이상하게 배열되고 있네. 문제 안에 여러 그림이 있을 경우 원본을 어기고». 〈보기〉 의 " +
      "열 수를 검수 카드·지면이 **한 규칙**(`layoutQuotedBoxes`)으로 정한다: ① 머리에 적힌 `<보기:cols=N>` ② 칸마다 " +
      "그림이 하나인 상자는 원본 그림 자리(작업실이 원본 쪽에서 오려 낸 rect) ③ 모르면 1열. 문제 22 는 그림 넷이 " +
      "2열 2행(ㄱ·ㄴ / ㄷ·ㄹ)으로 선다(전에는 한 열로 쌓였다). 작업실에서 고친 원문의 인용 상자는 이제 검수 카드처럼 " +
      "**줄이 칸**이고 열 수를 폭으로 추정하지 않는다 — 9번 저장본은 지면에서도 두 줄(가나다/라마바)이다(전에는 " +
      "여섯 항목 2열). 지면이 편집기의 `<보기:cols=3>` 을 `cols=3` 수식으로 찍던 것도 고쳤다. 그림 크기 규칙은 안 바뀌었다.",
    look:
      "(제안) ① 문제 22 를 넣은 시험지를 인쇄해 〈보기〉 안 그림 넷이 ㄱ·ㄴ 한 줄, ㄷ·ㄹ 한 줄로 서는가 — 한 열로 쌓이거나 " +
      "ㄱ·ㄷ 이 한 줄이면 불합격. ② 그림이 칸을 넘어 옆 칸·상자 테두리를 덮지 않는가(칸이 좁으면 그림이 줄어든다 — 원본 " +
      "크기보다 눈에 띄게 작으면 적어 주세요). ③ 원문 코드에서 머리를 `<보기:cols=3>` 으로 바꾼 문항(9번)이 가나다/라마바 " +
      "3열로 서고 `cols` 글자가 안 보이는가(좁은 단에서 식이 안 들어가면 지면이 여백을 줄이거나 열을 줄여 그린다 — " +
      "항목 `box-narrow-columns`). ④ 열 표기가 없는 1열 〈보기〉·〈조건〉 은 예전과 같은가.",
    lookFromSource: false,
    evidence: [
      "src/lib/math/boxLayout.ts (layoutQuotedBoxes · figureGridColumns)",
      "src/lib/math/boxHeader.ts (정본 <보기:cols=N> · 옛 <보기2> 읽기)",
      "src/__tests__/components/paperBoxGrid.test.tsx",
      "src/__tests__/components/reviewCardBoxGrid.test.tsx",
      "e2e/body-typeset/box-layout.spec.ts (검수 카드·지면·편집기 그림 자리 실측)",
    ],
    scale:
      "작업실 문항 중 〈보기〉 칸마다 그림이 하나이고 그림이 원본에서 가로로 나란한 것 · 머리에 열 수를 적은 것 · " +
      "«내용 수정»을 거친 인용 상자. 문제은행은 상자 문항이 2건뿐이다(2026-09-21 실측 100,891건 중).",
    status: "대기",
    needs:
      "원장님 문제 22(문명중 1학년 25-2 중간 미래엔)를 시험지에 넣는다. 9번(경운중 3학년 25-1 기말)은 «내용 수정» " +
      "편집기에서 〈보기〉 안을 눌러 상자 머리 오른쪽 «3열» 을 고른 뒤(트랙 51 — 원문 코드에서 머리를 " +
      "`<보기:cols=3>` 으로 바꿔도 같다) 넣는다.",
    changedOn: "2026-09-21",
  },
  {
    id: "side-by-side-columns",
    title:
      "«나란히» 묶음 — 서답형 소문항·그림이 고른 열 수(1~4열)로 나란히 서나, 제목·테두리 없이",
    changed:
      "원장님 2026-09-22 «이런 보기들도 2열 4열 등으로 배치가능하게. 1열 고정같은데». 서답형 소문항 (1)~(4) 가 저마다 " +
      "그림을 달고 한 줄에 하나씩 세로로만 쌓였다. «내용 수정»에서 소문항을 고르고 [나란히] 를 누르면 원문이 " +
      "`> <나란히:cols=N>` 칸 묶음이 된다 — 〈보기〉 상자의 칸 배치(한 줄 = 한 칸)를 그대로 쓰되 **제목(〈…〉)·테두리·" +
      "안쪽 여백이 없고** 1~4열이다(묶음 위아래 여백 `my-2` = 8px). 칸 안 그림은 제 줄에 가운데로, 칸 폭에 맞춰 줄어든다. " +
      "좁은 단(2단 시험지)에서 칸 글이 한 줄에 안 들면 〈보기〉 처럼 칸 사이를 줄여 보고, 그래도 안 되면 4 → 3 → 2 → 1 열로 " +
      "줄여 그린다(적힌 cols 는 그대로). 인쇄 높이 자는 라벨 줄·테두리 없이 행마다 가장 높은 칸으로 센다. " +
      "〈보기〉·〈조건〉 상자는 그대로 1~3열이다.",
    look:
      "(제안) ① 원장님 서답형 3 을 [나란히] 2열로 묶어 인쇄한다 — (1)(2) 한 줄 · (3)(4) 한 줄, 칸마다 번호 → 그림 → " +
      "배점 차례이고 **테두리·〈나란히〉 같은 제목 글자가 없으면** 합격. 번호와 그림이 다른 칸에 앉거나 칸이 엇갈리면 불합격. " +
      "② 같은 문항을 4열로 바꿔 2단 시험지(88mm 단)에 넣는다 — 그림이 옆 칸·단 밖으로 넘치지 않는가, 줄어든 그림의 " +
      "글자(각·길이)가 읽히는가(못 읽을 만큼 작으면 적어 주세요 — 그림은 칸 폭을 따른다). ③ 묶음 앞 발문·뒤 문항과의 " +
      "간격이 어색하지 않은가. ④ 한글(HWPX)로 내보내 (1)(2)(3)(4) 가 칸 차례대로 한 행에 서는가. " +
      "⑤ 〈보기〉 상자(문제 22·9번)는 예전과 같은가.",
    lookFromSource: false,
    evidence: [
      "src/lib/math/boxHeader.ts (<나란히:cols=N> · 1~4열 · 상자는 1~3열)",
      "src/components/math/MarkdownRenderer.tsx (SIDE_CARD_CLASS · GRID_CLASS)",
      "src/components/math/editor/conditionBox.ts (wrapSideBySide · unwrapSideBySide)",
      "src/lib/printOverflow.ts (sideBySidePx)",
      "src/__tests__/components/sideBySideParity.test.tsx",
      "src/__tests__/unit/sideBySide.test.ts",
      "src/__tests__/unit/hwpxGridRows.test.ts",
    ],
    scale:
      "«내용 수정»에서 [나란히] 를 누른 문항만 — 새 표기라 2026-09-22 기준 기존 문항은 0건이다.",
    status: "대기",
    needs:
      "원장님 서답형 3(소문항 넷·그림 넷)을 «내용 수정»에서 (1) 부터 (4) 까지 고르고 도구줄 [나란히] → 묶음 위 «2열»" +
      "(또는 «4열»). 줄머리 배점(«[2점] (2)»)은 묶을 때 앞 소문항 칸 끝으로 옮겨진다 — 칸이 원본과 다르면 Tab(칸 가르기)" +
      "·Backspace(칸 잇기)로 고친다.",
    changedOn: "2026-09-22",
  },
  {
    id: "hwpx-grid-order",
    title:
      "HWPX: 격자(〈보기〉 여러 열·보기 번호)가 한글에서 원문 차례 · 한 행 한 문단으로 나오나",
    changed:
      "🔴 나간 시험지 내용이 틀리던 자리다. 지면의 격자는 칸이 위쪽 정렬이라(트랙 51 부터 글 칸은 기준선 맞춤 — 항목 " +
      "`grid-baseline-align`) 분수가 든 칸의 기준선만 내려가는데, " +
      "HWPX writer 가 기준선으로만 줄을 세워 9번 저장본이 한글에서 여섯 문단 · **(바)가 (마)보다 먼저** 나왔다. 분수 " +
      "보기는 «①» 옆이 비고 분수가 아랫줄로 떨어졌다(작업실·문제은행 지면 둘 다). 이제 수집기가 격자 칸을 표시하고 " +
      "writer 가 격자 한 행을 한 문단으로, 칸 차례대로 묶는다(칸 사이는 미리보기 x 의 탭). 줄바꿈된 인라인 수식은 첫 줄 " +
      "자리에, 친 여러 칸(고정 공백)은 한 칸으로 접지 않고 탭으로 옮긴다.",
    look:
      "(제안) 같은 시험지를 HWPX 로 내보내 한글에서 연다. ① 9번(3열로 고친 것)이 «(가) 식 ⇥ (나) 식 ⇥ (다) 식» / «(라) … " +
      "(마) … (바) …» 두 줄이고 (가)~(바) 차례가 원문과 같은가 — 차례가 바뀌면 불합격. (좁은 단에서 지면이 2열로 " +
      "그렸으면 한글도 두 칸씩 세 줄이다 — 한글은 지면을 베낀다, 항목 `box-narrow-columns`.) ② 문제 22 의 〈보기〉 가 «ㄱ. ㄴ.» " +
      "한 줄, 그 아래 그림 둘이 나란히, 다시 «ㄷ. ㄹ.»·그림 둘인가. ③ 분수 보기(예: ① 5/2 ② −3 ③ 1/3)가 번호 바로 옆에 " +
      "서는가 — 분수가 번호 아랫줄로 떨어지면 불합격. ④ 칸 사이 탭 자리가 미리보기와 비슷한가. ⑤ 네 칸 띄운 자리가 " +
      "한글에서도 벌어지는가.",
    lookFromSource: false,
    evidence: [
      "scripts/hwpx/writer.py (grid_rows · cell_lines)",
      "src/lib/export/hwpxLayout.ts (gridCellMarks · 고정 공백 · 줄바꿈 수식 첫 조각)",
      "src/__tests__/unit/hwpxGridRows.test.ts (9번 실측 좌표 · 분수 보기)",
      "e2e/body-typeset/box-layout.spec.ts (지면 수집 → 파이썬 writer 문단 차례)",
    ],
    scale:
      "HWPX 로 내보내는 모든 시험지의 보기 번호 격자(분수·그림이 한 칸이라도 든 문항) · 여러 열 〈보기〉 · 친 여러 칸",
    status: "대기",
    needs:
      "분수 보기가 있는 문항 하나, 문제 22, 3열로 고친 9번을 한 시험지에 넣어 HWPX 로 내보낸다. 한글로 여는 것은 " +
      "원장님 차례다(창을 띄우는 자동화는 돌리지 않는다 — 절대 규칙 9).",
    changedOn: "2026-09-21",
  },
  {
    id: "box-narrow-columns",
    title:
      "좁은 단의 여러 열 〈보기〉 — 식이 칸 안에서 접히지 않고 한 줄에 서나 (여백부터 줄이고, 안 되면 열을 줄여 그린다)",
    changed:
      "원장님 2026-09-21 확정(트랙 51). 2단 시험지 한 단(약 88mm)의 3열 〈보기〉 는 칸이 좁아 `y = −⅔x²` 가 칸 안에서 " +
      "«y =» 뒤로 접혔다. 이제 지면이 **칸마다 한 줄 폭을 실제 조판에서 재서**, 안 들면 먼저 상자 안쪽 좌우 여백·칸 " +
      "사이 간격을 줄이고(16·24px → 6·10px), 그래도 안 들면 **그리는** 열 수를 줄인다(3 → 2 → 1). 원문에 적힌 " +
      "`<보기:cols=3>` 은 그대로라 1단 지면처럼 넓은 단에서는 다시 3열이다. 판정은 한 함수(`fitBoxColumns`)이고 " +
      "HWPX 는 지면을 베낀다. 실측(하네스 88mm): 10.5pt 는 2열, 시험지 글자 13.2px 는 여백만 줄여 3열.",
    look:
      "(제안) ① 3열로 고친 9번을 2단 시험지에 넣어 인쇄해, (가)~(바) 의 식이 칸마다 한 줄인가 — 식이 «y =» 뒤에서 " +
      "꺾이면 불합격. ② 3열로 섰다면 칸 사이가 너무 붙어 옆 칸 글과 이어 읽히지 않는가, 상자 테두리와 글 사이가 " +
      "너무 좁지 않은가(줄인 여백 6px ≈ 1.6mm). ③ 2열로 섰다면 (가)(나) / (다)(라) / (마)(바) 차례인가. ④ 같은 문항을 " +
      "1단 시험지로 뽑으면 3열·예전 여백인가. ⑤ HWPX 도 지면과 같은 열 수인가.",
    lookFromSource: false,
    evidence: [
      "src/lib/math/boxFit.ts (fitBoxColumns · BOX_TIGHT_SPACING)",
      "src/components/math/BoxQuoteCard.tsx (실제 조판에서 재기)",
      "src/__tests__/unit/boxFit.test.ts",
      "e2e/body-typeset/box-cols.spec.ts (88mm·10.5pt 2열 · 13.2px 3열 좁은 여백 · 180mm 그대로 · HWPX 문단)",
    ],
    scale:
      "머리에 열 수(2·3)를 적었거나 원본 그림 자리로 여러 열이 된 〈보기〉·〈조건〉 중, 칸 하나라도 한 줄에 안 드는 것 — " +
      "들어가는 상자는 한 글자도 안 바뀐다",
    status: "대기",
    needs:
      "9번(경운중 3학년 25-1 기말)을 «내용 수정» 편집기에서 3열로 고른 뒤 2단 시험지 한 벌·1단 시험지 한 벌로 인쇄한다. " +
      "같은 2단 시험지를 HWPX 로도 내보낸다.",
    changedOn: "2026-09-21",
  },
  {
    id: "grid-baseline-align",
    title:
      "격자 칸 세로 맞춤 — 분수 칸 옆의 글·보기 번호가 분수와 같은 기준선에 서나 (그림 칸은 위쪽 그대로)",
    changed:
      "원장님 2026-09-21 확정(트랙 51). 〈보기〉 여러 열과 보기 번호 격자는 칸이 위쪽 정렬이라, 한 칸에 분수가 들면 옆 " +
      "칸의 글·번호가 몇 px(실측 6~7px) 높게 섰다(«① 5/2» 의 번호도 분수보다 높았다). 이제 **글 칸은 기준선 맞춤**이라 " +
      "한 행의 글이 한 줄로 선다 — 한글과 같다. **그림 칸은 위쪽 그대로**다(그림 바닥이 기준선이 되면 옆 글이 그림 아래로 " +
      "내려간다). 검수 카드·작업실 편집기도 같은 맞춤이다(모든 화면 일치). HWPX 수집기는 행을 칸의 위쪽 끝이 아니라 " +
      "«칸이 왼쪽으로 돌아오는 자리»로 가른다 — 맞춤이 바뀌어도 한 행이 칸마다 안 갈린다.",
    look:
      "(제안) ① 분수 보기가 있는 문항(예: ① 5/2 ② −3 ③ 1/3)을 인쇄해 «① ② ③» 번호와 «−3» 이 분수의 가로줄 높이가 " +
      "아니라 **글자 바닥줄**에 나란히 서는가. ② 〈보기〉 3열 9번에서 (가)·(나)·(다) 가 한 줄에 서는가 — (나)(분수) " +
      "옆 (가)·(다) 가 위로 뜨면 불합격. ③ 행 사이가 예전보다 눈에 띄게 벌어지거나 붙지 않는가. ④ 그림 보기·〈보기〉 " +
      "그림 칸(문제 22)은 예전처럼 위쪽에 맞춰 서는가.",
    lookFromSource: false,
    evidence: [
      "src/components/math/MarkdownRenderer.tsx (〈보기〉 격자 items-baseline)",
      "src/components/unified/NativeProblem.tsx (작업실 지면 보기 번호 격자)",
      "src/components/math/ProblemContent.tsx (문제은행 지면 보기 번호 격자)",
      "src/lib/export/hwpxLayout.ts (gridCellMarks — 행은 칸이 왼쪽으로 돌아올 때)",
      "e2e/body-typeset/box-cols.spec.ts (기준선 차 < 1px · 그림 칸 위쪽)",
    ],
    scale:
      "보기 번호 격자가 있는 모든 문항(분수·큰 수식이 한 칸이라도 든 것에서 눈에 띈다) · 여러 열 〈보기〉·〈조건〉",
    status: "대기",
    needs:
      "분수 보기 문항 하나, 3열로 고친 9번, 문제 22 를 한 시험지에 넣어 인쇄한다(문제은행 문항 하나도 섞는다).",
    changedOn: "2026-09-21",
  },
  {
    id: "hwpx-equation-height",
    title: "HWPX — 분수·큰 수식이 든 줄이 아래 줄을 덮지 않는다",
    changed:
      "원장님 2026-09-21 «한글 내보내기할때 줄간격이 왜 이렇게 타이트하지 … com 이용해서 hwp로 내보내면 아주 잘되던데»: " +
      "한글은 HWPX 를 열 때 수식 상자를 다시 재지 않고 `<hp:sz>`·`baseLine` 을 그대로 쓴다. 폭은 한글 값이었는데 " +
      "**높이·기준선은 KaTeX 값**이었다 — 한글의 분수는 2.30줄(10.5pt 에서 32.2px), KaTeX 는 28px 쯤이라 4px 가 상자 " +
      "아래로 나가고, 줄 높이는 «고정값»이라 안 늘어났다. 이제 수식 상자와 그 줄의 고정 높이를 **한글이 그릴 높이**" +
      "(`scripts/hwpx/eqheight.py` — 한글 COM 실측 11,000건에서 읽은 규칙, 시험 수식 3,000개 99.9% 일치)로 잡는다. " +
      "글의 기준선 자리는 미리보기 그대로다. 줄이 틈보다 커서 밀린 만큼은 다음 빈틈에서 되찾는다.",
    look:
      "(제안) 분수가 든 발문(예: «확률은 1/7 이다»), `(1/x − 1)^6` 같은 큰 괄호 식, 첨자·루트가 든 줄을 HWPX 로 " +
      "내보내 **한글에서 연다**. ① 분수의 분모가 아래 줄 글자와 겹치지 않는가. ② 분수 줄 위·아래 간격이 눈에 띄게 " +
      "벌어지지 않았는가(4px 안팎). ③ 〈보기〉 상자의 배경·테두리가 글과 어긋나지 않는가 — 분수 줄이 많은 쪽에서. " +
      "④ 쪽 끝 문항이 다음 쪽으로 넘어가지 않았는가.",
    lookFromSource: false,
    evidence: [
      "scripts/hwpx/eqheight.py (높이·기준선 규칙)",
      "scripts/hwpx/writer.py (hancom_equation — 상자·줄 높이 · cursor 는 실제 바닥)",
      "src/__tests__/unit/hwpEquationHeightModel.test.ts (한글 실측 214건 — 1px 넘게 모자란 식 0)",
      "src/__tests__/unit/hwpxEquationHeight.test.ts (분수 줄의 고정 높이 ≥ 수식 상자)",
    ],
    scale: "분수·첨자·루트·행렬·적분이 든 모든 줄 — HWPX 내보내기 전부",
    status: "대기",
    needs:
      "분수가 발문 가운데 든 문항, 큰 괄호 + 지수 식, 연립방정식(CASES), 〈보기〉 안 분수 — 한 시험지에 넣어 HWPX 로 내보낸다. " +
      "🔴 한글에서 여는 것까지가 검수다(이 시험들은 XML 안만 본다 — 규칙 9 로 한글 COM 을 안 돌렸다).",
    changedOn: "2026-09-21",
  },
  {
    id: "table-cell-math",
    title: "인식한 표 — 칸의 수·문자가 본문과 같은 수식 글꼴",
    changed:
      "원장님 2026-09-21 «표 내부 숫자가 수식 처리 안되어있기도 하고»: 인식은 표를 칸 글자(`rows`)로 주고 `$` 를 안 붙인다. " +
      "칸을 수식으로 볼지를 `\\ ^ _ { }` 하나로 정해서 `x (시간)` · `(x, y)` 는 수식인데 **`0` · `15` · `a`** 는 보통 글자였다. " +
      "이제 수·한 글자 문자·연산 기호·괄호만 든 칸도 수식이다(`tableCellMath` — 검수 카드·편집기·지면이 같은 규칙 하나). " +
      "글자가 둘 이상 이어지면(`cm` · `AB`) 낱말·단위로 보고 그대로 둔다. «내용 수정»으로 이미 저장한 문항은 저장본 그대로다.",
    look:
      "(제안) 표가 든 인식 문항(문명중 1학년 3번 양초 표)을 인쇄한다. ① 표의 `0 1 2 3 4 5` · `15` · `a b c d e` 가 " +
      "발문의 `15cm` · `a+b+c` 와 **같은 글꼴**인가. ② 한글 칸(«시간» · «합계»)과 단위 칸(`cm`)은 예전 그대로인가. " +
      "③ 표의 폭·행 높이가 눈에 띄게 달라지지 않았는가.",
    lookFromSource: false,
    evidence: [
      "src/lib/mathgen/blocksToMarkdown.ts (tableCellMath · tableCellMarkdown)",
      "src/components/unified/NativeProblem.tsx (지면 표 칸 — 같은 규칙)",
      "src/__tests__/unit/tableCellMath.test.ts",
    ],
    scale: "인식 결과에 표가 든 문항(«내용 수정» 전 상태) 전부",
    status: "대기",
    needs:
      "표가 든 인식 문항 하나 — 칸에 수·문자·한글·단위가 섞인 것이면 한 번에 본다.",
    changedOn: "2026-09-21",
  },
  {
    id: "figure-label-upright",
    title: "다시 그린 도형 — 라벨의 수·단위가 어느 화면에서나 정자",
    changed:
      "원장님 2026-09-21 «왜 서로 글씨체가 다르지?»: 검수 카드의 도형은 «2 cm» 가 숫자까지 기울었고, 도형 편집기의 같은 " +
      "도형은 정자였다. 엔진은 각도·호 라벨의 바깥 `<text>` 에 기울임을 걸고 숫자·°·단위 조각만 정자로 적는데, " +
      "조판기가 바깥 표시만 보고 라벨 전체를 기울였다. 2026-09-19 에 고친 자리가 **편집기를 여는 길**뿐이어서, 편집기를 " +
      "안 거친 도형은 카드·지면에서 그대로 기울었다. 이제 규칙이 조판기 안에 있다 — 어느 길로 와도 같다. " +
      "사용자가 «기울임» 단추로 켠 라벨은 기울임 그대로다.",
    look:
      "(제안) AI 로 다시 그린 도형 중 **편집기를 한 번도 안 연 것**을 인쇄한다. ① 각도(«30°»)·길이(«2 cm»)의 숫자와 " +
      "단위가 곧은 글자인가. ② 변수(`x`·`a`)는 기울임 그대로인가. ③ 같은 도형을 편집기에서 열었다 닫은 뒤에도 같은가.",
    lookFromSource: false,
    evidence: [
      "src/components/unified/figure-editor/figureTypeset.ts (engineUprightPieces)",
      "src/components/unified/figure-editor/figureSvgEditing.ts",
      "src/__tests__/components/figureLabelUpright.test.ts",
    ],
    scale: "AI 로 다시 그린 도형 중 각도·호 라벨이 든 것",
    status: "대기",
    needs: "각도 표시가 있는 다시 그린 도형 하나 — 편집기를 열지 않은 상태로.",
    changedOn: "2026-09-21",
  },
  {
    id: "figure-mid-label-line-gap",
    title:
      "도형 편집기 «가운데 글자» — 치수선 위 글자 뒤로 선이 끊겨 나오나(배경색 없이)",
    changed:
      "원장님 2026-09-22 «치수선 위에 라벨을 넣으려고 하는데, 흰색을 넣자니 배경색이 흰색이 되어버리는데, 스마트하게 " +
      "치수선 위에 글자 넣을 방법 없을까». 곡선·선을 고르고 «가운데 글자»를 누르면 선 한가운데(곡선이면 노란 손잡이 " +
      "자리)에 글자가 서고, 원문 `<text>` 에 `data-line-gap` 만 남는다. 저장 이미지(학습지·PDF·HWPX 가 싣는 그림)에는 " +
      "조판할 때 `<mask>` 가 들어가 그 글자 상자(글자 크기의 15% 여백)만큼 **칠하지 않은 선**(선·곡선·다각형 테두리 " +
      "등)에 구멍이 난다. 칠한 면은 구멍이 안 난다. 이 단추로 만든 글자가 없는 그림은 바뀌지 않는다.",
    look:
      "(제안) ① 글자 **양옆에서** 선이 끊기는가 — 글자에 선이 겹치거나 지나가면 불합격. ② 끊긴 틈이 글자보다 " +
      "**너무 넓지 않은가** — 틈이 글자 폭의 두 배쯤이면 원장님께 여쭐 것. ③ 점선 곡선이 틈 앞뒤로 **제 모양**으로 " +
      "이어지는가. ④ HWPX 를 한글에서 열어도 같은가(내보내기는 브라우저가 그림을 PNG 로 굽는다). ⑤ 글자를 옮긴 " +
      "뒤 저장한 그림은 **옮긴 자리**에서 끊기는가.",
    lookFromSource: false,
    evidence: [
      "src/components/unified/figure-editor/figureMidLabel.ts",
      "src/components/unified/figure-editor/figureTypeset.ts",
      "src/__tests__/unit/figureMidLabel.test.ts",
    ],
    scale:
      "«가운데 글자»로 넣은 글자가 있는 그림만 — 이 변경 전에 만든 그림은 0건",
    status: "대기",
    needs:
      "작업실 → 도형 편집에서 점선 곡선 하나와 곧은 선 하나에 «가운데 글자»(예: «9 cm» · «x»)를 넣고, 하나는 조금 " +
      "옮긴다. 그 문항을 학습지에 담아 인쇄 · PDF · HWPX 로 한 장씩 뽑는다.",
    changedOn: "2026-09-22",
  },
  {
    id: "answer-sheet-solution-postprocess",
    title:
      "학습지 정답지 해설 — 문장마다 줄이 갈리고, 붙은 수식·여러 줄 수식이 새지 않는다",
    changed:
      "원장님 신고(작업실 해설에 `\\displaystyle $$이동 거리= …` 가 날 글자로 샘)를 조사하다 나온 해설지 쪽 결함(후보정 트랙 T3). " +
      "① 학습지 정답지(`AnswerPage`)가 해설 줄 나눔(`solutionForDisplay`)을 빠뜨려 해설이 한 덩어리였다 — 이제 인쇄 " +
      "정답지·문제은행과 같은 조합(`SolutionText`)이라 **문장마다 줄이 갈린다(지면 높이가 늘어난다).** " +
      "② 정상 해설 `이동 거리는 $8$ 이고 $$s=8$$` 가 `$ $$\\displaystyle s=8$$$` 로 새던 것 — 붙은 수식 떼기가 앞 수식의 " +
      "**닫는** `$` 부터 읽었다. ③ 여러 줄 `$$…$$`·`\\begin{aligned}` 의 첫 줄 식이 사라지고 뒤 한글이 수식으로 들어가던 것 " +
      "— 수식 안 줄바꿈을 공백으로 접는다(TeX 에서 같은 뜻). ④ `8\\,\\mathrm{m}` · 코드 따옴표 안 TeX · `\\text{…$x$…}` · " +
      "`\\$` 화폐가 날 글자·붉은 오류로 나가던 것. PDF·HWPX 는 이 미리보기에서 나가므로 같이 바뀐다.",
    look:
      "(제안) ① 해설이 한 줄로 이어 붙지 않고 **문장마다 줄이 갈리는가**(인쇄 정답지와 같은 모양인가). " +
      "② 해설 어디에도 `$` · `\\displaystyle` · `\\=` 같은 **날 글자**가 없는가. ③ 여러 줄로 쓴 계산식(`=` 로 이어지는 " +
      "줄)이 첫 줄까지 다 찍히는가 — 한 줄로 이어져 나오는 것이 정상이다(울타리 `$$` 가 제 줄에 선 식만 가운데 정렬). " +
      "④ 해설이 늘어나 다음 쪽으로 넘어갈 때 **잘리지 않고** 넘어가는가. ⑤ 같은 해설을 PDF·HWPX 로 뽑아도 같은가.",
    lookFromSource: false,
    evidence: [
      "src/lib/math/segments.ts (findMathSpans · canonicalizeMathSpans)",
      "src/lib/math/textPreprocess.ts (preprocessMathText — 첫 단계·step 9)",
      "src/components/math/MathText.tsx (SolutionText)",
      "src/components/unified/print/AnswerPage.tsx",
      "src/__tests__/unit/renderPostprocessLeaks.test.tsx",
      "src/__tests__/components/solutionExits.test.tsx",
    ],
    scale:
      "학습지 정답지의 모든 해설(줄 나눔) · 붙은 수식/여러 줄 수식/`\\$` 가 든 해설(모양) — 문제 표에서 확인된 붙은 해설 4행 포함",
    status: "대기",
    needs:
      "여러 문장짜리 해설, `$8$ 이고 $$s=8$$` 처럼 인라인 뒤 표시식이 든 해설, `$$x(b)-x(a)` ⏎ `= 8$$` 처럼 여러 줄 " +
      "표시식 해설을 한 학습지에 담아 정답지를 인쇄 · PDF · HWPX 로 한 장씩 뽑는다.",
    changedOn: "2026-09-26",
  },
  {
    id: "hwpx-repeat-dot",
    title:
      "HWPX — 순환소수 점이 한글 수식 `dot` 으로(클래스 이름이 글자로 안 나간다)",
    changed:
      "지면은 순환마디 점을 `\\htmlClass{repeat-dot}{3}` 로 그리는데(중2 교과서 점 표기), HWPX 옮김이 그 표기를 몰라 " +
      "`0.{repeat-dot}{3}` — **클래스 이름이 글자로** — 한글에 나갔다(후보정 조사 G). 이제 옮기기 전에 `\\dot{3}` 로 " +
      "되돌려 `0. dot {3}` 이 된다. 호(⌒)는 전부터 같은 자리에서 옮기고 있었다.",
    look:
      "(제안) 순환소수(`0.3̇` · `0.1̇2̇` · `1.23̇4̇`)가 든 문항을 HWPX 로 내보내 **한글에서 연다**. ① 점이 순환마디 " +
      "첫·끝 숫자 **위에** 찍히는가. ② `repeat-dot` 같은 글자가 어디에도 없는가. ③ 수식 상자 폭이 옆 글자와 겹치지 않는가.",
    lookFromSource: false,
    evidence: [
      "scripts/hwpx/writer.py (hancom_equation)",
      "src/__tests__/unit/hwpxRepeatDot.test.ts",
    ],
    scale:
      "순환소수 점·막대(`\\dot` · `\\overline{숫자}`)가 든 문항의 HWPX 내보내기",
    status: "대기",
    needs:
      "순환소수가 든 중2 문항 하나 — HWPX 로 내보내 한글에서 연다. " +
      "🔴 한글에서 여는 것까지가 검수다(시험은 변환 문자열까지만 봤다 — 규칙 9 로 한글 COM 을 안 돌렸다).",
    changedOn: "2026-09-26",
  },
  {
    id: "english-student-a4",
    title: "오늘 영어 — 학생용 A4 (새 지면 · 1단 · 배점 없음)",
    changed:
      "둘째 제품 «오늘 영어»(D-148)의 첫 지면. `A4Page` 경계·종이색·서체 변수만 수학과 같이 쓰고 **1단**으로 " +
      "새로 그렸다(수학 2단 폭·장당 2문항·`.paperParity` 안 씀). 머리 «오늘 영어 · 학원 | 학생용 · 검토 상태» · " +
      "세트 제목 · «학교 학년 · 시험» · 이름·날짜 줄 → 지문 상자(세리프 12pt · 줄 간격 1.9 · 얇은 테두리 · " +
      "`pre-wrap`) → 문항(«1. 발문» · 보기 ①~⑤ · 서술형·원문 복원은 50px 밑줄 답란). 쪽은 문단·문항 높이를 " +
      "숨은 틀에서 재어 나눈다(한 쪽보다 긴 블록은 혼자 한 쪽 + 미리보기 경고). 배점은 어디에도 없다(원장님 ⑻).",
    look:
      "(제안) 학생용으로 인쇄해 ① 지문 상자가 쪽 아래에서 **잘리지 않는가**(상자 테두리가 네 변 다 있는가, " +
      "다음 쪽으로 이어지면 «지문 (이어짐)» 상자로 이어지는가). ② 문항이 **쪽 경계에서 갈리지 않는가**(보기 ①~⑤ 가 " +
      "한 쪽에 다 있는가). ③ 지문·보기의 영어가 **세리프**로 찍히는가 — 고딕(Malgun Gothic 류)으로 나오면 글꼴 대체다. " +
      "④ 서술형·원문 복원의 **답란 밑줄이 옅지 않은가**(1px 검정이 종이에서 보이는가). ⑤ **배점·점수 글자가 " +
      "한 글자라도 보이면 불합격**. ⑥ 머리의 «검토 완료» 상태 글자·이름·날짜 줄·꼬리 «p. N / M» 이 있는가. " +
      "⑦ 정답·해설·근거가 학생용에 새지 않았는가.",
    lookFromSource: false,
    evidence: [
      "docs/planning/25-english-studio.md §5",
      "docs/planning/05-design-system.md §8.23 (인쇄 행)",
      "docs/planning/tracks/briefs/english-print.md §1 · §4",
      "src/components/english/print/EnglishPaper.tsx",
      "src/components/english/print/EnglishPrint.module.css",
      "src/components/english/print/englishPaperLayout.ts (쪽 나눔)",
      "src/__tests__/components/EnglishPrintPaper.test.tsx",
      "src/app/(main)/english/sets/[id]/print/page.tsx (인쇄 경로 /english/sets/{세트id}/print?view=student)",
    ],
    scale: "오늘 영어 세트 전부(새 제품 — 기존 문항 0건)",
    status: "대기",
    needs:
      "검토 완료 세트 하나 — 객관식 2 · 서술형 1 · 원문 복원 1. 지문에 빈 줄이 든 것(문단 둘 이상)이면 " +
      "«이어짐» 상자까지 본다. 🔴 라우트는 base 트랙 병합 뒤에 붙는다 — 그 전에는 뽑을 화면이 없다.",
    changedOn: "2026-09-30",
  },
  {
    id: "english-teacher-a4",
    title: "오늘 영어 — 교사용 A4 (정답·해설·근거 상자 · 회색 면)",
    changed:
      "학생용과 같은 지면에 문항마다 **정답·해설·근거 상자**를 얹는다 — 회색 면(#e8e8eb) + 왼쪽 3px 회색 선 " +
      "(지면 규약 — 화면의 왼쪽 색 막대 금지 D-30 과 무관). 객관식 정답은 ③ 처럼 보기 번호 글자, 서술형·원문 복원은 " +
      "정답 글. 머리는 «교사용 · 정답 및 해설 · 검토 상태». 답란은 교사용에 없다(그 자리에 상자).",
    look:
      "(제안) 교사용으로 인쇄해 ① 상자의 **회색 면이 종이에 찍히는가**(흰 종이에 면이 안 보이면 브라우저 " +
      "«배경 그래픽» 설정을 켜고 다시 — 그래도 안 나오면 불합격). ② 왼쪽 3px 선이 보이는가. ③ 상자 안 «정답·해설·근거» " +
      "이름표와 본문이 겹치지 않는가(근거 영어 문장이 세리프인가). ④ 상자가 붙은 문항이 학생용보다 길어져 **쪽 경계에서 " +
      "갈리지 않는가**. ⑤ **배점·점수 글자가 보이면 불합격**. ⑥ 학생용과 문항 번호·보기 순서가 같은가.",
    lookFromSource: false,
    evidence: [
      "docs/planning/25-english-studio.md §5",
      "docs/planning/05-design-system.md §8.23 (인쇄 행)",
      "docs/planning/tracks/briefs/english-print.md §1 · §4",
      "src/components/english/print/EnglishPaper.tsx (QuestionBlock — teacherBox)",
      "src/components/english/print/EnglishPrint.module.css (.teacherBox)",
      "src/__tests__/components/EnglishPrintPaper.test.tsx",
      "src/app/(main)/english/sets/[id]/print/page.tsx (인쇄 경로 /english/sets/{세트id}/print?view=teacher)",
    ],
    scale: "오늘 영어 세트 전부(새 제품 — 기존 문항 0건)",
    status: "대기",
    needs:
      "학생용과 같은 세트(객관식 2 · 서술형 1 · 원문 복원 1)를 교사용으로 한 번 더 뽑는다. " +
      "🔴 라우트는 base 트랙 병합 뒤에 붙는다 — 그 전에는 뽑을 화면이 없다.",
    changedOn: "2026-09-30",
  },
  {
    id: "concept-blank-recall-a4",
    title:
      "개념 백지 A 완전 백지 — 소단원 칸 · 모눈/예 칸 · 줄 칸이 장을 채운다",
    changed:
      "새 지면. 소단원 이름만 적힌 칸을 장마다 넷까지(넘치면 다음 장 · 간소 머리 «오늘 수학 · 제목» + p. N). 칸 왼쪽은 30px 간격 줄 칸, 오른쪽 170px 은 그림 소단원이면 16px 모눈 · 아니면 점선 «예» 칸 — 오른쪽 칸의 아랫변은 왼쪽 마지막 줄에 맞춘다. 칸은 장의 남는 높이를 나눠 채우고(칸이 하나면 장 전체), 다섯 칸은 4 + 1 이 아니라 3 + 2 로 고르게 나눈다. 머리(오늘 수학 · CONCEPT RECALL · 제목 · 목표 · 학습일 · 이름/반 · 단원) · 발(떠올린 개념 칸 · 오늘의 메모 · p. 1). 안쪽 여백은 시험지와 같다(첫 장 36/50/20 · 이어지는 장 24/50/20). 배점 없음.",
    look: "(제안) 학생지(?view=student)를 인쇄해 ① 칸이 장 아래까지 고르게 차고(아래가 비면 불합격) 금색 칸 머리선 · 동그라미 번호가 보이는가. ② **줄 칸의 회색 줄과 모눈이 종이에 찍히는가** — 배경 그림(gradient)이라 «배경 그래픽»이 꺼져 있으면 사라질 수 있다. 켜고도 안 나오면 불합격. ③ 오른쪽 칸의 윗변 · 아랫변이 왼쪽 줄 칸과 같은 높이에서 시작하고 끝나는가. ④ 머리 글이 한 줄도 안 잘리는가(긴 제목은 글씨가 줄고 두 줄까지 접힌다). ⑤ 발의 «떠올린 개념 ___ / N» 칸 · 점선 · p. 1. ⑥ 소단원을 다섯 이상 골랐으면 둘째 장 간소 머리 «오늘 수학 · 제목 … p. 2». ⑦ 종이 가장자리에서 글까지 여백이 시험지와 같은가. ⑧ 배점·점수 글자가 보이면 불합격.",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §6",
      "docs/planning/tracks/briefs/cb-paper.md",
      "docs/planning/tracks/reports/cb-paper.md (인쇄 매체 실측 — 넘침 0 · 장마다 빈 틈 · 줄맞춤 표)",
      "src/components/concept-blank/ConceptBlankPaper.tsx",
      "src/components/concept-blank/paper/paper.module.css",
      "src/components/concept-blank/paper/paginate.ts (쪽 나누기 — 줄 단위 높이 예산 + 천장)",
      "src/__tests__/components/ConceptBlankPaper.test.tsx",
      "e2e/concept-blank-paper/overflow.spec.ts (인쇄 매체 — A4 상자 · 넘침 0 · 빈 틈 · 줄맞춤)",
      "src/app/(main)/concept-blank/print/page.tsx (인쇄 경로 /concept-blank/print?s=…&view=student|key|both)",
      "src/components/concept-blank/paper/StudentBody.tsx (RecallBody)",
      "src/components/concept-blank/paper/PaperParts.tsx (SheetHead · SheetFoot)",
    ],
    scale: "개념 백지 지면 전부(D-150 새 지면 — 기존 문항 0건)",
    status: "대기",
    needs:
      "«개념 백지» 탭에서 초4 · 초5 · 초6 단원을 골라 «인쇄하기»(`/concept-blank/print?s=…` — 인쇄 창이 바로 뜬다)에서 (여백 없음 · 배율 100% · 배경 그래픽 켬). 소단원을 하나 · 넷 · 다섯 골라 세 번 뽑으면 칸 하나 · 넷 · 3 + 2 가 다 나온다. 앱 없이 뽑으려면 하네스: `npx vite --config e2e/concept-blank-paper/vite.config.mts` → `http://127.0.0.1:4233/?set=counts&view=student`.",
    changedOn: "2026-09-30",
  },
  {
    id: "concept-blank-term-a4",
    title: "개념 백지 B 용어 → 뜻 — 쓰기 줄이 늘어나 장을 채운다 · ○× 동그라미",
    changed:
      "새 지면. 용어마다 «문 n» + 용어(굵게 — 2026-10-01: 용어 안의 숫자 · 단위 · 분수도 굵은 KaTeX) + 쓰기 줄(가장 적을 때 한두 줄 · 뜻의 보이는 글자가 열여덟 자 이하면 한 줄 — 장에 문항이 적으면 줄이 늘어나 장을 채운다). 뒤에 ○× — 안내 한 줄 «맞으면 ○, 틀리면 × 에 표시하고 까닭을 쓰시오.» 뒤 문장 · 동그라미 둘 · «까닭» 줄(첫 줄이 동그라미 아래 끝과 같은 높이). 장마다 아홉 문항까지 · 긴 글은 줄 수 어림으로 먼저 넘긴다 · 마지막 두 장은 고르게(11문항 = 6 + 5). 문항 번호는 고정 폭 열(44px · 세 자리 번호면 52px)이라 번호 뒤 글이 한 줄에 선다.",
    look: "(제안) ① 쓰기 줄이 손글씨로 뜻을 쓸 만한 간격인가(30px ≈ 7.9mm). ② ○ · × 동그라미 테두리가 종이에서 보이는가. ③ «문 9» 와 «문 10» 뒤 글의 왼쪽 끝이 같은 자리인가. ④ 열 문항 이상이면 둘째 장으로 넘어가 번호가 이어지고, 두 장의 문항 수가 비슷한가. ⑤ 장 아래가 비지 않는가(문항 셋만 골라도 줄이 장 끝까지 간다). ⑥ 긴 ○× 문장이 두 줄로 접혀도 동그라미 줄과 겹치지 않는가. ⑦ 학생지에 ○× 답 · 까닭이 새지 않았는가.",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §6",
      "docs/planning/tracks/briefs/cb-paper.md",
      "docs/planning/tracks/reports/cb-paper.md",
      "src/components/concept-blank/ConceptBlankPaper.tsx",
      "src/components/concept-blank/paper/paper.module.css",
      "src/components/concept-blank/paper/paginate.ts (packBalanced · termCost · numberColumnWidth)",
      "src/__tests__/components/ConceptBlankPaper.test.tsx",
      "e2e/concept-blank-paper/overflow.spec.ts",
      "src/app/(main)/concept-blank/print/page.tsx (인쇄 경로 /concept-blank/print?s=…&view=student|key|both)",
      "src/components/concept-blank/paper/StudentBody.tsx (TermBody)",
    ],
    scale: "개념 백지 지면 전부(D-150 새 지면 — 기존 문항 0건)",
    status: "대기",
    needs:
      "«개념 백지» 탭에서 초4~초6 단원을 골라 «용어 → 뜻»을 켜고 문항 수를 3 · 11 로 두 번 뽑는다(○× 도 한둘). «인쇄하기»(인쇄 창이 바로 뜬다)에서 (여백 없음 · 배율 100% · 배경 그래픽 켬).",
    changedOn: "2026-09-30",
  },
  {
    id: "concept-blank-cloze-a4",
    title: "개념 백지 C 문장 빈칸 — 핵심어 길이 비례 밑줄 · «나» 적용 상자",
    changed:
      "새 지면. 뜻 문장의 `{핵심어}` 자리를 밑줄 빈칸(1.5px)으로 — 길이는 핵심어의 **보이는 폭**에 비례(글자마다 14px + 여유 24px · 한 글자 40px · 세 글자 66px · 최대 240px), 밑줄은 글자 기준선 바로 아래(0.2em). 2026-10-01: 은행 2차부터 핵심어에 수식이 실린다(`{$1000\\,\\mathrm{m}$}` · `{$\\frac{\\sqrt{3}}{2}$}`) — 빈칸은 마크업 글자 수가 아니라 그려지는 폭만큼이다(분수 하나 40~53px · «1000 mL» 88px. 마크업으로 세면 76개가 최대 폭 240px 에 닿는다). 낱말 사이에서만 줄을 바꾸고(«부른 / 다» 처럼 끊기지 않는다), 빈칸 뒤에 붙은 조사 · 마침표는 빈칸과 한 줄에 묶는다(«____ / .» 처럼 떨어지지 않는다). «가» 문장은 적용이 붙는 장에 여덟까지 · 문장만 있는 장은 열넷까지, «나» 적용 상자(물음 + «답» 밑줄 — 남는 높이는 풀 자리). 적용이 없는 장은 문장 칸이 늘어나 장을 채운다. 숫자 · 단위 · 분수 · 각은 모두 제품 KaTeX 경로(MathText — 분수는 크게 그려져 그 줄만 5px 쯤 높다). 문장 행간 2.15.",
    look: "(제안) ① **빈칸 밑줄에 핵심어를 손으로 채워 넣을 수 있는가** — 짧은 핵심어의 빈칸이 너무 좁으면 불합격. **답이 분수 · 단위인 빈칸**(초3 분수 · 들이와 무게 단원)에 분수나 «1000 mL» 를 써 넣을 만한가. ② 밑줄이 옆 글자의 아래 끝과 같은 높이에 있고 옅지 않은가. ③ 번호 «문 n» 과 문장 첫 줄이 같은 줄(기준선)에 서 있고, 둘째 줄은 글 자리에서 시작하는가. ④ **분수 · 대분수가 든 문장**(초3~6 분수 단원 · 중학)이 윗줄 · 아랫줄에 닿지 않고, 수식 글자가 옆 한글과 같은 줄(기준선)에 앉는가. ⑤ 적용 상자의 테두리 · «답» 밑줄 · 풀 자리. ⑥ 장 아래가 비지 않는가. ⑦ 학생지에 핵심어 글자가 한 곳도 없는가. ⑧ 종이에 `$` 나 `\\frac` 같은 글자가 그대로 찍힌 곳이 있으면 불합격.",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §6",
      "docs/planning/tracks/briefs/cb-paper.md",
      "docs/planning/tracks/reports/cb-paper.md",
      "src/components/concept-blank/ConceptBlankPaper.tsx",
      "src/components/concept-blank/paper/paper.module.css",
      "src/components/concept-blank/paper/paginate.ts (packCloze · clozeCost)",
      "src/__tests__/components/ConceptBlankPaper.test.tsx",
      "e2e/concept-blank-paper/overflow.spec.ts",
      "e2e/concept-blank-paper/estimate.spec.ts (줄 수 어림 ≥ 실제)",
      "src/app/(main)/concept-blank/print/page.tsx (인쇄 경로 /concept-blank/print?s=…&view=student|key|both)",
      "src/components/concept-blank/paper/StudentBody.tsx (ClozeBody)",
      "src/components/concept-blank/paper/text.ts (blankWidth · inkEm · wrapLines)",
      "e2e/concept-blank-paper/ink.spec.ts (빈칸 폭 어림 ↔ 그려진 폭 — 수식 핵심어 · 예의 답 전부)",
    ],
    scale: "개념 백지 지면 전부(D-150 새 지면 — 기존 문항 0건)",
    status: "대기",
    needs:
      "«개념 백지» 탭에서 초4~초6 단원을 골라 «문장 빈칸»을 켜고 ① 문장 8 + 적용 2 ② 문장 14 · 적용 0 으로 두 번 뽑는다. 분수 · 단위를 보려면 초3 «분수와 소수» · «들이와 무게»를 한 번 더. «인쇄하기»(인쇄 창이 바로 뜬다)에서 (여백 없음 · 배율 100% · 배경 그래픽 켬).",
    changedOn: "2026-10-01",
  },
  {
    id: "concept-blank-map-a4",
    title: "개념 백지 D 개념 지도 — 금색 원 · 가지 선 · 가지가 장을 채운다",
    changed:
      "새 지면. 장마다 지도 하나(대단원마다, 가지 여섯까지 — 넘치면 같은 대단원의 다음 지도). 가운데 132px 금색 원(흰 글씨) · 금색 곡선 가지 · 칸마다 ○ 확인 동그라미 + 용어 + «뜻» 줄 + «예» 칸(은행에 예가 있으면 물음 + 빈칸, 없으면 빈 칸). 가지는 왼쪽 · 오른쪽 기둥에 번갈아 놓이고 기둥마다 높이를 나눠 채운다 — 가지가 셋이면 왼쪽 둘 · 오른쪽 하나(오른쪽 칸이 길다), 하나면 오른쪽 기둥 없이 넓은 칸 하나.",
    look: "(제안) ① **금색 원의 면 색과 흰 글씨가 찍히는가** — 면이 안 나오면 «배경 그래픽» 켜고 다시, 그래도 없으면 불합격. ② 가지 선이 칸 뒤로 지나가고 칸 글과 겹치지 않으며, 선 끝이 칸의 옆 변 가운데쯤에 닿는가. ③ 가지 칸이 서로 안 겹치고 «뜻» 줄 · «예» 칸이 보이는가. ④ 좌우 칸의 윗변이 같은 높이인가(가지 수가 같은 줄). ⑤ 가지가 여섯보다 적어도 장 아래가 비지 않는가. ⑥ 예 물음 뒤 빈칸 밑줄.",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §6",
      "docs/planning/tracks/briefs/cb-paper.md",
      "docs/planning/tracks/reports/cb-paper.md",
      "src/components/concept-blank/ConceptBlankPaper.tsx",
      "src/components/concept-blank/paper/paper.module.css",
      "src/__tests__/components/ConceptBlankPaper.test.tsx",
      "e2e/concept-blank-paper/overflow.spec.ts",
      "src/app/(main)/concept-blank/print/page.tsx (인쇄 경로 /concept-blank/print?s=…&view=student|key|both)",
      "src/components/concept-blank/paper/StudentBody.tsx (MapBody · mapColumns · wirePaths)",
    ],
    scale: "개념 백지 지면 전부(D-150 새 지면 — 기존 문항 0건)",
    status: "대기",
    needs:
      "«개념 백지» 탭에서 초4~초6 대단원 하나를 골라 «개념 지도»를 켜고 개념 수를 6 · 3 으로 두 번 뽑는다. «인쇄하기»(인쇄 창이 바로 뜬다)에서 (여백 없음 · 배율 100% · 배경 그래픽 켬). 가지 1~6 을 한 번에 보려면 하네스 `?set=counts&view=student`.",
    changedOn: "2026-09-30",
  },
  {
    id: "concept-blank-figure-a4",
    title:
      "개념 백지 E 그림 보고 쓰기 — 그림 카드가 장을 채운다 · 이름표 점선 네모",
    changed:
      "새 지면. 장마다 그림 카드 여섯까지. 카드마다 «문 n» + 물음 · 은행 SVG 를 viewBox 로 감싼 그림 · 이름표 자리에 금색 점선 네모(tags) · 줄 이름 + 밑줄(lines) · 쓰기 줄(이름 줄과 같은 30px 간격). 카드 수에 따라 놓는 법이 다르다 — 넷부터 두 줄기(2×2 · 2×3), 셋까지는 한 줄기의 넓은 카드(그림 왼쪽 · 줄 오른쪽), 다섯이면 마지막 카드가 두 줄기를 다 쓴다. 일곱은 6 + 1 이 아니라 4 + 3.",
    look: "(제안) ① 그림 선(1.6px)이 선명하고 칸 안에 들어가는가. ② **이름표 자리의 금색 점선 네모가 찍히는가** — 안 보이면 학생이 쓸 자리가 없다(불합격). ③ 줄 이름(금색 고딕) · 밑줄 · 쓰기 줄의 간격이 고른가. ④ 나란한 두 카드의 윗변 · 높이가 같은가. ⑤ 카드가 여섯보다 적어도 장 아래가 비지 않는가. ⑥ 학생지 이름표 네모가 비어 있는가(답이 새지 않았는가).",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §6",
      "docs/planning/tracks/briefs/cb-paper.md",
      "docs/planning/tracks/reports/cb-paper.md",
      "src/components/concept-blank/ConceptBlankPaper.tsx",
      "src/components/concept-blank/paper/paper.module.css",
      "src/__tests__/components/ConceptBlankPaper.test.tsx",
      "e2e/concept-blank-paper/overflow.spec.ts",
      "src/app/(main)/concept-blank/print/page.tsx (인쇄 경로 /concept-blank/print?s=…&view=student|key|both)",
      "src/components/concept-blank/paper/StudentBody.tsx (FigureBody · cardGrid)",
      "src/components/concept-blank/paper/FigureSvg.tsx",
    ],
    scale: "개념 백지 지면 전부(D-150 새 지면 — 기존 문항 0건)",
    status: "대기",
    needs:
      "«개념 백지» 탭에서 초4~초6 도형 단원(그림 문항이 있는 소단원)을 골라 «그림 보고 쓰기»를 켜고 문항 수를 6 · 5 · 2 로 세 번 뽑는다. «인쇄하기»(인쇄 창이 바로 뜬다)에서 (여백 없음 · 배율 100% · 배경 그래픽 켬).",
    changedOn: "2026-09-30",
  },
  {
    id: "concept-blank-key-a4",
    title:
      "개념 백지 채점표 — 핵심어 굵게 · 고정 열 폭 · 스물네 줄까지 · 채점 안내",
    changed:
      "새 지면(교사용). 형식마다 채점표 — 번호 · 개념 · 채점 기준(은행의 우리 뜻 문장, `{핵심어}` 는 굵은 갈색 #8a3b12). A 는 소단원 이름 · 예(참고), D 는 예 답, ○× 는 답과 까닭, 적용은 답, E 는 작은 그림 속 이름표 답 + 줄 답. 2026-10-01: 글이 나오는 모든 칸(용어 · 뜻 · **핵심어** · 예 물음/답 · ○× 문장/까닭 · 적용 물음/답 · 그림 물음 · 줄 이름/답 · 이름표 목록 · 자리 글)이 제품 KaTeX 경로를 지난다 — 그림 속 이름표(SVG 글자)만 글자 그대로. **수식은 둘레 글의 굵기를 따른다**: 굵은 핵심어 · 굵은 용어 · 굵은 답 안의 숫자 · 단위 · 분수도 굵게(KaTeX 굵은 벌) 나온다. 열 폭은 고정(번호 44px · 개념 130px · 나머지)이고 세 칸의 첫 줄 기준선을 맞춘다. 장마다 스물네 줄까지(줄 수 어림으로 장이 차면 먼저 넘긴다) · 마지막 장 아래 «채점» 안내 상자 — 학생지와 번호 · 순서가 같다. 🔴 시안의 «교재 문장» 칸은 옮기지 않았다(교재 원문).",
    look: "(제안) 채점표만(?view=key) 인쇄해 ① **굵은 핵심어가 흑백 프린터에서도 굵기로 구별되는가**(갈색이 회색으로만 나와 구별이 안 되면 불합격). **핵심어가 숫자 · 단위 · 분수일 때도**(«1000 m» · 분수) 옆 글보다 굵게 보이는가. ② 금색 표 머리선 · 줄 사이 옅은 선 · 번호 / 개념 / 채점 기준 열이 줄마다 같은 자리인가. ③ E 줄의 작은 그림 속 이름표 답 글씨가 읽히는가(긴 답은 글씨를 줄여 넣는다 — 읽을 수 없으면 불합격). 분수 · 대분수 · 근호가 든 줄이 윗줄 · 아랫줄과 겹치지 않고, 좁은 개념 열에서 긴 식이 칸 밖으로 나가지 않는가. ④ 채점 안내 상자가 마지막 장 아래에만 있는가. ⑤ 학생지의 «문 n» 과 채점표 번호가 같은 문항인가. ⑥ 🔴 «교재 문장» 머리나 교재 쪽수가 보이면 불합격. ⑦ 종이에 `$` 나 `\\frac` 같은 글자가 그대로 찍힌 곳이 있으면 불합격. ⑧ 마지막 장은 줄이 적으면 표와 안내 상자 사이가 빈다(알려진 것 — 교사용이라 채우지 않았다).",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §6",
      "docs/planning/tracks/briefs/cb-paper.md",
      "docs/planning/tracks/reports/cb-paper.md",
      "src/components/concept-blank/ConceptBlankPaper.tsx",
      "src/components/concept-blank/paper/paper.module.css",
      "src/components/concept-blank/paper/paginate.ts (packKeyPages · keyRowCost)",
      "src/__tests__/components/ConceptBlankPaper.test.tsx",
      "e2e/concept-blank-paper/overflow.spec.ts",
      "e2e/concept-blank-paper/estimate.spec.ts (줄 높이 어림 ≥ 실제)",
      "e2e/concept-blank-paper/measure.ts (새는 마크업 · 수식 오류 · 핵심어 수식 굵기 자)",
      "src/app/(main)/concept-blank/print/page.tsx (인쇄 경로 /concept-blank/print?s=…&view=student|key|both)",
      "src/components/concept-blank/paper/KeyBody.tsx",
      "src/components/concept-blank/paper/PaperParts.tsx (KeySentence · PaperText)",
    ],
    scale: "개념 백지 지면 전부(D-150 새 지면 — 기존 문항 0건)",
    status: "대기",
    needs:
      "위 다섯 지면을 뽑을 때 «학생지 + 채점표»로 같이 뽑으면 채점표가 뒤에 붙어 나온다(`?view=both`). 채점표만은 주소 끝을 `&view=key` 로. 수식 핵심어는 초3 «길이와 시간» · «분수와 소수» 단원에 많다.",
    changedOn: "2026-10-01",
  },
  {
    id: "concept-blank-sheet-code",
    title: "개념 백지 지면 코드 — 폰으로 찍어 읽히는가",
    changed:
      "학생지 · 채점표 **모든 장** 맨 아래에 작은 고딕 한 줄 «1ABC.DEFG.… · 쪽/전체쪽 · 학생지|채점표»(오른쪽 맞춤 · 9px). 사진 채점의 첫 걸음(3자 합의 안건 7 · 26 §8) — 지금은 코드만 찍고 올리기 · AI 는 없다. 코드는 Crockford base32 글자(헷갈리는 I · L · O · U 없음 · 네 글자마다 점)로 고르기(소단원 · 형식 · 수)와 은행 지문을 싣는다 — 학생 이름 · 제목 · 날짜는 싣지 않는다. 쪽 번호는 몫(학생지 · 채점표)마다 형식을 넘어 1 부터 센다(머리의 «p. N» 은 형식 안의 번호 그대로). 줄 한 줄만큼 장의 몸 높이 예산을 낮췄다.",
    look: "(제안) ① 코드 줄이 **모든 장**의 맨 아래에 있고 프린터가 자르지 않는가(종이 끝에서 5mm 넘게 떨어져 있다). ② **폰으로 장을 통째로 찍어**(평소 채점할 때처럼 책상 위에서 한 장씩) 사진을 확대했을 때 코드 글자를 하나도 틀리지 않고 옮겨 적을 수 있는가 — 특히 `8`/`B` · `5`/`S` · `2`/`Z` · `0`/`D` 가 갈리는가. 옮겨 적은 코드를 하네스 · 시험에서 `decodeSheetCode` 에 넣어 고르기가 돌아오면 통과. ③ 학생지 묶음 · 채점표 묶음에서 «n/N» 이 1 부터 빠짐없이 이어지는가. ④ 코드 줄이 발(맞은 개수 · 오늘의 메모) · 채점 안내 상자와 겹치지 않는가. ⑤ 글씨가 너무 옅어 흑백 프린터에서 회색으로 뭉개지면 불합격.",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §8",
      "docs/planning/tracks/briefs/cb-code.md",
      "docs/planning/tracks/reports/cb-code.md (코드 꼴 · 길이 실측 · 지면 자리 캡처)",
      "docs/planning/tracks/reports/consult-27/consensus.md §1 안건 7",
      "src/lib/concept-blank/sheetCode.ts (encodeSheetCode · decodeSheetCode)",
      "src/components/concept-blank/paper/PaperParts.tsx (SheetCodeLine)",
      "src/components/concept-blank/ConceptBlankPaper.tsx",
      "src/components/concept-blank/paper/paginate.ts (GEOMETRY — 코드 줄만큼 낮춘 몸 높이)",
      "src/__tests__/unit/conceptBlankSheetCode.test.ts",
      "src/__tests__/components/ConceptBlankPaperCode.test.tsx",
      "e2e/concept-blank-paper/overflow.spec.ts",
    ],
    scale: "개념 백지 지면 전부",
    status: "대기",
    needs:
      "«개념 백지» 탭에서 형식 둘 이상 · 장이 여럿 나오게 골라 «인쇄하기»(인쇄할 지면 «전체» — 인쇄 창이 바로 뜬다)에서 (여백 없음 · 배율 100% · 배경 그래픽 켬). 긴 코드를 보려면 학년을 넘어 소단원 열 개를 띄엄띄엄 고른다.",
    changedOn: "2026-10-01",
  },
  {
    id: "concept-blank-ten-per-level",
    title:
      "개념 백지 — 하 · 중 · 상 10개씩(처음 값) 지면이 넘침 없이 이어지는가",
    changed:
      "원장님 2026-10-01 «하/중/상 10문제씩»(26 §9). 형식 카드의 처음 값이 «재고 전부»에서 **10** 으로 바뀌었고, 은행 3차가 소단원마다 개념 · ○× · 적용을 난이도별 10개씩 채운다 — 한 형식이 이제 30~60문항이라 장 수가 크게 는다. 소단원을 여럿 고르면 한 난이도의 수를 **소단원 차례로 하나씩 돌려** 고르게 나눈다(전에는 앞 소단원부터 채워 뒤 소단원이 빠졌다).",
    look: "(제안) ① 소단원 **하나** · 형식 다섯 · 처음 값 그대로 «전체» 인쇄 — 형식마다 장이 넘침 없이 이어지는가(잘린 줄 · 겹친 칸 · 빈 장이 있으면 불합격). ② 개념 지도(D)가 가지 여섯씩 여러 장으로 나뉘고 «(1) · (2) …» 번호가 맞는가. ③ 소단원 **셋**을 골라 «용어 → 뜻» 하 10 — 세 소단원의 용어가 고루(4 · 3 · 3) 소단원 차례로 찍히는가. ④ 같은 개념을 난이도로 나눠 물은 용어(«받아올림» · «받아올림이 두 번 생길 때»)가 학생에게 다른 물음으로 읽히는가 — 헷갈리는 짝은 적어 둔다. ⑤ 채점표가 학생지와 같은 차례 · 같은 수인가.",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §9",
      "docs/planning/tracks/briefs/cb-ten.md",
      "src/lib/concept-blank/compose.ts (takeByLevel — 소단원 차례로 돌려 뽑기)",
      "src/components/concept-blank/ConceptBlankView.tsx (DEFAULT_COUNT)",
      "src/lib/concept-blank/bank/plus.ts (은행 3차 보강 — 학년 파일 e3-plus.ts … m3-plus.ts 를 얹는 자리)",
      "src/__tests__/unit/conceptBlankCompose.test.ts",
    ],
    scale: "개념 백지 지면 전부 — 형식 하나가 30~60문항",
    status: "대기",
    needs:
      "은행 3차(트랙 cb-ten-e3 … m3)가 main 에 병합된 뒤 — 그 전에는 소단원에 난이도별 1~2개뿐이라 10이 안 찬다. 학년 하나에서 소단원 하나, 다른 학년에서 소단원 셋을 골라 두 번 뽑는다(여백 없음 · 배율 100% · 배경 그래픽 켬).",
    changedOn: "2026-10-01",
  },
  {
    id: "concept-blank-review-key-notes",
    title:
      "개념 백지 — 채점 안내 문구(뜻 기준 · 꼴은 느슨하게) · 그림의 «금색» 지시와 한 글자 단위",
    changed:
      "전수 검토 반영(26 §10 · grok 합의). ① 채점표 아래 «채점» 상자의 글이 바뀌고 줄이 늘었다 — A «굵은 부분의 뜻이 다 있으면 ○, 하나 빠지면 △, 없으면 ×» + «말 · 식의 꼴이 달라도 뜻이 같으면 있는 것으로 본다»(세 줄 — 고른 소단원에 사례 문항이 있어 채점표에서 뺐을 때만 그 줄 끝에 «용어에 주어진 값으로 답이 정해지는 사례 문항은 싣지 않았다»가 붙는다), B «굵은 부분의 뜻이 모두 있어야 ○. 말 · 식 · 단위의 꼴이 달라도 된다»(+ 굵은 글이 용어 이름 그 자체인 줄이 있으면 «굵은 글이 용어와 같으면 그 이름은 답이 아니다 …»), C «같은 값 · 같은 뜻의 다른 꼴도 ○», D 에 «뜻» 기준 한 줄. 전에는 «굵은 핵심어가 다 들어가야 ○»였다. ② 그림 물음의 «금색»을 지면에 있는 단서로 바꿨다(27개 — «이름표가 가리키는 선분» · «색칠한 항목» · «점 G» …) — 획은 그대로다. 초3 시간 띠는 1분 40초 구간이 50초 구간의 두 배 길이로, 초5 삼각형의 높이는 꼭짓점에서 내린 점선으로, 중2 포함 관계 그림은 왼쪽 타원에 «직사각형»을 적고 이름표를 둘로. ③ 그림 속 `650 m` · `850 g` · `2 kg 100 g` 의 한 글자 단위가 기울어 찍히던 것을 세웠다(초3 다섯 곳 · 초6 «한 모서리 1 m» 한 곳 — `1 km` 은 원래 섰다). ④ 은행 110문항의 글이 바뀌었다(확정 오류 · 해설 · 빈칸 충돌 · 가리킴말 예) — 예: `e5-1-3-3-xc28` 의 «3, mathrmm» 이 «3 m» 로.",
    look: "(제안) 채점표만(?view=key) 형식 넷을 뽑아 ① «채점» 상자가 마지막 장 아래에 **잘리지 않고** 들어가는가(줄이 늘었다 — 상자가 발 라벨이나 표와 겹치면 불합격) ② 상자 글이 위에 적은 문구인가 — «핵심어가 다 들어가야»가 남아 있으면 불합격. ③ **흑백으로** 그림 보고 쓰기(E)를 뽑아 초6 «1-2 각기둥과 각뿔» · «2-6 원기둥, 원뿔, 구», 중1 «7. 입체도형», 중2 «2. 부등식»의 그림에서 물음이 가리키는 것을 색 없이 찾을 수 있는가(물음에 «금색»이 남아 있거나 가리키는 것을 못 찾으면 불합격). ④ 초3 «2-5 들이와 무게» · «1-5 길이와 시간»의 그림에서 `650 m` · `1 L` · `850 g` · `2 kg 100 g` 의 단위 글자가 **곧게** 서 있는가(초6 «1-6 직육면체의 겉넓이와 부피 · 1-6-3»의 «한 모서리 1 m»도), 시간 띠의 앞 구간이 뒤 구간보다 긴가. ⑤ 초5 «1-3 대응 관계 · 1-3-3» 문장 빈칸(C)에서 «한 층의 높이가 3 m로 같으면»이 바르게 찍히는가(«3, mathrmm» 이면 불합격).",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §10",
      "docs/planning/tracks/reports/consult-cb-review/consensus.md (안건 3 · 11)",
      "src/components/concept-blank/paper/paginate.ts (keyNotes)",
      "src/lib/concept-blank/figureTypeset.ts (uprightUnits)",
      "src/__tests__/unit/conceptBlankKeyNotes.test.ts",
      "src/__tests__/components/ConceptBlankFigureSvg.test.tsx",
    ],
    scale:
      "채점표 전부(형식 넷의 채점 안내) · 그림 33문항(금색 27 · 따로 짚인 여섯) · 초3 그림 다섯(단위) · 은행 110문항",
    status: "대기",
    needs:
      "채점표는 문항 수가 많아 표가 장을 꽉 채우는 고르기로 뽑는다(소단원 하나 · 형식 넷 · 처음 값 10). 길어진 용어는 따로 본다(«concept-blank-review-terms»).",
    changedOn: "2026-10-02",
  },
  {
    id: "concept-blank-review-terms",
    title:
      "개념 백지 — 길어진 용어(용어 칸에 조건을 실었다) · 완전 백지 채점표의 줄 수",
    changed:
      "전수 검토 반영(26 §10.5 — 학년 트랙 일곱). ① 개념 4,604장의 글이 바뀌었고 그 가운데 3,309장은 **용어**가 바뀌었다 — «단위가 있는 곱» 같은 일반 제목이 «$4\\,\\mathrm{m}$의 $0.3$배 구하기»처럼 조건(수 · 식 · 상황)을 싣는다. 용어는 40자 안이지만 수식이 들어 전보다 길다(가장 긴 것: «$3\\,\\mathrm{kg}\\ 200\\,\\mathrm{g}$인 사과 상자에서 사과가 $2\\,\\mathrm{kg}\\ 600\\,\\mathrm{g}$일 때 빈 상자»). 그 용어는 «용어 → 뜻»(B) 학생지의 문항 머리, 채점표의 좁은 «개념» 칸(118px), 개념 지도(D)의 가지에 찍힌다. ② 사례 문항 3,059장은 «완전 백지»(A) 채점표에 안 실린다 — 초등 계산 소단원은 A 채점표가 난이도마다 1~3줄까지 줄었다(줄 끝에 «…사례 문항은 싣지 않았다»가 붙는다). ③ ○× 322 · 적용 534문항에 조건이 붙어 문장이 길어졌다.",
    look: "(제안) 초3 «2-5 들이와 무게 · 2-5-6» · 초5 «2-2 분수의 곱셈» · 중3 «5. 삼각비 · 삼각비의 활용»을 형식 넷(A · B · C · D) · 처음 값 10 으로 학생지 + 채점표를 뽑아 ① «용어 → 뜻» 학생지에서 긴 용어가 **한 문항 칸 안에서 접히고** 쓰기 줄을 덮지 않는가 ② 채점표 «개념» 칸에서 분수 · 단위가 든 굵은 용어가 칸 밖으로 나가거나 옆 칸 글과 겹치지 않는가(겹치면 불합격) ③ 개념 지도의 가지 이름이 가지 상자 안에 들어가는가 ④ 채점표 장의 아래가 **1/3 넘게 비어 보이는가** — 비어도 불합격은 아니다(줄 수 어림이 넉넉한 탓 · 26 §10.4 의 빚), 다만 얼마나 비는지 적어 둔다 ⑤ A 채점표가 난이도마다 한두 줄뿐인 소단원(초3 «2-4 분수 · 2-4-3 분수만큼은 얼마인지 알아보기 (2)» — 하 1 · 중 3 · 상 1)을 뽑아 채점 안내 상자가 표 바로 아래가 아니라 **장 아래**에 붙어 있고 안내 둘째 줄에 «사례 문항은 싣지 않았다»가 있는가.",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §10.4 · §10.5",
      "docs/planning/tracks/reports/cb-review-e3.md … cb-review-m3.md",
      "e2e/concept-blank-paper/overflow.spec.ts (plus-* — 보강 은행 전수 12,407장 넘침 0)",
      "src/lib/concept-blank/bank/e3-plus.ts",
    ],
    scale:
      "은행 5,493문항(개념 4,604 · ○× 322 · 적용 534 · 그림 33) · 용어가 바뀐 3,309장 · 사례 표지 3,059장 · 채점표 가운데 1/4 넘게 비는 장 219/12,407",
    status: "대기",
    needs:
      "인쇄 매체 하네스는 넘침 0 을 쟀다(일흔두 대단원). 종이에서 볼 것은 «읽히는가»다 — 좁은 칸에서 세 줄로 접힌 굵은 수식 용어가 읽기 어려우면 그 용어를 줄이거나 칸 폭을 넓히는 쪽을 정한다.",
    changedOn: "2026-10-03",
  },
  {
    id: "concept-blank-havruta-apply",
    title:
      "개념 백지 — «나» 칸은 설명하는 칸(머리말 · 채점 안내) · 까닭이 든 문장 답",
    changed:
      "«개념을 묻는다»(26 §11 — 원장님 «개념에 관한 백지 테스트 · 직접 설명하게 하는 것»). ① «문장 빈칸»(C) 학생지의 «나» 머리말이 «방금 쓴 뜻으로 풀어 보시오.» → **«방금 쓴 뜻으로 답하고, 까닭을 쓰시오.»**, 지면 머리의 목표 줄도 «…방금 쓴 뜻으로 까닭을 설명한다.» ② C 채점표의 안내 «나» 줄에 **«결론과 까닭이 다 있어야 ○ — 말이 달라도 뜻이 같으면 된다.»** 가 붙었다. ③ 적용 문항이 «…을 계산하시오 → $248$» 에서 «…세 자리 수가 되는 까닭을 쓰시오 → 십의 묶음 $24$개 가운데 $20$개가 백의 묶음 $2$개로 바뀌기 때문이다.» 꼴로 바뀐다 — 채점표 «나» 칸의 답이 수 하나에서 한 문장(80자 안)으로 길어진다. 학생지의 풀 자리(문항마다 120px 이상 + «답» 줄)는 그대로다. 시범은 초3 «1-4 곱셈 · 1-4-3 십의 자리에서 올림이 있는 (몇십몇)×(몇)» 한 소단원이고 나머지는 학년 트랙이 차례로 바꾼다.",
    look: "(제안) 초3 «1-4 곱셈 · 1-4-3»을 «문장 빈칸»(C) · 처음 값 10 으로 학생지 + 채점표를 뽑아 ① «나» 머리말이 새 문구이고 한 줄에 들어가는가 ② 학생이 «답» 줄과 그 위 풀 자리에 **한두 문장**을 쓸 수 있는가(줄이 모자라 보이면 적어 둔다) ③ 채점표 «나» 칸에서 긴 답 문장이 칸 안에서 접히고 옆 칸과 겹치지 않는가 ④ 채점 안내 상자의 «나» 줄이 두 줄로 접혀도 상자 밖으로 나가지 않는가.",
    lookFromSource: false,
    evidence: [
      "docs/planning/26-concept-blank.md §11",
      "src/components/concept-blank/paper/StudentBody.tsx (ClozeBody — «나» 머리말)",
      "src/components/concept-blank/paper/paginate.ts (keyNotes — cloze 의 «나» 줄)",
      "src/__tests__/unit/conceptBlankKeyNotes.test.ts",
      "src/lib/concept-blank/bank/e3-plus.ts",
    ],
    scale:
      "C 형식 학생지 · 채점표 전부(머리말 · 안내) · 적용 문항은 시범 소단원 하나부터(줄에 선 적용 9,452문항이 차례로 바뀐다)",
    status: "대기",
    needs:
      "머리말 문구는 리드와 codex · grok 이 «풀어 보시오»를 바꿔야 한다는 데 뜻이 같았고 문구는 리드가 골랐다 — 다른 문구가 좋으면 그 한 줄만 바꾸면 된다. 지면 하네스는 그 대단원의 넘침 0 을 쟀다.",
    changedOn: "2026-10-03",
  },
  {
    id: "english-bundle-sheets",
    title: "오늘 영어 — 학생용 묶음 분리 (묶음마다 따로 뽑기 · 머리의 묶음 줄)",
    changed:
      "학생용이 한 장짜리에서 **순서가 있는 묶음**으로 바뀌었다(D-151 · 3자 합의). 변형 문항(어법 · 빈칸 · 삽입)은 원 지문 " +
      "상자 없이 앞 묶음, 원 지문 + 독해형(주제 · 내용 일치 · 서술형)은 맨 뒤 묶음. 다른 문항의 답을 지문으로 보여 주는 " +
      "변형 문항은 그 뒤 묶음으로 갈린다. 인쇄 화면에서 묶음을 **하나씩 골라** 뽑는다(한 묶음 = 한 인쇄 작업). " +
      "머리의 시험 줄 아래에 고딕 13px 굵은 한 줄 «문제 묶음 1 · 3~4번»이 생겨 **첫 쪽 머리가 약 26px 늘었다**. " +
      "이어지는 쪽 머리는 «문제 묶음 1 · p. 2». 문항 번호는 세트 번호 그대로(묶음 1 이 3번부터 시작할 수 있다).",
    look:
      "(제안) 묶음을 하나씩 골라 전부 뽑아 ① **변형 묶음의 종이에 원 지문 상자가 없는가** — 있으면 불합격(답이 보인다). " +
      "② 묶음마다 머리에 «문제 묶음 N · 수록 문항»이 읽히는가(걷은 종이를 묶음별로 가를 수 있는가). 화면의 단추와 " +
      "번호 · 문항이 같은가. ③ 고른 묶음**만** 나왔는가 — 다른 묶음의 문항이 같은 인쇄에 섞여 나오면 불합격. 양면으로 " +
      "뽑아도 두 묶음이 한 장의 앞뒤에 붙지 않는가. ④ 화면 단추의 쪽 수와 나온 장수가 같은가. 늘어난 머리 때문에 " +
      "마지막 문항이 **쪽 아래에서 잘리지 않는가**(잘리면 불합격 — 넘치면 다음 쪽으로 가야 한다). ⑤ 학생 종이에 " +
      "«걷은 뒤» 같은 배부 안내 문장이 **없는가**. ⑥ 묶음이 하나뿐인 세트(독해형만)는 머리에 묶음 줄이 없는가. " +
      "🔴 실사용 확인(종이가 아니라 수업에서): 화면은 순서를 막지 않는다 — 배부 순서 카드가 화면 위로 올라간 뒤에도 " +
      "묶음 1 → 걷기 → 묶음 2 순서를 따르게 되는가.",
    lookFromSource: false,
    evidence: [
      "docs/planning/25-english-studio.md §12.11 (3자 합의 — Wire · Hi-fi)",
      "docs/design/mockups/hifi-d151-english-student-bundles.html",
      "src/lib/english/bundle.ts (묶음 짓기 · 문장)",
      "src/components/english/print/EnglishPrintClient.tsx (묶음 단추 · 배부 안내)",
      "src/components/english/print/EnglishPaper.tsx (bundle · .bundleLine)",
      "src/__tests__/unit/englishBundle.test.ts",
      "src/__tests__/components/EnglishPrintClient.test.tsx",
      "인쇄 경로 /english/sets/{세트id}/print?view=student&bundle=1",
    ],
    scale:
      "오늘 영어 세트 전부 — 변형 문항과 독해형이 같이 있는 세트는 묶음 둘 이상",
    status: "대기",
    needs:
      "여섯 유형이 다 든 세트 하나(AI 생성 기본값). 누출 줄에 «…묶음 2로 두었습니다»가 뜨는 세트면 묶음이 셋이다 " +
      "(실제 세트의 60% 쯤). 독해형만 있는 세트 하나를 더 뽑으면 ⑥ 까지 본다.",
    changedOn: "2026-10-01",
  },
  {
    id: "english-grammar-underline",
    title: "오늘 영어 — 어법의 밑줄 (꺾쇠 글자 → 글자 밑줄 1px · 0.3em)",
    changed:
      "어법 문항의 `①<u>표현</u>` 표기를 지금까지 **글자 그대로** 찍었다(꺾쇠가 종이에 보였다). 이제 밑줄로 그린다 — " +
      "글자 밑줄(`text-decoration`) · 굵기 1px · 기준선 아래 0.3em · 내림 글자(g · y · p)에서 선을 끊지 않는다 " +
      "(끊으면 밑줄 구간의 끝이 모호하다). 번호 ①~⑤ 는 선 밖. 줄이 바뀐 구간은 줄마다 이어진다. 학생용 · 교사용 같다. " +
      "🔴 0.3em 은 **검수 시작값**이다(3자 합의) — 화면 4배 확대에서는 안 닿았지만 종이는 아직 안 봤다.",
    look:
      "(제안) 어법 문항이 든 묶음을 뽑아 ① **꺾쇠 `<u>` · `</u>` 글자가 한 글자라도 보이면 불합격**. ② 밑줄이 g · y · p " +
      "의 **아래 끝과 닿거나 겹치는가** — 닿으면 0.32em 으로 내려 다시(그래도 닿으면 다시 협의). ③ 밑줄이 **다음 줄 " +
      "글자에 더 가까워 보여** 어느 줄의 밑줄인지 헷갈리는가. ④ 번호 ①~⑤ 아래에 선이 있는가(있으면 불합격). " +
      "⑤ 두 줄에 걸친 밑줄이 **줄마다 이어지는가**(둘째 줄에서 끊기면 불합격). ⑥ 1px 선이 종이에서 **옅어 사라지지 " +
      "않는가**. ⑦ 줄 끝에서 밑줄이 낱말 뒤 빈칸까지 조금 이어진다 — 거슬리는 정도인가(브라우저 동작 · 참고).",
    lookFromSource: false,
    evidence: [
      "docs/planning/25-english-studio.md §12.11 (라-1)",
      "src/lib/english/underline.ts",
      "src/components/english/print/EnglishPaper.tsx (PromptText)",
      "src/components/english/print/EnglishPrint.module.css (.underline)",
      "src/__tests__/unit/englishUnderline.test.ts",
      "src/__tests__/components/EnglishPrintPaper.test.tsx",
    ],
    scale:
      "AI 로 만든 어법 문항 전부(지금 프롬프트는 389개 가운데 386개가 밑줄 다섯 쌍) — 옛 세트 · 붙여넣기 세트는 밑줄이 없을 수 있다(그때는 학생용 인쇄가 막힌다)",
    status: "대기",
    needs:
      "AI 로 만든 어법 문항이 든 세트. 밑줄 구간에 g · y · p 가 있고 **두 줄에 걸친 구간**이 하나는 있어야 ② · ⑤ 가 보인다.",
    changedOn: "2026-10-01",
  },
  {
    id: "english-vocab-underline",
    title: "오늘 영어 — 어휘의 밑줄 (어법과 같은 글자 밑줄 1px · 0.3em)",
    changed:
      "어휘 문항도 어법과 같이 `①<u>표현</u>` 를 글자 밑줄로 그린다. 굵기 1px · 기준선 아래 0.3em · " +
      "내림 글자에서 선을 끊지 않는다. 번호 ①~⑤ 는 선 밖. 꺾쇠 글자는 종이에 보이지 않아야 한다.",
    look:
      "(제안) 어휘 문항이 든 묶음을 뽑아 ① **꺾쇠 `<u>` · `</u>` 글자가 한 글자라도 보이면 불합격**. ② 밑줄이 g · y · p " +
      "의 **아래 끝과 닿거나 겹치는가**. ③ 번호 ①~⑤ 아래에 선이 있는가(있으면 불합격). 어법 밑줄 항목과 같은 출력에서 같이 본다.",
    lookFromSource: false,
    evidence: [
      "docs/planning/tracks/reports/english-upgrade-20261001/plan-final.md",
      "src/lib/english/underline.ts",
      "src/components/english/print/EnglishPaper.tsx (PromptText)",
      "src/components/english/print/EnglishPrint.module.css (.underline)",
    ],
    scale:
      "어휘 문항이 든 세트. 밑줄 구간에 g · y · p 가 하나는 있어야 ② 가 보인다.",
    status: "대기",
    needs:
      "어휘 밑줄이 든 학생용 · 교사용 한 부. 어법 밑줄 항목(english-grammar-underline)과 같이 본다.",
    changedOn: "2026-10-01",
  },
  {
    id: "english-teacher-head-notes",
    title: "오늘 영어 — 교사용 머리의 안내 줄 (배부 순서 · 답이 보이는 문항)",
    changed:
      "교사용 첫 쪽 머리의 이름 줄 아래에 안내가 생겼다 — «배부 순서 — 묶음 1(3~4번) → 걷은 뒤 묶음 2(5번) → …» · " +
      "«답이 보이는 문항 — 5번의 지문에 3번 · 4번의 답»(없으면 «검사에서 찾은 누출 없음»). 어법의 밑줄 표기가 깨진 " +
      "세트는 셋째 줄 «밑줄 표기 — 3번: 밑줄 구간 없음». 고딕 11px · 이름표는 굵게 · 값은 줄이지 않고 줄바꿈한다. " +
      "교사용은 학생용 묶음과 관계없이 **모든 문항**을 싣는다. 머리가 두 줄이면 약 35px 늘어난다.",
    look:
      "(제안) 교사용으로 뽑아 ① 안내 두 줄이 **첫 쪽에만** 있는가. ② 이름표(«배부 순서» · «답이 보이는 문항»)가 " +
      "두 줄로 접히지 않는가. ③ 값이 길어 줄이 바뀔 때 **이름 줄 · 본문과 겹치지 않는가**. ④ 늘어난 머리 때문에 " +
      "첫 쪽 마지막 블록이 **잘리지 않는가**. ⑤ 화면의 배부 순서 · 누출 줄과 **같은 묶음 번호 · 같은 문항**을 말하는가. " +
      "⑥ 학생용을 어느 묶음으로 골라 뒀든 교사용에 **모든 문항**이 있는가.",
    lookFromSource: false,
    evidence: [
      "docs/planning/25-english-studio.md §12.11 (다)",
      "src/components/english/print/EnglishPaper.tsx (teacherNotes)",
      "src/components/english/print/EnglishPrint.module.css (.teacherNotes)",
      "src/lib/english/bundle.ts (englishBundleNotices — order · shown)",
      "src/__tests__/components/EnglishPrintPaper.test.tsx",
      "인쇄 경로 /english/sets/{세트id}/print?view=teacher",
    ],
    scale: "묶음이 둘 이상인 세트의 교사용 전부",
    status: "대기",
    needs:
      "`english-bundle-sheets` 와 같은 세트를 교사용으로 한 번 더. 누출 짝이 있는 세트면 둘째 줄에 문항이 적힌다.",
    changedOn: "2026-10-01",
  },
  {
    id: "english-bare-choice-marks",
    title: "오늘 영어 — 번호뿐인 보기(삽입 · 어법)의 보기 줄",
    changed:
      "보기 값이 번호 글자뿐인 문항이 «① ①» · «② ②»로 번호를 두 번 찍던 것을 고쳤다(25 §12.12 「3」 — 3자 합의). " +
      "다섯 보기가 모두 자기 번호뿐이고 발문에 ①~⑤ **자리**(«( ① )» · «①<u>…</u>»)가 다 있으면 **보기 줄을 찍지 않는다** — " +
      "수능 꼴, 글 속 번호에 표시. «①~⑤ 가운데»처럼 말로만 든 번호는 자리로 세지 않는다. 자리가 모자라면 번호만 다섯 줄. " +
      "보기 글이 자기 번호로 시작하면(«① grow») 그 번호 하나만 걷는다. 학생용 · 교사용 같다(교사용 «정답 ③» 상자는 그대로).",
    look:
      "(제안) ① 삽입 문항 — 보기 줄 없이 글 속 ( ① )~( ⑤ ) 만 있는가, 학생이 표시할 자리가 분명한가. " +
      "② 밑줄형 어법(«①<u>…</u>» · 보기 «1»~«5») — 보기 줄이 없는가. ③ 보기 글이 있는 어법(«① grow») — 번호가 한 번만 찍히는가. " +
      "④ 교사용 정답 상자에 «정답 ③» 이 있는가. ⑤ 보기 줄이 빠져 문항이 짧아진 뒤 쪽 나눔이 어긋나지 않는가(잘림 · 빈 쪽).",
    lookFromSource: false,
    evidence: [
      "src/lib/english/options.ts (englishOptionLayout)",
      "src/components/english/print/EnglishPaper.tsx (QuestionBlock)",
      "src/__tests__/unit/englishOptions.test.ts",
      "src/__tests__/components/EnglishPrintPaper.test.tsx",
      "인쇄 경로 /english/sets/{세트id}/print?view=student · ?view=teacher",
    ],
    scale: "삽입 문항 · 밑줄형 어법 문항이 든 세트",
    status: "대기",
    changedOn: "2026-10-01",
  },
  {
    id: "english-four-choice-unmentioned",
    title: "오늘 영어 — «언급 없음»의 보기 넷",
    changed:
      "객관식은 보기 다섯 고정이었다. 학교 시험의 «윗글을 읽고 알 수 없는 것은?»이 4지선다라, 새 유형 «언급 없음»만 보기 넷도 받는다" +
      "(D-158 · 25 §13 — 원장님 2026-10-06 «부딪히는 거 다 해결하는 방향으로»). 다른 객관식은 그대로 다섯이다. " +
      "보기 줄은 지금 규칙 그대로 세로 한 줄씩이라 ①~④ 네 줄이 찍힌다 — 새 배치는 없다(학교 시험지의 2×2 배치는 따르지 않았다).",
    look:
      "(제안) ① 보기가 네 줄이고 다섯째 빈 줄이나 번호가 없는가. ② 한국어 명사구 보기의 번호 간격 · 글줄이 다섯 보기 문항과 같은가. " +
      "③ 교사용 정답 상자의 번호가 ①~④ 안인가. ④ 다섯 보기 문항과 한 장에 섞였을 때 문항 사이 간격이 고른가.",
    lookFromSource: false,
    evidence: [
      "src/contracts/english.contract.ts (ENGLISH_FOUR_CHOICE_TYPES)",
      "src/lib/english/validate.ts (보기 수 · 정답 번호 범위)",
      "src/components/english/print/EnglishPaper.tsx (QuestionBlock)",
      "src/__tests__/unit/englishTypeExpansion.test.ts",
      "src/__tests__/components/EnglishPrintPaper.test.tsx",
      "인쇄 경로 /english/sets/{세트id}/print?view=student · ?view=teacher",
    ],
    scale: "«언급 없음» 문항과 다섯 보기 문항이 같이 든 세트",
    status: "대기",
    changedOn: "2026-10-06",
  },
  {
    id: "english-open-types-d158",
    title:
      "오늘 영어 — 보기 없는 새 유형(해석 · 영영풀이 · 공통 빈칸 · 문장 전환 · 단어 배열)",
    changed:
      "보기 없는 유형 다섯을 더했다(D-158 · 25 §13). 종이는 서술형과 같다 — 발문 아래 50px 밑줄 답란 한 줄, 교사용은 정답 · 해설 · 근거 상자" +
      "(새 시안 없음 — 어휘를 어법과 같은 종이로 들인 것과 같은 처리). 공통 빈칸 · 단어 배열은 문장을 원 지문에서 가져오면 원 지문 상자가 답을 보여 주므로 " +
      "변형 묶음(원 지문 상자 없는 앞 묶음)으로 찍히고, 해석 · 영영풀이 · 문장 전환은 원 지문과 함께 독해 묶음에 남는다. " +
      "원문의 최소 길이도 20자로 낮췄다 — 안내문 · 라벨 같은 짧은 실용문이 지문 상자에 줄바꿈 그대로 들어간다.",
    look:
      "(제안) ① 해석 · 문장 전환 · 단어 배열의 답(문장 하나)을 한 줄 답란에 쓸 수 있는가 — 모자라면 유형별 줄 수를 정해야 한다(원장님 결정). " +
      "② 공통 빈칸의 ① ② ③ 문장이 줄마다 갈려 찍히고 빈칸 밑줄이 눈에 띄는가. ③ 단어 배열의 «( 말 / 말 / 말 )» 줄이 줄 끝에서 괄호만 넘어가지 않는가. " +
      "④ 공통 빈칸 · 단어 배열이 원 지문 상자와 다른 묶음으로 나오는가(같은 장에 원 지문이 없는가). " +
      "⑤ 여러 줄 안내문을 원문으로 넣었을 때 지문 상자에서 줄바꿈이 유지되는가.",
    lookFromSource: false,
    evidence: [
      "src/contracts/english.contract.ts (ENGLISH_OPEN_TYPES · ENGLISH_SOURCE_PASSAGE_MIN)",
      "src/lib/english/leak.ts (VARIANT_TYPES · 단어 배열의 답 자리)",
      "src/lib/english/bundle.ts (planEnglishBundles)",
      "src/components/english/print/EnglishPaper.tsx (answerBlank)",
      "src/__tests__/unit/englishTypeExpansion.test.ts",
      "src/__tests__/components/EnglishPrintPaper.test.tsx",
      "인쇄 경로 /english/sets/{세트id}/print?view=student · ?view=teacher",
    ],
    scale: "새 유형 다섯이 고루 든 세트 + 여러 줄 안내문을 원문으로 쓴 세트",
    status: "대기",
    changedOn: "2026-10-06",
  },
  {
    id: "math-block-tail-break",
    title: "연립식 · 행렬 줄 바로 다음 줄이 제 줄에 서는가",
    changed:
      "본문 · 해설에서 큰 수식 줄(연립식 `cases` · 행렬 `pmatrix` — 전처리가 `$$…$$` 로 올린다) **바로 다음 줄**이 그 수식 줄에 " +
      "붙어 나가던 것을 고쳤다. 홑 줄바꿈을 줄바꿈으로 그리는 규칙(2026-08-25)이 수식 블록 뒤 조각이 줄바꿈으로 시작하면 못 잡았다. " +
      "이제 그 줄이 갈린다 — 「…를 / g(x)={…} / 이라 하고, …」 가 세 줄이다(전에는 「g(x)={…} 이라 하고, …」 가 한 줄).",
    look:
      "(제안) ① 연립식 · 구간별 함수 · 행렬이 든 교과서 문항의 본문에서, 수식 줄 다음의 글(「이라 하고」 「일 때」 · 보기 ①)이 새 줄에서 시작하는가. " +
      "② 그 줄바꿈 때문에 수식과 다음 줄 사이가 지나치게 벌어지지 않는가(빈 줄이 하나 더 생긴 것처럼 보이면 불합격). " +
      "③ 정답지 해설에서 행렬로 끝나는 식 다음 줄이 따로 서는가(「…=E」 다음에 「A+A²+A³=…」 가 붙어 한 식으로 읽히면 불합격).",
    lookFromSource: false,
    evidence: [
      "src/lib/math/hardBreaks.ts (hardBreakAfterBlock)",
      "src/__tests__/unit/hardBreaks.test.tsx",
      "scripts/qa/count-block-tail-breaks.ts — 공유 DB 에서 지면이 바뀌는 행 218(전부 교과서 문항 — 본문 90칸 · 해설 145칸 · 공통수학1 109 · 중2 79 · 대수 15)",
    ],
    scale:
      "교과서 문항 218행 — 엔진 문항 0. `scripts/qa/count-block-tail-breaks.ts --list` 가 문항 번호를 낸다",
    needs:
      "연립식 · 구간별 함수가 본문에 든 교과서 문항(예: HAL0109-A11-001)과 행렬 해설이 든 공통수학1 문항",
    status: "대기",
    changedOn: "2026-10-08",
  },
];

/** 한 번에 다 보려면 어떤 시험지를 뽑아야 하나. */
export const SAMPLING_PLAN = [
  "8문항짜리 일일테스트 1건(문제지 4장 + 정답지)이면 대부분 한 번에 검증된다.",
  "그림이 2장 이상 붙은 문항을 일부러 넣어야 다장 배치가 드러난다.",
  "정답지 1쪽 정원은 25문항짜리로 뽑아야 「빠른 정답」 상자가 커져 해설이 사라진다.",
  "서술형 문항과 **단답형 문항이 함께** 들어가야 배지 두 갈래가 다 찍힌다.",
];
