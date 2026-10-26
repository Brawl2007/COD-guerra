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

D0 recuperado; D1 funcional em `702ced9`, ampliado até 63 testes M02. D2 tem a primeira entrega em `9da102b` e refinamento de lente/impulsos/UI em `d23304a`: capturas novas, morte/retoma por input e percurso C01–C12. A qualidade artística D1/D2 permanece aberta (mãos, MP38, implantação/servente MG, perfil de trincheira/terreno). D3–D5 conservam os sistemas existentes e o percurso funcional, com Lis desarmado corrigido; o piloto passou a visitar o giz para cobrir também essa ação numa nova passagem. D6 tem guia e pacote de provas preliminares em `M02_REVIEW_GUIDE.md`, com limites explícitos; não é aprovação final de missão/arte nem leitura do complemento ainda ausente.

## Diagnóstico inicial das armas

Ver `M02_WEAPON_REVIEW.md`. Achados prioritários no baseline: input normal usava a mira exata de calibração; rajadas consumiam/aplicavam todas as rondas no mesmo tick; emissor MG paralelo produzia som/supressão sem uma ronda real. Correção D1 usa o tiro, obstrução, RNG, modelos e áudio já existentes, com temporizadores serializáveis por ator. Não muda dano, capacidade, guarnições ou roteiro para mascarar falhas.

## Continuidade

Estado operacional em `M02_EXECUTION_STATE.md`; provas anteriores permanecem em `docs/verification/m02-runtime/`. Cada marco terá resultado, SHA e próxima ação. O cenário é reconstrução de level design; posições inventadas não são apresentadas como cartografia histórica. Ativos novos exigem autoria/licença e escala explícitas.
