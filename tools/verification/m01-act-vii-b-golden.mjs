// R4 INC-2: writes or checks the golden of Act VII-b (tests/fixtures/m01-act-vii-b-gameplay-baseline.json). x86_64 only (D11/D30, as every M01 golden).
//   node tools/verification/m01-act-vii-b-golden.mjs            # regenerates in memory and compares byte for byte: prints `check: identical` or fails
//   node tools/verification/m01-act-vii-b-golden.mjs --write    # writes the fixture (only after a deliberate, documented change of the act)
// The current act's goldens (amendments 06-20) and the golden of Act VII-a (tools/verification/m01-act-vii-a-golden.mjs) are not read or written here.
import {readFileSync,writeFileSync} from 'node:fs';
import {arch} from 'node:os';
import assert from 'node:assert/strict';
import {ACT_B_GOLDEN_FIXTURE,actBGoldenText} from '../../tests/helpers/m01-act-b-golden.js';

if(arch()!=='x64')throw new Error('The Act VII-b golden is written and checked on x86_64 only.');
const path=new URL(`../../${ACT_B_GOLDEN_FIXTURE}`,import.meta.url),text=actBGoldenText();
if(process.argv.includes('--write')){writeFileSync(path,text);console.log(`written: ${ACT_B_GOLDEN_FIXTURE}`);}
else{assert.equal(readFileSync(path,'utf8'),text,'the Act VII-b golden equals the regenerated one');console.log('check: identical');}
