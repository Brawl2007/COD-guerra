# HANDOFF — M01 distant battlefield presentation V1

TASK_ID: `M01-DISTANT-BATTLEFIELD-PRESENTATION-V1`  
BASE: `99309d9cb023cc94a07d41ff863e1362e4460570`  
BRANCH: `codex/m01-distant-battlefield-presentation-v1` (sem merge, sem PR, `main` intacta)  
Runtime verificado: commit indicado em [`EVIDENCE.md`](EVIDENCE.md). Os commits seguintes só acrescentam documentação/capturas.

M01 continua **PROTÓTIPO JOGÁVEL**. Esta camada é **apresentação**: não decide dano, estado da missão, visibilidade, IA nem objectivos.

## O que o jogador percebe

A guerra continua para lá do alcance do jogador:
- **Planície de Lisewo.** Muito a montante e a jusante das pontes (1,3–2 km), há tiros isolados, rajadas com traçantes a cada 3–5 cartuchos e trocas: a linha alvejada responde quando as primeiras balas chegam, depois de uma pausa humana.
- **Frente norte.** Depois do contacto distante das 05:50 (`evt_m01_north_contact_distant`), abre-se a 0,85–1,5 km da área jogável (S4 de `MAP.md` §3). Há clarões de espingarda e MG e impactos de morteiro com poeira e fumo. Peças muito a norte mostram o clarão no horizonte; o impacto chega depois do voo. Uma quinta fica em chamas e, 4 min depois do contacto, ergue-se uma coluna larga ao longe.
- **Planície a leste (x ≥ 1750 m).** Pequenos grupos avançam em lanços (correm, depois agacham-se). Depois das 06:10 voltam para trás, alguns com dois homens a carregar um ferido.
- **Céu.** Elementos de 1–3 aviões cruzam o céu a ≥2 km.
- **Koźliny (≈07:00).** Viaturas levantam poeira; uma peça anticarro dispara três vezes, com intervalos irregulares, e a viatura atingida fica a arder.

O ritmo não é um loop: há minutos calmos e surtos, e cada sector tem fase própria. Dois impactos pesados no mesmo sector nunca caem a menos de 0,3 s um do outro (comparado na hora de impacto). Nada é centrado no jogador; atrás dele, fora do campo de visão, as mesmas acções continuam.

**Distâncias.** Média distância (0,85–1,25 km) é a linha polaca a norte, com os impactos e a quinta. Longa (1,2–3,2 km) são a planície de Lisewo, os atacantes, as peças, Koźliny, os grupos e a coluna. Os aviões ficam a ≥2 km. **Curta distância (< 380 m) não pertence a esta camada.** É o FX autoritativo existente (impactos, explosões, fumo da batalha), que esta branch não altera.

## Três camadas, separadas no código

| Camada | Onde | O que contém | Regra |
|---|---|---|---|
| **AUTORITATIVA** | `M01Simulation` (inalterada) | `sim.clock` e `sim.consumed[id]` dos 10 marcos lidos (`MILESTONE_EVENTS`) | Só leitura (teste com proxies que registam escritas). |
| **APRESENTAÇÃO** | `planDistantBattlefield` → `layer:'presentation'` | Frente norte (`north_line`, `north_guns`), quinta/coluna, Koźliny | Só existe depois do evento autoritativo consumido; `source` é o id desse evento. |
| **AMBIENTE** | `planDistantBattlefield` → `layer:'ambient'` | Planície de Lisewo (`east_dike`), grupos na planície, aviões | Seed fixa + relógio, modulada pela fase autoritativa; `source` = `ambient:<sector><-<evento que o abre>`. |

**Plano.** `src/render/m01-distant-battlefield-plan.js` é uma função pura de `(clock, consumed, seed)`. Não recebe jogador, câmara nem qualidade, por isso pausa, restore, reload e qualidade dão os mesmos eventos.

**Renderer.** `src/render/m01-distant-battlefield.js` lê `sim.clock`, `sim.consumed` e `world.heightAt` (para pousar silhuetas). A câmara só serve para:
- o tamanho mínimo em píxeis;
- a ampliação das silhuetas com a distância (até 1,6×);
- as bandas de distância e o diagnóstico dentro/fora da vista.

A qualidade só muda a densidade de fumo (Baixa 0,55, Média 0,78, Alta 1, os valores do FX da batalha). Em Baixa não há nuvens de tiro. Nunca muda quais eventos existem.

