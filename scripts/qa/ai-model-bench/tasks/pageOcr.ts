/**
 * 작업 둘 — 문제 추출의 두 걸음을 따로 잰다(제품 순서 그대로):
 *   page-ocr: 한 쪽 사진 → 문제마다 크롭 상자(`action: "page-ocr"` — 제품은 «찾기만» 한다, `detectionOnly`)
 *   crop-ocr: 잘라 낸 문제 사진 → 글 · 그림 상자(`action: "ocr"` — 보강 호출까지 제품 그대로)
 * 제품 지시문과 응답 해석(`executeMathgenTask`)을 그대로 쓴다.
 *
 * 정답이 있는 지면이 필요하다 — 실제 시험지 사진은 정답(문항 글 · 상자)이 없으므로, 공유 DB 의 문항(정답 글이
 * 있다)을 2단 A4 지면으로 **그려서** 사진을 만들고, 그린 브라우저에서 상자를 잰다. 그림은 문항의 엔진 SVG.
 * 한계: 인쇄 · 스캔 · 손글씨 같은 실물 잡음은 없다 — «깨끗한 지면에서의 상한»을 잰다(보고에 적는다).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { buildDevAiPrompt, executeMathgenTask } from "@/lib/dev-ai/tasks";
import { db } from "@/lib/db";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { coverage, matchBoxes, median, renderCheck, textSimilarity, type Box } from "../grade";
import type { Task } from "../task";

export interface PageTruthProblem {
  id: string;
  number: number;
  content: string;
  bbox: Box;
  figures: Box[];
}

export interface PageItem {
  id: string;
  image: string; // 표본 폴더 안의 PNG 경로
  problems: PageTruthProblem[];
}

const PER_PAGE = 4;
const WIDTH = 1240; // A4 150dpi
const HEIGHT = 1754;

const request = (dataUrl: string): DevAiRequest => ({
  provider: "codex" as DevAiRequest["provider"],
  action: "page-ocr",
  imageDataUrl: dataUrl,
  sourceName: "bench-page.png",
  grade: "고1",
});

const html = (problems: { number: number; content: string; svg: string | null }[], katexCss: string) => `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${katexCss}">
<style>
  body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;background:#fff;font-family:"Apple SD Gothic Neo","Noto Sans KR",sans-serif;font-size:21px;line-height:1.6;color:#111}
  header{height:110px;border-bottom:2px solid #111;margin:0 70px;display:flex;align-items:flex-end;padding-bottom:12px;font-size:30px;font-weight:700}
  main{display:grid;grid-template-columns:1fr 1fr;gap:60px;padding:40px 70px;}
  .col{display:flex;flex-direction:column;gap:56px;border-right:1px solid #999;padding-right:30px}
  .col:last-child{border-right:none;padding-right:0}
  .q b{margin-right:8px}
  .q svg{display:block;margin-top:14px;max-width:72%;height:auto}
</style></head><body><header>수학 확인 평가</header><main>
${[0, 1]
  .map(
    (c) =>
      `<div class="col">${problems
        .slice(c * Math.ceil(problems.length / 2), (c + 1) * Math.ceil(problems.length / 2))
        .map(
          (p) =>
            `<div class="q" data-n="${p.number}"><div><b>${p.number}.</b>${renderMathHtml(p.content)}</div>${p.svg ?? ""}</div>`,
        )
        .join("")}</div>`,
  )
  .join("")}
</main></body></html>`;

export const pageOcrTask: Task<PageItem> = {
  name: "page-ocr",
  vision: true,
  expectedOutputTokens: 3000,

  /** n = 쪽 수. 쪽마다 4문항, 그 가운데 1~2문항은 엔진 그림이 있는 것 */
  async sample({ n, seed, excludeIds = [], dir }) {
    const rows = await db.$queryRawUnsafe<{ id: string; content: string; figure_svg: string | null }[]>(
      `select id, content, figure_svg from problem
        where length(trim(answer)) > 0 and length(content) between 40 and 260
          and coalesce(array_length(figure_urls, 1), 0) = 0 and content !~ '<img|!\\['
          and (figure_svg is null or length(figure_svg) < 60000)
        order by md5(id::text || $1) limit 3000`,
      seed,
    );
    const eligible = new Set(
      (
        await db.problem.findMany({
          where: { AND: [problemEligibleWhere(), { id: { in: rows.map((r) => r.id) } }] },
          select: { id: true },
        })
      ).map((r) => r.id),
    );
    const pool = rows.filter((r) => eligible.has(r.id) && !excludeIds.includes(r.id));
    const withFig = pool.filter((r) => r.figure_svg);
    const plain = pool.filter((r) => !r.figure_svg);
    const katexCss = path.resolve("node_modules/katex/dist/katex.min.css");
    await mkdir(dir, { recursive: true });
    const browser = await chromium.launch();
    const pages: PageItem[] = [];
    try {
      const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
      for (let pi = 0; pi < n && withFig.length + plain.length >= PER_PAGE; pi++) {
        const figCount = pi % 2 ? 1 : 2;
        const chosen = [...withFig.splice(0, figCount), ...plain.splice(0, PER_PAGE - figCount)];
        const problems = chosen.map((r, i) => ({ number: i + 1, content: r.content, svg: r.figure_svg }));
        const file = path.join(dir, `page-${pi + 1}.html`);
        await writeFile(file, html(problems, katexCss));
        await tab.goto(`file://${file}`);
        await tab.evaluate(() => document.fonts.ready);
        // 문자열로 넘긴다 — tsx 가 함수에 `__name` 도우미를 끼워 브라우저에서 죽는다
        const boxes = (await tab.evaluate(`(() => {
          const W = ${WIDTH}, H = ${HEIGHT};
          const norm = (r) => ({ left: Math.round(r.left / W * 1000), top: Math.round(r.top / H * 1000),
            width: Math.round(r.width / W * 1000), height: Math.round(r.height / H * 1000) });
          return [...document.querySelectorAll(".q")].map((q) => ({
            n: Number(q.dataset.n),
            // 잉크가 있는 범위 — 단 너비가 아니라 글줄과 그림의 실제 너비(크롭이 «덮었나»를 재려고)
            bbox: (() => { const rg = document.createRange(); rg.selectNodeContents(q);
              const rects = [...rg.getClientRects(), ...[...q.querySelectorAll("svg")].map((s) => s.getBoundingClientRect())]
                .filter((r) => r.width > 0 && r.height > 0);
              const l = Math.min(...rects.map((r) => r.left)), t = Math.min(...rects.map((r) => r.top));
              const rr = Math.max(...rects.map((r) => r.right)), b = Math.max(...rects.map((r) => r.bottom));
              return norm({ left: l, top: t, width: rr - l, height: b - t }); })(),
            figures: [...q.querySelectorAll("svg")].map((s) => norm(s.getBoundingClientRect())),
          }));
        })()`)) as { n: number; bbox: Box; figures: Box[] }[];
        const image = path.join(dir, `page-${pi + 1}.png`);
        await tab.screenshot({ path: image, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
        pages.push({
          id: `page-${pi + 1}`,
          image,
          problems: boxes.map((b) => ({
            id: chosen[b.n - 1]!.id,
            number: b.n,
            content: chosen[b.n - 1]!.content,
            bbox: b.bbox,
            figures: b.figures,
          })),
        });
      }
    } finally {
      await browser.close();
    }
    return pages;
  },

  prompt: () => buildDevAiPrompt(request("data:image/png;base64,AAAA")),

  async runOne(item, arm, call) {
    const dataUrl = `data:image/png;base64,${(await readFile(item.image)).toString("base64")}`;
    let finish: "stop" | "length" | "other" = "other";
    let raw = "";
    try {
      const result = await executeMathgenTask(request(dataUrl), async (prompt) => {
        const out = await call(arm, { prompt, imageDataUrl: dataUrl });
        finish = out.finish;
        raw = out.text;
        if (out.finish !== "stop") throw new Error(`finish=${out.finish}`);
        return out.text;
      });
      const predicted = result.problems ?? [];
      const crop = matchBoxes(item.problems.map((p) => p.bbox), predicted.map((p) => p.bbox));
      return {
        finish,
        raw,
        score: {
          problems: item.problems.length,
          found: crop.matched.length,
          extraProblems: crop.extra,
          cropIou: crop.matched.map((m) => m.iou),
          // 크롭 상자가 정답 상자를 얼마나 덮나 — 잘린 문제(글이 상자 밖)를 잡는다
          cover: crop.matched.map((m) => coverage(item.problems[m.t]!.bbox, predicted[m.p]!.bbox)),
        },
      };
    } catch (error) {
      return {
        finish,
        raw,
        error: error instanceof Error ? error.message.slice(0, 300) : String(error),
        score: { problems: item.problems.length, found: 0, cropIou: [], cover: [], extraProblems: 0 },
      };
    }
  },

  needsFallback: (r) => r.finish !== "stop" || Boolean(r.error),

  summarize(records) {
    const sum = (k: string) => records.reduce((a, r) => a + Number(r.score[k] ?? 0), 0);
    const all = (k: string) => records.flatMap((r) => (r.score[k] as number[]) ?? []);
    const cost = records.reduce((a, r) => a + r.cost, 0);
    const pct = (x: number) => +(x * 100).toFixed(1);
    return {
      쪽: records.length,
      "실패(형식·잘림)": records.filter((r) => r.error).length,
      "문항 찾음": `${sum("found")}/${sum("problems")}`,
      "지어낸 문항": sum("extraProblems"),
      "크롭 IoU 중앙(%)": pct(median(all("cropIou"))),
      "정답 영역 덮음 중앙(%)": pct(median(all("cover"))),
      "덮음 95% 미만 문항": all("cover").filter((c) => c < 0.95).length,
      "쪽당 시간 중앙(초)": +(median(records.map((r) => r.ms)) / 1000).toFixed(1),
      "쪽당 비용($)": +(cost / Math.max(1, records.length)).toFixed(5),
      "합계 비용($)": +cost.toFixed(4),
    };
  },
};

/** crop-ocr 의 한 문항 — page-ocr 표본의 정답 상자로 잘라 낸 사진. 그림 상자는 잘라 낸 사진 기준 0~1000 */
export interface CropItem {
  id: string;
  image: string;
  content: string;
  figures: Box[];
}

const cropRequest = (dataUrl: string): DevAiRequest => ({
  provider: "codex" as DevAiRequest["provider"],
  action: "ocr",
  imageDataUrl: dataUrl,
  grade: "고1",
});

/** page-ocr 표본(쪽 사진 + 정답 상자)에서 문항 사진을 잘라 crop-ocr 표본을 만든다 — 같은 시드면 같은 문항 */
export async function cropsFromPages(pages: PageItem[], dir: string): Promise<CropItem[]> {
  const sharp = (await import("sharp")).default;
  await mkdir(dir, { recursive: true });
  const items: CropItem[] = [];
  for (const page of pages)
    for (const p of page.problems) {
      // 정답 상자 둘레에 1% 여백(제품 크롭도 여백을 둔다)
      const pad = 10;
      const box = {
        left: Math.max(0, p.bbox.left - pad),
        top: Math.max(0, p.bbox.top - pad),
        right: Math.min(1000, p.bbox.left + p.bbox.width + pad),
        bottom: Math.min(1000, p.bbox.top + p.bbox.height + pad),
      };
      const px = {
        left: Math.round((box.left / 1000) * WIDTH),
        top: Math.round((box.top / 1000) * HEIGHT),
        width: Math.round(((box.right - box.left) / 1000) * WIDTH),
        height: Math.round(((box.bottom - box.top) / 1000) * HEIGHT),
      };
      const image = path.join(dir, `${page.id}-q${p.number}.png`);
      await sharp(page.image).extract(px).toFile(image);
      const rel = (f: Box): Box => ({
        left: Math.round(((f.left - box.left) / (box.right - box.left)) * 1000),
        top: Math.round(((f.top - box.top) / (box.bottom - box.top)) * 1000),
        width: Math.round((f.width / (box.right - box.left)) * 1000),
        height: Math.round((f.height / (box.bottom - box.top)) * 1000),
      });
      items.push({ id: p.id, image, content: p.content, figures: p.figures.map(rel) });
    }
  return items;
}

export const cropOcrTask: Task<CropItem> = {
  name: "crop-ocr",
  vision: true,
  expectedOutputTokens: 1200,

  async sample(options) {
    const pages = await pageOcrTask.sample({ ...options, dir: path.join(options.dir, "pages") });
    return cropsFromPages(pages, path.join(options.dir, "crops"));
  },

  prompt: () => buildDevAiPrompt(cropRequest("data:image/png;base64,AAAA")),

  async runOne(item, arm, call) {
    const dataUrl = `data:image/png;base64,${(await readFile(item.image)).toString("base64")}`;
    let finish: "stop" | "length" | "other" = "other";
    let raw = "";
    try {
      const result = await executeMathgenTask(cropRequest(dataUrl), async (prompt) => {
        const out = await call(arm, { prompt, imageDataUrl: dataUrl });
        finish = out.finish;
        raw ||= out.text; // 첫 응답(본 인식)을 남긴다 — 보강 호출의 응답은 비용만 센다
        if (out.finish !== "stop") throw new Error(`finish=${out.finish}`);
        return out.text;
      });
      const fig = matchBoxes(item.figures, (result.figures ?? []).map((f) => f.bbox));
      return {
        finish,
        raw,
        score: {
          textSim: textSimilarity(result.content, item.content),
          renderFail: renderCheck(result.content).renderFail + (renderCheck(result.content).dollarOdd ? 1 : 0),
          figures: item.figures.length,
          figuresFound: fig.matched.length,
          figureIou: fig.matched.map((m) => m.iou),
          extraFigures: fig.extra,
        },
      };
    } catch (error) {
      return {
        finish,
        raw,
        error: error instanceof Error ? error.message.slice(0, 300) : String(error),
        score: { textSim: 0, figures: item.figures.length, figuresFound: 0, figureIou: [], extraFigures: 0 },
      };
    }
  },

  needsFallback: (r) => r.finish !== "stop" || Boolean(r.error),

  summarize(records) {
    const sum = (k: string) => records.reduce((a, r) => a + Number(r.score[k] ?? 0), 0);
    const sims = records.map((r) => Number(r.score.textSim ?? 0));
    const ious = records.flatMap((r) => (r.score.figureIou as number[]) ?? []);
    const cost = records.reduce((a, r) => a + r.cost, 0);
    const pct = (x: number) => +(x * 100).toFixed(1);
    return {
      문항: records.length,
      실패: records.filter((r) => r.error).length,
      "글 일치 중앙(%)": pct(median(sims)),
      "글 일치 최저(%)": pct(Math.min(...sims)),
      "글 98% 이상 문항": sims.filter((x) => x >= 0.98).length,
      "수식 렌더 실패 문항": records.filter((r) => Number(r.score.renderFail ?? 0) > 0).length,
      "그림 찾음": `${sum("figuresFound")}/${sum("figures")}`,
      "그림 IoU 중앙(%)": ious.length ? pct(median(ious)) : "-",
      "지어낸 그림": sum("extraFigures"),
      "시간 중앙(초)": +(median(records.map((r) => r.ms)) / 1000).toFixed(1),
      "문항당 비용($)": +(cost / Math.max(1, records.length)).toFixed(5),
      "합계 비용($)": +cost.toFixed(4),
    };
  },
};
