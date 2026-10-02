# M01 — vagões/MG34 e revisão dos kits de guarnição/dano

M01 continua **PROTÓTIPO JOGÁVEL**. Entrega só em staging/PR #32; main e publicação reservados ao utilizador. Graphify preservado em pausa.

## Candidatos e provas

| Candidato | Verificação real | Origem |
| --- | --- | --- |
| Runtime local bf59e6f, remoto equivalente 456d216, tree ec27af68ec9c25f9603a2329437ee4891ace8319 | **148/148 Node**, build, **26/26 navegador** em **552,1 s**, sem retries/skips/instáveis/erros globais | runtime-node.log, runtime-build.log e browser.raw.json.gz |
| Kit #34 integrado, local 4221f8e / remoto equivalente e6f4bdc, tree 81b4a71f35230fb89451b9029644afc2c8120d56 | **153/153 Node**, build; src/, browser tests e JS de produção idênticos ao runtime testado | staging-node.log, staging-build.log e verification.json |
| CI anterior #32, head dcffd4a, run 37063392650 | 136/136 Node, build, 24/24 browser (20,8 min); deploy skipped | https://github.com/Brawl2007/COD-guerra/actions/runs/37063392650 |

Não atribuir uma segunda execução dos 26 ao candidato só com assets. JS SHA-256 **6e8d87a1653f4495add54fa4176c9da41cb1416c3362f2615b17cc16116c56fa**, build **1034,23 kB / 268,17 kB gzip**; aviso de chunk grande permanece. Chromium **153.0.8010.0**, SwiftShader, viewport 1280×720, retries 0. O executável da sessão anterior tinha desaparecido; foi reposto em scratch antes da execução válida. A tentativa sem executável não lançou testes e não conta como validação.

## Comportamento

- 65 vagões do trem 963 com passo 9,10 m, LOD2 instanciado por malha/tipo (49 cobertos, 16 abertos), cache partilhado, fallback parcial/total e descarte de buffers. Tipos e composição são genéricos (P16 aberta); locomotiva anterior conservada. Sem velocidade/portas autónomas.
- Os dois actores existentes de_east_0/1 recebem uma MG34 antes de criar acções, ocultam Kar98k/clipe e usam a boca real. Animação lê firedAt/shot, corta a rajada de sete nos 4–7 tiros realmente pedidos, sem inventar recarga. Instâncias partilham arte e conservam esqueletos/mixers independentes, LODs, pausa/restauro, supressão, baixas e fallback. As duas fontes consomem o mesmo orçamento 18/24/28.
- Quatro regressões Node usam malhas/transforms/skin/clips dos GLB reais, verificam imutabilidade do snapshot, pooling, raios de selecção, cortes, LOD, falhas e descarte durante downloads. Os dois novos casos de browser continuam snapshots genuínos até fogo, pausa/restart e falha opcional. A suíte completa conserva ponte obrigatória, bancada francesa, tiros/recargas, transporte, CP-D, horários e segurança das demolições.
- Kits #31 ckm, #33 MG34 deitada e #34 dano dos vagões revistos/integrados. Reutilizados relatórios/galerias originais e inspeccionadas imagens de guarnição, dupla deitada e comparação dos estados. Não foram refeitas extracções ou galerias.

## Capturas e limites

`train-mg34.jpg` e `train-mg34-fallback.jpg` são capturas originais de produção, vistas da margem oeste a cerca de 1,2 km; não são grandes planos dos kits nem prova de pormenor artístico. `browser-samples.json` guarda diagnóstico no fogo/pausa e após reinício, incluindo GLBs, contagens, LODs, clips e bocas reais. Provas de escala/pivôs/encaixe vêm dos testes e das galerias originais.

Pátio oeste aguarda alturas/coberturas; ckm aguarda actores da guarnição, altura da seteira e LOD0 até 4000 (pedido ao Claude); MG34 deitada/loader requer postura/guarnição na simulação; danos de vagões requerem ID/estado da simulação. Não alterar saves/colisão para inferir esses dados a partir da arte. Playtest humano, historicidade/arte final e FPS no Chromebook continuam pendentes.
