// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getBank } from "@/app/api/concept-blank/bank/route";
import { GET as getPreview } from "@/app/api/math-srs/fading/preview/route";
import { conceptBlankBankSchema } from "@/contracts/conceptBlank.contract";
import { BANK_PARTS } from "@/lib/concept-blank/bank";
import { joinBanks } from "@/lib/concept-blank/bank/plus";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, handler: unknown) => handler,
}));

const teacher = {
  id: "teacher-id",
  role: "director",
  approvalStatus: "approved",
  menus: ["conceptBlank", "srs"],
  branchId: "branch-a",
};
const grade = (query = "grade=초5") =>
  new Request(`https://test.example/api/concept-blank/bank?${query}`);
const preview = (query = "today=2026-11-28") =>
  new Request(`https://test.example/api/math-srs/fading/preview?${query}`);

beforeEach(() => {
  vi.stubEnv("MATH_FADING", "on");
  auth.mockResolvedValue({ user: teacher });
});

afterEach(() => vi.unstubAllEnvs());

describe("teacher-only concept bank data", () => {
  it.each([
    [null, 401],
    [{ student: { studentId: "student-id" } }, 401],
    [{ user: { ...teacher, approvalStatus: "pending" } }, 403],
    [{ user: { ...teacher, menus: [] } }, 403],
    [{ user: { ...teacher, role: "reviewer" } }, 403],
  ])("denies unauthorized sessions (%s)", async (session, status) => {
    auth.mockResolvedValue(session);
    for (const response of [
      await getBank(grade()),
      await getPreview(preview()),
    ]) {
      expect(response.status).toBe(status);
      expect(await response.json()).not.toHaveProperty("concepts");
    }
  });

  it("serves one grade with the intended teacher answer keys and private caching", async () => {
    const response = await getBank(grade());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const bank = conceptBlankBankSchema.parse(await response.json());
    expect(bank).toEqual(joinBanks([BANK_PARTS.e5, BANK_PARTS.e5plus]));
    expect(bank.apply.some((item) => item.answer.length > 0)).toBe(true);
    expect((await getBank(grade("grade=constructor"))).status).toBe(400);
  });

  it("serves only local preview content regardless of branch query", async () => {
    const response = await getPreview(
      preview("today=2026-11-28&branchId=branch-b"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json();
    expect(Object.keys(payload).sort()).toEqual([
      "cards",
      "concepts",
      "figures",
      "today",
      "traps",
    ]);
    expect(payload.concepts.length).toBeGreaterThan(0);
    expect(
      payload.concepts[0].propositions[0].pieces.some(
        (piece: { kind: string }) => piece.kind === "target",
      ),
    ).toBe(true);
    expect(payload).toEqual(await (await getPreview(preview())).json());
    expect((await getPreview(preview("today=2026-02-30"))).status).toBe(400);
    vi.stubEnv("MATH_FADING", "off");
    expect((await getPreview(preview())).status).toBe(404);
  });
});
