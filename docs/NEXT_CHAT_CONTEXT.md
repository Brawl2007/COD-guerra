# Contexto para continuar COD-guerra

O utilizador pediu passagem para outro chat para reduzir tokens. Continuar trabalho existente; não reiniciar. Repositório: Brawl2007/COD-guerra. Branch de handoff: `codex/m01-handoff-aircraft`. Ler primeiro este ficheiro, `AGENTS.md` e `docs/WORKING_CONTEXT.md`; consultar outros documentos só conforme o sistema afectado.

## Intenção e limites

Concluir M01 — Tczew antes de M02. M01 continua **PROTÓTIPO JOGÁVEL**, sem aprovação do marco 2. Integrações em `codex/m01-runtime` autorizadas; merge em `main` e publicação pertencem ao utilizador. Não usar `workflow_dispatch`. Preservar bancada francesa (32 unidades/m), schema 2, CP-A..D, RNG, baixas por ID, relógios/gates e segurança das demolições. Renderer lê dados; não decide combate. Alemães na margem leste, equipamento de 1939.

## Refs verificadas em 2026-10-02

- `main`: `72bbcdd156603c9399801c95d43d9365ba50fc82`.
- `codex/m01-runtime`: `a07fcd955dcaccae8173a5b4773675af27bd476a`; PRs #26/#27 integrados só em staging. Soldados/armas e evacuação da estação estão lá. Kowal usa a rkm embutida e dez clips dos soldados; não duplicar a arma pelo kit isolado #27.
- PR #28, Ju 87: `3fa1d0d4e62e5c48c300d1929ca5455ee6737563`. A branch de handoff preserva a entrega e acrescenta a revisão descrita abaixo.
- PR #29, vagões: `0667af008549f15947c10ab09b814338d701bf2c`, aberto, ainda não revisto/integrado.
- PR #30, MG34: `ad0253e9e370c80b96163d01b061047750dd93df`, aberto, ainda não revisto/integrado. A branch do Claude foi reutilizada; #25 agora aponta ao mesmo head e não deve entrar em main separadamente.

## Trabalho guardado nesta branch

`src/render/m01-view.js`: três Ju 87 reais com THREE.LOD, geometria/materiais partilhados, mixers independentes, hélice amostrada do relógio, mínimos LOD1 médio/LOD2 baixo, fallback parcial/total e cancelamento/disposal. Trajectórias/eventos e segundo raid preservados; SC 250 oculta porque a carga real não foi confirmada.

`src/main.js`: só falhas das nove pontes obrigatórias bloqueiam M01; `requiredAssetFailures` distingue-as dos aviões opcionais. `tests/browser/m01.spec.js` verifica o raid genuíno em continuação de checkpoint e fallback; a regressão das pontes agora espera nove falhas obrigatórias, não nove totais. Dois testes Node novos em `tests/m01-aircraft-runtime.test.js`.

Provas/hashes/captura real em `docs/verification/m01-runtime/aircraft/`. Node final **132/132**, build **1030,37 kB / 267,16 kB gzip**, aviso de chunk grande. Dois novos casos do navegador passaram. A suíte completa **24 casos foi interrompida**, sem relatório final; executar novamente e confirmar a regressão das pontes. A staging anterior, tree `8a77c66b6fd848e22b10b3ff192bf0775bf6d1a5`, passou **128 Node e 22/22 navegador**, 502,8 s. Não atribuir esses 22 ao novo renderer. Não houve novo playtest humano ou FPS no Chromebook.

## Claude

Já entregou rkm #27, Ju 87 #28, vagões #29 e MG34 #30. A próxima tarefa é **ckm wz.30 polaca e clips da guarnição da casamata**, em pastas novas, sem `src/`, combate, saves, mapa ou workflows. Mensagem completa em `docs/CLAUDE_NEXT_TASK.md`. Não voltar a pedir MG34/Ju87/vagões.

## Próximos passos

1. Verificar refs remotas, checkout desta branch e executar `npm ci`, `npm test`, `npm run build`, `npm run test:browser`. Preview e testes usam 4173: não executar em simultâneo.
2. Rever a diferença com o #28 e integrar em staging preservando a revisão/histórico; abrir PR para main para CI, sem fazer merge ou publicar. Esta passagem guardou a branch, sem iniciar novo CI.
3. Rever e integrar #29 e #30; depois arte/transições/áudio e validação humana/Chromebook. Não prometer percentagem ou prazo sem critérios.
4. Graphify só se o utilizador mantiver prioridade: checkpoint incompleto em `graphify-out/`. AST 1537 nós/3558 edges; documentos em dois chunks e 120/151 imagens iniciais extraídas. Faltam 31 iniciais + 4 imagens novas do Ju87/prova, documentos novos/alterados, cache/merge, diagnóstico, comunidades, JSON/HTML e benchmark. Agentes atingiram limite de uso; não recomeçar imagens já concluídas. Ler a skill antes de retomar e converter source_file para a nova raiz. Não declarar grafo completo.

## Contexto e consumo

Usar `docs/WORKING_CONTEXT.md` como índice e buscas pontuais; não reler o prompt mestre ou todas as provas em cada etapa. Headroom foi testado apenas localmente, sem proxy ou API: 7,3% em estimativa do relatório de 22 testes. Context-compressor rejeitou duas reduções por evidência insuficiente; conservar âncoras completas. Métricas não são faturação nem poupança real do ChatGPT. `docs/context/` guarda medições e decisões. Evitar novas extrações extensas sem necessidade.
