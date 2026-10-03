# M01 — resolução do arco de tiro da ckm wz.30

TASK_ID: `M01-CKM-FIRE-ARC-RESOLUTION-V1`

Base obrigatória: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.

## Decisão

**Caminho C: não ligar `aim`, `fire_burst` nem `feed` ao gameplay nesta etapa.**

Há raios geometricamente livres no espaço em torno da arma, mas o repositório não define a largura/altura real da seteira nem os limites mecânicos de direção/elevação, e **nenhum alvo alemão vivo/ativo dos snapshots reais de reparo ou retirada tem linha de tiro desobstruída a partir da boca real da ckm**.

Mover a arma, elevar o tripé, abrir colisores ou escolher um alvo fictício só para obter tiro seria inventar uma solução. Nenhuma alteração de gameplay/renderer foi feita.

## 1. Geometria reproduzida

Fonte da raiz: `CKM_POSITION` em `src/game/m01-simulation.js`.

- root: `[24.17, -3, 43]`
- yaw do renderer: `-PI/2` = `-90°`
- `gun_muzzle` local de cena: `[0, 0.64, -0.68]`
- `gun_muzzle_flash` local de cena: `[0, 0.64, -0.83]`
- `gun_muzzle` mundial: `[24.85, -2.36, 43]`
- `gun_muzzle_flash` mundial: `[25.00, -2.36, 43]`

A origem usada pela ferramenta é **`gun_muzzle_flash`**, a boca exterior do cone, não a câmara nem o olho do atirador.

A seteira reconstruída no mapa tem:

- ponto da feature `casemates_west`: `[25, -3, 43]`
- `cv_casemate_emb_s`: `[24, -3, 43]`
- normal: `[1, 0, 0]` (leste)
- `heightM: 1.4`

O mapa **não contém** polígono da abertura, largura, altura útil da abertura nem limites de traverse/elevation. Portanto uma “largura angular real da seteira” não pode ser calculada honestamente a partir dos dados atuais.

## 2. Diferença importante em relação à investigação anterior

O relatório anterior em `codex/m01-ckm-fire-runtime` encontrou `road_collider_pier_01` a ~112,4 m ao testar os sólidos da ponte. Esse número foi reproduzido para o **raio exatamente para leste** (`az=0°, el=0°`): primeiro contacto em `112,400 m`.

Porém o trace real de produção também chama `TczewWorld.traceTerrain()`, e `heightAt()` considera os tabuleiros walkable. Assim, várias linhas para os alemães não chegam ao pilar: ao inclinar ligeiramente para norte entram primeiro por baixo do `road_collider_deck_span_01`.

Exemplo real `de_east_0` no snapshot de reparo:

- alvo: aproximadamente `[1055, 0, 32]`
- azimute: `-0,618°`
- elevação: `+0,152°`
- primeiro bloqueio de produção: `road_collider_deck_span_01`
- distância do bloqueio: `22,655 m`

Portanto a conclusão “não há alvo atual livre” permanece, mas o primeiro bloqueio de vários alvos é ainda mais próximo do que o relatório anterior indicava.

## 3. Varredura angular completa

Ferramenta: `tools/m01-ckm-fire-arc.mjs`.

Configuração da evidência versionada:

- azimute: `-30° … +30°`, passo `0,5°`
- elevação: `-5° … +10°`, passo `0,5°`
- alcance geométrico de sondagem: `1200 m`
- amostras: `3751`

Convenção: `0°` aponta para +X/leste, normal da seteira; azimute positivo vira para +Z/sul.

Resultado:

| Primeiro contacto | amostras |
| --- | ---: |
| `road_collider_deck_span_01` | 1847 |
| terreno sem ID de walk-surface | 615 |
| `road_collider_tower_01_s` | 95 |
| `road_collider_pier_01` | 63 |
| sem bloqueio até 1200 m | 1131 |

Classificando cada azimute pelo conjunto inteiro de elevações testadas (`-5°…+10°`):

- **completamente bloqueado:** `-30°…-1,5°` e `+0,5°…+2,5°`;
- **parcialmente livre:** `-1°…0°` e `+3°…+30°`;
- **completamente livre em todas as elevações testadas:** nenhum azimute.

“Parcialmente livre” significa somente que alguma elevação daquele azimute chegou a 1200 m sem primeiro contacto; as elevações baixas continuam bloqueadas. Isso não é um setor mecânico aprovado da seteira.

O CSV completo está em `arc-map.csv`. `geometry-summary.json` preserva a configuração e o resumo.

### Leitura geométrica

- Raios para norte da boca entram rapidamente sob o primeiro tabuleiro: contactos com `road_collider_deck_span_01` entre ~`1,2` e `27,6 m`.
- O raio leste horizontal atinge `road_collider_pier_01` a `112,4 m`.
- Para passar **por cima** do topo do pilar no eixo leste, a geometria exige aproximadamente `+0,591°` de elevação antes de considerar outras estruturas.
- Para contornar o pilar pelo sul no plano horizontal, a borda geométrica está em aproximadamente `+3,056°` de azimute; pelo norte, ~`-6,094°` — mas o lado norte já entra no tabuleiro do primeiro vão.
- Há raios elevados/sudeste que ficam livres por centenas de metros ou até os 1200 m medidos. Isso prova apenas espaço geométrico; **não prova que a seteira/tripé real permitia esse arco, nem que existia um alvo real nesse setor**.

### Envelope do clip `aim`

