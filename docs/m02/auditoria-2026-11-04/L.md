# Auditoria M02 — secção L (Direção audiovisual)

Fonte: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`, pp. 41–43 (L1–L5).
Comparado com: `origin/gemini/m02-01-quinta` (SHA 56e98cbf, `git fetch` em 2026-11-04). Repo não editado.
Legenda: OK = implementado e coberto por teste de estado; PARCIAL = dados ou flag existem, sem consumo ou cobertura completa; NÃO IMPLEMENTADO; NÃO VERIFICADO; N/A = autoria/assets fora do código.

## Fronteira simulação / renderer (verificação pedida)
- OK: `src/game/m02-audiovisual-director.js` importa só `world/spatial.js` e `world/m02-horizon-system.js`. Sem `three`, `window.`, `document.`, `Math.random()`, `Date.now()`, nem renderer ou áudio.
- OK: `src/game/m02-01-simulation.js` não importa renderer nem áudio; o diretor é instanciado e chamado pelo simulador.
- OK: o renderer não decide dano nem visibilidade. Só lê `hitTarget`/`hitsReceived` para cor e não tem reprodução de áudio (sem AudioContext).
- PARCIAL: nenhum consumidor fora do diretor lê `weaponKinematics`, `cameraShake`, `directionalIndicators`, `subtitlesEnabled`, `reducedViolence` ou `spatialAudioLog`. O estado é só dados, mas nada é apresentado.

## Teste executado
- `node --test tests/m02-06-audiovisual-accessibility-full-matrix.test.js` num `git archive` extraído para o scratchpad (Node v22.23.4): 7/7 pass, 0 fail.
- É teste de estado, não playtest.

## L1 Armas
- Fichas, museu, licença, escala e peças móveis: N/A (autoria; não há assets no branch).
- Arma baixa perto de parede, raio a partir do olho (0,78 m): PARCIAL. `evaluateWeaponClearance` existe e é testado (AV-01), mas não há consumo visual.
- Som de impacto metálico não toca em terra: OK (`MATERIAL_IMPACT_AUDIO_MAP`, teste AV-01).
- Recuo e dispersão calibrados por teste, com unidade e origem «design»: PARCIAL. Valores fixos no código (0,065 rad, 0,045 m, fator agachado 0,68) sem tabela de tuning com origem.
- Dispersão e cadência por variante (Browning, Kar98k, MG34, granadas): NÃO VERIFICADO no diretor (não há tabela por arma).

## L2 Animações e transições
- P0 locomoção, agachado, cápsula e pés: NÃO IMPLEMENTADO. Sem AnimationMixer nem AnimationClip no renderer.
- P0 apontar, disparar, recarregar («arma não dispara antes de estar pronta»): NÃO IMPLEMENTADO. O `READY` do diretor refere-se a folga, não a prontidão de disparo.
- P0 cobertura, espreitar, porta, mão em maçaneta: NÃO IMPLEMENTADO.
- P0 impacto e morte sem T-pose; modo reduzido conserva estado: PARCIAL. `reducedViolence` é guardado, mas não tem efeito.
- P1 tropeço e reação à explosão: PARCIAL. Só amplitude de câmara (cap 0,045 rad; 0,008 com `reducedCameraShake`), sem reação de personagem.
- P1 amparar, arrastar, maca: NÃO VERIFICADO. Maca existe na cena B12, sem lógica de contacto.
- P1 variação por intenção e fadiga; carroça, cavalo: NÃO IMPLEMENTADO.

## L3 Áudio espacial e identidade
- Três escalas (`close_mechanical`, `tactical_encounter`, `distant_operation`): OK. Limiares 12 m e 140 m não vêm do PDF.
- Atraso pelo som a 343 m/s a 20 °C: OK. `SOUND_SPEED_MPS = 343` e `delay = dist/343`. Simplificação não descrita no PDF: sem atraso abaixo de 15 m.
- Aviso crítico sem atraso: OK (`isCriticalWarning`, teste AV-01).
- Oclusão por parede e porta com filtragem e atenuação: OK nos dados (ganhos 0,28 e 0,52; low-pass 680 e 1400 Hz; teste AV-01).
- Portas abertas alteram a fuga do som: NÃO IMPLEMENTADO. Só existe o caso de porta fechada.
- Caudas distintas (casa, celeiro, espaço aberto): NÃO IMPLEMENTADO.
- Origem espacial de disparos inimigos: NÃO IMPLEMENTADO. O simulador só chama `onPlayerShotFired` e `onExplosionDetonated`. A categoria `enemy_fire` aparece apenas nos testes.
- Fontes finitas de batalha, sem loop de 30 s: NÃO IMPLEMENTADO.
- Limite de vozes concorrentes por relevância: NÃO IMPLEMENTADO. O cap de 160 registos é só log.
- Som de companhia remota segundo o estado HS: NÃO IMPLEMENTADO no diretor.
- Prioridade de mistura (avisos > arma > ameaças > companheiros): NÃO IMPLEMENTADO.
- Gama dinâmica reduzida: OK (`reducedDynamicRange` limita o ganho entre 0,38 e 0,75; teste AV-02).
- Intensidade de zumbido ajustável: OK nos dados (`tinnitusIntensity` 0 a 1; teste AV-02 com zero).
- Legendas PT sem depender de áudio: PARCIAL. Só existe a flag `subtitlesEnabled`, sem texto ou cue de legenda.
- Indicadores de direção: PARCIAL. Criados para `enemy_fire` e explosão, expiram em 2,2 s, sem HUD.
- VO polaco e alemão, revisão nativa, música original: N/A (autoria).

## L4 Explosões e efeitos
- Sequência aviso, abrigo, clarão, poeira, onda: NÃO IMPLEMENTADO. Só há um registo de áudio no detonar.
- Sem bola de fogo; escala visual igual ao raio de dano: NÃO VERIFICADO (renderer tem anel e núcleo para granada, sem verificação visual).
- Partículas reduzidas por qualidade; crateras e impactos essenciais preservados: PARCIAL. Perfis high, medium e low existem, sem regra de partículas comprovada.
- Decais e escombros estáveis por evento (crateras SP03): PARCIAL. Cratera SP03 é restaurada por checkpoint (teste HZ-03).
- Incêndio só com origem, material e estado definidos: NÃO VERIFICADO.

## L5 Iluminação e cinematografia
- Alinhamento com #58 e TIME-01 (azimutes e horas): PARCIAL. O renderer sincroniza o preset com `sim.horizon.lightingPreset` (T0..T3). Alinhamento com #58 não verificado.
- Bancada com luz de estudo neutra: OK (preset `neutral_review`, sem sincronização automática).
- Luz baixa e noite para testes de leitura: PARCIAL. Preset `night_1939_09_09` existe; visual não verificado.
- Rostos e inimigos legíveis sob a mesma condição: NÃO VERIFICADO.
- Tremor de câmara limitado e ajustável: PARCIAL (cap e flag `reducedCameraShake`, sem aplicação na câmara).
- Explosões não tomam a mira: OK por desenho (o diretor só escreve amplitude), sem consumidor.
- Assistência interrompível por perigo; corte para o epílogo após local seguro: NÃO VERIFICADO (teste cobre o fim da missão, não o momento do corte).
- Referências de qualidade sem cópia: N/A (processo).

## Incertezas
- Unidades: o diretor compara distâncias da simulação com 12 m, 15 m, 140 m e 0,78 m. O AGENTS indica coordenadas em unidades legadas (32 = 1 m). O teste assume metros (parede a x = -26). Confirmar no mundo M02 antes de tomar os atrasos como reais.

## Resumo
- Itens de L1 a L5: 41. OK: 9. PARCIAL: 11. NÃO IMPLEMENTADO: 12. NÃO VERIFICADO: 6. N/A: 3.
- Próxima ação sugerida (não executada): ligar consumidores (renderer e HUD) ao estado do diretor, emitir `enemy_fire`, e confirmar as unidades antes de calibrar.
