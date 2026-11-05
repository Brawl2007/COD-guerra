# M02 «Contra-ataque» (Bzura/Łęczyca, 9–10/9/1939): roteiro, auditoria da implementação Gemini e plano de integração

Estado: **documento de direção (Capitão, 2026-11-04)**. Não altera código, a M01 nem o PROMPT.
Referência canónica desta fase: o pacote do proprietário `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`
(A–Q, v1 de 24/10/2026, 56 pp.; commit `f81994fb`). O dossiê do PR #58 (`7849522`) é **antecedente**: o
pacote reaproveita-o e corrige-o (A2/A3). Implementação auditada: ramo `origin/gemini/m02-01-quinta` @ `56e98cbf`
(5 commits sobre `3c8e576d`). Não há PR aberto para esse ramo: a API REST devolveu uma lista vazia.

Veredito do próprio pacote (p. 3 e Q4): está pronto para **uma bancada isolada e um primeiro blockout**. Não está
pronto para produção integral, arte final nem missão validada. Pela escada do `CAMPAIGN_PLAN.md` §2, a M02 continua
`PLANEJADA`. Esta auditoria, por si só, não muda esse estado.

---

## 1. Resumo fiel do roteiro (pacote A–Q)

**Direção (p. 3, C1).** O jogador participa na ofensiva polaca de 9–10/9/1939. A missão é de ataque e não de
espera defensiva.

- POV: Piotr Sokół. Lis acompanha-o, como manda o PROMPT §73.
- A secção é ficcional. O enquadramento proposto é Exército Poznań → GO Knoll-Kownacki → 25.ª DI → **56.º pp**,
  com a companhia sem número até haver revisão documental (B4).
- O percurso tem três momentos:
  - assalto rural no setor Kwiatkówek–Tum;
  - acesso a Łęczyca, de noite;
  - depois de uma elipse, um combate local nos acessos de Leśmierz. É uma **reconstrução dramática** (B4, Q2).
- O clímax é uma retirada **local** de um grupo exposto. Não é a retirada do exército. A derrota e Varsóvia
  ficam no epílogo, com datas explícitas.
- O elenco da M01 (Jan Wrona, a secção de Zieliński) **não migra** (A3, K1; PROMPT §73).
- Sobre a continuidade, a T03 (`research/SOURCES.md`, RESUMO, certeza MÉDIA) diz apenas que o 2.º Batalhão de
  Fuzileiros combateu depois «no Bzura e em Varsóvia», sem data nem eixo. Nada no repositório põe essa unidade
  em Łęczyca a 9/9. A escolha do cânone é coerente.

**Cronologia (B3).** As fontes deste quadro são as do pacote, com prefixo `BZ-` (ver §5).

| ID | Facto | Classe no pacote |
|---|---|---|
| EV01 | 9/9: ofensiva polaca no Bzura | DOCUMENTADO (BZ-H01/H02/H03) |
| EV02 | Reconhecimento de manhã; ataque principal no setor de Łęczyca por volta das 17:30 | DOCUMENTADO (BZ-H02/H03) |
| EV03 | Combate noturno pela cidade; Łęczyca livre ao amanhecer de 10/9 | DOCUMENTADO (BZ-H02/H03) |
| EV04 | 10/9: o 56.º pp avança no eixo Leśmierz–Tymienica–Boczki–Czerchów | DOCUMENTADO por análise de ordem (BZ-H05; BZ-H02/H14) |
| EV05–EV08 | 11–12/9 combate até Ozorków. 12–13/9 mudança operacional, com Łęczyca reocupada a 13/9. Depois, dispersão e alguns sobreviventes chegam a Varsóvia. Fim dos combates a 22/9 | DOCUMENTADO em escala geral |

Correções obrigatórias do pacote ao #58 (A2):

- não há recuo geral na manhã de 10/9;
- a hora das 16:30 deixa de ser o início do ataque principal;
- os raides aéreos das 06:10 e 07:50 saem do plano base, porque não estão confirmados (B6; DEC-08);
- os blindados ficam fora do clímax;
- não entram Tiger, Panther nem MG42.

**Estrutura (C1–C6): 5 atos, 12 cenas, alvo editorial de 29–34 min.** Esta duração ainda não foi medida.

