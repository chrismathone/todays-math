/**
 * «오늘의 기억» 속(`src/lib/fading/`)의 변이 실험 — 규칙을 한 군데씩 틀리게 바꿔 시험이 잡는지 본다.
 *
 * 디스크의 파일은 건드리지 않는다. vitest 의 변환 단계에서 메모리의 한 군데만 바꿔 시험을 돌린다.
 * 바꿀 자리가 정확히 한 번 나올 때만 적용하고, 그렇지 않으면 «죽음»이 아니라 **«무효»**로 센다 —
 * 코드를 고쳐 자리가 없어진 변이가 초록으로 읽히지 않게.
 *
 * 두 바퀴로 돈다. 첫 바퀴는 그 파일의 시험 하나만, «은행 전체» 묶음을 빼고 돌린다(은행 9,119문장을 읽지 않아 빠르다).
 * 거기서 살아남은 변이만 둘째 바퀴에서 시험 넷 전부로 다시 본다.
 *
 *   npx tsx scripts/qa/fading-mutants/run.ts --check     # 바꿀 자리만 센다(포맷 뒤에 먼저)
 *   npx tsx scripts/qa/fading-mutants/run.ts [결과 파일]
 *   npx tsx scripts/qa/fading-mutants/run.ts --file=numbers   # 그 파일의 변이만(쉼표로 여럿)
 *   npx tsx scripts/qa/fading-mutants/run.ts --resume [결과 파일]   # 결과 파일에 «죽음»으로 적힌 변이는 건너뛴다
 *
 * 결과는 Git 밖 `.qa-artifacts/fading-mutants/result.txt` 에 쓴다(한 줄에 변이 하나).
 * 🔴 변이가 시험을 끝없는 반복문에 빠뜨리면 vitest 는 영영 안 돌아온다(시험 시한은 동기 반복문을 못 끊는다).
 * 3분을 넘기면 «멈춤»을 적고 일꾼까지 끈다 — 그때는 그 시험의 반복문에 상한을 건다(2026-10-06 실제로 9분을 멈춰 있었다).
 * 🔴 변이마다 vitest 를 새로 띄우는데 다 걷히지 않는다 — 기본 힙으로는 150개쯤에서 메모리가 바닥나 죽는다(종료 코드 134).
 * 그때까지의 줄은 결과 파일에 남아 있다. `--resume` 으로 잇는다(힙을 늘리려면 `NODE_OPTIONS=--max-old-space-size=8192`).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, posix } from "node:path";

import { MUTANTS, type Mutant } from "./mutants";

const TEST = (name: string) => `src/__tests__/unit/fading${name}.test.ts`;
/** 라우트 시험 — 실제 은행으로 HTTP 흐름을 돈다(은행을 싣는다 · 첫 바퀴에서도 빼지 않는다). */
const ROUTES = "src/__tests__/api/fadingRoutes.test.ts";
const TEACHER_ROUTES = "src/__tests__/api/fadingTeacherRoutes.test.ts";
const CONSOLE = "src/__tests__/unit/learnTestConsole.test.ts";
const TESTS = [
  "Concepts",
  "Groups",
  "Erasure",
  "Session",
  "Schedule",
  "State",
  "View",
  "Teacher",
  "Source",
  "Traps",
  "Figures",
]
  .map(TEST)
  .concat(ROUTES, TEACHER_ROUTES, CONSOLE);
/** 첫 바퀴에 돌리는 시험 — 그 파일의 규칙을 직접 보는 것 하나. */
const FIRST: Record<string, string> = {
  "fading/concepts.ts": TEST("Concepts"),
  "fading/erasure.ts": TEST("Erasure"),
  "fading/chips.ts": TEST("Erasure"),
  "fading/random.ts": TEST("Erasure"),
  "fading/session.ts": TEST("Session"),
  "fading/schedule.ts": TEST("Schedule"),
  "fading/numbers.ts": TEST("Schedule"),
  "fading/state.ts": TEST("State"),
  "../contracts/fading.contract.ts": TEST("State"),
  "fading/view.ts": TEST("View"),
  "fading/routes.ts": ROUTES,
  "fading/actions.ts": TEST("Source"),
  "fading/local.ts": TEST("Source"),
  "fading/source.ts": TEST("Source"),
  "fading/traps.ts": TEST("Traps"),
  "fading/figures.ts": TEST("Figures"),
  "fading/enabled.ts": ROUTES,
  "math-srs/serverStore.ts": ROUTES,
  "fading/teacher.ts": TEST("Teacher"),
  "fading/teacherRoutes.ts": TEACHER_ROUTES,
  "accountRouteAccess.ts": TEACHER_ROUTES,
  "math-srs/testConsoleActions.ts": CONSOLE,
};
/** «은행 전체» 묶음을 뺀 나머지 — 그 묶음들은 은행을 묶음 안에서 싣는다. */
const WITHOUT_BANK = "^(?!.*은행 전체)";

type Task = { type?: string; result?: { state?: string }; tasks?: Task[] };
function failures(tasks: Task[]): number {
  let n = 0;
  for (const task of tasks) {
    // 수집 중에 죽은 파일 · 스위트도 실패다 — 리프만 세면 «살아남음»으로 보인다.
    if (task.result?.state === "fail") n += 1;
    if (task.tasks) n += failures(task.tasks);
  }
  return n;
}

const HANG_MS = 180_000;
function stopEverything(): never {
  if (process.platform === "win32")
    execSync(`taskkill /PID ${process.pid} /T /F`, { stdio: "ignore" });
  process.exit(2);
}

