# HANDOFF — M01-CKM-FIRE-ARC-RESOLUTION-V1

Base: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`

Branch: `codex/m01-ckm-fire-arc-resolution`

## Resultado

**Caminho C.** Não implementar fogo ainda.

A investigação anterior foi reproduzida e refinada com o trace real de produção. O raio exatamente a leste continua a bater em `road_collider_pier_01` a ~112,4 m, mas linhas reais para muitos inimigos batem antes no `road_collider_deck_span_01` porque `traceTerrain/heightAt` inclui o tabuleiro walkable.

- root: `[24.17,-3,43]`
- yaw: `-PI/2`
- boca exterior (`muzzle_flash`): `[25,-2.36,43]`
- envelope animado ±1,2°/±0,35°: 375/375 raios bloqueados
- repair: 40/40 alvos bloqueados
- withdrawal: 50/50 alvos bloqueados

O scanner amplo encontra espaço geométrico livre elevado/sudeste, mas o mapa não fornece abertura real da seteira nem limites mecânicos, e não há alvo atual livre nesse setor. Não transformar isso em gameplay.

## Próxima tarefa necessária

Resolver primeiro o conflito estrutural documentado:

- `missions/m01-tczew/map-layout.json`: casamatas `x=0…26`, seteira `x=25`;
- asset/collider do encontro rodoviário: `x=-22…10`;
- interior da casamata não modelado.

A fonte de collider é `tools/assets/m01-bridges/`; `bridge-colliders.json` é gerado por `tools/assets/m01-bridges/export-colliders.mjs` e não deve ser corrigido manualmente.

Só reabrir runtime de fogo após existir abertura historicamente/map-supported e pelo menos um alvo real com trace livre da boca.

Nenhum ficheiro de produção foi alterado nesta branch.

## Validação final

- CKM focados: **23/23**;
- `npm test`: **230/230**;
- `npm run build`: PASS;
- `npm run test:browser`: **35/35 passed (15,6 min)**;
- scanner executado duas vezes com JSON byte a byte idêntico (`sha256 b74f957d640336dc49b40d8bc517b6afe1823be3496aad8db3a07dbb1716a1cc`).

Não houve mudança de simulação, renderer, save, RNG, mapa, collider ou asset.
