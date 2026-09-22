// @vitest-environment node
/**
 * 🔴 가드 — `src/app/api/**\/route.ts` 의 **모든 내보낸 HTTP 메서드**가 `withErrorLog` 를 지나는가.
 *
 * 원장님 2026-09-22 «모든 곳에 로그를 붙여서 오류 로그 수집». 새 경로가 틀을 빠뜨리면 그 경로의 거절은
 * 어디에도 안 남는다 — 그리고 아무도 모른다(오늘 도형 재작도 422 가 그랬다). 그래서 빠뜨림을 시험이 잡는다.
 *
 * 두 겹으로 센다:
 *  ⑴ **소스(AST)** — 파일마다 내보낸 메서드를 **하나하나** 본다. `export async function GET` · 틀 없는
 *     `export const` · 구조분해(`export const { GET } = …`) · 다시 내보내기(`export { h as GET }`·`export *`)는
 *     전부 빨강이다 — «증명할 수 없는 모양»은 통과가 아니다. 틀의 첫 인자가 **그 파일의 경로**와 같아야 한다
 *     (라우트별 묶음이 조회의 열쇠라, 틀린 경로는 빠뜨림만큼 나쁘다).
 *  ⑵ **행동** — 모듈을 실제로 불러, 내보낸 메서드가 틀의 표지(`ERROR_LOG_ROUTE`)를 들고 있는지 본다.
 *     (20번 교훈 2026-09-21 «표지로 센 전수는 "그 파일이 조각을 안다"까지만 말한다» — import 가 있다고
 *     모든 메서드가 지나는 것은 아니다.)
 *
 * 음성 대조: 아래 «가드가 우는가»가 일부러 틀린 소스 여덟 가지를 넣어 빨개지는지 본다
 * (20번 교훈 2026-08-21 «가드가 0을 내면 "없다"가 아니라 "못 센다"일 수 있다»).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ERROR_LOG_ROUTE } from "@/lib/errorLog/withErrorLog";

const METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);
const WRAPPER_MODULE = "@/lib/errorLog/withErrorLog";
const API_ROOT = path.join(process.cwd(), "src", "app");

/**
 * 틀을 **일부러** 안 거치는 경로 — 까닭과 함께. 늘리려면 여기 적고 리뷰에 보이게 한다.
 * 브라우저 오류를 받는 곳이 스스로를 기록하면 «기록 실패 → 브라우저 보고 → 또 기록»의 되먹임 고리가 선다.
 */
const EXEMPT: Record<string, string> = {
  "/api/logs/client": "브라우저 오류를 받는 곳 — 스스로 기록하면 되먹임 고리",
};

/** `src/app/api/tests/[id]/route.ts` → `/api/tests/[id]` (경로 묶음 `(x)` 는 뺀다). */
function routeOf(file: string): string {
  const rel = path
    .relative(API_ROOT, path.dirname(file))
    .split(path.sep)
    .filter((segment) => !/^\(.*\)$/.test(segment));
  return `/${rel.join("/")}`;
}

type Coverage = { methods: string[]; problems: string[] };

