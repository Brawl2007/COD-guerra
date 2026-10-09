# M01-LIGHTING-DAWN-V1 (T16) — evidência

- Commit aceite: `3386fc2921158136663993ea29aa47ffd58c9918` (base `d2eef27`).
- CI x86: run 37918399233, artefacto 11610659514.
  - Autoridade (só apresentação): `git diff` limpo contra `d2eef27` em src/game, src/world, missions, assets, package*.json, playwright.config.js.
  - `npm test`: 490/490 (480 da base + 10 novos em `tests/m01-lighting.test.js`).
  - `npm run build`: PASS.
  - Spec focada `tests/browser/m01-lighting-dawn.spec.js`: 8 passed, workers 1, retries 0.
- Verifier: PASS. Reviewer: ACCEPT (sem correções obrigatórias).

## Capturas (qualidade Alta salvo indicação)

| Ficheiro | O que se vê (inspecção do verifier) |
|---|---|
| `m01-lighting-0430-high.png` | Hora azul: céu azul frio com banda lilás/rosa no horizonte; sombras suaves no chão |
| `m01-lighting-0430-low.png` | Mesma hora em Baixa: sem sombras projectadas (custo novo zero) |
| `m01-lighting-0445-high.png` | Horizonte lilás/rosa mais quente |
| `m01-lighting-0530-high.png` | Disco do Sol visível com halo creme |
| `m01-lighting-0610-high.png` | Céu claro; sombras fortes das torres da ponte |
| `m01-lighting-0705-high.png` | Luz diurna neutra (cena da chamada) |
| `m01-lighting-0705-high-zenith.png` / `-west-seam.png` | Zénite e costura oeste: nuvens contínuas, sem estrela nem linha |

## Limitações

- Sem capturas BEFORE (`M01_BASELINE_CAPTURE=1` na base) nesta entrega.
- Nenhum FPS medido nem declarado. Segunda cascata de sombras (Média/Alta) por decisão do utilizador (D13).
- A spec compara a página com o mesmo modelo puro: prova a ligação; a aparência assenta na inspecção das capturas.
