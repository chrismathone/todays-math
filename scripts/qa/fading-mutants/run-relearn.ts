/**
 * 단기 재학습 대기열(`src/lib/fading/relearn*.ts` · 저장 칸의 `relearn`)의 변이 실험 — 규칙을 한 군데씩 틀리게 바꿔 시험이 잡는지 본다.
 *
 * `run.ts` 와 같은 길이다 — 디스크의 파일은 건드리지 않고, vitest 의 변환 단계에서 메모리의 한 군데만 바꾼다.
 * 바꿀 자리가 정확히 한 번 나올 때만 적용하고, 아니면 «죽음»이 아니라 **«무효»**로 센다. 수집 중에 죽은 파일도 실패로 센다.
 * 변이 목록을 따로 둔 까닭: `mutants.ts` 는 여러 세션이 같이 고치는 파일이다.
 *
 * 두 바퀴로 돈다. 첫 바퀴는 그 파일의 규칙을 직접 보는 시험만(라우트 · 문의 변이는 라우트 시험, 나머지는 은행을 싣지 않는 단위 시험 셋),
 * 거기서 살아남은 변이만 둘째 바퀴에서 시험 넷 전부로 다시 본다.
 *
 *   npx tsx scripts/qa/fading-mutants/run-relearn.ts --check    # 바꿀 자리만 센다(포맷 뒤에 먼저)
 *   npx tsx scripts/qa/fading-mutants/run-relearn.ts [결과 파일]
 *   npx tsx scripts/qa/fading-mutants/run-relearn.ts --resume [결과 파일]   # 결과 파일에 «죽음»으로 적힌 변이는 건너뛴다
 *
 * 결과는 Git 밖 `.qa-artifacts/fading-mutants/relearn.txt` 에 쓴다(한 줄에 변이 하나).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, posix } from "node:path";

type Mutant = { file: string; from: string; to: string; note: string };

const RULES = "fading/relearn.ts";
const MUTANTS: Mutant[] = [
  {
    file: "../contracts/fadingRelearn.contract.ts",
    note: "1분이 59,999 밀리초다",
    from: "export const FADING_RELEARN_RETRY_MS = 60_000;",
    to: "export const FADING_RELEARN_RETRY_MS = 59_999;",
  },
  {
    file: "../contracts/fadingRelearn.contract.ts",
    note: "5분이 299,999 밀리초다",
    from: "export const FADING_RELEARN_CONFIRM_MS = 300_000;",
    to: "export const FADING_RELEARN_CONFIRM_MS = 299_999;",
  },
  {
    file: RULES,
    note: "확인 시각 전의 답을 받는다",
    from: "  if (now < dueAtOf(item, digest)) throw conflict(FADING_RELEARN_NOT_DUE);\n",
    to: "",
  },
  {
    file: RULES,
    note: "확인 시각에 딱 닿은 답을 받지 않는다(<=)",
    from: "if (now < dueAtOf(item, digest))",
    to: "if (now <= dueAtOf(item, digest))",
  },
  {
    file: RULES,
    note: "화면의 «준비됨»이 1밀리초 늦다",
    from: 'state: pending ? "judging" : now >= dueAt ? "ready" : "waiting",',
    to: 'state: pending ? "judging" : now > dueAt ? "ready" : "waiting",',
  },
  {
    file: RULES,
    note: "맞힌 뒤의 다시 확인이 1분 뒤다",
    from: "dueAt: now + FADING_RELEARN_CONFIRM_MS,",
    to: "dueAt: now + FADING_RELEARN_RETRY_MS,",
  },
  {
    file: RULES,
    note: "한 번 맞히면 바로 대기열에서 나간다",
    from: '      ? item.stage === "retry"\n',
    to: "      ? false\n",
  },
  {
    file: RULES,
    note: "다시 확인에서 맞혀도 나가지 않는다",
    from: '      ? item.stage === "retry"\n',
    to: "      ? true\n",
  },
  {
    file: RULES,
    note: "확인에서 틀려도 틀림을 세지 않는다",
    from: 'fails: item.fails + (verdict === "failed" ? 1 : 0),',
    to: "fails: item.fails,",
  },
  {
    file: RULES,
    note: "도움을 받은 확인도 틀림으로 센다",
    from: 'fails: item.fails + (verdict === "failed" ? 1 : 0),',
    to: "fails: item.fails + 1,",
  },
  {
    file: RULES,
    note: "도움을 받아 맞힌 것을 «도움 없이 맞힘»으로 친다",
    from: 'failed ? "failed" : attempt.assisted ? "assisted" : "passed",',
    to: 'failed ? "failed" : "passed",',
  },
  {
    file: RULES,
    note: "못 알아본 글을 대조 없이 맞힘으로 친다",
    from: '  if (!failed && !attempt.assisted && outcomes.includes("unknown")) {',
    to: "  if (false) {",
  },
  {
    file: RULES,
    note: "못 알아본 글을 틀림으로 친다",
    from: 'const failed = outcomes.some((o) => o === "wrong" || o === "skipped");\n  if (!failed && !attempt.assisted',
    to: 'const failed = outcomes.some((o) => o !== "correct");\n  if (!failed && !attempt.assisted',
  },
  {
    file: RULES,
    note: "넘긴 빈칸을 틀림으로 치지 않는다",
    from: 'const failed = outcomes.some((o) => o === "wrong" || o === "skipped");\n  if (!failed && !attempt.assisted',
    to: 'const failed = outcomes.some((o) => o === "wrong");\n  if (!failed && !attempt.assisted',
  },
  {
    file: RULES,
    note: "덜 쓴 답을 넘김으로 받는다",
    from: "    if (!attempt.gaveUp) throw conflict(FADING_RELEARN_INCOMPLETE);\n",
    to: "",
  },
  {
    file: RULES,
    note: "대조가 남은 줄을 다시 쓰게 둔다",
    from: "  if (live) throw conflict(FADING_RELEARN_JUDGING);\n",
    to: "",
  },
  {
    file: RULES,
    note: "옛 토큰의 답을 받는다",
    from: "  if (attempt.token !== fadingRelearnToken(item, concept, traps))\n    throw conflict(FADING_RELEARN_CHANGED);\n",
    to: "",
  },
  {
    file: RULES,
    note: "토큰이 일정을 덮지 않는다",
    from: "      item.since,\n      item.stage,\n      item.dueAt,\n",
    to: "      item.since,\n",
  },
  {
    file: RULES,
    note: "토큰이 내용을 덮지 않는다",
    from: '    ].join("|"),\n    fadingContentKey(concept, traps),\n',
    to: '    ].join("|"),\n    "",\n',
  },
  {
    file: RULES,
    note: "같은 번호의 답을 다시 적용한다",
    from: "  if (done) return { fading, result: replayedResult(done, concept) };\n  const { relearn, at, item, proposition } = located(\n    fading,\n    concept,\n    attempt.propositionId,",
    to: "  const { relearn, at, item, proposition } = located(\n    fading,\n    concept,\n    attempt.propositionId,",
  },
  {
    file: RULES,
    note: "같은 번호의 대조를 다시 적용한다",
    from: "  if (done) return { fading, result: replayedResult(done, concept) };\n  const { relearn, at, item, proposition } = located(\n    fading,\n    concept,\n    judgement.propositionId,",
    to: "  const { relearn, at, item, proposition } = located(\n    fading,\n    concept,\n    judgement.propositionId,",
  },
  {
    file: RULES,
    note: "고쳐진 문장의 옛 답을 대조한다",
    from: "  if (pending.digest !== digest) throw conflict(FADING_RELEARN_CHANGED);\n",
    to: "",
  },
  {
    file: RULES,
    note: "낡은 대조 뒤의 1분을 기다리지 않는다",
    from: "    ? Math.max(item.dueAt, item.pending.at + FADING_RELEARN_RETRY_MS)\n",
    to: "    ? item.dueAt\n",
  },
  {
    file: RULES,
    note: "대조를 덜 골라도 판정한다",
    from: "  if (chosen.length !== waiting.size)\n",
    to: "  if (false)\n",
  },
  {
    file: RULES,
    note: "«다름»을 틀림으로 치지 않는다",
    from: 'const failed = outcomes.some((o) => o === "wrong" || o === "different");',
    to: 'const failed = outcomes.some((o) => o === "wrong");',
  },
  {
    file: RULES,
    note: "남의 요청 번호의 평가를 증거로 받는다",
    from: "    receipt.requestId !== observation.requestId ||\n",
    to: "",
  },
  {
    file: RULES,
    note: "며칠 묵은 평가를 증거로 받는다",
    from: '    !recentDays(now).includes(stored.reviewedOn ?? "")\n',
    to: "    false\n",
  },
  {
    file: RULES,
    note: "어제의 평가를 받지 않는다",
    from: "[now, now - DAY_MS].map(",
    to: "[now].map(",
  },
  {
    file: RULES,
    note: "풀이 토큰을 보지 않고 차례를 받는다",
    from: "  if (\n    observation.sessionId !==\n    fadingSessionToken(session.id, fadingContentKey(concept, traps))\n  )\n    throw conflict(FADING_CONTENT_CHANGED);\n",
    to: "",
  },
  {
    file: RULES,
    note: "닿지 않은 단계의 차례를 받는다",
    from: "  if (step < session.startStep || step > stored.step)",
    to: "  if (step < session.startStep)",
  },
  {
    file: RULES,
    note: "풀이가 시작하기 전 단계의 차례를 받는다",
    from: "  if (step < session.startStep || step > stored.step)",
    to: "  if (step > stored.step)",
  },
  {
    file: RULES,
    note: "4단계에서 적어 둔 틀림을 보지 않는다",
    from: "      ...(step === 4 ? session.missedAtFour : []),\n",
    to: "",
  },
  {
    file: RULES,
    note: "같은 단계의 증거를 다시 센다",
    from: "          countedStep(seen, concept.id, evidence.ordinal, propositionId) <\n          evidence.step,",
    to: "          countedStep(seen, concept.id, evidence.ordinal, propositionId) <=\n          evidence.step,",
  },
  {
    file: RULES,
    note: "늦게 온 앞 단계의 증거를 다시 센다",
    from: "    if (seen.includes(traceKey(conceptId, ordinal, step, propositionId)))\n      top = step;",
    to: "    if (seen.includes(traceKey(conceptId, ordinal, step, propositionId)))\n      top = Math.min(top || step, step);",
  },
  {
    file: RULES,
    note: "그 자리에서 센 4단계의 틀림을 평가 때 다시 센다",
    from: "        return counted.get(p.id) === 4\n",
    to: "        return false\n",
  },
  {
    file: RULES,
    note: "이 풀이에서 이미 센 명제를 평가 때 다시 넣는다",
    from: "      if (counted.get(p.id)) return [];\n",
    to: "",
  },
  {
    file: RULES,
    note: "같은 평가의 증거를 다시 적용한다",
    from: "    if (seen.includes(closing))\n      return { fading, applied: { ...NOTHING, duplicate: true } };\n",
    to: "",
  },
  {
    file: RULES,
    note: "4단계의 틀림을 알고 있어도 전부 «다시»로 넣는다",
    from: "      if (evidence.lapsed && !known)",
    to: "      if (evidence.lapsed)",
  },
  {
    file: RULES,
    note: "복습의 틀리지 않은 명제도 넣는다",
    from: "    fresh: stored.reviews === 1,",
    to: "    fresh: true,",
  },
  {
    file: RULES,
    note: "처음 배운 풀이의 명제를 넣지 않는다",
    from: "    fresh: stored.reviews === 1,",
    to: "    fresh: false,",
  },
  {
    file: RULES,
    note: "빈칸마다의 진단이 있어도 전부 «다시»로 넣는다",
    from: '    lapsed: receipt.rating === "again" && missed.size === 0,',
    to: '    lapsed: receipt.rating === "again",',
  },
  {
    file: RULES,
    note: "«답을 본 직후»가 있는 줄의 일정을 옮긴다",
    from: "      if (!failed) continue;\n",
    to: "",
  },
  {
    file: RULES,
    note: "새 틀림이 틀림의 수를 올리지 않는다",
    from: "        fails: item.fails + 1,\n",
    to: "        fails: item.fails,\n",
  },
  {
    file: RULES,
    note: "새 틀림이 5분 뒤를 기다리던 줄을 되돌리지 않는다",
    from: '        digest,\n        stage: "retry",\n        dueAt: retryAt,\n        origin:\n',
    to: "        digest,\n        origin:\n",
  },
  {
    file: RULES,
    note: "자리가 없을 때 틀림도 들지 못한다",
    from: "        const evict = failed\n",
    to: "        const evict = false\n",
  },
  {
    file: RULES,
    note: "빼 버린 개념의 줄을 내려보낸다",
    from: "    if (!concept || !proposition || !fading.concepts[item.conceptId]) continue;",
    to: "    if (!concept || !proposition) continue;",
  },
  {
    file: RULES,
    note: "영수증을 상한 없이 쌓는다",
    from: "graded: [...relearn.graded, receipt].slice(-FADING_RELEARN_RECEIPTS_MAX),",
    to: "graded: [...relearn.graded, receipt],",
  },
  {
    file: RULES,
    note: "닫힌 풀이의 단계 열쇠를 걷지 않는다",
    from: "      return (\n        open ||\n        (ratable && !relearn.seen.includes(ratedKey(conceptId!, ordinal)))\n      );",
    to: "      return true;",
  },
  {
    file: RULES,
    note: "그날의 집계가 자정을 넘겨도 이어진다",
    from: "    relearn.day?.on === on\n      ? relearn.day\n",
    to: "    relearn.day\n      ? relearn.day\n",
  },
  {
    file: RULES,
    note: "닫혀 있어도 저장된 대기열을 내려보낸다",
    from: "  const relearn = enabled ? (fading.relearn ?? EMPTY) : EMPTY;",
    to: "  const relearn = fading.relearn ?? EMPTY;",
  },
  {
    file: "fading/relearnEnabled.ts",
    note: "쓰는 길의 문이 모르는 값에도 열린다",
    from: 'return value === undefined || value === "" || value === "on";',
    to: 'return value !== "off";',
  },
  {
    file: "fading/relearnEnabled.ts",
    note: "쓰는 길의 문이 값이 없으면 닫힌다",
    from: 'return value === undefined || value === "" || value === "on";',
    to: 'return value === "on";',
  },
  {
    file: "fading/relearnEnabled.ts",
    note: "쓰는 길의 문이 `off` 로도 닫히지 않는다",
    from: 'return value === undefined || value === "" || value === "on";',
    to: "return true;",
  },
  {
    file: "fading/relearnEnabled.ts",
    note: "학생 라우트의 문이 꺼져도 쓰는 길이 열린다",
    from: "if (!fadingEnabled()) return false;",
    to: "",
  },
  {
    file: "fading/relearnRoutes.ts",
    note: "닫혀 있어도 행동을 받는다",
    from: '    if (!open) return noStore(notFoundError("주소"));\n',
    to: "",
  },
  {
    file: "fading/relearnRoutes.ts",
    note: "닫혀 있어도 학생 기록을 읽는다",
    from: "      const fading = open\n",
    to: "      const fading = true\n",
  },
  {
    file: "fading/relearnRoutes.ts",
    note: "다른 사이트의 쓰기를 받는다",
    from: "  if (mutation && !sameOriginMutation(request))\n    return { response: noStore(crossSiteError()) } as const;\n",
    to: "",
  },
  {
    file: "fading/relearnRoutes.ts",
    note: "화면이 실어 보낸 학생이 달라도 받는다",
    from: "  if (expected !== null && expected !== gate.student.studentId)",
    to: "  if (false)",
  },
  {
    file: "fading/relearnRoutes.ts",
    note: "꺼진 계정의 학생을 들인다",
    from: "  if (!student?.studentAccount || student.studentAccount.disabledAt)",
    to: "  if (!student?.studentAccount)",
  },
  {
    file: "fading/relearnRoutes.ts",
    note: "첫 비밀번호를 안 바꾼 학생을 들인다",
    from: "requireStudent({ active: true })",
    to: "requireStudent({ active: false })",
  },
  {
    file: "fading/relearnSource.ts",
    note: "4단계의 틀림 하나를 알리지 않는다",
    from: '  if (action.action === "miss")\n',
    to: "  if (false)\n",
  },
  {
    file: "fading/relearnSource.ts",
    note: "풀이의 행동이 실패해도 증거를 알린다",
    from: "      const state = await source.act(action);\n      const observation = fadingRelearnObservationOf(action);",
    to: "      const observation = fadingRelearnObservationOf(action);\n      const state = await source.act(action).catch(async (error) => {\n        if (observation) await relearn.record(observation);\n        throw error;\n      });",
  },
  {
    file: "fading/relearnSource.ts",
    note: "닫힌 뒤에도 계속 알린다",
    from: '        if (code === "NOT_FOUND") closed = true;',
    to: '        if (code === "NOT_FOUND") closed = false;',
  },
  {
    file: "../contracts/fading.contract.ts",
    note: "저장 칸이 대기열을 읽지 못한다",
    from: "    relearn: storedFadingRelearnSchema.optional(),\n",
    to: "",
  },
  {
    file: "../contracts/fading.contract.ts",
    note: "같은 명제가 대기열에 두 번 적혀도 읽는다",
    from: '      invalid("같은 명제가 대기열에 두 번 적혔습니다.");',
    to: "      void 0;",
  },
];

const UNIT = [
  "src/__tests__/unit/fadingRelearn.test.ts",
  "src/__tests__/unit/fadingRelearnSource.test.ts",
  "src/__tests__/unit/fadingRelearnCompat.test.ts",
];
/** 라우트 시험 — 실제 은행으로 HTTP 흐름을 돈다(은행을 싣는다). */
const ROUTES = "src/__tests__/api/fadingRelearnRoutes.test.ts";
const TESTS = [...UNIT, ROUTES];
/** 첫 바퀴에 돌리는 시험 — 라우트와 문의 규칙은 라우트 시험이 직접 본다. */
const first = (mutant: Mutant) =>
  /relearn(Routes|Enabled)\.ts$/.test(mutant.file) ? [ROUTES] : UNIT;

