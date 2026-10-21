import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startServer } from "./server.mjs";
if (!process.argv.includes("--browser-granted"))
  throw Error("Explicit coordinator browser grant required.");
const longOnly = process.argv.includes("--long-only");
const interactionsOnly =
  longOnly || process.argv.includes("--interactions-only");
const output = process.env.QA_OUTPUT;
assert.ok(output, "Set external QA_OUTPUT.");
await mkdir(output, { recursive: true });
const server = await startServer();
let browser;
const rows = [],
  errors = [],
  rejectedRequests = [];
const url = server.resolvedUrls.local[0];
const screenshot = (p, tag) =>
  p.screenshot({ path: path.join(output, `${tag}.png`), fullPage: true });
const snapshot = (p) => p.evaluate(() => window.courseQa.snapshot());
async function open(query, width = 390, height = 844) {
  const p = await browser.newPage({
    viewport: { width, height },
    reducedMotion: "reduce",
  });
  p.setDefaultTimeout(15000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== new URL(url).origin || u.pathname.startsWith("/api/")) {
      rejectedRequests.push(u.href);
      return route.abort();
    }
    return route.continue();
  });
  await p.goto(`${url}?${query}`);
  await p.waitForFunction(() => !!window.courseQa);
  await p.locator("h1,h2").first().waitFor();
  await p.evaluate(() => document.fonts.ready);
  return p;
}
async function layout(p, tag) {
  const result = await p.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    font: getComputedStyle(document.body).fontFamily,
    fontLoaded: document.fonts.check("16px RemainingCoursePretendard"),
    mathErrors: document.querySelectorAll(".katex-error").length,
    math: document.querySelectorAll("math").length,
  }));
  assert.equal(result.overflow, 0, tag);
  assert.equal(result.fontLoaded, true, tag);
  assert.equal(result.mathErrors, 0, tag);
  console.log(`checked ${tag}`);
  return result;
}
async function reach(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const result = await locator.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const x = Math.max(0, r.left) + Math.min(r.width, innerWidth - r.left) / 2;
    const y = Math.max(0, r.top) + Math.min(r.height, innerHeight - r.top) / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      visible:
        r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0,
      hit: node === hit || node.contains(hit),
      width: r.width,
      height: r.height,
    };
  });
  assert.ok(
    result.visible && result.hit,
    `${label}: ${JSON.stringify(result)}`,
  );
  return result;
}
// A MathText solution can be one tall element. Test the exact text ink, not its container center.
async function exactLine(p, text, label) {
  const result = await p.evaluate((text) => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let leaf;
    while ((leaf = walker.nextNode())) {
      if (leaf.parentElement?.closest("script,style")) continue;
      const start = leaf.textContent.indexOf(text);
      if (start < 0) continue;
      const range = document.createRange();
      range.setStart(leaf, start);
      range.setEnd(leaf, start + text.length);
      for (
        let parent = leaf.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent);
        if (
          /(auto|scroll)/.test(style.overflowY) &&
          parent.scrollHeight > parent.clientHeight
        ) {
          const box = parent.getBoundingClientRect();
          parent.scrollTop +=
            range.getBoundingClientRect().top -
            box.top -
            parent.clientHeight / 2;
        }
      }
      window.scrollBy({
        top: range.getBoundingClientRect().top - innerHeight / 2,
        behavior: "instant",
      });
      const r = range.getBoundingClientRect();
      const hit = document.elementFromPoint(
        r.left + Math.min(3, r.width / 2),
        (r.top + r.bottom) / 2,
      );
      return {
        text,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        width: r.width,
        viewportHeight: innerHeight,
        hit: leaf.parentElement.contains(hit),
      };
    }
    return null;
  }, text);
  assert.ok(
    result &&
      result.height > 0 &&
      result.top >= 0 &&
      result.bottom <= result.viewportHeight &&
      result.hit,
    `${label}: ${JSON.stringify(result)}`,
  );
  return result;
}
async function enter(p, value) {
  const input = p.getByRole("textbox", { name: "나의 답" });
  await input.fill(value);
  await input.press("Enter");
}
async function correct(p) {
  await expect
    .poll(async () => (await snapshot(p)).state.learner.session.attempts.length)
    .toBe(1);
  const saved = await snapshot(p);
  assert.equal(saved.state.learner.session.attempts[0].correct, true);
  assert.equal(saved.writes, 1);
  return saved;
}
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
  });
  if (!longOnly) {
    const catalogPage = await open("case=preview");
    const cards = await catalogPage.evaluate(() => window.courseQa.cards);
    assert.equal(cards.length, 14);
    await catalogPage.close();
    for (const [width, height] of interactionsOnly
      ? []
      : [
          [390, 844],
          [1440, 900],
        ]) {
      for (const card of cards) {
        const p = await open(
          `case=preview&section=${card.sectionId}`,
          width,
          height,
        );
        const tag = `preview-${card.sectionId}-${width}`;
        await expect(
          p.getByRole("heading", { name: card.title }),
        ).toBeVisible();
        await p.locator("[data-preview-figure] svg").waitFor();
        const before = await snapshot(p);
        const row = {
          tag,
          card: card.sectionId,
          title: card.title,
          layout: await layout(p, tag),
        };
        rows.push(row);
        // Capture each complete book leaf for direct human content/math/figure review.
        await p
          .locator('[data-leaf="0"]')
          .screenshot({ path: path.join(output, `${tag}-meaning.png`) });
        if (width < 600)
          await p
            .getByRole("button", { name: "예와 연습", exact: true })
            .click();
        await reach(p.getByRole("textbox"), `${tag} input`);
        await p.getByRole("textbox").fill("999999");
        await p.getByRole("textbox").press("Enter");
        await expect(p.getByRole("status")).not.toContainText("맞았어요");
        await p.getByRole("textbox").fill(card.practice.answer);
        await p.getByRole("textbox").press("Enter");
        await expect(p.getByRole("status")).toContainText("맞았어요");
        assert.deepEqual(
          await snapshot(p),
          before,
          "preview must not write a course attempt",
        );
        await p
          .locator('[data-leaf="1"]')
          .screenshot({ path: path.join(output, `${tag}-practice.png`) });
        if (width === 390) {
          row.workedTargets = [];
          const examples = p.locator('[data-leaf="1"] ol > li');
          for (let i = 0; i < (await examples.count()); i++) {
            await examples
              .nth(i)
              .evaluate((node) =>
                node.scrollIntoView({ block: "center", behavior: "instant" }),
              );
            row.workedTargets.push(
              await reach(examples.nth(i), `${tag} worked ${i + 1}`),
            );
            await p.screenshot({
              path: path.join(output, `${tag}-worked-${i + 1}-viewport.png`),
            });
          }
        }
        await reach(
          p.getByRole("button", { name: "문제 풀기", exact: true }),
          `${tag} start`,
        );
        await p.getByRole("button", { name: "문제 풀기", exact: true }).click();
        await p.getByRole("region", { name: "문제 내용" }).waitFor();
        row.course = await layout(p, tag + " course");
        assert.deepEqual(await snapshot(p), before);
        await p.close();
      }
    }
    {
      const p = await open("case=relearn");
      const before = await snapshot(p);
      await expect(p.getByRole("region", { name: "문제 내용" })).toBeVisible();
      await p.getByRole("button", { name: "개념 다시 보기" }).click();
      await p.getByRole("button", { name: "예와 연습", exact: true }).click();
      await p.getByRole("textbox").fill(cards[0].practice.answer);
      await p.getByRole("textbox").press("Enter");
      await p.getByRole("button", { name: "문제 풀기", exact: true }).click();
      assert.deepEqual(await snapshot(p), before);
      rows.push({ tag: "relearn", unchanged: true });
      await screenshot(p, "relearn");
      await p.close();
    }
    for (const [kind, answer] of [
      ["fraction", "2/4"],
      ["fraction", "0.5"],
      ["mixed", "1 1/2"],
      ["mixed", "3/2"],
      ["mixed", "1.5"],
      ["units", "50 mm, 3 cm"],
    ]) {
      const p = await open(`case=${kind}`);
      await enter(p, answer);
      rows.push({
        tag: `equivalent-${kind}-${answer}`,
        saved: await correct(p),
      });
      await screenshot(
        p,
        `equivalent-${kind}-${answer.replaceAll("/", "-").replaceAll(" ", "_")}`,
      );
      await p.close();
    }
    for (const kind of ["self", "legacy"]) {
      const p = await open(`case=${kind}`);
      await p.getByRole("button", { name: "다 풀었어요", exact: true }).click();
      await p
        .getByRole("button", { name: "혼자 풀었다고 생각해요", exact: true })
        .click();
      const saved = await correct(p);
      const attempt = saved.state.learner.session.attempts[0];
      assert.equal(attempt.selfAssessed, true);
      assert.equal(attempt.usedHint, false);
      await p.reload();
      await p.getByRole("region", { name: "문제 내용" }).waitFor();
      assert.deepEqual((await snapshot(p)).state, saved.state);
      rows.push({ tag: `${kind}-unhinted`, attempt, reloaded: true });
      await screenshot(p, `${kind}-unhinted`);
      await p.close();
    }
    {
      const p = await open("case=list");
      const input = p.getByRole("textbox", { name: "나의 답" });
      const before = await snapshot(p);
      for (const malformed of ["abc", "１２，１３", "12 13"]) {
        await enter(p, malformed);
        await expect(input).toHaveAttribute("aria-invalid", "true");
        await expect(input).toBeFocused();
        await expect(input).toHaveValue(malformed);
        assert.deepEqual((await snapshot(p)).state, before.state);
        assert.equal((await snapshot(p)).writes, 0);
        await expect(
          p.getByRole("button", { name: "다시 불러오기" }),
        ).toHaveCount(0);
      }
      await screenshot(p, "list-inline-validation");
      await enter(p, "12,13,13"); // syntactically valid duplicate = wrong first attempt
      await p.getByText("다시 해 볼까요", { exact: true }).waitFor();
      const first = await snapshot(p);
      assert.equal(first.writes, 1);
      assert.equal(first.state.learner.session.attempts[0].correct, false);
      await enter(p, "abc");
      await expect(input).toHaveAttribute("aria-invalid", "true");
      assert.deepEqual((await snapshot(p)).state, first.state);
      assert.equal((await snapshot(p)).writes, 1);
      await screenshot(p, "list-followup-validation");
      await enter(p, "13,12");
      await p.getByRole("button", { name: "다음", exact: true }).waitFor();
      const followed = await snapshot(p);
      assert.equal(followed.writes, 2);
      assert.deepEqual(
        followed.state.learner.session.attempts,
        first.state.learner.session.attempts,
      );
      assert.deepEqual(followed.state.memories, first.state.memories);
      await p.reload();
      await p.getByRole("button", { name: "다음", exact: true }).waitFor();
      assert.deepEqual((await snapshot(p)).state, followed.state);
      await p.getByRole("button", { name: "다음", exact: true }).click();
      await expect.poll(async () => (await snapshot(p)).writes).toBe(1); // reload resets local write counter
      rows.push({
        tag: "list-validation-followup",
        malformedNoWrite: true,
        firstUnchanged: true,
        reloaded: true,
      });
      await p.close();
    }
    {
      const p = await open("case=list");
      await p.evaluate(() => window.courseQa.failOnce());
      await enter(p, "13,12");
      await expect(p.getByRole("alert")).toContainText(
        "학습 저장소가 아직 준비되지 않았어요",
      );
      assert.equal((await snapshot(p)).writes, 0);
      await expect(p.getByRole("textbox", { name: "나의 답" })).toHaveValue(
        "13,12",
      );
      await screenshot(p, "service-error");
      await p
        .getByRole("button", { name: "같은 요청 다시 시도", exact: true })
        .click();
      await correct(p);
      rows.push({ tag: "service-error-retry", writes: 1 });
      await p.close();
    }
    {
      const p = await open("case=list");
      const submit = p.locator(
        'section[aria-labelledby="course-question-title"] button[type="submit"]',
      );
      await p.getByRole("textbox", { name: "나의 답" }).fill("13,12");
      await p.keyboard.press("Tab");
      await expect(submit).toBeFocused();
      const active = await submit.evaluate((n) => ({
        background: getComputedStyle(n).backgroundColor,
        color: getComputedStyle(n).color,
        outline: getComputedStyle(n).outlineStyle,
      }));
      await p.evaluate(() => window.courseQa.hold());
      await p.keyboard.press("Enter");
      await expect(submit).toBeDisabled();
      await expect(submit).toHaveCSS("background-color", "rgb(237, 240, 246)");
      const disabled = await submit.evaluate((n) => ({
        background: getComputedStyle(n).backgroundColor,
        color: getComputedStyle(n).color,
      }));
      assert.notEqual(active.outline, "none");
      assert.notEqual(active.background, disabled.background);
      assert.equal((await snapshot(p)).writes, 0);
      await screenshot(p, "primary-disabled");
      await p.emulateMedia({ forcedColors: "active" });
      const forced = await submit.evaluate((n) => ({
        border: getComputedStyle(n).borderStyle,
        background: getComputedStyle(n).backgroundColor,
        color: getComputedStyle(n).color,
      }));
      assert.equal(forced.border, "solid");
      await screenshot(p, "primary-disabled-forced-colors");
      await p.evaluate(() => window.courseQa.release());
      await correct(p);
      rows.push({ tag: "disabled-focus", active, disabled, forced, writes: 1 });
      await p.close();
    }
    {
      const p = await open("case=choice");
      const group = p.getByRole("group", { name: "답 고르기" });
      await expect(group.getByRole("button")).toHaveCount(4);
      const names = await group
        .getByRole("button")
        .evaluateAll((ns) => ns.map((n) => n.getAttribute("aria-label")));
      assert.equal(names.length, 4);
      assert.ok(names.every((n) => /^\d번 \d+$/.test(n)));
      await expect(group.locator("math")).toHaveCount(4);
      const state = await snapshot(p),
        choices = state.state.learner.session.problems[0].answerChoices;
      const idx = choices.indexOf("$37$");
      assert.ok(idx >= 0);
      await p.keyboard.press(String(idx + 1));
      await correct(p);
      rows.push({ tag: "choice-names-keyboard", names, mathPreserved: true });
      await screenshot(p, "choice-names-keyboard");
      await p.close();
    }
  }
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [1440, 900],
  ]) {
    const p = await open("case=long", width, height),
      tag = `long-${width}x${height}`;
    const region = p.getByRole("region", { name: "문제 내용" });
    await region.locator("svg").waitFor();
    const row = { tag, layout: await layout(p, tag) };
    rows.push(row);
    row.first = await exactLine(p, "조건 1.", tag + " first");
    await screenshot(p, tag + "-initial");
    row.last = await exactLine(
      p,
      "마지막 물음. 이 범위에 있는 자연수는 모두 몇 개입니까?",
      tag + " last",
    );
    row.figure = await reach(region.locator("svg"), tag + " figure");
    await p.screenshot({ path: path.join(output, tag + "-figure.png") });
    const question = p.locator(
      'section[aria-labelledby="course-question-title"]',
    );
    row.band = await question.evaluate(
      (n) => getComputedStyle(n, "::before").height,
    );
    assert.equal(row.band, "16px");
    await reach(p.getByRole("textbox", { name: "나의 답" }), tag + " answer");
    await enter(p, "1");
    await p.getByText("다시 해 볼까요", { exact: true }).waitFor();
    await enter(p, "1");
    await p.getByRole("heading", { name: "정답과 풀이" }).waitFor();
    row.solutionLast = await exactLine(
      p,
      "풀이의 마지막 줄입니다.",
      tag + " solutionLast",
    );
    await p.screenshot({ path: path.join(output, tag + "-solution-tail.png") });
    await screenshot(p, tag + "-solution");
    const saved = await snapshot(p);
    await p.reload();
    await p.getByRole("heading", { name: "정답과 풀이" }).waitFor();
    assert.deepEqual((await snapshot(p)).state, saved.state);
    row.done = await reach(
      p.getByRole("button", { name: "알겠어요" }),
      tag + " done",
    );
    await p.screenshot({
      path: path.join(output, tag + "-understood-viewport.png"),
    });
    await p.getByRole("button", { name: "알겠어요" }).click();
    await expect.poll(async () => (await snapshot(p)).writes).toBe(1);
    row.next = await layout(p, tag + " next");
    const followingProblem = (await snapshot(p)).state.learner.session
      .problems[1];
    assert.equal(
      followingProblem.input.mode,
      "text",
      "seed 7 next problem is a real generated list",
    );
    await enter(
      p,
      followingProblem.answer.replaceAll("$", "").replaceAll("\\ ", " "),
    );
    const nextButton = p.getByRole("button", { name: "다음 문제" });
    row.nextButton = await reach(nextButton, tag + " next button");
    await p.screenshot({
      path: path.join(output, tag + "-next-button-viewport.png"),
    });
    const afterAnswer = await snapshot(p);
    assert.equal(afterAnswer.state.learner.session.attempts[1].correct, true);
    await nextButton.press("Enter");
    await expect(p.getByText(/^3\s*\/\s*5 문제$/)).toBeVisible();
    await p.screenshot({
      path: path.join(output, tag + "-next-question-viewport.png"),
    });
    // No corrective test scroll: the student must actually see the newly opened question.
    const firstParagraph = p
      .getByRole("region", { name: "문제 내용" })
      .locator("p")
      .first();
    const currentInk = () =>
      firstParagraph.evaluate((node) => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let leaf;
        while ((leaf = walker.nextNode())) {
          if (
            !leaf.textContent.trim() ||
            leaf.parentElement.closest(".katex-mathml")
          )
            continue;
          const range = document.createRange();
          range.setStart(leaf, 0);
          range.setEnd(leaf, Math.min(leaf.textContent.length, 30));
          const r = range.getClientRects()[0];
          if (!r || r.width < 1 || r.height < 1) continue;
          const hit = document.elementFromPoint(
            r.left + Math.min(3, r.width / 2),
            (r.top + r.bottom) / 2,
          );
          const heading = document.getElementById("course-question-title");
          const h = heading.getBoundingClientRect();
          const headingHit = document.elementFromPoint(
            h.left + 3,
            (h.top + h.bottom) / 2,
          );
          return {
            top: r.top,
            bottom: r.bottom,
            height: r.height,
            visible: r.top >= 0 && r.bottom <= innerHeight,
            hit: leaf.parentElement.contains(hit),
            headingVisible: h.top >= 0 && h.bottom <= innerHeight,
            headingHit: heading === headingHit || heading.contains(headingHit),
          };
        }
        return {
          visible: false,
          hit: false,
          headingVisible: false,
          headingHit: false,
        };
      });
    await expect
      .poll(currentInk)
      .toMatchObject({
        visible: true,
        hit: true,
        headingVisible: true,
        headingHit: true,
      });
    row.nextProblem = await currentInk();
    assert.deepEqual(
      (await snapshot(p)).state,
      afterAnswer.state,
      "moving to next question is not a write",
    );
    await p.close();
  }
} finally {
  await writeFile(
    path.join(
      output,
      longOnly
        ? "browser-long-results.json"
        : interactionsOnly
          ? "browser-interactions-results.json"
          : "browser-results.json",
    ),
    JSON.stringify(
      { browser: browser?.version(), rows, errors, rejectedRequests },
      null,
      2,
    ),
  );
  await browser?.close();
  await server.close();
}
assert.deepEqual(errors, []);
assert.deepEqual(rejectedRequests, []);
console.log(
  `PASS: ${rows.length} scenarios; no external/API requests or browser errors`,
);
