import fs from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const file = process.argv[2] ?? "public/lab/blender/cube-net-fold.glb";
const bytes = await fs.readFile(new URL(`../../${file}`, import.meta.url));
const model = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const names = [];
model.scene.traverse((obj) => names.push(obj.name));
console.log(
  JSON.stringify(
    {
      animations: model.animations.map((a) => ({
        name: a.name,
        duration: a.duration,
        tracks: a.tracks.length,
      })),
      nodes: names.filter(Boolean),
    },
    null,
    2,
  ),
);
