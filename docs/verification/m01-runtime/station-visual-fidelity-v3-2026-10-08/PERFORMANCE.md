# Custo visual medido

Contadores do renderer Three.js em frames congelados, Chromium headless/SwiftShader. Não há medição de FPS, hardware físico, VRAM real ou tempo GPU. A cadência de captura de 10 Hz é configuração da ferramenta, não um resultado de performance.

| Station própria | V2 | V3 |
| --- | ---: | ---: |
| Triângulos LOD0 | 30.881 | 34.285 |
| Triângulos LOD1 | 28.707 | 28.975 |
| Triângulos LOD2 | 13.382 | 16.928 |
| Lotes de material por LOD | 7 | 7 |
| Geometrias alocadas, três LODs | 21 | 21 |
| Texturas partilhadas | 10 | 10 |
| Instâncias próprias | 0 | 0 |
| Atributos geométricos (bytes) | 9.632.040 | 10.584.816 |
| RGBA bruto (bytes) | 655.360 | 1.441.792 |

LOD0 cresce 11,0%, LOD1 0,9% e LOD2 26,5%; Low continua abaixo de metade de High. O aumento dos atributos é 0,91 MiB e dos RGBA 0,75 MiB; com mipmaps teóricos, aproximadamente 1,91 MiB combinados. Dois pares de mapas usam 256²; os restantes usam 128². A memória interna do driver/programas não foi medida. [OWNED_RESOURCES.json](OWNED_RESOURCES.json) conserva os valores exatos. Não há instâncias ou colliders novos.

## Cena completa por par

Valores antes → depois. Geometrias/texturas globais incluem caches e recursos de todos os outros módulos; diferenças de carregamento/libertação assíncrona não devem ser atribuídas à otimização da Station. O contador global de instâncias foi omitido por engano nas 29 primeiras capturas AFTER; aparece nas cinco Medium retomadas. A contagem própria de zero instâncias Station foi medida em todos os pares. n/a significa não registado, sem estimativa.

| Câmara | Q | Draw calls | Triângulos | Texturas | Geometrias | Instâncias globais |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| frontal | high | 66 → 66 | 403436 → 406840 | 46 → 46 | 239 → 239 | 20209 → n/a |
| oblique | high | 61 → 61 | 408657 → 412061 | 46 → 46 | 267 → 267 | 20234 → n/a |
| roof | high | 53 → 53 | 399756 → 403160 | 42 → 42 | 259 → 232 | 20227 → n/a |
| annexes | high | 183 → 183 | 428548 → 431952 | 40 → 40 | 308 → 328 | 20156 → n/a |
| yard | high | 189 → 189 | 431724 → 435128 | 46 → 46 | 312 → 333 | 20191 → n/a |
| platform | high | 194 → 194 | 430480 → 433884 | 46 → 46 | 312 → 339 | 20168 → n/a |
| window-door | high | 53 → 53 | 399798 → 403202 | 42 → 42 | 232 → 259 | 20208 → n/a |
| window-upper | high | 53 → 53 | 399462 → 402866 | 42 → 42 | 232 → 232 | 20200 → n/a |
| roll-call | high | 306 → 306 | 823147 → 825845 | 191 → 191 | 293 → 280 | 20068 → n/a |
| evacuation | high | 183 → 183 | 430361 → 430361 | 34 → 34 | 273 → 273 | 20218 → n/a |
| frontal | low | 52 → 52 | 353173 → 356719 | 40 → 40 | 231 → 222 | 16701 → n/a |
| oblique | low | 53 → 53 | 355181 → 358727 | 46 → 46 | 227 → 236 | 16707 → n/a |
| roof | low | 45 → 45 | 350561 → 354107 | 42 → 42 | 219 → 228 | 16702 → n/a |
| annexes | low | 164 → 164 | 380651 → 384197 | 39 → 39 | 295 → 295 | 16694 → n/a |
| yard | low | 166 → 166 | 381433 → 384979 | 40 → 40 | 295 → 295 | 16697 → n/a |
| platform | low | 169 → 169 | 381785 → 385331 | 41 → 41 | 309 → 300 | 16696 → n/a |
| window-door | low | 45 → 45 | 351535 → 355081 | 42 → 42 | 219 → 228 | 16701 → n/a |
| window-upper | low | 39 → 39 | 351235 → 354781 | 36 → 36 | 224 → 224 | 16701 → n/a |
| roll-call | low | 164 → 164 | 474202 → 474202 | 141 → 141 | 241 → 250 | 16578 → n/a |
| evacuation | low | 166 → 166 | 382332 → 382332 | 34 → 34 | 260 → 260 | 16705 → n/a |
| frontal | medium | 63 → 63 | 386896 → 387164 | 46 → 46 | 259 → 232 | 19855 → n/a |
| window-door | medium | 50 → 50 | 384980 → 385248 | 42 → 42 | 225 → 252 | 19853 → 19853 |
| player-frontal | high | 53 → 53 | 400286 → 403690 | 42 → 42 | 253 → 259 | 20210 → n/a |
| player-oblique | high | 60 → 60 | 407801 → 411205 | 46 → 46 | 266 → 266 | 20222 → n/a |
| roof-detail | high | 186 → 186 | 429622 → 433026 | 46 → 46 | 309 → 336 | 20175 → n/a |
| player-oblique-later | high | 143 → 143 | 755510 → 761612 | 57 → 57 | 283 → 262 | 20222 → n/a |
| player-frontal | low | 39 → 39 | 351099 → 354645 | 36 → 36 | 224 → 215 | 16699 → n/a |
| player-oblique | low | 52 → 52 | 354761 → 358307 | 46 → 46 | 226 → 226 | 16706 → n/a |
| roof-detail | low | 163 → 163 | 381343 → 384889 | 40 → 40 | 301 → 301 | 16699 → n/a |
| player-oblique-later | low | 75 → 75 | 466018 → 469564 | 54 → 54 | 252 → 243 | 16706 → n/a |
| oblique | medium | 58 → 58 | 392967 → 393235 | 46 → 46 | 260 → 233 | 19865 → 19865 |
| platform | medium | 182 → 182 | 416182 → 416450 | 40 → 40 | 328 → 301 | 19845 → 19845 |
| player-frontal | medium | 50 → 50 | 384624 → 384892 | 42 → 42 | 225 → 252 | 19851 → 19851 |
| player-oblique | medium | 57 → 57 | 391969 → 392237 | 46 → 46 | 232 → 232 | 19855 → 19855 |
