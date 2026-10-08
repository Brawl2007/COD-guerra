# M05 — CÉU EM CHAMAS · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 15/9/1940, Inglaterra; Esquadrão 303 da RAF; POV Tomasz Malec; Hurricane do período; fonte H06; 18–24 min; três falas; checkpoints "decolagem; formação; proteção do ala; retorno recuperável"; assistência configurável; abortar aproximação permitido; falhar por risco real; não inventar a morte de piloto histórico (cadeira vazia). **Proposto:** a saída da **tarde** (~14:00–15:10, S-C01: a saída em que o esquadrão perdeu um piloto), ala ficcional Dębski, mecânico Wróbel, relógio, objetivos, flags. **Sistema:** avião jogável [C]/[D] — bancada do Marco 4 (Prompt §77).

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m05_london_303` / 5 |
| Datas | 1940-09-15T13:40+01:00 → 1940-09-15T15:20+01:00 (BST) |
| Local | RAF Northolt → sudeste de Londres → estuário do Tamisa → regresso (`RECONSTRUCTED`; aeródromo `EXACT` em silhueta) |
| Operação | "Battle of Britain Day"; 303: duas saídas, 15 reivindicações, 1 piloto morto, 1 saltou ileso (14:51, Dartford), 1 ferido regressou (D, S-C01) |
| Unidade | Esquadrão 303 (canónico); secção ficcional dentro do esquadrão |
| Elenco | Malec (POV, sierżant pilot), st. sierż. Ignacy Wróbel (mecânico), ppor. Kazimierz "Kazik" Dębski (ala ficcional), "Controlo" (voz), líder de secção ficcional por. Marian Zych (propostas) |
| Fora de cena | S/Ldr Kellett, Urbanowicz, Kent; o piloto perdido do esquadrão (nome só no debrief após fonte lida — P-C05) |
| Intocável | data, unidade, POV, aeronave, falas `dlg_m05_001–003`, checkpoints, "não exige destruir toda a formação", "cadeira vazia sem nome inventado", energia/combustível/munição reais |

---

## 1. Story Bible

**Logline.** Às duas da tarde de 15 de setembro, o sargento Malec sobe pela segunda vez no dia com o 303. Lá em cima há quatrocentos aviões; o que lhe cabe é uma passagem sobre os bombardeiros, uma escolta que reage e um ala que perde altura e pede para ficar com ele mais uma milha. Volta com as mãos a tremer. Na sala de espera há uma cadeira vazia.

**As oito respostas.**
1. **Situação central:** voltar com o ala importa mais do que somar vitórias.
2. **Modo de contar:** milhas com a asa de Dębski à vista (um contador discreto, não um placar).
3. **Objeto:** o remendo de tela no Hurricane (Wróbel toca-lhe antes; vê-o tremer num impacto; conta os furos depois).
4. **Silêncio:** o motor reduzido no regresso; a cadeira vazia.
5. **Tarefa que não é matar:** formar; navegar pelas chamadas do controlo; escoltar o ala; aterrar.
6. **Custo humano:** um piloto inimigo salta de paraquedas ao longe (causa: a passagem sobre a formação) → Malec pode olhá-lo / o rádio manda proteger a formação → nunca é alvo; se o jogador disparar sobre o paraquedas, `m05.enemy_pilot_fired_on` e Zych: "Não é assim que se conta." (reação única; sem recompensa).
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista as duas saídas, as reivindicações como reivindicações (não como vitórias verificadas), a perda de um piloto (sem nome até fonte lida), a batalha que continua.

**Três motivos.** (a) *Energia* — a missão ensina que um Hurricane não pára no ar; (b) *a asa dele* — ver o ala é a métrica; (c) *as mãos* — o custo chega depois do motor desligar.

**Temas.** Controlo e nervos; responsabilidade por uma pessoa num céu de centenas; luto sem contagem; a vitória que não se conta.

**Estrutura (§54).** CONTEXTO → INTRO (aeródromo, Wróbel, cadeiras) → APROXIMAÇÃO (scramble, descolagem, formação) → DIÁLOGO (controlo; Zych) → PRIMEIRO CONTATO (formação inimiga à vista) → ESCALADA (passagem; escolta reage) → COMBATE PRINCIPAL (separação; Dębski avariado) → SET-PIECE (mais uma milha) → PAUSA (motor reduzido) → CLÍMAX (última interceção viável; aproximação; aterragem) → CONSEQUÊNCIA (mãos; danos; cadeira) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Malec | procedimentos em voz alta; confere duas vezes o arnês | Wróbel (o remendo); Dębski (a asa) | Dębski perde altura | procura a asa, não o alvo | mãos a tremer; não larga os controlos |
| Dębski | ala confiante | Malec | avaria | — | `m05.wingman_status` |
| Wróbel | conhece os remendos | Malec | conta furos | — | vivo |
| Zych (líder) | ordens curtas | secção | separação | — | regressa |
| Controlo | voz | — | — | — | — |

**O que a missão recusa.** Avião parado no ar; giros sem perda de velocidade; alvos mágicos; dogfight impossível em cutscene; piloto histórico morto em cena; destruir toda a formação como condição; infantaria.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Dispersal" (`cs_m05_intro`, ≤ 80 s)
2 13:40 · 3 dispersal de Northolt: cadeiras, mesa, telefone, Hurricanes com mecânicos · 4 sol de setembro, nuvens dispersas · 5 Malec, Wróbel, Dębski, Zych, outros pilotos (proxies) · 6 Cartela: RAF NORTHOLT — 15 DE SETEMBRO DE 1940 — 13:40 · ESQUADRÃO 303. Mecânicos trabalham; pilotos esperam (um dorme, um lê); o telefone; o controlo informa uma formação a aproximar-se; Wróbel toca no remendo da asa do Hurricane de Malec: "Ela está pronta. Traga-a de volta, se puder." (001). Sirene: scramble. · 7 estabelecer o remendo, Dębski e a sala · 8 olhar; andar até ao avião · 9 — · 10 — · 11 — · 12 cadeiras com casacos; uma cadeira com um capacete (ninguém se senta nela) · 13 `dlg_m05_001`, `010–012` · 14 Merlins ao ralenti; telefone; sirene · 15 primeira pessoa; beat t 18: Wróbel toca no remendo (2 s) · 16 `missionStart` · 17 sirene · 18 — · 19 skip → cockpit · 20 —

### Cena 2 — "Descolar e formar" (jogável; `obj_m05_takeoff`, `obj_m05_form`)
2 13:46–13:56 · 3 pista → 3 000 m sobre o oeste de Londres · 4 sol alto, nuvens a 1 500 m · 5 secção de Zych (3 aviões: Zych, Malec, Dębski); resto do esquadrão à frente · 6 Descolar (trecho seguro), subir, formar à direita de Zych; aprender velocidade/altitude/direção/mira com assistência configurável; o controlo vectoriza · 7 tutorial orgânico (§79 ponto 1) · 8 acelera, descola, sobe, mantém posição (indicador de distância ao líder) · 9 nível de assistência · 10 Zych corrige por rádio; Dębski à esquerda · 11 nenhum · 12 Londres sob nuvens; balões de barragem · 13 `dlg_m05_013–016` · 14 Merlin por regime; vento; rádio TR9 · 15 cockpit; câmara externa **opcional** 4 s para escala (não retira controlo em manobra) · 16 sirene · 17 formação mantida 20 s · 18 `cp_m05_a_decolagem` (no solo), `cp_m05_b_formacao` (em voo, estado completo) · 19 [C] voo; [D] checkpoint em voo · 20 —

### Cena 3 — "Formação à vista" (jogável; `obj_m05_intercept`)
2 13:56–14:10 · 3 sudeste de Londres, 4 500 m · 4 contraluz · 5 secção; esquadrão; formação de Do 17 com escolta de Bf 109 acima · 6 Interceptar conforme o controlo; outros esquadrões atacam noutros setores/altitudes (proxies visíveis como pontos e rastos); Zych ordena uma passagem · 7 §79 pontos 2–3 · 8 aproxima-se por cima, faz **uma** passagem (8×.303, 15 s de munição no total), evita colisão, recupera energia · 9 alvo da passagem · 10 Zych e Dębski passam em sequência · 11 artilheiros dos Do 17 (fogo como dados), escolta reage 20 s depois · 12 flak ao longe; fumo sobre as docas · 13 `dlg_m05_017–020` · 14 rádio; metralhadoras; flak · 15 cockpit · 16 CP-B · 17 passagem feita · 18 `m05.pass_made`; `m05.ammo` · 19 [C] · 20 —

### Cena 4 — "A escolta reage; o paraquedas" (jogável)
2 14:10–14:20 · 3 estuário · 4 sol · 5 secção; Bf 109 · 6 Separação: a escolta mergulha; Dębski é atingido (evento fixo `evt_m05_wingman_hit`: perde altura e combustível; rádio: "Vejo a costa. Fique comigo mais uma milha." — 002); ao longe, um piloto inimigo salta de paraquedas; Malec pode olhar; o rádio manda proteger a formação. **Decisão:** perseguir um Do 17 que se desgarra (reivindicação possível) ou ficar com Dębski. · 7 o momento de custo humano e a decisão central · 8 manobra defensiva (energia); escolhe · 9 perseguir vs ficar · 10 Zych cobre; Dębski fala pouco · 11 Bf 109 ×2 (dados); desgarrado Do 17 · 12 paraquedas a descer sobre o estuário · 13 `dlg_m05_002` (Dębski, canónica), `021–025` · 14 rádio distorcido; alarme de avaria · 15 cockpit; beat: o paraquedas (target opcional 2 s) · 16 passagem feita + 20 s · 17 escolha resolvida (perseguição 40 s ou formação com Dębski) · 18 `m05.pursued`, `m05.enemy_pilot_fired_on`, `m05.wingman_status` provisório · 19 [C]; fallback: se o jogador não escolher, Zych ordena ficar · 20 —

### Cena 5 — "Mais uma milha" (jogável; `obj_m05_escort_wingman`)
2 14:20–14:40 · 3 estuário → Kent → rumo a Northolt · 4 sol a oeste nos olhos (glare no regresso, facto de hora) · 5 Malec, Dębski, Zych · 6 Proteger o ala avariado durante a separação: voar ao lado, abaixo da velocidade, afastar um Bf 109 que tenta aproveitar; Dębski decide (evento): salta de paraquedas sobre Kent (se danos críticos) ou continua até Northolt · 7 §79 ponto 4 · 8 mantém a asa à vista (contador de milhas), cobre, gere combustível · 9 — · 10 Zych afasta-se para o esquadrão (ordem) · 11 um Bf 109 (dados) · 12 campos de Kent; uma coluna de fumo de um avião caído (sem nome) · 13 `dlg_m05_026–030` · 14 motor de Dębski a falhar (rádio) · 15 cockpit · 16 escolha · 17 Dębski salta ou chega · 18 `cp_m05_c_protecao_ala`; `m05.wingman_status ∈ {landed, bailed_out}` · 19 [C] · 20 —

### Cena 6 — "Regresso e aproximação" (jogável; `obj_m05_return`, `obj_m05_land`)
2 14:40–15:05 · 3 Northolt · 4 sol baixo a oeste · 5 Malec; Dębski (se `landed`); controlo · 6 Controlo: "Retornem. Outro grupo assume o setor." (003). Última interceção viável: um Do 17 solitário cruza a rota (opcional: atacar ou não; combustível decide). Aproximação: pode abortar e refazer; falhar só por risco real (velocidade, trem). · 7 §79 ponto 5 · 8 navega por referências costeiras e pelo tremor dos instrumentos (sem seta única); aproxima; aterra · 9 atacar o Do 17 vs guardar combustível; abortar · 10 Dębski aterra primeiro (variante) · 11 Do 17 (opcional) · 12 Northolt com um Hurricane de barriga na relva (outro) · 13 `dlg_m05_003` (canónica), `031–034` · 14 **silêncio obrigatório**: motor reduzido; rádio quase mudo · 15 cockpit · 16 CP-C · 17 avião parado (`evt_m05_engine_off`) · 18 `cp_m05_d_retorno` (recuperável: antes da aproximação) · 19 [C] · 20 —

### Cena 7 — "As mãos" (`cs_m05_outro`, ≤ 60 s) + debrief
2 15:05–15:20 · 3 dispersal · 4 sol baixo · 5 Malec, Wróbel, Dębski (variante), Zych; pilotos · 6 Malec não solta logo os controlos; Wróbel sobe à asa, vê os furos e o remendo; as mãos tremem; na sala, uma cadeira vazia (o capacete da cena 1 já não está nela; está pendurado). Ninguém diz o nome. · 7 consequência canónica · 8 skip · 9 — · 10 — · 11 — · 12 a cadeira; a chave inglesa · 13 `dlg_m05_035` (Wróbel), `036` (Dębski se `landed`), `037` (Zych) · 14 chave inglesa; motor a arrefecer (estalos) · 15 beat: mãos (3 s); cadeira (3 s) · 16 engine_off · 17 debrief · 18 `m05.completed` · 19 variantes · 20 M06.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m05_takeoff` | Descole | sim | sirene | ar | colisão/stall (restaurar A) | — | A |
| `obj_m05_form` | Forme à direita de Zych | sim | ar | 20 s em formação | — | — | B |
| `obj_m05_intercept` | Faça uma passagem sobre os bombardeiros | sim | vetor | passagem | abatido (restaurar B) | `pass_made` | — |
| `obj_m05_decide` | Fique com Dębski ou persiga | sim (escolha) | `evt_m05_wingman_hit` | 40 s | — | `pursued` | — |
| `obj_m05_escort_wingman` | Proteja o ala avariado | sim | decide | Dębski salta ou chega | — | `wingman_status` | C |
| `obj_m05_return` | Regresse a Northolt | sim | C | circuito | combustível a zero (aviso 3×) → restaurar C | — | — |
| `obj_m05_last_intercept` | (opcional) o Do 17 solitário | opcional | rota | ataque ou ignorar | — | `m05.ammo` | — |
| `obj_m05_land` | Aterre (pode abortar) | sim | circuito | parado | só por risco real | `m05.aircraft_damage` | D |

