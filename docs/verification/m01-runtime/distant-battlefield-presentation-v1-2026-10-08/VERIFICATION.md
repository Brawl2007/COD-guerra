# Verificação independente — resultados e resolução

Verificador: subagente independente, só leitura, sobre a HEAD `16ba780` (runtime `24d2ed7`, base `99309d9`). O que fez:
- correu o teste focado (15/15), a suíte Node completa num worktree limpo (339/339) e o build (mesmo hash que `logs/build.log`);
- fez um merge de ensaio com a FX V3 e a branch da arma: 367/370, com as 3 falhas da V3 também na V3 sozinha;
- aplicou 12 mutações numa cópia descartável: 9 foram apanhadas e 3 sobreviveram (M6, M7, M12);
- conferiu os documentos contra o código, os relatórios e as imagens.

Não correu navegador.

| Item | Resultado do verificador |
|---|---|
| Âmbito e autoridade | PASS: só `src/render/*`, testes e ferramentas. O renderer só lê `sim.clock`, a identidade de `sim.world`, `sim.consumed` e `world.heightAt` (pura). O plano não recebe jogador, câmara nem qualidade. |
| Requisitos | PASS: cada pedido tem código. A curta distância e o áudio estão declarados fora do âmbito. |
| Testes e build | PASS, com 2 testes que não podiam falhar (P9, P10). |
| Integração com a FX V3 | PASS. |
| Exactidão das provas | FALHA: os números principais conferem, mas havia exageros, omissões e afirmações sem artefacto (P4–P8, P11–P15). |
| Documentos de estado | FALHA: `NEXT_CHAT_CONTEXT.md` desactualizado (P1–P3). |
| Higiene | PASS. |

Resolução em `6ffa820` (código, testes, ferramentas), `5c5eed1` (frame de captura) e no commit de documentação seguinte:

