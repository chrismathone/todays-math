import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  arithmeticDomainSize,
  buildArithmeticSheet,
  validateArithmeticRequest,
  type ArithmeticPrompt,
  type ArithmeticSkillSelection,
} from "@/lib/arithmetic";

export type ArithmeticPreset = {
  id: string;
  title: string;
  group: "덧셈" | "뺄셈" | "곱셈" | "나눗셈";
  description: string;
  selection: ArithmeticSkillSelection;
  defaultCount: number;
  domainSize: number;
  example: ArithmeticPrompt;
};

type Definition = Omit<
  ArithmeticPreset,
  "defaultCount" | "domainSize" | "example"
>;
const range = (min: number, max = min) => ({ min, max });

/** Authored parameter choices, not a corpus of questions or curriculum claims. */
function definitions(): Definition[] {
  const entries: Definition[] = [];
  const add = (
    id: string,
    title: string,
    group: ArithmeticPreset["group"],
    description: string,
    selection: ArithmeticSkillSelection,
  ) => {
    entries.push({ id, title, group, description, selection });
  };

  for (let amount = 1; amount <= 9; amount++) {
    add(
      `add-one-fixed-${amount}-no-carry`,
      `${amount} 더하기 · 받아올림 없음`,
      "덧셈",
      `0~${9 - amount}에 ${amount}만큼 더해 한 자리 합을 구합니다.`,
      {
        skillId: "one-digit-add",
        constraints: {
          carry: "none",
          left: range(0, 9 - amount),
          right: range(amount),
        },
      },
    );
    add(
      `add-one-fixed-${amount}-carry`,
      `${amount} 더하기 · 받아올림 있음`,
      "덧셈",
      `${10 - amount}~9에 ${amount}만큼 더해 10 이상인 합을 구합니다.`,
      {
        skillId: "one-digit-add",
        constraints: {
          carry: "some",
          left: range(10 - amount, 9),
          right: range(amount),
        },
      },
    );
  }
  add(
    "add-one-small-0-4",
    "0~4끼리 더하기",
    "덧셈",
    "두 수를 각각 0~4에서 골라 더합니다.",
    {
      skillId: "one-digit-add",
      constraints: { carry: "none", left: range(0, 4), right: range(0, 4) },
    },
  );
  add(
    "add-one-small-5-9-carry",
    "5~9끼리 더하기",
    "덧셈",
    "두 수를 각각 5~9에서 골라 받아올림이 있는 덧셈을 합니다.",
    {
      skillId: "one-digit-add",
      constraints: { carry: "some", left: range(5, 9), right: range(5, 9) },
    },
  );

  for (let amount = 0; amount <= 9; amount++) {
    add(
      `sub-one-fixed-${amount}`,
      `${amount} 빼기 · 한 자리`,
      "뺄셈",
      `${amount}~9에서 ${amount}만큼 뺍니다. 차는 0 이상입니다.`,
      {
        skillId: "one-digit-sub",
        constraints: { minuend: range(amount, 9), subtrahend: range(amount) },
      },
    );
  }
  add(
    "sub-one-small-0-5",
    "5 이하의 수 빼기",
    "뺄셈",
    "0~5 중 큰 수에서 작거나 같은 수를 뺍니다.",
    {
      skillId: "one-digit-sub",
      constraints: { minuend: range(0, 5), subtrahend: range(0, 5) },
    },
  );
  add(
    "sub-one-from-9",
    "9에서 빼기",
    "뺄셈",
    "9에서 0~9를 빼며 차를 구합니다.",
    {
      skillId: "one-digit-sub",
      constraints: { minuend: range(9), subtrahend: range(0, 9) },
    },
  );

  for (const carry of [0, 1, 2] as const) {
    add(
      `add-two-carry-${carry}`,
      `두 자리 덧셈 · 받아올림 ${carry}회`,
      "덧셈",
      `10~99끼리 세로로 더합니다. 일·십의 자리에서 받아올림이 총 ${carry}회 일어납니다.`,
      {
        skillId: "two-digit-vertical-add",
        constraints: {
          carryCount: carry,
          left: range(10, 99),
          right: range(10, 99),
        },
      },
    );
    for (const amount of [11, 19]) {
      add(
        `add-two-fixed-${amount}-carry-${carry}`,
        `${amount} 더하기 · 받아올림 ${carry}회`,
        "덧셈",
        `두 자리 수에 ${amount}만큼 세로로 더합니다. 받아올림이 총 ${carry}회인 식만 연습합니다.`,
        {
          skillId: "two-digit-vertical-add",
          constraints: {
            carryCount: carry,
            left: range(10, 99),
            right: range(amount),
          },
        },
      );
    }
  }
  for (const amount of [10, 20, 30, 40, 50]) {
    add(
      `add-two-fixed-${amount}-no-carry`,
      `${amount} 더하기 · 두 자리 합`,
      "덧셈",
      `두 자리 수에 ${amount}만큼 더합니다. 합이 100 미만이고 받아올림이 없는 식입니다.`,
      {
        skillId: "two-digit-vertical-add",
        constraints: {
          carryCount: 0,
          left: range(10, 99 - amount),
          right: range(amount),
        },
      },
    );
  }

  for (const borrow of [0, 1] as const) {
    add(
      `sub-two-borrow-${borrow}`,
      `두 자리 뺄셈 · 받아내림 ${borrow}회`,
      "뺄셈",
      `10~99끼리 세로로 뺍니다. 차는 0 이상이고 받아내림이 ${borrow}회인 식입니다.`,
      {
        skillId: "two-digit-vertical-sub",
        constraints: {
          borrowCount: borrow,
          minuend: range(10, 99),
          subtrahend: range(10, 99),
        },
      },
    );
    add(
      `sub-two-fixed-19-borrow-${borrow}`,
      `19 빼기 · 받아내림 ${borrow}회`,
      "뺄셈",
      `19~99에서 19를 세로로 뺍니다. 받아내림이 ${borrow}회인 식만 연습합니다.`,
      {
        skillId: "two-digit-vertical-sub",
        constraints: {
          borrowCount: borrow,
          minuend: range(19, 99),
          subtrahend: range(19),
        },
      },
    );
  }
  for (const amount of [10, 20, 30, 40, 50]) {
    add(
      `sub-two-fixed-${amount}-no-borrow`,
      `${amount} 빼기 · 받아내림 없음`,
      "뺄셈",
      `${amount}~99에서 ${amount}만큼 세로로 뺍니다. 차는 0 이상이고 받아내림이 없습니다.`,
      {
        skillId: "two-digit-vertical-sub",
        constraints: {
          borrowCount: 0,
          minuend: range(amount, 99),
          subtrahend: range(amount),
        },
      },
    );
  }

  for (let dan = 1; dan <= 9; dan++) {
    add(
      `times-table-${dan}`,
      `${dan}단`,
      "곱셈",
      `${dan}에 1~9를 곱하는 구구단을 연습합니다.`,
      {
        skillId: "times-table",
        constraints: { dans: [dan], multiplier: range(1, 9) },
      },
    );
  }
  for (let multiplier = 2; multiplier <= 9; multiplier++) {
    for (const carry of [0, 1, 2] as const) {
      add(
        `multiply-two-by-${multiplier}-carry-${carry}`,
        `${multiplier} 곱하기 · 받아올림 ${carry}회`,
        "곱셈",
        `10~99와 ${multiplier}의 곱을 구합니다. 일·십의 자리 계산에서 받아올림이 총 ${carry}회인 식입니다.`,
        {
          skillId: "two-digit-times-one",
          constraints: {
            carryCount: carry,
            multiplicand: range(10, 99),
            multiplier: range(multiplier),
          },
        },
      );
    }
  }
  for (let divisor = 1; divisor <= 9; divisor++) {
    add(
      `divide-two-by-${divisor}-exact`,
      `두 자리 ÷ ${divisor} · 나머지 0`,
      "나눗셈",
      `나누는 수는 ${divisor}입니다. 10~99에서 나머지가 0인 식만 고릅니다.`,
      {
        skillId: "two-digit-div-one",
        constraints: { dividend: range(10, 99), divisor: range(divisor) },
      },
    );
  }
  return entries;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

let presets: readonly ArithmeticPreset[] | undefined;

/** One verified example per card; large generated sheets are never bundled. */
export function listArithmeticPresets(): readonly ArithmeticPreset[] {
  if (presets) return presets;
  const ids = new Set<string>();
  const selections = new Set<string>();
  presets = freeze(
    definitions().map((definition) => {
      const request = validateArithmeticRequest({
        engineVersion: ARITHMETIC_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_CATALOG_VERSION,
        seed: `preset-example-v1:${definition.id}`,
        rounds: [{ skills: [{ ...definition.selection, count: 1 }] }],
      });
      const allocation = request.rounds[0]!.skills[0]!;
      // The core normalizes property order, ranges and the order of selected tables.
      const selection = {
        skillId: allocation.skillId,
        constraints: allocation.constraints,
      } as ArithmeticSkillSelection;
      const key = JSON.stringify(selection);
      if (ids.has(definition.id) || selections.has(key))
        throw new Error(`Duplicate arithmetic preset: ${definition.id}`);
      ids.add(definition.id);
      selections.add(key);
      const domainSize = arithmeticDomainSize(
        selection.skillId,
        selection.constraints,
      );
      if (domainSize < 1)
        throw new Error(`Empty arithmetic preset: ${definition.id}`);
      const example = buildArithmeticSheet(request).rounds[0]!.items[0]!.prompt;
      return {
        ...definition,
        selection,
        domainSize,
        defaultCount: Math.min(20, domainSize),
        example,
      };
    }),
  );
  return presets;
}

export function findArithmeticPreset(id: string): ArithmeticPreset | undefined {
  return listArithmeticPresets().find((preset) => preset.id === id);
}
