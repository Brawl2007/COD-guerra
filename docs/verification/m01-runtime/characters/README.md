# Soldados e mãos de M01

Integra o trabalho de Claude Code incluindo a revisão `af3a06d` do PR #23, preservando a sua branch e commits. GLTFLoader, SkeletonUtils e AnimationMixer oficiais carregam as seis versões de soldados e o GLB de quinze animações. Os modelos continuam provisórios; M01 continua PROTÓTIPO JOGÁVEL.

## Contrato de apresentação

- Metros, +Y para cima, frente local −Z. A raiz roda para o `facing` já decidido pela simulação. Não altera hitboxes, armas, baixas ou navegação.
- Cabeças de Zieliński, Krawiec, Nowicki, Dudek e Bąk são escolhidas pelo ID. Capacetes/equipamento são malhas alternáveis; o rifle fica oculto no médico e no ferido. Kowal e civis conservam os proxies até receberem equipamento/modelos apropriados.
- LOD0: 14.861/16.055 triângulos visíveis, LOD1: 6.026/6.446, LOD2: 1.893/2.059 (polaco/alemão, configuração da galeria). As variantes alternáveis aumentam o conteúdo total do GLB; não ficam todas visíveis. A qualidade baixa usa LOD1 a menos de 15 m, LOD2 até 100 m e no máximo 18 actores com skinning; média/alta têm limites próprios.
- Geometria, material e atlas são partilhados pelos clones. Esqueleto/mixer são próprios de cada actor; trocar LOD liberta essas instâncias. Cancelar a missão descarta também os assets carregados.
- Os clips são amostrados pelo relógio guardado da missão. Pausa não avança a animação; um restauro/LOD reconstrói o mesmo instante. IDs de mortos/feridos continuam na simulação.
- O ferrolho completa o clip depois do clarão. Sapadores suprimidos conservam a pose protegida e param as mãos; não simulam trabalho enquanto o progresso está parado.
- Bąk liga-se ao `carry_socket` de Dudek quando ambos estão representados com rig; a entrega volta a colocá-lo no mundo. Em primeira pessoa, o mesmo rig fornece mãos, wz.29, ferrolho, clipe e corpo levado ao ombro. A carga parcial mostra um cartucho, ocultando o clipe de cinco.
- A primeira pessoa usa o LOD0 polaco em todas as qualidades, pela proximidade das mãos e do mecanismo à câmara; se esse download falhar, usa o LOD1. O limite de 18 actores do cenário em qualidade baixa continua a usar LOD1/2. A geometria própria da primeira pessoa conserva apenas triângulos de braços/mãos, lendo correctamente atributos intercalados do GLTFLoader; o corpo do mundo não é recortado.

## Fonte e licença

A malha base/alvos/pesos são dados CC0 do MakeHuman, fixados por commit e SHA-256 em `tools/assets/m01-soldiers/makehuman.lock.json`. A cópia de `LICENSE.ASSETS.md` está em `assets/licenses/MakeHuman-CC0.md`, com teste de igualdade de hash. O código AGPL do MakeHuman não é incorporado. Fardamento, texturas, arma, equipamento e animações são geração original do projecto. Ver `ASSET_CREDITS.md`; a licença global pertence à decisão do proprietário. Insígnias alemãs com suástica foram omitidas e a reconstrução dos uniformes continua provisória.

## Evidências

`gallery/report.json` (kit `b198a75`, anterior à revisão do PR #23): seis GLB, quinze clips, posições/normais e transformações finitas; zero erros na revisão isolada. Capturas `pl-lods.png`, `de-lods.png` e uma imagem de três instantes por clip. Isso não é uma partida.

`production/` (kit `b198a75`, capturado antes da revisão de S3): reparo, estação, retirada e chamada, por continuação de snapshots alcançados com controlos da simulação. O relatório identifica a origem dos snapshots. Não é playtest humano ou partida contínua. A suíte de navegador verifica controlos reais de mira/disparo/ferrolho, clipe, cartucho parcial, pausa, qualidade alta e fallback dos modelos.

`controls/`: mira e recargas com teclado/cliques reais. O enquadramento horizontal usa os mesmos eventos relativos de rato dos testes de orientação. As capturas congelam o estado através da pausa e ocultam apenas a sobreposição do menu durante a captura (CSS do Playwright); não injectam poses ou estado da arma.

Reproduzir a galeria, da raiz:

```sh
CHROME_EXECUTABLE=/caminho/chromium node tools/verify-m01-characters.mjs test-results/m01-characters
```

Continuam pendentes revisão artística/histórica, transições e encaixe de mãos em todas as poses, vozes, equipamento dos proxies, playtest humano e medição no Chromebook. Não se declara FPS de hardware com SwiftShader.

As sete capturas de missão/controlos foram exportadas para JPEG a 72, mantendo o viewport completo de 1280×720. `capture-encoding.json` conserva dimensões, tamanho e hash dos PNG originais. Os testes continuam a gerar PNG; a compressão não é uma alteração de pose ou estado.