const hasExport = (node: ts.Node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some(
    (m) => m.kind === ts.SyntaxKind.ExportKeyword,
  );

/** 소스 하나 → 내보낸 메서드와 문제. 모르는 모양은 문제다(통과가 아니다). */
function checkRouteSource(route: string, source: string): Coverage {
  const file = ts.createSourceFile(
    "route.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const methods: string[] = [];
  const problems: string[] = [];
  let wrapper: string | undefined;
  const locals = new Map<string, ts.VariableDeclaration>();

  for (const statement of file.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === WRAPPER_MODULE
    ) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings))
        for (const element of bindings.elements)
          if ((element.propertyName ?? element.name).text === "withErrorLog")
            wrapper = element.name.text;
    }
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name))
          locals.set(declaration.name.text, declaration);
  }

  /** 초기값이 `withErrorLog("<이 파일의 경로>", 처리기)` 인가 */
  const checkWrapped = (name: string, declaration: ts.VariableDeclaration) => {
    const init = declaration.initializer;
    if (
      !init ||
      !ts.isCallExpression(init) ||
      !ts.isIdentifier(init.expression) ||
      !wrapper ||
      init.expression.text !== wrapper
    ) {
      problems.push(
        `${name}: withErrorLog 를 지나지 않는다${wrapper ? "" : ` (${WRAPPER_MODULE} 를 import 하지 않았다)`}`,
      );
      return;
    }
    const [first, second] = init.arguments;
    const given =
      first &&
      (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))
        ? first.text
        : undefined;
    if (given !== route)
      problems.push(
        `${name}: 틀의 경로가 파일과 다르다 — ${given ?? "(글자 그대로가 아님)"} ≠ ${route}`,
      );
    if (!second) problems.push(`${name}: 처리기 인자가 없다`);
  };

  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExport(statement)) {
      const name = statement.name?.text;
      if (name && METHODS.has(name)) {
        methods.push(name);
        problems.push(
          `${name}: 함수 선언을 그대로 내보낸다 — 틀을 지나지 않는다`,
        );
      }
    } else if (ts.isVariableStatement(statement) && hasExport(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const name = declaration.name.text;
          if (!METHODS.has(name)) continue;
          methods.push(name);
          checkWrapped(name, declaration);
        } else {
          for (const element of declaration.name.elements) {
            if (!ts.isBindingElement(element)) continue;
            const name = ts.isIdentifier(element.name)
              ? element.name.text
              : undefined;
            if (name && METHODS.has(name)) {
              methods.push(name);
              problems.push(
                `${name}: 구조분해로 내보낸다 — 틀을 증명할 수 없다`,
              );
            }
          }
        }
      }
    } else if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause) {
        problems.push("export * — 무엇이 나가는지 셀 수 없다");
        continue;
      }
      if (ts.isNamespaceExport(statement.exportClause)) {
        problems.push("export * as — 무엇이 나가는지 셀 수 없다");
        continue;
      }
      for (const element of statement.exportClause.elements) {
        const name = element.name.text;
        if (!METHODS.has(name)) continue;
        methods.push(name);
        const local = (element.propertyName ?? element.name).text;
        const declaration = statement.moduleSpecifier
          ? undefined
          : locals.get(local);
        if (declaration) checkWrapped(name, declaration);
        else problems.push(`${name}: 다시 내보내기 — 틀을 증명할 수 없다`);
      }
    }
  }
  if (!methods.length)
    problems.push(
      "내보낸 HTTP 메서드를 하나도 못 찾았다 — 가드가 못 세는 모양",
    );
  return { methods, problems };
}

const files = readdirSync(path.join(API_ROOT, "api"), { recursive: true })
  .map(String)
  .filter((rel) => path.basename(rel) === "route.ts")
  .map((rel) => path.join(API_ROOT, "api", rel))
  .sort();

