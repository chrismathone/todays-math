import { vi } from "vitest";
import type { PrivateDocument } from "@/contracts/privateWorkspace.contract";
import type { SessionRecovery } from "@/components/unified/privateStudioSessionStore";
import type { StudioSessionData } from "@/components/unified/studioSessionStore";
import type { StudioProblem } from "@/components/unified/types";

/** Hermetic API double: no network, database, auth session or AI calls. */
export function privateServer() {
  const documents = new Map<string, PrivateDocument>();
  const assets = new Map<
    string,
    { bytes: Uint8Array; size: number; type: string }
  >();
  let account = "owner-a";
  let failure = 0;
  const transport = vi.fn<typeof fetch>(async (input, init = {}) => {
    const path = String(input);
    if (!path.startsWith("/api/library/"))
      throw new Error(`Unexpected URL: ${path}`);
    const owner = new Headers(init.headers).get("x-workspace-owner");
    if (owner !== account)
      return Response.json(
        { error: { message: "계정이 변경되었습니다." } },
        { status: 403 },
      );
    if (failure)
      return Response.json(
        { error: { message: "저장 실패" } },
        { status: failure },
      );
    const url = new URL(path, "https://mock.invalid");
    const key = `${owner}:${url.pathname.split("/").at(-1)}`;
    if (url.pathname.includes("/assets/")) {
      if (init.method === "PUT") {
        const [, first, last, size] = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
          new Headers(init.headers).get("Content-Range")!,
        )!;
        const previous = assets.get(key);
        const offset = previous?.bytes.byteLength ?? 0;
        const blob = init.body as Blob;
        if (
          blob.size > 1024 * 1024 ||
          Number(last) - Number(first) + 1 !== blob.size
        )
          throw new Error("Invalid chunk");
        if (Number(first) === offset && offset < Number(size)) {
          const chunk = new Uint8Array(await blob.arrayBuffer());
          const bytes = new Uint8Array(offset + chunk.length);
          if (previous) bytes.set(previous.bytes);
          bytes.set(chunk, offset);
          assets.set(key, {
            bytes,
            size: Number(size),
            type: new Headers(init.headers).get("Content-Type")!,
          });
        }
        const stored = assets.get(key)!;
        return Response.json({
          data: {
            offset: stored.bytes.length,
            complete: stored.bytes.length === stored.size,
            url: url.pathname,
          },
        });
      }
      const stored = assets.get(key);
      return stored
        ? new Response(new Uint8Array(stored.bytes), {
            headers: { "Content-Type": stored.type },
          })
        : new Response(null, { status: 404 });
    }
    if (url.pathname === "/api/library/documents") {
      const kind = url.searchParams.get("kind");
      const all = [...documents.entries()]
        .filter(
          ([key, item]) =>
            key.startsWith(`${owner}:`) && (!kind || item.kind === kind),
        )
        .map(([, item]) => item)
        .reverse();
      const page = Number(url.searchParams.get("page"));
      const start = (page - 1) * 100;
      return Response.json({
        data: all
          .slice(start, start + 100)
          .map((item) => ({ ...item, payload: undefined })),
        meta: { total: all.length, page, pageSize: 100 },
      });
    }
    const previous = documents.get(key);
    if (!init.method || init.method === "GET")
      return previous
        ? Response.json({ data: previous })
        : new Response(null, { status: 404 });
    if (init.method === "DELETE") {
      if (
        !previous ||
        previous.revision !== Number(url.searchParams.get("revision"))
      )
        return new Response(null, { status: 409 });
      documents.delete(key);
      return Response.json({ data: { deleted: true } });
    }
    const body = JSON.parse(String(init.body));
    if ("owner" in body || "userId" in body)
      throw new Error("Owner must never appear in payload");
    if (
      previous
        ? body.expectedRevision !== previous.revision
        : body.expectedRevision !== null
    )
      return new Response(null, { status: 409 });
    if (init.method === "PATCH" && previous) {
      const renamed = {
        ...previous,
        title: body.title,
        revision: previous.revision + 1,
        payload: {
          ...previous.payload,
          ...(previous.kind === "draft" ? { title: body.title } : {}),
        },
      };
      documents.set(key, renamed);
      return Response.json({ data: renamed });
    }
    const date = new Date().toISOString();
    const document: PrivateDocument = {
      id: url.pathname.split("/").at(-1)!,
      kind: body.kind,
      title: body.title,
      payload: body.payload,
      problemCount:
        body.kind === "draft"
          ? body.payload.problems.length
          : body.payload.data.crops.length,
      revision: (previous?.revision ?? 0) + 1,
      createdAt: previous?.createdAt ?? date,
      updatedAt: date,
    };
    documents.set(key, document);
    return Response.json({ data: document });
  });
  return {
    transport,
    documents,
    assets,
    switchAccount: (next: string) => {
      account = next;
    },
    fail: (status: number) => {
      failure = status;
    },
  };
}
export function memoryRecovery(): SessionRecovery {
  const records = new Map<string, unknown>();
  return {
    get: async <T>(key: string) =>
      structuredClone(records.get(key)) as T | undefined,
    put: async (key, value) => {
      records.set(key, structuredClone(value));
    },
  };
}
export const problem = (id = "p1"): StudioProblem => ({
  id,
  content: "문제",
  answer: "1",
  solution: "풀이",
  grade: "중1",
  chapter: "수",
  section: "",
  difficulty: "중",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
});
export const sessionData = (name = "내 원본.pdf"): StudioSessionData => ({
  sources: [{ id: "source1", name, kind: "pdf", pages: 1 }],
  crops: [],
  sourceId: "source1",
  pageNumber: 1,
  activeCropId: "",
  inspectedPages: {},
  step: "crop",
  grade: "중1",
  level: "secondary",
});
