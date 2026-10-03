/**
 * **3자 합의의 «다른 둘»에게 묻는다** — 요청서(마크다운)를 codex · grok 에 도구 없이 넘기고 답을 받아 적는다.
 *
 *   npx tsx scripts/qa/consult-three-way.ts <요청서.md> <답 파일 앞머리> [codex|grok …]
 *   # → <앞머리>-codex.md · <앞머리>-grok.md   (codex 1 ~ 2분 · grok 6 ~ 8분)
 *
 * ## 왜 있나
 *
 * 원장님이 «내가 정할 건 그록 · codex 와 합의 봐»로 맡기신 결정은 리드 혼자 정하지 않는다
 * (25 §12.8 · 26 §11 · 2026-10-03 `tracks/reports/consult-bank-fix/`). 그때마다 같은 실행기를
 * 임시 폴더에 다시 썼다 — 영어 벤치의 `runCli` 를 그대로 부르는 스무 줄이다.
 *
 * ## 규율 (실행기가 지키는 것 · 사람이 지킬 것)
 *
 * · **블라인드**: 둘은 서로의 답을 못 본다. 도구가 없고, 빈 폴더에서 돈다 — 저장소를 못 읽는다.
 *   🔴 그래서 **요청서가 틀리면 둘 다 그 위에서 판단한다.** 요청서의 «사실» 줄에는 어디서 쟀는지를
 *   붙이고, 못 붙이는 줄은 «추정»이라 적는다(20번 교훈 2026-10-03 «요청서의 틀린 전제»).
 * · **리드의 입장을 먼저 적어 둔다**(요청서와 따로 — 답을 본 뒤에 고치지 않게).
 * · 갈리면 다음 회차 요청서에 **서로의 논거**를 싣고 다시 묻는다. 끝내 2:1 이면 다수로 닫고
 *   합의문에 소수 의견을 남긴다.
 * · 🔴 **학생 이름이 든 자료는 요청서에 넣지 않는다**(외부 모델로 나간다).
 *
 * 무엇도 고치지 않는다 — 답 파일 둘을 쓸 뿐이다.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { runCli } from "./english-bench/cli";

const [briefPath, outPrefix, ...only] = process.argv.slice(2);
if (!briefPath || !outPrefix) {
  console.error(
    "사용: npx tsx scripts/qa/consult-three-way.ts <요청서.md> <답 파일 앞머리> [codex|grok …]",
  );
  process.exit(1);
}

const brief = readFileSync(briefPath, "utf8");
// 빈 폴더에서 돌린다 — 저장소 안에서 돌리면 CLI 가 지시 파일(AGENTS.md)을 읽어 블라인드가 깨진다.
const cwd = path.join(os.tmpdir(), "consult-three-way");
mkdirSync(cwd, { recursive: true });

const SYSTEM =
  "너는 요청받은 안건에 대해 근거를 들어 답하는 독립 검토자다. 도구를 쓰지 말고, 파일을 만들거나 고치지 말고, 답만 한국어 마크다운으로 써라. 수학은 직접 검산하고, 요청서의 사실이 틀렸다고 보면 그렇게 적어라.";

const CALLS = [
  {
    name: "codex",
    provider: "codex" as const,
    model: "gpt-6-astra",
    effort: "high",
  },
  {
    name: "grok",
    provider: "grok" as const,
    model: "grok-4.7",
    effort: "medium",
  },
].filter((c) => only.length === 0 || only.includes(c.name));

void Promise.all(
  CALLS.map(async (c) => {
    try {
      const r = await runCli({
        provider: c.provider,
        model: c.model,
        effort: c.effort,
        system: SYSTEM,
        prompt: brief,
        cwd,
        timeoutMs: 25 * 60_000,
      });
      writeFileSync(`${outPrefix}-${c.name}.md`, `${r.text.trim()}\n`);
      console.log(
        `${c.name}: ${Math.round(r.ms / 1000)}초 · ${r.text.length}자`,
      );
    } catch (e) {
      const detail = String((e as { detail?: string }).detail ?? "").slice(
        0,
        400,
      );
      console.log(
        `${c.name}: 실패 — ${String((e as Error).message)} ${detail}`,
      );
      process.exitCode = 1;
    }
  }),
);
