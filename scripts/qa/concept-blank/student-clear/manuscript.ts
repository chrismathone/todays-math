/** Plan only the approved bank-definition turns, preserving independently authored dialogue. */
import type { ConceptTeachingScript } from "@/lib/textbook/scripts/types";
import type { StaticCorrection } from "@/lib/textbook/scripts/corrections";
import { contentHash } from "./proposals";
import type { ContentApplicationPlan } from "./application";

export function planManuscriptCorrections(input: {
  current: readonly ConceptTeachingScript[];
  materialized: readonly ConceptTeachingScript[];
  corrections: readonly StaticCorrection[];
  changes: ContentApplicationPlan["definitionChanges"];
}) {
  const scripts = structuredClone(input.current) as ConceptTeachingScript[];
  const corrections = structuredClone(input.corrections) as StaticCorrection[];
  const changes = new Map(input.changes.map((row) => [row.id, row]));
  if (changes.size !== input.changes.length)
    throw new Error("중복 일반 설명 변경 ID");
  const generated = new Map(
    input.materialized.map((script) => [script.sectionKey, script]),
  );
  const seenSections = new Set<string>();
  const turnChanges: {
    sectionKey: string;
    turnIndex: number;
    entryId: string;
    correctionId: string;
    before: string;
    after: string;
    contentHash: string;
  }[] = [];
  for (const script of scripts) {
    if (seenSections.has(script.sectionKey))
      throw new Error("중복 대본 소단원");
    seenSections.add(script.sectionKey);
    for (let index = 0; index < script.dialogue.length; index++) {
      const turn = script.dialogue[index]!;
      if (turn.source.kind !== "bank-concept") continue;
      const change = changes.get(turn.source.entryId);
      if (!change) continue;
      const desired = generated.get(script.sectionKey)?.dialogue[index];
      if (
        !desired ||
        contentHash({ ...turn, markdown: "" }) !==
          contentHash({ ...desired, markdown: "" })
      )
        throw new Error(
          `대본의 출처·배치가 바뀌었습니다: ${script.sectionKey}#${index}`,
        );
      if (turn.markdown === desired.markdown) continue;
      const previous = corrections.filter(
        (row) =>
          row.sectionKey === script.sectionKey && row.turnIndex === index,
      );
      if (previous.length > 1) throw new Error("대본 교정 원장의 중복 위치");
      let correctionId: string;
      if (previous.length) {
        const recorded = previous[0]!;
        if (
          recorded.kind !== "bank-definition" ||
          recorded.new !== turn.markdown ||
          contentHash(recorded.source) !== contentHash(turn.source)
        )
          throw new Error(
            `이전 대본 교정과 현재 대본이 다릅니다: ${recorded.id}`,
          );
        recorded.new = desired.markdown;
        recorded.reason += ` 학생 관점 개념 문장의 후속 교정: ${change.reason}`;
        correctionId = recorded.id;
      } else {
        correctionId = `SC-${String(corrections.length + 1).padStart(3, "0")}`;
        if (corrections.some((row) => row.id === correctionId))
          throw new Error("대본 교정 번호 충돌");
        corrections.push({
          id: correctionId,
          sectionKey: script.sectionKey,
          turnIndex: index,
          source: turn.source,
          kind: "bank-definition",
          old: turn.markdown,
          new: desired.markdown,
          reason: `Codex·Claude 검토 내용 적용 계획에 따른 일반 설명 동기화: ${change.reason}`,
        });
      }
      turnChanges.push({
        sectionKey: script.sectionKey,
        turnIndex: index,
        entryId: change.id,
        correctionId,
        before: turn.markdown,
        after: desired.markdown,
        contentHash: change.contentHash,
      });
      turn.markdown = desired.markdown;
    }
  }
  return { scripts, corrections, turnChanges };
}
