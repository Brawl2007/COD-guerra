# Migração de posição da ckm — 2026-10-03

Base obrigatória: `beec7cd9333cfac38fdc361da481ad4a942e1e37`.
Branch independente: `codex/m01-ckm-placement-migration`.
M01 continua **PROTÓTIPO JOGÁVEL**. Esta branch não está integrada.

## Conclusão

Foi encontrada uma regra de migração determinística que não precisa de mudar o schema 2 nem inventar um marcador inexistente.

A posição canónica da raiz passa de `[22,-3,43]` para `[24.17,-3,43]`. O socket real `gun_muzzle_flash=[0,0.64,-0.83]`, com `rotation.y=-π/2`, transforma-se em aproximadamente `[25,-2.36,43]`; portanto fica alinhado em X/Z com a seteira sul reconstruída `[25,-3,43]`.

Os três postos antigos dos homens eram:
- gunner: `[21.206,-3,42.971]`
- loader: `[22.08,-3,42.48]`
- reserve: `[20.4,-3,41.6]`

Os postos novos são exactamente os mesmos offsets rígidos em relação à arma, com `+2.17 m` em X:
- gunner: `[23.376,-3,42.971]`
- loader: `[24.25,-3,42.48]`
- reserve: `[22.57,-3,41.6]`

## Regra de migração

Saves schema 2 antigos com 89 actores não têm marcador de versão de posicionamento. A assinatura segura disponível é a própria combinação de fase + coordenada:

1. `idle` e `abandon` não executam `moveActor`; um actor nessas fases só pode continuar exactamente no posto autorado em que foi criado.
2. Se um membro ckm está em `idle` ou `abandon` **e** continua exactamente no seu posto antigo `x/y/z`, o restore aplica somente `x += 2.17`.
3. Qualquer actor em `retreat` nunca é transladado, mesmo se ainda coincidir numericamente com um posto antigo.
4. Depois de `evt_m01_west_demolition`, nenhuma posição ckm guardada é reescrita.
5. Saves de 86 actores continuam pela migração já existente do grupo ausente:
   - antes da demolição leste: os três são criados directamente nos novos postos;
   - depois da demolição leste: são criados directamente fora da zona oeste, em `retreat`, com `startedAt` igual ao instante persistido de `east_demolition`;
   - depois da demolição oeste: igual, mas `visible=false`.

A função não lê nem escreve RNG, saúde, `alive`, `startedAt`, fase, gate, relógio, baixas ou qualquer actor não-ckm. Mortos podem ter o posto estacionário corrigido, mas continuam mortos com a mesma saúde/estado.

## Alteração de produção

Somente `src/game/m01-simulation.js` foi alterado em produção: posição canónica/offsets ckm, função de migração pontual e uma chamada no ramo de restore para rosters que já têm a guarnição.

`moveActor` foi comparado directamente entre a base e a branch: **479 caracteres em ambos e conteúdo byte a byte idêntico**.

`src/render/m01-characters.js` não foi alterado. O renderer já importa `CKM_POSITION`, portanto não é matematicamente necessário editá-lo.

## Regressões adicionadas

Novo `tests/m01-ckm-placement-migration.test.js` cobre:
- 86 → 89 e schema 2 preservado;
- 89 antigo em `idle`, migração única e estabilidade snapshot→restore→snapshot;
- 89 logo após `east_demolition`, ainda em `idle`, sem alterar fase/`startedAt`;
- `abandon` com `startedAt` exacto;
- `retreat` imóvel pela migração, inclusive se um actor ainda estiver exactamente no posto antigo;
- mortos continuam mortos;
- save pós-`west_demolition` conserva posições guardadas;
- saves 86 pós-east/pós-west não repetem abandono;
- RNG idêntico;
- restore inválido atómico e input não mutado;
- actores/estado não-ckm inalterados;
- transformação geométrica do socket para x=25, y=-2.36, z=43.

## Validação executada

O ambiente de shell desta sessão não consegue resolver `github.com`, portanto não foi possível clonar a branch e executar o ficheiro de teste do repositório com todos os imports reais. Não foi disparado CI/`workflow_dispatch`, conforme a restrição da tarefa.

Validação local executada sem rede:
- `node --check` sobre a cópia exacta do novo ficheiro de teste: passou;
- harness Node da regra exacta de migração + geometria: **10/10 passou**, 0 falhas, 0 skips, ~60 ms;
- diff do commit de produção revisto: somente os dois blocos ckm descritos acima;
- `moveActor`: byte a byte idêntico à base.

A regressão do repositório foi adicionada para a revisão/execução num checkout com dependências disponíveis. Não atribuir a esta branch uma execução `npm test` integral que não ocorreu nesta sessão.

## Limites

A migração deliberadamente não tenta “corrigir” um actor já em `retreat`, nem posições pós-demolição oeste. Isso evita inferir se um homem já começou a sair. Não há alteração de combate, aim/fire_burst/feed, S3, vagões, MG34, assets, mapa, colliders, CP-A..D, workflows, Graphify ou M02.
