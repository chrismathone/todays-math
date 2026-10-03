/**
 * 제자리 갱신 원장의 **사후 검증** — DB 를 읽지도 쓰지도 않는다(원장 파일만 본다).
 *
 *   npx tsx scripts/qa/verify-refresh-ledger.ts text    <원장.json.gz> [보고.md]
 *   npx tsx scripts/qa/verify-refresh-ledger.ts figures <원장.json.gz> [보고.md]
 *   npx tsx scripts/qa/verify-refresh-ledger.ts replaced <원장.json.gz> <목록.json>
 *
 * ## 왜 있나 (2026-10-03 3자 합의 C1)
 *
 * `refresh-engine-content.ts` 는 적재본을 «지금 엔진»에 맞춘다. 적용 뒤 드라이런이 0 이라는 것은
 * **일치**만 말한다 — 바뀐 내용이 뜻한 범위 안인지는 말하지 않는다. codex · grok 이 같은 것을 물었다:
 * «7,130행의 변경이 숫자 값 변경을 포함하지 않는가» · «그림 7,199장은 도형이 정말 같은가».
 * 표본을 눈으로 본 것으로는 답이 안 된다 — 그래서 **원장 전수**를 기계로 가른다.
 *
 * - `text`: 행마다 바뀐 칸 · 발문의 수 토큰 · 정답 보기의 값 · 잠금을 본다. 사람이 읽을 것은
 *   «수가 바뀐 행»과 «잠근 행»뿐이게 추린다.
 * - `figures`: 라벨을 뺀 도형이 **평행이동 하나**로 겹치는지, 라벨의 글자와 자리가 같은지 본다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { circledValueRaw } from "../../src/lib/math/circledNumber";
import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";

interface Cols {
  content: string;
  answer: string;
  solution: string | null;
  figureSvg: string | null;
  directUseAllowed: boolean;
}
interface Row {
  problemId: string;
  externalId: string;
  problemCode: string | null;
  before: Cols;
  after: Cols;
}

const [mode, ledgerPath, reportPath] = process.argv.slice(2);
if (!mode || !ledgerPath)
  throw new Error("사용: <text|figures> <원장.json.gz> [보고.md]");
const ledger = JSON.parse(
  gunzipSync(readFileSync(ledgerPath)).toString("utf8"),
) as { rows: Row[] };

const out: string[] = [];
const say = (line = ""): void => {
  out.push(line);
  console.log(line);
};

/** `engine-mid:3-1|이차방정식의 활용|11|s…` → `mid:3-1|이차방정식의 활용|11` 꼴의 틀 이름. */
function familyOf(externalId: string): string {
  const mid = /^engine-mid:(.*)\|s\d+\|v\d+\|[^|]*$/.exec(externalId);
  if (mid) return `mid:${mid[1]}`;
  const elem = /^engine-elem:(초\d)\|[^|]*\|([^|]*)\|f(\d+)\|[^|]*\|s\d+$/.exec(
    externalId,
  );
  if (elem) return `elem:${elem[1]}|${elem[2]}|${elem[3]}`;
  return externalId.replace(/\|s\d+.*$/, "");
}

/** 수 토큰의 다중집합 — 순서는 안 본다(조사 · 낱말이 옮겨도 수는 그대로여야 한다). */
function numberBag(text: string): string {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(" ");
}

const bump = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

/**
 * 발문의 수가 «어떻게» 바뀌었나 — 사람이 읽을 양을 줄이려고 셋으로 가른다.
 * 빠진 것이 `0` · `1` 뿐이면 표기(`1x` → `x` · `+0`), 더해지기만 했으면 조건을 보탠 것,
 * 그 밖은 **수가 다시 뽑힌 것**(같은 씨앗이 다른 문제를 낸다)이다.
 */
function stemChangeKind(before: string, after: string): string {
  const count = (text: string): Map<string, number> => {
    const bag = new Map<string, number>();
    for (const token of text.match(/\d+(?:\.\d+)?/g) ?? []) bump(bag, token);
    return bag;
  };
  const b = count(before);
  const a = count(after);
  const removed: string[] = [];
  const added: string[] = [];
  for (const [token, n] of b)
    for (let i = a.get(token) ?? 0; i < n; i += 1) removed.push(token);
  for (const [token, n] of a)
    for (let i = b.get(token) ?? 0; i < n; i += 1) added.push(token);
  if (added.length === 0 && removed.every((t) => t === "0" || t === "1"))
    return "표기 — 빠진 수가 0 · 1 뿐";
  if (removed.length === 0) return "조건을 보탬 — 수가 더해지기만 함";
  return "수가 다시 뽑힘 — 다른 문제";
}

