import { describe, expect, it } from "vitest";
import { emptyMomentum, recordLabSuccess } from "@/lib/lab/cube31/momentum";

describe("lab session momentum", () => {
  it("counts distinct solved activities and celebrates each fifth discovery", () => {
    let state = emptyMomentum;
    for (let i = 0; i < 5; i++)
      state = recordLabSuccess(state, `task-${i}`, true);
    expect(state.solved).toHaveLength(5);
    expect(state.streak).toBe(5);
    expect(state.celebration).toMatchObject({
      total: 5,
      milestone: true,
      review: false,
    });
    const replay = recordLabSuccess(state, "task-0", true);
    expect(replay.solved).toHaveLength(5);
    expect(replay.streak).toBe(5);
    expect(replay.celebration).toMatchObject({
      milestone: false,
      review: true,
    });
  });

  it("still rewards a corrected answer without claiming an independent streak", () => {
    const first = recordLabSuccess(emptyMomentum, "first", true);
    const second = recordLabSuccess(first, "second", true);
    const corrected = recordLabSuccess(second, "third", false);
    expect(corrected.solved).toHaveLength(3);
    expect(corrected.streak).toBe(0);
    expect(corrected.best).toBe(2);
    expect(corrected.celebration?.clean).toBe(false);
    expect(recordLabSuccess(corrected, "fourth", true).streak).toBe(1);
    expect(emptyMomentum.solved).toEqual([]);
  });
});