| Ato | Cenas | Área | Núcleo jogável |
|---|---|---|---|
| I Levantar da vala | C01 preparação (0,−175); C02 posto EA0 (−18,−110), escolha vala/pomar | A | `dlg_m02_001`; `m02.axis`; `cp_m02_a_preparacao` |
| II Uma quinta habitada | C03 assalto à quinta (MG em B02, B01 casa); C04 pomar e água (alemão ferido, giz) | A | `cp_m02_b_acesso`; `m02.pomar_wounded_marked`, `m02.fired_on_wounded` |
| III Abrir a passagem | C05 deslocação A→B (cartela «noite de 9 para 10»); C06 corredor B05/B06 e a carroça com 2 volumes | B | `m02.supply_reached` 0/1/2; carroça imobilizável, com transporte manual |
| IV O dia seguinte | C07 reorganização (cartela «10/9 — manhã»); C08 nova missão local (Lis destacado para a ligação) | B→C | `cp_m02_c_reorganizacao`; sem cura total |
| V Levar os que faltam | C09 capturar a passagem (B09–B11); C10 «a ordem muda» (`dlg_m02_002`, reserva EC2, impacto fixo); C11 Lis e o último grupo LG01–LG12 (`dlg_m02_003`); C12 epílogo | C | `cp_m02_d_cobertura_retirada` **antecipado** para C10 (DEC-06); `m02.lis_status` ∈ {wounded_evacuated, wounded_walking, missing}; sem mínimo de 10 sobreviventes |

**Combate (D).**

- Os encontros decorrem entre 15 e 120 m.
- O efetivo é finito: EA0 4, EA1 10, EB1 12, EC1 8, EC2 12. São **46 hostis planeados, nunca simultâneos**.
- A secção é Gruca, Lis, Wierzba, Małek e Szymczak, mais dois auxiliares para a rkm.
- Os aliados têm de produzir efeito causal real: em 60 s, com Piotr abrigado, há uma melhoria mensurável (D4).
- As explosões dão um aviso de 5–8 s e caem numa posição fixa (D5).
- Os valores de partida são parâmetros de teste: 5+45 cartuchos e 2 granadas (D6).
- Armas alemãs propostas: MG34 e Kar98k. Ainda aguardam validação (EQP-01).

**Persistência (I).**

- Transições TR01–TR05 com protocolo de 5 passos, idempotente quer a cena seja vista quer saltada.
- Quatro checkpoints semânticos.
- Flags legadas do #58 com domínios definidos (I4).
- O snapshot mínimo inclui **seed e estado do gerador**, a data narrativa e o relógio local (I5).
- O envelope de campanha deve coordenar-se com o R4 e não pode criar um schema global unilateral (I5, M6).

**Diálogo (K).** As falas `dlg_m02_001–003` são literais. As linhas novas usam o namespace `bz39_*`. Os IDs 010–043
do #58 não são reatribuídos. Gruca, Wierzba, Małek e Szymczak continuam a ser **propostas** (K1).

**Execução (P).**

- P1 autoriza **só a M02-01**: bancada isolada da quinta, com geometria, colisão e linhas de tiro.
- P2 ordena o backlog M02-00…M02-13, com gates.
- N define o slice de 100 × 150 m com quatro etapas: N0 geometria, N1 combate causal, N2 ambiente, N3
  persistência e revisão.
- O critério de expansão é o N6. Inclui **playtest humano**.

## 2. O que muda no jogo e o que não muda

- **Muda, só depois da integração autorizada:** passa a existir uma página de bancada separada (`m02-01.html`). O
  código e os testes da M02 vivem em ficheiros próprios.
- **Não muda:**
  - `index.html` e a seleção em `src/game/game.js`;
  - os 0 bytes de `missions/m01-tczew/*` e de `src/**/m01-*`;
  - os saves da M01 e os goldens;
  - o build de produção, porque `vite.config.js` não tem entradas multipágina.
- A M02 **não é jogável a partir do menu**. Continua a não sair antes de a M01 estar em PRODUÇÃO
  (`CAMPAIGN_PLAN.md` §2/§4).

## 3. Auditoria da implementação Gemini contra o pacote

### 3.1 O que existe

Diff `3c8e576d..56e98cbf`: 21 ficheiros **novos** (+9651) e nenhum ficheiro existente alterado.

- Simulação: `src/game/m02-01-simulation.js`, `m02-combat-ai.js`, `m02-acts-director.js`,
  `m02-audiovisual-director.js`.
