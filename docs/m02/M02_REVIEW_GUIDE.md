# M02 — candidata C01–C12 para avaliação humana

**Continuidade:** esta página conserva a revisão visual histórica `f49ecdc`. Para o código mais recente, testes e trabalho pendente, ler primeiro [M02_EXECUTION_STATE.md](M02_EXECUTION_STATE.md). O proprietário pediu para deixar a avaliação humana para o fim do desenvolvimento.

Candidata em revisão após rejeição da apresentação pelo proprietário, branch `codex/m02-recovery-v1`, código `f49ecdc` (2026-10-28). Sombras, AO/grade M01, efeitos de tiro e cobertura/composição do terreno receberam alterações reais. O percurso C01–C12 continua funcional; qualidade artística permanece em desenvolvimento. Esta entrega não aprova a missão nem afirma equivalência a COD/AAA. O complemento de 173.148 palavras ainda não foi recebido.
## Abrir e jogar

Node 24, `npm ci`, `npm run dev`, entrada `/COD-guerra/m02.html`. O menu permite escolher Máxima, Equilibrada ou Leve; SwiftShader inicia em Leve. A bancada `m02-01.html` permanece separada da entrada de produto. Em produto, mutações técnicas só existem com `?debug=1`.

WASD/rato, Shift correr, C agachar, V/botão direito apontar, clique disparar, R recarregar, G granada, E interagir. Z suprimir, X avançar, B flanquear. Esc pausa; F5 guarda checkpoint, F9 retoma. Volume, legendas, indicação de dano e redução de movimento da câmara estão no menu. E também permite recolher os cartuchos de 7,92 mm existentes num atirador Kar98k abatido, quando estiver próximo e sem parede no caminho. Só a wz.29 é controlada pelo jogador; MG34, wz.28 e MP38 são armas de NPC, sem sistema de recolha/troca de armas.

## Percurso de avaliação

| Trecho | O que avaliar jogando |
| --- | --- |
| C01 | Sete posições de preparação, Lis/Gruca, trincheira P1 escavada 42 cm e rampas. Verificar proteção ao agachar, saída e resistência do posto EA0, cujo parapeito fica à frente dos defensores. Só os pontos fisicamente observados devem poder ser atingidos. |
| C02 | Comparar vala/casa/pomar e usar as três ordens. Observar impactos curtos em superfícies reais, sem linhas/esferas persistentes; clarões e partículas variam com a ronda/material. MG34 domina a abertura **oeste** de B02. A bancada deixa espaço ao corpo do atirador. Avaliar domínio visual, flanco e leitura de inimigos sem depender do HUD. |
| Armas | Wz.29: ADS, tiro, ferrolho e recarga parcial/vazia. MG34/wz.28/MP38: rondas e impulsos separados. MP38: mãos no punho/apoio, carregador removido/inserido e alavanca no fim da recarga. Interromper por supressão/morte e restaurar no mesmo relógio. |
| C03–C04 | Portas, interiores e flancos, rendição e ferido desarmado. Marcar o ferido do pomar com giz por E. Observar reação ao acerto e queda ao longo do tempo, sem exigir disparar sobre feridos para avançar. |
| C05–C08 | Transição noturna para Łęczyca, proteção da carroça, água/munições e reorganização. Explosões podem perder volumes; a água não ressuscita nem cura para 100%. Ouvir passos por distância percorrida e oclusão dos tiros. |
| C09–C12 | Passagem, aviso/impacto fixo, contacto e caminhada apoiada de Lis até B12. Os 12 homens atravessam com navegação, portas e colisão; LG03/LG09 caminham desarmados em vez de deslizar deitados. Esperar a travessia antes de sair. Ler epílogo/debrief e consequências M03. |
| Robustez | Pausar durante recarga/rajada, F5/F9 e recarregar o navegador. Morrer exposto e retomar. Verificar posição, vida, rondas e volumes sem duplicação; passos não devem soar quando se empurra uma parede. |

Registar dispositivo/GPU, perfil/resolução, cena/posição, comportamento observado e captura/vídeo. Comparar M01/M02 no mesmo dispositivo/perfil. O piloto automatizado observa atores ocultos para escolher rotas e não representa perícia humana ou experiência estética em Máxima.

## Provas desta revisão

[Antes/depois e proveniência de 2026-10-28](../verification/m02-runtime/quality-2026-10-28/README.md).

- 86 testes M02 e 44 partilhados M01 aprovados; build/reprodução GLB aprovadas.
- Seis casos browser aprovados (4.0m), 16 capturas novas e áudio running/pico 0.417647; asserções e timeout conservados. High exige o grade M01 ativo e B/C têm geometria/máscara verificadas nos extremos.
- Percurso de produção `d04e416` até debrief/M03, zero mortes/erros, vida 46, eixo pomar, giz, abastecimentos, Lis e 12/12. Só observa/envia controlos. Código final posterior muda apenas a estabilidade da luz de disparo em Medium/High; simulação/roteiro idênticos, percurso Low sem essa luz. Não é avaliação estética High/perícia humana.
- Fotografias finais High e morte/retoma por fogo real no código `f49ecdc`, com relatórios. Morte aos 16.70 s e retoma aos 0.00 s/vida 100, posição preservada.
- As fotografias de inspeção são fixtures rotuladas, separadas do percurso. Os históricos de 26/27 permanecem arquivados; a primeira galeria F3 invalidada por HMR não é prova verde.
- Suite global anterior interrompida (101 PASS, 0 FAIL, 172 CANCELLED); CI remoto não verificado. Não se declara global verde ou aprovação artística.

## Questões para aprovação de qualidade

Os humanos e as mãos FP continuam os assets estilizados/provisórios da M01. A MP38 já tem recarga específica com partes móveis e contactos IK, mas a fidelidade da malha/variante e a naturalidade dos gestos precisam de avaliação artística. A MG34 conserva o apoio em pé/agachado e o auxiliar combatente: não foi criada coreografia de servente a alimentar/deitado. A vala P1, abrigo EA0, vegetação baixa e props GLB partilhados estão implementados; avaliar agora o ritmo, composição e variedade do cenário em jogo.

Não há vozes gravadas novas. As falas literais estão em legendas, com áudio M01 sintetizado; sinal audível medido não demonstra qualidade sonora humana. A leitura primária dos manuais WaW/WWII não foi obtida (proxy 403); a matriz local não certifica comparação jogada. Medir desempenho numa GPU física e rever acessibilidade, som, mãos, animações e comparação com M01. Incorporar o complemento quando for disponibilizado antes de fechar os critérios que ele acrescenta.

## Retoma e segurança

Ler primeiro `M02_EXECUTION_STATE.md`, os commits/diff e a proveniência das provas. Não repetir recuperação Claude/Gemini, rajadas causais, recarga MP38, trincheiras ou navegação C11 já implementadas. Reutilizar os sistemas M01; simulação/RNG/saves e pacote M03 continuam autoridades. Continuar a resolver as lacunas técnicas e artísticas documentadas, com verificação proporcional; integrar o documento complementar quando chegar e deixar a avaliação humana para o fim. Main não alterada, sem deploy ou force-push.
