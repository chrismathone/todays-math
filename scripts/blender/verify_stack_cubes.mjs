// Check the exported Blender model with the browser's glTF implementation.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { AnimationMixer, Box3, LoopOnce, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const root = new URL(
  "../../public/dev/blender-assets/stack-cubes/",
  import.meta.url,
);
const bytes = await fs.readFile(new URL("stack-cubes.glb", root));
const manifest = JSON.parse(
  await fs.readFile(new URL("manifest.json", root), "utf8"),
);
const model = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
assert.equal(model.animations.length, 1);
const clip = model.animations[0];
assert.equal(clip.name, "Separate");
assert.equal(clip.duration, 1);
const cubes = [];
model.scene.traverse((obj) => {
  if (/^Cube_\d_\d_\d$/.test(obj.name)) cubes.push(obj);
});
assert.equal(cubes.length, 12);
const action = new AnimationMixer(model.scene);
const track = action.clipAction(clip);
track.setLoop(LoopOnce, 1);
track.clampWhenFinished = true;
track.play();
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
const countLayers = [0, 0, 0];
const recoveredHeights = Array.from({ length: 3 }, () => [0, 0, 0]);

for (const time of [0, 0.5, 1]) {
  action.setTime(time);
  model.scene.updateMatrixWorld(true);
  for (const cube of cubes) {
    const [, x, y, z] = cube.name.split("_").map(Number);
    const centre = cube.getWorldPosition(new Vector3());
    close(centre.x, (x - 1) * 0.01);
    close(centre.z, -(y - 1) * 0.01);
    const dimensions = new Box3().setFromObject(cube).getSize(new Vector3());
    for (const value of [dimensions.x, dimensions.y, dimensions.z])
      close(value, 0.01);
    if (time === 0) {
      close(centre.y, (z + 0.5) * 0.01);
      countLayers[z]++;
      recoveredHeights[y][x] = Math.max(recoveredHeights[y][x], z + 1);
    } else if (time === 1) {
      close(centre.y, (z + 0.5 + z * 0.65) * 0.01);
    } else if (z > 0) {
      assert.ok(
        centre.y > (z + 0.5) * 0.01 && centre.y < (z + 0.5 + z * 0.65) * 0.01,
      );
    }
  }
}
assert.deepEqual(countLayers, [8, 3, 1]);
assert.deepEqual(recoveredHeights, [
  [1, 1, 0],
  [2, 3, 1],
  [1, 2, 1],
]);
assert.deepEqual(recoveredHeights, manifest.heightRowsFrontToBack);

// Confirm the existing engine SVGs depict the independently recovered model,
// including the front/back orientation (top rows are back-to-front).
const top = await fs.readFile(new URL("top.svg", root), "utf8");
const xy = (markup) =>
  ["x", "y"].map((axis) =>
    Number(markup.match(new RegExp(`\\b${axis}="([^"]+)"`))[1]),
  );
const readingOrder = (a, b) => xy(a)[1] - xy(b)[1] || xy(a)[0] - xy(b)[0];
const numberedCells = [...top.matchAll(/<text\b[^>]*>([1-3])<\/text>/g)]
  .sort((a, b) => readingOrder(a[0], b[0]))
  .map((m) => Number(m[1]));
assert.deepEqual(
  numberedCells,
  [...recoveredHeights].reverse().flat().filter(Boolean),
);
for (const [name, heights] of [
  ["front", [2, 3, 1]],
  ["side", [1, 3, 2]],
]) {
  const svg = await fs.readFile(new URL(`${name}.svg`, root), "utf8");
  const rects = [...svg.matchAll(/<rect\b[^>]*>/g)]
    .map((m) => m[0])
    .sort(readingOrder);
  assert.equal(rects.length, 9);
  const actual = rects.map(
    (r) => !r.includes('fill="#fff"') && !r.includes('fill="#ffffff"'),
  );
  const expected = [2, 1, 0].flatMap((z) => heights.map((h) => h > z));
  assert.deepEqual(actual, expected, `${name} SVG occupancy`);
}
console.log(
  JSON.stringify({
    cubes: cubes.length,
    layerCounts: countLayers,
    heightRowsFrontToBack: recoveredHeights,
    duration: clip.duration,
    bytes: bytes.length,
    svgViewsMatch: true,
  }),
);
