/**
 * `npm run test` — **vitest 를 돌리고, «안 돈 파일»이 있으면 실패시킨다.**
 *
 * ## 왜 감싸나
 *
 * 2026-08-19 에 오르카 한글 워크트리에서 `heightCacheManifest.test.ts` 가
 * **워커째 죽고 있었다**(노드 `rmSync` 버그, `probe-rmsync-crash.mjs` 참조).
 * 그런데 vitest 요약은 이렇게 적었다:
 *
 *     Test Files  119 passed (121)
 *          Tests  1904 passed (1904)
 *
 * **「119 passed」만 읽으면 초록이다.** 괄호 안의 121 을 봐야 두 파일이 안 돌았다는
 * 것이 보이고, 그 차이를 말로 적어 주는 줄은 없다. 종료 코드는 1이지만
 * `| tail` 같은 파이프 한 번이면 사라진다 — 실제로 그렇게 지나갔다.
 *
 * 이 저장소가 여러 번 적은 「지표가 **실패를 셀 수 있는 형태**인지 먼저 확인하라」의
 * 그 자리다. 성공률이 0을 향해도, 실패가 침묵하는 경로에서는 아무것도 증명하지 못한다.
 *
 * ## 무엇을 더 보나
 *
 * 1. **모은 파일 == 결과가 있는 파일.** `vitest list --filesOnly` 로 «돌 예정»을 먼저
 *    받아 두고 결과와 **이름으로** 견준다. 하나라도 비면 어느 파일인지 찍고 실패한다.
 * 2. **처리되지 않은 오류(unhandled error)가 있으면 실패다** — 워커 사망이 여기로 온다.
 * 3. vitest 자체 종료 코드.
 * 4. **초등 판정기 쓸기** — `scripts/qa/sweep-elem-probes.mjs` 를 부른다.
 *    시험(`elemProbeGauges`)이 도는 것은 각 판정기의 `--selftest`(픽스처 문자열)뿐이라
 *    **실데이터에 대고는 아무도 안 쓴다.** 그래서 판정기가 빨간 채로 착지할 수 있고
 *    **실제로 그랬다** — 2026-08-24 `probe-elem-rules` 의 `R9 고정그림 1`이 그렇게
 *    main 에 들어갔고 관문은 초록이었다. 그 쓸기는 **따로 돌릴 수 있게** 떼어 뒀다:
 *    관문 안에 두면 「무는지」를 확인하려고 vitest 8분을 통째로 돌려야 하고,
 *    그 사이 다른 세션이 결함을 고치면 초록이 나온다(실제로 그렇게 못 봤다).
 *
 * ⚠️ **`numTotalTestSuites` 로 세면 안 된다.** 그건 파일이 아니라 `describe` 블록 수다
 * (이 저장소 실측: 파일 129 · 스위트 542). 처음에 그걸로 견줘 「413개가 사라졌다」는
 * 거짓 경보를 냈다 — **분모를 먼저 검산하라**는 그 자리다.
 *
 * 인자는 그대로 넘긴다: `npm run test -- src/__tests__/unit/foo.test.ts`
 * 감싸지 않은 원본이 필요하면 `npm run test:raw`.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const VITEST = path.join("node_modules", "vitest", "vitest.mjs");
const tmp = mkdtempSync(path.join(os.tmpdir(), "vitest-gate-"));
const jsonPath = path.join(tmp, "result.json");

const norm = (p) => path.relative(process.cwd(), path.resolve(p)).split(path.sep).join("/");
const IS_TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

/** 「돌 예정인 파일」을 먼저 받아 둔다 — 결과와 견줄 **본문 밖 근거**다. */
function collectExpected() {
  const r = spawnSync(process.execPath, [VITEST, "list", "--filesOnly", ...args], {
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return new Set(
    r.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => IS_TEST_FILE.test(l))
      .map(norm),
  );
}

const expected = collectExpected();

// 사람이 보는 기본 리포터는 그대로 두고, JSON 을 **파일로** 하나 더 받는다.
const run = spawnSync(
  process.execPath,
  [VITEST, "run", ...args, "--reporter=default", "--reporter=json", `--outputFile.json=${jsonPath}`],
  { stdio: "inherit", encoding: "utf8" },
);

let report = null;
try {
  report = JSON.parse(readFileSync(jsonPath, "utf8"));
} catch {
  /* 리포트를 못 읽는 것 자체가 아래에서 실패로 잡힌다 */
}
await rm(tmp, { recursive: true, force: true }).catch(() => {});

const 문제 = [];

if (!report) {
  문제.push("JSON 리포트를 못 읽었다 — vitest 가 리포트를 쓰기 전에 죽었을 수 있다");
} else {
  // ⑴ 모은 파일 vs 결과가 있는 파일 — **이름으로** 견준다
  const ran = new Set(
    (Array.isArray(report.testResults) ? report.testResults : [])
      .map((t) => t?.name)
      .filter(Boolean)
      .map(norm),
  );
  if (expected === null) {
    문제.push("`vitest list` 가 실패해 «돌 예정인 파일»을 못 받았다 — 견줄 근거가 없다");
  } else {
    const 사라진 = [...expected].filter((f) => !ran.has(f));
    if (사라진.length > 0) {
      문제.push(
        `**파일 ${사라진.length}개가 결과 없이 사라졌다** (모음 ${expected.size} · 결과 ${ran.size}) — ` +
          "워커가 죽었을 수 있다. 「N passed」만 보면 안 보인다:\n" +
          사라진.map((f) => `       · ${f}`).join("\n"),
      );
    }
  }
  // ⑵ 처리되지 않은 오류 — 워커 사망이 여기로 온다
  const 미처리 = report.unhandledErrors?.length ?? 0;
  if (미처리 > 0) 문제.push(`처리되지 않은 오류 ${미처리}건 — 워커 사망이 여기로 온다`);
  // ⑶ 실패 — **파일 수와 스위트 수를 갈라 찍는다.**
  // `numFailedTestSuites` 는 파일이 아니라 `describe` 블록 수다(머리말 ⚠️ 참조).
  // 그걸 「실패한 파일 N개」로 찍었더니, vitest 가 「4 failed」라 한 것을 게이트가 「8개」로
  // 말해 **「넷이 안 돈 것 아닌가」로 읽히고 8분짜리 전량 회차를 한 번 더 돌게** 했다
  // (2026-08-24 elem-g6 실측: 파일 4 · 시험 6 · 스위트 8). 이 게이트의 존재 이유가
  // 「분모를 틀리게 말하지 않는 것」인데 자기 요약이 그걸 어기고 있었다.
  const 실패스위트 = report.numFailedTestSuites ?? 0;
  const 실패한 = (report.testResults ?? []).filter((r) => r.status === "failed");
  // ⚠️ **이름을 반드시 찍는다.** 2026-08-28 에 이 게이트가 「실패한 파일 1개」라고만
  //    말하고 끝나서, 어느 시험이 빨간지 몰라 **전량 회차를 두 번 더** 돌렸다(20분).
  //    리포트는 손에 있었다 — 안 찍었을 뿐이다. 화면 리포터가 이름을 찍긴 하지만
  //    긴 회차에서는 위로 스크롤돼 사라지고, 배경 실행에서는 **꼬리만 남는다.**
  //    2026-08-23 에 「빨간데 실패한 시험을 못 대면 판정을 거부한다」를 변이 판정기에
  //    넣었는데, **정작 이 게이트가 그러고 있었다.**
  if (실패스위트 > 0) {
    const 이름 = 실패한.flatMap((r) => [
      `       · ${norm(r.name)}`,
      ...(r.assertionResults ?? [])
        .filter((a) => a.status === "failed")
        .slice(0, 5)
        .map((a) => `         ✕ ${a.fullName}`),
    ]);
    // 🔴 **«시간 초과»와 «틀렸다»를 갈라 찍는다** (2026-08-31).
    //
    //    이 둘은 다음 수가 **완전히 다르다** — 틀린 것은 고쳐야 하고, 시간 초과는
    //    대개 **다른 세션이 CPU 를 같이 쓰는 것**이다(메모리 `vitest-forks-pool-starves`).
    //    그런데 지금까지 똑같이 「✕」로 찍혀서, 실제로 2026-08-31 에 물결 병합 뒤
    //    빨간 넷을 보고 «내 병합이 깨뜨렸나»부터 의심했다. **넷 다 단독으로는 통과했다.**
    //
    //    ⚠️ **숨기지 않는다.** 시간 초과도 실패는 실패다(늘 우는 가드는 꺼지지만,
    //       안 우는 가드는 아무것도 안 지킨다). 다만 **어느 쪽인지 말해 준다** —
    //       그것만으로 「단독으로 다시 돌려 보라」가 다음 수임을 안다.
    // ⚠️ **JSON 리포트로는 «시간 초과»라는 말을 못 읽는다** — 실측으로 확인했다.
    //    `failureMessages` 가 `Error: STACK_TRACE_ERROR` 자리표시자로 바뀌어 온다.
    //    그리고 기본 리포터의 출력은 `stdio: "inherit"` 이라 여기서 못 잡는다
    //    (사람이 보는 실시간 화면을 뺏지 않으려고 일부러 그렇게 두었다).
    //
    //    그래서 **걸린 시간**으로 가른다. 틀린 시험은 곧바로 끝나고, 시간 초과는
    //    문턱만큼 걸린다 — 일부러 넘긴 표본의 `duration` 이 **20,088ms**(문턱 20,000)였다.
    //    🔴 이것은 **추정이지 판정이 아니다.** 그래서 아래 문구가 「이렇다」가 아니라
    //       **「단독으로 다시 돌려 보라」**고만 말한다 — 어느 쪽이든 해로울 것이 없다.
    const 초과문턱 = 20_000;
    const 초과 = 실패한.flatMap((r) =>
      (r.assertionResults ?? [])
        .filter((a) => a.status === "failed" && (a.duration ?? 0) >= 초과문턱)
        .map((a) => a.fullName),
    );
    const 전체실패 = 실패한.reduce(
      (n, r) =>
        n + (r.assertionResults ?? []).filter((a) => a.status === "failed").length,
      0,
    );
    문제.push(
      `실패한 파일 ${실패한.length}개 · 스위트 ${실패스위트}개 (스위트는 describe 블록 수다)` +
        (초과.length > 0
          ? `\n       ⏱ 그중 **${초과.length}/${전체실패}건이 «시간 초과»로 보인다**(${초과문턱 / 1000}초 이상 걸렸다) — 틀린 것과 다르다.` +
            `\n         다른 세션이 CPU 를 같이 쓰면 난다. **그 파일만 단독으로 다시 돌려** 보라:` +
            `\n         npx vitest run <파일> --reporter=dot` +
            `\n         단독으로 통과하면 부하 경합이다(고칠 것이 없다). 그래도 빨가면 진짜다.`
          : "") +
        (이름.length > 0
          ? "\n" + 이름.join("\n")
          : "\n       · **리포트가 이름을 안 준다** — 스위트만 빨갛고 파일이 없다"),
    );
  }
}

// ⑷ vitest 자신의 종료 코드
if (run.status !== 0) 문제.push(`vitest 종료 코드 ${run.status}`);

// ⑸ 초등 판정기를 **실데이터에 대고** 쓴다 (따로 돌릴 수 있는 스크립트 — 위 머리말 4).
//    시험 파일을 인자로 준 회차에서는 건너뛴다(좁혀 돌릴 때 빠른 길을 지킨다).
if (!args.some((a) => IS_TEST_FILE.test(a))) {
  const sweep = spawnSync(process.execPath, ["scripts/qa/sweep-elem-probes.mjs"], {
    stdio: "inherit",
  });
  // ⚠️ **4 는 울타리다 — 결함이 아니지만 «전부 깨끗»도 아니다.** 그 회차로는 밀지 않는다.
  //    이것을 통과시키면 「못 잰 것」이 「깨끗」으로 세어진다(2026-08-24 실제로 그랬다).
  if (sweep.status === 4)
    문제.push(
      // ⚠️ **여기서 원인을 단정하지 않는다.** 예전엔 「다른 세션이 엔진을 쓰는 중」이라고
      //    적어 두었는데, 2026-08-25 의 실제 사유는 **말뭉치 부재**였다 — 그 말대로
      //    기다리면 영영 안 풀린다. 사유는 위 쓸기가 판정기 줄 그대로 찍는다.
      "판정기 일부를 **못 쟀다**(울타리). 결함이 아니지만 이 회차는 «전부 깨끗»이 " +
        "아니다 — **위의 «울타리» 줄에 적힌 사유를 먼저 읽어라.** 기다리면 풀리는 것도 " +
        "있고(다른 세션이 엔진을 쓰는 중), 무엇을 만들어야 풀리는 것도 있다(말뭉치 부재).",
    );
  else if (sweep.status !== 0)
    문제.push(
      `초등 판정기 쓸기가 막았다 (종료 ${sweep.status}) — 위 «판정기가 결함을 찾았다» 줄을 보라`,
    );
}

if (문제.length > 0) {
  console.error("\n🔴 게이트가 막는다 —");
  for (const m of 문제) console.error(`   · ${m}`);
  console.error(
    "\n   (이 검사는 `scripts/qa/run-tests.mjs` 다. 요약 줄의 「N passed」는" +
      "\n    안 돈 파일을 말해 주지 않는다 — 2026-08-19 에 실제로 그렇게 지나갔다.)",
  );
  process.exit(1);
}
