# COD Guerra — Revisão crítica da campanha M02–M30 (Fases 6, 7 e 8) e validação (Fase 10)

**Estado:** REVISÃO INTERNA do Diretor Criativo; não substitui a revisão histórica por historiador (P-C31), o playtest humano nem a aprovação do Capitão. **Objeto revisto:** os 29 dossiês em `missions/` e os 8 documentos de campanha desta pasta. **Data:** 2026-10-08.

---

## 1. Método

- **Fase 6 (histórica):** cada dossiê tem §9 com asserções classificadas (D/R/F = `DOCUMENTED`/`RECONSTRUCTED`/`GAMEPLAY_DRAMATIZATION`), fonte (H canónica + S-C de busca) e pendência (P-C). Aqui verifica-se: respeito pelas correções de §78 e pelas regras novas da TIMELINE §4; anacronismos; pessoas reais; "proibições" por missão.
- **Fase 7 (continuidade):** cadeias de flags, nomes, mortes/ausências, reatribuições de falas canónicas, objetos.
- **Fase 8 (gameplay):** verbos por missão (anti-repetição), pontos de decisão com flag, justiça (eventos fixos nunca "evitáveis"; janelas falsas), ritmo e duração.
- **Scorecard (§5):** as notas 0–10 de §12 de cada dossiê, somadas e lidas com honestidade — nenhuma missão recebe 10 global; o critério 15 (integração técnica) é deliberadamente baixo porque nada está implementado.
- **Validação (§7):** só comandos efetivamente executados nesta sessão, com resultado.

---

## 2. Revisão histórica (Fase 6)

### 2.1 Correções de §78 e regras novas — verificação

| Regra | Onde se aplica | Verificado nos dossiês |
| --- | --- | --- |
| Prokhorovka: a vala antitanque **não** é facto encenado | M13 | não encenada; mencionada como contestada |
| Nenhum Steele em Sainte-Mère-Église; senha sem "cricket" da 101.ª | M17 | Steele ausente; senha por voz (Flash/Thunder) com pendência P-C17 |
| Nenhuma figura da Companhia E; Foy só em janeiro | M23 | sem nomes nem falas; a outra companhia só proxies sem rosto; Foy 13/1 |
| Nenhum Edmondson como ato do jogador | M06 | Edmondson fora de cena |
| Bandeira de Iwo só a 23/2; nunca pelo protagonista | M24 | nunca existe no mundo; cartela de 23/2 |
| Kasserine: sem "massacre" inventado; sem "um fuzil para dois" | M12 | respeitado |
| Reichstag não é do 8.º Ex. Guardas; sem Hitler como chefe | M28 | só por relato atribuído ao 3.º Ex. de Choque; Hitler só em notícia fragmentada |
| Remagen: colapso só a 17/3 em debrief; sem puzzle de fios | M25 | 15:40 "ergue-se e assenta"; fios nunca interativos; ataques posteriores datados |
| Shuri: castelo abandonado, sem "boss"; bandeira de A/1/5 não encenada | M29 | pouca oposição; bandeira só em debrief com fonte |
| Hagushi: pouca oposição; Linha de Shuri só semanas depois | M26 | dois tiros como dramatização declarada em cartela |
| Berlim: perseguição só por relato/debrief com fonte | M28 | aviso meio arrancado sem encenação; cartela a preencher (P-C28) |
| Dunquerque: setor leste sem franceses nem molhe | M04 | respeitado |
| Tobruk 1941: sem Owen gun | M06 | respeitado |
| Hürtgen: o trilho do Kall é de 3/11, não de 2/11 | M21 | ravina lateral declarada distinta do Kall |
| Niscemi: dia da tomada incerto → missão = comboio do dia seguinte | M14 | respeitado (P-C14) |
| Clervaux: saída para oeste (Marnach é a leste) | M22 | corrigido no dossiê |
| Market Garden: Reed de planador, não paraquedista; chuva só a 25/26 | M20 | respeitado (S-C05) |
| Seelow: hora de Moscovo com equivalência pendente; sem rutura a 16/4 | M27 | respeitado (P-C27) |
| Baía de Tóquio: falas históricas só com fonte/licença | M30 | por defeito abafadas |

### 2.2 Anacronismos e erros removidos durante a produção

