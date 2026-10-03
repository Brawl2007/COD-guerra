# Handoff — independent battle sectors V1

**Concluído para revisão de arquitetura; sem integração. M01 continua PROTÓTIPO JOGÁVEL.**

| Campo | Valor |
| --- | --- |
| TASK_ID | M01-DISTANT-BATTLE-SECTORS-ARCHITECTURE-V1 |
| MODELO solicitado | GPT-6.1 Sol |
| ESFORÇO solicitado | HIGH |
| BASE BRANCH | codex/m01-mg34-prone-runtime |
| BASE HEAD exato | fbaac1e4bce0ce62dc61415c338dd33ccd86a71b |
| BRANCH | codex/m01-distant-battle-sectors |
| HEAD remoto da implementação/testes | a8ac605096fd9dac4eab5fabe9aa2d6b3b328075 |
| Tree da implementação/testes | e97458ee9a59d87a6ec2805c8db700e9442d16aa |
| HEAD final remoto | O commit seguinte contém este handoff/contexto; SHA final confirmado por leitura do ref e entregue na resposta. Um documento não inclui o próprio hash de commit. |
| Main confirmado, intacto | 72bbcdd156603c9399801c95d43d9365ba50fc82 |
| Subagentes / mensagens externas | Nenhum; apenas publicação dos checkpoints autorizados na branch própria. |

## Commits e publicação

O push Git pediu credenciais; a publicação foi feita pelo conector GitHub,
com updates fast-forward, sem force. Os hashes locais diferem por autoria/data;
as árvores correspondem. O checkpoint 5 inicial foi seguido por uma correção
adicional de continuidade com nova validação completa.

| Checkpoint | Local | Remoto |
| --- | --- | --- |
| 1 — audit/arquitetura | 8edff41 | 978fcf29497d4504ab29326a1e6d22d1cea55dd7 |
| 2 — modelo determinístico | bb66cfd | 0cafb7181c205c9ba33fa951d6fe10f0b11b15db |
| 3 — materialização/retorno | 5be9221 | 779043907547631d05e810864aac7730c7a60e0e |
| 4 — fixture/limites/ferramenta | b006009 | 9da5f5f2c4515869f3b20e6f29b50cd67439cc37 |
| 5 — testes/evidência inicial | 5a075d4 | 22fbffe85d3ef2a14b980f6542aebd79617be68f |
| 5b — corpos/tempo/munição | 235e078 | a8ac605096fd9dac4eab5fabe9aa2d6b3b328075 |
| 6 — documentação/contexto | Commit final desta entrega | Resolver ref da branch / resposta final |

## Auditoria do sistema atual

A base já contém cinco agendas M01 e dois relógios. `battleClock` usa
segmentos, gates e saltos; `clock` controla ações locais. Não criar outro
relógio que ignore pausa ou que mova NPCs a 27× por copiar um segmento histórico.
S2 tem atores reais `grp_de_east`, `grp_de_spans`, `grp_east_platoon`; as suas
baixas pertencem a tiros reais da simulação. Não duplicar esses IDs/contadores.
O campo `sector.strength` atual não é uma população historicamente comprovada.

Estação, ferido ficcional, evacuação, aviões, impactos, eventos consumidos e
schema 2 já existem. `SectorBattle` da bancada francesa é um sistema diferente,
ficcional e preservado. Toda a auditoria/mapeamento e funções estão em
`docs/architecture/BATTLE_SECTOR_SYSTEM.md`.

O mapeamento respeita os IDs reais S1 oeste/S2 Lisewo/S3 estação/S4 norte/S5 céu.
S5 já descreve profundidade até **40 km**, que não equivale a mapa transitável.
Não se inventou outro setor norte a 500 m. P4/P6/P7/P8/P9/P13/P16 continuam
pendentes/parciais conforme o repositório. A base adota demolição oeste às
**06:45**, com 06:40 como alternativa. Fontes externas não foram investigadas
novamente nesta tarefa; estas afirmações descrevem os dados da base.

## Arquitetura / schemas

`BattleWorld`: seed, tempo ativo em ms, configuração e inputs completos,
agenda ordenada, setores, IDs consumidos e journal causal.

`BattleSector`: id/missionId, proveniência por claim, bounds/center em metros,
objetivo/estado, formações, constraints, assets persistentes, RNG próprio,
revision/updatedAt. Contagens derivadas, sem duplicação de contadores.

