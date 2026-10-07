import type { ListeningEditQuestion } from "../listening/listeningDraft";

export interface ListeningPdfText {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ListeningPdfQuestionBox {
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt: string;
  instruction?: string;
}

/** Only explicit numbered question headings become items; missing boundaries fail closed. */
export function listeningPdfQuestionBoxes(
  items: ListeningPdfText[],
  width: number,
  height: number,
  maxNumber = 30,
): ListeningPdfQuestionBox[] {
  // Older mastheads split "2025. 4. 4. (금) 시행" into separate text items.
  const dateRows = items.flatMap((anchor) => {
    if (!/^(?:19|20)\d{2}\s*[.년]/.test(anchor.str.trim())) return [];
    const line = items
      .filter((item) => Math.abs(item.y - anchor.y) < 3)
      .toSorted((a, b) => a.x - b.x)
      .map((item) => item.str.trim())
      .join(" ");
    return /(?:19|20)\d{2}\s*[.년]\s*\d{1,2}\s*[.월]\s*\d{1,2}/.test(line) &&
      line.includes("시행")
      ? [anchor.y]
      : [];
  });
  const headings = items.flatMap((item) => {
    const value = item.str.trim();
    if (dateRows.some((y) => Math.abs(item.y - y) < 3)) return [];
    // The original assessment masthead splits dates into "8. (화) 시행".
    if (/^\d{1,2}\.\s*\([월화수목금토일]\)/.test(value)) return [];
    const match = value.match(/^(\d{1,2})\.(?:\s|$)/);
    if (!match || !Number(match[1])) return [];
    return [{ ...item, number: Number(match[1]) }];
  });
  const columns: number[] = [];
  for (const heading of headings.toSorted((a, b) => a.x - b.x))
    if (!columns.some((x) => Math.abs(x - heading.x) < 24))
      columns.push(heading.x);
  if (columns.length > 4)
    throw new Error(
      "문항의 열 구분을 확인하지 못했습니다. 문제지만 선택하세요.",
    );
  const readingOrder = (a: ListeningPdfText, b: ListeningPdfText) =>
    Math.abs(a.y - b.y) < 3 ? a.x - b.x : a.y - b.y;
  const sharedHeading = /^[【\[]\s*(\d{1,2})\s*[-~～–]\s*(\d{1,2})\s*[】\]]\s*/;
  const shared = items.flatMap((item) => {
    const match = item.str.trim().match(sharedHeading);
    if (!match) return [];
    const first = Number(match[1]);
    const last = Number(match[2]);
    const heading = headings.find(
      (h) => h.number === first && Math.abs(h.x - item.x) < 24 && h.y > item.y,
    );
    if (!heading || first > last) return [];
    const column = columns.findIndex((x) => Math.abs(x - heading.x) < 24);
    const left = Math.max(0, Math.min(columns[column], item.x) - 4);
    const right = columns[column + 1] ? columns[column + 1] - 12 : width - 30;
    const top = Math.max(0, item.y - item.height - 5);
    const prompt = items
      .filter(
        (line) =>
          line.str.trim() &&
          line.x >= left &&
          line.x < right &&
          line.y >= top &&
          line.y < heading.y - heading.height - 5,
      )
      .toSorted(readingOrder)
      .map((line) => line.str.trim())
      .join(" ")
      .replace(sharedHeading, "")
      .trim();
    return prompt ? [{ first, last, column, left, top, prompt }] : [];
  });
  return headings
    .filter((h) => h.number <= maxNumber)
    .map((heading) => {
      const column = columns.findIndex((x) => Math.abs(x - heading.x) < 24);
      const instruction = shared.find(
        (group) =>
          group.column === column &&
          heading.number >= group.first &&
          heading.number <= group.last,
      );
      const startsInstruction = instruction?.first === heading.number;
      const left = startsInstruction
        ? instruction.left
        : Math.max(0, columns[column] - 4);
      const right = columns[column + 1] ? columns[column + 1] - 12 : width - 30;
      const headingTop = Math.max(0, heading.y - heading.height - 5);
      const top = startsInstruction ? instruction.top : headingTop;
      const next = headings
        .filter((h) => Math.abs(h.x - heading.x) < 24 && h.y > heading.y + 4)
        .toSorted((a, b) => a.y - b.y)[0];
      const nextInstruction = next
        ? shared.find(
            (group) => group.column === column && group.first === next.number,
          )
        : undefined;
      const nextTop = nextInstruction
        ? nextInstruction.top - 2
        : next
          ? next.y - next.height - 7
          : height - 45;
      const endNotice = items.find(
        (item) =>
          item.x >= left &&
          item.x < right &&
          item.y > heading.y &&
          item.str.replace(/\s/g, "").startsWith("이제듣기문제가끝났습니다"),
      );
      const bottom = endNotice
        ? Math.min(nextTop, endNotice.y - endNotice.height - 7)
        : nextTop;
      const lines = items
        .filter(
          (item) =>
            item.str.trim() &&
            item.x >= left &&
            item.x < right &&
            item.y >= headingTop &&
            item.y < bottom,
        )
        .toSorted(readingOrder);
      const firstChoice = lines.findIndex((item) => /[①②③④⑤]/.test(item.str));
      const ownPrompt = lines
        .slice(0, firstChoice < 0 ? lines.length : firstChoice)
        .map((item) => item.str.trim())
        .join(" ")
        .replace(/^\d+\.\s*/, "")
        .trim();
      const prompt = instruction
        ? `${instruction.prompt} ${ownPrompt}`
        : ownPrompt;
      if (right <= left || bottom <= top || !prompt)
        throw new Error(
          `${heading.number}번 문항의 범위를 확인하지 못했습니다.`,
        );
      if (prompt.length > 2000)
        throw new Error(
          `${heading.number}번 문항의 안내문이 2,000자를 넘습니다.`,
        );
      return {
        number: heading.number,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        prompt,
        ...(instruction && !startsInstruction
          ? { instruction: instruction.prompt }
          : {}),
      };
    });
}

/** Parse explicit number/choice pairs in answer tables, never guess an absent answer. */
export function listeningPdfAnswers(text: string): Map<number, number> {
  const result = new Map<number, number>();
  // Official older sheets append choice frequencies, which are not question answers.
  const answerTable = text.split(/정답\s*번호\s*개수/, 1)[0];
  for (const match of answerTable.matchAll(
    /(?:^|\s)(\d{1,2})\s*([①②③④⑤⓵⓶⓷⓸⓹])(?=\s|$)/g,
  )) {
    const number = Number(match[1]);
    const answer = "①②③④⑤⓵⓶⓷⓸⓹".indexOf(match[2]) % 5;
    if (result.has(number) && result.get(number) !== answer)
      throw new Error(`${number}번 정답이 서로 다르게 표시돼 있습니다.`);
    result.set(number, answer);
  }
  return result;
}

async function openPdf(file: File) {
  if (!/\.pdf$/i.test(file.name) || file.size > 12 * 1024 * 1024)
    throw new Error("12MB 이하의 PDF 파일을 선택하세요.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/api/studio/pdf-worker";
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true,
  }).promise;
  if (doc.numPages > 30) {
    await doc.loadingTask.destroy();
    throw new Error("30쪽 이하의 자료를 선택하세요.");
  }
  return { doc, pdfjs };
}

