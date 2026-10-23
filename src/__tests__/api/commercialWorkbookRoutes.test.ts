import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLocalCommercialWorkbookSource,
  COMMERCIAL_WORKBOOK_DEMO_ROSTER,
} from "@/lib/commercialWorkbooks/local";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import { CommercialWorkbookError } from "@/lib/commercialWorkbooks/errors";
import { bookInput } from "@/__tests__/helpers/commercialWorkbook";
import { createHttpCommercialWorkbookSource } from "@/lib/commercialWorkbooks/http";
const state = vi.hoisted(() => ({
  actor: {
    id: "10000000-0000-4000-8000-000000000004",
    menus: ["teaching"],
  } as { id: string; menus: string[] } | null,
  source: null as CommercialWorkbookSource | null,
  allowed: true,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: async () => state.actor }));
vi.mock("@/lib/commercialWorkbooks/server/source", () => ({
  createServerCommercialWorkbookSource: () => state.source,
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
import {
  GET as catalog,
  POST as createBook,
} from "@/app/api/commercial-workbooks/route";
import { GET as getBook } from "@/app/api/commercial-workbooks/[id]/route";
import { POST as reviseBook } from "@/app/api/commercial-workbooks/[id]/revisions/route";
import { GET as roster } from "@/app/api/commercial-workbooks/roster/route";
import {
  POST as assign,
  GET as assignments,
} from "@/app/api/commercial-workbooks/assignments/route";
import { GET as assignment } from "@/app/api/commercial-workbooks/assignments/[id]/route";
import { POST as marks } from "@/app/api/commercial-workbooks/assignments/[id]/marks/route";
import { GET as notes } from "@/app/api/commercial-workbooks/wrong-notes/route";
import { PATCH as updateNote } from "@/app/api/commercial-workbooks/wrong-notes/[id]/route";
import { POST as print } from "@/app/api/commercial-workbooks/wrong-notes/print/route";
const cls = COMMERCIAL_WORKBOOK_DEMO_ROSTER[0];
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function request(
  method = "GET",
  body?: unknown,
  path = "",
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost/api/commercial-workbooks${path}`, {
    method,
    headers: {
      origin: "http://localhost",
      "content-type": "application/json",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  state.actor = {
    id: "10000000-0000-4000-8000-000000000004",
    menus: ["teaching"],
  };
  state.allowed = true;
  state.source = createLocalCommercialWorkbookSource({
    seed: false,
    policy: {
      assertTeacher: async () => {
        if (!state.allowed)
          throw new CommercialWorkbookError("FORBIDDEN", "권한 변경");
      },
      listRoster: async () => [cls],
      assertRoster: async (id, studentIds) => {
        if (
          id !== cls.id ||
          studentIds.some((id) => !cls.students.some((s) => s.id === id))
        )
          throw new CommercialWorkbookError("SCOPE_CHANGED", "다른 반·학생");
        return { className: cls.name, students: cls.students };
      },
    },
  });
});
describe("commercial workbook route contracts", () => {
  it("rejects anonymous, missing menu, switched actor, cross-origin and malformed payload", async () => {
    state.actor = null;
    expect((await catalog(request())).status).toBe(401);
    state.actor = { id: "10000000-0000-4000-8000-000000000004", menus: [] };
    expect((await catalog(request())).status).toBe(403);
    state.actor.menus = ["teaching"];
    expect(
      (
        await catalog(
          request("GET", undefined, "", {
            "x-workspace-owner": crypto.randomUUID(),
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await createBook(
          request("POST", bookInput, "", { origin: "http://foreign.example" }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await createBook(
          request("POST", { ...bookInput, automaticGrading: true }),
        )
      ).status,
    ).toBe(400);
    expect((await getBook(request(), ctx("not-a-uuid"))).status).toBe(400);
    expect(
      (
        await createBook(
          new Request("http://localhost/api/commercial-workbooks", {
            method: "POST",
            headers: {
              origin: "http://localhost",
              "content-type": "application/json",
            },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("completes catalog → assignment → partial marks → history → wrong-note correction → key-free print", async () => {
    const created = await createBook(request("POST", bookInput));
    expect(created.status).toBe(201);
    const book = (await created.json()).data;
    expect(created.headers.get("cache-control")).toContain("no-store");
    expect((await (await catalog(request())).json()).data).toHaveLength(1);
    expect((await (await roster(request())).json()).data[0].id).toBe(cls.id);
    const assignmentInput = {
      requestId: "assignment-route-01",
      title: "참조 과제",
      editionId: book.id,
      expectedEditionRevision: 1,
      classId: cls.id,
      studentIds: [cls.students[0].id],
      exerciseIds: [book.exercises[0].id, book.exercises[1].id],
    };
    const a = (await (await assign(request("POST", assignmentInput))).json())
      .data;
    expect(
      (await (await assignments(request())).json()).data.items,
    ).toHaveLength(1);
    const save = {
      requestId: "mark-route-0001",
      studentId: cls.students[0].id,
      expectedRevision: 0,
      marks: [{ exerciseId: book.exercises[0].id, mark: "wrong" }],
    };
    const saved = await marks(request("POST", save), ctx(a.id));
    expect(saved.status).toBe(200);
    expect(
      (await (await marks(request("POST", save), ctx(a.id))).json()).data,
    ).toEqual((await saved.json()).data);
    expect(
      (
        await marks(
          request("POST", { ...save, requestId: "stale-route-001" }),
          ctx(a.id),
        )
      ).status,
    ).toBe(409);
    expect(
      (await (await assignment(request(), ctx(a.id))).json()).data.targets[0]
        .history,
    ).toHaveLength(1);
    const n = (await (await notes(request())).json()).data[0];
    const updated = await updateNote(
      request("PATCH", {
        requestId: "note-route-0001",
        expectedRevision: 0,
        correctionText: "풀이 확인",
        status: "done",
      }),
      ctx(n.id),
    );
    expect((await updated.json()).data.status).toBe("done");
    const printed = (
      await (await print(request("POST", { noteIds: [n.id] }))).json()
    ).data;
    expect(printed.items[0]).not.toHaveProperty("answerText");
    expect(printed.items[0]).not.toHaveProperty("key");
    expect(
      (
        await reviseBook(
          request("POST", {
            requestId: "revision-route-01",
            expectedRevision: 1,
            provenance: bookInput.provenance,
            exercises: bookInput.exercises,
          }),
          ctx(book.id),
        )
      ).status,
    ).toBe(200);
    expect(
      (await (await assignment(request(), ctx(a.id))).json()).data.edition
        .revision,
    ).toBe(1);
    state.allowed = false;
    expect((await marks(request("POST", save), ctx(a.id))).status).toBe(403);
    expect((await print(request("POST", { noteIds: [n.id] }))).status).toBe(
      403,
    );
  });
  it("HTTP source carries owner identity and surfaces exact domain errors without converting failures to data", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { code: "STALE_REVISION", message: "다시 읽기" } },
        { status: 409 },
      ),
    );
    const http = createHttpCommercialWorkbookSource({
      fetch: fetcher as typeof fetch,
      ownerId: state.actor!.id,
    });
    await expect(http.listCatalog()).rejects.toMatchObject({
      code: "STALE_REVISION",
      status: 409,
      message: "다시 읽기",
    });
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({
      "x-workspace-owner": state.actor!.id,
    });
  });
});
