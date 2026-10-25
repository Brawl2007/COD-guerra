# M02 — Continuação efetiva após publicação do Claude API

Atualizado em 2026-10-25. Branch única publicada: `codex/m02-recovery-v1`. Último checkpoint de código: `caf3541` (atlas e interações), após `7f25739` (GLB/arma/áudio).
**Estado atual: integração de apresentação e interações em progresso; NÃO declarar M02 concluída.**

## Origem recuperada e decisões

- `git fetch origin` executado. O refspec original só incluía main; foi necessário fetch explícito de `api/m02-soldados-visual-v1`.
- Gemini continua em `56e98cbf774d3b717f4f228ce5f66a7194f4d7a5`.
- Claude visual foi publicado em `d08bb7abf3dd6bb86431a26131b9652b80cf68b6`, com commits `8bf3131` e `d08bb7a`. Base comum com Gemini: `41d990d`; portanto não inclui as áreas B/C recentes. `api/m02-conclusao-v1` não foi encontrada no remoto.
- Não houve merge automático nem substituição do renderer por uma versão antiga. O rig Claude foi extraído com referência de origem para `src/render/m02-claude-soldier-rig.js`, conservando a sua implementação como fallback. O historial original permanece no ref remoto; não se atribui essa implementação ao Codex.
- Checkpoint de implementação: `7f25739` — adaptação dos personagens GLB, arma e áudio M01; commit anterior `3119892` conserva o diagnóstico inicial.

## Implementação presente

- `M02Presentation` reutiliza **M01Characters**, seus modelos, clips, seleção LOD, batching e resolução de animações, sem editar ficheiros M01. Traduz cópias dos atores M02 e os temporizadores de recarga; regista instantes dos eventos reais de disparo apenas para apresentação.
- **M01ViewModel** fornece mãos/arma GLB, recarga, ferrolho, mira e efeitos da arma numa passagem de render própria. Estatísticas somam as passagens de cenário e arma.
- **AudioManager M01** recebe tiros reais do jogador, rajadas dos atores, explosões e passos. Web Audio é desbloqueado por gesto. As opções de tinnitus continuam a controlar a escala de concussão. Não há vozes gravadas novas nem garantia de cobertura de todos os eventos narrativos/horizonte.
- Soldados sem GLB disponível mantêm o rig articulado Claude. A rendição continua no fallback de mãos levantadas. A adaptação dos identificadores de apresentação permite reutilizar RKM/MG M01 sem renomear os atores da simulação. Variantes de equipamento específicas, como MP38, ainda exigem revisão.
- Biblioteca **M01MaterialLibrary** fornece o atlas às paredes, coberturas, portas e objetos da M02, com UVs métricos no cenário inicial. Reconstituições das células usam os materiais partilhados; rever a escala UV nessas reconstruções.
- `m02-player-actions.js` liga [E] à transição A→B após o objetivo COMPLETE, recolha física de abastecimento, reorganização B e passagem a C apenas com abastecimentos resolvidos/corredor seguro e jogador no destino, e epílogo após O09 junto da casa de socorro B12. Portas e giz mantêm prioridade. Não troca regras de combate, RNG ou schema.
- Build Vite inclui agora `dist/m02-01.html`; favicon explícito evita o 404 anterior. O título não anuncia missão concluída. O delta usado na telemetria visual vem do frame real; a simulação continua com o limite de dt anterior.

## Validação e evidência

