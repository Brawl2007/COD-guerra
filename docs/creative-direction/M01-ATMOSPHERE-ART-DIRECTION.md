# M01 — ATMOSPHERE ART DIRECTION BIBLE · Sombria, fria, dessaturada, cinematográfica

**Estado:** PROPOSTA DE DIREÇÃO DE ARTE sobre os sistemas existentes. Não substitui shaders, partículas ou assets aprovados; afina valores e acrescenta camadas pequenas, todas de apresentação, com prova por capturas A/B (fixtures de câmara + estado congelado, método já usado pelas entregas). **Respeita o clima documentado:** início de setembro seco e quente (T15); sem chuva, tempestade ou nevoeiro denso; névoa fina sobre o rio só até 05:00 e opcional.

## 0. Identidade em uma frase

**Aço, água e poeira à luz rasante.** Uma manhã de fim de verão que começa azul-cinza, passa a amarelo-frio quando o Sol nasce atrás do inimigo, e acaba castanha de poeira. A "sombra" de M01 não é escuridão: é **dessaturação, contraluz e fumo acumulado**.

## 1. Paleta mestra

| Nome | Hex | Uso |
| --- | --- | --- |
| Aço (bridge steel) | `#4a5157` | treliças, vigas (já: `bridgeSteel` dielétrico cinzento-esverdeado envelhecido) |
| Aço frio (sombra) | `#3d4347` | metal em sombra, carris |
| Azul de madrugada | `#5b6b7a` | céu baixo 04:30, água |
| Verde militar apagado | `#5a6048` | uniformes wz.36 (ligeiramente mais cáqui: `#6b6a4f`), lona |
| Castanho de terra | `#4e4236` | aterro, crateras, lama |
| Madeira envelhecida | `#6b553c` | travessas, barracão, tabuleiro |
| Fuligem | `#2a2825` | fumo escuro, queimados, interior do abrigo |
| Poeira | `#8a7a62` | poeira de terra, demolições (já: dust `#7d6f5c`/`#8d7c67`) |
| Poeira clara (alvenaria) | `#b9b09c` | estação bombardeada (já em decals `stone`) |
| Fumaça | `#5c5a55` | fumo de ponte/trem (já: `#454744`, `#4e4b45`) |
| Fogo | `#e97831` / `#ff9340` | só em explosões e no vagão (já) |
| Luz do Sol baixa | `#ffd0a0` | sol 04:51–06:00 (já `#ffe0b0`: propõe-se ligeiramente menos amarelo) |
| Céu de dia | `#b7bfc2` | fundo/névoa depois das 06:00 (já `#a8b2b0`) |
| Pele | atlas existente, dessaturado −8 % [B] | rostos em meia-luz |

**Regra de saturação:** nenhum material difuso acima de ~35 % de saturação exceto fogo, clarões, a faixa clara do céu e o esmalte da caneca (azul-escuro esmaltado, lascado: o único objeto "de cor" da missão — decisão: a caneca é azul-marinho com borda branca lascada).

## 2. Evolução da luz por hora (keyframes propostos sobre os existentes)

O renderer já interpola altitude/azimute do Sol por `layout.sun.keyframes` e deriva `daylight = clamp((alt+0,08)/0,4)`, fundo/névoa `#727f8c→#a8b2b0`, Sol `#ffe0b0` × `sin(alt)·5,8`, skylight `#b4c8df`/`#4b4435` × (1,6+0,22·daylight), exposição 1,08, ACES. Propõe-se uma **tabela por hora** em vez de uma interpolação linear única (implementação [A]: substituir as duas constantes de fundo por uma lista de keyframes de cor; [B] se exigir uniforms novos):

| Hora | Sol (alt/az) | Zénite | Horizonte | Névoa/fundo | Cor do Sol | Skylight / solo | Exposição | Nota |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 04:30 | −3,7° / 70° | `#11192a` | `#3a4654` (ENE `#6d7784`) | `#4f5a66` | — (sem direcional) | `#8ea0b8` / `#3a3630` ×1,45 | 1,00 | azul-cinza; o fogareiro é a única luz quente |
| 04:34 | −3,2° / 71° | `#131c2e` | `#44505e` | `#55606c` | — | idem | 1,00 | clarões saturam contra o céu escuro |
| 04:51 | 0° / 74° | `#2a3a4e` | `#9a9280` (ENE) | `#7c8690` | `#ffd0a0` ×0,9 | `#a9bccf` / `#453f35` ×1,55 | 1,04 | luz rasante na água; contraluz dos portões |
| 05:30 | +4,8° / 82° | `#3f5670` | `#a9ab9f` | `#8f9a9c` | `#ffd6ae` ×2,9 | `#b4c8df` / `#4b4435` ×1,65 | 1,06 | ofuscamento a leste |
| 06:10 | +10,6° / 90° | `#5a7591` | `#b1b6b3` | `#9ea8a8` | `#ffdcb8` ×4,2 | idem ×1,75 | 1,08 | a coluna da demolição recortada no Sol |
| 06:45 | +15° / 96° | `#6a86a3` | `#b7bfc2` | `#a6aeab` | `#ffe0bf` ×5,0 | idem ×1,80 | 1,08 | poeira iluminada por trás |
| 07:05 | +18,6° / 101° | `#7290ad` | `#bcc3c4` | `#aab1ae` | `#ffe3c4` ×5,4 | idem ×1,82 | 1,06 | luz clara e baixa no abrigo |