Panzerfaust em julho de 1943 (M13); "cricket" da 101.ª atribuído à 82.ª (M17); franceses/molhe no setor leste de Dunquerque (M04); Owen gun em Tobruk 1941 (M06); trilho do Kall a 2/11 (M21); Marnach como saída de Clervaux (M22); chuva em 17/9 em Arnhem (M20); Reed paraquedista (M20); LVT com rampa frontal (M24); Volkssturm/Hitlerjugend tratados como alvo obrigatório (M28); música sobre objetos de memória (M30).

### 2.3 Risco histórico por missão (para o historiador)

| Risco | Missões | Motivo |
| --- | --- | --- |
| **Alto** | M09, M10, M13, M14, M22, M27, M28 | subunidade/posição ficcional dentro de operações muito documentadas; fusos (M27/M28); contexto de perseguição (M28); unidade blindada (M27) |
| Médio | M02, M03, M06, M07, M11, M12, M16, M17, M18, M20, M21, M23, M29 | companhia/trilho/LZ/setor pendentes (P-C02…P-C29) |
| Baixo | M04, M05, M08, M15, M19, M24, M25, M26, M30 | cronologia sólida nos resumos S-C; o que falta é planta/companhia |

**Pendência transversal (P-C31):** leitura integral de H01–H30 com excertos e segundo leitor historiador. Nenhuma missão deve sair de PLANEJADA sem isso.

---

## 3. Revisão de continuidade (Fase 7)

### 3.1 Cadeias de flags verificadas

| Cadeia | Flags | Verificação |
| --- | --- | --- |
| M04 → M20 | `m04.whitfield_status ∈ {evacuated, missing}` | M20 lê em cartela (intro/outro) e numa fala segura; nunca "dead"; silêncio se `missing` |
| M06 → M11 | `m06.fraser/morrow/ellis_status` | presentes só se `unhurt/recovered`; Barrow como substituto nomeado |
| M07 → M27 → M28 | `m07.makarov_status`, `m07.saveliev_status`, `m27.bychkov_deescalated` | Makarov/Danilin exclusivos; Saveliev nunca em 1945; copo só com `unhurt`; Bychkov baixa antes da ordem em M28 se de-escalado em M27 |
| M08 → M26 → M29 | `m08.ruiz_status`, `m08.friendly_fire_avoided`, `m26.tully_deescalated`, `m26.marsh_letter_started` | Ruiz/Prado exclusivos; Tully reage a Cole conforme M26; a carta começa em M26 e enlameia em M29 |
| M14 → M18 → M19 | `m14.*`, `m18.bell/price/doyle_status` | Price/Lindqvist e Doyle/Castellano exclusivos em M19 |
| M16 → M30 | `m16.kaleta_status`, `m16.letter_state` | epílogo da carta só com `evacuated*`; nunca Varsóvia |
| M23 → M30 | `m23.gloves_given_to`, `m23.ferraro_status`, `m23.ritter_status` | luvas só com Ferraro vivo; Ritter como estado de conhecimento |
| M29 → M30 | `m29.cole_status = wounded_evacuated` (fixo), `m29.marsh_letter_muddy` | Cole ausente de M30 (cama vazia com cartela) |
| M01 → M30 | variante [C] de Krawiec (flag `m01.krawiec_status` **inexistente**) | por defeito sem caneca; variante só com flag e aprovação |

### 3.2 Nomes, mortes e ausências

- **Colisões evitadas:** Henry Cole (Marines) ≠ Nathan Cole (82.ª); "Nowicki" reservado a M01; "Ballard" reservado a M12 (M22 usa Tolliver); Pietrzak/Sowa em M16; Whitaker em M18; Brenner em M21 (não repete nenhum apelido anterior).
- **Mortes/ausências fixas e nunca "evitáveis":** Nowicki (M01), Rybin (M10), Reiner (M15), Ames (M21), Salas (M24), Cole ferido (M29), Sayer capturado (M22), Brenner/Aliyev/Petrenko/Munro/Kessock/Dugan feridos (eventos fixos, todos vivos), Ritter (M23) ferido off-screen.
- **Reatribuições de falas canónicas** (texto literal mantido): M21 `002` → Halvorsen; M27 `001` → Danilin se Makarov ausente; M27 `002` → Gusev; M03 `003b` → Nowak; M11 → Coote/Barrow. Registadas em CONTINUITY §11.
- **Elenco secundário proposto depois de CONTINUITY §4:** registado em CONTINUITY §11 (M20–M30); entra em §4 na próxima revisão aprovada.
- **Correção aplicada nesta revisão:** M25 referia o início do motivo VI em M26; corrigido (M26 pertence ao movimento V; o motivo VI começa em M27).

