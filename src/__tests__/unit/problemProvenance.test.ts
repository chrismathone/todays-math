/**
 * 출처 라벨 판정 — `src/lib/problem/provenance.ts`.
 *
 * ## 이 시험이 지키려는 것
 *
 * ⑴ **미분류가 살아 있다.** 「0으로 단정하면 «깨끗»과 «못 셈»이 안 갈린다」는 이 저장소의
 *    되풀이되는 교훈이다. 그래서 미분류를 **실제로 내는 입력**(양성 대조군)을 박아 둔다.
 * ⑵ **반대쪽 모집단**에 대 본다 — 「분류가 되는 다섯 갈래에서 미분류가 나오면 안 된다」·
 *    「그림이 없는 행에서 그림 라벨이 나오면 안 된다」. 한쪽만 보면 재현율만 재고
 *    지어냄은 구조적으로 0이 된다(CLAUDE.md 2026-08-20).
 * ⑶ **대리 규칙과 갈리는 자리를 못 박는다.** 물려받은 브리프는 엔진을 «문항 코드 모양»
 *    으로 가르라고 했고 오늘 데이터에서는 어긋남이 0이다. 그러나 손으로 등록한 문항도
 *    같은 형식 코드를 받으므로(D-105), 그 규칙은 **손 등록을 [초] 초등 엔진이라고 한다.**
 *    그 한 줄이 이 시험에 있다 — 없으면 「왜 familyKey 를 쓰는가」가 주장으로만 남는다.
 */
import { describe, expect, it } from "vitest";

import {
  classifyFigure,
  classifyOrigin,
  FIGURE_ORIGINS,
  PROBLEM_ORIGINS,
  provenanceBadges,
  type ProvenanceInput,
} from "@/lib/problem/provenance";

import {
  LEGACY_CODE_PROXY,
  PROVENANCE_CENSUS_20260825 as CENSUS,
} from "../../../scripts/qa/provenanceCensus";

/** 그림·출처 컬럼이 비어 있는 바닥값. 시험마다 **가르려는 컬럼 하나만** 덮어쓴다. */
const BLANK: ProvenanceInput = {
  source: "manual",
  familyKey: null,
  originProblemId: null,
  figureUrls: [],
  figureSvg: null,
};

/**
 * 실측(2026-08-25)에서 실제로 나온 **행의 모양**들. 지어낸 것이 아니라 DB 교차표에서
 * 그대로 옮긴 것이다 — 픽스처가 가짜면 가드가 무엇을 지키는지 알 수 없다
 * (CLAUDE.md 2026-08-19).
 */
const SHAPES = {
  /** 41,084건 — 기출 추출. */
  기출: { ...BLANK, source: "past_exam" },
  /** 3,526건 — RPM 교재 이관본. `originProblemId` 가 **널인 것**이 판별자다. */
  문제집: { ...BLANK, source: "transformed" },
  /** 0건 — AI 가 우리 문항을 변형한 것. `transformed` 인데 원본을 가리킨다. */
  AI변형: {
    ...BLANK,
    source: "transformed",
    originProblemId: "00000000-0000-4000-8000-00000000a001",
  },
  /** 0건 — AI 신규 생성. */
  AI생성: { ...BLANK, source: "ai_generated" },
  /** 1,751건 — 초등 엔진. */
  초등: {
    ...BLANK,
    familyKey: "elem:초6|2-5-1 원주와 원주율 알아보기|연산",
  },
  /** 659건 — 중등 엔진. */
  중등: { ...BLANK, familyKey: "mid:3-1|근호를 포함한 식의 계산|06" },
  /**
   * 764건 — `manual` 인데 엔진 표지가 없는 옛 행(전량 격리). **양성 대조군**이다.
   * 실제 행: `problemCode = "E30104-3EGR"`, 본문 `724 - 358 = ?`.
   */
  옛수동: { ...BLANK, familyKey: null },
  /**
   * 0건 — 화면(S-08)에서 **손으로 등록**한 문항. 트리거가 `solo:<uuid>` 를 채운다(D-105).
   * 이 자리가 이 판정기의 존재 이유다.
   */
  손등록: { ...BLANK, familyKey: "solo:11111111-2222-4333-8444-555555555555" },
} as const satisfies Record<string, ProvenanceInput>;

