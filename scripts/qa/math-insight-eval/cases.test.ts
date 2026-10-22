import { test, expect, vi } from "vitest";
import { syntheticCases } from "./cases";
import { sectionEvidence, sessionOutcome } from "@/lib/math-prerequisite/evidence";
import fs from "node:fs";
import path from "node:path";
vi.stubGlobal("fetch", () => { throw new Error("offline synthetic test forbids network"); });
test("frozen synthetic course cases preserve positive/negative credit boundaries", () => {
  const cases = syntheticCases();
  expect(cases).toHaveLength(18);
  const get = (id: string) => cases.find(x => x.id === id)!;
  for (const id of ["hints-zero-credit", "give-up-zero-credit", "repeated-zero-credit"]) {
    const c = get(id);
    expect(c.course.learner.session!.attempts).toHaveLength(5);
    expect(sessionOutcome(c.course, c.course.learner.session!)).toMatchObject({independentCorrect:0,independentIncorrect:0,outcome:"inconclusive"});
  }
  expect(sectionEvidence(get("two-failures").course,"5-2-2-1",get("two-failures").now).outcome).toBe("failed");
  expect(sectionEvidence(get("fresh-pass").course,"5-2-2-1",get("fresh-pass").now).outcome).toBe("passed");
  expect(sectionEvidence(get("future-observation").course,"5-2-2-1",get("future-observation").now).outcome).toBe("unknown");
  const evidence = process.env.INSIGHT_AUDIT_EVIDENCE;
  if (evidence && process.env.INSIGHT_AUDIT_MODE === "freeze-sources") {
    const p=path.join(evidence,"synthetic-cases.json");
    fs.writeFileSync(p,JSON.stringify(cases,null,2)+"\n",{flag:"wx"});
  }
});
