/**
 * **초등 판정기 공용 울타리 — 「훑는 동안 과녁이 안 움직였나」와 「얼마나 훑었나」.**
 *
 * 두 축은 다르고 **둘 다 있어야** 한다.
 *  · **울타리**: 재는 동안 생성기가 바뀌면 수치를 내지 않고 멈춘다.
 *  · **분모**: 학년·소단원·갈래·문항을 세어 찍는다. 0이 «깨끗»인지 «못 셈»인지 가른다.
 *
 * ## 왜 공용인가
 *
 * 이 울타리는 원래 `probe-elem-arithmetic.ts` 안에만 있었다(2026-08-22). 그래서 나머지
 * 다섯 판정기는 **같은 위험에 그대로 노출**돼 있었다 — 오르카 다중 세션이 한 워크트리에서
 * `g3~g6.ts` 를 동시에 고치므로, 재는 도중 저장이 겹치면 「위반 0」이 «깨끗해서 0»인지
 * «반쯤 저장된 파일을 봐서 0»인지 구분되지 않는다. 2026-08-23 에 실제로
 * `probe-elem-rules` 가 tsx 변환 단계에서, `probe-elem-arithmetic` 이 top-level 에서
 * 죽고 **재실행은 둘 다 초록**이었다(그 사이 `g4.ts` 가 쓰이고 있었다).
 *
 * **거짓 빨강보다 거짓 초록이 나쁘다.** 찢긴 학년이 문항을 적게 내면 그 학년이 조용히
 * 분모에서 빠지고 판정기는 초록으로 끝난다 — 그래서 분모를 **반드시 함께** 찍는다.
 *
 * 복붙 여섯 벌로 두지 않는 이유는 이 저장소가 여러 번 적은 그것이다 —
 * **같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이 쓰게 하라.** 한쪽만 고치면 아무도 모른다.
 *
 * ## 지문만으로는 **두 자리가 안 걸린다** (2026-08-23 리드 지적, 실측으로 확인)
 *
 * 지문은 「파일이 **지금** 무엇인가」를 재는데, 우리가 알고 싶은 것은
 * **「모듈이 무엇을 읽었나」**다. 그래서 지문만 보면 이 둘이 통째로 샌다:
 *
 * **㉢ import 와 `openFence()` 사이.** ESM 은 본문보다 import 를 먼저 해결한다.
 *    생성기를 디스크에서 읽는 시각을 T0, `openFence()` 를 T1 이라 하면 **T0 < T1** 이고,
 *    그 사이 쓰기는 before·after 가 **둘 다 새 내용**이라 안 걸린다.
 *    모듈은 옛 내용을 들고 있는데 울타리는 초록이다.
 *
 * **㉣ apply→restore 가 창 안에서 끝나는 경우.** 우리 변이 하네스가 정확히 그 모양이다 —
 *    변이를 넣고, 시험 돌리고, **md5 가 같아지게** 되돌린다. 창이 그 한 사이클을 감싸면
 *    before == after 라 안 걸린다. **가장 자주 쓰는 writer 가 구조적으로 안 보이는 writer 다.**
 *
 * 그래서 지문과 함께 **mtime** 을 본다 — **프로세스가 시작한 뒤에 쓰인 파일이 하나라도
 * 있으면 멈춘다.** 되돌리기도 쓰기라 mtime 이 새로 찍히므로 ㉣ 이 걸리고, T0 보다
 * 프로세스 시작이 앞서므로 ㉢ 도 걸린다. 지문은 그대로 둔다 — mtime 이 보존되는 판
 * (복사·체크아웃)에서는 지문이 잡는다. **둘은 서로의 사각지대를 덮는다.**
 *
 * ## 범위 = **읽는 범위** (거짓 경보는 가드를 끈다)
 *
 * 한 학년 쓸기는 14초인데 팀은 14분에 네 학년을 저장한다. 울타리가 늘 `g3~g6` 전량을
 * 보면 `초3` 만 재는 판정기가 **g4 저장 때문에** 멈추고, 변이 하네스가 도는 중이면
 * 사실상 항상 멈춘다. 그러면 다음 사람이 울타리를 끈다 — 거짓 경보는 정확도 문제가
 * 아니라 **가드 생존 문제**다. 그래서 `grades` 를 주면 그 학년 파일 + 공용만 본다.
 * 대신 **본 파일 수를 반드시 찍는다** — 안 찍으면 좁힌 것이 곧 사각지대가 된다.
 *
 * ## 쓰는 법
 *
 * ```ts
 * const fence = openFence({ grades: gradeArg ? [gradeArg] : undefined });
 * const tally = new SweepTally();
 * for (const unit of units) for (const tier of tiers) {
 *   tally.count(unit.grade, unit.section, tier, SEEDS.length);
 *   …
 * }
 * console.log(`훑은 것 — ${tally.line()} · ${fence.scopeLine()}`);
 * tally.assertNonEmpty();
 * fence.close();   // 바뀌었으면 exit 2 — 판정을 찍기 **전에** 부른다
 * ```
 *
 * ## 이 울타리를 **망가뜨려 보는** 법 (재현 규약)
 *
 * ```bash
 * # ㉣ — 창 안에서 내용 그대로 다시 쓰기(변이 apply→restore 한 바퀴와 같은 모양)
 * ELEM_PROBE_FENCE_DELAY_MS=12000 npx tsx scripts/qa/probe-elem-arithmetic.ts 초3 &
 * sleep 6; touch src/lib/elementary/g3.ts; wait        # → exit 2
 *
 * # ㉢ — 프로세스는 떴고 생성기는 이미 읽혔고 아직 openFence 전
 * ELEM_PROBE_FENCE_OPEN_DELAY_MS=10000 npx tsx scripts/qa/probe-elem-arithmetic.ts 초3 &
 * sleep 7; touch src/lib/elementary/g3.ts; wait        # → exit 2
 *
 * # 음성 대조 — 아무도 안 건드리면 초록이어야 한다(거짓 경보는 가드를 끈다)
 * npx tsx scripts/qa/probe-elem-arithmetic.ts 초3      # → exit 0
 * ```
 *
 * ⚠️ 재현 스크립트에 **`set -e` 를 걸지 마라.** 이 시험은 `exit 2` 를 **일부러 받아
 * 세는** 것이라, `-e` 면 첫 재현에서 스크립트가 죽고 나머지가 안 돈다. `set -uo pipefail`
 * 까지만 건다(빠뜨린 것이 아니다 — 2026-08-23 판단).
 *
 * ⚠️ 그리고 옛 판과 견줄 때는 **`git show <커밋>:<경로>` 로 꺼내 돌려라.** 옛 규칙을
 * 옮겨 적으면 「옛 판이었으면 초록이었다」가 측정이 아니라 추론이 된다.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/** 생성기가 사는 곳. 판정기는 전부 여기를 통해 문항을 얻는다. */