const ARGS = process.argv.slice(2);
/** `--check` — 시험을 돌리지 않고, 바꿀 자리가 디스크의 파일에 정확히 한 번 있는지만 센다(포맷 뒤에 먼저 본다). */
const CHECK_ONLY = ARGS.includes("--check");
/** `--file=<글>` — 파일 이름에 그 글이 든 변이만 돌린다(한 파일을 고친 뒤 다시 볼 때). */
const ONLY = ARGS.find((a) => a.startsWith("--file="))?.slice(7);
/** `--resume` — 결과 파일에 이미 «죽음»으로 적힌 변이는 건너뛴다(중간에 죽은 실험을 잇는다 · 살아남은 것과 무효는 다시 돈다). */
const RESUME = ARGS.includes("--resume");
const OUT =
  ARGS.find((a) => !a.startsWith("--")) ??
  ".qa-artifacts/fading-mutants/result.txt";

function checkAnchors(): number {
  let off = 0;
  for (const mutant of MUTANTS) {
    const source = readFileSync(`src/lib/${mutant.file}`, "utf8").replaceAll(
      "\r\n",
      "\n",
    );
    const count = source.split(mutant.from).length - 1;
    if (count === 1) continue;
    off += 1;
    console.info(`자리 ${count} | ${mutant.file} | ${mutant.note}`);
  }
  console.info(`변이 ${MUTANTS.length} · 자리가 어긋난 것 ${off}`);
  return off;
}

async function run(mutant: Mutant | null, files: string[], quick: boolean) {
  let applied = 0;
  const { startVitest } = await import("vitest/node");
  const vitest = await startVitest(
    "test",
    files,
    {
      run: true,
      watch: false,
      reporters: [{}] as never,
      // 기계가 바쁘면 은행을 싣는 시험이 20초 시한을 넘긴다 — 그 실패가 «변이를 잡았다»로 읽히면 안 된다.
      testTimeout: 120_000,
      ...(quick ? { testNamePattern: WITHOUT_BANK } : {}),
    },
    {
      plugins: mutant
        ? [
            {
              name: "mutate-in-memory",
              enforce: "pre",
              transform(code: string, id: string) {
                const path = id.replaceAll("\\", "/").split("?")[0]!;
                // 변이의 파일은 `src/lib/` 에서 본 길이다(계약은 `../contracts/…`).
                if (!path.endsWith(posix.normalize(`/src/lib/${mutant.file}`)))
                  return null;
                const source = code.replaceAll("\r\n", "\n");
                const parts = source.split(mutant.from);
                if (parts.length - 1 !== 1) {
                  applied = -(parts.length - 1) - 1;
                  return null;
                }
                applied = 1;
                return { code: parts.join(mutant.to), map: null };
              },
            },
          ]
        : [],
    },
  );
  const loaded = (vitest?.state.getFiles() ?? []) as unknown as Task[];
  const failed = failures(loaded);
  await vitest?.close();
  process.exitCode = 0;
  return { failed, applied, files: loaded.length };
}

async function main() {
  if (CHECK_ONLY) {
    process.exitCode = checkAnchors() ? 1 : 0;
    return;
  }
  mkdirSync(dirname(OUT), { recursive: true });
  // 이어 돌릴 때는 기준을 새로 적기 전에 앞 실험의 줄을 읽어 둔다.
  const earlier =
    RESUME && existsSync(OUT) ? readFileSync(OUT, "utf8").split(/\r?\n/) : [];
  const lines: string[] = [];
  const save = () => writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
  // 변이 없이도 빨갛거나 시험 파일을 다 못 읽었으면 변이의 «죽음»은 아무 뜻이 없다 — 두 바퀴의 기준을 다 본다.
  for (const quick of [true, false]) {
    const base = await run(null, TESTS, quick);
    lines.push(
      `기준(${quick ? "은행 전체 빼고" : "전부"}): 파일 ${base.files} · 실패 ${base.failed}`,
    );
    save();
    if (base.failed || base.files !== TESTS.length) {
      process.exitCode = 1;
      return;
    }
  }
  let killed = 0;
  let survived = 0;
  let invalid = 0;
  const chosen = MUTANTS.filter(
    (m) => !ONLY || ONLY.split(",").some((part) => m.file.includes(part)),
  );
  // 앞 실험에서 죽은 변이 — 시험을 더해도 죽은 것이 살아나지는 않으므로 그 줄을 그대로 옮겨 적는다.
  const before = new Map(
    (RESUME ? earlier : [])
      .filter((line) => line.startsWith("죽음 | "))
      .map((line) => [line.split(" | ").slice(1, 3).join(" | "), line]),
  );
  for (const mutant of chosen) {
    const kept = before.get(`${mutant.file} | ${mutant.note}`);
    if (kept) {
      killed++;
      lines.push(kept);
      continue;
    }
    const watchdog = setTimeout(() => {
      lines.push(`멈춤 | ${mutant.file} | ${mutant.note} | 3분을 넘겼다`);
      save();
      stopEverything();
    }, HANG_MS);
    let result = await run(mutant, [FIRST[mutant.file]!], true);
    let round = "첫 바퀴";
    if (result.applied === 1 && !result.failed) {
      result = await run(mutant, TESTS, false);
      round = "둘째 바퀴";
    }
    clearTimeout(watchdog);
    const verdict =
      result.applied !== 1 ? "무효" : result.failed ? "죽음" : "생존";
    if (verdict === "죽음") killed++;
    else if (verdict === "생존") survived++;
    else invalid++;
    lines.push(
      `${verdict} | ${mutant.file} | ${mutant.note} | ${verdict === "무효" ? `맞은 자리 ${-(result.applied + 1)}` : round}`,
    );
    save();
  }
  lines.push(
    `합계: 변이 ${chosen.length} · 죽음 ${killed} · 생존 ${survived} · 무효 ${invalid}`,
  );
  save();
  process.exitCode = survived || invalid ? 1 : 0;
}
void main();