describe("[출처] 문항 출처 판정 — 기록된 컬럼으로 가른다", () => {
  it.each([
    ["기출", SHAPES.기출, "past_exam"],
    ["문제집", SHAPES.문제집, "workbook"],
    ["AI변형", SHAPES.AI변형, "ai"],
    ["AI생성", SHAPES.AI생성, "ai"],
    ["초등", SHAPES.초등, "elem_engine"],
    ["중등", SHAPES.중등, "middle_engine"],
    ["옛수동", SHAPES.옛수동, "unknown"],
    ["손등록", SHAPES.손등록, "unknown"],
  ] as const)("%s → %s", (_name, input, expected) => {
    expect(classifyOrigin(input)).toBe(expected);
  });

  // 🔴 **`transformed` 는 두 가지다.** 이 하나가 없으면 AI 변형본이 [문] 문제집으로
  //    조용히 붙는다 — 값이 그럴듯해서 아무도 못 알아챈다.
  it("transformed 를 가르는 것은 originProblemId 의 널뿐이다", () => {
    expect(classifyOrigin(SHAPES.문제집)).toBe("workbook");
    expect(classifyOrigin(SHAPES.AI변형)).toBe("ai");
    // 나머지 컬럼은 이 판정을 못 바꾼다 — 바꾸면 열쇠가 둘이 된 것이다.
    expect(
      classifyOrigin({ ...SHAPES.AI변형, familyKey: "elem:x|y|연산" }),
    ).toBe("ai");
  });

  // 반대쪽 모집단: **분류가 되는 갈래에서 미분류가 나오면 안 된다.**
  it("분류되는 여섯 모양에서 미분류가 나오지 않는다", () => {
    const 분류됨 = [
      SHAPES.기출,
      SHAPES.문제집,
      SHAPES.AI변형,
      SHAPES.AI생성,
      SHAPES.초등,
      SHAPES.중등,
    ];
    expect(분류됨.map(classifyOrigin)).not.toContain("unknown");
  });

  // 양성 대조군: 미분류가 **실제로 나온다**. 이게 없으면 「0」이 무슨 뜻인지 모른다.
  it("미분류 갈래가 살아 있다 — 실측 764건의 모양이 그대로 미분류를 낸다", () => {
    expect(classifyOrigin(SHAPES.옛수동)).toBe("unknown");
    expect(CENSUS.origin.unknown).toBeGreaterThan(0);
  });
});

describe("[출처] 대리 규칙(문항 코드 모양)과 갈리는 자리", () => {
  /** 브리프의 규칙을 **그대로** 흉내 낸 것. 판정기가 아니라 «옛 규칙» 재현이다. */
  const 코드로판정 = (source: string, problemCode: string) =>
    source === "manual" && LEGACY_CODE_PROXY.test(problemCode)
      ? problemCode.startsWith("E")
        ? "elem_engine"
        : problemCode.startsWith("J")
          ? "middle_engine"
          : "unknown"
      : "unknown";

  // 오늘 데이터(엔진 2,410건)에서는 둘이 같다 — 그래서 대리 규칙이 맞아 보였다.
  it("엔진 문항에서는 두 규칙이 같은 답을 낸다", () => {
    expect(코드로판정("manual", "E30104-A01-001")).toBe("elem_engine");
    expect(classifyOrigin(SHAPES.초등)).toBe("elem_engine");
    expect(코드로판정("manual", "J31402-A01-001")).toBe("middle_engine");
    expect(classifyOrigin(SHAPES.중등)).toBe("middle_engine");
  });

  // 🔴 손 등록에서 갈린다. 코드 트리거는 **어느 경로로 들어오든** 새 형식을 붙인다.
  it("손 등록에서 갈린다 — 대리 규칙은 [초]라 하고 기록은 미분류라 한다", () => {
    expect(코드로판정("manual", "E30104-A01-001")).toBe("elem_engine");
    expect(classifyOrigin(SHAPES.손등록)).toBe("unknown");
  });

  // 🔴 문항류 글자가 `A` 를 넘어가면(한 소단원 100번째 무리) 대리 규칙이 통째로 떨군다.
  //    브리프의 원문 규칙은 `-A숫자-숫자` 라 `B01` 을 못 본다.
  it("문항류 글자가 B 로 넘어가도 기록 판정은 흔들리지 않는다", () => {
    expect(/-A[0-9]+-[0-9]+$/.test("E30104-B01-001")).toBe(false);
    expect(classifyOrigin(SHAPES.초등)).toBe("elem_engine");
  });
});

