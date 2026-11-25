const fs = require("node:fs");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const html = fs.readFileSync(__dirname + "/3-hifi-app-aligned.html", "utf8");
const results = [];
function boot(saved) {
  let now = 1000, snapshot, writes = 0;
  const errors = [];
  const console = new VirtualConsole();
  console.on("jsdomError", e => { if (e.type !== "css-parsing") errors.push(e.message); });
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    virtualConsole: console,
    beforeParse(w) {
      w.Date.now = () => now;
      w.openai = { widgetState: saved, setWidgetState: value => { snapshot = JSON.parse(JSON.stringify(value)); writes++; return Promise.resolve(); } };
    }
  });
  const doc = dom.window.document;
  return {
    dom, doc, errors,
    get state() { return snapshot?.privateContent.session; },
    get snapshot() { return snapshot; },
    get writes() { return writes; },
    click(selector, advance = true) { if (advance) now += 1000; const b = doc.querySelector(selector); assert(b, selector); b.click(); },
    key(key, repeat = false) { now += 1000; doc.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, repeat, bubbles: true, cancelable: true })); },
    number(value) {
      now += 1000;
      const input = doc.querySelector("#ms-answer"); assert(input, "numeric input");
      input.value = value;
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    }
  };
}
const a = boot();
assert.equal(a.writes, 0, "No persistence on load");
a.click('[data-choice="0"]');
assert.equal(a.state.step, 0);
assert.deepEqual(a.state.records[0].attempts, [0]);
assert.match(a.doc.querySelector(".ms-feedback").textContent, /1씩/);
a.key("2", true);
assert.deepEqual(a.state.records[0].attempts, [0], "Held key ignored");
a.key("2");
assert.equal(a.state.step, 1);
assert.deepEqual(a.state.records[0].attempts, [0, 1], "First wrong answer retained");
a.click('[data-choice="3"]', false);
assert.equal(a.state.step, 1, "Rapid duplicate action cannot answer next step");
a.click('[data-choice="3"]');
a.key("1");
a.key("3");
assert.equal(a.state.phase, "blank");
assert.match(a.doc.body.textContent, /合|합이 24/);
assert.match(a.doc.body.textContent, /3x = 21/);
a.number("");
assert.equal(a.state.number.attempts.length, 0, "Empty input is not an answer");
a.number("７");
assert.equal(a.state.phase, "independent", "Full-width numeric input normalized");
assert.equal(a.doc.querySelectorAll(".ms-line-item").length, 0, "Independent problem hides prior solution");
a.number("10");
assert.equal(a.state.phase, "summary");
assert.match(a.doc.querySelector("h2").textContent, /新|새 문제도 혼자/);
a.click('[data-view="teacher"]');
assert.match(a.doc.body.textContent, /재선택 정답/);
assert.match(a.doc.body.textContent, /수 사이의 간격/);
assert.match(a.doc.body.textContent, /첫 시도 정답/);
assert.equal(a.errors.length, 0, a.errors.join("\n"));
results.push("Wrong first choice, retry, keyboard, held-key and duplicate-action guards, full-width number, isolated independent problem, teacher evidence");
const b = boot(a.snapshot);
assert.equal(b.writes, 0, "Restore does not save");
assert.match(b.doc.querySelector("h1").textContent, /멈췄는지/);
b.click('[data-view="student"]');
assert.equal(b.state.phase, "summary");
b.click('[data-action="restart"]');
assert.equal(b.state.phase, "guided");
assert.equal(b.state.records.every(r => r.attempts.length === 0), true);
results.push("State restoration, view switch, restart");
const c = boot();
c.click('[data-choice="0"]');
c.click('[data-choice="2"]');
assert.equal(c.state.records[0].revealed, true);
assert.equal(c.doc.querySelectorAll(".ms-choice").length, 0);
c.click('[data-action="understood"]');
for (let i = 0; i < 3; i++) { c.click('[data-action="reveal"]'); c.click('[data-action="understood"]'); }
assert.equal(c.state.phase, "blank");
c.number("4"); c.number("6");
assert.equal(c.state.number.revealed, true);
c.click('[data-action="numeric-understood"]');
c.number("7"); c.number("9");
assert.equal(c.state.independent.revealed, true);
c.click('[data-action="numeric-understood"]');
assert.equal(c.state.phase, "summary");
assert.match(c.doc.querySelector("h2").textContent, /確認|확인하며/);
c.click('[data-view="teacher"]');
assert.match(c.doc.body.textContent, /해설로 확인/);
assert.equal(c.errors.length, 0, c.errors.join("\n"));
results.push("Two misses reveal explanation; give-up and confirmation preserve assisted outcomes through both numeric phases");
const d = boot({ privateContent: { session: { version: 99 } } });
assert.equal(d.doc.querySelectorAll(".ms-choice").length, 4);
assert.equal(d.writes, 0);
results.push("Incompatible saved state falls back without writing");
for (const w of [a, b, c, d]) w.dom.window.close();
const report = { passed: true, cases: results, scope: "DOM interaction checks; visual and native browser checks are separate." };
fs.writeFileSync(__dirname + "/aligned-interaction-checks.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
