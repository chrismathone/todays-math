export type ActivityKind =
  | "recall"
  | "predict"
  | "manipulate"
  | "observe"
  | "reason"
  | "apply"
  | "error-hunt"
  | "rhythm"
  | "explain";

export type AwardKind = "observe" | "correct" | "independent";

export type ChoiceOption = { id: string; label: string };

export type HeightMap = number[][];

export type NetCell = readonly [number, number];

export type EngineSpec =
  | {
      type: "choice";
      prompt?: string;
      options: ChoiceOption[];
      correct: string | string[];
      diagram?: "cube-net";
    }
  | {
      type: "number";
      label: string;
      unit?: string;
      correct: number;
      allowed?: number[];
      diagram?: "cube-net";
    }
  | {
      type: "compare";
      left: number;
      right: number;
      longer: "left" | "right" | "same";
    }
  | {
      type: "ruler";
      objectStart: number;
      objectEnd: number;
      rulerZero: number;
      mode: "align" | "offset";
      max: number;
      picks?: ChoiceOption[];
    }
  | { type: "cover"; length: number }
  | {
      type: "area-cut";
      base: number;
      height: number;
      skew: number;
    }
  | { type: "unit-squares"; cols: number; rows: number }
  | {
      type: "error-hunt";
      scenes: { id: string; title: string; detail: string }[];
      wrong: string;
    }
  | {
      type: "cube-fold";
      model: "cube" | "cuboid";
      fromFace: string;
      correct: string;
      choices: string[];
      foldable?: boolean;
    }
  | {
      type: "net-pick";
      nets: { id: string; cells: NetCell[]; label: string }[];
      correct: string[];
    }
  | {
      type: "stack-view";
      heights: HeightMap;
      question: "count" | "front" | "hidden-front" | "ambiguous";
      correct: number | string;
      picks?: ChoiceOption[];
    }
  | { type: "stack-build"; target: HeightMap }
  | { type: "bundle"; total: number }
  | { type: "fraction-bar"; parts: number; filled: number }
  | {
      type: "symmetry";
      rows: number;
      cols: number;
      axis: "v" | "h";
      seed: NetCell[];
    }
  | { type: "machine"; pairs: [number, number][] }
  | { type: "ratio"; a: number; b: number; copies: number }
  | { type: "share"; total: number; groups: number }
  | { type: "clock"; hour: number; minute: number }
  | { type: "angle"; degrees: number }
  | { type: "nline"; min: number; max: number; target: number }
  | {
      type: "chart";
      kind: "bar" | "line";
      values: number[];
      labels: string[];
      cutMin?: number;
      options: ChoiceOption[];
      correct: string;
    }
  | { type: "level"; piles: number[]; target: number }
  | { type: "surface"; l: number; w: number; h: number }
  | {
      type: "solid";
      shape: "cylinder" | "cone" | "sphere";
      options: ChoiceOption[];
      correct: string;
    };

export type Hint = {
  id: string;
  text: string;
  backTo?: string;
};

export type ActivityDef = {
  id: string;
  kind: ActivityKind;
  title: string;
  intro: string;
  engine: EngineSpec;
  hints: Hint[];
  success: string;
  wrong: string;
};

export type CourseDef = {
  id: string;
  title: string;
  gradeLabel: string;
  unitIds: string[];
  summary: string;
  flow: string;
  activities: ActivityDef[];
};

export type UnitRecord = {
  id: string;
  grade: number;
  semester: number;
  unit: number;
  title: string;
  engine: string;
  domain: string;
  concept: string;
  action: string;
  evidence: string;
  limit: string;
  blender: string;
  demos: string[];
  source: string;
  status: "implemented" | "partial" | "hold" | "excluded";
  gate: "play" | "hold" | "exclude";
  scopeReason: string;
  excludeKind?: "physical" | "drill" | "field-data";
  courses: string[];
};

export type LabEvent = {
  at: number;
  courseId: string;
  activityId: string;
  type: "start" | "attempt" | "hint" | "resume";
  ok?: boolean;
  firstAttempt: boolean;
  usedHint: boolean;
};

export type ActivityRecord = {
  started: boolean;
  attempts: number;
  wrongs: number;
  hints: number;
  observeAt?: number;
  correctAt?: number;
  independent: boolean;
  completed: boolean;
};

export type CourseRecord = {
  index: number;
  activities: Record<string, ActivityRecord>;
};

export type LabSave = {
  v: 1;
  sound: boolean;
  reducedMotion: boolean;
  combo: number;
  xp: number;
  earned: string[];
  courses: Record<string, CourseRecord>;
  events: LabEvent[];
};

export type JudgeResult = {
  ok: boolean;
  observe?: boolean;
  message: string;
};
