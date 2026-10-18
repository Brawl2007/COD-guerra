# COD-guerra — PROTOCOLO DE PLAYTEST HUMANO E AVALIAÇÃO NARRATIVA · 30 MISSÕES

> **PROTOCOLO PREPARADO, NÃO EXECUTADO.** `IMPLEMENTATION_PLAN.md` e `DEVELOPMENT_STATUS.md` distinguem M01 **PROTÓTIPO JOGÁVEL** de M02–M30 **PLANEADAS**. O piloto automático do navegador **não** substitui testador humano. Não existem nesta entrega sessões humanas, medições novas de FPS, gravações ou resultados de jogadores.

## Como testar sem fingir qualidade

| Gate | M01 | M02–M30 |
|---|---|---|
| Revisão do tratamento narrativo | V2 pronto para revisão | V2 pronto para revisão |
| Story Bible e storyboard | Escrita/planeamento existente + expansão V2 | Propostas escritas, não arte final |
| Validar história por local/setor | Pesquisa M01 existente, com pendências | Matriz parcial de fontes, ainda não liberada |
| Navegar em build real | O protótipo pode ser jogado; piloto automatizado documentado | **BLOQUEADO** até gameplay implementado |
| Testar cutscenes in-engine | Somente as cenas realmente presentes; avaliar limitações do runtime | **BLOQUEADO** até implementação |
| Convidar jogadores e registar feedback | Próxima etapa executável com autorização/convite e jogo acessível | **BLOQUEADO** até uma vertical slice de cada missão |
| Certificar 10/10 | Não certificado | Não certificado |

## Protocolo M01 (20–35 minutos por sessão)

**Preparação:** confirmar build/HEAD/branch; utilizar um Chromebook de referência ou computador com hardware registado; ligar gravação consentida de ecrã+som se possível; não revelar objetivos do teste ao participante; não enviar telemetria pessoal sem consentimento.

**Amostra mínima de arranque:** 3 a 5 jogadores com diferentes níveis de familiaridade com FPS, apenas como ensaio formativo (não é validação estatística); idealmente realizar mais testes após cada alteração maior. Pelo menos uma sessão com requisitos de acessibilidade.

**Instrução curta ao jogador:** “Joga esta missão como jogarias um FPS desconhecido. Podes comentar o que te confunde. Não vou indicar por onde deves ir, exceto se o jogo bloquear.”

**Observação de comportamento sem interromper:**

1. No posto, identificar Jan, Zieliński e Nowicki ou pelo menos a relação que o café estabelece. O jogador move-se livremente ou fica preso à cutscene?
2. No caminho, medir tempo para descobrir posto, rotas e cobertura sem orientação externa. Registar a primeira pergunta feita pelo jogador.
3. Bombardeio de 04:34: verificar se percebe origem/risco/ordem, se o zumbido é desconfortável e se entende por que saiu da posição.
4. Proteção dos engenheiros: observar se lê fogo alemão e cobertura real, se os aliados parecem vivos e se o HUD serve de apoio sem substituir a cena.
5. Ferimento de Bąk: jogador identifica a ocorrência e compreende quem o pode transportar? Não insinuar que salvamento de Nowicki é possível.
6. Demolições e retirada: visualizar estado das pontes e evitar confusão com objetivo seguinte. Observar silêncio e chamada final.
7. Após finalizar, perguntar que objeto/personagem recorda, como percebeu o resultado da batalha e qual área parecia menos realista.

**Dados registados por sessão:** dispositivo/OS, preset, resolução, FPS se realmente medido, build e commit; tempo por segmento, mortes/reloads, intervenções do facilitador, momentos em que ficou perdido, entendimento de falas, classificação verbal, observações sobre texturas/figuras/soldados, defeitos auditivos, sentimentos finais. Gravar um problema com timestamp + gravação/captura, não apenas 'mau gráfico'.

### Escala de avaliação com âncoras

