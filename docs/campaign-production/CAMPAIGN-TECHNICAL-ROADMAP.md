# COD Guerra — Roadmap técnico da campanha M02–M30 (Fase 9)

**Estado:** PROPOSTA (nada aqui está implementado). **Base inspecionada:** `main` @ 72bbcdd (M01 PROTÓTIPO JOGÁVEL; `npm test` 108/108; `npm run build` OK); consolidação V5 EM INTEGRAÇÃO fora de `main`, CI não verde, sem Animation Resolver (ver HANDOFF §1.6). **Regra herdada:** `Simulation` guarda só dados; o renderer nunca decide dano, visibilidade, eventos ou estado da missão. **Regra do brief:** nenhum evento incompatível com a simulação existente; cada sistema novo nasce com um fallback honesto já escrito no dossiê.

---

## 1. Classes e critério de aceitação por classe

| Classe | Definição | Aceitação mínima antes de uma missão passar a PROTÓTIPO JOGÁVEL |
| --- | --- | --- |
| **[A]** | reutiliza sistemas reais de M01 como dados (`mission.json` schema 2: objetivos, eventos, setores, `battleClock`, checkpoints com `restore`, `line()` FIFO, `lineVariants`, `safeImpact` ≥ 30 m, fogo inimigo como dados, supressão < 3 m, baixas por tiro real, `carriedBy`, `stationDrag`) | teste de estado por objetivo/evento (como `tests/*.test.js` de M01); nenhum código novo de engine |
| **[B]** | pequena extensão: campo opcional no schema, condição nova, interação curta, estado de ator simples, clip curto | teste unitário da extensão + teste de estado da missão; sem alteração de contratos existentes |
| **[C]** | sistema novo (superfície, água, veículo NPC, rendição, civis, interiores verticais, artilharia legível, cessar-fogo por setores, epílogos) | bancada isolada (como a bancada francesa) com teste de estado e `test:browser`; fallback honesto documentado e **testado também** |
| **[D]** | alteração estrutural (schema, saves de campanha, relógio por segmentos, snapshot por data) | aprovação do Capitão antes do código; migração de saves; testes de regressão de M01 intactos |

**Nunca:** inventar FPS; promover estado de missão sem playtest humano; alterar `missions/m01-tczew/*` por causa de M02–M30.

---

## 2. Sistemas transversais (um sistema, várias missões)

