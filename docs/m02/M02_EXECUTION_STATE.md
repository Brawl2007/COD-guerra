# M02 — candidata jogável e continuidade

## Continuação — 2026-10-27 (em validação)

Continua na candidata única a partir de `c30cf5f`, árvore inicialmente limpa. Fetch confirmou as mesmas refs Gemini/Claude; não chegou o complemento integral. **E1: 69 testes M02 PASS e build PASS**; provas em `continuation-2026-10-27/e1/`. MP38 agora tem carregador/alavanca móveis, poses de mãos específicas e oito clips derivados M01 via IK/protração da clavícula partilhados; recarga visual segue o temporizador autoritativo de 2,7 s. Bancada MG B02 estreitada para deixar o atirador fisicamente fora do obstáculo, conservando o setor da abertura. Passos M02 passam a reutilizar os amostradores de distância da M01 para jogador/aliados: input contra uma parede não produz passos. Restauro na mesma célula/mesmo relógio invalida blends antigos e história da arma sem mexer em snapshots. Capturas High mostram a extração/inserção/armar da MP38 agachada e a bancada sem atravessar o atirador. As primeiras fotografias de recarga anteriores à correção de restauro exibiam pose antiga e não são validação dessa recarga; usar `reload-after-restore/`. Validação por input e cenários prosseguem; não tratar a prova `d23304a` abaixo como validação das alterações novas.

## Reconstrução dirigida — 2026-10-26

Nova ordem do proprietário: reconstrução incremental de qualidade, começando por armas e C01–C02, até preparar a M02 para avaliação humana. Plano em `M02_RECONSTRUCTION_PLAN.md`, revisão das quatro armas em `M02_WEAPON_REVIEW.md`. O documento complementar de 173.148 palavras foi identificado pelo proprietário e ainda aguarda anexo; a versão anterior continua válida.

D1 `702ced9` implementa dispersão/ADS no input normal (mira exata só na bancada), rondas de MG34/wz.28/MP38 espaçadas e persistidas, supressão por ronda real, remoção do emissor MG fantasma e timestamps de áudio/animação causais. D2 `9da102b` acrescenta preparação abrigada, clips M01 adaptados à postura física, recargas especializadas, exposição física em cobertura, obstrução do cano, paisagem C01 e Lis desarmado sem tiros. Refinamentos `d23304a`: impulsos automáticos limitados às rondas realmente disparadas, câmara da arma igual à M01 (58° própria, mundo com zoom), legendas/aviso sem sobreposição. **63 testes M02 PASS**, incluindo regressão da projeção com GLB real; 112 testes focados M01 PASS; quatro casos browser PASS. Suite global interrompida: 101 PASS, 172 CANCELLED; não global verde.

Percurso final desta reconstrução em build congelada **`d23304a`**: C01–C12, epílogo/debrief/M03, **vida 73, zero mortes/erros**, ferido do pomar **marcado com giz**, Lis evacuado fisicamente, **12/12 atravessaram**. Malek terminou incapacitado; água e munições entregues; as cinco transições e a fala canónica de Lis preservadas no pacote M03. Prova `d2/native-final/`. O percurso inicial `9da102b` permanece em `d2/native/` (vida 70, sem giz). Morte separada por fogo real aos 25,10 s e retoma do checkpoint aos 10,10 s/vida 67/posição preservada: PASS. Seis inspeções de armas High com a lente corrigida em `d2/weapons/`; proveniência/limites em `d2/README.md`. Sem alterações de código de jogo após a build final. A API GitHub continua a devolver Forbidden para consultar PR; push Git normal funciona, CI remoto não verificado.

Descrição e lacunas em `M02_C01_C02_RECONSTRUCTION.md`, guia jogável em `M02_REVIEW_GUIDE.md`. Direção artística D2 e D3–D6 continuam abertas; não confundir percurso concluído com qualidade final/aprovação humana. Próxima prioridade: incorporar índice/capítulos do complemento quando chegar; rever mãos FP, abrigo/ritmo EA0, implantação/servente MG, recarga MP38 e ocupação do terreno. Não repetir as rajadas ou a integração M01 já concluídas.

O estado abaixo descreve a entrega anterior de recuperação, que permanece preservada como baseline.

