# M02 — som de quique da granada

`c1b8ec9` associa um som curto ao ponto, material e velocidade de uma colisão física real; contactos lentos de repouso não emitem ruído repetido. A síntese reutiliza grãos M01 e aplica distância e oclusão. A trajetória, o fusível, o dano e o esquema de snapshot não mudaram; a colisão passa a publicar um evento adicional.

- 132 testes M02 e [quatro testes browser](browser.txt) passaram, incluindo `G` contra a parede B05, som disparado e remoção após restauro. A simulação verifica também repouso silencioso e reprodução exata da colisão após checkpoint.
- [Gravação isolada](grenade-bounce.webm) de um impacto simulado em madeira no Chromium, pico 0,0183; [captura por `G`](grenade-wall-bounce.png) usa a parede real B05. São fixtures controlados, não avaliação auditiva humana.
- [Percurso contínuo `c1b8ec9`](native/report.json): C01–C12/M03, 0 mortes/erros, vida 94, eixo vala, giz, água/munições, Lis evacuado, 12/12 e Małek incapacitado. A gravação não prova quique em combate: o caso específico acima o verifica. O piloto observa posições internas e não substitui pessoa ou GPU física.
