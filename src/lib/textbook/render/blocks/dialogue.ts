import { getTextbookCharacter } from "../../characters";
import type { EditorialBlock } from "../editorial";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import { imageHtml, type RenderResources } from "./shared";

export function renderDialogueHtml(
  block: Extract<EditorialBlock, { kind: "dialogue" }>,
  resources: RenderResources,
): string {
  // Frozen bytes are addressed by SHA256. Only our explicit speaker namespace opts into
  // atlas clipping, so older single-image portraits and imported speakers keep their layout.
  const character = block.speakerId.startsWith("tb-portrait-")
    ? getTextbookCharacter(block.speakerId.slice("tb-portrait-".length))
    : undefined;
  if (character) {
    const expressions = {
      neutral: "편안한 표정",
      question: "질문하는 표정",
      thinking: "생각하는 표정",
      aha: "깨달은 표정",
    };
    const expression = Object.hasOwn(expressions, block.expression)
      ? (block.expression as keyof typeof expressions)
      : "neutral";
    return `<div class="tb-dialogue tb-dialogue-atlas tb-dialogue-${block.side} tb-speaker-${character.role}" data-expression="${expression}" data-speaker-id="${esc(block.speakerId)}"><div class="tb-portrait"><span class="tb-portrait-frame tb-expression-${expression}${block.mirrorPortrait ? " tb-frame-mirrored" : ""}">${imageHtml(resources, block.portraitAssetId, `${character.name} · ${expressions[expression]}`, undefined, true)}</span><span class="tb-portrait-name">${esc(character.name)}</span></div><div class="tb-bubble">${md(block.markdown)}</div></div>`;
  }
  return `<div class="tb-dialogue tb-dialogue-${block.side}" data-expression="${esc(block.expression)}"><div class="tb-portrait${block.mirrorPortrait ? " tb-mirrored" : ""}">${imageHtml(resources, block.portraitAssetId, block.speakerId)}</div><div class="tb-bubble"><strong>${esc(block.speakerId)}</strong>${md(block.markdown)}</div></div>`;
}
