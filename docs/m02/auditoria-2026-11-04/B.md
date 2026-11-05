# Auditoria M02 — secção B «Investigação histórica» (PDF pp. 8–11)

Fonte: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`, pp. 8–11.
Implementação: branch `origin/gemini/m02-01-quinta` (lida via `git show` / `git grep`; repo não editado).
Caminhos abaixo relativos a `src/` salvo indicação; «html» = `m02-01.html`; «handoff» = `docs/m02/M02_HANDOFF.md`.

| # | Requisito / afirmação de B | Estado | Evidência (ficheiro:linha / pesquisa) |
|---|---|---|---|
| 1 | B1: marcas DOCUMENTADO / RECONSTRUÍDO / DRAMATIZAÇÃO / NÃO CONFIRMADO | PARCIAL | html:244 só tem «RECONSTRUÍDO» no subtítulo; grep `DRAMAT|NÃO CONFIRM` = 0 hits |
| 2 | B1/B5: localização das quintas e companhia não resolvidas; Kwiatkówek só referência tipológica | CONTRADIZ | html:244 «Kwiatkówek–Tum · Acessos de Łęczyca…» apresenta o nome como local da ação |
| 3 | EV01: 9/9 ofensiva polaca, não espera defensiva | IMPLEMENTADO | `temporalState T0` label «9 Set 1939 — Fim da tarde (Preparação e Assalto à Quinta)» (world/m02-horizon-system.js:5–8); sim:426 «Avançar» |
| 4 | EV02: ataque vespertino Łęczyca ~17:30, não confundir com reconhecimento das 10h | IMPLEMENTADO | T0 «fim da tarde» 9/9; nenhuma hora exata no ecrã |
| 5 | EV03: combate noturno 9→10/9; Łęczyca livre ao amanhecer; sem «colapso geral» na manhã | IMPLEMENTADO | `M02_TR_CARTELAS.TR01` (game/m02-acts-director.js:8); grep `colapso|retirada geral` no ecrã = 0 |
| 6 | EV04 / HIST-02: 10/9 avanço no eixo de Leśmierz; microcronologia por fonte | PARCIAL | TR03 «Acessos de Leśmierz — 10 de setembro — tarde» (acts-director.js:10; horizon-system.js:26): data sustentada por B, «tarde» não tem fonte |
| 7 | EV05: 11–12/9 arredores de Ozorków sem tomada da cidade; não anunciar vitória | IMPLEMENTADO | grep `Ozork|vitória|victory` = 0 em M02 |
| 8 | EV06: 12–13/9 mudança operacional; alemães reentram em Łęczyca em 13/9 | IMPLEMENTADO | TR04 (acts-director.js:11) «12–13 de setembro… Em 13 de setembro, Łęczyca volta a ser ocupada» |
| 9 | EV07: percurso individual de Piotr/Lis é DRAMATIZAÇÃO; alguns chegam a Varsóvia (sem data) | PARCIAL | TR05 genérico OK (acts-director.js:12); estados `lis_status` e `m03ImportState` (acts-director.js:~815–830) sem marca de dramatização |
| 10 | EV08: encerramento geral 22/9; evitar data única de fim da atividade de cada unidade | CONTRADIZ | acts-director.js:779 «M02 Concluída (C12 Epílogo · Varsóvia 25 Set 1939)»; 22/9 ausente |
| 11 | B3 decisão: não usar uma só fonte causal como voz omnisciente; epílogo sem culpar comandante | PARCIAL | Sem narrador omnisciente; mas dlg bz39_c07_01 «As ordens continuam para sul» (combat-ai.js:249) e dlg_m02_002 «O grupo da direita recuou. Nossa ordem mudou.» (combat-ai.js:299) fixam uma explicação causal de um só lado |
| 12 | HIST-TEST-01: manhã de 10/9 não é retirada geral do Exército | IMPLEMENTADO | acts-director.js:808 `generalRetreatOnMorningSept10: false`; sem texto de retirada geral no ecrã |
| 13 | B4: cadeia Poznań → Knoll-Kownacki → 25.ª DI → 56.º Rgt é «enquadramento recomendado» | CONTRADIZ | html:244 «56.º Regimento / 25.ª DI» como facto (sem «recomendado»); combat-ai.js:206 speaker «Mensageiro 56 pp» |
| 14 | B4: 69 pp pertence à 17.ª DI, não se transforma em regimento 25.ª | IMPLEMENTADO | grep `69|17\.ª|Knoll|Poznań` nas fontes M02 = 0 hits |
| 15 | B4: Piotr e a sua secção são inventados | PARCIAL | Nomes fictícios (combat-ai.js; sim:218 «strz. Piotr Sokół») sem rótulo de ficção no ecrã |
| 16 | B4: não fechar «4.ª companhia / II batalhão» como facto | IMPLEMENTADO | grep `4\.ª|II batalh` = 0 hits; só «companhia» genérico (combat-ai.js:241) |
| 17 | B4: 30.ª DI como enquadramento; guarnição de cada edifício = DRAMATIZAÇÃO; sem 46.º Rgt nos encontros | PARCIAL | Nenhum nome de unidade alemã no código/ecrã (IMPLEMENTADO nesse ponto), mas «Guarnição EA1» (main.js:218–222) e IDs `DE-*` sem rótulo de DRAMATIZAÇÃO |
| 18 | B4: sem Tiger, Panther, MG42 nem insígnias de efeito visual | IMPLEMENTADO | grep `Tiger|Panther|MG42|Panzer|insígn` = 0 hits |
| 19 | Contagem de hostis (B não tem contagem; garrisons = DRAMATIZAÇÃO) | CONTRADIZ | handoff §2.5 «exatamente 46 hostis identificados na missão inteira»; acts-director.js:813 `totalHostilesPlanned: 46`. Não aparece no ecrã (HUD mostra só `sim.enemies` ativos, main.js:218–219) |
| 20 | B5: acesso com terreno húmido e canais; «plana» não significa sem valas | IMPLEMENTADO | Vala húmida Y=-1.10 m (handoff §2.1); talude leste (world/m02-quinta-world.js:537, 543) |
| 21 | B5: Tum como silhueta provisória, sem retroprojeção; estados dano/reconstrução separados | PARCIAL | world/m02-horizon-system.js:36 «Volume de estudo provisório (Tum / Colegiada)»; render/m02-01-renderer.js:742 «provisional»; sem separação pré-guerra/pós-guerra; visibilidade do rótulo no ecrã não verificada |
| 22 | B6: wz.29 com dotação, rkm wz.28, granadas wz.33; ckm wz.30 só com apoio justificado | IMPLEMENTADO | combat-ai.js: labels «kb wz. 29», «rkm wz. 28»; `ckm`/`wz. 30` = 0 hits |
| 23 | B6: MG34 e Kar98k são «referências alemãs propostas» que exigem validação | CONTRADIZ | sim:350 e html:247 objetivo «fixar a MG34 em B02»; main.js:203 «EXPOSTO AO FOGO DA MG34 (B02)»; combat-ai.js:33 label «Kar98k» |
| 24 | B6: MP 38 não consta da lista de B | EM FALTA | combat-ai.js:46 label «MP 38», magSize 32 / reserve 96 (acts-director.js:99–100); sem fonte em B |
| 25 | B6: artilharia precisa de posição, calibre e trajetória com fonte/alcance plausível | EM FALTA | Impacto fixo (4,0,18) com aviso de 6.0 s (acts-director.js:519–521; 547); sem calibre, fonte nem marca de dramatização |
| 26 | B6: aviação das 06:10 e 07:50 de 10/9 removida do plano base | IMPLEMENTADO | grep `06:10|07:50|Stuka|avia|Luftw` = 0 hits |
| 27 | B6: blindados fora do escopo inicial | IMPLEMENTADO | grep `tank|blind|Panzer|tanque` = 0 hits |
| 28 | B6: valores de D são parâmetros de teste; cadência cíclica ≠ prática | IMPLEMENTADO | Valores só no código (combat-ai.js:28–45, `damage`, `cycleSec`); nenhum rótulo histórico no ecrã |
| 29 | B7 TIME-01: cartelas «fim da tarde/noite» sem meteorologia reconstruída | IMPLEMENTADO | Cartelas T0–T3 (horizon-system.js:3–28); sem texto meteorológico |
| 30 | B7 CONT-01 / ART-01 / EQP-01: sem data diária falsa; volume provisório; sem insígnia inventada | PARCIAL | CONT-01 → ver linha 10; EQP-01 «Mensageiro 56 pp» (combat-ai.js:206) atribui subunidade; ART-01 ver linha 21 |

## Contagem

- IMPLEMENTADO: 15 (linhas 3, 4, 5, 7, 8, 12, 14, 16, 18, 20, 22, 26, 27, 28, 29)
- PARCIAL: 8 (linhas 1, 6, 9, 11, 15, 17, 21, 30)
- EM FALTA: 2 (linhas 24, 25)
- CONTRADIZ: 5 (linhas 2, 10, 13, 19, 23)
- Total: 30 linhas.

## Top 3 problemas

1. html:244 apresenta «Kwiatkówek–Tum» como local e «56.º Regimento / 25.ª DI» como facto; B4 diz que é apenas recomendado e que a localização das quintas não está resolvida. Também combat-ai.js:206 «Mensageiro 56 pp».
2. «Varsóvia 25 Set 1939» (acts-director.js:12, 779) e fim de M02 datado: B não sustenta a data e EV08/CONT-01 pedem evitar data única de fim de unidade e data diária falsa.
3. MG34 e Kar98k apresentadas como facto no objetivo e no HUD (sim:350, html:247, main.js:203), apesar de B6 as marcar como propostas; a contagem «46 hostis» (handoff §2.5, acts-director.js:813) é exata sem fonte e as guarnições são DRAMATIZAÇÃO segundo B4.
