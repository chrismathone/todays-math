import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { CLASS_A_ID } from "@/mocks/data";
import { fetchProgress } from "@/lib/class/classApi";
import { loadMainDashboard } from "@/lib/main/loadMainDashboard";

describe("empty progress responses", () => {
  it("treats 204 as an empty class state without attempting JSON parsing", async () => {
    server.use(
      http.get("/api/progress", () => new HttpResponse(null, { status: 204 })),
    );
    expect(await fetchProgress(CLASS_A_ID)).toBeNull();
    const dashboard = await loadMainDashboard();
    expect(dashboard.classes.length).toBeGreaterThan(0);
    expect(dashboard.progressByClass[CLASS_A_ID]).toBeNull();
    expect(dashboard.suggestByClass).toHaveProperty(CLASS_A_ID);
  });
});
