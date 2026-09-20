import { expect, test } from "@playwright/test";

test("source in-card math, figure and metadata edits save together and survive reopen", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/dev/unified/ai", (route) =>
    route.fulfill({ json: { enabled: false, providers: [] } }),
  );
  await page.goto("/");
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 700;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 700, 700);
    context.strokeRect(70, 70, 400, 300);
    const image = canvas.toDataURL();
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200"><path d="M30 170 L260 170 L260 30 Z" fill="none" stroke="black" stroke-width="2"/><text x="245" y="22">A</text></svg>';
    sessionStorage.setItem(
      "studio-test-archive",
      JSON.stringify([
        {
          id: "parity-17",
          sourceId: "parity-source",
          sourceLabel: "원본 편집 검증",
          page: 1,
          rect: { x: 0, y: 0, width: 1, height: 1 },
          image,
          sourceSize: { width: 700, height: 700 },
          content:
            "삼각형의 넓이는 $\\frac{1}{2}$입니다. [4점]\n\n[그림1]\n\n> <조건>\n> 주어진 식을 풀 것\n\n① $1$ ② $2$ ③ $3$ ④ $4$ ⑤ $5$\n\n마지막 문장.",
          answer: "1",
          solution: "넓이를 계산합니다.",
          grade: "중2",
          level: "secondary",
          mode: "text",
          added: false,
          figures: [
            {
              id: "triangle",
              rect: { x: 0.1, y: 0.1, width: 0.6, height: 0.4 },
              image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
              svg,
              originalImage: image,
            },
          ],
          ocr: {
            number: 17,
            topic: "삼각형",
            blocks: [],
            choiceGroups: [],
            subQuestions: [],
            confidence: "low",
            choicesLayout: "3x2",
            bodyMissing: false,
            choicesMissing: false,
            printedScore: "4점",
            contentEdited: true,
          },
        },
      ]),
    );
  });
  await page.getByRole("button", { name: "보관한 원본 다시 열기" }).click();
  const card = page.getByRole("article", {
    name: "문제 17 인식 결과",
    exact: true,
  });
  await expect(card.locator(".choice")).toHaveCount(5);
  await expect(card.locator("[data-condition-box]")).toHaveCount(1);
  await expect(card).toContainText("인식 신뢰도가 낮습니다.");
  const figure = card.getByRole("button", { name: /^그림 1 편집/ });
  await expect(figure).toHaveCount(1);
  // 복원 뒤 자동 저장이 «저장 중»→«저장됨»으로 바뀔 때 읽기 화면이 도형 단추를 통째로
  // 다시 만든다(렌더러 components 가 렌더마다 새 함수) — 그 사이에 포커스를 주면 Enter 가
  // 허공에 가서 편집기가 안 열렸다(10회에 1~2회, 트랙 23). 저장이 끝난 뒤에 누른다.
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await figure.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "도형 1-1 편집기" });
  await expect(dialog).toBeVisible();
  const rect = await dialog.boundingBox();
  expect(rect!.height).toBeLessThanOrEqual(760);
  await dialog.getByRole("button", { name: "취소", exact: true }).click();

  await card.getByRole("button", { name: "내용 수정", exact: true }).click();
  const body = card.getByRole("textbox", { name: "문제 내용", exact: true });
  await expect(body).toHaveAttribute("contenteditable", "true");
  await expect(card.locator("textarea")).toHaveCount(0);
  await expect(body.locator(".choice")).toHaveCount(5);
  await body.locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(" 취소할 내용");
  await card.getByRole("button", { name: "취소", exact: true }).click();
  await expect(card).not.toContainText("취소할 내용");

  /*
   * 확대를 손으로 켠다 — 검수에 들어섰다고 저절로 확대되지는 않는다(원장님 2026-09-21,
   * 2026-09-19 시안 B 를 물렸다). 아래 Esc 가 수식 칸만 닫는지 보려면 확대가 켜져 있어야 한다.
   * 켜지 않고 두면 이 가드는 «없다»가 아니라 «못 센다»가 된다.
   */
  await page.getByRole("button", { name: "편집창 확대", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "문제 제작 스튜디오" }),
  ).toBeVisible();

  await card.getByRole("button", { name: "내용 수정", exact: true }).click();
  await body
    .getByRole("button", { name: "수식 편집", exact: true })
    .first()
    .click();
  const field = body.locator("math-field");
  await expect(field).toBeVisible();
  // 칸이 보이자마자 친다 — 기다리지 않는다. MathLive 는 입력 자리에 포커스를 60ms 뒤에
  // 넘겨서, 그 틈에 친 글자는 사라지고 Esc 는 작업실 확대를 풀었다(2026-09-20 트랙 23).
  // 페이지가 느린 기계에서는 키가 늦게 닿아 초록이 됐다 — 그래서 기다리면 결함이 숨는다.
  await page.keyboard.press("Control+a");
  await page.keyboard.type("3/4");
  await page.keyboard.press("Escape");
  await expect(field).toHaveCount(0);
  // Esc 는 수식 칸만 닫는다 — 손으로 켠 작업실 확대는 그대로다.
  await expect(
    page.getByRole("dialog", { name: "문제 제작 스튜디오" }),
  ).toBeVisible();
  await expect(
    body.getByRole("button", { name: "수식 편집", exact: true }).first(),
  ).toHaveAttribute("data-math-tex", encodeURIComponent("\\frac34"));
  await body.locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(" 직접 수정");
  await card.getByRole("spinbutton", { name: "문제 번호" }).fill("20");
  await card.getByRole("textbox", { name: "토픽" }).fill("넓이 검수");
  await card.getByRole("button", { name: "저장", exact: true }).click();
  const saved = page.getByRole("article", {
    name: "문제 20 인식 결과",
    exact: true,
  });
  await expect(saved).toContainText("직접 수정");
  await expect(saved).toContainText("넓이 검수");
  await expect(saved.locator(".choice")).toHaveCount(5);
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await page.reload();
  await expect(saved).toContainText("직접 수정");
  await expect(saved).toContainText("넓이 검수");
  await expect(saved.locator(".choice")).toHaveCount(5);
  await expect(saved.getByRole("button", { name: /^그림 1 편집/ })).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "1문항 담기", exact: true }).click();
  const [problem] = JSON.parse(
    (await page.getByLabel("시험지 담은 문제").textContent())!,
  );
  expect(problem.content).toContain("직접 수정");
  expect(problem.content).toContain("[그림1]");
  // «3» 만 보면 보기 «③ $3$» 에 늘 걸린다 — 친 수식 그대로를 본다.
  expect(problem.content).toContain("$\\frac34$");
  expect(problem.content).not.toContain("\\frac{1}{2}");
  expect(problem.ocr).toMatchObject({
    number: 20,
    topic: "넓이 검수",
    contentEdited: true,
    confidence: "low",
    choicesLayout: "3x2",
  });
  expect(problem.figureUrls).toHaveLength(1);
  await page.screenshot({
    path: testInfo.outputPath("source-review-saved.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
