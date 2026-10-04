import type { TextbookPage } from "../../layout/paginate";
import {
  EDITORIAL_STAGES,
  editorialUnitAsset,
  editorialUnitNumber,
  type EditorialBlock,
  type EditorialStage,
} from "../editorial";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import type { TextbookRenderModel } from "../model";
import { editorialImage, progressHtml, type RenderResources } from "./shared";

export function renderUnitIntroHtml(
  block: Extract<EditorialBlock, { kind: "unit-intro" }>,
  resources: RenderResources,
): string {
  return `<section class="tb-unit-intro">${unitHeading(block, resources)}<div class="tb-unit-goals"><h3>이 단원의 학습 목표</h3><ul>${block.goals.map((goal) => `<li>${md(goal)}</li>`).join("")}</ul>${block.prerequisites.length ? `<h3>학습의 연결 · 준비할 개념</h3><ul>${block.prerequisites.map((goal) => `<li>${md(goal)}</li>`).join("")}</ul>` : ""}</div></section>`;
}

export function renderHeadingHtml(
  block: Extract<EditorialBlock, { kind: "heading" }>,
  resources: RenderResources,
  stage: EditorialStage,
): string {
  if (stage === "unit") return unitHeading(block, resources);
  const heading = block as EditorialBlock & {
    subtitle?: string;
    stageNumber?: string | number;
  };
  const meta = EDITORIAL_STAGES[stage];
  const rawNumber = heading.stageNumber ?? meta.number;
  const number = rawNumber === "" ? "" : String(rawNumber).padStart(2, "0");
  return `<section class="tb-stage-heading"><header class="tb-stage-head"><div class="tb-kicker">${esc(meta.label)}</div><h2 class="tb-section-heading">${esc(block.title)}</h2><p class="tb-stage-subtitle">${esc(heading.subtitle ?? meta.subtitle)}</p>${number.trim() ? `<span class="tb-stage-number" aria-hidden="true">${esc(number)}</span>` : ""}${stage === "rest" ? `<figure class="tb-rest-sprout">${editorialImage(resources, "learning-sprout.png", "책에서 자라는 배움의 새싹")}</figure>` : ""}</header>${progressHtml(stage)}</section>`;
}

function unitHeading(
  block: EditorialBlock & { title: string },
  resources: RenderResources,
): string {
  const number = String(editorialUnitNumber(block)).padStart(2, "0");
  return `<section class="tb-unit-heading"><div class="tb-unit-number"><small>UNIT</small><b>${number}</b></div><h2 class="tb-unit-title">${esc(block.title)}</h2><p class="tb-unit-question">이번 단원에서 무엇을 배우게 될까?</p><figure class="tb-unit-art">${editorialImage(resources, editorialUnitAsset(block), "종이와 유리 조형으로 표현한 수학 단원 삽화")}</figure><div class="tb-unit-key"><i aria-hidden="true"></i>개념을 읽고, 풀이를 설명하다</div></section>`;
}

export function renderCoverHtml(
  page: TextbookPage,
  model: TextbookRenderModel,
  resources: RenderResources,
): string {
  const school = {
    elementary: "초등수학",
    middle: "중등수학",
    high: "고등수학",
  }[model.config.schoolLevel];
  const titleSize =
    model.title.length <= 7
      ? 68
      : model.title.length <= 18
        ? 40
        : model.title.length <= 40
          ? 30
          : 22;
  const codeSize = model.config.displayCode.length > 12 ? 24 : 45;
  return `<article class="tb-paper tb-cover" data-textbook-page="${page.physicalPageIndex}" style="--tb-cover-title-size:${titleSize}pt;--tb-cover-code-size:${codeSize}pt"><div class="tb-cover-top">INJAEWON MATHEMATICS<span>${school}</span></div><div class="tb-cover-title"><p>인재원 수학</p><h1>${esc(model.title)}</h1><div class="tb-cover-code">${esc(model.config.displayCode)}</div><p class="tb-cover-sub">${model.config.grade}학년 · ${model.config.semester}학기 · ${model.config.volume}권</p>${model.variant === "answers" ? '<p class="tb-cover-edition">정답과 해설</p>' : ""}</div><figure class="tb-cover-art">${editorialImage(resources, "cover.png", "종이와 유리 재질의 수학 조형 정원")}</figure><div class="tb-cover-equations"><span>개념 · 유형 · 설명</span><i aria-hidden="true"></i><span>${esc(model.config.displayCode)}</span></div><div class="tb-cover-bottom"><span>개념을 읽고, 풀이를 설명하다</span><b>INJAEWON</b></div></article>`;
}
