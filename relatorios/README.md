# M01 — Quality Inspector

**Recomendação editorial: manter em playtest dirigido.** A M01 tem identidade militar e motivos narrativos próprios, mas a apresentação observada ainda não sustenta aprovação como campanha acabada. A nota geral local é **4/10**, com alcance e confiança declarados no scorecard. Não equivale a uma média das categorias nem a uma comparação comprovada com Call of Duty.

Base fixa da auditoria: PR [#80](https://github.com/Brawl2007/COD-guerra/pull/80), commit `68301b779b856af46ed35a10fde42df9559d9ed4`. Branch de documentação: `codex/m01-quality-inspector-20261018`. Nenhuma correção de produção foi autorizada nesta execução; os achados conservam a linha de base, sem integrar trabalho das frentes ativas.

**Resultado técnico final: menu → debrief, 12/12 objetivos concluídos, incluindo Bąk salvo.** Quatro checkpoints, 28 disparos, saúde final 76, 12 sobreviventes no pelotão; zero bloqueios, mortes, pausas de controlo ou erros de página registados na tentativa adaptada. Foram 19m20s de simulação e 75m21s reais nesta máquina. A tentativa original interrompida está preservada e não foi somada como um sucesso.

## Os sete relatórios

| Entrega | Conteúdo |
| --- | --- |
| [A — Playtest integral](A-PLAYTEST-INTEGRAL.md) | Resultado da rota, comandos, objetivos, esperas, checkpoints, navegação visual e limites |
| [B — Crítica profissional](B-CRITICA-PROFISSIONAL.md) | Qualidades, problemas de experiência e recomendação editorial fundamentada |
| [C — Referências](C-COMPARACAO-REFERENCIAS.md) | Comparação externa incompleta, bloqueios documentados e matriz para a completar |
| [D — História e Fable](D-HISTORIA-E-ROTEIRO.md) | Texto canónico, nove personagens, quinze documentos e nove situações propostas |
| [E — Audiovisual](E-AUDIOVISUAL.md) | Imagens High/Low, cenários, apresentação humana, física delimitada e 31 sinais de áudio |
| [F — Correções](F-CORRECOES-PRIORIZADAS.md) | Top 10, top 20, microdetalhes, autoridade e critérios de aceitação |
| [G — Plano](G-PLANO-DE-QUALIDADE.md) | Sequência de produção e de aceitação compatível com o trabalho do Capitão |

As [15 respostas diretas](CONCLUSOES.md), o [scorecard de 20 categorias](SCORECARD.md) e a [avaliação dos 12 objetivos](OBJETIVOS.md) complementam os relatórios. Os [achados estruturados](findings.json), a [cronologia por acontecimento](timeline-events.json), a [amostragem por minuto](timeline-per-minute.csv) e as [métricas da auditoria](audit-metrics.json) permitem revisão técnica.

O [catálogo de capturas](CAPTURAS.md) distingue 98 fotos capturadas, 50 incluídas no pacote e 21 fotos da rota inspecionadas individualmente, além das vistas independentes High e dos observadores. A [exposição de diálogo](EXPOSICAO-DIALOGO.md) cruza as legendas efetivamente registadas com o texto canónico, sem inferir ausência de variantes não reproduzidas. O [manifesto](evidence/artifact-manifest.json) contém tamanhos e SHA-256 dos artefactos.

## O que a evidência permite concluir

- A defesa não tem destino no guia; a ordem de rotação pode sugerir a cobertura já ocupada. Um marcador sobre esse dado não resolveria a contradição.
- O prompt de recolher Bąk/caixa aparece em posições onde E não executa a ação. A ajuda de socorro termina antes do alcance válido da entrega.
- A partida apresentou uma ordem de proteger o reparo depois de o reparo estar concluído. A mesma indicação da MG repetiu-se apesar do avanço do trabalho.
- A abertura High coloca os interlocutores fora do enquadramento inicial. A identidade escrita das pessoas está mais desenvolvida do que a sua apresentação observada.
- O transporte da caixa usa mãos esféricas. Depois da entrega de Bąk, arma e braço ficam descompostos em várias capturas, já fora do transporte. Rever essas transições com os sistemas existentes, sem descartar o kit integrado.
- A demolição oeste publica no HUD uma instrução de encenação, incluindo a condição «se o jogador estiver a até 3 m». O campo `action` é enviado como mensagem ao jogador.
- Há diferenciação técnica de áudio, mas os diagnósticos não mostram VO carregada nem stems musicais a tocar. Não houve escuta humana.

O estado de cada item distingue observação, teste isolado, código, avaliação artística e hipótese. Não se inventaram vinte falhas críticas para preencher uma lista.

## Alcance, ambiente e reprodução

A rota usa teclado/rato reais e leitura de `gameDiagnostics`, sem atribuir relógio, coordenadas, eventos ou checkpoints à partida. O piloto conhece destinos por coordenadas; por isso, a sua conclusão não certifica orientação natural. A navegação independente High foi parcial, informada por conhecimento prévio do mapa, e alcançou a primeira entrega. Não é um playtest humano cego.

Ambiente: Node 24.19.0, npm 11.9.0, Chromium 154.0.8037.57 em `/usr/bin/chromium`, renderização SwiftShader. O tempo real inclui esta limitação e concorrência de verificações; não é uma medição de FPS nem do ritmo no PC do proprietário. A rota adaptada usa Low/640×360; as vistas independentes usam High/1280×720.

Preparação executada: `npm ci --cache /tmp/cod-guerra-npm-cache --no-audit --no-fund`, `npm run build` e `npm run preview`. O piloto original foi tentado antes da adaptação; a interrupção e o seu bloqueio de controlador estão documentados em A. A tentativa adaptada executa uma cópia fora de produção:

```bash
CHROME_EXECUTABLE=/usr/bin/chromium node /workspace/scratch/m01-quality-inspector/pilot-adapted.mjs --out test-results/m01-quality-inspector-adapted-68301b7
```

O [diff do piloto](evidence/pilot-adapter.diff) e as [ferramentas usadas](evidence/tools/) foram preservados. Os caminhos absolutos dessas cópias correspondem a este ambiente; devem ser ajustados numa reprodução noutro checkout. Nenhum timeout de aprovação de objetivos foi alargado. As provas isoladas com posições atribuídas estão identificadas e separadas da partida contínua.

Os registos de preparação e áudio estão em [checks](evidence/checks/). As [verificações](VERIFICACOES.md) distinguem os 1131 testes unitários aprovados, o teste de áudio e o percurso. A [integridade de produção](evidence/production-integrity.json) compara os 433 ficheiros com o início da auditoria. O resultado da rota é consolidado em A.

## Limites que impedem aprovação global

Não houve escuta humana, avaliação de diversão ou vídeo de animação em cadência normal. Animação dinâmica, IA global, áudio perceptivo e envolvimento recebem NÃO VERIFICADO quando a cobertura é insuficiente. Fotografias e diagnósticos não certificam todas as colisões, interiores, transições de LOD ou sincronização de efeitos.

As fontes externas tentadas devolveram bloqueios de acesso; o manual Steam redireciona para um CDN bloqueado. Não foi observado gameplay de WaW, WWII ou COD 1. O [registo de acesso](evidence/reference-access.json) demonstra esta limitação. C é uma matriz de investigação por completar, sem funcionalidades ou timestamps inventados e sem notas automáticas para as referências.

Antes de transformar achados em tarefas, reconciliar as frentes phys, npc, pacing, combat e skin registadas na issue #72. Uma correção posterior não invalida a prova da linha de base, mas pode tornar uma nova implementação duplicada. Reavaliar trechos afetados e reservar o percurso integral para marcos relevantes. T45/T51/T52 não ficam aceites por esta auditoria automática.
