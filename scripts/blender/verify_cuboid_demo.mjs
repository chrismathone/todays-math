// Validate the exported asset through the same glTF/animation implementation
// used by model-viewer, independently of Blender's scene representation.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { AnimationMixer, LoopOnce, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const url = new URL(
  "../../public/dev/blender-assets/cuboid-fold.glb",
  import.meta.url,
);
const bytes = await fs.readFile(url);
const model = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
assert.equal(model.animations.length, 1);
const clip = model.animations[0];
assert.equal(clip.name, "Fold");
assert.equal(clip.duration, 3);
const faces = [];
model.scene.traverse((obj) => {
  if (/^Face_\d_/.test(obj.name)) faces.push(obj);
});
assert.equal(faces.length, 6);
const mixer = new AnimationMixer(model.scene);
const action = mixer.clipAction(clip);
action.setLoop(LoopOnce, 1);
action.clampWhenFinished = true;
action.play();

function vertices() {
  model.scene.updateMatrixWorld(true);
  return faces.flatMap((face) => {
    const position = face.geometry.attributes.position;
    return Array.from({ length: position.count }, (_, i) =>
      new Vector3()
        .fromBufferAttribute(position, i)
        .applyMatrix4(face.matrixWorld),
    );
  });
}

function bounds(points) {
  return ["x", "y", "z"].map(
    (axis) =>
      Math.max(...points.map((p) => p[axis])) -
      Math.min(...points.map((p) => p[axis])),
  );
}

mixer.setTime(0);
const flat = bounds(vertices());
assert.ok(
  flat[0] > 0.099 && flat[1] > 0.099 && flat[2] < 1e-6,
  `Flat bounds: ${flat}`,
);
mixer.setTime(1.5);
const middle = bounds(vertices());
assert.ok(middle[2] > 0.01, `Animation did not fold: ${middle}`);
mixer.setTime(clip.duration - 0.000001);
const closed = vertices();
const size = bounds(closed);
assert.ok(
  size.every((value, i) => Math.abs(value - [0.04, 0.02, 0.03][i]) < 1e-6),
);
const corners = new Set(
  closed.map((p) => [p.x, p.y, p.z].map((n) => Math.round(n * 1e6)).join(",")),
);
assert.equal(
  corners.size,
  8,
  "Exported closed faces must meet at exactly eight corners",
);
console.log(
  JSON.stringify({
    bytes: bytes.length,
    duration: clip.duration,
    faces: faces.length,
    closedCorners: corners.size,
    flat,
    middle,
    closed: size,
  }),
);
