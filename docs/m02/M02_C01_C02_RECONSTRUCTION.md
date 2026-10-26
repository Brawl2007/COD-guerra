# C01–C02 — primeira reconstrução verificável

2026-10-26, candidata `codex/m02-recovery-v1`, após D1 `702ced9`. Documento complementar de 173.148 palavras ainda não disponibilizado; roteiro e prompt anterior mantidos.

## Comportamento

P1 tem sete posições absolutas de preparação em vez de deslocar coordenadas mutáveis em cada início. Reentrar não envia a secção 96 m para trás. Os primeiros 4,5 s conservam o pelotão abrigado; Lis verifica a arma e Gruca observa o campo com clips M01 adaptados. O corredor conserva os três eixos e o posto avançado; o nó oeste intermédio passa a ter um talude físico de 1,2 m, equivalente ao abrigo já existente no eixo leste.

Agachar atrás de obstáculos baixos realmente corta a linha de tiro. Atores estacionários levantam-se em janelas individuais determinísticas, interrompidas por supressão/recarga; postura e hitboxes são os da simulação. Não recebem visibilidade ou dano do renderer. NPC com linha de visão mas cano tapado não atinge o alvo. Lis ferido, apoiado ou evacuado deixa de combater, incluindo rondas pendentes; a sua caminhada apoiada mantém-se.

## Imagem e som

Reutilização do atlas M01 nas tábuas dos taludes, dentro do volume sólido existente; terra visual recuada 9 cm para acomodar as tábuas sem cobertura invisível. Prados nos flancos preservam a estrada descoberta; 26 árvores de sebe exteriores delimitam o horizonte C01 e usam as espécies/LOD M01. Escala vertical da vegetação baixa corrigida para a altura nominal do asset, abaixo da linha dos olhos. Sem nova biblioteca visual paralela.

Animações especializadas, preparação, recargas e recuo descritos em `M02_WEAPON_REVIEW.md`. O som recebe cada ronda causal. Sem vozes gravadas novas, asset proprietário ou promessa de equivalência AAA.

## Evidência e limites

61 testes M02 PASS, incluindo sete regressões adicionais após D1: GLB real/transformação, seleção de recarga, preparação/reentrada/restauro, exposição física, Lis desarmado, cano bloqueado e save D1 de quatro rondas. Capturas High 1280 × 720 de C01, preparação aos 2 s e aproximação C02: cenários controlados pausados, rotulados no ecrã, sem erros de página. Antes/depois conservados em `docs/verification/m02-runtime/reconstruction-2026-10-26/d2/`.

As imagens mostram preparação e horizonte mais legíveis. Os soldados ainda são os modelos provisórios estilizados da M01; terreno/rochas/edifícios, integração fina das mãos e recarga MP38 carecem de revisão artística. C02 ainda exige avaliação do domínio visual da MG, leitura de inimigos a distância e combate em aproximação. Capturas não provam jogabilidade; o percurso de navegador e o seu resultado serão registados separadamente, sem atribuir aprovação humana a testes.

## Percurso contínuo desta implementação

Build congelada `9da102bc931d78b44a381319cc893e13cd3923d4`, 22:27–22:34 UTC: C01–C12, epílogo e debrief concluídos. Zero mortes, zero erros de página, vida final 70, água/munições entregues, Lis ferido evacuado fisicamente, 12/12 homens atravessaram e pacote M03 válido. Malek terminou incapacitado, consequência conservada; o ferido do pomar não foi marcado neste percurso, pelo que a interação de giz não fica coberta por esta prova. 110 clips carregados; nenhuma falha declarada de modelos ou terreno. Aproximadamente 267 s simulados / 435 s de execução total com carregamento e capturas; não são FPS.

O piloto observa também atores ocultos para escolher rota, mas envia apenas teclado e eventos relativos ao listener de rato. Não instala estado, cura, mata, teletransporta, acelera relógio ou escreve objetivos. Low/480 × 270 no percurso; captura do debrief em 1280 × 720. Não representa perícia humana nem experiência estética em High. Fontes e screenshots em `d2/native/`. Refinamentos posteriores desta etapa são de apresentação/UI e testes: a simulação permanece a mesma.

## Refinamento após a revisão

O clip MG34 M01 contém sete impulsos; a rajada M02 usa cinco. A adaptação passa a amostrar apenas o impulso da ronda realmente emitida, a partir dos marcadores do GLB, sem antecipar a próxima ronda entre ticks nem animar um sexto/sétimo tiro fantasma. O mesmo princípio é aplicado a wz.28/MP38. O mixer M01 continua partilhado; não se alteram os assets nem o estado de combate. As legendas e o aviso de interação passam a partilhar um fluxo vertical, com tamanho adaptado a janelas baixas: evita a sobreposição observada no percurso e preserva o texto completo.

Foi também corrigida a câmara própria da arma para corresponder à M01 (58°/0,03 m), mantendo o zoom ADS no mundo. A revisão revelou lacunas que permanecem: dedos/empunhadura ainda estilizados no asset FP, implantação MG e auxiliar muito próximos do apoio do celeiro, MP38 com clip adaptado. As primeiras fotografias de arma (ADS ainda em transição e jogador morto antes da recarga) foram rejeitadas como prova; uma tentativa posterior de enfileirar muitos frames High causou timeout de screenshot, sem alterar o timeout. O capturador passou a amostrar o viewmodel por tick e a desenhar o mundo no instante final nas inspeções mecânicas; não é apresentado como percurso contínuo. Ver `M02_REVIEW_GUIDE.md` para critérios humanos e limites das suites.

## Verificação final da etapa

63 testes M02 PASS, 112 testes M01 focados PASS, quatro casos browser PASS e build final PASS. A nova passagem de produção `d23304a` chegou novamente ao debrief/M03, desta vez visitando o ferido e marcando-o com giz por E: vida final 73, zero mortes/erros, Lis evacuado fisicamente e 12/12. A consequência de Malek incapacitado manteve-se. Fontes em `d2/native-final/`. As seis fotografias mecânicas finais em `d2/weapons/` usam a lente corrigida; mira estabilizada e recarga de jogador vivo foram verificadas pelo capturador. Arte e gameplay devem ser avaliados por pessoa: nenhuma destas contagens fecha as lacunas descritas acima.