`Formation`: id/facção/unidade/papel, nominalStrength, runs compactos de
combatReady/wounded/dead/evacuated, posição/direção/ordem, moral/cohesão,
reserva de munição/suprimento e overrides individuais esparsos. Não aloca
200 objetos NPC por formação distante; só conserva dados individuais quando
uma consequência/intervenção exige isso. IDs de reservas derivam do ordinal;
nomes persistentes ocupam ordinais explícitos, sem tabela de 2.000 strings.

| Distância nominal | Gameplay futuro | Entrega atual |
| --- | --- | --- |
| NEAR ≤150 m | Atores completos sob autoridade exclusiva do runtime | Descritores de dados, sem NPC AI real. |
| MID 150–800 m | Formação/grupo, interação por commands | Modelo reduzido determinístico isolado. |
| FAR >800 m | Setores/eventos até extensão adequada da missão | Mesmo estado persistente, agenda esparsa. |

Faixas configuráveis com histerese; não são limites de alcance de arma.
FULL/GROUP/PROXY/STATE_ONLY e LOW/MEDIUM/HIGH alteram só orçamento de descritores.

## Frequências e determinismo

Não foi adotado um número de Hz de produção. A fixture usa exposições
agendadas de 10 s e transições exatas, como dados **ficcionais de teste**.
Cada evento é aplicado no seu timestamp mesmo quando o caller salta 600 s;
passos de 137 ms produzem estado final idêntico. Pausa não avança nada.

Para integrar, priorizar deadlines históricos, interação atingível e retorno
de autoridade; lotes MID/FAR podem reduzir custo de dispatch, preservando
os timestamps internos. Distância/importância/interação podem mudar a
prioridade de trabalho; câmera/oclusão só mudam apresentação. Qualquer atraso
precisa ser drenado até o instante atual antes de um hit/handoff.

LCG reutilizado de `src/core/random.js`, com streams isolados por setor.
Materialização/qualidade/câmera não consomem RNG. Inputs simultâneos ordenados
por `(at,id)`; inputs tardios que reordenem eventos consumidos são rejeitados.
Provas byte a byte são no mesmo Node/engine. Transcendentais/ponto flutuante
não foram certificados para lockstep entre engines diferentes.

## História, baixas e intervenção

CONFIRMED / RECONSTRUCTED / COMPRESSED_FOR_GAMEPLAY /
FICTIONAL_WITHIN_HISTORICAL_CONSTRAINTS classificam claims. HISTORICAL_FIXED
trava macro; HISTORICAL_BOUNDED trava macro com limites de contagem;
DYNAMIC_LOCAL permite alteração local.

Exposições usam hazard probabilístico contextual, não subtração direta de
"power". Taxas são **não calibradas**, não previsão histórica. Perdas são
limitadas antes da aplicação; nunca ressuscitar ou matar adicionalmente para
forçar um número. Eventos de baixa fixos podem operar sem RNG.

Intervenções testadas: matar/ferir membro conhecido, salvar quatro feridos,
entregar munição, destruir MG/veículo e alterar ordem local. MG destruída
remove as exposições ligadas; evacuação permanece. Salvar quatro soldados não
transforma a retirada de um setor fixo numa vitória. Não foram adicionadas
armas, tanques, morteiros ou formações históricas ao jogo.

## Materialização / desmaterialização

Descritores puros mostram o estado atual, todos os counts/casualty runs e
assets, mesmo com poucos atores visuais selecionados. IDs repetidos nunca
criam novas pessoas. Corpos conservam a posição da baixa durante o recuo;
combatants conhecidos acompanham o anchor da formação. Feridos/evacuados
exigem uma atualização explícita para mudar de posição.

Retorno de observações exige revisão **e tempo** atuais, IDs válidos e transições
permitidas. A aplicação é atómica; não altera a população por substituir um
roster parcial. Guarda posição, munição carregada e reserva, posição da formação,
veículos/armas/destruição, objetivo e journal. Recarga de clip requer retirar
reserva; ressurreição, retorno duplicado/stale e munição inventada são rejeitados.

**Limite decisivo:** a passagem real entre IA individual e agregados ainda
precisa de lease/autoridade exclusiva. O protótipo tem um único owner agregado;
não prova dois motores de combate simultâneos nem desligamento/ativação real
de NPCs. A estratégia de pré-carregar atrás de oclusão, crossfade de proxies
no mesmo lugar, histerese e preservação de hits está documentada, não renderizada.

