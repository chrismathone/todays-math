import { writeFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

/**
 * 작업실 MathLive 칸의 한글(HWP) 수식 «작은 판» (트랙 8, 2026-09-19 원장님 결정 B).
 *
 * 실험 장치(scratchpad/hwp-eq-probe/probe.mjs, 173건)의 입력 방식을 그대로 옮겼다 —
 * 글자를 한 자씩 치고, `{`·`}` 는 실제 키보드처럼 Shift+[ ] 로, «→» 는 오른쪽 화살표.
 * 판정도 실험과 같다: 공백을 지우고 `{x}` 한 글자 묶음을 벗겨 견준다(`\sqrt{2}` = `\sqrt2`).
 *
 * 작업실 **실제 화면**(StudioView)의 문제 카드 → «내용 수정» → «수식 편집» 칸에서 친다.
 */

type Case = { keys: string; want: string; note?: string };

/** 작은 판이 옮겨야 하는 것 — 원장님이 한컴에서 치던 모양. */
const CONVERTS: Case[] = [
  { keys: "root2", want: "\\sqrt{2}" },
  { keys: "root 2", want: "\\sqrt{2}" },
  { keys: "Root2", want: "\\sqrt{2}" },
  { keys: "ROOT2", want: "\\sqrt{2}" },
  { keys: "3root3", want: "3\\sqrt{3}" },
  { keys: "root12", want: "\\sqrt{12}" },
  { keys: "rootx", want: "\\sqrt{x}" },
  { keys: "root2→+1", want: "\\sqrt{2}+1", note: "→ 로 근호 밖으로" },
  { keys: "a over b", want: "\\frac{a}{b}" },
  { keys: "aoverb", want: "\\frac{a}{b}" },
  { keys: "1 over 2", want: "\\frac{1}{2}" },
  { keys: "12 over 35", want: "\\frac{12}{35}" },
  { keys: "x+1 over 2", want: "x+\\frac{1}{2}" },
  { keys: "1 over 2 +1", want: "\\frac{1}{2}+1" },
  { keys: "a Over b", want: "\\frac{a}{b}" },
  { keys: "2 TIMES 3", want: "2\\times3" },
  { keys: "2TIMES3", want: "2\\times3" },
  { keys: "2 Times 3", want: "2\\times3" },
  { keys: "30DEG", want: "30^{\\circ}" },
  { keys: "30 DEG", want: "30^{\\circ}" },
  { keys: "angle ABC", want: "\\angle ABC" },
  { keys: "ANGLE ABC", want: "\\angle ABC" },
  { keys: "angleABC", want: "\\angle ABC" },
  { keys: "triangle ABC", want: "\\triangle ABC" },
  { keys: "bar AB", want: "\\overline{AB}" },
  { keys: "barAB", want: "\\overline{AB}" },
  { keys: "BAR AB", want: "\\overline{AB}" },
  { keys: "bar AB =3", want: "\\overline{AB}=3" },
  { keys: "x LEQ 3", want: "x\\le3" },
  { keys: "x GEQ 3", want: "x\\ge3" },
  { keys: "x NEQ 3", want: "x\\ne3" },
  { keys: "a+-b", want: "a\\pm b" },
  { keys: "a -+ b", want: "a\\mp b" },
  { keys: "A CUP B", want: "A\\cup B" },
  { keys: "A CAP B = EMPTYSET", want: "A\\cap B=\\varnothing" },
  { keys: "A SUBSET B", want: "A\\subset B" },
  { keys: "x NOTIN A", want: "x\\notin A" },
  { keys: "n rarrow INF", want: "n\\to\\infty" },
  { keys: "p RARROW q", want: "p\\Rightarrow q" },
  { keys: "because", want: "\\because" },
  { keys: "therefore x=1", want: "\\therefore x=1" },
  { keys: "1, 2, CDOTS, n", want: "1,2,\\cdots,n" },
  { keys: "l bot m", want: "l\\perp m" },
  { keys: "6 DIVIDE 2", want: "6\\div2" },
  { keys: "3 + BOX = 5", want: "3+\\square=5" },
  {
    keys: "triangle ABC sim triangle DEF",
    want: "\\triangle ABC\\sim\\triangle DEF",
  },
];

/**
 * 🔴 **터지면 안 되는 것** — 짧은 낱말이 긴 낱말 끝에서 터지는 함정과, 지금 손에 익은
 *    MathLive 기본 입력. 작은 판이 이것들을 바꾸면 D-07(입력 방식은 작은 판까지)을 넘는다.
 */
const KEEPS: Case[] = [
  { keys: "age", want: "age" },
  { keys: "digit", want: "digit" },
  { keys: "term", want: "term" },
  { keys: "photo", want: "photo" },
  { keys: "ABCD", want: "ABCD" },
  { keys: "CGE", want: "CGE" },
  { keys: "angle GEF", want: "\\angle GEF" },
  {
    keys: "{1,2}",
    want: "\\left\\lbrace1,2\\right\\rbrace",
    note: "{ 는 지금처럼 집합 중괄호",
  },
  { keys: "x in A", want: "x\\in A" },
  { keys: "infty", want: "\\infty" },
  { keys: "sin x", want: "\\sin x" },
  { keys: "a/b", want: "\\frac{a}{b}" },
  { keys: "x^2+1", want: "x^2+1" },
  { keys: "x<=3", want: "x\\le3" },
  {
    keys: "f of g",
    want: "fofg",
    note: "MathLive 기본 of(∘) 는 한컴과 부딪혀 뺐다",
  },
];

/** 실험(probe.mjs)의 판정 — 공백을 지우고 한 글자 묶음 `{x}` 를 벗긴다. */
const norm = (tex: string) =>
  tex.replace(/\s+/g, "").replace(/\{([A-Za-z0-9])\}/g, "$1");

async function typeSeq(page: Page, seq: string) {
  for (const ch of [...seq]) {
    if (ch === "→") await page.keyboard.press("ArrowRight");
    else if (ch === "{" || ch === "}") {
      // 실제 키보드처럼 Shift 를 누른 채 [ ] — `keyboard.type("{")` 는 shiftKey 가 없다.
      await page.keyboard.down("Shift");
      await page.keyboard.press(ch === "{" ? "BracketLeft" : "BracketRight");
      await page.keyboard.up("Shift");
    } else await page.keyboard.type(ch);
    await page.waitForTimeout(5);
  }
}

async function openStudioMathField(page: Page) {
  await page.route("**/api/dev/unified/ai", (route) =>
    route.fulfill({ json: { enabled: false, providers: [] } }),
  );
  await page.goto("/");
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 400, 300);
    sessionStorage.setItem(
      "studio-test-archive",
      JSON.stringify([
        {
          id: "hwp-1",
          sourceId: "hwp-source",
          sourceLabel: "한컴 수식 입력 검증",
          page: 1,
          rect: { x: 0, y: 0, width: 1, height: 1 },
          image: canvas.toDataURL(),
          sourceSize: { width: 400, height: 300 },
          content: "넓이가 $x$ 인 정사각형의 한 변의 길이는?",
          answer: "1",
          solution: "",
          grade: "중3",
          level: "secondary",
          mode: "text",
          added: false,
          figures: [],
          ocr: {
            number: 1,
            topic: "제곱근",
            blocks: [],
            choiceGroups: [],
            subQuestions: [],
            confidence: "high",
            bodyMissing: false,
            choicesMissing: false,
            contentEdited: true,
          },
        },
      ]),
    );
  });
  await page.getByRole("button", { name: "보관한 원본 다시 열기" }).click();
  const card = page.getByRole("article", {
    name: "문제 1 인식 결과",
    exact: true,
  });
  await card.getByRole("button", { name: "내용 수정", exact: true }).click();
  const body = card.getByRole("textbox", { name: "문제 내용", exact: true });
  await body
    .getByRole("button", { name: "수식 편집", exact: true })
    .first()
    .click();
  const field = body.locator("math-field");
  await expect(field).toBeVisible();
  return { card, body, field };
}

