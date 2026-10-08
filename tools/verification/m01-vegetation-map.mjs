// Top-down plot of the deterministic M01 vegetation layout (SVG, optional PNG via Chromium).
// Usage: node tools/verification/m01-vegetation-map.mjs <outDir>
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {TczewWorld} from '../../src/world/tczew-world.js';
import {buildM01VegetationLayout,vegetationKeepOut} from '../../src/render/m01-vegetation-layout.js';
const out=resolve(process.argv[2]??'.'),world=new TczewWorld(),v=buildM01VegetationLayout(world),k=vegetationKeepOut(world);
const X0=-700,X1=1100,Z0=-290,Z1=370,S=1.1,W=(X1-X0)*S,H=(Z1-Z0)*S,px=x=>((x-X0)*S).toFixed(1),pz=z=>((z-Z0)*S).toFixed(1);
const color={oak:'#3f5a2a',lime:'#5b7a33',poplar:'#6f7f3a',birch:'#b9c27a',pine:'#2c4a3a',willow:'#8fa08a',pollard:'#7c8b6c',snag:'#8a6a4a',
  hazel:'#4d6b2f',elder:'#5e7d38',bramble:'#3c5530',broom:'#4a5c2e',dry:'#a0874a',dead:'#7a5a3a',meadow:'#9bb070',tall:'#b6b47a',weed:'#6f8f4a',reed:'#c7c08a'};
const line=(l,c,w)=>`<polyline fill="none" stroke="${c}" stroke-width="${w}" points="${l.map(p=>`${px(p[0])},${pz(p[2])}`).join(' ')}"/>`;
const b=k.bounds,svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#e9e5d8;font:12px sans-serif">`,
 `<rect x="${px(22)}" y="0" width="${(246*S).toFixed(1)}" height="${H}" fill="#9fb3b8"/>`,
 `<rect x="${px(b.minX)}" y="${pz(b.minZ)}" width="${((b.maxX-b.minX)*S).toFixed(1)}" height="${((b.maxZ-b.minZ)*S).toFixed(1)}" fill="none" stroke="#c03" stroke-dasharray="6 4"/>`,
 ...k.rails.map(l=>line(l,'#555',3)),line(k.road,'#a87',4),line(k.ignition,'#d60',1.5),
 ...k.objectives.map(([x,z])=>`<circle cx="${px(x)}" cy="${pz(z)}" r="4" fill="#d00"/>`),
 ...v.ground.map(g=>`<circle cx="${px(g.x)}" cy="${pz(g.z)}" r=".7" fill="${color[g.type]}"/>`),
 ...v.shrubs.map(s=>`<circle cx="${px(s.x)}" cy="${pz(s.z)}" r="${(s.width*.6*S).toFixed(1)}" fill="${color[s.species]}" opacity=".85"/>`),
 ...[...v.solid,...v.visualTrees].map(t=>`<circle cx="${px(t.x)}" cy="${pz(t.z)}" r="${(Math.max(1.6,t.height*.22)*S).toFixed(1)}" fill="${color[t.species]}" stroke="${t.solid?'#000':'none'}" opacity=".9"/>`),
 `<text x="8" y="16">M01 vegetation layout (x right, z down). Red dashes: playable bounds. Black ring: solid approved trees.</text>`,
 `<text x="8" y="32">trees ${v.solid.length}+${v.visualTrees.length} · shrubs ${v.shrubs.length} · ground ${v.ground.length}</text>`,'</svg>'].join('\n');
await writeFile(`${out}/vegetation-layout.svg`,svg);
if(process.env.CHROME_EXECUTABLE){
  const {chromium}=await import('@playwright/test');const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:Math.ceil(W),height:Math.ceil(H)}});await page.setContent(svg);await page.screenshot({path:`${out}/vegetation-layout.png`});await browser.close();
}
console.log(`${out}/vegetation-layout.svg`);
