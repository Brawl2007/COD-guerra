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

Constatação própria, depois do verificador. Num par de testes corrido enquanto o verificador da outra branch usava a CPU:
- `m01.spec.js:38` falhava em `9827c73` no primeiro disparo (linha 45: `mag` 4 em 5 s, [`logs/t1-two-9827c73.log`](logs/t1-two-9827c73.log));
- na base, nessa mesma carga, falhava só na linha 55 ([`logs/base-two.log`](logs/base-two.log)).

Na suíte integral (`a428925`) esse teste passava.

A medição do primeiro disparo no build de produção (detalhe em [`EVIDENCE.md`](EVIDENCE.md)) mostrou o resto:
- `9827c73` levava 4,8–4,9 s até `mag` 4, contra 0,71–1,06 s na base (4 execuções);
- o frame do tiro durava ~3,9 s, gastos a terminar a compilação/link dos programas de FX que estavam escondidos até ao tiro.

Corrigido em `dfb1572` (`prewarmWeaponFx`):
- o frame do tiro já não tem compilação (em Baixa) e o tempo até `mag` 4 fica a menos de um frame da base (`dfb1572` 1,00–1,26 s, `d97329c` 1,02–1,16 s, base 0,71–1,06 s);
- os frames seguintes, com efeitos activos, foram mais pesados em SwiftShader: até ~1,9 s contra 1,1–1,5 s na base (n = 2 por build);
- `m01.spec.js:38` passou 3 de 3 em `dfb1572`, mas 1 de 5 em `d97329c` (segunda revisão, abaixo).

A segunda revisão encontrou ainda que a correcção só valia sem sombras (Baixa); em Média o primeiro tiro voltava a compilar. Corrigido em `5743b83` (abaixo).

## Revisão da pré-compilação (`f6db41d..7dbc0a5`)

Revisor: subagente independente, só leitura. Leu o código do three r186 e as provas, e fez mutações só ao teste focado, numa cópia descartável. Sem bloqueadores.

O revisor confirmou:
- as chaves de programa são as mesmas no momento da chamada;
- o link é mesmo forçado (`onFirstUse`);
- não fica estado alterado;
- a colocação antes do render do mundo e o `??=` estão correctos;
- os números citados conferem com os artefactos.

Incidente: algumas das suas execuções de mutantes esgotaram a memória (finding 2) e o sistema matou um Chrome da suíte de navegador da outra branch que corria ao mesmo tempo. Os testes dessa suíte afectados foram repetidos (ver a evidência da outra branch).

| # | Gravidade | Constatação | Resolução |
|---|---|---|---|
| 1 | Deve corrigir | A pré-compilação só cobria a configuração de luzes do mundo no primeiro frame. As chaves de programa incluem luzes e sombras, e o M01 muda-as depois:<ul><li>o sol passa a projectar sombra ao nascer;</li><li>a luz das explosões liga e desliga;</li><li>a qualidade liga ou desliga os shadow maps.</li></ul> Um primeiro tiro depois disso podia voltar a compilar no frame do tiro (sprites da nuvem). | **Corrigido em código (`d97329c`), incompleto:** com sombras ligadas a chave não seguia o tipo de shadow map (segunda revisão, corrigido em `5743b83`). `warmWeaponFx()` no `M01View` e na bancada: o passe da arma uma vez; o do mundo de novo por cada configuração (shadow maps × sombra do sol; na bancada, shadow maps), com a luz das explosões compilada nos dois estados (visibilidade reposta). Teste novo para as duas chamadas. |
| 2 | Deve corrigir | Quando falhava, o teste novo comparava objectos do three com `deepEqual`/`equal`. A mensagem de erro imprimia cenas inteiras e o processo chegava a ~13 GB. | Corrigido: o teste compara só ids, nomes e booleanos. |
| 3 | Deve corrigir | O teste não verificava que objectos eram preparados nem as chamadas: retirar os fios, retirar os sprites da nuvem, usar uma só câmara ou retirar a chamada da bancada passava. | Corrigido. O teste verifica os membros explicitamente (3 camadas + 9 fios; 16 sprites + pool do clipe + pool de invólucros) e usa duas câmaras e uma luz que pisca. Teste novo das duas chamadas, com stubs: uma vez por configuração, de novo quando ela muda, e a ordem no `render` (depois da iluminação, antes do render do mundo). |
| 4 | Deve corrigir | Esta secção punha a falha da linha 45 na suíte integral; é do par de testes sob carga. | Corrigido acima. |
| 5 | Deve corrigir | Os tempos GL dados como causa vinham da build intermédia, não commitada. | Rotulados como build intermédia. Acrescentada uma execução GL de `9827c73` (EVIDENCE). |
| 6 | Deve corrigir (redacção) | «O primeiro tiro fica como na base» exagerava; os frames com efeitos activos foram 0,1–0,6 s mais pesados. «Custo com efeitos activos não medido em tempo» era contradito pelo log. | Corrigido em EVIDENCE, HANDOFF e nos documentos de estado. |
| 7 | Nit | Os pools de invólucros/clipe não estão escondidos em repouso (visíveis com `count` 0). | Redacção corrigida no JSDoc e em EVIDENCE. |
| 8 | Nit | A identidade píxel a píxel das capturas não tinha artefacto. | [`logs/capture-identity.txt`](logs/capture-identity.txt): SHA-256 de cada PNG em `a428925`, `9827c73`, `dfb1572` e `d97329c` (primeiro só os 16 primeiros dígitos; agora completos, ver a segunda revisão). |
| 9 | Nit | Afirmações desactualizadas ou inconsistentes. | Corrigidas: <ul><li>HANDOFF linha 6;</li><li>bundle da altura (abaixo);</li><li>log do build da base;</li><li>«frames/s» passa a «callbacks de rAF por segundo de parede» (campo `rafPerWallSecond`);</li><li>`m01.spec.js:99` falha em `fireRound`, sem dizer em que tiro;</li><li>sem afirmação sobre GPU real;</li><li>os identificadores de modelo só aparecem nas linhas de atribuição obrigatórias dos commits.</li></ul> |