Princípios: (1) a altitude do Sol manda; nunca "fazer noite" para esconder gráfico; (2) o skylight desce em relação ao atual nas horas azuis para dar contraste ao fogareiro/lanterna; (3) a névoa de fundo acompanha o horizonte, não o zénite.

## 3. Céu

- **Shader existente** (`m01-atmosphere.js`): horizonte/zénite por `day`, nuvens por textura procedural, disco solar suave. Propostas: [A] as cores de horizonte/zénite passam a ler a tabela acima (dois `vec3` por hora); [B] **gradiente ENE** (a faixa clara é assimétrica: mais clara a 70–80°, que é onde os aviões aparecem); [B] nuvens: 2–3 bandas finas altas (cirrostratus) e ≤ 20 % de cobertura; sem cumulus "alegres"; cor das nuvens ao nascer `#c9b6a2` só na borda; [B] **fumo acumulado no céu**: uma camada de "haze" cuja opacidade cresce com o número de registos de dano com `smokeVisible` (0 → 0,35 ao fim da missão), tingindo o horizonte a oeste (pátio) e a leste (ponte) de `#8d8680`.
- **Sem**: céu azul saturado, arco-íris, raios de deus volumétricos (não há sistema; propõe-se glare, abaixo).

## 4. Luz solar, sombras e ofuscamento

- **Sombras:** já existem direcionais (`castShadow` quando alt > 0) e de contacto (atores, vagões, copas). Propõe-se [A] viés de sombra para sombras longas (05:30–06:40) sem acne; [B] sombras das torres de 23 m legíveis a 70 m (mapa de sombra 1024²: ajustar frustum do Sol à área jogável à volta do jogador).
- **Ofuscamento [B]:** sprite de glare (billboard aditivo, `fog:false`, `toneMapped:false`) na direção do Sol quando o olhar está a ±25°; intensidade `smoothstep` até 0,55 de cobertura do ecrã a 0°; **nunca cega totalmente** (o jogador tem de poder ver o clarão da MG dos portões dentro do glare: a MG fica a 90° e o Sol a 82–90°: o glare é o conflito de design pretendido). Reduzível nas opções (flashes).
- **Interior do abrigo (07:05):** sem direcional direta; skylight `#8c8f8a` ×0,6; uma "faixa" de luz pela boca (plano emissivo suave [B]); poeira em suspensão (puffs finos, `dust`, 12–20 instâncias, movimento 0,05 m/s) [A].

## 5. Névoa, fumo e poeira (sistemas existentes, afinação)

| Sistema | Existe | Proposta |
| --- | --- | --- |
| Névoa de cena | cor = fundo; densidade fixa | [A] densidade por hora: 04:30 0,0019; 05:30 0,0014; 07:05 0,0011 (ar seco; a névoa é poeira/fumo, não água) |
| Névoa baixa do rio | não | [B] plano/puffs a y −10…−8 sobre x 25–265, opacidade 0,25 às 04:30 → 0 às 05:00; nunca acima de y −7 (não tapa S2) |
| Fumo de dano (bomba/demolição/vagão) | pools por qualidade (112/192/256), cores por fase | [A] cor da demolição ao nascer: fase 1 `#5a5145` ok; fase 3 `#969188` → `#a39c90` (poeira seca); [A] o vagão arde até ao fim (já `endFade=1`): manter |
| Fumo de boca, poeira de impacto | `gunSmoke`, `puff/dust` por material | ok; [A] poeira de impacto em terra ligeiramente mais clara ao Sol (×1,1 lum) |
| Poeira de pressão de explosão | FX V3 (`dustReach`, `smokeRise`) | ok; [A] demolição oeste: `smokeRise` +10 % (coluna mais alta a 210 m), dentro dos limites |
| Haze de céu | não | [B] ver §3 |
| Decals (marcas, queimados, crateras, resíduo) | V1 | [A] tom dos queimados de demolição ligeiramente mais quente ao Sol (`#4a4036`) para ler no terreno escuro (limitação conhecida da V1) |

## 6. Materiais (desgaste, humidade, fuligem)

