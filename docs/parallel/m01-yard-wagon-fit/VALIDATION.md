# Validação executada — m01-yard-wagon-fit

Data: 2026-10-03. Esta validação não iniciou servidor, CI, publicação nem `workflow_dispatch`.

## 1. Checkout local

Comando real tentado:

```sh
git clone --depth 1 --branch codex/m01-yard-wagon-fit https://github.com/Brawl2007/COD-guerra.git /tmp/codguerra-yard
```

Resultado real:

```text
Cloning into '/tmp/codguerra-yard'...
fatal: unable to access 'https://github.com/Brawl2007/COD-guerra.git/': Could not resolve host: github.com
```

Por isso, `node tools/verify-m01-yard-wagon-fit.mjs` e `node --test tests/m01-yard-wagon-fit.test.js` **não foram executados num checkout integral** nesta sessão. Não declarar a suíte Node verde.

## 2. Sintaxe dos dois ficheiros Node novos

Os dois ficheiros foram lidos novamente da branch pelo conector GitHub e copiados byte a byte para scratch. `git hash-object` no scratch coincidiu exactamente com os blobs GitHub:

- `tools/verify-m01-yard-wagon-fit.mjs`
  - GitHub blob: `8632e21b74464e3a65a5da3e26c62b1cdc6437f2`
  - scratch `git hash-object`: `8632e21b74464e3a65a5da3e26c62b1cdc6437f2`
- `tests/m01-yard-wagon-fit.test.js`
  - GitHub blob: `ca705e0959faeacf9fb515fd7584d954e771e231`
  - scratch `git hash-object`: `ca705e0959faeacf9fb515fd7584d954e771e231`

Comandos reais:

```sh
node --check /tmp/yard-check/tools/verify-m01-yard-wagon-fit.mjs
node --check /tmp/yard-check/tests/m01-yard-wagon-fit.test.js
```

Resultado: ambos exit 0, sem stdout/stderr.

## 3. Assets reais medidos

Os 18 GLB da branch foram lidos diretamente pelo conector GitHub em base64 e analisados em memória com um parser GLB2 independente. Foram verificadas as raízes, accessors POSITION, caixas e nós `wheelset_1/2`.

Resultado da investigação:
- 18/18 GLB analisados;
- nenhuma raiz deslocada;
- todos conservam os pivôs dos rodados `[0,0.5,-2]` e `[0,0.5,2]`;
- LOD0 intactos medidos em 9,10 m de comprimento;
- os estados de dano mantêm o contrato de raiz/rodados, embora algumas peças visuais aumentem a bbox em +X;
- os números LOD0 e os contactos do terreno estão guardados em `measurements.json`.

Esta análise foi feita sobre os bytes reais do GitHub, mas não substitui a execução do verificador/teste Node dentro de um checkout.

## Estado de validação

- investigação geométrica sobre dados/assets reais: executada;
- sintaxe Node dos novos ficheiros: validada;
- execução integral do novo verificador/teste Node: pendente por falha DNS do ambiente;
- browser/build/npm test: não pedidos nem executados.
