const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { authorId, sha, assert, project } = require('./author-common.cjs');
const katex = require('katex');
const { chromium } = require('@playwright/test');
const { UI_KATEX_OPTIONS } = require(path.join(project, 'src/lib/math/katexRender.ts'));
const { preprocessMarkdown } = require(path.join(project, 'src/lib/math/markdownPreprocess.ts'));
const { checkPaperRender } = require(path.join(project, 'src/lib/testchanger/mathRenderQa.ts'));
const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

(async () => {
  const name = process.argv[2], selected = process.argv.slice(3).map(Number);
  assert(name && selected.length && /^[a-z0-9-]+$/.test(name), 'New owned preview name and question numbers required');
  const output = path.join(__dirname, name);
  assert(!fs.existsSync(output), 'Do not overwrite a preview version');
  fs.mkdirSync(output, { recursive: true });
  const { unified } = await import(pathToFileURL(require.resolve('unified')).href);
  const remarkParse = (await import(pathToFileURL(require.resolve('remark-parse')).href)).default;
  const remarkGfm = (await import(pathToFileURL(require.resolve('remark-gfm')).href)).default;
  const remarkMath = (await import(pathToFileURL(require.resolve('remark-math')).href)).default;
  const { bindCandidate } = await import(pathToFileURL(path.join(project,'scripts/import/exam-twin/candidatePack.mjs')).href);
  function markdown(text) {
    const qa = checkPaperRender(text);
    assert(qa.safe, 'Bank math render unsafe: ' + qa.why.join(', '));
    const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(preprocessMarkdown(text));
    function walk(n) {
      const children = () => (n.children || []).map(walk).join('');
      if (n.type === 'text') return escape(n.value || '');
      if (n.type === 'inlineMath' || n.type === 'math') return katex.renderToString(n.value || '', { ...UI_KATEX_OPTIONS, throwOnError: true, displayMode: n.type === 'math' });
      if (n.type === 'paragraph') return '<p>' + children() + '</p>';
      if (n.type === 'strong') return '<strong>' + children() + '</strong>';
      if (n.type === 'break') return '<br>';
      if (n.type === 'table') return '<table>' + (n.children || []).map((row,i) => '<tr>' + row.children.map(cell => '<' + (i ? 'td' : 'th') + '>' + cell.children.map(walk).join('') + '</' + (i ? 'td' : 'th') + '>').join('') + '</tr>').join('') + '</table>';
      if (n.type === 'list') return '<ul>' + children() + '</ul>';
      if (n.type === 'listItem') return '<li>' + children() + '</li>';
      if (n.type === 'image') return '';
      return n.value ? escape(n.value) : children();
    }
    return walk(tree);
  }
  let katexRoot = path.dirname(require.resolve('katex'));
  while (!fs.existsSync(path.join(katexRoot,'package.json'))) katexRoot = path.dirname(katexRoot);
  fs.copyFileSync(path.join(katexRoot,'LICENSE'),path.join(output,'KaTeX-LICENSE.txt'));
  fs.copyFileSync(path.join(katexRoot,'dist/katex.min.css'),path.join(output,'katex.css'));
  fs.cpSync(path.join(katexRoot,'dist/fonts'),path.join(output,'fonts'),{recursive:true,errorOnExist:true});
  fs.mkdirSync(path.join(output,'figures'));
  const bindings = selected.map(n => bindCandidate(path.join(__dirname,'candidates','q'+String(n).padStart(2,'0'),'candidate.json')));
  const marks = ['①','②','③','④','⑤'];
  const cards = bindings.map(b => {
    const c = b.candidate;
    function figure(a) {
      const name = path.basename(a.studentPath);
      fs.copyFileSync(a.sourceSvgPath,path.join(output,'figures',name));
      return '<figure data-role="'+a.role+'" style="width:'+a.intendedWidthMm+'mm"><img src="figures/'+name+'" alt="새 도형"></figure>';
    }
    const stem = b.assets.filter(a => a.role === 'stem').map(figure).join('');
    const choice = c.choices.map((s,i) => {
      const owned = b.assets.filter(a=>a.role==='choice:'+(i+1));
      const imageOnly = /^!\[[^\]]*\]\([^\n]+\)$/.test(s.trim());
      assert(!imageOnly || owned.length === 1, 'Figure choice must have exactly one owned asset');
      return '<li><span>'+marks[i]+'</span><div>'+(imageOnly ? '' : markdown(s))+owned.map(figure).join('')+'</div></li>';
    }).join('');
    return '<article id="q'+String(c.questionNumber).padStart(2,'0')+'"><header><b>'+c.questionNumber+'.</b><span>'+c.score+'점</span></header>'+markdown(c.content)+'<div class="stem-figures">'+stem+'</div><ul class="choices '+(b.assets.some(a=>a.role.startsWith('choice:'))?'graph-choices':'')+'">'+choice+'</ul><section class="solution" hidden><p>'+c.answer+'</p>'+markdown(c.solution)+'</section></article>';
  }).join('');
  const html = '<!doctype html><html lang="ko"><meta charset="utf-8"><title>해솔누리중학교 새 문항 저작 검토</title><link rel="stylesheet" href="katex.css"><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#eee;color:#111;font-family:"Malgun Gothic",sans-serif;font-size:15px;line-height:1.7}.paper{width:185mm;margin:20px auto;background:white;padding:20px 26px}article{padding:15px 0;break-inside:avoid;border-bottom:1px solid #bbb}header{display:flex;justify-content:space-between}header b{font-size:18px}p{margin:8px 0}table{width:100%;border-collapse:collapse;margin:10px 0;font-size:14px}td,th{border:1px solid #888;text-align:center;padding:5px 8px}th{background:#f4f4f4;font-weight:500}.choices{padding:0;list-style:none;display:grid;gap:5px;break-inside:avoid}.choices li{display:flex;gap:10px;align-items:baseline}.choices li>span{min-width:22px}.choices p{margin:0}.graph-choices{grid-template-columns:1fr 1fr}.graph-choices li{break-inside:avoid}figure{margin:4mm auto}figure img{width:100%;display:block;height:auto}.stem-figures{display:flex;gap:4mm;justify-content:center;align-items:center;flex-wrap:wrap}.stem-figures figure{margin:4mm 0}.katex{font-size:1.04em}.solution{background:#f7f7f7;padding:12px;margin-top:12px}@media print{body{background:white}.paper{width:100%;margin:0;padding:0}.solution{display:none}}</style><main class="paper">'+cards+'</main></html>';
  const finalHtml = html.replace('</style>', '.graph-choices li{align-items:flex-start}.graph-choices li>span{padding-top:4mm}</style>');
  fs.writeFileSync(path.join(output,'preview.html'),finalHtml);
  const browser = await chromium.launch({headless:true});
  const observations=[];
  try {
    const page=await browser.newPage({viewport:{width:1000,height:1400},deviceScaleFactor:1.5});
    await page.route(/^https?:\/\//,route=>route.abort());
    await page.goto(pathToFileURL(path.join(output,'preview.html')).href);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
    assert(await page.locator('.katex-error,.math-raw').count()===0,'Raw/broken math');
    for(const b of bindings) {
      const id='#q'+String(b.candidate.questionNumber).padStart(2,'0');
      const record=await page.locator(id).evaluate(node=>({overflow:node.scrollWidth>node.clientWidth+1,choiceCount:node.querySelectorAll('.choices>li').length,figures:[...node.querySelectorAll('figure')].map(f=>({role:f.dataset.role,widthMm:f.getBoundingClientRect().width/96*25.4,resource:f.querySelector('img').getAttribute('src'),loaded:f.querySelector('img').naturalWidth>0}))}));
      assert(!record.overflow&&record.choiceCount===5&&record.figures.every(f=>f.widthMm<=70.1&&f.loaded),'Preview conditions');
      await page.locator(id).screenshot({path:path.join(output,'q'+String(b.candidate.questionNumber).padStart(2,'0')+'.png')});
      await page.locator(id+' .solution').evaluate(n=>n.hidden=false);
      await page.locator(id).screenshot({path:path.join(output,'q'+String(b.candidate.questionNumber).padStart(2,'0')+'.solution.png')});
      await page.locator(id+' .solution').evaluate(n=>n.hidden=true);
      observations.push({questionNumber:b.candidate.questionNumber,studentDigest:b.studentDigest,candidateDigest:b.candidateDigest,assetDigest:b.assetDigest,...record});
    }
    await page.screenshot({path:path.join(output,'preview.png'),fullPage:true});
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output,'render-evidence.json'),JSON.stringify({authorId,renderer:'owned local preview reusing current bank math preprocessing/QA/KaTeX/remark and candidate binding contract; image-only choices use explicit owned asset and top-aligned marks',htmlSha256:sha(Buffer.from(finalHtml)),bankCapMm:70,noRemoteRequests:true,observations,visualInspection:'pending-human-view',productionParity:false,physicalPaperApproval:false},null,2)+'\n');
  console.log(JSON.stringify({preview:name,questions:selected,bankCap:70,figures:observations.reduce((s,x)=>s+x.figures.length,0),productionParity:false}));
})().catch(e=>{console.error(e);process.exit(1)});
