# M01 — áudio de campo de batalha, production pass v1 (2026-10-07/08)

Task `M01-BATTLEFIELD-AUDIO-PRODUCTION-PASS-V1`, branch `codex/m01-battlefield-audio-production-pass-v1`, base `99309d9c`.

## O que mudou

Todo o som continua **sintetizado em Web Audio** (ruído + osciladores, sem amostras, nada extraído de COD). A simulação continua a única autoridade: o áudio só lê eventos já emitidos (`enemy-fire`, `round-impact`, `m01-blast`, `npc-shot`, `player-shot`, `distant-shot`) e o `renderState`; não recebe o RNG de jogo nem escreve estado.

- `src/core/battlefield-audio.js` (novo, puro e testável em Node): acústica (bandas 45/220/950 m, atenuação contínua por categoria, absorção do ar, envio para reverberação, sombra da cabeça para fontes atrás), perfis de armas, planos de camadas ("grãos") para disparos, rajadas, estalo/zumbido de balas, impactos por material com ricochete, explosões (granada/bomba/demolição), destroços, tensão de metal, demolição da ponte, artilharia longínqua, chegada de comboios, locomotiva parada, saída de picada do Ju 87, estalidos de fogo, intensidade dinâmica, agendador da batalha longínqua e emissores de M01.
- `src/core/audio.js` (reescrito, mantém a API antiga): buses (armas, jogador, impactos, explosões, longínquo, veículos, ambiente) → filtro de concussão → compressor → master; reverberação exterior procedural (convolver, reflexões de casario/aterro + cauda escura); vozes = eventos com vários grãos; limites por categoria + 32 vozes globais + orçamento de fontes vivas por qualidade; corte de grãos inaudíveis; libertação com rampa (sem cliques); loops com entrada em rampa, deriva lenta de velocidade (sem ciclo reconhecível) e ruído castanho sem costura; ducking/concussão "vence o mais fundo".
- `src/world/m01-aircraft-path.js`: trajectória dos Ju 87 partilhada pelo renderer e pelo áudio (o motor ouve-se onde o avião se vê; comparação bit a bit igual à fórmula anterior).
- `src/game/game.js`: só passa dados ao áudio (frente/trás, altura, fonte da arma, fase, qualidade).

### Identidades das armas

| Arma | Assinatura sintetizada |
|---|---|
| wz.29 do jogador | camadas/tempos estabelecidos (estalo 0,26 s, corpo 78 Hz, cauda a 0,15 s) + reflexão |
| Kar98k (alemão) | estalo agudo em passa-alto 3,1 kHz, "boom" 1,15 kHz |
| wz.29 aliado | mesmo mecanismo do Kar98k: estalo em banda mais grave e "boom" mais cheio — **escolha de mistura** para distinguir fogo amigo/inimigo, não diferença balística |
| MG34 | corpo dente-de-serra 118 Hz curto, estalo 3,7 kHz, cadência 0,075 s (vinda da simulação) |
| rkm wz.28 | ferrolho aberto pesado (clique 640 Hz + 240 Hz), cadência 0,11 s |
| ckm wz.30 | o mais grave (corpo 64 Hz, estalo em banda 1,9 kHz), cadência 0,1 s |

**ckm wz.30: perfil pronto e testado, mas não toca em jogo** — a simulação ainda não decide disparos/munição da ckm (pendência registada no estado do projecto). Não se inventou fogo no áudio.

A MG34 deitada emite um evento por tiro; o áudio junta os tiros da mesma arma (fonte = posição da boca arredondada) numa voz de rajada, com caudas/eco reduzidos nos tiros seguintes.

## Provas

### Node
- `npm test`: **344/344** (`node-summary.txt`); base 324, +20 novos.
- `tests/m01-battlefield-audio.test.js` (20) e `tests/m01-audio-production.test.js` (9): identidades, bandas de distância, cadência, limites sob saturação, intensidade, agendador determinista e sem período curto, Ju 87, comboios, fogo, grafo/descarte sem nós perdidos, rampas de libertação, ducking, costura do ruído, orçamento de fontes, e **rota completa real de M01 com áudio ligado = mesma simulação, RNG e eventos que sem áudio**.

### Navegador (Chromium deste ambiente, `CHROME_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`)
- `tests/browser/m01-audio-offline-render.spec.js`: o AudioManager de produção renderiza cada som num `OfflineAudioContext` (mesmo grafo, compressor, reverberação); mede-se pico, centróide espectral, fracção < 250 Hz, decaimento, energia tardia e ataques. Passa.
- `tests/browser/m01-battlefield-audio-runtime.spec.js`: build de produção, estados guardados pela simulação (contacto MG34 real; demolição leste real). Passa (2/2).
- `audio/*.wav` + `audio/metrics.json`: 31 clips para **escuta humana** (mono (L+R)/2 a 22,05 kHz; as métricas são do estéreo).

Métricas seleccionadas (`metrics.json`):