describe("🔴 모든 route.ts 의 모든 메서드가 withErrorLog 를 지난다", () => {
  it("센 것이 0 이 아니다 — 파일과 메서드를 실제로 찾았다", () => {
    expect(files.length).toBeGreaterThan(80);
    const methods = files
      .filter((file) => !EXEMPT[routeOf(file)])
      .flatMap(
        (file) =>
          checkRouteSource(routeOf(file), readFileSync(file, "utf8")).methods,
      );
    expect(methods.length).toBeGreaterThanOrEqual(files.length - 1);
  });

  it("⑴ 소스 — 빠뜨린 메서드·틀린 경로가 없다", () => {
    const problems = files
      .filter((file) => !EXEMPT[routeOf(file)])
      .flatMap((file) =>
        checkRouteSource(
          routeOf(file),
          readFileSync(file, "utf8"),
        ).problems.map(
          (problem) => `${path.relative(process.cwd(), file)} — ${problem}`,
        ),
      );
    expect(problems).toEqual([]);
  });

  it("예외 목록이 낡지 않았다 — 적힌 경로는 실재하고, 실제로 틀을 안 쓴다", () => {
    const routes = new Map(files.map((file) => [routeOf(file), file]));
    for (const route of Object.keys(EXEMPT)) {
      const file = routes.get(route);
      expect(file, `${route} 가 없다 — 예외 목록에서 지울 것`).toBeTruthy();
      expect(readFileSync(file!, "utf8")).not.toContain(WRAPPER_MODULE);
    }
  });

  it("⑵ 행동 — 모듈을 불러 보면 내보낸 메서드가 전부 틀의 표지를 들고 있다", async () => {
    const missing: string[] = [];
    let counted = 0;
    for (const file of files) {
      const route = routeOf(file);
      if (EXEMPT[route]) continue;
      const mod = (await import(/* @vite-ignore */ file)) as Record<
        string,
        unknown
      >;
      for (const [name, value] of Object.entries(mod)) {
        if (!METHODS.has(name)) continue;
        counted++;
        const mark =
          typeof value === "function"
            ? (value as unknown as Record<symbol, unknown>)[ERROR_LOG_ROUTE]
            : undefined;
        if (mark !== route)
          missing.push(`${route} ${name} — 표지 ${String(mark)}`);
      }
    }
    expect(counted).toBeGreaterThanOrEqual(files.length - 1);
    expect(missing).toEqual([]);
  }, 120_000);
});

describe("가드가 우는가 — 일부러 틀린 소스(음성 대조)", () => {
  const IMPORT = `import { withErrorLog } from "${WRAPPER_MODULE}";\n`;
  const route = "/api/tests/[id]";

  it("맞게 감싼 소스는 문제 0", () => {
    expect(
      checkRouteSource(
        route,
        `${IMPORT}async function handleGet() { return new Response(); }\nexport const GET = withErrorLog("/api/tests/[id]", handleGet);\nexport const maxDuration = 60;`,
      ),
    ).toEqual({ methods: ["GET"], problems: [] });
  });

  it.each([
    [
      "함수 선언을 그대로 내보냄",
      `${IMPORT}export async function GET() { return new Response(); }`,
    ],
    [
      "틀 없는 const",
      `${IMPORT}export const GET = async () => new Response();`,
    ],
    [
      "틀린 경로",
      `${IMPORT}const h = async () => new Response();\nexport const GET = withErrorLog("/api/tests", h);`,
    ],
    [
      "틀을 import 안 함(같은 이름의 지역 함수)",
      `const withErrorLog = (r: string, h: unknown) => h;\nconst h = async () => new Response();\nexport const GET = withErrorLog("/api/tests/[id]", h);`,
    ],
    [
      "구조분해로 내보냄",
      `${IMPORT}import { handlers } from "@/lib/auth";\nexport const { GET, POST } = handlers;`,
    ],
    [
      "다시 내보내기",
      `${IMPORT}const h = async () => new Response();\nexport { h as GET };`,
    ],
    ["export *", `export * from "./handlers";`],
    ["메서드가 하나도 없음", `${IMPORT}export const maxDuration = 60;`],
  ])("%s → 빨강", (_label, source) => {
    expect(checkRouteSource(route, source).problems.length).toBeGreaterThan(0);
  });

  it("두 메서드 중 하나만 감싸도 빨강 — 파일 단위가 아니라 메서드 단위로 센다", () => {
    const { methods, problems } = checkRouteSource(
      route,
      `${IMPORT}async function handleGet() { return new Response(); }\nexport const GET = withErrorLog("/api/tests/[id]", handleGet);\nexport async function POST() { return new Response(); }`,
    );
    expect(methods).toEqual(["GET", "POST"]);
    expect(problems).toEqual([
      "POST: 함수 선언을 그대로 내보낸다 — 틀을 지나지 않는다",
    ]);
  });
});
