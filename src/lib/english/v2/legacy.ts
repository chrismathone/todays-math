/**
 * 오늘의 영어 — 1판 읽기 변환 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 옛 세트(1판)를 형식 판이 붙은 «읽기 모양»으로 **감싼다.** 2판 문서로 옮겨 적는 변환이 아니다 —
 * 1판 문항에는 표적 · 자리 · 표적별 정답이 없어서, 옮겨 적으면 없는 것을 지어내게 된다.
 *
 * 지키는 것:
 *   - 세트는 한 글자도 안 바뀐다. `meta: null` 은 null 로, 칸이 없던 것은 없는 채로 남는다(풀면 처음과 같다).
 *   - 저장된 해설 문자열을 고치거나 2판 해설 상태로 다시 분류하지 않는다.
 *   - 세트 상태 «검토 완료»를 정답 확인으로 올리지 않는다(`answerVerified` 는 늘 false).
 *   - 출처는 «미상»(`legacy_unknown`), 권한은 처음 값(unknown · 허락된 용도 없음).
 *   - 🔴 변환이 짓는 ID 는 **임시**다(`legacy:<세트 id>:…`). 저장되지 않고, 2판의 영구 ID(uuid) 꼴이 아니라
 *     2판 문서에 넣으면 계약이 거절한다 — 승인된 ID 나 출처 근거로 쓰지 않는다.
 *
 * 순수 함수다(서버 · 클라이언트 같이).
 */
import {
  englishSetSchema,
  type EnglishSet,
} from "@/contracts/english.contract";
import {
  ENGLISH_SCHEMA_VERSION_V1,
  ENGLISH_SCHEMA_VERSION_V2,
  type EnglishV2Document,
  type EnglishV2Rights,
} from "@/contracts/englishV2.contract";

import {
  type EnglishV2Issue,
  englishV2Path,
  validateEnglishV2Document,
} from "./validate";
import { englishV2Markers, probeEnglishSchemaVersion } from "./versionGate";

const PROVISIONAL_PREFIX = "legacy:";

/** 변환이 지은 임시 ID 인가 */
export function isProvisionalEnglishId(id: string): boolean {
  return id.startsWith(PROVISIONAL_PREFIX);
}

export interface EnglishLegacySetView {
  schemaVersion: typeof ENGLISH_SCHEMA_VERSION_V1;
  /** 1판 세트 그대로 */
  set: EnglishSet;
  /** 임시 ID — 화면이 문항을 가리킬 때만 쓴다. 저장하지 않는다 */
  provisional: { passageId: string; itemIds: string[] };
  provenance: { kind: "legacy_unknown" };
  rights: EnglishV2Rights;
  /** 세트 상태와 무관하게 false — 1판에는 정답을 확인한 행위의 기록이 없다 */
  answerVerified: false;
}

/** 1판 세트 → 읽기 모양. 넣은 세트는 고치지 않는다(깊은 복사) */
export function readEnglishV1Set(set: EnglishSet): EnglishLegacySetView {
  return {
    schemaVersion: ENGLISH_SCHEMA_VERSION_V1,
    set: structuredClone(set),
    provisional: {
      passageId: `${PROVISIONAL_PREFIX}${set.id}:passage`,
      itemIds: set.questions.map(
        (_question, index) => `${PROVISIONAL_PREFIX}${set.id}:q:${index}`,
      ),
    },
    provenance: { kind: "legacy_unknown" },
    rights: { rightsStatus: "unknown", allowedUses: [] },
    answerVerified: false,
  };
}

/** 읽기 모양 → 1판 세트. 처음 넣은 세트와 같다(임시 ID · 출처 · 권한은 싣지 않는다) */
export function restoreEnglishV1Set(view: EnglishLegacySetView): EnglishSet {
  return structuredClone(view.set);
}

export type EnglishVersionedRead =
  | {
      ok: true;
      schemaVersion: typeof ENGLISH_SCHEMA_VERSION_V1;
      view: EnglishLegacySetView;
    }
  | {
      ok: true;
      schemaVersion: typeof ENGLISH_SCHEMA_VERSION_V2;
      document: EnglishV2Document;
    }
  | { ok: false; issues: EnglishV2Issue[] };

/**
 * 판을 보고 읽는다 — 1판 세트는 읽기 모양으로, 2판 문서는 검증기를 지나 그대로.
 * 🔴 모르는 판 · 판 표지 없이 2판 칸이 든 값은 읽지 않는다(가까운 판으로 낮춰 읽지 않는다).
 * 1판인데 모양이 깨진 값도 고쳐서 읽지 않는다 — `shape` 로 거절한다.
 */
export function readEnglishVersioned(value: unknown): EnglishVersionedRead {
  const probe = probeEnglishSchemaVersion(value);
  if (probe.kind === "unsupported")
    return {
      ok: false,
      issues: [
        {
          code: "unsupported_version",
          path: "schemaVersion",
          message: `읽을 수 없는 형식 판입니다 (${JSON.stringify(probe.schemaVersion) ?? "없음"}).`,
        },
      ],
    };
  if (probe.kind === "v2") {
    const verdict = validateEnglishV2Document(value);
    return verdict.ok
      ? {
          ok: true,
          schemaVersion: ENGLISH_SCHEMA_VERSION_V2,
          document: verdict.document,
        }
      : verdict;
  }

  const [marker] = englishV2Markers(value);
  if (marker !== undefined)
    return {
      ok: false,
      issues: [
        {
          code: "unsupported_version",
          path: marker,
          message:
            "판 표지 없이 2판 칸이 들어 있습니다. 1판으로 읽으면 그 칸이 사라져 읽지 않습니다.",
        },
      ],
    };

  // `schemaVersion: 1` 표지는 1판 계약에 없는 칸이라 떼고 읽는다
  const body = { ...(value as Record<string, unknown>) };
  delete body.schemaVersion;
  const parsed = englishSetSchema.safeParse(body);
  if (!parsed.success)
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "shape" as const,
        path: englishV2Path(issue.path),
        message: issue.message,
      })),
    };
  // 계약은 통과 여부만 본다 — 계약이 다듬은 값(`trim`)이 아니라 **넣은 값 그대로** 감싼다
  return {
    ok: true,
    schemaVersion: ENGLISH_SCHEMA_VERSION_V1,
    view: readEnglishV1Set(body as EnglishSet),
  };
}