| Clip | Pico | Centróide (Hz) | < 250 Hz | Decaimento (s) | Energia tardia |
|---|---:|---:|---:|---:|---:|
| Kar98k 15 m | 0.179 | 2815 | 0.13 | 0.28 | 0.001 |
| Kar98k 150 m | 0.043 | 1972 | 0.12 | 0.72 | 0.004 |
| Kar98k 600 m | 0.0089 | 545 | 0.63 | 1.77 | 0.081 |
| Kar98k 1400 m | 0.0028 | 238 | 0.74 | 2.21 | 0.141 |
| MG34 tiro 30 m | 0.093 | 3344 | 0.05 | 0.21 | 0.000 |
| rkm wz.28 tiro 30 m | 0.105 | 2653 | 0.16 | 0.24 | 0.001 |
| ckm wz.30 tiro 30 m | 0.082 | 1177 | 0.37 | 0.40 | 0.002 |
| MG34 por tiro (forma real) 30 m | 0.103 | 4833 | 0.04 | 0.65 | 0.397 |
| Granada 25 m | 0.213 | 201 | 0.94 | 1.08 | 0.036 |
| Bomba 80 m | 0.229 | 148 | 0.96 | 2.34 | 0.043 |
| Demolição da ponte 250 m | 0.163 | 90 | 0.95 | 4.29 | 0.316 |
| Mistura densa (demolição+granada+MG+estalo+wz.29) | 0.416 | 150 | 0.92 | 3.94 | 0.275 |
| Ju 87 formação perto / longe | 0.074 / 0.0065 | 278 / 153 | 0.76 / 0.85 | — | — |

Cadência medida nos ataques: MG34 ≈ 0,075 s (também na forma real por tiro), rkm ≈ 0,11 s, ckm ≈ 0,10 s. Nenhum clip passa de 1,0 nem tem NaN.

### Suíte de navegador integral e falhas pré-existentes
Corrida integral nesta branch (antes das correcções da revisão): 60 passaram, 4 falharam. As 4 foram repetidas na base `99309d9c` intacta:

| Teste | Base 99309d9c | Esta branch |
|---|---|---|
| `m01-audio-production.spec.js` (olhar para baixo por `mousemove` sintético) | falha igual (linha 53) | falha igual |
| `m01.spec.js` rigs/mãos (`weapon.mag`) | falha igual | falha igual |
| `m01.spec.js` fogo alemão no reparo (`pinned`) | falha igual | falha igual |
| `m01.spec.js` demolição dentro da treliça (rodar por `mousemove`) | 2/4 falham (intermitente) | 1/2 falha, mesma mensagem |

Conclusão: falhas do ambiente (rato sintético/temporização), não do áudio. Não se alterou nenhum desses testes.

## Verificação independente e revisão

Um Verifier e um Reviewer independentes analisaram a primeira versão. Confirmado: testes, ausência de mutação da simulação (estado congelado + snapshot/RNG iguais), caminhos da bancada antiga, equivalência bit a bit das trajectórias, segurança de recursos sob 6000 passos de stress (164 019 nós criados = descartados), métricas recalculadas a partir dos WAV. Corrigido depois da revisão:

- MG34 real (um evento por tiro) passava ao lado do desenho de rajada → tiros da mesma arma juntam-se numa voz; teste com a forma real e clip offline.
- cortes secos ao libertar vozes/loops → rampas de ~8 ms e entrada de loops em rampa; histerese 200/240 m no braseiro.
- grafo sem limite real de nós → orçamento de fontes vivas por qualidade (explosões/perigo/crítico passam sempre) e corte de grãos abaixo de ~-64 dB.
- ducking "último vence" → "mais fundo e libertação mais tardia vence"; concussão sem degrau e até ~0,9 kHz.
- costura do ruído castanho em loop → deriva removida, buffer de 6,83 s e deriva lenta da velocidade de leitura.
- INTRO sem actividade definida → INTRO/SETUP quase calados; fases desconhecidas 0,1.
- Ju 87: saída de picada só com a formação visível e a partir do avião mais próximo da trajectória partilhada.
- Doppler na volta do circuito (salto de 90 s) → saltos > 120 m/s não são velocidade.
- zumbido decidido pela distância do impacto → zumbido só em ricochetes próximos; o estalo continua a vir de `event.crack` da simulação.
- Stuka alto demais na mistura (RMS > bomba a 80 m) → loop do avião baixado (pico 0,234 → 0,074); granada mais presente; impactos +4 dB.
- qualidade: a reverberação é criada com a qualidade do renderer (baixa → resposta de 1,2 s).

Aceite sem alteração (documentado): a bancada francesa usa o mesmo motor e por isso também ganhou camadas/reverberação (continua seleccionável e funcional; `explosion` legacy recebe distância em unidades, como antes). `channel()` sem fontes é pré-existente e não tem chamadores.

## Limites honestos
- **Nenhum playtest de escuta humano** foi feito nesta sessão; as métricas provam forma e identidade do sinal, não gosto ou mistura final. Os WAV existem para essa escuta.
- **Sem medição de CPU/FPS** (nem Chromebook). Há orçamento de fontes e corte de grãos, mas o custo real no Chromebook continua por medir.
- ckm wz.30 sem disparo na simulação; o perfil não toca em jogo.
- Níveis afinados para uma mistura de jogo comprimida, não para SPL medido.
