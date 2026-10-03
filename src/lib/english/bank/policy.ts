import { createHash } from "node:crypto";
import {
  ENGLISH_BANK_PATH_LIMITS,
  ENGLISH_BANK_TEXT_MAX,
  type EnglishPassageRights,
  type EnglishBankMakerSeed,
} from "@/contracts/englishBank.contract";
import { normalizeEnglishText } from "../validate";

export class EnglishBankError extends Error {
  constructor(
    public reason: string,
    public details: Record<string, unknown> = {},
  ) {
    super(reason);
  }
}
export const unavailable = () => new EnglishBankError("PASSAGE_UNAVAILABLE");
export const exactHash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");
export const normalizeBankText = (value: string) =>
  normalizeEnglishText(value.normalize("NFC"));
export const unconfirmedRights = (): EnglishPassageRights => ({
  status: "unconfirmed",
  basis: "",
  allowedUses: [],
  confirmedBy: null,
  confirmedAt: null,
});
export function assertPassageUse(
  text: string,
  rights: EnglishPassageRights,
  path: EnglishBankMakerSeed["path"],
) {
  const limit = ENGLISH_BANK_PATH_LIMITS[path];
  if (text.length > limit)
    throw new EnglishBankError("PASSAGE_TOO_LONG", {
      path,
      limit,
      length: text.length,
    });
  if (
    rights.status !== "confirmed" ||
    !rights.confirmedBy ||
    !rights.confirmedAt ||
    !rights.basis.trim() ||
    !rights.allowedUses.includes("generation_input") ||
    (path !== "cloze" && !rights.allowedUses.includes("external_model"))
  )
    throw new EnglishBankError("RIGHTS_REQUIRED", { path });
}
export function decodeBankUtf8(bytes: Uint8Array): string {
  try {
    const text = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
    if (text.includes("\u0000")) throw new Error("Invalid text encoding");
    return text;
  } catch {
    throw new EnglishBankError("IMPORT_INVALID_UTF8");
  }
}
export function readMaterialText(material: {
  mimeType: string;
  bytes: Uint8Array | null;
  content: string | null;
  size: number;
}): string {
  if (material.mimeType !== "text/plain" || !material.content)
    throw new EnglishBankError("IMPORT_TEXT_UNAVAILABLE");
  if (!material.bytes) {
    if (Buffer.byteLength(material.content, "utf8") !== material.size)
      throw new EnglishBankError("IMPORT_TEXT_TRUNCATED");
    return material.content;
  }
  if (material.size !== material.bytes.byteLength)
    throw new EnglishBankError("IMPORT_TEXT_TRUNCATED");
  const text = decodeBankUtf8(material.bytes);
  if (text.trim() !== material.content.trim())
    throw new EnglishBankError("IMPORT_TEXT_TRUNCATED");
  if (text.length > ENGLISH_BANK_TEXT_MAX)
    throw new EnglishBankError("PASSAGE_TOO_LONG", {
      limit: ENGLISH_BANK_TEXT_MAX,
      length: text.length,
    });
  return text;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
