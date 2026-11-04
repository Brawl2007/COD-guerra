# Auditoria M02 — secção D (Gameplay e combate)

Fonte: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf` pp. 16–18. Código: `origin/gemini/m02-01-quinta` @ 56e98cbf (git show/grep; repo não editado).

## D1 Objetivos, vitória e consequências
- O01 Sair da vala e neutralizar posto — PARCIAL. Código: O00 «tomar o posto avançado na vala transversal (-18,-110)» (m02-01-simulation.js:426); O01 do código é «escolher eixo e fixar MG34» (l.1262). IDs não batem com o PDF.
- O02 Tomar acesso da quinta — PARCIAL. O02 existe (l.1254) com rotas A/B (Casa B01 / Estábulo B03), não o critério «MG inoperante + passagem sem fogo».
- O03 Consolidar e verificar saída — PARCIAL. Título «consolidar o pátio e neutralizar a guarnição» (l.1246); sem sobreviventes nem saída.
- O04 Corredor B, dois volumes — IMPLEMENTADO. Título e contagem 2/2 (acts-director.js:159, 281; supplies m02-01-simulation.js:182). Carroça imobilizada: PARCIAL (damageCartWheel l.485, sem teste).
- O05 Reorganizar só após estados — PARCIAL (C07 concluída, acts-director.js:397; condição de estados não verificada).
- O06 Portão/corredor C — PARCIAL (acts-director.js:483, tranca da portaria B11).
- O07 Conclusão por destino de cada homem — PARCIAL (acts-director.js:524; evacuatedCount/12 em l.725; sem destino individual).
- O08 Lis opcional, pode ficar missing — PARCIAL. lis_status='missing' existe (acts-director.js:650, 758; combat-ai.js:433) e há exportação para M03; efeito em M03 não verificado.
- O09 Romper contacto, sem «vitória da Batalha» — IMPLEMENTADO (acts-director.js:725, 779; estado completed, sem título de vitória).
- Falha dura: morte de Piotr — EM FALTA. piotr_sokol só recebe dano ×0,5 (m02-01-simulation.js:1038); grep de failed/defeat/gameover sem resultados.
- Falha dura: incapacidade definitiva de personagem exigida — EM FALTA (sem evidência).

## D2 Roster finito e posições
- Total de 46 IDs: IMPLEMENTADO. DE-A01..14 (14), DE-B01..12 (12), DE-C01..20 (20).
- EA0 (4, DE-A01..04): IMPLEMENTADO (missions/m02-bzura/m02-01-quinta-layout.json: 4 com encounterId EA0; m02-01-simulation.js:387).
- EA1 (10, DE-A05..14): PARCIAL. Existe enemyRosterEA1 (quinta-layout.json:445), mas os objetos não têm encounterId; contagem não confirmada.
- EB1 (12), EC1 (8), EC2 (12): IMPLEMENTADO (cells-bc-layout.json, contagem por encounterId).
- Secção próxima (Gruca, Lis, Wierzba, Małek, Szymczak, PL-AUX-01/02, Piotr, LG01–LG12): IMPLEMENTADO em IDs (pl_*, piotr_sokol, LG01–LG12 em cells-bc-layout.json:334–345).
- Ausência temporária de Lis sem duplicar elenco: PARCIAL.

## D3 Ciclo da IA inimiga
- Perceber → avaliar → cobrir → disparar/suprimir → mudar/retirar: PARCIAL. Estados tacticalState (HoldCover, SHIFT_COVER, FALLBACK_COVER; combat-ai.js:698–959). Retirada só com vida <55 e supressão >0,65 (l.956).
- Visão por campo/exposição/raio: PARCIAL (evaluateMgLineOfFire l.667; alertEnemiesBySound l.730, 85 m).
- Memória da última posição, expiração, tiro a posição suspeita: PARCIAL (lastKnownPosition, combat-ai.js:1021; expiração não verificada).
- Cobertura (reserva com tempo, porta 1,0–1,2 m, fila, célula de navegação): PARCIAL. Navegação herdada de M01Navigator (l.11); regra de porta não encontrada; 10 ocorrências de termos de reserva/fila em combat-ai.js não lidas.
- Supressão dura segundos e recupera gradualmente: IMPLEMENTADO (acréscimos l.785/872; decaimento 0,25/s l.901 e 0,28/s l.682; dispersão ×1,55 com supressão >0,4, l.854).
- MG alterna rajadas e observação, com recarga e calor: PARCIAL (MG34: burstCount 5, reloadSec 4,0 em WEAPON_PROFILES). Sem modelo de calor.
- Recuo ou rendição por baixas: PARCIAL (FALLBACK_COVER). Rendição: EM FALTA.

## D4 Aliados com efeito real
- Papéis (Gruca, Lis, Wierzba, Małek, Szymczak, auxiliares rkm): PARCIAL (tacticalState por aliado, combat-ai.js:693–800; triagem de feridos não verificada).
- Ordens do jogador só «cobrir aqui» e «avançar para ali»: CONTRADIZ. Código tem suppress, advance e flank_east, mais auto (m02-01-simulation.js:554–570; teclas Z/B e botões). flank_east não consta no PDF.
- Aliados consomem munição, disparam e causam dano: IMPLEMENTADO (fireActorBurst, m02-01-simulation.js:832).
- Rota bloqueada leva a alternativa; sem ficar parado até Piotr tocar marcador: EM FALTA (sem evidência).
- Prova de 60 s com Piotr abrigado: EM FALTA (nenhum teste de 60 s em tests/m02-*).

## D5 Dano, explosões e destruição
- Política de materiais (vidro, madeira fina/espessa, alvenaria/terra): IMPLEMENTADO (BALLISTIC_MATERIAL_POLICY, src/world/m02-quinta-world.js:41–50; valores de design, não validados).
- Explosões com distância, oclusão e fragmentos: PARCIAL (detonateGrenadeAt l.1008–1010, raio 6,5, dano ao mundo min(raio;5,5); sem oclusão nem fragmentos).
- Aviso legível de 5–8 s antes de explosão perigosa: EM FALTA (só artilleryWarningAt, acts-director.js:47, 520; sem janela de 5–8 s).
- Estados mínimos (vidro, porta, cerca, carroça, cratera): PARCIAL (vidro quebrável na política; damageCartWheel; cratera SP03, acts-director.js:534–554).

## D6 Ritmo, recursos e dificuldade
- Metas de 60 s até contacto e 45 s de percurso: EM FALTA (sem métrica nem teste).
- Bancada 5 cartuchos + 45 de reserva + 2 granadas: IMPLEMENTADO (magSize 5 em WEAPON_PROFILES.wz29; weapon.reserve=45, l.241; grenadeAmmo=2, l.175).
- Caixa de munições por calibre e tipo: PARCIAL (acts-director.js:369 soma +15 à reserva, teto 60, sem distinção).
- Água e material sanitário sem regeneração instantânea: PARCIAL (supplies, l.182; efeito na saúde não verificado).
- Perfis Acessível / Padrão / Exigente: EM FALTA. Zero ocorrências de termos de dificuldade em src/game/m02-*, src/m02, src/world/m02-*, src/render/m02-* e tests/m02-*.

## Dificuldade e reutilização M01 vs M02
- M01 usa recruta/soldado/veterano (m01-difficulty.js:14, D35/H9), com nomes e valores diferentes do PDF.
- M02 não importa m01-difficulty.js, m01-fire.js, m01-blast.js nem m01-display-fire.js. Reutiliza m01-player-physics.js, m01-navigation.js, wz29.js e traceShot de spatial.js.
- Fogo: M02 tem modelo próprio (fireDirectRay l.749, fireActorBurst l.832, WEAPON_PROFILES em combat-ai.js). M01 usa projéteis (makeRound/traceRound, ARC_K em m01-fire.js). Valores não comparados.
- Conclusão: tabela D35 e modelo de fogo M01 não são reutilizados; a dificuldade de M02 está ausente, não duplicada.
- Divergência de dotação: M01 LOADOUT reserve 40 (m01-difficulty.js:18); PDF e M02 usam 45.