### 3.2 "Batalha ao redor" (ar)
`s1_section` (perto: Zych, Dębski, 109s), `s2_squadron` (médio: resto do 303 e outro esquadrão noutra altitude), `s3_london_sky` (longe: flak, formações, fumo das docas, balões), `s4_ground` (longe: Northolt, campos, um avião caído a arder). Agendas: formação inimiga 13:56; escolta reage 14:10; outros esquadrões atacam 14:05–14:25; Do 17 solitário 14:50.

### 3.3 Checkpoints
A decolagem (solo) · B formação (**em voo**: posição, velocidade, altitude, combustível, munição, estado dos aviões — [D]) · C proteção do ala (estado de Dębski) · D retorno recuperável (antes da aproximação; permite repetir a aterragem).

### 3.4 Justiça
Assistência: estabilização, mira assistida, indicadores de stall; nunca timer oculto; abortar aproximação sempre; combustível com três avisos.

---

## 4. Set pieces

### SP-05-1 "Scramble"
Contexto: dispersal. Preparação: Wróbel e o remendo; a cadeira. Experiência: correr para o avião, descolar em secção. Companheiros: Zych e Dębski descolam ao lado. Ambiente: Northolt. Evolução: subir até à formação. Clímax: formação mantida. Consequências: CP-A/B. Requisitos: [C] voo; [D] CP em voo. Integração: `obj_m05_takeoff/form`.

