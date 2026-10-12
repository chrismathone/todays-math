import { Blob as NodeBlob } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import { privateServer } from "../fixtures/privateCloud";

beforeEach(() => {
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("crypto", webcrypto);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("private cloud transport", () => {
  it("loads inline images in parallel with at most three fenced reads and preserves replacement order", async () => {
    vi.useFakeTimers();
    try {
      let active = 0;
      let maximum = 0;
      let nextUrl = 0;
      vi.spyOn(URL, "createObjectURL").mockImplementation(
        () => `blob:inline-${++nextUrl}`,
      );
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
      const paths = Array.from(
        { length: 7 },
        (_, index) =>
          `/api/library/assets/${(index + 1).toString(16).padStart(64, "0")}`,
      );
      const transport = vi.fn<typeof fetch>(async (url, init) => {
        maximum = Math.max(maximum, ++active);
        expect(new Headers(init?.headers).get("x-workspace-owner")).toBe(
          "owner-a",
        );
        expect(init).toMatchObject({
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
        });
        await new Promise((resolve) => setTimeout(resolve, 80));
        active--;
        return new Response(new Blob([String(url)], { type: "image/png" }));
      });
      const client = new PrivateCloudClient("owner-a", transport);
      const original = {
        content: [...paths, paths[0]]
          .map((path) => `![그림](${path})`)
          .join("\n"),
      };
      const started = Date.now();
      let readyAt = 0;
      const materializing = client.materialize(original).then((result) => {
        readyAt = Date.now() - started;
        return result;
      });
      await vi.runAllTimersAsync();
      const displayed = await materializing;
      expect(readyAt).toBe(240);
      expect(maximum).toBe(3);
      expect(transport).toHaveBeenCalledTimes(7);
      expect(await client.externalize(displayed)).toEqual(original);
      client.dispose();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("acknowledges a committed save whose response was lost without writing it twice", async () => {
    const server = privateServer();
    let loseResponse = true;
    const transport: typeof fetch = async (url, init) => {
      const response = await server.transport(url, init);
      if (init?.method === "PUT" && loseResponse) {
        loseResponse = false;
        throw new Error("connection closed after commit");
      }
      return response;
    };
    const client = new PrivateCloudClient("owner-a", transport);
    const saved = await client.save(
      "lost",
      "draft",
      "제목",
      { problems: [] },
      null,
    );
    expect(saved.revision).toBe(1);
    expect(
      server.transport.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
    expect(
      (
        await client.save(
          "lost",
          "draft",
          "다음 수정",
          { problems: [] },
          saved.revision,
        )
      ).revision,
    ).toBe(2);
  });

  it("verifies an identical retry using JSON content even when database key order changes", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await client.save(
      "retry",
      "draft",
      "제목",
      { problems: [], settings: { a: 1, b: 2 } },
      null,
    );
    const saved = server.documents.get("owner-a:retry")!;
    saved.payload = { settings: { b: 2, a: 1 }, problems: [] };
    expect(
      (
        await client.save(
          "retry",
          "draft",
          "제목",
          { problems: [], settings: { a: 1, b: 2 } },
          null,
        )
      ).revision,
    ).toBe(1);
    expect(saved.revision).toBe(1);
    // A later revision, different title, or different content is still a conflict.
    saved.revision = 2;
    await expect(
      client.save(
        "retry",
        "draft",
        "제목",
        { problems: [], settings: { a: 1, b: 2 } },
        null,
      ),
    ).rejects.toMatchObject({ status: 409 });
    saved.revision = 1;
    await expect(
      client.save("retry", "draft", "수정", saved.payload, null),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      client.save("retry", "draft", "제목", { problems: ["unsaved"] }, null),
    ).rejects.toMatchObject({ status: 409 });
    expect(server.documents.get("owner-a:retry")).toBe(saved);
  });

  it("accepts encoded SVG charset URLs and bounds simultaneous asset transfers", async () => {
    const server = privateServer();
    let active = 0;
    let maximum = 0;
    const transport = vi.fn<typeof fetch>(async (url, init) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      try {
        return await server.transport(url, init);
      } finally {
        active--;
      }
    });
    const client = new PrivateCloudClient("owner-a", transport);
    const svg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}`;
    const value = await client.externalize({ image: svg });
    expect(value.image).toMatch(/^\/api\/library\/assets\//);
    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        client.upload(new Blob([String(index)], { type: "image/png" })),
      ),
    );
    expect(maximum).toBeLessThanOrEqual(3);
  });
  it("keeps shared worksheet images alive until the last account workspace releases them", async () => {
    const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:shared-image");
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const server = privateServer();
    const worksheet = new PrivateCloudClient("owner-a", server.transport);
    const studio = new PrivateCloudClient("owner-a", server.transport);
    worksheet.retain();
    studio.retain();
    const url = await studio.upload(
      new Blob(["shared"], { type: "image/png" }),
    );
    const displayed = await studio.materialize(url);
    studio.dispose();
    expect(revoke).not.toHaveBeenCalled();
    expect(await worksheet.externalize(displayed)).toBe(url);
    worksheet.dispose();
    expect(create).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:shared-image");
  });
  it("fences reads, saves, rename and delete to the immutable account scope", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const doc = await client.save(
      "document",
      "draft",
      "제목",
      { problems: [] },
      null,
    );
    await client.list();
    await client.get(doc.id);
    const renamed = await client.rename(doc.id, "새 제목", doc.revision);
    expect(renamed.title).toBe("새 제목");
    await client.remove(doc.id, renamed.revision);
    server.switchAccount("owner-b");
    await expect(
      client.save("late", "draft", "이전 계정 작업", { problems: [] }, null),
    ).rejects.toMatchObject({ status: 403 });
    expect(server.documents.size).toBe(0);
    for (const [url, init] of server.transport.mock.calls) {
      expect(String(url)).toMatch(/^\/api\/library\//);
      expect(new Headers(init?.headers).get("x-workspace-owner")).toBe(
        "owner-a",
      );
    }
  });
  it("externalizes crop, figure and embedded image bytes once without fetching external URLs", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const data = "data:image/png;base64,aGVsbG8=";
    const value = {
      image: data,
      figureUrls: [data, "https://external.invalid/image.png"],
      content: `![그림](${data})`,
      figureSvg: `<svg><image href="${data}"/></svg>`,
    };
    const external = await client.externalize(value);
    expect(external.image).toMatch(/^\/api\/library\/assets\/[a-f0-9]{64}$/);
    expect(JSON.stringify(external)).not.toContain("data:image");
    expect(external.figureUrls[1]).toBe(value.figureUrls[1]);
    expect(await client.externalize(value)).toEqual(external);
    expect(server.assets.size).toBe(1);
    expect(server.transport).toHaveBeenCalledTimes(1);
  });
  it("uploads blob URLs and resumes a partial chunk upload after failure", async () => {
    const server = privateServer();
    const original = new Blob([new Uint8Array(2 * 1024 * 1024 + 12)], {
      type: "image/png",
    });
    let failed = false;
    const transport = vi.fn<typeof fetch>(async (url, init) => {
      if (url === "blob:local-image") return new Response(original);
      if (
        !failed &&
        new Headers(init?.headers)
          .get("Content-Range")
          ?.startsWith("bytes 1048576-")
      ) {
        failed = true;
        throw new Error("offline");
      }
      return server.transport(url, init);
    });
    const client = new PrivateCloudClient("owner-a", transport);
    await expect(
      client.externalize({ image: "blob:local-image" }),
    ).rejects.toThrow("연결");
    const result = await client.externalize({ image: "blob:local-image" });
    expect(result.image).toMatch(/^\/api\/library\/assets\//);
    expect([...server.assets.values()][0].bytes.length).toBe(original.size);
    expect(
      transport.mock.calls.filter(([url]) => url === "blob:local-image"),
    ).toHaveLength(2);
    await client.externalize({ image: "blob:local-image" });
    expect(
      transport.mock.calls.filter(([url]) => url === "blob:local-image"),
    ).toHaveLength(2);
  });
  it("hydrates private images through fenced GETs and reuses the private URL when resaving", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:private-view");
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const url = await client.upload(new Blob(["image"], { type: "image/png" }));
    const displayed = await client.materialize({ image: url });
    expect(displayed.image).toBe("blob:private-view");
    expect(await client.externalize(displayed)).toEqual({ image: url });
    expect(server.transport).toHaveBeenCalledTimes(2);
  });
  it("does not treat malformed acknowledgments, conflicts or failures as saved", async () => {
    const client = new PrivateCloudClient(
      "owner-a",
      vi.fn(async () => Response.json({ data: {} })),
    );
    await expect(
      client.save("id", "draft", "제목", { problems: [] }, null),
    ).rejects.toThrow("확인");
    const server = privateServer();
    const valid = new PrivateCloudClient("owner-a", server.transport);
    await valid.save("id", "draft", "제목", { problems: [] }, null);
    await expect(
      valid.save("id", "draft", "충돌", { problems: [] }, null),
    ).rejects.toMatchObject({ status: 409 });
    server.fail(503);
    await expect(valid.list()).rejects.toMatchObject({ status: 503 });
  });
});
