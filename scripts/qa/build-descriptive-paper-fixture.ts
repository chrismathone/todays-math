/** Offline-only evidence fixture, never registers a family or writes a DB row. */
import { mkdir, writeFile } from "node:fs/promises";
import { createNativeAuthoredTask } from "../../src/lib/engine/descriptiveAuthor/compose";
import { rectangleAuthor } from "../../src/lib/engine/descriptiveAuthor/rectangleDemo";

async function main() {
  // The test fixture uses the local Python/SVG/MathJax helper, even in an env
  // configured for the production service. These overrides affect this process only.
  process.env.STUDIO_ENGINE_URL = "";
  process.env.VERCEL = "";
  const task = await createNativeAuthoredTask(rectangleAuthor, 20261020, 0);
  const dir = "src/app/dev/descriptive-paper";
  await mkdir(dir, { recursive: true });
  await writeFile(
    `${dir}/rectangleFixture.json`,
    `${JSON.stringify(task, null, 2)}\n`,
  );
  console.log("rectangleDemo 조립 결과를 개발용 인쇄 견본으로 저장했습니다.");
}
void main();