Notas sobre a tabela da primeira verificação:
- O «mesmo bundle que `logs/build.log`» e «+31,9 kB, gzip +11,5 kB» referem-se a `a428925` (1 230,71 kB). O log actual é do runtime final (EVIDENCE).
- «Não há identificadores de modelo» vale fora das linhas de atribuição obrigatórias dos commits.

## Segunda revisão da pré-compilação (`7dbc0a5..c7284d4`)

Revisor: subagente independente, só leitura, sem navegador. Leu o three r186 e conduziu o renderer real do three sobre um contexto WebGL2 falso, chamando os `warmWeaponFx()` reais do M01 e da bancada. Fez 26 mutações ao teste focado.

**Resultado principal: a correcção do item 1 não aguentava com sombras ligadas** (Média/Alta, a qualidade por omissão em hardware real).
- A bancada pede `PCFSoftShadowMap`, que o three r186 já não tem: dentro do primeiro render com sombra reescreve o tipo para `PCFShadowMap`.
- Esse render vem **depois** da pré-compilação desse frame, e o tipo entra na chave de todos os programas. Os programas preparados deixavam de servir.
- A chave da pré-compilação não incluía o tipo, por isso nunca se repetia: o primeiro tiro voltava a compilar os programas dos FX no frame do tiro, na bancada em Média e no M01 depois do nascer do sol.
- As provas não o mostravam porque todas as medições correram em Baixa (sem sombras).

