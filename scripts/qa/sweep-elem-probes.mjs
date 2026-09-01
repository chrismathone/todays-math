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
 *            **4 울타리에 걸려 일부를 못 쟀다** — 결함이 아니지만 «전부 깨끗»도 아니다.
 *
 * 🔴 **4 를 0 으로 두면 관문이 «초록»을 낸다.** 2026-08-24 에 실제로 그랬다 —
 *    다른 세션이 변이 회차를 도는 동안 관문이 돌아 판정기 둘을 못 쟀는데,
 *    쓸기는 「잰 것 8/10」을 정직하게 찍었지만 **관문 판정은 그것을 안 받아 초록**이었다.
 *    「0 은 «깨끗»과 «못 셈»을 안 가른다」가 **관문 층에서** 다시 난 것이다.
 *    못 잰 회차로는 밀지 않는다 — **먼저 사유를 읽어라.**
 *
 * ⚠️ **「기다리면 풀린다」고 단정하지 말 것.** 울타리의 뜻은 판정기마다 다르다:
 *    초등은 「다른 세션이 엔진을 쓰는 중」(기다리면 풀린다)이고, 중등 결합형은
 *    「읽을 파일이 없다」(**기다려도 안 풀린다 — 만들거나 가져와야 한다**)이다.
 *    2026-08-25 에 이 문구가 후자에 대고 「창이 닫힌 뒤」라고 말해, 그대로 따르면
 *    **영영 기다리게** 되어 있었다. 그래서 사유는 **판정기가 찍은 줄을 그대로** 옮긴다.
 *    (그중 `classifications.json` 은 **만드는 명령이 아예 없다** — 10-handoff §0-A.2.)
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { probeNetPy, probeNetTs } from "./probeNet.mjs";
import path from "node:path";

const GAUGE_TEST = "src/__tests__/unit/elemProbeGauges.test.ts";
const TSX = path.join("node_modules", "tsx", "dist", "cli.mjs");

/** 판정하지 않는 판정기 — 그 목록은 눈금 시험이 갖고 있다. 두 벌로 적지 않는다. */
function noVerdictNames() {
  const src = readFileSync(GAUGE_TEST, "utf-8");
  // 눈금 목록은 `["probe-elem-rules", 27]`(수) · 판정 안 함은 `["probe-elem-charts", "…"]`(글).
  const re = new RegExp('\\["(probe-(?:elem|middle)-[a-z0-9-]+)",\\s*"', "g");
  return new Set([...src.matchAll(re)].map((m) => m[1]));
}

/**
 * 판정기 목록 — **`.ts` 와 `.py` 를 같이** 훑는다.
 *
 * 🔴 파이썬 쪽을 빼 두면 `probe-elem-render-all.py`(갈래가 내는 그림이 전부
 * 그려지는가)와 `probe-elem-figure.py`(표본이 전 kind 를 덮는가)가 **관문 밖**이다.
 * 2026-08-24 에 병합이 kind 를 더한 날 그 둘이 빨간 채로 있었고, 누군가 손으로
 * 돌릴 때까지 아무도 몰랐다 — **하루에 두 번** 그랬다.
 *
 * ⚠️ 다른 트랙이 kind 를 더한 날 이 관문이 빨개진다. **그게 맞다** — 표본에 없는
 * kind 는 변이 시험 밖이라, 그 상태의 「전량 초록」은 참이 아니다. 막는 쪽 판정기가
 * **왜 막는지·어떻게 고치는지·내 일이 아니면 누구에게 알리는지**를 같이 찍는다.
 */
function probeNames() {
  const skip = noVerdictNames();
  // 🔴 **소속 규칙은 `probeNet.mjs` 한 곳이다.** 여기서 정규식을 따로 쓰면
  //    눈금 시험(`elemProbeGauges.test.ts` ⑷)과 갈린다 — 2026-09-01 에 실제로
  //    갈려서 판정기 일곱이 이 쓸기에서 빠졌고(이름에 숫자가 있으면 옛 정규식이
  //    안 받았다) 그중 `probe-middle-tier-4dan` 은 **빨간 채로** 있었다.
  const names = [
    ...probeNetTs("scripts/qa").map((n) => `${n}.ts`),
    ...probeNetPy("scripts/qa"),
  ];
  // `.ts`·`.py` 둘 다 확장자가 세 글자다 — 뒤 세 글자를 떼면 이름이 된다.
  return names.filter((f) => !skip.has(f.slice(0, -3))).sort();
}

const names = probeNames();

if (process.argv.includes("--list")) {
  console.log(`쓸 판정기 ${names.length}개`);
  for (const n of names) console.log(`   ${n}`);
  process.exit(names.length === 0 ? 3 : 0);
}

