# M01-ANIM-CONTRACT-SIM-V1

| Campo | Resultado |
| --- | --- |
| Estado | `READY_FOR_CAPTAIN_REVIEW_WITH_KNOWN_FAILURES` |
| Branch | `codex/m01-anim-contract-sim-v1` |
| HEAD | SHA final na entrega; referência remota da branch é a autoridade. |
| Base confirmada | `codex/m01-bridge-portal-material-detail-polish-v1` @ `99309d9cb023cc94a07d41ff863e1362e4460570` |
| Plano lido | `claude/exciting-planck-5ylz7z` @ `5583a4ab854a2e64dad85460bfd40031c3406ccc` |
| Piloto consultado | `codex/m01-rifleman-locomotion-runtime` @ `93aaa5c4a5651f22b4c696005501a2ac1014860a` |
| M01 | **PROTÓTIPO JOGÁVEL**; sem integração ou deploy. |

Contrato concluído para o próximo Animation Resolver: `motion.speed`, `motion.odometer`, `motion.gait`, `motion.gaitSince`, `bodyYaw`, `posture/postureSince`, `suppressedAt`, `hitAt/hitYaw`, `diedAt/deathYaw`. Os eventos são escalares opcionais ligados aos resultados reais; nenhum renderer decide combate. [Contrato](../../../architecture/M01_ANIMATION_PRESENTATION_CONTRACT.md).

Schema 2 preservado, campos presentes exactos após restore, defaults determinísticos para ausentes, roster legacy 86/89 e migrações/adaptadores CKM/MG34/estação/Bąk conservados. Diagnostics detached em `simulation.animationPresentation` / `gameDiagnostics().m01.animationPresentation`; `game.js` muda apenas essa ligação de leitura, sem modificar HUD ou fluxo.

Snapshot plano inicial: **29.253 → 38.971 bytes**, acréscimo de **9.718 bytes**; nenhum campo novo no jogador. Não há histórico/mirror extra de apresentação no save. Dados em `snapshot-diff.json`.

## Invariância e testes

| Verificação | Resultado e evidência |
| --- | --- |
| Base/candidato, bytes de gameplay por tick | **41.083 ticks**, duas rotas completas, seed 19390901 ignora / seed 7 ajuda; nenhum byte diferente em estado legacy, checkpoint anterior ou eventos. `gameplay-ab.json`, `gameplay-ab.log`, fixture imutável em `tests/fixtures/m01-anim-gameplay-baseline.json`. |
| A/B com apresentação, save/reload | **61.055** comparações da auditoria schema 2 + **1.760** novas continuações, sem divergência. `schema2-proof.json`, `continuation-proof.json`. |
| CP-A..D/pausa/facing/IDs/RNG | Cobertos por rotas, continuações independentes, double load, morte/recovery, dt variável e pausa. Movimento, disparos, HP, munições, cadence, resultados e relógios existentes iguais. |
| Odómetro/bodyYaw | Deslocamento efectivo após colisão, parado bloqueado, movimento directo dos spans, sprint do pelotão, crouch/carry/drag, yaw curto/limitado e facing/hitboxes preservados. |
| Legacy/corrupção | 86/89 e campos parcialmente ausentes; **44 mutações** rejeitadas atomicamente, também no checkpoint aninhado; input/destino/RNG conservados. |
| `npm test` (uma execução) | **343/344**, 189,858 s, sem skips. Único vermelho: guarda histórica do hash integral de `m01-simulation.js` no teste do viewmodel. Log completo `node-tests.log`. |
| Correção da guarda | Hash original da base mantido; bytes de gameplay agora verificados por tick. **38/38 PASS** nos quatro ficheiros afectados após a correção, 5,337 s, sem skips. `protected-guard-final.log`. Nenhuma mudança de produção depois do npm test. |
| Build | **PASS**, bundle 1202,19 kB / 322,69 kB gzip; aviso herdado de chunk >500 kB. `build.log`. |
| Browser focado | **2/2 PASS**, 62,537 s, zero retries/skips/falhas/flaky/erros de página; Chromium 153/SwiftShader. Restore 89 e legacy 86, frame exacto pausado, reload e checkpoint anterior. `browser.json`, `browser-summary.json`, capturas inspeccionadas. |

**Limitação formal que determina o estado:** a única execução completa registada de npm test ficou vermelha na guarda obsoleta; essa guarda está corrigida e o follow-up é verde, mas não se alega 344/344 numa nova execução completa. Não foi repetida a suíte completa, respeitando a instrução de a executar uma vez. A certificação completa fica para a integração. Não se observou falha de runtime nesta tarefa.

Histórico: o primeiro foco passou 48/49; a falha era ausência de um commit histórico no shallow checkout e foi resolvida ao o obter (seguida de verificação verde). Os primeiros logs colocados em test-results foram limpos pelo runner de browser; a evidência final acima foi regravada fora desse output e está preservada. O download CFT era um arquivo inválido; foi usado o Chromium 153 do pacote npm, fora do repositório. Sem alterar dependências/configuração de produção, retries ou timeouts globais.

## Pendentes do plano e limites

- Animation Resolver/player/proxies, clips, IK e LOD de animação: próxima tarefa; este contrato ainda não melhora visualmente os clips.
- Reload/rounds novos, prone genérico/hitboxes, velocidade/fases novas de Bąk, cover/vault, MG34 loader/feed/reload e CKM fire policy: fora de âmbito; decisões/tarefas separadas, sem implementação silenciosa.
- Yaw corporal com taxa limitada, sem a proposta adicional de cap instantâneo de 60° de desvio parado. Eventos históricos desconhecidos ficam ausentes, incluindo reservas perdidas fora de cena.
- Speed não é clamped a 8: o transporte já existente reposiciona a raiz de Bąk a **33.24429142066895 m/s** por um tick. O odómetro mede exactamente esse pass; o adaptador de transporte tem precedência sobre passada genérica. Reposicionamento de cenas fora de updateActors não é caminhada.
- Browser é continuação automática de saves obtidos por controlos da simulação; não é full browser 56/56, playtest humano, aprovação artística ou medição de FPS.

`src/render`, `src/world`, `src/core`, assets, arma, fire model, missão JSON, Station/FX/HUD/Train/Bridge e workflows não mudaram. Quatro guardas históricas de ficheiro inteiro foram ajustadas exclusivamente para as novas adições de apresentação; os checks restantes de bytes/assets mantêm-se e o gameplay ganha comparação imutável por tick.

Main confirmado `72bbcdd156603c9399801c95d43d9365ba50fc82`; deploy `deploy/m01-latest-playable` confirmado `cb400355c056955d1d6d0b22e92bd7be2443a10c`; base aprovada intacta. Não executar merge, workflow_dispatch ou outra TASK após este handoff sem ordem.
