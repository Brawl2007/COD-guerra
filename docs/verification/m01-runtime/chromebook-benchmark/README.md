# M01 Chromebook benchmark

Esta ferramenta mede o **build de produção** da M01 com `requestAnimationFrame`. Ela não optimiza o jogo e não transforma um resultado de cloud/SwiftShader em resultado de Chromebook.

## Executar no Chromebook

1. Abra o Terminal Linux.
2. Entre no repositório:
   ```sh
   cd COD-guerra
   git checkout codex/m01-chromebook-benchmark
   ```
3. Instale dependências:
   ```sh
   npm ci
   ```
4. Gere o build:
   ```sh
   npm run build
   ```
5. Descubra um Chrome/Chromium instalado, por exemplo:
   ```sh
   which google-chrome || which chromium || which chromium-browser
   ```
6. Se o browser não for encontrado automaticamente pelo Playwright, indique-o:
   ```sh
   export CHROME_EXECUTABLE=/caminho/mostrado/acima
   ```
7. Execute:
   ```sh
   node tools/m01-chromebook-benchmark.mjs --quality low --scenario all --environment chromebook
   ```

A própria ferramenta inicia `vite preview` em `127.0.0.1:5184`, usa o build já criado e fecha o preview ao terminar.

O JSON fica por padrão em:

```text
benchmark-results/<timestamp>-<quality>-<scenario>.json
```

Não adicione o JSON específico do seu hardware ao Git a menos que queira preservar deliberadamente essa evidência.

## Qualidade e cenário

Qualidades suportadas:

```sh
--quality low
--quality medium
--quality high
```

Cenários:

- `start` — CP-A; fonte `checkpoint`.
- `bridge` — CP-C, na área da ponte; fonte `checkpoint`.
- `repair` — ameaça real durante o reparo; fonte `saved-snapshot`.
- `withdrawal` — retirada com alemães nos vãos; fonte `saved-snapshot`.
- `all` — os quatro em sequência.

Os checkpoints/snapshots são produzidos pelo helper existente `tests/helpers/m01-route.js`, que chega aos estados por controlos reais da simulação. `repair` e `withdrawal` são continuações de snapshots legítimos; **não são uma partida contínua no browser**.

Exemplo de uma qualidade mais pesada:

```sh
node tools/m01-chromebook-benchmark.mjs --quality high --scenario withdrawal --environment chromebook
```

## Warm-up e janela de medição

Por padrão:

- warm-up descartado: 5 s;
- medição: 10 s.

Pode alterar:

```sh
node tools/m01-chromebook-benchmark.mjs --quality medium --scenario repair --warmup 8 --duration 20 --environment chromebook
```

O FPS é derivado dos deltas reais de `requestAnimationFrame`, não de `setInterval`.

## Modo manual

Para jogar normalmente antes de iniciar a medição:

```sh
node tools/m01-chromebook-benchmark.mjs --quality medium --scenario repair --manual --environment chromebook
```

O browser abre em modo headed. Jogue; quando estiver no ponto que deseja medir, volte ao Terminal e pressione Enter. A ferramenta executa o warm-up descartado e depois mede a janela configurada.

`--manual` exige um cenário específico e não aceita `--headless`.

## GPU / software renderer

No JSON, verifique:

```text
scenarios[].environment.webgl.renderer
scenarios[].environment.webgl.vendor
scenarios[].environment.softwareRenderer
scenarios[].environment.rendererClass
```

Interpretação:

- `softwareRenderer: true` — SwiftShader, llvmpipe, lavapipe ou equivalente; **não usar como FPS real da GPU do Chromebook**.
- `softwareRenderer: false` e `rendererClass: "hardware"` — foi identificado um renderer que não corresponde aos padrões de software conhecidos.
- `softwareRenderer: null` / `rendererClass: "unknown"` — o renderer não pôde ser identificado; não concluir que é GPU real.

A ferramenta também grava user agent, browser, plataforma exposta pelo browser, resolução, viewport e `devicePixelRatio`.

## Métricas

Cada cenário guarda:

- tempos de loading separados do benchmark;
- warm-up pedido e observado;
- duração medida;
- frames;
- FPS médio;
- frame time médio/mínimo/máximo;
- p50/p90/p95/p99;
- frames acima de 16,67 / 33,33 / 50 / 100 ms;
- dez maiores stalls;
- memória JS somente quando `performance.memory` existe;
- WebGL renderer/vendor e classificação software/hardware/unknown;
- resumo de `gameDiagnostics()` antes e depois.

Veja `RESULT-SCHEMA.md` para a estrutura.

## Erro ao iniciar Chrome

A ferramenta não baixa browser automaticamente. Se não conseguir iniciar um browser, apresenta uma mensagem pedindo `CHROME_EXECUTABLE`.

Primeiro prefira um Chrome/Chromium já instalado. Baixar outro Chromium muda o ambiente medido e não deve ser a primeira opção.

## Regra de interpretação

Não afirmar “60 FPS no Chromebook”, “Chromebook aprovado” ou equivalente sem executar este instrumento no Chromebook real e confirmar que o renderer não é software/SwiftShader.
