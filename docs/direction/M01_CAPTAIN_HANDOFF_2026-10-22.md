# Handoff do Capitão — M01, 2026-10-22

**Candidata única:** PR #80, `claude/quirky-heisenberg-9l4m7b` @ `f929a02` (= `claude/gallant-darwin-xr7jxu`). `main` intocada; sem deploy.

## Integrado hoje (todos INTEGRADA SEM VALIDAÇÃO DE JOGO; ver `M01_INTEGRATION_LEDGER.md`)
| Passo | Merge | Conteúdo |
|---|---|---|
| PR #91 | `4e2588f` | P0–P4 do playtest, fatias 2/2b, D2, D5 seletor (soldado por omissão) |
| WP1 | `3eb21b3` | D3 (morte com causa, CP-B2), D4 (F4 cutscenes, F5), D5 (death beat 2,5 s, nível no cartão, oferta de nível mais baixo), veterano sem regeneração, recalibração; emenda 13 (recruta idêntico) |
| WP3 | `c99a432` | SP-08: contagem «passaram X de Y», escolta do Dudek com fogo real; esquadra recua aos lanços depois das 06:10; falas 155–163; emenda 14 |
| WP2 | `af3f382` | Encravamento da ckm (rajadas 14 e 45), falas 114/115 (115 com prioridade 2: ouvida 8/21 em vez de 0/21); emenda 15 |
| WP4 | `86e1a1a` | Um Skeleton por soldado (240 → 40 `skeleton.update`/frame), menos alocações, `renderState` lido uma vez |

Validação em `ffb65e7`: `npm test` 1524/1524; golden 13/14/15 «identical»; browser 6 specs 45/47 e as 2 expectativas desatualizadas corrigidas (2/2 isoladas). Sem playtest humano, sem FPS medido.

## Decisões do proprietário pendentes
1. Soldado (jogo novo) ficou muito mais duro: piloto parado à vista morre (mediana 17,65 s); 12/12 rotas de controlo passivas morrem. Ajustar tabela ou arrancar em recruta? Só o playtest decide.
2. Graça de reação de soldado 1,5 → 1,2 s.

## Próximas ações técnicas (por ordem)
1. Coordenação aliada também no combate principal 05:30–06:10 (hoje só na retirada; linha do benchmark PARCIAL).
2. Distância do inimigo: nenhum alemão < 300 m nas rotas do golden (`safeX` do assalto do tabuleiro).
3. Intervalo sem contacto na rota de controlo depois da demolição leste: 33,5 s (corrida de volta por terreno morto).
4. Defeito latente: impacto `raid_0530` usa `>=` exato e o evento usa tolerância 1e-6 (pode cair um tick tarde); corrigir com emenda própria.
5. Renderer (auditoria 2026-10-22): fundir malhas por soldado (≈26 draw calls → 2–3), MSAA 4× + AO a resolução total em Medium, cascata dupla de sombras em Medium.
6. Browser `m01.spec.js:59/:346/:478` sensíveis à carga da máquina: re-correr com a máquina livre.

## Bloqueado por humanos
Playtest (T52), gravações de áudio (T45), revisão nativa do polaco (falas 100–163), licença fp-arms-v2, medição T49 no PC real, shell do exe.

## Notas de economia
Correr um pacote de cada vez; esforço médio/alto; suites completas só na integração; o golden demora ≈40 min por `--write` nesta máquina.
