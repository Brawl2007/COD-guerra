# M01 — HUD e apresentação cinematográfica (2026-10-07)

TASK_ID `M01-HUD-CINEMATIC-PRESENTATION-PASS-V1`. Branch `codex/m01-hud-cinematic-presentation-pass-v1`, base `99309d9cb023cc94a07d41ff863e1362e4460570`. Só apresentação: objectivos, estados autoritativos, tempos, `Simulation` e triggers não foram alterados. M01 continua **PROTÓTIPO JOGÁVEL**.

## HUD real encontrado na base

- `index.html` `#hud`: painel "OBJETIVO ACTUAL" + texto + linha de estado da ameaça; relógio `#battle-clock` em monospace; `#status` com "SAÚDE 100", barra, "GRANADAS ×2", "KARABINEK WZ.29 5/40" e "300 m · 5 CARTUCHOS" fixo; `#subtitle`, `#message`, `#interaction` em texto simples; `#checkpoint` "CHECKPOINT ALCANÇADO" a 22% do topo; `#damage-vignette` com o feedback de combate do renderer.
- `Game.updateHud()` (`src/game/game.js`) escrevia todos os textos a cada fotograma; o checkpoint também era anunciado como mensagem central ("CP-A · progresso guardado").
- As cenas fechadas `cs_m01_intro`/`cs_m01_roll_call` não tinham apresentação: o roteiro pede ecrã preto (t=0), cartelas (t=3, t=7) e fade-in (t=11) na introdução; cartela 07:05 e fade para o debrief (t=60) no fim. Na base, o mundo aparecia logo, com o HUD completo e o texto "04:30 · Tczew, Polónia" no painel de objectivo.

## Alterações

| Área | Antes | Depois |
| --- | --- | --- |
| Introdução | mundo e HUD completos desde t=0 | ecrã preto 0–11 s, cartela "TCZEW, POLÓNIA / 1 de setembro de 1939 — 04:30" (3–7 s), cartela da unidade (7–11 s) em máquina de escrever, fade-in 11–13,4 s, faixas de cinema; HUD de jogo oculto; "Espaço · saltar cena" no canto da faixa inferior |
| Chamada no abrigo | igual ao jogo | fade-in 0–3 s com cartela "Chamada no abrigo / Tczew — 07:05" (hora do relógio da batalha), faixas de cinema, fade para preto 57–60 s antes do debrief |
| Objectivos | painel actualiza em silêncio | aviso central "Novo objectivo" / "Objectivo concluído" / "Objectivo opcional" / "Objectivo encerrado"; conclusão + objectivo seguinte num só aviso; aviso ultrapassado sai em 0,25 s; opcional numa segunda linha do painel; destaque do painel durante 4 s após mudança |
| Interacção | "E · entregar mensagem" em texto | tecla desenhada + acção, abaixo da mira |
| Arma | "300 m · 5 CARTUCHOS" fixo | cinco cartuchos (gastos esbatidos), "Alça 300 m", "· ferrolho"/"· a carregar" só quando acontece; munição baixa âmbar, carregador vazio vermelho |
| Dano | vinheta do renderer | mantida; aviso de vida baixa nas margens (saúde < 45, pulsação pelo relógio da simulação); bloco de saúde esbatido com vida cheia, vermelho ≤ 35 |
| Checkpoint | texto central + mensagem | "PROGRESSO GUARDADO · CP-A · Orientação" junto ao relógio, 3,2 s |
| Continuar / restaurar | corte seco | fade-in 0,8 s; continuar mostra cartela "Tczew — pontes do Vístula / 1 de setembro de 1939 · hh:mm / CP-x · nome"; restaurar relembra o objectivo actual |
| Relógio | monospace de debug | "1 · IX · 1939" + hora, tabular |
| Legendas/mensagens | caixas que podiam colidir | coluna inferior central (mensagem acima, legenda abaixo), limitada entre vida e munição; nome do orador a latão |
| Pausa / debrief | — | pausa mostra o objectivo actual; debrief em fundo escuro, cabeçalho de máquina e texto com serifa |

Tipografia sem fontes externas: sans condensada do sistema para o HUD, mono de máquina de escrever para cartelas. Tamanho escala com `clamp(12px, 1.15vh + .45vw, 22px)`.

## Arquitectura e invariantes

- `src/ui/m01-hud.js` (`M01HudPresenter`): lê `sim.scene`, `sim.objectives`, `sim.mission`, `sim.interaction`, `sim.subtitle`, `sim.weapon`, `sim.grenades`, `sim.player.health`, `sim.battleClock`, `sim.definition`; escreve só no DOM, com cache (só escreve quando muda). Tempos derivados de `sim.clock` → congelam na pausa; relógio a recuar = restauro.
- `game.js`: `updateHud()` delega em M01; chamadas `reset('new'|'continue'|'restore')` e `checkpoint(nome)` nos pontos já existentes. Loop, ordem de eventos, ticks, persistência e bancada inalterados (a bancada mantém o seu caminho de HUD; partilha apenas o novo estilo).
- Contratos de texto preservados: `#objective-text` = `mission.text`, `#objective-status` = `mission.status`, `#interaction` = `sim.interaction`, `#subtitle` = "Orador: texto", `#battle-clock` = `clockText`, `#mag`, `#reserve`, `#weapon-state` contém "N m", `#weapon-name`.
- `gameDiagnostics().m01.hudPresentation`: aviso, fila, fade, checkpoint, cartelas — apresentação, não gravada no save.

