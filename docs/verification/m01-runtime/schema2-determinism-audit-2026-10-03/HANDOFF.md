# HANDOFF — M01-SCHEMA2-CROSS-SYSTEM-DETERMINISM-AUDIT-V1

M01 — Tczew permanece **PROTÓTIPO JOGÁVEL**. Auditoria isolada para revisão do capitão; nenhuma integração ou publicação do jogo.

## Identificação

- Modelo/esforço solicitado: GPT-6.1 Sol / HIGH; sem delegação nesta tarefa.
- Base remota confirmada: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.
- Branch: `codex/m01-schema2-determinism-audit`.
- Produção final: `d241e2069f984a47a9d41190f0b53c26833cc28a`.
- Testes Node finais: `1f15b58436c11d70c44195ebf181d710f876a3a4`; evidência verde publicada em `427358ab74a7dd7aadd20293dc301c46ac29f879`.
- Fixtures/UI de navegador finais e 4/4 focados: `44419b1adc7aa1e7c2740e62ffbba69c725860ab`.
- HEAD final remoto: commit de evidências/documentação desta branch, confirmado na resposta final. O documento não insere a sua própria hash.

## Resultado da comparação de futuros

A continua a simulação viva depois do save. B restaura esse save numa nova `M01Simulation`, com RNG de construção diferente, e recebe cópias dos mesmos inputs e do mesmo dt.

`tests/helpers/m01-determinism.js` compara, **a cada tick**, todos os campos do snapshot plano, o checkpoint real de recuperação e os eventos emitidos depois do save. Não arredonda números nem usa tolerância. O diagnóstico informa o primeiro tick, caminho do campo, valores A/B, clocks, dt e input. Um teste canário prova que a comparação detecta alteração de RNG, clock, campo ausente e evento adicional. O método não se limita a `snapshot == restore(snapshot)`.

Antes de guardar, os eventos já consumidos são drenados; restore não os pode repetir. Eventos de gameplay futuros, incluindo tiros e impactos individuais, são comparados em ordem. World/collision são reconstituídos pelo restore real e exercitados pelas continuações, sem injectar dados de renderer.

**Resultado Node final:** 37 casos registados, mais 34 janelas de save ao longo dos percursos, **61.055 comparações de ticks**, sem divergência nos casos testados. Detalhes completos em `audit.json` e `node-summary.json`.

| Percurso sem reiniciar B | Semente | Apoio | Ticks | Eventos comparados | Janelas de save |
| --- | ---: | --- | ---: | ---: | ---: |
| Menu/intro → debrief | 19390901 | Ignora | 20.976 | 2.923 | 19 |
| Menu/intro → debrief | 7 | Ajuda | 20.107 | 1.642 | 15 |

As rotas são os controlos reais do piloto Node existente. O observador de teste não altera clocks, actores, eventos ou objectivos. B da comparação longa nunca é re-restaurada; as janelas adicionais recebem double save/load a meio. O percurso com apoio suprime a MG antes de uma rajada: a presença da rajada é exigida no percurso sem apoio e nos três testes específicos, não artificialmente injectada nesse percurso.

| Sistema | Prova específica além das duas rotas |
| --- | --- |
| RNG | Estado exacto em todos os ticks; tiros/gauss, impactos e inputs de rifle continuam iguais |
| CP-A..D | Capturados pelos eventos reais; saves entre cada CP e o seguinte; mesma morte injectada nas duas simulações e recuperação real por tick; depois mais continuação e double load |
| MG34 | Rajada de sete após 1/4/6 tiros; pipeline completo `tick`, IDs/plan/rounds/eventos/RNG, com rifle, granada e double load |
| Rounds/casualties | Saves com tiros em voo, tiro designado para uma baixa e impacto; contagem e IDs de actores mortos comparados |
| Granadas/arma | Posição, velocidades, fusível, detonação e dano; ferrolho e recarga parcial; mesmos inputs após o save |
| Estação | Grab/drag/release; dt variável, pausa zero-dt, double load, relógio e raízes do par |
| Bąk | Ferido, transporte por Dudek, transporte pelo jogador e entrega após a demolição leste; continuação de 8.000 ticks até evacuação/demolição oeste |
| Gates/demolições/sectores | Comparação de estado e eventos em todos os ticks dos dois percursos; saves nas duas demolições e nos gates |
| OUTRO | Reprodução normal, skip, double load e ticks após complete sem evento extra |
| Legacy schema 2 | Elencos 86/89, posto CKM antigo e campos opcionais ausentes; RNG intacto, migração única e futuros iguais depois da migração |
| Legacy MG34 | Formato antigo com rounds futuros pré-criados: guarda apenas o tiro emitido, conserva IDs reservados/RNG, não repete tiros, depois continua identicamente |
| Corrupção | 17 mutações específicas; rejeição atómica deixa payload/destino intactos; futuro do destino continua igual ao de uma cópia limpa |

Testes adversos de transporte/morte são fixtures explícitas: posicionam o jogador ou aplicam a mesma morte aos dois lados. Não são descritos como percurso humano. Os dois percursos integrais não fazem essas injecções.

## Bugs reproduzidos e correções mínimas

### Checkpoint anterior perdido num save de continuação

Na base, `restoreSnapshot` transformava qualquer snapshot carregado no novo checkpoint. Ao guardar em clock 2,0500000000000007, depois do CP-A em 0,05, A morria e voltava ao CP-A; B morria e voltava ao instante do save. A primeira divergência de gameplay surge no tick 1 da recuperação. Reprodução falhada original: `checkpoint-before.log`; depois da correção, 43/43 focados/suporte em `checkpoint-after.log`.