const GEN_DIR = path.join(process.cwd(), "src", "lib", "elementary");

/** 학년마다 한 벌씩 있는 파일 — `초3` 이면 `g3.ts` 만 본다. */
const GRADE_FILE = /^g([3-6])\.ts$/;

/**
 * 이 프로세스가 시작한 시각(ms). `import` 해석보다 **앞선다** — ㉢ 을 잡는 근거가 이것이다.
 * `Date.now()` 와 `process.uptime()` 은 다른 시계를 쓰지만, 우리가 묻는 것은
 * 「이 시각보다 새로 쓰였나」라는 **거친 비교**라 그 오차는 문제가 되지 않는다.
 */
const PROCESS_START_MS = Date.now() - process.uptime() * 1000;

type Snap = { sha: string; mtimeMs: number };

function snapshot(files: string[]): Map<string, Snap> {
  const out = new Map<string, Snap>();
  for (const f of files) {
    const p = path.join(GEN_DIR, f);
    out.set(f, {
      sha: createHash("sha1").update(readFileSync(p)).digest("hex"),
      mtimeMs: statSync(p).mtimeMs,
    });
  }
  return out;
}

/** 이 판정기가 실제로 읽는 파일만 고른다. `grades` 가 없으면 전량. */
function filesInScope(grades?: readonly string[]): string[] {
  const wanted = grades?.map((g) => `g${g.replace(/^초/, "")}.ts`);
  return readdirSync(GEN_DIR)
    .filter((f) => f.endsWith(".ts"))
    .filter((f) => {
      if (!wanted) return true;
      const m = GRADE_FILE.exec(f);
      return m ? wanted.includes(f) : true; // 학년 파일이 아니면 공용 — 언제나 본다
    })
    .sort();
}

/** 「바뀌었다」가 아니라 **「무엇이 어떻게 바뀌었다」**를 말한다. */
function faults(before: Map<string, Snap>, after: Map<string, Snap>): string[] {
  const out: string[] = [];
  for (const [f, b] of before) {
    const a = after.get(f);
    if (!a) {
      out.push(`${f} — 사라졌다`);
      continue;
    }
    // ⚠️ 내용부터 본다 — 내용이 바뀐 것이 더 무거운 사실이고, 둘 다 찍으면 시끄럽다.
    if (a.sha !== b.sha) out.push(`${f} — 내용이 바뀌었다`);
    else if (a.mtimeMs > PROCESS_START_MS)
      out.push(
        `${f} — 내용은 같은데 **다시 쓰였다**(변이 apply→restore 한 바퀴가 이 모양이다)`,
      );
  }
  for (const f of after.keys())
    if (!before.has(f)) out.push(`${f} — 새로 생겼다`);
  return out;
}