Atualizado em 2026-10-26. Candidata única: `codex/m02-recovery-v1`.
Código atual: `9d8152d`, após `d4bc202`, `9f90614`, `f2c8644`, `49de368`, `f878820`, `db9d04d`, `878458f`, `c065f7e` e `c08f06a`.
Estado: missão FPS C01–C12 implementada na candidata, com percurso contínuo de produção concluído e apresentação M01 integrada. O caso browser longo continua instável no limite de 240 s do SwiftShader. Não confundir esta entrega com merge em main, deploy, CI integral verde ou aprovação artística do proprietário.

## Recuperação verificada

Consulta remota em 2026-10-26: Gemini `gemini/m02-01-quinta` em `56e98cbf774d3b717f4f228ce5f66a7194f4d7a5`; Claude `api/m02-soldados-visual-v1` em `d08bb7abf3dd6bb86431a26131b9652b80cf68b6`. `api/m02-conclusao-v1` continua ausente. A base comum Claude/Gemini é `41d990d`; o renderer antigo do Claude não foi sobreposto ao Gemini. O rig Claude preservado em `m02-claude-soldier-rig.js` serve como fallback e pose de rendição. Recuperação inicial e provas anteriores: `M02_RECOVERY_HISTORY_2026-10-25.md`.

## Jogo entregue na candidata

- Entrada de produto: `m02.html`. `m02-01.html` conserva a bancada. O índice liga a missão. Build Vite gera ambas as entradas.
- Menu, carregamento de assets, início C01, pausa por Esc/perda de foco ou pointer lock, morte e reinício de checkpoint, continuar após recarregar a página, três cartões de epílogo e debrief. Atalhos de salto e API mutável apenas com `?debug=1`; a entrada normal expõe só diagnósticos de leitura.
- Controlos: WASD, Shift, C, rato, clique/Espaço, V/botão direito, R, G, E; Z/X/B para ordens; F5 guarda checkpoint. HUD apresenta condição, munições, objetivo e direção/distância, sem IDs técnicos no produto.
- Interações reais ligam quinta, abastecimentos, reorganização, Leśmierz e saída C12. O fim só está disponível após O09 e na casa B12. A porta B12 já não impede o comando de saída.
- Lis aguarda contacto em C11, caminha pela navegação até B12 quando auxiliado e conserva o estado de ferido. Ignorá-lo pode produzir desaparecido; não é evacuado automaticamente pelo contacto. O grupo LG01–LG12 é apresentado com soldados GLB durante a travessia.
- Explosões podem danificar a roda e perder volumes não entregues, com oclusão por paredes; as consequências e a reorganização são persistentes e não duplicam água/munições. A água nunca reduz a vida de um jogador saudável.

## Reutilização da M01 e limites de arte

- `M01Characters`: modelos, clips, LOD, batching, animação de movimento/disparo/recarga, mortos e feridos. Adaptadores traduzem cópias, sem passar autoridade de combate ao renderer.
- `M01ViewModel`: mãos, espingarda, mira, recarga, ferrolho, recuo e efeitos em passagem própria. `WeaponLighting` M01 fornece fill/key e ambiente reflexivo, sincronizados com o céu, sol e câmara; sem reconstruir a iluminação da arma. RKM e MG34 usam os modelos M01. A MP 38 tem silhueta original de 0,833 m e dois LODs, gerados pelo pipeline GLB/PBR M01; fonte, autoria e checksums documentados em ASSET_CREDITS e manifesto.
- `M01MaterialLibrary`, `M01TerrainMaterial`, kit GLB de vegetação, política LOD, materiais de folhagem e `M01Atmosphere`: terreno, atlas, árvores, relva, céu, nuvens, fumo e iluminação. Arquitetura acrescenta remates, beirais, cumeeiras, chaminés e portadas. Carroça/caixas/barris são assets M01. Batching estático reaproveita a implementação M01 e mantém vértices/UVs; portas e telhados com ocultação mantêm identidade.
- `AudioManager`: disparos causais e rajadas, mecanismos, passos, explosões, vento/frente distante e oclusão. MP 38 tem identidade própria no sintetizador partilhado. Áudio desbloqueado por gesto e medido na saída Web Audio; não há novas vozes gravadas. Legendas narrativas preservadas.
- A qualidade máxima mantém os sistemas da M01. A noite foi revista para manter inimigos legíveis; as duas luzes interiores existentes acompanham os edifícios B/C. O contexto é opaco e não conserva desnecessariamente o framebuffer; MSAA fica disponível em GPU e é desligado quando o driver se identifica como rasterizador por software. Modelos e materiais não são substituídos para passar testes. Nenhum número de FPS sintético é benchmark.
- Os humanos M01 são estilizados/provisórios, tal como na candidata M01. Reutilizar os seus sistemas não demonstra por si só superioridade artística. Capturas e revisão visual acompanham a entrega; não se afirma fotorealismo nem aprovação humana inexistente.

