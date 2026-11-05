# Prova N0 sem browser — planta com escala e tabela de vãos (M02-01, quinta)

Origem: PDF de pré-produção, secção N (pp. 47–49; N0 e N5) e catálogo F (pp. 23–25). Área A: X −50…50, Z −90…60. **Esta prova não aprova o N0**: é geometria estática sobre os dados do layout, não é playtest, captura 360° nem medição de desempenho.

## Ficheiros

| Ficheiro | Gerado por | O que é |
| --- | --- | --- |
| `quinta-planta.svg` | `tools/m02/plan-svg.mjs` | Planta a 6 px/m (norte = −Z): contorno do slice, B01–B04 (paredes, portas P#, janelas J#), cercas, vala, pomar e 7 macieiras candidatas, rotas vala/pomar, SN1–SN5, PL/EA1/EA0, MG34 de B02 e o seu arco, grelha de 10 m, escala, norte, legenda e detalhe de cada edifício a 18 px/m. |
| `tabela-vaos.md` | `tools/m02/openings-table.mjs` | Tabela de portas/janelas (posição, L × A, estado inicial, passagem da cápsula do jogador, linha de vista), linhas de tiro da MG34 para SN1–SN5 e para as duas rotas, comparação B01–B04 com o PDF (com página), SN PDF ↔ layout ↔ `PANORAMA_VIEWS`, percurso das rotas com `movePlayer` e **lista de problemas**. |
| `tools/m02/n0-common.mjs` | — | Ajudantes partilhados (só leitura) e as constantes do PDF citadas pela tabela. |

Entrada única: `missions/m02-bzura/m02-01-quinta-layout.json` (o sha256 vem no cabeçalho dos dois ficheiros). Lê também `src/world/m02-quinta-world.js`, `src/world/m01-player-physics.js` (raio 0,36 m, altura 1,80 / 1,25 m, degrau 0,45 m) e, por análise de texto, `src/game/m02-01-simulation.js` (boca da MG) e `src/m02/m02-01-main.js` (`PANORAMA_VIEWS`). Nada é escrito fora de `docs/m02/n0/`.

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

ERRO = contradiz um critério verificável (colisão, largura, PDF); AVISO = a rever pelo Capitão; INFO = coerente com o PDF mas relevante para a captura. Os itens ficam registados, **não** foram corrigidos aqui (a prova não altera `src/game`, `src/world` nem o layout).
