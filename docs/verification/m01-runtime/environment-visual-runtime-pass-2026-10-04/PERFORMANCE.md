# Performance evidence

Production build, 1280×720 CSS viewport, Chromium 153 headless, ANGLE SwiftShader. These are GPU workload/resource counters, **not FPS**, Chromebook measurements or a promise of 60 FPS. The same fixtures, clocks, view angles and quality are used for each pair. High waits for its optional character/weapon LODs before sampling.

The unchanged 1024² shadow map and existing pixel-ratio caps are retained. No postprocessing render target was added. Decorations stay instanced; grass density is halved in Low. Main smoke pool: Low 112 / Medium 192 / High 256. Cosmetic flying chips: one 64-instance pool. Pressure dust shares the main smoke pool. Impact pools and existing actor/bridge LOD contracts remain bounded.

The first ballast experiment added excessive triangles. Its secondary stones were replaced with four-face instances before the reviewed build. There is no particle physics, collider, damage or gameplay RNG attached to these stones/chips.

Default decision: preserve explicit saved Low/Medium/High; otherwise select Medium only with at least four reported logical cores, 4 GB reported memory, WebGL2 texture limit >=8192 and a reported non-software renderer. Unknown/limited hardware and SwiftShader/llvmpipe remain Low. High is never selected automatically. This is a conservative capability heuristic; a physical Chromebook frame-time pass is still required before broader defaults or higher resolution.

All counters below are direct `renderer.info` samples from the matching production probes. Geometry/texture counts reflect resources actually rendered, including the first-person pass, rather than an asset-manifest count.



<!-- MEASUREMENTS -->
| Scene / quality | Calls BASE → CANDIDATE | Triangles BASE → CANDIDATE | Change | Geometries BASE → CANDIDATE | Textures BASE → CANDIDATE |
|---|---:|---:|---:|---:|---:|
| A-station / medium | 48 → 51 | 295939 → 370201 | +25.1% | 177 → 179 | 32 → 32 |
| B-rail-sappers / medium | 106 → 107 | 311035 → 384613 | +23.7% | 181 → 183 | 80 → 80 |
| C-bridge-approach / medium | 226 → 227 | 354853 → 427903 | +20.6% | 185 → 181 | 95 → 95 |
| D-long-bridge / medium | 288 → 291 | 653737 → 760225 | +16.3% | 226 → 229 | 88 → 88 |
| E-bombing / medium | 192 → 195 | 593333 → 677221 | +14.1% | 272 → 274 | 50 → 50 |
| F-impact-dust / medium | 136 → 138 | 313868 → 387522 | +23.5% | 185 → 188 | 98 → 98 |
| A-station / high | 48 → 51 | 295939 → 370201 | +25.1% | 184 → 186 | 32 → 32 |
| B-rail-sappers / high | 106 → 107 | 319878 → 393456 | +23.0% | 195 → 193 | 80 → 80 |
| C-bridge-approach / high | 226 → 227 | 358979 → 432029 | +20.3% | 186 → 194 | 95 → 95 |
| D-long-bridge / high | 292 → 295 | 652473 → 758961 | +16.3% | 234 → 235 | 92 → 92 |
| E-bombing / high | 222 → 225 | 584705 → 668593 | +14.3% | 279 → 281 | 80 → 80 |
| F-impact-dust / high | 136 → 138 | 333134 → 406820 | +22.1% | 193 → 194 | 98 → 98 |
| A-station / low | 48 → 51 | 287259 → 351765 | +22.5% | 169 → 171 | 32 → 32 |
| B-rail-sappers / low | 106 → 107 | 300011 → 363833 | +21.3% | 180 → 182 | 80 → 80 |
| C-bridge-approach / low | 218 → 219 | 339734 → 403028 | +18.6% | 178 → 180 | 86 → 86 |
| D-long-bridge / low | 233 → 234 | 476409 → 539703 | +13.3% | 220 → 221 | 86 → 86 |
| E-bombing / low | 118 → 120 | 424329 → 478481 | +12.8% | 241 → 243 | 40 → 40 |
| F-impact-dust / low | 136 → 138 | 304021 → 367887 | +21.0% | 178 → 179 | 98 → 98 |
