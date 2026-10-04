/** Public, client-safe identities. Portrait PNGs contain neutral/question/thinking/aha in reading order. */
export type TextbookCharacterId =
  `${"teacher" | "student"}-${"f" | "m"}${1 | 2 | 3 | 4 | 5}`;

export interface TextbookCharacter {
  readonly id: TextbookCharacterId;
  readonly name: string;
  readonly role: "teacher" | "student";
  readonly gender: "female" | "male";
  readonly src: string;
}

const groups = [
  {
    role: "teacher",
    gender: "female",
    prefix: "f",
    names: ["서연", "지은", "하린", "윤서", "민주"],
  },
  {
    role: "teacher",
    gender: "male",
    prefix: "m",
    names: ["도윤", "준호", "지훈", "현우", "민석"],
  },
  {
    role: "student",
    gender: "female",
    prefix: "f",
    names: ["민서", "수아", "유나", "지아", "다은"],
  },
  {
    role: "student",
    gender: "male",
    prefix: "m",
    names: ["지호", "하준", "시우", "도현", "건우"],
  },
] as const;

export const TEXTBOOK_CHARACTERS: readonly TextbookCharacter[] = Object.freeze(
  groups.flatMap(({ role, gender, prefix, names }) =>
    names.map((name, index): TextbookCharacter =>
      Object.freeze({
        id: `${role}-${prefix}${index + 1}` as TextbookCharacterId,
        name: role === "teacher" ? `${name} 선생님` : name,
        role,
        gender,
        src: `/textbook/portraits/${role}-${prefix}${index + 1}.png`,
      }),
    ),
  ),
);

export interface TextbookCastSelection {
  teacherId: string;
  student1Id: string;
  student2Id: string;
}

export const DEFAULT_TEXTBOOK_CAST: Readonly<TextbookCastSelection> =
  Object.freeze({
    teacherId: "teacher-f1",
    student1Id: "student-f1",
    student2Id: "student-m1",
  });

export interface TextbookCast {
  teacher: TextbookCharacter;
  student1: TextbookCharacter;
  student2: TextbookCharacter;
}

export function getTextbookCharacter(
  id: string,
): TextbookCharacter | undefined {
  return TEXTBOOK_CHARACTERS.find((character) => character.id === id);
}

/** IDs are an allowlist, never filenames or URLs supplied by a caller. */
export function resolveTextbookCast(
  selection: Partial<TextbookCastSelection> = {},
): TextbookCast {
  const choose = (
    key: keyof TextbookCastSelection,
    role: TextbookCharacter["role"],
  ) => {
    const character = getTextbookCharacter(
      selection[key] ?? DEFAULT_TEXTBOOK_CAST[key],
    );
    if (!character || character.role !== role)
      throw new Error(`교재 등장인물 선택이 올바르지 않습니다: ${key}`);
    return character;
  };
  return {
    teacher: choose("teacherId", "teacher"),
    student1: choose("student1Id", "student"),
    student2: choose("student2Id", "student"),
  };
}
