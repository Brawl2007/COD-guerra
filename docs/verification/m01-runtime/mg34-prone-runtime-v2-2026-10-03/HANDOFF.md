# HANDOFF — M01-MG34-PRONE-RUNTIME-V2

M01 — Tczew permanece **PROTÓTIPO JOGÁVEL**. Entrega isolada para revisão do capitão; nenhuma integração em runtime, assets-review ou main.

## Identificação

- **TASK_ID:** M01-MG34-PRONE-RUNTIME-V2.
- **MODELO:** GPT-6.1 Sol solicitado; agente de implementação/revisão de simulação configurado explicitamente com `gpt-6.1-sol`.
- **ESFORÇO:** HIGH.
- **BASE BRANCH:** `codex/m01-ckm-placement-migration`.
- **BASE HEAD:** `2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732`.
- **BRANCH:** `codex/m01-mg34-prone-runtime`.
- **HEAD de implementação/testes:** `8d55ae554b54f2fc0758189395936bb8c41a7c40`.
- **HEAD FINAL REMOTO:** o commit de documentação que contém este handoff na branch acima; SHA exato confirmado na resposta final. Um documento não insere a própria hash no conteúdo.

A publicação foi feita por commits sequenciais da ligação GitHub, porque o shell não tinha credenciais de escrita. O checkout foi reconciliado com os commits remotos por fetch/rebase. Não houve force-push.

## Checkpoints publicados

| Checkpoint | HEAD no fecho funcional | Resultado nessa etapa |
| --- | --- | --- |
| 1 — postura, rajada e save | `435d962c64199f914a70cd765d68db670d1d8405` | 29/29 focados, incluindo CKM |
| 2 — hitboxes, facing e socket | `151ef325e52e47aade7066e0e26d6335b471526e` | 40/40 focados, incluindo CKM |
| 3 — clips, fallback e interrupções | `7cf2dec2397c744da89e2dc10f55b9980309dd7e` | 46/46 focados com suporte; 220/220 Node |
| 4 — browser e prova de clarões | browser `152df76331bc6a8c49bc0a93e2aed6766f69308f`; prova Node extra `8d55ae554b54f2fc0758189395936bb8c41a7c40` | 46/46 focados novos; 224/224 Node; build; 35/35 browser |

Os checkpoints foram publicados antes de avançar. Os commits por ficheiro decorrem da API disponível; todos pertencem à mesma branch isolada. Os commits finais seguintes contêm apenas documentação/evidências.

## Máquina de estados implementada

Somente `de_east_0` e `de_east_1` recebem `mg34Prone`: `phase`, `startedAt`, `duration`, `progress`; `fromProgress` apenas durante exit e `burst` apenas durante fire_burst. Schema continua 2.

- `standing → enter → idle`: entrada em posto fixo dura 1,9 s.
- `idle/aim → fire_burst → aim`: facing vem da aquisição/disparo real. Rajadas de 4–7 tiros a 0,075 s; corte em `rounds × 0,075`, antes do próximo evento do clip.
- Movement/ADVANCE/RETREAT: `exit → standing`, saída de 1,9 s antes de deslocar. Target já alcançado não reescreve SUPPRESS enquanto deitado.
- Enter parcialmente interrompido reverte o próprio clip enter desde o frame corrente durante os 1,9 s de exit; evita salto para uma pose completa diferente.
- Supressão/HIT_REACTION cancelam rounds ainda não emitidos e mantêm o gunner fixo baixo. OUTRO cancela rajada pendente e bloqueia novas rajadas.
- Morte/inatividade apagam a postura ativa e zeram `shot`; rounds já emitidos permanecem em voo.

O plano reserva IDs e calcula dispersão/RNG no início, na ordem existente. Cada record só entra em `enemyFire.rounds` e emite evento individual no seu instante real. Cancelar rounds futuros não cria som/clarão/tiro. O renderer não consome RNG nem emite tiros. `firedAt` conserva o início da rajada; `shot` é a janela de 0,06 s do último round realmente emitido.

## HITBOX/FACING

Cabeça, torso e pernas usam centros medidos nos ossos reais, deslocados para frente/centro/trás no eixo corporal, e extents que acompanham a postura. AABBs envolvem esses segmentos orientados; não são apenas caixas centradas rebaixadas.

Testados facing `0`, `PI/2`, `PI`, `-PI/2`, prone e enter/exit. A atualização ocorre antes dos raios do jogador, para usar o frame do próprio tick. Reversão parcial preserva olho/muzzle/hitboxes exatamente no instante da interrupção.

## MUZZLE — fórmula, socket, tolerância e resultados