| # | Sistema | Classe | Missões | Depende de | Fallback honesto | Teste de aceitação |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | **Flags de campanha no save** (`mNN.<flag>` lidas por missões posteriores; `lineVariants` por flag de outra missão) | **[D]** | todas (cadeias M04→M20, M06→M11, M07→M27→M28, M08→M26→M29, M14→M18, M18→M19, M16/M23/M26/M29→M30) | schema-2 saves | sem save de campanha: cada missão arranca com os valores **por defeito** declarados no dossiê (nunca "morto"; substitutos nomeados) | carregar M20 com `m04.whitfield_status ∈ {evacuated, missing}` e verificar cartela/fala; nunca "dead" |
| S2 | **Passagem de data dentro da missão** (cartela + checkpoint + estados persistidos) e **relógio por segmentos** com snapshot | [B] (2 datas) / **[D]** (3 atos: M20, M23) | 02, 07, 08, 16, 20, 22, 23, 28, 29 | `battleClock` segments; `restore` | três sub-missões encadeadas com `restore` do estado (aceitável se cartela e estado persistirem) | carregar o CP da nova data: nada "ressuscita" (M22: curva perdida; M23: Munro/Ritter ausentes; M29: Cole ausente) |
| S3 | **Estado `SURRENDERED`/DOWN + custódia** (desarmado, não-alvo da IA aliada, escolta por NPCs, persistente no save, **nunca reativa ao carregar**) | **[C]** | 06, 07, 19, 23, 25, 27, 28 | estados de ator; IA aliada; save | cena encenada (o NPC graduado decide; o jogador só anda ao lado / põe a mão) — nunca "janela falsa" | reload após rendição: ator sem arma, sem IA hostil; disparar sobre rendido → custo registado, missão continua |
| S4 | **Civis como atores não-combatentes** com estados (escondidos → passagem → em trânsito; "não saem com armas apontadas"; nunca alvo da IA aliada; fuga sem dano se o jogador dispara) | **[C]** | 03, 14, 19, 20, 22, 26, 28, 30 | S3 (partilha estados) | cutscenes curtas para as passagens; famílias por agenda em plano médio | nenhum civil atingível pela secção; disparo sobre porta → bala na madeira + custo |
| S5 | **Superfícies com modificador** (neve M07/M23; lama M21/M27/M29; cinza M24; areia molhada M18) — velocidade por profundidade, pegadas persistentes, "não dá para cavar" | **[C]** (um sistema parametrizado) | 07, 18, 21, 23, 24, 27, 29 | colisão/terreno | modificador fixo por zona + textura com pegadas pré-cozidas | velocidade medida por zona; pegadas após reload |
| S6 | **Água** (praia/prado/canal: profundidade, velocidade, som; vadear até ao peito) e **barcos/embarcações NPC com agenda e lugares** | **[C]** | 04, 09, 15, 18, 20, 24 | S5 (modificador) | o prado é lama e o dique é a margem; barcos como cutscene com plano fixo | barco que parte sem o jogador → checkpoint recuperável, nunca falha |
| S7 | **Veículos NPC com agenda** (camiões, jipes, carroça, blindados que atolam/recuam/param por presença; "nunca alvo obrigatório") | **[C]** | 02, 06, 10, 11, 12, 13(ext.), 14, 19, 22, 23, 25, 26, 27 | agendas (`battleClock`) | som + veículo estático + impactos por evento | veículo pára se há ator na via (buzina + grito); blindado "recua" por bazuca opcional sem destruição obrigatória |
| S8 | **Veículos jogáveis — bancadas do Marco 4** (avião M05; tanque M13; jeep M14) | **[C]/[D]** | 05, 13, 14 | bancada própria; câmara externa (M05/M13) | nenhum: sem bancada aprovada, a missão não entra em produção (Prompt §77) | bancada com teste de estado e FPS medido em Chromebook |
| S9 | **Interiores verticais** (escadas, janelas, patamares, oclusão de som e visão; pátios ligados) | **[C]** | 03, 10, 22, 28 | oclusão por material (existe parcialmente em M01) | níveis por "pisos" sem oclusão dinâmica, com mistura por setor | IA não vê/dispara através de paredes; som ocluso por piso |
| S10 | **Artilharia legível** (assobio ≥ 2 s; impacto ≥ 30 m; dois avisos antes de dano; dano em árvores: copa/tronco/galho) e **oclusão sonora por relevo** ("oclusão invertida") | [B] (assobio/avisos) / **[C]** (árvores; relevo) | 11, 19, 21, 27, 29 | `safeImpact`; partículas | galhos pré-colocados que "caem" por evento; mistura perto/médio/longe fixa | nunca dano sem `co_*_whistle` + dois avisos |
| S11 | **Fogo oculto por impacto** (MG sem marcador: só flash, som e impactos; `co_*` transmite direção/altura) | [B] | 24 (e regra geral em 19/21/26) | fogo como dados | — | a MG nunca tem marcador de HUD |
| S12 | **Cessar-fogo por setores** (`enemyState ∈ {fighting, surrendering, surrendered}` por grupo e por agenda; mistura sonora por setor; **nunca mute**) | **[C]** | 28 | S3; mistura por setor | sequência agendada de desativação de grupos com mistura por direção | nível mínimo ambiente nunca atinge silêncio total |
| S13 | **Limite de setor / fogo amigo cancelado** (zona com aviso + agenda de confirmação + impacto ≥ 50 m nunca no jogador) | [B]/[C] | 29 (e variante em 18) | `safeImpact` | cutscene com paragem forçada de 2 min | ultrapassar → aviso + impacto longe + confirmação chega na mesma |
| S14 | **Aeronaves/NPCs de escala** (Ju 87 V2 existe; C-47 de largadas; passagem aérea; holofotes como luz direcional; barragem como panorama por eixos) | [A] (Ju 87) / **[C]** | 02, 04, 05, 08, 23, 27, 30 | partículas que **não** escondem formações | som + cartela + elementos 2D ao longe | holofotes cegam sem dano; a barragem nunca fere o jogador |
| S15 | **Planador/paraquedas com controlo limitado** | **[C]** | 17, 20 | cutscene/controlo limitado | cutscene (Horsa: já encenado por desenho) | — |
| S16 | **Cerimónia sem armas + epílogos interativos + ator sem arma** | **[C]**/[B] | 30 | S1 (todas as flags) | quatro planos fixos com leitura e skip | nenhum input de disparo com efeito; skip sem desbloqueios duplicados |
| S17 | **Animation Resolver** (maca a dois, arrastar a dois, rendição, revista, mão no antebraço/ombro, remar, vadear, abafar botas, levantar tábua) | **[C]** (pré-requisito transversal) | todas com [C] de animação | V5/consolidação | clips curtos por evento sem blending (como M01) | — |

