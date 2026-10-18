# M01: o jogador deixa de atravessar paredes e passa a ter gravidade — 2026-10-18

Branch local `claude/busy-ritchie-3fkvk2-phys` sobre a candidata #80 (`f6913a0`). **Não aceite, não publicada**, sem revisão crítica independente, sem playtest humano. Tudo abaixo é simulação em Node (e um smoke de browser); a sensação de jogo (queda, aterragem, degraus, paredes) ainda não foi jogada.

## O que o proprietário viu

«O jogador atravessa paredes; as quedas não têm gravidade convincente (nem queda, nem aterragem).»

## Reprodução (antes) — `tests/m01-player-collision.test.js` em `f6913a0` (commit `cf26d5c`, vermelho por desenho)

O jogador real da `M01Simulation` é colocado pelo teste e conduzido **só pelos controlos de `tick()`** (frente + correr) contra cada classe de geometria visível. Uma sonda «aguenta» se o círculo do jogador nunca se enterrar mais de 6 cm na pegada do sólido.

| Classe (fonte independente) | Antes (`f6913a0`) | Depois |
|---|---|---|
| Obstáculos existentes (barracão, estação, coberturas, troncos, vagões, pórticos): `world.obstacles` | 204/204 aguentam | 206/206 (inclui os 2 bidões da porta) |
| Casamata (envelope do manifesto) | 4/4 atravessadas (a 6,26 m para dentro, a subir ao tabuleiro) | 4/4 aguentam |
| Paredes do abrigo (gerador `tools/assets/m01-field-structures`) | sem colisor (`collidersAdded: 0`) | 9/9 aguentam |
| Kit de props T12 mais altos que um degrau (caixas, barris, carros, travessas, postes, vedações, grua) | **423/423 atravessadas** | 425/425 aguentam |
| Faces dos encontros ao subir do terreno baixo | 6/6 «subidas» como rampas (`heightAt` levanta o jogador 1,4 a 2,6 m num tick) | 6/6 paredes |
| Parapeitos de 1,1 m dos dois encontros oeste, pórticos (0,4–0,5 m maiores que as caixas do kit), aço sob o primeiro vão ferroviário (raios a partir de cada ponto onde se pode estar, contra as malhas intactas lod0) | 565 + 393 de ~5000 raios chegavam ao desenho sem sólido | 0 + 0 |
| Treliça dos vãos, no tabuleiro | o centro chega a 4,56 m do eixo (face a 4,4 m) | para a 4,04 m |
| Limite do mapa | 19 a 23 m para lá do limite avisado | para 10 m depois do limite |
| Queda de 2,65 m (borda do encontro) | 1 tick, sem aceleração, sem evento | ~0,74 s de queda livre, `player-landing` com 7,2 m/s, sem dano |
| Queda de 5 m / 12 m | sem evento, sem dano | 40 de dano / morte e checkpoint |

## Causa

`src/world/tczew-world.js` em `f6913a0` (`move`, linhas 81–92; `terrainHeightAt`, linha 78):

1. **Não havia física vertical.** No fim de cada `move`, `actor.y = this.heightAt(x, z)`: qualquer descontinuidade do terreno ou dos tabuleiros era um salto de um tick. O encontro da ponte ferroviária (face de 1,4 m a 2,6 m, `rail_collider_abutment_west`) subia-se como uma rampa; a margem em x=25 (7 m sobre o rio) era uma teleportação para y=-10.
2. **Os colisores eram uns poucos AABB.** `obstacles` só tinha pilares/torres/pórticos da ponte, o barracão, a estação, as coberturas de saco, os 17 troncos e os 3 vagões. Sem colisor (e o código dizia-o: `collidersAdded: 0`): a casamata, as paredes do abrigo, o kit de props T12 inteiro (caixas, barris, carros, travessas, 39 postes, 121 troços de vedação, grua), a ferradura de sacos da ckm, a treliça (só `falls()` segurava, 0,2 m para dentro dela) e o limite do mapa.
3. **O terreno escondia um precipício.** `terrainHeightAt` punha `y=-4` flat a menos de 8 m do abrigo (linha 78): um degrau de 1 m do lado plano e, onde o poço se sobrepõe ao pé do aterro da estrada (lado da entrada em L), um **precipício de 5 m** cortado na rampa. A malha do terreno (amostrada de 5 m em 5 m) desenhava rampas; o jogador teletransportava-se por elas.

## Correção

