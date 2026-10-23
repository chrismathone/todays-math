import { afterEach, describe, expect, it, vi } from "vitest";
import { createOntologyWorkspaceSource } from "@/components/math-ontology/api";
afterEach(() => vi.unstubAllGlobals());
describe("operation policy errors", () => {
  it("shows the missing-evidence reason instead of incorrectly calling it a stale record or retrying confirmation", async () => {
    const fetch = vi.fn(async () => Response.json({ error: { code: "EVIDENCE_INSUFFICIENT" } }, { status: 409 }));
    vi.stubGlobal("fetch", fetch);
    await expect(createOntologyWorkspaceSource().confirm({ kind: "relation", id: "synthetic-review", label: "승인", changes: [], effects: [] }, new AbortController().signal)).rejects.toMatchObject({ code: "BLOCKED", message: "근거 또는 배포 허용을 확인해야 승인·게시할 수 있습니다. 후보는 보존했습니다." });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
