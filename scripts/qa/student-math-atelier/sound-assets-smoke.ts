/** Real Next proxy + static bytes. Does not use a student session or database. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { LEARNING_SOUND_FILES } from "../../../src/lib/math-srs/learningSoundManifest";

async function main() {
  const base = process.env.BASE ?? "http://127.0.0.1:4339";
  for (const file of Object.values(LEARNING_SOUND_FILES)) {
    const response = await fetch(base + file.url, { redirect: "manual" });
    assert.equal(response.status, 200, file.url);
    assert.match(response.headers.get("content-type") ?? "", /^audio\//);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, file.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
    const head = await fetch(base + file.url, {
      method: "HEAD",
      redirect: "manual",
    });
    assert.equal(head.status, 200);
    assert.match(head.headers.get("content-type") ?? "", /^audio\//);
  }
  for (const [method, path] of [
    ["POST", "/audio/math-learning/correct.wav"],
    ["GET", "/audio/math-learning-private/correct.wav"],
  ]) {
    const response = await fetch(base + path, { method, redirect: "manual" });
    assert.equal(response.status, 307, `${method} ${path}`);
    assert.equal(
      new URL(response.headers.get("location")!, base).pathname,
      "/login",
    );
  }
  console.log(
    "PASS: real anonymous Next gate GET/HEAD, audio MIME, 3 sample hashes, and excluded routes",
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
