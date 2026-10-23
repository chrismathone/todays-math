import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/math-ontology/actions/production.server", () => ({ handleOntologyOperations: vi.fn() }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({ withErrorLog: (_path: string, handler: unknown) => handler }));
import * as publish from "@/app/api/math-ontology/publish/jobs/route";
import * as recover from "@/app/api/math-ontology/publish/jobs/[jobId]/recover/route";
import { handleOntologyOperations } from "@/lib/math-ontology/actions/production.server";

describe("both actual publication entrypoints support the bounded compiler lifecycle", () => {
  it.each([publish, recover])("has a 600s Node duration and delegates to the same fenced operations handler", route => {
    expect(route.runtime).toBe("nodejs");
    expect(route.maxDuration).toBe(600);
    expect(route.POST).toBe(handleOntologyOperations);
  });
});
