/**
 * 오늘의 영어 — 세트의 «만든 조건» (원장님 2026-10-01 «입력할 수 있는 모든 메타데이터 기억되게»).
 * 만들기 화면이 저장할 때 짓고(`englishMetaFromConditions`), 편집 화면이 한 줄로 읽는다(`englishMetaLine`).
 * 순수 함수다(서버 · 클라이언트 같이).
 */
import type {
  EnglishGenerateRequest,
  EnglishSetMeta,
} from "@/contracts/english.contract";

type Path = EnglishSetMeta["path"];

const PATH_LABEL: Record<Path, string> = {
  chatgpt: "ChatGPT 로 제작",
  api: "API 직접 생성",
  cloze: "원문 복원",
};

const MODE_LABEL: Record<NonNullable<EnglishSetMeta["mode"]>, string> = {
  new: "새 지문 생성",
  original: "원문 유지",
  variation: "원문 변형",
};

export interface EnglishMetaExtra {
  model?: string;
  promptVersion?: string;
  materialName?: string;
  passageRef?: EnglishSetMeta["passageRef"];
}

/**
 * 만들기 조건 → 만든 조건. 원문 유지의 원문은 세트 지문과 같아 싣지 않고(변형만 원문이 다르다),
 * 지문 길이는 원문 유지에서 쓰지 않으므로 싣지 않는다. 소재는 새 지문일 때만.
 */
export function englishMetaFromConditions(
  path: Exclude<Path, "cloze">,
  conditions: Omit<EnglishGenerateRequest, "examId">,
  extra: EnglishMetaExtra = {},
): EnglishSetMeta {
  const meta: EnglishSetMeta = {
    path,
    mode: conditions.mode,
    difficulty: conditions.difficulty,
    count: conditions.count,
    types: [...conditions.types],
  };
  if (conditions.mode === "new" && conditions.topic.trim())
    meta.topic = conditions.topic.trim();
  if (conditions.mode !== "original") meta.words = conditions.words;
  if (conditions.mode === "variation" && conditions.passage.trim())
    meta.sourcePassage = conditions.passage.trim();
  if (extra.materialName) meta.materialName = extra.materialName;
  if (extra.passageRef) meta.passageRef = { ...extra.passageRef };
  if (extra.model) meta.model = extra.model;
  if (extra.promptVersion) meta.promptVersion = extra.promptVersion;
  return meta;
}

/** 편집 화면의 한 줄 — «API 직접 생성(gpt-6-luna · 프롬프트 v3) · 원문 변형 · 표준 · 6문항 · 약 200단어 · 주제 · 어법» */
export function englishMetaLine(
  meta: EnglishSetMeta | null | undefined,
): string | null {
  if (!meta) return null;
  const engine = [
    meta.model,
    meta.promptVersion && `프롬프트 ${meta.promptVersion}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const parts = [`${PATH_LABEL[meta.path]}${engine ? `(${engine})` : ""}`];
  if (meta.mode) parts.push(MODE_LABEL[meta.mode]);
  if (meta.topic) parts.push(`소재 «${meta.topic}»`);
  if (meta.difficulty) parts.push(meta.difficulty);
  if (meta.count)
    parts.push(
      meta.path === "cloze" ? `최대 ${meta.count}문항` : `${meta.count}문항`,
    );
  if (meta.words) parts.push(`약 ${meta.words}단어`);
  if (meta.types?.length) parts.push(...meta.types);
  if (meta.materialName) parts.push(`자료 «${meta.materialName}»`);
  return parts.join(" · ");
}
