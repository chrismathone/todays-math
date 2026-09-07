/**
 * 지원 학년 — 원장님 확정 2026-09-07 「고등은 일단 패스, 초3~중3만으로」.
 *
 * 목록이 **손으로 적은 것**이라 두 가지가 조용히 깨질 수 있다:
 * ㉠ 학년 이름 오타·개정 → 걸러 낸 목록이 **통째로 빈다**(화면에 고를 것이 없다)
 * ㉡ 새 학년 콘텐츠가 들어와도 이 목록에 없으면 **구조적으로 안 보인다**
 *
 * ㉠ 은 여기서 잠그고, ㉡ 은 모듈 주석의 실측을 다시 내는 것으로만 알 수 있다(그렇게 적어 뒀다).
 */
import { describe, expect, it } from "vitest";

import {
  SUPPORTED_GRADES,
  isSupportedGrade,
  onlySupportedGrades,
} from "@/contracts/supportedGrades";

const u = (grade: string, id = grade) => ({ id, grade });

describe("SUPPORTED_GRADES", () => {
  it("초3~중3 일곱 학년이다 — 2026-09-07 실측으로 문항이 있는 학년 전부", () => {
    expect([...SUPPORTED_GRADES]).toEqual([
      "초3",
      "초4",
      "초5",
      "초6",
      "중1",
      "중2",
      "중3",
    ]);
  });

  it("문항이 0건인 학년은 지원하지 않는다 — 고르게 두면 막다른 길이다", () => {
    for (const grade of [
      "초1",
      "초2",
      "공통수학1",
      "공통수학2",
      "대수",
      "미적분1",
      "미적분2",
      "확률과 통계",
      "기하",
    ]) {
      expect(isSupportedGrade(grade), `${grade} 는 문항이 0건이다`).toBe(false);
    }
  });
});

describe("onlySupportedGrades", () => {
  it("지원 밖 학년을 빼고 **차례는 그대로** 둔다", () => {
    const units = [u("초1"), u("초3"), u("미적분2"), u("중2"), u("초2")];
    expect(onlySupportedGrades(units).map((x) => x.grade)).toEqual([
      "초3",
      "중2",
    ]);
  });

  it("전부 지원 학년이면 그대로다 — 반증 쪽", () => {
    const units = [u("초3"), u("중1"), u("중3")];
    expect(onlySupportedGrades(units)).toHaveLength(3);
  });

  it("🔴 전부 빠지면 **안 걸러진 것**을 준다 — 조용히 빈 목록을 주면 원장이 아무것도 못 한다", () => {
    const units = [u("고1"), u("고2")];
    expect(onlySupportedGrades(units).map((x) => x.grade)).toEqual([
      "고1",
      "고2",
    ]);
  });

  it("빈 입력은 빈 채로 — 「고를 것이 없다」와 「좁히기가 실패했다」를 섞지 않는다", () => {
    expect(onlySupportedGrades([])).toEqual([]);
  });
});
