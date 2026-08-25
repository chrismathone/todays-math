/**
 * eywa 동기화 **범위** 잠금 — 원장님 확정 2026-08-25:
 * *「이수진T의 월목 1,2교시 반에 대해서만 작동」* → `MS1A` · `MS2A` 둘.
 *
 * 🔴 **이 목록이 조용히 넓어지는 것을 막는 유일한 장치다.** 그 전까지는 활성 수학반
 *    전부(68반·재원 341명)를 매일 가져왔다. 한 줄만 더 늘어도 그때로 돌아간다.
 *
 * ⚠️ **「전부」로 새지 않는 축을 따로 잠근다.** 환경변수가 빈 문자열일 때 「설정 안 함」이
 *    아니라 「전부」로 읽히면, 오타 하나에 68반이 다시 들어오는데 **에러가 안 난다.**
 */
import { describe, expect, it } from "vitest";

import {
  EYWA_SYNC_CLASSES,
  scopeNameMismatches,
  scopedClassIds,
} from "@/lib/eywa/syncScope";

/** 원장님이 고른 둘 — eywa `classes.id` 실측(2026-08-25). */
const MS1A = "5984ef1b-4750-4ae5-80cf-9e21a55e33aa";
const MS2A = "2914f6bc-d7cd-4a1d-85b9-fcbd0ec72324";

describe("[범위] eywa 동기화는 확정된 반만 본다", () => {
  it("🔴 목록을 여기 그대로 못 박는다 — 늘어나면 빨개진다", () => {
    expect(EYWA_SYNC_CLASSES.map((c) => `${c.eywaClassId} ${c.name}`)).toEqual([
      `${MS1A} 초등M 초5 MS1A`,
      `${MS2A} 중등M 초6 MS2A`,
    ]);
  });

  it("기본 범위는 그 둘뿐이다", () => {
    expect([...scopedClassIds({})].sort()).toEqual([MS1A, MS2A].sort());
  });

  it("환경변수로 덮어쓸 수 있다 — 시험·조사용", () => {
    const ids = scopedClassIds({
      EYWA_SYNC_CLASS_IDS: " aaa , bbb ",
    });
    expect([...ids].sort()).toEqual(["aaa", "bbb"]);
  });

  it("🔴 **빈 문자열은 「전부」가 아니다** — 오타 하나로 68반이 돌아오면 안 된다", () => {
    for (const raw of ["", "   "]) {
      const ids = scopedClassIds({
        EYWA_SYNC_CLASS_IDS: raw,
      });
      expect([...ids].sort(), `«${raw}»`).toEqual([MS1A, MS2A].sort());
    }
  });

  it("🔴 설정했는데 id 가 하나도 없으면 **멈춘다** — 조용히 0건 동기화하지 않는다", () => {
    // 이 검사가 실제 결함을 잡았다(2026-08-25): `","` 는 범위를 **빈 집합**으로 만들어
    // 매일 「0건」을 «성공»으로 찍게 되어 있었다. 에러도 경고도 없는 침묵하는 실패다.
    // ⚠️ 기본값으로 되돌리는 것도 답이 아니다 — 사람이 **좁히려고** 설정한 것이라
    //    조용히 넓히는 쪽이 더 나쁘다.
    for (const raw of [",", " , ", ",,,"])
      expect(
        () => scopedClassIds({ EYWA_SYNC_CLASS_IDS: raw }),
        `«${raw}»`,
      ).toThrow(/반 id 가 하나도 없다/);
  });

  it("이름이 원본과 다르면 신고한다 — 목록이 낡았다는 본문 밖 근거", () => {
    const 원본 = new Map([
      [MS1A, "초등M 초5 MS1A"],
      [MS2A, "중등M 초6 MS2B"], // 바뀐 이름
    ]);
    const bad = scopeNameMismatches(원본);
    expect(bad).toEqual([
      {
        eywaClassId: MS2A,
        expected: "중등M 초6 MS2A",
        actual: "중등M 초6 MS2B",
      },
    ]);
  });

  it("원본에 그 반이 아예 없으면 «이름 다름»으로 신고하지 않는다", () => {
    // 사라진 반은 다른 사유다(종강·id 오기). 둘을 같은 줄로 뭉개면 고치는 법이 갈린다.
    expect(scopeNameMismatches(new Map())).toEqual([]);
  });
});
