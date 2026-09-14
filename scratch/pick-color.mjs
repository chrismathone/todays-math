// ΔE2000 — 표준 공식. provenancePalette.test.ts 와 같은 계산을 따로 구현해
// 후보를 고른다(고른 뒤 진짜 시험으로 검산한다).
const ch = (h) => [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255);
const lin = (c) => (c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4);
function lab(hex){
  const [r,g,b] = ch(hex).map(lin);
  let X = (0.4124*r+0.3576*g+0.1805*b)/0.95047;
  let Y = (0.2126*r+0.7152*g+0.0722*b)/1.0;
  let Z = (0.0193*r+0.1192*g+0.9505*b)/1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787*t + 16/116);
  [X,Y,Z] = [f(X),f(Y),f(Z)];
  return [116*Y-16, 500*(X-Y), 200*(Y-Z)];
}
function dE(h1,h2){
  const [L1,a1,b1]=lab(h1), [L2,a2,b2]=lab(h2);
  const C1=Math.hypot(a1,b1), C2=Math.hypot(a2,b2), Cb=(C1+C2)/2;
  const G=0.5*(1-Math.sqrt(Cb**7/(Cb**7+25**7)));
  const A1=(1+G)*a1, A2=(1+G)*a2;
  const Cp1=Math.hypot(A1,b1), Cp2=Math.hypot(A2,b2);
  const h1p=(Math.atan2(b1,A1)*180/Math.PI+360)%360;
  const h2p=(Math.atan2(b2,A2)*180/Math.PI+360)%360;
  const dL=L2-L1, dC=Cp2-Cp1;
  let dh=0;
  if(Cp1*Cp2!==0){ dh=h2p-h1p; if(dh>180)dh-=360; if(dh<-180)dh+=360; }
  const dH=2*Math.sqrt(Cp1*Cp2)*Math.sin(dh*Math.PI/360);
  const Lb=(L1+L2)/2, Cpb=(Cp1+Cp2)/2;
  let hb=h1p+h2p;
  if(Cp1*Cp2!==0){ if(Math.abs(h1p-h2p)>180) hb += (hb<360?360:-360); hb/=2; } else hb/=1;
  const T=1-0.17*Math.cos((hb-30)*Math.PI/180)+0.24*Math.cos(2*hb*Math.PI/180)
          +0.32*Math.cos((3*hb+6)*Math.PI/180)-0.20*Math.cos((4*hb-63)*Math.PI/180);
  const Sl=1+(0.015*(Lb-50)**2)/Math.sqrt(20+(Lb-50)**2);
  const Sc=1+0.045*Cpb, Sh=1+0.015*Cpb*T;
  const Rt=-2*Math.sqrt(Cpb**7/(Cpb**7+25**7))
           *Math.sin(60*Math.exp(-(((hb-275)/25)**2))*Math.PI/180);
  return Math.sqrt((dL/Sl)**2+(dC/Sc)**2+(dH/Sh)**2+Rt*(dC/Sc)*(dH/Sh));
}
const others = {
  "src-elem":"#7f5eca","src-middle":"#b645a4","src-past-exam":"#90325d",
  "src-workbook":"#d13559","src-ai":"#7a4920","src-mcq":"#5f5521",
  "src-short":"#5f4977","src-written":"#687a00","src-figure":"#1e6200",
  "src-svg":"#008355","src-scan":"#007f81",
  "ink":"#161616","text-2":"#61615e","blue":"#2064b3","green":"#08492e",
  "yellow-text":"#996b11","red-text":"#a62d1b",
};
// 대비도 봐야 한다 — 흰 바탕에서 읽혀야 하므로 어두운 쪽만 본다.
const lum = (hex) => { const [r,g,b]=ch(hex).map(lin); return 0.2126*r+0.7152*g+0.0722*b; };
const contrast = (hex) => (1.0+0.05)/(lum(hex)+0.05);

let best = [];
for (let r=0;r<256;r+=5) for (let g=0;g<256;g+=5) for (let b=0;b<256;b+=5){
  const hex = "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
  const c0 = contrast(hex);
  // 05 §2.2 — 출처 색은 «계단»이 아니라 한 띠. 실측 띠 4.81~7.49 안에 든다.
  if (c0 < 4.9 || c0 > 8.8) continue;   // span<2 (min 4.81) && max<9
  let min = Infinity, who = "";
  for (const [k,v] of Object.entries(others)){ const d=dE(hex,v); if(d<min){min=d;who=k;} }
  if (min >= 15) best.push([min, hex, who, c0]);
}
best = best.filter(([,h]) => {const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return b > r + 30 && b > g + 30;});
best.sort((a,b)=>b[0]-a[0]);
console.log("파랑 계열 후보 (띠 안 · ΔE 문턱 15):");
for (const [m,h,w,c] of best.slice(0,12))
  console.log(`  ${h}  최소ΔE ${m.toFixed(1)} (가장 가까운 것: ${w})  대비 ${c.toFixed(1)}`);
