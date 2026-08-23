/**
 * **판정기의 눈금을 자동으로 부른다** — 판정기가 저장소에 있는데 아무도 안 부르면
 * 그것은 가드가 아니라 **문서**다 (2026-08-23, elem-figures 가 같은 문장으로 먼저 풀었다).
 *
 * ## 왜 이 시험이 필요한가 — **가드를 지키는 것이 눈금뿐인 자리가 있다**
 *
 * 그날 조사 판정기의 「스코프로 푼다」 수리를 되돌리는 변이를 걸었더니 **전 학년 쓸기가
 * 그대로 초록**이었다. 그 자리를 가르는 입력이 **트리에서 사라졌기** 때문이다
 * (g6 이 `${thing}가` 를 `josa()` 로 바꿔 두었다). 같은 변이를 `--selftest` 에 대자
 * **정확히 그 두 눈금이 빨개졌다.**
 *
 * 즉 **실데이터는 그 수리를 안 지킨다.** 지키는 것은 눈금이고, 그 눈금을 손으로만
 * 돌리면 다음 사람이 수리를 되돌려도 **아무도 모른다.**
 *
 * ## 무엇을 재나
 *
 * ⑴ 각 판정기의 `--selftest` 를 **실제로 돌린다**(exit ≠ 0 이면 빨강).
 *    판정기가 **죽어도** 0 이 아니다 — 「깨끗함」과 「판정 못 함」이 안 갈리면 안 된다.
 * ⑵ **눈금 건수의 하한**을 박는다. 줄면 판정기가 조용히 약해진 것이다.
 * ⑶ 요약이 말하는 수를 **그냥 믿지 않는다** — 실제로 찍힌 판정 줄(`✅`/`❌`)을 세어
 *    요약 수보다 적지 않은지 본다. 요약 수를 손으로 적어 두면 눈금을 늘려도 그 숫자가
 *    그대로라 거짓말이 된다(실제로 이 저장소에서 8 → 10 일 때 라벨이 「양성 2·음성 6」
 *    으로 남아 있었다).
 * ⑷ **판정기 목록을 손으로 두지 않는다** — `scripts/qa/probe-elem-*.ts` 를 훑어
 *    아래 두 표에 **없는 파일이 있으면 빨강**이다. 손 목록은 새 판정기를 조용히 뺀다.
 *
 * ## 울타리에 안 걸린다
 *
 * `--selftest` 는 픽스처 문자열만 보고 `src/lib/elementary/` 를 **안 읽는다**(그 경로는
 * 울타리를 열기 **전에** `process.exit` 한다). 그래서 남의 변이 하네스가 도는 중에도
 * 이 시험은 빨개지지 않는다 — **거짓 경보가 가드를 끄는 것**을 막으려면 이 성질이 필요하다.
 * 쓸기(`초3` 같은 인자)는 여기서 **부르지 않는다.**
 */
import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const QA_DIR = path.join(process.cwd(), "scripts", "qa");

/**
 * 눈금을 가진 판정기와 **그 하한**. 실측(2026-08-23)으로 박았다 — 줄이려면 일부러 줄이는
 * 것이므로 이 수도 같이 고쳐야 한다.
 */
const GAUGED: [name: string, floor: number][] = [
  ["probe-elem-josa-source", 10],
  ["probe-elem-rules", 23],
  ["probe-elem-section-conditions", 74],
  ["probe-elem-equations", 25],
  ["probe-elem-arithmetic", 44],
  ["probe-elem-routing", 4],
  ["probe-elem-tier-ladder", 14],
];

/**
 * 눈금이 **없는 것이 옳은** 것들 — 판정기가 아니라 **쓸기·덤프**다.
 * 여기 적어 두지 않으면 ⑷ 가 빨개진다. 판정기로 바뀌면 위 표로 옮길 것.
 */
const UNGAUGED: [name: string, why: string][] = [
  ["probe-elem-charts", "그래프 스펙 전수 덤프 — 판정하지 않는다"],
  ["probe-elem-figure-demand", "그림 요구 전수 쓸기 — 판정하지 않는다"],
  ["probe-elem-throw", "전수 throw 쓸기 — 던지는 씨앗을 찾는다"],
];

type Result = { status: number; text: string };

