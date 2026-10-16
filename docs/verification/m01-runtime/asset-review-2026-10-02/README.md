# Revisão dos kits de vagões e MG34 — 2026-10-02

M01 permanece **PROTÓTIPO JOGÁVEL**. Esta revisão aceita os kits provisórios dos PRs #29/#30 e preserva os seus históricos, geradores, GLB, manifestos e provas. A integração de ficheiros em staging não significa que os dois kits já aparecem no jogo.

## Âncoras e decisão

| Entrega | Head revisto | Merge preservado | Decisão |
| --- | --- | --- | --- |
| Ju 87 revisto | `f758daab8817adf5382a6623b8be43d42f2e4321` | Base desta revisão | Renderer de três aviões preservado; validação completa registada no relatório de navegador. |
| Vagões #29 | `0667af008549f15947c10ab09b814338d701bf2c` | `b880cd4` | Aceite como kit original provisório; P16 permanece aberta. |
| MG34 #30 | `ad0253e9e370c80b96163d01b061047750dd93df` | `ded5d4b` | Aceite como kit original provisório compatível com o rig; detalhes de 1939 ainda por confirmar. |

Conflitos de adições em `ASSET_CREDITS.md` e `DEVELOPMENT_STATUS.md` resolvidos conservando os créditos e estados da rkm, Ju 87, vagões e MG34. Os únicos ajustes partilhados de ferramentas da MG34 são exports de primitivas/poses da rkm e o rebinding do clip na galeria dos soldados. Os modelos/animações existentes permanecem intactos.

## Verificação desta revisão

- `npm ci` concluído nas duas worktrees, com Node 24.19.0.
- Handoff: **132/132 Node**. Integração dos dois kits: **136/136 Node**, sem falhas/cancelamentos/skips.
- Handoff `f758daa`: **24/24 navegador** em **538,6 s**, zero retries/skips/instáveis/erros globais. Inclui as pontes obrigatórias, Ju 87/pausa/fallback, CP-D/baixas/destruição, demolições e bancada francesa. `verification.json` identifica o commit realmente testado e lista os casos; o relatório bruto está em `aircraft-browser.raw.json.gz`. A execução interrompida anterior foi substituída por este resultado completo.
- Os quatro testes dos novos kits verificam escala, LODs, pivôs, sockets e animações; os clips `mg34_*` têm alvos existentes e não substituem os clips dos soldados/rkm.
- Ambos os builds passaram: JS **1030,37 kB / 267,16 kB gzip**, mantendo o aviso de chunk grande. O bundle JS é idêntico byte a byte: SHA-256 `88346cd0b30c3febad692ce60489653989a800156210c0d80fc04a20a8416325`.
- GLB, fontes e capturas de cada kit estão idênticos aos respectivos heads. As galerias fornecidas `wagons_views.png` e `mg34_in_hands.png` foram inspeccionadas nesta revisão; os relatórios de importação e reprodução dos geradores pertencem às entregas originais e foram preservados.
- Os dez GLB dos dois kits estão incluídos no build, byte a byte iguais aos ficheiros de origem.
- `ju87-real-raid.png` e `station-ground-drag.png` vêm desta execução completa e foram inspeccionadas. São continuações de checkpoints da simulação; a captura do céu enquadra um dos aviões, enquanto os três são verificados nos diagnósticos/assertions do teste.
- `src/`, `tests/browser/`, workflows e `graphify-out/` estão idênticos ao handoff. Nenhum contrato de save/relógio/combate foi alterado para aceitar estes kits. SHA-256 do checkpoint Graphify: `54647d13cc9b860c18b777cbd3d4cdc693d4a2af0cb015082171c2667dd32e32`.

## Próxima ligação ao renderer

- Vagões: substituir as caixas do trem 963 por 65 vagões com passo de 9,10 m e lotes `InstancedMesh` LOD2 à distância. P16 não identifica os tipos reais ou locomotiva. Velocidade, vagão/lado de desembarque e vagão incendiado precisam de dados da simulação antes de animar rodas/portas/fogo. A relação entre o modelo do pátio e as coberturas `cv_wagon_1/2` exige revisão de altura; não mudar colisão ou saves por inferência visual.
- MG34: ligar uma só arma aos actores existentes `grp_de_east` antes de criar as acções do mixer e amostrar os tiros reais. Falta pose deitada sobre o bípode, fonte para detalhes de 1939 e dados para eventual recarga. A arma do Panzerzug 7 continua dependente da identificação histórica; não adoptar automaticamente a variante de infantaria para o trem.
- PR #31 (`claude/m01-ckm-wz30`, head `f4275ff227885777c1876a318d673bfcb9c3d93e`) já existe e fica por rever. A tarefa da ckm não deve ser pedida novamente.

Playtest humano e medição no Chromebook permanecem pendentes. Graphify continua em pausa no checkpoint existente. Merge em main, publicação e `workflow_dispatch` continuam reservados ao utilizador.
