# M02 — cobertura das duplas e recarga audível

`b304701`: Kowalski cobre o último alvo realmente engajado por Nowak enquanto a wz.28 recarrega; os auxiliares já existentes das MG34 de B02, B06 e B10 priorizam o alvo visto pelo seu próprio metralhador durante a recarga. A dupla precisa estar viva, a até 6 m e sem parede entre si. O auxiliar precisa ver o alvo pelas suas próprias regras normais; os disparos, a munição e a balística continuam reais. Sem contacto, alvo visível, munição ou capacidade de combate, usa o comportamento anterior. Não é uma animação de alimentação da arma.

`a194be2`: a recarga real de NPC emite três sinais curtos em momentos do seu próprio temporizador. A M02 reutiliza os grãos mecânicos M01, com distância, oclusão e limite de vozes; a morte interrompe sinais posteriores. Não altera munição ou temporizadores de recarga e não introduz estado novo no save. É uma aproximação sonora, não uma gravação histórica específica de cada arma.

- Os [testes](node-final.txt) incluem a sequência de disparo → recarga → cobertura, os três pares alemães, parede, distância, alvo oculto, incapacitação, munição e continuação exata após restauro. A build e os [testes de navegador](browser-final.txt) passaram.
- [Dupla com luz técnica](wz28-reload-cover-neutral-final.png) e [noite original anterior ao ajuste](wz28-reload-cover-night.png): cenários controlados em Chromium/SwiftShader High. O primeiro usa o preset neutro de inspeção, não a luz da missão. O metralhador usa `rkm_reload`; o auxiliar dispara com `fire_bolt`.
- [Áudio de recarga isolado](npc-reload-final.webm): evento real numa cena controlada, gravado do master do navegador; pico 0,0164. Não é avaliação humana da mistura.
- [Percurso completo `7bc5819`](native/report.json): C01–C12/M03, sem mortes ou erros, vida 45, eixo pomar, giz, água/munições, Lis evacuado e 12/12. O áudio registou 34 eventos de recarga de NPC; o limite Low chegou a 20 vozes, com 8 recusas e 33 substituições. Os contadores não provam que cada som foi audível. O piloto observa posições internas, inclusive ocultas; não é playtest humano nem benchmark.

Falta coreografia física de alimentação da MG, bem como polimento artístico e da mistura em combate intenso. A missão não é considerada concluída ou comparável a COD apenas por estes testes.
