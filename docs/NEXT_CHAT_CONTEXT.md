# Contexto para continuar COD-guerra

Continuar sem reiniciar. Ler primeiro este ficheiro, `AGENTS.md` e `docs/WORKING_CONTEXT.md`; consultar outros documentos só conforme o sistema afectado. Repositório: Brawl2007/COD-guerra. Branch de continuação: `codex/m01-assets-review`; entregue somente em staging `codex/m01-runtime`. A âncora de código/merges é `ded5d4bd06e0790360698f05bfb4f6ee9e917627` (tree `c43075bd03dc7049658b872dd1a6bcb43928686e`); os commits seguintes registam apenas contexto/provas. Verificar HEAD remoto antes de escrever.

## Intenção e limites

M01 — Tczew permanece **PROTÓTIPO JOGÁVEL**, sem aprovação do marco 2. Integrações em staging autorizadas; merge em `main` e publicação pertencem ao utilizador. Não usar `workflow_dispatch`. Preservar bancada francesa (32 unidades/m), schema 2, CP-A..D, RNG, baixas por ID, relógios/gates e segurança das demolições. Renderer lê dados; não decide combate. Alemães na margem leste; equipamento de 1939. Playtest humano e FPS no Chromebook continuam pendentes.

## Entregue nesta continuação (2026-10-02)

- Retomado exactamente `codex/m01-handoff-aircraft` / `f758daab8817adf5382a6623b8be43d42f2e4321`; essa branch foi preservada. `main` permaneceu em `72bbcdd156603c9399801c95d43d9365ba50fc82`. Base staging inicial: `a07fcd955dcaccae8173a5b4773675af27bd476a` (#26/#27).
- Handoff validado novamente: **132/132 Node**, build **1030,37 kB / 267,16 kB gzip** e **24/24 navegador**, **538,6 s**, zero retries/skips/instáveis/erros globais. A suíte antes interrompida agora está concluída, incluindo a regressão das nove pontes obrigatórias e a bancada francesa.
- Preservada a revisão do Ju 87 #28: três modelos reais, LOD por distância/qualidade, geometria/materiais partilhados, mixers independentes, hélice pelo relógio, pausa/restauro e fallback parcial/total. SC 250 oculta por falta de fonte. Nove pontes obrigatórias distinguem-se das falhas opcionais em `requiredAssetFailures`; trajectórias, eventos e segundo raid conservados.
- Kit vagões #29, head `0667af008549f15947c10ab09b814338d701bf2c`, revisto e integrado por `b880cd4`. Kit MG34 #30, head `ad0253e9e370c80b96163d01b061047750dd93df`, revisto e integrado por `ded5d4b`. Conflitos de créditos/status resolvidos preservando todas as entregas. A branch do #25 foi reutilizada pelo #30: não fazer merge separado em main.
- Integração: **136/136 Node**, build passa, dez novos GLB presentes no build. `src/`, `tests/browser/`, workflows e Graphify são idênticos ao handoff. JS de produção também idêntico (SHA-256 `88346cd0b30c3febad692ce60489653989a800156210c0d80fc04a20a8416325`). Não declarar uma segunda execução local de 24 casos nesta integração: o relatório distingue handoff e staging. O PR em rascunho para main permite CI do candidato, sem publicação.
- Provas finais, relatórios Node/build, relatório bruto comprimido dos 24 casos e capturas reais em `docs/verification/m01-runtime/asset-review-2026-10-02/`. Provas antigas continuam preservadas. Galerias dos kits foram inspeccionadas; os relatórios de importação/determinismo delas são das entregas originais, não novos playtests.

## Pedido adicional ao Claude

O utilizador pediu mais trabalho ao Claude nesta continuação. `docs/CLAUDE_NEXT_TASK.md` agora dá duas tarefas novas e independentes: MG34 deitada com atirador/municiador, depois estados queimado/danificado dos vagões. Exige pastas/branches/PRs separados, sem tocar runtime, saves, demolições, bancada francesa ou Graphify. Especificação anterior da ckm preservada em `docs/CLAUDE_CKM_TASK_REFERENCE.md`. As novas tarefas foram preparadas; ainda não são entregas.

## Pendências concretas

1. **Ligação dos kits ao renderer ainda pendente.** Staging recebe os ficheiros; não afirmar que vagões/MG34 já aparecem no jogo. Vagões: 65 com passo 9,10 m e LOD2 instanciado; locomotiva/tipos reais dependem de P16. Animar rodas/portas/fogo só com dados de velocidade, vagão/lado de desembarque e vagão incendiado. Rever altura dos modelos contra `cv_wagon_1/2` sem alterar saves/colisão por inferência. MG34: uma arma, presa antes dos clips, tiros amostrados de `firedAt`; falta pose deitada e confirmação de detalhes de 1939. Arma do Panzerzug 7 continua incerta.
2. **ckm wz.30 já entregue no PR #31**, branch `claude/m01-ckm-wz30`, head observado `f4275ff227885777c1876a318d673bfcb9c3d93e`. Ainda por rever/integrar. `docs/CLAUDE_CKM_TASK_REFERENCE.md` conserva a especificação como checklist da entrega; não repetir o pedido ao Claude.
3. Rever arte/transições/áudio e encenação; playtest humano completo e medição no Chromebook antes de aprovar M01/iniciar M02. O aviso de chunk grande permanece.
4. **Graphify em pausa por ordem do utilizador.** Checkpoint incompleto em `graphify-out/extraction-checkpoint.json.gz`, SHA-256 `54647d13cc9b860c18b777cbd3d4cdc693d4a2af0cb015082171c2667dd32e32`. AST 1537 nós/3558 edges; dois chunks de documentos e 120/151 imagens iniciais extraídas; faltam 31 iniciais + quatro imagens do Ju87/prova, documentos alterados/novos e o merge/diagnóstico/grafo/HTML/benchmark. Não repetir extracções já concluídas, não declarar grafo completo. Ler a skill só quando houver ordem de retomar.

Usar buscas pontuais e o índice de trabalho. Headroom/context-compressor têm apenas medições locais guardadas em `docs/context/`; não são poupança/faturação real do ChatGPT nem interceptam esta conversa.
