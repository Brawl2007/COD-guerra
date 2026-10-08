# HANDOFF — M01 Ju 87 aircraft production closeout

TASK_ID: `M01-JU87-AIRCRAFT-PRODUCTION-CLOSEOUT-V2`  
BASE: `codex/m01-bridge-portal-material-detail-polish-v1 @ 99309d9cb023cc94a07d41ff863e1362e4460570`  
BRANCH: `codex/m01-ju87-aircraft-production-closeout-v2`  
Runtime final: `d90f8de`. Os commits seguintes só acrescentam evidência, documentação e os modos `cover`/`repair` do script de medição `tools/verification/m01-ju87-load-longtasks.mjs` (`ae97790`); `src/`, testes e assets ficam iguais aos de `d90f8de`. O SHA final é comunicado na entrega.

M01 continua **PROTÓTIPO JOGÁVEL**. Sem merge, deploy ou alteração em `main`.

**Estado: READY_FOR_CAPTAIN_REVIEW**, com uma ressalva: neste ambiente, a suite completa de navegador tem 6 falhas que também acontecem na base `99309d9`, em corridas isoladas (ver [Validação](#validação)). Não é ACCEPTED: a aceitação cabe ao capitão.

## O que o jogador percebe

Os três Stukas do primeiro raid deixam de ser recortes pretos contra o céu. A barriga RLM 65 lê-se pintada e iluminada pelo solo: nas capturas, o avião segmentado tem RGB médio 92–96/100–104/96–100, um cinzento ligeiramente esverdeado. A asa em gaivota, as calças do trem e a cauda distinguem-se. O avião inclina-se ligeiramente para o lado da deriva. As hélices rodam com rotações e fases diferentes e cada avião tem pequenas diferenças de tinta e desgaste. Na volta de 90 s do caminho os aviões já não saltam ~360 m à vista: dissolvem-se e voltam a aparecer. Também entram em fade quando são ouvidos.

De perto (galeria) vê-se:
- a capota de vidro com aros, piloto e atirador;
- o disco da hélice;
- MG 17, Pitot e antena;
- juntas e folgas das superfícies de controlo;
- lascas (a fuligem, o óleo e a poeira ainda mal se vêem; ver Limitações).

Trajectória, rumo, tempos, eventos, dano, saves e a autoridade da Simulation são os mesmos. A rota completa dá hashes idênticos aos da base, e a posição de cada avião continua a ser exactamente a expressão anterior.

## Implementação

| Campo | Resultado |
|---|---|
| SILHUETA | Gaivota invertida, calças, radiador e cauda preservados em LOD0/1/2. Em jogo, a ~210–245 m, a área segmentada da silhueta fica entre −12 % e +2 % da base. Nos pares a forma e a envergadura são as mesmas: a diferença vem das bordas agora cinzento-claras, que ficam abaixo do limiar da segmentação, e de a inclinação mudar um pouco a projecção. |
| FUSELAGEM | Linhas de painéis (anéis e costuras longitudinais), capota do motor com parafusos em relevo, fuligem dos escapes a abrir para trás, óleo na barriga atrás do radiador. |
| ASAS | Longarinas, nervuras e junta do cotovelo; passadiço escuro na raiz; lascas no passadiço e nos bordos de ataque; MG 17 (±2,6 m) e Pitot na asa esquerda (estimados). |
| CABINE | Nó `canopy` com material de vidro (`BLEND`, alfa 0,3) que reflecte o céu; nove aros e três calhas; piloto e atirador em silhueta, encosto blindado, painel e interior pintado. Antena assente na espinha da capota, com o fio até ao bordo de ataque da deriva. |
| HÉLICE | Disco translúcido (`propeller_disc`, RGBA 128², desenhado numa só passagem), pás com desgaste nas pontas, spinner mais brilhante. Cada avião tem rpm (1476–1524) e fase próprias, calculadas a partir do relógio guardado. |
| TREM | Trem fixo carenado: junta das calças, poeira nas calças e nas rodas. O B-1 não tem trem retráctil para animar. |
| SUPERFÍCIES DE CONTROLO | Folgas de leme, profundidade e divisão flap/aileron (x = ±3,65 m) e caixas de compensação, em relevo no mapa de normais e mais escuras na cor. |
| MATERIAIS | `ju87_b1` com cor, ORM (agora também em LOD2) e normais (LOD0 1024², LOD1 512²); `ju87_glass`; `ju87_prop_disc`. |
| METAL/TINTA | Lascas até ao alumínio (metal 0,85) só em zonas de mãos, botas e erosão, com cobertura medida; tom diferente por painel; desbotamento suave nas superfícies de cima. |
| WEATHERING | Fuligem, óleo, poeira e calor nos escapes. Desgaste ligeiro, coerente com aviões de 1939 em início de campanha. |
| VARIAÇÃO | Materiais por avião (clones leves sobre texturas partilhadas) com tom e rugosidade diferentes; rpm, fase e oscilações de atitude próprias. Sem códigos de unidade nem letras inventados. |
| ILUMINAÇÃO | Céu de ambiente 256×128 só nos aviões, convertido em PMREM pelo three.js. Dá reflexo no vidro e no metal e o ressalto do solo na barriga, que só com a luz hemisférica da cena ficava quase preta. |
| LOD | Histerese de 10 % nos limiares 150/600 m; o mínimo por qualidade prevalece. `resetEffects()` esquece a histerese, para que um restauro escolha o LOD como numa carga nova. |
| POP-IN | Fade por dithering (`alphaHash`) e opacidade: 3 s depois de `evt_m01_planes_heard` e 2,5 s de cada lado da volta de 90 s. O nível seleccionado continua visível e reportado nos diagnósticos. O proxy de fallback, que partilha material, não tem fade. |
| BOMBING / DIVE | Sem mergulho, freios ou lançamento visíveis: o caminho existente é um voo nivelado e está fixado. A inclinação é só rotação. Os freios e a bomba continuam prontos no kit para quando a simulação expuser o início do mergulho e o lançamento. |

## Antes / depois

[BEFORE_AFTER.md](BEFORE_AFTER.md) compara a base (worktree em `99309d9`) com a candidata, ambas em build de produção, nas mesmas condições:
- o mesmo snapshot genuíno da simulação, no instante em que os Stukas ficam visíveis;
- o mesmo procedimento de mira por input relativo;
- qualidades Baixa/Média/Alta a +4 s e Baixa/Alta a +30 s.

Inclui os originais PNG 1280×720, recortes 1:1 ampliados ×3 e pares lado a lado. [SILHOUETTE_METRICS.json](SILHOUETTE_METRICS.json) mede a silhueta em cada imagem, segmentada sozinha:

| | BASE | CANDIDATA |
|---|---:|---:|
| Luminância mediana do avião | 14,3–15,5 | 74,5–79,3 |
| Céu (mediana) | 161,5–171,9 | 161,5–171,9 |
| Contraste céu − avião | 147,2–157,3 | 82,2–97,3 |
| Área segmentada | — | −12 % a +2 % da base |

Na base o avião é um recorte quase preto. Na candidata a barriga lê-se como superfície pintada e o contraste com o céu continua alto, por isso o avião não se perde. A área menor a +4 s (−1 % a −12 %) vem das bordas mais claras, que ficam abaixo do limiar de 18 de luminância da segmentação; a +30 s a diferença é de −1 % e +2 %.

A galeria isolada (`docs/assets/m01-aircraft/ju87_views.png`, `ju87_details.png`, `ju87_flight.png`) mostra o LOD0 de perto e as vistas de voo com os materiais do jogo.

## Performance

[PERFORMANCE.md](PERFORMANCE.md) usa os contadores `renderer.info` das mesmas capturas e as medições de carregamento e de início do raid. Nenhum destes valores é FPS nem medição em Chromebook.

| Medida | BASE `99309d9` | CANDIDATA |
|---|---:|---:|
| Draw calls no frame | 144–173 | +2 por Ju 87 no ecrã (+2 a +6) |
| Triângulos no frame | 367 909–450 261 | +0,08 % a +0,43 % |
| Texturas na GPU | 108–109 | +5 |
| Geometrias | 212–219 | +11 (9 do PMREM do céu, `canopy`, `propeller_disc`) |
| Download LOD0/1/2 | 652/248/96 kB | 922/359/136 kB |
| Tarefas longas no carregamento (Baixa, 3×) | 4,0–4,4 s | 4,4–4,7 s |
| Início do raid: intervalo máximo entre frames (Baixa, 3×) | 1,08–1,48 s | 0,92–1,20 s |

Nas duas últimas linhas, a CANDIDATA é o código sem pré-compilação, equivalente ao runtime final, medido logo antes do commit `d90f8de` (o log entrou nesse commit). O disco da hélice é desenhado numa só passagem; sem isso seriam +3 draw calls por avião. As texturas do LOD0 nunca chegam à GPU no caminho actual. A pré-compilação de shaders e do PMREM ao carregar foi medida e retirada: acrescentava 1,5–2 s de tarefas longas ao carregamento sem melhoria mensurável na entrada do raid.

## Validação

Tudo sobre o runtime final `d90f8de`. Os testes de navegador correm em Chromium headless com ANGLE/SwiftShader, 1 worker e sem retries.

| Verificação | Resultado | Registo |
|---|---|---|
| `npm test` | **329/329** PASS (HEAD `ae97790`, runtime `d90f8de`) | [logs/node.log](logs/node.log) |
| `npm run build` | PASS, `index-DBJGxfTk.js`, o mesmo bundle que a suite de navegador testou; só o aviso de bundle > 500 kB, que já existia | [logs/build.log](logs/build.log) |
| GLB e manifesto do Ju 87 regenerados | idênticos byte a byte (4/4); vagões, que partilham o gerador de texturas, também (7/7) | [logs/reproducibility.log](logs/reproducibility.log) |
| Equivalência de gameplay (rota completa, base contra candidata) | hashes idênticos | [GAMEPLAY_EQUIVALENCE.json](GAMEPLAY_EQUIVALENCE.json) |
| Testes de navegador do Ju 87 | 2/2, dentro da suite completa | [logs/browser.log](logs/browser.log) |
| Suite completa de navegador | **55 passaram, 6 falharam** em 61 (33,9 min) | [logs/browser.log](logs/browser.log) |
| Repetição isolada das outras 5 falhas da suite | base: 3 falham, 2 passam; candidata: 3 falham, 2 passam; os conjuntos são diferentes | [BASE](logs/browser-rerun5-BASE-99309d9.log) · [CANDIDATA](logs/browser-rerun5-CANDIDATE.log) |
| Repetição ×3 dos dois testes que, na repetição isolada, falharam só na candidata (os rigs, que também tinham falhado duas vezes, não foram repetidos) | portões: base falha 1 de 3, candidata 2 de 3; fogo alemão: base falha 3 de 3, candidata 2 de 3 | [BASE](logs/browser-repeat2-BASE-99309d9.log) · [CANDIDATA](logs/browser-repeat2-CANDIDATE.log) |
| Repetição ×5 da salva nos portões | base falha 3 de 5, candidata 3 de 5 | [BASE](logs/browser-gates5-BASE-99309d9.log) · [CANDIDATA](logs/browser-gates5-CANDIDATE.log) |
| Frames nas cenas desses testes (Ju 87 invisíveis) | iguais nas duas builds (tabela abaixo) | [logs/scene-frames.log](logs/scene-frames.log) |
| Teste de áudio de produção, isolado | falha nas duas builds na linha 53 (ver Limitações) | [BASE](logs/browser-audio-production-BASE-99309d9.log) · [CANDIDATA `d90f8de`](logs/browser-audio-production-CANDIDATE-d90f8de.log) · [corrida anterior, registada em `d6b619c`](logs/browser-audio-production-CANDIDATE.log) |

**As 6 falhas da suite completa, somando as corridas acima na base e no runtime final** (falhas / corridas). A corrida de áudio registada em `d6b619c` fica de fora; com ela, a candidata teria 3/3 no áudio.

| Teste | BASE `99309d9` | CANDIDATA | Onde falha |
|---|---:|---:|---|
| `m01-audio-production` | 1/1 | 2/2 | linha 53 nas duas builds: espera de `pitch` depois de um único movimento sintético do rato |
| `licensed character rigs…` | 1/1 | 2/2 | rato sintético com pointer lock: na candidata, um dos cinco tiros (o carregador não muda em 30 s; o log não diz qual); na base, o regresso à horizontal depois dos tiros |
| `adjustment salvo at the gates…` | 4/9 | 7/10 | a espera de 5 s por "atrás de si" expira com o HUD ainda em "em frente" |
| `adjustment salvo behind the truss…` | 1/1 | 1/2 | idem |
| `demolition inside the road truss…` | 1/1 | 1/2 | idem |
| `German fire on the repair…` | 3/4 | 4/5 | os ~15 s de amostragem não chegam a ver sapadores deitados e de pé |

A salva nos portões começou por falhar mais na candidata (4/5 contra 1/4). Na repetição ×5 seguinte, as duas builds falharam 3 de 5 vezes, e os frames dessa mesma cena medem-se iguais (tabela seguinte). Com estas amostras, 4/9 contra 7/10 não mostra uma diferença causada pela candidata.

Em nenhum destes testes os Ju 87 estão visíveis: o relógio da missão está fora da janela 04:33:10–04:40:00 de `renderState.stukas`. Depois de Continuar, nos snapshots dos testes da salva nos portões e do fogo alemão, medi nas duas builds (Baixa, 3 corridas, uma build servida de cada vez):

| Cena | Build | Frames desde Continuar | Intervalo máximo | Relógio da missão em 8 s |
|---|---|---:|---:|---:|
| Salva nos portões | BASE | 13–14 | 2,07–2,17 s | +1,30 s |
| Salva nos portões | CANDIDATA | 13–14 | 1,90–2,20 s | +1,53–1,55 s |
| Fogo alemão no reparo | BASE | 17–19 | 1,85–2,02 s | +2,07–2,55 s |
| Fogo alemão no reparo | CANDIDATA | 18–19 | 1,78–1,95 s | +2,30–2,57 s |

A candidata não fica mais lenta. Este ambiente desenha 1–2 frames por segundo nestas cenas, e o jogo avança 0,16–0,32 s de relógio por segundo real. Por isso, as esperas de 5 s pelo HUD, os ~15 s de amostragem e as corridas entre o pointer lock e o rato sintético destes testes ficam no limite em qualquer das builds. As 6 falhas não são regressão desta tarefa, mas a suite completa não está verde neste ambiente. Nenhum teste foi saltado nem posto em quarentena, e nenhum dos 6 que falham foi alterado. Os testes que esta tarefa alterou estão listados a seguir.

### Testes alterados

`git diff 99309d9` em `tests/` (nenhuma asserção dos 6 testes que falham foi tocada):
- `tests/browser/m01.spec.js`: o teste do primeiro raid espera `fade === 1` antes de medir (+2 linhas). O snapshot restaurado é o instante em que os aviões são ouvidos.
- `tests/m01-ju87-glb.test.js`: as asserções passam de um material para três (`ju87_b1`, `ju87_glass`, `ju87_prop_disc`) e verificam `canopy`, `propeller_disc`, as peças novas e as medidas estimadas (+19/−3).
- `tests/m01-aircraft-runtime.test.js`: cinco testes novos, sem asserções retiradas (+88). Cobrem materiais, rpm/fase da hélice e atitude por avião, o fade, a histerese de LOD, o fade 0 com o nível visível e o proxy sem fade, e o `planes_heard` da simulação real.
- `tests/m01-locomotive.test.js`, `tests/m01-panzerzug.test.js` e `tests/m01-soldier-visual-variation.test.js` (+3/−1 cada): a lista `integratedPresentation` da guarda de invariância contra `5f3cc34` passa a incluir os três GLB e o `manifest.json` do Ju 87. Os restantes ficheiros dessa guarda continuam a ter de ser idênticos.

## Revisão e verificação independentes

Dois agentes separados, sem alterar ficheiros nem o estado do git. Os relatórios destes dois agentes não estão arquivados nesta pasta; as resoluções conferem com os commits citados.

**Revisor (código de `8947f20` e documentos de `2ea0a68`):**

| Achado | Gravidade | Resolução |
|---|---|---|
| O fade da entrada escondia todos os níveis de LOD durante ~0,11 s depois de `evt_m01_planes_heard`. Os diagnósticos davam `lod`/`propeller` indefinidos e dois testes de navegador do raid falhariam com um GPU rápido. | Bloqueador | `d6b619c`: o nível seleccionado continua visível e é o que os diagnósticos reportam; o fade faz-se só por opacidade e `alphaHash`. O teste de navegador espera `fade === 1` antes de medir. Testes unitários cobrem fade 0 no GLB e no proxy, e `ju87HeardAt` com o driver real. |
| Antena solta: mastro ~12 cm acima da capota e fio a acabar no ar à frente da deriva. | A corrigir | Mastro assente na espinha da capota; fio até ao bordo de ataque da deriva. |
| Evidência citada que ainda não estava na pasta. | A corrigir | Capturas, recortes, pares e métricas no commit `4a80639`, refeitos no runtime final em `0e493d6`. |
| Histerese de LOD sobrevivia ao reinício do checkpoint. | Menor | `resetEffects()` esquece o nível. |
| Possível soluço no primeiro frame visível (PMREM e shaders compilados a pedido). | Menor | Pré-compilação experimentada, medida e retirada em `d90f8de`: custava 1,5–2 s no carregamento sem ganho mensurável. |
| O LOD0 é sempre descarregado mas nunca aparece no caminho fixo. | Menor | Documentado; carregá-lo só quando necessário fica como próximo passo. |

**Verificador (`4a80639`):** 8 itens PASS e 2 PARTIAL, nenhum a indicar regressão.

- PASS:
  - Node 329/329;
  - build;
  - testes focados 9/9;
  - GLB e manifesto reprodutíveis byte a byte, vagões 7/7 idênticos;
  - simulação sem alterações e hashes de gameplay idênticos aos da base;
  - navegador Ju 87 2/2;
  - inspecção dos pares e da galeria, com notas cosméticas (ver Limitações);
  - conteúdo original, sem material de Call of Duty nem suástica.
- PARTIAL:
  - documentos: os números conferem com as capturas e o manifesto, mas havia seis imprecisões (coluna do céu, origem das geometrias, números sem evidência arquivada, título de um teste, redacção da área da silhueta, commit da equivalência);
  - a descrição da falha do teste de áudio dizia "da mesma forma" nas duas builds, e não é.

As imprecisões dos documentos foram corrigidas em `9f532e1` e `0e493d6`; a descrição do teste de áudio está corrigida nas Limitações. As +6 geometrias que o verificador não conseguiu atribuir vinham da pré-compilação, entretanto retirada.

Depois da verificação, o runtime só mudou na pré-compilação: `9f532e1` limitou-a aos níveis da qualidade actual e `d90f8de` retirou-a. Entre `4a80639` e `d90f8de`, `src/` difere apenas nas duas linhas retiradas. Repeti sobre `d90f8de` os testes Node, o build, a equivalência de gameplay, as capturas e os seus contadores, as medições das cenas cover/repair e a suite de navegador. O início do raid foi medido logo antes do commit `d90f8de`, com código equivalente.

**Verificação final, só de leitura, sobre `ac32437`.** Foi feita contra `logs/`, as capturas e o git, sem correr testes nem gerar evidência nova. Conferem:
- FILES_CHANGED (87 entradas) e SHA256SUMS (58/58), antes destas correcções;
- Node 329/329, build, reprodutibilidade 4/4 e 7/7, e equivalência de gameplay;
- suite 55/61 e todas as contagens das repetições e da tabela das 6 falhas;
- contadores `renderer.info`, tamanhos dos GLB, métricas de silhueta, tarefas longas e frames;
- implementação contra o código, o manifesto e os GLB;
- janela dos Stukas contra `mission.json` e o código da simulação.

As correcções são só de documentação:
- céu da candidata (171,9);
- descrição das falhas dos rigs e do HUD;
- critério da repetição ×3;
- testes alterados;
- script de medição alterado depois de `d90f8de`;
- frames medidos só em duas das seis cenas, com a janela e a ordem das corridas descritas;
- origem da corrida de áudio em `d6b619c`;
- medições do MG34 e relatórios do revisor e do verificador sem registo arquivado.

Uma segunda ronda incluiu os achados do verificador do chat anterior, cada um conferido contra os logs e o git antes de entrar:
- a base só tem corridas isoladas;
- a cor medida do avião nas capturas;
- fuligem, óleo e poeira pouco visíveis na galeria;
- o início do raid foi medido com código equivalente, antes de `d90f8de`;
- a contagem do áudio não inclui a corrida de `d6b619c`;
- correcções ainda pendentes nas secções de estado (notas cosméticas e LOD0 a pedido);
- no PERFORMANCE.md, as +6 geometrias só em Alta e o carregamento semelhante nas cenas sem Ju 87.

Runtime, testes, assets, capturas e logs ficaram iguais.

## Limitações

- As formas vêm de proporções, sem planos medidos. Aros, tripulação, antena, MG 17, Pitot, juntas e compensadores são estimados e estão marcados no `manifest.json`.
- Não há mergulho, freios abertos nem lançamento visíveis enquanto o caminho e os tempos estiverem fixados. A inclinação é apresentação.
- O céu de ambiente é estático (madrugada) e só ilumina os aviões.
- Não houve medição de frame time nem de compilação de shaders num Chromebook físico.
- Os três LOD continuam a ser descarregados em qualquer qualidade, como antes. O LOD0 nunca aparece no caminho actual, porque os aviões voam a 160–200 m de altitude.
- No fallback sem arte opcional, os proxies de caixas não têm fade e continuam a saltar na volta de 90 s, como antes.
- O segundo raid (`raidPlane`, 18 m de envergadura) não é um Ju 87 e mantém o modelo anterior.
- Notas cosméticas do verificador, por tratar, só visíveis de perto na galeria:
  - as lascas na capota do motor parecem ruído uniforme;
  - o fio da antena quebra-se em traços;
  - fuligem, óleo e poeira mal se vêem.
- `tests/browser/m01-audio-production.spec.js` falha nas duas builds neste ambiente:
  - a base `99309d9` (isolada) e a candidata `d90f8de` (isolada e na suite completa) expiram na linha 53 (espera de `pitch`, 300 s);
  - uma corrida anterior da candidata, registada no commit `d6b619c`, expirou antes, na linha 46 (espera de 20 s pelo primeiro evento MG34);
  - segundo medições da sessão anterior, a espera da linha 46 está no limite nas duas builds: o primeiro MG34 chega aos 19–21,5 s em ambas, também com os GLB do Ju 87 bloqueados. Essas medições não ficaram em `logs/` e não contam como evidência;
  - nesta cena os Ju 87 não estão visíveis;
  - não é regressão desta tarefa, mas o teste continua instável neste ambiente.
- A suite completa de navegador não está verde neste ambiente: tem 6 falhas, todas reproduzidas na base (ver Validação). Precisa de outra máquina ou de testes menos dependentes do ritmo de frames.

## Próximo passo recomendado

- Expor na simulação o início do mergulho e o instante de lançamento de cada avião, para abrir os freios e soltar a SC 250 no momento real.
- Carregar o LOD0 só quando for necessário.
- Medir o raid num Chromebook físico.
- Noutra tarefa, estabilizar os testes de navegador que dependem do ritmo de frames: o áudio de produção, o rato sintético com pointer lock, as esperas de 5 s pelo HUD e a amostragem de 15 s do reparo. Em alternativa, corrê-los numa máquina com GPU.

## Recomendação ao capitão

- Ver os pares antes/depois ([pairs/](pairs/)) e a galeria isolada e, se a leitura for a esperada, aceitar o fecho visual do Ju 87 como asset provisório do protótipo.
- Antes de integrar, correr a suite de navegador numa máquina com GPU ou no CI do repositório, para confirmar que as 6 falhas são só deste ambiente.
- Abrir uma tarefa própria para os testes dependentes do ritmo de frames. Esta tarefa não os alterou.
- M01 continua **PROTÓTIPO JOGÁVEL**: estas provas não substituem playtest humano nem medição de FPS num Chromebook.

## FILES CHANGED

[FILES_CHANGED.txt](FILES_CHANGED.txt) lista os caminhos exactos; [SHA256SUMS.txt](SHA256SUMS.txt) identifica os ficheiros de evidência e os GLB.
