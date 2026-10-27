# M02 — direção técnica, artística e de gameplay

Direção solicitada pelo proprietário em 2026-10-26. Candidata única: `codex/m02-recovery-v1`, base verificada `9385b2d`. Sem merge em main, deploy, force-push ou aprovação artística automática.

## Autoridade e leitura

`docs/PROMPT_MESTRE.txt` continua válido: 19.580 palavras / 2.630 linhas nesta árvore. Foram consultados os capítulos 4–10, 69–72, 74–79 e 80–82, o roteiro M02 e as fichas de armas existentes. `PROMPT_MESTRE_COD_GUERRA_M02_WAW_WWII_100MIL_MAIS.md`, com 173.148 palavras segundo o proprietário, ainda aguarda disponibilização; não se declara lido nem se inventam os seus capítulos. Será complementar e terá índice/mapa de leitura próprio quando chegar.

O benchmark existente `docs/direction/COD_WAW_WWII_BENCHMARK.md` descreve objetivos de sensação, mas marca as referências WaW/WWII como não verificadas em jogo. Tentativas de leitura do manual Steam de WaW e da página oficial de campanha WWII receberam HTTP proxy 403 em 2026-10-26; não contam como fontes lidas. Não copiar recursos desses jogos, nem inventar equivalência AAA. Aprovação de sensação e arte pertence à avaliação humana.

## Critério de direção

Cada entrega deve produzir comportamento ou imagem verificável, em build jogável. Reutilizar M01Characters, AnimationMixer/clips, viewmodel/WeaponLighting, materiais/terreno/vegetação, áudio e LOD. A simulação M02 continua independente; decoração, câmara, qualidade e áudio não decidem dano ou objetivos. Cada marco conserva fixtures separadas de playtests por input real.

## Marcos desta reconstrução

| Marco | Entrega observável | Critério |
| --- | --- | --- |
| D0 | Baseline e recuperação | Árvore limpa, refs reais, 49 testes M02 anteriores aprovados; timeout gráfico antigo preservado como limitação. |
| D1 | Identidade funcional das quatro armas | Wz.29 normal usa dispersão/ADS e ciclo de ferrolho M01; MG34/wz.28/MP38 disparam rondas ao longo da rajada; munição, paredes e restauro entre rondas funcionam. Um só emissor causal por arma. |
| D2 | C01–C02 reconstruídas | Preparação legível e atuação de secção em cobertura; campo, vala, posto e eixos da quinta reconhecíveis; ordens com efeito; apresentação de armas e som causal. Capturas novas e percurso por controlos, incluindo morte/restauro. |
| D3 | C03–C04 | Combate/interiores e flancos, posturas/armas sem atravessar paredes, ferido e giz, rendição e reação humana observáveis. Preservar falas literais. |
| D4 | C05–C08 / Łęczyca | Transição, noite legível, carroça e abastecimentos com consequências, reorganização sem duplicações. |
| D5 | C09–C12 / Leśmierz | Escalada de combate, impacto fixo, Lis e último grupo com travessia e consequências físicas; saída e epílogo coerentes. |
| D6 | Pacote de aprovação humana | Percurso contínuo, saves adversos, acessibilidade, capturas autênticas, custos reais e inventário de lacunas; pacote M03 conservado. Não declarar aprovação sem avaliação humana. |

D3–D6 partem da implementação funcional existente; não são autorização para a substituir por descrições ou recomeçar do zero. O documento complementar poderá refinar os critérios sem apagar entregas válidas.

## Progresso verificável

A candidata funcional C01–C12 está preparada para avaliação humana com a especificação disponível, no código `21f8d67`. Não é aprovação artística nem certificação de qualidade superior à M01. D0/D1 foram recuperados/implementados sem substituir o renderer recente. D2 recebeu preparação, cobertura, câmara própria da arma e, em E1/E2, recarga MP38 específica por IK, bancada MG corrigida, trincheira escavada e abrigo EA0, decoração GLB e passos por distância.

D3 está coberto pelo percurso de interiores, ferido marcado com giz, rendição e reações causais de acerto/queda E3. D4 conserva carroça/perdas, abastecimentos, noite, transições e reorganização persistente. D5 ganhou em E3 navegação física do último grupo, atrasos/velocidade reais, feridos a caminhar desarmados e animação por movimento efetivo; Lis continua fisicamente apoiado/desarmado até à evacuação. D3–D5 foram percorridos novamente, sem recomeçar sistemas existentes. A avaliação humana deve julgar composição, atuação, ritmo, som e dificuldade desses trechos.

D6 reúne guia, logs/capturas com proveniência, 80 testes M02 aprovados, 26 partilhados focados nesta etapa, build/reprodução de assets e percurso contínuo `21f8d67` com zero mortes/erros, vida 32, giz, abastecimentos, Lis evacuado, 12/12 e M03 válido. As verificações finais de navegador/morte e as limitações estão no relatório da continuação e no guia. Suite global anterior interrompida e CI remoto não verificado; não são declarados verdes.

As lacunas artísticas remanescentes estão inventariadas no guia: modelos/mãos provisórios M01, naturalidade da MP38, coreografia de servente MG, variedade/ritmo do cenário e áudio humano/GPU real. A próxima revisão incorpora observações humanas e o índice/capítulos do complemento quando ele chegar; não repetir as funcionalidades já encerradas.
## Diagnóstico inicial das armas

Ver `M02_WEAPON_REVIEW.md`. Achados prioritários no baseline: input normal usava a mira exata de calibração; rajadas consumiam/aplicavam todas as rondas no mesmo tick; emissor MG paralelo produzia som/supressão sem uma ronda real. Correção D1 usa o tiro, obstrução, RNG, modelos e áudio já existentes, com temporizadores serializáveis por ator. Não muda dano, capacidade, guarnições ou roteiro para mascarar falhas.

## Continuidade

Estado operacional em `M02_EXECUTION_STATE.md`; provas anteriores permanecem em `docs/verification/m02-runtime/`. Cada marco terá resultado, SHA e próxima ação. O cenário é reconstrução de level design; posições inventadas não são apresentadas como cartografia histórica. Ativos novos exigem autoria/licença e escala explícitas.
