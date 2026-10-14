import {execFileSync} from 'node:child_process';import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const base='8a0c3622f5375f2c5b5e847db71f4f6e8352ae39',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const tracked=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n'),protectedPaths=tracked.filter(p=>/^(src\/|assets\/|missions\/|tools\/assets\/|tests\/)/.test(p)&&p!=='src/render/m01-view.js'||['package.json','package-lock.json','vite.config.js','playwright.config.js','.github/workflows/ci.yml'].includes(p));
for(const p of protectedPaths)assert.equal(hash(fs.readFileSync(p)),hash(execFileSync('git',['show',`${base}:${p}`],{maxBuffer:32*1048576})),`Protected original changed: ${p}`);
console.log(`PASS ${protectedPaths.length} original source/asset/test bytes against exact ${base}; only m01-view original source excluded for scoped bridge coupling`);
