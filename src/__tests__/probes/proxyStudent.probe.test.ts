/**
 * **변이 탐침** — 관문(`src/proxy.ts`)에 학생 세션을 실어 몇 요청의 결과를 찍는다.
 * `scripts/qa/mutate-student-auth.ts` 가 변이 전후로 불러 견준다(⑶ 단계). 평소에는 건너뛴다
 * (`STUDENT_AUTH_PROBE=1` 일 때만). 판정은 proxyStudentGate.test.ts 의 몫이다.
 */
import { appendFileSync } from "node:fs";

import { NextRequest } from "next/server";
import { describe, it, vi } from "vitest";

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (request: NextRequest) =>
    handler(Object.assign(request, { auth: session() })),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

import { proxy } from "@/proxy";

const ON = process.env.STUDENT_AUTH_PROBE === "1";

describe.runIf(ON)("관문 탐침", () => {
  it("proxy-student", async () => {
    session.mockReturnValue({
      student: {
        accountId: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
        studentId: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f71",
        name: "이서준",
        mustChangePassword: false,
      },
      expires: "2099-01-01T00:00:00.000Z",
    });
    const call = proxy as unknown as (r: NextRequest) => Promise<Response>;
    const out: unknown[] = [];
    for (const [m, p] of [
      ["GET", "/"],
      ["GET", "/api/problems"],
      ["GET", "/learn"],
      ["GET", "/figures/a.png"],
    ] as const) {
      const res = await call(
        new NextRequest(`http://localhost${p}`, { method: m }),
      );
      out.push([m, p, res.status, res.headers.get("location")]);
    }
    // 하네스가 준 파일에 한 줄 — 콘솔은 vitest 가 통과한 시험에서 안 옮길 때가 있다
    const file = process.env.STUDENT_AUTH_PROBE_OUT;
    if (file)
      appendFileSync(
        file,
        `${JSON.stringify({ name: "proxy-student", value: out })}\n`,
      );
  });
});