- `src/world/m01-player-physics.js` (novo, puro e determinístico): cápsula vertical (r 0,36 m; 1,8 m, 1,25 m agachado). Desliza nas paredes (empurrada para fora da pegada orientada, qualquer ângulo), sobe degraus até 0,45 m, segue rampas e degraus de descida até 0,5 m, cai com `g = 9,81 m/s²` e **conserva o momento horizontal**, aterra com evento, dano de queda (0 até 3 m, 100 aos 9 m, linear na velocidade), splash sem dano no rio, paragem dura 10 m depois do limite avisado. O estado novo é só `player.fall` (`{vy,vx,vz,startY,t}`) **enquanto está no ar**: um jogador no chão grava-se exactamente como antes.
- `src/world/m01-collision-layout.js` (novo): a lista de sólidos do jogador, **separada de `world.obstacles`** (que também pára balas, visão, granadas e NPC): tudo o que existia + tabuleiros/encontros/juntas (massa vista de lado, degrau visto de cima, tecto visto de baixo) + treliça e um corrimão de 1,2 m nas juntas + casamata + paredes do abrigo + ferradura da ckm (até à demolição oeste) + 2 bidões + os props do kit T12.
- `src/world/m01-prop-layout.js` (novo): as colocações T12 e o portão da vedação saem do `src/render` (o simulador não importa o renderer) e o renderer reexporta-as. O mesmo layout alimenta o desenho e a colisão.
- `tczew-world.js`: `playerSolids`/`solidIndex` em `refresh`, `isWater`, `waterY`; o poço do abrigo passa a ser **1 m abaixo do terreno** a menos de 6 m do centro e desvanece até aos 8 m (já não um precipício).
- `m01-simulation.js`: `moveBody` (único caminho de movimento do jogador, também o empurrão da escolta), `playerLanded` (saúde, evento `player-landing`, morte «Você caiu de uma altura fatal.» → checkpoint), validação de `player.fall`, e o jogador da chamada final deixa de nascer **dentro** da parede de retorno do abrigo (a câmara ficava encerrada).
- Apresentação (só lê): `src/render/m01-body-feedback.js` (mergulho da câmara na aterragem, até 0,34 m; suavização de degraus ≥ 0,02 m que um declive de 45° não explica), `audio.landing()` (sintetizado, escala com a velocidade, splash na água), ligados em `m01-view.js` e `game.js`.
- Não mudou: combate, RNG, dados da missão, o movimento dos NPC (`TczewWorld.move`), balas/visão (`obstacles`).

## Provas

- `tests/m01-player-collision.test.js` (9): a reprodução acima, agora verde.
- `tests/m01-player-physics.test.js` (16): em terreno aberto o novo movimento é **bit a bit igual** ao anterior (4000 passos aleatórios contra `TczewWorld.move`: golden neutro fora dos obstáculos); degrau 0,4 m sobe, 0,5 m pára; deslize em paredes a 0°, 20°, -34°, 69°; vedação de 18 cm sem túnel a 120 ângulos a correr; corpo dentro de uma parede é empurrado para fora; agachado passa sob uma trave a 1,5 m; queda `y = y0 - g t²/2` ao milésimo, velocidade terminal, momento, rio, curva de dano; evento único; morte; gravação a meio da queda (continuação bit a bit), campo `fall` inválido rejeitado, gravação sem `fall` carrega.
- `tests/m01-collision-visible-geometry.test.js` (7): cada pegada de prop é recalculada do GLB lod0 (cobre o desenho, não é parede invisível, topo igual); 144+96+96 raios horizontais contra a malha da casamata, do abrigo e do barracão dão o mesmo primeiro impacto que os sólidos (±12 cm); a ferradura da ckm contém exactamente os sacos que o renderer põe (`M01Environment.buildEmplacement`); os bidões são os que `buildArchitecture` põe.
- `tests/m01-player-reach.test.js` (4): inundação em grelha (2 m, e 0,5 m nas passagens estreitas) com as regras do próprio corpo: todo o sítio da missão é alcançável a pé da secção (início e depois da demolição oeste), incluindo a passagem em L do abrigo e a porta oeste do barracão; a ferradura da ckm e a casamata continuam fechadas.
- `tests/m01-collision-bridgehead.test.js` (2): os raios acima, nas duas cabeças de ponte (parapeitos, pórticos, aço sob o vão): a primeira coisa que um raio encontra é um sólido a menos de 20 cm do desenho (então o olho fica a 16 cm ou mais).
- `tests/m01-body-feedback.test.js` (7): mergulho, suavização (só o que um declive de 45° não explica), qualidade, contrato do evento, som.
- Rotas da missão: `tests/helpers/m01-route.js` caminhava pela geometria que agora é sólida (a face sul do encontro ferroviário em x=-15, o encontro rodoviário ao longo de z=32, a parede oeste do abrigo e a vedação, o aglomerado de sacos em (-150,8), os bidões da porta). Ganhou desvios (aterro em x=-30, crista da estrada em (-30,40), portão da vedação, z=15,5 sobre o aglomerado, x=-275,5 pela porta) e **as duas rotas de ouro não tocam em nenhum sólido** (nenhum tick a menos de 5 cm, nenhum tick no ar, `y == heightAt` em todos os ticks).

