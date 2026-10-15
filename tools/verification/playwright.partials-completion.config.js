import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const artifactPath=name=>fileURLToPath(new URL('../../test-results/'+name,import.meta.url));
import base from '../../playwright.config.js';
// Runner output is deliberately a sibling of frozen sources, paired captures and raw evidence.
export default defineConfig({...base,testDir:'../../tests/browser',outputDir:artifactPath('partials-completion-runner'),workers:1,retries:0,fullyParallel:false,
  timeout:180000,expect:{timeout:120000},testMatch:[
    'm01-partials-completion.spec.js','m01-animation-contract.spec.js','m01-bridge-material-kit.spec.js','m01-bridge-finish-runtime.spec.js',
    'm01-audio-production.spec.js','m01-battlefield-audio-runtime.spec.js','m01-audio-offline-render.spec.js','m01-hud-presentation.spec.js',
    'm01-train-consist-polish.spec.js','m01-locomotive.spec.js','m01-panzerzug.spec.js','m01-rail-props.spec.js',
    'm01-vegetation-runtime-v2.spec.js','m01-vegetation-lod.spec.js','m01-continuity-raid.spec.js','m01-stuka-dive.spec.js',
    'm01-mg34-prone.spec.js','m01-station-architecture.spec.js'],
  reporter:[['line'],['json',{outputFile:artifactPath('partials-completion-evidence/browser-report.json')}]],
  use:{...base.use,baseURL:process.env.M01_BASE_URL??base.use.baseURL},
  webServer:process.env.M01_EXTERNAL_SERVER==='1'?undefined:{...base.webServer,timeout:120000}
});
