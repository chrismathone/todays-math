/** 영어 저장소와 같은 서버 인증·주소 검사만 복사해 줄인 독립 전송기. */
import "server-only";
import { sha256 } from "@/lib/textbook/hash.server";
import { EXAM_REPORT_PDF_MAX_BYTES } from "./settings";

const BUCKET = "exam-report-private";
const HOST = /^https:\/\/[a-z0-9]{20}\.supabase\.co$/;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH = new RegExp(`^${UUID}/${UUID}\\.pdf$`);
const failed = () =>
  new Error("성적표 비공개 PDF 저장소를 확인하지 못했습니다.");
export interface ExamReportStorageConfig {
  url: string;
  serviceKey: string;
}
export interface ExamReportPdfRef {
  path: string;
  size: number;
  sha256: string;
}
function credentials(key: string): Record<string, string> {
  if (!key || /[\s\x00-\x1f\x7f]/.test(key)) throw failed();
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return { apikey: key };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    try {
      if (
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "service_role"
      )
        return { apikey: key, Authorization: `Bearer ${key}` };
    } catch {}
  }
  throw failed();
}
export function readExamReportStorageConfig(
  env: Record<string, string | undefined> = process.env,
): ExamReportStorageConfig | null {
  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.replace(
    /\/$/,
    "",
  );
  const serviceKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !HOST.test(url) || !serviceKey) return null;
  credentials(serviceKey);
  return { url, serviceKey };
}
function validPdf(bytes: Uint8Array) {
  return (
    bytes.byteLength >= 5 &&
    bytes.byteLength <= EXAM_REPORT_PDF_MAX_BYTES &&
    new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-"
  );
}
export function createExamReportStorageApi(
  config: ExamReportStorageConfig,
  fetchImpl: typeof fetch = fetch,
) {
  if (!HOST.test(config.url)) throw failed();
  const auth = credentials(config.serviceKey);
  const base = `${config.url}/storage/v1`;
  const object = (path: string) => {
    if (!PATH.test(path)) throw failed();
    return `${BUCKET}/${path}`;
  };
  const request = async (suffix: string, init: RequestInit = {}) => {
    try {
      return await fetchImpl(`${base}/${suffix}`, {
        ...init,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
        headers: { ...Object.fromEntries(new Headers(init.headers)), ...auth },
      });
    } catch {
      throw failed();
    }
  };
  const privateBucket = async () => {
    const response = await request(`bucket/${BUCKET}`);
    if (!response.ok) {
      await response.body?.cancel();
      throw failed();
    }
    const bucket = await response.json().catch(() => null);
    if (bucket?.id !== BUCKET || bucket.public !== false) throw failed();
  };
  const read = async (ref: ExamReportPdfRef): Promise<Uint8Array> => {
    const key = object(ref.path);
    if (
      !Number.isSafeInteger(ref.size) ||
      ref.size < 5 ||
      ref.size > EXAM_REPORT_PDF_MAX_BYTES ||
      !/^[a-f0-9]{64}$/.test(ref.sha256)
    )
      throw failed();
    await privateBucket();
    const response = await request(`object/authenticated/${key}`);
    const length = response.headers.get("content-length");
    if (
      !response.ok ||
      !/^application\/pdf(?:;|$)/i.test(
        response.headers.get("content-type") ?? "",
      ) ||
      (length !== null && Number(length) !== ref.size) ||
      !response.body
    ) {
      await response.body?.cancel();
      throw failed();
    }
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > ref.size) throw failed();
        parts.push(next.value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    if (size !== ref.size || !validPdf(bytes) || sha256(bytes) !== ref.sha256)
      throw failed();
    return bytes;
  };
  const upload = async (path: string, bytes: Uint8Array) => {
    const key = object(path);
    if (!validPdf(bytes)) throw failed();
    await privateBucket();
    const response = await request(`object/${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "x-upsert": "false",
      },
      body: new Uint8Array(bytes),
    });
    await response.body?.cancel();
    if (!response.ok) throw failed();
    // 업로드 응답만 믿지 않고 실제 원격 크기·PDF 표지·지문까지 확인한다.
    await read({ path, size: bytes.byteLength, sha256: sha256(bytes) });
  };
  return { read, upload };
}
export function examReportStorage() {
  const config = readExamReportStorageConfig();
  if (!config) throw failed();
  return createExamReportStorageApi(config);
}