export async function readListeningPdfText(file: File) {
  const { doc } = await openPdf(file);
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .filter((item) => "str" in item)
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
    }
    return pages.join("\n");
  } finally {
    await doc.loadingTask.destroy();
  }
}

export async function readListeningQuestionPdf(
  file: File,
  maxNumber: number,
  signal: AbortSignal,
): Promise<ListeningEditQuestion[]> {
  const { doc, pdfjs } = await openPdf(file);
  const questions: ListeningEditQuestion[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      signal.throwIfAborted();
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: ListeningPdfText[] = content.items.flatMap((item) => {
        if (!("str" in item)) return [];
        const matrix = pdfjs.Util.transform(viewport.transform, item.transform);
        return [
          {
            str: item.str,
            x: matrix[4],
            y: matrix[5],
            width: item.width,
            height: item.height,
          },
        ];
      });
      const boxes = listeningPdfQuestionBoxes(
        items,
        viewport.width,
        viewport.height,
        maxNumber,
      );
      if (!boxes.length) continue;
      const scale = 1.8;
      const canvas = document.createElement("canvas");
      const renderViewport = page.getViewport({ scale });
      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("문제지 그림을 읽을 수 없습니다.");
      await page.render({
        canvas,
        canvasContext: context,
        viewport: renderViewport,
      }).promise;
      for (const box of boxes) {
        const crop = document.createElement("canvas");
        crop.width = Math.ceil(box.width * scale);
        crop.height = Math.ceil(box.height * scale);
        const cropContext = crop.getContext("2d", { alpha: false });
        if (!cropContext) throw new Error("문항 그림을 읽을 수 없습니다.");
        cropContext.drawImage(
          canvas,
          box.x * scale,
          box.y * scale,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height,
        );
        const dataUrl = crop.toDataURL("image/png");
        if (dataUrl.length > 300_000)
          throw new Error(
            `${box.number}번 그림이 너무 큽니다. 문항을 나눠 등록하세요.`,
          );
        const choices = [..."①②③④⑤"].map((text) => ({
          id: crypto.randomUUID(),
          text,
        }));
        questions.push({
          id: crypto.randomUUID(),
          sourceNumber: box.number,
          prompt: box.prompt,
          ...(box.instruction ? { instruction: box.instruction } : {}),
          image: { dataUrl, width: crop.width, height: crop.height },
          choices,
          answerChoiceId: null,
          explanation: "",
          evidence: [],
        });
      }
      canvas.width = 0;
      canvas.height = 0;
    }
    questions.sort((a, b) => a.sourceNumber! - b.sourceNumber!);
    if (
      !questions.length ||
      new Set(questions.map((q) => q.sourceNumber)).size !== questions.length
    )
      throw new Error(
        "문항 번호를 정확히 나누지 못했습니다. 정답·대본 대신 문제지 PDF를 선택하세요.",
      );
    if (questions.some((q, index) => q.sourceNumber !== index + 1))
      throw new Error("빠진 문항 번호가 있습니다. 전체 문제지를 확인하세요.");
    if (JSON.stringify(questions).length > 3 * 1024 * 1024)
      throw new Error(
        "문항 그림의 합계가 너무 큽니다. 회차를 나눠 등록하세요.",
      );
    return questions;
  } finally {
    await doc.loadingTask.destroy();
  }
}