/**
 * ⚠️ **일곱을 동시에 돌린다.** 하나씩 부르면 `npx tsx` 기동만 일곱 번이라 160초가 걸렸고,
 * **느린 시험은 사람이 안 돌린다** — 그러면 자동으로 부르게 만든 뜻이 없어진다.
 * `beforeAll` 에서 한 번에 띄우고 각 시험은 그 결과만 본다(실패한 판정기 이름은 그대로 남는다).
 *
 * ⚠️ `npx` 를 거치지 않고 **node 로 tsx 를 직접** 부른다. 윈도우에서 `execFile` 은
 * `.cmd`(=`npx.cmd`)를 못 띄워 **EINVAL** 로 죽는다(Node 20+ 보안 변경). `shell: true` 로
 * 우회할 수는 있지만 「인자가 이스케이프되지 않는다」는 경고가 붙으므로 그 층을 없앤다.
 */
const TSX_CLI = path.join(
  process.cwd(),
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs",
);

async function runSelftest(name: string): Promise<Result> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [TSX_CLI, `scripts/qa/${name}.ts`, "--selftest"],
      { encoding: "utf-8", maxBuffer: 8 * 1024 * 1024 },
    );
    return { status: 0, text: `${stdout}${stderr}` };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string };
    // 판정기가 **죽어도** 0 이 아니어야 한다 — 여기서 코드를 잃으면 안 된다.
    return {
      status: err.code ?? 1,
      text: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

const results = new Map<string, Result>();

describe("[초등 판정기] 눈금이 자동으로 돈다", () => {
  beforeAll(async () => {
    const done = await Promise.all(
      GAUGED.map(async ([name]) => [name, await runSelftest(name)] as const),
    );
    for (const [name, r] of done) results.set(name, r);
  }, 180_000);

  it("판정기 목록이 새지 않는다 — 디렉터리에 있는 것이 두 표에 다 있다", () => {
    const onDisk = readdirSync(QA_DIR)
      .filter((f) => /^probe-elem-.*\.ts$/.test(f))
      .map((f) => f.replace(/\.ts$/, ""))
      .sort();
    const known = [
      ...GAUGED.map((g) => g[0]),
      ...UNGAUGED.map((u) => u[0]),
    ].sort();
    // 새 판정기가 생겼는데 눈금이 안 도는 채로 남는 것을 막는다.
    expect(
      onDisk.filter((f) => !known.includes(f)),
      "표에 없는 판정기",
    ).toEqual([]);
    // 반대로 표에만 있고 파일이 사라진 것도 잡는다 — 「없는 축은 못 잰다」.
    expect(
      known.filter((f) => !onDisk.includes(f)),
      "파일이 없는 항목",
    ).toEqual([]);
    expect(onDisk.length, "판정기를 하나도 못 찾았다").toBeGreaterThan(5);
  });

  for (const [name, floor] of GAUGED) {
    it(`${name} — 눈금이 통과하고 건수가 ${floor} 아래로 안 내려간다`, () => {
      const out = results.get(name);
      expect(out, `${name} 를 못 돌렸다 — 결과가 없다`).toBeDefined();
      if (!out) return;
      // 판정기가 **죽어도** 0 이 아니다.
      expect(out.status, out.text.slice(0, 2000)).toBe(0);

      const m = /눈금 (\d+)건/.exec(out.text);
      expect(
        m,
        `「눈금 N건」을 못 읽었다:\n${out.text.slice(0, 800)}`,
      ).not.toBeNull();
      const reported = Number(m![1]);
      expect(
        reported,
        "눈금 건수가 줄었다 — 판정기가 조용히 약해졌다",
      ).toBeGreaterThanOrEqual(floor);

      // 요약이 말하는 수를 **그냥 믿지 않는다** — 실제 판정 줄을 센다.
      const verdicts = out.text
        .split("\n")
        .filter((l) => /^\s*[✅❌]/.test(l)).length;
      expect(
        verdicts,
        `요약은 ${reported}건이라는데 판정 줄은 ${verdicts}줄뿐이다 — 요약 수가 손으로 적혔을 수 있다`,
      ).toBeGreaterThanOrEqual(reported);
    }, 90_000);
  }

  it("눈금 없는 것은 **쓸기·덤프**라서 그렇다 — 까닭이 적혀 있다", () => {
    for (const [name, why] of UNGAUGED)
      expect(why.length, `${name} 의 까닭이 비었다`).toBeGreaterThan(5);
  });
});