| Dimensão | 0–2 | 3–5 | 6–8 | 9–10 |
|---|---|---|---|---|
| Objetivos e navegação | Não compreende | Depende de ajuda | Compreende com hesitações | Intuitivo sem perder tensão |
| Vínculo humano | Indiferente / confuso | Reconhece nomes sem vínculo | Recorda personagem/objeto | Descreve espontaneamente relação e mudança |
| Variedade de gameplay | Repetição bloqueante | Tarefas muito semelhantes | Mistura satisfatória | Alternância orgânica sem filler |
| Gráficos/ambiente | Mundo de caixas/planos | Evidentes padrões repetidos | Credível com lacunas | Personalidade local convincente até em movimento |
| Soldados/atuações | Robóticos e indistintos | Com alguns gestos naturais | Expressivos mas limitados | Rosto, uniforme, movimento e direção natural coesos |
| Cinematografia/áudio | Ausente ou confusa | Montagem técnica | Bem encenada | Tensão, espaço e consequência claramente sentidos |
| Estabilidade/performance | Bloqueios ou quedas frequentes | Erros graves | Jogável com custo mensurável | Estável dentro do orçamento por preset |
| Impacto do final | Incompreendido | Lembrança superficial | Reconhece resultado e perda | Reconhece consequência sem explicação extra |

**Atenção:** 10/10 significa objetivo de experiência atingido em amostra relevante e sem bloqueadores, **não** um número atribuído por entusiasmo do avaliador. Relatório deve incluir observações negativas sem maquilhagem.

## Sondas exclusivas para cada missão

Estas são perguntas e condições futuras para teste, **não dados de jogadores**. Podem também guiar revisão de protótipos em papel/animatic para M02–M30, desde que o resultado seja explicitamente “teste narrativo sem gameplay”.

### M01

- **Pergunta ao jogador:** Lembra-se de Nowicki antes do bombardeio? Conseguiu explicar por que carrega a caneca?
- **Sinais de falha observáveis:** confusão sobre missão/rota; objetivo de Bąk atrás do jogador; HUD cobrindo composição; queda de FPS no bombardeio.
- **Checks de continuidade:** estado de Nowicki `missing`, Bąk/Dudek e demolições 06:10/06:40.

### M02

- **Pergunta ao jogador:** Reconhece diferença entre avanço inicial e retirada? Identifica Lis e a estrada?
- **Sinais de falha observáveis:** fase de pomar/vala repetitiva, inimigo teletransportado, falta de sinais da pressão lateral.
- **Checks de continuidade:** Lis ferido/evacuado e passagem para M03.

### M03

- **Pergunta ao jogador:** Entende por que retorna ao porão? Sabe encontrar a saída danificada sem seta omnisciente?
- **Sinais de falha observáveis:** interiores idênticos, civis como obstáculos, capitulação em data errada.
- **Checks de continuidade:** Lis só se presente e civil opcional refletido.

### M04

- **Pergunta ao jogador:** Consegue encontrar um barco sem HUD milagroso? Sente o destino condicional de Whitfield?
- **Sinais de falha observáveis:** barcos estáticos, corredor de feridos burocrático, ataque aéreo sem aviso.
- **Checks de continuidade:** Whitfield evacuado/desaparecido/capturado conforme flags.

### M05

- **Pergunta ao jogador:** Pilotar exige decisões claras sem joystick especial? Reconhece o ala e combustível/danos?
- **Sinais de falha observáveis:** avião congelado, indicador de velocidade invisível, tentativa de pouso injusta.
- **Checks de continuidade:** danos/combustível/formação salvos.

### M06

- **Pergunta ao jogador:** Consegue ler distâncias e posição de apoio coletivo? O atendimento final tem propósito?
- **Sinais de falha observáveis:** mesmo deserto plano em todas as direções, arma sem loader, blindados de brinquedo.
- **Checks de continuidade:** Fraser/Ellis/Morrow em transição M11.

### M07

- **Pergunta ao jogador:** Consegue distinguir vias pela neve? Sente o frio sem medidor artificial?
- **Sinais de falha observáveis:** visibilidade injusta, trenó incapaz de passar, dia de ocupação errado.
- **Checks de continuidade:** 7/8 dezembro e Saveliev presente/substituto.

### M08

- **Pergunta ao jogador:** Interpreta a calma como tensão e não bug? Descobre aeródromo sem marcador mágico?
- **Sinais de falha observáveis:** praia com inimigos falsos, selva repetida, frota estática.
- **Checks de continuidade:** estado de Brooks, Cole/Gray/Marsh para Okinawa.

### M09

