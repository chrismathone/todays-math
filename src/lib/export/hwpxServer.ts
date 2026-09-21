import { spawn } from "node:child_process";
import path from "node:path";
import { z } from "zod";

const coordinate = z.number().finite().min(0).max(12000);
const position = z.number().finite().min(-12000).max(12000);
const object = z
  .object({
    type: z.enum(["text", "equation", "image", "rect"]),
    x: position,
    y: position,
    w: coordinate.positive(),
    h: coordinate.positive(),
    text: z.string().max(16000).optional(),
    latex: z.string().max(16000).optional(),
    imageId: z
      .string()
      .regex(/^image\d+$/)
      .optional(),
    color: z
      .string()
      .regex(/^#[\da-f]{6}$/i)
      .optional(),
    font: z.string().max(100).optional(),
    fontSize: z.number().positive().max(1000).optional(),
    letterSpacing: position.optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    baseline: position.optional(),
    lineHeight: coordinate.optional(),
    blockId: z.number().int().nonnegative().optional(),
    // 지면 격자(〈보기〉 2·3열·선택지)의 칸 — writer 가 격자 한 행을 한 문단으로, 칸 차례대로 묶는다.
    // ⚠️ 스키마에 없는 칸은 zod 가 **말없이 버린다** — 여기서 빠지면 수집기가 붙여도 writer 에 안 간다.
    gridId: z.number().int().nonnegative().optional(),
    gridRow: z.number().int().nonnegative().optional(),
    gridCol: z.number().int().nonnegative().optional(),
  })
  .superRefine((item, ctx) => {
    const key =
      item.type === "text"
        ? "text"
        : item.type === "equation"
          ? "latex"
          : item.type === "image"
            ? "imageId"
            : null;
    if (key && !item[key])
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "출력 요소의 내용이 없습니다.",
      });
  });
export const HwpxPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    pages: z
      .array(
        z.object({
          objects: z.array(object).max(12000),
          body: z
            .object({
              x: coordinate,
              y: coordinate,
              w: coordinate.positive(),
              h: coordinate.positive(),
              columns: z.union([z.literal(1), z.literal(2)]),
              gap: coordinate,
            })
            .optional(),
        }),
      )
      .min(1)
      .max(120),
  })
  .refine(
    (value) =>
      value.pages.reduce((n, page) => n + page.objects.length, 0) <= 60000,
    "문서의 요소 수가 너무 많습니다.",
  );

export type HwpxPayload = z.infer<typeof HwpxPayloadSchema>;
const MAX_OUTPUT = 48 * 1024 * 1024;

/** Run the source XML writer locally or through the signed internal Python function. */
export async function buildHwpxParts(
  payload: HwpxPayload,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  if (signal?.aborted) throw new Error("내보내기가 취소되었습니다.");
  if (
    process.env.STUDIO_ENGINE_URL ||
    (process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development")
  ) {
    // Local Node scripts and Playwright import this module without Next's marker.
    const { requestEngine } = await import("../mathgen-engine/transport");
    const parts = await requestEngine("hwpx", payload, {
      signal,
      timeoutMs: 30000,
    });
    if (!validParts(parts))
      throw new Error(
        "HWPX 문서를 만들지 못했습니다. 내용과 그림을 확인해 주세요.",
      );
    return parts;
  }
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("내보내기가 취소되었습니다."));
      return;
    }
    const script = path.join(
      process.cwd(),
      "scripts",
      "hwpx",
      "export_parts.py",
    );
    const child = spawn(
      /* turbopackIgnore: true */ process.env.PYTHON_BIN ?? "python",
      ["-B", script],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
    );
    let settled = false,
      size = 0;
    const chunks: Buffer[] = [];
    const finish = (error?: Error, parts?: Record<string, string>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      if (error) {
        child.kill();
        reject(error);
      } else resolve(parts!);
    };
    const cancel = () => finish(new Error("내보내기가 취소되었습니다."));
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            "HWPX 생성 시간이 초과되었습니다. 문서를 나누어 다시 시도해 주세요.",
          ),
        ),
      30000,
    );
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    child.on("error", () =>
      finish(
        new Error(
          "HWPX 생성 엔진을 실행하지 못했습니다. 서버의 Python 설정을 확인해 주세요.",
        ),
      ),
    );
    child.stdin.on("error", () =>
      finish(new Error("HWPX 생성 엔진에 문서를 전달하지 못했습니다.")),
    );
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT)
        finish(new Error("HWPX 문서가 너무 큽니다. 문서를 나누어 주세요."));
      else chunks.push(chunk);
    });
    // Drain diagnostics without exposing server paths or user content to clients/logs.
    child.stderr.resume();
    child.on("close", (code) => {
      if (settled) return;
      try {
        const parts: unknown = JSON.parse(
          Buffer.concat(chunks).toString("utf8"),
        );
        if (code !== 0 || !validParts(parts)) throw new Error();
        finish(undefined, parts as Record<string, string>);
      } catch {
        finish(
          new Error(
            "HWPX 문서를 만들지 못했습니다. 내용과 그림을 확인해 주세요.",
          ),
        );
      }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function validParts(parts: unknown): parts is Record<string, string> {
  return (
    !!parts &&
    typeof parts === "object" &&
    !Array.isArray(parts) &&
    "mimetype" in parts &&
    parts.mimetype === "application/hwp+zip" &&
    Object.values(parts).every((part) => typeof part === "string")
  );
}
