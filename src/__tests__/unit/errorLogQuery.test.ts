/**
 * 오류 기록 조회 스크립트의 순수한 부분 — `scripts/logs/errorLogQuery.ts`.
 * (DB 에 닿는 `recent-errors.ts` 는 얇다 — 인자를 읽고, 조건을 만들고, 이 모양대로 찍는다.)
 * 메인 세션이 «왜 안 됐나»를 이것으로 찾는다 — 인자를 잘못 읽으면 엉뚱한 줄을 보고 결론을 낸다.
 */
import { describe, expect, it } from "vitest";

import {
  buildWhere,
  formatDetail,
  formatRow,
  parseArgs,
  parseSince,
} from "../../../scripts/logs/errorLogQuery";

const NOW = new Date("2026-09-22T12:00:00.000Z");

describe("인자", () => {
  it("기본 — 최근 24시간 30건 목록", () => {
    expect(parseArgs([])).toMatchObject({
      mode: "list",
      limit: 30,
      since: "24h",
    });
  });
  it("거르기·묶음·한 건·이미지·JSON", () => {
    expect(
      parseArgs([
        "--route",
        "/api/studio/ai",
        "--action",
        "figure-redraw",
        "--kind",
        "ai-rejected",
        "--status",
        "422",
        "--source",
        "server",
        "--user",
        "11111111-1111-4111-8111-111111111111",
        "--since",
        "7d",
        "--limit",
        "5",
        "--json",
      ]),
    ).toMatchObject({
      mode: "list",
      route: "/api/studio/ai",
      action: "figure-redraw",
      kind: "ai-rejected",
      status: 422,
      source: "server",
      userId: "11111111-1111-4111-8111-111111111111",
      since: "7d",
      limit: 5,
      json: true,
    });
    expect(parseArgs(["--group", "action"])).toMatchObject({
      mode: "group",
      group: "action",
    });
    expect(parseArgs(["--id", "abc"])).toMatchObject({
      mode: "one",
      id: "abc",
    });
    expect(parseArgs(["--image", "abc", "--out", "tmp"])).toMatchObject({
      mode: "image",
      id: "abc",
      out: "tmp",
    });
  });
  it("모르는 인자·틀린 값은 멈춘다 — 조용히 무시하면 다른 줄을 본다", () => {
    expect(() => parseArgs(["--rout", "/api"])).toThrow(/모르는 인자/);
    expect(() => parseArgs(["--group", "colour"])).toThrow(/묶음/);
    expect(() => parseArgs(["--limit", "-1"])).toThrow(/limit/);
    expect(() => parseArgs(["--kind", "whatever"])).toThrow(/종류/);
  });
});

describe("기간", () => {
  it.each([
    ["6h", "2026-09-22T06:00:00.000Z"],
    ["24h", "2026-09-21T12:00:00.000Z"],
    ["7d", "2026-09-15T12:00:00.000Z"],
    ["30m", "2026-09-22T11:30:00.000Z"],
    ["2026-09-20", "2026-09-20T00:00:00.000Z"],
  ])("%s → %s 부터", (text, iso) => {
    expect(parseSince(text, NOW).toISOString()).toBe(iso);
  });
  it("못 읽는 기간은 멈춘다", () => {
    expect(() => parseSince("yesterday", NOW)).toThrow(/기간/);
  });
});

describe("조건", () => {
  it("준 것만 걸고 시각은 늘 건다", () => {
    const args = parseArgs(["--action", "figure-edit", "--status", "400"]);
    expect(buildWhere(args, NOW)).toEqual({
      createdAt: { gte: new Date("2026-09-21T12:00:00.000Z") },
      action: "figure-edit",
      status: 400,
    });
  });
});

describe("찍는 모양", () => {
  it("목록 한 줄 — 시각(KST)·종류·상태·메서드 경로·작업·문구·이미지 표시·id", () => {
    const line = formatRow({
      id: "22222222-2222-4222-8222-222222222222",
      createdAt: new Date("2026-09-22T03:04:05.000Z"),
      source: "server",
      kind: "ai-rejected",
      route: "/api/studio/ai",
      method: "POST",
      status: 422,
      action: "figure-redraw",
      message:
        "점 이름표가 가리키는 점이 맞지 않아 도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
      userId: null,
      image: { byteSize: 1234 },
    });
    expect(line).toContain("09-22 12:04:05");
    expect(line).toContain("ai-rejected");
    expect(line).toContain("422");
    expect(line).toContain("POST /api/studio/ai");
    expect(line).toContain("figure-redraw");
    expect(line).toContain("[그림 1.2KB]");
    expect(line).toContain("22222222-2222-4222-8222-222222222222");
  });
  it("한 건 — 원문 전체와 요약(JSON)을 그대로", () => {
    const text = formatDetail({
      id: "x",
      createdAt: new Date("2026-09-22T03:04:05.000Z"),
      source: "server",
      kind: "ai-rejected",
      route: "/api/studio/ai",
      method: "POST",
      status: 422,
      action: "figure-redraw",
      message: "화면 문구",
      detail:
        "도형을 그리지 못했습니다: labels.val30.point conflicts with its key",
      context: { figureTrail: [{ attempt: 0 }] },
      userId: null,
      release: "abc",
      requestId: "icn1::x",
      durationMs: 1200,
      image: null,
    });
    expect(text).toContain("labels.val30.point conflicts with its key");
    expect(text).toContain('"figureTrail"');
    expect(text).toContain("icn1::x");
  });
});