- Mundo: `src/world/m02-quinta-world.js`, `m02-zone-streamer.js`, `m02-horizon-system.js`.
- Apresentação: `src/render/m02-01-renderer.js`, `src/m02/m02-01-main.js`, `m02-01.html`.
- Dados: `missions/m02-bzura/*.json` (2 layouts).
- Testes: 5 suites Node (32 testes) e 1 spec Playwright.
- Documentação: `docs/m02/M02_HANDOFF.md`.

O handoff cita um `K-PERSONAGENS-DIALOGOS.md` que **não existe em nenhuma ref do repositório**. O conteúdo coincide
com a secção K do pacote (IDs `bz39_*`, elenco e falas literais). Conclusão: a Gemini seguiu o pacote A–Q, a partir
dos ficheiros editáveis do ZIP, que não estão no repositório.

**Numeração divergente.** As etapas da Gemini não coincidem com o backlog P2 do pacote:

| Etapa Gemini (`docs/m02/M02_HANDOFF.md`) | Equivalente no backlog P2 |
|---|---|
| M02-01 quinta | M02-01 |
| M02-02 IA/EA1/granadas | M02-03 (combate/IA) + parte da M02-04 |
| M02-03 Área A + horizonte | parte de M02-06 + C01/C02 |
| M02-04/05 Áreas B e C, ponte para M03 | M02-09, M02-10, M02-11 |
| M02-06 audiovisual e matriz | M02-07 + M02-08 (parcial) |

A Gemini **avançou para além do âmbito que P1 autoriza** (só M02-01) e saltou os gates N0→N1→N2→N3 e N6. Não há
registo de autorização nem de playtest. O trabalho não se deita fora (P4), mas as Áreas B e C ficam
**não aceites** até haver gate.

### 3.2 Fidelidade ao roteiro

Classificação: ✓ conforme, ≈ parcial, ✗ desvio. A severidade segue O6.

| Ponto do pacote | Gemini | Verdict |
|---|---|---|
| Quinta 100 × 150 m, X −50…50 / Z −90…60, B01–B04, duas rotas, SN1–SN5 (N1/N5) | Mesmas coordenadas, rotas e pontos SN | ✓ |
| Falas `dlg_m02_001–003` literais; `bz39_*` (K2/K3) | Textos literais conferidos em `m02-combat-ai.js` | ✓ |
| Efetivos EA0/EA1/EB1/EC1/EC2 = 4/10/12/8/12 (D2) | Iguais; os «46 hostis» do handoff são o total planeado de D2. **Não aparecem como número no ecrã de jogo** | ✓ |
| Sem recuo geral a 10/9; cartelas TR01–TR05 (C, I1) | Textos de C12 copiados; `generalRetreatOnMorningSept10:false` | ✓ (texto) / ≈ (HIST-TEST-01 exige revisão histórica assinada, não um teste unitário) |
| Lis destacado em C08; regressa ferido em C11; três estados; sem mínimo de 10 (C11, I6) | Implementado; exporta para M03 | ✓ conteúdo / ≈ gate |
| Impacto fixo em C10 com aviso de 5–8 s (D5, J) | Posição fixa (4,0,18), aviso de 6 s | ✓ |
| Sem raides aéreos (B6, DEC-08) | Sem Ju 87 | ✓ |
| Carroça com estados móvel/imobilizada e transporte manual 0/1/2 (C06, D5) | `WAITING_CLEAR_CORRIDOR`/`IMMOBILIZED`, volumes, anti-duplicação | ✓ (sem cavalo, o que M6 admite como fallback) |
| Tum só como volume de estudo rotulado (ART-01) | «Volume de estudo provisório (Tum / Colegiada)» | ✓ |
| **«56 pp só aparece após aprovação histórica» (C01; DEC-02)** | O cabeçalho de `m02-01.html` mostra «56.º Regimento / 25.ª DI»; `m02-01-quinta-layout.json` também o afirma | ✗ **P1** (HIST, O5 n.º 13) |
| **Armas alemãs MG34 e Kar98k; EQP-01 pendente (B6)** | `mp38` dado a fuzileiros em EB1, EC1 e EC2 | ✗ **P1**: não previsto, sem fonte |
| Água e material sanitário não são regeneração (D6, I1) | C07: +10 de vida até 85 se houver água | ≈ P2: rever com a direção |
| **Snapshot com seed e estado do gerador (I5)** | `snapshot()` não guarda `rng` nem `seed`. Depois de um restore, o RNG continua no estado em que estava, não no do checkpoint | ✗ **P1** (SAVE-01: determinismo depois do restore) |
| Persistência real, com save anterior preservado (SAVE-02, I2) | Checkpoints só em memória (sem `localStorage`). O validador rejeita snapshots corrompidos | ≈ (bancada) |
| Ponte de campanha coordenada com o R4 (I5, M6) | Schema próprio `cod-guerra-campaign-bridge-m02-to-m03-v1` | ✗ **P1** (risco M6 «dois gestores de save») |
| «Não declarar 100 % por contagem de testes»; FPS só com equipamento (O1, M5, M6) | O handoff declara «PASS (100 %)» em HIST-TEST-01/02, PERF-01 «62,5 FPS» e REG-01 sem equipamento nem build/hash | ✗ **P1 de documentação**: reescrever como «teste de estado verde», não como aceitação |
| HUD sem números inventados (AGENTS) | O HUD de depuração mostra «Guarnição EA1 n/m ativos» | ≈ P2: aceitável na bancada; retirar da apresentação de jogo |