## Correções na simulação e saves

Limites B/C deixam de produzir NaN; a composição da área A inclui a trincheira P1 e o corredor C01 sem alterar o catálogo original da bancada de 100 × 150 m. Um passo de movimento nunca salta de -175 para -100. Postura inicial protegida por cobertura física. Temporizadores de guarnições são relativos à entrada na célula. Colapso de moral da quinta não se propaga às reservas EC2. MGs B/C percebem a partir da sua própria posição. A aquisição contra o jogador respeita os 1,2 s de reação do perfil Soldado M01, com estado persistido no ator.

Snapshots conservam RNG, granadas em voo, sequência, locks de portas e revisão da navegação. Saves antigos continuam aceites quando não têm os campos opcionais; coordenadas não finitas são rejeitadas sem destruir a sessão. Checkpoints semânticos e schema de campanha preservados. Produto usa ticks fixos de 50 ms e consome ações únicas uma vez por tick. Persistência local: `cod-guerra:checkpoint:m02:v1`.

## Validação concluída e limite conhecido

- Node M02: **49 PASS**, incluindo regressões de movimento, combate, reentrada/saves/RNG/granadas, abastecimentos, Lis, sessão, GLB MP38 e batching. Evidência `node-m02.txt`.
- Áudio partilhado: **64 PASS**, incluindo toda a rota M01 sem mutação de simulação/RNG. Evidência `node-shared-audio.txt`.
- Assets/sistemas M01 reutilizados: **42 PASS**. Evidência `node-shared-assets.txt`.
- Build de produção e reprodução byte a byte dos GLB MP38: PASS. O aviso de bundle grande permanece.
- Percurso nativo final de produção no SHA `9f906142128474cf876382b11136faa914049833`: **C01–C12, epílogo, debrief e pacote M03 válidos**, **0 mortes, 0 erros de página, vida final 74, Lis ferido evacuado fisicamente, 12/12 homens**. Duração simulada 256,15 s; perfil Low/480 × 270 para o percurso e debrief 1280 × 720. 101 clips, GLB/arma ativos, sem falhas de assets declaradas. Fonte: `native-final.json` e log. O planner só observa e produz controlos; não instala snapshots, teletransporta, mata inimigos, cura ou escreve tempo/RNG. Não é playtest humano nem benchmark gráfico.
- A simulação não mudou após esse SHA. Os commits posteriores tratam testes, documentação e polimento de iluminação/apresentação. A sua revisão visual é separada do percurso.
- O percurso anterior v6 também chegou ao fim sem mortes (vida 14, 12/12), com Lis desaparecido por falta de contacto. Não tinha SHA no harness antigo; manter essa limitação explícita em `native-missing-lis.json`.
- Browser: o caso legado completo de cenas/portas/tiros/granadas/abastecimentos/M03 e asserção de erros **passou em 3,4 min** na execução `browser-suite.txt`, usando o `snapIfMissing` já existente para reutilizar 12 capturas anteriores. As quatro restantes e as 30 chamadas de telemetria foram executadas de novo. Origem das imagens registada em `browser-capture-cache.json`; não tratar as 12 imagens antigas como novas provas de arte.
- A mesma execução teve 3 PASS e 1 FAIL numa nova asserção de qualidade que lia o tier antes do frame aplicar High. Foi corrigida a espera para exigir High e quatro texturas carregadas; a asserção foi preservada/reforçada e o caso focado passou (`browser-auto-quality.txt`).
- A repetição posterior ao polimento (`browser-repeat.txt`) teve **3 PASS, 1 TIMEOUT**: áudio/GLB/snapshot, qualidade automática/High e sessão/persistência passaram; o caso longo excedeu 240 s. A captura fria de 16 imagens também excedeu esse limite (`browser-cold-captures.txt`). **Não se declara uma suite browser final integral verde.** Manter asserções e timeout; não converter a telemetria sintética em FPS reais. Há limitação de custo/variância gráfica no SwiftShader desta instância (quota de CPU observada: 4 núcleos).
- Teste de áudio por input real registou pico 0,468053758 na execução com o caso de cenas aprovado, contexto running. A verificação usa MediaRecorder para não medir antes do gesto; som sintetizado M01, sem vozes gravadas novas.
- Após ligar o `WeaponLighting` M01, o caso focado GLB/arma/áudio/snapshot passou novamente no código `9d8152d`: 1 PASS, pico 0,187596336 e contexto running (`browser-weapon-lighting.txt`). As cinco capturas finais foram revistas nesse código, incluindo os reflexos antes ausentes da arma. `git diff --exit-code 9f90614 9d8152d -- src/game src/world src/config.js missions/m02-bzura` confirma a simulação idêntica à do percurso completo.
- Inspeção final: cinco capturas 1280 × 720, High salvo quinta Medium, na entrada de produto. Fixtures pausadas e identificadas; separadas do percurso. Terreno, vegetação, GLB, MP38 e atlas ativos sem erros de página. Comparação visual também com a referência M01 V6 Medium; não é certificação de superioridade artística. Relatório e imagens na pasta de evidência.
- `npm test` global foi interrompido no ciclo anterior; não se declara toda a campanha M01/M02 verde. Suites concluídas acima estão separadas das não concluídas.