**Teste A/B de gameplay.** O mesmo snapshot avança 400 ticks com e sem a camada a desenhar em cada tick, e o estado final da simulação é idêntico.

## Implementação

| Campo | Resultado |
|---|---|
| CLARÕES | Glow instanciado com tamanho mínimo de 7 px CSS: um clarão a 1 km continua um ponto legível, atenuado em vez de perdido. Mistura normal, halo quente saturado e núcleo quente. Cada clarão dura o intervalo do frame (70–250 ms), para não se perder em frames lentos. Frames repetidos no mesmo relógio são idênticos. Um mundo restaurado ou um relógio anterior recomeçam em 70 ms, como um renderer novo. |
| TRAÇANTES | Faixa orientada pela trajectória, largura mínima de 2,6 px, queda balística ligeira, a cada 3–5 cartuchos por rajada. |
| TROCAS | A resposta sai da linha alvejada, apontada à origem da rajada, 0,45–1,55 s depois de as primeiras balas chegarem. |
| ARTILHARIA / MORTEIRO | Clarão no horizonte e impacto depois do tempo de voo (~420 m/s), com poeira e fumo. 18 % dos tiros não mostram impacto (tiro longo). Dos morteiros só se vê a chegada. |
| COLUNAS | Até 3 (limite 4): quinta a norte (+140 s após o contacto), coluna larga a ~3,2 km (+240 s), viatura atingida em Koźliny (fumo negro). Escala legível a 1,5–3 km: 100–300 m de altura e dezenas de metros de largura. Crescem em 60 s e inclinam com o vento em altitude. Fumo distante com perspectiva aérea própria: até 80 % da cor de névoa a ~6 km, em vez de se dissolver no céu aos 2,7 km como o fumo próximo. |
| SILHUETAS / MOVIMENTO | Grupos de 3–6 homens a ≥1250 m da área jogável (fora do alcance de 1200 m do tiro do jogador). Lanços com pose de pé/agachado; os carregadores de um ferido mantêm o mesmo ritmo, a 1,2 m um do outro. Sem névoa de cena: pontos escuros em movimento. A 70° de FOV ocupam ≤ 1 px, ~1,4 px em ADS. Lêem-se como movimento, não como forma. |
| AVIÕES | Elementos de 1–3 aviões, 650–1750 m de altitude, a ≥2 km da área jogável por construção. Só aparecem depois de `evt_m01_planes_heard` (+30 s). O pool cabe todos os elementos sobrepostos, por isso nenhum avião aparece a meio do voo. |
| RITMO | Baldes de 0,25 s com chegadas tipo Poisson. Envelope de ruído com oitavas de 97 / 23,7 / 6,3 s (incomensuráveis). Níveis por fase: depois da demolição leste a actividade cai para 12 % durante 9 s, segue-se um surto e depois fogo esporádico; abranda depois da demolição oeste. |
| SEGURANÇA | Planície de Lisewo e silhuetas a ≥1250 m: além do raio de 1200 m do tiro do jogador, para não competir com os atiradores autoritativos do dique S2 junto às pontes nem com o aviso «Salva do dique». Frente norte, impactos e todas as trajectórias a ≥380 m. Testado por construção (duas horas com todos os sectores activos), não só nesta rota. |
| ORDEM DE DESENHO | Os transparentes distantes desenham antes dos próximos (`renderOrder` −3/−2/−1), por isso fumo e poeira próximos cobrem-nos. Silhuetas opacas na ordem normal (o céu é desenhado primeiro, sem escrita de profundidade). |
| LIMITES | 96 eventos, 72 clarões, 48 traçantes, 168 puffs, 64 figuras, 21 aviões, 4 colunas. Pools de GPU fixos. Em JS, o plano cria por frame objectos pequenos (eventos/tiros), limitados pelo número de eventos activos. Na rota nenhum pool satura (teste com contagens pedidas). |
| CUSTO JS | Rejeição barata antes do envelope e cache dos eventos por balde (por assinatura de marcos, memória limitada), com o mesmo resultado (testado). Cada chamada do plano fica em ~80–120 µs, contra ~250 µs na primeira versão (Node relativo, não é FPS; [`EVIDENCE.md`](EVIDENCE.md)). |
| LOCAIS / HISTÓRIA | `GAMEPLAY_DRAMATIZATION` dos sectores de `MAP.md` §3 (S2 Lisewo, S4 perímetro norte, S5 céu). A hora 05:50 do contacto norte é dramatização do roteiro. O topónimo Koźliny e o tipo de viatura estão PARCIAIS em `SOURCE_CHECK.md`. Nenhuma unidade, número de aviões, calibre ou baixa é afirmado como histórico. |

