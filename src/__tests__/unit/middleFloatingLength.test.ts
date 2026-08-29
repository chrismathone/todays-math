/**
 * **떠 있는 길이 글자가 없다** — `cm` 이 붙은 수는 전부 `dimensions` 가 낸다.
 *
 * 원장님 지적 2026-08-29: 「길이 치수선은 왜 자꾸 빠지나?」 실측으로 중2-2 의
 * **26유형 64자리**가 치수선 없이 날 `<text>` 를 변 옆에 얹고 있었다 — 유령 점
 * (`n1`·`n_ab`·`t_a`)을 만들어 라벨만 붙이는 수법이다. 지면에서는
 * 「선에서 떨어진 맨 길이 표기」가 되고, 그것은 원장님이 2026-08-13 에 물린
 * 바로 그 모양이다(`figureDims.ts` 머리말 · `lint_svg` 규칙 4).
 *
 * 🔴 **규칙과 연장은 이미 있었다** — `withDims` 도, 그 규칙을 적은 머리말도.
 *    없던 것은 **가드**뿐이라 새 빌더가 계속 옛 수법으로 태어났다. 그래서
 *    여기서는 유형을 손으로 나열하지 않고 **등록표 전량**을 훑는다 —
 *    새 유형도 자동으로 걸린다(손 목록은 샌다, 2026-08-18).
 *
 * ⚠️ **양성 대조가 이 시험의 절반이다.** 「0건」은 «깨끗»과 «못 셈»을 안 가른다
 *    (2026-08-21). 아래 첫 검사가 일부러 떠 있는 라벨을 검출기에 대어,
 *    검출기가 살아 있음을 **회차마다** 보인다.
 */
import { describe, expect, it } from "vitest";

import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";

/** 라벨 값 하나가 «떠 있는 길이»인가. 라벨은 문자열이거나 `{text, italic}` 이다. */
function looksLikeLength(value: unknown): boolean {
  const text =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null && "text" in value
        ? String((value as { text: unknown }).text)
        : "";
  // 「12 cm」·「7cm」·「30 m」·「x cm」 — 단위가 붙은 것만 센다. 「A」·「B'」·「l」은 아니다.
  // 미지수(`x cm`)도 치수여야 한다 — 어느 변이 x 인지는 선이 말해야 한다.
  //
  // 🔴 단위 **앞에 수나 빈칸이 있어야** 한다. 처음엔 `(^|[\s\d])` 로 썼는데 그러면
  //    직선 이름 `m`(직선 l∥m∥n)이 통째로 걸린다 — 이 파일의 음성 대조가 잡았다.
  //    「걸리는가」만 물으면 「멀쩡한 것을 안 거는가」는 구조적으로 안 보인다.
  const t = text.trim();
  return t.length >= 2 && /[\d\s]\s*(cm|mm|m)$/.test(t);
}

type Spec = {
  version?: unknown;
  /** v2 는 «점 이름 → 글자» 표, elem-1 은 `{x,y,text}` 배열이다. */
  labels?: Record<string, unknown> | unknown[];
  dimensions?: Record<string, unknown>;
  dims?: unknown[];
};

/** 라벨 값을 종류에 상관없이 훑는다 — v2 는 표, elem-1 은 배열이다. */
function labelEntries(spec: Spec): [string, unknown][] {
  const labels = spec.labels;
  if (Array.isArray(labels))
    return labels.map((v, i) => [String(i), v] as [string, unknown]);
  return Object.entries(labels ?? {});
}

/** 씨앗·변형을 넓힌다 — 한 표본만 보면 갈래(mode)에서만 나는 것을 구조적으로 못 본다. */
const SEEDS = [20260829, 20260827, 20260825, 7] as const;
const VARIANTS = [0, 1, 2] as const;

