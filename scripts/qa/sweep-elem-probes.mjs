/**
 * **초등 판정기를 실데이터에 대고 쓴다** — `npm run test` 의 ⑸ 단계.
 *
 *   node scripts/qa/sweep-elem-probes.mjs          # 전부
 *   node scripts/qa/sweep-elem-probes.mjs --list   # 무엇을 쓸지만 찍는다
 *
 * ## 왜 있나
 *
 * 시험(`elemProbeGauges.test.ts`)이 도는 것은 각 판정기의 `--selftest`, 곧
 * **픽스처 문자열**뿐이다. 실데이터에 대고는 아무도 안 쓴다. 그래서 판정기가
 * **빨간 채로 착지할 수 있고, 실제로 그랬다** — 2026-08-24 `probe-elem-rules` 의
 * `R9 고정그림 1`(초3 2-3-3)이 그렇게 main 에 들어갔고 관문은 초록이었다.
 * 「검사는 있는데 관문이 안 부른다」는 이 저장소가 되풀이한 자리다.
 *
 * ## 🔴 왜 `run-tests.mjs` 안이 아니라 **따로** 있나
 *
 * 처음에는 관문 안에 넣었다. 그런데 **그 단계가 무는지 확인할 방법이 없었다** —
 * 확인하려면 vitest 8분을 통째로 돌려야 하고, 그 사이에 다른 세션이 결함을
 * 고쳐 버리면 「초록」이 나온다(실제로 그렇게 됐다: g3 이 2-3-3 을 고치는 중이라
 * 관문 ⑸ 가 빨간 판정기를 한 번도 못 봤다).
 *
 * **무는지 확인할 수 없는 가드는 장식이다.** 그래서 떼어냈다 — 이제 몇 초 만에
 * 일부러 망가뜨려 시험할 수 있다.
 *
 * ## 규칙 셋
 *
 * ⚠️ **목록을 손으로 적지 않는다** — `scripts/qa/probe-elem-*.ts` 를 훑는다.
 *    손 목록은 새고, 새면 그 판정기는 구조적으로 0이 된다(09 §4-22).
 * ⚠️ **판정하지 않는 것은 뺀다** — 덤프·쓸기용은 `exit 0` 이 「깨끗」을 뜻하지 않는다.
 *    그 목록은 `elemProbeGauges.test.ts` 가 이미 갖고 있으니 **거기서 읽는다.**
 * ⚠️ **`exit 2` 는 결함이 아니라 울타리다**(다른 세션이 `src/lib/elementary/` 를
 *    쓰는 중). 그 둘을 같은 줄로 뭉개면 「빨간데 근거가 없다」가 된다.
 *
 * 종료 코드: 0 깨끗 · 1 판정기가 결함을 찾음 · 3 아무것도 못 쟀다(분모 0)
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const GAUGE_TEST = "src/__tests__/unit/elemProbeGauges.test.ts";
const TSX = path.join("node_modules", "tsx", "dist", "cli.mjs");

/** 판정하지 않는 판정기 — 그 목록은 눈금 시험이 갖고 있다. 두 벌로 적지 않는다. */
function noVerdictNames() {
  const src = readFileSync(GAUGE_TEST, "utf-8");
  // 눈금 목록은 `["probe-elem-rules", 27]`(수) · 판정 안 함은 `["probe-elem-charts", "…"]`(글).
  const re = new RegExp('\\["(probe-elem-[a-z-]+)",\\s*"', "g");
  return new Set([...src.matchAll(re)].map((m) => m[1]));
}

function probeNames() {
  const skip = noVerdictNames();
  return readdirSync("scripts/qa")
    .filter((f) => new RegExp("^probe-elem-[a-z-]+\\.ts$").test(f))
    .map((f) => f.replace(new RegExp("\\.ts$"), ""))
    .filter((n) => !skip.has(n))
    .sort();
}

const names = probeNames();

if (process.argv.includes("--list")) {
  console.log(`쓸 판정기 ${names.length}개`);
  for (const n of names) console.log(`   ${n}`);
  process.exit(names.length === 0 ? 3 : 0);
}

if (names.length === 0) {
  console.error("\n🔴 초등 판정기를 하나도 못 찾았다 — 쓸기가 «못 셈»이다.");
  process.exit(3);
}

const 문제 = [];
const 울타리 = [];

for (const name of names) {
  const r = spawnSync(process.execPath, [TSX, `scripts/qa/${name}.ts`], {
    encoding: "utf-8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (r.status === 2) {
    울타리.push(name);
    continue;
  }
  if (r.status === 0) continue;

  // 근거 줄 — 판정 줄만 읽고 근거를 안 보면 「빨간데 이유를 모른다」가 된다.
  const 근거 = (r.stdout ?? "")
    .split("\n")
    .filter((l) => new RegExp("^\\s+·|합계").test(l))
    .slice(0, 4)
    .map((l) => l.trim())
    .join(" / ");
  문제.push(
    `${name} (종료 ${r.status})` +
      (근거 ? ` — ${근거}` : " — 근거 줄이 비었다: 판정기 자신을 의심하라"),
  );
}

console.log(
  `판정기 ${names.length}개를 실데이터에 댔다 · 빨강 ${문제.length} · 울타리 ${울타리.length}`,
);

if (울타리.length > 0) {
  console.error(
    `\n⚠️ 울타리에 걸려 **못 잰** 판정기 ${울타리.length}개: ${울타리.join(", ")}` +
      "\n   결함이 아니다 — 다른 세션이 `src/lib/elementary/` 를 쓰는 중이다." +
      "\n   그 창이 닫힌 뒤 다시 돌려라. 이 회차는 그 판정기에 대해 «못 잰» 것이다.",
  );
}

if (문제.length > 0) {
  console.error("\n🔴 판정기가 결함을 찾았다 —");
  for (const m of 문제) console.error(`   · ${m}`);
  console.error(
    "\n   (이 쓸기는 `scripts/qa/sweep-elem-probes.mjs` 다." +
      "\n    해당 판정기를 직접 돌려 자리를 보라: `npx tsx scripts/qa/<이름>.ts`)",
  );
  process.exit(1);
}

// 🔴 **울타리에 걸린 것은 «깨끗»이 아니라 «못 잰» 것이다.**
//    처음에 이 줄이 「전부 깨끗」이었다 — 8개 중 1개를 못 쟀는데도 그렇게 찍었다.
//    오늘 밤 이 저장소가 다섯 번 잡은 그 결함을, 그것을 막으려고 쓴 스크립트가 냈다.
//    분모를 찍지 않으면 0 은 「깨끗」과 「못 셈」을 안 가른다.
const 잰것 = names.length - 울타리.length;
if (울타리.length > 0) {
  console.log(
    `⚠️ 잰 것 ${잰것} / ${names.length} — **${울타리.length}개는 못 쟀다.** ` +
      "이 회차는 「전부 깨끗」이 아니다.",
  );
} else {
  console.log(`✅ 실데이터에서 판정기 ${잰것}개 전부 깨끗`);
}
