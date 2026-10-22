# Antes/depois — D4 sobre a D3 publicada

Base: `8ebc9086f8429fdc3197b88bd136411840d32cc4`, npm `operation-ashen-road` 0.2.0, M01 Tczew. Esta entrega não reavalia a nota editorial 4/10 da auditoria original (`8d420eb`, jogo `68301b7`).

| Problema | Antes (D3) | Depois (D4) | Prova | Limite restante |
|---|---|---|---|---|
| Intenção de disparar contava como aviso | O início/fim planeado da rajada habilitava a F1 sem provar um sinal emitido | Janela D2 mantida; aviso real recente do mesmo atirador é requisito adicional | `FAIR_DEATH_AUDIT.json`, 48 rotas; 20 focados | LOS geométrica e evento real não provam perceção humana de clarão/som |
| Golpe fatal em cena | O combate continuava a poder matar durante as cenas | Balas e explosão de granada deixam ≥1 HP em cena, só Soldado/Veterano | Testes das seis cenas nos dois níveis, RNG preservado | Água/limites/quedas seguem as regras ambientais próprias |
| Preservar calibração D2 | Regras/valores e primeira rajada já protegidos | Conjunção com a proteção anterior, sem trocar a janela original | Comparação exata de 48 rotas com D3; nenhuma morte nova/antecipada nem diferença final/RNG nas 36 conclusões | Dois óbitos passivos Veterano adiados, não eliminados; não é nova calibração humana |
| Save antigo com engajamento | `{first,last}` aceite na D3 | Continua aceite e íntegro; não se inventa `cue` no restauro | Fixture genuína da D3, round-trip e Continuar no browser | Save novo com `cue` pode ser rejeitado por builds antigos |
| Causa longa cortada | Estilo original de cartela tinha `white-space:nowrap` | Só a cartela de morte permite quebrar linha e mostrar o texto todo | Captura inicial/final e medidas DOM em quatro resoluções | Tátil emulado; falta Safari e aparelho real |
| Causa/retoma/checkpoint | Implementados na D3 | Reutilizados; tiro real publica atirador e retoma CP-C | Browser final, água desktop/tátil e entrega/Continuar | Testes focados, não nova partida integral |

A primeira política D4 foi rejeitada por matar a rota Veterano/2/apoio que sobrevivia na D3. Esse FAIL e a divergência causal estão preservados em `rejected-policy/`; só a política corrigida pertence à entrega final.

**Referências COD:** fontes externas de campanha continuam bloqueadas/não observadas neste ambiente, conforme o registo da auditoria. Não se atribui nenhuma funcionalidade nova a World at War, WWII ou COD 1 sem verificação. O princípio aplicado é o contrato H9 do projeto: perigo real, janela de reação, causa compreensível e apresentação legível. Sem cópia de assets/interface ou nova nota de qualidade.

**Próximo recorte:** apresentação SP-08 e direção das cenas, reaproveitando contagem, marcador e diálogos existentes, preservando B4 e as horas fixas. Produção/licenciamento de VO e escuta, avaliação no hardware alvo e playtest humano continuam necessários.

## Resultados das 48 rotas finais

| Nível / controlos | Rotas | Concluídas | Mortes | Menor HP observado | Mediana do HP mínimo |
|---|---:|---:|---:|---:|---:|
| Soldado / controlo passivo | 12 | 12 | 0 | 41,25 | 69,125 |
| Soldado / apoio com fogo | 12 | 12 | 0 | 50 | 75 |
| Veterano / controlo passivo | 12 | 0 | 12 | 0 | 0 |
| Veterano / apoio com fogo | 12 | 12 | 0 | 1 | 20 |

Controlos/rotas e resultados automáticos, não participantes humanos. O piloto termina a observação na primeira morte; não se apresentam tentativas/restauros posteriores como conclusões. Todas as 12 mortes têm prova de aviso real elegível; as duas adiadas continuam mortes. Valores de dificuldade permanecem os aprovados na D2.
