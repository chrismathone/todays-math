/**
 * **중등 엔진이 실어 보내는 그림 스펙을 제품이 실제로 그릴 수 있는가.**
 *
 *   npx tsx scripts/qa/probe-middle-figure-renderable.ts            # 전량
 *   npx tsx scripts/qa/probe-middle-figure-renderable.ts --seeds=16 # 씨앗을 넓힌다
 *   npx tsx scripts/qa/probe-middle-figure-renderable.ts --selftest # 눈금만
 *
 * ## 왜 생겼나 (2026-09-04)
 *
 * 5차 물결 3차 착지 적재에서 스펙 2종이 실패했다 —
 * 「segment 'PQ' is too short (9.33px) for its tick/parallel marks」.
 * 그 4행의 발문은 **「그림과 같이 $\triangle ABC$에서…」**라 종이에서 못 푼다.
 * 그런데 **적재할 때에야** 드러났다.
 *
 * ## 🔴 왜 아무 자도 못 봤나 — 중등에는 이 축이 없었다
 *
 * - `elemFigureRenderable.test.ts` 는 **초등만** 본다. 그 파일 머리말이 스스로
 *   「같은 지문 안에서 **어떤 값에서만** 실패하는 부류는 못 잡는다 — 중등 `J30503`
 *   8건이 그 부류다」라고 적어 두었다.
 * - 중등에도 렌더 검사가 하나 있지만(`middleM3Stat2.test.ts`) **그 모듈의 유형만**
 *   보고 씨앗도 둘이다. 그 파일 머리말도 「값에 따라만 깨지는 부류는 유형별 검사가
 *   더 넓은 씨앗으로 따로 본다」고 적어 두었다 — **그 «따로»가 없었다.**
 * - 값 검산·KaTeX·지면 잠금은 전부 초록이다. 스펙은 **붙어 있고**, 답도 맞다.
 *
 * 결함이 렌더에서만 나타나면 **렌더를 안 하는 자는 그 부류를 구조적으로 못 본다.**
 *
 * ## 🔴 축은 «씨앗»이 아니라 «변형»이다 — 적재기가 걷는 길이 그것이다
 *
 * 처음엔 씨앗 8 × 변형 3 으로 짰다. **적재기는 정확히 반대로 걷는다** —
 * 계획의 `seedBase` **하나**에 변형을 편다(`buildMiddleRows` → `expandFamily`).
 * 그래서 잠긴 4행이 `v0`·**`v7`** 인데 판정기는 `v0~v2` 만 보고 있었다 —
 * **결함을 잡고도 그 결함의 절반은 축 밖**이었다.
 *
 * ⚠️ 그렇다고 `v0~v11` 로 못 박아도 안 된다. `collectDistinctVariantsResult` 는
 *    **서로 다른 것 n 개를 채울 때까지** 걷는다 — 같은 판이 나오면 건너뛰므로
 *    `variants: 6` 인 계획이 실제로는 `v7` 까지 간다(잠긴 행이 그 증거다).
 *    한도는 `n * 30` 이라 이론상 훨씬 멀리 간다. **범위를 옮겨 적으면 반드시 갈린다.**
 *    그래서 여기서는 **적재기가 부르는 그 함수를 그대로 부른다** — 걷는 규칙이 한 벌이다.
 *    (`allowShort` 를 준다: 변형 공간이 좁은 유형에서 던지면 그 유형이 통째로
 *     축 밖이 되는데, 판정기는 그걸 «깨끗»으로 읽는다. 못 채운 유형 수는 찍는다.)
 *
 * ## 싸게 하는 법 — 스펙으로 접는다
 *
 * 렌더는 스펙마다 파이썬 프로세스를 띄운다(실측 319ms). 그래서 **같은 스펙은 한 번만**
 * 그리고(적재기와 같은 방식), 여러 개를 한꺼번에 띄운다.
 *
 * ⚠️ **씨앗 수·변형 수를 반드시 찍는다.** 이 자는 「이 범위에서」 깨끗하다고만 말할 수
 *    있다 — 말없는 상한을 만들지 않는다.
 */
import { createHash } from "node:crypto";

