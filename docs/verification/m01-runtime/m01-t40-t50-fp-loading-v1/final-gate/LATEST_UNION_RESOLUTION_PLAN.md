# União pedida pelo utilizador — proposta concreta, não aplicada

Pedido adicional: continuar e integrar o jogo com os trabalhos Claude/outras IAs para a versão mais atual possível. A entrega T40/T50 mantém o orçamento original: 3/3 correções consumidas, sem reset. Esta proposta não declara aceitação nem altera a candidata.

Fonte: `a1ed6ff77ff8cf0bfdff7930f33bf2a2a72ee084` (#79). Destino único existente: `claude/quirky-heisenberg-9l4m7b` (#80), `813f163deceb551e0e4504b30958580cb67d3a76`. Destino já contém #78/d151 e main6697956; não repetir esses merges nem criar candidata paralela. T38/#82 e T43/#81 são fatias parciais, sem READY; não as fechar nem incorporar automaticamente. T46/touch/Argon já presentes no destino devem ser preservados.

## Prova de conflito

`git merge-tree --write-tree --messages --name-only 813f163 a1ed6ff` executado somente sobre objetos Git, sem modificar refs/worktree: código1, árvore provisória COM MARCADORES `f40bab51e1fedd14e0d9950f30288c6136c5790f`. Não é um jogo executável/aceite. Saída íntegra em LATEST_UNION_MERGE_TREE.txt. Sete conflitos confirmados:

| Ficheiro | União que precisa de revisão, sem escolher ficheiro inteiro de um lado |
| --- | --- |
| src/main.js | Manter imports/controlos touch e definições de mistura T46 do destino; acrescentar font gate Barlow finito da fonte; preservar bootstrap Game único e readiness/French. |
| src/assets/asset-manager.js | Manter retry transitório limitado existente no destino e observação real de um cache record; manter supressão de falhas/late-release após dispose da fonte. Rever epochs/deduplicação/retry contra ambos os pais. |
| src/styles-t50-loading.css | Preservar layout/loading acessível e política de fonte com fallback; não reintroduzir progresso simulado. |
| src/ui/m01-loading-controller.js | Conciliar estado/recuperação do destino com fração de pedidos realmente observados da fonte, mandatory bridge e opção francesa. |
| tests/browser/m01-consolidation-lifecycle.spec.js | Preservar semântica audio T46 do destino e observação A/B correta da fonte; nenhum valor de produção alterado para satisfazer teste antigo. |
| tools/verify-t50-bundle.mjs | Medir todo grafo estático/preloads e relatar grafo dinâmico, mantendo proteções adicionais do destino. Sem certificação apenas de entry minúsculo. |
| vite.config.js | Preservar target/chunks Three/loaders e adicionar manifest/French separado; verificar também build relativo do destino para Vercel. |

Auto-merge textual de viewmodel/characters NÃO prova integração semântica: Argon grip/reload/hit e novo FP cradle/finger geometry usam o mesmo rig. Revalidar native drawcounts completos <=6000, todas as fases/reload/save/pausa/LOD e novas fontes tardias. Font CSS da fonte usa `/COD-guerra/`; a candidata suporta build relativo Vercel, pelo que é necessário verificar fonte self-hosted em ambos os prefixos, sem introduzir pedido externo nem ocultar fallback como sucesso.

## Bloqueio de coordenação real

Fonte remota: `coordination/m01-integration-state:.agent/coordination/m01-integrator.json`, generation1/PAUSED; guia do PR84 `docs/direction/M01_INTEGRATOR_LEASE.md` e AGENTS permanente. Regra: "Se estiver PAUSED, não integrar: a migração das sessões antigas ainda não foi confirmada." Ativação exige checks do #84 e confirmação verificável de handoff dos escritores antigos; tempo decorrido não basta. Inventário não encontrou tal handoff, e #80 recebeu commit após o PAUSED. Não adquirir/ativar reserva, não escrever #80 nem avançar antigo claude/m01-integration para contornar a regra de candidata única.

## Gates restantes

1. Fonte #79: CI exato e verifier/reviewer; novo timeout local mid-ADS preservado, sem mais correções autorizadas no orçamento original.
2. Revisão do #83 e checks atualizados da candidata/infra; não presumir preview Vercel como certificação.
3. Handoff verificável + transição CAS PAUSED→FREE conforme guia, depois reserva exclusiva e guard owner/token/HEAD.
4. Resolver sete conflitos por união de intenção só quando houver autorização/reserva e segurança sobre lógica concorrente; registrar ambos os pais e novo contrato de integração para os deltas existentes, sem redefinir a aceitação original.
5. Testar resultado real integrado: Node/tooling/build, novos9+regressões9, touch/T46/loaders/relative font/fallback/save/authoridade; novo SHA e prova de que nada aceite foi apagado. Só depois push normal para candidata e advance CAS, handoff/release. Nenhum merge main/deploy implícito.

Estado: proposta inspecionável e origem publicada no PR79; união NÃO aplicada, não jogável nem contada como concluída.
