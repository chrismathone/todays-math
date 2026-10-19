/**
 * FigureSpec v2 (AI 가 낸 JSON) → 검증·정제된 SVG. **서버 전용.**
 *
 * 엔진은 Python 이고 이식하지 않는다(09-figure-engine-guide.md §0). `scripts/figure/render_spec.py`
 * 를 로컬에서는 직접 실행하고 Vercel에서는 서명한 내부 Python 함수로 호출한다.
 *
 * ⚠️ **SVG 는 오직 여기서만 만들어진다.** 클라이언트가 마크업을 보내는 경로는 없다 —
 *    미리보기에서 본 그림도 채택할 때 **스펙으로** 되돌아와 서버가 다시 그린다.
 *    브라우저가 준 `<svg>` 를 그대로 저장하면 지면과 화면에 남는 주입 통로가 된다.
 *
 * 실패는 예외가 아니라 값이다 — 도형을 못 그리는 것은 흔한 일이고(스펙이 틀렸거나,
 * 이 컴퓨터에 엔진이 없거나), 그때 변형 자체가 죽으면 안 된다. 호출자는 사유를 화면에
 * 실어 원장님이 보고 판단하게 한다.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import {
  AUTHORED_IMAGE_KIND,
  renderSavedAuthoredImage,
  type AuthoredImageResult,
  type SavedAuthoredImage,
} from "../engine/authoredImage";

import { substituteLabels, withLabelMetrics } from "./mathjaxSubstitute";

/** Python 실행 파일 — 환경마다 다르다. `python3` 만 있는 곳도 있어 열어 둔다. */
const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";

/** 엔진이 오래 걸리면 요청 전체가 묶인다. 실측 렌더는 1초 미만이다. */
const RENDER_TIMEOUT_MS = 15_000;

/** 한 번에 삼킬 stdout 상한 — 엔진의 `MAX_SVG_BYTES`(512KB) 보다 넉넉히. */
const MAX_OUTPUT_BYTES = 1_024 * 1_024;

export type RenderFigureResult =
  | {
      ok: true;
      svg: string;
      droppedDimensions?: readonly string[];
      authoredImage?: Extract<
        AuthoredImageResult,
        { ok: true }
      >["authoredImage"];
    }
  | { ok: false; error: string };

/** 엔진이 「이 치수는 놓을 자리가 없다」고 할 때의 사유 — 이름을 여기서 꺼낸다. */
const NO_ROOM = /dimension '([^']+)' has no collision-free layout/;

const SCRIPT_PATH = path.join(
  process.cwd(),
  "scripts",
  "figure",
  "render_spec.py",
);

export interface RenderFigureOptions {
  /** Trusted server assets; never filled from request JSON. Missing = fail closed.
   * Preview can display held assets for review; it never approves a problem.
   * The existing vector engine continues to prohibit arbitrary raster resources.
   */
  authoredImages?: {
    assets: ReadonlyMap<string, SavedAuthoredImage>;
    purpose: "preview" | "approved-display";
  };
  /** Cancel a render or internal HTTP call when its request/queue is cancelled. */
  signal?: AbortSignal;
  /** Redraw must repair an invalid spec rather than discard printed dimensions. */
  strict?: boolean;
  /**
   * 라벨을 MathJax 로 조판할까. 기본 `true` — **지면에 나가는 것은 늘 조판본**이다.
   *
   * `false` 는 «조판 전» 을 보려는 대조용이다: 치수도 안 싣고 조각도 안 끼운다 —
   * 즉 **2026-08-28 이전의 그 경로 그대로**다. 이것이 있어야 「조판이 무엇을
   * 바꿨나」를 같은 스펙으로 견줄 수 있다(옛 커밋을 꺼내 돌리는 것보다 싸고,
   * 두 벌이 갈라질 자리가 없다).
   */
  typeset?: boolean;
}

/**
 * 스펙 하나를 SVG 로 그린다. 던지지 않는다 — 실패는 `{ ok: false, error }` 로 돌려준다.
 *
 * `spec` 은 AI 가 낸 임의의 JSON 이다. 모양 검증은 **엔진이** 한다(허용 키 밖은
 * `FigureSpecError`). 여기서 한 번 더 좁히면 규칙이 두 벌이 되어 갈라진다 —
 * 엔진이 정본이다.
 */
