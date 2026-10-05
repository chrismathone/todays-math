/**
 * 구조 전용 편집 칸의 순수 규칙 — 어떤 글 블록에 어떤 칸을 보이고, 한 칸을 고치면 구조가 어떻게 바뀌는가.
 *
 * 지면에 찍히는 글이 본문(markdown)이 아니라 구조(`semantic`)에서 나오는 블록은 본문을 고쳐도 지면이 안 바뀐다
 * (`textPrintsFromStructure`). 그 가운데 교사가 글을 고칠 수 있게 여는 것은 셋이다 —
 * 쓰기 활동(`writing`) · 자동 단원 도입(`auto-unit-intro` 틀의 `unitIntro`) · 판서(`board`).
 * 차례 · 유형 머리 · 원본 조각은 다른 블록 · 조판과 묶여 있어 열지 않는다.
 *
 * 지키는 것:
 * - **본문은 건드리지 않는다.** 조판이 본문의 꼴(제목 한 줄)을 쪽 나눔에 쓴다 — 구조만 바꾼다.
 * - **고친 칸 말고는 아무것도 바뀌지 않는다.** 열어 보기만 하거나 고쳤다가 되돌린 구조는 저장본과 같은 객체다.
 *   그래서 고칠 때마다 «저장본에 지금 값들을 다시 얹는다» — 지웠다 다시 적은 칸도 원래 자리로 돌아온다.
 * - **항목의 개수와 순서는 그대로다**(원장님 2026-10-06 — 1판은 문구만).
 * - 출처 기록(`provenance`)은 원본의 이력이다. 글을 고쳐도 지우지 않고, 지금 문구의 검수 증명으로 읽지도 않는다.
 */
import type { TextbookSemantic } from "@/contracts/textbookSemantic.contract";

type Node = NonNullable<TextbookSemantic["node"]>;

export type StructureField = {
  /** `title` 은 `semantic.title`, `node.…` 는 노드의 칸. 목록은 `node.goals.2` 처럼 번호를 붙인다 */
  key: string;
  /** 지면에 찍히는 제목 그대로 (원장님 2026-10-06) */
  label: string;
  group: string | null;
  /** line = 한 줄, text = 여러 줄, choice = 고르기 */
  input: "line" | "text" | "choice";
  value: string;
  /** 비워 두면 지면에 찍히는 기본 문구 */
  placeholder?: string;
  choices?: readonly string[];
};

export type StructureView = {
  head: string;
  /** 닫힌 모양 — 주요 글과 개수 한 줄 */
  summary: { label: string | null; text: string }[];
  fields: StructureField[];
};

const DEFAULT_INTRO_TITLE = "단원 도입";
const DEFAULT_DATE_LABEL = "공부를 시작한 날";
const LINE_CHOICES = Array.from({ length: 30 }, (_, index) =>
  String(index + 1),
);

type Spec = Omit<StructureField, "value"> & {
  read: (semantic: TextbookSemantic) => string;
  /** 받을 수 없는 값이면 null — 구조를 건드리지 않는다 */
  write: (semantic: TextbookSemantic, value: string) => TextbookSemantic | null;
};

/** 있어도 되고 없어도 되는 칸 — 빈 글은 «칸 없음» 이다(빈 글을 저장하지 않는다) */
function withOptional<T extends object>(
  target: T,
  name: string,
  value: string,
): T {
  if (value !== "") return { ...target, [name]: value };
  if (!(name in target)) return target;
  const rest = { ...target } as Record<string, unknown>;
  delete rest[name];
  return rest as T;
}

function nodeText(
  kind: Node["kind"],
  name: string,
  label: string,
  group: string | null,
  input: StructureField["input"],
  options: { optional?: boolean; placeholder?: string } = {},
): Spec {
  return {
    key: `node.${name}`,
    label,
    group,
    input,
    ...(options.placeholder ? { placeholder: options.placeholder } : {}),
    read: (semantic) => {
      const value = (semantic.node as Record<string, unknown> | undefined)?.[
        name
      ];
      return typeof value === "string" ? value : "";
    },
    write: (semantic, value) => {
      const node = semantic.node;
      if (!node || node.kind !== kind) return null;
      return {
        ...semantic,
        node: options.optional
          ? withOptional(node, name, value)
          : ({ ...node, [name]: value } as Node),
      };
    },
  };
}

