/**
 * 발문 틀 판정기 — 소재 이름만 바꾼 것은 같은 틀, 묻는 것이 다르면 다른 틀.
 *
 * 원장님이 안 2를 버리신 근거(REPORT-02)를 **음성 대조군**으로 박는다.
 * 그 축이 없으면 파일럿이 지은 10개가 사과/배 바꿔 채운 거짓 10이 된다.
 */
import { describe, expect, it } from "vitest";

import { sameStemFrame, stemFrame } from "@/lib/elementary/stemFrame";

/** 브리프 §3 · REPORT-02 가 버린 안 2 의 실제 문장. */
const BAR_THEMES = ["수영", "달리기", "줄넘기"] as const;
const PICT_THEMES = ["다 마을", "다 반", "다 농장", "우유", "사과"] as const;
const WEIGHT_THEMES = ["가방", "수레", "귤", "쌀"] as const;

describe("stemFrame — 음성 대조 (소재만 바꾸면 같은 틀)", () => {
  it("초4 막대그래프 — 수영/달리기 와 줄넘기/수영", () => {
    const a =
      "민지의 동아리 활동 자료를 보고 막대그래프로 나타내시오. 수영과 달리기";
    const b =
      "민지의 동아리 활동 자료를 보고 막대그래프로 나타내시오. 줄넘기와 수영";
    expect(stemFrame(a)).not.toBe(stemFrame(b));
    expect(sameStemFrame(a, b, BAR_THEMES)).toBe(true);
  });

  it("초3 그림그래프 — 다 마을의 우유 와 다 반의 우유", () => {
    const a = "다음 그림그래프는 다 마을의 우유 생산량입니다. 가장 많은 날은?";
    const b = "다음 그림그래프는 다 반의 우유 생산량입니다. 가장 많은 날은?";
    expect(stemFrame(a)).not.toBe(stemFrame(b));
    expect(sameStemFrame(a, b, PICT_THEMES)).toBe(true);
  });

  it("초3 무게의 단위 — 가방에 담긴 귤 과 수레에 담긴 쌀", () => {
    const a = "가방에 담긴 귤의 무게는 몇 kg입니까?";
    const b = "수레에 담긴 쌀의 무게는 몇 kg입니까?";
    expect(stemFrame(a)).not.toBe(stemFrame(b));
    expect(sameStemFrame(a, b, WEIGHT_THEMES)).toBe(true);
  });
});

describe("stemFrame — 양성 대조 (묻는 것이 다르면 다른 틀)", () => {
  it("같은 막대그래프라도 가장 많은 것을 고르는 문항은 다른 틀", () => {
    const draw =
      "민지의 동아리 활동 자료를 보고 막대그래프로 나타내시오. 수영과 달리기";
    const max =
      "민지의 동아리 활동 막대그래프에서 가장 많은 것을 고르시오. 수영과 달리기";
    expect(sameStemFrame(draw, max, BAR_THEMES)).toBe(false);
  });

  it("주는 것과 구하는 것이 뒤바뀌면 다른 틀 (역산)", () => {
    const forward =
      "가로가 $6$ cm, 세로가 $4$ cm, 높이가 $5$ cm인 직육면체의 모든 모서리 길이의 합은 몇 cm입니까?";
    const reverse =
      "직육면체의 모든 모서리 길이의 합이 $60$ cm입니다. 가로가 $6$ cm, 세로가 $4$ cm일 때 높이는 몇 cm입니까?";
    expect(sameStemFrame(forward, reverse)).toBe(false);
  });

  it("면의 개수와 모서리 개수는 다른 틀 — 소재가 아니라 묻는 대상", () => {
    const faces =
      "가로가 $6$ cm, 세로가 $4$ cm, 높이가 $5$ cm인 직육면체의 면은 몇 개입니까?";
    const edges =
      "가로가 $6$ cm, 세로가 $4$ cm, 높이가 $5$ cm인 직육면체의 모서리는 몇 개입니까?";
    expect(sameStemFrame(faces, edges)).toBe(false);
  });

  it("수·수식만 바뀐 것은 같은 틀", () => {
    const a =
      "등호(=)의 양쪽이 같아지도록 $\\square$ 에 알맞은 수를 쓰시오. $3+5=2+\\square$";
    const b =
      "등호(=)의 양쪽이 같아지도록 $\\square$ 에 알맞은 수를 쓰시오. $11+8=7+\\square$";
    expect(sameStemFrame(a, b)).toBe(true);
  });
});
