# Próximas tarefas do Claude — orçamento da ckm e transições do arrasto

Pedido do utilizador em 2026-10-02, depois da entrega dos vagões danificados #34. Continuar sem reiniciar nem repetir entregas. A ckm #31 (head 4170eea) e a MG34 deitada #33 (c6e5ed4) já foram revistas/integradas na branch do Codex. Os vagões danificados #34 (11554d9) foram revistos e integrados como kit; a escolha de vagão/estado continua pendente na simulação. Especificações anteriores preservadas em `docs/CLAUDE_CKM_TASK_REFERENCE.md` e `docs/CLAUDE_MG34_WAGON_TASK_REFERENCE.md`.

Codex reserva o renderer, engine, combate, saves, relógios, mapa e integração. Claude trabalha apenas nos assets e nas suas ferramentas/testes/documentação. M01 continua **PROTÓTIPO JOGÁVEL**.

## 1. Prioridade: ckm wz.30 dentro do orçamento

Branch nova `claude/m01-ckm-budget`. Usar `codex/m01-runtime` actualizado; se #31 ainda não estiver na staging, partir do head `4170eea6ca5ed5f882727f9678bd2a763927e5b1` numa branch nova. Não refazer o kit.

- O LOD0 actual tem **5004 triângulos**, acima do limite **4000** em `missions/m01-tczew/assets-m01.json`; a fita livre/cartuchos ocupa 1832. Reduzir tesselação/peças pequenas até **no máximo 4000 triângulos visíveis**, conservando silhueta, fita, alimentação e legibilidade da arma.
- Manter comprimento 1,211 m, metros, +Y, frente −Z, tripé, caixa, root, hierarquia, nomes, pivôs e sockets. Não encurtar a arma/fita nem esconder peças só para cumprir a contagem.
- **Preservar LOD1/LOD2, GLB de animações e os clips da arma/guarnição byte a byte.** Aplicar a simplificação só ao LOD0 no gerador existente; actualizar manifesto, relatório e teste para o limite real de 4000. Não relaxar o orçamento.
- Registar os SHA-256 preservados, triângulos visíveis/totais, draw calls, bytes e bbox. Galeria antes/depois em três ângulos, pormenor da fita/caixa/miras e importação real no three.js.
- Editar apenas `tools/assets/m01-ckm-wz30/`, LOD0/manifesto em `assets/models/provisional/m01/weapons/ckm_wz30/`, teste do kit e documentação/créditos afectados. Não tocar soldados, outras armas ou `src/`.
- Fontes T34 e detalhes estimados continuam explícitos. Não declarar historicidade final nem ligação à casamata. A simulação ainda não representa `grp_ckm_crew` por actores.

## 2. Depois: agarrar e soltar o ferido no arrasto da estação

Branch nova independente `claude/m01-station-drag-transitions`, a partir da staging; não derivar da tarefa 1. Ler `tools/assets/m01-station/build.mjs`, o manifesto de `m01_station_animations.glb`, os clips `drag_wounded`/`wounded`/`crouched_idle` do rig actual e a secção `stationEvacuation` da simulação só para compreender o contrato.

- Criar quatro clips novos, sem substituir existentes: `station_drag_medic_grab`, `station_drag_patient_grab`, `station_drag_medic_release`, `station_drag_patient_release`. Pares grab/release com a mesma duração e relógio; documentar durações estimadas e eventos de apresentação `hands_contact`, `grip_ready`, `hands_release`, `settled`.
- Usar os **61 ossos existentes**, sem alterar nomes, bind, malhas, rig ou clips anteriores. O começo/fim deve ligar às poses reais: médico agachado → frame 0 do `drag_wounded`; paciente ferido no chão → pose de arrasto; libertação faz o percurso inverso e deixa o ferido no chão.
- A raiz do paciente no arrasto é `+0,92 m` na direcção facing do médico (no referencial do rig orientado para −Z, offset `[0,0,−0.92]`). Documentar offsets e sockets; confirmar mãos junto dos ombros/cabeça, braços/pernas sem atravessar os corpos e o paciente de costas no chão. Não levantar o paciente como Bąk ao ombro.
- Clips in-place, sem deslocação de raízes. A simulação decide trajecto, associação, entrega e baixa. Eventos dos clips são metadados; não implementar transporte, horários, gameplay, checkpoints ou flags no renderer/engine.
- Médico sem arma visível; não duplicar nem alterar equipamento. Paciente desarmado durante a evacuação.
- Pastas novas `assets/models/provisional/m01/characters/station-drag-transitions/`, `tools/assets/m01-station-drag-transitions/`, `docs/assets/m01-station-drag-transitions/` e teste `tests/m01-station-drag-transitions-glb.test.js`. Registar SHA-256 do rig e clips reutilizados.
- Testar alvos do rig, valores finitos/quaternões, continuidade nos extremos e os contactos com AnimationMixer. Galeria em vários instantes dos dois pares, vista lateral/frontal/superior, pausa e restauro do mesmo tempo. Não executar outra partida completa para produzir uma galeria.

## Entrega comum

Ler `AGENTS.md`; usar buscas pontuais e ferramentas gratuitas, arte original/licenciada. Um PR pequeno por tarefa para `codex/m01-runtime`, fonte reproduzível, manifesto, importação real e capturas inspeccionadas. Executar testes dos assets afectados, `npm test` e `npm run build`, com contagens reais. Não apresentar galeria como playtest humano ou FPS no Chromebook.

Não alterar `src/`, engine/combate, saves, RNG, CP-A..D, relógios/gates, demolições, mapa, bancada francesa, workflows ou Graphify. Não fazer merge em main, publicar ou usar workflow_dispatch. Não repetir Ju 87, rkm, vagões intactos/danificados ou MG34 de pé/deitada. A integração pertence ao Codex.
