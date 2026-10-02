# 적대적 리뷰 요청 — 개념 백지 «전수 검토 반영»의 제품 코드 변경 (한국어로 · 파일 수정 금지 · 마크다운 80줄 이내)

너는 TypeScript · React 코드 리뷰어다. 아래 diff 는 Next.js 앱의 «개념 백지»(학원용 종이 회상 시험 — 고정 문항 은행을 형식 다섯의 A4 지면으로 찍는다) 변경이다.
**결함을 찾아라** — 틀린 동작 · 빠진 경우 · 깨지는 불변조건 · 정규식의 거짓 양성/음성. 칭찬 · 문체 지적 · 추측성 일반론은 쓰지 마라. 확실하지 않으면 «확인 필요»라고 적고 무엇을 보면 알 수 있는지 적어라.

배경(코드에 없는 사실):
- 은행 개념 한 장: `term`(용어) · `definition`(뜻 문장 — 핵심어를 `{ }` 로 감싼다, 수식은 `$...$` KaTeX) · 선택 `example`. 형식 A(완전 백지)는 소단원 이름만, B 는 용어만, C 는 뜻 문장만(핵심어 자리는 빈칸), D 는 용어 + 예 물음만 학생에게 보인다.
- `givenCase`(새 칸): 굵은 답이 용어에 주어진 값으로 정해지는 «사례 문항» — A 채점표에서 뺀다. 보강 파일은 튜플 끝의 `CASE`, 처음 은행 파일은 파일 끝의 `markGivenCases(bank, [id…])`.
- `keyNotes` 는 채점표 마지막 장 아래 «채점» 상자의 글이다. 줄 수가 늘면 쪽 나눔이 달라진다(스물넷 줄짜리 장에 상자가 같이 들어가야 한다 — A 는 세 줄로 맞췄다).
- `uprightUnits`: 그림 SVG 의 `<text>650 m</text>` 같은 라벨에서 한 글자 단위가 변수처럼 기울어 찍히던 것을 세운다. 라벨은 뒤에서 MathJax 로 조판된다(낱말 2자 이상은 원래 `\mathrm`, 홑 대문자는 정자체, 홑 소문자는 변수).
- `BARE_COMMAND`: 은행 글을 `String.raw` 없이 보통 따옴표로 쓰면 `\,\mathrm{m}` 이 `,mathrm{m}` 이 된다 — 수식 안에 역슬래시 없이 남은 명령 이름을 잡는 자.
- `blankClashes` · `danglingExamples` · `keywordsInsideTerm` 은 은행 시험과 원장 도구가 쓰는 자(순수 함수)다.
- 화면(`ConceptBlankView`)은 형식마다 숫자 칸의 최대를 재고에서 낸다 — A 는 이제 `recall`(사례 문항을 뺀 수).

봐 줄 것: ① `plusSection` 의 튜플 해석(예 자리의 `CASE` · 여섯째 원소) ② `markGivenCases` 가 은행 객체를 제자리에서 고치는 것의 위험(같은 모듈이 두 번 평가되거나, 은행이 동결되거나, 화면이 학년 은행을 늦게 불러올 때) ③ `recallable` 로 거른 뒤 `takeByLevel` 하는 것과 화면의 `recall` 재고가 어긋날 자리 ④ `stockTable` 의 `recall` 집계 ⑤ `uprightUnits` 의 정규식이 건드리면 안 되는 라벨을 건드리는가(`3 x` · `2 a` 같은 «수 빈칸 변수», 한글이 섞인 라벨, `$…$`) ⑥ `BARE_COMMAND` 의 거짓 양성(예: 수식 안의 영어 낱말, `\text{…}` 안) ⑦ `keyNotes` 의 `nameOnly` 가 틀리게 켜지거나 꺼지는 경우 ⑧ `DANGLING_EXAMPLE` 정규식.

## diff