### SP-05-2 "Uma passagem"
Contexto: formação de Do 17 com escolta. Preparação: o controlo vectoriza; outros esquadrões visíveis. Experiência: picar, disparar 2–3 s, sair, recuperar energia; a escolta reage. Companheiros: sequência de passagens. Ambiente: flak, fumo. Evolução: Dębski atingido; paraquedas inimigo. Clímax: a decisão. Consequências: `pursued`, `enemy_pilot_fired_on`. Requisitos: [C] formações como proxies; artilheiros como dados. Integração: `obj_m05_intercept/decide`.

### SP-05-3 "Mais uma milha"
Contexto: Dębski a perder altura. Preparação: a fala 002. Experiência: voar devagar ao lado, afastar um 109, ver a costa. Companheiros: Zych parte. Ambiente: Kent; um avião a arder sem nome. Evolução: salto ou chegada. Clímax: Northolt à vista. Consequências: `wingman_status`. Requisitos: [C]. Integração: `obj_m05_escort_wingman`.

---

## 5. Environmental storytelling

| Fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| dispersal | cadeiras, casacos, telefone, capacete numa cadeira | mecânicos | telefone | — | pilotos a dormir/ler | — |
| pista | Hurricanes com remendos diferentes | descolagem | — | — | — | — |
| Londres | balões, fumo das docas | outros esquadrões | flak | passagem | — | rastos |
| estuário | — | — | 109s | separação | paraquedas | fumo de um avião caído |
| Kent | campos, uma coluna de fumo | — | 109 | — | — | — |
| Northolt | um Hurricane de barriga na relva | — | — | — | Wróbel | furos; cadeira vazia |