`M01Simulation.snapshot()` guarda agora `resumeCheckpoint` opcional quando o estado vivo difere do CP. O campo contém um snapshot **plano**, validado atomicamente. CP-A..D, reset e debrief usam `snapshot(false)`, mantendo checkpoints planos em schema 2. Não existe cadeia recursiva de backups. Backup futuro, inválido ou com CPs incompatíveis é rejeitado antes de alterar destino.

O restore normaliza esse backup com as mesmas regras legacy e conserva-o como destino de morte/Restart. Saves schema 2 antigos sem o campo mantêm o contrato anterior: o estado carregado é o próprio checkpoint. `Game.persistCheckpoint` continua a guardar somente o CP real. O limite existente de 1.000.000 caracteres não mudou. Exemplo medido: 59.108 bytes com backup, 29.605 bytes plano.

### Payload de arma podia sobrescrever comportamento

O validador aceitava propriedades adicionais como `weapon.update=7` e `weapon.profile={}`; `Wz29.restore` aplicava-as por `Object.assign`, levando a erro no tick ou perfil/ID inválidos. Reprodução e teste falhado em `corruption-before.log`. O validador passa a aceitar só os campos reais do snapshot da wz.29, mantendo `received` opcional para legacy. Também rejeita RNG fora de uint32 e fases de missão desconhecidas. Algoritmo/RNG/arma não foram reescritos. Prova verde em `corruption-after.log` e na suíte final.

## Fixtures e navegador

Duas fixtures Node antigas pretendiam instalar checkpoints artificiais no instante observado. Agora usam explicitamente snapshot plano ou criam esse CP antes do save; as asserções de baixas, rounds, migração e rejeição ficaram intactas. O primeiro `npm test` foi 238/240 por essas duas fixtures; foi preservado em `npm-test-initial.log`. A suíte final passou 242/242.

A primeira execução de navegador foi interrompida depois de expor a mesma suposição nas duas fases da estação: Restart retornou ao CP anterior e não ao instante observado. `browser-initial.log` conserva a saída; `browser-initial-failures.tar.gz` conserva traces textuais, recursos JSON de diagnóstico e contexto, **não** o ZIP completo nem os assets binários/capturas. O manifesto declara as omissões.

As fixtures visuais de grab/release e trem/MG instalam CPs planos. Um novo caso de UI carrega uma continuação real, inspeciona o frame sem avançar e usa o botão Restart para comprovar retorno exacto ao CP-A antigo, incluindo posição/orientação/clocks.

A revisão focada seguinte foi 3/4: o grab podia terminar antes de os clips opcionais carregarem. A fixture agora usa a mesma captura nativa de pointer lock já usada pela MG34 para manter o primeiro frame restaurado em pausa enquanto carrega os clips. As asserções de sincronização, pose, pausa e raízes foram conservadas. Não houve aumento de timeout. A execução focada final passou **4/4**, sem retries/skips; relatórios JSON brutos comprimidos e logs preservados.

**Suíte integral final de navegador: 36/36 PASS**, 0 retries/skips/falhas/flaky, em 1.182,745 s (19,7 min). `browser-summary.json` resume os resultados individuais; `browser.json.gz` conserva o relatório JSON bruto completo e `browser.log` a saída integral. Exit code 0. Esta execução inclui os casos anteriores de MG34 prone e o novo caso de recuperação pelo botão real.

## Validação e reprodução

- Node 24.19.0, Three 0.186.1, Vite 8.3.1, Playwright 1.58.2.
- Chromium 153.0.8010.0, software WebGL/SwiftShader, viewport de produção 1280×720, um worker, retries 0.
- `npm ci` concluído; **242/242 npm test**, 18/18 testes novos incluídos; build PASS (aviso habitual de chunk grande).
- Browser integral **36/36 PASS**; focados **4/4 PASS**, zero retries/skips em ambas as execuções.
- `git diff --check` PASS. `preserved.json` comprova corpos de movimento/evacuação/tick e diretórios de produção intactos.

```sh
npm ci
M01_DETERMINISM_REPORT=/caminho/audit.json node --test tests/m01-schema2-determinism.test.js
npm test
npm run build
CHROME_EXECUTABLE=/caminho/chromium npm run test:browser
```

O download padrão de CFT falhou neste ambiente; Chromium foi obtido do pacote npm @sparticuz/chromium 153.0.0 e descomprimido em scratch, sem alterar dependências/configuração do projecto. Isso não é medição de Chromebook. Browser verifica continuações de snapshots e UI, não uma partida humana ininterrupta.

## Preservados e estado para revisão

Produção alterada apenas em `src/game/m01-simulation.js`: persistência e validação. Renderer, spatial/world/core, algoritmo de RNG, `tick`, `moveActor`, `evacuateStation`, armas, assets, missão/mapa francês, horários/gates, demolições e IDs preservados. Source trees foram comparadas antes de publicar.

Não houve main, integração, deploy, workflow_dispatch, M02, Graphify ou trabalho em benchmark/vagões/arco CKM. Cada bloco foi commitado/publicado na branch própria; árvores locais/remotas verificadas idênticas, sem force-push. Main e base aprovada continuam nos refs registados em `protected-refs.json`.

A evidência cobre dois percursos e fixtures definidas; não é prova universal de todas as combinações de inputs ou de todos os ficheiros corrompidos possíveis. M01 continua protótipo; playtest humano/Chromebook, loader/reload/feed MG34 e arco real da CKM permanecem pendentes. Esta tarefa não inicia outra frente sem ordem concreta.
