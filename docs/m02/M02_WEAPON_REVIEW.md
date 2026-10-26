# M02 — revisão das armas e apresentação

Data: 2026-10-26. Base: `9385b2d`. Esta revisão distingue dados preliminares, código realmente usado e decisões de gameplay; não certifica reprodução histórica ou qualidade AAA.

## Fontes e limites

Lidas nesta etapa: fichas locais `research/weapons/kb_wz29.md`, `kb_wz29.profile.json`, `mg34.md`, `rkm_wz28.md`; código Wz29/M02/áudio; manifestos e revisões de assets M01. As fichas MG34/wz.28 assinalam investigação preliminar por resumos, não leitura integral dos manuais originais. As incertezas sobre variantes, equipamento e medidas continuam abertas. O novo PROMPT MESTRE integral ainda não chegou.

Foi estudada a matriz local WaW/WWII: legibilidade da arma, mecânica que acompanha o disparo, assinaturas sonoras, inimigos a distância jogável e ritmo irregular de cobertura/flanco. As URLs oficiais consultadas (`https://store.steampowered.com/manual/10090/`, `https://www.callofduty.com/wwii/campaign`) foram bloqueadas pelo proxy com 403; não se afirma leitura externa nem comparação jogada. Não se usam ficheiros, malhas, animações ou sons de COD.

## Identidade e integração

| Arma | Identidade documental/preliminar | Implementação preservada | Lacuna verificada / direção |
| --- | --- | --- | --- |
| kbk wz.29 | Mauser polaco, ferrolho, carregador interno de 5, clipe; 1,10 m segundo T21 preliminar. Alavanca reta distingue-a da Kar98k. | Classe Wz29 da M01: ciclo 1,05 s, recarga vazia por clipe 3,4 s e parcial cartucho a cartucho; viewmodel/rig/mãos/sockets e áudio próprios. Valores de tempo são gameplay. | O controlador M02 passava `exactAim=true` também no jogo. Corrigir para a dispersão M01/ADS; preservar tiro exato apenas nas chamadas da bancada. Alça continua referência sem queda balística: não anunciar balística inexistente. |
| MG34 | 7,92 mm, manga perfurada, alimentação lateral e bípode; ficha preliminar: 1,219 m, 800–900 rpm. | GLB M01 com LOD, tampa, alavanca, tambor/cinta e clips. Usar intervalo M01 de 0,075 s dentro da rajada; janela tática separada de 2,1 s. | Cinco rondas eram aplicadas simultaneamente, enquanto áudio tocava espaçado. Havia ainda outro emissor B02. Separar rondas no relógio da simulação e remover o emissor fantasma. Postura de apoio/deitado e servente continuam a avaliar em C02. |
| rkm wz.28 | Browning polaca de 20 cartuchos, gas-operated/ferrolho aberto segundo ficha preliminar; 1,11 m, cerca de 600 rpm. | Arma e equipamento M01, carregador animado, alavanca, bípode e família de clips `rkm_*`. | Quatro rondas instantâneas no baseline M02 não correspondiam à mecânica/áudio. Intervalo de 0,10 s como referência do clip M01; duração da janela tática e quatro rondas permanecem escolhas M02, não cadência sustentada histórica. |
| MP38 | Arma alemã do período, caixa de 32; não substituir por MP40. A confirmação primária de variante e acessórios permanece pendente. | Silhueta original do projeto de 0,833 m, dois LODs, socket M01 e perfil sonoro próprio; nenhuma extração de jogos. | Malha ainda simplificada e pose de espingarda adaptada; falta revisão de apoio das mãos/recarga própria. Intervalo M02 de 0,11 s é afinação de gameplay, não medição histórica. Exigir três eventos/rondas reais, não um dano instantâneo de três tiros. |

## Contratos de D1

- Capacidade, reserva e consumo por ronda continuam no estado serializável do ator. A fila de rajada guarda alvo conhecido, ponto observado, próxima ronda e fim do ciclo. Não segue coordenadas ocultas do alvo.
- Cada ronda volta a consultar obstrução/atores. Fechar uma porta depois do primeiro tiro impede dano posterior. A arma não recebe dano/munição do renderer.
- Pausa não avança o relógio. Restauro a meio da rajada reproduz munição, eventos, dano e RNG; save antigo sem fila permanece compatível e fila corrompida é rejeitada antes de mutação.
- Eventos por ronda alimentam o AudioManager M01 e os timestamps dos clips/muzzle flashes. O som não anuncia rondas futuras que a simulação ainda não disparou.
- Dano, tamanho de carregador, reservas, número de inimigos, checkpoints, falas protegidas e ponte M03 não são reduzidos para fazer o percurso passar.

## Revisão visual seguinte

Capturar a wz.29 em repouso/ADS/disparo/ciclo/recarga vazia e parcial, MG34 a dominar o eixo da estrada, wz.28 a fixar a posição e MP38 a curta distância. Medir contactos de mãos, boca do cano, recuo, caudas de áudio e oclusão; distinguir fotografia de fixture de percurso jogado. Aplicar a C01–C02 antes de expandir outras cenas. Escala e licenças já verificadas não substituem revisão da atuação, composição e leitura dos inimigos.
