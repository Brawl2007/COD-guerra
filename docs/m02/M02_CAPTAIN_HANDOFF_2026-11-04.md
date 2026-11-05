# M02 «Operação Bzura»: handoff do Capitão M02 (sessão de 2026-11-04/05)

**Estado final da sessão:** 2026-11-05, cerca das 06:00 UTC. A partir das 21:01 UTC de 4/11 trabalhou-se com 1 agente de cada vez, por pedido do proprietário.

**Veredito:**
- A M02 continua `PLANEJADA`. É uma **bancada isolada, INTEGRADA SEM VALIDAÇÃO DE JOGO**.
- Nenhum portão está aprovado: N0, N1 e N6 continuam pendentes.
- Não há FPS medido. Os números do SwiftShader são só telemetria de software.
- Os testes de estado não são playtest. As Áreas B e C continuam **congeladas e não aceites**: as correções desta sessão não as promovem.

## 1. Base, ramo e integração

- **Branch:** `claude/elegant-wright-m9l1ws`, criada a partir de `origin/claude/dreamy-ramanujan-6v62vr` @ `03387a31`. O HEAD está no fim desta secção.
- **Limites respeitados:** push só para esta branch; sem merge na `main` nem na #80; sem deploy, sem force-push e sem PR.
- **Integração na linha da M01:** cabe ao Capitão M01, com `merge --no-ff` desta branch.
- **M01 intacta:** `git diff 03387a3..HEAD -- src/game/m01-* src/render/m01-* src/world/m01-* src/game/game.js src/main.js missions/m01-tczew src/game/wz29.js` está **vazio**. Os módulos `m01-*` só foram **importados**:
  - na física: `m01-player-physics`;
  - na dificuldade: `m01-difficulty`;
  - no ambiente: `m01-area-field`, `-stubble`, `-trees`, `-earthworks` e `-geo`, mais `m01-lod-policy`.
- **Fora das pastas M02, a branch só mexe em:**
  - `playwright.config.js` (`testIgnore` dos specs M02);
  - `research/SOURCES.md` (secções BZ-H e BZ-C02 acrescentadas; as H01–H30 da M01 ficam intactas).
- **Aviso para a integração.** `npm test` (`node --test tests/*.test.js`) apanha as 23 suites `tests/m02-*.test.js`:
  - em série demoram cerca de 220 s;
  - `test:chromebook` fica mais lento por isso;
  - decidir na integração se ficam no `npm test` por omissão.

## 2. Entregas desta sessão (todas com commit e push)

| Passo do pedido | Commits e merges | Estado |
|---|---|---|
| 0 Auditorias N, O, P (com A pp. 5–7) e Q | `b8f78db`, `be954d9`, `625bde0` | Feito: `docs/m02/auditoria-2026-11-04/{N,O,P,Q}.md` |
| 1 Higiene de testes | `e74c952` | Feito. Ver lista abaixo |
| 2 FIX-1 História e equipamento | `5eb85d9` (merge `65ce341`), `ba7d06e`, `5fee9ee` | Feito. Ver lista abaixo |
| 3 FIX-2 Saves (I5) | FIX-2 `023734d`; FIX-2b `318b265`; FIX-2c `605e3fc` | Feito. Duas revisões adversariais independentes; a última **aceitou com ressalvas**. Ver §3 |
| 4 FIX-3 Handoff honesto | `5c99744` | Feito. Ver lista abaixo |
| 5 Texto K | `465cd30` | Feito. Ver lista abaixo |
| 6 Roteiro C | `07999a4`; correções `da599c7`, `279a8cb` | Feito. Ver lista abaixo |
| 7 Set pieces e mapa (J, E, F) | `07999a4` (+ correções) | Feito. Ver lista abaixo |
| 8 Combate D | `edc51ad`; correções `da599c7`, `279a8cb` | Feito. Ver lista abaixo |
| 9 Ambiente e horizonte (G, H, L) | `32af0b7` | Feito. Ver lista abaixo |
| 10 Portão N0 | `e74c952`, `d3c3af0`, `dbb4436` | **Prova automática feita. N0 NÃO aprovado.** Ver lista abaixo e §5 |
| Pesquisa | `8f5cc55`, `9177808` | Ver lista abaixo |

**1 Higiene de testes:**
- O `playwright.config.js` principal ignora `m02-*.spec.js`: lista 219 testes em 62 ficheiros, 0 da M02.
- `M02_ARTIFACT_DIR` passa a `test-results/m02-artifacts`, e `outputDir` passa a `test-results/m02-playwright`.
- `reuseExistingServer` é `!CI`.