- **Pergunta ao jogador:** Sente vulnerabilidade na travessia e percebe nomes do grupo?
- **Sinais de falha observáveis:** barco/trovoadas invisíveis, cenário urbano igual em todas as ruas.
- **Checks de continuidade:** transporte, mortos e feridos não duplicados.

### M10

- **Pergunta ao jogador:** Consegue orientar-se por galpões diferentes? Percebe ligação com Rybin?
- **Sinais de falha observáveis:** mesma textura em cada oficina, morte de Rybin não preparada.
- **Checks de continuidade:** Rybin morto em todos os saves pós-evento.

### M11

- **Pergunta ao jogador:** Sabe qual é o corredor seguro sem manual de minas? Sente barragem de 21:40?
- **Sinais de falha observáveis:** escuro demasiado ou excessivamente claro, artilharia sem escala.
- **Checks de continuidade:** Daniel/Fraser/Ellis/Morrow coerentes M06.

### M12

- **Pergunta ao jogador:** Percebe que a informação muda e toma uma decisão de recuo plausível?
- **Sinais de falha observáveis:** aliados parecem incompetentes arbitrariamente, relatórios todos falsos.
- **Checks de continuidade:** ordem dos grupos e transporte não clonados.

### M13

- **Pergunta ao jogador:** Identifica funções da tripulação e danos do T-34/76?
- **Sinais de falha observáveis:** tanque move-se como câmera livre, tiros sem peso, IA de tanque teleportada.
- **Checks de continuidade:** torre/casco/danos/sobreviventes em reload.

### M14

- **Pergunta ao jogador:** Dirige sem bater em colisores invisíveis? Identifica rota e moradores?
- **Sinais de falha observáveis:** jeep sem passageiros, percursos repetitivos, civis sem comportamento.
- **Checks de continuidade:** estado de comboio/Price para M18.

### M15

- **Pergunta ao jogador:** Entende por que seu barco parou no recife, mas LVT passou?
- **Sinais de falha observáveis:** água simples de uma textura, profundidade impossível, praia copiada de Omaha.
- **Checks de continuidade:** maré/ondas/distâncias não ressetadas.

### M16

- **Pergunta ao jogador:** Usa relevo e reconhece a carta na abertura/final?
- **Sinais de falha observáveis:** parede de montanha falsa, carta sem vínculo, 'boss fight' inventado.
- **Checks de continuidade:** 17→18 maio, equipe de carregadores.

### M17

- **Pergunta ao jogador:** Consegue encontrar aliados por pistas sensoriais sem HUD total?
- **Sinais de falha observáveis:** flak só cenário, pára-quedas futurista, escuridão ilegível.
- **Checks de continuidade:** pontos de dispersão e reunidos persistentes.

### M18

- **Pergunta ao jogador:** Identifica Bell, Morgan e Price e lê cobertura de Fox Green?
- **Sinais de falha observáveis:** cópia de cena clássica, tiro sem cobertura possível, praia vazia depois.
- **Checks de continuidade:** Price ferido/evacuado refletido na M19.

### M19

- **Pergunta ao jogador:** Usa sebes para flanquear e respeita combatente rendido?
- **Sinais de falha observáveis:** IA vê através da sebe, o mapa é um labirinto de cubos.
- **Checks de continuidade:** Price/substituto e rendição ficam no estado.

### M20

- **Pergunta ao jogador:** Entende as transições 17→21→25 setembro e o destino possível de Reed?
- **Sinais de falha observáveis:** três atos apressados, inventário reiniciado, barco que espera sempre.
- **Checks de continuidade:** estado de Whitfield e travessia do Reno.

### M21

- **Pergunta ao jogador:** Consegue navegar por relevo sem luz permanente de HUD?
- **Sinais de falha observáveis:** árvores iguais em grelha, dano invisível por artilharia, ecos incoerentes.
- **Checks de continuidade:** feridos/reunião e acessos após reload.

### M22

- **Pergunta ao jogador:** Percebe defesa a colapsar e consegue proteger a retirada?
- **Sinais de falha observáveis:** voz de rádio sem informação, combate sem geografia, vitória falsa.
- **Checks de continuidade:** 16→17 dezembro, listas parciais.

### M23

