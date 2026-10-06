import {
  type ConceptBlankBank,
  type ConceptEntry,
  splitBlankSentence,
} from "@/contracts/conceptBlank.contract";

/**
 * 개념 백지 은행의 «형식을 건넌» 자(2026-10-02 전수 검토 · 26 §10). 개념 한 장은 형식 넷에 같이 쓰이는데 형식마다
 * 학생에게 찍히는 칸이 다르다 — 한 칸만 보고는 답을 못 정하는 문항을 센다. 표기 자(`notation.ts`)는 글자를, 이 자는 «무엇이 보이나»를 잰다.
 *
 * - 문장 빈칸(C)은 **뜻 문장만** 찍는다(용어는 채점표에만). 빈칸을 비운 글이 같고 답이 다른 두 문장은 학생지에서 가를 수 없다.
 * - 개념 지도(D)는 **용어와 예 물음만** 찍는다(뜻 문장은 채점표에만). 예 물음이 «이때 · 이 부등식의 · 구한»으로 뜻 문장을 가리키면 풀 수 없다.
 */

const squash = (s: string) => s.replace(/[\s$\\{}]/g, "");

/**
 * 굵은 글이 용어뿐인 개념인가 — 핵심어가 전부 용어 안에 들어 있다(한 글자 핵심어는 견주지 않는다).
 * 둘로 갈린다: 이름 대기 문장(`…을 {세로셈}이라 한다` — C 의 빈칸으로 자연스럽다. B 에서는 그 이름이 답이 아니다)과
 * 답이 새는 문장(뜻의 말이 용어 안에 그대로 보인다 — 빈칸을 옮겨야 한다). 이 자는 둘을 가르지 못한다(읽어서 가른다).
 */
export function keywordsInsideTerm(term: string, definition: string): boolean {
  const keys = splitBlankSentence(definition)
    .filter((p) => p.kind === "key")
    .map((p) => squash(p.text))
    .filter((k) => k.length >= 2);
  return keys.length > 0 && keys.every((k) => squash(term).includes(k));
}

/**
 * 굵은 글 가운데 용어 **그 자체**가 있는가 — 이름 대기 문장(`…을 {각}이라 한다`). B · D 채점 안내가 «그 이름은 답이 아니다»를
 * 적는 조건이다. 위의 자(`keywordsInsideTerm`)로 켜면 둘이 어긋난다(다른 모델의 코드 검토 2026-10-02 · 은행에 댄 수):
 * 한 글자 이름(각 · 합 · 몫 · 밑 — 아홉)과 이름 곁에 뜻의 말도 굵은 줄(«정비례» — 일흔넷)에서는 안 켜지고,
 * 굵은 글이 용어의 한 토막일 뿐인 줄(«직각삼각형»의 `{직각}` — 구백여)에서는 켜져 뜻의 알맹이를 빼고 채점하게 읽힌다.
 */
export function termIsKeyword(term: string, definition: string): boolean {
  const name = squash(term);
  return splitBlankSentence(definition).some(
    (p) => p.kind === "key" && squash(p.text) === name,
  );
}

/** 문장 빈칸 지면에 찍히는 글 — 핵심어 자리를 `□` 로 비우고 공백을 뺀 꼴(견주는 열쇠). */
export function blankedSentence(definition: string): string {
  return splitBlankSentence(definition)
    .map((p) => (p.kind === "key" ? "□" : p.text))
    .join("")
    .replace(/\s+/g, "");
}

const answerKey = (definition: string) =>
  splitBlankSentence(definition)
    .filter((p) => p.kind === "key")
    .map((p) => p.text.replace(/\s+/g, ""))
    .join("|");

/**
 * 같은 대단원에서 학생 문장은 같은데 답이 다른 묶음. C형은 소단원·개념명을
 * 인쇄하지 않으므로 서로 다른 소단원도 함께 견준다. 문구 차이는 검토 후보이며
 * 동의 표현인지 여부는 원고 검토에서 판단한다.
 */
export function blankClashes(bank: ConceptBlankBank): ConceptEntry[][] {
  const groups = new Map<string, ConceptEntry[]>();
  for (const c of bank.concepts) {
    const chapter = c.section.split("::").slice(0, 2).join("::");
    const key = `${chapter}|${blankedSentence(c.definition)}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.values()].filter(
    (g) => new Set(g.map((c) => answerKey(c.definition))).size > 1,
  );
}

/**
 * 예 물음이 지면에 없는 글을 가리키는 꼴 — 글머리의 «이때 · 그때 · 이렇게 · 이 … · 그 … · 구한 …»과 «이/같은 방법으로».
 * 🔴 좁게 잡은 자다: «같은 컵으로» · «그래프 위에서» · 물음 가운데의 «그때»처럼 물음 안에서 뜻이 닫히는 말은 안 건드린다.
 * 조건이 빠진 예를 다 잡지는 못한다(0 은 «가리킴말로 시작하는 예가 없다»까지만 말한다).
 * 거꾸로 «이 직사각형의 가로가 …일 때»처럼 조건을 다 적고도 «이 »로 여는 물음은 걸린다 — 글머리를 바꿔 쓴다.
 */
export const DANGLING_EXAMPLE =
  /^(?:이때|그때|이렇게|이것|이와 같|이 |그 |구한 )|(?:이|같은) 방법으로/;

/** 개념 지도의 예 물음이 찍히지 않는 뜻 문장에 기대는 개념. */
export function danglingExamples(bank: ConceptBlankBank): ConceptEntry[] {
  return bank.concepts.filter(
    (c) => c.example && DANGLING_EXAMPLE.test(c.example.prompt),
  );
}
