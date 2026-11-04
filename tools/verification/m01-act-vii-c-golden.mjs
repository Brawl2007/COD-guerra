// R4 INC-3: writes or checks the golden of Act VII-c (tests/fixtures/m01-act-vii-c-gameplay-baseline.json). x86_64 only (D11/D30, as every M01 golden).
//   node tools/verification/m01-act-vii-c-golden.mjs            # regenerates in memory and compares byte for byte: prints `check: identical` or fails
//   node tools/verification/m01-act-vii-c-golden.mjs --write    # writes the fixture (only after a deliberate, documented change of the act)
// The current act's goldens (amendments 06-20) and the goldens of Acts VII-a and VII-b (tools/verification/m01-act-vii-a-golden.mjs, m01-act-vii-b-golden.mjs) are not read or written here.
import {readFileSync,writeFileSync} from 'node:fs';
import {arch} from 'node:os';
import assert from 'node:assert/strict';
import {ACT_C_GOLDEN_FIXTURE,actCGoldenText} from '../../tests/helpers/m01-act-c-golden.js';

if(arch()!=='x64')throw new Error('The Act VII-c golden is written and checked on x86_64 only.');
const path=new URL(`../../${ACT_C_GOLDEN_FIXTURE}`,import.meta.url),text=actCGoldenText();
if(process.argv.includes('--write')){writeFileSync(path,text);console.log(`written: ${ACT_C_GOLDEN_FIXTURE}`);}
else{assert.equal(readFileSync(path,'utf8'),text,'the Act VII-c golden equals the regenerated one');console.log('check: identical');}
