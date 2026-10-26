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
