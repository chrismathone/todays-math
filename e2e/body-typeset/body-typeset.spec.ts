import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * 문제 본문 조판 — 원장님 2026-09-21 작업실 피드백 둘을 실제 Chromium 에서 잰다.
 *
 * ⑵ «띄워쓰기를 해놓고 저장해보면 다시 띄워쓰기가 사라지네.»
 * ⑴ «수식 혼자 한줄을 떡하니 차지하는건 왜 그런거야?»
 *
 * 하네스는 같은 원문을 세 자리에 그린다 — 편집기(내용 수정) · 검수 카드 · 지면.
 * «저장»은 작업실처럼 편집기가 낸 원문을 저장본으로 삼고 편집기를 다시 연다.
 */

const SHOTS = process.env.BODY_TYPESET_SHOTS;

const panel = (page: Page, name: "editor" | "card" | "paper") =>
  name === "editor"
    ? page.locator('[data-panel="editor"] .visual-document')
    : page.locator(`[data-panel="${name}"]`);

/** 두 글자 사이 가로 간격(px) — 앞 글자 오른쪽 끝에서 뒷글자 왼쪽 끝까지. 같은 줄이어야 한다. */
async function gapBetween(root: Locator, left: string, right: string) {
  return root.evaluate(
    (element, [a, b]) => {
      const rects: Record<string, DOMRect> = {};
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const value = node.textContent ?? "";
        for (const char of [a, b]) {
          const at = value.indexOf(char);
          if (at < 0 || rects[char]) continue;
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + char.length);
          rects[char] = range.getBoundingClientRect();
        }
      }
      if (!rects[a] || !rects[b]) throw new Error(`글자를 못 찾음: ${a} ${b}`);
      if (Math.abs(rects[a].top - rects[b].top) > 2)
        throw new Error("두 글자가 같은 줄이 아님");
      return rects[b].left - rects[a].right;
    },
    [left, right],
  );
}

async function storedText(page: Page) {
  return JSON.parse(
    (await page.locator("output[data-stored]").textContent()) ?? '""',
  ) as string;
}

test.describe("⑵ 편집기에서 친 여러 칸은 저장 뒤에도 남는다", () => {
  for (const [name, caret] of [
    ["spaces", "본문"],
    ["box", "<보기> 상자 안"],
  ] as const) {
    test(`${caret}에 친 네 칸이 검수 카드·지면·다시 연 편집기에 그대로 나온다`, async ({
      page,
    }) => {
      await page.goto(`/?case=${name}`);
      const editor = panel(page, "editor");
      await expect(editor).toContainText("갑 을");
      // 상자 사례는 지면에서도 정말 상자로 서야 상자 안을 잰 것이다.
      await expect(panel(page, "paper").locator("[data-box-card]")).toHaveCount(
        name === "box" ? 1 : 0,
      );
      // 한 칸 폭 — 고치기 전 검수 카드의 «갑 을» 간격.
      const one = await gapBetween(panel(page, "card"), "갑", "을");
      expect(one).toBeGreaterThan(1);

      await editor.getByText("갑 을").click();
      await page.keyboard.press("End");
      for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowLeft");
      await page.keyboard.type("   ");
      await expect
        .poll(async () => gapBetween(editor, "갑", "을"))
        .toBeGreaterThan(3.5 * one);
      await page.getByRole("button", { name: "저장" }).click();

      // 저장본에 네 칸이 남아 있다(고정 공백으로 — 지면 파서·HTML 이 접지 않는 글자).
      expect(await storedText(page)).toMatch(/갑[ \xA0]{4}을/);
      for (const where of ["card", "paper", "editor"] as const) {
        const gap = await gapBetween(panel(page, where), "갑", "을");
        expect(gap, `${where} 간격`).toBeGreaterThan(3.5 * one);
      }
      if (SHOTS)
        await page.screenshot({
          path: `${SHOTS}/spaces-${name}.png`,
          fullPage: true,
        });

      // 다시 연 편집기에서 다른 곳을 고쳐 저장해도 칸이 줄지 않는다(③ 재파싱 접힘).
      await panel(page, "editor").getByText("을").click();
      await page.keyboard.press("End");
      await page.keyboard.type("병");
      await page.getByRole("button", { name: "저장" }).click();
      expect(await storedText(page)).toMatch(/갑[ \xA0]{4}을병/);
      expect(await gapBetween(panel(page, "card"), "갑", "을")).toBeGreaterThan(
        3.5 * one,
      );
    });
  }
});

