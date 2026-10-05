/** Inspect final HTML with byte-identical embedded resources served once per SHA. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import type { Page } from "puppeteer-core";

const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

export async function readFinalHtml(filename: string) {
  try {
    return await readFile(filename, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const decoded = gunzipSync(await readFile(`${filename}.gz`));
  let directory = path.dirname(path.resolve(filename));
  for (;;) {
    try {
      const records = JSON.parse(
        (
          await readFile(
            path.join(directory, "inactive-html-lossless-archive.json"),
            "utf8",
          )
        ).replace(/^\uFEFF/, ""),
      ) as {
        original: string;
        originalBytes: number;
        originalSha256: string;
        decodedSha256: string;
      }[];
      const record = records.find(
        (value) =>
          path.resolve(value.original).toLowerCase() ===
          path.resolve(filename).toLowerCase(),
      );
      assert(record, "Archived HTML is missing its original byte manifest");
      assert.equal(decoded.length, record.originalBytes);
      assert.equal(sha(decoded), record.originalSha256);
      assert.equal(record.decodedSha256, record.originalSha256);
      return decoded.toString("utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const parent = path.dirname(directory);
    assert.notEqual(
      parent,
      directory,
      "Archived HTML has no verified original-byte manifest",
    );
    directory = parent;
  }
}

export async function loadFinalDom(
  page: Page,
  html: string,
  evidencePath: string,
) {
  const resources = new Map<
    string,
    { bytes: Buffer; mime: string; occurrences: number; sha256: string }
  >();
  const inspectionHtml = html.replace(
    /data:([A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g,
    (_source, mime: string, encoded: string) => {
      const bytes = Buffer.from(encoded, "base64");
      const hash = sha(bytes);
      const url = `https://textbook.invalid/__qa_resource/${hash}`;
      const previous = resources.get(url);
      if (previous) {
        if (previous.mime !== mime || !previous.bytes.equals(bytes))
          throw new Error("Embedded resource hash collision");
        previous.occurrences++;
      } else resources.set(url, { bytes, mime, occurrences: 1, sha256: hash });
      return url;
    },
  );
  await writeFile(
    evidencePath,
    JSON.stringify(
      {
        originalHtmlSha256: sha(html),
        inspectionHtmlSha256: sha(inspectionHtml),
        originalHtmlBytes: Buffer.byteLength(html),
        inspectionHtmlBytes: Buffer.byteLength(inspectionHtml),
        transformation:
          "Only base64 resource URLs replaced; decoded bytes are identical; CSS, DOM hierarchy, text and attributes otherwise unchanged.",
        resources: [...resources.entries()].map(([url, resource]) => ({
          url,
          mime: resource.mime,
          sha256: resource.sha256,
          bytes: resource.bytes.length,
          occurrences: resource.occurrences,
        })),
      },
      null,
      2,
    ),
  );
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const resource = resources.get(request.url());
    if (resource) {
      if (sha(resource.bytes) !== resource.sha256)
        throw new Error("Embedded resource bytes changed during inspection");
      void request
        .respond({
          status: 200,
          contentType: resource.mime,
          headers: {
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=31536000, immutable",
          },
          body: resource.bytes,
        })
        .catch(() => undefined);
    } else void request.abort().catch(() => undefined);
  });
  await page.emulateMediaType("print");
  await page.setContent(inspectionHtml, { waitUntil: "load" });
}
