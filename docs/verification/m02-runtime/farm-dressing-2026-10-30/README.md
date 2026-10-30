# M02 — objetos M01 na cozinha B01

Código `5c2b230`: a lanterna e a caixa de tábuas originais do kit GLB da M01 são colocadas na cozinha, sobre e sob a mesa B01. A caixa fica dentro do colisor sólido já existente; a lanterna é um pequeno detalhe visual sem colisão própria. Os modelos e materiais são reutilizados, sem conteúdo de terceiros. A instalação é opcional se o asset falhar e é reconstituída sem duplicação após mudanças de célula/rebuild.

- [151 testes M02](node.log), [três casos focados](node-focused.log), [build](build.log.gz) e [três browser](browser.log) passaram. A simulação e os colisores são preservados; os testes medem os limites dos dois modelos e a repetição da montagem.
- [Sem objetos](b01-table-undressed.png) e [com objetos](b01-table-dressed.png): capturas Chromium/SwiftShader High da mesma fixture pausada, com os detalhes ocultos/visíveis pelo teste. Não são screenshots de builds diferentes nem avaliação humana.
- O último percurso integral concluído é a [build `e6c62e0`](../grenade-awareness-2026-10-30/native-retry/report.json), antes desta decoração. A passagem congelada `5c2b230` com granada e ordens está em curso; consultar o estado de execução para o resultado.