### 3.3 Objetos

Correia/alça (M04 → M20), copo de lata (M07 → M27/M28 condicional), carta de Marsh (M08 menção → M26 começa → M29 lama → M30 por enviar), carta de Kaleta (M16 → M30 condicional), luvas (M23 → M30 condicional), caneca (M01 → M30 variante), guarda-corpo (M01 ↔ M25 por função), o mapa de Orlov (M27; a dobra herdada de M26). Nenhum objeto atravessa frentes diferentes; nenhum epílogo reúne protagonistas que não se conheciam.

---

## 4. Revisão de gameplay (Fase 8)

### 4.1 Verbos dominantes (anti-repetição: nenhum verbo em mais de cinco missões como dominante)

| Verbo dominante | Missões |
| --- | --- |
| defender/aguentar | 02, 06, 20, 23 |
| atravessar/vadear/subir | 09, 15, 18, 24 |
| reconhecer/ler o lugar/orientar | 19, 21, 26, 29 |
| evacuar/abrir corredor | 03, 07, 16, 21(ravina), 29 |
| conduzir/pilotar | 05, 13, 14 |
| reunir/ligar grupos | 04, 17, 22, 27 |
| manter/consolidar objetivo limitado | 10, 11, 12, 25, 27 |
| não disparar / parar de disparar | 19, 26, 28 |
| cair de noite/retirar pelo rio | 17, 20 |
| testemunhar | 30 |

Nenhum verbo dominante ultrapassa cinco missões. "Evacuar" aparece como tarefa secundária em treze missões (`carriedBy`), sempre com variação de meio (trenó, maca de ramos, carroça, corredor na lama, barco, ambulância, camião).

### 4.2 Pontos de decisão com flag (um por missão, com custo e sem janela falsa)

Verificado em todos os 29 dossiês: cada decisão tem (a) dois ramos honestos, (b) uma consequência registada numa flag, (c) nenhum ramo que "salve" um evento fixo. Exemplos de correções aplicadas durante a produção: M20 (Penn fica em todos os ramos; o barco perdido restaura em vez de falhar); M23 (as luvas nunca saem de Bennett; Ritter como conhecimento); M24 (Rourke vive em ambos; Salas nunca encontrável); M26 (disparar sobre a porta nunca mata civis mas tem custo); M28 (a decisão da porta é de forma, não de resultado).

### 4.3 Justiça

Regras verificadas em cada §3.4: assobio ≥ 2 s antes de impactos; `safeImpact` ≥ 30 m; avisos antes de dano por cobertura errada (M21: dois avisos); IA sem perceção através de vegetação/paredes (M19, M21, M28); MG oculta sem marcador mas com três leituras (M24); barcos/transportes que partem nunca falham a missão (M04, M20); frio nunca causa dano ao jogador (M23); civis nunca atingíveis pela secção (M26, M28); rendidos nunca reativam (M19, M25, M28); nenhum "boss" (M26, M28, M29).

### 4.4 Ritmo e duração