---

## 3. Por missão: classes, risco e fallback principal

Risco técnico 1 (só [A]) → 5 (bancada nova + [D]).

| Missão | [A] | [B] | [C] | [D] | Risco | Fallback principal |
| --- | --- | --- | --- | --- | --- | --- |
| M02 Bzura | simulação, Ju 87, `carriedBy`, `safeImpact` | data, marcar, vala, macieiras | carroça NPC, proxies em vagas | — | 2 | carroça estática + proxies parados |
| M03 Varsóvia | simulação, reparo a dois, `carriedBy` | prop (quadro), `lineVariants` | S9 interiores, S4 civis, bombardeamento por bairro | S1 (leve) | 4 | civis em cutscene; interiores por pisos |
| M04 Dunquerque | Ju 87, escolta invertida, apoio | maca, telefone, reunir | S6 água de praia + barcos com lugares, multidão | — | 4 | barcos em cutscene; praia sem água dinâmica |
| M05 RAF 303 | — | — | **S8 avião (bancada)** | [D] | 5 | nenhum: bancada obrigatória |
| M06 Tobruk | simulação, supressão, `carriedBy` | lâmpada/telefone, sinalização | S7 blindados proxies, S3 rendição, haze | — | 3 | rendição encenada |
| M07 Kryukovo | simulação, `carriedBy` | data, rádio, chamar | S5 neve, trenó NPC, S3, T-34 proxies | — | 4 | neve por zona; trenó por agenda |
| M08 Guadalcanal | simulação, poucos tiros, `carriedBy` | kunai, data | frota/aviões proxies, descarga proxies | — | 2 | **candidata a primeira missão do Pacífico** |
| M09 Volga | simulação | — | S6 barco NPC com controlo limitado | — | 4 | travessia em cutscene com plano fixo |
| M10 STZ | simulação, obstrução por material, `carriedBy` | chave, estancar | S9 interiores industriais, poeira, tanques proxies | — | 3 | poeira por setor |
| M11 El Alamein | simulação, rotação, `carriedBy` | barragem por setores, fita, lâmpada, reatribuição | S7 carriers/tanque preso proxies | S1 (leve) | 3 | — |
| M12 Kasserine | simulação, `carriedBy`, rotação | escolha de ordem | S7 camião com agenda, TD/Pz IV proxies | — | 2 | camião por evento |
| M13 Prokhorovka | — | — | **S8 tanque (bancada)** | [D] | 5 | nenhum: bancada obrigatória |
| M14 Gela/Niscemi | simulação | — | **S8 jeep (bancada)**, S4 civis | — | 5 | nenhum: bancada obrigatória |
| M15 Tarawa | simulação, maca | — | S6 água rasa/vadear, LVT NPC | — | 4 | água como lama lenta |
| M16 Cassino | simulação, `carriedBy` | maca em encosta, data, carta | terreno vertical, eco por relevo | — | 3 | — |
| M17 SME | fogo como dados, mensageiro | senha | S15 paraquedas, veículo proxy | — | 3 | descida em cutscene |
| M18 Omaha | supressão, rotação, maca, entrega | — | S6 água (reutiliza M04), terreno vertical, fumo | S1 (M14) | 4 | — |
| M19 Caumont | fogo como dados, rotação | marcar, sinais, tronco, mão no cano | S3 `SURRENDERED`, sebes com oclusão simétrica, camião | S1 (M18) | 4 | rendição encenada (Morgan intervém) |
| M20 Oosterbeek | fogo como dados, maca, supressão, rotação | `ammoPerMan`, dizer número, chamada baixa, cartuchos à mão | S15 Horsa encenado, S6 água/barco com agenda, flare com aviso | **S2 três segmentos**, porão com civis, S1 (M04) | 5 | três sub-missões; prado como lama; barco em cutscene |
| M21 Vossenack | `safeImpact`, maca/obstáculo a dois, linhas de visão por relevo | confirmar direção, pontos de tiro, verificar, marcar, cave, munição | S10 dano em árvores + oclusão por relevo, minas como zona marcada | — | 3 | galhos por evento; mistura fixa |
| M22 Clervaux | fogo como dados, reunir, maca, veículo NPC, interiores | rádio por estados, caderno, prioridade | S7 blindados como pressão por agenda | **S2 snapshot** | 3 | som + fachadas por evento |
| M23 Bastogne/Foy | fogo como dados, maca, arrastar, posicionar, rotação | mexer os pés, olhar o céu, cave | S5 neve, S14 C-47/colunas NPC, S3 em lote | **S2 três snapshots** | 5 | pegadas pré-cozidas; cena encenada |
| M24 Iwo Jima | `safeImpact`, supressão por janela, maca, reunir | marcar seteira/corredor, recolher | S5 cinza, LVT-4, veículos avariados persistentes, S11 fogo oculto | — | 4 | modificador fixo; carga em vez de lança-chamas |
| M25 Remagen | **ponte de M01** (`planMetalStress`, guarda-corpo, pilares), supressão por janelas, posicionar | travessia lateral, relatar, transmitir, engenheiros NPC | S7 veículos NPC a cruzar, S3 | — | 2 | **candidata a produção cedo** (espelho técnico de M01) |
| M26 Hagushi | fogo como dados (2 tiros), obstáculo a dois, posicionar, observar | leituras, marcar, "para trás do muro", cavar | S4 civis com estados, LVT-4/ondas NPC | S1 (M08) | 3 | porta em cutscene; famílias por agenda |
| M27 Seelow | fogo como dados, `safeImpact`, maca, interiores, posicionar, contagem por voz | identificar, indicar ao T-34, fora da via | S14 barragem panorama + holofotes, S5 lama/canal, S7 blindados que atolam, S3 | S1 (M07) | 4 | holofotes fixos; T-34 estático |
| M28 Berlim | interiores verticais (M10), fogo como dados, maca, posicionar | contar setores, pedir confirmação, baixar o cano | **S12 cessar-fogo por setores**, S3 persistente, S4 abrigo | S1 (M07/M27), S2 | 4 | desativação agendada por grupo com mistura por direção |
| M29 Shuri | `safeImpact`, obstáculo/maca a dois, supressão, posicionar, estafeta | emendar fio, pranchas, mão no ombro, contagens | S5 chuva/lama (reutiliza), S13 limite de setor | S1 (M08/M26), S2 | 3 | paragem forçada em cutscene |
| M30 Baía de Tóquio | olhar/caminhar, interações simples | "reconhecer tarefas", ator sem arma | **S16 cerimónia + epílogos**, NPCs históricos à distância, passagem aérea | S1 (M01/M16/M23/M26/M29) | 4 | multidão pelas costas; quatro planos fixos |