## Golden (emenda 04 do golden T47, com as ferramentas do repositório)

- `tools/verification/m01-t47-ckm-fire-audit.mjs --write`: a prova por tick **predecessor == candidata sem efeito nos alemães** (8c6328c, nos dois percursos) mantém-se **em todos os ticks** (21 885 e 21 399), com um delta nomeado novo, `body`, aplicado ao predecessor por fora, como o `cadence`: o poço do abrigo (o y do jogador a menos de 8,5 m do abrigo) e a posição da chamada final (0,6 m mais para dentro). Nada foi projectado fora. Primeira diferença viva igual à anterior: tick 5320 (`de_east_0`), 81 e 75 rajadas, 0 e 1 baixa.
- `tools/verification/m01-t47-golden-amendment-audit.mjs --amendment 04 --write`: o golden e a auditoria substituídos (f6913a0, emenda 03) ficam byte a byte (`tests/fixtures/m01-t47-gameplay-baseline-before-amendment-04.json`, `…/PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_04.json`, fixados por `sha256` em `tests/m01-animation-contract.test.js`); `GOLDEN_AMENDMENT_04.json` é a conta. O BEFORE é conduzido pelo **seu** piloto (extraído do git) e reproduz o golden guardado; a candidata, pelo piloto vivo. O piloto antigo, **corrido na simulação nova**, é travado: o jogador diverge ao tick 185 (9,25 s: sobe para o canto de sacos em (-15,8, 23,9), y -3 → -2,56) e a sua própria `walk()` desiste em «Movement blocked en route to -15,2» (a face sul do encontro). Os 512 ticks do primeiro bloco já diferem (percurso 23 e 23 ticks mais longo).
- `--amendment 03` e `--amendment 02` re-verificadas como história: reproduzem `GOLDEN_AMENDMENT_03.json` e `_02.json` byte a byte.
- Medidas fixadas que seguem o percurso, re-medidas com a ferramenta do repositório (`tools/m01-ckm-fire-arc.mjs`) e documentadas nos testes: `m01-ckm-fire-arc` (amostras 1110 → 1112, 784 → 785; inimigos 36456 → 36542; livres depois da demolição oeste 135 → 144, os mesmos nove alvos, nenhum antes dela), `m01-ckm-candidate-posts` (785 amostras, 21500 inimigos, fases 7640/11960/1900; todas as contagens da lista curta iguais).
- `tests/m01-material-authority.test.js` fixava o terreno amostrado original: o poço do abrigo muda **5 de 52 531 vértices** (os 3 do pé do aterro da estrada, -4 → -1,22/-2,12/-1,93; os 2 do lado sul, -4 → -3,46) e `tczew-world.js` fica fixado byte a byte ao commit que o altera (como o PT05); os hashes de posição e normais foram re-medidos e o `uv`/`index` originais ficam. O mesmo re-registo está em `tests/m01-terrain-relief.test.js` (hashes das memórias intermédias reconstruídas do terreno de integração), com os valores antigos no comentário.
- Outros pilotos que atravessavam os encontros e o abrigo foram corrigidos da mesma maneira: `tests/helpers/m01-cover.js`, `tests/m01-cover-threat.test.js`, `tests/m01-hud-presentation.test.js`, `tools/verification/m01-hud-capture.mjs`, `tools/verification/m01-t40-views.mjs`, `tests/m01-viewmodel-feel.test.js` (a missão real caminhava em linha recta para o topo do encontro rodoviário, 1,1 m acima do terreno na face oeste: agora sobe pela estrada em z = 40) e `toStationEvacuation` em `tests/helpers/m01-route.js`.
- Dois achados do `npm test` completo no SHA `d4d6b18`, corrigidos e re-corridos (não afrouxam nenhuma asserção): `tests/m01-continuous-fixes.test.js` «roll call» (o piloto atravessava a vedação em linha recta e continuava a conduzir 60 s depois de a cena o pôr no abrigo; o ângulo final a 59,5° do Pawel contra os 60° permitidos era coincidência da linha antiga; agora entra pelo portão e pára quando a cena começa) e `tests/m01-combat-posture-staging.test.js` semente 19390901 (o percurso 23 ticks mais longo põe, às 05:27:00, um tiro de atrição — saído do olho de pé, afirmação mantida — no mesmo tick em que o fogo dos aliados prende esse atirador; a afirmação «não está ajoelhado depois do tick» passa a «salvo se uma supressão começou neste mesmo tick», a mesma ordem que as rondas normais logo abaixo já admitem).
