# Custo visual observado

Chromium 138 com SwiftShader, 1280×720, frames congelados do build. Não é FPS nem benchmark de GPU real. Totais incluem outros sistemas e caches de assets; o total de geometrias varia com recursos previamente renderizados. A Station tem um orçamento próprio exato de 21 geometrias, 7 materiais e 10 mapas 128×128 partilhados entre três LODs.

| Câmara / qualidade | Calls antes → depois | Triângulos antes → depois | Texturas antes → depois | Geometrias observadas antes → depois | Instâncias environment antes → depois |
|---|---:|---:|---:|---:|---:|
| frontal / high | 74 → 66 | 375567 → 403436 | 37 → 46 | 232 → 239 | 20434 → 20209 |
| oblique / high | 70 → 61 | 380800 → 408657 | 37 → 46 | 233 → 267 | 20459 → 20234 |
| roof / high | 60 → 53 | 371875 → 399756 | 33 → 42 | 246 → 259 | 20452 → 20227 |
| annexes / high | 190 → 183 | 400607 → 428548 | 31 → 40 | 301 → 308 | 20381 → 20156 |
| yard / high | 194 → 189 | 403759 → 431724 | 37 → 46 | 332 → 312 | 20416 → 20191 |
| platform / high | 201 → 194 | 402539 → 430480 | 37 → 46 | 305 → 312 | 20393 → 20168 |
| window-door / high | 53 → 53 | 371833 → 399798 | 33 → 42 | 252 → 232 | 20433 → 20208 |
| window-upper / high | 53 → 53 | 371497 → 399462 | 33 → 42 | 225 → 232 | 20425 → 20200 |
| roll-call / high | 314 → 306 | 801901 → 823147 | 190 → 191 | 275 → 293 | 20293 → 20068 |
| evacuation / high | 184 → 183 | 432701 → 430361 | 35 → 34 | 273 → 273 | 20443 → 20218 |
| frontal / low | 60 → 52 | 342803 → 353173 | 31 → 40 | 224 → 231 | 16926 → 16701 |
| oblique / low | 62 → 53 | 344823 → 355181 | 37 → 46 | 220 → 227 | 16932 → 16707 |
| roof / low | 52 → 45 | 340179 → 350561 | 33 → 42 | 221 → 219 | 16927 → 16702 |
| annexes / low | 171 → 164 | 370209 → 380651 | 30 → 39 | 288 → 295 | 16919 → 16694 |
| yard / low | 171 → 166 | 370967 → 381433 | 31 → 40 | 297 → 295 | 16922 → 16697 |
| platform / low | 176 → 169 | 371343 → 381785 | 32 → 41 | 302 → 309 | 16921 → 16696 |
| window-door / low | 45 → 45 | 341069 → 351535 | 33 → 42 | 212 → 219 | 16926 → 16701 |
| window-upper / low | 39 → 39 | 340769 → 351235 | 27 → 36 | 208 → 224 | 16926 → 16701 |
| roll-call / low | 164 → 164 | 476386 → 474202 | 141 → 141 | 241 → 241 | 16803 → 16578 |
| evacuation / low | 167 → 166 | 384672 → 382332 | 35 → 34 | 269 → 260 | 16930 → 16705 |
| frontal / medium | 71 → 63 | 361201 → 386896 | 37 → 46 | 225 → 259 | 20080 → 19855 |
| window-door / medium | 50 → 50 | 359189 → 384980 | 33 → 42 | 218 → 225 | 20078 → 19853 |

Station isolada: LOD0 **30.881**, LOD1 **28.707**, LOD2 **13.382** triângulos; 7 calls de geometria, mais eventual passe de sombras. A Station não utiliza instâncias. Os 30 clusters de props são idênticos; a queda nas instâncias environment remove somente a decoração antiga da Station. GPU efetivamente aloca a geometria dos LODs renderizados; o orçamento de 21 refere-se às três malhas prontas em memória CPU. Aumento líquido observado de 9 texturas nas vistas da Station: dez mapas novos e um mapa antigo deixa de ser usado pelo bloco removido.

High mantém molduras, travessas, puxadores e juntas; Medium mantém caixilhos com menos microdetalhe; Low conserva todos os volumes, telhados, cinco chaminés, marquise, 140 aberturas e recessos, usando menos segmentos nos arcos. Distância reduz o LOD também em High/Medium. Sem dados de FPS ou aprovação de performance no Chromebook.
