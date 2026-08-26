/**
 * 진행 표시의 경과 시간 문구 — `src/components/test/AiGenerateProgress.tsx`.
 *
 * 시계에 매이지 않게 **순수 함수**로 떼어 두고 여기서 잰다. 컴포넌트 시험에서
 * 가짜 타이머로 1초씩 밀며 확인하면 회차마다 흔들리는데, 그 흔들림은
 * 「문구가 틀렸다」와 구분되지 않는다.
 */
import { describe, expect, it } from "vitest";

import { formatElapsed } from "@/components/test/AiGenerateProgress";

describe("formatElapsed", () => {
  it("1분 미만은 초로만 적는다", () => {
    expect(formatElapsed(0)).toBe("0초 경과");
    expect(formatElapsed(999)).toBe("0초 경과");
    expect(formatElapsed(1000)).toBe("1초 경과");
    expect(formatElapsed(40_000)).toBe("40초 경과"); // 실측 3문항
    expect(formatElapsed(59_999)).toBe("59초 경과");
  });

  it("1분 이상은 분과 초로 나눈다", () => {
    expect(formatElapsed(60_000)).toBe("1분 경과");
    expect(formatElapsed(72_000)).toBe("1분 12초 경과");
    expect(formatElapsed(127_800)).toBe("2분 7초 경과"); // 실측 10문항
    expect(formatElapsed(120_000)).toBe("2분 경과");
  });

  it("음수는 0으로 본다 — 시계가 뒤로 가도 「-3초 경과」를 그리지 않는다", () => {
    expect(formatElapsed(-5_000)).toBe("0초 경과");
  });
});