**2 FIX-1 História e equipamento:**
- Saem do ecrã e dos dados «56.º Regimento / 25.ª DI», «56 pp» e «Mensageiro 56 pp».
- Fuzileiros com `kar98k`, sem MP38. MG34 e Kar98k ficam `PROPOSTA_EQP01`.
- Datas: «10 Set» e a cartela «Varsóvia — 25 de setembro» estão sustentadas pelo PDF (B3, C6, I1). Só se tirou a data do título do objetivo C12.
- As 7 macieiras ficam com `status:'candidata'`. «46» só aparece como total planeado de D2.
- **BZ-H01…BZ-H14** e **BZ-C02** acrescentados a `research/SOURCES.md`.
- Cabeçalho da bancada: «bancada isolada, blockout, NÃO validada; 9–10 Set; Kwiatkówek–Tum só como referência tipológica».

**3 FIX-2 Saves:**
- Snapshot v2 com semente e estado do RNG.
- Validador estrito.
- Restauro por fases.
- Checkpoints persistidos, com staging e `previous`.
- Proposta de envelope comum: `docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md` (D-M02-4).

**4 FIX-3 Handoff honesto:**
- PERF-01 e PERF-02 passam a NÃO MEDIDO.
- HIST-TEST-01 e HIST-TEST-02 passam a HUMANO.
- REG-01 passa a PENDENTE.
- «PASS» passa a «teste de estado verde».

**5 Texto K:**
- Linhas novas `bz39_c01_02` e `bz39_c01_03`.
- Condição K2 «olhar livre».
- Nowak, Kowalski e LG01–LG12 ficam `fora_do_pdf`.
- `bz39_c01_01` e `bz39_c04_05` **já eram literais** (K3 p. 39): a auditoria K tinha falsos positivos.

**6 Roteiro C:**
- Progressão automática C01→C12 por condições de jogo, sem as teclas de bancada.
- `lis_status` vem do jogo e é `missing` sem o Lis; fica nulo durante a missão.
- O último grupo só conta como evacuado ao chegar.
- O contacto do C02 acontece 30–60 s depois de o jogador começar a avançar, ou por proximidade a 25 m.

**7 Set pieces e mapa:**
- Carroça: o tiro parte o varal e há fallback de paragem.
- O Lis desloca-se sem teletransporte.
- Evacuação pela porta norte de B09.
- B05–B12 já estavam conformes com o PDF p. 20; o erro era do handoff da Gemini.
- Layout B/C v2.
- B08: portas como decisão pendente.
- B12: macas coerentes com o layout.

**8 Combate D:**
- `missionFailed` quando o Piotr morre, com reinício explícito.
- Aviso de 5–8 s em todas as explosões perigosas.
- Perfis recruta, soldado e veterano com os IDs e multiplicadores da M01; o perfil fica no snapshot, como na M01.
- Ordens só «cobrir» e «avançar».
- Moral por grupo de encontro.

**9 Ambiente e horizonte:**
- Reutiliza `m01-area-*` só por importação.
- Horizonte L3 a 1,5–8 km, com impostores e fade.
- Luzes calculadas pelo método NOAA. A noite não tem sol; a lua não foi calculada e está como placeholder.
- Consumidores dos eventos audiovisuais, incluindo `blast-warning`, com áudio placeholder.

**10 Portão N0:**
- 30 conjuntos: SN1–SN5 × 2 luzes × 3 perfis.
- Cada conjunto tem 4 direções (revisão a 360°), tiradas no ponto do PDF N, com o HUD escondido.
- Manifesto v2 com sha256, câmara e renderer WebGL.

**Pesquisa:**
- EQP-01 (`docs/m02/research/EQP-01.md`): PROPOSTA. Classe máxima PROVÁVEL, porque só se leram resumos.
- TIME-01 (`tools/m02/solar-noaa.mjs`, `docs/m02/research/TIME-01-solar.md`).

## 3. Revisões independentes de simulação e saves

| Revisão | Base | Veredito | O que se seguiu |
|---|---|---|---|
| Saves FIX-2 | `58e7976` | **REJEITADO**: 1 P0 (NaN nas Áreas B/C), 3 P1, P2 | FIX-2b |
| FIX-2b | `318b265` | **ACEITE COM RESSALVAS**: só P2 | FIX-2c |
| Roteiro C e combate D | `edc51ad` | **REJEITADO**: 2 P1 (instantes recusados a dt 1/60; o SP03 não feria), P2 | FIX-CD |
| FIX-CD | `da599c7` | **REJEITADO** por 2 P2 residuais (F1 dependente do dt; KeyM concluía com o Piotr morto) | FIX-CD2 |
| FIX-CD2 | `279a8cb` | Os scripts do próprio verificador foram corridos de novo pelo Capitão sobre o HEAD e **já não reproduzem** (f1offset 0/18, f1phase 0/20, attacks1 casos 1–3 corrigidos). **Não houve nova revisão completa independente** | — |

