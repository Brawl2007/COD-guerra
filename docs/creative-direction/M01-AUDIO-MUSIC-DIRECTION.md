# M01 — AUDIO & MUSIC DIRECTION · Fazer o jogador ouvir a guerra

**Estado:** PROPOSTA DE DIREÇÃO SONORA sobre o Battlefield Audio Production Pass V1 (em integração na V5). Tudo o que existe é **sintetizado em Web Audio** (sem amostras, nada extraído de jogos); a simulação é a única autoridade (o áudio só lê eventos emitidos e `renderState`). Esta direção afina, acrescenta camadas e define **o que não soa**. Classes [A]/[B]/[C].

## 0. O que já existe (não reinventar)

- **Buses:** armas, jogador, impactos, explosões, longínquo, veículos, ambiente → filtro de concussão → compressor → master; reverberação exterior procedural (reflexões de casario/aterro + cauda escura; resposta criada com a qualidade inicial).
- **Acústica:** bandas 45/220/950 m, atenuação por categoria, absorção do ar, envio para reverberação por distância, sombra da cabeça para fontes atrás; atraso 343 m/s para tudo o que é distante (`soundAt`, `pendingSounds`).
- **Perfis:** wz.29 do jogador (estalo 0,26 s, corpo 78 Hz), Kar98k, wz.29 aliado (mistura mais grave para distinguir amigo/inimigo), MG34 (0,075 s), rkm wz.28 (0,11 s), ckm wz.30 (pronta, **não toca** porque a simulação não decide fogo da ckm), estalo/zumbido de balas, impactos por material com ricochete, granada/bomba/demolição, destroços, tensão de metal, demolição da ponte, artilharia longínqua, chegada de comboio, locomotiva parada, saída de picada do Ju 87 (trajetória partilhada com o renderer), estalidos de fogo, **agendador de batalha longínqua por fase** (`PHASE_ACTIVITY`: INTRO/SETUP quase calados), emissores de M01, vento com rajadas, cama de batalha (`battle-bed`), ducking "o mais fundo vence", concussão, orçamento de fontes por qualidade, 32 vozes.
- **Verificação:** 31 WAV para escuta humana; métricas; equivalência de rota com áudio ligado.
- **Ainda não existe:** vozes gravadas (só legendas), passos, água do rio, apito de manobra, acústica interior (abrigo/casamata), música.

## 1. Princípios

1. **Ouvir antes de ver:** motores 40 s antes das bombas; estampidos 3 s depois dos clarões; a explosão leste 2 s depois do clarão; o norte 4 s depois.
2. **Perto e longe são timbres, não volumes** (já: bandas e perfis). Um Kar98k a 15 m estala; a 1,4 km é um "pop" grave com cauda.
3. **O silêncio é mixado.** Seis janelas de silêncio com ducking explícito (§4).
4. **A música não domina.** Um motivo, três aparições, nunca sobre feridos, mortos ou a chamada.
5. **Nenhuma voz inimiga.** A 700 m não se ouvem gritos; o inimigo é cadência.

## 2. Mapa sonoro por hora

