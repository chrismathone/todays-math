import { expect, test, type Page } from "@playwright/test";

// Chromium CDP checks confirm names and MathML roles, not physical screen-reader
// speech. These fixtures exercise the real source editor/reader without OCR or DB.
const SOURCE = String.raw`분수 $\frac{1}{2}$ 와 지수 $x^{2}$ 이다.

$$\frac{x^{2}}{3}$$`;

async function source(page: Page, stored = false) {
  return JSON.parse(
    (await page
      .locator(stored ? "output[data-stored]" : "output[data-source]")
      .textContent())!,
  ) as string;
}

async function copyCard(page: Page) {
  await page.locator('[data-panel="readonly"]').evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press("Control+c");
  return page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    const item = items[0];
    return {
      text: await (await item.getType("text/plain")).text(),
      html: await (await item.getType("text/html")).text(),
    };
  });
}

test.beforeEach(async ({ page }) => {
  // This isolated editor fixture has no server/AI/OCR integration.
  await page.route("**/api/**", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-panel="editor"] .visual-math')).toHaveCount(
    3,
    { timeout: 30_000 },
  );
});

test("formula controls expose the expression and existing field context", async ({
  page,
}) => {
  const controls = page.locator(".visual-math");
  const labels = await controls.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("aria-label")),
  );
  expect(new Set(labels).size).toBe(4);
  expect(labels[0]).toContain("문제 본문");
  expect(labels[0]).toContain(String.raw`\frac{1}{2}`);
  expect(labels[1]).toContain("x^{2}");
  expect(labels[3]).toContain("정답");
  const session = await page.context().newCDPSession(page);
  await session.send("Accessibility.enable");
  const { nodes } = await session.send("Accessibility.getFullAXTree");
  const names = nodes
    .filter((node) => node.role?.value === "button")
    .map((node) => node.name?.value);
  for (const label of labels) expect(names).toContain(label);
});

test("read-only fractions and exponents retain MathML in the access tree", async ({
  page,
}) => {
  const card = page.locator('[data-panel="readonly"]');
  await expect(card.locator("math")).toHaveCount(3);
  await expect(card.locator("mfrac")).toHaveCount(2);
  await expect(card.locator("msup")).toHaveCount(2);
  const session = await page.context().newCDPSession(page);
  await session.send("Accessibility.enable");
  const { nodes } = await session.send("Accessibility.getFullAXTree");
  const roles = nodes
    .filter((node) => !node.ignored)
    .map((node) => node.role?.value);
  expect(roles.filter((role) => role === "MathMLMath")).toHaveLength(3);
  expect(roles.filter((role) => role === "MathMLFraction")).toHaveLength(2);
  expect(roles.filter((role) => role === "MathMLSup")).toHaveLength(2);
  await expect(card.locator('.katex-html[aria-hidden="true"]')).toHaveCount(3);
  const { root } = await session.send("DOM.getDocument");
  const { nodeIds } = await session.send("DOM.querySelectorAll", {
    nodeId: root.nodeId,
    selector: '[data-panel="readonly"] .katex-html',
  });
  for (const nodeId of nodeIds) {
    const tree = await session.send("Accessibility.getPartialAXTree", {
      nodeId,
      fetchRelatives: false,
    });
    expect(
      tree.nodes[0].ignored,
      "visual copy is excluded from the access tree",
    ).toBe(true);
  }
});

test("Enter and Space open math, names update, and save/reopen preserves source", async ({
  page,
}) => {
  const formula = page.locator('[data-panel="editor"] .visual-math').nth(1);
  await formula.focus();
  await page.keyboard.press("Enter");
  const field = formula.locator("math-field");
  await expect(field).toHaveAttribute(
    "aria-label",
    "문제 본문 수식 입력: x^{2}",
  );
  await expect(formula).not.toHaveAttribute("role", "button");
  await field.evaluate((element) => {
    (element as HTMLElement & { value: string }).value = "y^3";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(field).toHaveAttribute("aria-label", "문제 본문 수식 입력: y^3");
  await page.keyboard.press("Escape");
  await expect(formula).toHaveAttribute(
    "aria-label",
    "문제 본문 수식 편집: y^3",
  );
  expect(await source(page)).toBe(SOURCE.replace("$x^{2}$", "$y^3$"));
  await formula.focus();
  await page.keyboard.press("Space");
  await expect(field).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(field).toHaveCount(0);
  await page.getByRole("button", { name: "저장 후 다시 열기" }).click();
  expect(await source(page, true)).toBe(SOURCE.replace("$x^{2}$", "$y^3$"));
  await expect(
    page.locator('[data-panel="editor"] .visual-math').nth(1),
  ).toHaveAttribute("aria-label", "문제 본문 수식 편집: y^3");
});

test("read-only native clipboard excludes semantic-only content", async ({
  page,
}) => {
  const withSemantics = await copyCard(page);
  await expect(page.locator('[data-panel="readonly"] math')).toHaveCount(3);
  await page
    .locator('[data-panel="readonly"] .katex-mathml')
    .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  const visualOnly = await copyCard(page);
  expect(withSemantics.text).toBe(visualOnly.text);
  expect(withSemantics.text).not.toMatch(/\\frac|\\dfrac|수식 편집|수식 입력/);
  expect(
    /katex-mathml|<math[ >]|<annotation[ >]/.test(withSemantics.html),
  ).toBe(false);
  expect(await source(page)).toBe(SOURCE);
});

test("read-only semantic markup leaves screen and print pixels unchanged", async ({
  page,
}) => {
  const card = page.locator('[data-panel="readonly"]');
  await page.evaluate(() => document.fonts.ready);
  for (const media of ["screen", "print"] as const) {
    await page.emulateMedia({ media });
    const before = await card.screenshot();
    const boxes = await card
      .locator(".katex-html")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()),
      );
    const html = await card.innerHTML();
    await card
      .locator(".katex-mathml")
      .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    expect(
      await card
        .locator(".katex-html")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().toJSON()),
        ),
    ).toEqual(boxes);
    const after = await card.screenshot();
    expect(Buffer.compare(before, after), `${media} rendered pixels`).toBe(0);
    await card.evaluate((node, original) => {
      node.innerHTML = original;
    }, html);
  }
});

test("existing HWPX layout extraction emits each equation once and no semantic text", async ({
  page,
}) => {
  const output = page.locator("output[data-layout]");
  await page.getByRole("button", { name: "수식 내보내기 측정" }).click();
  await expect(output).toHaveAttribute("data-revision", "1");
  const before = JSON.parse((await output.textContent())!);
  const equations = before[0].objects.filter(
    (object: { type: string }) => object.type === "equation",
  );
  expect(equations).toHaveLength(3);
  expect(equations.map((object: { latex: string }) => object.latex)).toEqual([
    String.raw`\displaystyle \dfrac{1}{2}`,
    String.raw`\displaystyle x^{2}`,
    String.raw`\displaystyle \dfrac{x^{2}}{3}`,
  ]);
  const texts = before[0].objects.filter(
    (object: { type: string }) => object.type === "text",
  );
  expect(
    texts.map((object: { text: string }) => object.text).join(" "),
  ).not.toMatch(/\\frac|\\dfrac|수식 편집|수식 입력/);
  await page
    .locator('[data-panel="readonly"] .katex-mathml')
    .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  await page.getByRole("button", { name: "수식 내보내기 측정" }).click();
  await expect(output).toHaveAttribute("data-revision", "2");
  expect(JSON.parse((await output.textContent())!)).toEqual(before);
});
