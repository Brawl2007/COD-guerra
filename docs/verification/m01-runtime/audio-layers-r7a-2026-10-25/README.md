# R7-a — camadas de áudio (rio, ferrovia, outra margem, guarda de repetição, etiqueta provisória)

Base: candidata #80 (`cdb33864`). Só apresentação: nada em `src/game` muda o comportamento da simulação, `mission.json` nem os golden. **Ninguém ouviu nada**: tudo o que está abaixo é estrutura de dados, grafo (contexto Web Audio falso) e números; os níveis são afinados no papel e precisam de uma audição humana.

## O que mudou
1. **Cama contínua do Vístula** (`RIVER_LAYERS`, `riverBedMix`, loop `river` em `audio.js`). Quatro camadas de ruído sintetizado (castanho 0,41/0,53 e branco 0,61/0,83 de velocidade de leitura); os períodos de buffer (16,7 / 12,9 / 3,9 / 2,9 s) só voltam a alinhar-se ao fim de milhares de milhões de segundos e os níveis moduladores usam ruído de valor com células 29,7 / 17,3 / 11,9 / 7,3 / 43,1 s (sem período < 60 s). Canal lido de `missions/m01-tczew/map-layout.json` (`vistula_channel`, x 25…265). Ganho = 1/(1 + distância à margem/50 m): 1,00 sobre a água (tabuleiro), 0,13 no pátio oeste (x −352), 0,09 em x −460. Pan para a água mais próxima; a perda de agudos vem da distância à margem.
2. **Ambiente ferroviário** (`railAmbiencePhase`, `planRailAmbienceSlot`): janelas de 2,5 s com cascata de engates, rangido de vagão, batente, sopro de vapor (nunca o mesmo tipo em janelas seguidas, com silêncios) na posição do pátio de vagões (−352, 1, 8). Depois de o `station_bomb` soar: acaba a manobra e o vapor, ficam tiques raros de metal a arrefecer; 5 s de silêncio após qualquer sopro audível. A locomotiva/panzerzug continuam com os loops existentes quando chegam.
3. **Outra margem** (`acousticBand(d,{water})` → banda `far-bank`, `waterCrossing`, `farBankTreatment`, `planWeaponShot({water})`, `acousticShape({water})`): com ≥ 60 m de água aberta entre ouvinte e fonte (e ≥ 90 m), o tiro ganha brilho de reflexo (`water-sheen`), 1–2 rebotes de margem (`water-slap`, atraso 0,14–0,7 s conforme a água), estalo/cauda com menos agudos e o filtro de ar da voz desce até −42 %, com mais envio de ambiente. O diretor (emissores) e o evento `enemy-fire` (em `game.js`) passam `water`; o `ckmBurst` do ckm aliado não (fica a oeste). Fogo do jogador/perigo nunca é “outra margem”.
4. **Guarda de repetição** (`VariantTracker` em `battlefield-audio.js`, um por `AudioManager`): nunca a mesma variante duas vezes seguidas por grupo e, com ≥ 4 variantes, evita também A-B-A; determinista (ordem de eventos + ids). Aplicada a tiros (fuzil/MG), impactos, passos, estalos de bala, explosões e pancada no jogador.
5. **Etiqueta provisória**: «Áudio provisório sintetizado — gravações finais pendentes (T45)» no painel MISTURA do menu e no cartão de pausa (`index.html`; constante `AUDIO_PROVISIONAL_LABEL`). Nada no HUD.

## Auditoria de repetição (rota de controlo, seed 19390901, headless)
`node tools/verification/m01-audio-repetition-audit.mjs` — conduz a simulação real (`tests/helpers/m01-route.js`), mapeia os eventos para as mesmas chamadas do `Game` e regista a variante estrutural escolhida. Dados completos em `REPETITION_AUDIT.json`. Antes = hash sem memória (`variantGuard:false`); depois = guarda.

| Secção | eventos | maior sequência igual antes → depois | repetições seguidas (pior grupo) antes → depois | ABAB antes → depois |
|---|---|---|---|---|
| Passos | 3519 | 12 → 1 | 50 % → 0 % | 256 → 916 |
| Tiros de fuzil | 2597 | 6 → 1 | 25,3 % → 0 % | 103 → 0 |
| Rajadas MG | 7659 | 7 → 1 | 25,3 % → 0 % | 374 → 0 |
| Impactos | 792 | 5 → 1 | 33,7 % → 0 % | 58 → 189 |
| Estalos de bala | 390 | 8 → 1 | 36,2 % → 0 % | 26 → 104 |
| Explosões | 20 | 3 → 1 | 36,8 % → 0 % | 2 → 6 |
| Ladridos (62 falas) | 62 | 1 → 1 | 0 % → 0 % | 0 → 0 |

6657 escolhas foram corrigidas pela guarda. Limitação honesta: com **3 variantes** (passos, impactos, estalos, explosões) “não repetir a última” deixa 2 opções, por isso o padrão A-B-A-B aumenta (é o preço; forçar ciclo A-B-C seria um ciclo audível pior). Com 4 variantes (tiros, MG) ABAB é 0. O “período de quadrado” máximo (janela repetida de 8–10 itens) é compatível com o acaso em milhares de eventos com 2 opções; não foi tratado como defeito. Os ladridos já rodam por grupos de variantes em `m01-barks.js` (sem repetição seguida na rota; não alterado). Não medi a repetição de ordens militares gravadas (não existem: T45 pendente).

## Testes
`tests/m01-audio-layers-r7a.test.js` (10 testes: ganho do rio por posição, ausência de loop < 60 s, loop no gestor, tratamento de outra margem, guarda de repetição, ambiente ferroviário por fase/evento, etiqueta). Ver o relatório final para os resultados de `npm test` e `npm run build`.

## Por ouvir / incertezas
Níveis do rio, volume e densidade da manobra, atraso e ganho dos rebotes da margem e o realismo geral só se validam a ouvir. O limite de loops passou de 8 para 10 (`AUDIO_LIMITS.maxLoops`) para acomodar o rio.