- **Pergunta ao jogador:** Entende três fases, objeto das luvas e separação de Foy?
- **Sinais de falha observáveis:** troca de mapa sem data, fatiga reiniciada, repetição de combate.
- **Checks de continuidade:** 23/26 dezembro e 13 janeiro persistentes.

### M24

- **Pergunta ao jogador:** Sente peso do solo vulcânico e perigo indireto?
- **Sinais de falha observáveis:** Iwo = Omaha com solo preto, Suribachi capturado 19/2.
- **Checks de continuidade:** feridos, veiculos, bandeira não antecipada.

### M25

- **Pergunta ao jogador:** Compreende por que a ponte deve permanecer utilizável?
- **Sinais de falha observáveis:** atravessadores fantasma, tabuleiro inacessível, colapso 7/3.
- **Checks de continuidade:** captura 7/3, colapso em 17/3 só no debrief.

### M26

- **Pergunta ao jogador:** Percebe tensão sem combate inicial e respeita os civis?
- **Sinais de falha observáveis:** praia falsamente cheia de inimigos, Okinawa parece Guadalcanal idêntica.
- **Checks de continuidade:** Cole/Gray/Marsh coerentes até M29.

### M27

- **Pergunta ao jogador:** Reconhece que Seelow não termina 16/4?
- **Sinais de falha observáveis:** fog opaco para mascarar falta de tropas, spam de objetivos iguais.
- **Checks de continuidade:** Orlov e aliados com história desde M07.

### M28

- **Pergunta ao jogador:** Sabe quando parar de disparar e distingue rendidos?
- **Sinais de falha observáveis:** mortes após rendição, áudio muted instantaneamente, civis como inimigos.
- **Checks de continuidade:** cessar-fogo persiste em checkpoint.

### M29

- **Pergunta ao jogador:** Reconhece Cole ferido e evita inventar combate no castelo vazio?
- **Sinais de falha observáveis:** Cole regressa ativo, lama sem física, Shuri com boss fictício.
- **Checks de continuidade:** Cole evacuado e 29/5 com retirada japonesa.

### M30

- **Pergunta ao jogador:** Sente o final sem combate e identifica objetos dos arcos?
- **Sinais de falha observáveis:** capítulo é só cutscene passiva, signatários falsos, personagens teletransportados.
- **Checks de continuidade:** epílogos condicionais e cerimónia datada corretamente.

---

## Ficha compacta para recolha de feedback real

```text
PLAYTEST_ID: 
Missão e versão/commit:
Dispositivo / resolução / preset:
Experiência com FPS: principiante | intermédio | experiente
Duração real e segmentos:
Conclusão: sim | não | porquê
Número de intervenções externas:
Três momentos memoráveis:
Três pontos frustrantes/confusos:
Personagem ou objeto lembrado sem sugestão:
Ação repetitiva que cortaria:
Problema visual mais visível:
Nota objetivos (0–10) e evidência:
Nota personagens (0–10) e evidência:
Nota gráficos (0–10) e evidência:
Nota cinemática (0–10) e evidência:
Estado técnico: frame rate medido / não medido, crashes, bloqueios
Resultado: BLOQUEADOR | ALTO | MÉDIO | BAIXO
Timestamp/captura/log associado:
Consentimento para gravação: sim | não
```

## Método de decisão por sprint

1. Em cada sessão, identificar problemas concretos, não opiniões isoladas sem contexto.
2. Agrupar por bloqueio de progressão, compreensão, personagens, gráfica, áudio, monotonia, desempenho.
3. Priorizar problemas que afetam mais jogadores ou impedem compreensão/ação, preservando história e estado.
4. Implementar correção em branch isolada, com antes/depois e testes focados.
5. Repetir sessão com novo grupo de jogadores; não usar apenas o mesmo autor a validar a sua correção.
6. Marcar **VALIDADA** só depois de missão completa, historicidade revisada, evidência técnica e experiência humana.

## Estado do presente trabalho

- Foram preparados **30 roteiros de sondagem** e um protocolo de teste humano M01.
- **0 sessões humanas realizadas nesta tarefa**; nenhuma nota de jogadores foi inventada.
- **M02–M30 bloqueadas para playtest real** até existirem builds jogáveis específicos. Antes disso, só leitura de script, ensaio de voz ou animatic podem ser avaliados, sempre rotulados corretamente.
