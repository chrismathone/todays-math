/**
 * 🔴 RED → 🟢 — «이번 주 예정» **계기판 관**의 칸 판정 (D-131 · 05 §8.10).
 *
 * 구현: src/lib/daily/planGauge.ts
 *
 * 🔴 날짜를 **다시 펴지 않는다** — 계획 API 가 준 줄(날짜 · 요일 · 예정/실제 차시 · 밀림)을 칸으로 옮길 뿐이다.
 *    그래서 입력은 늘 `planScheduleSchema` 모양이고, 칸 수는 줄 수와 같다.
 *
 * 무엇을 잠그나
 * 1. 칸 색 넷 — 지난 칸 초록(done) · 오늘 파랑(now) · 밀린 칸 노랑(late) · 앞날 빈 칸(empty).
 *    밀림은 **그 줄의 driftDays** 가 음수인가다(셈은 서버 `resolveDailyPlan` 한 곳).
 * 2. 칸 아래 글자 — 날짜 「9/16 수」(요일은 줄의 weekday, 0=일) · 차시 이름(지난 칸은 실제가 이긴다) · 밀린 칸은 「밀림」.
 * 3. 아래 한 줄의 「N일 밀림」 — 오늘까지의 마지막 줄의 밀림(앞날뿐이면 첫 줄).
 * 4. 요일 토글은 **월요일부터** 그리고 값은 0=일(22 §4 리드 결정 ⑶).
 */
import { describe, expect, it } from "vitest";

import type { PlanScheduleEntity } from "@/contracts/dailyAutoTest.contract";
import {
  WEEKDAY_LABELS,
  WEEKDAYS_MONDAY_FIRST,
  currentDelayDays,
  gaugeCells,
} from "@/lib/daily/planGauge";

const unit = (section: string) => ({
  id: `00000000-0000-4000-8000-${section.length.toString().padStart(12, "0")}`,
  grade: "중2",
  chapter: "식의 계산",
  section,
});

type Row = PlanScheduleEntity["rows"][number];
const row = (over: Partial<Row> & Pick<Row, "date" | "weekday">): Row => ({
  lesson: true,
  planned: [],
  actual: [],
  driftDays: 0,
  atCurriculumEnd: false,
  ...over,
});

const schedule = (rows: Row[]): PlanScheduleEntity => ({
  from: "2026-09-14",
  to: "2026-09-27",
  rows,
});

/** 시안 Hi-fi 2 의 그림 — 9/14 월 밀림 · 9/16 수 오늘 · 9/18 금 · 9/21 월. 오늘은 9/16. */
const HIFI = schedule([
  row({
    date: "2026-09-11",
    weekday: 5,
    planned: [unit("단항식")],
    actual: [unit("단항식")],
  }),
  row({
    date: "2026-09-14",
    weekday: 1,
    planned: [unit("다항식의 덧셈")],
    actual: [unit("단항식")],
    driftDays: -3,
  }),
  row({
    date: "2026-09-16",
    weekday: 3,
    planned: [unit("다항식의 곱셈")],
    driftDays: -3,
  }),
  row({
    date: "2026-09-18",
    weekday: 5,
    planned: [unit("나눗셈")],
    driftDays: -3,
  }),
  row({
    date: "2026-09-21",
    weekday: 1,
    planned: [unit("곱셈 공식")],
    driftDays: -3,
  }),
]);