/**
 * 스펙 하나를 그린다 — **놓을 자리가 없는 치수는 빼고** 다시 시도한다.
 *
 * 🔴 **원장님 지시 2026-08-29** (D-07): 「본문에서 길이를 제시한 도형 중 치수선이
 *    들어갈 만한 공간이 없는 좁은 도형은 억지로 치수선과 라벨을 입력하지 않도록 해.」
 *
 * 종전에는 치수 하나가 안 들어가면 **그림이 통째로 안 나왔다.** 그러면 지면에
 * 「그림과 같이…」만 남고 그림이 없다 — 치수 하나를 잃는 것보다 훨씬 나쁘다.
 * 실측으로 그런 자리가 3유형 있었다(`평행선 사이의 선분의 길이의 비` 01·05,
 * `삼각비의 활용` 10). 라벨을 70% 로 줄이면서 하나 더 생겼는데, 까닭이 뜻밖이다 —
 * **각 라벨이 작아져 도형 «안쪽»에 들어앉자 그 자리가 치수 곡선의 길을 막았다.**
 *
 * ⚠️ **조용히 빼지 않는다.** 뺀 치수 이름을 `droppedDimensions` 로 돌려준다
 *    (`figureDims.ts` 머리말의 「조용히 빠뜨리면 «달았다»가 거짓말이 된다」).
 *    부르는 쪽이 세어 보고할 수 있어야 「몇 장이 치수 없이 나갔나」를 안다.
 * ⚠️ 치수 **말고** 다른 사유(각·클립·좌표)는 그대로 실패시킨다 — 그건 도형 자체가
 *    틀린 것이고, 뭔가를 빼서 덮으면 결함이 침묵한다.
 */
export async function renderFigureSpec(
  spec: unknown,
  options: RenderFigureOptions = {},
): Promise<RenderFigureResult> {
  if (options.signal?.aborted)
    return { ok: false, error: "도형 생성이 취소되었습니다" };
  if (spec === null || typeof spec !== "object") {
    return { ok: false, error: "도형 스펙이 없습니다" };
  }
  if ((spec as { kind?: unknown }).kind === AUTHORED_IMAGE_KIND) {
    if (!options.authoredImages)
      return {
        ok: false,
        error: "서버의 검증된 이미지 자산 연결이 필요합니다",
      };
    return renderSavedAuthoredImage(
      spec,
      options.authoredImages.assets,
      options.authoredImages.purpose,
    );
  }
  const dims = (spec as { dimensions?: unknown }).dimensions;
  const names =
    dims !== null && typeof dims === "object" ? Object.keys(dims) : [];
  let current = spec;
  const dropped: string[] = [];
  // 치수 개수만큼만 돈다 — 사유가 매번 다른 이름을 대야 한 걸음씩 준다.
  for (let round = 0; round <= names.length; round += 1) {
    const result = await renderOnce(current, options);
    if (result.ok)
      return dropped.length > 0
        ? { ...result, droppedDimensions: dropped }
        : result;
    if (options.strict || options.signal?.aborted) return result;
    const hit = NO_ROOM.exec(result.error);
    if (!hit) return result;
    const name = hit[1]!;
    const rest = { ...(current as Record<string, unknown>) };
    const table = { ...((rest.dimensions ?? {}) as Record<string, unknown>) };
    if (!(name in table)) return result; // 우리가 못 빼는 이름이면 그대로 실패
    delete table[name];
    dropped.push(name);
    rest.dimensions = table;
    current = rest;
  }
  return { ok: false, error: "치수를 빼도 도형을 그리지 못했습니다" };
}

