/**
 * 컨트롤 경계·기능색 토큰 가드 — 2026-09-07.
 *
 * ## 왜 이 시험이 있나
 *
 * 2026-08-18 팔레트 교체(05 §2.1 `[확정]`)에서 «구분선»과 «컨트롤 경계»가 갈렸다 —
 * `--divider: #b9b9b6`(카드·행 1px 전용) vs `--control: #8e8e8b`(조작 가능한 것의 경계,
 * WCAG 1.4.11 의 3:1 을 넘기려고 어둡게 잡은 값). §2.1 은 「섞지 말 것」이라 못까지 박아 뒀다.
 *
 * 공유 컴포넌트(`Button.tsx`·`Input.tsx`)는 그때 옮겨 갔다. **손으로 적은 사본 넷은
 * 안 옮겨 왔다** — 2026-09-07 에 넷을 한꺼번에 고치며 이 시험을 세웠다:
 *
 * ```
 * labels.ts FIELD_CLASS         border-[#C2C2C0]   ← 대비 1.78:1. §2.1 이 «구 팔레트의 실패»로
 *                                                     이름 붙인 바로 그 값이다
 * ProblemRegisterForm textarea  border-divider     ← 초점색만 옮겨 온 «반쪽 이주»
 * ActualScoreCell BTN           border-divider
 * TestPrint .printButton        #1a73e8            ← 버린 파랑(지금은 --blue: #2064b3)
 * ```
 *
 * 🔴 **이 부류는 스스로 신고하지 않는다.** 유효한 색이고 KaTeX·tsc·lint 어느 것도 안 운다.
 *    화면은 그럴듯하고, 다른 것은 «조금 더 진한 회색»일 뿐이다. 그래서 원장님이 화면에서
 *    짚어 주실 때까지 아무도 모른다.
 *
 * 🔴 **음성 대조를 같이 둔다.** 훑개가 「0건」을 낼 때 그것이 «깨끗»인지 «못 셈»인지
 *    갈라야 한다(이 저장소가 여러 번 밟은 자리). 그래서 판정 전에 **일부러 걸리는 글**을
 *    검출기에 대 보고, 못 잡으면 그 사실 자체가 빨강이 된다.
 *
 * ## 이 시험이 «안» 하는 것
 *
 * `#C2C2C0` 전량 금지는 **하지 않는다.** 그 값은 §8.8 D-77 이 헤더 계정 구분선으로
 * **명시해 확정**했고 워드마크 구분선도 같은 어법을 쓴다. 일괄 치환은 확정을 말없이
 * 뒤집는다 — 그래서 여기서는 **드리프트가 실제로 난 `FIELD_CLASS` 한 자리**만 못 박는다.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "../..");
/** 이 시험 파일 자신 (src 기준 상대 경로, 슬래시 정규화). */
const SELF = path.relative(SRC, import.meta.filename).replace(/\\/g, "/");

/** 버린 파랑. `--blue: #2064b3` 로 갈아탄 뒤로는 어디에도 있으면 안 된다. */
const DEAD_BLUE = /#1a73e8/gi;

/** Tailwind 임의값(`border-[#C2C2C0]`)이든 CSS 리터럴이든 6자리 hex 를 잡는다. */
const HEX = /#[0-9a-f]{6}\b/gi;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** 파일에서 죽은 파랑이 나온 줄을 (경로, 줄번호, 줄) 로 돌려준다. */
function findDeadBlue(rel: string, text: string) {
  return text
    .split(/\r?\n/)
    .map((line, i) => ({ rel, line: i + 1, text: line }))
    .filter(
      (row) => DEAD_BLUE.test(row.text) && (DEAD_BLUE.lastIndex = 0) === 0,
    );
}

describe("[음성 대조] 검출기가 «아니오»를 낼 수 있는가", () => {
  it("일부러 심은 죽은 파랑을 잡는다 — 못 잡으면 아래 「0건」은 «못 셈»이다", () => {
    const planted = findDeadBlue("planted.css", "a {\n  color: #1A73E8;\n}");
    expect(planted).toHaveLength(1);
    expect(planted[0].line).toBe(2);
  });

  it("hex 검출기도 실제로 문다", () => {
    expect("border-[#C2C2C0]".match(HEX)).toEqual(["#C2C2C0"]);
    expect("border-control".match(HEX)).toBeNull();
  });
});

describe("[§2.1] 버린 파랑 #1a73e8 은 제품 소스에 없다", () => {
  it("globals.css 의 «없앴다» 주석 한 자리 말고는 나오지 않는다", () => {
    const hits = walk(SRC).flatMap((file) =>
      findDeadBlue(path.relative(SRC, file), readFileSync(file, "utf8")),
    );

    // 훑은 자리를 찍는다 — 「무엇을 훑었는지」를 안 적으면 0 이 무엇의 0 인지 모른다.
    expect(walk(SRC).length).toBeGreaterThan(200);

    const stray = hits.filter((h) => {
      const rel = h.rel.replace(/\\/g, "/");
      // 예외 ㉠ globals.css 가 「예전에는 리터럴이 한 벌 더 있었다」를 적어 둔 주석.
      //        값이 아니라 **기록**이라 남긴다. 주석 밖(`background: #1a73e8`)이면 걸린다.
      if (rel === "app/globals.css" && h.text.trim().startsWith("*"))
        return false;
      // 예외 ㉡ 이 시험 자신. 검출기 정규식과 음성 대조 표본이 그 값을 **담고 있어야** 한다.
      //        파일을 이름으로 못 박지 않고 자기 경로로 뺀다 — 이름이 바뀌어도 따라온다.
      //        나머지 시험 파일은 예외가 아니다(픽스처가 구 파랑을 물고 있으면 그것도 드리프트다).
      if (rel === SELF) return false;
      return true;
    });

    expect(
      stray.map((h) => `${h.rel}:${h.line}`),
      "구 파랑이 되살아났다 — 기능색은 `var(--blue)` / `g-blue` 를 쓴다 (05 §2.2)",
    ).toEqual([]);
  });
});

describe("[§2.1] FIELD_CLASS 는 컨트롤 토큰을 쓴다", () => {
  const labels = readFileSync(
    path.join(SRC, "components/test/labels.ts"),
    "utf8",
  );
  const field = /FIELD_CLASS\s*=\s*\n?\s*"([^"]*)"/.exec(labels)?.[1];

  it("문자열을 실제로 찾았다 — 못 찾으면 아래 단언들이 통째로 헛돈다", () => {
    expect(field).toBeTypeOf("string");
    expect(field!.length).toBeGreaterThan(40);
  });

  it("hex 리터럴이 하나도 없다", () => {
    expect(field!.match(HEX)).toBeNull();
  });

  it("경계는 --control, 초점은 --blue 계열이다 — 공유 Input 과 같은 값을 본다", () => {
    expect(field).toContain("border-control");
    expect(field).toContain("focus:border-g-blue");
    expect(field).toContain("focus:outline-g-blue");
  });

  it("🔴 구분선 토큰으로 되돌아가지 않는다 — 컨트롤 경계는 3:1 이 필요하다", () => {
    expect(field).not.toContain("border-divider");
  });
});