import { collectDistinctVariantsResult } from "../../src/lib/engine/variants";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

const SEED_BASE = 20260905;
/** 계획이 쓰는 최대 변형 수. 적재기가 이만큼 편다 — 여기가 축이다. */
const VARIANTS_DEFAULT = 12;
/** 파이썬 렌더를 몇 개까지 동시에 띄울까 — 느린 곳이 여기다. */
const CONCURRENCY = Number(process.env.FIGURE_PROBE_CONCURRENCY ?? 6);

function argNum(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

const digest = (s: string): string =>
  createHash("md5").update(s).digest("hex").slice(0, 8);

/**
 * 🔴 **눈금** — 일부러 못 그릴 스펙을 대 본다. 이것이 없으면 「실패 0」이
 * 「깨끗」인지 「렌더가 아무것도 안 하고 있다」인지 안 갈린다(2026-08-21).
 */
async function selftest(): Promise<boolean> {
  // 양성 — 눈금 표시를 단 아주 짧은 선분은 렌더러가 거부한다(이번 결함의 모양).
  const bad = {
    version: 2,
    points: { P: [100, 100], Q: [103, 100] },
    segments: { PQ: { points: ["P", "Q"], parallel: 1 } },
    labels: { P: "P", Q: "Q" },
  } as unknown as Record<string, unknown>;
  // 음성 — 같은 모양인데 충분히 긴 선분은 그려져야 한다.
  const good = {
    version: 2,
    points: { P: [40, 100], Q: [180, 100] },
    segments: { PQ: { points: ["P", "Q"], parallel: 1 } },
    labels: { P: "P", Q: "Q" },
  } as unknown as Record<string, unknown>;
  const rb = await renderFigureSpec(bad);
  const rg = await renderFigureSpec(good);
  // ⚠️ 찍는 꼴은 `elemProbeGauges.test.ts` 의 집안 규약이다 — 판정 줄마다 ✅/❌ 로
  //    시작하고 마지막에 「눈금 N건」. 이 꼴을 안 지키면 그 시험이 이 자의 눈금을
  //    **자동으로 못 돌린다** — 눈금이 있어도 아무도 안 보는 것이 된다.
  console.log(
    `  ${rb.ok ? "❌" : "✅"} 양성 — 표시가 붙은 **짧은 선분**은 거부되어야 한다` +
      `  (그려졌나 ${rb.ok ? "예" : "아니오"}, 기대 아니오)`,
  );
  console.log(
    `  ${rg.ok ? "✅" : "❌"} 음성 — 같은 모양의 **긴 선분**은 그려져야 한다` +
      `  (그려졌나 ${rg.ok ? "예" : "아니오"}, 기대 예)`,
  );
  const pass = !rb.ok && rg.ok;
  if (rb.ok)
    console.log("   🔴 양성이 통과했다 — 이 자는 지금 아무것도 못 잡는다.");
  if (!rg.ok)
    console.log(
      `   🔴 음성이 막혔다 — 이 자는 멀쩡한 그림도 빨갛게 낸다: ${rg.error}`,
    );
  console.log(
    pass
      ? "\n✅ 눈금 2건 전부 맞다 (양성 1 · 음성 1)"
      : "\n❌ 눈금 2건 중 어긋난 것이 있다 — 판정을 거부한다.",
  );
  return pass;
}

async function main(): Promise<void> {
  const ok = await selftest();
  if (process.argv.includes("--selftest")) {
    process.exitCode = ok ? 0 : 1;
    return;
  }
  if (!ok) {
    process.exitCode = 1;
    return;
  }

  const seeds = argNum("seeds", 2);
  const variants = argNum("variants", VARIANTS_DEFAULT);
  // 모집단은 **등록**이다 — 손 목록이 아니다. 새 유형이 저절로 들어온다.
  const entries = registeredTypes();
  const specs = new Map<
    string,
    { key: string; spec: Record<string, unknown> }
  >();
  let withFigure = 0;
  let short = 0;
  const threw = new Map<string, string>();
  for (const e of entries) {
    for (let s = 0; s < seeds; s += 1) {
      // 🔴 **적재기가 부르는 그 함수**로 걷는다 — 변형 범위를 옮겨 적지 않는다.
      const got = collectDistinctVariantsResult(
        (v) => {
          try {
            const p = generateMiddleProblem(e.key, SEED_BASE + s * 7919, v);
            return {
              content: p.content,
              answer: p.answer,
              figureSpec:
                (p.figureSpec as Record<string, unknown> | null) ?? null,
            };
          } catch (err) {
            // ⚠️ 생성기가 던지는 것은 **그림 결함이 아니다** — 변형 공간이 바닥난
            //    것이고(「유형 생성 재시도 초과」), 적재기는 거기까지 안 간다.
            //    그런데 그냥 터지면 **판정기가 결함을 찾은 것처럼** 보인다 —
            //    관문이 실제로 그렇게 읽었고, 표에는 스택트레이스만 남았다.
            //    잡아서 **세어 찍고** 걸음만 잇는다. 같은 열쇠를 돌려주므로
            //    `distinctKey` 가 접어 걸음이 제풀에 끝난다.
            threw.set(e.key, err instanceof Error ? err.message : String(err));
            return {
              content: `__throw__${e.key}`,
              answer: "",
              figureSpec: null,
            };
          }
        },
        variants,
        { allowShort: true },
      );
      if (got.shortBy > 0) short += 1;
      for (const it of got.items) {
        if (!it.figureSpec) continue;
        withFigure += 1;
        const id = `${e.key}#${digest(JSON.stringify(it.figureSpec))}`;
        if (!specs.has(id)) specs.set(id, { key: e.key, spec: it.figureSpec });
      }
    }
  }
  console.log(
    `등록 ${entries.length}유형 · 씨앗 ${seeds} × 변형 ${variants}(적재기와 같은 걸음)` +
      ` · 그림 붙은 판 ${withFigure} · **서로 다른 스펙 ${specs.size}**` +
      ` · 변형을 못 채운 유형 ${short} · 생성기가 던진 유형 ${threw.size}`,
  );
  if (threw.size > 0) {
    // 「던졌다」를 숫자만 남기면 그 유형의 그림은 **안 본 것**인데 표는 조용하다.
    const sample = [...threw.entries()].slice(0, 3);
    console.log(
      `   ⚠️ 변형 공간이 바닥난 유형 ${threw.size}개 — 그 유형의 **먼 변형은 안 봤다**` +
        `(적재기도 거기까지는 안 간다). 예:\n` +
        sample.map(([k, m]) => `      · ${k} — ${m}`).join("\n"),
    );
  }

  const items = [...specs.entries()];
  const results = await mapLimit(items, CONCURRENCY, async ([id, v]) => {
    const r = await renderFigureSpec(v.spec);
    return r.ok ? null : `${v.key} · ${id.split("#")[1]} — ${r.error}`;
  });
  const failed = results.filter((x): x is string => x !== null);
  console.log(`그린 스펙 ${items.length} · 실패 ${failed.length}`);

  if (failed.length > 0) {
    // 유형별로 접어 찍는다 — 같은 유형이 여러 스펙에서 깨지면 뿌리가 하나다.
    const byKey = new Map<string, string[]>();
    for (const f of failed) {
      const k = f.split(" · ")[0] ?? "?";
      byKey.set(k, [...(byKey.get(k) ?? []), f]);
    }
    console.log(`\n🔴 못 그린 스펙이 있다 — 그 문항은 **그림 없이** 나간다.`);
    for (const [k, fs] of [...byKey.entries()].sort()) {
      console.log(`   · ${k} — ${fs.length}종`);
      for (const f of fs.slice(0, 2)) console.log(`       ${f}`);
    }
    console.log(
      `\n   발문이 그림을 가리키면 종이에서 못 푼다. 적재기는 그런 행을` +
        ` 출제에서 빼지만(\`figurelessRow\`), **빼는 것보다 그리는 것이 낫다.**`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `✅ 씨앗 ${seeds} × 변형 ${variants} 에서 중등 그림 스펙이 전부 그려진다.` +
      ` — 넓히려면 \`--seeds=\` · \`--variants=\`.`,
  );
}

void main();