## Destruição / áudio-VFX

Persistem registros de armas fixas, veículos, dano em prédios, fogo e fumaça.
Os assets podem guardar posição e origem de impacto. O journal decide consequências;
renderer escolhe clarão/fumaça/poeira/som/debris e deduplica pelo ID, com atraso
sonoro e oclusão futuros. Renderer não decide baixa/cratera/destruição.
Não foi implementada destruição física ou modelo visual nesta tarefa.

## Ferramentas, testes e resultados

```sh
node tools/verification/m01-battle-sectors-prototype.mjs --seed 19390901 --duration 600
node tools/verification/m01-battle-sectors-prototype.mjs --seed 19390901 --duration 600 --format json
node tools/verification/m01-battle-sectors-prototype.mjs --seed 19390901 --duration 600 --format csv --out /tmp/battle.csv
node tools/verification/m01-battle-sectors-prototype.mjs --sectors 100 --benchmark
node --test tests/m01-battle-sector-prototype.test.js
npm test
npm run build
```

| Verificação | Resultado disponível |
| --- | --- |
| Novos testes focados finais | **33/33**, zero falhas/skips/cancelados. |
| Suíte Node final | **257/257**, 44.262 s, zero falhas/skips/cancelados. |
| Build | PASS; aviso existente de chunk >500 kB. |
| CLI JSON/text/CSV | Repetição byte a byte; LOW/hidden igual a HIGH/visible. |
| Conservação / limites | 50 seeds; mortos/feridos/evacuados/ativos conservados. |
| Aproximação | 1000→600→300→120, FAR→MID→MID→NEAR, sem reset/RNG extra. |
| Replay/retorno | Estado/RNG/eventos iguais, retorno atómico e identidades únicas. |
| Ficheiros protegidos | **630** tracked da base byte a byte iguais; hashes em protected-files.json. |
| Browser nesta tarefa | **Não executado**: nenhuma alteração de runtime/render/assets/browser. Não reutilizar os 35/35 da base como resultado desta branch. |
| CI remota desta tarefa | Não disparada manualmente; nenhuma aprovação de CI inferida. |

Logs brutos finais: focused-tests.log, npm-test.log, build.log. Timeline JSON/CSV
é da fixture, não de M01. O CSV mostra o estado depois de todos os eventos
naquele timestamp; linhas simultâneas não fingem fases intermédias.

## Performance medida

Shared Linux container, Node v24.19.0, x64; depois dos testes completos.
Warm-up + 5 repetições, 600 s simulados, 200 membros agregados por setor.
Inclui construção do modelo e processamento; exclui criação da fixture.

| Setores | População lógica | Eventos agendados | Mediana |
| --- | ---: | ---: | ---: |
| 32 | 6.400 | 2.048 | **188,0 ms** |
| 100 | 20.000 | 6.400 | **1.122,4 ms** |

Detalhes/repetições em benchmark.json. Estes números medem **Node agregado**;
não medem FPS, navegador, renderização, NPC AI completa ou Chromebook.
Scheduler com arrays tem custo superlinear de ordenação/lookup/shift. Não é
um orçamento final de frame; futura agenda precisa de heap/cursor, ID set/map,
medição em runtime e hardware real. Nenhuma meta de Hz/FPS foi prometida.

## Limitações, riscos e próximo passo de integração

- Fixture ficcional e hazard não calibrado; validação histórica por formação/equipamento continua obrigatória.
- Posições de descritores usam grid de teste, sem paths/colliders/oclusão validados.
- Uma formação por fixture setorial; o contrato suporta várias, mas não há modelo completo de trocas recíprocas/balística entre pelotões.
- Sem scheduler de produção, compaction do journal, networking, schema/save de campanha ou integração M02–M30.
- Sem import automático dos IDs/saves M01, sem double-authority handoff real e sem prova visual de pop-in.
- A granularidade de exposições faz parte do modelo; mudar a cadência sem recalibrar o processo estocástico altera resultados. Só particionar chamadas é invariável.

**Recomendação ao capitão:** rever contratos/limites e admitir este protótipo
como fundamento testado de arquitetura. A próxima integração recomendada é
uma lease entre agregado e atores num cenário isolado, com IDs e clock adapter,
antes de ligar setores M01. Isso é uma recomendação, não uma tarefa iniciada.

**PARAR aqui. Não integrar, publicar o jogo, modificar main ou escolher a próxima tarefa.**
