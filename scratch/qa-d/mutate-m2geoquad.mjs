/**
 * 「평행선과 삼각형의 넓이」 18~23 의 가드를 **망가뜨려 본다.**
 *
 * 판정 순서는 이 저장소가 정한 그대로다 (CLAUDE.md 2026-08-20 · 08-21 · 08-23):
 *   ㉠ 음성 대조 — 변이 **전에** 시험이 초록인가 (아니면 판정 거부)
 *   ⑴ 앵커가 정확히 하나인가
 *   ⑵ 파일이 바뀌었나
 *   ⑶ **산출물이 바뀌었나** — 파일만 바뀌고 뜻이 그대로면 «가드가 아니다»가 거짓이 된다
 *   ⑷ 그제서야 시험이 빨개지나 (그리고 **실패한 시험 이름을 댈 수 있나**)
 *
 * 원복은 시작할 때 읽어 둔 **바이트 그대로** 한다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

/** vitest 의 json 은 **저장소 밖**에 쓴다 — 남의 `git add -A` 에 실리지 않게. */
const REPORT = path.join(tmpdir(), "mutate-m2geoquad.json");

const TARGET = "src/lib/middle/m2GeoQuad.ts";
const TESTS = [
  "src/__tests__/unit/middleM2Geo.test.ts",
  "src/__tests__/unit/midTypesD.test.ts",
];
const original = readFileSync(TARGET);

const MUTATIONS = [
  [
    "18 넓이 공식에서 ½ 를 뺀다",
    "const area = (a * h) / 2;",
    "const area = a * h;",
  ],
  [
    "19 mode1 이 S/4 대신 S/2 를 답한다",
    "const x = S / 4;",
    "const x = S / 2;",
  ],
  [
    "20 이 빼기 대신 더하기를 한다",
    "const x = half - a;",
    "const x = half + a;",
  ],
  [
    "21 의 BD 를 1 만큼 어긋나게 한다",
    "const x = m * k;",
    "const x = m * k + 1;",
  ],
  [
    "22 의 중간값 ABF 를 1 만큼 어긋나게 한다",
    "const mid = (p + q) * m * k;",
    "const mid = (p + q) * m * k + 1;",
  ],
  [
    "19 의 해설 중간값 half 를 S/3 으로 놓는다",
    ["const half = S / 2;", "    const x = S / 4;"].join("\n"),
    ["const half = S / 3;", "    const x = S / 4;"].join("\n"),
  ],
  [
    "20 의 해설 중간값 half 를 S/3 으로 놓는다",
    [
      "const half = S / 2;",
      "      const a = intBetween(rng, 2, half - 2);",
    ].join("\n"),
    [
      "const half = S / 3;",
      "      const a = intBetween(rng, 2, half - 2);",
    ].join("\n"),
  ],
  [
    "23 의 ABO 를 st 대신 s² 로 놓는다",
    "const r = k * s * t;",
    "const r = k * s * s;",
  ],
  [
    "23 의 그림에서 O 를 AC 의 중점으로 옮긴다",
    "const f = ad / (ad + BC);",
    "const f = 0.5;",
  ],
];

function digest() {
  const out = spawnSync("npx", ["tsx", "scratch/qa-d/digest-m2geoquad.ts"], {
    encoding: "utf8",
    shell: true,
  });
  if (out.status !== 0) return `THROW:${(out.stderr || "").slice(-200)}`;
  return createHash("md5").update(out.stdout).digest("hex");
}

function runTests() {
  const out = spawnSync(
    "npx",
    ["vitest", "run", ...TESTS, "--reporter=json", `--outputFile=${REPORT}`],
    { encoding: "utf8", shell: true },
  );
  let failed = [];
  try {
    const j = JSON.parse(readFileSync(REPORT, "utf8"));
    failed = (j.testResults ?? [])
      .flatMap((f) => f.assertionResults ?? [])
      .filter((a) => a.status === "failed")
      .map((a) => a.fullName ?? a.title);
  } catch {
    failed = [];
  }
  return { code: out.status, failed };
}

try {
  const baseDigest = digest();
  if (baseDigest.startsWith("THROW")) {
    console.error("판정 거부 — 기준 산출물이 안 나온다:", baseDigest);
    process.exit(1);
  }
  const base = runTests();
  if (base.code !== 0) {
    console.error("판정 거부 — ㉠ 음성 대조 실패: 변이 전 시험이 이미 빨갛다");
    console.error(base.failed.slice(0, 5).join("\n"));
    process.exit(1);
  }
  console.log(`㉠ 음성 대조 초록 · 기준 산출물 ${baseDigest.slice(0, 8)}\n`);

  let notGuards = 0;
  for (const [why, from, to] of MUTATIONS) {
    const src = original.toString("utf8");
    const hits = src.split(from).length - 1;
    if (hits !== 1) {
      console.log(`⛔ ${why} — 앵커가 ${hits}개다. 판정 거부`);
      notGuards += 1;
      continue;
    }
    const mutated = src.replace(from, () => to);
    writeFileSync(TARGET, mutated);
    if (readFileSync(TARGET).equals(original)) {
      console.log(`⛔ ${why} — ⑵ 파일이 안 바뀌었다. 판정 거부`);
      notGuards += 1;
      writeFileSync(TARGET, original);
      continue;
    }
    const d = digest();
    if (d === baseDigest) {
      console.log(
        `⛔ ${why} — ⑶ 산출물이 그대로다. 판정 거부 (뜻이 안 바뀐 변이)`,
      );
      notGuards += 1;
      writeFileSync(TARGET, original);
      continue;
    }
    const r = runTests();
    if (r.code === 0) {
      console.log(`🟢 ${why} — 시험이 초록이다. **가드가 아니다**`);
      notGuards += 1;
    } else if (r.failed.length === 0) {
      console.log(`⛔ ${why} — 빨간데 실패한 시험을 못 댄다. 판정 거부`);
      notGuards += 1;
    } else {
      console.log(`🔴 ${why}`);
      console.log(
        `   ↳ ${r.failed.slice(0, 2).join(" / ")}${r.failed.length > 2 ? ` … 그리고 ${r.failed.length - 2}건` : ""}`,
      );
    }
    writeFileSync(TARGET, original);
  }
  console.log(
    notGuards === 0
      ? `\n✅ 변이 ${MUTATIONS.length}개 전부 빨강`
      : `\n❌ 판정 못 한 변이 ${notGuards}개`,
  );
  process.exit(notGuards === 0 ? 0 : 1);
} finally {
  writeFileSync(TARGET, original);
}
