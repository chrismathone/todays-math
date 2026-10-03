import { Inflate, Zip, ZipPassThrough } from "fflate";

export interface ZipLimits {
  maxFiles: number;
  maxCompressedBytes: number;
  maxExpandedBytes: number;
  maxFileBytes: number;
  maxRatio: number;
}
export const ARCHIVE_LIMITS: Readonly<ZipLimits> = Object.freeze({
  maxFiles: 20_010,
  maxCompressedBytes: 128 * 1024 * 1024,
  maxExpandedBytes: 256 * 1024 * 1024,
  maxFileBytes: 32 * 1024 * 1024,
  maxRatio: 200,
});

export function assertArchivePath(path: string): void {
  if (
    !path ||
    path.length > 240 ||
    /[\\:%\x00-\x1f\x7f]/.test(path) ||
    path
      .split("/")
      .some(
        (p) =>
          !p ||
          p === "." ||
          p === ".." ||
          /[. ]$/.test(p) ||
          /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p),
      )
  )
    throw new Error(`Unsafe archive path: ${path}`);
}
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(bytes: Uint8Array, previous = 0): number {
  let crc = previous ^ 0xffffffff;
  for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function join(chunks: Uint8Array[], length: number): Uint8Array {
  const out = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

export async function readBoundedArchiveBytes(
  source: AsyncIterable<Uint8Array> | Uint8Array,
  maxBytes = ARCHIVE_LIMITS.maxCompressedBytes,
): Promise<Uint8Array> {
  if (source instanceof Uint8Array) {
    if (source.length > maxBytes)
      throw new Error("Compressed archive limit exceeded");
    return source;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of source) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Compressed archive limit exceeded");
    chunks.push(chunk.slice());
  }
  return join(chunks, total);
}

/** Validates ZIP structures before bounded incremental inflation. No filesystem extraction, no unzipSync. */
export function readZipFiles(
  bytes: Uint8Array,
  requested: Partial<ZipLimits> = {},
): Map<string, Uint8Array> {
  const limits = { ...ARCHIVE_LIMITS, ...requested };
  for (const n of Object.values(limits))
    if (!Number.isSafeInteger(n) || n < 1) throw new Error("Invalid ZIP limit");
  if (bytes.length > limits.maxCompressedBytes)
    throw new Error("Compressed archive limit exceeded");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => {
    if (at < 0 || at + 2 > bytes.length) throw new Error("Truncated ZIP");
    return view.getUint16(at, true);
  };
  const u32 = (at: number) => {
    if (at < 0 || at + 4 > bytes.length) throw new Error("Truncated ZIP");
    return view.getUint32(at, true);
  };
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (u32(i) === 0x06054b50 && i + 22 + u16(i + 20) === bytes.length) {
      end = i;
      break;
    }
  if (end < 0 || u16(end + 4) || u16(end + 6))
    throw new Error("Invalid or multi-volume ZIP");
  const count = u16(end + 10),
    centralLength = u32(end + 12),
    centralOffset = u32(end + 16);
  if (
    count === 65535 ||
    count !== u16(end + 8) ||
    centralLength === 0xffffffff ||
    centralOffset === 0xffffffff
  )
    throw new Error("ZIP64 is unsupported");
  if (count > limits.maxFiles || centralOffset + centralLength !== end)
    throw new Error("ZIP directory limit or bounds invalid");
  const files = new Map<string, Uint8Array>(),
    folded = new Set<string>();
  const spans: { start: number; end: number }[] = [];
  let at = centralOffset,
    expanded = 0;
  for (let index = 0; index < count; index++) {
    if (at + 46 > end || u32(at) !== 0x02014b50)
      throw new Error("Invalid ZIP directory entry");
    const flags = u16(at + 8),
      method = u16(at + 10),
      crc = u32(at + 16),
      compressed = u32(at + 20),
      size = u32(at + 24);
    const nameLength = u16(at + 28),
      extraLength = u16(at + 30),
      commentLength = u16(at + 32),
      external = u32(at + 38),
      local = u32(at + 42);
    const next = at + 46 + nameLength + extraLength + commentLength;
    if (
      next > end ||
      !nameLength ||
      u16(at + 34) !== 0 ||
      (flags & ~0x080e) !== 0 ||
      ![0, 8].includes(method)
    )
      throw new Error("Unsupported ZIP flags, method or directory bounds");
    const kind = (external >>> 16) & 0xf000;
    if (kind && kind !== 0x8000 && kind !== 0x4000)
      throw new Error("ZIP links and special files are forbidden");
    const rawName = bytes.subarray(at + 46, at + 46 + nameLength);
    if (!(flags & 0x800) && rawName.some((b) => b > 127))
      throw new Error("ZIP filenames must be UTF8");
    const filename = new TextDecoder("utf-8", { fatal: true }).decode(rawName);
    const directory = filename.endsWith("/");
    const path = directory ? filename.slice(0, -1) : filename;
    assertArchivePath(path);
    const normalized = path.normalize("NFC").toLowerCase();
    if (folded.has(normalized))
      throw new Error(`Duplicate archive path: ${path}`);
    folded.add(normalized);
    if (
      compressed === 0xffffffff ||
      size === 0xffffffff ||
      size > limits.maxFileBytes ||
      size > Math.max(compressed, 1) * limits.maxRatio ||
      expanded + size > limits.maxExpandedBytes
    )
      throw new Error("ZIP expansion limit exceeded");
    if (directory && (size || compressed))
      throw new Error("ZIP directory contains data");
    if (
      local + 30 > centralOffset ||
      u32(local) !== 0x04034b50 ||
      u16(local + 6) !== flags ||
      u16(local + 8) !== method
    )
      throw new Error("ZIP local header mismatch");
    const localNameLength = u16(local + 26),
      localExtraLength = u16(local + 28),
      dataStart = local + 30 + localNameLength + localExtraLength,
      dataEnd = dataStart + compressed;
    if (
      localNameLength !== nameLength ||
      dataEnd > centralOffset ||
      bytes
        .subarray(local + 30, local + 30 + localNameLength)
        .some((b, i) => b !== rawName[i])
    )
      throw new Error("ZIP local name or size mismatch");
    for (const [extraStart, extraSize] of [
      [at + 46 + nameLength, extraLength],
      [local + 30 + localNameLength, localExtraLength],
    ]) {
      let p = extraStart;
      while (p < extraStart + extraSize) {
        if (p + 4 > extraStart + extraSize)
          throw new Error("Malformed ZIP extra field");
        const tag = u16(p),
          length = u16(p + 2);
        if (tag === 1 || tag === 0x7075 || tag === 0x6375)
          throw new Error("ZIP64 and alternate Unicode paths are unsupported");
        p += 4 + length;
        if (p > extraStart + extraSize)
          throw new Error("Malformed ZIP extra field");
      }
    }
    let spanEnd = dataEnd;
    if (flags & 8) {
      const descriptor = u32(dataEnd) === 0x08074b50 ? dataEnd + 4 : dataEnd;
      if (
        descriptor + 12 > centralOffset ||
        u32(descriptor) !== crc ||
        u32(descriptor + 4) !== compressed ||
        u32(descriptor + 8) !== size
      )
        throw new Error("ZIP data descriptor mismatch");
      spanEnd = descriptor + 12;
    } else if (
      u32(local + 14) !== crc ||
      u32(local + 18) !== compressed ||
      u32(local + 22) !== size
    )
      throw new Error("ZIP local CRC/size mismatch");
    spans.push({ start: local, end: spanEnd });
    let actual = 0,
      actualCrc = 0;
    const chunks: Uint8Array[] = [];
    const accept = (chunk: Uint8Array) => {
      actual += chunk.length;
      if (
        actual > size ||
        actual > limits.maxFileBytes ||
        expanded + actual > limits.maxExpandedBytes ||
        actual > Math.max(compressed, 1) * limits.maxRatio
      )
        throw new Error("Actual ZIP expansion limit exceeded");
      actualCrc = crc32(chunk, actualCrc);
      chunks.push(chunk.slice());
    };
    if (method === 0) accept(bytes.subarray(dataStart, dataEnd));
    else {
      let finished = false;
      const inflate = new Inflate((chunk, final) => {
        accept(chunk);
        if (final) finished = true;
      });
      // At most 1KB compressed per push bounds even dishonest DEFLATE output bursts.
      for (let p = dataStart; p < dataEnd; p += 1024)
        inflate.push(
          bytes.subarray(p, Math.min(p + 1024, dataEnd)),
          p + 1024 >= dataEnd,
        );
      if (!finished) throw new Error("Truncated DEFLATE stream");
    }
    if (actual !== size || actualCrc !== crc)
      throw new Error("ZIP actual size or CRC mismatch");
    expanded += actual;
    if (!directory) files.set(path, join(chunks, actual));
    at = next;
  }
  if (at !== end) throw new Error("ZIP directory count mismatch");
  spans.sort((a, b) => a.start - b.start);
  let endOfFiles = 0;
  for (const span of spans) {
    if (span.start !== endOfFiles)
      throw new Error("ZIP files overlap or contain unlisted bytes");
    endOfFiles = span.end;
  }
  if (endOfFiles !== centralOffset)
    throw new Error("ZIP contains unlisted local files");
  return files;
}

/** Export chunks with deterministic timestamps. Stored entries keep expansion predictable. */
export function writeZipFiles(
  files: ReadonlyMap<string, Uint8Array>,
  onChunk: (chunk: Uint8Array) => void,
  limits: Partial<ZipLimits> = {},
): void {
  const bound = { ...ARCHIVE_LIMITS, ...limits };
  if (files.size > bound.maxFiles) throw new Error("ZIP file count exceeded");
  let emitted = 0,
    expanded = 0;
  const names = new Set<string>();
  const zip = new Zip((error, chunk) => {
    if (error) throw error;
    emitted += chunk.length;
    if (emitted > bound.maxCompressedBytes)
      throw new Error("ZIP output limit exceeded");
    onChunk(chunk);
  });
  try {
    for (const [path, bytes] of files) {
      assertArchivePath(path);
      const key = path.normalize("NFC").toLowerCase();
      if (names.has(key)) throw new Error("Duplicate ZIP path");
      names.add(key);
      expanded += bytes.length;
      if (
        bytes.length > bound.maxFileBytes ||
        expanded > bound.maxExpandedBytes
      )
        throw new Error("ZIP output expansion limit exceeded");
      const file = new ZipPassThrough(path);
      file.mtime = new Date(1980, 0, 1);
      zip.add(file);
      if (!bytes.length) file.push(bytes, true);
      for (let at = 0; at < bytes.length; at += 65536)
        file.push(bytes.subarray(at, at + 65536), at + 65536 >= bytes.length);
    }
    zip.end();
  } catch (error) {
    zip.terminate();
    throw error;
  }
}
