# M02 — revisão jogável e continuidade da direção

Esta é uma candidata incremental, não aprovação artística nem declaração de equivalência a World at War/WWII. O percurso C01–C12 está funcional e foi novamente jogado por controlos. A reconstrução de qualidade iniciou-se pelas armas e C01–C02; os marcos artísticos seguintes continuam abertos. O complemento de 173.148 palavras ainda não foi recebido.

## Abrir a candidata

Branch `codex/m02-recovery-v1`. Node 24, `npm ci`, `npm run dev`, entrada `/COD-guerra/m02.html`. O menu permite escolher Máxima, Equilibrada ou Leve; SwiftShader inicia automaticamente em Leve. A entrada normal não expõe os comandos de mutação da bancada.

WASD/rato, Shift correr, C agachar, V/botão direito apontar, clique disparar, R recarregar, G granada, E interagir. Z suprimir, X avançar, B flanquear. Esc pausa; F5 grava checkpoint manual, F9 retoma. Redução do movimento da câmara e volume no menu. A bancada técnica `m02-01.html` continua disponível e separada do percurso de produto.

## Percurso de avaliação humana

| Trecho | O que avaliar jogando |
| --- | --- |
| C01 | Preparação de Lis/Gruca, sete posições abrigadas, leitura do posto avançado e das coberturas intermédias. Agachar protege fisicamente; levantar expõe. Avaliar se a secção deixa espaço de decisão ao jogador. |
| C02 | Comparar vala/casa/pomar; usar as três ordens e ouvir a resposta. MG34 domina a abertura **oeste** de B02, não a fachada norte. Avaliar clareza do setor, distâncias, oportunidade de flanco e exposição do cano. |
| Armas | Wz.29: ADS, tiro único, ferrolho, recarga parcial e vazia. MG34/wz.28/MP38: rondas e impulsos separados, recargas e interrupção por dano/supressão. Ver mãos, coronha, cano e mira em movimento, perto das paredes e com câmara reduzida. |
| C03–C04 | Entrar/abrir portas, combater em interiores, observar rendição e ferido desarmado. Aproximar-se do ferido no pomar e marcar com giz por E; confirmar a consequência. Não disparar sobre o ferido para completar o objetivo. |
| C05–C08 | Passar a Łęczyca, proteger a carroça e entregar água/munições. Observar iluminação noturna, reorganização e consequência das perdas. A água não ressuscita nem cura para 100%. |
| C09–C12 | Conquistar passagem, viver o impacto fixo, contactar Lis e abrir caminho para a evacuação. Aguardar a caminhada apoiada e a travessia dos 12 homens antes de sair; ler epílogo/debrief e consequências M03. |
| Robustez | Pausar em recarga, F5/F9, recarregar o navegador e retomar; morrer exposto na abertura oeste e reiniciar. Verificar áudio após o gesto de retoma e ausência de rondas/objetos duplicados. |

Registar dispositivo/GPU, perfil/resolução, cena/posição, comportamento observado e captura/vídeo. A comparação com M01 deve usar o mesmo dispositivo/perfil; o percurso Leve automatizado não compara qualidade visual ou capacidade humana.

## O que as provas atuais sustentam

`docs/verification/m02-runtime/reconstruction-2026-10-26/` conserva baseline, D1, antes/depois D2, percurso contínuo e inspeções. Relatos de fixtures são distintos de input real.

- 63 testes M02 PASS; 112 testes focados dos sistemas M01 partilhados PASS (animação/mixer, arma/viewmodel e áudio).
- Quatro testes de navegador PASS: modelos/áudio/snapshot, qualidade, sessão persistida e legendas/aviso em 480 × 270 e 1280 × 720. Pico de áudio medido 0,494275; não valida preferência sonora humana.
- Build PASS com aviso de bundle grande conservado.
- Build final `d23304a`: percurso contínuo até debrief/M03, zero mortes/erros, vida 73, Lis evacuado fisicamente, 12/12 e ferido marcado com giz. Malek incapacitado: consequência real do combate. O percurso inicial `9da102b` (vida 70, sem giz) mantém-se arquivado separadamente.
- Prova separada de morte por fogo real: 25,10 s, vida 0; retoma do checkpoint de 10,10 s com vida 67 e posição guardada. Primeira sondagem a norte, fora do setor MG, não provocou morte e não é apresentada como teste aprovado.
- Tentativa global sequencial interrompida aos 598,8 s no contrato de animação M01: 101 PASS, 0 FAIL, 172 CANCELLED. **Não é suite global aprovada**; não se removeram asserções, alteraram goldens ou aumentaram timeouts. Os testes focados concluídos acima têm logs independentes.

## Lacunas que impedem aprovação final de qualidade

Soldados M01 continuam modelos provisórios estilizados. MP38 ainda usa apoio/recarga de arma automática adaptados; falta atuação e carregador específicos. A MG34 conserva a implantação em pé e a animação agachada, sem novo conjunto de servente/deitado. P1 tem talude físico e revestimento, não uma trincheira escavada com perfil de terreno próprio. O terreno e fachadas precisam de maior variedade/ocupação convincente; não substituir isso por filtros. Verificar se o posto EA0 oferece resistência/abrigo e ritmo suficientes: a secção pode neutralizá-lo rapidamente no percurso automatizado.

Não há vozes gravadas novas; falas literais estão preservadas em legendas e o áudio M01 é sintetizado. A leitura primária de manuais WaW/WWII não foi obtida: URLs oficiais consultadas devolveram proxy 403; a matriz local continua referência não certificada em jogo. Revisão em GPU física, áudio humano, acessibilidade e comparação artística com M01 ainda necessárias. Integrar o documento complementar antes de fechar critérios finais.

## Retomar sem repetir

Ler `M02_EXECUTION_STATE.md`, `M02_RECONSTRUCTION_PLAN.md` e o diff/commits reais. Não recriar as rajadas causais ou os clips já adaptados, nem substituir o renderer atual pela branch Claude antiga. Reutilizar os modelos/clips/atlas/LOD/áudio M01; manter simulação, RNG, saves e pacote M03 como autoridade. Sem merge em main, produção ou force-push. D3–D5 partem do que o percurso já demonstrou, com melhorias específicas e nova prova quando houver alteração de comportamento.