type Task = { result?: { state?: string }; tasks?: Task[] };
function failures(tasks: Task[]): number {
  let n = 0;
  for (const task of tasks) {
    // 수집 중에 죽은 파일 · 스위트도 실패다 — 리프만 세면 «살아남음»으로 보인다.
    if (task.result?.state === "fail") n += 1;
    if (task.tasks) n += failures(task.tasks);
  }
  return n;
}

const HANG_MS = 240_000;
function stopEverything(): never {
  if (process.platform === "win32")
    execSync(`taskkill /PID ${process.pid} /T /F`, { stdio: "ignore" });
  process.exit(2);
}

const ARGS = process.argv.slice(2);
const RESUME = ARGS.includes("--resume");
const OUT =
  ARGS.find((a) => !a.startsWith("--")) ??
  ".qa-artifacts/fading-mutants/relearn.txt";

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

async function run(mutant: Mutant | null, files: string[]) {
  let applied = 0;
  const { startVitest } = await import("vitest/node");
  const vitest = await startVitest(
    "test",
    files,
    {
      run: true,
      watch: false,
      reporters: [{}] as never,
      pool: "threads",
      testTimeout: 120_000,
    },
    {
      plugins: mutant
        ? [
            {
              name: "mutate-in-memory",
              enforce: "pre",
              transform(code: string, id: string) {
                const path = id.replaceAll("\\", "/").split("?")[0]!;
                if (!path.endsWith(posix.normalize(`/src/lib/${mutant.file}`)))
                  return null;
                const parts = code.replaceAll("\r\n", "\n").split(mutant.from);
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
  if (ARGS.includes("--check")) {
    process.exitCode = checkAnchors() ? 1 : 0;
    return;
  }
  mkdirSync(dirname(OUT), { recursive: true });
  // 이어 돌릴 때는 기준을 새로 적기 전에 앞 실험의 줄을 읽어 둔다.
  const earlier =
    RESUME && existsSync(OUT) ? readFileSync(OUT, "utf8").split(/\r?\n/) : [];
  const lines: string[] = [];
  const save = () => writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
  // 변이 없이도 빨갛거나 시험 파일을 다 못 읽었으면 변이의 «죽음»은 아무 뜻이 없다.
  const base = await run(null, TESTS);
  lines.push(`기준: 파일 ${base.files} · 실패 ${base.failed}`);
  save();
  if (base.failed || base.files !== TESTS.length) {
    process.exitCode = 1;
    return;
  }
  let killed = 0;
  let survived = 0;
  let invalid = 0;
  // 앞 실험에서 죽은 변이 — 시험이 그대로면 죽은 것이 살아나지 않으므로 그 줄을 그대로 옮겨 적는다.
  const before = new Map(
    earlier
      .filter((line) => line.startsWith("죽음 | "))
      .map((line) => [line.split(" | ").slice(1, 3).join(" | "), line]),
  );
  for (const mutant of MUTANTS) {
    const kept = before.get(`${mutant.file} | ${mutant.note}`);
    if (kept) {
      killed++;
      lines.push(kept);
      continue;
    }
    const watchdog = setTimeout(() => {
      lines.push(`멈춤 | ${mutant.file} | ${mutant.note} | 4분을 넘겼다`);
      save();
      stopEverything();
    }, HANG_MS);
    let result = await run(mutant, first(mutant));
    let round = "첫 바퀴";
    if (result.applied === 1 && !result.failed) {
      result = await run(mutant, TESTS);
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
    `합계: 변이 ${MUTANTS.length} · 죽음 ${killed} · 생존 ${survived} · 무효 ${invalid}`,
  );
  save();
  process.exitCode = survived || invalid ? 1 : 0;
}
void main();