| # | Gravidade | Constatação | Resolução |
|---|---|---|---|
| 1 | **Bloqueia o «Corrigido» do item 1** (não é regressão face à base) | Com sombras ligadas, a pré-compilação ficava obsoleta: 3 programas criados no frame do tiro na bancada em Média e no M01 depois do nascer do sol. | **Corrigido em código (`5743b83`).**<ul><li>A bancada pede `PCFShadowMap`, o tipo que o r186 desenha: imagem igual, sem o aviso do three.</li><li>`programStateKey`: shadow maps ligados, tipo e, no M01, a sombra do sol. Uma chave nova repete os dois passes; os programas já ligados são reaproveitados.</li><li>Teste novo com o `WebGLRenderer` real do three sobre um contexto WebGL2 falso, em 15 cenários: bancada e M01, Baixa e Média, mudança de qualidade, nascer do sol, explosões e a reescrita do tipo pelo r186. Verifica que nenhum desenho dos FX do tiro usa um programa criado nesse frame.</li><li>13 mutações apanhadas (lista abaixo).</li><li>No navegador, em Média: `d97329c` cria 3 programas no frame do tiro, na bancada e no M01 depois do nascer do sol; `5743b83` não cria nenhum programa dos FX da arma ([`EVIDENCE.md`](EVIDENCE.md)).</li></ul> |
| 2 | Deve corrigir | «O passa/falha vira com o ruído» (`m01.spec.js:38`) não tinha apoio: em execuções alternadas, `d97329c` falhou 4 de 5 e base/`dfb1572` 0 de 6 (Fisher p ≈ 0,015). A causa atribuída (+6,8 %) também não servia: `dfb1572` tem os mesmos FX e passou 3 de 3. Faltava dizer que a base e `dfb1572` também passaram dos 15 s numa medição (15,10 e 15,02 s). | Nova série alternada ([`logs/m01-38-interleaved.log`](logs/m01-38-interleaved.log)), máquina sem outra carga, duas rondas completas: base 2 de 2 PASS; `d97329c` e `5743b83` 0 de 2, na linha 55. No total: base 5 de 5, `dfb1572` 3 de 3, `d97329c` 1 de 7, `5743b83` 0 de 2. A diferença repete-se, mas **a causa não foi encontrada**; fica como risco aberto em EVIDENCE e HANDOFF. Retirados «vira com o ruído» e a ligação a +6,8 %. Corrigida a frase sobre a base: a base e `dfb1572` passaram dos 15 s numa medição sem prazo; `d97329c` não. |
| 3 | Deve corrigir | +6,8 % vinha de uma só execução por build, não alternada. O JSONL não era a saída do script (era uma transformação). | Saída bruta e transformação commitadas ([`logs/fixture-frame-cost-raw.jsonl`](logs/fixture-frame-cost-raw.jsonl), [`logs/fixture-frame-cost-summary.py`](logs/fixture-frame-cost-summary.py)). A transformação reproduz o resumo byte a byte. A medição antiga fica rotulada n = 1, sem conclusão causal. Não foi repetida alternada. |
| 4 | Deve corrigir (redacção) | «No intervalo da base (1,0–1,3 s)» era falso: a base mede 0,71–1,06 s e 1,0–1,3 s é o intervalo de `dfb1572`. «0,8–1,1 s» na base era anterior às últimas execuções. | Corrigido nesta página e nos documentos de estado: a menos de um frame da base. |
| 5 | Nit | O teste das chamadas não apanhava: a câmara errada nos dois sítios de chamada (M12, M13, M22); `lights:[this.sun]` em vez da luz das explosões (M25). E `meshes.has` era verificado depois da própria chamada do teste. | O teste verifica a câmara de cada chamada, e que a luz das explosões está acesa em metade das chamadas do mundo. `meshes.has` passa a ser verificado antes, depois da pré-compilação. O teste com o renderer real também apanha M25. |
| 6 | Nit | `capture-identity.txt` dizia «SHA-256 escrito pela ferramenta de captura»: eram prefixos de 16 dígitos, calculados depois. | Digests SHA-256 completos, com o comando, calculados depois de cada execução. Os PNG ficam fora do repositório (tamanho); as composições JPEG estão em `captures/`. |
| 7 | Nit | Proveniência dos logs:<ul><li>`bench-reload.jsonl` tinha sido reescrito (`fps` → `rafPerWallSecond`);</li><li>`m01-38-repeat.log` repete rótulos;</li><li>`sheets.py` dizia copiar originais e tinha o modo `layers` de outra branch.</li></ul> | <ul><li>`bench-reload.jsonl` reposto tal como foi produzido (campo `fps`; o script e os documentos usam depois o nome `rafPerWallSecond`, mesmo valor).</li><li>As duas séries de `m01-38-repeat.log` estão descritas em EVIDENCE.</li><li>`sheets.py` só com `pairs` e `zoom`; o recorte 4× do probe regenera-se idêntico byte a byte.</li></ul> |
| 8 | Nit | Redacção:<ul><li>«número de programas preparados por esta chamada» (conta todos os programas dos materiais preparados);</li><li>«uma luz nova tem de entrar na chave» (uma luz que pisca entra na lista `lights` do passe; na chave entram as mudanças de configuração);</li><li>custo dos frames com efeitos citado de formas diferentes;</li><li>a repetição (true,false)/(false,false) é redundante.</li></ul> | <ul><li>Comentários corrigidos no código (`5743b83`).</li><li>HANDOFF e RUNBOOK distinguem a lista `lights` da chave.</li><li>O custo dos frames com efeitos é citado a partir das medições em pares.</li><li>A repetição redundante fica: custa só as chamadas a `compile()` com programas já em cache.</li></ul> |

Mutações em `5743b83` (cópia descartável, só os testes focados), todas apanhadas:
- tipo de shadow map fora da chave;
- a bancada volta a `PCFSoftShadowMap`;
- passe da arma só uma vez, no M01 e na bancada;
- passe do mundo sem a luz das explosões, ou com o sol no lugar dela;
- pool de invólucros não criado pela pré-compilação, no M01 e na bancada;
- sombra do sol fora da chave;
- câmara trocada num passe, no M01 e na bancada;
- sem link forçado;
- pré-compilação depois do render do mundo.

Só com o teste do renderer real:
- a bancada com `PCFSoftShadowMap` falha 3 cenários (primeiro frame com sombra, mudança para Média, nascer do sol no M01);
- o tipo fora da chave falha os 2 cenários da reescrita;
- o sol no lugar da luz das explosões falha os 2 cenários de explosões.

O pool de invólucros criado no frame do tiro não cria programa: o material do latão partilha o programa do pool do clipe. Só o teste das chamadas o apanha.
