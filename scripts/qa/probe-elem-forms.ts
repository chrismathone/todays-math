/**
 * 초등 문형 전량 판정기 — **「227곳이 끝났나」를 세는 유일한 자.**
 *
 * 원장님 확정 2026-08-26: 안 3 최고안(소단원당 문형 10개)으로 간다.
 * 그 일은 학년별로 갈라 병렬로 짓는데, 각 트랙이 「다 했다」를 스스로 주장하면
 * 이 저장소가 여러 번 겪은 그 자리가 된다 — **판정자가 도장이 된다.**
 * 그래서 끝나는 지점을 여기 하나에 둔다.
 *
 * ## 무엇을 보나 (소단원마다)
 *
 *   ⑴ 문형이 10개 이상인가
 *   ⑵ 문형 id 가 난이도 이름이 아니고 서로 다른가
 *   ⑶ **문형이 서로 다른 물음인가** — 소재 이름만 바꾼 것은 같은 것으로 센다
 *   ⑷ 문형마다 변형 3개가 나오는가 (`expandFamily`)
 *   ⑸ 제품 `selectProblems` 로 **10문항·10갈래 시험지가 실제로 조립되는가**
 *   ⑹ 그림이 붙는 문형이 몇인가 (원장님: 「배치할 수 있는 건 최대한」)
 *
 * ## ⑶ 의 열쇠를 손으로 적지 않는다
 *
 * `stemFrame` 은 소재 목록을 호출부가 넘겨야 한다. 227곳의 소재를 손으로 적으면
 * 세는 쪽과 고치는 쪽이 같이 눈이 먼다(2026-08-18). 그래서 **소재를 데이터에서
 * 뽑는다** — 한 문형을 여러 씨앗으로 돌려 **씨앗마다 바뀌는 자리**가 곧 소재다.
 * 그러면 「사과/배만 바꾼 두 문형」이 같은 모양으로 접혀 ⑶ 에 걸린다.
 *
 * 쓰기: npx tsx scripts/qa/probe-elem-forms.ts [--json] [--grade 초3]
 */
import { defaultRatioFor } from "../../src/contracts/difficulty";
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import {
  elemProblemType,
  elementaryUnits,
  generateElementaryForm,
  listedForms,
  pilotFamilyKey,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { expandFamily } from "../../src/lib/engine/expandEngine";
import { familyIdOf } from "../../src/lib/generator/familyKey";
import {
  selectProblems,
  type SelectableProblem,
} from "../../src/lib/generator/selectProblems";

const SEEDS = 8;
const SEED0 = 20260826;
const STEP = 1009;
const TARGET_FORMS = 10;

const wantJson = process.argv.includes("--json");
const gradeAt = process.argv.indexOf("--grade");
const onlyGrade = gradeAt >= 0 ? process.argv[gradeAt + 1] : null;

/** 숫자만 지운 지문. 소재는 아직 안 지운다. */
function rawFrame(content: string): string {
  return content.replace(/\d+/g, "N").replace(/\s+/g, " ").trim();
}

/**
 * 한 문형의 **모양** — 씨앗마다 바뀌는 낱말을 ◇ 로 접는다.
 * 낱말 수가 씨앗마다 다르면 접을 수 없으니 가장 흔한 지문을 쓴다.
 */
function shapeOf(frames: string[]): string {
  const uniq = [...new Set(frames)];
  if (uniq.length === 1) return uniq[0]!;
  const split = uniq.map((f) => f.split(" "));
  const n = split[0]!.length;
  if (!split.every((t) => t.length === n)) {
    const tally = new Map<string, number>();
    for (const f of frames) tally.set(f, (tally.get(f) ?? 0) + 1);
    return [...tally].sort((a, b) => b[1] - a[1])[0]![0];
  }
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const col = new Set(split.map((t) => t[i]!));
    out.push(col.size === 1 ? split[0]![i]! : "◇");
  }
  return out.join(" ");
}

/**
 * ⑶-b **글은 다른데 셈이 같은** 두 문형.
 *
 * 앞의 지문 검사는 「$1^\circ$가 N개 모인 각」과 「눈금이 N칸인 각」을 못 가른다 —
 * 글이 다르고 정답도 다르지만 **셈이 둘 다 항등**이다. 실측으로 초4 14곳에서
 * 4건 나왔다(「두 각을 이어 붙인 합」과 「$a+b=\square$」가 같은 `n0+n1`).
 *
 * 열쇠를 손으로 적지 않는다 — 발문의 수와 정답 사이에 **씨앗 전량에서 성립하는
 * 관계식**을 찾아 서명으로 쓴다. 서명이 같으면 같은 셈이다.
 * 음성 대조: 파일럿 3곳(이미 좋다고 판정한 곳)은 **0건**이다.
 */
const RELATION_CONSTS = [90, 180, 360, 100, 1000, 10000, 12, 60, 24, 8, 4, 2];

function numsIn(s: string): number[] {
  return (s.match(/\d+/g) ?? []).map(Number);
}