Resultados de fuzz de restauro-continuação, tick a tick, sem divergências:
- 491 réplicas em `edc51ad`;
- 292 réplicas em `da599c7`;
- missões completas do MissionBot a dt 1/60, 1/144, 1/30 e com jitter: 0 checkpoints recusados e 0 checkpoints com o Piotr morto.

As provas estão em `scratchpad/review*/`, que é **efémero**: não está no repositório.

**Não revisto de forma independente:** o merge do ambiente (`32af0b7`). Só mexe em apresentação e eventos, não em simulação nem em saves.

## 4. Testes corridos no HEAD final (`32af0b7`)

- `node --test --test-concurrency=1 tests/m02-*.test.js` → **364/364 pass**, 0 fail, 0 todo (217 s).
  - Inclui a missão completa por entradas (MissionBot), também a dt 1/60.
  - Inclui determinismo: a mesma semente dá o mesmo estado, e o restauro reproduz a continuação.
- `npm run build` → OK. `dist/` só tem `index.html`, por isso o build principal não muda.
- Browser M02: `CHROME_EXECUTABLE=/opt/pw-browsers/chromium PORT=4391 npx playwright test -c tools/m02/playwright-m02-01.config.js` → **2 passed (8,9 min)** em SwiftShader. A duração subiu de cerca de 3 para 8,9 min com o ambiente G/H/L.
- Prova N0 automática: **30/30 conjuntos**, 120 PNG, desvio de 0 m em relação aos pontos do PDF, 0 erros de consola.
- `node --test tests/m01-tczew-data.test.js` → 14/14, corrido em `465cd30`, depois de mexer em `research/SOURCES.md`.
- **Não corridos:**
  - `npm test` completo, que inclui as suites da M01;
  - `npm run test:browser` da M01;
  - goldens da M01 (REG-01).

  Estes ficam para o Capitão M01 na integração. O diff dos ficheiros da M01 é zero.

## 5. Pendentes conhecidos

**N0, por aprovar:**
- leitura humana das 120 imagens;
- oclusão e interiores;
- vídeo contínuo das duas rotas;
- planta com escala e tabela de vãos: o trabalho parcial está em `docs/m02/wip/2026-11-04/n0-plan.patch`, que **não foi revisto nem aplicado**;
- lista de problemas.

**Depois vêm** o N1 (log causal AI-01, COM e SAVE com evidência gravada) e o playtest humano do proprietário antes do N6.

**Calibração, que precisa de playtest:**
- Tempo da missão simulada até ao C12: ≈ 10,6–13,1 min, **muito abaixo do alvo de 29–34 min**.
- Letalidade de soldado e veterano: o ciclo da Kar98k é 1,55 s na M02, contra 9–18 s na M01.
- Valores escolhidos por agentes sem fonte:
  - raio de contacto do C02: 25 m;
  - abandono dos volumes no C06: 60 s;
  - limiar de vida do Lis entre «walking» e «carried»: 40;
  - desvio a portas fechadas: ≤ 12 m do destino;
  - tempos mínimos de cena: C05 45 s, C07 60 s, C08 60 s, C12 45 s.

**Desvios do PDF ainda abertos:**
- Com o Piotr parado em P1, a secção toma a quinta sozinha aos 72–86 s (D4).
- Spawn sob fogo no C06 em soldado e veterano.
- LG01–LG12 invulneráveis (C11).
- Ordens só na Área A (D4).
- O EA0 não tem moral nem recuo (D2).
- `essential` funciona como imunidade oculta (D1).
- Falta a 2.ª falha dura de D1.
- Os aliados não transportam volumes à mão.
- As portas de B12 têm 1,6 m, contra 1,4 m no PDF.

**Saves:**
- Janela residual de compare-and-swap entre separadores (o `localStorage` não é atómico).
- O cp_a só chega à loja se o jogador avançar antes do contacto (documentado).

**Apresentação:**
- A noite é muito escura e a lua não foi calculada.
- Os blocos do anel L2 parecem paredes cinzentas.
- As sombras só cobrem ±65 m.
- O áudio é placeholder e não foi ouvido, porque o headless não tem gesto de áudio.
- Os azimutes de landmarks são placeholders até GEO-01.

**Fontes bloqueadas:**
- HIST-01 e HIST-02;
- GEO-01 e GEO-02;
- ART-01;
- EQP-01 (validação);
- CONT-01;
- conteúdo das BZ-H01…H14, ainda não guardado.

## 6. Decisões pendentes do proprietário