function runText(): void {
  const kinds = new Map<string, number>();
  const stemKinds = new Map<string, number>();
  const stemNumber = new Map<string, Row[]>();
  const answerValue: Row[] = [];
  const locked: Row[] = [];
  const noChange: Row[] = [];

  for (const row of ledger.rows) {
    const { before: b, after: a } = row;
    const changed = (
      [
        "content",
        "answer",
        "solution",
        "figureSvg",
        "directUseAllowed",
      ] as const
    ).filter((key) => b[key] !== a[key]);
    bump(kinds, changed.join("+") || "(없음)");
    if (changed.length === 0) noChange.push(row);
    if (b.directUseAllowed && !a.directUseAllowed) {
      locked.push(row);
      continue;
    }

    const pb = parseProblemContent(b.content);
    const pa = parseProblemContent(a.content);
    if (numberBag(pb.question) !== numberBag(pa.question)) {
      const key = familyOf(row.externalId);
      stemNumber.set(key, [...(stemNumber.get(key) ?? []), row]);
      bump(stemKinds, stemChangeKind(pb.question, pa.question));
    }

    // 정답의 «값» — 객관식은 번호가 가리키는 보기의 글, 아니면 정답 칸 그대로.
    const valueOf = (cols: Cols, choices: string[]): string => {
      const mark = cols.answer.trim();
      const index = mark.length === 1 ? circledValueRaw(mark) : 0;
      const raw = index > 0 ? (choices[index - 1] ?? "(없는 번호)") : mark;
      // 끝자리 0 의 유무 · 공백은 값이 아니다.
      return raw
        .replace(/\s+/g, "")
        .replace(/(\d+\.\d*?)0+(?=\D|$)/g, "$1")
        .replace(/\.(?=\D|$)/g, "");
    };
    if (valueOf(b, pb.choices) !== valueOf(a, pa.choices))
      answerValue.push(row);
  }

  say(`# 글 원장 검증 — ${ledger.rows.length}행`);
  say();
  say("## 바뀐 칸");
  for (const [key, n] of [...kinds].sort((x, y) => y[1] - x[1]))
    say(`- ${key}: ${n}`);
  say();
  say(`## 잠근 행 ${locked.length}`);
  for (const row of locked)
    say(
      `- ${row.problemCode ?? ""} \`${row.externalId}\` — ${row.before.content.replace(/\s+/g, " ").slice(0, 110)}`,
    );
  say();
  const stemRows = [...stemNumber.values()].reduce((s, v) => s + v.length, 0);
  say(`## 발문의 수 토큰이 바뀐 행 ${stemRows} (틀 ${stemNumber.size})`);
  for (const [key, n] of [...stemKinds].sort((x, y) => y[1] - x[1]))
    say(`- ${key}: ${n}`);
  say();
  for (const [key, rows] of [...stemNumber].sort((x, y) =>
    x[0].localeCompare(y[0]),
  )) {
    const first = rows[0]!;
    const q = (cols: Cols): string =>
      parseProblemContent(cols.content).question.replace(/\s+/g, " ");
    say(`- **${key}** ${rows.length}행`);
    say(`  - 앞: ${q(first.before).slice(0, 260)}`);
    say(`  - 뒤: ${q(first.after).slice(0, 260)}`);
  }
  say();
  say(`## 정답의 값이 바뀐 행 ${answerValue.length}`);
  const byFamily = new Map<string, Row[]>();
  for (const row of answerValue) {
    const key = familyOf(row.externalId);
    byFamily.set(key, [...(byFamily.get(key) ?? []), row]);
  }
  for (const [key, rows] of [...byFamily].sort((x, y) =>
    x[0].localeCompare(y[0]),
  )) {
    const first = rows[0]!;
    const tail = (cols: Cols): string =>
      `${cols.answer} ← ${cols.content.replace(/\s+/g, " ").slice(-170)}`;
    say(`- **${key}** ${rows.length}행 \`${first.externalId}\``);
    say(`  - 앞: ${tail(first.before)}`);
    say(`  - 뒤: ${tail(first.after)}`);
  }
  say();
  say(`## 앞뒤가 같은 행 ${noChange.length}`);
}

interface Label {
  text: string;
  x: number;
  y: number;
}

