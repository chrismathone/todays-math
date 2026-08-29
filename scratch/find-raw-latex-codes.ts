/**
 * 「날 글자 LaTeX」가 **실제로 DB 에 실린 문항**을 찾아 문항번호를 찍는다.
 *
 * scratch/probe-raw-latex.ts 는 «유형»만 안다(엔진을 돌리므로).
 * 원장님이 물으신 것은 «어느 문항»이므로 공유 DB 를 본다. 읽기만 한다.
 *
 * ⚠️ 이 파일은 **Write 도구로** 써야 한다. bash heredoc 은 역슬래시를 한 겹
 *    먹어서 `[\\{]` 가 `[\{]` 이 되고, 그러면 「역슬래시가 앞에 있다」를 못 걸러
 *    `\frac` 같은 **멀쩡한 명령이 전부 거짓 양성**으로 잡힌다. 실제로 그렇게 났다.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMMANDS = new Set([
  "angle",
  "circ",
  "overline",
  "triangle",
  "dfrac",
  "frac",
  "times",
  "mathrm",
  "sqrt",
  "parallel",
  "degree",
  "cdot",
  "div",
  "sim",
  "cong",
  "perp",
  "pi",
  "left",
  "right",
  "ne",
  "le",
  "ge",
  "pm",
  "dots",
  "begin",
  "end",
  "cases",
  "Rightarrow",
  "square",
  "leq",
  "geq",
  "neq",
  "text",
]);

const CHUNK = /\$([^$]*)\$/g;
const BARE = /(?<![\\{])\b([A-Za-z]{2,})/g;

function hits(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CHUNK)) {
    for (const r of m[1]!.matchAll(BARE)) {
      if (COMMANDS.has(r[1]!)) out.push(r[1]!);
    }
  }
  return out;
}

type Row = {
  code: string;
  family: string;
  qt: string;
  tokens: string[];
  sample: string;
  usable: boolean;
};

async function main() {
  // 자기 검사 — 열쇠가 살아 있는가. 이게 없으면 「0건」이 «깨끗»인지
  // «못 셈»인지 안 갈린다. 역슬래시가 붙은 것은 안 잡히고, 없는 것은 잡혀야 한다.
  const good = String.raw`$\angle C=90^\circ$`;
  const bad = String.raw`$\angle C=90^circ$`;
  if (hits(good).length !== 0 || hits(bad).length !== 1) {
    throw new Error(
      `열쇠가 죽었다 — 정상 ${hits(good).length}건(0이어야) · 결함 ${hits(bad).length}건(1이어야)`,
    );
  }

  const rows = await prisma.problem.findMany({
    select: {
      problemCode: true,
      familyKey: true,
      questionType: true,
      content: true,
      answer: true,
      solution: true,
      directUseAllowed: true,
    },
  });
  console.log(`전량 ${rows.length}행을 훑는다. (열쇠 자기 검사 통과)`);

  const found: Row[] = [];
  for (const r of rows) {
    const fields = [
      ["content", r.content ?? ""],
      ["answer", r.answer ?? ""],
      ["solution", r.solution ?? ""],
    ] as const;
    const tokens = fields.flatMap(([, t]) => hits(t));
    if (tokens.length === 0) continue;
    const where = fields.find(([, t]) => hits(t).length > 0)![1];
    const at = [...where.matchAll(CHUNK)].find(
      (m) => hits(m[0]!).length > 0,
    )![0]!;
    found.push({
      code: r.problemCode ?? "(없음)",
      family: r.familyKey ?? "(없음)",
      qt: r.questionType ?? "",
      tokens: [...new Set(tokens)],
      sample: at.slice(0, 80),
      usable: r.directUseAllowed !== false,
    });
  }

  console.log(
    `날 글자가 실린 문항 ${found.length}건 (출제 가능 ${found.filter((b) => b.usable).length}건)\n`,
  );

  const byFamily = new Map<string, Row[]>();
  for (const b of found) {
    if (!byFamily.has(b.family)) byFamily.set(b.family, []);
    byFamily.get(b.family)!.push(b);
  }
  for (const [family, list] of [...byFamily].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    console.log(`■ ${family}  —  ${list.length}건`);
    console.log(
      `   토큰: ${[...new Set(list.flatMap((l) => l.tokens))].join(", ")}`,
    );
    console.log(`   보기: ${list[0]!.sample}`);
    console.log(
      `   문항번호: ${list
        .map((l) => l.code + (l.usable ? "" : "(잠김)"))
        .join(" ")}`,
    );
    console.log("");
  }
}

main().finally(() => prisma.$disconnect());