test("작업실 수식 칸 — 한컴 낱말 작은 판", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { body, field } = await openStudioMathField(page);

  const results: Array<Case & { got: string; pass: boolean }> = [];
  for (const c of [...CONVERTS, ...KEEPS]) {
    await field.focus();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
    await expect
      .poll(() => field.evaluate((el) => (el as HTMLInputElement).value))
      .toBe("");
    await typeSeq(page, c.keys);
    const got = await field.evaluate((el) => (el as HTMLInputElement).value);
    results.push({ ...c, got, pass: norm(got) === norm(c.want) });
  }
  // 친 값 전부를 남긴다 — 초록이어도 «무엇이 찍혔나»를 사람이 볼 수 있게.
  writeFileSync(
    testInfo.outputPath("results.json"),
    JSON.stringify(results, null, 1),
  );
  const failed = results.filter((r) => !r.pass);
  expect(failed, JSON.stringify(failed, null, 1)).toEqual([]);

  // 친 수식이 본문에 LaTeX 로 남는다 — 칸을 닫으면 KaTeX 로 다시 그린다.
  await field.focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await typeSeq(page, "root2");
  await page.keyboard.press("Escape");
  await expect(field).toHaveCount(0);
  const tex = await body
    .getByRole("button", { name: "수식 편집", exact: true })
    .first()
    .getAttribute("data-math-tex");
  expect(norm(decodeURIComponent(tex ?? ""))).toBe(norm("\\sqrt{2}"));
  await page.screenshot({
    path: testInfo.outputPath("hwp-math-input.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