## Integração com a correcção de FX (capture timing)

A correcção de timing das capturas de FX está em `codex/m01-battlefield-fx-polish-v3` @ `e08755be169c8ae5ddf12978b9beb3cc25b4ba43`. Esta branch **não compete** com ela: não altera os pools de explosão/impacto/fumo, `M01Atmosphere`, perfis de FX nem o timing das capturas.

| Ponto de contacto | Nesta branch | Na FX V3 | Estado |
|---|---|---|---|
| `src/render/m01-view.js` | +7 linhas: import, construção depois de `this.atmosphere`, `update` depois de `updateBattlefieldFx`, diagnóstico, `dispose` | 165 linhas alteradas noutros hunks | Merge de ensaio sem conflitos (ver [`EVIDENCE.md`](EVIDENCE.md)) |
| `M01Atmosphere` | Só lê `atmosphere.texture` (puff partilhado). O fumo distante tem batch e material próprios. | Altera o material/batches de puffs da atmosfera | Sem sobreposição: o fumo distante não muda com a V3 e não entra em `atmosphere.diagnostics`. |

**Testes no merge de ensaio** (esta branch + V3 + branch da arma): 367/370. As 3 falhas são de `tests/m01-mg34-prone-presentation.test.js` e falham igual na V3 sozinha (`e08755b`). O `M01View` parcial do teste não tem `fireColor`, que o `updateFire` da V3 passou a usar. A correcção pertence à V3.

Pontos semânticos a saber na integração:
- As bandas de distância desta camada chamam-se `0-1.2km` / `1.2-2.6km` / `>2.6km`, para não se confundirem com `near/mid/far` (< 85 / < 300 / ≥ 300 m) do `battlefieldFx.meta` da V3.
- Depois do merge, os frames e contadores de evidência da V3 (calls/triangles/geometries nos fixtures de raid/demolição) incluem esta camada quando há actividade distante: as linhas de base mudam.
- A poeira distante usa a textura de fumo partilhada, não a variante `dust` da V3. É um follow-up opcional.

## Áudio

Não foi alterado. Os clarões desta camada ainda **não** têm som associado.

O áudio distante existente (`distantBattle` em `src/core/audio.js`, ligado em `src/game/game.js`) não está alinhado com esta camada:
- dispara numa grelha fixa de 4 s a partir de quatro pontos fixos;
- um deles é a norte (−520, −1150) e ouve-se desde o início da missão, antes do contacto norte que agora abre os clarões;
- outro é a sudoeste (−650, 950), onde não há sector visual.

`MAP.md` §8 pede estampido grave com 2–4 s de atraso para o norte. Hook proposto: o plano expõe `shots[].at` e a origem de cada evento, e o glue pode agendar `distantBattle` em `at + distância/343`, como já faz `enemy-fire`. Exige tocar em `game.js`/`audio.js` (engine), por isso fica fora desta tarefa.

## Validação

Ver [`EVIDENCE.md`](EVIDENCE.md) e a revisão independente em [`REVIEW.md`](REVIEW.md).

## Limitações presentes

- **Buraco do terreno (pré-existente).** O mundo M01 só tem chão nestas zonas:
  - x −700…1300 em z −285…365 (malha);
  - as faixas longas x −1100…−700 (y −3,75), x 270…1060 (y −5,05) e x 1300…2800 (y −1,05).

  Para x −700…25 e x 1060…1300 fora da malha, e para x < −1100, não há chão: vê-se a cor do céu/névoa. As posições da margem oeste de Lisewo ficam nessa zona e são desenhadas 1 m acima de `heightAt` (−3). Do olho do jogador é uma faixa de poucos píxeis no horizonte; em probes junto à borda é uma banda clara. A correcção pertence ao mundo/ambiente (faixas baixas de chão), não a esta camada.
- Clarões a 1–2 km de dia têm pouco contraste contra céu encoberto claro, mesmo com o tamanho mínimo; as silhuetas são pontos de ≤ 1–1,4 px.
- O episódio de Koźliny é consumido junto da chamada final; numa rota normal vê-se pouco.
- Sem acoplamento de áudio (acima). Sem playtest humano, sem medição em Chromebook, sem números de FPS.
