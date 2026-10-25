#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const port = process.env.PORT || '4173';
const host = process.env.HOST || '127.0.0.1';
const url = `http://${host}:${port}/COD-guerra/m02-01.html`;

console.log(`[M02-01] A iniciar servidor Vite para a Bancada da Quinta (100 × 150 m)...`);
console.log(`[M02-01] URL da bancada: ${url}`);

const child = spawn(
  process.execPath,
  [path.join(repoRoot, 'node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port)],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