function relationsOf(stem: number[], ans: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < stem.length; i += 1) {
    const a = stem[i]!;
    if (a === ans) out.push(`=n${i}`);
    for (const k of RELATION_CONSTS) {
      if (k - a === ans) out.push(`${k}-n${i}`);
      if (a + k === ans) out.push(`n${i}+${k}`);
      if (a - k === ans) out.push(`n${i}-${k}`);
      if (a * k === ans) out.push(`n${i}*${k}`);
      if (a !== 0 && k / a === ans) out.push(`${k}/n${i}`);
      if (a / k === ans) out.push(`n${i}/${k}`);
    }
    for (let j = i + 1; j < stem.length; j += 1) {
      const b = stem[j]!;
      if (a + b === ans) out.push(`n${i}+n${j}`);
      if (a - b === ans) out.push(`n${i}-n${j}`);
      if (b - a === ans) out.push(`n${j}-n${i}`);
      if (a * b === ans) out.push(`n${i}*n${j}`);
      for (const k of RELATION_CONSTS) {
        if (a + b - k === ans) out.push(`n${i}+n${j}-${k}`);
        if (k - a - b === ans) out.push(`${k}-n${i}-n${j}`);
      }
    }
  }
  return out;
}

type Report = {
  grade: string;
  section: string;
  forms: number;
  problems: string[];
  figureForms: number;
  done: boolean;
};

const reports: Report[] = [];

