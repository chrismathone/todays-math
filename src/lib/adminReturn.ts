/** URL context is a navigation hint. Destination APIs still check permissions. */
export type ReturnContext = "admin-srs" | "workspace-srs" | "teaching";
export type QueryValues = Record<string, string | string[] | undefined>;
const identifier = /^[A-Za-z0-9_-]{1,100}$/;
export const contextId = (value: string | null | undefined) =>
  value && identifier.test(value) ? value : "";
export function contextParams(values: QueryValues | URLSearchParams) {
  const read = (key: string) =>
    values instanceof URLSearchParams
      ? values.get(key)
      : typeof values[key] === "string"
        ? (values[key] as string)
        : null;
  const params = new URLSearchParams();
  for (const key of ["classId", "studentId"]) {
    const id = contextId(read(key));
    if (id) params.set(key, id);
  }
  const from = read("from");
  if (["admin-srs", "workspace-srs", "teaching"].includes(from ?? ""))
    params.set("from", from!);
  const teachingTab = read("teachingTab");
  if (teachingTab === "classes" || teachingTab === "lessons")
    params.set("teachingTab", teachingTab);
  return params;
}
export function shellReturn(
  params: URLSearchParams,
  fallback = "/classes/manage",
) {
  const safe = contextParams(params);
  const from = safe.get("from");
  safe.delete("from");
  if (from === "admin-srs") return `/admin/math-srs?${safe}`;
  if (from === "workspace-srs") return `/?${safe}#srs`;
  if (from === "teaching") return `/?${safe}#teaching`;
  return `${fallback}${fallback.includes("?") ? "&" : "?"}${safe}`;
}
export function classManagerHref(
  student: { classId: string; id: string },
  actor: {
    menus?: readonly string[];
    branchId?: string | null;
    branchRole?: string | null;
    isSuperAdmin?: boolean;
  },
  from: ReturnContext,
) {
  if (actor.menus && !actor.menus.includes("teaching")) return null;
  const params = contextParams({
    classId: student.classId,
    studentId: student.id,
    from,
  });
  params.set("teachingTab", "classes");
  if (
    !actor.isSuperAdmin &&
    actor.branchId &&
    ["owner", "manager"].includes(actor.branchRole ?? "")
  ) {
    params.set("tab", "classes");
    return `/branch?${params}`;
  }
  return `/classes/manage?${params}`;
}

const statuses = [
  "all",
  "pending",
  "approved",
  "rejected",
  "suspended",
  "deleted",
];
export function accountListParams(params: URLSearchParams) {
  const safe = new URLSearchParams();
  const q = params.get("q");
  if (q && q.length <= 200 && !/[\u0000-\u001f]/.test(q)) safe.set("q", q);
  const status = params.get("status");
  if (statuses.includes(status ?? "")) safe.set("status", status!);
  const page = params.get("page");
  if (page && /^[1-9]\d{0,5}$/.test(page)) safe.set("page", page);
  const tab = params.get("tab");
  if (tab === "accounts" || tab === "menus") safe.set("tab", tab);
  const selection = contextId(params.get("selection"));
  if (selection) safe.set("selection", selection);
  return safe;
}
export function accountListReturn(branchId: string, params: URLSearchParams) {
  const path = `/admin/branches/${encodeURIComponent(branchId)}`;
  const safe = accountListParams(params);
  return `${path}${safe.size ? `?${safe}` : ""}`;
}
/** Reject whole unsafe input, including recursive returns and unknown query keys. */
export function safeInternalReturn(
  value: string | null | undefined,
  branchId?: string,
): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return null;
  const rawPath = value.split(/[?#]/)[0];
  if (rawPath.includes("%") || rawPath.includes("..")) return null;
  const url = new URL(value, "https://internal.invalid");
  if (url.origin !== "https://internal.invalid") return null;
  const branchPath = branchId
    ? `/admin/branches/${encodeURIComponent(branchId)}`
    : null;
  const accountScreen = url.pathname === branchPath;
  if (branchId && !accountScreen) return null;
  if (
    !accountScreen &&
    !["/", "/classes/manage", "/branch", "/admin/math-srs"].includes(
      url.pathname,
    )
  )
    return null;
  const allowed = accountScreen
    ? ["q", "status", "page", "tab", "selection"]
    : [
        "classId",
        "studentId",
        "from",
        "teachingTab",
        ...(url.pathname === "/branch" ? ["tab"] : []),
      ];
  if (
    [...url.searchParams.keys()].some(
      (key) =>
        !allowed.includes(key) || url.searchParams.getAll(key).length !== 1,
    )
  )
    return null;
  if (
    url.hash &&
    !(url.pathname === "/" && ["#srs", "#teaching"].includes(url.hash)) &&
    !(accountScreen && url.hash === "#admin-main")
  )
    return null;
  const safe = accountScreen
    ? accountListParams(url.searchParams)
    : contextParams(url.searchParams);
  if (url.pathname === "/branch") {
    if (url.searchParams.get("tab") !== "classes") return null;
    safe.set("tab", "classes");
  }
  if (safe.size !== url.searchParams.size) return null;
  safe.sort();
  return `${url.pathname}${safe.size ? `?${safe}` : ""}${url.hash}`;
}
