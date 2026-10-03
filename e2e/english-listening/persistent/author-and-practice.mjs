import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
const artifactBase = pathToFileURL(
  path.resolve(".qa-artifacts/listening-postgres") + path.sep,
);
import { chromium, expect } from "@playwright/test";
const origin = "http://127.0.0.1:4302";
const fixture = JSON.parse(
  readFileSync(new URL("./fixture.json", artifactBase), "utf8"),
);
const out = new URL("./screens/", artifactBase);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const teacher = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const learner = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await teacher.newPage();
const student = await learner.newPage();
const errors = [];
for (const p of [page, student]) {
  p.on("pageerror", (error) => errors.push(error.message));
  p.setDefaultTimeout(20000);
}
page.on("response", async (response) => {
  if (
    response.url().includes("/api/english/listening") &&
    response.status() >= 400
  ) {
    console.error(
      "API failure",
      response.status(),
      response.url(),
      await response.text(),
    );
    writeFileSync(
      new URL("./failed-request.json", artifactBase),
      response.request().postData() ?? "{}",
    );
  }
});
page.on("response", async (response) => {
  if (response.url().includes("/complete"))
    console.log("Media completion", await response.text());
});
const title = "약속 듣기 검증 " + Date.now();
async function login(p, identifier, password) {
  await p.goto(origin + "/login");
  await p.locator('input[name="email"]').fill(identifier);
  await p.locator('input[name="password"]').fill(password);
  await p.getByRole("button", { name: "로그인", exact: true }).click();
  await p.waitForURL((url) => url.pathname !== "/login");
}
async function data(p, path) {
  return p.evaluate(async (path) => {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error("Read failed " + r.status);
    return (await r.json()).data;
  }, path);
}
async function screenshot(p, name) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  ).toBe(false);
  await p.screenshot({
    path: new URL(name + ".png", out).pathname.replace(/^\/(.:)/, "$1"),
    fullPage: true,
  });
}
try {
  await login(page, fixture.teacher.email, fixture.teacher.password);
  await page.goto(origin + "/#english-listening");
  await expect(
    page.getByRole("heading", { name: "영어듣기", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "새 자료 만들기" }).click();
  await page.getByLabel("자료 제목", { exact: true }).fill(title);
  await page.getByLabel("수준·학년").fill("중1");
  await page
    .getByLabel("제작 출처·사용 허락 근거")
    .fill("로컬 검증용 자체 문장. 로컬 음성 합성 파일. 운영 배포 자료가 아님.");
  for (const label of [
    "음원 원본 보관",
    "교사 검수·재생",
    "학생에게 배정",
    "적은 출처와 사용 허락을 직접 확인했습니다",
  ])
    await page.getByRole("checkbox", { name: label, exact: true }).check();
  await page.getByRole("button", { name: "음원·문항 묶음 추가" }).click();
  await page
    .getByRole("button", { name: "초안 저장 후 권리 검수 기록" })
    .click();
  await expect(
    page.getByText("검수 확인을 기록했습니다.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("묶음 1 음원 (MP3·WAV)")
    .setInputFiles(
      new URL("./dialogue.wav", artifactBase).pathname.replace(/^\/(.:)/, "$1"),
    );
  await expect(
    page.getByText("음원을 등록하고 초안을 저장했습니다."),
  ).toBeVisible();
  const transcript =
    "Let us meet at four oclock in front of the library. Please bring your notebook. I will buy the tickets first.";
  await page.getByLabel("묶음 1 영어 대본", { exact: true }).fill(transcript);
  await page
    .getByRole("button", { name: "영어 대본을 발음용으로 복사" })
    .click();
  const questions = [
    ["When will they meet?", "At three.", "At four."],
    ["Where will they meet?", "At the library.", "At the station."],
    ["What should they bring?", "A notebook.", "A ticket."],
  ];
  for (let i = 0; i < questions.length; i++) {
    if (i)
      await page
        .getByRole("button", { name: "문항 추가", exact: true })
        .click();
    const prefix = `묶음 1 문항 ${i + 1}`;
    await page
      .getByLabel(prefix + " 문제", { exact: true })
      .fill(questions[i][0]);
    await page
      .getByLabel(prefix + " 보기 1", { exact: true })
      .fill(questions[i][1]);
    await page
      .getByLabel(prefix + " 보기 2", { exact: true })
      .fill(questions[i][2]);
    await page
      .getByLabel(prefix + " 정답")
      .selectOption({ index: i === 0 ? 2 : 1 });
    await page
      .getByLabel(prefix + " 해설", { exact: true })
      .fill("The spoken passage explicitly states the answer.");
    await page
      .getByRole("group", { name: `문항 ${i + 1}`, exact: true })
      .getByRole("button", { name: "근거 구간 추가" })
      .click();
  }
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await expect(
    page.getByText("초안을 저장했습니다.", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "teacher-editor");
  await page.getByRole("button", { name: "편집 닫기" }).click();
  const panel = page.getByRole("region", { name: "교사 검수와 발행" });
  for (const [label, button] of [
    ["문항·보기·정답·해설의 근거를 확인했습니다", "내용 검수 기록"],
    [
      "음원을 직접 듣고 대본, 숫자, 부정어와 잘림을 확인했습니다",
      "음성 검수 기록",
    ],
    [
      "재생으로 모든 정답 근거 구간의 시작과 끝을 확인했습니다",
      "구간 검수 기록",
    ],
  ]) {
    await panel.getByRole("checkbox", { name: label }).check();
    await panel.getByRole("button", { name: button }).click();
    await expect(
      page.getByText("검수 확인을 기록했습니다.", { exact: true }),
    ).toBeVisible();
  }
  await panel.getByRole("button", { name: "검수한 자료 발행" }).click();
  await expect(
    page.getByText("자료를 발행했습니다.", { exact: true }),
  ).toBeVisible();
  const list = await data(page, "/api/english/listening/sets");
  const set = await data(
    page,
    "/api/english/listening/sets/" +
      list.find((item) => item.title === title).id,
  );
  const publication = set.publications[0];
  const artifacts = {
    title,
    setId: set.id,
    publicationId: publication.id,
    transcript,
  };
  writeFileSync(
    new URL("./browser-result.json", artifactBase),
    JSON.stringify(artifacts),
  );
  await screenshot(page, "teacher-published");
  for (const view of ["student", "teacher"]) {
    const print = await teacher.newPage();
    await print.goto(
      `${origin}/english/listening/sets/${set.id}/print?publicationId=${publication.id}&view=${view}`,
    );
    await expect(
      print.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    expect((await print.content()).includes(transcript)).toBe(
      view === "teacher",
    );
    await print.pdf({
      path: new URL(`print-${view}.pdf`, out).pathname.replace(/^\/(.:)/, "$1"),
      format: "A4",
      printBackground: true,
    });
    await print.close();
  }
  await page.getByRole("button", { name: "과제와 결과", exact: true }).click();
  await page.getByLabel("배정할 자료").selectOption(set.id);
  await page.getByLabel("대상 반").selectOption(fixture.classId);
  await page.getByRole("button", { name: "반 전체 선택" }).click();
  const openAt = new Date(Math.ceil((Date.now() + 5000) / 60000) * 60000);
  const localOpen = new Date(
    openAt.getTime() - openAt.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("배정 시작").fill(localOpen);
  await page
    .getByRole("button", { name: "학생에게 배정", exact: true })
    .click();
  await expect(page.getByText(/배정했습니다/).first()).toBeVisible();
  const assignments = await data(page, "/api/english/listening/assignments");
  artifacts.assignmentId = assignments.find((item) => item.title === title).id;
  writeFileSync(
    new URL("./browser-result.json", artifactBase),
    JSON.stringify(artifacts),
  );
  await login(student, fixture.student.loginId, fixture.student.password);
  if (Date.now() < openAt.getTime()) {
    console.log("Waiting for scheduled assignment opening");
    await new Promise((resolve) =>
      setTimeout(resolve, openAt.getTime() - Date.now() + 100),
    );
  }
  await student.goto(origin + "/learn/english-listening");
  await expect(student.getByRole("heading", { name: title })).toBeVisible();
  await screenshot(student, "student-list");
  await student.goto(
    origin + "/learn/english-listening/" + artifacts.assignmentId,
  );
  await expect(student.getByRole("heading", { name: title })).toBeVisible();
  expect((await student.content()).includes(transcript)).toBe(false);
  await student.getByRole("button", { name: "소리 확인", exact: true }).click();
  await student
    .getByRole("button", { name: "소리가 들립니다", exact: true })
    .click();
  await expect(
    student.getByRole("button", { name: "학습 시작" }),
  ).toBeEnabled();
  await student.getByRole("button", { name: "학습 시작" }).click();
  await student.getByRole("button", { name: "재생", exact: true }).click();
  await expect
    .poll(() =>
      student
        .locator("audio")
        .last()
        .evaluate((el) => el.currentTime),
    )
    .toBeGreaterThan(0);
  await screenshot(student, "student-playing");
  for (let i = 0; i < 3; i++) {
    await student
      .getByRole("radio", {
        name: new RegExp(questions[i][i === 0 ? 2 : 1].replace(".", "\\.")),
      })
      .check();
    await student.getByRole("button", { name: "답 확정" }).click();
    await expect(
      student.getByText("저장 완료 · 확정한 답은 바꿀 수 없습니다.", {
        exact: true,
      }),
    ).toBeVisible();
    if (i === 0) {
      await student.reload();
      await expect(student.getByText("1 / 3 답 저장")).toBeVisible();
    }
    if (i < 2) {
      expect((await student.content()).includes(transcript)).toBe(false);
      await student.getByRole("button", { name: "다음 문항" }).click();
    }
  }
  await expect(student.getByText(transcript, { exact: true })).toBeVisible();
  await student.getByRole("button", { name: "답안 제출" }).click();
  await expect(
    student.getByText("제출 완료", { exact: true }).first(),
  ).toBeVisible();
  await screenshot(student, "student-submitted");
  expect(errors).toEqual([]);
  console.log(
    JSON.stringify({
      ok: true,
      title,
      steps: [
        "teacher-ui-author-upload-review-publish",
        "student-and-teacher-print",
        "class-assignment",
        "student-login",
        "native-audio",
        "reload-answer-restore",
        "group-release",
        "submit",
      ],
      pageErrors: errors.length,
    }),
  );
} catch (error) {
  await page
    .screenshot({
      path: new URL("failure-teacher.png", out).pathname.replace(
        /^\/(.:)/,
        "$1",
      ),
      fullPage: true,
    })
    .catch(() => {});
  await student
    .screenshot({
      path: new URL("failure-student.png", out).pathname.replace(
        /^\/(.:)/,
        "$1",
      ),
      fullPage: true,
    })
    .catch(() => {});
  console.error(error.message);
  console.error("Page errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