describe("중등 그림 — 길이는 치수선이 낸다 (떠 있는 맨 글자 금지)", () => {
  it("양성 대조 — 일부러 떠 있게 만든 라벨을 검출기가 잡는다", () => {
    // 이것이 없으면 아래 「0건」이 «깨끗»인지 «검출기가 죽었는지» 안 갈린다.
    expect(looksLikeLength("12 cm")).toBe(true);
    expect(looksLikeLength("7cm")).toBe(true);
    expect(looksLikeLength("30 m")).toBe(true);
    expect(looksLikeLength("x cm")).toBe(true);
    expect(looksLikeLength({ text: "5 cm", italic: false })).toBe(true);
    // 음성 대조 — 점 이름·직선 이름은 길이가 아니다(여기가 새면 거짓 경보가 된다).
    expect(looksLikeLength("A")).toBe(false);
    expect(looksLikeLength("B'")).toBe(false);
    expect(looksLikeLength({ text: "l", italic: true })).toBe(false);
    expect(looksLikeLength("O")).toBe(false);
    // 「m」 하나짜리 직선 이름 — 단위 m 과 헷갈리는 자리라 일부러 못 박는다.
    expect(looksLikeLength({ text: "m", italic: true })).toBe(false);
  });

  it("v2 그림은 `labels` 에 길이 글자를 두지 않는다 (elem-1 은 아래 검사)", () => {
    const hits: string[] = [];
    let v2Figures = 0;
    for (const entry of registeredTypes()) {
      let sawV2 = false;
      for (const seed of SEEDS) {
        for (const variant of VARIANTS) {
          let problem;
          try {
            problem = generateMiddleProblem(entry.key, seed, variant);
          } catch {
            continue;
          }
          const spec = problem.figureSpec as Spec | null;
          if (!spec || spec.version !== 2) continue;
          sawV2 = true;
          const floats = labelEntries(spec)
            .filter(([, value]) => looksLikeLength(value))
            .map(([name, value]) => `${name}=${JSON.stringify(value)}`);
          if (floats.length > 0) {
            hits.push(
              `${entry.key} s${seed}v${variant}: ${floats.join(" · ")}` +
                ` — 유령 점 대신 \`withDims\` 를 쓸 것`,
            );
          }
        }
      }
      if (sawV2) v2Figures += 1;
    }
    // 분모를 먼저 못 박는다 — 그림이 갑자기 안 나오면 「0건」이 저절로 참이 된다.
    expect(
      v2Figures,
      "v2 그림을 낸 유형이 너무 적다 — 이 시험이 아무것도 안 봤다",
    ).toBeGreaterThan(180);
    expect(hits, hits.slice(0, 20).join("\n")).toEqual([]);
  }, 300_000);

  it("elem-1 그림에 길이 글자가 있으면 그 그림은 치수선을 **그린다**", () => {
    // 🔴 elem-1 은 **다른 엔진**이다(`render_spec.py` 가 갈래를 가른다). 치수를
    //    `dims` 배열로 따로 그리고, 글자는 그 곁에 `labels` 로 놓는 것이 그쪽 규약이다
    //    (실측 `1-2|입체도형의 겉넓이와 부피|18`: 세로 치수선의 `label` 이 비어 있고
    //    글자가 바로 옆 `labels` 에 있다). 그래서 v2 의 엄한 규칙을 그대로 대면
    //    **거짓 경보**가 되고, 늘 우는 가드는 꺼진다(2026-08-20).
    //
    // 여기서 묻는 것은 더 약하지만 참인 것 하나다 — 「치수선이 **하나도** 없는데
    // 길이 글자만 떠 있지는 않은가」. 「분속 50 m」 같은 속력 주석은 길이가 아니라
    // 걸릴 이유가 없는데, 그 그림도 실제 거리(`960 m`)는 치수선으로 그린다.
    const hits: string[] = [];
    let checked = 0;
    for (const entry of registeredTypes()) {
      for (const seed of SEEDS) {
        for (const variant of VARIANTS) {
          let problem;
          try {
            problem = generateMiddleProblem(entry.key, seed, variant);
          } catch {
            continue;
          }
          const spec = problem.figureSpec as Spec | null;
          if (!spec || spec.version !== "elem-1") continue;
          const floats = labelEntries(spec).filter(([, v]) =>
            looksLikeLength(v),
          );
          if (floats.length === 0) continue;
          checked += 1;
          if (!Array.isArray(spec.dims) || spec.dims.length === 0) {
            hits.push(
              `${entry.key} s${seed}v${variant}: 길이 글자 ${floats.length}개인데 \`dims\` 가 없다`,
            );
          }
        }
      }
    }
    expect(
      checked,
      "길이 글자를 가진 elem-1 그림이 하나도 없다 — 이 검사가 아무것도 안 봤다",
    ).toBeGreaterThan(0);
    expect(hits, hits.join("\n")).toEqual([]);
  }, 300_000);
});