| # | Constatação | Resolução |
|---|---|---|
| P1 | `NEXT_CHAT_CONTEXT.md` ainda dizia que a camada usava `atmosphere.billboardBatch`. | Corrigido: a camada só lê `atmosphere.texture` e tem batch e material próprios. |
| P2 | «+6 linhas» em `m01-view.js`; são +7. | Corrigido. |
| P3 | Rótulos «T2 + V3 + T1» sem definição. | Corrigido: o texto nomeia os commits. |
| P4 | Os frames de traçante (eye-03, eye-09) davam 0 píxeis e não estavam em CAPTURES; nenhuma captura mostrava um traçante. | **Diagnosticado e documentado.** O fixture ganhou uma passagem «xray» (profundidade da camada desligada). Em eye-02/03/09 dá 34–54 px contra 0 visíveis: a camada está lá, tapada pelo aterro ferroviário a norte do bolso da cabeça de ponte. Frames novos com linha de vista: <ul><li>probe-13: ponto alcançável a norte do aterro, 33 px;</li><li>eye-14: linha norte do olho do jogador, 620 px;</li><li>eye-15: olho do jogador na ponte rodoviária, posição genuína da rota, 42 px, traçante visível.</li></ul> Linhas e limitação em CAPTURES/HANDOFF. |
| P5 | Distâncias: os impactos das peças do norte chegavam a 735 m da área (abaixo dos 800 m de S4 e da «0,85 km» declarada); a quinta fica a 1,3 km. | **Corrigido em código.** As peças passam a cair nas obras de campo polacas (854–1237 m). A frente norte tem `minDistance` 800, o limite inferior de S4. Verificada por amostragem (um balde em cada três, duas horas) e, desde a segunda verificação (abaixo), também pela geometria exacta das caixas. O HANDOFF dá os intervalos por item, medidos a partir da borda da área de movimento. |
| P6 | A resposta das trocas conta a partir do fim da rajada, quando este é posterior à chegada; nenhum teste (M12 sobrevivia). | Redacção corrigida (o que acontecer depois: fim da rajada ou chegada) e teste novo, que apanha M12. |
| P7 | A coluna longínqua chega a ~240–400 m e a névoa atinge 80 % aos 4,88 km, não ~6 km. | Corrigido no HANDOFF e nos comentários, com os intervalos calculados. |
| P8 | «Testado por construção (duas horas…)» para figuras/veículos, que só eram testados na rota. | Teste novo: figuras, veículos, peça anticarro e colunas a cada 4 s ao longo de duas horas, nas duas fases da planície. A redacção diz o que cada teste cobre. |
| P9 | A asserção do pool de aviões não podia falhar: o plano cortava a lista em 21 (M6 sobrevivia). | O plano já não corta. O teste verifica o limite (baldes que um voo pode sobrepor × maior elemento ≤ 21) com o voo mais longo e o maior elemento observados em duas horas (amostragem; as constantes do plano dão ≤117 s e ≤3 aviões). Apanha M6 e voos mais longos. |
| P10 | O teste do restore não exercitava o reset por identidade do mundo (M7 sobrevivia). | O teste cobre restore para um save anterior, posterior e no mesmo relógio; apanha M7. |
| P11 | «Nenhum pool satura na rota» com 5 snapshots; os puffs chegavam a 165/168 na rota e a 186 com todas as frentes. | Pool de puffs 168 → 224. Teste novo: a rota inteira em Alta a cada 0,25 s e todas as frentes durante uma hora, com as contagens pedidas. Os picos medidos ficam no log do teste: a rota chega a 145 puffs, não ~165 como diziam o comentário e o commit `6ffa820` (F1, abaixo); todas as frentes a 183 com amostras a cada 0,5 s (186 a cada 0,1 s). |
| P12 | Custo JS sem script nem log; «20 748 relógios» não batia com os 20 976 ticks da rota. | Script e saída commitados ([`logs/plan-cost.mjs`](logs/plan-cost.mjs), [`logs/plan-cost.jsonl`](logs/plan-cost.jsonl)): 20 976 ticks; primeira versão 197–209 µs por chamada, actual 67–70 µs (Node relativo). |
| P13 | Afirmações sem artefacto: o probe de rascunho «25 px», os números 87/739 de `bdfbab7` e «capturas antes/depois idênticas». | O probe de rascunho deu lugar aos frames 13 e 15, commitados. Os relatórios de `3e0d8e7`, `bdfbab7` e `24d2ed7` estão em `logs/`. Conferido: <ul><li>a cache não muda nenhum dos 12 frames;</li><li>as colunas mudam player-11 (87 → 389) e eye-12 (739 → 4000);</li><li>também mudam eye-06/07, o que corrige «os outros frames não mudam».</li></ul> |
| P14 | As composições lado a lado não tinham ferramenta commitada. | [`logs/sheets.py`](logs/sheets.py) commitado e referido em CAPTURES. |
| P15 | O ponto de vista era descrito como o pátio da estação; o olho está na cabeça de ponte oeste. | Corrigido: cabeça de ponte oeste, entre os aterros ferroviário e rodoviário. |
| P16 | Comentários: «sobrestimam» (os cantos subestimavam a dispersão), «100–570 m», «~260 baldes», cor de traçante da resposta nunca usada. | <ul><li>A dispersão do voo é agora exacta: distância mínima entre caixas e máxima entre cantos. Para as mesmas caixas dá o mesmo look-back que a fórmula dos cantos (17 com a caixa antiga); com a nova caixa dos impactos (P5) o look-back das peças é 15.</li><li>Os comentários passam a dizer 100–674 m e 275 baldes.</li><li>A cor morta foi retirada.</li><li>A linha norte só existe depois do contacto norte (nit latente do verificador), com teste.</li></ul> |
| P17 | Só o teste de navegador focado tinha corrido. | Suíte integral de navegador corrida em `5c5eed1` (runtime `6ffa820`): 54/63. As 9 falhas foram comparadas com a base, e as que não se explicavam foram repetidas sem carga ([`EVIDENCE.md`](EVIDENCE.md)). |

Depois das correcções repeti 8 mutações numa cópia descartável, só com o teste focado. Incluem as três que sobreviviam (M6, M7, M12). Todas foram apanhadas:
- aviões até 4 por elemento (M6);
- reset do restore sem identidade do mundo (M7);
- resposta 0,05 s depois do primeiro tiro (M12);
- pool de puffs 168;
- `Math.random` no plano (agora também apanhada pelo próprio teste de pureza);
- linha norte sem gate;
- caixa antiga dos impactos das peças;
- figuras 600 m mais perto.

Voos de avião mais longos também são apanhados.

## Segunda verificação independente

