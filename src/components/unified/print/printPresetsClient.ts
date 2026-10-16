import {
  PRINT_PRESET_ERROR,
  printPresetListResponseSchema,
  printPresetSchema,
  type PrintPreset,
  type PrintPresetInput,
} from "@/contracts/printPreset.contract";

/** 시험지 만들기 3단계 «내 양식»(W6)의 브라우저 쪽 — `/api/studio/print-presets` 만 부른다. */
export interface PrintPresetsClient {
  list: (signal?: AbortSignal) => Promise<PrintPreset[]>;
  save: (
    preset: PrintPresetInput,
    options?: {
      makeDefault?: boolean;
      replace?: { id: string; expectedRevision: number };
    },
  ) => Promise<PrintPreset>;
  rename: (
    id: string,
    name: string,
    expectedRevision: number,
  ) => Promise<PrintPreset>;
  /** 적용 — 마지막 사용을 지금으로. */
  touch: (id: string) => Promise<PrintPreset>;
  /** 새 시험지 기본으로 / 기본 해제 — 서버가 다른 양식의 기본을 푼다. */
  setDefault: (id: string, isDefault: boolean) => Promise<PrintPreset>;
  remove: (id: string, revision: number) => Promise<void>;
}

export class PrintPresetError extends Error {
  readonly code: string | undefined;
  readonly existing: { id: string; revision: number } | undefined;
  constructor(
    message: string,
    code?: string,
    existing?: { id: string; revision: number },
  ) {
    super(message);
    this.name = "PrintPresetError";
    this.code = code;
    this.existing = existing;
  }
  get nameTaken() {
    return this.code === PRINT_PRESET_ERROR.NAME_TAKEN;
  }
}

const BASE = "/api/studio/print-presets";

export function createPrintPresetsClient(
  fetcher: typeof fetch = (...args) => fetch(...args),
): PrintPresetsClient {
  async function call(
    path: string,
    init: RequestInit & { signal?: AbortSignal } = {},
  ): Promise<unknown> {
    const response = await fetcher(`${BASE}${path}`, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: init.body ? { "content-type": "application/json" } : undefined,
    });
    const body = (await response.json().catch(() => null)) as {
      data?: unknown;
      error?: {
        message?: string;
        code?: string;
        existing?: { id: string; revision: number };
      };
    } | null;
    if (!response.ok)
      throw new PrintPresetError(
        body?.error?.message ?? "저장한 양식을 처리하지 못했습니다.",
        body?.error?.code,
        body?.error?.existing,
      );
    return body;
  }
  const one = (body: unknown) =>
    printPresetSchema.parse((body as { data: unknown }).data);
  const patch = (id: string, body: unknown) =>
    call(`/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(one);
  return {
    async list(signal) {
      return printPresetListResponseSchema.parse(await call("", { signal }))
        .data;
    },
    async save(preset, { makeDefault, replace } = {}) {
      return one(
        await call("", {
          method: "POST",
          body: JSON.stringify({
            preset,
            ...(makeDefault ? { makeDefault } : {}),
            ...(replace ? { replace } : {}),
          }),
        }),
      );
    },
    rename: (id, name, expectedRevision) =>
      patch(id, { action: "rename", name, expectedRevision }),
    touch: (id) => patch(id, { action: "touch" }),
    setDefault: (id, isDefault) => patch(id, { action: "default", isDefault }),
    async remove(id, revision) {
      await call(`/${encodeURIComponent(id)}?revision=${revision}`, {
        method: "DELETE",
      });
    },
  };
}
