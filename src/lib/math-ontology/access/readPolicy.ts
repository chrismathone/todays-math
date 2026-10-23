/** Exact new read operations only. Existing v1/v2 and student gates are unchanged. */
export function ontologyReadRoute(method: string, path: string): boolean {
  return (
    (method === "GET" && path === "/api/math-ontology/catalog") ||
    (method === "POST" &&
      ["/api/math-ontology/query", "/api/math-ontology/validate"].includes(
        path,
      )) ||
    (method === "GET" &&
      /^\/api\/students\/[^/]+\/math-ontology\/evidence$/.test(path))
  );
}
export function ontologyOperationRoute(method: string, path: string): boolean {
  const proposal = "[A-Za-z0-9-]+";
  return (
    (method === "POST" &&
      [
        "/api/math-ontology/actions/proposals",
        "/api/math-ontology/relations/proposals",
        "/api/math-ontology/publish/jobs",
      ].includes(path)) ||
    (method === "POST" &&
      new RegExp(
        `^/api/math-ontology/actions/${proposal}/(?:approve|execute|feedback)$`,
      ).test(path)) ||
    (method === "GET" &&
      new RegExp(`^/api/math-ontology/actions/${proposal}(?:/feedback)?$`).test(
        path,
      )) ||
    (method === "POST" &&
      new RegExp(`^/api/math-ontology/relations/${proposal}/approve$`).test(
        path,
      )) ||
    (method === "POST" &&
      new RegExp(`^/api/math-ontology/publish/jobs/${proposal}/recover$`).test(
        path,
      ))
  );
}
export function ontologyPublisherRoute(path: string): boolean {
  return (
    path.startsWith("/api/math-ontology/relations/") ||
    path === "/api/math-ontology/publish/jobs" ||
    path.startsWith("/api/math-ontology/publish/jobs/")
  );
}
/** These public machine endpoints always perform their own purpose-bound HMAC. */
export const ontologyMachineRoute = (method: string, path: string) =>
  method === "POST" &&
  ["/api/ontology-engine", "/api/math-ontology/publish/stage"].includes(path);
