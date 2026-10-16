# Handoff — T40/T50 e pedido de união mais recente

TASK_ID: M01-T40-T50-FP-LOADING-INTEGRATION-V1
STATUS: BLOCKED (verificação de fonte FAIL, integração não realizada)
BASE_BRANCH: claude/m01-integration
BASE_HEAD: d151a97239a54dc3f92b594e88ae5933c6bdfa06
WORK_BRANCH: codex/m01-t40-t50-fp-loading-v1
CODE_HEAD: a1ed6ff77ff8cf0bfdff7930f33bf2a2a72ee084
FINAL_HEAD: o commit de publicação deste handoff contém somente metadados/provas após CODE_HEAD; código testado é exatamente a1ed6ff.
PR: https://github.com/Brawl2007/COD-guerra/pull/79 (draft, não READY)
CANDIDATE_TARGET: #80 claude/quirky-heisenberg-9l4m7b @813f163deceb551e0e4504b30958580cb67d3a76; revalidar antes de agir.

## Implementado

- T40: braços privados com mangas fechadas, palmas e30 falanges articuladas, punhos/correias/pele; pose FP de transporte horizontal usa fases dos clips existentes.1850tri braços;5869tri com paciente, orçamento6000; terceira pessoa preservada.
- T50: progresso real dos pedidos/caches, readiness obrigatório/fallback opcional, bootstrap/módulos separados e Barlow local com OFL/proveniência. Grafo estático inicial10883bytes; todos os chunks JS somam1755356bytes e o grafo dinâmico é reportado separadamente.
- Fonte limitada a bootstrap/assets/FP e testes/provas. Simulação, RNG, missões, saves, rig/clips/variação TP e golden originais protegidos.67 hashes de base exatos;121 fingerprints da fonte CI exatos.

## Verificação final (não somar fontes diferentes)

- [CI38966629766](https://github.com/Brawl2007/COD-guerra/actions/runs/38966629766) em a1ed6ff: Node881/881, ferramentas173/173 e build PASS.
- [CI38966629778](https://github.com/Brawl2007/COD-guerra/actions/runs/38966629778) em a1ed6ff: novos testes8/9PASS,1timeout;9 regressões existentes NÃO executadas após falha. Workers1/retries0. Não há18/18PASS.
- Falha: teste nativo de mira/recarga/restauro, espera de estado RELOAD depois da teclaR. Trace mostra recarga real ativa e depois munição5/39; não demonstra falha do jogo, mas o teste perdeu o estado transitório e não atingiu a prova de save/restauro.
- Local da correção03: Node focado50/50/buildPASS; browser2/3 (lifecycle A/B e near-wall congelado PASS, hip/mid-ADS timeout). Este FAIL continua preservado, sem causalidade inventada. O teste original já espera unpaused+pointerlock.
- Seis pares finais de estado completo/checkpoint/eventos/câmara/relógio contra a base PASS; PNGs finais ADS/carry/loading inspecionados. E/W/E, fonte/fallback/French e residência opcional tardia PASS nos casos finais aplicáveis.
- ZIP artefacto12075621765 SHA2569dd4b845c6a0138ec2c7296ae289568fbdb44295198d066ed0109e31950ac881, CRC/caminhos seguros e fonte exata verificados independentemente. Artefactos brutos ficam no CI e em /workspace/scratch/t40-a1-final-ci; prova compacta e logs integrais relevantes em final-gate/.

REVIEW: não iniciado; exige verifierPASS antes. Auditoria de recursos sem bloqueio demonstrado, mas20 travessias carry/objetos temporários,~32MiB estimados de atlas duplicado e diagnósticos contínuos são advisories. Sem FPS/dispositivo/playtest humano inventados.
FIX_ATTEMPTS:3/3 consumidas (primeira correção seed prospectiva +duas correções após FAIL independente); sem reset/extensão. REVIEW_REJECTIONS:0/2.
REGRESSION/MEMORY: nenhum registo aceite nem nova memória durável criados, pois não houve ACCEPT.

## União pedida com Claude e outras IAs

#80 já contém #78/d151 e main6697956 com trabalhos Claude/Argon, touch e T46; não repetir merges históricos. #81/T43 e #82/T38 são fatias incompletas, não READY. Inventário detalhado em final-gate/LATEST_UNION_INVENTORY.md, fotografia às21:03UTC; a linha de #79 nele ainda se refere ao SHA anterior bea, substituído por a1 para os checks finais acima.

Merge-tree somente leitura #80@813f163 +a1ed6ff confirmou7 conflitos: asset-manager, main, CSS/controller loading, lifecycle browser, bundle guard e Vite. Árvore provisóriaf40bab51 contém marcadores e NÃO é candidata/jogo. Nenhuma ref/worktree da candidata foi alterada. Plano ficheiro a ficheiro em final-gate/LATEST_UNION_RESOLUTION_PLAN.md. Auto-merge de characters/viewmodel precisa de revisão semântica do rig Argon e novos braços; preservar touch/T46/retry e verificar fonte no build relativo Vercel.

Coordenação remota generation1/PAUSED em coordination/m01-integration-state:.agent/coordination/m01-integrator.json. [Guia do PR84](https://github.com/Brawl2007/COD-guerra/blob/infra/m01-single-integrator-v1/docs/direction/M01_INTEGRATOR_LEASE.md): "Se estiver PAUSED, não integrar: a migração das sessões antigas ainda não foi confirmada." Nenhum handoff verificável foi encontrado; #80 avançou após o PAUSED. Não adquirir lock nem escrever candidata/antigo playable para contornar a regra. Checks84 e handoff real precedem ativação CAS/reserva exclusiva/guard.

PLAY: a1ed6ff NÃO é declarado integrado/validado; playable antigo continua d151, candidata mais recente #80 continua813f163 (revalidar). Main intocada nesta sessão; outros agentes integraram #76 em main6697956.
COUNT:37 tarefas confirmadas/15 por fechar; T40/T50 implementadas mas NÃO aceites nem contadas como fechadas.

NEXT_ACTION: decisão explícita sobre uma correção adicional apenas de captura dos dois testes (proposta NÃO aplicada em final-gate/PROPOSED_EXTRA_CAPTURE_CORRECTION.patch), preservando critérios/clock e todos os contadores; nova verificação/CI exatos e reviewer antes de READY. Para integração, handoff verificável e coordenação FREE/reserva exclusiva, reconciliação segura de7conflitos e testes do resultado real antes de push. Sem force/main/deploy implícitos.

LIMITAÇÕES OPERACIONAIS: worker original atingiu limite de uso depois de commitar bea; nenhuma compra/upgrade feito; novo worker realizou apenas o grupo final03. Router/cost/verify locais source=rule sem Jev pago; cópia user-level ausente, fallback do repositório usado. Modelos nomeados locais não disponíveis pela API: modelo suportado herdado, papéis independentes mantidos. Advisor não disponível nas ferramentas.

Estado operacional: verification=FAIL com3tentativas; ferramenta não permite transição FAIL→BLOCKED. Estado global BLOCKED registado separadamente sem reset de contadores nem avanço dos nós dependentes. Não emitir task_completed.
