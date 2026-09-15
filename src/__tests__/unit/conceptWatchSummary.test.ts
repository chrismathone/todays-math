/**
 * 「끝까지 본 학생 n/m」 집계 (D-124 ⑺ 시청 기록을 모은다 · D-125 ⑹ 안 본 학생 이름까지).
 *
 * 원장님 화면에 반마다 «이 강의를 끝까지 본 학생이 몇 명 중 몇 명인가»를 보이고, 그것을
 * 누르면 **아직 안 본 학생**이 펼쳐진다(D-125 ⑹). 입력은 반 학생 목록 × 시청 기록
 * (`ConceptLectureView`)이다. 안 본 학생은 id 로 주고 이름은 부르는 쪽이 붙인다.
 *
 * 분모를 먼저 검산한다 — 이 저장소가 여러 번 데인 자리다(「분모를 검산하라」 2026-08-18).
 *  - **퇴원 학생**(`eywaWithdrawnAt` 이 찍힌 학생)은 분모에서 뺀다. 행을 지우지 않는 이유는
 *    시험 이력이 딸려 있어서다(schema.prisma `Student.eywaWithdrawnAt` 주석) — 그래서 반 목록에
 *    그대로 남아 있고, 빼지 않으면 «안 본 학생»으로 영영 남는다.
 *  - 분자는 분모 안에서만 센다 — 퇴원한 학생이 끝까지 봤어도, 다른 반 학생의 기록이어도 안 센다.
 *  - «끝까지 봤다» = 완료 시각이 찍혔다(95% — `watchRules.mergeWatchRecord`). 보다 만 것은 안 센다.
 *  - 그래서 늘 **n + 안 본 학생 수 = m** 이다.
 */
import { describe, expect, it } from "vitest";

import { countWatchedToEnd } from "@/lib/concept/watchSummary";

const LECTURE = "lecture-a";
const OTHER = "lecture-b";
const DONE = new Date("2026-09-15T03:00:00Z");
const WITHDRAWN = new Date("2026-09-01T00:00:00Z");

const student = (id: string, withdrawn: Date | null = null) => ({
  id,
  eywaWithdrawnAt: withdrawn,
});
const view = (
  studentId: string,
  completedAt: Date | null,
  lectureId = LECTURE,
) => ({ studentId, lectureId, completedAt });

describe("끝까지 본 학생 n/m", () => {
  it("반 학생 셋 중 둘이 끝까지 봤다", () => {
    expect(
      countWatchedToEnd(
        [student("s1"), student("s2"), student("s3")],
        [view("s1", DONE), view("s2", DONE)],
        LECTURE,
      ),
    ).toEqual({ watched: 2, total: 3, pending: ["s3"] });
  });

  it("🔴 퇴원 학생은 분모에서 뺀다 — 끝까지 봤어도 분자에서도 뺀다", () => {
    expect(
      countWatchedToEnd(
        [
          student("s1"),
          student("s2"),
          student("s3"),
          student("gone", WITHDRAWN),
        ],
        [view("s1", DONE), view("gone", DONE)],
        LECTURE,
      ),
    ).toEqual({ watched: 1, total: 3, pending: ["s2", "s3"] });
  });

  it("🔴 끝까지 본 것만 센다 — 보다 만 학생은 분자에 없다", () => {
    expect(
      countWatchedToEnd(
        [student("s1"), student("s2")],
        [view("s1", DONE), view("s2", null)],
        LECTURE,
      ),
    ).toEqual({ watched: 1, total: 2, pending: ["s2"] });
  });

  it("🔴 다른 강의의 기록은 세지 않는다", () => {
    expect(
      countWatchedToEnd(
        [student("s1"), student("s2")],
        [view("s1", DONE, OTHER), view("s2", DONE)],
        LECTURE,
      ),
    ).toEqual({ watched: 1, total: 2, pending: ["s1"] });
  });

  it("🔴 반 밖 학생의 기록은 세지 않는다 — n 이 m 을 넘지 않는다", () => {
    expect(
      countWatchedToEnd(
        [student("s1")],
        [view("s1", DONE), view("other-class", DONE)],
        LECTURE,
      ),
    ).toEqual({ watched: 1, total: 1, pending: [] });
  });

  it("같은 학생이 목록에 두 번 와도 한 명으로 센다", () => {
    expect(
      countWatchedToEnd(
        [student("s1"), student("s1"), student("s2")],
        [view("s1", DONE), view("s1", DONE)],
        LECTURE,
      ),
    ).toEqual({ watched: 1, total: 2, pending: ["s2"] });
  });

  it("학생이 없으면 0/0 — 나누지 않는다(비율은 화면이 정한다)", () => {
    expect(countWatchedToEnd([], [view("s1", DONE)], LECTURE)).toEqual({
      watched: 0,
      total: 0,
      pending: [],
    });
  });

  it("🔴 안 본 학생은 반 목록 순서대로 준다 — n + 안 본 수 = m (D-125 ⑹)", () => {
    const r = countWatchedToEnd(
      [student("s3"), student("s1"), student("gone", WITHDRAWN), student("s2")],
      [view("s1", DONE), view("s2", null)],
      LECTURE,
    );
    expect(r.pending).toEqual(["s3", "s2"]);
    expect(r.watched + r.pending.length).toBe(r.total);
  });
});
