/** Run against a local dev server: npx tsx scripts/qa/check-cube31-lab.ts */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium, expect } from "@playwright/test";
import { CUBE_LESSONS, CUBE_TASK_IDS } from "../../src/lib/lab/cube31/lessons";
import { CUBE_SAVE_KEY } from "../../src/lib/lab/cube31/progress";
import {
  notationRequirements,
  PLACE_NAMES,
} from "../../src/lib/lab/cube31/manipulative";
import type { CubeTask } from "../../src/lib/lab/cube31/types";

const base = process.env.CUBE_QA_URL ?? "http://localhost:3107";
const out = path.join(os.tmpdir(), "cube31-integrated-qa");
mkdirSync(out, { recursive: true });
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function press(name: string, times = 1) {
    for (let i = 0; i < times; i++)
      await page.getByRole("button", { name, exact: true }).click();
  }
  async function fill(name: string, value: string | number) {
    await page.getByRole("textbox", { name, exact: true }).fill(String(value));
  }
  async function solveRegroup(task: Extract<CubeTask, { kind: "regroup" }>) {
    const blocks = [
      task.a % 10,
      Math.floor(task.a / 10) % 10,
      Math.floor(task.a / 100) % 10,
      0,
    ];
    if (task.operation === "add") {
      for (let p = 0; p < 3; p++) {
        const n = Math.floor(task.b / 10 ** p) % 10;
        await press(PLACE_NAMES[p] + " 1개 옮기기", n);
        blocks[p] += n;
      }
      for (let p = 0; p < 3; p++)
        if (blocks[p] >= 10) {
          await press(PLACE_NAMES[p] + " 10개 묶기");
          blocks[p] -= 10;
          blocks[p + 1]++;
        }
    } else {
      for (let p = 0; p < 3; p++) {
        const n = Math.floor(task.b / 10 ** p) % 10;
        while (blocks[p] < n) {
          let higher = p + 1;
          while (!blocks[higher]) higher++;
          for (let q = higher; q > p; q--) {
            await press(PLACE_NAMES[q] + " 1개 풀기");
            blocks[q]--;
            blocks[q - 1] += 10;
          }
        }
        await press(PLACE_NAMES[p] + " 1개 빼기", n);
        blocks[p] -= n;
      }
    }
    const notation = notationRequirements(task);
    for (const p of notation.places) {
      await fill(PLACE_NAMES[p] + " 답", notation.digits[p]);
      if (notation.marks[p] !== null)
        await fill(
          PLACE_NAMES[p] +
            (task.operation === "add" ? " 받아올린 수" : " 바꾼 뒤의 수"),
          notation.marks[p]!,
        );
    }
    await page.getByRole("button", { name: /블록과 세로셈 확인/ }).click();
  }
  async function solve(task: CubeTask) {
    if (task.kind === "regroup") {
      await solveRegroup(task);
      return;
    }
    if (task.kind === "question") {
      if (task.choices) {
        const choice = task.choices.find(
          (c) => c.value === task.correctChoice,
        )!;
        await page
          .getByRole("radio", { name: choice.label, exact: true })
          .check();
      }
      for (const field of task.fields ?? [])
        await page
          .getByRole("textbox", {
            name: field.suffix ? field.label + " " + field.suffix : field.label,
            exact: true,
          })
          .fill(field.answer);
    } else if (task.kind === "estimate") {
      const a = Math.round(task.a / 10) * 10,
        b = Math.round(task.b / 10) * 10;
      await fill("첫째 수 어림값", a);
      await fill("둘째 수 어림값", b);
      await fill("어림한 계산 결과", task.operation === "add" ? a + b : a - b);
    } else if (task.kind === "cards") {
      const ordered = [...task.digits].sort((a, b) =>
        task.order === "largest" ? b - a : a - b,
      );
      for (const [i, digit] of ordered.entries()) {
        await press(digit + " 카드");
        await page
          .getByRole("button", {
            name: new RegExp("^" + PLACE_NAMES[ordered.length - i - 1] + ":"),
          })
          .click();
      }
      await press("수 만들기 확인");
      const n = Number(ordered.join(""));
      await fill(
        "계산한 답",
        task.operation === "subtract" ? n - task.add : n + task.add,
      );
    } else if (task.kind === "repair") {
      const digit = Math.floor(task.wrongResult / 10 ** task.wrongPlace) % 10;
      await press(PLACE_NAMES[task.wrongPlace] + " " + digit);
      await page
        .getByRole("radio", {
          name: task.reasons.find((r) => r.value === task.reason)!.label,
          exact: true,
        })
        .check();
      await fill(
        "고친 답",
        task.operation === "add" ? task.a + task.b : task.a - task.b,
      );
    } else if (task.kind === "puzzle") {
      const names = ["B", "D", "E", "A", "C"];
      for (let i = 0; i < 5; i++) {
        await page
          .getByRole("button", { name: new RegExp("^" + names[i] + " 조각:") })
          .click();
        await page
          .getByRole("button", { name: new RegExp("^" + (i + 1) + "번 자리:") })
          .click();
      }
    }
    await press("확인하기");
  }
  try {
    await page.goto(base + "/lab/cube-3-1", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await expect(
      page.getByRole("heading", { name: "312를 분해해요", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: path.join(out, "desktop-intro.png") });
    for (const [lessonIndex, lesson] of CUBE_LESSONS.entries()) {
      if (lesson.id === "challenge") continue;
      await page
        .getByRole("navigation", { name: "단원 학습 순서" })
        .getByRole("button", { name: new RegExp(lesson.title) })
        .click();
      for (const [step, task] of lesson.tasks.entries()) {
        await press(step + 1 + "번째 활동");
        await expect(
          page.getByRole("heading", { name: task.title, exact: true }),
        ).toBeVisible();
        await solve(task);
        await expect(
          page.getByRole("button", { name: "다음 활동 →", exact: true }),
        ).toBeVisible();
        if (task.id === "add-138-214" || task.kind === "puzzle")
          await page.screenshot({
            path: path.join(out, task.id + ".png"),
            fullPage: true,
          });
      }
      console.log(
        "Completed",
        lessonIndex + 1,
        lesson.title,
        lesson.tasks.length,
      );
    }
    const save = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      CUBE_SAVE_KEY,
    );
    assert.equal(
      CUBE_TASK_IDS.filter((id) => save.tasks[id]?.completed).length,
      CUBE_TASK_IDS.length,
    );
    await page
      .getByRole("navigation", { name: "단원 학습 순서" })
      .getByRole("button", { name: /혼자서 해낼 수 있어요/ })
      .click();
    for (let i = 0; i < 6; i++) {
      const text = await page
        .getByRole("textbox", { name: "계산한 답", exact: true })
        .locator("..")
        .innerText();
      const expression = text.match(/(\d+)\s*([+−])\s*(\d+)/);
      assert.ok(expression);
      const a = Number(expression[1]),
        b = Number(expression[3]);
      await fill("계산한 답", expression[2] === "+" ? a + b : a - b);
      await press("답 확인");
      await press(i === 5 ? "학습 기록 보기" : "다음 문제 →");
    }
    const mastered = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).mastery,
      CUBE_SAVE_KEY,
    );
    assert.equal(Object.keys(mastered).length, 6);
    await press("나의 학습 기록 닫기");
    await page
      .getByRole("navigation", { name: "단원 학습 순서" })
      .getByRole("button", { name: /모양 탐험 보너스/ })
      .click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", {
        name: "지도의 빈 조각을 맞춰요",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: /묶음 3D 탐험/ }).click();
    const viewer = page.locator("model-viewer");
    await expect(viewer).toBeVisible();
    await page.waitForFunction(
      () =>
        Boolean(
          (
            document.querySelector("model-viewer") as HTMLElement & {
              loaded?: boolean;
            }
          )?.loaded,
        ),
      undefined,
      { timeout: 30000 },
    );
    await page.screenshot({ path: path.join(out, "blender-modal.png") });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: path.join(out, "mobile-" + width + ".png"),
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        completed: CUBE_TASK_IDS.length,
        pageErrors: errors,
        screenshots: out,
      }),
    );
  } finally {
    await browser.close();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
