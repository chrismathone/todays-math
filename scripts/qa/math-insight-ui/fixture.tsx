import { createRoot } from "react-dom/client";
import CourseDashboard from "../../../src/components/math-srs/CourseDashboard";
import { insightFixture, inquiryFixture, scopeA, scopeB } from "./data-v2";
import { courseDetailFixture, rosterStudent } from "./data";
import "../../../src/app/globals.css";
import "katex/dist/katex.min.css";
import w from "../../../src/components/unified/Workroom.module.css";
import "./fixture.css";
import { MathText } from "../../../src/components/math/MathText";

const scene = new URLSearchParams(location.search).get("scene") ?? "ready";
type Call = {
  url: string;
  method: string;
  body: unknown;
  aborted: boolean;
  version: string | null;
};
let conflicted = false;
const qa = { calls: [] as Call[], release: () => {}, blocked: [] as string[] };
Object.assign(window, { insightQa: qa });
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
const fail = (status: number, message: string) =>
  json({ error: { code: "SYNTHETIC", message } }, status);

// In-memory transport only. Never falls through to network or database.
window.fetch = async (input, options) => {
  const url = new URL(String(input), location.origin);
  const method = options?.method ?? "GET";
  const call = {
    url: url.href,
    method,
    body: options?.body ? JSON.parse(String(options.body)) : null,
    aborted: options?.signal?.aborted ?? false,
    version: new Headers(options?.headers).get("x-math-insight-version"),
  };
  qa.calls.push(call);
  options?.signal?.addEventListener(
    "abort",
    () => {
      call.aborted = true;
    },
    { once: true },
  );
  if (url.origin !== location.origin) {
    qa.blocked.push(url.href);
    return fail(403, "외부 요청 차단");
  }
  if (url.pathname === "/api/math-srs/course" && method === "GET")
    return json({
      data: {
        management: {
          canOpen: true,
          branchId: scopeA.branchId,
          branchRole: "owner",
        },
        classes: [scopeA, scopeB].map((context) => ({
          id: context.classId,
          name: rosterStudent(context).className,
        })),
        students: [rosterStudent(), rosterStudent(scopeB)],
      },
    });
  const context = url.pathname.includes(scopeB.studentId) ? scopeB : scopeA;
  if (
    url.pathname === `/api/students/${context.studentId}/math-srs/course` &&
    method === "GET"
  )
    return json({ data: courseDetailFixture(context) });
  if (url.pathname === `/api/students/${context.studentId}/math-srs/insight`) {
    if (call.version !== "2") {
      qa.blocked.push("missing-v2-opt-in");
      return fail(400, "조회 버전 확인 필요");
    }
    if (method === "GET") {
      if (scene === "loading" || (scene === "late-get" && context === scopeA))
        await new Promise<void>((resolve) => {
          qa.release = resolve;
        });
      if (scene === "error" || (scene === "stale-auth" && conflicted))
        return fail(403, "예시 조회 권한을 확인해 주세요.");
      const directScenes = [
        "feature-off",
        "empty",
        "outside",
        "paused",
        "future",
        "stale",
        "missing-source",
        "unfinished",
        "multiple-grades",
        "grade-3",
        "grade-4",
        "grade-5",
        "grade-6",
      ];
      const snapshot = insightFixture(
        context,
        conflicted ? "stale" : directScenes.includes(scene) ? scene : "ready",
      );
      if (scene === "inconsistent") snapshot.context = { ...scopeB };
      return json({ data: snapshot });
    }
    if (method === "POST") {
      if (scene === "late-post" && context === scopeA)
        await new Promise<void>((resolve) => {
          qa.release = resolve;
        });
      if (["conflict", "stale-auth"].includes(scene)) {
        conflicted = true;
        return fail(409, "조회한 학습 기록이 바뀌었습니다.");
      }
      if (scene === "auth-denied")
        return fail(403, "예시 조회 권한을 확인해 주세요.");
      if (scene === "unavailable")
        return fail(503, "AI 질문 기능을 지금 사용할 수 없습니다.");
      if (scene === "ai-error")
        return fail(502, "질문 응답을 확인하지 못했습니다.");
      if (scene === "unknown-error")
        return fail(500, "질문 응답을 확인하지 못했습니다.");
      const result = inquiryFixture(context, scene);
      if (scene === "ai-inconsistent") result.facts[0].text = "합성 위조 문장";
      if (scene === "insufficient") {
        result.status = "insufficient";
        result.intent = "insufficient";
        result.facts = [
          result.snapshot.facts.find((fact) => fact.kind === "limitation")!,
        ];
      }
      return json({ data: result });
    }
  }
  qa.blocked.push(url.href);
  return fail(403, "합성 검증에서 허용하지 않은 요청");
};

createRoot(document.getElementById("root")!).render(
  <div className={w.workspace} data-product="math" data-authenticated="true">
    <div className="fixture-font-probe" aria-hidden="true">
      <MathText text="$\\frac{3}{4}-\\frac{1}{2}$" />
    </div>
    <aside className={w.sidebar} aria-label="예시 작업실 메뉴">
      <div className={w.brand}>오늘의수학</div>
      <nav className={w.navigation}>
        <button type="button" className={w.navActive}>
          오늘의 기억 · SRS
        </button>
      </nav>
      <p>합성 기록 검증</p>
    </aside>
    <main className={w.main}>
      <header className={w.topbar}>
        <span className={w.breadcrumb}>학습 관리 · 예시 데이터</span>
        <span />
        <span>실제 계정 아님</span>
      </header>
      <div className={w.viewContent}>
        <CourseDashboard />
      </div>
    </main>
  </div>,
);
