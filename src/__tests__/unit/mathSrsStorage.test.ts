import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addLearner,
  createStore,
  loadStore,
  saveStore,
  selectLearner,
  STORAGE_KEY,
  updateLearner,
} from "@/lib/math-srs/storage";
import { CONCEPT_IDS, type Mission, type SrsStore } from "@/lib/math-srs/types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function mission(index = 0, answered = 12): Mission {
  const startedAt = new Date(Date.UTC(2026, 0, 1 + index)).toISOString();
  const problems = Array.from({ length: 12 }, (_, problemIndex) => ({
    id: `problem-${index}-${problemIndex}`,
    templateId: "balance-add",
    conceptId: CONCEPT_IDS[problemIndex % CONCEPT_IDS.length],
    conceptWeights: [
      { conceptId: CONCEPT_IDS[problemIndex % CONCEPT_IDS.length], weight: 1 },
    ],
    difficulty: 1 as const,
    kind: "warmup" as const,
    prompt: "x의 값을 구하세요.",
    equation: "x + 3 = 5",
    answer: 2,
    hint: "양변에서 3을 빼세요.",
    solution: ["양변에서 3을 빼면 x = 2입니다."],
    expectedSeconds: 30,
  }));
  const attempts = problems.slice(0, answered).map((problem, problemIndex) => ({
    problemId: problem.id,
    conceptId: problem.conceptId,
    templateId: problem.templateId,
    kind: problem.kind,
    submittedAnswer: problemIndex === 0 ? "3" : "2",
    correct: problemIndex !== 0,
    rating: problemIndex === 0 ? ("again" as const) : ("good" as const),
    usedHint: problemIndex === 0,
    elapsedSeconds: 20,
    answeredAt: new Date(
      Date.parse(startedAt) + (problemIndex + 1) * 20_000,
    ).toISOString(),
  }));
  return {
    id: `mission-${index}`,
    date: startedAt.slice(0, 10),
    seed: index,
    startedAt,
    completedAt: answered === 12 ? attempts.at(-1)!.answeredAt : null,
    problems,
    attempts,
  };
}

function populatedStore(): SrsStore {
  const store = createStore();
  store.learners[0].missions = [mission()];
  store.learners[0].memories = store.learners[0].memories.map(
    (memory, index) => ({
      ...memory,
      mastery: index === 0 ? 30 : 50,
      attempts: 2,
      successes: index === 0 ? 1 : 2,
      stabilityDays: 2,
      lastReviewedAt: "2026-01-01T00:04:00.000Z",
      nextReviewAt: "2026-01-03T00:04:00.000Z",
    }),
  );
  return store;
}

afterEach(() => vi.unstubAllGlobals());