| Hora | Primeiro plano (0–45 m) | Médio (45–220 m) | Longe (220–950 m) | Muito longe (> 950 m) | Mix |
| --- | --- | --- | --- | --- | --- |
| 04:30 | vento 0,02; o bule; a rkm a ser limpa; passos no cascalho; vozes | água sob ferro [B]; passos de Lipski | locomotiva de manobra, apito (até 04:33) [B] | — | tudo baixo; sem cama de batalha |
| 04:33:10 | vozes (012/013/066/067); respiração | — | — | motores dos Ju 87 a ENE→S, 40 s a crescer (já) | o apito cala-se; vento continua |
| 04:34 | sirene com Doppler; bomba 1 (água: `splash` [B] ou `bomb` + material water); capacete a ser posto (ViewModel [B]) | bomba 2 (terra), terra a cair na trincheira (debris) | bomba 3 (pátio): grave, cauda; vidros [B] | saída dos aviões | concussão; zumbido configurável |
| 04:36–04:45 | vozes; passos; o fogo do vagão a 300 m como referência (crepitar) | 017 de longe; o arrasto (cascalho [B]) | segunda passagem 04:40 (ronco alto + 3 explosões abafadas a oeste) | — | cama de batalha 0 |
| 04:45 | 025; wz.29 do jogador; ferrolho; clipe | rkm de Kowal; impactos nos sacos/encosta; estalos | — | chegada do trem 963 (`planTrainArrival`, já), locomotiva parada, MG34 a 1,2 km (3 s de atraso), Kar98k a 1,4 km | cama de batalha `MAIN_COMBAT` |
| 04:52 | — | — | — | Panzerzug (`panzerzugArrival`, já): metal pesado, rajadas | — |
| 05:04–05:30 | 031/032 | — | S2 sustentado (rajadas irregulares) | — | relógio 27×: **o som não acelera** (já: o áudio usa o relógio ativo, não o histórico) |
| 05:30–05:34 | 112/033/034 | — | explosões abafadas na cidade (`raid_0530`) | zumbido alto dos Do 17 (loop `aircraft` far [A]) | duck de S2 |
| 05:34–06:00 | salvas de ajuste: impactos no saco (terra), no ferro (metal, faísca), traçantes (zumbido só em ricochete próximo, já) | Pawlak a chegar (passos a correr [B]) | S2 | S4 a partir de 05:50 (`distantBattle` grave) | — |
| 06:00–06:10 | 039; passos no tabuleiro de madeira e ferro [B]; Bąk a respirar quando carregado [B]; apito 3× | pelotão a correr (passos em massa [B]) | MG34 dos alemães do tabuleiro (700 m) | — | — |
| **06:10:00** | **nada** (2,0–2,4 s) | — | — | — | o vento continua |
| 06:10:02 | estrondo (`planBridgeDemolition` a ~700 m), tensão de metal (`planMetalStress`), vibração | detritos no rio (4 s) | — | — | 2 s de duck total exceto vento (6,5–8,5 s) |
| 06:12–06:36 | 046/047/048/049; a guarnição a passar (metal da ckm, água [B]) | fogo esporádico do dique (impactos) | — | — | — |
| 06:36–06:45 | 050/051; passos; respiração | — | — | — | cama de batalha baixa |
| **06:45:00** | detonação a 210 m (0,6 s): a mais forte da missão; pressão; terra e lascas no posto (debris) | metal da ponte a ceder (stress, 3–5 s) | — | — | concussão máxima; zumbido reduzível |
| 06:45:08 | **só vento e água** | — | — | — | duck 3 s |
| 06:45:11 | 052; 125 | — | — | — | — |
| 07:05 | interior: respiração, cantil, a caneca a rodar [B], vozes com reverberação curta [B] | — | — | o norte (07:00): canhão AT seco + MGs, 4 s de atraso, abafados pela boca do abrigo | sem música |

## 3. Camadas novas propostas

| Camada | Classe | Descrição | Onde |
| --- | --- | --- | --- |
| Água do rio | B | loop de ruído castanho filtrado (120–600 Hz) com modulação lenta; fonte linear ao longo do canal (x 25–265); mais audível sob o tabuleiro e no posto avançado; mascarada pela cama de batalha | toda a missão |
| Apito de manobra / locomotiva de manobra | B | `planTrainArrival` já existe; apito: dois tons (≈ 520/660 Hz) com cauda, a 500 m, 2× entre 04:30 e 04:33; cala-se ao `planes_heard` | 04:30–04:33 |
| Passos do jogador | B | por material da superfície (`world` já sabe `earth`/`wood`/`metal`/`ballast`): cascalho, terra, madeira do tabuleiro, ferro; cadência por `moveBlend`/sprint; mais pesados a carregar | sempre |
| Passos de NPC em massa | C | 18 homens a correr em ferro: uma textura rítmica, não 18 fontes; derivada de `motion.odometer` (contrato V1) | 06:00–06:10 |
| Respiração de Bąk carregado | B | loop de respiração curta, ritmo 0,9 s, só enquanto `carrying='jozef_bak'` | 06:04+ |
| Acústica interior | B | abrigo (07:05) e, se visitável [C], casamata: reverberação curta (0,4 s), exteriores com filtro passa-baixo e −12 dB; transição ao cruzar a boca do abrigo (volume `shelter` já define altura −4) | 07:05 |
| Vozes (VO) | C | quando gravadas: fontes nos atores (pan/distância já disponíveis via `spatial()`), prioridade sobre ambiente, nunca "voz de rádio" | todas |
| Fumo do vagão a arder | A | `planFireCrackle` já existe; garantir fonte em (−352, 8) com histerese 200/240 m (já) | 04:34+ |
| Haze sonoro | A | subir a cama de batalha +0,02 por registo de dano com `smokeVisible` (o céu "soa" mais sujo) | progressivo |
| Vibração da ponte | A | `planMetalStress` a cada impacto de MG no portal/treliças quando o jogador está no tabuleiro (fonte: ponto de impacto, `metal`) | 05:30–06:10 |
| Carroças | C | rodas no cascalho + madeira a ranger, 05:40, S3 | 05:40 |

