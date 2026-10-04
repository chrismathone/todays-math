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
}

/** Only explicit numbered question headings become items; missing boundaries fail closed. */
export function listeningPdfQuestionBoxes(
  items: ListeningPdfText[],
  width: number,
  height: number,
  maxNumber = 30,
): ListeningPdfQuestionBox[] {
  const headings = items.flatMap((item) => {
    const match = item.str.trim().match(/^(\d{1,2})\.(?:\s|$)/);
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
  return headings
    .filter((h) => h.number <= maxNumber)
    .map((heading) => {
      const column = columns.findIndex((x) => Math.abs(x - heading.x) < 24);
      const left = Math.max(0, columns[column] - 4);
      const right = columns[column + 1] ? columns[column + 1] - 12 : width - 30;
      const top = Math.max(0, heading.y - heading.height - 5);
      const next = headings
        .filter((h) => Math.abs(h.x - heading.x) < 24 && h.y > heading.y + 4)
        .toSorted((a, b) => a.y - b.y)[0];
      const bottom = next ? next.y - next.height - 7 : height - 45;
      const lines = items
        .filter(
          (item) =>
            item.str.trim() &&
            item.x >= left &&
            item.x < right &&
            item.y >= top &&
            item.y < bottom,
        )
        .toSorted((a, b) => (Math.abs(a.y - b.y) < 3 ? a.x - b.x : a.y - b.y));
      const firstChoice = lines.findIndex((item) => /[①②③④⑤]/.test(item.str));
      const prompt = lines
        .slice(0, firstChoice < 0 ? lines.length : firstChoice)
        .map((item) => item.str.trim())
        .join(" ")
        .replace(/^\d+\.\s*/, "")
        .trim();
      if (right <= left || bottom <= top || !prompt)
        throw new Error(
          `${heading.number}번 문항의 범위를 확인하지 못했습니다.`,
        );
      return {
        number: heading.number,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        prompt: prompt.slice(0, 2000),
      };
    });
}

/** Parse explicit number/choice pairs in answer tables, never guess an absent answer. */
export function listeningPdfAnswers(text: string): Map<number, number> {
  const result = new Map<number, number>();
  for (const match of text.matchAll(/(?:^|\s)(\d{1,2})\s*([①②③④⑤])(?=\s|$)/g)) {
    const number = Number(match[1]);
    const answer = "①②③④⑤".indexOf(match[2]);
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
    await doc.destroy();
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
    await doc.destroy();
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
    await doc.destroy();
  }
}
