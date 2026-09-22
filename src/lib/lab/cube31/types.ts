export type CubeOperation = "add" | "subtract";

export type CubeField = {
  id: string;
  label: string;
  answer: string;
  suffix?: string;
};
export type CubeChoice = { label: string; value: string };
export type CubeVisual =
  | {
      type: "column";
      a: number;
      b: number;
      operation: CubeOperation;
      wrongResult?: number;
    }
  | {
      type: "bars";
      labels: string[];
      values: number[];
      operation?: CubeOperation;
    }
  | { type: "machine"; start: number; operations: string[] }
  | { type: "equation"; lines: string[] };

export type CubeTask = {
  id: string;
  title: string;
  instruction: string;
  sourcePages: number[];
  hint: string;
  explanation: string;
} & (
  | { kind: "regroup"; a: number; b: number; operation: CubeOperation }
  | {
      kind: "question";
      fields?: CubeField[];
      choices?: CubeChoice[];
      correctChoice?: string;
      visual?: CubeVisual;
    }
  | {
      kind: "cards";
      digits: number[];
      order: "largest" | "smallest";
      add: number;
      operation?: CubeOperation;
    }
  | { kind: "estimate"; a: number; b: number; operation: CubeOperation }
  | {
      kind: "repair";
      a: number;
      b: number;
      operation: CubeOperation;
      wrongResult: number;
      wrongPlace: number;
      reason: string;
      reasons: CubeChoice[];
    }
  | { kind: "puzzle" }
);

export type CubeLesson = {
  id: string;
  title: string;
  subtitle: string;
  pages: string;
  goal: string;
  tasks: CubeTask[];
};

/** Generated on the server by the existing elementary engine; no engine bundle in the browser. */
export type CubePractice = {
  id: string;
  a: number;
  b: number;
  operation: CubeOperation;
  answer: number;
  concept:
    | "add-none"
    | "add-once"
    | "add-many"
    | "subtract-none"
    | "subtract-once"
    | "subtract-twice";
};
