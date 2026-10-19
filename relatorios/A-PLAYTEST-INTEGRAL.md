# A — Execução integral e limites do playtest

**Estado da tentativa adaptada: debrief.** HEAD fixo: `68301b779b856af46ed35a10fde42df9559d9ed4`, PR #80. Esta é uma execução automática com teclado, rato e leitura do HUD/diagnóstico, não um playtest humano. Nenhuma conclusão de qualidade é inferida do debrief ou dos testes verdes.

## Modalidade 1: percurso técnico

A ferramenta original foi executada sem edição em 1280×720/Low. A introdução e CP-A foram alcançados; houve bloqueio no primeiro trajeto. A tentativa foi interrompida pelo auditor para adaptar o controlo à renderização lenta; não foi aprovada nem classificada como falha comprovada de colisão. O registo foi preservado em [original-attempt.json](evidence/original-attempt.json) e [log](evidence/original-attempt.log).

A segunda tentativa usa uma cópia do mesmo piloto, em 640×360/Low, com espera pela aplicação do input e uma amostra zero após pointer lock. Percurso, objetivos, relógios e condições não foram atribuídos pela ferramenta. O [diff exato](evidence/pilot-adapter.diff) documenta as alterações de auditoria; a produção não foi editada. CDP foi aberto apenas para observação local. Um observador passivo recolheu diagnósticos periódicos e fotos, sem controlar a partida. O [catálogo](CAPTURAS.md) distingue captura, inclusão no pacote e inspeção individual. Séries repetidas permanecem na saída bruta local; o pacote retém transições, provas citadas e amostras.

Duração real registada: 4520.6 s. Tiros do piloto: 28. Bloqueios registados: 0; mortes/restauros: 0; pausas de controlo: 0. Estes valores não medem FPS nem diversão no PC-alvo.

**Resultado: 12/12 objetivos concluídos, incluindo o resgate opcional.** Tempo de simulação: 19.34 min; tempo real desta tentativa: 75.34 min. 0 erros de página e 0 respostas HTTP >=400 registadas. Saúde final: 76; pelotão leste: 12 sobreviventes. Não foi usada a opção de saltar cutscenes.

Falha declarada pela ferramenta: `nenhuma`. Relógio final: 1160.4 s / batalha 07:05:00; complete=True; saúde=76. Checkpoints: ['cp_m01_a_orientacao', 'cp_m01_b_reorganizacao', 'cp_m01_c_engenheiros', 'cp_m01_d_retirada']. Bąk: rescued_by_player; Dudek: unhurt. Estados completos em [report.json](evidence/route/report.json).

| Objetivo canónico | Estado final observado |
| --- | --- |
| obj_m01_deliver_message | done |
| obj_m01_take_cover | done |
| obj_m01_follow_sergeant | done |
| obj_m01_find_sappers | done |
| obj_m01_fetch_material | done |
| obj_m01_cover_repair | done |
| obj_m01_hold_access | done |
| obj_m01_cover_withdrawal | done |
| obj_m01_rescue_bak | done |
| obj_m01_leave_bridge | done |
| obj_m01_hold_corridor | done |
| obj_m01_reach_shelter | done |

## Linha de objetivos e acontecimentos

| Real desde o início (s) | Simulação (s) | Batalha | HUD / objetivo |
| ---: | ---: | --- | --- |
| 10.4 | 0.3 | 04:30:00 | 04:30 · Tczew, Polónia |
| 113.2 | 44 | 04:30:44 | Leve a mensagem e o café ao posto da ponte |
| 161.8 | 65.1 | 04:33:11 | Mantenha contacto com a secção |
| 415.7 | 114.7 | 04:34:02 | Abrigue-se! |
| 424.3 | 116.7 | 04:34:09 | Siga a voz do sargento |
| 544 | 148.9 | 04:36:02 | Encontre os sapadores no aterro |
| 590 | 168.4 | 04:37:10 | Traga o material dos sapadores do barracão ferroviário |
| 874.1 | 268.2 | 04:42:59 | Proteja o reparo da linha |
| 1787.1 | 503.1 | 05:15:06 | Mantenha contacto com a secção |
| 1956.8 | 536.4 | 05:30:01 | Mantenha a cabeça de ponte — mude de cobertura quando mandarem |
| 2902.1 | 761.5 | 06:00:02 | Cubra a retirada do pelotão leste |
| 3060.7 | 792.1 | 06:04:06 | Cubra a retirada do pelotão leste · (Opcional) Leve Bąk até o socorrista |
| 3178.2 | 823 | 06:08:14 | Cubra a retirada do pelotão leste |
| 3232.2 | 837.5 | 06:10:01 | Saia da ponte! Para o posto de disparo |
| 3401.7 | 889.2 | 06:17:20 | Mantenha o corredor — conte os que passam |
| 4392.5 | 1084.6 | 06:45:00 | Vá para o abrigo |
| 4444.1 | 1100.6 | 07:05:00 | 07:05 · Chamada no abrigo |
| 4519.7 | 1160.4 | 07:05:00 | Mantenha contacto com a secção |

Os 12 objetivos são avaliados individualmente em [OBJETIVOS.md](OBJETIVOS.md). A linha temporal pode conter mais transições do que objetivos: há texto de ligação e objetivo opcional combinado com o obrigatório. A conclusão válida deve ser conferida no mapa final de estados, não pela contagem de banners.

