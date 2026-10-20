# Auditoria original → estado na continuação

**Fatia SP-08 posterior:** [clareza do posto e do papel durante a retirada](../continuity-sp08/HANDOFF.md), com [antes/depois e limites](../continuity-sp08/MATRIZ.md), na mesma PR #92. Contagem, ritmo e B4 preservados; SP-08 global continua parcial e não há nova nota de qualidade.

**Atualização posterior:** D3 e D4 já têm entregas próprias na origem da mesma PR #92: [D3](../continuity-d3/HANDOFF.md), [D4](../continuity-d4/HANDOFF.md), [comparação D4](../continuity-d4/MATRIZ.md). As pendências H9 abaixo são o estado histórico do lote P0; não anulam essas entregas posteriores. Sem promoção de aceitação humana ou integração na candidata.

Os sete relatórios A–G e as 15 respostas de CONCLUSOES pertencem a `8d420eb`, avaliando `68301b7`. [Originais completos e evidências](https://github.com/Brawl2007/COD-guerra/tree/codex/m01-audit-download-8d420eb/relatorios). Esta matriz não os substitui nem altera as notas. Base de desenvolvimento: **PR #91 `afaded912c5c3a7f8a4e6e567be9a98cd35ac24f`**, versão npm **0.2.0**, M01 Tczew.

Git prevalece sobre o texto desatualizado dos handoffs: PR #90 está contida em #80 `68301b7`; #91 contém #80 e também **D2 `048aedc`**, via merge `afaded9`. Não existe `-d2` remota separada na listagem consultada. A configuração do integrador #84 foi lida e permanece **PAUSED**, sem owner/token. A issue #72 regista [o escopo da continuação](https://github.com/Brawl2007/COD-guerra/issues/72#issuecomment-6278662723). T02/T04/T40 live: REUSE_OR_REVIEW_EXISTING, sem nova claim.

| Problema observado em 68301b7 | Correção já existente / continuação | Prova delimitada | Estado | Próxima ação |
|---|---|---|---|---|
| QI01 — defesa sem destino | #91 já tem posição no tabuleiro, área e marcador. Continuação liga a ordem real de rotação ao destino utilizável | `m01-pacing`, `m01-cover-guidance`, testes de direção/distância | PARCIAL | Avaliação humana sem conhecer coordenadas |
| QI02 — mesma cobertura recomendada | Continuação exclui ocupada, nós inativos e posições dentro dos sólidos; chegada reduz marcador | Testes com salva real e percurso por controlos; [ordem High](cover-order-high.png), [chegada](cover-arrival-high.png), [estado congelado](arrival-check.json) | CORRIGIDO E VERIFICADO | Playtest de compreensão e segurança percebida |
| QI03 — E anunciado fora de alcance | Uma oferta autoritativa para prompt e execução, incluindo estados/bloqueios | Fronteiras 3/4/5/6 m, estados, E nativo na caixa e Bąk | CORRIGIDO E VERIFICADO | Playtest de compreensão; alcance continua a ser horizontal como no contrato anterior |
| QI04 — guia acaba a 10 m, entrega exige 4 m | #91 já marca aid_position; continuação mantém guia até aos 4 m reais | Teste a 6 m; [guia a 5 m no browser](browser-final/rescue-guidance-small.png), E/tap e destino validado pela ação | CORRIGIDO E VERIFICADO (técnico) | Navegação humana até Dudek sem coordenadas |
| QI05 — falas sem VO | #91 acrescenta falas reativas, continua sem gravações de voz | Dados/contratos T45 e diagnóstico; sem escuta humana | AINDA PRESENTE | Produzir/licenciar/rever VO; não simular uma gravação inexistente |
| QI06 — abertura perde interlocutores | #91 varia poses, não demonstra novo enquadramento inicial | Auditoria antiga e diffs; sem novo playtest da abertura | NÃO VERIFICADO | Recorte de atuação e composição com prova em cadência normal |
| QI07 — acabamento humano provisório | #91 já melhora skins/variação; os modelos conservam a sua identidade atual | Evidência do Capitão e novas capturas High, sem nota comparativa | PARCIAL | Revisão artística, licença do fp-arms-v2 e PC alvo |
| QI08 — braço/arma após Bąk | Raiz do paciente separada do rig do jogador; contacto e orçamento preservados | Falha anterior de navegador, High antes/depois, checkpoint recarregado, ossos comparados em todas as poses | CORRIGIDO E VERIFICADO | Rever transições em cadência normal |
| QI09 — ordem de reparo após conclusão | #91 já condiciona continuity ao objetivo e espaça pistas. Continuação invalida mensagens com scope concluído | `m01-pacing` e testes de prioridade/estado | CORRIGIDO E VERIFICADO | Verificar com jogador humano |
| QI10 — assentamento vertical instantâneo | #91 já integra cápsula, gravidade, degraus e dano de queda | Entrega do Capitão preservada; regressões: golden 13 + 24 invariantes + Node 1482/1482 | IMPLEMENTADO MAS AGUARDA PROVA VISUAL | PC alvo; não reimplementar física |
| QI11 — defender conta como visita | Regra `holdAccessVisited` preservada; feedback melhora o significado militar | Código e contrato atual de progressão | AINDA PRESENTE | Decidir critério de defesa com playtest; sem mudar relógio ou objetivos por dedução |
| QI12 — caixa depende de observação incidental | #91 marca destinos; continuação une disponibilidade e apresentação das mãos | Prompt/ação e testes de transporte | PARCIAL | Avaliar percurso natural e feedback do sapador |
| QI13 — mãos esféricas da caixa | Continuação reutiliza rig/clips e solver de contacto; esferas só em fallback sem rig | Geometria/near-plane/movimento e [browser High inspecionado](crate-high.png) | CORRIGIDO E VERIFICADO | Revisão artística em cadência normal; geometria ainda provisória |
| QI14 — terreno/materiais | Sem reautoria neste lote | Amostra antiga e capturas atuais limitadas | NÃO VERIFICADO | Recorte visual High com terreno e uso humano do espaço |
| QI15 — cue ENE concorre com ordem oeste | Não alterado neste lote | Dados de apresentação existentes | AINDA PRESENTE | Prioridade do contexto da cena versus ordem militar |
| QI16 — música sem stems | Nenhum asset musical adicionado | Contratos/mapeamento existentes; sem escuta | AINDA PRESENTE | Produção musical e licenças |
| QI17 — alvos a ~1 km | #91 já aproxima assalto a ~430 m e melhora skins; D2 já integrada | Métricas do Capitão, sem novo teste humano de reconhecimento | PARCIAL | Aquisição de alvos no PC e decisão de geografia; não duplicar combate |
| QI18 — instrução interna no HUD | `beat.action` deixa de ser mensagem; token antigo preservado, fala continua | Teste de pré-roll, sem alegar gesto físico inexistente | CORRIGIDO E VERIFICADO | Futura encenação com condição real |
| QI19 — camadas de texto | #91 já tem hierarquia. Continuação prioriza confirmação/urgência e invalida pistas antigas | Testes da mesma linha de mensagens; sem HUD concorrente | PARCIAL | Revisão de composição em transições e resoluções menores |
| QI20 — guia repete MG enquanto reparo avança | Guia só pede supressão durante imobilização real; avanço normal usa estado do reparo | Teste de trabalho versus pinned, sem temporizador novo de spam | CORRIGIDO E VERIFICADO | Afinar com o playtest |

## Referências e limites

[Registo de acesso](reference-access.json): Steam/WaW e pesquisas de campanha WWII e COD 1 receberam CONNECT 403. Não foi observado gameplay externo nem verificado timestamp. As ideias aqui implementadas decorrem da simulação e dos defeitos demonstrados no nosso jogo. A documentação do Capitão e o Fable #56 são propostas, não prova audiovisual de um Call of Duty. Não foram copiados código, imagens, sons, ícones ou assets proprietários.

## Continuação depois do lote de correções

1. Avaliar direção sem coordenadas, transições do ferido/caixa em cadência normal, ouvido humano e High no PC alvo.
2. D2 já existe. A fatia de seleção/indicação de nível da D5 está implementada e passou nos três casos de navegador; saves antigos permanecem Recruta. D3 (causa de morte, apresentação e CP-B2), D4 e oferta de baixar nível continuam pendentes.
3. SP-08: dar utilidade à escolta/corredor preservando B4 e as horas fixas; não eliminar a entrega de Bąk para encurtar a espera.
4. 114/115 continuam sem uma mecânica de encravamento; não disparar falas falsas. T45 e revisão nativa do polaco continuam dependências reais.
5. Atuação da abertura/chamada e arte High constituem os recortes seguintes; uma nova avaliação humana é necessária antes de declarar a M01 pronta.

A validação do lote e as versões exatas estão no [handoff](HANDOFF.md): Node 1482/1482 em ce70422; grupo browser 14/15 + correção 1/1 em 35f3215, sem alteração de produção; build/bundle PASS. Partida contínua em Soldado PASS: 12/12 objetivos, quatro checkpoints, Bąk entregue, saúde final 100, zero mortes/restauros e erros de página/HTTP; [report e limites](continuous-covered/report.json). Low 640×360; sem nova nota de qualidade ou playtest humano.
