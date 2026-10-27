# M02 — candidata C01–C12 para avaliação humana

Candidata funcional na branch `codex/m02-recovery-v1`, código de jogo `21f8d67` (2026-10-27). O percurso contínuo de produção concluiu C01–C12, epílogo, debrief e exportação M03. Esta entrega está preparada para revisão humana com a especificação disponível; não declara equivalência artística a World at War/WWII, qualidade superior à M01 ou aprovação da missão. O complemento de 173.148 palavras ainda não foi recebido.

## Abrir e jogar

Node 24, `npm ci`, `npm run dev`, entrada `/COD-guerra/m02.html`. O menu permite escolher Máxima, Equilibrada ou Leve; SwiftShader inicia em Leve. A bancada `m02-01.html` permanece separada da entrada de produto. Em produto, mutações técnicas só existem com `?debug=1`.

WASD/rato, Shift correr, C agachar, V/botão direito apontar, clique disparar, R recarregar, G granada, E interagir. Z suprimir, X avançar, B flanquear. Esc pausa; F5 guarda checkpoint, F9 retoma. Volume e redução de movimento da câmara estão no menu. Só a wz.29 é controlada pelo jogador; MG34, wz.28 e MP38 são armas de NPC, sem sistema novo de recolha/troca.

## Percurso de avaliação

| Trecho | O que avaliar jogando |
| --- | --- |
| C01 | Sete posições de preparação, Lis/Gruca, trincheira P1 escavada 42 cm e rampas. Verificar proteção ao agachar, saída e resistência do posto EA0, cujo parapeito fica à frente dos defensores. Só os pontos fisicamente observados devem poder ser atingidos. |
| C02 | Comparar vala/casa/pomar e usar as três ordens. MG34 domina a abertura **oeste** de B02. A bancada deixa espaço ao corpo do atirador. Avaliar domínio visual, flanco e leitura de inimigos sem depender do HUD. |
| Armas | Wz.29: ADS, tiro, ferrolho e recarga parcial/vazia. MG34/wz.28/MP38: rondas e impulsos separados. MP38: mãos no punho/apoio, carregador removido/inserido e alavanca no fim da recarga. Interromper por supressão/morte e restaurar no mesmo relógio. |
| C03–C04 | Portas, interiores e flancos, rendição e ferido desarmado. Marcar o ferido do pomar com giz por E. Observar reação ao acerto e queda ao longo do tempo, sem exigir disparar sobre feridos para avançar. |
| C05–C08 | Transição noturna para Łęczyca, proteção da carroça, água/munições e reorganização. Explosões podem perder volumes; a água não ressuscita nem cura para 100%. Ouvir passos por distância percorrida e oclusão dos tiros. |
| C09–C12 | Passagem, aviso/impacto fixo, contacto e caminhada apoiada de Lis até B12. Os 12 homens atravessam com navegação, portas e colisão; LG03/LG09 caminham desarmados em vez de deslizar deitados. Esperar a travessia antes de sair. Ler epílogo/debrief e consequências M03. |
| Robustez | Pausar durante recarga/rajada, F5/F9 e recarregar o navegador. Morrer exposto e retomar. Verificar posição, vida, rondas e volumes sem duplicação; passos não devem soar quando se empurra uma parede. |

Registar dispositivo/GPU, perfil/resolução, cena/posição, comportamento observado e captura/vídeo. Comparar M01/M02 no mesmo dispositivo/perfil. O piloto automatizado observa atores ocultos para escolher rotas e não representa perícia humana ou experiência estética em Máxima.

## Provas desta candidata

Pasta principal: [continuação 2026-10-27](../verification/m02-runtime/continuation-2026-10-27/README.md). Históricos anteriores permanecem preservados e identificados por SHA.

- 80 testes M02 aprovados, sem falhas/cancelamentos; 26 testes focados dos sistemas M01 partilhados aprovados nesta etapa (IK/contacto de mãos e áudio/passos). Os 112 testes partilhados da etapa anterior têm logs próprios.
- Build de produção e reprodução byte a byte dos GLB MP38 aprovadas. Aviso de bundle grande preservado.
- Percurso congelado `21f8d67`: C01–C12/debrief/M03, zero mortes e erros de página, vida final 32, ferido marcado com giz, água/munições entregues, Lis ferido evacuado e 12/12 homens. Malek incapacitado, consequência mantida. Cinco transições aplicadas e fala canónica de Lis conservada na M03.
- Cinco casos browser aprovados em 3,7 min, com 16 capturas novas, áudio running e pico 0,154458. Morte por fogo real aos 16,70 s, sem disparar nem injetar dano; retoma aos 0,05 s do checkpoint inicial com vida 100 e posição preservada. Prova separada, sem mortes no percurso completo.
- Capturas High autênticas são fixtures controladas e rotuladas; não são apresentadas como fotografias de um playtest contínuo. A recarga MP38 válida está em `e1/reload-after-restore/`; a primeira sondagem de recarga, anterior à correção de blends no restauro, não é prova da recarga corrigida.
- A suite global anterior foi interrompida no contrato de animação M01: 101 PASS, 0 FAIL, 172 CANCELLED. Não é suite global aprovada. Não foram alterados goldens, removidas asserções ou aumentados timeouts para conseguir resultados verdes. CI remoto não verificado.

## Questões para aprovação de qualidade

Os humanos e as mãos FP continuam os assets estilizados/provisórios da M01. A MP38 já tem recarga específica com partes móveis e contactos IK, mas a fidelidade da malha/variante e a naturalidade dos gestos precisam de avaliação artística. A MG34 conserva o apoio em pé/agachado e o auxiliar combatente: não foi criada coreografia de servente a alimentar/deitado. A vala P1, abrigo EA0, vegetação baixa e props GLB partilhados estão implementados; avaliar agora o ritmo, composição e variedade do cenário em jogo.

Não há vozes gravadas novas. As falas literais estão em legendas, com áudio M01 sintetizado; sinal audível medido não demonstra qualidade sonora humana. A leitura primária dos manuais WaW/WWII não foi obtida (proxy 403); a matriz local não certifica comparação jogada. Medir desempenho numa GPU física e rever acessibilidade, som, mãos, animações e comparação com M01. Incorporar o complemento quando for disponibilizado antes de fechar os critérios que ele acrescenta.

## Retoma e segurança

Ler primeiro `M02_EXECUTION_STATE.md`, os commits/diff e a proveniência das provas. Não repetir recuperação Claude/Gemini, rajadas causais, recarga MP38, trincheiras ou navegação C11 já implementadas. Reutilizar os sistemas M01; simulação/RNG/saves e pacote M03 continuam autoridades. A próxima alteração deve responder a um defeito reproduzível ou à avaliação humana/documento complementar, seguida da verificação proporcional. Main não alterada, sem deploy ou force-push.
