import { AsyncLocalStorage } from "node:async_hooks";
import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  viewer: (): unknown => null,
  rows: new Map<
    string,
    { studentId: string; revision: number; payload: unknown }
  >(),
  owner: "d56e582b-a5af-4763-8b0a-801ecff4b5a5",
  classId: "7e7c388b-c264-4d39-809b-527723b8b74b",
  students: {
    A: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
    B: "ee7be323-de24-4c8c-b6d1-1da66f09efdf",
    C: "6fb3641b-2e54-4d98-b933-3dfef450edcb",
  } as Record<string, string>,
  requests: [] as {
    student: string;
    path: string;
    method: string;
    status: number;
  }[],
  bankReads: 0,
  blockedSourceId: "",
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => f.viewer() }));
// C alone injects a failed supply result; A/B continue using the real engine.
vi.mock("@/lib/math-prerequisite/supply", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/math-prerequisite/supply")>();
  return {
    ...actual,
    supplySafeSession: (
      ...args: Parameters<typeof actual.supplySafeSession>
    ): ReturnType<typeof actual.supplySafeSession> => {
      return f.blockedSourceId && args[0].key.includes(f.blockedSourceId)
        ? { ok: false, tried: 20 }
        : actual.supplySafeSession(...args);
    },
  };
});
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, fn: unknown) => fn,
}));
vi.mock("@/lib/db", () => {
  const student = (id: string) => ({
    id,
    name: `검증 학생 ${Object.keys(f.students).find((key) => f.students[key] === id)}`,
    classId: f.classId,
    eywaWithdrawnAt: null,
    class: { id: f.classId, name: "격리 검증 반", userId: f.owner },
    studentAccount: { id, disabledAt: null },
  });
  return {
    db: {
      accountAuditLog: { create: async () => ({}) },
      unit: {
        findFirst: async () => {
          f.bankReads++;
          return null;
        },
      },
      problem: { findMany: async () => [] },
      student: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          Object.values(f.students).includes(where.id)
            ? student(where.id)
            : null,
        findMany: async ({
          where,
        }: {
          where: { class?: { userId?: string } };
        }) =>
          where.class?.userId && where.class.userId !== f.owner
            ? []
            : Object.values(f.students).map(student),
      },
      class: {
        findMany: async () => [{ id: f.classId, name: "격리 검증 반" }],
      },
      studentSrsState: {
        findUnique: async ({ where }: { where: { studentId: string } }) =>
          structuredClone(f.rows.get(where.studentId) ?? null),
        findMany: async ({
          where,
        }: {
          where: { studentId: { in: string[] } };
        }) =>
          where.studentId.in.flatMap((id) =>
            f.rows.has(id) ? [structuredClone(f.rows.get(id)!)] : [],
          ),
        create: async ({
          data,
        }: {
          data: { studentId: string; revision: number; payload: unknown };
        }) => {
          if (f.rows.has(data.studentId)) throw { code: "P2002" };
          f.rows.set(data.studentId, structuredClone(data));
          return data;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { studentId: string; revision: number };
          data: { payload: unknown };
        }) => {
          const row = f.rows.get(where.studentId);
          if (!row || row.revision !== where.revision) return { count: 0 };
          f.rows.set(where.studentId, {
            ...row,
            revision: row.revision + 1,
            payload: structuredClone(data.payload),
          });
          return { count: 1 };
        },
      },
    },
  };
});

import { GET, POST } from "../../../src/app/api/learn/math-srs/course/route";
import { POST as ATTEMPT } from "../../../src/app/api/learn/math-srs/course/attempts/route";
import { POST as HINT } from "../../../src/app/api/learn/math-srs/course/hint/route";
import { POST as PLAN } from "../../../src/app/api/learn/math-srs/course/plan/route";
import { GET as ROSTER } from "../../../src/app/api/math-srs/course/route";
import {
  GET as DETAIL,
  POST as TEACHER_PLAN,
} from "../../../src/app/api/students/[id]/math-srs/course/route";
import {
  emptySrsState,
  parseSrsState,
} from "../../../src/lib/math-srs/serverState";
import { failedTargetCourse } from "../../../src/__tests__/helpers/mathPrerequisiteIntegrationFixture";

