const { chromium } = require('playwright');
const fs = require('fs');
const { expect } = require('@playwright/test');
let browser;
(async () => {
  console.log('launch');
  browser = await chromium.launch({headless:true});
  console.log('browser ready');
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  page.setDefaultTimeout(120000);
  const dir = 'docs/planning/tracks/reports/blank-defaults-codex';
  fs.mkdirSync(dir, {recursive:true});
  for (const width of [1366,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto('http://localhost:3028/docs/planning/tracks/reports/blank-defaults-codex/visual/index.html', {timeout:240000});
    console.log('page loaded');
    if (errors.length) throw new Error(errors.join('\n'));
    await page.getByRole('button',{name:'단원 고르기 열기'}).waitFor();
    await page.screenshot({path:`${dir}/fresh-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'단원 고르기 열기'}).click();
    for (const [grade, chapter, count] of [['초5','1-2 약수와 배수',1],['초5','2-3 합동과 대칭',1],['중1','1. 소인수분해',4]]) {
      const dialog = page.getByRole('dialog',{name:'단원 선택'});
      const opener = dialog.getByRole('button',{name:new RegExp('^'+grade)});
      if (await opener.getAttribute('aria-expanded') !== 'true') await opener.click();
      const box = dialog.getByRole('checkbox',{name:chapter,exact:true});
      await box.waitFor();
      await expect(box).toBeEnabled({timeout:120000});
      const sections = box.locator('xpath=ancestor::li[1]').locator('ul input[type="checkbox"]:enabled');
      for (let index = 0; index < count; index++) await sections.nth(index).check();
    }
    await page.getByRole('button',{name:'선택 완료'}).click();
    await page.screenshot({path:`${dir}/selected-${width}.png`,fullPage:true});
    console.log(width, await page.getByRole('button',{name:'단원 고르기 열기'}).innerText());
    console.log('overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    await expect(page.getByRole('button',{name:'단원 고르기 열기'})).toContainText('6개 선택');
    await expect(page.getByRole('button',{name:'단원 고르기 열기'})).toContainText('초5 · 1학기');
    await expect(page.getByRole('button',{name:'단원 고르기 열기'})).toContainText('초5 · 2학기');
    await expect(page.getByRole('button',{name:'단원 고르기 열기'})).toContainText('중1 · 1. 소인수분해');
  }
  await browser.close();
})().catch(async e=>{console.error(e);process.exitCode=1;await browser?.close();});