### 3.3 Fontes e classificação

- As fontes do pacote têm IDs **H01–H14** (B2). Os mesmos IDs já existem em `research/SOURCES.md` para a M01 (H01
  Tczew, H02 Presidência, etc.): há colisão.
- Os URLs ficam registados no PDF (p. 11), mas o conteúdo **não está guardado** e não há entrada em
  `research/SOURCES.md`. Estado de cada uma: «registada no pacote, conteúdo não guardada».
- A Gemini não acrescentou fontes nem classificação por facto aos JSON da M02 (`historicalNote` em texto livre).
- Hora e sol: TIME-01 continua aberto. Não confirmei os presets de luz da Gemini (`afternoon_1939_09_09`…) contra
  um cálculo.
- **Cálculo meu (método NOAA de C01, CET, 52,06 N 19,20 E), RECONSTRUÍDO, ainda por guardar como C02:**

  | Momento | Elevação | Azimute |
  |---|---|---|
  | 9/9, 16:30 | 15,2° | 259° |
  | 9/9, 17:00 | 10,6° | 265° |
  | Ocaso de 9/9 | ≈ 18:09 | — |
  | Nascer de 10/9 | ≈ 05:13 | — |
  | 10/9, 07:30 | 20,7° | 109° |

  Isto confirma a nota A2 do pacote: o «pôr do sol 19:10» do #58 está errado, porque usa CEST.

### 3.4 Reutilização e duplicação de sistemas da M01

**Reutiliza sem alterar:**

- `M01Navigator` (`m01-navigation.js`), `m01-player-physics.js`, `spatial.js`, `m01-collision-layout.js`;
- `wz29.js`, `m01-lod-policy.js`, `core/random.js`.

**Duplica, com justificação parcial do pacote:**

- **IA de secção própria.** A4/M1 pedem tiro aliado causal, e o da M01 é em parte apresentação. Justificada.
- **Diretor de diálogo próprio.** Duplica `m01-barks.js` e `line()`. Deve convergir depois do slice.
- **Explosões próprias.** M1 proíbe herdar as imunidades de `m01-blast`. Justificadas.
- **Renderer e entrada próprios.** M2 permite um entrypoint separado na bancada. Justificados.
- **Save/ponte próprios.** **Não** usam o envelope de atos (`ACT_SAVE_SCHEMA` 3, `carryFrom`) nem
  `M01AreaSimulation`/`acts.json`. Isto contraria I5/M6 e é a principal dívida de integração.

**Não usa** o act runner nem as fábricas de lanços, retaguarda, retirada, macas e poeira. É coerente com P3/M2: a
bancada não pode tocar na M01. A extração para utilitários comuns faz-se depois, com autorização própria.

### 3.5 Determinismo, testes e encaixe na nossa linha

