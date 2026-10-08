# Revisão independente — resultados e resolução

Revisor: subagente independente, só leitura, sobre `git diff 99309d9` do commit `2e946ab` (antes das correcções). Correu os testes Node relacionados (33/33 + 33/33), verificou a fronteira de gameplay e mediu numericamente poses, luzes e cobertura de fumo. Sem bloqueadores. As correcções estão em `a428925`.

Fronteira de gameplay confirmada pelo revisor: a apresentação nunca escreve em simulação, arma, jogador, mundo ou RNG; só lê getters, `reloadProgress` e `TczewWorld.heightAt` (puro). `visualNoise` é um hash próprio. As emissões são chaveadas por `shotCount`/`lastShot`/`started`. O teste de rig compara `sim.snapshot()` antes/depois de cada frame.

| # | Gravidade | Constatação | Resolução |
|---|---|---|---|
| 1 | Major (visual) | O clipe vazio ficava em repouso de pé, meio enterrado: `lay()` deitava o eixo Y da geometria, certo para invólucros (eixo do torno), errado para o clipe (comprimento em Z). | **Corrigido.** O repouso é alcançado a partir da orientação de toque: invólucro deitado de lado, clipe deitado na chapa de base ou virado sobre as abas, com altura de contacto real. Teste novo com 8 orientações × 2 peças: nenhum vértice mais de 1,5 mm dentro do chão, eixo longo horizontal, o clipe pousa das duas maneiras. |
| 2 | Minor (visual) | A orientação saltava no toque (spin com idade absoluta) e no repouso (troca brusca para `lay()`). | **Corrigido.** O spin abranda no impacto e pára no fim do salto, enquanto a peça tomba (≤ 90°) para o repouso. O mesmo teste amostra a cada 1 ms: nenhum passo > 0,2 rad (antes: saltos de 0,85 e 2,1 rad). |
| 3 | Minor | `envMapIntensity` por material não tinha efeito: three r186 usa `scene.environmentIntensity` quando o material não tem `envMap` próprio. | **Removido.** Comentário a dizer que a força do reflexo é a do passe da arma. Comportamento visual igual ao capturado. |
| 4 | Minor (verificar) | `WeaponLighting.sync` substitui os valores do construtor: ao amanhecer a chave cai de 2,0 para ~0,6 e o enchimento de 2,7 para ~2,2. | **Mantido por design, verificado em captura.** A arma fica na mesma luz que o mundo (antes ficava iluminada como ao meio-dia num amanhecer escuro). Madeira e aço continuam legíveis e o aço deixa de ser preto. O comentário enganador foi corrigido. Os números estão no HANDOFF. |
| 5 | Minor (custo GPU) | Duas `PointLight` sempre presentes no passe da arma M01 (rig + fallback): cada píxel do viewmodel calculava duas luzes. | **Corrigido.** Uma luz partilhada: o rig controla a luz do fallback, e o fallback escondido não lhe toca. Teste novo. |
| 6 | Minor | O fumo do cano dependia só do último tiro: o seguinte (180 ms na carabina) cortava os fios anteriores num frame. | **Corrigido.** Duas gerações: os fios do tiro anterior continuam a desvanecer. Histórico chaveado pelo tempo autoritativo; restore/tempo anterior esquecem-no. Teste novo. |
| 7 | Nit | Bancada: `ground:0` ignorava a laje da estrada (topo y = 0,005). | **Corrigido.** `restHeight` lê a caixa da própria malha da laje; o invólucro pousa a 0,005. Teste novo. |
| 8 | Nit | `clipEjected` ficava verdadeiro numa recarga de um cartucho depois de 2,45 s (só diagnóstico). | **Corrigido.** Condicionado a `RELOAD_CLIP`. |
| 9 | Nit | O kick de recuo da simulação (+0,024 rad no pitch) era lido como olhar para cima: mergulho dependente do frame rate, a cancelar a subida autorada. | **Corrigido.** O frame do tiro não alimenta o atraso de olhar; asserção nova a 1 e 5 ticks/frame (`lookPitch` = 0 depois do tiro). |
| S | Suspeita (verificar) | A nuvem da boca no mundo podia tapar o alvo em ADS (estimativa do revisor: névoa ~0,55 a 0,1 s). | **Mitigado e verificado em captura.** Em ADS a nuvem tem 40 % da opacidade e 75 % do tamanho (pólvora sem fumo); teste novo. Ver as capturas `m01-04/05` em `CAPTURES.md`. |
| M | Manutenção | O teste que fixava hashes de `game.js`, simulações, `weapon.js` e perfil da wz.29 falharia em qualquer alteração legítima futura. | **Substituído.** Teste estável de fronteira de imports (os módulos de apresentação não importam `src/game`, `src/world` nem `src/core`). A ausência de alterações de gameplay desta branch fica registada como prova em [`FILES_CHANGED.txt`](FILES_CHANGED.txt). |
| P | Processo | Documentação/estado ainda por actualizar no momento da revisão. | Actualizados nesta entrega (`DEVELOPMENT_STATUS.md`, `docs/NEXT_CHAT_CONTEXT.md`, esta pasta). |

Verificado como correcto pelo revisor, sem alteração:
- O mapeamento FOV `viewPointToWorld` (k = tan(F/2)/tan(f/2), mesmo aspecto, profundidade mantida).
- `viewUp`, o sinal de `environmentRotation`, a ordem de rotação câmara·arma·local e os sinais do atraso de olhar.
- Miras exactas em ADS em repouso e frames de pausa estáveis.
- O restore repõe a apresentação.
- Sem NaN de ossos com escala zero.
- Transporte de Bąk, cutscenes, fallback GLB e bancada sem OBJ sem excepções.
- Contagem de luzes constante e materiais do mundo nunca modificados.
- `dispose()` completo e alocações por frame desprezáveis.