/**
 * 라벨을 **글 차례대로** 걷어 낸다 — 옛 판은 `<text>`, 새 판은 `<g data-label>`(안의 `<g>` 가 겹친다).
 * 한 그림에 둘이 섞여 있을 수 있어(한글 라벨은 글자 그대로 남는다) 차례를 따로 세면 짝이 어긋난다.
 */
function splitLabels(svg: string): { rest: string; labels: Label[] } {
  const labels: Label[] = [];
  const attr = (tag: string, name: string): string =>
    new RegExp(` ${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
  let rest = "";
  let at = 0;
  const opener = /<text\b|<g data-label=/g;
  for (;;) {
    opener.lastIndex = at;
    const hit = opener.exec(svg);
    if (!hit) break;
    const open = hit.index;
    rest += svg.slice(at, open);
    const head = svg.slice(open, svg.indexOf(">", open) + 1);
    if (hit[0].startsWith("<text")) {
      // 빈 라벨은 `<text … />` 로 닫힌다 — 닫는 태그를 찾으러 가면 다음 라벨을 먹는다.
      if (head.endsWith("/>")) {
        at = open + head.length;
        continue;
      }
      const closeAt = svg.indexOf("</text>", open);
      if (closeAt < 0) throw new Error("라벨 글이 안 닫힌다");
      const close = closeAt + "</text>".length;
      labels.push({
        text:
          attr(head, "data-mj") ||
          svg
            .slice(open, close)
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, ""),
        x: Number(attr(head, "x")),
        y: Number(attr(head, "y")),
      });
      at = close;
      continue;
    }
    labels.push({
      text: attr(head, "data-label"),
      x: Number(attr(head, "data-x")),
      y: Number(attr(head, "data-y")),
    });
    let depth = 0;
    let scan = open;
    for (;;) {
      const nextOpen = svg.indexOf("<g", scan);
      const nextClose = svg.indexOf("</g>", scan);
      if (nextClose < 0) throw new Error("라벨 묶음이 안 닫힌다");
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        scan = nextOpen + 2;
      } else {
        depth -= 1;
        scan = nextClose + 4;
        if (depth === 0) break;
      }
    }
    at = scan;
  }
  return { rest: rest + svg.slice(at), labels };
}

const X_ATTRS = ["cx", "x1", "x2", "x"];
const Y_ATTRS = ["cy", "y1", "y2", "y"];
const SIZE_ATTRS = ["r", "rx", "ry", "stroke-width"];

interface Geometry {
  /** 주 도형(원 · 선분 · 다각형)의 꼴 — 태그와 굵기. 앞뒤가 같아야 한다. */
  mainKinds: string[];
  xs: number[];
  ys: number[];
  sizes: number[];
  /** 주석선(`<path>` — 각 표시 · 치수선 · 지시선)의 명령 글자열. */
  paths: string[];
  labels: Label[];
}

function geometryOf(svg: string): Geometry {
  const { rest, labels } = splitLabels(svg);
  const g: Geometry = {
    mainKinds: [],
    xs: [],
    ys: [],
    sizes: [],
    paths: [],
    labels,
  };
  const elements =
    rest.match(
      /<(?:circle|line|polygon|polyline|ellipse|rect|path)\b[^>]*>/g,
    ) ?? [];
  elements.forEach((tag, index) => {
    const name = /^<(\w+)/.exec(tag)![1]!;
    const num = (attr: string): number | null => {
      const m = new RegExp(` ${attr}="(-?[\\d.]+)"`).exec(tag);
      return m ? Number(m[1]) : null;
    };
    // 맨 앞의 흰 바탕 사각형은 뷰박스 크기라 도형이 아니다.
    if (name === "rect" && index === 0) return;
    if (name === "path") {
      g.paths.push(
        (/ d="([^"]*)"/.exec(tag)?.[1] ?? "").replace(/[^A-Za-z]/g, ""),
      );
      return;
    }
    g.mainKinds.push(`${name}/${num("stroke-width") ?? "-"}`);
    for (const a of X_ATTRS) {
      const v = num(a);
      if (v !== null) g.xs.push(v);
    }
    for (const a of Y_ATTRS) {
      const v = num(a);
      if (v !== null) g.ys.push(v);
    }
    for (const a of SIZE_ATTRS) {
      const v = num(a);
      if (v !== null) g.sizes.push(v);
    }
    const w = num("width");
    const h = num("height");
    if (w !== null) g.sizes.push(w);
    if (h !== null) g.sizes.push(h);
    const points = / points="([^"]*)"/.exec(tag)?.[1];
    if (points) {
      const values = (points.match(/-?[\d.]+/g) ?? []).map(Number);
      values.forEach((v, i) => (i % 2 === 0 ? g.xs : g.ys).push(v));
    }
  });
  return g;
}

/** 값들의 벌어진 폭 — 한 덩이면 0 에 가깝다. */
const spread = (values: number[]): number =>
  values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);

function runFigures(): void {
  const TOLERANCE = 0.02;
  const verdicts = new Map<string, number>();
  const odd = new Map<string, { n: number; id: string }>();
  let textChanged = 0;
  let typesetAfter = 0;
  let plainBefore = 0;
  let maxShift = 0;
  let maxLabelDrift = 0;

  for (const row of ledger.rows) {
    const { before: b, after: a } = row;
    if (
      b.content !== a.content ||
      b.answer !== a.answer ||
      b.solution !== a.solution
    )
      textChanged += 1;
    const sb = b.figureSvg ?? "";
    const sa = a.figureSvg ?? "";
    if (/<text\b/.test(sb)) plainBefore += 1;
    if (sa.includes("data-label=")) typesetAfter += 1;
    const note = (why: string): void => {
      bump(verdicts, why);
      if (why.startsWith("같은")) return;
      const key = `${familyOf(row.externalId)} — ${why}`;
      const hit = odd.get(key);
      if (hit) hit.n += 1;
      else odd.set(key, { n: 1, id: row.externalId });
    };
    if (!/^<svg[\s>]/.test(sa.trim()) || !sa.trim().endsWith("</svg>")) {
      note("뒤 그림이 SVG 꼴이 아니다");
      continue;
    }
    const gb = geometryOf(sb);
    const ga = geometryOf(sa);
    if (gb.mainKinds.join(" ") !== ga.mainKinds.join(" ")) {
      note("주 도형의 개수나 꼴이 다르다");
      continue;
    }
    const dx = gb.xs.map((v, i) => ga.xs[i]! - v);
    const dy = gb.ys.map((v, i) => ga.ys[i]! - v);
    const ds = gb.sizes.map((v, i) => ga.sizes[i]! - v);
    if (
      spread(dx) > TOLERANCE ||
      spread(dy) > TOLERANCE ||
      Math.max(0, ...ds.map(Math.abs)) > TOLERANCE
    ) {
      note("주 도형이 평행이동으로 안 겹친다");
      continue;
    }
    maxShift = Math.max(maxShift, Math.abs(dx[0] ?? 0), Math.abs(dy[0] ?? 0));
    const sameLabels =
      gb.labels.length === ga.labels.length &&
      gb.labels.every((l, i) => l.text === ga.labels[i]!.text);
    if (!sameLabels) {
      note("주 도형은 같다 · 라벨의 글자나 개수가 다르다");
      continue;
    }
    // 라벨의 자리 — 도형과 같이 움직였는가(조판 뒤 기준선이 달라 조금은 다르다).
    for (let i = 0; i < gb.labels.length; i += 1) {
      const lx = ga.labels[i]!.x - gb.labels[i]!.x - (dx[0] ?? 0);
      const ly = ga.labels[i]!.y - gb.labels[i]!.y - (dy[0] ?? 0);
      if (Number.isFinite(lx) && Number.isFinite(ly))
        maxLabelDrift = Math.max(maxLabelDrift, Math.abs(lx), Math.abs(ly));
    }
    if (gb.paths.join(" ") !== ga.paths.join(" ")) {
      note(
        gb.paths.length === ga.paths.length
          ? "주 도형 · 라벨은 같다 · 주석선의 꼴이 다르다"
          : `주 도형 · 라벨은 같다 · 주석선이 ${gb.paths.length} → ${ga.paths.length}`,
      );
      continue;
    }
    note("같은 주 도형 · 같은 라벨 · 같은 주석선 — 평행이동뿐");
  }

  say(`# 그림 원장 검증 — ${ledger.rows.length}장`);
  say();
  say(`- 글(본문 · 정답 · 풀이)이 같이 바뀐 행: ${textChanged}`);
  say(`- 앞 그림에 \`<text>\` 라벨이 있던 행: ${plainBefore}`);
  say(`- 뒤 그림에 조판된 라벨(\`data-label\`)이 있는 행: ${typesetAfter}`);
  say(`- 주 도형의 평행이동(뷰박스 단위) 최대: ${maxShift.toFixed(3)}`);
  say(
    `- 라벨 자리가 도형에 견주어 움직인 거리 최대: ${maxLabelDrift.toFixed(3)}`,
  );
  say();
  say("## 판정");
  for (const [key, n] of [...verdicts].sort((x, y) => y[1] - x[1]))
    say(`- ${key}: ${n}`);
  say();
  say(`## 따로 볼 것 (틀마다 한 줄)`);
  for (const [key, v] of [...odd].sort((x, y) => x[0].localeCompare(y[0])))
    say(`- ${key}: ${v.n}장 \`${v.id}\``);
}

/**
 * 사람이 읽고 «같은 문제»로 가른 틀 — 수 토큰은 바뀌었지만 문제는 그대로다.
 *   · 다각형 20: «비가 $10:2$» → «$5:1$»(약분)
 *   · 초5 평균 04: «1모둠 · 2모둠» → «가 모둠 · 나 모둠»(이름)
 */
const SAME_PROBLEM_FAMILIES = new Set([
  "mid:1-2|다각형|20",
  "elem:초5|2-6-1 평균 알아보기|04",
]);

/** «같은 행이 다른 문제가 된» 행의 목록 — 개장 전 기준선의 기록(3자 합의 C1). */
function runReplaced(outPath: string): void {
  const rows: {
    problemId: string;
    externalId: string;
    problemCode: string | null;
    kind: string;
    before: { question: string; answer: string };
    after: { question: string; answer: string };
  }[] = [];
  const kinds = new Map<string, number>();
  const squash = (text: string): string => text.replace(/\s+/g, " ").trim();
  const valueOf = (cols: Cols, choices: string[]): string => {
    const mark = cols.answer.trim();
    const index = mark.length === 1 ? circledValueRaw(mark) : 0;
    const raw = index > 0 ? (choices[index - 1] ?? "(없는 번호)") : mark;
    return raw
      .replace(/\s+/g, "")
      .replace(/(\d+\.\d*?)0+(?=\D|$)/g, "$1")
      .replace(/\.(?=\D|$)/g, "");
  };
  for (const row of ledger.rows) {
    const { before: b, after: a } = row;
    if (b.directUseAllowed !== a.directUseAllowed) continue;
    const pb = parseProblemContent(b.content);
    const pa = parseProblemContent(a.content);
    const answerChanged = valueOf(b, pb.choices) !== valueOf(a, pa.choices);
    const redrawn =
      numberBag(pb.question) !== numberBag(pa.question) &&
      stemChangeKind(pb.question, pa.question).startsWith("수가 다시 뽑힘");
    const wordingChanged =
      pb.question.replace(/\s+/g, "") !== pa.question.replace(/\s+/g, "");
    let kind: string | null = null;
    if (redrawn) {
      if (!SAME_PROBLEM_FAMILIES.has(familyOf(row.externalId)))
        kind = answerChanged
          ? "수가 다시 뽑히고 정답도 바뀜"
          : "수가 다시 뽑혔고 정답 값은 같지만 다른 문제";
    } else if (answerChanged && wordingChanged) kind = "묻는 것이 바뀜";
    if (!kind) continue;
    bump(kinds, kind);
    rows.push({
      problemId: row.problemId,
      externalId: row.externalId,
      problemCode: row.problemCode,
      kind,
      before: { question: squash(pb.question), answer: b.answer },
      after: { question: squash(pa.question), answer: a.answer },
    });
  }
  for (const [key, n] of kinds) say(`- ${key}: ${n}`);
  say(`합 ${rows.length}행 → ${outPath}`);
  const record = {
    note: "개장 전 기준선 — 2026-10-03 전수 동기화에서 같은 행이 다른 문제가 된 것. 되돌리지 않는다(3자 합의 C1). 결함 수리로 단정하지 않는다 — 성했던 옛 문항이 난수 차례 탓에 바뀐 것도 섞여 있다(미분류).",
    ledger: "bank-fix-20261003.json.gz",
    sameProblemFamilies: [...SAME_PROBLEM_FAMILIES],
    kinds: Object.fromEntries(kinds),
    rows,
  };
  writeFileSync(outPath, `${JSON.stringify(record, null, 1)}\n`);
}

if (mode === "replaced") {
  if (!reportPath) throw new Error("replaced 는 <목록.json> 이 필요하다");
  runReplaced(reportPath);
} else if (mode === "text") runText();
else if (mode === "figures") runFigures();
else throw new Error(`모르는 갈래: ${mode}`);
if (reportPath && mode !== "replaced")
  writeFileSync(reportPath, `${out.join("\n")}\n`);
