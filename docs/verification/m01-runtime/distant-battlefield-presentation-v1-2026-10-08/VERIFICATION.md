# Verificação independente — resultados e resolução

Verificador: subagente independente, só leitura, sobre a HEAD `16ba780` (runtime `24d2ed7`, base `99309d9`). O que fez:
- correu o teste focado (15/15), a suíte Node completa num worktree limpo (339/339) e o build (mesmo hash que `logs/build.log`);
- fez um merge de ensaio com a FX V3 e a branch da arma: 367/370, com as 3 falhas da V3 também na V3 sozinha;
- aplicou 12 mutações numa cópia descartável: 9 foram apanhadas e 3 sobreviveram (M6, M7, M12);
- conferiu os documentos contra o código, os relatórios e as imagens.

Não correu navegador.

| Item | Resultado do verificador |
|---|---|
| Âmbito e autoridade | PASS: só `src/render/*`, testes e ferramentas. O renderer só lê `sim.clock`, a identidade de `sim.world`, `sim.consumed` e `world.heightAt` (pura). O plano não recebe jogador, câmara nem qualidade. |
| Requisitos | PASS: cada pedido tem código. A curta distância e o áudio estão declarados fora do âmbito. |
| Testes e build | PASS, com 2 testes que não podiam falhar (P9, P10). |
| Integração com a FX V3 | PASS. |
| Exactidão das provas | FALHA: os números principais conferem, mas havia exageros, omissões e afirmações sem artefacto (P4–P8, P11–P15). |
| Documentos de estado | FALHA: `NEXT_CHAT_CONTEXT.md` desactualizado (P1–P3). |
| Higiene | PASS. |

Resolução em `6ffa820` (código, testes, ferramentas), `5c5eed1` (frame de captura) e no commit de documentação seguinte:

