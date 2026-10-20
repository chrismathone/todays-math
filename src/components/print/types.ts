export type TestPrintType = "daily" | "review";

export interface TestPrintProblem {
  /** Render-only primary-author r2 payload; no DB field or saved contract. */
  nativeDescriptive?: import("@/lib/print/descriptive").NativeDescriptivePrint;
  id: string;
  orderIndex: number;
  problemCode?: string | null;
  content: string;
  answer: string;
  solution: string | null;
  /**
   * 출제 형식 — 객관식 | 단답형 | 서술형 (`Problem.questionType`).
   * 지면이 「서술형 n」·「단답형 n」 표시를 붙일지 여기서 갈린다
   * (`assignSubjectiveLabels`). 원본 시험지의 `서답형` 은 이 컬럼에서 이미
   * `서술형` 으로 합쳐져 있다 — 원본 표기 자체는 따로 기억한다(원장님 확정 2026-08-19).
   * 본문에 박혀 있던 원본 라벨을 걷어낸 뒤로는 **이 값이 유일한 근거**다.
   */
  questionType?: string | null;
  /**
   * 기존 기출 배점. D-163: 서술형만 번호 옆에 찍는다.
   * 주 저자 r2 문항은 nativeDescriptive.rubric.totalPoints가 정본이다.
   */
  score?: number | null;
  /** 원본 시험지에서 오려 온 그림 경로들. 없으면 빈 배열. */
  figureUrls?: string[];
  /** 0 = stem, 1..5 = that choice, null = unknown. Absent retains legacy layout. */
  choiceFigureIndex?: (number | null)[];
  /**
   * 엔진이 그린 **인라인 SVG**(`Problem.figureSvg`). 파일이 아니라 마크업이다.
   *
   * 🔴 **엔진 문항의 그림은 이 컬럼에만 있다** — `figureUrls` 는 실측 4,640건
   * 전량 비어 있다(2026-08-29). 이 필드가 없어서 시험지에 엔진 그림이 **한 장도
   * 안 나가고 있었다.** 화면(`ProblemCard`)은 넘기는데 지면 경로만 안 넘겨서,
   * 「다음 그림에서…」라고 적힌 문항이 그림 없이 인쇄됐다.
   *
   * 넘침 판정(`printOverflow.estimateFigureSvgPx`)도 이 값을 본다 — 자와 지면이
   * **같은 값**을 받아야 한다(CLAUDE.md 2026-08-18).
   */
  figureSvg?: string | null;
  /**
   * `figureUrls` 와 **같은 순서**로 짝지은 원본 치수 `[w1,h1,w2,h2,…]`
   * (`Problem.figureDims`). 넘침 판정이 그림 높이를 계산하는 유일한 근거다 —
   * 브라우저는 판정 시점에 파일을 못 읽는다.
   *
   * ⚠️ 길이가 `figureUrls.length × 2` 가 아니면 **통째로 «모른다»로 받는다**
   *    (`parseFigureDimensions`). 짝이 어긋난 값을 흘리면 판정이 안다고 착각한다.
   */
  figureDims?: (number | null)[];
  /**
   * `figureUrls` 와 **같은 순서·같은 길이**로 짝지은 **원본 지면 물리 폭(mm)**
   * (`Problem.figureSourceMm`). 「얼마로 그린다」의 유일한 근거다.
   *
   * 픽셀 폭은 우리가 몇 dpi 로 잘랐는지에 달려 있어 **크기의 근거가 못 된다** —
   * 원본 가로가 41~7,343px 이라 같은 삼각형이 문항마다 다른 크기로 인쇄된다.
   * 원본 지면에서 그 그림이 차지하던 물리 크기가 곧 출제자가 정한 크기다.
   * 근거: `docs/planning/tracks/figure-quality-brief.md` §9 · §14.
   *
   * ⚠️ **비면 «모른다»이고, 모르면 지면은 오늘 그대로 픽셀로 그린다**(회귀 0).
   *    규칙 한 곳: `src/lib/figurePrintSize.ts`.
   */
  figureSourceMm?: (number | null)[];
}

export interface TestPrintDocument {
  /**
   * 「인쇄됨」으로 표시할 시험지 레코드. **`null` 이면 표시할 레코드가 없다**(검수 견본).
   *
   * 🔴 **불리언 플래그가 아니라 이 타입으로 두는 까닭**: 견본 지면을 새로 만드는
   *    사람이 플래그를 붙이는 것을 잊으면, 「인쇄하기」가 **없는 시험지를 표시하려다
   *    400 을 받고 `window.print()` 까지 못 간다** — 단추가 조용히 죽는다.
   *    2026-08-28 에 `/dev/print-paper` 가 정확히 그랬다(`testId:
   *    "print-paper-specimen"` → 「요청 값이 올바르지 않습니다」). 인쇄 검수를 하러
   *    들어간 원장님이 그 화면에서 인쇄를 못 하셨고, **절대 규칙 6 의 잔고 화면이
   *    바로 그 화면**이라 검수 자체가 막혔다.
   *    `string | null` 이면 새 화면을 만들 때 tsc 가 «둘 중 무엇인가»를 반드시 묻는다.
   */
  testId: string | null;
  testType: TestPrintType;
  testDate: string;
  className: string;
  section: string;
  todayGoal: string;
  conceptNote: string;
  problems: TestPrintProblem[];
}

export interface JaseupPrintMeta {
  academyName: string;
  title: string;
  examDate: string;
  todayGoal: string;
  conceptNote: string;
}

export type PrintPageKind = "questions" | "answers";
