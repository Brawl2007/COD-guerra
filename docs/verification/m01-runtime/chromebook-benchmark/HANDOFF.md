# HANDOFF — M01-CHROMEBOOK-BENCHMARK-V1

Branch: `codex/m01-chromebook-benchmark`  
Base: `2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732`

## Entrega

Ferramenta isolada de benchmark + testes + documentação. Nenhum ficheiro de gameplay/render/assets foi alterado.

A ferramenta:
- usa o build de produção;
- inicia preview local em 5184 quando `--url` não é fornecido;
- mede por `requestAnimationFrame`;
- separa loading, warm-up e medição;
- executa quatro cenários derivados do helper real `tests/helpers/m01-route.js`;
- aceita low/medium/high;
- aceita cenário individual ou all;
- grava JSON estruturado;
- identifica SwiftShader/software renderer;
- suporta `CHROME_EXECUTABLE`;
- tem modo manual simples.

## Estado de validação

- focados: 7/7;
- `npm test`: 185/185;
- build: PASS;
- smoke browser dos quatro cenários: PASS para geração de JSON no ambiente cloud;
- smoke detectou SwiftShader, portanto não há resultado de FPS Chromebook nesta entrega.

## Próximo passo

Executar no Chromebook real, preferencialmente com Chrome/Chromium instalado e renderer identificável como hardware:

```sh
node tools/m01-chromebook-benchmark.mjs --quality low --scenario all --environment chromebook
node tools/m01-chromebook-benchmark.mjs --quality medium --scenario all --environment chromebook
node tools/m01-chromebook-benchmark.mjs --quality high --scenario all --environment chromebook
```

Depois comparar JSONs. Só então considerar trabalho de optimização.

M01 continua **PROTÓTIPO JOGÁVEL**.