async function renderOnce(
  spec: unknown,
  options: RenderFigureOptions,
): Promise<RenderFigureResult> {
  const typeset = options.typeset !== false;
  let input: string;
  try {
    input = JSON.stringify(typeset ? withLabelMetrics(spec) : spec);
    if (Buffer.byteLength(input) > 64 * 1024)
      return { ok: false, error: "도형 스펙이 너무 큽니다" };
    // Delayed server-only import retains direct Node/CLI use of the local engine.
    if (
      process.env.STUDIO_ENGINE_URL ||
      (process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development")
    ) {
      const { requestEngine } = await import("../mathgen-engine/transport");
      const body = await requestEngine("figure", JSON.parse(input), {
        signal: options.signal,
        timeoutMs: RENDER_TIMEOUT_MS,
      });
      return renderedResult(body, typeset);
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && /^(도형|Python 엔진)/.test(error.message)
          ? error.message
          : "도형 엔진의 응답을 읽지 못했습니다",
    };
  }

  return new Promise<RenderFigureResult>((resolve) => {
    if (options.signal?.aborted) {
      resolve({ ok: false, error: "도형 생성이 취소되었습니다" });
      return;
    }
    let settled = false;
    const finish = (result: RenderFigureResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
      resolve(result);
    };

    // Local/self-hosted execution; Vercel uses the separate Python function above.
    const child = spawn(/*turbopackIgnore: true*/ PYTHON_BIN, [SCRIPT_PATH], {
      // 한글 라벨이 Windows 기본 코드페이지에서 깨진다 — 파이썬 쪽도 UTF-8 로 못 박는다.
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const cancel = () => {
      child.kill();
      finish({ ok: false, error: "도형 생성이 취소되었습니다" });
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, error: "도형 생성이 시간 안에 끝나지 않았습니다" });
    }, RENDER_TIMEOUT_MS);
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();

    let out = "";
    let truncated = false;
    child.stdout.setEncoding("utf-8");
    child.stdout.on("data", (chunk: string) => {
      if (settled) return;
      if (
        Buffer.byteLength(out, "utf-8") + Buffer.byteLength(chunk, "utf-8") >
        MAX_OUTPUT_BYTES
      ) {
        truncated = true;
        child.kill();
        finish({ ok: false, error: "도형이 너무 큽니다" });
        return;
      }
      out += chunk;
    });
    // stderr 는 화면에 싣지 않는다 — 파이썬 트레이스백에 경로가 들어 있다.
    child.stderr.resume();

    child.on("error", () => {
      clearTimeout(timer);
      finish({
        ok: false,
        error: `도형 엔진을 실행하지 못했습니다 (${PYTHON_BIN})`,
      });
    });

    child.on("close", () => {
      clearTimeout(timer);
      if (settled) return;
      if (truncated) {
        return finish({ ok: false, error: "도형이 너무 큽니다" });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(out);
      } catch {
        return finish({
          ok: false,
          error: "도형 엔진의 응답을 읽지 못했습니다",
        });
      }
      try {
        finish(renderedResult(parsed, typeset));
      } catch {
        finish({ ok: false, error: "도형 엔진의 응답을 읽지 못했습니다" });
      }
    });

    child.stdin.on("error", () => {
      /* close 쪽에서 사유를 만든다 — 여기서 두 번 resolve 하지 않는다. */
    });
    // 엔진이 라벨 상자를 알아야 자리를 잡는다 — MathJax 가 잰 값을 실어 보낸다.
    // 대조용(`typeset:false`)에서는 **치수도 안 싣는다.** 안 그러면 「옛 글자·새 배치」라는
    // 어디에도 없던 제3의 지면이 되어, 견주는 뜻이 사라진다.
    child.stdin.end(input, "utf-8");
  });
}

/** Both transports retain the same MathJax substitution and engine error semantics. */
function renderedResult(parsed: unknown, typeset: boolean): RenderFigureResult {
  const body =
    parsed && typeof parsed === "object"
      ? (parsed as { svg?: unknown; error?: unknown })
      : {};
  if (typeof body.svg === "string" && body.svg.length > 0) {
    if (!typeset) return { ok: true, svg: body.svg };
    // Engine places labels; MathJax supplies the same print glyphs on every host.
    const laid = substituteLabels(body.svg);
    if (laid.unresolved.length > 0) {
      // Kept Korean text is normal; only placement/safety defects are reported.
      console.warn(
        `[도형] 조판이 실패한 라벨 ${laid.unresolved.length}개:`,
        laid.unresolved.slice(0, 5).join(" · "),
      );
    }
    return { ok: true, svg: laid.svg };
  }
  return {
    ok: false,
    error:
      typeof body.error === "string" && body.error
        ? body.error
        : "도형을 그리지 못했습니다",
  };
}
