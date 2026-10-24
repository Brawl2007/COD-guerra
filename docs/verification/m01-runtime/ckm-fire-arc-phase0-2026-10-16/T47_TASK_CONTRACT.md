# T47 — Task Contract (Capitão, 2026-10-16)

Autorização do proprietário (2026-10-16): investigar e corrigir o posto da ckm wz.30 para concluir a T47, com fundamento histórico, e atualizar testes/goldens pelo procedimento auditado. Reserva: `claims/m01-t47`. Branch `claude/cool-mccarthy-viomu9` (PR #85), empilhada sobre a candidata #80; a candidata em si não é alterada.

## Decisão de posto

- **Escolhido: S2 = (x 8, z 26)**, chão y -3, boca a +0,7 m. É um abrigo de campanha encostado à face norte do encontro oeste da ponte rodoviária, ao nível das casamatas e a 8 m da casamata. Ver `CANDIDATES.md`.
- **Fundamento:**
  - T08/T27 documentam um *bunker na cabeça de ponte oeste* (`HISTORICAL_RESEARCH.md:136`; P12, posição exata em aberto).
  - As casamatas ficam sob os encontros, abaixo do tabuleiro (T04). A seteira atual não vê nenhum alemão.
  - O posto S2 fica dentro da área documentada, mantém a mesma guarnição e cobre o corredor entre as pontes até aos portões leste, que é o eixo do ataque alemão.
  - Estado `RECONSTRUCTED`: nenhuma fonte encontrada dá a posição da ckm.
- **Rejeitados:**
  - S1: raspa a torre a 0,04 m.
  - S3: sobre o tabuleiro, na rota do jogador; só vê os alvos na retirada.
  - S4: vê só a reserva sul.
  - C0: posto atual, 0 alvos.
- **Alcance:** 1045–1087 m. Com a ckm wz.30 é fogo de supressão de longo alcance, com dispersão alta e baixa letalidade.

## Âmbito

1. **Simulação** (`src/game/m01-simulation.js`):
   - Mover `CKM_POSITION` e o posto da guarnição para S2.
   - Migrar os saves antigos, no estilo de `migrateCKMPlacement`.
   - Política de disparo real, de `policy:'disabled'` para `'live'`:
     - alvo alemão escolhido de forma determinística, apenas com linha livre pelo trace de produção;
     - rajadas com cooldown e cinta finita, com recarga através da fase `feed`;
     - dispersão de uma RNG dedicada (stream derivado), para não perturbar as tiragens dos outros atores;
     - dano e supressão pelo caminho de dano existente.
   - Janela de fogo: enquanto a guarnição está em posição e antes de `east_demolition`. `abandon`/`retreat` mantêm-se como hoje.
   - **Equilíbrio:** a M01 continua a cumprir os 12 objetivos e as batidas do guião. A ckm suprime e fere pouco a ~1 km; não esvazia os portões.
2. **Eventos:** evento de fogo aliado emitido pela simulação. O áudio (`ckmBurst`) e o clarão no mundo consomem esse evento. O renderer não decide alvo nem dano.
3. **Renderer:**
   - Ligar os clips `aim`/`fire_burst`/`feed` existentes.
   - Colocar o kit da ckm no novo posto.
   - Abrigo simples, procedural e sem assets novos de terceiros.
4. **Saves:**
   - Validação dos campos novos.
   - Os saves antigos de 86 e 89 atores carregam.
   - Um save a meio de uma rajada restaura idêntico.
5. **Goldens:**
   - Novo baseline com auditoria de delta nomeada, no estilo de `tools/verification/m01-partials-completion-audit.mjs`.
   - Só podem divergir a guarnição da ckm, os eventos da ckm e os alemães atingidos ou suprimidos por ela, mais o que daí decorre, com a lista de deltas.
   - A cadeia de pins de sha256 é mantida, como `sourceLock` e `previousTask`.
6. **Dados e documentação:**
   - Atualizar `map-layout.json`/`mission.json` (cover point do posto) e as notas históricas, com o estado `RECONSTRUCTED`.
   - Não tocar em `ae_s2_ckm_east`, colliders, GLB das pontes, bancada antiga nem aldeia francesa.

## Aceitação

1. Não há nenhum disparo sem linha livre (trace de produção). Nenhum raio atravessa colliders da ponte.
2. Duas execuções A/B com a mesma semente dão eventos idênticos em cada tick.
3. Os saves antigos carregam, e um save feito a meio de uma rajada restaura idêntico.
4. O renderer só apresenta o que a simulação emite.
5. `abandon`/`retreat` ficam inalterados depois de `east_demolition`.
6. A rota M01 completa continua a cumprir os 12 objetivos.
7. `npm test`, `npm run build` e as specs de browser afetadas passam. A ckm dispara de facto no browser: clip, clarão, áudio e nenhum erro de consola.
