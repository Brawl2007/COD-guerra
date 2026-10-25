# M02 — Recuperação Claude e reutilização M01

Branch: `codex/m02-recovery-v1`. Base Gemini `56e98cb`; origem Claude `d08bb7a`, divergente desde `41d990d`. O rig Claude foi extraído separadamente; não houve merge da versão antiga sobre as áreas B/C.

- `node-m02.txt`: 35 testes M02 aprovados, incluindo guardas das novas interações.
- `browser-scenes.txt`: dois testes browser aprovados, antes do reforço da medição sonora por input.
- `browser-input-audio.txt`: teste reforçado aprovado por Espaço → simulação → evento → AudioManager M01 → gravação da saída. Um tiro registado; pico 0,187886, sem alteração do snapshot na passagem de apresentação.
- `production-glb-atlas.png`: aplicação construída, entrada M02 servida por preview, GLB e atlas Low carregados.
- `farm-facade.png` e `area-c.png`: revisão por cenas da bancada com materiais e arma reutilizados.

Build passou e inclui a entrada M02. Smoke de produção devolveu HTTP 200; oito variantes de assets, 101 clips disponíveis, arma GLB ativa, atlas com três texturas, sem falhas reportadas de carregamento.

São verificações por cenas e fixtures, sem alegação de percurso contínuo, playtest humano, conclusão artística ou FPS. A suíte Node global foi interrompida durante verificações demoradas da M01 e não está aprovada. O estado e o backlog estão em `docs/m02/M02_EXECUTION_STATE.md`.

Ainda faltam vegetação/terreno e encenação final, cobertura sonora narrativa/distante, revisão de equipamento especializado e percurso contínuo C01–C12 sem atalhos, incluindo guardas B/C, falhas de assets e restauros adversos. Não promover a missão a concluída com base nestes testes.
