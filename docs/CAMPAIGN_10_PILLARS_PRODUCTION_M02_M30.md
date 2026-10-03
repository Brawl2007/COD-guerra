# Fechamento dos 10 pilares de roteiro — M02–M30

Branch: `codex/campaign-cinematic-m02-m30`

Este documento fecha os 10 pontos que faltavam entre "boa ideia de campanha" e "roteiro pronto para virar missão jogável". Ele complementa:
- `docs/PROMPT_MESTRE.txt`
- `STORY_BIBLE.md`
- `docs/CAMPAIGN_CINEMATIC_DIRECTION_M02_M30.md`
- `docs/CAMPAIGN_WAW_INSPIRED_GRAMMAR_M02_M30.md`
- `docs/CAMPAIGN_CHARACTER_ARCS_M02_M30.md`
- `docs/CAMPAIGN_MAP_BIBLE_M02_M30.md`

M01 permanece fora deste pacote porque já está em desenvolvimento.

---

# 1. ROTEIRO COMPLETO E RITMO

Duração padrão: **20–25 min**, alvo nominal 22–23 min.

Toda missão deve ter:
- 12–16 beats principais;
- nenhum trecho >60 s sem informação, emoção, decisão, deslocamento significativo ou mudança de mundo;
- pelo menos 1 grande set-piece;
- pelo menos 1 pausa silenciosa ativa;
- pelo menos 1 reversão;
- pelo menos 1 consequência observável.

Formato de produção:
`00:00–02:00`, `02:00–04:00`, etc., com beats intermediários de 30–60 s quando necessário.

Cada beat registra:
- `beat_id`;
- faixa de tempo;
- objetivo atual;
- setor;
- atores;
- evento;
- mudança de mundo;
- áudio;
- saída para próximo beat.

---

# 2. PESQUISA HISTÓRICA INDIVIDUAL

Cada M02–M30 recebe `missions/<id>/HISTORICAL_RESEARCH.md` antes da arte final.

Obrigatório registrar:
- data/faixa horária;
- local;
- operação;
- formação/unidade;
- subunidade quando confirmada;
- eixo de avanço/recuo;
- armamento/equipamento;
- veículos;
- clima/terreno;
- marcos;
- resultado histórico;
- fontes;
- grau de certeza.

Classificação:
- `EXACT`
- `RECONSTRUCTED`
- `COMPRESSED_FOR_GAMEPLAY`
- `GAMEPLAY_DRAMATIZATION`

Nenhuma fonte geral de batalha aprova automaticamente uma rua, bunker, uniforme ou encontro pessoal.

---

# 3. LAYOUT CONCRETO DE MAPA

Cada missão recebe um fluxo espacial de produção:

`ENTRY → LANDMARK A → CONTACT → LANDMARK B → REVERSAL → CLIMAX → EXIT`

Para cada trecho:
- comprimento aproximado;
- elevação;
- orientação;
- linha de visão;
- cobertura;
- interiores;
- rotas alternativas;
- veículos;
- batalha média/longa;
- estado inicial;
- transformação durante a missão.

O mapa deve existir como lugar antes de existir como arena.

---

# 4. ELENCO E DIÁLOGOS

Cada missão precisa de:
- protagonista;
- líder/âncora;
- 1–3 companheiros reconhecíveis;
- vozes e silhuetas diferentes;
- relações;
- estados de entrada/saída;
- 20–40 falas úteis distribuídas entre combate, pausa, rádio e consequência.

Personagens recorrentes:
- envelhecem;
- mudam equipamento;
- carregam ferimentos;
- lembram perdas;
- não reiniciam personalidade.

Mortes/ausências/ferimentos ficam persistentes.

---

# 5. EVENTOS LIGADOS AO GAMEPLAY

Todo beat importante precisa virar estado real.

Schema conceitual:
```
event_id
mission_id
sector_id
start_condition
start_time
actors
world_changes
objective_changes
audio_cues
save_fields
completion_condition
fallback
```

Nenhum evento narrativo importante pode depender apenas de:
- câmera;
- distância;
- cutscene;
- renderer.

A simulação decide. O renderer apresenta.

---

# 6. BRIEFING E TRANSIÇÃO

Cada missão recebe briefing original de **20–45 s**:
- mapa estilizado;
- data;
- lugar;
- unidade;
- contexto;
- 1–3 fatos confirmados;
- linha da frente;
- ligação com missão anterior;
- transição para primeiro frame jogável.

Sem copiar identidade gráfica de COD/WaW.

O briefing deve responder:
1. Onde estamos?
2. O que mudou desde a última missão?
3. O que nossa unidade está tentando fazer?
4. Qual é a escala da operação?

---

# 7. ÁUDIO E CINEMATOGRAFIA

Cada missão recebe:
- assinatura sonora;
- paleta;
- hora;
- clima;
- cor dominante;
- contraste;
- música;
- silêncio;
- sons próximos/médios/distantes;
- momentos de revelação visual;
- câmera controlável ou não;
- prioridade de diálogo.

Regra:
**o jogador perde controle somente quando a cena realmente exige.**

Grandes momentos preferem câmera jogável.

---

# 8. CONSEQUÊNCIAS DE CAMPANHA

Flags globais por personagem/evento relevante:
- `alive`
- `wounded`
- `evacuated`
- `missing`
- `captured`
- `dead`

Flags ambientais:
- objeto herdado;
- carta;
- luvas;
- arma/equipamento;
- relação;
- ferimento;
- ausência.

M30 lê os estados acumulados.

Não reunir fisicamente personagens de frentes incompatíveis.

---

# 9. OBJETIVOS, CHECKPOINTS, FAIL STATES E SKIP

Cada missão:
- 10–15 objetivos/eventos;
- 4–6 checkpoints;
- opcionais limitados;
- condições de falha explícitas;
- atores essenciais conhecidos;
- fallback para NPC atrasado;
- estado de skip;
- estado de restart;
- save coerente.

Checkpoint nunca salva:
- durante dano inevitável;
- queda;
- explosão sem saída;
- ponte bloqueada irrecuperável;
- transição incompleta.

Skip consome eventos de forma idempotente.

---

# 10. TESTE CONTRA REPETIÇÃO

Antes de aprovar duas missões consecutivas, comparar:

- abertura;
- ambiente;
- mecânica dominante;
- primeiro contato;
- reversão;
- set-piece;
- papel do companheiro;
- silêncio;
- clímax;
- final;
- paleta;
- som.

Regra forte:
**se trocar os mapas entre duas missões e os roteiros continuarem funcionando, pelo menos uma delas ainda está genérica.**

Também rejeitar:
- terceira missão seguida com "defender corredor";
- terceira missão seguida com "companheiro ferido";
- morte de personagem como clímax repetido;
- desembarques idênticos;
- rádio sempre como única fonte de reversão;
- final sempre com chamada nominal;
- batalha sempre começando por bombardeio.

---

# Gate de produção

Uma missão M02–M30 só pode sair de `PLANEJADA` quando estes 10 itens estiverem fechados no nível da missão.

Estados:
- `PLANEJADA`: direção geral existe.
- `ROTEIRO DE PRODUÇÃO`: 10 pilares fechados.
- `PROTÓTIPO JOGÁVEL`: fluxo implementado.
- `EM POLIMENTO`: fluxo estável, arte/áudio/atuação em refinamento.
- `VALIDADA`: pesquisa, gameplay, save, browser, performance e playtest aprovados.
