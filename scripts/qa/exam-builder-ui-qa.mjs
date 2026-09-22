import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

// Standalone browser QA: intentionally bypasses the DB-writing e2e global setup.
const base = process.env.QA_BASE_URL || "http://localhost:3107";
assert.match(base, /^http:\/\/localhost:(3107|3109)$/);
const output = path.resolve(
  process.env.QA_OUTPUT || ".next/exam-builder-ui-qa",
);
await fs.mkdir(output, { recursive: true });
const key = "today-math-workspace-drafts-v1";
const tiers = ["연산", "기본", "응용", "심화하", "심화중", "심화상"];
const ratio = (values = {}) =>
  Object.fromEntries(tiers.map((t) => [t, values[t] || 0]));
const sample = (id, difficulty = "기본") => ({
  id,
  content: `${id}: 1 + 1 = ?`,
  difficulty,
  grade: "초3",
  chapter: "1-1 덧셈과 뺄셈",
  answer: "2",
  solution: "두 수를 더합니다.",
  eligible: true,
  figureUrls: [],
  figureSvg: null,
});
const draft = (id, title, problems) => ({
  id,
  title,
  problems,
  removed: [],
  columns: 2,
  answers: false,
  updatedAt: "2026-09-22T00:00:00.000Z",
});
const seed = {
  version: 1,
  activeId: "qa-a",
  drafts: [
    draft("qa-a", "QA 첫 시험지", []),
    draft("qa-b", "QA 두 번째 시험지", [sample("saved-b")]),
    draft("qa-c", "QA 세 번째 시험지", [sample("saved-c")]),
  ],
};
const results = [];
const browser = await chromium.launch();
try {
  for (const width of [1440, 390, 320]) {
    const height = width === 1440 ? 1000 : width === 390 ? 844 : 800;
    const context = await browser.newContext({
      viewport: { width, height },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    const blocked = [];
    const requests = [];
    let mode = "shortage";
    let releaseRandom;
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      if (request.url().endsWith("/problems/random")) {
        const body = request.postDataJSON();
        requests.push(body);
        if (mode === "pending")
          await new Promise((resolve) => {
            releaseRandom = resolve;
          });
        if (mode === "error")
          return route.fulfill({
            status: 503,
            json: { error: "QA 요청 실패" },
          });
        return route.fulfill({
          json: {
            problems: [sample(`random-${requests.length}`)],
            counts: ratio({ 기본: 1 }),
            available: ratio({ 기본: 1 }),
          },
        });
      }
      if (request.method() === "GET") return route.continue();
      blocked.push(`${request.method()} ${request.url()}`);
      return route.abort();
    });
    await page.addInitScript(
      ({ key, seed }) => {
        if (!sessionStorage.getItem("qa-seeded")) {
          localStorage.setItem(key, JSON.stringify(seed));
          sessionStorage.setItem("qa-seeded", "yes");
        }
      },
      { key, seed },
    );
    const stored = () =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
    const ids = async () => {
      const s = await stored();
      return (
        s.drafts.find((d) => d.id === s.activeId)?.problems.map((p) => p.id) ||
        []
      );
    };
    const waitIds = async (expected) => expect.poll(ids).toEqual(expected);
    const fit = async (name) => {
      const size = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(
        size.scroll <= size.width,
        `${width} ${name}: horizontal overflow ${JSON.stringify(size)}`,
      );
      await page.screenshot({
        path: path.join(output, `${width}-${name}.png`),
      });
    };
    const nav = async (name) => {
      const button = page.getByRole("button", { name, exact: true });
      await button.click();
    };
    const expand = () =>
      page
        .getByRole("button", { name: "담은 문제 목록 보기", exact: true })
        .click();
    const preview = (number) =>
      page
        .getByRole("button", {
          name: `${number}번 담은 문제 미리보기`,
          exact: true,
        })
        .click();
    try {
      await page.goto(`${base}/dev/unified#bank`, { waitUntil: "networkidle" });
      await expect(
        page.getByRole("button", { name: "1번 문제 담기", exact: true }),
      ).toBeVisible();
      await fit("bank");
      await expect(
        page.getByRole("list", { name: "담은 문제 번호" }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "1번 문제 담기", exact: true })
        .click();
      await page
        .getByRole("button", { name: "2번 문제 담기", exact: true })
        .click();
      await expect.poll(async () => (await ids()).length).toBe(2);
      const original = await ids();
      await expand();
      await fit("basket");
      await preview(1);
      await expect(page.getByRole("dialog")).toBeVisible();
      const previewBox = await page.getByRole("dialog").boundingBox();
      assert.ok(previewBox.x >= 0 && previewBox.x + previewBox.width <= width);
      assert.ok(
        previewBox.y >= 0 && previewBox.y + previewBox.height <= height,
      );
      await fit("preview");
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "1번 담은 문제 미리보기" }),
      ).toBeFocused();
      await preview(1);
      await page.getByRole("button", { name: "문제 순서 뒤로" }).click();
      await waitIds([original[1], original[0]]);
      await expect(
        page.getByRole("heading", { name: "2번 문제 미리보기" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "이 문제 교체", exact: true })
        .click();
      await expect(
        page.getByText("2번 문제 교체 중", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "교체 취소" }).click();
      await waitIds([original[1], original[0]]);
      await expand();
      await preview(2);
      await page
        .getByRole("button", { name: "이 문제 교체", exact: true })
        .click();
      await page
        .getByRole("button", { name: "3번 문제 이 문제로 교체", exact: true })
        .click();
      await expect.poll(async () => (await ids())[1]).not.toBe(original[0]);
      assert.equal((await ids())[0], original[1]);
      await expand();
      await preview(2);
      await page
        .getByRole("button", { name: "담기 취소", exact: true })
        .click();
      await waitIds([original[1]]);
      await expect(
        page.getByRole("button", { name: "담은 문제 목록 닫기" }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "담은 문제 목록 보기" }),
      ).toBeFocused();
      await page
        .getByRole("combobox", { name: "학년", exact: true })
        .selectOption("초4");
      await expect(page.getByText("검색 중…", { exact: true })).toHaveCount(0);
      await waitIds([original[1]]);
      await page.getByRole("button", { name: /난이도별 랜덤 추가/ }).click();
      for (const tier of tiers)
        await page
          .getByRole("spinbutton", { name: `${tier} 문항 수`, exact: true })
          .fill(String(tier === "기본" || tier === "응용" ? 2 : 0));
      await fit("random");
      await page.getByRole("button", { name: "4문항 랜덤 추가" }).click();
      await expect(
        page.getByText("요청 4문항 중 1문항을 추가했어요."),
      ).toBeVisible();
      await expect(
        page.getByText(/응용: 요청 2 · 추가 0 · 부족 2문항/),
      ).toBeVisible();
      await waitIds([original[1], "random-1"]);
      assert.deepEqual(requests[0].excludeIds, [original[1]]);
      const filters = new URLSearchParams(requests[0].filters);
      assert.equal(filters.get("grade"), "초4");
      assert.equal(filters.has("page"), false);
      mode = "error";
      await page.getByRole("button", { name: "4문항 랜덤 추가" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: "QA 요청 실패" }),
      ).toBeVisible();
      await waitIds([original[1], "random-1"]);
      mode = "pending";
      await page.getByRole("button", { name: "4문항 랜덤 추가" }).click();
      await expect.poll(() => Boolean(releaseRandom)).toBe(true);
      await nav("내 시험지");
      await expect(page.locator("tbody tr")).toHaveCount(3);
      await fit("library");
      await page
        .getByRole("textbox", { name: "저장한 시험지 검색" })
        .fill("두 번째");
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await page.getByRole("button", { name: "시험지 검색 지우기" }).click();
      await expect(page.locator("tbody tr")).toHaveCount(3);
      await page
        .getByRole("button", { name: "QA 두 번째 시험지 편집", exact: true })
        .click();
      releaseRandom();
      await waitIds(["saved-b"]);
      await nav("시험지 만들기");
      await expect(page.getByText(/문제 교체 중/)).toHaveCount(0);
      await waitIds(["saved-b"]);
      await nav("내 시험지");
      await page
        .getByRole("button", { name: "QA 세 번째 시험지 이름 변경" })
        .click();
      await page
        .getByRole("textbox", { name: "새 시험지 이름" })
        .fill("QA 이름 변경됨");
      await page.getByRole("button", { name: "이름 저장" }).click();
      await expect(
        page.getByRole("button", { name: "QA 이름 변경됨 편집", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "QA 이름 변경됨 삭제" }).click();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "QA 이름 변경됨 삭제" }),
      ).toBeFocused();
      await expect(page.locator("tbody tr")).toHaveCount(3);
      await page.getByRole("button", { name: "QA 이름 변경됨 삭제" }).click();
      await page.getByRole("button", { name: "삭제 확인" }).click();
      await expect(page.locator("tbody tr")).toHaveCount(2);
      await page
        .getByRole("button", { name: "QA 두 번째 시험지 편집", exact: true })
        .click();
      const downloadEvent = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "작업 파일 내보내기", exact: true })
        .click();
      const download = await downloadEvent;
      const downloadPath = path.join(output, `${width}-draft.json`);
      await download.saveAs(downloadPath);
      const exported = JSON.parse(await fs.readFile(downloadPath, "utf8"));
      assert.ok(JSON.stringify(exported).includes("saved-b"));
      assert.ok(!JSON.stringify(exported).includes("random-3"));
      assert.deepEqual(errors, []);
      assert.deepEqual(blocked, []);
      results.push({
        width,
        height,
        passed: true,
        errors,
        blocked,
        randomRequests: requests,
        screenshots: 5,
      });
      console.log(
        `PASS ${width}: selection, preview, order, replacement/cancel, removal, filters, random shortage/error, draft switch, board rename/delete/download`,
      );
    } catch (error) {
      await page.screenshot({
        path: path.join(output, `${width}-failure.png`),
      });
      await fs.writeFile(
        path.join(output, `${width}-failure.txt`),
        await page.locator("body").innerText(),
      );
      results.push({
        width,
        passed: false,
        error: String(error),
        errors,
        blocked,
      });
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await fs.writeFile(
    path.join(output, "results.json"),
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}
