/**
 * 자(paperProbe)가 지면에 얹는 `--paper-*` 변수가 **HTML 속성에서 살아남는가** (UI-09).
 *
 * ## 왜 이 시험이 있나 — 주석이 지킨다고 적힌 자리에 가드가 없었다
 *
 * `PAPER_FONTS.serifKR` 은 **이름에 큰따옴표를 담는다**(`"KoPubBatang", …`). 이 문자열을
 * `style="…"` 에 그대로 끼워 넣으면 **속성이 그 첫 따옴표에서 끝난다.** 그러면 지면이
 * `--paper-font-serif`·`--paper-font-sans` 를 통째로 잃고 브라우저 기본 고딕으로
 * 떨어지는데 — **에러가 하나도 안 난다.** 측정은 그대로 돌고 그럴듯한 숫자를 낸다.
 *
 * 2026-09-05 에 `paperProbe`·`examPaperProbe` 에서 실제로 그렇게 8일을 보냈고,
 * `PAPER_VARS_ATTR`(따옴표를 `&quot;` 로) 로 고쳤다. 그런데 **그 고침을 지키는 시험이
 * 없었다** — 주석만 있었다. 되돌려도 아무 데서도 안 운다.
 *
 * 2026-09-07 UI-09 실측에서 **같은 결함을 새 계측기에 다시 팠다**(그때는 인라인
 * `style=` 을 썼다). 같은 함정을 두 번 밟았으므로 문서가 아니라 시험으로 옮긴다.
 *
 * ## 🔴 음성 대조
 *
 * 「따옴표가 없다」만 물으면 **빈 문자열도 통과**한다. 그래서 (ㄱ) 이스케이프 **전** 값에는
 * 따옴표가 있다는 것과 (ㄴ) 이스케이프한 값을 되돌리면 원본과 같다는 것을 같이 문다.
 * 앞엣것이 없으면 이 검출기가 «무엇을 잡는지» 스스로 증명하지 못한다.
 */
import { describe, expect, it } from "vitest";

import { PAPER_VARS, PAPER_VARS_ATTR } from "../../../scripts/qa/paperProbe";
import { PAPER_FONTS } from "@/components/print/tokens";

describe("자의 지면 변수 — HTML 속성에서 살아남는가", () => {
  it("음성 대조 — 이스케이프 전 값에는 큰따옴표가 **있다**", () => {
    // 이게 거짓이면 아래 단언들이 아무것도 안 지킨다(잡을 것이 애초에 없다).
    expect(PAPER_VARS).toContain('"');
    expect(PAPER_FONTS.serifKR).toContain('"');
  });

  it("🔴 속성용 값에는 맨 큰따옴표가 하나도 없다 — 있으면 style 이 거기서 끝난다", () => {
    expect(PAPER_VARS_ATTR).not.toContain('"');
  });

  it("이스케이프는 **모양만** 바꾼다 — 되돌리면 원본과 같다", () => {
    expect(PAPER_VARS_ATTR.replaceAll("&quot;", '"')).toBe(PAPER_VARS);
  });

  it("지면 글꼴 선언이 실제로 실려 있다 — 값이 비면 폴백으로 조용히 떨어진다", () => {
    expect(PAPER_VARS_ATTR).toContain("--paper-font-serif:");
    expect(PAPER_VARS_ATTR).toContain("--paper-font-sans:");
    // 스택의 이름을 옮겨 적지 않는다 — 정본을 이스케이프한 것과 견준다.
    expect(PAPER_VARS_ATTR).toContain(
      PAPER_FONTS.serifKR.replaceAll('"', "&quot;"),
    );
  });
});