Objetos com origem: o remendo (impacto de 11/9, Wróbel); o capacete na cadeira (de quem saiu de manhã e voltou; à tarde não volta — sem nome); a chave inglesa; o Hurricane de barriga (outro piloto, aterragem forçada, vivo — sem nome).

---

## 6. Diálogos (VO: polaco entre pilotos; inglês de rádio para o controlo)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Wróbel | "Ela está pronta. Traga-a de volta, se puder." (§79) | intro t 18 | 1 | — |
| 002 | Dębski | "Vejo a costa. Fique comigo mais uma milha." (§79) | `evt_m05_wingman_hit` + 6 s | 1 | — |
| 003 | Controlo | "Retornem. Outro grupo assume o setor." (§79) | 14:40 | 1 | — |
| 010 | Zych | "Segunda do dia. Formação a sudeste, grande." (V1) | intro t 6 | 1 | — |
| 011 | Dębski | "Da primeira vez contei duas. Hoje só quero contar a tua asa." (V1) | intro t 24 | 2 | — |
| 012 | Wróbel | "Ouvi a vibração de ontem. Veja como regressa." (PR #44) | intro t 30 | 2 | — |
| 013 | Zych | "Descolar em secção. Aguenta a cauda." (V1) | pista | 1 | — |
| 014 | Controlo | "Vector um-três-cinco, anjos quinze." (V1; fraseologia P-C05) | ar | 1 | — |
| 015 | Zych | "Malec, à minha direita. Dębski, à esquerda." (V1) | subida | 1 | 20 |
| 016 | Dębski | "Estou contigo." (V1) | formação | 3 | 40 |
| 017 | Zych | "Bombardeiros às onze, abaixo. Escolta em cima. Uma passagem." (V1) | contacto | 0 | — |
| 018 | Controlo | "Outros esquadrões no setor. Não se dispersem." (V1) | 14:00 | 1 | — |
| 019 | Zych | "Agora!" (V1) | passagem | 0 | — |
| 020 | Dębski | "Passei. Sai, sai!" (V1) | passagem de Dębski | 1 | — |
| 021 | Zych | "Escolta a mergulhar! Energia!" (V1) | 109s | 0 | 20 |
| 022 | Dębski | "Fui atingido… a perder óleo." (V1) | hit | 1 | — |
| 023 | Zych | "Há um a saltar, às duas. Deixa-o descer. Temos um dos nossos a regressar." (PR #44, adaptada) | paraquedas | 1 | — |
| 024 | Zych | "Não é assim que se conta." (V1) | tiro sobre o paraquedas | 1 | — |
| 025 | Zych | "Um desgarrado às dez. Malec: ou ele, ou o Kazik. Decide." (V1) | desgarrado | 1 | — |
| 026 | Dębski | "Estou a perder altura! Não vejo a costa!" (PR #44) | descida | 1 | — |
| 027 | Zych | "Volto ao esquadrão. Traz-mo." (V1) | ordem | 1 | — |
| 028 | Dębski | "Não preciso de outro alvo. Preciso de ver a asa dele." (PR #44, atribuída a Dębski sobre Malec) | milha 3 | 2 | — |
| 029 | Dębski | "Salto. Kent. Diz-lhes." (V1) | bail | 1 | — |
| 030 | Dębski | "Aguento até Northolt. Devagar." (V1) | continua | 1 | — |
| 031 | Controlo | "Um solitário no vosso rumo. À vossa decisão." (V1) | 14:50 | 2 | — |
| 032 | Controlo | "Combustível?" (V1) | aviso 2 | 1 | — |
| 033 | Controlo | "Aproximação livre. Pode abortar." (V1) | circuito | 1 | — |
| 034 | Controlo | "Bem-vindo. Dębski em terra." / "…Dębski saltou sobre Kent. Confirmado vivo." (V1 variantes) | parado | 1 | — |
| 035 | Wróbel | "Sete furos. O remendo aguentou." (V1) | outro | 2 | — |
| 036 | Dębski | "A máquina parou. As minhas mãos, ainda não." (PR #44, atribuída a Malec → **mantida em Dębski** para Malec ficar em silêncio) | outro, se landed | 2 | — |
| 037 | Zych | (olha a cadeira) "Não digam ainda o nome." (V1) | outro | 2 | — |

Callouts: `co_m05_bandits`, `co_m05_fuel`, `co_m05_stall`. Silêncio: regresso (cena 6) e a cadeira.

---

## 7. Arte e atmosfera

**Paleta:** céu de setembro (zénite `#5b84b8`, horizonte `#d8dde0`), nuvens a 1 500 m, verde de Kent, alumínio/tela do Hurricane, castanho/verde de camuflagem RAF, fumo das docas. **Luz:** 13:40 Sol az 200°, el 42°; 14:40 glare a oeste no regresso. **Materiais:** tela remendada, plexiglas riscado, óleo. **Silhuetas:** Do 17 "lápis voador", Bf 109E, balões de barragem, a torre de Northolt. **Destruição:** rastos, fumo, um avião a arder em Kent (sem nome), furos no remendo. **Humanos:** fato de voo, Mae West, óculos; mãos. **Violência reduzida:** sem sangue; o paraquedas.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| dispersal | telefone, cadeiras, Merlin ao ralenti, chave inglesa | — | — | — |
| descolagem | Merlin em potência, trem, vento | secção | — | — |
| formação | motor por regime, rádio TR9 | esquadrão | flak | — |
| passagem | 8×.303 (15 s de munição), impactos no remendo | artilheiros | outros esquadrões | — |
| separação | alarme, rádio de Dębski, 109 | — | — | — |
| regresso | motor reduzido, rádio quase mudo | — | — | **obrigatório** |
| outro | estalos do motor a arrefecer, chave | — | — | cadeira |

Sons novos: Merlin por regime, TR9, Browning .303, Do 17/Bf 109, flak. VO polaco + inglês de rádio.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| 15/9: 303 em Northolt, Hurricane Mk I, duas saídas | D | H06; S-C01 | horas exatas P-C05 |
| Perda de um piloto na saída da tarde; outro saltou ileso 14:51 | D (resumo) | S-C01 | nome só no debrief após leitura |
| Reivindicações 15 (inflacionadas) | D | S-C01 | tratar como reivindicações |
| Secção de Zych, Dębski, Wróbel | F | — | — |
| Fraseologia/indicativo | R | — | P-C05 |
| Do 17/He 111 sobre Londres; escolta Bf 109 | D | geral | — |

**Proibições:** Spitfire; Mk II; piloto histórico em cena; paraquedista como alvo obrigatório. **Fora de cena:** Kellett, Urbanowicz, Kent.

---

## 10. Handoff técnico

**Contrato:** `id m05_london_303`, `order 5`, relógio 13:40→15:20; `player.vehicle: hurricane_mk1` (campo novo — [D] no schema, opcional), `cast` 5 + proxies; `groups` (`grp_section`, `grp_squadron`, `grp_do17`, `grp_bf109`), setores §3.2, checkpoints A–D (B em voo), cutscenes (intro, outro), falas, flags, debrief.

**Flags:** `m05.completed`, `m05.pass_made`, `m05.ammo`, `m05.pursued`, `m05.enemy_pilot_fired_on`, `m05.wingman_status ∈ {landed, bailed_out}`, `m05.fuel_margin`, `m05.aircraft_damage (0–3)`, `m05.claims` (reivindicações, só para o debrief, nunca HUD).

**Sistemas:** [C] voo (energia, stall, mira, danos por componente, combustível, trem), formações de proxies com rastos, artilheiros como dados; [D] checkpoint em voo e `player.vehicle` no schema; [A] falas/eventos/setores. **Bancada do Marco 4 (Prompt §77):** "avião para M05, um de cada vez; não considerar concluído só porque a câmara foi presa ao modelo" (§80 VEÍCULOS).

**Disciplinas:** Eng. sim: modelo de voo arcade-sério com assistência; Level: Northolt + 40 km de céu com referências; Arte: Hurricane com remendos; Personagens: 5 pilotos/mecânico; Animação: mãos no cockpit; Som: Merlin; VO: polaco/inglês; Historiador: P-C05; QA: descolar/aterrar/abortar/restaurar B em voo; Produtor: primeira bancada de veículo.

**Testes:** CP-B restaura estado de voo; combustível com 3 avisos; abortar aproximação; `wingman_status` nas duas vias; nenhum objetivo depende de abates.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| O remendo e a cadeira | (intro) | ver | Wróbel toca | — | start | — |
| Scramble | `obj_m05_takeoff/form` | descolar; formar | Zych corrige | — | sirene | CP-A/B |
| Formação à vista | `obj_m05_intercept` | uma passagem | sequência | rastos; fumo | vetor | `pass_made` |
| Dębski atingido; o paraquedas | `obj_m05_decide` | perseguir ou ficar; (não) disparar | Zych; Dębski | paraquedas | hit | `pursued`, `enemy_pilot_fired_on` |
| Mais uma milha | `obj_m05_escort_wingman` | voar ao lado; afastar 109 | Zych parte | avião caído | escolha | `wingman_status` |
| Retornem | `obj_m05_return/last_intercept` | navegar; decidir o solitário | controlo | — | 14:40 | combustível |
| Aproximação | `obj_m05_land` | aterrar/abortar | Dębski antes | — | circuito | CP-D |
| As mãos | debrief | — | Wróbel conta furos | cadeira vazia | engine_off | `m05.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | A asa como métrica é clara; a cadeira sem nome respeita a regra. |
| 2 | Autenticidade | 7 | dia e esquadrão D; horas/fraseologia P-C05. |
| 3 | Personagens | 7 | Dębski e Wróbel; Zych funcional. |
| 4 | Diálogos | 8 | rádio curto; polaco/inglês. |
| 5 | Originalidade | 8 | nenhum tiro ao paraquedas; "não é assim que se conta". |
| 6 | Variedade | 7 | voo é um verbo só; a missão varia por fases (formar, passar, escoltar, aterrar). |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 7 | céu e Kent; depende do modelo de voo. |
| 9 | Environmental storytelling | 7 | dispersal e Northolt; céu tem pouco. |
| 10 | Cinematográfica | 7 | câmara externa opcional; cockpit. |
| 11 | Sonora | 8 | Merlin e o silêncio do regresso. |
| 12 | Impacto emocional | 8 | as mãos; a cadeira. |
| 13 | Ritmo | 8 | 18–24 min; 25 min de voo compactados por elipses de rádio. |
| 14 | Continuidade | 7 | missão isolada; nenhuma flag transita (por desenho). |
| 15 | Integração técnica | 4 | tudo depende de uma bancada nova [C]/[D]. |

**Correções aplicadas:** (1) escolhida a saída da tarde (onde houve perda) para a cadeira vazia ter base; (2) a fala "A máquina parou…" ficou com Dębski para Malec terminar em silêncio; (3) o Do 17 solitário no regresso passou a opcional governado por combustível, não por timer.
