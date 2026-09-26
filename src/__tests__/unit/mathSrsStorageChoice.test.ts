import { describe, expect, it } from "vitest";
import { createStore, loadStore, saveStore } from "@/lib/math-srs/storage";
import type { GeneratedProblem, SrsStore } from "@/lib/math-srs/types";

// 연구실(브라우저 저장) 기록도 서버와 같은 규칙으로 보기형 문항을 받는다 — 미션 생성기가
// 서버·연구실 공용이라, 보기형을 켜는 날 연구실 기록이 «읽을 수 없음»이 되지 않게.
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

const STEP = ["$3x-3$", "$3x+3$", "$5x-3$", "$5x+3$"];
function store(change: (p: GeneratedProblem) => void = () => {}): SrsStore {
  const result = createStore();
  const problems: GeneratedProblem[] = Array.from({ length: 12 }, (_, i) => ({
    id: `problem-${i}`,
    templateId: i % 2 ? "quick-distribute" : "balance-add",
    conceptId: i % 2 ? "distribute" : "balance",
    conceptWeights: [
      { conceptId: i % 2 ? "distribute" : "balance", weight: 1 },
    ],
    difficulty: 1,
    kind: "quick",
    prompt: i % 2 ? "$4x-(x-3)$ 을 간단히 하면?" : "x의 값을 구하세요.",
    equation: i % 2 ? "" : "x + 3 = 5",
    ...(i % 2 ? { answer: i % 4, choices: [...STEP] } : { answer: 2 }),
    hint: "힌트",
    solution: ["풀이"],
    expectedSeconds: 20,
  }));
  change(problems[1]);
  result.learners[0].missions = [
    {
      id: "mission-choice",
      date: "2026-09-26",
      seed: 1,
      startedAt: "2026-09-26T03:00:00.000Z",
      completedAt: null,
      problems,
      attempts: [],
    },
  ];
  return result;
}

describe("연구실 저장의 보기형 문항", () => {
  it("보기형과 숫자형이 섞인 미션을 저장하고 그대로 불러온다", () => {
    const storage = new MemoryStorage();
    const saved = store();
    expect(saveStore(saved, storage)).toEqual({ ok: true, warning: null });
    expect(loadStore(storage)).toEqual({ store: saved, warning: null });
  });

  it.each<[string, (p: GeneratedProblem) => void]>([
    ["보기 3개", (p) => void p.choices!.pop()],
    ["보기 중복", (p) => void (p.choices![3] = p.choices![0])],
    ["정답 번호가 보기 밖", (p) => void (p.answer = 4)],
    ["숫자 정답 표기가 같이 있음", (p) => void (p.answerText = "$3x+3$")],
  ])("%s 인 기록은 읽지 않는다", (_, corrupt) => {
    const storage = new MemoryStorage();
    storage.setItem("todays-math:srs:v1", JSON.stringify(store(corrupt)));
    const loaded = loadStore(storage);
    expect(loaded.warning).not.toBeNull();
    expect(loaded.store.learners[0].missions).toEqual([]);
  });
});