- `node --test tests/m02*.test.js`: **35 PASS, 0 FAIL, 0 SKIP** (inclui testes novos de tradução sem alteração do snapshot, bloqueio de saltos e transição contextual com arma preservada).
- `npm run build`: **PASS**, com aviso de bundle grande. Entrada M02 presente.
- Browser M02 integral por cenas: **2 PASS**, incluindo asserções existentes, 16 capturas e verificação de GLB/arma/áudio/snapshot. Fonte e configuração não foram editadas durante a execução final desse conjunto.
- Smoke de produção em Chromium, via preview porta 4283: HTTP **200**, atlas Low com 3 texturas e 13 materiais, 8 variantes de assets, arma GLB ativa, sem falha reportada do atlas. Inspeção visual das capturas de produção/fachada/Área C executada.
- O teste de áudio foi reforçado para usar Espaço no controlador normal, em vez de chamar o sintetizador diretamente; **PASS** na execução focada final: 1 tiro real registado, contexto running e pico de amostra **0,187886**. Gravação MediaRecorder evita perder o sinal quando o frame de software atrasa o processamento da tecla. Tentativas anteriores mediam antes do input e falharam; não foram contadas como sucesso. Log: `browser-input-audio.txt`.
- A suíte Node global `npm test` foi **interrompida**, não aprovada: testes longos M01 continuavam a executar. Não somar os casos parcialmente executados nem afirmar regressão global verde. Os 35 testes M02 e as verificações browser acima são os resultados concluídos.
- Evidência versionada: `docs/verification/m02-runtime/recovery-2026-10-25/`. Capturas são verificações por cenas, não playtest contínuo. Telemetria do spec legado ainda contém `renderFrame(0.016, 0.5)`; os seus 62,5 FPS não são benchmark.
- Código da simulação, layouts, testes anteriores e ficheiros M01 não alterados. Main, produção e remoto não modificados. Sem force-push. Push normal da branch confirmado. PR não criado: a operação de leitura `gh api repos/Brawl2007/COD-guerra/pulls?...` devolveu Forbidden em api.github.com. Git HTTPS read/write funciona; não inferir falta de acesso Git nem pedir token apenas a partir do estado do gh.

## Ainda necessário para concluir a missão

1. Jogar C01–C12 num percurso contínuo, com movimento/combate e [E], sem saltos da bancada ou injeção de estado. Os atalhos de inspeção continuam disponíveis e não constituem conclusão.
2. Completar a revisão de animações/especialistas/feridos e armas de cada equipa, incluindo grupo LG01..LG12 e equipamento não coberto pela M01. Exercitar falhas opcionais e restauros em todas as células.
3. Reutilizar vegetação, terreno e restantes efeitos M01 em adaptadores adequados às coordenadas M02. Os materiais e GLB melhoram a bancada, mas o cenário continua insuficiente para aprovação visual final.
4. Cobrir som distante, transições, mecanismos e narrativa; validar mixes/acessibilidade e áudio em sessões reais. O teste de amostras não substitui audição humana.
5. Validar orientação e guardas das interações em B/C por controlos normais, perdas de abastecimentos, feridos e saída; repetir saves/checkpoints e determinismo em casos adversos. A simulação existente não foi reescrita para mascarar falhas.
6. Só depois preparar revisão final/PR na candidata única. Sem merge main, deploy, force-push ou promoção de estado sem evidência.

## Ambiente reutilizável

`install_script` e `start_skill` estão guardados no rascunho. O start_skill foi atualizado com recuperação Claude confirmada, nova entrada de produção, comandos de testes e limitações. Publicação do ambiente pertence ao proprietário; não foi efetuada nem foi verificada restauração numa tarefa nova. Usar o checkout existente, sem worktree por defeito.

---

## Histórico inicial — superado pela recuperação acima

# M02 — Estado real de recuperação

Data: 2026-10-25. Estado: **BLOQUEADA A CONTINUAÇÃO DO CLAUDE API; bancada Gemini executável, missão não concluída**.

## Git e origem