/**
 * ⑴ 원인 가리기 — `$$…$$`(인식이 `equation_block` 으로 낸 것)만 수식을 혼자 한 줄에 세운다.
 * 인라인 `$…$` 는 앞에 줄바꿈이 있어도 «의 해가»와 같은 줄에 선다(그리는 쪽이 올리지 않는다).
 */
async function formulaLine(root: Locator) {
  return root.evaluate((element) => {
    // 편집기 쪽 KaTeX 는 html 만 내고(MathML 주석 없음) 지면은 둘 다 낸다 — 보이는 글자로 찾는다.
    const html = [...element.querySelectorAll(".katex-html")].find((node) =>
      node.textContent?.replace(/\s/g, "").includes("ax+4=0"),
    );
    if (!html) throw new Error("수식을 못 찾음");
    const formula = html.getBoundingClientRect();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = (node.textContent ?? "").indexOf("의 해가");
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + 1);
      const after = range.getBoundingClientRect();
      return {
        sameLine: after.top < formula.bottom && after.bottom > formula.top,
        formulaLeft: formula.left - element.getBoundingClientRect().left,
      };
    }
    throw new Error("«의 해가»를 못 찾음");
  });
}

test.describe("⑴ 수식이 혼자 한 줄을 차지하는 것은 `$$` 뿐이다", () => {
  test("`$$`(블록)는 편집기·검수 카드·지면 셋 다 수식을 따로 한 줄에 세운다", async ({
    page,
  }) => {
    await page.goto("/?case=q7display");
    await expect(panel(page, "editor")).toContainText("이차방정식");
    for (const where of ["card", "paper"] as const) {
      expect((await formulaLine(panel(page, where))).sameLine, where).toBe(
        false,
      );
    }
    // 편집기의 «푸른 상자»는 블록 수식에 마우스를 올린 모습이다 — 한 줄 전부가 파랗게 칠해진다.
    const block = page.locator(
      '[data-panel="editor"] .visual-math[data-math-display="true"]',
    );
    await block.hover();
    const box = await block.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      width: node.getBoundingClientRect().width,
      line: node.closest(".visual-document")!.getBoundingClientRect().width,
    }));
    expect(box.background).toBe("rgb(239, 246, 255)");
    expect(box.width).toBeGreaterThan(0.8 * box.line);
    // 검수 카드·지면에는 푸른 칠이 없다(편집 화면의 마우스 표시일 뿐).
    for (const where of ["card", "paper"] as const) {
      const painted = await panel(page, where).evaluate((element) =>
        [...element.querySelectorAll("*")].some(
          (node) =>
            getComputedStyle(node).backgroundColor === "rgb(239, 246, 255)",
        ),
      );
      expect(painted, where).toBe(false);
    }
    if (SHOTS)
      await page.screenshot({
        path: `${SHOTS}/q7-display.png`,
        fullPage: true,
      });
  });

  for (const name of ["q7inline", "q7newline"]) {
    test(`인라인 \`$…$\`(${name})는 «의 해가»와 같은 줄에 선다`, async ({
      page,
    }) => {
      await page.goto(`/?case=${name}`);
      await expect(panel(page, "editor")).toContainText("이차방정식");
      for (const where of ["card", "paper", "editor"] as const) {
        expect((await formulaLine(panel(page, where))).sameLine, where).toBe(
          true,
        );
      }
      await expect(
        page.locator(
          '[data-panel="editor"] .visual-math[data-math-display="true"]',
        ),
      ).toHaveCount(0);
    });
  }
});
