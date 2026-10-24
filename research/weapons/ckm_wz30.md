# Ficha: ckm wz.30 (metralhadora pesada polaca)

Arma fixa do oeste de M01. Até T47 estava na seteira sul da casamata oeste (que não vê nenhum alemão); desde T47 está num abrigo de campanha no aterro entre as pontes, o posto S2 (`RECONSTRUCTED`: nenhuma fonte dá a posição da ckm). Em `mission.json` é o grupo `grp_ckm_crew` (3 homens, `weapon: "ckm_wz30"`, posto `cv_ckm_post`, feature `ckm_post`); a guarnição tem de sair antes de `evt_m01_west_demolition`.
Fontes: T34 (*Ckm wz. 30*, Wikipédia en/pl; muzeum.skarzysko.pl; opisybroni.pl; 1939.pl; dobroni.pl; mhki.kielce.eu e polski-kolekcjoner.pl para a caixa de fita; imfdb.org; comparação com a *M1917 Browning*). T03 confirma pelotões de metralhadoras no batalhão.
Estado: **ficha preliminar**. Os dados vêm de resumos de busca concordantes. As páginas não foram lidas por inteiro, porque `wikipedia.org` e vários museus estão bloqueados neste ambiente.

## 1. Identidade histórica

| Campo | Valor | Certeza |
| --- | --- | --- |
| Designação | *ciężki karabin maszynowy wz. 30* (ckm wz.30) | ALTA |
| Origem | Cópia polaca, sem licença, da Browning M1917 (arrefecida a água), em 7,92 × 57 mm. Produzida pela Państwowa Fabryka Karabinów, 1931–1939, mais de 10 000 unidades | MÉDIA (T34) |
| Variante modelada | Arma de série de 1939: manga de água lisa com tapa-chamas cónico (*lejek*) e punho de pistola de madeira, num tripé de 1939 na posição baixa. A geometria do tripé é estimada e não distingue o wz.30 do wz.34; o adaptador antiaéreo não foi modelado. A alteração do mecanismo do gatilho de 1938 não se distingue nas fotografias resumidas. Não é a M1917A1 americana | MÉDIA |
| Em M01 | Fogo de supressão de longo alcance (~1050 m) do posto S2 sobre os atiradores dos portões de Lisewo, de 04:46 até 30 s antes da demolição leste; NPCs, nunca arma do jogador | — |

## 2. Dados técnicos documentados

| Dado | Valor | Certeza |
| --- | --- | --- |
| Calibre | 7,92 × 57 mm Mauser | ALTA |
| Comprimento total | 1200 mm, com o tapa-chamas cónico | MÉDIA (T34) |
| Cano | 720 mm | MÉDIA (T34) |
| Massa | 13,6 kg sem água; ~65 kg em combate com tripé, água e munição | MÉDIA (T34) |
| Arrefecimento | Água, manga de ~3 l | MÉDIA (T34) |
| Alimentação | Fita de tecido de **330** cartuchos, entrando pela **esquerda** | MÉDIA (T34; igual à M1917) |
| Cadência | 600 tiros/min teóricos; 400–450 práticos | MÉDIA (T34) |
| Velocidade inicial | ~845 m/s | BAIXA (depende da munição) |
| Miras | Massa na frente da manga; alça em quadro até 2000 m | MÉDIA (T34) |
| Tripé wz.30 | 29,3 kg; altura máxima 880 mm | MÉDIA (T34) |
| Tripé wz.34 | 26,3 kg; adaptação ao tiro antiaéreo | MÉDIA (T34) |
| Caixa de fita | Aço pintado de caqui, 355 × 175 × 85 mm, pegas em cima e nos lados (Huta Ludwików, Kielce) | MÉDIA (T34: mhki.kielce.eu, polski-kolekcjoner.pl) |
| Guarnição | 3 (atirador, municiador e mais um) | MÉDIA |

## 3. Comportamento no jogo

Os valores desta ficha não mudam as regras do jogo por si. O emissor sonoro `ae_s2_ckm_east` existe à parte (a ckm do pelotão leste). Desde T47 a simulação liga a arma: rajada de 8 tiros a 0,1 s (600 tiros/min cíclicos, os do clip `fire_burst`), fita de **330** cartuchos (a da ficha; 41 rajadas gastam 328 e a fita é trocada na fase `feed` de 3,2 s), cooldown de 3–7 s entre rajadas e fogo só sobre o atirador alemão que disparou nos últimos 10 s com linha livre. A cadência prática de 400–450 tiros/min não é usada: o jogo segue o clip. **Encravamentos (2026-10-22, decisão do proprietário):** a arma encrava duas vezes por rota (tabela `CKM_STOPPAGES` em `src/game/m01-simulation.js`: ao ir disparar a 14.ª rajada, por volta das 04:58, e a 45.ª, no fim da espera, 3,8 e 4,6 s). Não há fonte histórica para a taxa nem para os instantes (T34 não os dá): são balanço de jogo, escolhidos para o jogador poder ver e ouvir a guarnição desencravar; não são fiabilidade medida da arma. O municiador desencrava com o gesto do clip `feed` já autorado (ponta da fita para dentro, alavanca atrás duas vezes) e diz «Pronto. Atire!» (115); o atirador chama «Travou! Recarregar!» (114). Sem tiros durante o encravamento; a fita não gasta cartuchos; nenhum sorteio. Ver `docs/verification/m01-runtime/ckm-jam-2026-10-22/README.md`. Dispersão, dano e supressão são balanço de jogo (zona batida acima dos alvos, a ~1050 m), não balística medida; ver `DEVELOPMENT_STATUS.md` (entrada T47) e `docs/verification/m01-runtime/ckm-fire-live-2026-10-16/`.

## 4. Modelo 3D (provisório verificado)

| Item | Especificação |
| --- | --- |
| Ficheiros | `assets/models/provisional/m01/weapons/ckm_wz30/m01_ckm_wz30_lod{0,1,2}.glb`, `m01_ckm_wz30_animations.glb` e `manifest.json` |
| Escala | 1 unidade = 1 m, +Y para cima, cano para −Z. Comprimento da arma 1,211 m (teste: 1,2 m ± 2 %). Eixo do cano a 0,64 m do chão (tripé baixo) |
| Peças | tripé; direcção (`ckm_traverse`, pião); elevação (`ckm_elevate`, munhões; contém a arma); alavanca de armar; fita na alimentação; fita vazia; fita livre até à caixa; caixa; tampa (aberta 110°) |
| Medidas estimadas | Diâmetro e comprimento da manga, cone, caixa da culatra, punho, alturas das miras, pernas e sapatas do tripé, passo da fita (16 mm) e curso da alavanca. Todas marcadas `estimated` no manifesto |
| Triângulos | LOD0 3904 (era 5004; reduzido para o orçamento de 4000) · LOD1 2298 · LOD2 754 (9 malhas, um material) |

## 5. Pendências

- Ler T34 por inteiro (Wikipédia pl, opisybroni, museus) e confirmar: diâmetro e comprimento da manga, forma do cone e geometria do tripé wz.30 (posição das pernas, barra de direcção, assento).
- Confirmar se a casamata de Tczew tinha o tripé wz.30 ou o wz.34, e a altura da seteira (ver a sugestão de integração em `docs/assets/m01-ckm-wz30/README.md`).
- Confirmar a função do terceiro homem da guarnição.
- Som: só gravações originais ou CC0; nada extraído de jogos.