| Superfície | Estado | Direção |
| --- | --- | --- |
| Aço das pontes | `bridgeSteel` V2 (pintura dielétrica envelhecida, rebites High) | manter; [A] escurecer 6 % nas zonas de sombra via AO por vértice se existir; sem reflexos metálicos |
| Tabuleiro de madeira | travessas abertas, tábuas (V2) | [A] creosote mais escuro nas tábuas centrais (passagem) e mais claro nas bordas; marcas de rodas [B] |
| Estação (Station V2/V3) | tijolo 27×9 cm, humidade na base, cinco volumes | manter; [A] fuligem acima das janelas da fachada norte depois das 04:34 (decal V1 já tenta; aumentar contraste); [B] vidros opacos → `#2c3236` sem reflexo |
| Terreno | máscaras de terra/humidade/verde (Env. Pass) | [A] reduzir verde 15 % (fim de verão seco: relva amarelada `#8a8a5a`); [A] mais terra compactada nos corredores |
| Vegetação | 8 espécies, 716 arbustos (V1) | [A] desaturar copas 12 %; bétulas mantêm o tronco claro (único "branco" natural); [A] 19 copas danificadas junto da cabeça de ponte (já) ganham tom `#6b5a46` |
| Água | não metálica, rugosa, ripple (Env. Pass) | [A] cor por hora: 04:30 `#1d2730`; 05:30 reflexo quente `#6f6a5a` só na direção do Sol; 06:45 `#5a6368` |
| Uniformes | atlas PL/DE (Soldier Visual Variation em integração) | [A] misturar wz.36 e modelo anterior; sujidade progressiva por hora (variação por `clock` [B]); Rusek "sujo de fuligem" |
| Sacos de areia | textura procedural | [B] variante desfeita (saco rasgado com terra) para o posto avançado e para coberturas atingidas |

## 7. Por setor (composição)

| Setor | Dominante | Contraste | O que nunca fazer |
| --- | --- | --- | --- |
| S1 cabeça de ponte | aço e terra | o fogareiro (04:30), os clarões a 1,2 km, o Sol atrás | "limpar" os sacos; relva verde no aterro |
| S2 Lisewo | silhuetas e fumo | a coluna das 06:10 contra o Sol | mostrar rostos; céu saturado por trás |
| S3 estação | tijolo e cinza | o vagão a arder (única chama contínua) | estação intacta depois das 04:34 |
| S4 norte | nada | uma coluna de fumo fina | clarões de dia (invisíveis) |
| S5 céu | gradiente ENE | silhuetas Ju 87 | nuvens "de postal" |

## 8. Evolução por fase (resumo visual)

```
04:30  azul-cinza, uma luz quente (fogareiro)      ──►  04:34  três flashes, poeira recortada na faixa clara
04:51  luz rasante, água com reflexo, contraluz    ──►  05:30  ofuscamento a leste, sombras de 70 m
06:10  coluna escura contra o Sol                  ──►  06:45  poeira iluminada por trás, sobre a água
07:05  luz clara e baixa, poeira no abrigo, fumo acumulado no horizonte
```

## 9. Antes / depois (o que uma imagem deve transmitir)

| Momento | Antes (V5) | Depois (direção) |
| --- | --- | --- |
| Abertura | céu azul-escuro genérico, skylight alto | azul-cinza com faixa ENE assimétrica, skylight baixo, fogareiro como ponto quente |
| Reparo | sol amarelo, terreno com verde | luz rasante, água com reflexo, terreno castanho, clarões como único ponto na água |
| Contra o sol | sol como luz | sol como obstáculo (glare), sombras de torre como corredores |
| Demolição leste | coluna cinzenta | coluna escura recortada no Sol, fumo a tingir o horizonte |
| Demolição oeste | poeira | poeira iluminada por trás, deslizando para norte sobre a água |
| Chamada | interior igual ao exterior | faixa de luz, poeira em suspensão, rostos em meia-luz |

## 10. Método de prova e limites

- Capturas A/B com os fixtures existentes (`tools/verification/m01-*-fixtures.mjs`, câmaras fixas, estado congelado, hash igual), **sete horas** (04:30, 04:34+6 s, 04:51, 05:30, 06:10+3 s, 06:45+6 s, 07:05) × High/Medium/Low.
- Contadores `renderer.info` antes/depois; sem FPS inventado; Chromebook por medir.
- Nenhuma proposta altera gameplay, colisão, RNG ou eventos; a equivalência de rota (snapshot igual) é obrigatória.
- Limites honestos: sem volumétricos, sem AO de ecrã, sem reflexos de água; as árvores são cartões/lóbulos; os humanos são o kit provisório; a "atmosfera" sem rostos/animação convincentes continua a ser de protótipo. Esta direção dá à missão identidade de imagem, não arte final.
