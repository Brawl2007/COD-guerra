# COD-GUERRA — CAMPAIGN CREATIVE HANDOFF · Continuidade M01 → M02–M30, auditoria do plano e estado da entrega

**TASK_ID** `COD-GUERRA-FULL-CAMPAIGN-M02-M30-CREATIVE-PRODUCTION-V1` · **Branch** `codex/m02-m30-full-creative-production-v1` (base `origin/main` @ `72bbcdd`, confirmada por `git fetch` em 2026-10-08) · **Autor** Diretor Criativo Executivo (continuação direta da entrega `M01-COMPLETE-NARRATIVE-GAMEPLAY-ATMOSPHERE-DIRECTION-V1`, PR #56)
**Natureza:** biblioteca de produção criativa em `docs/campaign-production/` (documentos de campanha + 29 dossiês de missão). **Nenhum ficheiro existente foi modificado; nenhum código, dado de missão, asset, workflow ou documento de outro agente foi tocado.** M01 continua **PROTÓTIPO JOGÁVEL**; M02–M30 continuam **PLANEADAS**. Nada aqui é implementação, certificação ou playtest.

> **Regra fundamental desta biblioteca (do brief):** roteiro e gameplay são uma única experiência. Cada cena importante responde às dez perguntas (o que acontece · porquê · o que o jogador faz · que decisões tem · como reagem aliados e inimigos · como reage o ambiente · como evolui · que consequências ficam · que sistemas são necessários · como se liga ao resto da campanha) e cada missão tem a sua **Matriz Narrativa-Gameplay** (`Evento narrativo | Objetivo jogável | Ação do jogador | Comportamento dos NPCs | Transformação ambiental | Trigger | Consequência`). Nenhuma cena pede um sistema incompatível com a simulação existente sem o declarar como [C]/[D].

---

## 1. O que M01 estabeleceu e o que a campanha herda (Fase 1 — preservação)

A direção de M01 vive na PR #56 (`claude/upbeat-ptolemy-rzqu5g`, `docs/creative-direction/`, 15 documentos). **Esses documentos não estão nesta branch** (por regra: a branch de M01 não é espaço de escrita de M02–M30 e vice-versa). O que se segue é o resumo autoritativo do que esta campanha herda deles; em caso de dúvida, prevalece o documento de M01 referido.

### 1.1 Identidade narrativa herdada

| Princípio (M01) | Fonte | Como a campanha o herda |
| --- | --- | --- |
| **A guerra chega por camadas** (som → luz → atraso → vazio → nome) | `M01-MASTER-STORY-BIBLE.md` §2.1 | Cada missão escolhe **a sua** ordem de camadas; nenhuma repete a de Tczew (ver `CAMPAIGN-MASTER-STORY-BIBLE.md` §4). |
| **Contar os vivos, não os tiros** (`dlg_m01_048`, obrigatória) | `mission.json`, `STORY_BIBLE.md` | Nenhuma missão mostra contador de abates. Cada uma tem **o seu modo de contar** (lugares no barco, metros de corredor, luvas, nomes…). |
| **Trabalho sob fogo** (150 s de reparo) | `M01-GAMEPLAY-VARIETY-DESIGN.md` | Cada missão tem pelo menos **uma tarefa que não é matar**. |
| **O ambiente conta** (caneca, quadro de horários, vãos ausentes) | `M01-ENVIRONMENTAL-WAR-STORYTELLING.md` | Cada missão tem **um objeto** com história e destruição gradual persistente. |
| **Silêncios dirigidos** (quatro obrigatórios) | `M01-AUDIO-MUSIC-DIRECTION.md` | Cada missão tem pelo menos **um silêncio** obrigatório; música quase ausente (um motivo, duas aparições). |
| **Crueldade com causa, duas reações e consequência; sem recompensa** | `M01-MASTER-STORY-BIBLE.md` §5.3 (Rusek/Zieliński) | Os quatro conflitos de caráter do PR #44 (M06, M19, M26, M28) são os momentos de maior peso; as outras missões mostram custo, não choque. |
| **Pessoas históricas fora de cena** (Janik, Juchtman, Faterkowski) | `STORY_BIBLE.md`, `mission.json → historicalPersonsOffscreen` | Sempre. Nomes só em debrief com fonte. |
| **Nenhuma vitória inventada** | `mission.json → debrief` | Cada debrief regista o que foi (atraso, retirada, posição perdida, cessar-fogo). |
| **Primeira pessoa dirigida** (≤ 9 % de controlo retirado) | `M01-CINEMATIC-SHOT-BIBLE.md` | Cutscenes complementam, nunca contradizem; o olhar fica livre sempre que possível. |

### 1.2 Personagens e continuidade (herdado)

- Jan Wrona, a secção de Zieliński, os nomes novos de M01 (Rusek; Hajduk/Cyra/Piszczek; Wąs/Lenc) e Lipski **não transitam** para M02–M30 (Prompt §73; `STORY_BIBLE.md` "Continuidade para fora de M01").
- `m01.nowicki_status = missing` é permanente; a caneca só reaparece **na Polónia**, em M30, em local/data plausíveis e condicionada a flags (ver `CAMPAIGN-CHARACTER-CONTINUITY.md` §9).
- Regra de arco (Prompt §73): entrada → vínculo → perda/prova → mudança → saída, visível em atuação e gameplay, não só em debrief.
- Regra de nomes: elenco recorrente por país com líder, veterano, recruta e apoio médico/rádio conforme composição histórica; sem "esquadrão universal".

### 1.3 Diálogos (herdado)

- Falas curtas em combate (≤ 6 palavras ideal), conversas mais longas em momentos seguros; falas com gatilho real, condição de estado, prioridade e cooldown (`M01-DIALOGUE-PRODUCTION-SCRIPT.md`, contrato em `DIALOGOS_REATIVOS_..._V3.md` do PR #44).
- IDs estáveis por missão (`dlg_mNN_NNN`); as falas canónicas de §79 ficam **literais** e recebem os primeiros IDs; as propostas recebem IDs a partir de 010 e são marcadas com a origem (PR #44 ou esta entrega).
- Política de idioma: VO no idioma original com legendas em português; registo (pt-PT/pt-BR) é decisão pendente da Fase 1 de M01 e aplica-se à campanha inteira (ver §4 desta nota).
- Contrato de silêncio: nenhuma fala durante as janelas de silêncio obrigatório; avisos de proteção têm prioridade máxima.

### 1.4 Tom, arte, cinema, áudio (herdado)

- Tom adulto, sério, sem discursos sobre o sentido da guerra, sem música heroica sobre feridos/mortos; intensidade visual configurável que conserva a gravidade por atuação, som e consequência (Prompt §72).
- Arte: paleta por frente, luz por hora sobre uniformes reais, materiais dessaturados, fumo acumulado persistente (`M01-ATMOSPHERE-ART-DIRECTION.md`); a tabela de luz por hora é o método: cada missão recebe a sua.
- Cinema: vocabulário de primeira pessoa (olhar livre, targets nulos de 2–3 s, "beats" em cutscenes com `lineVariants`), transições de 8–20 s com skip, montagem por **gestos** e nunca por coincidências (PR #44 `CAMPANHA_UNIFICADA_V3.md` §3).
- Áudio: síntese Web Audio por bandas de distância (45/220/950 m), `PHASE_ACTIVITY`, ducking em janelas de silêncio, sem passos nem água hoje (limite real); cada missão descreve o seu mapa sonoro por fase e distância.

### 1.5 Filosofia de gameplay (herdado)

- A simulação é a única autoridade (dano, visibilidade, eventos, estado de missão); o renderer nunca decide.
- Estrutura de missão §54 (CONTEXTO → … → DEBRIEF), nunca "spawn → matar → objetivo → fim".
- Setores de batalha independentes (perto/médio/longe) com agendas que continuam fora da câmara.
- Objetivos com ID estável, ativação/conclusão/falha/timeout, consequências e checkpoint; sem contagem global de inimigos; sem softlocks por NPC escondido.
- Checkpoints em lugares recuperáveis, depois de mudanças de fase e de data; restauração documentada por checkpoint.
- Falhar só por risco real, nunca por timer oculto; escolhas falsas são proibidas (se uma morte é roteirizada, a cena diz-o).

### 1.6 Sistemas reais (herdado, estado inspecionado em 2026-10-08)

| Sistema | Estado | Relevância para M02–M30 |
| --- | --- | --- |
| `M01Simulation` (eventos, objetivos, gates, relógio com segmentos/snap/gates, fogo inimigo como dados, supressão < 3 m, baixas por tiro real, `carriedBy`, `stationDrag`, chamada), `TczewWorld`, `Wz29` | IMPLEMENTADO em `main` | Modelo de referência para **todas** as missões a pé: cada dossiê classifica o que reutiliza [A], estende [B], cria [C] ou altera [D]. |
| Consolidação V5 (`codex/m01-ready-deliveries-consolidation-v5` @ `d277b06`, PR #52 draft; V6 PR #57 em cima): Station V2, Bridge Structural V2, 65 vagões/locomotiva/Panzerzug, Ju 87 V2, Battlefield Audio V1, HUD Cinematic V1, Damage Decals V1, FX V3, Animation Presentation Contract V1, 25 clips + motion clips V1, Soldier Visual Variation, env props, Vegetation V1, atmosfera | EM INTEGRAÇÃO (não em `main`; CI não verde; **Animation Resolver não existe**) | A campanha assume estes sistemas como base futura, nunca como existentes em `main`. |
| Station V3 (PR #54) | READY_FOR_CAPTAIN_REVIEW | Arte de estações ferroviárias reutilizável (M02/M03/M09 têm infraestrutura ferroviária). |
| Soldier locomotion/Animation Resolver (`codex/m01-soldier-locomotion-animation`), World Interaction System (`codex/m01-world-interactions`), Combat AI architecture | PROPOSTO | Pré-requisitos de quase tudo o que é gesto, objeto apanhado, posto montado, veículo. |
| Narrativa de campanha PR #44 (`docs/campaign/*`, 8 documentos) | PROPOSTO (draft contra `main`) | Base das propostas M02–M30; esta biblioteca integra-o e marca o que adota, ajusta ou rejeita. |
| Direção criativa M01 PR #56 | PROPOSTO (draft contra `main`) | Linguagem herdada (§1.1–1.5). |

### 1.7 Aprovado vs pendente (herdado de M01)

Aprovado/canónico: `mission.json` de M01 (12 objetivos, 26 eventos, relógios 04:34 · 04:45 · 05:30 · 06:10 · 06:45 · 07:05, CP-A..D, 70 falas, flags, debrief), `SCRIPT.md`, `STORY_BIBLE.md`, pesquisa de M01, `docs/PROMPT_MESTRE.txt` §52/§73/§78/§79/§80, `missions/campaign-plan.json` (índice).
Pendente: playtest humano de M01, Chromebook, VO, arte final de humanos, V5 verde, Animation Resolver, decisão de registo de língua, nomes novos de M01 (P-NOVA-1), fontes externas não lidas (S01–S08 de M01).

---

## 2. Auditoria do plano canónico M02–M30 (Fase 2)

### 2.1 Fontes lidas nesta sessão (na íntegra)

| Fonte | Estado de autoridade | Leitura |
| --- | --- | --- |
| `docs/PROMPT_MESTRE.txt` §51–§59, §72–§82 (incl. **§79 completo**, os 30 roteiros) | **CANÓNICO** (especificação do Capitão) | integral |
| `STORY_BIBLE.md`, `PROJECT_SPEC.md`, `IMPLEMENTATION_PLAN.md`, `DEVELOPMENT_STATUS.md`, `AGENTS.md`, `missions/campaign-plan.json`, `missions/m01-tczew/mission.json` (schema) | **CANÓNICO / ESTADO REAL** | integral |
| PR #44 `docs/campaign/`: `ROTEIROS_30_MISSOES_POLIMENTO_V2.md` (preserva §79 e acrescenta "Polimento V2"), `STORY_BIBLE_M02_M30_V2.md`, `CAMPANHA_UNIFICADA_V3.md`, `MOMENTOS_MEMORAVEIS_CRUELDADE_30_MISSOES_V3.md`, `DIRECAO_CINEMATOGRAFICA_30_MISSOES_V1.md`, `DIALOGOS_REATIVOS_ATUACAO_MORAL_30_MISSOES_V3.md`, `HISTORICAL_GATES_30_MISSIONS_V1.md`, `PLAYTEST_PLAN_30_MISSIONS_V1.md` | **PROPOSTA** (draft; "READY_FOR_CAPTAIN_NARRATIVE_REVIEW") | integral |
| PR #56 `docs/creative-direction/` (15 docs de M01) | **PROPOSTA** (draft) | integral (autoria própria) |
| GitHub: PRs abertas #2, #4, #25, #32, #37, #39–#45, #47–#54, #56, #57; Issue #55 | ESTADO REAL | lista e cabeçalhos |

### 2.2 O que é decisão aprovada (canónica) e o que é proposta

| Item | Canónico (não se altera) | Proposta (esta biblioteca pode adotar/ajustar) |
| --- | --- | --- |
| Datas, locais, unidades, POV, formações, resultado histórico das 30 missões | §52, §73, §79, `campaign-plan.json` | — |
| As 3 falas por missão de §79 ("Falas:"), checkpoints nomeados de §79, perdas fixas (Rybin, Cole ferido em M29, Nowicki) | §79 | — |
| Correções históricas obrigatórias (§78 "CORREÇÕES HISTÓRICAS QUE DEVEM PERMANECER") | §78 | — |
| Elencos recorrentes nomeados: Zieliński/Krawiec/Lis; Fraser/Morrow/Ellis; Morgan/Bell/Price; **Henry** Cole/Marsh/Gray; Saveliev/Makarov; Whitfield | §73 | funções e personalidades aprofundadas (PR #44 V2 + esta biblioteca) |
| Estrutura de missão §54, contrato §74, validação §80, marcos §77 | §54/§74/§77/§80 | — |
| Seis movimentos da campanha, "Polimento V2", momentos de crueldade, storyboards A–D, 90 falas de exemplo, gates históricos V/P, sondas de playtest | — | PR #44 (adotado como base, com ajustes assinalados em cada dossiê) |
| Três motivos de M01, oito regras da visão de campanha, "uma situação central por missão", M25 como espelho de M01 | — | PR #56 (adotado) |
| Nomes de personagens secundárias de M02–M30, falas novas, set pieces, matrizes, flags `mNN.*`, IDs de objetivos/eventos/checkpoints | — | **esta biblioteca** (tudo marcado PROPOSTA) |

### 2.3 Inconsistências e lacunas encontradas no plano (para o Capitão)

| # | Observação | Onde | Tratamento nesta biblioteca |
| --- | --- | --- | --- |
| C-01 | `missions/campaign-plan.json` mantém `m01.status = PLANEJADA` apesar de M01 ser PROTÓTIPO JOGÁVEL | `campaign-plan.json` | não alterado (fora do âmbito); assinalado |
| C-02 | PR #44 (`STORY_BIBLE_M02_M30_V2.md`) diz que o Marine "Cole" precisa de nome completo; §73 já o nomeia **sargento Henry Cole** e o próprio PR #44 usa "Henry Cole" noutros docs | §73 vs PR #44 | usar **Henry Cole** (Marine, M08/M26/M29) e **Nathan Cole** (M17) em todos os dossiês |
| C-03 | §73 define Morrow como **atirador** e Ellis como **socorrista**; PR #44 chama a Morrow "operador" | §73 vs PR #44 | §73 prevalece: Morrow = atirador (Bren em M06/M11), Ellis = socorrista |
| C-04 | §79 M02 fixa "Exército Poznań" sem divisão; a pesquisa desta sessão (S-C02) atribui a retomada de Łęczyca na noite de 9/9 à **25.ª Divisão de Infantaria**; o PR #44 não escolhe divisão | §79 M02 | dossiê M02 propõe 25.ª DI como RECONSTRUÇÃO PLAUSÍVEL (regimento pendente P-C02) |
| C-05 | §79 M14 data 14/7/1943; a história oficial (S-C14) coloca a tomada de Niscemi em 13/7, cronologias em 14/7 | §79 M14 | sem conflito: a missão é um **comboio de abastecimento no dia seguinte à tomada** (14/7); a data canónica mantém-se |
| C-06 | §79 M25 situa a travessia "sob risco de fogo/explosões"; a pesquisa (S-C21) fixa a detonação falhada às ~15:40 e a travessia entre ~15:30 e ~15:45 (não 16:00) | §79 M25 | relógio proposto da missão alinhado a 15:40 |
| C-07 | §79 M27 não dá hora; a preparação de artilharia começou às 03:00 (fuso não confirmado, S-C24) | §79 M27 | cartela "antes do amanhecer"; hora exata pendente P-C27 |
| C-08 | §79 M23 diz "506.º Regimento" sem batalhão; o ataque a Foy de 13/1 foi liderado pelas companhias **E (2.º Bn) e I (3.º Bn)** (S-C19) | §79 M23 | Bennett no **3.º Batalhão (Companhia I)** para evitar decalque das adaptações da Companhia E |
| C-09 | §79 M15 fixa "onda posterior convencional"; a pesquisa (S-C15) mostra o 1/2 a chegar a Red 2 por volta das 12:05 depois de vadear; dúvida sobre o tipo de embarcação do 1/2 | §79 M15 | Turner no **1.º Batalhão, 2.º Marines**, LCVP, Red Beach 2, ~10:00–12:05 (RECONSTRUÇÃO) |
| C-10 | §79 M09: a unidade canónica é a 13.ª Divisão de Guardas; o primeiro batalhão a cruzar foi do **42.º Regimento de Guardas** (S-C12) | §79 M09 | Antonov no 42.º Regimento (RECONSTRUÇÃO) |
| C-11 | §79 M13 "Prokhorovka": a história do fosso antitanque é contestada (S-C06); o PR #44 não a usa | — | o dossiê **não** encena o fosso como facto |
| C-12 | §79 M19 coloca Lane no 16.º Regimento em Caumont; as fontes creditam a tomada de Caumont ao 18.º/26.º; o 16.º não foi localizado no local (S-C18) | §79 M19 | mantém-se o papel de **flanco/reserva** do 16.º no setor; posição exata pendente P-C19 |
| C-13 | `HISTORICAL_GATES_30_MISSIONS_V1.md` marca 20 missões "P" | PR #44 | esta sessão acrescenta 28 verificações em resumo de busca (S-C01…S-C28); nenhuma promove uma missão a "validada" (fontes não lidas na íntegra, ver §5) |
| C-14 | Registo linguístico misto (pt-BR em §79/`mission.json`, pt-PT em HUD V1 e nos docs de direção) | repo | falas canónicas mantidas **literalmente**; falas novas em pt-PT neutro; decisão global pendente (herdada de M01) |
| C-15 | `DIRECAO_CINEMATOGRAFICA_30_MISSOES_V1.md` propõe 4 planos A–D por missão; o brief atual exige roteiro completo com 20 elementos por cena | PR #44 vs brief | os storyboards A–D são absorvidos como "planos-âncora" dentro dos roteiros completos |
| C-16 | Quatro tarefas "EM PROGRESSO" referidas na Issue #55 continuam sem identificação inequívoca | Issue #55 | esta biblioteca não as infere nem lhes toca |

### 2.4 O que o PR #44 propôs e como esta biblioteca o trata

| Documento PR #44 | Adotado | Ajustado | Rejeitado/suspenso |
| --- | --- | --- | --- |
| `CAMPANHA_UNIFICADA_V3.md` (seis movimentos, curva de crueldade, M28 "A porta aberta", sistema de consequências) | seis movimentos; regras de prisioneiros/civis; M28 como cena-âncora | `character_status`/`pow_safety` etc. passam a flags `mNN.*` concretas por missão (Prompt §74) | nada |
| `STORY_BIBLE_M02_M30_V2.md` (20 arcos, 14 companheiros, matriz de transições) | arcos e gestos-assinatura | nomes secundários atribuídos (eram "dívida"); trajetórias ficcionais escritas ano a ano | "Cole" sem nome (já resolvido por §73) |
| `MOMENTOS_MEMORAVEIS_..._V3.md` (30 momentos) | 29 momentos como base dos "momentos de custo humano" | cada um ganha trigger, duas reações, consequência e flag | nenhum rejeitado; M05 (paraquedista) mantido não-alvo |
| `ROTEIROS_..._POLIMENTO_V2.md` (polimento V2) | identidade e batidas | expandidas em roteiro completo | nenhum |
| `DIRECAO_CINEMATOGRAFICA_..._V1.md` | planos A–D e assinaturas sonoras | absorvidos | nenhum |
| `DIALOGOS_REATIVOS_..._V3.md` (contrato + 90 falas) | contrato de fala; falas como propostas | re-IDs por missão | nenhum |
| `HISTORICAL_GATES_..._V1.md` | gates V/P | acrescentadas S-C01…S-C28 | nenhum |
| `PLAYTEST_PLAN_..._V1.md` | sondas | acrescentadas sondas por set piece | nenhum |

---

## 3. Estrutura desta entrega

```
docs/campaign-production/
├── README.md                                   índice e ordem de leitura
├── COD-GUERRA-CAMPAIGN-CREATIVE-HANDOFF.md     este documento (fases 1–2 e 10)
├── CAMPAIGN-MASTER-STORY-BIBLE.md              visão, seis movimentos, 29 situações, regras
├── CAMPAIGN-HISTORICAL-TIMELINE.md             cronologia validada, classes, pendências, registo S-C/P-C
├── CAMPAIGN-CHARACTER-CONTINUITY.md            20 POV + elencos nomeados + trajetórias + flags
├── CAMPAIGN-GAMEPLAY-VARIETY-MATRIX.md         verbos, sistemas, ritmo, anti-repetição
├── CAMPAIGN-ATMOSPHERE-ART-DIRECTION.md        paletas por frente, luz, materiais, uniformes
├── CAMPAIGN-AUDIO-DIRECTION.md                 assinaturas sonoras, silêncios, música, VO
├── CAMPAIGN-TECHNICAL-ROADMAP.md               sistemas [A]/[B]/[C]/[D], ordem, dependências
├── CAMPAIGN-CRITICAL-REVIEW.md                 revisões histórica/continuidade/gameplay + notas 0–10
└── missions/
    ├── M02-BZURA-PRODUCTION-DOSSIER.md
    ├── … (um dossiê por missão, 12 secções: story bible, roteiro completo, gameplay,
    │      set pieces, ambiente, diálogos, arte, áudio, validação histórica, handoff técnico,
    │      matriz narrativa-gameplay, revisão crítica 0–10)
    └── M30-TOKYO-BAY-PRODUCTION-DOSSIER.md
```

**Convenções transversais** (usadas em todos os dossiês):

- **IDs** (Prompt §74): `obj_mNN_<slug>`, `evt_mNN_<slug>`, `cp_mNN_<letra>_<slug>`, `cs_mNN_<slug>`, `dlg_mNN_NNN`, `co_mNN_<slug>`, setores `sN_<slug>`, grupos `grp_<slug>`, flags `mNN.<flag>`. As falas canónicas de §79 recebem `dlg_mNN_001..003` e são **literais**.
- **Classificação histórica** (vocabulário do brief ↔ vocabulário do repo): **FACTO DOCUMENTADO** = `DOCUMENTED` · **RECONSTRUÇÃO PLAUSÍVEL** = `RECONSTRUCTED` · **FICÇÃO DRAMÁTICA** = `GAMEPLAY_DRAMATIZATION`; mapas: `EXACT` / `RECONSTRUCTED` / `COMPRESSED_FOR_GAMEPLAY`.
- **Classes de dependência técnica** (herdadas de M01): **[A]** reutiliza sistemas reais de M01 como dados · **[B]** pequena extensão (campo opcional, condição nova, clip curto) · **[C]** sistema novo (veículo, água, neve, interiores, rendição, civis) · **[D]** alteração estrutural (contratos/schema; exige aprovação).
- **Registo de pesquisa desta sessão:** `S-C01…S-C28` (resumos de busca, **não** leitura integral das fontes; domínio externo bloqueado para WebFetch nesta sessão, como em M01) e pendências `P-Cxx` em `CAMPAIGN-HISTORICAL-TIMELINE.md` §6–§7.
- **Elenco:** nomes secundários são **propostas** desta biblioteca; nenhum representa pessoa real. Pessoas históricas só em `historicalPersonsOffscreen`.
- **Estados de missão** (Prompt §80): PLANEJADA → PROTÓTIPO JOGÁVEL → EM POLIMENTO → VALIDADA. Todas as 29 ficam **PLANEJADA**.

---

## 4. Decisões pendentes que atravessam a campanha (para o Capitão)

1. **Registo linguístico** (pt-PT/pt-BR) antes de qualquer VO — decisão única para 30 missões.
2. **Divisão/regimento ficcional por missão** (ver C-04, C-08, C-09, C-10, C-12): as propostas são RECONSTRUÇÃO PLAUSÍVEL e precisam de leitura das fontes H e de revisão por historiador.
3. **Nível de interatividade dos momentos morais** (M06, M19, M26, M28): versão jogável exige estado `SURRENDERED`/custódia [C]; versão encenada honesta é o fallback em todos os dossiês (nunca "janela falsa").
4. **Sistemas especiais** (avião M05, tanque M13, jeep M14, água M15/M18/M24, neve M07/M23, interiores verticais M03/M10/M28): ordem do Marco 4 (Prompt §77) proposta em `CAMPAIGN-TECHNICAL-ROADMAP.md`.
5. **Epílogos de M30**: variantes condicionadas a flags (caneca/Tczew, carta/Cassino, luvas/Foy) — exigem aprovação de quem reaparece.

---

## 5. Limites honestos desta sessão

- **Fontes externas:** WebFetch bloqueado (DNS) como em M01; a pesquisa usou **WebSearch** (resumos). Nenhuma das 30 fontes H01–H30 foi lida na íntegra nesta sessão; as 28 verificações S-C são **resumos de busca** citados com URL, úteis para evitar erros grosseiros, não homologação.
- **Nenhum playtest, nenhuma medição de FPS, nenhuma cena implementada, nenhum asset.** Documentos de roteiro não contam como missão implementada (Prompt §58).
- **Nenhum ficheiro existente alterado**; `DEVELOPMENT_STATUS.md` e `docs/NEXT_CHAT_CONTEXT.md` não foram tocados por serem ficheiros com histórico concorrente em várias branches (como em M01).

---

## 6. Estado final da entrega (Fase 10)

Preenchido no fecho da sessão (2026-10-08). Tudo o que está abaixo foi executado; o que não foi, está marcado como tal.

### 6.1 Inventário entregue

| Grupo | Ficheiros | Tamanho |
| --- | --- | --- |
| Documentos de campanha (`README.md`, este handoff, MASTER-STORY-BIBLE, HISTORICAL-TIMELINE, CHARACTER-CONTINUITY, GAMEPLAY-VARIETY-MATRIX, ATMOSPHERE-ART-DIRECTION, AUDIO-DIRECTION, TECHNICAL-ROADMAP, CRITICAL-REVIEW) | 10 | 196238 bytes |
| Dossiês de missão `missions/M02…M30-*-PRODUCTION-DOSSIER.md` (12 secções cada, incluindo a Matriz Narrativa-Gameplay e a revisão 0–10) | 29 | 1017358 bytes |
| Roteiros de mapa `maps/M02…M30-*-MAP-BRIEF.md` (10 secções cada: ficha, planta esquemática, setores, rota principal, rotas alternativas, cobertura/visão, zonas de segurança, encenação, luz/tempo/som, requisitos de produção; sem medições, sem JSON, sem SVG) | 29 | 267584 bytes |

Notas por missão e médias: `CAMPAIGN-CRITICAL-REVIEW.md` §5 (média global 8,0; critério 15 "integração técnica" 5,9 por nada estar implementado). Cronologia e pendências: `CAMPAIGN-HISTORICAL-TIMELINE.md` §1/§6. Elenco adicional proposto em M20–M30 e reatribuições de falas: `CAMPAIGN-CHARACTER-CONTINUITY.md` §11.

**Fases do brief → onde estão:** 1 (preservação) §1 deste documento; 2 (auditoria) §2; 3 (visão) MASTER-STORY-BIBLE; 4 (variedade) GAMEPLAY-VARIETY-MATRIX + ART + AUDIO; 5 (produção) os 29 dossiês; 6–8 (revisões) CRITICAL-REVIEW §2–§4; 9 (roadmap) TECHNICAL-ROADMAP; 10 (handoff) §6 deste documento + CRITICAL-REVIEW §7.
### 6.2 O que ficou intacto

1. `main`, deploy, Pages, workflows, todas as branches/PRs de outros agentes (#2–#57).
2. `missions/m01-tczew/*`, `STORY_BIBLE.md`, `docs/PROMPT_MESTRE.txt`, `missions/campaign-plan.json`, `src/`, `tests/`, `assets/`.
3. A direção de M01 (PR #56) — referida, não reescrita.
4. Os documentos do PR #44 — referidos, não editados.

### 6.3 Validação executada

Registada em `CAMPAIGN-CRITICAL-REVIEW.md` §7. Resumo: `npm test` 108/108 (16,7 s); `npm run build` ✓ 1,43 s (aviso pré-existente de chunk > 500 kB); **não executados**: `npm run test:browser`, playtest humano, medição de FPS, leitura integral de H01–H30 (WebFetch bloqueado; 28 verificações por WebSearch em TIMELINE §5). Nenhum ficheiro fora de `docs/campaign-production/` foi alterado.

### 6.4 Instruções para os agentes seguintes

1. **Nada de M02–M30 entra em código antes de** M01 atingir o Marco 2 aprovado (playtest humano, Chromebook) e da aprovação do Capitão a esta biblioteca, no todo ou por missão (Prompt §77 Marco 5: "M02–M07").
2. **Ordem recomendada de produção**: M02 → M03 (arco polaco, reutiliza mais de M01), depois Marco 4 (bancadas de veículo) em paralelo com M04/M06/M07; ver `CAMPAIGN-TECHNICAL-ROADMAP.md`.
3. **Para cada missão**: o dossiê → `missions/<id>/SCRIPT.md` + `mission.json` (schema de M01) + `HISTORICAL_RESEARCH.md` + `SOURCE_CHECK.md` **só depois** da leitura integral das fontes e da revisão histórica (Prompt §58, §74). Para o mapa: o roteiro em `maps/` → medições (`tools/measure_osm_overture.py --dem`) → `MAP.md` + `map-layout.json` + `MEASUREMENTS.md` + SVG, como em `missions/m01-tczew/`; as tabelas solares dos roteiros são calculadas e **têm de ser validadas** antes de entrarem em `mission.json`.
4. **Nunca**: alterar datas/unidades/POV/falas canónicas de §79, as correções de §78, as perdas fixas; premiar atrocidades; criar escolha falsa; reunir protagonistas que nunca se conheceram; fazer Jan/secção de Tczew transitar.
5. **Referir o ID** (`obj_/evt_/cs_/dlg_/mNN.`) no commit e no handoff de cada implementação; manter tabela de acompanhamento em `docs/verification/<missão>/HANDOFF.md`, como nas entregas anteriores.