- Nenhum `Math.random` nem `Date.now` na simulação (só no renderer e no main, para telemetria). O RNG tem seed.
- Não há goldens nem fixtures de referência.
- O teste de 12 sementes (19390909–19390920) verifica que o fluxo termina. Não verifica igualdade de trajeto.
- **Fusão de ensaio, sem tocar no checkout principal:**
  - `git merge-tree HEAD origin/gemini/m02-01-quinta` → sem conflitos (rc 0).
  - Criei um commit solto com `commit-tree`, sem ref, num worktree temporário, já removido.
  - Corri `node --test --test-concurrency=1` sobre as 5 suites M02 → **32/32 verdes** (28 s).
  - Não corri o `npm test` completo, o build nem o browser.
- **Riscos de integração (inferidos, não executados):**
  1. O `playwright.config` principal tem `testDir: tests/browser`, por isso apanha `m02-01-quinta.spec.js`. Esse
     spec abre `/COD-guerra/m02-01.html` sobre `npm run preview`, mas o build não gera essa página. Resultado
     provável: `npm run test:browser` falha.
  2. `npm test` passa a incluir as 5 suites M02 (+~28 s; atenção ao `test:chromebook`).
  3. O spec escreve capturas e telemetria (`snapIfMissing`). É preciso confirmar o caminho dos artefactos.

## 4. Plano de integração (P2 e P4: aproveitar, não recriar)

**Princípios:**

- Merge `--no-ff` que preserve os 5 commits da Gemini, **sem rebase**, porque a base `3c8e576d` já é antecessora
  da nossa linha.
- Os commits de correção ficam por cima.
- As Áreas B e C entram no código, mas **fora do gate**: não aceites e sem entrada no menu.
- Ledger: `INTEGRADA SEM VALIDAÇÃO DE JOGO` só depois de cada incremento passar os testes.

| Incremento | Conteúdo | Aceitação (prova real) |
|---|---|---|
| **M02-INT-0** (feito com este documento) | Auditoria e plano; decisões D-M02-1…7 pedidas ao proprietário | Proprietário decide (§6) |
| **M02-INT-1** Fusão isolada (P2 M02-13; só com D-M02-1) | Merge `--no-ff` do ramo na branch autorizada. `testIgnore` de `m02-*.spec.js` no `playwright.config` principal (o spec continua a correr com `tools/m02/playwright-m02-01.config.js`). Ou, em alternativa, `m02-01.html` como entrada Vite multipágina. Linha no ledger | `npm test` completo verde; `test:browser` da M01 verde; `npm run build`; REG-01: `git diff` de M01 = 0 e goldens idênticos (`--amendment` atual) |
| **M02-FIX-1** História e equipamento (P1) | Retirar «56.º Regimento» do ecrã e dos dados até DEC-02 (usar «25.ª DI», ou nada). `mp38` → `kar98k` até EQP-01. Fontes BZ-H01…H14 em `research/SOURCES.md` (estado «não guardada» / leitura real). Classes por facto nos JSON M02 | Teste de dados: nenhum texto de ecrã com regimento ou arma não aprovados; cada cartela com fonte BZ-* |
| **M02-FIX-2** Saves (P1, SAVE-01/02, I5) | `snapshot()` passa a incluir `seed` e o estado do `Random`; restore em duas fases. Teste: o mesmo checkpoint restaurado duas vezes dá o mesmo trajeto (golden de estado curto, 2 rotas × 1 semente) | Igualdade tick a tick depois do restore; snapshot antigo sem `rng` → rejeição ou migração explícita |
| **M02-FIX-3** Handoff honesto (O1) | Reescrever a matriz do `docs/m02/M02_HANDOFF.md`: «teste de estado verde» ≠ «PASS». HIST-TEST-01/02, PERF-01, O4 e N6 passam a PENDENTE. FPS só com máquina, GPU e build/hash | Revisão do Capitão |
| **M02-01 gate N0** (P3, N5) | Planta com escala; screenshots SN1–SN5 × 2 luzes × 3 perfis (30 conjuntos; hoje há 16 capturas); vídeo contínuo das duas rotas; tabela de vãos; lista de problemas; comando de reprodução | Pacote de prova N5 aprovado pelo Capitão |
| **M02-03/04 gate N1** | Log causal do AI-01 (ação → efeito), portas e cerca persistentes. CP-A/CP-B restauram mortos, danos e munições | O2 AI-01…04, COM-01…03, MAP-01/02, SAVE-01 com evidência gravada |
| **M02-10** Ponte de campanha (só com D-M02-4) | Substituir o schema próprio pelo envelope comum (R4 / `ACT_SAVE_SCHEMA` 3 + flags S1) | Um único gestor de save; NAR-01/02 |
| **M02-08 gate N6** | Slice jogável; métricas por perfil com equipamento; **playtest humano** (O4: 5 pessoas) | Zero P0; nenhum P1 aberto (O6) |
| M02-09/11 (B, C) | Já existem em código. Ficam congelados até N6 + HIST-01/02 + GEO-01/02 | O2 por área + playtest |

