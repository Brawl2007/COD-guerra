# Reconciliação de progresso M01 — 2026-10-14

A contagem anterior de 16 concluídas e 35 pendentes usou o quadro da pilha T08/T12 e omitiu dez tarefas já aceites na pilha `claude/m01-integration`. O trabalho continua no Git. Ausência numa branch não significa tarefa não executada.

O quadro corrigido confirma **26 tarefas principais DONE/ACEITE**: T04, T08, T09, T10, T12, T13, T15, T16, T17, T18, T19, T20, T22, T23, T25, T27, T28, T29, T30, T31, T32, T33, T35, T39, T42 e T44. Mantém as aceitações históricas, sem alegar uma nova execução conjunta. A lista e os metadados consultados estão em [branch-audit.json](branch-audit.json).

| Entrega omitida | Fonte aceite | Integração comprovada por Git | Prova CI da fonte |
|---|---|---|---|
| T09 / T28: texturas e terreno | `c739b08`, branch `codex/m01-t09-t28-materials-closeout-v1` | `3bdcd99` | [38174455690](https://github.com/Brawl2007/COD-guerra/actions/runs/38174455690), [38174455699](https://github.com/Brawl2007/COD-guerra/actions/runs/38174455699) |
| T13 / T32: estruturas de campo | `cbbe0d7`, branch `codex/m01-t13-t32-field-structures-v1` | `80b0474` | [38225594014](https://github.com/Brawl2007/COD-guerra/actions/runs/38225594014), [38225594010](https://github.com/Brawl2007/COD-guerra/actions/runs/38225594010) |
| T31 / T33: via e props | `6878d01`, branch `codex/m01-t31-t33-rail-props-v1` | `096a393` | [38279380748](https://github.com/Brawl2007/COD-guerra/actions/runs/38279380748), [38279380744](https://github.com/Brawl2007/COD-guerra/actions/runs/38279380744) |
| T27 / T30: relevo e paisagem | `4e5389b`, branch `codex/m01-t27-t30-relief-horizon-v1` | `14d37c5` | [38376693678](https://github.com/Brawl2007/COD-guerra/actions/runs/38376693678), [38376693616](https://github.com/Brawl2007/COD-guerra/actions/runs/38376693616) |
| T10 / T29: vegetação | `cc3f459`, branch `codex/m01-t10-t29-vegetation-v2` | `403c748` | [38432707375](https://github.com/Brawl2007/COD-guerra/actions/runs/38432707375), [38432707503](https://github.com/Brawl2007/COD-guerra/actions/runs/38432707503) |

Todos os cinco HEADs de entrega são antepassados de `claude/m01-integration` @ `8a0c3622f5375f2c5b5e847db71f4f6e8352ae39`, cujo [CI38470792716](https://github.com/Brawl2007/COD-guerra/actions/runs/38470792716) está verde. Nenhum é antepassado da branch continuity-raid auditada em `bf202b39e52d741d59ea0096c8b24a56c404754b`. Portanto, a minha integração recente de T02-min/T03-lite/T25 não reuniu essas dez entregas. A pilha `claude/m01-integration` também conserva estados antigos para T08/T22/T23/T25; escolher apenas o quadro dela produziria outro erro.

Há trabalho adicional que também precisa de aparecer no acompanhamento:

- T05a: campos/zonas/superfícies existem em `899937f`; [CI38120863543](https://github.com/Brawl2007/COD-guerra/actions/runs/38120863543) PASS.
- T06a: núcleo de áudio em `9596059`; [CI38132511927](https://github.com/Brawl2007/COD-guerra/actions/runs/38132511927) PASS.
- T06b: director e música em `af81657`; [CI38138498956](https://github.com/Brawl2007/COD-guerra/actions/runs/38138498956) PASS. Esta branch contém as duas anteriores. As subtarefas não são contadas como três novas tarefas principais; a aceitação integral de T05/T06 ainda não foi demonstrada nesta auditoria. Não confundir o director de áudio com o âmbito completo T21 (clarões/ambiente).
- T14/T41: implementação publicada em `fd2b0c7`, mas o seu README declara BLOCKED, nenhuma aceitação e verifier/performance FAIL. Os CI38528756419/38528756490/38533402254 falham; há correções delimitadas pendentes. Não marcar como AUSENTE nem como ACEITE.
- Áudio real `235cf4b` e war-scars `7010f0f` estão explicitamente WIP/não verificados. War-scars foi retomado seletivamente e aceite em T09/T28; não contar duas vezes.
- H9-D1 (`5745e48`) é uma entrega parcial de dificuldade, fora das tarefas numeradas deste quadro.
- T53 foi acrescentada por decisão do utilizador em `claude/m01-decisions-d37-v1` @ `d5afc09`: app de PC instalável depois de T51/T52. Essa decisão e definição continuam na branch de origem.

Contagem conservadora: o quadro T00–T52 tem 52 linhas porque T11 está incorporada em T24. Das 51 não anuladas, 26 têm fecho registado e 25 não. Acrescentar T53 resulta em **26 com fecho e 26 sem fecho formal**, mais T01 anulada. Os itens sem fecho incluem trabalho parcial e entregas com CI verde; não representam 26 implementações por começar. O número de sessões, commits ou subtarefas concluídas pode ser maior que o de tarefas principais aceites.

Verificação desta correção: leitura dos handoffs e do README bloqueado, consulta dos HEADs remotos, ancestria Git e metadados CI ao vivo. Nenhum teste do jogo foi reexecutado, nenhum código de outras branches foi integrado e nenhuma aprovação humana foi inferida. A união funcional das pilhas precisa de um merge próprio e verificação no resultado.