if (names.length === 0) {
  console.error("\n🔴 판정기를 하나도 못 찾았다 — 쓸기가 «못 셈»이다.");
  process.exit(3);
}

const 문제 = [];
const 울타리 = [];

for (const name of names) {
  // `.py` 는 파이썬으로, `.ts` 는 tsx 로. **이름에 확장자가 그대로 들어 있다** —
  // 어느 쪽인지 따로 목록을 두면 그 목록이 또 샌다.
  const isPy = name.endsWith(".py");
  const r = spawnSync(
    isPy ? "python" : process.execPath,
    isPy ? [`scripts/qa/${name}`] : [TSX, `scripts/qa/${name}`],
    { encoding: "utf-8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
  );
  if (r.status === 2) {
    // ⚠️ **사유를 추측하지 않는다.** 울타리의 뜻은 판정기마다 다르다 — 초등은 「다른
    //    세션이 엔진을 쓰는 중」이고, 중등 결합형은 「말뭉치가 없다」다. 고치는 법이
    //    아예 다르다: 전자는 기다리면 풀리지만 **후자는 기다려도 영영 안 풀린다.**
    //    2026-08-25 에 관문이 「창이 닫힌 뒤 다시 돌려라」라고만 말했는데 실제 사유는
    //    말뭉치 부재였다 — 그 말대로 하면 **무한히 기다린다.** 그래서 판정기가 찍은
    //    줄을 **그대로 옮긴다**(되살리는 명령까지 같이 나온다).
    // ⚠️ **사유 한 줄만 옮기면 반쪽이다** — 「무엇을 해야 푸나」가 빠진다. 판정기가 찍은
    //    본문을 그대로 넘긴다(빈 줄만 버린다). 낱말 목록으로 고르면 그 목록에 없는
    //    안내가 조용히 사라진다 — 이 저장소가 여러 번 겪은 「손 목록은 샌다」다.
    const 사유 = (r.stdout ?? "")
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().length > 0)
      .slice(0, 8)
      .join("\n     ");
    울타리.push({ name, 사유 });
    continue;
  }
  if (r.status === 0) continue;

  // 근거 줄 — 판정 줄만 읽고 근거를 안 보면 「빨간데 이유를 모른다」가 된다.
  //
  // 🔴 **stderr 도 본다.** 종전에는 `stdout` 만 훑었는데, 판정기가 «던져서» 끝나면
  //    까닭은 `console.error` 로 나간다. 그러면 근거를 **분명히 댔는데도**
  //    「근거 줄이 비었다: 판정기 자신을 의심하라」가 찍힌다 — 2026-08-27 에
  //    `probe-middle-combo` 가 눈금 불일치 두 줄을 대고도 그렇게 나왔다.
  //    그 문구는 「판정기가 도장이다」라는 **무거운 신호**(2026-08-23)라, 헛으로
  //    울면 다음 사람이 멀쩡한 판정기를 의심하러 간다.
  const 출력 = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const 줄 = 출력.split("\n").map((l) => l.trimEnd());
  let 근거 = 줄
    .filter((l) => new RegExp("^\\s+·|합계").test(l))
    .slice(0, 4)
    .map((l) => l.trim())
    .join(" / ");
  if (!근거) {
    // 정해진 꼴이 없으면 **마지막으로 말한 것**을 그대로 옮긴다.
    // 옮길 것이 정말 없을 때만 「비었다」로 남긴다.
    근거 = 줄
      .filter((l) => l.trim() !== "")
      .slice(-3)
      .map((l) => l.trim())
      .join(" / ");
  }
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
    `\n⚠️ 울타리에 걸려 **못 잰** 판정기 ${울타리.length}개 —` +
      " 결함이 아니지만 «깨끗»도 아니다. 사유는 판정기가 말한 그대로다:",
  );
  for (const f of 울타리) {
    console.error(
      `   · ${f.name}` +
        (f.사유
          ? `\n     ${f.사유}`
          : "\n     사유를 안 찍었다 — 그 판정기를 직접 돌려 볼 것"),
    );
  }
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
      // ⚠️ 여기서도 원인을 단정하지 않는다 — 위 «울타리» 줄이 판정기 말 그대로 적혀 있다.
      //    기다리면 풀리는 것과 **기다려도 안 풀리는 것**이 섞여 있다.
      "이 회차는 「전부 깨끗」이 아니다 — 위 «울타리» 줄의 사유를 먼저 읽어라.",
  );
  process.exit(4);
} else {
  console.log(`✅ 실데이터에서 판정기 ${잰것}개 전부 깨끗`);
}
