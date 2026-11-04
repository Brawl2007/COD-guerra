# Presença física dos aliados M02

`70c6031` mantém soldados destacados, desaparecidos ou evacuados fora da célula nos registos de continuidade, mas exclui-os da perceção inimiga, colisão de tiros, explosões, repulsão de navegação, apoio de metralhadora e segurança de fogo aliado. Uma rajada pendente pára se o alvo sair da célula. Aliados ausentes também não ativam a progressão da quinta a partir de coordenadas antigas. Lis fisicamente sentado em B12 (`EVACUATED_B12`) permanece presente; um Lis já evacuado ou incapacitado antes de C11 não regressa nem é deslocado.

Passaram [204 testes M02](node-m02.txt), build e [três browser](browser.txt). Incluem um tiro real que atinge o jogador atrás de Lis destacado, comparação com Lis presente, explosão, perceção, navegação, objetivos, diálogos e restauro determinístico. As imagens [destacado](lis-detached.png) e [presente](lis-present-comparison.png) usam uma fixture controlada com disparo de IA invocado pelo teste e modelos reais em Chromium/SwiftShader. Não são playtest humano nem medição de qualidade em iPhone.

A passagem integral com água, giz, ordens e granada na build `70c6031` foi iniciada e estava em curso quando este registo preliminar foi feito. Verificar o resultado em `/tmp/m02-presence-native-70c6031/report.json` se existir; não declarar PASS apenas a partir deste parágrafo.
