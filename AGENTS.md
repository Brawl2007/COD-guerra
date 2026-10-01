# COD Guerra

Leia `DEVELOPMENT_STATUS.md`, `RUNBOOK.md`, `IMPLEMENTATION_PLAN.md` e o sistema afectado antes de editar.
A especificação completa é `docs/PROMPT_MESTRE.txt`; o índice do produto é `PROJECT_SPEC.md`.

- Node >=22.12; usar Node 24 no CI. `npm ci`, `npm test`, `npm run build`, `npm run test:browser`.
- Dev: `npm run dev`, URL `/COD-guerra/` na porta 5173. Produção: `npm run preview`, porta 4173.
- Gameplay: x/y em unidades legadas; 32 unidades = 1 m. Three.js: x/z no solo, y altura em metros.
- `Simulation` guarda somente dados. Renderer nunca decide dano, visibilidade, eventos ou estado da missão.
- Preservar a bancada antiga. A aldeia francesa é ficcional; nunca renomeá-la para Tczew.
- Testar alterações proporcionais ao comportamento. Teste de estado não é playtest. Não inventar FPS.
- Assets finais precisam de autoria/licença, escala e animações verificadas. Não extrair conteúdo de COD.
- Trabalhar em branch própria; abrir PR para main. Actualizar status e evidências antes de terminar.
- Trabalho simultâneo com Claude Code: pesquisa/mapa/roteiro de M01 em branch própria, evitando alterações concorrentes em engine/combate/build.