| Faixa | Missões | Soma dos alvos |
| --- | --- | --- |
| M02–M30 (alvos de §79) | 29 | **606–815 min** (≈ 10 h – 13,5 h), mais M01 |
| Mais longas | M23 (26–36), M20 (26–35), M18 (24–32), M29 (24–32), M27 (24–31) | as três datas de M20/M23 obrigam a compressão assumida (PR #44); testar ritmo antes de acrescentar combate |
| Mais curtas | M30 (10–15), M05/M08/M14/M26 (18–25) | M26 e M30 são calmas por desenho; M08 é a primeira do Pacífico |

Curva de intensidade (MASTER-STORY-BIBLE §5): pausas reais em M08, M19, M26, M30; picos em M10, M13, M15, M18, M20, M24, M27; o movimento VI baixa o volume sem baixar o peso (M28 "parar de disparar", M29 chuva, M30 água).

---

## 5. Scorecard (0–10 × 15 critérios × 29 missões)

Critérios: 1 História · 2 Autenticidade · 3 Personagens · 4 Diálogos · 5 Originalidade · 6 Variedade · 7 Set pieces · 8 Atmosfera · 9 Environmental storytelling · 10 Cinematográfica · 11 Sonora · 12 Impacto emocional · 13 Ritmo · 14 Continuidade · 15 Integração técnica.

| Missão | 1 Hist | 2 Aut | 3 Pers | 4 Diál | 5 Orig | 6 Var | 7 SP | 8 Atm | 9 Env | 10 Cin | 11 Som | 12 Emo | 13 Rit | 14 Cont | 15 Téc | Média |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M02 | 8 | 7 | 7 | 8 | 7 | 8 | 8 | 7 | 8 | 7 | 7 | 8 | 8 | 9 | 8 | 7.7 |
| M03 | 8 | 7 | 8 | 8 | 8 | 8 | 7 | 8 | 9 | 7 | 8 | 8 | 8 | 9 | 6 | 7.8 |
| M04 | 8 | 7 | 7 | 8 | 7 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 9 | 6 | 7.6 |
| M05 | 8 | 7 | 7 | 8 | 8 | 7 | 8 | 7 | 7 | 7 | 8 | 8 | 8 | 7 | 4 | 7.3 |
| M06 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 7 | 8 | 8 | 8 | 9 | 7 | 7.9 |
| M07 | 8 | 7 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 8 | 9 | 6 | 7.8 |
| M08 | 8 | 8 | 8 | 8 | 9 | 7 | 7 | 8 | 9 | 7 | 9 | 7 | 7 | 9 | 8 | 7.9 |
| M09 | 8 | 7 | 7 | 8 | 8 | 8 | 8 | 9 | 8 | 8 | 9 | 8 | 8 | 7 | 5 | 7.7 |
| M10 | 9 | 7 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 9 | 8 | 7 | 6 | 7.9 |
| M11 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 7 | 8 | 9 | 8 | 8 | 9 | 7 | 8.1 |
| M12 | 8 | 7 | 7 | 8 | 7 | 8 | 7 | 7 | 7 | 7 | 7 | 7 | 8 | 7 | 8 | 7.3 |
| M13 | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 9 | 8 | 8 | 7 | 4 | 7.6 |
| M14 | 7 | 7 | 8 | 7 | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 7 | 8 | 9 | 4 | 7.4 |
| M15 | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 8 | 7 | 7 | 5 | 7.7 |
| M16 | 8 | 7 | 7 | 8 | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 6 | 7.6 |
| M17 | 8 | 7 | 7 | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 7 | 6 | 7.5 |
| M18 | 8 | 7 | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 6 | 7.8 |
| M19 | 9 | 7 | 9 | 9 | 8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 8 | 9 | 5 | 8.1 |
| M20 | 9 | 8 | 8 | 9 | 8 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 7 | 9 | 5 | 8.3 |
| M21 | 8 | 8 | 8 | 8 | 9 | 8 | 8 | 9 | 8 | 7 | 9 | 8 | 8 | 7 | 6 | 7.9 |
| M22 | 9 | 8 | 8 | 8 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 8 | 8 | 8 | 7 | 8.3 |
| M23 | 9 | 8 | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | 9 | 9 | 7 | 9 | 5 | 8.4 |
| M24 | 8 | 8 | 8 | 8 | 9 | 8 | 8 | 9 | 8 | 8 | 9 | 8 | 8 | 7 | 5 | 7.9 |
| M25 | 9 | 9 | 8 | 9 | 9 | 8 | 9 | 8 | 8 | 9 | 9 | 8 | 8 | 9 | 8 | 8.5 |
| M26 | 9 | 8 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 8 | 8 | 10 | 6 | 8.5 |
| M27 | 9 | 8 | 9 | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 10 | 8 | 8 | 10 | 5 | 8.6 |
| M28 | 10 | 8 | 9 | 9 | 10 | 9 | 9 | 9 | 8 | 9 | 10 | 9 | 8 | 10 | 5 | 8.8 |
| M29 | 9 | 9 | 10 | 9 | 8 | 9 | 9 | 10 | 9 | 9 | 10 | 10 | 8 | 10 | 7 | 9.1 |
| M30 | 9 | 9 | 8 | 9 | 9 | 7 | 8 | 10 | 10 | 9 | 10 | 9 | 8 | 10 | 6 | 8.7 |
| **Média por critério** | 8.4 | 7.7 | 8.0 | 8.3 | 8.2 | 8.0 | 8.0 | 8.4 | 8.1 | 7.8 | 8.7 | 8.1 | 7.8 | 8.5 | 5.9 | 8.0 |

**Leitura honesta.**
- O critério **15 (integração técnica)** é o mais baixo (média 5,9) por definição: nada está implementado; as notas 4–5 marcam missões com bancada nova ([C]/[D]) e as 7–8 marcam as que reutilizam M01 (M02, M08, M12, M25). Nenhuma nota 15 sobe sem código testado.
- O critério **2 (autenticidade)** fica em 7,7 porque a pesquisa desta sessão são resumos de busca (S-C) e as subunidades são reconstrução plausível: sobe só com P-C31 (leitura integral das fontes e segundo leitor).
- As missões finais (M25–M30) pontuam mais alto em história, som e continuidade por acumularem flags e objetos; isso é consequência do desenho, não inflação: as primeiras missões criam o que as últimas pagam.
- Nenhuma missão tem média 10. A mais alta (M29, 9,1) continua PLANEJADA; "10/10" só com build convincente (ROTEIROS V2, Parte 2: narrativa, história, cena, gameplay, continuidade, arte, técnica aprovadas separadamente).

---

## 6. Riscos de produção e recomendações ao Capitão

1. **Aprovar primeiro os pré-requisitos transversais** (flags de campanha [D], `SURRENDERED` [C], passagem de data [B], Animation Resolver) antes de qualquer missão nova — sete missões dependem do primeiro e todas do segundo.
2. **Produzir M02 → M03 → M25** antes das bancadas de veículo: três missões que validam S1–S4, S7 e S9 com o menor risco.
3. **Decidir o registo linguístico** (pt-PT/pt-BR) e a política de VO em línguas (polaco, alemão, russo, japonês/okinawano, neerlandês, luxemburguês, francês) antes de gravar uma única linha.
4. **Revisão cultural obrigatória** para M26 (família Nakama) e revisão de contexto com fonte para M28 (perseguição) antes de modelar ou escrever cartelas.
5. **Licenças**: áudio histórico de M30 (MacArthur) e qualquer citação literal; assets com autoria/escala/animações verificadas (AGENTS.md).
6. **Não encurtar M20/M23**: testar o ritmo das três datas com playtest antes de cortar passagens emocionais (PR #44).

---

## 7. Validação executada nesta sessão (Fase 10)

Ambiente: Node v22.22.0, npm 10.9.4, Linux; branch `codex/m02-m30-full-creative-production-v1` a partir de `origin/main` @ 72bbcdd; `node_modules` presente no container.

| Comando | Resultado | Observação |
| --- | --- | --- |
| `npm test` | **108/108 pass**, 0 fail, 16,7 s | a árvore de código é a de `main`; esta entrega só adiciona ficheiros em `docs/campaign-production/` |
| `npm run build` | **✓ built in 1.43s** (`dist/index.html` 3,99 kB; CSS 8,12 kB; JS 1 013,01 kB / gzip 261,87 kB) | aviso pré-existente de chunk > 500 kB (não introduzido por esta entrega) |
| `npm run test:browser` | **não executado** | não há alteração de código; o teste de browser exige a bancada de M01 e não valida documentos |
| Playtest humano / FPS | **não executado** | nada implementado; nenhum FPS inventado (AGENTS.md) |
| Leitura integral de H01–H30 | **não executada** | WebFetch bloqueado por DNS nesta sessão; 28 verificações por WebSearch (resumos com URL) registadas em TIMELINE §5 |
| `git status` após commits | árvore limpa; nenhum ficheiro fora de `docs/campaign-production/` alterado | `main`, deploy, workflows, `missions/`, `src/`, `tests/`, `assets/` intactos |

**Commits desta entrega (todos em `docs/campaign-production/`):** handoff + documentos de campanha + M02–M13; M14–M21; M22–M23; M24–M25; M26–M27 (+ nota de motivo em M25); M28–M30; revisão/roadmap/README/fecho do handoff (este). Nenhum merge; nenhuma alteração a `main`; PR draft contra `main` sem merge.