---

## 4. Lotes e ordem recomendada de produção

**Pré-requisito absoluto (Lote 0):** M01 aprovada no Marco 2 (playtest humano; medição no Chromebook) e aprovação do Capitão a esta biblioteca, no todo ou por missão (Prompt §77 Marco 5 "M02–M07"). Em paralelo e **sem** tocar em M01: (a) **S1 flags de campanha** [D] — desenho do contrato e migração de saves; (b) **S3 `SURRENDERED`/DOWN** [C] — bancada isolada, porque é a primeira peça dos momentos de custo humano de sete missões; (c) **S17 Animation Resolver** — pelo menos os clips de maca a dois e rendição; (d) **S2 passagem de data** [B] com `restore` (já quase existe nos checkpoints de M01).

| Lote | Missões | Porquê esta ordem | Sistemas novos que introduz |
| --- | --- | --- | --- |
| 1 | **M02 → M03** | arco polaco; reutiliza mais de M01 (Ju 87, `carriedBy`, reparo a dois); M03 introduz interiores e civis **cedo**, para que S4/S9 amadureçam antes do Pacífico e de Berlim | S7 (carroça), S2 (data), S9, S4 |
| 2 | **M25** (fora de ordem cronológica, como bancada) | espelho técnico de M01: a ponte, `planMetalStress`, supressão por janelas; só S7 veículos NPC e S3 são novos; valida S3 num contexto simples | S7, S3 |
| 3 | **Marco 4 — bancadas de veículo** (M05 avião; M13 tanque; M14 jeep) | sem bancada aprovada não há missão; correm em paralelo com o Lote 4, por equipa separada | S8 (×3) |
| 4 | **M06 → M07 → M04** | Tobruk (blindados proxies, rendição encenada), Kryukovo (neve = primeira S5; trenó NPC), Dunquerque (primeira S6 água + barcos com lugares) | S5, S6 |
| 5 | **M08 → M15 → M18 → M24 → M26** | Pacífico por risco crescente: M08 é de baixo risco técnico; M15/M18 reutilizam a água de M04; M24 acrescenta cinza (S5) e fogo oculto (S11); M26 fecha com civis (S4) já maduros | S11 |
| 6 | **M09 → M10 → M11 → M12** | barco NPC com controlo limitado (S6), interiores industriais (S9), barragem por setores (S10 leve), camião com agenda (S7) | S10 (leve) |
| 7 | **M16 → M17 → M19** | terreno vertical e eco (S10/S9), paraquedas (S15), e a primeira rendição **jogável** (S3 completo) depois de S3 ter sido validado em M25/M06 | S15, S3 completo |
| 8 | **M21 → M22 → M23 → M20** | artilharia com árvores e oclusão por relevo (S10 completo); snapshot (S2 [D]) em M22 antes dos três atos de M23/M20; M20 por último por acumular Horsa, barco noturno e três segmentos | S10 completo, S2 [D], S15 |
| 9 | **M27 → M28 → M29** | panorama/holofotes (S14), blindados que atolam (S7), lama (S5) → cessar-fogo por setores (S12) → limite de setor (S13) | S14, S12, S13 |
| 10 | **M30** | depende de todas as flags (S1) e dos estados finais de M01/M16/M23/M26/M29; epílogos (S16) | S16 |