Verificador: subagente independente, só leitura, sobre `16ba780..3fbeffb`, sem navegador. **Sem bloqueadores.** O que fez:
- confirmou as correcções de código e a tabela de distâncias, com medições próprias;
- conferiu os logs, as capturas e os relatórios históricos, e verificou a higiene;
- repetiu as mutações: todas apanhadas, excepto três esperadas:
  - mover só o destino dos grupos (nunca lá chegam durante a vida);
  - repor o corte antigo dos aviões em 21 (nunca dispara);
  - look-back de 11 baldes (F4).

Resolução em `4763521` (testes e comentários; bundle igual) e no commit de documentação seguinte:

| # | Constatação | Resolução |
|---|---|---|
| F1 | O comentário do plano, P11 e o commit `6ffa820` diziam que a rota chega a ~165 puffs. Chega a 145, também em `16ba780`. Todas as frentes: 183 (amostras a 0,5 s) / 186 (a 0,1 s). | Comentário corrigido. O teste dos pools escreve os picos no log: rota 145, todas as frentes 183 ([`logs/node.log`](logs/node.log)). |
| F2 | «06–08 e 14 um pouco mais a norte»: esse olho está ~12 m a leste e ~12 m a sul do bolso, sobre o aterro rodoviário (chão a −0,35 m contra −3 m). É por isso que vê a frente norte. | CAPTURES e HANDOFF corrigidos. Do bolso, a frente norte também fica tapada: inferência geométrica com `traceTerrain`, escrita como tal. |
| F3 | P16 dizia «com o mesmo valor de look-back». O look-back das peças passou de 17 para 15 com a nova caixa. | P16 corrigido. |
| F4 | `LOOKBACK` exportado sem teste: um look-back de 11 passava. | Asserção nova: `(LOOKBACK−1)·BUCKET ≥ 0,3 s + dispersão dos tempos de voo amostrados`. Apanha look-back 11 e 13, look-back sem a dispersão e o do morteiro a 1. |
| F5 | «Dentro de S4»: só ≥800 m é garantido, e as peças e a coluna longínqua ficam além de S4. O teste só verificava uma constante. | Redacção: «≥800 m (limite inferior de S4)», com as peças e a coluna no horizonte. Asserção nova, por construção: a caixa que abrange as duas caixas de cada linha fica à distância do sector. Apanha as obras 60 m mais perto. |
| F6 | Os morteiros também caem na linha dos atacantes: 854–1504 m. | HANDOFF corrigido (linha própria na tabela). |
| F7 | Topo das colunas, máximo da fórmula: ~210 m (quinta), ~400 m (coluna longínqua, sem fogo), ~165 m (viatura). O comentário do renderer atribuía os 400 m a um fogo. | HANDOFF e comentário do renderer corrigidos. |
| F8 | «Por construção» para o limite do pool dos aviões e em P5: eram verificações por amostragem. | Redacção corrigida em P5, P9, HANDOFF, EVIDENCE e no comentário do teste. P5 tem agora também a verificação geométrica (F5). |
| F9 | «A sudeste» e «da margem leste» sem captura. | Marcados como inferência geométrica sobre o campo de alturas do gameplay (`traceTerrain`, que ignora edifícios), com os números medidos. |
| F10 | A falta de memória não tinha artefacto; as falhas da base em `:337` e `:386` não citavam log; não se dizia de onde vêm os logs da base. | [`logs/oom-kills.txt`](logs/oom-kills.txt): as linhas do kernel, sem caminhos de cgroup. EVIDENCE cita `base-look3.log` (linha 351 do spec) e `base-failing7.log` (linha 399) e diz de onde vêm os logs da base. |
| F11 | «Custo por frame igual à base», com n = 2. | «Sem diferença acima do ruído (n = 2 por braço, SwiftShader)». |
| F12 | Os recortes 4× não tinham ferramenta. | Modo `zoom` em `sheets.py`. Regenerados, os recortes saem idênticos byte a byte aos commitados. |

Depois das correcções, outras 8 mutações numa cópia descartável, só com o teste focado. Todas foram apanhadas:
- look-back das peças 11 ou 13;
- look-back sem a dispersão dos voos;
- look-back do morteiro 1;
- a caixa antiga dos impactos das peças;
- as obras de campo 60 m mais perto (apanhada pela verificação geométrica);
- a linha sul de Lisewo 20 m mais perto;
- pool de puffs 168.

Testes em `4763521`:
- focado: 17/17;
- Node: 341/341;
- build: o mesmo bundle, com os mesmos hashes de conteúdo.
