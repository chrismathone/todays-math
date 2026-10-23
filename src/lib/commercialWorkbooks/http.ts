import {
  WORKBOOK_ERROR_STATUS,
  type WorkbookAssignmentPage,
  type WorkbookAssignmentPageRequest,
  type WorkbookAssignment,
  type WorkbookErrorCode,
} from "@/contracts/commercialWorkbook.contract";
import { CommercialWorkbookError } from "./errors";
import type { CommercialWorkbookSource } from "./source";

export function createHttpCommercialWorkbookSource(
  options: { fetch?: typeof fetch; ownerId?: string } = {},
): CommercialWorkbookSource {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  const call = async <T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> => {
    let response: Response;
    try {
      response = await fetcher(`/api/commercial-workbooks${path}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(options.ownerId ? { "x-workspace-owner": options.ownerId } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new CommercialWorkbookError(
        "UNAVAILABLE",
        "서버에 연결하지 못했습니다. 입력을 유지하고 다시 시도해 주세요.",
      );
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !("data" in payload)) {
      const rawCode = payload?.error?.code;
      const code: WorkbookErrorCode =
        typeof rawCode === "string" &&
        Object.hasOwn(WORKBOOK_ERROR_STATUS, rawCode)
          ? (rawCode as WorkbookErrorCode)
          : "UNAVAILABLE";
      throw new CommercialWorkbookError(
        code,
        payload?.error?.message ?? "요청을 처리하지 못했습니다.",
        payload?.error?.details,
      );
    }
    return payload.data as T;
  };
  const key = encodeURIComponent;
  const page = (input: WorkbookAssignmentPageRequest = {}) => {
    const query = new URLSearchParams();
    if (input.after) query.set("after", input.after);
    if (input.limit !== undefined) query.set("limit", String(input.limit));
    return call<WorkbookAssignmentPage>(
      `/assignments${query.size ? `?${query}` : ""}`,
    );
  };
  return {
    listRoster: () => call("/roster"),
    listCatalog: () => call(""),
    getEdition: (id) => call(`/${key(id)}`),
    createEdition: (input) => call("", "POST", input),
    reviseEdition: (id, input) => call(`/${key(id)}/revisions`, "POST", input),
    listAssignmentPage: page,
    listAssignments: async () => {
      const all: WorkbookAssignment[] = [];
      let after: string | undefined;
      const seen = new Set<string>();
      do {
        const result = await page({ after, limit: 50 });
        all.push(...result.items);
        after = result.nextCursor ?? undefined;
        if (after && seen.has(after))
          throw new CommercialWorkbookError(
            "UNAVAILABLE",
            "목록 페이지를 확인해야 합니다.",
          );
        if (after) seen.add(after);
      } while (after);
      return all;
    },
    getAssignment: (id) => call(`/assignments/${key(id)}`),
    createAssignment: (input) => call("/assignments", "POST", input),
    saveMarks: (id, input) =>
      call(`/assignments/${key(id)}/marks`, "POST", input),
    listWrongNotes: (filter = {}) => {
      const query = new URLSearchParams(
        Object.entries(filter).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
      return call(`/wrong-notes${query.size ? `?${query}` : ""}`);
    },
    updateWrongNote: (id, input) =>
      call(`/wrong-notes/${key(id)}`, "PATCH", input),
    getWrongNotePrint: (input) => call("/wrong-notes/print", "POST", input),
  };
}
