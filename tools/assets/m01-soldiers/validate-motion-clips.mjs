import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { inspectMotionPackage } from './motion/validate.mjs';
const report = await inspectMotionPackage();
const i = process.argv.indexOf('--out');
if (i >= 0) { const file = resolve(process.argv[i + 1]); await mkdir(dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ pass: report.pass, variants: report.variants.length, clips: report.variants.reduce((s, v) => s + v.clips.length, 0), failures: report.failures }));
process.exitCode = report.pass ? 0 : 1;