- Checkout inicial limpo: branch `work`, HEAD `6697956f3c684f06a856ddc4c6501bbb053bd438` (merge M01 PR #76). Não continha M02.
- Consulta real a `git ls-remote --heads origin '*m02*' '*M02*'`: encontrada `gemini/m02-01-quinta`, HEAD `56e98cbf774d3b717f4f228ce5f66a7194f4d7a5`. Não encontradas `api/m02-soldados-visual-v1` nem `api/m02-conclusao-v1`. Isso não demonstra que não existam noutro computador.
- Base Gemini recuperada por fetch; commits M02 preservados: `bef32e8`, `41d990d`, `df47781`, `bca39bd`, `56e98cb`, sobre `3c8e576`.
- Branch local de recuperação: `codex/m02-recovery-v1`, criada diretamente sobre a base Gemini. Sem merge em main, push, deploy, reset ou alteração de código de jogo.
- `M02_EXECUTION_STATE.md` não existia; o documento anterior disponível é `M02_HANDOFF.md`. As suas alegações de missão completa e desempenho não foram aceites como evidência atual.
- Foi solicitado ao proprietário o patch, ficheiros ou branch do Claude API, ou confirmação de que só existe a base Gemini. Aguardando resposta; não iniciar adaptação duplicada de soldados/armas/áudio antes de recuperar essa entrega.

## Ambiente e validação executada

- Node `v24.19.0`, npm `11.9.0`, Chromium `/usr/bin/chromium`.
- Primeiro `npm ci` falhou porque o cache predefinido `/home/agent/.npm` não era gravável. Resolvido com `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`: 21 pacotes instalados. Lockfile, verificações de integridade e TLS preservados.
- `node --test tests/m02*.test.js`: **32 PASS, 0 FAIL, 0 SKIP**. Log da instância: `/tmp/cod-guerra-m02-tests.log`.
- `npm run build`: **PASS**, aviso de bundle grande. É build da aplicação principal: `dist/m02-01.html` NÃO é gerado. Não valida distribuição de produção da M02.
- `CHROME_EXECUTABLE=/usr/bin/chromium M02_ARTIFACT_DIR=/tmp/cod-guerra-m02-baseline npx playwright test -c tools/m02/playwright-m02-01.config.js`: **1 FAIL**, na asserção final `consoleErrors === []`, após produzir as 16 capturas e telemetria. Um erro HTTP 404; inspeção CDP posterior identificou `/favicon.ico`. Não modificar/enfraquecer a asserção. Log: `/tmp/cod-guerra-m02-browser.log`.
- Arranque com `PORT=4173 node tools/m02/run-m02-01.mjs`: HTTP **200**, `window.m02Bench` presente, HUD do objetivo O01 e amostras de render verificadas no Chromium. Este servidor de desenvolvimento deve ser reiniciado em cada tarefa.
- Capturas inspecionadas: `/tmp/cod-guerra-m02-boot.png` e `/tmp/cod-guerra-m02-baseline/m02-05-area-c-lesmierz-sp03.png`. Mostram bancada, soldados geométricos, arma simplificada, edifícios e cenário pouco detalhados. Não constitui playtest integral.
- A telemetria final do spec injeta `renderFrame(0.016, 0.5)`: os 62,5 FPS e 0,5 ms de simulação desse trecho são valores derivados dos argumentos, NÃO medições reais de desempenho. Não reutilizar essas alegações.
- Suíte M01 integral e playtest contínuo C01–C12 não executados nesta recuperação.
- Logs/capturas em `/tmp` são evidência desta instância, não artefactos Git nem prova de restauração futura.

## Lacunas confirmadas na base recuperada

1. `src/render/m02-01-renderer.js` constrói soldados com caixas/esferas e arma com caixa/cilindro; ainda não integra modelos GLB, clips e apresentação M01. O renderer já importa a política LOD M01, mas isso não equivale a reutilizar a biblioteca de personagens.
2. `M02AudiovisualDirector` regista eventos espaciais; o controlador M02 não liga um motor de áudio audível. Testes dos registos não comprovam som no navegador.
3. Interface de bancada expõe teletransportes e saltos diretos de cenas. A suíte usa teletransportes, chamadas diretas e snapshots; não demonstra progressão C01–C12 por controlos normais.
4. Falta entrada M02 no build de produção; o runner Vite de desenvolvimento funciona.
5. Falta favicon explícito em `m02-01.html`; o pedido automático gera o 404 que reprova a suíte.

## Configuração reutilizável guardada

Rascunho do ambiente com `install_script` (npm ci e cache gravável) e `start_skill` (checkout existente, sem worktree por defeito, recuperação Git, arranque M02, prontidão e comandos de testes com Chromium e diretório novo de capturas). Guardado com sucesso; revisão/gravação nas definições e publicação pelo proprietário ainda pendentes. Nenhuma alegação de publicação ou validação numa tarefa nova.

## Próxima ação

Obter a entrega Claude ou confirmação de inexistência antes de programar a continuação. Comparar ancestralidade e diffs, preservar autoria e integrar só o que falta numa candidata única. Depois reutilizar sistemas M01 por adaptadores de apresentação sem alterar autoridade da simulação M02; validar soldados/animações, armas, áudio audível, cenário e percurso real C01–C12. Preservar checkpoints, saves, RNG e testes. Corrigir o favicon no contexto da entrega recuperada e repetir o browser com um diretório de artefactos novo. Resolver a entrada de build antes de declarar distribuição de M02 pronta.
