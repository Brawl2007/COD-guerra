# Verificação independente — resultados e resolução

Verificador: subagente independente, só leitura, sobre a HEAD `f6db41d` (runtime `a428925`). Correu o teste focado (23/23), testes relacionados (`m01-wz29-viewmodel` 15/15, `m01-character-assets` 11/11) e o build (mesmo bundle e tamanho que `logs/build.log`). Fez 10 mutações numa cópia descartável: 8 foram apanhadas pelos testes, 2 sobreviveram (ver P13). Conferiu cada número dos documentos contra os logs, os relatórios JSON e as imagens.

| Item | Resultado do verificador |
|---|---|
| Âmbito / sem escritas na simulação | PASS: só `src/render/*`, testes e ferramentas; gameplay sem diff; a única escrita em `state.*` é o estado de apresentação do atraso de olhar. |
| Prioridades da tarefa e perfil próprio por arma | PARCIAL: tudo coberto em código, mas faltava declarar algumas coisas mantidas da base (P7). O ADS tinha atraso residual (P2). |
| Testes e build | PASS |
| Exactidão das provas | FALHA leve/média: redacção (P1–P6, P8–P12). Números de testes, browser, base, A/B, igualdade dos 27 frames, luz e probe conferem. |
| Documentos de estado e bancada francesa | PASS (nit P9) |
| Higiene da branch | PASS, com notas (P15) |

| # | Constatação | Resolução |
|---|---|---|
| P1 | EVIDENCE dizia que o teste do rig passava; `m01.spec.js:99` falha no primeiro disparo. | Corrigido: só `m01-wz29-viewmodel.spec.js` (3 variantes) e os 3 novos são citados; `:99` falha antes das asserções da arma, como na base. |
| P2 | Em ADS ficava 25 % do atraso de olhar: miras até ~3 px fora durante rotações rápidas. | **Corrigido em código (`9827c73`)**: sem atraso em ADS (rig e bancada). Teste novo, que falha com o factor antigo (0,9 px). |
| P3 | Contadores de render: faltava a categoria «invólucros no chão, sem tiro». | Corrigido em CAPTURES/EVIDENCE: +1/+2 calls, +518…+1 136 triângulos; efeitos activos +3…+12 calls, +6…+1 112. |
| P4 | HANDOFF dizia que os commits seguintes só eram documentação; também mudam o fixture de verificação. | Corrigido. |
| P5 | «clarão maior» na bancada podia ler-se como maior do que a base. | Corrigido: maior do que o da wz.29, mais localizado do que a esfera da base. |
| P6 | `t1-look3.log` é a repetição da candidata; «mesmo build» era ambíguo. | Corrigido: build da própria base; o log da candidata é identificado. |
| P7 | Faltava declarar o que fica da base: recarga da carabina, posição/escala/alinhamento, fallback M01 sem invólucros, clipping só no rig. | Acrescentado às limitações do HANDOFF. |
| P8 | «todas resolvidas em `a428925` com testes novos» exagerava. | Corrigido: remete para a tabela por item da REVIEW. |
| P9 | «sem relação com a arma» no estado de desenvolvimento. | Corrigido: «não causadas por esta branch (mesmo passo falha na base)». |
| P10 | Invólucros «ficam lá»; são retirados depois de ~24 s. | Corrigido. |
| P11 | «sem outra carga na máquina»: um revisor correu scripts Node durante parte da execução. | Corrigido. |
| P12 | A/B em repouso, resolução ±1 frame/20 s; custo com efeitos não medido em tempo. | Declarado em EVIDENCE. |
| P13 | Duas mutações sobreviveram: `fx.reset()` e o reset de `flashShot` no restore (comportamento protegido por outras guardas). | Teste novo para `fx.reset()` (restore de outra linha temporal = renderer novo). O reset de `flashShot` continua protegido pela janela temporal e pelo teste de frame lento. |
| P14 | Informativo: teste de fronteira só nos 3 módulos novos; `1.05` fixo no fallback; blend de ADS limitado a 50 ms/frame (base). | O fallback lê agora `viewModel.boltSeconds` do perfil. O blend fica como na base (limitação declarada). Os outros dois módulos (`m01-view.js`, `three-renderer.js`) já importavam `src/world` na base. |
| P15 | Higiene: logs da base com caminhos locais do scratch; worktrees extra; RUNBOOK sem a ferramenta nova; tamanho do bundle não reportado; `origin/main..HEAD` inclui os 220 commits herdados da base `99309d9` (que não está em `main`). | <ul><li>Caminhos locais substituídos nos logs.</li><li>Worktrees de rascunho removidos no fim.</li><li>RUNBOOK com a ferramenta de captura e os diagnósticos.</li><li>Bundle reportado (+31,9 kB, gzip +11,5 kB).</li><li>Um PR para `main` levaria também os commits da base: abrir contra a branch da base ou depois de ela entrar.</li></ul> |

Verificado sem problemas pelo verificador:
- O socket da boca da wz.29 é o do GLB, e o da bancada fica na ponta do cano OBJ (+3,6 mm).
- Os nomes dos materiais OBJ batem certo.
- Os 33 links dos documentos resolvem e as 16 capturas existem.
- Nenhum documento chama FPS aos frames de SwiftShader.
- A bancada continua «Estrada de Cinzas — França, 1944», sem «Tczew».
- `main` remoto continua em `72bbcdd`; não existe PR; não há identificadores de modelo nos commits/documentos novos.

## Depois da verificação: primeiro disparo

Constatação própria, depois do verificador. Na suíte integral, `m01.spec.js:38` falhava na candidata no primeiro disparo (linha 45: `mag` 4 em 5 s), e na base só na linha 55. Medição do primeiro disparo no build de produção (detalhe em [`EVIDENCE.md`](EVIDENCE.md)):
- `9827c73` levava 4,8–4,9 s até `mag` 4, contra 0,8–1,1 s na base;
- o frame do tiro durava ~3,9 s, gastos a terminar a compilação/link de 3 programas de FX que estavam escondidos até ao tiro.

Corrigido em `dfb1572` (`prewarmWeaponFx`). O primeiro disparo fica como na base (1,0–1,3 s, frame do tiro sem compilação), e `m01.spec.js:38` passa (detalhe em [`EVIDENCE.md`](EVIDENCE.md)). O teste novo verifica:
- que só os objectos de FX são compilados, cada um contra a sua cena;
- que cada programa é usado uma vez;
- que nenhuma visibilidade muda.
