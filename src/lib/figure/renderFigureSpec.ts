/**
 * FigureSpec v2 (AI 가 낸 JSON) → 검증·정제된 SVG. **서버 전용.**
 *
 * 엔진은 Python 이고 이식하지 않는다(09-figure-engine-guide.md §0). `scripts/figure/render_spec.py`
 * 를 한 번 띄워 stdin 으로 스펙을 주고 stdout 으로 JSON 한 줄을 받는다.
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

import { substituteLabels, withLabelMetrics } from "./mathjaxSubstitute";

/** Python 실행 파일 — 환경마다 다르다. `python3` 만 있는 곳도 있어 열어 둔다. */
const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";

/** 엔진이 오래 걸리면 요청 전체가 묶인다. 실측 렌더는 1초 미만이다. */
const RENDER_TIMEOUT_MS = 15_000;

/** 한 번에 삼킬 stdout 상한 — 엔진의 `MAX_SVG_BYTES`(512KB) 보다 넉넉히. */
const MAX_OUTPUT_BYTES = 1_024 * 1_024;

export type RenderFigureResult =
  { ok: true; svg: string } | { ok: false; error: string };

const SCRIPT_PATH = path.join(
  process.cwd(),
  "scripts",
  "figure",
  "render_spec.py",
);

export interface RenderFigureOptions {
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
export async function renderFigureSpec(
  spec: unknown,
  options: RenderFigureOptions = {},
): Promise<RenderFigureResult> {
  const typeset = options.typeset !== false;
  if (spec === null || typeof spec !== "object") {
    return { ok: false, error: "도형 스펙이 없습니다" };
  }

  return new Promise<RenderFigureResult>((resolve) => {
    let settled = false;
    const finish = (result: RenderFigureResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    // 배포 추적 제외 — spawn 의 동적 경로가 프로젝트 전체를 람다에 싣는다. 람다엔 python 이
    // 없어 어차피 error 콜백(ok:false)으로 떨어진다 — 도형 생성은 로컬 전용이다 (2026-08-21).
    const child = spawn(/*turbopackIgnore: true*/ PYTHON_BIN, [SCRIPT_PATH], {
      // 한글 라벨이 Windows 기본 코드페이지에서 깨진다 — 파이썬 쪽도 UTF-8 로 못 박는다.
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, error: "도형 생성이 시간 안에 끝나지 않았습니다" });
    }, RENDER_TIMEOUT_MS);

    let out = "";
    let truncated = false;
    child.stdout.setEncoding("utf-8");
    child.stdout.on("data", (chunk: string) => {
      if (out.length > MAX_OUTPUT_BYTES) {
        truncated = true;
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
      const body = parsed as { svg?: unknown; error?: unknown };
      if (typeof body.svg === "string" && body.svg.length > 0) {
        // 🔴 라벨을 **MathJax 조각**으로 바꿔 끼운다 (원장님 확정 2026-08-28).
        //    엔진은 자리를 잡고, 조판은 MathJax 가 한다. 글꼴이 필요 없어
        //    macOS·리눅스·어느 프린터에서도 같게 나온다.
        if (!typeset) return finish({ ok: true, svg: body.svg });
        const laid = substituteLabels(body.svg);
        if (laid.unresolved.length > 0) {
          // ⚠️ `kept`(한글처럼 조판할 수 없는 글)는 **여기 안 온다.** 그건 정상이라
          //    시끄러우면 이 경고 자체가 꺼진다 — 늘 우는 가드는 꺼진다(2026-08-20).
          //    여기 오는 것은 자리를 못 읽었거나 안전 검사에 걸린 **결함**뿐이다.
          console.warn(
            `[도형] 조판이 실패한 라벨 ${laid.unresolved.length}개:`,
            laid.unresolved.slice(0, 5).join(" · "),
          );
        }
        return finish({ ok: true, svg: laid.svg });
      }
      finish({
        ok: false,
        error:
          typeof body.error === "string" && body.error
            ? body.error
            : "도형을 그리지 못했습니다",
      });
    });

    child.stdin.on("error", () => {
      /* close 쪽에서 사유를 만든다 — 여기서 두 번 resolve 하지 않는다. */
    });
    // 엔진이 라벨 상자를 알아야 자리를 잡는다 — MathJax 가 잰 값을 실어 보낸다.
    // 대조용(`typeset:false`)에서는 **치수도 안 싣는다.** 안 그러면 「옛 글자·새 배치」라는
    // 어디에도 없던 제3의 지면이 되어, 견주는 뜻이 사라진다.
    child.stdin.end(
      JSON.stringify(typeset ? withLabelMetrics(spec) : spec),
      "utf-8",
    );
  });
}