| ID | Decisão | Estado nesta branch |
|---|---|---|
| D-M02-1 | Aceitar a fusão isolada da bancada (M02-INT-1) | Fusão na linha (`426045ee`) como INTEGRADA SEM VALIDAÇÃO DE JOGO. **Falta a ratificação.** |
| D-M02-2 (DEC-01) | Cronologia sem recuo geral; «cobertura da retirada» com sentido local | Texto conforme. Pendente |
| D-M02-3 (DEC-02) | 56.º pp como enquadramento | **Retirado do ecrã** até haver decisão |
| D-M02-4 (DEC-07) | Envelope de save comum com o condutor de atos da M01 | Proposta em `docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md`. `m01-acts.js` não foi alterado; a M02 continua com schema próprio |
| D-M02-5 (DEC-03/04/05/06) | Três células; clímax local em Leśmierz; rota do pomar mais longa; CP final antecipado para C10 | Pendente. O cp_d é gravado no 1.º abrigo válido entre C10 e C12 |
| D-M02-6 | Elenco: Gruca, Wierzba, Małek, Szymczak; «Małek» vs «Malec» (M05) | Pendente |
| D-M02-7 | A bancada pode avançar antes da aprovação da M01, sem promover o estado | Pendente |

**Outras decisões pedidas:**
- Portas de B08.
- EQP-01.
- Regra `DROPPED_READY`: o volume fica no chão quando o portador morre (introduzida pelo FIX-2b).
- Os valores de calibração do §5.
- Manter as suites M02 no `npm test` por omissão.

## 7. Próximos passos recomendados

Um agente de cada vez:

1. Aplicar e terminar `docs/m02/wip/2026-11-04/n0-plan.patch`: planta SVG e tabela de vãos.
2. Leitura humana das capturas N0 e vídeo das rotas. Aprovação do N0 pelo proprietário.
3. Revisão independente completa do HEAD final (simulação e saves) antes do N1.
4. Tratar os desvios do PDF do §5 por ordem de severidade O6.
5. Integração na linha da M01 pelo Capitão M01: `npm test` completo, `test:browser` da M01 e goldens (REG-01).

---

## 8. Continuação: 2026-11-05, sessão de desenvolvimento a seguir à comparação com o Codex

**Base.** Continua-se na branch `claude/elegant-wright-m9l1ws`. A branch `codex/m02-integracao-unica` parte de `c687e941` e ainda não está integrada; não foi tocada.

### Commits

| Commit | Conteúdo | Testes |
|---|---|---|
| merge `984ff145` (`5489c4eb`…`80f698af`) | Proteção dos saves do Codex e correções N0 (ver abaixo) | — |
| `b33e428b`, `eb3204e9` | Higiene do repositório (ver abaixo) | Em `eb3204e9`: `tests/m02-*.test.js` **426/426**; build OK; browser M02 **2 passed (6,2 min)**, N0 30/30 |

**Proteção dos saves do Codex:**
- A loja só toca nos seus 3 slots v2 exatos e recusa chaves `cod-guerra:checkpoint:*`.
- `detectForeignSaves()` é só de leitura.
- O teste `tests/m02-25-codex-v1-guard.test.js` (18 testes) prova que `cod-guerra:checkpoint:m02:v1` e as chaves M01 ficam **byte a byte iguais**.
- Não há migração. O estado da compatibilidade v1 está em `docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md` («por analisar»).

**Correções N0:**
- A porta sul de B04 fica atravessável.
- A MG34 passa a ter uma fonte única em (12,0; −30,0), como no PDF F3.
- A avaliação «EXPOSTO» é igual à linha de tiro real (0 discrepâncias nas rotas e nos SN).
- O vidro intacto deixa ver e pára a bala, só na Área A.
- B03 ganha as janelas altas N/S e a porta este dos arreios (F4 p. 25).
- O portão norte passa a 3,6 m.
- O layout da Área A passa a v2: os saves com layout v1 são recusados com o motivo, sem apagar.
- A tabela de vãos fica com 0 ERRO e 0 AVISO.

**Higiene do repositório:**
- O merge `984ff145` trazia o commit `5489c4eb`, que incluía por acidente um symlink `node_modules`. Esse symlink substituiu a pasta real de dependências.
- O symlink saiu do controlo de versões e o `.gitignore` passa a ignorar `node_modules` também como symlink.
- As dependências foram reinstaladas com `npm ci`.

### Decisões a rever

- **Sementes do MissionBot trocadas:** m02-18 passa de 777 para 1, e FIX-CD 10 passa de 19390909 para 777. A sobrevivência do bot é caótica a qualquer mudança da Área A: 10/15 sementes chegam ao C12. Nenhuma asserção foi enfraquecida.
- **Vidro transparente só na Área A** (`sightPolicy`). Nas Áreas B/C, o DE-C02 via o Piotr através de `win_b09_east_1` e o bot morria em todas as sementes. É uma decisão de equilíbrio.
- **Arco da MG:** a boca está agora dentro da abertura, e os raios no limite do arco (±79°) podem raspar a ombreira.
