import {
  createWriteStream,
  createReadStream,
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { createHash } from "node:crypto";
import type { MathOntologySourceDataset } from "@/contracts/mathOntologySource.contract";
import {
  toMathOntologySourceQuads,
  sourceQuadToNQuad,
} from "@/lib/math-ontology/sources/rdf";
import { compareSourceStrings } from "@/lib/math-ontology/sources/canonical";
/** Bounded external merge sort. Does not retain the full RDF serialization in memory. */
export async function writeCanonicalSourceNQuads(
  dataset: MathOntologySourceDataset,
  output: string,
  chunkBytes = 16 * 1024 * 1024,
) {
  if (chunkBytes < 64) throw new Error("Source RDF sort chunk is too small");
  mkdirSync(dirname(output), { recursive: true });
  const scratch = mkdtempSync(join(dirname(output), ".source-sort-"));
  const chunks: string[] = [];
  let lines: string[] = [],
    size = 0,
    rawQuadCount = 0;
  const flush = () => {
    if (!lines.length) return;
    const path = join(scratch, String(chunks.length) + ".nq");
    writeFileSync(
      path,
      [...new Set(lines)].sort(compareSourceStrings).join("\n") + "\n",
    );
    chunks.push(path);
    lines = [];
    size = 0;
  };
  const readers: ReturnType<typeof createInterface>[] = [];
  const stream = createWriteStream(output);
  const hash = createHash("sha256");
  let bytes = 0,
    quadCount = 0;
  type Head = { line: string; index: number };
  const heap: Head[] = [];
  const less = (a: Head, b: Head) => compareSourceStrings(a.line, b.line) < 0;
  const push = (item: Head) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!less(heap[i], heap[p])) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        let n = i;
        const left = 2 * i + 1,
          right = left + 1;
        if (left < heap.length && less(heap[left], heap[n])) n = left;
        if (right < heap.length && less(heap[right], heap[n])) n = right;
        if (n === i) break;
        [heap[i], heap[n]] = [heap[n], heap[i]];
        i = n;
      }
    }
    return first;
  };
  try {
    toMathOntologySourceQuads(dataset, (q) => {
      const line = sourceQuadToNQuad(q);
      lines.push(line);
      size += Buffer.byteLength(line, "utf8") + 1;
      rawQuadCount++;
      if (size >= chunkBytes) flush();
    });
    flush();
    const iterators = chunks.map((path) => {
      const reader = createInterface({
        input: createReadStream(path),
        crlfDelay: Infinity,
      });
      readers.push(reader);
      return reader[Symbol.asyncIterator]();
    });
    for (const [index, iterator] of iterators.entries()) {
      const next = await iterator.next();
      if (!next.done) push({ line: next.value, index });
    }
    let previous: string | undefined;
    while (heap.length) {
      const item = pop();
      if (item.line !== previous) {
        const line = item.line + "\n";
        hash.update(line, "utf8");
        bytes += Buffer.byteLength(line, "utf8");
        quadCount++;
        if (!stream.write(line)) await once(stream, "drain");
        previous = item.line;
      }
      const next = await iterators[item.index].next();
      if (!next.done) push({ line: next.value, index: item.index });
    }
    stream.end();
    await once(stream, "finish");
    return {
      byteHash: `sha256:${hash.digest("hex")}` as const,
      bytes,
      quadCount,
      rawQuadCount,
    };
  } catch (error) {
    stream.destroy();
    throw error;
  } finally {
    for (const reader of readers) reader.close();
    rmSync(scratch, { recursive: true, force: true });
  }
}
