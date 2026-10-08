# M01 — CREATIVE PRODUCTION ROADMAP · Por prioridade, dependência, risco e impacto

**Estado:** PLANO (proposta). Pressupostos: (1) a consolidação V5 (PR #52) e o diagnóstico de FX (PR #53) são resolvidos pelo agente de integração da Issue #55 **antes** de qualquer trabalho criativo entrar em código; (2) nenhuma fase abaixo toca `main`/deploy; (3) cada fase abre PR draft própria com evidência (A/B de rota, Node, browser focado), como as entregas anteriores; (4) **M01 continua PROTÓTIPO JOGÁVEL** até playtest humano e Chromebook.

## 0. Como ler

- **Esforço** é relativo (S/M/L/XL), não dias; **Risco** é de regressão/contrato; **Impacto** é o que o jogador sente. IDs referem a [`M01-INTEGRATION-MATRIX.md`](M01-INTEGRATION-MATRIX.md).

## 1. Fase 0 — Pré-requisitos (não criativos)

| Item | Dono | Porquê |
| --- | --- | --- |
| Fechar V5 (CI, FX timeouts, exclusões WIP) — Issue #55 | agente de integração | Toda a apresentação proposta assume a V5 |
| Decidir Station V3 (PR #54) | Capitão | E-02 depende |
| Decidir registo de localização (pt-PT/pt-BR) | Capitão | N-01 escreve ~55 falas |
| Confirmar P-NOVA-1 (nomes fictícios vs vítimas reais) | pesquisa | N-11 |

## 2. Fase 1 — "Vozes" (tudo [A], dados + falas) · Esforço M · Risco baixo · Impacto alto

| ID | Entrega | Prova |
| --- | --- | --- |
| N-01, N-11 | `mission.json`: ≈55 falas novas, nomes de cast (Rusek, Hajduk, Cyra, Piszczek, Wąs, Lenc) | validador de dados |
| N-02, N-03, N-06 | ligação em `consume()`, `updateObjectives`, `updateCombat` | A/B de rota: snapshot sem a fila de diálogo igual; falas tocam uma vez |
| S-01 | beats novos nas cinco cenas | HUD test de cartelas inalteradas; skip |
| N-05 | variantes de guia e rotação | mensagem de HUD só após 14 s sem fala |
| N-04 (fala) | 111 | A/B |
| A-08 | ducking das janelas de silêncio | WAV offline |
| E-04 | fumo das 04:40 | rota; save |

**Resultado:** a secção fala como pessoas; os silêncios existem; nada muda no gameplay mensurável (sementes iguais).

## 3. Fase 2 — "Luz e lugar" (apresentação [A], alguns [B]) · Esforço M · Risco baixo · Impacto alto

| ID | Entrega | Prova |
| --- | --- | --- |
| E-06, E-10, E-11, E-12 | tabela de luz por hora, materiais dessaturados, sombras longas, poeira no abrigo | capturas A/B 7 h × 3 qualidades; contadores |
| E-01, E-03 | props de "antes" e decals de consequência | keep-outs; determinismo |
| E-07, E-08, E-09 | névoa do rio, haze de fumo, glare | A/B; "a MG continua visível no glare" |
| A-01, A-02, A-06, A-07 | água, apito, vibração da ponte, haze sonoro | WAV; equivalência de rota |
| S-02 | cartela 3 | HUD test |

**Resultado:** uma captura da missão transmite a identidade (sombria, fria, dessaturada, luz rasante).

## 4. Fase 3 — "Mãos e gestos" ([B], depende do ViewModel e do Animation Resolver) · Esforço L · Risco médio · Impacto médio-alto

| ID | Entrega | Dependência |
| --- | --- | --- |
| S-03 | troca de chapéu em primeira pessoa | ViewModel V5 |
| S-04, S-05, S-06 | targets nulos, relógio, caderno, caneca a rodar, cantil, Nowicki sentado, mão na cabeça | Animation Resolver (próxima tarefa anunciada) para olhar; props a `hand_l/r` |
| G-02 | gesto de Rusek | — |
| N-08, N-09, N-10 | sun glare callout, contagem por homem, prioridade de legendas | — |
| A-03, A-04, A-05 | passos, respiração de Bąk, acústica interior | — |

**Resultado:** os companheiros parecem humanos sem uma única cutscene nova.

## 5. Fase 4 — "Situações" ([B]/[C] de gameplay) · Esforço L–XL · Risco médio · Impacto alto

| ID | Entrega | Risco específico | Decisão |
| --- | --- | --- | --- |
| G-01 | MG que sobe a encosta | altera distribuição de impactos; **validar 12 sementes** (reparo e sobreviventes dentro das faixas atuais ±5 %) | recomendado |
| G-03 | pares com feridos no pelotão | tolerância de 90 s do gate leste; sobreviventes 12–18 | recomendado após medição |
| G-04 | transporte da ckm | 3 clips novos + sockets; kit ckm | recomendado (transforma O10) |
| G-07 | pelotão em lances a 1 km | ativação de apresentação sem combate | opcional |
| G-06 | carroças | prop + extras | opcional |
| S-08 | saída a pé do abrigo | rota automática | recomendado (barato) |

## 6. Fase 5 — "Ambição" ([C]/[D], decisões do Capitão) · Esforço XL

| ID | Entrega | O que exige | Recomendação |
| --- | --- | --- | --- |
| S-07 | plano exterior final (6 s) | câmara externa mínima | opcional; só depois de VO |
| G-05 | casamata visitável | geometria + colliders + luz + acústica | opcional |
| N-12, A-09 | VO em polaco; motivo musical | casting, licenças, gravação | **sim**, quando o roteiro for aprovado |
| G-08 | ferido ligeiro a trabalhar | novo estado | opcional |
| G-09 | Kowal suprime o tabuleiro | **[D]** altera contrato | só com aprovação explícita |
| G-10 | ckm jogável/veículos/pickups | World Interaction System | **não recomendado para M01** |

## 7. Dependências (grafo)

```
Issue #55 (V5 verde) ──► Fase 1 (vozes) ──► Fase 3 (gestos) ──► Fase 5 (VO/música)
                    └──► Fase 2 (luz/lugar) ─┘
Animation Resolver ────────────────────────► Fase 3 (olhar), Fase 4 (pares, ckm)
Station V3 aprovada ───────────────────────► E-02
Registo de localização decidido ───────────► Fase 1 (texto), Fase 5 (VO)
P-NOVA-1 (nomes) ──────────────────────────► N-11, VO
```

## 8. Riscos e mitigações

| Risco | Prob. | Impacto | Mitigação |
| --- | --- | --- | --- |
| Falas em FIFO atrasam avisos críticos | alta (sem N-10) | médio | Fase 1 só com falas ≤ 6 palavras em combate; N-10 na Fase 3 |
| Capturas A/B divergem por UUIDs/ordem assíncrona | média | baixo | método das entregas V2 (normalização) |
| Bias da MG altera resultados agregados | média | alto | 12 sementes, faixas ±5 %, reverter se falhar |
| Props novos em rotas | baixa | alto | keep-outs e teste de "nenhum prop em pontos percorridos" (Vegetation V1 já tem o padrão) |
| Decals/fumo novos agravam timeouts de FX no browser | média | médio | esperar o diagnóstico do PR #53; limitar registos de dano novos (E-04: 3, E-05: 1) |
| Nomes fictícios coincidem com vítimas reais | baixa | alto (ético) | P-NOVA-1 antes de gravar |
| Localização inconsistente (você/tu) | alta | médio | decisão prévia do Capitão; passagem única |
| "Atmosfera sombria" vira escuridão | média | alto | tabela de luz com exposição ≥ 1,0 e testes de legibilidade (MG visível no glare; clarões a 1,2 km visíveis) |
| Playtest humano continua ausente | certa | alto | nenhuma fase declara VALIDADO; protocolo do PR #44 |

## 9. Critérios de saída por fase

- **Fase 1:** 12 sementes iguais; Node verde; browser focado (HUD/legendas); nenhuma fala repete no restore; ≥ 40 falas novas audíveis numa partida automática completa (log do piloto).
- **Fase 2:** 21 pares A/B inspecionados; contadores dentro de +15 % triângulos/+5 draw calls por preset; equivalência de rota.
- **Fase 3:** A/B snapshot igual; sem campos novos obrigatórios; `priority` opcional validado.
- **Fase 4:** sementes dentro das faixas; gate leste sem timeouts novos; piloto automático `--cover help/ignore` repetido.
- **Fase 5:** licenças registadas; VO em três estados; música só nas duas aparições.

## 10. O que esta roadmap não promete

FPS no Chromebook, playtest humano, arte final de humanos, M02. Cada fase termina em `READY_FOR_CAPTAIN_REVIEW`, nunca em "aprovado".