Socket real: `[0,0.03,-0.769]` relativo ao osso `weapon`. Arma montada sob esse osso antes do mixer; root em `[actor.x,actor.y,actor.z]`, yaw `-facing-PI/2`. Para ponto local `[lx,ly,lz]`:

```
x = actor.x - sin(facing)*lx - cos(facing)*lz
y = actor.y + ly
z = actor.z + cos(facing)*lx - sin(facing)*lz
```

Em aim prone, socket medido aproximadamente `[0.09794104,0.36950890,-1.26889127]`; olho `[0.09794104,0.36347300,-0.27843653]`. Idle amostra seu frame zero, olho aproximadamente `[0.09634132,0.37025185,-0.26835467]`.

`m01-mg34-prone-geometry.json` contém pontos físicos derivados dos GLBs existentes, com hashes das fontes; não é um asset novo. Permite geometria síncrona sem Three/WebGL/downloads na simulação. O verificador reconstrói a hierarquia real no CPU, ignora só texturas e reproduz os dados exatamente.

- **Tolerância:** 0,002 m = 2 mm.
- **Prova:** 2.496 comparações contra soldier/weapon/clips reais, enter/idle/aim/fire_burst/exit, quatro facings e instantes entre keys.
- **Erro máximo:** 0,000038402 m = 0,038402 mm.
- Os sete records de tiro são comparados ao socket no instante individual `firedAt`. O muzzle corrente entre tiros também segue o recuo real.
- Teste adicional compara `M01Characters.muzzle()` real com a função espacial. Corrigiu o fallback anterior `[0,0.032,-0.765]`, cerca de 4,5 mm distante do socket do manifesto.

## SAVE/RESTORE e SAVE NO MEIO DA RAJADA

Snapshots/restores cobrem enter, idle, aim, fire_burst e exit. Validação rejeita atomicamente campos parciais, fases impossíveis, progress/duration/start incoerentes, counts/plan/IDs inválidos e rounds emitidos ainda em voo ausentes ou alterados. A rejeição não muda origem nem destino.

Legacy sem o campo retoma standing no próximo update, sem marcador artificial ou draw de RNG. Rounds antigos já em voo permanecem; rounds MG futuros pré-criados no formato antigo são cancelados para não disparar durante enter. IDs reservados/RNG permanecem. Saves 86/89 e migração CKM existentes continuam válidos.

Save obrigatório após **1, 4 e 6 tiros** de rajada de sete conserva frame, plano, IDs, contagem, shot, firedAt e RNG. Continuação idêntica sem round perdido/duplicado ou evento extra no restore. O renderer conserva a janela corrente sem repetir um evento. Browser verifica também saves alcançados pelo percurso real de controlos.

Prova sobre **M01View.updateFire real**, com batches Three: um clarão na janela real; zero no intervalo de 0,060–0,075 s; frame pausado/restaurado idêntico; zero após morte nas quatro fases. Não houve aumento de timeout.

## LOADER

- **Ator:** nenhum municiador real associado a estes MG34 na simulação atual.
- **Associação/persistência:** inexistentes; nenhum alemão arbitrário foi escolhido e nenhum ator foi criado.
- **Morte do gunner:** limpa postura/rajada; não deixa associação órfã.
- **Morte de outro ator:** não cria/transfere associação.
- **Movement/ADVANCE/RETREAT:** apenas o estado real do gunner decide exit/cancelamento.
- **Save/reload:** não há associação fictícia para restaurar.
- **Reload/feed:** `mg34_prone_reload`, `mg34_loader_prone_feed` e loader idle/leave continuam **pendentes**. Clips existentes preservados, sem ligação ao runtime.

## FALLBACK, PAUSA e MORTE/INTERRUPÇÃO

Sem o GLB prone ou com kit parcial, os batches procedurais existentes amostram a mesma postura física. Gameplay/tiros/hitboxes/saves/RNG iguais e nenhuma exceção; o fallback tem menos fidelidade que o rig real.

Pausa congela clock, phase, startedAt, progress, olho, hitboxes, muzzle, contagem e frame. A fixture browser liberta pointer lock nativo antes do primeiro tick para inspecionar o restore exato; depois retoma pelo botão real.

Morte testada durante enter, idle, no meio de fire_burst e exit, na simulação, no renderer e no método de efeitos real. Sem estado prone residual, arma visível ou clarão posterior; nenhuma associação de loader inventada. Tiros já em voo não são retirados indevidamente.

## TESTES FOCADOS, NPM TEST, BUILD e BROWSER

Checkout real, Node 24.19.0 / Three 0.186.1 / Vite 8.3.1 / Playwright 1.58.2. Browser original Chromium 153, software WebGL, 1280×720, 1 worker, 0 retries.