## 5. Sistemas S1–S17 (correção do `CAMPAIGN_PLAN.md` para a M02)

| Sistema | Com o pacote | Estado na Gemini |
|---|---|---|
| **S2 data por segmentos** | Estados temporais T0–T3 com cartelas e sem relógio visível (C1, I1). Hora solar só depois de TIME-01 | Implementado à parte (presets de luz + cartelas); sem `battleClock` nem data no snapshot |
| **S7 veículo NPC com agenda** | Carroça com estados e carga; cavalo opcional (fallback estacionário, M6) | Implementado sem cavalo |
| **S14 Ju 87** | **Retirado da M02** (B6, DEC-08). A linha «M02 reutiliza Ju 87» do `CAMPAIGN_PLAN.md` fica desatualizada | — |
| S1 flags, S3 rendição/ferido, S9 interiores | Necessários: flags I4, `SURRENDERED`/`WOUNDED_UNARMED`, interiores de um piso (M4) | Implementados localmente, sem contrato comum |

Assets: tudo procedimental ou primitivo, sem modelos externos nem conteúdo COD. O pacote proíbe arte final antes de
GEO-01 e ART-01. Para o cavalo, VO e sons novos, a licença está por definir.

## 6. Decisões do proprietário

1. **D-M02-1 Integração.** Aceitar a fusão isolada da bancada Gemini (M02-INT-1) na branch autorizada. Isto
   equivale a ratificar a M02-01 de P1, com as Áreas B e C presentes mas não aceites. A alternativa é deixá-la no
   seu ramo até a M01 chegar a PRODUÇÃO.
2. **D-M02-2 = decisão 1 do pacote / DEC-01.** Cronologia sem recuo geral de manhã; «cobertura da retirada» com
   sentido local.
3. **D-M02-3 = decisão 2 do pacote / DEC-02.** 56.º pp como enquadramento proposto. Até haver resposta, não aparece
   no ecrã (M02-FIX-1).
4. **D-M02-4 Contrato de save comum.** A ponte M02→M03 usa o envelope de atos/R4 + S1, e não um schema próprio
   (DEC-07, I5).
5. **D-M02-5 = DEC-03/04/05/06.** Três células; clímax local em Leśmierz; rota do pomar mais longa; CP final
   antecipado para C10.
6. **D-M02-6 Elenco.** Confirmar Gruca, Wierzba, Małek e Szymczak (propostas do #58). Rever «Małek» por ser
   parecido com «Malec», o POV da M05. Confirmar também que Jan Wrona e a secção da M01 não aparecem (PROMPT §73).
7. **D-M02-7 Gate do Marco 2.** O `IMPLEMENTATION_PLAN.md` exige a M01 aprovada antes da M02. Decidir se a bancada
   pode avançar antes disso (P1) sem promover o estado da M02.

## 7. BLOQUEADO (fontes a fornecer ou guardar)

- **HIST-01:** escalão e itinerário da secção. Diários do 56.º pp e da 25.ª DI; ordens 317/360 nas edições
  originais (BZ-H04/H05: o PDF editorial está inacessível).
- **HIST-02:** microcronologia de Leśmierz, com relato regimental independente. Até lá, o encontro é ficcional.
- **GEO-01:** WIG P40 S28 Łęczyca, 1937 (BZ-H09: a imagem não foi aberta) e georreferenciação. **GEO-02:** planta da
  zona industrial antes da guerra.
- **ART-01:** fotografias de Tum anteriores a setembro de 1939 (BZ-H07).
- **EQP-01:** dotação de armas e uniformes. Inclui a MP38 da Gemini, que não tem fonte.
- **TIME-01:** guardar C02, o cálculo solar de Łęczyca (§3.3), em `research/SOURCES.md`.
- **CONT-01:** trajetória até Varsóvia.
- **Fontes BZ-H01…H14:** copiar para `research/SOURCES.md` com estado de leitura. Hoje estão apenas «registadas no
  PDF; conteúdo não guardado».