**Marcos de verificação entre lotes:** após cada lote, `npm test` + `test:browser` da bancada + playtest humano da missão nova + medição no Chromebook; promoção de estado só com evidência (Prompt §58/§80).

---

## 5. Dependências de V5 / consolidação

- **V5 (EM INTEGRAÇÃO, CI não verde):** nenhuma missão nova deve ser construída sobre V5 até a CI estar verde em `main`; os dossiês foram escritos contra o M01 de `main` (72bbcdd). Se V5 entrar, verificar: `battleClock` por segmentos (S2), estados de ator (S3), `lineVariants` por flag de outra missão (S1).
- **Animation Resolver (não existe):** sem ele, todos os [C] de animação caem para "clips curtos por evento" (como M01). As cenas de custo humano foram escritas para funcionar **também** assim (versão encenada honesta).
- **Station V3 (PR #54, READY):** não é dependência de M02–M30.
- **Saves schema-2:** S1 exige extensão (flags de campanha) → [D], com migração.

---

## 6. Riscos e mitigação

| Risco | Missões | Mitigação escrita nos dossiês |
| --- | --- | --- |
| Bancadas de veículo não aprovadas | 05, 13, 14 | missões ficam PLANEJADA; nenhuma versão "a pé" inventada (§79 fixa o veículo) |
| Três segmentos de relógio com estados por ato | 20, 23 | três sub-missões encadeadas com `restore`; o teste é "nada ressuscita" |
| `SURRENDERED` que reativa ao carregar | 19, 23, 25, 27, 28 | teste de aceitação obrigatório; fallback encenado |
| Água/neve/cinza/lama como sistemas separados | 04, 07, 15, 18, 20, 21, 23, 24, 27, 29 | **um** sistema de superfície parametrizado (S5) + água (S6) |
| Partículas que escondem a formação (barragem, poeira) | 10, 27 | regra de arte: formações visíveis sob partículas; fallback: véu de poeira + som |
| Civis caricaturados ou atingíveis | 03, 14, 19, 20, 22, 26, 28 | nunca atingíveis pela secção; revisão cultural (P-C26) antes de gravar/modelar |
| FPS no Chromebook com multidões (M20, M23, M27, M30) | 20, 23, 27, 30 | proxies em plano médio/longe; cortes de densidade declarados; medir antes de aprovar |
| Vozes/figuras históricas (M30) | 30 | por defeito abafadas; transcrição só com fonte e licença aprovadas |
| Assets sem autoria/licença/escala | todas | regra AGENTS.md; nenhum asset proposto aqui |

---

## 7. O que cada missão entrega quando passar a PROTÓTIPO JOGÁVEL

1. `missions/<id>/mission.json` (schema 2) com todos os IDs do dossiê (`obj_/evt_/cp_/cs_/dlg_/co_/sN_/grp_/mNN.`), `historicalCertainty` e `continuityFlags`.
2. `SCRIPT.md`, `HISTORICAL_RESEARCH.md`, `SOURCE_CHECK.md` com as fontes H lidas na íntegra e as pendências P-C fechadas ou mantidas com justificação.
3. Testes de estado por objetivo/evento + os testes listados em §10 de cada dossiê (ex.: M28 "rendidos nunca reativam ao carregar"; M24 "nenhum tiro direto antes das 09:25"; M29 "a terceira salva atinge o buraco de Cole em qualquer ramo").
4. Playthrough humano registado em `docs/verification/<id>/HANDOFF.md` com tempo real medido contra o alvo do dossiê (sem FPS inventado).
5. Nenhuma alteração a `missions/m01-tczew/*`.