describe("[planGauge] 계기판 칸 — 계획 API 의 줄을 그대로 칸으로", () => {
  it("칸 수는 줄 수와 같다 — 날짜를 다시 펴지 않는다", () => {
    const cells = gaugeCells(HIFI, "2026-09-16");
    expect(cells.map((c) => c.date)).toEqual(HIFI.rows.map((r) => r.date));
  });

  it("🔴 색 넷 — 지난 칸 done · 밀린 지난 칸 late · 오늘 now · 앞날 empty", () => {
    expect(gaugeCells(HIFI, "2026-09-16").map((c) => c.state)).toEqual([
      "done",
      "late",
      "now",
      "empty",
      "empty",
    ]);
  });

  it("🔴 오늘 칸은 밀려 있어도 파랑 · 앞날 칸은 밀려 있어도 빈 칸", () => {
    const cells = gaugeCells(HIFI, "2026-09-16");
    expect(cells[2]).toMatchObject({ state: "now" });
    expect(cells[3]).toMatchObject({ state: "empty" });
  });

  it("🔴 밀림은 그 줄의 driftDays 가 **음수**일 때만 — 앞섬(양수)은 끝난 칸", () => {
    const cells = gaugeCells(
      schedule([
        row({ date: "2026-09-14", weekday: 1, driftDays: 2 }),
        row({ date: "2026-09-15", weekday: 2, driftDays: 0 }),
        row({ date: "2026-09-16", weekday: 3, driftDays: -1 }),
      ]),
      "2026-09-17",
    );
    expect(cells.map((c) => c.state)).toEqual(["done", "done", "late"]);
  });

  it("칸 아래 날짜는 「월/일 요일」 — 요일은 줄의 weekday(0=일)", () => {
    const cells = gaugeCells(
      schedule([
        row({ date: "2026-09-14", weekday: 1 }),
        row({ date: "2026-09-20", weekday: 0 }),
      ]),
      "2026-09-14",
    );
    expect(cells.map((c) => c.dateLabel)).toEqual(["9/14 월", "9/20 일"]);
  });

  it("차시 이름 — 지난 칸은 실제가 이긴다 · 오늘·앞날은 예정 · 밀린 칸은 「밀림」", () => {
    const cells = gaugeCells(HIFI, "2026-09-16");
    expect(cells.map((c) => c.unitLabel)).toEqual([
      "단항식",
      "밀림",
      "다항식의 곱셈",
      "나눗셈",
      "곱셈 공식",
    ]);
  });

  it("한 수업 여러 차시는 가운뎃점으로 잇고, 이름이 없으면 줄표", () => {
    const cells = gaugeCells(
      schedule([
        row({
          date: "2026-09-16",
          weekday: 3,
          planned: [unit("단항식"), unit("다항식")],
        }),
        row({ date: "2026-09-18", weekday: 5 }),
        // 보강 — 계획상 수업일이 아닌데 진도가 기록된 앞날(있을 수 없지만 비어도 안 깨진다)
        row({
          date: "2026-09-19",
          weekday: 6,
          lesson: false,
          actual: [unit("곱셈")],
        }),
      ]),
      "2026-09-16",
    );
    expect(cells.map((c) => c.unitLabel)).toEqual([
      "단항식 · 다항식",
      "—",
      "곱셈",
    ]);
  });

  it("지난 칸에 실제 기록이 없으면 예정 이름 — 계획대로 나간 것으로 본다(실제가 없으면 계획)", () => {
    const cells = gaugeCells(
      schedule([
        row({ date: "2026-09-14", weekday: 1, planned: [unit("단항식")] }),
      ]),
      "2026-09-16",
    );
    expect(cells[0]).toMatchObject({ state: "done", unitLabel: "단항식" });
  });
});

describe("[planGauge] 아래 한 줄 「N일 밀림」", () => {
  it("오늘까지의 마지막 줄의 밀림 — 양수로", () => {
    expect(currentDelayDays(HIFI, "2026-09-16")).toBe(3);
  });

  it("오늘 줄이 없으면 오늘 전의 마지막 줄", () => {
    expect(currentDelayDays(HIFI, "2026-09-17")).toBe(3);
    const s = schedule([
      row({ date: "2026-09-14", weekday: 1, driftDays: -2 }),
      row({ date: "2026-09-18", weekday: 5, driftDays: 0 }),
    ]);
    expect(currentDelayDays(s, "2026-09-16")).toBe(2);
    expect(currentDelayDays(s, "2026-09-18")).toBe(0);
  });

  it("앞날 줄뿐이면 첫 줄(지금까지의 기록으로 잰 값이다)", () => {
    const s = schedule([
      row({ date: "2026-09-21", weekday: 1, driftDays: -4 }),
    ]);
    expect(currentDelayDays(s, "2026-09-16")).toBe(4);
  });

  it("앞섬·제때·줄 없음은 0", () => {
    expect(
      currentDelayDays(
        schedule([row({ date: "2026-09-14", weekday: 1, driftDays: 5 })]),
        "2026-09-16",
      ),
    ).toBe(0);
    expect(currentDelayDays(schedule([]), "2026-09-16")).toBe(0);
  });
});

describe("[planGauge] 요일 토글 — 월요일부터 그리고 값은 0=일", () => {
  it("화면 순서는 월화수목금토일 · 값은 1,2,3,4,5,6,0", () => {
    expect(WEEKDAYS_MONDAY_FIRST).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(WEEKDAYS_MONDAY_FIRST.map((d) => WEEKDAY_LABELS[d])).toEqual([
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "일",
    ]);
  });
});