describe("Math SRS browser persistence", () => {
  it("starts with one real local profile and no invented learning history", () => {
    const store = createStore();
    expect(store.version).toBe(1);
    expect(STORAGE_KEY).toContain("v1");
    expect(store.learners).toHaveLength(1);
    expect(store.activeLearnerId).toBe(store.learners[0].id);
    expect(store.learners[0].name).toBe("나의 학습");
    expect(store.learners[0].missions).toEqual([]);
    expect(store.learners[0].memories).toEqual(
      CONCEPT_IDS.map((conceptId) => ({
        conceptId,
        mastery: 0,
        stabilityDays: 1,
        lastReviewedAt: null,
        nextReviewAt: null,
        attempts: 0,
        successes: 0,
      })),
    );
  });

  it("does not write anything just by loading an empty browser", () => {
    const storage = new MemoryStorage();
    expect(loadStore(storage).warning).toBeNull();
    expect(storage.length).toBe(0);
  });

  it("roundtrips a completed mission, memories, hints, answers, and multiple profiles", () => {
    const storage = new MemoryStorage();
    const store = addLearner(populatedStore(), "두 번째");
    expect(saveStore(store, storage)).toEqual({ ok: true, warning: null });
    expect(loadStore(storage)).toEqual({ store, warning: null });
  });

  it("roundtrips an unfinished mission at the next unanswered problem", () => {
    const storage = new MemoryStorage();
    const store = populatedStore();
    store.learners[0].missions = [mission(0, 4)];
    expect(saveStore(store, storage).ok).toBe(true);
    expect(
      loadStore(storage).store.learners[0].missions[0].attempts,
    ).toHaveLength(4);
    expect(
      loadStore(storage).store.learners[0].missions[0].completedAt,
    ).toBeNull();
  });

  it("preserves existing engine provenance and a full math prompt without a duplicate equation", () => {
    const storage = new MemoryStorage();
    const store = populatedStore();
    store.learners[0].missions[0].problems[0] = {
      ...store.learners[0].missions[0].problems[0],
      prompt: "방정식 $x+3=5$의 해를 구하시오.",
      equation: "",
      source: {
        engine: "middle",
        typeKey: "M1|equation|1",
        title: "등식의 성질",
        tier: "기본",
        seed: 123,
        requestedDifficulty: 2,
      },
    };
    expect(saveStore(store, storage)).toEqual({ ok: true, warning: null });
    expect(loadStore(storage)).toEqual({ store, warning: null });
    const invalid = structuredClone(store);
    invalid.learners[0].missions[0].problems[0].source!.seed = -1;
    expect(saveStore(invalid, storage).ok).toBe(false);
    expect(loadStore(storage).store).toEqual(store);
  });

  it("returns a warning during SSR and can use an explicitly supplied storage without window", () => {
    vi.stubGlobal("window", undefined);
    expect(loadStore().warning).toBeTruthy();
    expect(saveStore(createStore()).ok).toBe(false);
    const storage = new MemoryStorage();
    expect(saveStore(createStore(), storage).ok).toBe(true);
    expect(loadStore(storage).warning).toBeNull();
  });

  it("handles browser access denial without crashing", () => {
    vi.stubGlobal("window", {
      get localStorage() {
        throw new DOMException("Denied", "SecurityError");
      },
    });
    expect(loadStore().warning).toBeTruthy();
    expect(saveStore(createStore()).ok).toBe(false);
  });

  it("handles getItem denial without attempting a destructive write", () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const write = vi.spyOn(storage, "setItem");
    expect(loadStore(storage).warning).toBeTruthy();
    expect(saveStore(createStore(), storage).ok).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it.each(["{broken", "null", "[]", "{}", '{"version":2}', '{"version":"1"}'])(
    "preserves malformed or unsupported existing storage: %s",
    (raw) => {
      const storage = new MemoryStorage();
      storage.setItem(STORAGE_KEY, raw);
      const loaded = loadStore(storage);
      expect(loaded.warning).toBeTruthy();
      expect(loaded.store.learners[0].missions).toEqual([]);
      expect(saveStore(loaded.store, storage).ok).toBe(false);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    },
  );

  it("preserves the last successful save when storage quota is exhausted", () => {
    const storage = new MemoryStorage();
    const previous = populatedStore();
    saveStore(previous, storage);
    const raw = storage.getItem(STORAGE_KEY);
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    const result = saveStore(addLearner(previous, "새 학습자"), storage);
    expect(result.ok).toBe(false);
    expect(result.warning).toContain("저장 공간");
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });

  it("keeps the newest 90 missions on save without changing in-memory history or lifetime memories", () => {
    const storage = new MemoryStorage();
    const store = populatedStore();
    store.learners[0].missions = Array.from({ length: 92 }, (_, index) =>
      mission(index, 0),
    );
    expect(saveStore(store, storage).ok).toBe(true);
    const saved = loadStore(storage).store.learners[0];
    expect(saved.missions).toHaveLength(90);
    expect(saved.missions[0].id).toBe("mission-91");
    expect(saved.missions.at(-1)!.id).toBe("mission-2");
    expect(saved.memories).toEqual(store.learners[0].memories);
    expect(store.learners[0].missions).toHaveLength(92);
  });

  it("leaves unrelated application storage untouched", () => {
    const storage = new MemoryStorage();
    storage.setItem("another-feature", "keep");
    saveStore(createStore(), storage);
    expect(storage.getItem("another-feature")).toBe("keep");
  });
});

describe("Math SRS local learners", () => {
  it("trims names, selects the new learner, and keeps each profile's history isolated", () => {
    const first = populatedStore();
    const original = structuredClone(first);
    const second = addLearner(first, "  민수  ");
    expect(first).toEqual(original);
    expect(second.activeLearnerId).toBe(second.learners[1].id);
    expect(second.learners[1].name).toBe("민수");
    expect(second.learners[1].missions).toEqual([]);
    expect(second.learners[1].memories[0].attempts).toBe(0);
    expect(second.learners[0]).toBe(first.learners[0]);
    expect(selectLearner(second, first.activeLearnerId).activeLearnerId).toBe(
      first.activeLearnerId,
    );
    expect(second.activeLearnerId).not.toBe(first.activeLearnerId);
  });

  it.each(["", "   ", "x".repeat(21), "안녕\n친구"])(
    "rejects invalid learner name %j",
    (name) => {
      expect(() => addLearner(createStore(), name)).toThrow();
    },
  );

  it("rejects duplicate names regardless of surrounding whitespace and case", () => {
    const store = addLearner(createStore(), "Alex");
    expect(() => addLearner(store, "  ALEX ")).toThrow("이미 사용");
  });

  it("allows exactly twelve profiles", () => {
    let store = createStore();
    for (let index = 1; index < 12; index++)
      store = addLearner(store, `학생 ${index}`);
    expect(store.learners).toHaveLength(12);
    expect(() => addLearner(store, "학생 13")).toThrow("최대 12명");
  });

  it("updates only an existing learner and preserves the selected learner", () => {
    const store = addLearner(populatedStore(), "다른 학생");
    const changed = { ...store.learners[0], name: "나의 새 이름" };
    const updated = updateLearner(store, changed);
    expect(updated.learners[0]).toBe(changed);
    expect(updated.learners[1]).toBe(store.learners[1]);
    expect(updated.activeLearnerId).toBe(store.activeLearnerId);
    expect(store.learners[0].name).toBe("나의 학습");
    expect(() => updateLearner(store, { ...changed, id: "unknown" })).toThrow();
    expect(() => selectLearner(store, "unknown")).toThrow();
    expect(() =>
      updateLearner(store, { ...changed, name: "다른 학생" }),
    ).toThrow();
  });
});

const corruptions: [string, (store: SrsStore) => void][] = [
  [
    "missing active learner",
    (store) => {
      store.activeLearnerId = "missing";
    },
  ],
  [
    "duplicate learner ids",
    (store) => {
      store.learners.push(structuredClone(store.learners[0]));
    },
  ],
  [
    "missing concept",
    (store) => {
      store.learners[0].memories.pop();
    },
  ],
  [
    "duplicate concept",
    (store) => {
      store.learners[0].memories[0].conceptId = "word";
    },
  ],
  [
    "mastery out of range",
    (store) => {
      store.learners[0].memories[0].mastery = 101;
    },
  ],
  [
    "successes greater than attempts",
    (store) => {
      store.learners[0].memories[0].successes = 3;
    },
  ],
  [
    "fractional attempts",
    (store) => {
      store.learners[0].memories[0].attempts = 2.5;
    },
  ],
  [
    "zero stability",
    (store) => {
      store.learners[0].memories[0].stabilityDays = 0;
    },
  ],
  [
    "invalid calendar date",
    (store) => {
      store.learners[0].memories[0].nextReviewAt = "2026-02-30T00:00:00.000Z";
    },
  ],
  [
    "next review before previous review",
    (store) => {
      store.learners[0].memories[0].nextReviewAt = "2025-01-01T00:00:00.000Z";
    },
  ],
  [
    "missing reviewed date",
    (store) => {
      store.learners[0].memories[0].lastReviewedAt = null;
    },
  ],
  [
    "wrong problem count",
    (store) => {
      store.learners[0].missions[0].problems.pop();
    },
  ],
  [
    "duplicate problem ids",
    (store) => {
      store.learners[0].missions[0].problems[1].id =
        store.learners[0].missions[0].problems[0].id;
    },
  ],
  [
    "duplicate missions",
    (store) => {
      store.learners[0].missions.push(
        structuredClone(store.learners[0].missions[0]),
      );
    },
  ],
  [
    "duplicate attempts",
    (store) => {
      store.learners[0].missions[0].attempts[1] = structuredClone(
        store.learners[0].missions[0].attempts[0],
      );
    },
  ],
  [
    "skipped problem",
    (store) => {
      store.learners[0].missions[0].attempts.shift();
    },
  ],
  [
    "wrong attempt concept",
    (store) => {
      store.learners[0].missions[0].attempts[0].conceptId = "word";
    },
  ],
  [
    "wrong attempt template",
    (store) => {
      store.learners[0].missions[0].attempts[0].templateId = "other";
    },
  ],
  [
    "wrong attempt kind",
    (store) => {
      store.learners[0].missions[0].attempts[0].kind = "boss";
    },
  ],
  [
    "completedAt missing on complete mission",
    (store) => {
      store.learners[0].missions[0].completedAt = null;
    },
  ],
  [
    "completedAt set on incomplete mission",
    (store) => {
      store.learners[0].missions[0].attempts.pop();
    },
  ],
  [
    "completion before last answer",
    (store) => {
      store.learners[0].missions[0].completedAt =
        store.learners[0].missions[0].startedAt;
    },
  ],
  [
    "answer before mission start",
    (store) => {
      store.learners[0].missions[0].attempts[0].answeredAt =
        "2025-01-01T00:00:00.000Z";
    },
  ],
  [
    "answer timestamps out of order",
    (store) => {
      store.learners[0].missions[0].attempts[1].answeredAt =
        store.learners[0].missions[0].startedAt;
    },
  ],
  [
    "negative duration",
    (store) => {
      store.learners[0].missions[0].attempts[0].elapsedSeconds = -1;
    },
  ],
  [
    "invalid mission day",
    (store) => {
      store.learners[0].missions[0].date = "2026-02-30";
    },
  ],
  [
    "negative seed",
    (store) => {
      store.learners[0].missions[0].seed = -1;
    },
  ],
  [
    "no weighted concepts",
    (store) => {
      store.learners[0].missions[0].problems[0].conceptWeights = [];
    },
  ],
  [
    "negative concept weight",
    (store) => {
      store.learners[0].missions[0].problems[0].conceptWeights[0].weight = -1;
    },
  ],
  [
    "missing primary concept weight",
    (store) => {
      store.learners[0].missions[0].problems[0].conceptWeights[0].conceptId =
        "word";
    },
  ],
  [
    "difficulty out of bounds",
    (store) => {
      store.learners[0].missions[0].problems[0].difficulty = 9 as 1;
    },
  ],
  [
    "unexpected nested field",
    (store) => {
      Object.assign(store.learners[0].missions[0].problems[0], {
        html: "<script>bad</script>",
      });
    },
  ],
];

describe("Math SRS stored data validation", () => {
  it.each(corruptions)(
    "rejects %s on load and save while preserving the original bytes",
    (_name, corrupt) => {
      const storage = new MemoryStorage();
      const store = populatedStore();
      corrupt(store);
      const raw = JSON.stringify(store);
      storage.setItem(STORAGE_KEY, raw);
      expect(loadStore(storage).warning).toBeTruthy();
      expect(saveStore(store, storage).ok).toBe(false);
      expect(saveStore(createStore(), storage).ok).toBe(false);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    },
  );

  it.each([NaN, Infinity, -Infinity])(
    "refuses nonfinite numbers before JSON can coerce them: %s",
    (answer) => {
      const storage = new MemoryStorage();
      const store = populatedStore();
      store.learners[0].missions[0].problems[0].answer = answer;
      expect(saveStore(store, storage).ok).toBe(false);
      expect(storage.length).toBe(0);
    },
  );

  it("rejects fabricated estimates on an unassessed concept", () => {
    const store = createStore();
    store.learners[0].memories[0].mastery = 50;
    expect(saveStore(store, new MemoryStorage()).ok).toBe(false);
  });

  it("rejects overlarge serialized content without modifying it", () => {
    const storage = new MemoryStorage();
    const raw = " ".repeat(12_000_001);
    storage.setItem(STORAGE_KEY, raw);
    expect(loadStore(storage).warning).toBeTruthy();
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });
});