it("serves real handlers and player against isolated student storage until /__fixture/stop", async () => {
  vi.stubEnv("MATH_PREREQ_CHECK", "on");
  const origin = "http://127.0.0.1:4336";
  vi.stubEnv("AUTH_URL", origin);
  const now = new Date();
  const a = failedTargetCourse(now, 10);
  // B has one direct completed failure; A's second observation is not shared.
  const b = failedTargetCourse(now, 10);
  b.history = [];
  const c = failedTargetCourse(now, 10);
  f.blockedSourceId = c.learner.session!.id;
  for (const [key, course] of [
    ["A", a],
    ["B", b],
    ["C", c],
  ] as const)
    f.rows.set(f.students[key], {
      studentId: f.students[key],
      revision: 1,
      payload: parseSrsState({ ...emptySrsState(), course }),
    });
  const auth = new AsyncLocalStorage<unknown>();
  f.viewer = () => auth.getStore() ?? null;
  const root = fileURLToPath(new URL(".", import.meta.url));
  const vite = await createViteServer({
    configFile: false,
    root,
    cacheDir: `${root}/../../../.tmp-math-prerequisite-vite`,
    plugins: [react()],
    resolve: {
      tsconfigPaths: true,
      alias: {
        "next/dynamic": `${root}/nextDynamic.tsx`,
        "next/navigation": `${root}/nextNavigation.ts`,
        "next/link": `${root}/nextLink.tsx`,
        "next/image": `${root}/nextImage.tsx`,
      },
    },
    server: {
      middlewareMode: true,
      fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] },
    },
    appType: "spa",
  });
  let stop: () => void = () => {};
  const stopped = new Promise<void>((resolve) => {
    stop = resolve;
  });
  const server = createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? "/", origin);
    if (url.pathname === "/__fixture/stop") {
      res.end("stopping");
      stop();
      return;
    }
    const student =
      /math_prereq_fixture=([A-Z]|teacher)/.exec(
        req.headers.cookie ?? "",
      )?.[1] ?? "A";
    if (url.pathname === "/__fixture/state") {
      res.setHeader("content-type", "application/json");
      const row = f.rows.get(f.students[student]);
      res.end(
        JSON.stringify({
          fixture: true,
          student,
          ...row,
          requests: f.requests,
          bankReads: f.bankReads,
        }),
      );
      return;
    }
    if (!url.pathname.startsWith("/api/")) {
      const key = url.searchParams.get("student");
      if (key && (key === "teacher" || f.students[key]))
        res.setHeader(
          "Set-Cookie",
          `math_prereq_fixture=${key}; Path=/; HttpOnly; SameSite=Strict`,
        );
      vite.middlewares(req, res);
      return;
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers))
      if (value)
        headers.set(key, Array.isArray(value) ? value.join(",") : value);
    const request = new Request(url, {
      method: req.method,
      headers,
      ...(req.method !== "GET" ? { body: Buffer.concat(chunks) } : {}),
    });
    const viewer =
      student === "teacher"
        ? {
            user: {
              id: f.owner,
              name: "검증 교사",
              role: "director",
              isAdmin: false,
              approvalStatus: "approved",
              menus: ["srs"],
            },
          }
        : {
            student: {
              studentId: f.students[student],
              mustChangePassword: false,
            },
          };
    const response = await auth.run(viewer, async () => {
      if (url.pathname === "/api/learn/math-srs/course")
        return req.method === "GET" ? GET(request) : POST(request);
      if (url.pathname.endsWith("/attempts")) return ATTEMPT(request);
      if (url.pathname.endsWith("/hint")) return HINT(request);
      if (url.pathname.endsWith("/plan")) return PLAN(request);
      if (url.pathname === "/api/math-srs/course") return ROSTER(request);
      const id = /^\/api\/students\/([^/]+)\/math-srs\/course$/.exec(
        url.pathname,
      )?.[1];
      if (id) {
        const context = { params: Promise.resolve({ id }) };
        return req.method === "GET"
          ? DETAIL(request, context)
          : TEACHER_PLAN(request, context);
      }
      return new Response("fixture route missing", { status: 404 });
    });
    f.requests.push({
      student,
      path: url.pathname,
      method: req.method ?? "GET",
      status: response.status,
    });
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  try {
    await new Promise<void>((resolve) =>
      server.listen(4336, "127.0.0.1", resolve),
    );
    console.info(
      `[math-prerequisite QA] READY ${origin} — real handlers, mock DB, fixture students only`,
    );
    await stopped;
    expect(f.rows.size).toBe(3);
    for (const row of f.rows.values())
      expect(parseSrsState(row.payload)).toBeDefined();
  } finally {
    await vite.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllEnvs();
  }
});