describe("[출처] 그림 출처 판정", () => {
  it.each([
    [
      "도형 엔진(인라인 SVG)",
      { figureSvg: "<svg viewBox='0 0 224 120'/>" },
      "figure_engine",
    ],
    ["SVG 엔진 경로", { figureUrls: ["/figures-svg/a/b.svg"] }, "svg_engine"],
    ["스캔 래스터", { figureUrls: ["/figures/2023-x/q07.jpg"] }, "scan"],
    ["아는 뿌리 밖", { figureUrls: ["/figures-300/a.png"] }, "unknown"],
  ] as const)("%s → %s", (_name, patch, expected) => {
    expect(classifyFigure({ ...BLANK, ...patch })).toBe(expected);
  });

  // 「없다」와 「모른다」는 다른 말이다 — 뭉개면 새 뿌리가 생겨도 아무도 모른다.
  it("그림이 아예 없으면 null 이다 — 미분류와 뭉개지 않는다", () => {
    expect(classifyFigure(BLANK)).toBeNull();
    expect(classifyFigure({ ...BLANK, figureSvg: "" })).toBeNull();
  });

  // 반대쪽: **그림이 없는 행에서 그림 라벨이 나오면 안 된다.**
  it("그림 없는 문항에는 그림 라벨이 붙지 않는다", () => {
    for (const shape of Object.values(SHAPES)) {
      expect(provenanceBadges(shape)).toHaveLength(1);
    }
  });
});