for (const unit of elementaryUnits()) {
  if (supportedTiers(unit).length === 0) continue;
  if (onlyGrade && unit.grade !== onlyGrade) continue;

  const forms = listedForms(unit);
  const problems: string[] = [];

  if (forms.length === 0) {
    reports.push({
      grade: unit.grade,
      section: unit.section,
      forms: 0,
      problems: ["미착수 — 문형 등록 없음"],
      figureForms: 0,
      done: false,
    });
    continue;
  }

  // ⑵ id 가 난이도 이름이 아니고 서로 다르다
  const ids = forms.map((f) => f.id);
  if (new Set(ids).size !== ids.length) problems.push("문형 id 가 겹친다");
  const tierNames = new Set<string>(ELEM_TIERS);
  if (ids.some((id) => tierNames.has(id)))
    problems.push("문형 id 에 난이도 이름을 썼다 — 축이 직교하지 않는다");

  // ⑴ 개수
  if (forms.length < TARGET_FORMS)
    problems.push(`문형이 ${forms.length}개 — ${TARGET_FORMS}개가 필요하다`);

  // ⑶ 서로 다른 물음인가 · ⑹ 그림
  const shapes = new Map<string, string[]>();
  const shapeOfForm = new Map<string, string>();
  const answersOfForm = new Map<string, string>();
  const relOfForm = new Map<string, string>();
  let figureForms = 0;
  const pool: SelectableProblem[] = [];

  for (const form of forms) {
    const frames: string[] = [];
    const answers: string[] = [];
    let relSet: Set<string> | null = null;
    let sawFigure = false;
    for (let i = 0; i < SEEDS; i += 1) {
      try {
        const p = generateElementaryForm(unit, SEED0 + i * STEP, form.id);
        frames.push(rawFrame(p.content));
        answers.push(p.answer);
        const ansNums = numsIn(p.answer);
        const rels: string[] =
          ansNums.length === 1
            ? relationsOf(numsIn(p.content), ansNums[0]!)
            : [];
        if (relSet === null) {
          relSet = new Set<string>(rels);
        } else {
          const keep = new Set<string>(rels);
          const kept: string[] = [];
          relSet.forEach((r) => {
            if (keep.has(r)) kept.push(r);
          });
          relSet = new Set<string>(kept);
        }
        if (p.figureSpec) sawFigure = true;
      } catch (err) {
        problems.push(
          `문형 ${form.id} 이 던진다: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    if (sawFigure) figureForms += 1;
    if (frames.length === 0) continue;
    const shape = shapeOf(frames);
    const owners = shapes.get(shape) ?? [];
    owners.push(form.id);
    shapes.set(shape, owners);
    shapeOfForm.set(form.id, shape);
    answersOfForm.set(form.id, answers.join("|"));
    if (relSet && relSet.size > 0)
      relOfForm.set(form.id, [...relSet].sort().join(","));

    // ⑷ 변형 3개
    const familyKey = pilotFamilyKey(unit, form.id);
    try {
      const got = expandFamily((v) => {
        const p = generateElementaryForm(unit, SEED0 + v * STEP, form.id);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          familyKey,
          problemType: elemProblemType(form.tier),
        };
      });
      got.items
        .filter((i) => i.questionType === "단답형")
        .forEach((item, i) => {
          pool.push({
            id: `${form.id}-${i}`,
            unitId: `${unit.grade}|${unit.section}`,
            difficulty: form.tier,
            problemType: elemProblemType(form.tier),
            directUseAllowed: true,
            familyKey,
            content: item.content,
            figureUrls: [],
            figureDims: [],
          });
        });
    } catch (err) {
      problems.push(
        `문형 ${form.id} 변형 3개 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  for (const [, owners] of shapes) {
    if (owners.length > 1)
      problems.push(
        `문형 ${owners.join("·")} 이 **같은 물음**이다 — 지문이 똑같다`,
      );
  }

  // 🔴 위 검사에는 구멍이 있다. 소재가 «씨앗마다» 바뀌면 ◇ 로 접히지만,
  //    문형마다 **다른 낱말을 박아** 두면 (직육면체 / 상자) 안 접힌다.
  //    그런데 한 낱말 차이가 늘 같은 물음인 것도 아니다 — 「꼭짓점 8」과
  //    「모서리 12」는 한 낱말 차이인데 **다른 물음**이다.
  //    가르는 근거를 지문 밖에서 가져온다: **정답이 같은가.**
  const seenIds = [...shapeOfForm.keys()];
  for (let a = 0; a < seenIds.length; a += 1) {
    for (let b = a + 1; b < seenIds.length; b += 1) {
      const ia = seenIds[a]!;
      const ib = seenIds[b]!;
      if (shapeOfForm.get(ia) === shapeOfForm.get(ib)) continue; // 위에서 이미 셌다
      if (answersOfForm.get(ia) !== answersOfForm.get(ib)) continue;
      const ta = shapeOfForm.get(ia)!.split(" ");
      const tb = shapeOfForm.get(ib)!.split(" ");
      if (ta.length !== tb.length) continue;
      let diff = 0;
      for (let i = 0; i < ta.length; i += 1) if (ta[i] !== tb[i]) diff += 1;
      if (diff <= 1)
        problems.push(
          `문형 ${ia}·${ib} 이 **같은 물음**이다 — 낱말 ${diff}개만 다르고 정답이 씨앗마다 전부 같다`,
        );
    }
  }

  // ⑶-b 글은 다른데 셈이 같은 짝
  const relIds = [...relOfForm.keys()];
  for (let a = 0; a < relIds.length; a += 1) {
    for (let b = a + 1; b < relIds.length; b += 1) {
      const ia = relIds[a]!;
      const ib = relIds[b]!;
      if (relOfForm.get(ia) !== relOfForm.get(ib)) continue;
      problems.push(
        `문형 ${ia}·${ib} 이 **셈이 같다** (${relOfForm.get(ia)!.slice(0, 30)}) — 글만 다르고 묻는 것이 같다`,
      );
    }
  }

  // ⑸ 시험지 10문항·10갈래
  if (forms.length >= TARGET_FORMS) {
    try {
      const { problems: picked, shortfall } = selectProblems({
        pool,
        difficultyRatio: defaultRatioFor(TARGET_FORMS),
        count: TARGET_FORMS,
        recentProblemIds: [],
        seed: `probe-${unit.grade}-${unit.section}`,
      });
      if (shortfall.length > 0)
        problems.push(`시험지가 모자란다: ${JSON.stringify(shortfall)}`);
      if (picked.length !== TARGET_FORMS)
        problems.push(`시험지가 ${picked.length}문항`);
      const fams = new Set(picked.map((p) => familyIdOf(p))).size;
      if (fams !== TARGET_FORMS)
        problems.push(`한 시험지에 갈래가 ${fams}개 — 같은 문항류가 겹쳤다`);
    } catch (err) {
      problems.push(
        `조립이 던진다: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  reports.push({
    grade: unit.grade,
    section: unit.section,
    forms: forms.length,
    problems,
    figureForms,
    done: problems.length === 0,
  });
}

const done = reports.filter((r) => r.done);
const started = reports.filter((r) => r.forms > 0);
const figTotal = reports.reduce((s, r) => s + r.figureForms, 0);

if (wantJson) {
  console.log(JSON.stringify({ asOf: "probe", reports }, null, 2));
} else {
  const byGrade = new Map<string, { n: number; done: number }>();
  for (const r of reports) {
    const g = byGrade.get(r.grade) ?? { n: 0, done: 0 };
    g.n += 1;
    if (r.done) g.done += 1;
    byGrade.set(r.grade, g);
  }
  console.log(`대상 소단원        ${reports.length}`);
  console.log(`문형 등록 있음     ${started.length}`);
  console.log(`✅ 전부 통과       ${done.length}`);
  console.log(`그림 붙은 문형     ${figTotal}`);
  console.log("");
  for (const [g, v] of [...byGrade].sort())
    console.log(`  ${g}  ${v.done} / ${v.n}`);
  console.log("");
  const bad = started.filter((r) => !r.done).slice(0, 12);
  if (bad.length > 0) {
    console.log("착수했는데 아직 안 되는 곳 (앞 12):");
    for (const r of bad)
      console.log(
        `  ${r.grade} ${r.section} (문형 ${r.forms}) — ${r.problems[0]}`,
      );
  }
}

// 🔴 이 자는 «몇 곳이 남았나»를 세는 물건이라, 안 끝났다고 종료 코드를 더럽히지
//    않는다. 끝났는지 묻고 싶으면 `--strict` 로 물어라.
if (process.argv.includes("--strict") && done.length !== reports.length) {
  console.error(`\n🔴 ${reports.length - done.length}곳이 남았다`);
  process.exit(1);
}