## Provas

- `tests/m01-hud-presentation.test.js` (5 testes Node): cartelas/fades alinhados com os beats de `mission.json`; transições de objectivo e parsing; **percurso real com e sem apresentação produz snapshot idêntico** e `sim.snapshot()` igual antes/depois de cada `update()`; contratos de texto a cada tick; checkpoint, fade de restauro, cartela de continuação e congelamento na pausa.
- `tests/browser/m01-hud-presentation.spec.js` (2 testes): introdução real (preto + cartela, pausa congela a apresentação, aviso de saltar por cima das faixas via `elementFromPoint`), saltar → aviso de objectivo + checkpoint CP-A; save continuado → cartela, tecla E, objectivo na pausa e caixas dentro do ecrã e sem sobreposição em 1280×720, 1366×768, 1920×1080, 1024×600, 800×600.
- `tools/verification/m01-hud-capture.mjs`: 13 estados (snapshots da rota real + controlos reais, congelados pela pausa real) × 6 resoluções (1280×720, 1366×768, 1920×1080, 1024×600, 800×600, 2560×1080). Resultado final: **78/78 capturas, 0 elementos fora do ecrã, 0 sobreposições entre blocos, 0 erros de browser**; relógio do jogo inalterado durante cada série. `capture-report.json` guarda caixas e textos.
- Imagens: `before/` (base, 1280×720, 13 estados) e `after/` (13 estados a 1280×720 + cinco estados (intro-card-unit, cp-a-objective, interaction-post, objective-update, withdrawal) nas outras cinco resoluções), JPEG q85 convertidos das capturas PNG.

## Revisão e verificação

- Reviewer independente: nenhuma violação das regras; corrigidos o aviso de saltar cena tapado pelas faixas/fade (média-alta), limpeza incompleta ao trocar para a bancada, cartela de continuação com linhas antigas e chave do aviso combinado (baixas). Observação aceite: a bancada partilha o novo estilo visual (texto "OBJECTIVO", "PROGRESSO GUARDADO", granadas sob a munição); a jogabilidade e o selector mantêm-se.
- A revisão visual própria corrigiu: escrita lenta das cartelas, checkpoint sobre o relógio, aviso antigo persistente, aviso central sobre o painel em 800×600, largura das legendas em ecrãs estreitos.
- Verifier independente, sem editar ficheiros (logs em `logs/`).
  - `npm test`: **329/329** (5 novos), 0 falhas. `npm run build`: PASS (aviso habitual de chunk > 500 kB). `git diff --check 99309d9..HEAD`: limpo.
  - Âmbito confirmado: só `index.html`, `src/main.js`, `src/game/game.js` (chamadas do HUD, `updateHud`, diagnóstico), `src/styles.css`, `src/ui/m01-hud.js`, testes, ferramenta e docs. Nada em `src/render/`, `src/world/`, `src/core/`, `missions/` nem outro ficheiro de `src/game/`.
  - Teste de browser do HUD: em `c59092b` o teste da introdução falhou 3/3 por erro do próprio teste (`elementFromPoint` ignora o HUD, que tem `pointer-events:none`); corrigido em `f53e435` → **2/2 PASS** (`browser-hud-f53e435.log`).
  - Suíte de browser integral em `c59092b`+`1217a69` (só ferramenta): **57 passaram, 6 falharam**, 0 flaky, 31,6 min. Uma é o teste do HUD acima. As outras cinco dependem de `mousemove` sintético a rodar a vista e **não são regressão desta branch**:
    - `m01-audio-production.spec.js:36` (timeout à espera de `pitch<-.75`): falha igual na base `99309d9`.
    - `m01.spec.js:99` (rigs/mãos, timeout à espera do olhar horizontal): falha também na base (noutra linha, timeout do carregador).
    - `m01.spec.js:337` (demolição dentro da treliça, estado continua "em frente"): falha igual na base.
    - `m01.spec.js:318` ×2 (salva nos portões/atrás da treliça): falharam uma vez; passaram na repetição em HEAD e na base.
  - A captura `objective-update` do relatório principal (0,5 s após E) mostrava o aviso ainda a entrar; refeita a 1,3 s em todas as resoluções (`capture-report-objective-update-rerun.json`, 6/6 visível, 0 fora do ecrã/sobreposições); as imagens `after/after-objective-update-*` são as refeitas.

## Limites

SwiftShader em contentor: as capturas e testes não medem FPS nem o Chromebook. Não é playtest humano. As cenas não fechadas (bombardeio, ordem, demolições) mantêm o HUD de jogo de propósito (há ordens urgentes, p.ex. "Abrigue-se!"). Fontes dependem do sistema (sem webfonts). Textos das cartelas em português europeu, definidos em `src/ui/m01-hud.js`.