function nodeListItem(
  kind: Node["kind"],
  name: string,
  index: number,
  label: string,
  group: string | null,
  input: StructureField["input"],
): Spec {
  const listOf = (semantic: TextbookSemantic) => {
    const list = (semantic.node as Record<string, unknown> | undefined)?.[name];
    return Array.isArray(list) ? (list as string[]) : [];
  };
  return {
    key: `node.${name}.${index}`,
    label,
    group,
    input,
    read: (semantic) => listOf(semantic)[index] ?? "",
    write: (semantic, value) => {
      const node = semantic.node;
      const list = listOf(semantic);
      // 저장된 개수 밖의 번호는 받지 않는다 — 항목을 더하는 길이 아니다
      if (!node || node.kind !== kind || index >= list.length) return null;
      return {
        ...semantic,
        node: {
          ...node,
          [name]: list.map((item, at) => (at === index ? value : item)),
        } as Node,
      };
    },
  };
}

function specsOf(semantic: TextbookSemantic): Spec[] {
  const node = semantic.node;
  if (!node) return [];
  if (node.kind === "unitIntro") {
    const opening = "여는 글";
    const guide = "배움의 길잡이";
    return [
      {
        key: "title",
        label: "도입 제목",
        group: opening,
        input: "line",
        placeholder: DEFAULT_INTRO_TITLE,
        read: (current) => current.title ?? "",
        write: (current, value) => withOptional(current, "title", value),
      },
      nodeText("unitIntro", "question", "질문", opening, "text"),
      nodeText("unitIntro", "explanation", "설명", opening, "text"),
      nodeText("unitIntro", "keyPhrase", "핵심 문구", opening, "line", {
        optional: true,
      }),
      ...node.goals.map((_, index) =>
        nodeListItem(
          "unitIntro",
          "goals",
          index,
          `이 단원의 학습 목표 ${index + 1}`,
          guide,
          "line",
        ),
      ),
      ...node.path.map((_, index) =>
        nodeListItem(
          "unitIntro",
          "path",
          index,
          `선택한 범위의 학습 순서 ${index + 1}`,
          guide,
          "line",
        ),
      ),
      ...node.check.map((_, index) =>
        nodeListItem(
          "unitIntro",
          "check",
          index,
          `나의 출발점 ${index + 1}`,
          guide,
          "text",
        ),
      ),
      nodeText("unitIntro", "dateLabel", "날짜 문구", guide, "line", {
        optional: true,
        placeholder: DEFAULT_DATE_LABEL,
      }),
    ];
  }
  if (node.kind === "writing")
    return [
      ...node.prompts.map((_, index) =>
        nodeListItem(
          "writing",
          "prompts",
          index,
          `질문 ${index + 1}`,
          null,
          "text",
        ),
      ),
      {
        key: "node.lines",
        label: "질문마다 작성선",
        group: null,
        input: "choice",
        choices: LINE_CHOICES,
        read: (current) =>
          current.node?.kind === "writing" ? String(current.node.lines) : "",
        write: (current, value) => {
          if (current.node?.kind !== "writing") return null;
          if (!LINE_CHOICES.includes(value)) return null;
          return {
            ...current,
            node: { ...current.node, lines: Number(value) },
          };
        },
      },
    ];
  if (node.kind === "board")
    return [
      nodeText("board", "title", "판서 제목", null, "line"),
      nodeText("board", "tex", "수식", null, "line"),
      nodeText("board", "note", "주석", null, "text", { optional: true }),
    ];
  return [];
}