## Esperas medidas

| Segmento do piloto | Tempo de simulação (s) | Tempo real desta máquina (s) | Hora de batalha |
| --- | ---: | ---: | --- |
| reparo e ordem de demolição | 248.8 | 1047.1 | 04:44:07 → 05:30:01 |
| demolição oeste | 192.5 | 987.6 | 06:17:46 → 06:45:00 |
| retirada do pelotão leste | 181.1 | 765 | 05:35:53 → 06:00:02 |
| bombardeamento e abrigo | 51.6 | 266.5 | 04:33:11 → 04:34:09 |
| outro até ao debrief | 48.8 | 60.7 | 07:05:00 → 07:05:00 |
| intro | 42.7 | 103 | 04:30:01 → 04:30:44 |
| Bąk ferido | 27.8 | 143 | 06:00:18 → 06:04:00 |
| demolição leste | 12 | 55.1 | 06:08:34 → 06:10:01 |
| chamada | 0 | 0.3 | 07:05:00 → 07:05:00 |

## Maiores janelas amostradas de posição estável sem novos tiros

Não são automaticamente períodos vazios: o reparo pode avançar, haver falas, movimentos ou fogo de outros. A amostragem não mede atenção humana.

| Objetivo | Intervalo de simulação | Duração (s) | Reparo inicial → final | Novos eventos de missão amostrados |
| --- | --- | ---: | --- | --- |
| Mantenha o corredor — conte os que passam | 894.7 → 1083.4 | 188.7 | 100.0% → 100.0% | Nenhum ID novo; não exclui falas/ações |
| Mantenha a cabeça de ponte — mude de cobertura quando mandarem | 607.6 → 756.3 | 148.7 | 100.0% → 100.0% | evt_m01_north_contact_distant, evt_m01_runner_pressure_report |
| Proteja o reparo da linha | 372.1 → 495.1 | 123.0 | 50.8% → 97.4% | Nenhum ID novo; não exclui falas/ações |
| Mantenha contacto com a secção | 69.9 → 110.7 | 40.8 | 0.0% → 0.0% | Nenhum ID novo; não exclui falas/ações |
| Mantenha contacto com a secção | 503.1 → 532.6 | 29.5 | 100.0% → 100.0% | Nenhum ID novo; não exclui falas/ações |

[timeline-per-minute.csv](timeline-per-minute.csv) regista hora, posição, objetivo, ações entre amostras, tiros, reparo, sobreviventes, legenda, cena e eventos. Um observador recolhe aproximadamente a cada 30 s reais; o CSV conserva a última amostra de cada minuto, não uma gravação contínua. Fotografias próximas e os defeitos pertinentes são identificados; contadores de som não equivalem a escuta. A coluna de atores apresentados não é uma contagem de aliados visíveis: renderizar um ator ou registar o seu tiro não prova que a câmara o viu. As fotos inspecionadas delimitam a evidência visual. A última amostra passiva ficou em g1151,4, durante a chamada; o fim em g1160,4 está comprovado pelo report do piloto e pela captura 98 do debrief. O relógio global da linha temporal vem do report/observador; no log original, kind=waited usa real como duração.

As [janelas amostradas](sampled-stationary-windows.json) medem posição estável e ausência de novos tiros do jogador no contador amostrado. Não se afirma ausência de acontecimentos interessantes, sons, rotação da câmara ou ameaça entre amostras. São candidatos a revisão de ritmo, não medições de tédio humano.

## Modalidade 2: navegação visual independente

Uma sessão nova foi aberta em High/1280×720. O auditor inspecionou o enquadramento da introdução, virou-se para a secção e aproximou-se por inputs. Noutra sessão High, contornou a barreira inicial, avançou pelos acessos, mudou de direção a partir das fotos e entregou a mensagem com E. O auditor já conhecia o mapa; isto não é um teste cego de compreensão de um jogador novo. Não houve atribuição de coordenadas, save ou relógio à simulação.

A navegação visual não percorreu a missão toda. Fotos High e [log dos controlos](evidence/navigation-high/log.jsonl) estão separados das evidências do piloto. Entre passos de navegação, usou-se a pausa real do jogo; o separador do navegador foi congelado para libertar CPU enquanto se inspecionavam fotos, e reativado antes de retomar. Isso não avançou a missão. Só o menu de pausa foi ocultado nas capturas; não se alterou a imagem do jogo.

## Cobertura e limitações

- O piloto conhece os destinos por coordenadas e pode completar uma missão cuja orientação natural seja insuficiente.
- A atuação humana, a dificuldade percebida, a diversão e a escuta não foram avaliadas por uma pessoa.
- O software WebGL e a execução de probes High em paralelo alongaram o tempo real. Comparar ritmo pelo tempo de simulação e pelos acontecimentos.
- Fotografias comprovam estados e composição, não todos os frames da animação nem sincronização de áudio.
- Referências externas estão bloqueadas; ver relatório C.
- Testes de interação com posições atribuídas foram feitos apenas em instâncias descartáveis e estão identificados como testes isolados, fora da partida.
- A rota separada de cobertura foi feita por controlos de simulação, sem atribuir eventos, e não é apresentada como uma partida de navegador.