Evidência atual em `docs/verification/m02-runtime/completion-2026-10-26/`; histórico em `recovery-2026-10-25/`.

## Reproduzir

Node 24, `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`; `npm run dev -- --port 5173`. Verificar HTTP 200 em `/COD-guerra/m02.html`, atributo `data-mission="m02"` e módulo `m02-01-main.js`. Menu é criado pelo JS. Perfil de inspeção pode ser explicitado com `?quality=high`.

Testes M02: `node --test tests/m02*.test.js`. Build: `npm run build`. Browser: `CHROME_EXECUTABLE=/usr/bin/chromium M02_ARTIFACT_DIR=/tmp/m02-browser npx playwright test --config tools/m02/playwright-m02-01.config.js`. Usar diretório novo e um browser SwiftShader de cada vez. O spec legado usa argumentos de tempo sintéticos na telemetria final: não reportar esses FPS como reais.

Playthrough de produção: `M02_PLAY_OUT=/tmp/m02-native bash tools/m02/run-native-playthrough.sh`. Faz build, congela dist e helpers num diretório temporário, arranca servidor 4291, regista SHA e executa o piloto com controlos de jogador. Necessita Chromium e porta 4291 livre. Não editar fontes durante validação browser. Inspeções por fixtures devem ser identificadas e separadas do percurso contínuo.

## Ambiente e segurança

Rascunho de `install_script` e `start_skill` guardado pelo plugin cloud-environment-onboarding, com startup, verificações e percurso M02. Arranque 5173 e HTTP de produto testados; guardar rascunho não publica snapshot. Revisão/gravação nas definições e publicação do ambiente pertencem ao proprietário; não bloqueiam o desenvolvimento.

Main não alterada, sem deploy ou force-push. Git HTTPS read/write funciona. API GitHub devolveu Forbidden no ciclo anterior; não pedir token a partir do estado do gh. Preservar commits e autoria; não fazer merge automático das branches divergentes. PR só pode ser declarado criado com resposta válida da API.

## Continuidade e promoção

A implementação jogável está consolidada nesta candidata. Não repetir recuperação Claude/Gemini nem reconstruir os sistemas M01 já partilhados. Para promoção posterior, resolver/medir o custo do caso gráfico longo no ambiente de CI ou numa GPU-alvo, executar a suite global e obter a revisão de jogo/arte apropriada. Estas verificações não foram substituídas por testes de estado. Main, produção e force-push continuam fora da autorização deste ciclo.

Para regressões: reproduzir primeiro com o save/seed e controlos reportados; preservar RNG, granadas em voo, locks, revisão de navegação e consequências. Capturas por fixtures nunca substituem um percurso contínuo. A publicação do ambiente é distinta de fazer push desta candidata.