export type Fence = {
  /** 바뀌었으면 무엇이 바뀌었는지 찍고 **exit 2**. 안 바뀌었으면 아무 말도 안 한다. */
  close(): void;
  /** 분모 줄에 붙일 「울타리 N개 파일」 — 좁힌 범위를 안 찍으면 그것이 사각지대가 된다. */
  scopeLine(): string;
  /** 시험용 — 지금 걸리는 사유(멈추지 않는다). */
  peek(): string[];
};

/**
 * 울타리를 연다. **문항을 만들기 전에** 부른다.
 *
 * ⚠️ 이 울타리는 **시험할 수 있어야** 한다. 재는 창이 tsx 컴파일보다 훨씬 짧아서, 밖에서
 * 타이밍을 맞춰 파일을 건드리는 방식으로는 「안 걸렸다」가 «울타리가 없다»인지 «창을 못
 * 맞췄다»인지 갈리지 않는다 — 그래서 창을 늘리는 손잡이(`ELEM_PROBE_FENCE_DELAY_MS`)를
 * 둔다. 시험 전용이며 평소에는 한 줄도 돌지 않는다.
 */
export function openFence(opts?: { grades?: readonly string[] }): Fence {
  // ⚠️ **여는 쪽에도** 창이 필요하다 — ㉢ 은 「프로세스 시작 뒤, `openFence()` 앞」에
  // 쓰이는 자리라, 닫는 쪽 손잡이만으로는 그 창을 **놓고도 「안 걸렸다」**가 나온다.
  // 실제로 2026-08-23 첫 재현에서 `touch` 가 npx 래퍼 때문에 node 시작보다 **먼저**
  // 끝나 초록이 나왔다 — 규칙이 못 잡은 게 아니라 시험이 창을 못 맞춘 것이었다.
  // 그 둘을 갈라 주지 않는 시험은 아무것도 증명하지 않는다.
  const openMs = Number(process.env.ELEM_PROBE_FENCE_OPEN_DELAY_MS ?? 0);
  if (openMs > 0) {
    const until = Date.now() + openMs;
    while (Date.now() < until) {
      /* 「읽은 뒤 · 재기 전」 창을 열어 둔다 */
    }
  }
  const files = filesInScope(opts?.grades);
  const before = snapshot(files);

  const hold = () => {
    const ms = Number(process.env.ELEM_PROBE_FENCE_DELAY_MS ?? 0);
    if (!(ms > 0)) return;
    const until = Date.now() + ms;
    while (Date.now() < until) {
      /* 창을 열어 둔다 */
    }
  };
  const check = () => {
    hold();
    return faults(before, snapshot(filesInScope(opts?.grades)));
  };

  return {
    peek: check,
    scopeLine: () =>
      `울타리 ${files.length}개 파일` +
      (opts?.grades?.length ? ` (${opts.grades.join("·")} + 공용)` : " (전량)"),
    close: () => {
      const bad = check();
      if (bad.length === 0) return;
      console.log(
        "⛔ 재는 동안 생성기가 쓰였다 — **이 수치는 못 쓴다.**\n" +
          bad.map((b) => `   · ${b}`).join("\n") +
          "\n   다른 세션이 생성기를 고치거나 변이 하네스가 도는 중이다. 끝난 뒤 다시 돌려라.",
      );
      process.exit(2);
    },
  };
}

/**
 * **분모** — 학년·소단원·갈래·문항을 센다.
 *
 * 넷을 다 세는 이유: 소단원만 찍으면 갈래가 통째로 빠져도 안 보이고(D-72 축이 가드 밖),
 * 갈래만 찍으면 씨앗 수가 줄어든 것을 못 본다. 그리고 **학년**을 따로 세야 찢긴 학년이
 * 조용히 빠진 것이 드러난다 — 그게 이 울타리와 짝인 축이다.
 */
export class SweepTally {
  private readonly grades = new Set<string>();
  private readonly sections = new Set<string>();
  private variants = 0;
  private problems = 0;

  /** 한 (소단원 × 갈래)를 훑었다고 센다. `n` 은 그 갈래에서 만든 문항 수(보통 씨앗 수). */
  count(grade: string, section: string, _tier: unknown, n: number): void {
    this.grades.add(grade);
    this.sections.add(`${grade} ${section}`);
    this.variants += 1;
    this.problems += n;
  }

  /** 다른 축을 세는 판정기가 제 수치를 덧붙일 자리. */
  line(extra?: string): string {
    return (
      `학년 ${this.grades.size} · 소단원 ${this.sections.size} · ` +
      `갈래 ${this.variants} · 문항 ${this.problems}건` +
      (extra ? ` · ${extra}` : "")
    );
  }

  /** 아무것도 안 훑었으면 그것 자체가 결함이다 — 초록으로 끝나면 안 된다. */
  assertNonEmpty(): void {
    if (this.problems > 0) return;
    console.log(
      "⛔ **한 문항도 안 훑었다** — 「위반 0」은 «깨끗»이 아니라 «못 셈»이다.\n" +
        "   대상 소단원 필터나 갈래 목록이 비었는지 보라.",
    );
    process.exit(2);
  }
}
