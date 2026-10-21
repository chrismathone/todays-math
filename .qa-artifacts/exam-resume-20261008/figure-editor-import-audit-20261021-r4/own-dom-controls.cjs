const fs=require('fs'),path=require('path'),crypto=require('crypto'),v8=require('v8');
const R='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008',P=__dirname;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),rawRead=fs.readFileSync,firstReads={};
fs.readFileSync=function(p,...args){const data=rawRead.call(this,p,...args);if(typeof p==='string'&&p.replaceAll('\\','/').startsWith(R+'/src/')&&/\.[cm]?[jt]sx?$/.test(p)){const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);firstReads[p]=firstReads[p]||hash(bytes)}return data};
const {createRequire}=require('module'),rootRequire=createRequire(R+'/package.json');
const {JSDOM}=rootRequire('jsdom');const dom=new JSDOM('<!doctype html><body></body>',{url:'http://localhost/'});
for(const k of ['window','document','DOMParser','XMLSerializer','Element','Node','SVGElement','HTMLElement'])global[k]=k==='window'?dom.window:dom.window[k];
const base=R+'/src/components/unified/figure-editor/';
const meta=require(base+'figureGridMetadata.ts'),grid=require(base+'figureGrid.ts'),edit=require(base+'figureSvgEditing.ts');
const {figureLabelMarks}=require(R+'/src/lib/figure/vectorLabel.ts');const {hwpLabelToTex}=require(base+'FigureLabelInput.tsx');
const rows=[],inputs=[];function check(id,input,fn){inputs.push({id,input});try{const actual=fn();rows.push({id,pass:actual===true,actual,inputSHA256:hash(JSON.stringify(input))})}catch(e){rows.push({id,pass:false,error:String(e),inputSHA256:hash(JSON.stringify(input))})}}
const wrap=x=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${x}</svg>`;
const line='<line id="line" x1="10" y1="20" x2="80" y2="60" stroke="#000000"/>',text='<text id="text" x="30" y="25" font-size="12">AB &amp; x</text>';
const shape=line+text+'<circle id="circle" cx="50" cy="50" r="8" fill="none" stroke="#000000"/>';
const bad=['0 0 0 10 2 2','0 0 10 0 2 2','0 0 10 10 0 2','0 0 10 10 61 2','0 0 10 10 2 999','0 0 10 11 2 2','0 0 NaN 10 2 2','0 0 Infinity 10 2 2','0 0 -10 10 2 2','0 0 10 10 1.5 2','0 0 10 10 2 2 junk','0 0 10 10 2','0 0 10 10 2 2 2','10000001 0 10 10 2 2'];
for(const [i,value]of bad.entries()){check('parse-bad-'+i,value,()=>meta.parseFigureGridData(value)===null);check('bad-keeps-shape-'+i,value,()=>{const out=edit.readFigureSvg(edit.prepareFigureSvg(wrap(`<g data-grid="${value}">${line}${text}</g>`)));return out.querySelector('#line')?.hasAttribute('data-object-id')&&out.querySelector('#text')?.hasAttribute('data-object-id')&&!out.querySelector('[data-grid]')})}
for(const value of ['0 0 10 10 1 1','-20 -20 10 10 60 60','0.5 0.5 1.25 1.25 2 3'])check('parse-valid-'+value,value,()=>!!meta.parseFigureGridData(value));
const g='<g data-grid="0 0 10 10 2 2"><path id="marked" d="M0 0L20 20" stroke="#000000"/></g>';
const placement=[['nested',`<g>${g}</g>`],['transform',g.replace('<g ','<g transform="translate(1 1)" ')],['late',line+g],['path-transform',g.replace('<path ','<path transform="translate(1 1)" ')],['empty','<g data-grid="0 0 10 10 2 2"/>'],['two-path',g.replace('</g>','<path id="extra" d="M0 1L20 1"/></g>')]];
for(const [id,content]of placement)check('placement-'+id,content,()=>{const d=edit.readFigureSvg(edit.prepareFigureSvg(wrap(content+text)));return !d.querySelector('[data-grid]')&&(!d.querySelector('#marked')||d.querySelector('#marked').hasAttribute('data-object-id'))&&d.querySelector('#text').hasAttribute('data-object-id')});
check('duplicate-shape-remains',g+g.replace('marked','second'),()=>{const d=edit.readFigureSvg(edit.prepareFigureSvg(wrap(g+g.replace('marked','second'))));return d.querySelector('#second').hasAttribute('data-object-id')&&d.querySelectorAll('[data-grid]').length===1});
const initial=edit.prepareFigureSvg(wrap(shape)),state={x:0,y:0,cellW:10,cellH:10,cols:8,rows:8,color:'#aaaaaa',width:.8,dashed:false};
function snapshot(svg){const d=edit.readFigureSvg(svg);return ['line','text','circle'].map(id=>{const e=d.querySelector('#'+id);return {id,attrs:[...e.attributes].map(a=>[a.name,a.value]).sort(),text:e.textContent}})}
const original=snapshot(initial);const same=svg=>JSON.stringify(snapshot(svg))===JSON.stringify(original);
const added=grid.setFigureGrid(initial,state);
check('set-shape-ownership',state,()=>same(added)&&!!grid.readFigureGrid(added));
for(const [axis,count]of [['x',12],['y',5],['x',60],['x',1]])check('resize-ownership-'+axis+count,{axis,count},()=>same(grid.setFigureGrid(added,grid.resizeFigureGrid(state,axis,count))));
check('remove-grid-ownership',state,()=>same(grid.setFigureGrid(added,null))&&!grid.readFigureGrid(grid.setFigureGrid(added,null)));
check('cover-ownership',{x:-20,y:-20,width:120,height:120},()=>same(grid.setFigureGrid(added,grid.coverFigureGrid(state,{x:-20,y:-20,width:120,height:120}))));
check('cover60-remains-short',{width:610,cell:10,cols:60},()=>{const s={...state,cols:60};const box={x:0,y:0,width:610,height:80};const after=grid.coverFigureGrid(s,box);return after.cols===60&&grid.gridShortfall(after,box).right>0});
for(const field of ['x','y','cellW','cellH','cols','rows','width'])for(const [name,n]of [['nan',NaN],['inf',Infinity],['ninf',-Infinity]])check('set-nonfinite-'+field+'-'+name,{field,name},()=>{try{grid.setFigureGrid(initial,{...state,[field]:n});return false}catch{return true}});
for(const [field,n]of [['cols',0],['rows',61],['cols',1.5],['cellW',-1],['cellH',0],['width',257]])check('set-invalid-'+field+n,{field,n},()=>{try{grid.setFigureGrid(initial,{...state,[field]:n});return false}catch{return true}});
for(const [tex,expected]of [['\\vec{AB}','\\overrightarrow{\\mathrm{AB}}'],['\\vec{ABC}','\\overrightarrow{\\mathrm{ABC}}'],['\\vec{a}','\\vec{a}'],['\\overparen{ABC}','\\overparen{\\mathrm{ABC}}'],['\\overset{\\frown}{ABC}','\\overparen{\\mathrm{ABC}}']])check('marks-'+tex,{tex,expected},()=>figureLabelMarks(tex)===expected);
for(const [input,expected]of [['$root2$','$\\sqrt{2}$'],['root2','root2'],['hwp2','hwp2'],['AB','AB'],['$\\vec{a}$','$\\vec{a}$']])check('hwp-'+input,{input,expected},()=>hwpLabelToTex(input)===expected);
const probes=[];for(const n of [1.001,.999,60.001])check('strict-fractional-cols-'+n,{field:'cols',n},()=>{try{grid.setFigureGrid(initial,{...state,cols:n});return false}catch{return true}});
const after={};for(const p of Object.keys(firstReads))after[p]=hash(rawRead(p));
const result={uniqueControls:rows.length,passed:rows.filter(x=>x.pass).length,failed:rows.filter(x=>!x.pass),rows,diagnosticProbes:probes,firstImportSHA256:firstReads,afterSHA256:after,changed:Object.keys(after).filter(k=>after[k]!==firstReads[k]),heapLimitMiB:v8.getHeapStatistics().heap_size_limit/1048576,processMemory:process.memoryUsage(),argv:process.execArgv,actualModulePaths:{meta:require.resolve(base+'figureGridMetadata.ts'),grid:require.resolve(base+'figureGrid.ts'),edit:require.resolve(base+'figureSvgEditing.ts'),label:require.resolve(base+'FigureLabelInput.tsx'),jsdom:rootRequire.resolve('jsdom')},limits:['jsdom does not supply physical SVG layout/getBBox; no pixel math or native visual approval','React Editor pointer events/warning lifecycle/chip fallback not mounted in this direct-function cohort']};
fs.writeFileSync(P+'/own-inputs.json',JSON.stringify(inputs,null,2));fs.writeFileSync(P+'/own-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({unique:result.uniqueControls,passed:result.passed,failed:result.failed,diagnostics:probes,heapLimitMiB:result.heapLimitMiB,changed:result.changed}));dom.window.close();
