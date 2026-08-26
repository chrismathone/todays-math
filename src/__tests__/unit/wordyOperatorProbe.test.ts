/**
 * **판정기의 눈금을 자동으로 부른다** — 저장소에 있는데 아무도 안 부르면 그것은
 * 가드가 아니라 **문서**다 (2026-08-23).
 *
 * `elemProbeGauges.test.ts` 가 `probe-{elem,middle}-*.ts` 를 훑어 같은 일을 하는데,
 * 이 판정기는 초등·중등을 **둘 다** 훑으므로 그 이름 규약에 안 들어간다. 그래서
 * 짝을 여기 따로 둔다 — 그 표를 늘리면 다른 세션의 차분과 겹친다.
 *
 * ## 무엇을 재나
 *
 * ⑴ `--selftest` 를 **실제로 돌린다**(exit ≠ 0 이면 빨강). 판정기가 **죽어도** 0 이
 *    아니다 — 「깨끗함」과 「판정 못 함」이 안 갈리면 안 된다.
 * ⑵ 눈금 건수를 **«정확히»** 박는다. 하한이면 눈금이 조용히 마른다.
 * ⑶ 요약이 말하는 수를 그냥 믿지 않고 **찍힌 판정 줄**(`✅`/`❌`)을 센다.
 * ⑷ **음성 눈금이 있는지**를 따로 본다 — 양성만 대면 지어냄이 구조적으로 0 이다
 *    (2026-08-20 「판정자를 눈금 맞출 때 깨끗한 표본을 안 대면」).
 *
 * `--selftest` 는 문자열 픽스처만 보고 엔진·DB 를 **안 읽는다**. 그래서 남의 변이
 * 하네스가 도는 중에도 빨개지지 않는다 — 거짓 경보는 가드를 끈다.
 */
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

/** 눈금 수 — 실측(2026-08-26). 양성 6 · 음성 8 · 지목 1. */
const GAUGES = 15;

/**
 * ⚠️ `npx` 를 거치지 않고 **node 로 tsx 를 직접** 부른다. 윈도우에서 `execFile` 은
 * `.cmd` 를 못 띄워 EINVAL 로 죽는다(Node 20+ 보안 변경).
 */
const TSX_CLI = path.join(
  process.cwd(),
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs",
);

let status = -1;
let text = "";

describe("[말 대신 기호] 판정기 눈금이 자동으로 돈다", () => {
  beforeAll(async () => {
    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        [TSX_CLI, "scripts/qa/probe-wordy-operators.ts", "--selftest"],
        { encoding: "utf-8", maxBuffer: 8 * 1024 * 1024 },
      );
      status = 0;
      text = `${stdout}${stderr}`;
    } catch (e) {
      const err = e as { code?: number; stdout?: string; stderr?: string };
      // 판정기가 **죽어도** 0 이 아니어야 한다 — 여기서 코드를 잃으면 안 된다.
      status = err.code ?? 1;
      text = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    }
  }, 120_000);

  it("눈금이 통과한다 — 죽어도 통과가 아니다", () => {
    expect(status, text.slice(0, 2000)).toBe(0);
  });

  it(`눈금 건수가 정확히 ${GAUGES} 다`, () => {
    const m = /눈금 (\d+)건/.exec(text);
    expect(
      m,
      `「눈금 N건」을 못 읽었다:\n${text.slice(0, 800)}`,
    ).not.toBeNull();
    const reported = Number(m?.[1]);
    expect(
      reported,
      `눈금이 ${GAUGES} → ${reported} 다.\n` +
        `   늘린 것이 맞으면 이 시험의 GAUGES 를 ${reported} 로 고쳐라.\n` +
        `   줄인 것이면 왜 줄였는지부터 보라 — 눈금은 재현율의 분모다.`,
    ).toBe(GAUGES);
  });

  it("요약이 아니라 **찍힌 판정 줄**을 센다", () => {
    const verdicts = text
      .split("\n")
      .filter((l) => /^\s*[✅❌]/.test(l)).length;
    expect(
      verdicts,
      `요약은 ${GAUGES}건이라는데 판정 줄은 ${verdicts}줄뿐이다 — 요약 수가 손으로 적혔을 수 있다`,
    ).toBeGreaterThanOrEqual(GAUGES);
  });

  it("**음성 대조군이 있다** — 양성만 대면 지어냄이 구조적으로 0 이다", () => {
    const negatives = text
      .split("\n")
      .filter((l) => /^\s*[✅❌]/.test(l) && l.includes("음성"));
    expect(negatives.length, "음성 눈금이 없다").toBeGreaterThanOrEqual(5);
    expect(
      negatives.filter((l) => l.trimStart().startsWith("❌")),
      "음성 눈금이 깨졌다 — 멀쩡한 지면을 «대상»으로 읽고 있다",
    ).toEqual([]);
  });
});
