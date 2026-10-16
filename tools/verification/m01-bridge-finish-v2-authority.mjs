import {execFileSync} from 'node:child_process';import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const currentAuthority=process.argv.includes('--current-authority'),base=currentAuthority?'bc8f6a21a57ccd926d4e0655481908d90d6b1978':'8a0c3622f5375f2c5b5e847db71f4f6e8352ae39',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const tracked=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n'),historicalPaths=tracked.filter(p=>/^(src\/|assets\/|missions\/|tools\/assets\/|tests\/)/.test(p)&&p!=='src/render/m01-view.js'||['package.json','package-lock.json','vite.config.js','playwright.config.js','.github/workflows/ci.yml'].includes(p));
// Current partials deliberately change script/optional actor contracts. This mode
// protects only the explicitly unchanged physical/art systems, never claims all-src identity.
const protectedPaths=currentAuthority?tracked.filter(p=>
  p.startsWith('assets/')&&p!=='assets/models/provisional/m01/m01-bridges/impostors/manifest.json'||
  /^(src\/render\/m01-terrain|src\/world\/tczew-world\.js$)/.test(p)||
  ['missions/m01-tczew/map-layout.json','src/render/m01-soldier-variation.js','src/game/simulation.js','src/world/world.js','package.json','package-lock.json'].includes(p)
):historicalPaths;
// Provenance mode (main-based PRs): same pins and protected sets, but drift that is already approved on main is accepted only
// through the reviewed ledger and --pr-base forbids the PR itself from touching a protected path. See m01-bridge-authority-provenance.mjs.
if(process.argv.includes('--list-protected')){console.log(JSON.stringify({pin:base,protectedPaths}));process.exit(0);}
if(process.argv.includes('--provenance')){const {runProvenanceCli}=await import('./m01-bridge-authority-provenance.mjs');runProvenanceCli({argv:process.argv,mode:currentAuthority?'currentAuthority':'historical',pin:base,protectedPaths});process.exit(0);}
assert.ok(!['--pr-base','--ledger','--ledger-base'].some(f=>process.argv.includes(f)),'--pr-base/--ledger/--ledger-base are only valid together with --provenance');
if(currentAuthority){const p='assets/models/provisional/m01/m01-bridges/impostors/manifest.json',before=JSON.parse(execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8'})),after=JSON.parse(fs.readFileSync(p));assert.ok(typeof after.author==='string'&&after.author.length>0);delete after.author;assert.deepEqual(after,before,'Only original author metadata may change in impostor manifest');}
for(const p of protectedPaths)assert.equal(hash(fs.readFileSync(p)),hash(execFileSync('git',['show',`${base}:${p}`],{maxBuffer:32*1048576})),`Protected original changed: ${p}`);
console.log(`PASS ${protectedPaths.length} exact protected bytes against ${base}; scope=${currentAuthority?'all predecessor assets except author-only impostor manifest, physical world/terrain/layout, French simulation/world, soldier variation and package manifests':'historical all-source guard'}`);