## 4. Contrato de silêncio (ducking explícito)

| Janela | Técnica (existente) | Parâmetros |
| --- | --- | --- |
| 04:33:10–04:34 | sem cama de batalha (`BUILDUP` 0,12 → propor 0,06 [A]); loop dos aviões é a única fonte distante | — |
| 05:30–05:34 | duck de `distant` −9 dB enquanto o loop `aircraft` far está acima de 0,3 | `duck()` já |
| 06:10:00–06:10:02 | **nenhuma nova fonte** além das já a tocar; o estrondo chega por `pendingSounds` | — |
| 06:10:06,5–06:10:08,5 | duck total exceto `ambience` (vento): `distant` −∞, `weapons` −18 dB | `cs_m01_east_blast` nota existente |
| 06:45:08–06:45:11 | idem, 3 s | — |
| 07:05 | sem cama de batalha; sem música; o norte a 07:00 chega filtrado | `OUTRO` 0,05 (já) |

## 5. Música

- **Política:** M01 quase não tem música. A emoção vem do campo de batalha.
- **Motivo "A Primeira Manhã" [C]:** uma viola (ou violoncelo) só, em registo grave, 8 compassos lentos (≈ 50 bpm), modo menor sem resolução; sem percussão, sem coro, sem metais. Síntese possível com o motor existente (osciladores + ruído filtrado), mas recomenda-se gravação real licenciada quando houver VO.
- **Aparições:** (1) sob as cartelas de abertura (3–11 s), cortado no fade-in; (2) muito baixo (−24 dB) sob o debrief, sem percussão; (3) **nunca** na chamada, nas demolições, nos resgates ou nas mortes.
- **Proibido:** música heroica, tambores militares, coro, "stinger" de objetivo concluído (o HUD V1 não tem som de objetivo: manter).

## 6. Assinaturas (identidade de cada fonte)

| Fonte | Assinatura (existente) | Direção |
| --- | --- | --- |
| wz.29 do jogador | estalo 0,26 s, corpo 78 Hz, cauda 0,15 s + reflexão; ferrolho e clipe como mecanismo | manter; o ferrolho é a "respiração" do jogador: garantir que se ouve sob a cama de batalha |
| Kar98k a 1,4 km | centróide 238 Hz, decaimento 2,2 s | manter; é o "pop" do dique |
| MG34 a 900 m | rajadas juntas numa voz | manter; **a cadência é o relógio do reparo** |
| rkm de Kowal | ferrolho aberto pesado, 0,11 s | manter |
| ckm wz.30 | o mais grave | **não toca** até a simulação decidir; não inventar |
| Ju 87 | motor 115 Hz + pás 75 Hz, Doppler, saída de picada | manter; às 05:30 só a mistura far, sem sirene |
| Bomba a 80 m | centróide 148 Hz, 2,3 s | manter |
| Demolição a 250 m | 90 Hz, 4,3 s, energia tardia | manter; a oeste (210 m) é a referência; a leste (700 m) chega com 2 s e menos agudos |
| Vento | loop com rajadas (`presentationNoise`) | subir 10 % nas janelas de silêncio para que o silêncio "tenha som" |

## 7. Acessibilidade e opções (existentes e propostas)

- Zumbido pós-explosão, concussão e tremor: reduzíveis (feedback V1).
- Legendas sempre com nome (HUD V1).
- [B] "Indicação de sons relevantes" nas legendas (ex.: *[apito dos sapadores]*, *[estrondo a leste]*) como opção.
- Volume separado por bus [B] (hoje: master).

## 8. Prova

- WAV offline por fonte nova (método do REPORT V1): pico, centróide, decaimento; nenhum clip > 1,0.
- Equivalência de rota com áudio ligado (já): obrigatória para cada camada nova.
- Escuta humana: pendente (como na V1). Nenhuma afirmação de "mistura final".
