import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = process.env.FADING_QA_URL ?? "http://localhost:3443";
const refs = "C:/tmp/srs-v2-mockups";
const output = resolve(".qa-artifacts/fading-screens/compare");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const examples = [
  {
    name: "risk-colors",
    ref: "2-phone-home-step3-browse/stitch_math_srs_for_students/mathsrs_v4.2/screen.png",
    scene: "risk-colors",
  },
  {
    name: "step1",
    ref: "3-phone-stats-steps/stitch_math_srs_for_students/step_1_0/screen.png",
    scene: "step1",
  },
  {
    name: "step2",
    ref: "3-phone-stats-steps/stitch_math_srs_for_students/step_2_30/screen.png",
    scene: "step2",
  },
  {
    name: "step3",
    ref: "3-phone-stats-steps/stitch_math_srs_for_students/step_3_70/screen.png",
    scene: "step3",
  },
  { name: "step4", ref: "8-phone-step4-final/screen.png", scene: "step4" },
  {
    name: "daily",
    ref: "2-phone-home-step3-browse/stitch_math_srs_for_students/mathsrs_v4.2/screen.png",
    scene: "daily",
  },
  {
    name: "first",
    ref: "5-phone-exit-tab2-firstday-done/stitch_math_srs_for_students/_3/screen.png",
    scene: "first",
  },
  {
    name: "done",
    ref: "5-phone-exit-tab2-firstday-done/stitch_math_srs_for_students/all_cleared/screen.png",
    scene: "done",
  },
  {
    name: "return",
    ref: "6-phone-unit-clinic-return-emptystats/stitch_math_srs_for_students/rebalance/screen.png",
    scene: "return",
  },
  {
    name: "erase",
    ref: "5-phone-exit-tab2-firstday-done/stitch_math_srs_for_students/_2/screen.png",
    scene: "first",
    action: "erase",
  },
  {
    name: "wrong",
    ref: "4-phone-wrong-compare-rated-summary/stitch_math_srs_for_students/_1/screen.png",
    scene: "step4",
    action: "wrong",
  },
  {
    name: "compare",
    ref: "4-phone-wrong-compare-rated-summary/stitch_math_srs_for_students/peek_sheet/screen.png",
    scene: "step4",
    action: "compare",
  },
  {
    name: "summary",
    ref: "4-phone-wrong-compare-rated-summary/stitch_math_srs_for_students/_2/screen.png",
    scene: "step4",
    action: "summary",
  },
  {
    name: "exit",
    ref: "5-phone-exit-tab2-firstday-done/stitch_math_srs_for_students/_1/screen.png",
    scene: "step3",
    action: "exit",
  },
  {
    name: "pc-home",
    ref: "1-pc-home-stats-list/stitch_math_srs_for_students/mathsrs_v4.2_1/screen.png",
    scene: "daily",
    width: 1280,
  },
  {
    name: "pc-step2",
    ref: "0-pc-steps/stitch_math_srs_for_students/2_step_2_30/screen.png",
    scene: "step2",
    width: 1280,
  },
];
const records = [];
const requested = new Set(process.argv.slice(2));
const selected = examples.filter(
  (example) => !requested.size || requested.has(example.name),
);
try {
  for (const example of selected) {
    const width = example.width ?? 390;
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(`${base}/dev/fading?scene=${example.scene}`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.waitForSelector('[data-qa-ready="true"]', { timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    if (example.action === "erase")
      await page
        .getByRole("button", { name: "개념 소거", exact: true })
        .click();
    if (example.action === "exit")
      await page.getByRole("button", { name: "풀이 나가기" }).click();
    if (example.action === "wrong") {
      const blank = page.getByRole("button", { name: "빈칸 1", exact: true });
      // 가장 큰 실제 표본의 첫 빈칸과 서로 다른 칩을 순서대로 대어, 실제 placeChip이 틀림을 내는 첫 시도만 잡는다.
      const chips = page.getByRole("button", { name: /^칩 / });
      for (let i = 0; i < (await chips.count()); i++) {
        await chips.nth(i).click();
        await blank.click();
        if (await page.getByText("맞지 않는 칩", { exact: true }).count())
          break;
        if (!(await blank.count())) break;
      }
    }
    if (["compare", "summary"].includes(example.action)) {
      await page.getByRole("button", { name: "아직 모르겠어요" }).click();
      if (example.action === "compare")
        await page.getByRole("button", { name: "기준안 보기" }).click();
      else {
        await page.getByRole("button", { name: "자가 평가하기" }).click();
        await page.getByRole("button", { name: /다시.*일 뒤/ }).click();
        await page.getByRole("heading", { name: "풀이를 마쳤어요" }).waitFor();
      }
    }
    const ours = await page
      .locator("[data-fading-root]")
      .screenshot({ animations: "disabled" });
    const original = await readFile(resolve(refs, example.ref));
    await writeFile(resolve(output, `${example.name}-ours.png`), ours);
    const side = await browser.newPage({
      viewport: { width: width * 2 + 40, height: 900 },
      deviceScaleFactor: 1,
    });
    await side.setContent(
      `<html><head><style>*{box-sizing:border-box}body{margin:0;background:#e2e5ed;font:16px Arial}main{display:flex;align-items:start;gap:16px;padding:12px}section{width:${width}px;flex-shrink:0}h2{height:36px;margin:0;font-size:16px}img{width:100%;height:auto;display:block}</style></head><body><main><section><h2>시안 · ${example.name}</h2><img src="data:image/png;base64,${original.toString("base64")}"/></section><section><h2>오늘의 기억 · ${example.name}</h2><img src="data:image/png;base64,${ours.toString("base64")}"/></section></main></body></html>`,
    );
    await side
      .locator("img")
      .evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
    await side.screenshot({
      path: resolve(output, `${example.name}-side-by-side.png`),
      fullPage: true,
    });
    await side.close();
    records.push({ name: example.name, width, reference: example.ref });
    process.stdout.write(example.name + " 비교 저장\n");
  }
  const previous = requested.size
    ? JSON.parse(
        await readFile(resolve(output, "index.json"), "utf8").catch(() => "[]"),
      ).filter((record) => !requested.has(record.name))
    : [];
  await writeFile(
    resolve(output, "index.json"),
    JSON.stringify([...previous, ...records], null, 2),
  );
} finally {
  await browser.close();
}
