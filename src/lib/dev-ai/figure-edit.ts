import "server-only";
import { z } from "zod";
import { repairJsonString } from "@/lib/ai/jsonRepair";
import { recoverJson } from "@/lib/mathgen/ocrJsonRecovery";
import { abortError } from "./cli-process";
import type { DevAiRequest, DevAiResult } from "./contracts";
import {
  FIGURE_EDIT_MAX_COMMANDS,
  FigureEditCommandSchema,
  type FigureEditCommand,
} from "./figure-edit-contract";
import { buildFigureEditPrompt } from "./figure-edit-prompt";
import {
  FIGURE_BUDGET_MS,
  FIGURE_REASONING_EFFORT,
  HANDLER_MARGIN_MS,
} from "./figure-engine";
import { FIGURE_REASON_MAX, FigureRedrawError } from "./figure-spec";

/**
 * «요청대로 고치기»의 화면용 사유 — 처리기가 FigureRedrawError 를 422 로 화면까지 싣는 길(트랙 2)을 그대로 탄다.
 * 우리가 쓴 문장과 길이를 자른 모델 note 만 싣는다.
 */
export class FigureEditError extends FigureRedrawError {
  constructor(message: string) {
    super(message);
    this.name = "FigureEditError";
  }
}
const KEPT = " 지금 그림은 그대로입니다.";
/**
 * 빈 명령에 모델 사유도 없을 때 — «무엇이 되는지»를 짧게(원장님 2026-09-19 «각 ACB에 각 표시» 가 사유 없이 422).
 * 수정 명령(figure-edit-contract.ts)과 같은 차례.
 */
const CAN_DO =
  "지우기·옮기기·글자 바꾸기·서식·꼭짓점 옮기기·크기 바꾸기·90° 회전·뒤집기·색칠·선분·글자·점·각 표시·원·호·수선·중점·교점 더하기";
function figureEditReason(reason: string) {
  const text = reason.replace(/\s+/g, " ").trim();
  const room = FIGURE_REASON_MAX - KEPT.length;
  return new FigureEditError(
    (text.length > room ? `${text.slice(0, room - 1)}…` : text) + KEPT,
  );
}

const Envelope = z.object({
  commands: z.array(z.unknown()).max(200).default([]),
  note: z.string().max(1000).default(""),
  warnings: z.array(z.string().max(1000)).max(30).default([]),
});
/** 모델이 «바꾸지 않는 칸»을 null 로 채워 보낸다 — 없는 칸으로 읽는다. */
const withoutNulls = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).filter(([, field]) => field !== null),
      )
    : value;

/** 모델 응답 → 형식이 맞는 명령만. 번호·좌표가 지금 그림에 맞는지는 편집기가 적용하며 다시 본다. */
export function parseFigureEditResult(raw: string): {
  edits: FigureEditCommand[];
  warnings: string[];
} {
  const unreadable = () =>
    new FigureEditError(
      `AI 수정 명령을 읽지 못했습니다.${KEPT} 다시 시도해 주세요.`,
    );
  if (!raw.trim() || new TextEncoder().encode(raw).length > 64 * 1024)
    throw unreadable();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    try {
      json = JSON.parse(repairJsonString(raw));
    } catch {
      json = recoverJson(raw);
    }
  }
  const envelope = Envelope.safeParse(json);
  if (
    !envelope.success ||
    !json ||
    typeof json !== "object" ||
    !("commands" in json)
  )
    throw unreadable();
  const { commands, note, warnings } = envelope.data;
  if (commands.length > FIGURE_EDIT_MAX_COMMANDS)
    throw new FigureEditError(
      `수정 명령이 너무 많습니다(최대 ${FIGURE_EDIT_MAX_COMMANDS}개). 요청을 나누어 주세요.${KEPT}`,
    );
  const edits = commands.flatMap((command) => {
    const checked = FigureEditCommandSchema.safeParse(withoutNulls(command));
    return checked.success ? [checked.data] : [];
  });
  const dropped = commands.length - edits.length;
  if (!edits.length) {
    if (note.trim()) throw figureEditReason(note);
    if (dropped) throw unreadable();
    throw new FigureEditError(
      `이 요청은 아직 할 수 없습니다 — 할 수 있는 것: ${CAN_DO}.${KEPT}`,
    );
  }
  return {
    edits,
    warnings: [
      ...warnings,
      ...(note.trim() ? [note.trim()] : []),
      ...(dropped
        ? [`형식이 맞지 않는 수정 명령 ${dropped}개를 뺐습니다.`]
        : []),
    ],
  };
}

export type FigureEditInference = (input: {
  prompt: string;
  imageDataUrl: string;
  signal: AbortSignal;
}) => Promise<string>;

/**
 * 모델을 한 번 불러 수정 명령을 받는다 — 도형 엔진·원본 대조(자동 재시도)는 쓰지 않는다(리드 지시서).
 * 모델·추론 강도·시간 예산은 도형 재작도와 같다(figure-engine.ts): 구독 CLI 는 medium, 서버 API 는 도형 모델 경로.
 */
export async function editDevAiFigure(
  request: DevAiRequest,
  signal?: AbortSignal,
  inference?: FigureEditInference,
  deadlineAt?: number,
): Promise<DevAiResult> {
  if (
    request.action !== "figure-edit" ||
    !request.imageDataUrl ||
    !request.figure ||
    !request.content?.trim()
  )
    throw new FigureEditError(`고칠 그림과 요청이 필요합니다.${KEPT}`);
  if (!inference && process.env.NODE_ENV === "production")
    throw new Error("운영 환경에서는 서버 API 연결이 필요합니다.");
  const invoke: FigureEditInference =
    inference ??
    (async (input) => {
      const { runSubscriptionCli } = await import("./cli");
      return runSubscriptionCli({
        ...input,
        provider: request.provider,
        model: request.model,
        reasoningEffort: FIGURE_REASONING_EFFORT,
      });
    });
  const deadline = new AbortController();
  const cancel = () => deadline.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  const budget = Math.min(
    FIGURE_BUDGET_MS,
    deadlineAt === undefined
      ? Infinity
      : deadlineAt - HANDLER_MARGIN_MS - Date.now(),
  );
  const timer = setTimeout(
    () => {
      timedOut = true;
      cancel();
    },
    Math.max(0, budget),
  );
  try {
    if (deadline.signal.aborted) throw abortError();
    const raw = await invoke({
      prompt: buildFigureEditPrompt(request),
      imageDataUrl: request.imageDataUrl,
      signal: deadline.signal,
    });
    if (deadline.signal.aborted) throw abortError();
    const { edits, warnings } = parseFigureEditResult(raw);
    return { content: "", answer: "", solution: "", warnings, edits };
  } catch (error) {
    if (timedOut)
      throw new FigureEditError(
        `AI 수정이 오래 걸려 멈췄습니다.${KEPT} 다시 시도해 주세요.`,
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