O asset documenta animação de `aim` com excursão aproximada de `±1,2°` em direção e `±0,35°` em elevação. Isso é animação, não limite mecânico histórico.

Foi feita uma varredura fina apenas nesse envelope:

- 25 azimutes × 15 elevações = `375` raios
- `375/375` bloqueados
- `210` por `road_collider_pier_01`
- `165` por `road_collider_deck_span_01`
- `0` livres

## 4. Alvos reais da missão

A ferramenta reutiliza `tests/helpers/m01-route.js`; não injeta atores, posições, eventos ou relógios.

### Reparo sob combate

Snapshot legítimo: `route.combatSnapshots.repairThreat`.

- 40 alemães vivos/ativos
- 28 bloqueados primeiro por `road_collider_deck_span_01`
- 12 por `road_collider_pier_01`
- **0 alvos livres**

### Retirada

Snapshot legítimo: `route.combatSnapshots.withdrawal`.

- 50 alemães vivos/ativos
- 35 bloqueados primeiro por `road_collider_deck_span_01`
- 15 por `road_collider_pier_01`
- **0 alvos livres**

Nas duas amostras, o azimute dos alvos varia aproximadamente de `-6,675°` a `+2,871°`; elevação ~`+0,151° … +0,224°`. Nenhum coincide com um corredor livre provado.

As linhas individuais estão em `target-lines.csv`.

## 5. Incompatibilidade do mapa atual

O próprio repositório já registra conflito espacial:

- `map-layout.json`: casamatas oeste em `x=0…26`, embrasures em `x=25`;
- collider do encontro rodoviário: `road_collider_abutment_west` em `x=-22…10`;
- `BRIDGE_ASSET_REPORT.md`: declara explicitamente esse conflito e afirma que o interior das casamatas **não está modelado**.

A raiz `[24.17,-3,43]` alinha a boca com a seteira abstrata do mapa, mas não resolve o conflito com o encontro modelado. Isso é uma razão para **não mover a ckm de novo por tentativa e erro**.

Uma correção futura precisa reconciliar uma única geometria autoritativa para encontro + interior + abertura, preferencialmente a partir da fonte do asset/collider. Não editar `bridge-colliders.json` manualmente: ele é exportado por `tools/assets/m01-bridges/export-colliders.mjs` a partir dos GLBs de collider.

### Hipótese mais provável (não facto histórico)

A incompatibilidade mais simples é que `cv_casemate_emb_s` e a caixa `casemates_west` foram reconstruídos para gameplay num referencial aproximado, enquanto o encontro/collider da ponte foi produzido por outra geometria e **não contém o interior da casamata**. A migração para `[24.17,-3,43]` fez corretamente o socket coincidir com a seteira abstrata do mapa, mas não podia resolver essa divergência estrutural. Esta hipótese é apoiada pelo relatório do próprio asset; não prova onde uma ckm real ficaria em 1939.

## 6. História — o que é provado e o que não é

O repositório e a pesquisa pública concordam que os encontros de cerca de 32 m possuíam casamatas defensivas abaixo do nível do tabuleiro. Também há documentação da defesa polaca e de metralhadoras pesadas na cabeça de ponte leste.

Não foi encontrada fonte que prove:

- uma ckm wz.30 especificamente na **seteira sul da casamata oeste**;
- a posição tridimensional dessa seteira;
- sua largura/altura;
- seu azimute útil;
- que ela deveria bater os alemães atuais de `grp_de_east` através do eixo da ponte.

Logo, a função específica “fogo desta ckm sobre a ponte até ao abandono” continua sendo uma escolha de gameplay/reconstrução, não fato histórico confirmado.

Ver `HISTORICAL-SOURCES.md`.

## 7. Implementação

Nenhuma lógica de fogo foi adicionada.

Preservados:

- `idle → abandon → retreat` da guarnição;
- schema 2;
- saves legados 86/89;
- RNG;
- baixas;
- clocks/gates/demolições;
- fallback sem GLB;
- renderer da ckm;
- `feed` desligado;
- todos os colliders/mapa/assets.

Não foram criados estados falsos de `aim`, burst ou munição só para satisfazer testes.

## 8. Próxima mudança mínima defensável

Antes de tentar fogo novamente:

1. obter planta/fotografia/desenho que localize e dimensione as aberturas defensivas do encontro oeste em 1939, ou ao menos o encontro de 1857 preservado;
2. reconciliar `missions/m01-tczew/map-layout.json` com o encontro real do asset em `tools/assets/m01-bridges/`;
3. só então gerar novamente o collider pela fonte autoritativa e repetir `tools/m01-ckm-fire-arc.mjs`;
4. exigir pelo menos um alvo existente e vivo com trace de produção livre da boca real antes de implementar `aim/fire_burst`.

Até isso existir, deixar a ckm sem fogo é tecnicamente mais correto do que atravessar a ponte ou inventar um setor.

## 9. Fontes de arquivo encontradas durante a resolução

A pesquisa pública localizou no catálogo da Deutsche Digitale Bibliothek/Deutsches Historisches Museum e no Architekturmuseum TU Berlin plantas históricas de Dirschau/Tczew, incluindo cortes longitudinais do encontro e uma planta/vista da ponte de 1851–1857. Esses documentos são uma pista muito melhor que mover a arma por tentativa e erro, mas **não foram convertidos em novas coordenadas nesta tarefa**: é necessário interpretar as cotas e relacioná-las ao asset atual primeiro. Ver `HISTORICAL-SOURCES.md`.
