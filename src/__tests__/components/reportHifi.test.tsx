/**
 * 🔴 RED → 🟢 — **성취 리포트 Hi-fi — 원장 화면 한 벌 + 학부모 A4 다섯 안** (Hi-fi 브리프 §2·§3).
 *
 * 구현: src/app/dev/report-hifi/{ParentSheet,DirectorScreen,ReportHifiClient}.tsx
 *
 * 무엇을 잠그나
 * 1. 🔴 **다섯 안이 전부** 있는 기록을 빠짐없이 그린다 — 결시 날짜 · 영상 · 숙제 · 의견 · 표본 부족 한 줄(§1 #4·#5).
 * 2. 🔴 학부모 지면에는 **빈 사유·개발 사정 0글자** — 맨 아래 한 줄이 리포트를 설명한다(23 §7.2 Q5).
 * 3. 원장 화면은 **네 영역 고정 자리** + 빈 사유(무엇이 · 왜 · 어떻게) + 표본 부족 단원 목록(«N문항 / 기준 12문항»).
 * 4. 축 하나씩 — H2 두 열 · H3 난이도 먼저 · H4 같은 눈금 막대(문턱 미만은 채움 없음) · H5 화면 얼굴.
 * 5. 넘치면 접은 모양 + «줄여 적었습니다»(§2 규칙 1).
 * 6. 난이도 4단 — 미측정(«문제 없음»)과 문턱 미만(«평가 보류»)을 글자로 가른다(§2 규칙 3).
 *
 * ⚠️ A4 한 장인지(쪽수) · 흑백에서 무엇이 남는지는 jsdom 이 못 잰다 — `scratch/shot-report-hifi.mjs` 가
 *    실물 브라우저 PDF 로 잰다(보고서 «A4 쪽수 실측 표»).
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DirectorScreen } from "@/app/dev/report-hifi/DirectorScreen";
import {
  EXAMPLE_TEACHER_NOTE,
  exampleFactors,
} from "@/app/dev/report-hifi/example";
import { ParentSheet } from "@/app/dev/report-hifi/ParentSheet";
import { ReportHifiClient } from "@/app/dev/report-hifi/ReportHifiClient";
import { HIFI_VARIANTS } from "@/app/dev/report-hifi/variants";
import { collectAchievement } from "@/lib/achievement/collect";
import type { ReportSource } from "@/lib/achievement/reportAreas";
import { FOLD_NOTE } from "@/lib/achievement/sentences";

const REAL = collectAchievement({
  student: {
    id: "s",
    name: "김하나",
    className: "초등M 초5 MS1A",
    classGrade: "초5",
  },
  period: { from: "2026-08-01", to: "2026-08-31" },
  progress: Array.from({ length: 19 }, (_, i) => ({
    unitId: `u${i % 17}`,
    recordedAt: `2026-08-${String(3 + i).padStart(2, "0")}`,
  })),
  units: Array.from({ length: 17 }, (_, i) => ({
    unitId: `u${i}`,
    grade: "초5",
    chapter: `${2 + Math.floor(i / 5)}. 대단원 ${i}`,
    section: `(1보다 작은 소수)×(자연수)의 계산 ${i}`,
    orderIndex: i,
  })),
  plan: null,
  results: [],
  lectures: { targets: [], views: [] },
});
const EXAMPLE: ReportSource = {
  factors: exampleFactors(REAL),
  teacherNote: EXAMPLE_TEACHER_NOTE,
};
const REAL_SOURCE: ReportSource = { factors: REAL, teacherNote: null };

const variant = (key: string) => HIFI_VARIANTS.find((v) => v.key === key)!;

function sheet(
  source: ReportSource = EXAMPLE,
  key = "H1",
  fold: "full" | "folded" = "full",
) {
  render(
    <ParentSheet
      source={source}
      variant={variant(key)}
      example={source === EXAMPLE}
      fold={fold}
    />,
  );
  return screen.getByTestId("parent-sheet");
}

describe("🔴 학부모 A4 — 다섯 안이 전부 기록을 빠짐없이", () => {
  it.each(HIFI_VARIANTS.map((v) => v.key))(
    "%s — 결시 날짜 · 영상 · 숙제 · 의견 · 표본 부족 한 줄 · 하단 한 줄",
    (key) => {
      const el = sheet(EXAMPLE, key);
      const text = el.textContent ?? "";
      // 결시 — 날짜와 함께, 평균에서 뺐다는 말
      expect(within(el).getByText("결시")).toBeInTheDocument();
      expect(text).toContain("결시 1회는 평균에서 뺐습니다.");
      // 영상 — 완료 편수만(월말까지)
      expect(text).toContain(
        "이번 달 배운 내용의 영상 6편 중 월말까지 4편을 끝까지 봤습니다.",
      );
      // 숙제 — 확인 범위와 함께
      expect(text).toContain("숙제를 확인한 8번 중 2번 안 해 왔습니다.");
      expect(text).toContain(EXAMPLE_TEACHER_NOTE);
      // 표본 부족 단원 — 목록이 아니라 개수 한 줄
      expect(text).toMatch(
        /문제 수가 적은 \d+개 단원은 이번 리포트에서 평가를 보류했습니다\./,
      );
      // 난이도 — 심화는 8문항이라 숫자만, 평가 보류
      expect(text).toContain("8문제 중 3문제");
      expect(text).toContain("평가 보류");
      expect(text).toContain(
        "이번 리포트에 담은 기록: 진도 19차시 · 시험 9회(결시 1회 포함) · 예습 영상 6편 · 숙제 확인 8번.",
      );
    },
  );

  it.each(HIFI_VARIANTS.map((v) => v.key))(
    "🔴 %s — 전문용어·비율·느낌표 없음 (D-08)",
    (key) => {
      const text = sheet(EXAMPLE, key).textContent ?? "";
      expect(text).not.toMatch(/[!！]|%|정답률|표본|다음 달에 말씀/);
    },
  );
});

describe("🔴 학부모 A4 — 실데이터(진도만)", () => {
  it("있는 영역만 — «배운 것» 하나", () => {
    const el = sheet(REAL_SOURCE);
    expect(
      within(el)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["배운 것"]);
  });

  it("🔴 빈 사유·개발 사정 0글자 — 하단 한 줄이 리포트를 설명한다", () => {
    const text = sheet(REAL_SOURCE).textContent ?? "";
    expect(text).not.toMatch(/칸|트랙|채점 화면|0건|0회|기록 없음|아직/);
    expect(text).toContain(
      "이번 리포트에 담은 기록: 진도 19차시. 담지 않은 기록: 시험 · 예습 영상 · 숙제.",
    );
  });

  it("소단원 이름을 줄이지 않는다 — 대단원별로 이어 적는다", () => {
    const text = sheet(REAL_SOURCE).textContent ?? "";
    expect(text).toContain("(1보다 작은 소수)×(자연수)의 계산 16");
    expect(text).not.toContain("…");
  });
});

describe("원장 화면 — 한 벌 · 네 영역 고정 자리", () => {
  it.each([
    ["ⓐ", REAL_SOURCE],
    ["ⓑ", EXAMPLE],
  ] as const)("%s — 네 영역이 늘 같은 순서로 선다", (_, source) => {
    render(<DirectorScreen source={source} />);
    const el = screen.getByTestId("director-screen");
    expect(
      within(el)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["① 배운 것", "② 시험", "③ 스스로 한 공부", "④ 선생님 의견"]);
  });

  it("🔴 빈 영역은 무엇이 · 왜 · 어떻게를 여기에만 적는다", () => {
    render(<DirectorScreen source={REAL_SOURCE} />);
    const text = screen.getByTestId("director-screen").textContent ?? "";
    expect(text).toContain("시험 점수");
    expect(text).toContain("왜 — 이 달 채점 기록이 0건입니다.");
    expect(text).toContain("채우려면 —");
  });

  it("표본 부족 단원은 원장 화면에 목록으로 — «N문항 / 기준 12문항»", () => {
    render(<DirectorScreen source={EXAMPLE} />);
    expect(
      screen.getAllByText(/\d+문항 \/ 기준 12문항 · 평가 보류/).length,
    ).toBeGreaterThan(0);
  });
});

describe("축 하나씩", () => {
  it("H2 — 두 열", () => {
    expect(sheet(EXAMPLE, "H2").dataset.layout).toBe("twoCol");
  });

  it("🔴 H3 — 시험 근거에서 난이도가 회차보다 먼저", () => {
    const el = sheet(EXAMPLE, "H3");
    const bands = within(el).getByText("난이도별 맞힌 문제");
    const rounds = within(el).getByText("회차별 점수");
    expect(
      bands.compareDocumentPosition(rounds) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("H1 — 회차가 난이도보다 먼저", () => {
    const el = sheet(EXAMPLE, "H1");
    const bands = within(el).getByText("난이도별 맞힌 문제");
    const rounds = within(el).getByText("회차별 점수");
    expect(
      rounds.compareDocumentPosition(bands) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("🔴 H4 — 네 막대의 틀이 같은 길이 · 문턱 미만(심화 8문항)은 채움이 없다", () => {
    const el = sheet(EXAMPLE, "H4");
    const tracks = el.querySelectorAll('[data-part="track"]');
    expect(tracks).toHaveLength(4);
    expect(new Set([...tracks].map((t) => t.getAttribute("width"))).size).toBe(
      1,
    );
    const fillOf = (band: string) =>
      el.querySelector(`[data-band="${band}"] [data-part="fill"]`);
    expect(fillOf("연산")).not.toBeNull();
    expect(fillOf("심화")).toBeNull();
  });

  it("H5 — 화면 얼굴", () => {
    expect(sheet(EXAMPLE, "H5").dataset.face).toBe("screen");
  });
});

describe("넘치면 접는다 — 줄였다는 사실을 밝힌다 (§2 규칙 1)", () => {
  it("접으면 대단원 + 소단원 수 + 차시, 그리고 «줄여 적었습니다»", () => {
    const text = sheet(REAL_SOURCE, "H1", "folded").textContent ?? "";
    expect(text).toContain(FOLD_NOTE);
    expect(text).toMatch(/소단원 \d+개 · \d+차시/);
  });

  it("안 접으면 그 말이 없다", () => {
    expect(sheet(REAL_SOURCE, "H1", "full").textContent).not.toContain(
      FOLD_NOTE,
    );
  });
});

describe("화면 — 안과 상태를 갈아 끼운다", () => {
  it("ⓑ 는 «예시 데이터»라고 적고, 안을 바꾸면 지면이 바뀐다", async () => {
    const user = userEvent.setup();
    render(
      <ReportHifiClient real={REAL} candidates={16} movedToLatest={false} />,
    );
    await user.click(screen.getByRole("button", { name: /다 찬 달/ }));
    expect(screen.getByText(/예시 데이터입니다/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "H5 화면 얼굴" }));
    expect(screen.getByTestId("parent-sheet").dataset.face).toBe("screen");
  });
});