describe("[출처] 라벨 — 원장님 지시 「색상 전부 다르게」", () => {
  it("두 축이 겹치면 라벨이 둘이다 — 실측 [초]+[도] 365건", () => {
    const badges = provenanceBadges({
      ...SHAPES.초등,
      figureSvg: "<svg viewBox='0 0 224 120'/>",
    });
    expect(badges.map((b) => b.text)).toEqual(["[초]", "[도]"]);
  });

  it("문항 출처 라벨은 언제나 정확히 하나이고 맨 앞이다", () => {
    for (const shape of Object.values(SHAPES)) {
      const badges = provenanceBadges({
        ...shape,
        figureUrls: ["/figures/x/q1.jpg"],
      });
      expect(badges).toHaveLength(2);
      expect(PROBLEM_ORIGINS).toContain(badges[0]!.kind);
      expect(badges[1]!.kind).toBe("scan");
    }
  });

  // 갈래를 더하고 라벨을 잊으면 화면에 `undefined` 가 나간다 — 여기서 막는다.
  it("모든 갈래가 대괄호 라벨과 이름과 색 클래스를 갖는다", () => {
    const 전량 = [
      ...PROBLEM_ORIGINS.map(
        (k) => provenanceBadges({ ...BLANK, ...originShapeOf(k) })[0]!,
      ),
      ...FIGURE_ORIGINS.map(
        (k) => provenanceBadges({ ...BLANK, ...figureShapeOf(k) })[1]!,
      ),
    ];
    for (const badge of 전량) {
      expect(badge.text).toMatch(/^\[.+\]$/);
      expect(badge.name.length).toBeGreaterThan(0);
      expect(badge.className).toMatch(/^text-src-[a-z-]+$/);
    }
  });

  /**
   * 🔴 원장님 지시의 본문 — **이름 붙은 갈래 여덟은 색이 전부 달라야 한다.**
   * 「모른다」 둘(출처·그림)은 뜻이 같으므로 한 색을 같이 쓴다. 색값 자체는
   * `provenancePalette.test.ts` 가 `globals.css` 를 읽어 대비·ΔE 로 잰다.
   */
  it("이름 붙은 여덟 갈래의 색 클래스가 서로 다르다", () => {
    const 이름붙은 = [
      ...PROBLEM_ORIGINS.filter((k) => k !== "unknown").map(
        (k) =>
          provenanceBadges({ ...BLANK, ...originShapeOf(k) })[0]!.className,
      ),
      ...FIGURE_ORIGINS.filter((k) => k !== "unknown").map(
        (k) =>
          provenanceBadges({ ...BLANK, ...figureShapeOf(k) })[1]!.className,
      ),
    ];
    expect(이름붙은).toHaveLength(8);
    expect(new Set(이름붙은).size).toBe(8);
  });

  it("두 축의 「모른다」는 같은 색을 쓴다 — 모른다는 분류가 아니다", () => {
    const 출처모름 = provenanceBadges(SHAPES.옛수동)[0]!;
    const 그림모름 = provenanceBadges({
      ...BLANK,
      figureUrls: ["/figures-300/a.png"],
    })[1]!;
    expect(출처모름.className).toBe(그림모름.className);
    expect(출처모름.className).toBe("text-src-unknown");
  });
});

describe("[출처] 실측 전수(2026-08-25) — 분모가 맞는가", () => {
  // 분모를 먼저 검산한다(CLAUDE.md 2026-08-18). 합이 안 맞으면 어느 갈래를 못 센 것이다.
  it("문항 출처 갈래의 합이 전체와 같다", () => {
    const sum = Object.values(CENSUS.origin).reduce((a, b) => a + b, 0);
    expect(sum).toBe(CENSUS.total);
  });

  it("그림 출처 갈래의 합이 전체와 같다 (그림 없음 포함)", () => {
    const sum = Object.values(CENSUS.figure).reduce((a, b) => a + b, 0);
    expect(sum).toBe(CENSUS.total);
  });

  // 실측표의 키가 판정기의 갈래와 어긋나면 조사기가 엉뚱한 것을 센다.
  it("실측표의 키가 판정기의 갈래와 정확히 같다", () => {
    expect(Object.keys(CENSUS.origin).sort()).toEqual(
      [...PROBLEM_ORIGINS].sort(),
    );
    expect(Object.keys(CENSUS.figure).sort()).toEqual(
      [...FIGURE_ORIGINS, "none"].sort(),
    );
  });
});

/** 갈래 하나를 실제로 내는 최소 입력 — 시험이 «모든 갈래»를 돌 때 쓴다. */
function originShapeOf(kind: string): Partial<ProvenanceInput> {
  switch (kind) {
    case "past_exam":
      return { source: "past_exam" };
    case "workbook":
      return { source: "transformed" };
    case "ai":
      return { source: "ai_generated" };
    case "elem_engine":
      return { familyKey: "elem:x|y|연산" };
    case "middle_engine":
      return { familyKey: "mid:x|y|01" };
    default:
      return {};
  }
}

function figureShapeOf(kind: string): Partial<ProvenanceInput> {
  switch (kind) {
    case "figure_engine":
      return { figureSvg: "<svg/>" };
    case "svg_engine":
      return { figureUrls: ["/figures-svg/a.svg"] };
    case "scan":
      return { figureUrls: ["/figures/a.jpg"] };
    default:
      return { figureUrls: ["/figures-300/a.png"] };
  }
}
