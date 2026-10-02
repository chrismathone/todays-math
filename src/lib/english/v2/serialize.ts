/**
 * 오늘의 영어 2판 — 글자열로 내보내기 · 다시 읽기 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * `parse → serialize → parse` 가 같은 문서를 낸다(표적 · 정답 · 출처가 그대로). 내보내는 글은 **정준**이다 —
 * 객체의 칸은 이름순, 배열은 순서 그대로 — 그래서 같은 문서는 칸을 어떤 순서로 적었든 글자가 같다(해시 · 비교에 쓸 수 있다).
 * 검증기를 지나지 못한 문서는 내보내지 않는다.
 *
 * 🔴 여기까지가 M0 다. 이 글자열을 DB 에 넣거나 꺼내는 경로는 없다 — «DB 영속 왕복»은 2판 저장을 켤 때 따로 잰다.
 * 순수 함수다(서버 · 클라이언트 같이).
 */
import type { EnglishV2Document } from "@/contracts/englishV2.contract";

import {
  type EnglishV2Issue,
  type EnglishV2Verdict,
  validateEnglishV2Document,
} from "./validate";

/** 검증기를 지나지 못한 문서를 내보내려 했다 */
export class EnglishV2InvalidError extends Error {
  readonly issues: EnglishV2Issue[];
  constructor(issues: EnglishV2Issue[]) {
    super("2판 문서가 규칙에 맞지 않아 내보내지 않았습니다.");
    this.name = "EnglishV2InvalidError";
    this.issues = issues;
  }
}

/** 객체의 칸을 이름순으로 — 배열 순서는 뜻이 있어 그대로 둔다 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort())
      out[key] = sortKeys(source[key]);
    return out;
  }
  return value;
}

/** 2판 문서 → 정준 JSON 글자열. 규칙에 안 맞으면 `EnglishV2InvalidError` */
export function serializeEnglishV2Document(
  document: EnglishV2Document,
): string {
  const verdict = validateEnglishV2Document(document);
  if (!verdict.ok) throw new EnglishV2InvalidError(verdict.issues);
  return JSON.stringify(sortKeys(verdict.document));
}

/** JSON 글자열 → 2판 문서. 못 읽는 글은 `invalid_json`, 읽힌 값은 검증기가 판정한다 */
export function parseEnglishV2Json(text: string): EnglishV2Verdict {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "invalid_json",
          path: "",
          message: "JSON 으로 읽을 수 없습니다.",
        },
      ],
    };
  }
  return validateEnglishV2Document(value);
}