/** 이 글 블록의 구조를 고칠 수 있게 여는가 — 틀까지 본다(단원 도입은 자동 단원 도입 틀에서만 구조가 지면이다) */
function opens(
  semantic: TextbookSemantic | undefined,
  templateKey: string,
): semantic is TextbookSemantic {
  const kind = semantic?.node?.kind;
  if (kind === "writing" || kind === "board") return true;
  return kind === "unitIntro" && templateKey === "auto-unit-intro";
}

/** 글 블록의 구조 편집 칸. 없으면 null — 그 블록은 지금처럼 본문 칸을 쓴다(읽기 전용이든 아니든) */
export function structureViewOf(
  semantic: TextbookSemantic | undefined,
  templateKey: string,
): StructureView | null {
  if (!opens(semantic, templateKey)) return null;
  const node = semantic.node!;
  const fields = specsOf(semantic).map(
    (spec): StructureField => ({
      key: spec.key,
      label: spec.label,
      group: spec.group,
      input: spec.input,
      ...(spec.placeholder ? { placeholder: spec.placeholder } : {}),
      ...(spec.choices ? { choices: spec.choices } : {}),
      value: spec.read(semantic),
    }),
  );
  if (node.kind === "unitIntro")
    return {
      head: semantic.title
        ? `${DEFAULT_INTRO_TITLE} · ${semantic.title}`
        : DEFAULT_INTRO_TITLE,
      summary: [
        { label: "질문", text: node.question },
        { label: "설명", text: node.explanation },
        ...(node.keyPhrase
          ? [{ label: "핵심 문구", text: node.keyPhrase }]
          : []),
        {
          label: null,
          text: `학습 목표 ${node.goals.length} · 학습 순서 ${node.path.length} · 출발점 ${node.check.length}`,
        },
      ],
      fields,
    };
  if (node.kind === "writing")
    return {
      head: semantic.title ?? "쓰기 활동",
      summary: [
        {
          label: null,
          text: `질문 ${node.prompts.length} · 질문마다 작성선 ${node.lines}줄`,
        },
        { label: "1", text: node.prompts[0] ?? "" },
      ],
      fields,
    };
  if (node.kind === "board")
    return {
      head: node.title ? `판서 · ${node.title}` : "판서",
      summary: [
        { label: "수식", text: node.tex },
        ...(node.note ? [{ label: "주석", text: node.note }] : []),
      ],
      fields,
    };
  return null;
}

/**
 * 한 칸을 고친 구조. `original` 은 저장본의 구조, `current` 는 지금 화면의 구조다.
 * 지금 값들에 이 칸의 새 값을 더해 **저장본에서부터 다시 얹는다** — 저장본과 값이 같은 칸은 저장본 그대로 두므로,
 * 전부 되돌리면 저장본과 같은 객체가 나온다. 모르는 칸 · 받을 수 없는 값이면 `current` 를 그대로 돌려준다.
 */
export function editStructure(
  original: TextbookSemantic,
  current: TextbookSemantic,
  key: string,
  value: string,
): TextbookSemantic {
  const specs = specsOf(current);
  const target = specs.find((spec) => spec.key === key);
  if (!target || target.write(current, value) === null) return current;
  const values = new Map(specs.map((spec) => [spec.key, spec.read(current)]));
  values.set(key, value);
  let next = original;
  for (const spec of specsOf(original)) {
    const wanted = values.get(spec.key);
    if (wanted === undefined || wanted === spec.read(original)) continue;
    const written = spec.write(next, wanted);
    // 저장본과 꼴이 달라 얹을 수 없으면(종류 · 개수가 다르다) 지금 구조에 이 칸만 고친다
    if (written === null) return target.write(current, value) ?? current;
    next = written;
  }
  return next;
}

/** 이대로는 조판이 거절하는 구조 — 저장을 막고 사유를 보인다. 없으면 null */
export function structureProblem(
  semantic: TextbookSemantic | undefined,
  templateKey: string,
): string | null {
  if (!opens(semantic, templateKey)) return null;
  const node = semantic.node!;
  if (node.kind === "board" && /[$\n]/.test(node.tex))
    return "판서 수식에는 $ 기호와 줄바꿈을 쓸 수 없습니다.";
  return null;
}