| # | Constatação | Resolução |
|---|---|---|
| P1 | `NEXT_CHAT_CONTEXT.md` ainda dizia que a camada usava `atmosphere.billboardBatch`. | Corrigido: a camada só lê `atmosphere.texture` e tem batch e material próprios. |
| P2 | «+6 linhas» em `m01-view.js`; são +7. | Corrigido. |
| P3 | Rótulos «T2 + V3 + T1» sem definição. | Corrigido: o texto nomeia os commits. |
| P4 | Os frames de traçante (eye-03, eye-09) davam 0 píxeis e não estavam em CAPTURES; nenhuma captura mostrava um traçante. | **Diagnosticado e documentado.** O fixture ganhou uma passagem «xray» (profundidade da camada desligada). Em eye-02/03/09 dá 34–54 px contra 0 visíveis: a camada está lá, tapada pelo aterro ferroviário a norte do bolso da cabeça de ponte. Frames novos com linha de vista: <ul><li>probe-13: ponto alcançável a norte do aterro, 33 px;</li><li>eye-14: linha norte do olho do jogador, 620 px;</li><li>eye-15: olho do jogador na ponte rodoviária, posição genuína da rota, 42 px, traçante visível.</li></ul> Linhas e limitação em CAPTURES/HANDOFF. |
| P5 | Distâncias: os impactos das peças do norte chegavam a 735 m da área (abaixo dos 800 m de S4 e da «0,85 km» declarada); a quinta fica a 1,3 km. | **Corrigido em código.** As peças passam a cair nas obras de campo polacas (854–1237 m). A frente norte tem `minDistance` 800 (S4), testada por construção. O HANDOFF dá os intervalos por item, medidos a partir da borda da área de movimento. |
| P6 | A resposta das trocas conta a partir do fim da rajada, quando este é posterior à chegada; nenhum teste (M12 sobrevivia). | Redacção corrigida (o que acontecer depois: fim da rajada ou chegada) e teste novo, que apanha M12. |
| P7 | A coluna longínqua chega a ~240–400 m e a névoa atinge 80 % aos 4,88 km, não ~6 km. | Corrigido no HANDOFF e nos comentários, com os intervalos calculados. |
| P8 | «Testado por construção (duas horas…)» para figuras/veículos, que só eram testados na rota. | Teste novo: figuras, veículos, peça anticarro e colunas a cada 4 s ao longo de duas horas, nas duas fases da planície. A redacção diz o que cada teste cobre. |
| P9 | A asserção do pool de aviões não podia falhar: o plano cortava a lista em 21 (M6 sobrevivia). | O plano já não corta. O teste verifica o limite por construção (baldes que um voo pode sobrepor × maior elemento ≤ 21) e apanha M6 e voos mais longos. |
| P10 | O teste do restore não exercitava o reset por identidade do mundo (M7 sobrevivia). | O teste cobre restore para um save anterior, posterior e no mesmo relógio; apanha M7. |
| P11 | «Nenhum pool satura na rota» com 5 snapshots; os puffs chegavam a 165/168 na rota e a 186 com todas as frentes. | Pool de puffs 168 → 224. Teste novo: a rota inteira em Alta a cada 0,25 s e todas as frentes durante uma hora, com as contagens pedidas. |
| P12 | Custo JS sem script nem log; «20 748 relógios» não batia com os 20 976 ticks da rota. | Script e saída commitados ([`logs/plan-cost.mjs`](logs/plan-cost.mjs), [`logs/plan-cost.jsonl`](logs/plan-cost.jsonl)): 20 976 ticks; primeira versão 197–209 µs por chamada, actual 67–70 µs (Node relativo). |
| P13 | Afirmações sem artefacto: o probe de rascunho «25 px», os números 87/739 de `bdfbab7` e «capturas antes/depois idênticas». | O probe de rascunho deu lugar aos frames 13 e 15, commitados. Os relatórios de `3e0d8e7`, `bdfbab7` e `24d2ed7` estão em `logs/`. Conferido: <ul><li>a cache não muda nenhum dos 12 frames;</li><li>as colunas mudam player-11 (87 → 389) e eye-12 (739 → 4000);</li><li>também mudam eye-06/07, o que corrige «os outros frames não mudam».</li></ul> |
| P14 | As composições lado a lado não tinham ferramenta commitada. | [`logs/sheets.py`](logs/sheets.py) commitado e referido em CAPTURES. |
| P15 | O ponto de vista era descrito como o pátio da estação; o olho está na cabeça de ponte oeste. | Corrigido: cabeça de ponte oeste, entre os aterros ferroviário e rodoviário. |
| P16 | Comentários: «sobrestimam» (os cantos subestimavam a dispersão), «100–570 m», «~260 baldes», cor de traçante da resposta nunca usada. | <ul><li>A dispersão do voo é agora exacta: distância mínima entre caixas e máxima entre cantos, com o mesmo valor de look-back.</li><li>Os comentários passam a dizer 100–674 m e 275 baldes.</li><li>A cor morta foi retirada.</li><li>A linha norte só existe depois do contacto norte (nit latente do verificador), com teste.</li></ul> |
| P17 | Só o teste de navegador focado tinha corrido. | Suíte integral de navegador corrida em `5c5eed1` (runtime `6ffa820`): 54/63. As 9 falhas foram comparadas com a base, e as que não se explicavam foram repetidas sem carga ([`EVIDENCE.md`](EVIDENCE.md)). |

Depois das correcções repeti 8 mutações numa cópia descartável, só com o teste focado. Incluem as três que sobreviviam (M6, M7, M12). Todas foram apanhadas:
- aviões até 4 por elemento (M6);
- reset do restore sem identidade do mundo (M7);
- resposta 0,05 s depois do primeiro tiro (M12);
- pool de puffs 168;
- `Math.random` no plano (agora também apanhada pelo próprio teste de pureza);
- linha norte sem gate;
- caixa antiga dos impactos das peças;
- figuras 600 m mais perto.

Voos de avião mais longos também são apanhados.
