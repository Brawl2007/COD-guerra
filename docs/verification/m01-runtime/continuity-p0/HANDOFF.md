# Continuação M01 — entrega P0/P1 e D5

## Identificação e integração

- TASK_ID: `M01-CONTINUITY-GUIDANCE-P0-V1` (extensão de T02/T04/T40 existentes); D5 é a interface para a D2 já integrada.
- Base: PR #91, `afaded912c5c3a7f8a4e6e567be9a98cd35ac24f`. Inclui D2 `048aedc`; não foi recriada.
- Código: `codex/m01-continuity-p0`, commits `0261829` (paciente/arma), `b197f03` (interações, cobertura, caixa, mensagens, fatia D5 e HUD responsivo), `ce70422` (fixtures/piloto) e `35f3215` (asserção de entrega/marcador).
- PR empilhada: [#92](https://github.com/Brawl2007/COD-guerra/pull/92), base `claude/busy-ritchie-3fkvk2`. Draft, sem merge na candidata #80, na main ou deploy.
- Versão: npm `0.2.0`, missão M01 Tczew. A auditoria histórica `8d420eb` avaliou `68301b7`; não foi reescrita e a nota antiga não é transferida para esta entrega.
- #84 continua PAUSED, sem owner/token; não foi acionada. T02/T04/T40 consultadas live antes da implementação: reutilizar/rever, sem nova claim.

## Referências COD e honestidade da comparação

O objetivo de direção é comunicar ação, destino e confirmação sem sobrepor mais um HUD. O acesso ao manual Steam de World at War e às pesquisas de campanha WWII/COD 1 recebeu CONNECT 403 ([log](reference-access.json)). Não se observou gameplay externo neste ambiente: sem timestamps ou funcionalidades atribuídas aos jogos por suposição. As decisões abaixo respondem aos defeitos reproduzidos no COD-guerra e aos contratos atuais. A comparação externa verificada continua pendente; Fable #56 e o benchmark do Capitão são propostas, não substitutos dessa prova. Nenhum asset ou código proprietário foi copiado.

## Entregas: problema, alteração e resultado

| TASK / problema | Antes | Alteração real / depois | Prova | Resultado / próxima ação |
|---|---|---|---|---|
| P0-A / QI08 | Após entregar Bąk, arma deslocada e braço flutuante: procura de ossos encontra o paciente aninhado | Raiz do paciente separada na mesma cena FP; ocultação, orçamento e dispose incluem ambas | [High antes](bak-before.png), [depois](bak-after.png), [reload](bak-after-restored.png), [métricas](bak-proof.json); 34 Node + 2 browser focados iniciais | Corrigido tecnicamente; rever transições em cadência normal com pessoa |
| P0-B / QI18 | Direção interna `beat.action` aparecia como texto | Token histórico continua consumido, sem apresentar rubrica como ordem nem alegar gesto inexistente | Node de pré-roll e [browser High](west-preroll-high.png) | Corrigido; atuação física continua recorte futuro |
| P0-C / QI03 | Prompt e E tinham condições/alcances diferentes | Oferta única `interactionAction()` para ambos; bloqueia estados inválidos e transições do transporte | Fronteiras 3/4/5/6 m, morte/cenas/carga/atores, save e E/tap reais | Corrigido; alcance horizontal legado preservado, sem novo teste de visão/altura |
| P0-D / QI01–02 | Rotação podia recomendar a mesma cobertura ou centro sólido | Nó diferente, ativo e ponto ocupável pela cápsula; ordem só com salva real; chegada reduz marcador | [Ordem](cover-order-high.png), [chegada](cover-arrival-high.png), [snapshot independente](arrival-check.json), 24 invariantes e golden 13 | Corrigido tecnicamente; treliças explicitamente parciais, sem garantia balística; compreensão depende de playtest |
| P1-E / QI04,09,19,20 | Guia terminava a 10 m para entrega a 4 m; pistas podiam competir ou persistir | Guia até alcance real, MG só com reparo imobilizado, prioridade/scope na mesma linha; aviso E substitui marcador, disposição curta evita sobreposição | Node de estado/prioridade/distância; browser de resgate e responsividade | Implementado; confirmar resultado final dos browsers abaixo; navegação humana sem coordenadas pendente |
| P1-F / QI13 | Caixa com mãos esféricas mesmo com rig disponível | Reutiliza braços/clips e contacto articulado, caixa enquadrada entre mãos; fallback preservado | [High](crate-high.png), geometria/near-plane/movimento e E nativo | Corrigido tecnicamente; geometria provisória e revisão artística continuam |
| H9 D5 / dificuldade | D2 existia na simulação mas sem escolha de nível no menu | Recruta/Soldado/Veterano para nova missão; preferência local; pause, checkpoint e retoma identificam nível efetivo | 18 Node focados; browser final registado abaixo | Implementado; novo padrão Soldado, saves antigos Recruta e Continue respeita save; morte/D3 e aviso de baixar nível ficam fora deste recorte |

Para os restantes achados, consultar a [matriz global dos 20 problemas](MATRIZ.md). Nenhum teste automático demonstra compreensão, diversão ou uma nota superior a 4/10.

## D5 (fatia de nível) e guia em ecrã curto

Os três casos de D5 passaram no navegador: cada escolha chega à simulação real; Continue de um checkpoint legado vence uma preferência Veterano e mostra Recruta; seletor e pausa são alcançáveis a 896×414 e o CP-A real mostra Soldado. O cenário de resgate 640×360 também passou: indicador fica abaixo do painel, reduz a etiqueta repetida e mantém distância/direção até E estar disponível. A caixa, cobertura, pré-roll e entrega tátil passaram no mesmo grupo em curso; o grupo terminou 14/15 e o caso corrigido passou 1/1 separadamente, conforme os logs acima.

## Sistemas preservados

Física/gravidade/colisores, navegação/IA, regras de dano/cadência/RNG, tabela D35 e calibração D2, horários e relógio, checkpoints/save schema e bancada francesa. A nova missão da UI escolhe Soldado por padrão e aplica as regras D2 desse nível: a igualdade por tick é relativa a Recruta com Recruta, não entre dificuldades diferentes. As únicas alterações de simulação são oferta de interação, seleção de destino de cobertura, guarda do silêncio real já existente e mensagens/guia. A guarda impede uma reserva/ordem vazia às 06:10, sem criar ameaça nem disparo. B4 e o ferido continuam protegidos; 114/115 não são disparadas sem uma mecânica de encravamento.

## Testes, versões e limites

- `0261829`: 34/34 Node focados, build e 2/2 browser (fases de carry + regresso à arma/restore).
- `b197f03`: primeira suite completa 1479/1482, três fixtures que depositavam durante pickup. `ce70422` faz essas fixtures aguardar os 1,6 s existentes (1,65 s de ticks) e verifica que E fica indisponível antes disso; focados 31/31 PASS. Suite completa de `ce70422`: **1482/1482 PASS**, sem falhas/skips; [log](final-node-ce70422.log). Grupo final: **14/15**; o caso que lia a etiqueta de um marcador oculto foi corrigido em `35f3215` e passou **1/1** separadamente, incluindo E e quatro objetivos seguintes. Produção idêntica; sem apresentar estes runs como um conjunto 15/15. [FAIL inicial](b197f03-full-node-failed.log), [focados corrigidos](pickup-fixtures-node.log).
- [Golden 13](GOLDEN_AMENDMENT_13.json): antecessor exato `afaded9`; duas rotas causais em Recruta (o padrão legado da simulação), primeira diferença no tick 82 em prioridade de mensagem. Com apenas os campos de apresentação declarados removidos, nenhuma diferença de comportamento em 23 746 + 21 660 ticks. Atores, RNG, física, relógio, `mission.text`, disparos e restantes eventos permanecem na comparação. Goldens 1–12 preservados, 12 fixada como história da D2.
- [24 invariantes](INVARIANTS_24_ROUTES.json): 24 percursos, zero rotas com violações. Referência histórica desta ferramenta é `5a169ba`; igualdade de combate com #91 é demonstrada pelo golden 13, não por essa referência antiga.
- [Build padrão](continuity-final-standard-build.log) e [bundle](continuity-final-bundle.log) PASS; entrada de 13 635 bytes. [Manifesto do build final](FINAL_BUILD_MANIFEST.json).
- [Grupo de browser final](browser-final/group-14-of-15.log): 14 PASS, 1 FAIL; [caso corrigido](browser-final/marker-rerun.log): 1 PASS em `35f3215` (sem alteração de produção). Inclui andar/olhar/disparar/recarregar/pausar/retomar no tátil. [Manifesto das capturas](browser-final/manifest.json). Não houve retries ou skips.
- Browser do lote inicial: uma execução conjunta 4/5, seguida do caso de cobertura 1/1 após congelar a captura por pausa e verificar independentemente o snapshot. Não é anunciado como uma execução conjunta 5/5. Falhas e logs ficam preservados.
- Primeiro percurso contínuo: **incompleto, 11/12 objetivos, HP 76, quatro checkpoints, zero erros/requisições falhadas**. Piloto bloqueado no lado fechado do abrigo, não na passagem válida. [Report](continuous-first/report.json) e [captura da falha](continuous-first/85-failure.png). `ce70422` corrige só a rota do piloto para a passagem já usada em `tests/helpers/m01-route.js`. Build congelado anterior à guarda de silêncio, D5 e refinamento responsivo. [Manifesto dos bundles](CONTINUOUS_BUILD_MANIFEST.json). Piloto automático com teclado/rato numa sessão, Low 640×360, Recruta, sem saltar cenas. Não é playtest humano nem prova do HEAD final ou de navegação natural. O controlador recebeu dois ajustes de waypoints para contornar sólidos novos da #91; só listas do piloto Node foram alteradas, nunca jogo/relógio/flags/save/atores.
- O preview em pasta alternativa foi interrompido por recursos/scripts 404; voltou-se ao build e servidor padrão antes dos resultados atuais. Essas interrupções não são aprovações nem falhas de asserções do jogo.
- Capturas focadas High são autênticas do renderer; fixtures de simulação identificadas nos specs. Fotos tiradas em pausa podem ocultar só overlays explicitamente indicados. Não há vídeo grande, escuta humana ou benchmark de FPS do PC alvo.

## Novo percurso contínuo e reprodução

A primeira partida do build final em Soldado entregou Bąk às 06:08:09 e depois sofreu um restauro automático do CP-C durante o assalto. O piloto não repetia os objetivos; uma tentativa de replay no controlador Node falhou com `path is not defined` antes de mover o jogador. Essa execução é **incompleta**, com [report e histórico preservados](continuous-soldado-first/report.json), não uma aprovação. A causa específica do restauro não é publicada pela simulação atual; D3 continua necessária.

O commit de **harness** `245fafa` faz o piloto falhar claramente num restauro inesperado, regista saúde e permite escolher o nível pela UI. Na nova partida Soldado em curso, usa cobertura física existente e agacha-se durante o assalto; não altera dano/IA/HP/relógio. [Script do piloto](../../../../../tools/m01-browser-playthrough.mjs). Sem replay em runtime nesta nova execução, sem saltar cenas ou injetar estado. Resultado só quando terminar. Servidor padrão de produção reiniciado após o build para servir o conjunto correto de bundles. Não se recompila nem altera o jogo durante a execução.

Reproduzir num checkout limpo: `npm ci`, `npm test`, `npm run build`, `npm run verify:bundle`. Browser: `CHROME_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/m01-continuity-p0.spec.js tests/browser/m01-difficulty-ui.spec.js tests/browser/m01-pacing-hud.spec.js tests/browser/touch.spec.js --workers=1 --retries=0`. O servidor da porta 4173 deve estar livre; a configuração arranca o preview. Percurso: iniciar `npm run preview` e executar `CHROME_EXECUTABLE=/usr/bin/chromium node tools/m01-browser-playthrough.mjs --viewport 640x360 --out /tmp/m01-continuous`. Goldens/invariantes têm os comandos nos JSONs gerados; a emenda 13 foi gerada com a comparação causal real, não editada à mão.

## Regressões e pendências

As falhas anteriores do harness (prontidão, pointer lock e leitura de chegada em instantes diferentes) ficam nos logs, juntamente com o defeito inicial da arma. Não se removeram asserções, aumentaram timeouts para esconder falhas ou alteraram posições no browser para alegar um percurso.

Próximas frentes: D3 (`player-down` causal, orientação justa e CP-B2), D4 (telegráficos de ameaça verificados), SP-08 (participação na escolta/corredor mantendo B4 e horas), abertura/chamada, arte High e T45/VO com direitos/escuta. 114/115 continuam sem encravamento real, e a licença do fp-arms-v2 permanece pendência anterior. Playtest humano de compreensão, diversão e hardware alvo é obrigatório antes de declarar campanha pronta.

ZIP original preservado: SHA-256 `5cee677efdcd85f5d2bd95f39414036a6d3ec65dc2b05aa7399c9b804a04d2aa`; não se adicionam vídeos grandes.

Nas linhas `waited` dos logs, `real` e `game` representam a duração dessa espera, não timestamps absolutos; `battleFrom`/`battleTo` e a timeline do report mantêm a referência da missão.