| Validação | Resultado |
| --- | --- |
| Três ficheiros focados novos | **46/46 PASS**, zero skips/failures |
| Focados + suporte antes da última prova FX | **46/46 PASS** |
| Verificador de geometria GLB | **PASS**, reprodução exata |
| `npm test` final | **224/224 PASS** |
| `npm run build` | **PASS**, aviso habitual de chunk >500 kB |
| Browser novos focados | **4/4 PASS**, saída reportou 1,2 min |
| `npm run test:browser` integral | **35/35 PASS**, saída reportou 12,3 min |
| `git diff --check` | **PASS** |

**Disponibilidade das evidências:** o workspace foi substituído depois das execuções verdes e antes da publicação da documentação. Código/checkpoints já estavam remotos e foram recuperados sem reimplementação. Os logs brutos/browser JSON/capturas dessa execução desapareceram. `browser-confirmed-summary.json` é um resumo identificado como reconstruído a partir da saída de ferramenta confirmada na conversa, não um log bruto nem uma nova execução. Node/focados/build foram repetidos no checkout remoto recuperado para anexar logs brutos reais nesta pasta; todos passaram. A suíte browser não foi repetida.

O browser validou `152df763`; o commit `8d55ae5` seguinte só acrescenta quatro testes Node de efeitos. Árvores idênticas nos dois commits:

- `src`: `0761b6675e9f71d1a2b5440907c571541068497b`.
- `tests/browser`: `51fe1a560f62e17c302988c816c2f8b4cec303eb`.

## REGRESSÕES e problemas corrigidos

Bugs reproduzidos: hitboxes um tick atrasadas antes do tiro do jogador; save aceitando record emitido em voo ausente/alterado; OUTRO suspendendo rajada com save inválido; target já alcançado reescrevendo SUPPRESS. Todos receberam correção e testes focados.

Três fixtures Node antigas precisaram reconciliação: stall forçado começa em zero; morte reconcilia postura antes do save; disparo MG passa por enter real. Asserções de 120 s, baixas, arma, pausa e corte permaneceram. Browser antigo espera o clip prone e a posição CKM já existente na base `[24.17,-3,43]`; nenhum runtime CKM alterado.

Duas fixtures browser novas inicialmente capturavam uma rajada posterior. Agora verificam count/clock exatos antes do primeiro tick, seguido de continuação real. Nenhum teste existente foi afrouxado, nenhum timeout aumentado.

## FICHEIROS ALTERADOS / DIFF

Produção:

- `src/game/m01-simulation.js`
- `src/world/spatial.js`
- `src/world/m01-mg34-prone-geometry.json`
- `src/render/m01-characters.js`
- `src/render/m01-actor-pose.js`
- `src/render/m01-view.js`

Testes/verificação:

- `tools/verification/m01-mg34-prone-geometry.mjs`
- `tests/m01-mg34-prone-runtime.test.js`
- `tests/m01-mg34-prone-spatial.test.js`
- `tests/m01-mg34-prone-presentation.test.js`
- `tests/m01-cover-threat.test.js`
- `tests/m01-runtime.test.js`
- `tests/m01-support-runtime.test.js`
- `tests/browser/m01-mg34-prone.spec.js`
- `tests/browser/m01.spec.js`

Documentação: `docs/NEXT_CHAT_CONTEXT.md` e os ficheiros desta pasta. Os extras de produção justificam geometria física síncrona, postura do fallback e corte de clarões pelo shot real. Nenhum sistema externo foi reimplementado.

## PRESERVADOS, LIMITAÇÕES, PENDÊNCIAS e RECOMENDAÇÃO PARA CAPITÃO

Preservados: schema 2, algoritmo/seed de RNG, determinismo de restore/continuação, IDs de baixas/rounds, CP-A..D, clocks/gates/timers/demolições, migração CKM e bancada francesa. `moveActor` e `evacuateStation` comparados byte a byte com a base. Renderer não escreve gameplay.

Assets, áudio, viewmodel, vagões, geometria CKM, CI/workflows, M02 e Graphify intactos. Sem workflow_dispatch, deploy, integração, main ou force-push. Refs protegidos confirmados intactos; ver `protected-refs.json`.

Limitações: idle/aim mantêm frame zero; fallback aproximado; loader/reload/feed ainda sem estado real; browser usa continuações de snapshots, não playthrough humano ininterrupto. Logs brutos browser não recuperáveis, com resultado confirmado disponível no resumo. Playtest humano e Chromebook continuam pendentes. Trabalhos de ponte/pátio/CKM de outras branches não integrados nesta base.

**Recomendação:** pronta para revisão e decisão de integração pelo capitão, com validação automática verde e a limitação documental explícita acima. Não integrar cegamente. Esta tarefa termina publicada/documentada; não inicia outra frente.