```diff
diff --git a/src/components/concept-blank/ConceptBlankView.tsx b/src/components/concept-blank/ConceptBlankView.tsx
index 0c73f3593..ffab3588c 100644
--- a/src/components/concept-blank/ConceptBlankView.tsx
+++ b/src/components/concept-blank/ConceptBlankView.tsx
@@ -94,12 +94,14 @@ const ZERO: LevelCounts = { 하: 0, 중: 0, 상: 0 };
 type Stock = StockCounts;
 const EMPTY_STOCK: Stock = {
   concepts: { 하: 0, 중: 0, 상: 0 },
+  recall: { 하: 0, 중: 0, 상: 0 },
   ox: { 하: 0, 중: 0, 상: 0 },
   apply: { 하: 0, 중: 0, 상: 0 },
   figures: { 하: 0, 중: 0, 상: 0 },
   total: 0,
 };
-type StockKind = "concepts" | "ox" | "apply" | "figures";
+/** `recall` — 개념 가운데 A(완전 백지)에 실을 수 있는 것(사례 문항을 뺀 수 · 26 §10). */
+type StockKind = "concepts" | "recall" | "ox" | "apply" | "figures";
 type Row = "main" | "extra";
 
 const LETTER: Record<ConceptBlankForm, string> = {
@@ -118,7 +120,7 @@ const ROWS: Record<
     extra?: { label: string; stock: StockKind };
   }
 > = {
-  recall: { main: { label: "개념 수", stock: "concepts" } },
+  recall: { main: { label: "개념 수", stock: "recall" } },
   term: {
     main: { label: "용어", stock: "concepts" },
     extra: { label: "○×", stock: "ox" },
@@ -454,6 +456,7 @@ export default function ConceptBlankView({
     };
     return {
       concepts: total("concepts"),
+      recall: total("recall"),
       ox: total("ox"),
       apply: total("apply"),
       figures: total("figures"),
diff --git a/src/components/concept-blank/paper/paginate.ts b/src/components/concept-blank/paper/paginate.ts
index 94594641b..319368b96 100644
--- a/src/components/concept-blank/paper/paginate.ts
+++ b/src/components/concept-blank/paper/paginate.ts
@@ -6,6 +6,7 @@ import {
   type FigureItem,
   type OxItem,
 } from "@/contracts/conceptBlank.contract";
+import { keywordsInsideTerm } from "@/lib/concept-blank/audit";
 
 import {
   BOLD_MATH,
@@ -522,17 +523,35 @@ export function keyRowCost(row: KeyRow): number {
   }
 }
 
-/** 채점 안내(채점표 마지막 장 아래) — 우리 말. */
+/** 뜻을 문장으로 쓰는 칸(B · D)의 기준 — 굵은 부분은 내용 기준이고, 느슨한 것은 말 · 식 · 단위의 꼴이다. */
+const MEANING_RULE =
+  "굵은 부분의 뜻이 모두 있어야 ○. 말 · 식 · 단위의 꼴이 달라도 된다.";
+/** 굵은 글이 용어 이름뿐인 줄의 기준(합의 안건 12) — 핵심어 표기를 늘리지 않고 채점 안내로 가른다. */
+const NAME_RULE =
+  "굵은 글이 용어와 같으면 그 이름은 답이 아니다 — 이름을 뺀 나머지 뜻이 문장과 같으면 ○.";
+
+/**
+ * 채점 안내(채점표 마지막 장 아래) — 우리 말.
+ * 🔴 «굵은 핵심어가 다 들어가야 ○»라고 쓰지 않는다(전수 검토 2026-10-02 · 26 §10) — 같은 뜻의 다른 말 · 같은 값의 다른 꼴이
+ * 오답이 된다. «본보기 답»이라고도 쓰지 않는다 — 굵은 내용을 빼도 되게 읽혀 교사마다 ○× 가 갈린다.
+ */
 export function keyNotes(sheet: ConceptBlankSheet): string[] {
+  // 굵은 글이 용어 이름뿐인 줄(`…을 {세로셈}이라 한다`)이 있을 때만 — 그 이름은 학생이 본 글이라 답이 아니다.
+  const nameOnly = (entries: readonly ConceptEntry[]) =>
+    entries.some((c) => keywordsInsideTerm(c.term, c.definition))
+      ? [NAME_RULE]
+      : [];
   switch (sheet.form) {
     case "recall":
       return [
-        `칸에 적힌 것을 아래 ${sheet.key.length}개와 맞춰 본다. 굵은 핵심어가 다 있으면 ○, 하나 빠지면 △, 없으면 ×.`,
+        `칸에 적힌 것을 아래 ${sheet.key.length}개와 맞춰 본다. 굵은 부분의 뜻이 다 있으면 ○, 하나 빠지면 △, 없으면 ×.`,
+        "말 · 식의 꼴이 달라도 뜻이 같으면 있는 것으로 본다. 용어에 주어진 값으로 답이 정해지는 사례 문항은 싣지 않았다.",
         "«떠올린 개념»에는 ○ 개수를 적는다. 그림 · 예 칸은 채점하지 않고 뜻이 모자랄 때 보탬으로 본다.",
       ];
     case "term":
       return [
-        "문항 하나가 한 개. 뜻은 굵은 핵심어가 다 들어가야 ○.",
+        `문항 하나가 한 개. ${MEANING_RULE}`,
+        ...nameOnly(sheet.terms),
         ...(sheet.ox.length ? ["○× 는 표시와 까닭이 둘 다 맞아야 한 개."] : []),
       ];
     case "cloze": {
@@ -542,7 +561,9 @@ export function keyNotes(sheet: ConceptBlankSheet): string[] {
       );
       return [
         ...(sheet.sentences.length
-          ? [`가 — 빈칸 하나가 한 개(${blanks}개). 굵은 글이 빈칸의 답이다.`]
+          ? [
+              `가 — 빈칸 하나가 한 개(${blanks}개). 굵은 글이 빈칸의 답이다. 같은 값 · 같은 뜻의 다른 꼴도 ○.`,
+            ]
           : []),
         ...(sheet.apply.length
           ? [`나 — 문항 하나가 한 개(${sheet.apply.length}개).`]
@@ -553,6 +574,8 @@ export function keyNotes(sheet: ConceptBlankSheet): string[] {
       const nodes = sheet.maps.reduce((s, m) => s + m.nodes.length, 0);
       return [
         `가지마다 «뜻» 한 칸 + «예» 한 칸 — 모두 ${nodes * 2}칸.`,
+        `«뜻»은 ${MEANING_RULE}`,
+        ...nameOnly(sheet.maps.flatMap((m) => m.nodes)),
         "예 칸이 비어 있던 가지는 학생이 든 예가 뜻에 맞으면 ○.",
       ];
     }
diff --git a/src/contracts/conceptBlank.contract.ts b/src/contracts/conceptBlank.contract.ts
index bbe326b6c..4a5bc17ff 100644
--- a/src/contracts/conceptBlank.contract.ts
+++ b/src/contracts/conceptBlank.contract.ts
@@ -167,6 +167,13 @@ export const conceptEntrySchema = z.strictObject({
       answer: paperText(1, 60),
     })
     .optional(),
+  /**
+   * 사례 문항 — 굵은 답이 **용어에 주어진 값**으로 정해진다(«$4\,\mathrm{m}$의 $0.3$배 구하기» → `{$1.2\,\mathrm{m}$}`).
+   * A(완전 백지)는 소단원 이름만 보여 주므로 이런 카드는 떠올릴 수도, 채점표 줄과 맞춰 볼 수도 없다 — A 채점표에 싣지 않는다
+   * (전수 검토 2026-10-02 합의 안건 11 · 26 §10). 답이 낱말이어도 해당한다. 단위 환산 · 자리값 · 직각 $90^\circ$처럼
+   * 수 자체가 개념인 카드는 사례가 아니다. 읽는 곳은 A 를 고르는 `composeSheets` 하나다.
+   */
+  givenCase: z.literal(true).optional(),
 });
 export type ConceptEntry = z.infer<typeof conceptEntrySchema>;
 
diff --git a/src/lib/concept-blank/audit.ts b/src/lib/concept-blank/audit.ts
new file mode 100644
index 000000000..2573edcb1
--- /dev/null
+++ b/src/lib/concept-blank/audit.ts
@@ -0,0 +1,68 @@
+import {
+  type ConceptBlankBank,
+  type ConceptEntry,
+  splitBlankSentence,
+} from "@/contracts/conceptBlank.contract";
+
+/**
+ * 개념 백지 은행의 «형식을 건넌» 자(2026-10-02 전수 검토 · 26 §10). 개념 한 장은 형식 넷에 같이 쓰이는데 형식마다
+ * 학생에게 찍히는 칸이 다르다 — 한 칸만 보고는 답을 못 정하는 문항을 센다. 표기 자(`notation.ts`)는 글자를, 이 자는 «무엇이 보이나»를 잰다.
+ *
+ * - 문장 빈칸(C)은 **뜻 문장만** 찍는다(용어는 채점표에만). 빈칸을 비운 글이 같고 답이 다른 두 문장은 학생지에서 가를 수 없다.
+ * - 개념 지도(D)는 **용어와 예 물음만** 찍는다(뜻 문장은 채점표에만). 예 물음이 «이때 · 이 부등식의 · 구한»으로 뜻 문장을 가리키면 풀 수 없다.
+ */
+
+const squash = (s: string) => s.replace(/[\s$\\{}]/g, "");
+
+/**
+ * 굵은 글이 용어뿐인 개념인가 — 핵심어가 전부 용어 안에 들어 있다(한 글자 핵심어는 견주지 않는다).
+ * 둘로 갈린다: 이름 대기 문장(`…을 {세로셈}이라 한다` — C 의 빈칸으로 자연스럽다. B 에서는 그 이름이 답이 아니다)과
+ * 답이 새는 문장(뜻의 말이 용어 안에 그대로 보인다 — 빈칸을 옮겨야 한다). 이 자는 둘을 가르지 못한다(읽어서 가른다).
+ */
+export function keywordsInsideTerm(term: string, definition: string): boolean {
+  const keys = splitBlankSentence(definition)
+    .filter((p) => p.kind === "key")
+    .map((p) => squash(p.text))
+    .filter((k) => k.length >= 2);
+  return keys.length > 0 && keys.every((k) => squash(term).includes(k));
+}
+
+/** 문장 빈칸 지면에 찍히는 글 — 핵심어 자리를 `□` 로 비우고 공백을 뺀 꼴(견주는 열쇠). */
+export function blankedSentence(definition: string): string {
+  return splitBlankSentence(definition)
+    .map((p) => (p.kind === "key" ? "□" : p.text))
+    .join("")
+    .replace(/\s+/g, "");
+}
+
+const answerKey = (definition: string) =>
+  splitBlankSentence(definition)
+    .filter((p) => p.kind === "key")
+    .map((p) => p.text.replace(/\s+/g, ""))
+    .join("|");
+
+/** 같은 소단원에서 빈칸을 비운 글이 같은데 답이 다른 뜻 문장 묶음(인쇄 검토 2026-10-02 — «가장 높은 점» / «가장 낮은 점»). */
+export function blankClashes(bank: ConceptBlankBank): ConceptEntry[][] {
+  const groups = new Map<string, ConceptEntry[]>();
+  for (const c of bank.concepts) {
+    const key = `${c.section}|${blankedSentence(c.definition)}`;
+    groups.set(key, [...(groups.get(key) ?? []), c]);
+  }
+  return [...groups.values()].filter(
+    (g) => new Set(g.map((c) => answerKey(c.definition))).size > 1,
+  );
+}
+
+/**
+ * 예 물음이 지면에 없는 글을 가리키는 꼴 — 글머리의 «이때 · 이 … · 그 … · 구한 …»과 «이/같은 방법으로».
+ * 🔴 좁게 잡은 자다: «같은 컵으로» · «그래프 위에서»처럼 물음 안에서 뜻이 닫히는 말은 안 건드린다. 조건이 빠진 예를
+ * 다 잡지는 못한다(0 은 «가리킴말로 시작하는 예가 없다»까지만 말한다).
+ */
+export const DANGLING_EXAMPLE = /^(?:이때|이 |그 |구한 )|(?:이|같은) 방법으로/;
+
+/** 개념 지도의 예 물음이 찍히지 않는 뜻 문장에 기대는 개념. */
+export function danglingExamples(bank: ConceptBlankBank): ConceptEntry[] {
+  return bank.concepts.filter(
+    (c) => c.example && DANGLING_EXAMPLE.test(c.example.prompt),
+  );
+}
diff --git a/src/lib/concept-blank/bank/plus.ts b/src/lib/concept-blank/bank/plus.ts
index 412fd3764..d7178a1ec 100644
--- a/src/lib/concept-blank/bank/plus.ts
+++ b/src/lib/concept-blank/bank/plus.ts
@@ -17,13 +17,29 @@ import type {
  */
 export const RETIRED = null;
 
-export type PlusConcept = readonly [
-  level: ConceptEntry["level"],
-  term: string,
-  kind: ConceptEntry["kind"],
-  definition: string,
-  example?: readonly [prompt: string, answer: string],
-];
+/**
+ * 사례 문항 표지 — 굵은 답이 용어에 주어진 값으로 정해지는 개념(계약 `givenCase`). A(완전 백지) 채점표에 안 실린다.
+ * 개념 줄의 **끝**에 적는다: `["하", 용어, 갈래, 뜻문장, CASE]` 또는 `[…, 뜻문장, [예 물음, 예 답], CASE]`.
+ */
+export const CASE = "사례" as const;
+
+export type PlusExample = readonly [prompt: string, answer: string];
+export type PlusConcept =
+  | readonly [
+      level: ConceptEntry["level"],
+      term: string,
+      kind: ConceptEntry["kind"],
+      definition: string,
+      example?: PlusExample | typeof CASE,
+    ]
+  | readonly [
+      level: ConceptEntry["level"],
+      term: string,
+      kind: ConceptEntry["kind"],
+      definition: string,
+      example: PlusExample,
+      mark: typeof CASE,
+    ];
 export type PlusOx = readonly [
   level: OxItem["level"],
   statement: string,
@@ -53,7 +69,9 @@ export function plusSection(
   const apply: ApplyItem[] = [];
   (items.concepts ?? []).forEach((entry, i) => {
     if (entry === RETIRED) return;
-    const [level, term, kind, definition, example] = entry;
+    const [level, term, kind, definition, fifth] = entry;
+    const sixth: unknown = (entry as readonly unknown[])[5];
+    const example = fifth === CASE ? undefined : fifth;
     concepts.push({
       id: `${idHead}-xc${i + 1}`,
       section,
@@ -64,6 +82,7 @@ export function plusSection(
       ...(example
         ? { example: { prompt: example[0], answer: example[1] } }
         : {}),
+      ...(fifth === CASE || sixth === CASE ? { givenCase: true } : {}),
     });
   });
   (items.ox ?? []).forEach((entry, i) => {
@@ -86,6 +105,22 @@ export function plusSection(
   return { concepts, ox, apply, figures: [] };
 }
 
+/**
+ * 원래 은행 파일(`e3.ts` …)의 사례 문항에 표지를 단다 — 파일마다 적는 꼴이 달라, 표지는 파일 끝에서 id 로 단다
+ * (`markGivenCases(bank, ["e3-1-3-3-c2"])`). 은행에 없는 id 나 개념이 아닌 id 는 던진다(오타가 조용히 빠지지 않게).
+ */
+export function markGivenCases(
+  bank: ConceptBlankBank,
+  ids: readonly string[],
+): void {
+  const byId = new Map(bank.concepts.map((c) => [c.id, c]));
+  for (const id of ids) {
+    const concept = byId.get(id);
+    if (!concept) throw new Error(`사례 표지: 은행에 없는 개념 ${id}`);
+    concept.givenCase = true;
+  }
+}
+
 /** 소단원 보강을 파일 순서대로 잇는다. */
 export function joinBanks(
   parts: readonly ConceptBlankBank[],
diff --git a/src/lib/concept-blank/compose.ts b/src/lib/concept-blank/compose.ts
index 665a25286..823fdb217 100644
--- a/src/lib/concept-blank/compose.ts
+++ b/src/lib/concept-blank/compose.ts
@@ -49,6 +49,9 @@ export function takeByLevel<
   });
 }
 
+/** A(완전 백지) 채점표에 실을 수 있는 개념 — 사례 문항(`givenCase`)이 아닌 것. */
+export const recallable = (concept: ConceptEntry) => !concept.givenCase;
+
 /** 소단원 열쇠를 교육과정 순서로(모르는 열쇠는 버린다). */
 export function orderedSections(keys: readonly string[]): string[] {
   return [...new Set(keys)]
@@ -106,7 +109,8 @@ export function composeSheets(
     ({ form, counts, extras }): ConceptBlankSheet[] => {
       switch (form) {
         case "recall": {
-          const key = takeByLevel(all("concepts"), counts);
+          // 사례 문항은 A 채점표에 싣지 않는다 — 소단원 이름만 보고는 그 수를 떠올릴 수도, 줄과 맞춰 볼 수도 없다(26 §10).
+          const key = takeByLevel(all("concepts").filter(recallable), counts);
           return [
             {
               form,
@@ -217,6 +221,7 @@ export function stockTable(bank: ConceptBlankBank): Map<string, StockCounts> {
       const zero = () => ({ 하: 0, 중: 0, 상: 0 });
       r = {
         concepts: zero(),
+        recall: zero(),
         ox: zero(),
         apply: zero(),
         figures: zero(),
@@ -232,6 +237,8 @@ export function stockTable(bank: ConceptBlankBank): Map<string, StockCounts> {
       r[kind][item.level] += 1;
       r.total += 1;
     }
+  for (const concept of bank.concepts)
+    if (recallable(concept)) row(concept.section).recall[concept.level] += 1;
   return table;
 }
 
@@ -244,6 +251,8 @@ export function stockCounts(key: string, bank: ConceptBlankBank) {
     ) as LevelCounts;
   return {
     concepts: byLevel(s.concepts),
+    /** A(완전 백지)에 실을 수 있는 개념 — 사례 문항을 뺀 수(`total` 에는 더하지 않는다). */
+    recall: byLevel(s.concepts.filter(recallable)),
     ox: byLevel(s.ox),
     apply: byLevel(s.apply),
     figures: byLevel(s.figures),
diff --git a/src/lib/concept-blank/figureTypeset.ts b/src/lib/concept-blank/figureTypeset.ts
index ba0cf651b..68e2620e2 100644
--- a/src/lib/concept-blank/figureTypeset.ts
+++ b/src/lib/concept-blank/figureTypeset.ts
@@ -42,10 +42,28 @@ const decodeText = (value: string) =>
     .replace(/&gt;/g, ">")
     .replace(/&amp;/g, "&");
 
+/**
+ * 수 뒤에 빈칸을 두고 온 한 글자 단위(`650 m` · `850 g` · `2 kg 100 g`)는 정자체다. 그림 편집기의 라벨 규칙은 홑 소문자를
+ * 변수로 보아 기울인다(`l` · `m` 은 직선 이름) — 그래서 `1 km` 은 서고 `650 m` 만 기울어 찍혔다(전수 검토 2026-10-02, 초3 다섯 곳).
+ * 수 바로 뒤에 붙은 글자(`2a` · `3x`)와 홀로 선 글자는 그대로 변수다.
+ */
+export function uprightUnits(label: string): string {
+  if (label.startsWith("$") || label.includes("\\") || CJK.test(label))
+    return label;
+  if (!/\d [a-z](?= |$)/.test(label)) return label;
+  return label
+    .replace(/[A-Za-z]{2,}|[A-Z]/g, (word) => `\\mathrm{${word}}`)
+    .replace(/(\d) ([a-z])(?= |$)/g, "$1 \\mathrm{$2}")
+    .replace(/ +/g, "\\,");
+}
+
 function mathLabel(text: string, bold = false, textFont = "inherit") {
   // Bank tags contain plain roots (√2) and mixed names (x축). Keep Korean as
   // text while laying out the math run; wholly Korean/circled labels stay text.
-  let label = text.replace(/√(\d+(?:\.\d+)?|[A-Za-z])/g, "\\sqrt{$1}");
+  let label = uprightUnits(text).replace(
+    /√(\d+(?:\.\d+)?|[A-Za-z])/g,
+    "\\sqrt{$1}",
+  );
   if (CJK.test(label) && /[A-Za-z0-9\\]/.test(label) && !label.startsWith("$"))
     label = `$${label}$`;
   // A bank answer such as ab denotes a product, not an English word/unit.
diff --git a/src/lib/concept-blank/notation.ts b/src/lib/concept-blank/notation.ts
index d4ba60017..2bfc955d5 100644
--- a/src/lib/concept-blank/notation.ts
+++ b/src/lib/concept-blank/notation.ts
@@ -26,6 +26,12 @@ export type NotationFault = {
 /** 수식 밖에 있으면 안 되는 유니코드 수학 글자 — 제품 표기는 `\sqrt` · `^2` · `\times` · `\angle` · `^\circ` … 다. */
 const UNICODE_MATH = /[√∛²³⁴⁵⁶⁷⁸⁹⁰¹⁻⁺ⁿπ±≤≥≠×÷−∠△□°∥⊥≡∽∞]/g;
 const stripMath = (s: string) => s.replace(/\$[^$]*\$/g, " ");
+/**
+ * 수식 안에 역슬래시 없이 남은 명령 이름 — 은행 글을 `r` 없이 보통 따옴표로 쓰면 `\,\mathrm{m}` 이 `,mathrm{m}` 이 된다.
+ * KaTeX 는 낱글자의 곱으로 읽어 오류를 내지 않고, 지면에는 `3, mathrmm` 이 찍힌다(2026-10-02 전수 검토 — `e5-1-3-3-xc28`).
+ */
+const BARE_COMMAND =
+  /(?<![\\A-Za-z])(?:mathrm|frac|times|circ|angle|overline|triangle|sqrt|square|cdot|parallel|perp|text|quad)(?![A-Za-z])/g;
 
 /** 글 한 칸의 표기 결함. 뜻 문장(`sentence`)은 핵심어 괄호를 걷어 읽는 글로 본다 — 핵심어 안의 수식은 그대로 수식이다. */
 export function notationFaults(
@@ -51,6 +57,10 @@ export function notationFaults(
         `${m[1]} — ${String((e as Error).message).slice(0, 60)}`,
       ]);
     }
+    add(
+      "역슬래시 빠진 명령",
+      (m[1]!.match(BARE_COMMAND) ?? []).map((name) => `${name} — $${m[1]}$`),
+    );
   }
   add("수식 밖 숫자", bareNumbers(text));
   add("수식 밖 기호", stripMath(text).match(UNICODE_MATH) ?? []);

```

## 답 형식

결함마다: 심각도(높음 · 중간 · 낮음) · 파일과 자리 · 무엇이 틀렸나 · 재현되는 입력 · 고칠 방향. 끝에 «결함 아님으로 본 것»을 세 줄 이내.
