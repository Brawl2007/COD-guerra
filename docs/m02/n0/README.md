# Prova N0 sem browser — planta com escala e tabela de vãos (M02-01, quinta)

Origem: PDF de pré-produção, secção N (pp. 47–49; N0 e N5) e catálogo F (pp. 23–25). Área A: X −50…50, Z −90…60. **Esta prova não aprova o N0**: é geometria estática sobre os dados do layout, não é playtest, captura 360° nem medição de desempenho.

## Ficheiros

| Ficheiro | Gerado por | O que é |
| --- | --- | --- |
| `quinta-planta.svg` | `tools/m02/plan-svg.mjs` | Planta a 6 px/m (norte = −Z): contorno do slice, B01–B04 (paredes, portas P#, janelas J#), cercas, vala, pomar e 7 macieiras candidatas, rotas vala/pomar, SN1–SN5, PL/EA1/EA0, MG34 de B02 e o seu arco, grelha de 10 m, escala, norte, legenda e detalhe de cada edifício a 18 px/m. |
| `tabela-vaos.md` | `tools/m02/openings-table.mjs` | Tabela de portas/janelas (posição, L × A, estado inicial, passagem da cápsula do jogador, linha de vista), linhas de tiro da MG34 para SN1–SN5 e para as duas rotas, comparação B01–B04 com o PDF (com página), SN PDF ↔ layout ↔ `PANORAMA_VIEWS`, percurso das rotas com `movePlayer` e **lista de problemas**. |
| `tools/m02/n0-common.mjs` | — | Ajudantes partilhados (só leitura) e as constantes do PDF citadas pela tabela. |

Entrada única: `missions/m02-bzura/m02-01-quinta-layout.json` (o sha256 vem no cabeçalho dos dois ficheiros). Lê também `src/world/m02-quinta-world.js`, `src/world/m01-player-physics.js` (raio 0,36 m, altura 1,80 / 1,25 m, degrau 0,45 m), `src/game/m02-01-simulation.js` (importa `M02BenchSimulation` e chama a função real `evaluateMgLineOfFire`; a boca da MG vem do layout) e, por análise de texto, `src/m02/m02-01-main.js` (`PANORAMA_VIEWS`). Nada é escrito fora de `docs/m02/n0/`.

## Reprodução

```bash
node tools/m02/plan-svg.mjs              # -> docs/m02/n0/quinta-planta.svg
node tools/m02/openings-table.mjs        # -> docs/m02/n0/tabela-vaos.md
node --test --test-concurrency=1 tests/m02-24-n0-plan.test.js
```

Ambos os geradores são deterministas (mesmo layout e mesmas fontes, mesmos bytes; opção `--out <ficheiro>` para outro destino). O teste falha se os ficheiros do repositório estiverem desatualizados: regenerar com os dois comandos e fazer commit do resultado. Pré-visualização: abrir o SVG em qualquer browser ou em `convert`/`rsvg`; não é usado nenhum browser na geração.

## O que cobre

- Colisão estática de portas/janelas com a cápsula real do jogador (`deepestWall`), em pé e agachado, em estado inicial e com tudo aberto.
- `world.lineOfSight` e `traceObstruction` através de cada vão e da MG34 de B02 até SN1–SN5 e às amostras (10 m) das duas rotas, com o mesmo critério de `evaluateMgLineOfFire`, mais o raio «real» do artilheiro DE-A05.
- Dimensões, implantação e vãos de B01–B04 contra o PDF (F2–F5, pp. 24–25) e SN contra N5 (p. 49).

## O que não cobre

- Playtest, IA, tempos de animação de portas, desempenho (p50/p95/p99), aparência, áudio, 360° nem as 30 capturas do N5 (essas ficam para o spec de browser).
- Penetração de balas (`traceObstruction` não a simula) e destruição durante o jogo.
- Espessura das paredes interiores (desenhada como 0,15 m, esquemática) e geometria do telhado/sótão.
- Aprovação do N0 ou do slice: depende de playtest e de evidência de jogo (PDF N6).

## Interpretação da lista de problemas

ERRO = contradiz um critério verificável (colisão, largura, PDF); AVISO = a rever pelo Capitão; INFO = coerente com o PDF mas relevante para a captura.

## Correções N0 (layout da Área A v2, `m02-01-quinta-bench-v2`)

A primeira versão desta prova só registava os problemas. Os 15 itens da «Lista de problemas» foram corrigidos no layout e no código e a lista regenerada ficou sem ERRO nem AVISO (só 3 INFO: as janelas altas de B03 não dão vista a um jogador em pé, como o PDF F4 pede). Cada correção tem um teste em `tests/m02-26-n0-fixes.test.js` que reproduz o defeito com o layout anterior e prova a correção.

| Problema | Correção | Onde |
| --- | --- | --- |
| ERRO `door_b04_south` bloqueada por `cov_b04_woodpile` (corredor livre de 0,04 m) | Lenha deslocada 0,7 m para este (x −30,8…−27,8): a cápsula (Ø 0,72 m) do jogador e dos NPC atravessa a porta de 1,0 m em linha reta (folga 0,28 m) | layout `exteriorCovers` |
| MG34 com quatro posições (PDF (12;−30), layout 12,8, artilheiro 13,2 dentro da bancada, boca 11,82 fora da parede) | **Fonte única** `mgEmplacement` do layout: (x, z) = (12,0; −30,0) como no PDF F3 p. 24, boca a 1,42 m dentro do vão `win_b02_west_mg`; o artilheiro DE-A05 (13,2; −30) fica atrás da abertura, no eixo de tiro, fora da bancada (encolhida para x 12,2…12,8); simulação, tiro do artilheiro, rasto das rajadas, pontos de supressão da secção e renderer derivam todos de `m02MgMuzzle` | layout, `m02-quinta-world.js`, `m02-01-simulation.js`, `m02-combat-ai.js`, `m02-01-renderer.js` |
| «EXPOSTO» da simulação ≠ linha de vista do atirador (SN1, SN3, 5/18 da vala, 1/25 do pomar) | Por construção a origem é uma só; a tabela chama a função real `evaluateMgLineOfFire` (já não a espelha) e compara-a com o disparo real (`traceShot` + `lineOfSight` desde a boca) em todas as amostras; teste de 2 em 2 m nas duas rotas e nos SN, em pé e agachado | `tools/m02/openings-table.mjs`, teste |
| Vidro intacto bloqueava `lineOfSight` apesar de `BALLISTIC_MATERIAL_POLICY.glass.blocksSight = false`; toco de 0,05 m em `win_b01_east_hall` | Layout A com `"sightPolicy": "ballistic-policy"`: `lineOfSight` usa `sightWorld` (sólidos sem os materiais com `blocksSight:false`); o vidro continua a parar a bala, que o parte (já suportado: `glassBrokenId`). `evaluateMgLineOfFire`: `hasVisualLoS` pela política de vista, `canHitTarget` pela balística. Janela deslocada de offset 0,65 → 0,90 m. **As células B/C não declaram a política (`legacy-opaque`, por omissão) e ficam como estavam**: com a política ali o MissionBot morre sempre (0/23 sementes chegam a C12), porque os atiradores dentro de B09 passam a ver Piotr a 45 m pela `win_b09_east_1` intacta. Alargar a política a B/C é decisão de balanceamento do Capitão | `m02-quinta-world.js`, `m02-01-simulation.js`, layout |
| B03 sem janelas altas N/S e sem acesso a arreios a este (PDF F4 p. 25) | `win_b03_north_high` (u 3,5) e `win_b03_south_high` (u 14,5), 1,2 m, peitoril 1,75 m (iguais à janela alta oeste já existente); `door_b03_east_tack`, porta pedonal de 1,0 m na parede este (v 9,5, arrecadação a sudeste), fechada de início | layout |
| `zones.northGate.width` 3,2 m ≠ vão real 3,6 m | 3,6 m (igual ao vão entre `cov_gate_wall_west` e `cov_gate_wall_east`) | layout `zones` |

### Versão de layout e saves

A geometria e os IDs da Área A mudaram (lenha, MG34 e bancada, janela de B01, três vãos novos em B03), por isso o `schema` do layout subiu de `m02-01-quinta-bench-v1` para **`m02-01-quinta-bench-v2`**. Um snapshot grava `world.layoutSchema`; um save v2 gravado com o layout v1 é **recusado com motivo claro** («Save incompatível: layout m02-01-quinta-bench-v1 da célula A, atual m02-01-quinta-bench-v2. Motivo: …. Sem migração: o save antigo não foi alterado nem apagado, mas já não pode ser carregado»), nunca migrado nem lido às cegas, sem apagar o registo e sem tocar no estado vivo (`M02_RETIRED_LAYOUT_SCHEMAS` em `src/game/m02-save-store.js`). Os saves v1 do Codex (`cod-guerra:checkpoint:m02:v1`) são outra coisa e não são tocados (ver `docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md` §8).

### Mudanças de comportamento a rever pelo Capitão

- A MG34 dispara agora da boca no vão (12,0; 1,42; −30,0), não de 0,18 m fora da parede: raios muito oblíquos podem roçar as ombreiras do vão (é o que o PDF pede: «raio de arma verifica montantes e parapeito»). Os resultados do MissionBot (tests/m02-18) são caóticos perante qualquer mudança desta zona: ver o relatório da entrega.
- O vidro intacto de B01 (Área A) deixa de bloquear a vista da IA (continua a bloquear a bala): inimigos e aliados passam a ver através das duas janelas intactas até o vidro partir. Nas células B/C o vidro continua a bloquear a vista (ver acima).
- A porta pequena este de B03 e as janelas altas são geometria nova (colisão e raio).
