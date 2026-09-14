import { chromium } from "@playwright/test";
/**
 * 🔴 「어느 안이 빠른가」를 **눌러서** 잰다. 눈으로 보면 A 가 빽빽해 보이고
 *    B 가 시원해 보이는데, 그건 «몇 번 누르나»와 다른 물음이다.
 *
 * 상황을 못 박는다: 학생 7명, 각자 2문항 틀림(2·5번). 실제 채점이 대개 이렇다.
 * 재는 것은 화면의 「누른 횟수」 계기 — 내가 세지 않고 **제품이 센다**.
 */
const WRONG_NOS = [2, 5];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto("http://localhost:3000/dev/retry-wire", { waitUntil: "networkidle" });

/**
 * 🔴 화면의 계기는 «표시»만 센다 — 넘기기(다음 학생·다음 문항)는 안 센다.
 *    그것만 보면 C 가 14번으로 제일 적어 보이는데, 실제로는 넘기기 7번이 더 있다.
 *    그래서 **브라우저에서 일어난 클릭을 전부** 따로 센다.
 */
await p.addInitScript(() => {
  window.__clicks = 0;
  document.addEventListener("click", () => { window.__clicks += 1; }, true);
});
const taps = async () => {
  const marks = await p.evaluate(() => document.body.innerText.match(/누른 횟수 (\d+)/)?.[1]);
  const clicks = await p.evaluate(() => window.__clicks ?? -1);
  // 안 고르기 버튼(A/B/C/D 전환) 한 번은 뺀다.
  return { marks: Number(marks ?? -1), clicks: Number(clicks) - 1 };
};
const students = await p.evaluate(() => Number(document.body.innerText.match(/학생 (\d+)명/)?.[1] ?? 0));
const problems = await p.evaluate(() => Number(document.body.innerText.match(/문항 (\d+)개/)?.[1] ?? 0));
console.log(`상황: 학생 ${students} · 문항 ${problems} · 각자 ${WRONG_NOS.length}문항 틀림(${WRONG_NOS.join("·")}번)\n`);

async function reset() { await p.reload({ waitUntil: "networkidle" }); }

// A — 표: 학생마다 오답 칸 2개 + 「끝」 1
await reset();
await p.getByRole("button", { name: /^A\./ }).click();
{
  const rows = p.locator("tbody tr");
  for (let i = 0; i < students; i++) {
    const row = rows.nth(i);
    for (const no of WRONG_NOS) await row.locator("td button").nth(no - 1).click();
    await row.locator("td").last().locator("button").click();
  }
  { const t = await taps(); console.log(`A. 표          → 표시 ${t.marks} · **누른 총합 ${t.clicks}** · 1화면`); }
}

// B — 학생 하나씩: 번호 2개 + 「채점 끝·다음」 1
await reset();
await p.getByRole("button", { name: /^B\./ }).click();
{
  for (let i = 0; i < students; i++) {
    for (const no of WRONG_NOS) await p.locator("section button", { hasText: new RegExp(`^${no}$`) }).first().click();
    await p.getByRole("button", { name: "채점 끝 · 다음 학생" }).click();
  }
  { const t = await taps(); console.log(`B. 학생 하나씩 → 표시 ${t.marks} · **누른 총합 ${t.clicks}** · ${students}화면`); }
}

// C — 문항 하나씩: 오답 문항에서만 학생 7명 누름 + 문항 넘기기 7
await reset();
await p.getByRole("button", { name: /^C\./ }).click();
{
  for (let n = 1; n <= problems; n++) {
    if (WRONG_NOS.includes(n)) {
      const names = await p.locator("section >> div.flex.flex-wrap button").all();
      for (const btn of names) await btn.click();
    }
    if (n < problems) await p.getByRole("button", { name: "다음 문항" }).click();
  }
  { const t = await taps(); console.log(`C. 문항 하나씩 → 표시 ${t.marks} · **누른 총합 ${t.clicks}** · ${problems}화면 (「이 학생 다 봤나」 못 답함)`); }
}

// D — 번호 적기: 학생마다 타이핑 + 「기록」 1
await reset();
await p.getByRole("button", { name: /^D\./ }).click();
{
  let keystrokes = 0;
  for (let i = 0; i < students; i++) {
    const text = WRONG_NOS.join(" ");
    await p.getByRole("textbox").nth(i).fill(text);
    keystrokes += text.length;
    await p.getByRole("button", { name: "기록" }).nth(i).click();
  }
  { const t = await taps(); console.log(`D. 번호 적기   → 표시 ${t.marks} · **누른 총합 ${t.clicks}** + 타자 ${keystrokes}타 · 1화면`); }
}
await b.close();
