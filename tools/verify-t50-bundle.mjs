import {readFileSync,statSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir=process.argv[2]??'dist',manifest=JSON.parse(readFileSync(`${dir}/.vite/manifest.json`)),html=readFileSync(`${dir}/index.html`,'utf8');
const rootKeys=Object.keys(manifest).filter(k=>manifest[k].isEntry),visited=new Set();
const visit=key=>{if(visited.has(key))return;assert.ok(manifest[key],`Missing static dependency ${key}`);visited.add(key);for(const next of manifest[key].imports??[])visit(next);};
for(const key of rootKeys)visit(key);
// Include explicit HTML script/preload JS roots even when injected by a future plugin.
for(const match of html.matchAll(/(?:src|href)="([^"]+\.js)"/g)){
 const file=match[1].replace(/^\/COD-guerra\//,'');const key=Object.keys(manifest).find(k=>manifest[k].file===file);assert.ok(key,`Unaccounted HTML JS ${file}`);visit(key);
}
const files=[...visited].map(key=>({key,file:manifest[key].file,bytes:statSync(`${dir}/${manifest[key].file}`).size})),bytes=files.reduce((n,f)=>n+f.bytes,0);
assert.ok(bytes<600000,`Entire static entry/preload graph ${bytes} >=600000`);
for(const name of ['three-core','three-loaders','french-bench']){const chunk=Object.values(manifest).find(v=>v.name===name);assert.ok(chunk,`Missing ${name} chunk`);assert.ok(!files.some(f=>f.file===chunk.file),`${name} eager in initial graph`);}
const result={rule:'entry + transitive static imports + HTML JS preloads, raw bytes; dynamic gameplay graph separately loaded',limit:600000,bytes,files,chunks:Object.values(manifest).filter(v=>v.file.endsWith('.js')).map(v=>({name:v.name,file:v.file,bytes:statSync(`${dir}/${v.file}`).size,imports:v.imports??[]}))};
console.log(JSON.stringify(result,null,2));if(process.env.T50_BUNDLE_REPORT)writeFileSync(process.env.T50_BUNDLE_REPORT,JSON.stringify(result,null,2)+'\n');
