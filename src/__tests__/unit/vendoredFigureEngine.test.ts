/**
 * 도형 엔진은 **저장소 안**에 있다 (원장님 지시 2026-08-19 「엔진을 우리 프로젝트로
 * 가져와. 계속 사용할거같으니까」).
 *
 * 🔴 종전에는 `F:\시험지변환기` 만 봤다. 그 드라이브가 없는 컴퓨터에서는 도형이
 *    통째로 안 그려지는데, **실행해 봐야** 드러났다 — 이 검사가 그 자리를 막는다.
 *
 * ⚠️ 「이식하지 않는다」(09 §0)는 **TypeScript 로 다시 쓰지 말라**는 뜻이다.
 *    파이썬 원본을 저장소에 두고 그대로 부르는 것은 그 결정과 어긋나지 않는다.
 */
import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const VENDOR = "vendor/figure-engine/core";

describe("[D-55] 도형 엔진 — 저장소 안에 있다", () => {
  it("엔진 모듈이 저장소에 있다", () => {
    for (const f of [
      "__init__.py",
      "figure_svg.py",
      "figure_scene.py",
      "figure_solid.py",
      "figure_quality.py",
      "figure_exam.py",
      "figure_spec_repair.py",
    ])
      expect(existsSync(`${VENDOR}/${f}`), `${VENDOR}/${f}`).toBe(true);
  });

  it("제품이 **저장소 안 엔진을 먼저** 본다 — 원본 드라이브는 마지막", () => {
    // 순서가 뒤집히면 두 벌이 갈라져도 아무도 모른다.
    // ⚠️ 이 결정은 `engine_path.py` **한 곳**에 있다. 종전에는 `render_spec.py` 안에만
    //    있어서, 판정기가 `elementary` 를 직접 import 하는 길에서는 `core` 를 아예
    //    못 찾았다(2026-08-28: 그 길로 시험 50개가 한꺼번에 빨개졌다).
    const src = readFileSync("scripts/figure/engine_path.py", "utf8");
    const vendorAt = src.indexOf("VENDOR_ENGINE_PATH,");
    const driveAt = src.indexOf("DEFAULT_ENGINE_PATH,");
    expect(vendorAt).toBeGreaterThan(0);
    expect(driveAt).toBeGreaterThan(0);
    expect(vendorAt).toBeLessThan(driveAt);
  });

  it("경로 결정이 **한 벌**이다 — 부르는 쪽이 제 목록을 따로 두지 않는다", () => {
    // 두 벌이 되는 순간 한쪽만 고쳐지고, 안 고쳐진 쪽은 「엔진이 없다」고 한다.
    for (const f of [
      "scripts/figure/render_spec.py",
      "scripts/figure/elementary.py",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f} 가 제 경로 목록을 들고 있다`).not.toContain(
        'os.environ.get("FIGURE_ENGINE_PATH")',
      );
    }
  });

  it("일관성 정본이 그 안에 있다 — `type_scale` 과 `verify_figure`", () => {
    // 원장님 지시 2026-08-19 「모든 그림이나 도형 크기가 일관성이 있어야」.
    // 글자 크기를 호출부마다 손으로 적으면 한 그림 안에서도 제각각이 된다
    // (엔진 주석에 남은 2026-08-13 지적). 그 두 함수가 정본이다.
    const svg = readFileSync(`${VENDOR}/figure_svg.py`, "utf8");
    expect(svg).toContain("def type_scale(");
    expect(svg).toContain("def verify_figure(");
  });

  it("제3자 의존이 없다 — 모듈을 불러오는 데 필요한 것은 표준 라이브러리뿐이다", () => {
    // numpy·PIL 은 함수 **안**에서만 불린다(래스터 보조 기능). 모듈 최상단에
    // 올라오면 설치 없이는 도형이 아예 안 그려진다.
    for (const f of ["figure_svg.py", "figure_scene.py", "figure_solid.py", "figure_exam.py", "figure_spec_repair.py"]) {
      const head = readFileSync(`${VENDOR}/${f}`, "utf8")
        .split("\n")
        .filter((l) => /^(import|from) /.test(l))
        .join("\n");
      expect(head, f).not.toMatch(/numpy|PIL|matplotlib|sympy/);
      expect(head, f).not.toMatch(/core\.figure_generator|utils|anthropic/);
    }
  });
});
