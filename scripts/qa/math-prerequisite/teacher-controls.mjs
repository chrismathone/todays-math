import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const out = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../docs/planning/tracks/reports/math-prerequisite-20261003/browser-shots",
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  baseURL: "http://127.0.0.1:4336",
  viewport: { width: 1280, height: 900 },
});
const errors = [];
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
const state = async () => (await page.request.get("/__fixture/state")).json();
const posts = (value) =>
  value.requests.filter(
    (entry) => entry.student === "teacher" && entry.method === "POST",
  ).length;
try {
  await page.goto("/?student=teacher", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.getByRole("heading", { name: "SRS 현황", exact: true }).waitFor();
  const before = await state();
  await page
    .getByRole("button", { name: "교육과정 연결도", exact: true })
    .click();
  const graph = page.getByRole("region", {
    name: "교육과정 연결도",
    exact: true,
  });
  await graph
    .getByRole("searchbox", { name: "검색", exact: true })
    .fill("M3-R02");
  await graph
    .getByRole("combobox", { name: "학교급", exact: true })
    .selectOption("middle");
  await graph
    .getByRole("combobox", { name: "학년군", exact: true })
    .selectOption("중학교 1-3학년군");
  await graph
    .getByRole("combobox", { name: "과목", exact: true })
    .selectOption("수학");
  await graph
    .getByRole("combobox", { name: "영역", exact: true })
    .selectOption("변화와 관계");
  await graph
    .getByRole("heading", { name: "단원 1 / 100", exact: true })
    .waitFor();
  await graph.getByRole("button", { name: /M3-R02 이차방정식/ }).click();
  assert.ok(
    (await graph.innerText()).includes(
      "이 시범에서 자동 제시하는 문제 범위를 연결하지 않았습니다",
    ),
  );
  await graph
    .getByRole("button", { name: /M3-N01 제곱근과 실수/ })
    .first()
    .click();
  assert.equal(
    await graph
      .getByRole("searchbox", { name: "검색", exact: true })
      .inputValue(),
    "",
  );
  for (const label of ["학교급", "학년군", "과목", "영역"])
    assert.equal(
      await graph
        .getByRole("combobox", { name: label, exact: true })
        .inputValue(),
      "",
    );
  assert.equal(
    await graph
      .getByRole("button", { name: /M3-N01 제곱근과 실수/ })
      .first()
      .getAttribute("aria-expanded"),
    "true",
  );
  const exclude = graph.getByRole("checkbox", { name: /M1-N02 정수와 유리수/ });
  await exclude.check();
  await graph
    .getByText("지금 보이는 후보는 없습니다.", { exact: true })
    .waitFor();
  await exclude.uncheck();
  assert.equal(
    await graph
      .getByText("지금 보이는 후보는 없습니다.", { exact: true })
      .count(),
    0,
  );
  await graph.getByRole("button", { name: "필터 초기화", exact: true }).click();
  await graph
    .getByRole("searchbox", { name: "검색", exact: true })
    .fill("H-CAL1-02");
  await graph.getByRole("button", { name: /H-CAL1-02 미분/ }).click();
  const text = await graph.innerText();
  assert.ok(
    text.includes("편집분류") &&
      text.includes("H-ALG-02") &&
      text.includes("H-ALG-03"),
  );
  await graph.getByRole("heading", { name: "도움", exact: true }).waitFor();
  await graph
    .getByRole("heading", { name: "과목 관계", exact: true })
    .waitFor();
  await graph.screenshot({ path: path.join(out, "teacher-support.png") });
  assert.equal(posts(await state()), posts(before));
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(out, "teacher-controls.json"),
    JSON.stringify(
      {
        isolatedMockDb: true,
        fourFilters: "AND, middle math change-and-relations + M3-R02 → 1/100",
        relatedUnit: "M3-N01 opens and resets conflicting filters",
        manualExclusion: "M1-N02 stops its ancestor branch; no writes",
        support:
          "H-CAL1-02 retains H-ALG-02/03 help and separate course relations",
        pageErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "TEACHER CONTROLS PASS: four filters, related navigation, manual ancestor exclusion, support/course separation; no teacher writes.",
  );
} finally {
  await context.close();
  await browser.close();
}
