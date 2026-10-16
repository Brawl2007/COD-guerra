# Comparação visual V5 → V6

**PASS de preservação visual nos estados capturados.** 60 PNGs originais, 30 pares, 10 câmaras × Low/Medium/High, 1280×720. Os 30 pares têm snapshot igual, pixel RGB idêntico (erro absoluto médio zero) e os mesmos contadores de recursos. Zero page errors ou respostas HTTP ≥400. Chromium/SwiftShader **145.0.7632.6**, conforme o diagnóstico real do browser; isto não é FPS de hardware físico.

As câmaras usam a posição e altura do jogador. Os estados vêm da rota real; apenas a pose de observação é ajustada nas vistas arquitetónicas/ferroviárias. A pausa nativa impede ticks. A ferramenta compara o snapshot completo antes/depois da captura e entre as versões. HUD/menu/pause ficam ocultos somente na screenshot para permitir inspeção; o ViewModel permanece. Esta é comparação de regressão, não demonstração de melhoramento artístico novo.

Foram inspecionadas as seis folhas comparativas (todos os 30 pares), mais as originais Station frontal High, yard High, Panzerzug High e roll-call Medium. As capturas FX foram inspecionadas separadamente em [CI_VISUAL_REVIEW.md](CI_VISUAL_REVIEW.md). Também foram observadas capturas de HUD, Ju87, estrutura da ponte, vagões e personagens durante a suíte local, antes de perder o executor.

| Qualidade | Primeiras cinco câmaras | Últimas cinco câmaras |
| --- | --- | --- |
| Low | [pares 1](visual/comparison-low-1.jpg) | [pares 2](visual/comparison-low-2.jpg) |
| Medium | [pares 1](visual/comparison-medium-1.jpg) | [pares 2](visual/comparison-medium-2.jpg) |
| High | [pares 1](visual/comparison-high-1.jpg) | [pares 2](visual/comparison-high-2.jpg) |

## Observações reais

- **Station:** recessos, peitoris, caixilhos, marquise e cinco volumes continuam presentes. A alvenaria tem repetição visível; a cobertura permanece escura/uniforme. Low retira detalhe e sombra de acordo com o preset; Medium/High conservam a profundidade. Station V3 está excluída por falta de aprovação expressa; não se atribui o seu acabamento à V6.
- **Ponte:** portais, bases e treliças preservam silhueta e contacto. A vista axial leste é dominada pela estrutura, com ocultação de efeitos distantes. Os buffers libertados em dispose não modificam o frame ativo.
- **Pátio/props:** composição e folhagem preservadas. Na vista yard, alguns vagões parecem suspensos sobre o declive; a imagem é idêntica na V5. É limitação de contacto visual da base, não corrigida movendo âncoras ou simulando novos estados nesta consolidação.
- **Comboio/Panzerzug:** assets carregados, escala e silhuetas preservados; os materiais escuros reduzem leitura de underframes e painéis. A câmara train-963 é parcialmente ocultada por um portal. O teste dedicado cobre outras câmaras de vagões/acoplamentos.
- **Evacuação/fumo:** emissão persistente e disposição do ambiente coincidem. A vista congelada não certifica toda a encenação do arrasto; os testes reais grab/release/entrega complementam-na.
- **Roll-call:** seis actores sentados enquadrados, raízes e pose coerentes nos três presets. Medium/High acrescentam sombras mantendo o frame correspondente à base.
- **HUD/restore:** certas imagens de testes pausadas no primeiro frame ficam cobertas pelo fade preto do HUD. Não foram apresentadas como prova artística de modelos; esta galeria remove somente essa cobertura de UI na imagem.

Nenhuma nova ornamentação ou estimativa histórica foi introduzida. As referências Poczt226/Poczt734 e as estimativas da Station V2 continuam documentadas no seu handoff original.

## Custo medido

Valores High no mesmo estado V5/V6; **delta zero em todas as linhas e nas três qualidades**. Texturas/geometrias refletem recursos residentes após os loads daquela página reutilizada; não são bytes de VRAM. environmentInstances é o contador do diagnóstico, não um contador de fragmentos ou FPS.

| Câmara High | Draw calls | Triângulos | Texturas | Geometrias | Instâncias de ambiente |
| --- | ---: | ---: | ---: | ---: | ---: |
| station-frontal | 56 | 484908 | 51 | 250 | 22049 |
| station-oblique | 64 | 492444 | 55 | 262 | 21744 |
| station-platform | 69 | 494913 | 55 | 262 | 22272 |
| station-yard | 70 | 497147 | 55 | 262 | 21860 |
| bridge-west | 276 | 555041 | 121 | 290 | 20136 |
| bridge-east | 210 | 549813 | 91 | 320 | 17559 |
| train-963 | 259 | 653774 | 236 | 443 | 15293 |
| panzerzug | 230 | 574463 | 237 | 454 | 15265 |
| evacuation | 80 | 515809 | 91 | 469 | 22293 |
| roll-call | 315 | 951720 | 245 | 496 | 22471 |

Ranges dos dez estados: Low 48–226 calls / 384047–512906 triângulos; Medium 53–280 / 428618–767211; High 56–315 / 484908–951720. Os contadores incluem o trabalho reportado pelo renderer, incluindo os passes de apresentação/sombra, e variam com o enquadramento.

Station própria conserva **7 calls**, LOD0/1/2 **30881/28707/13382** triângulos, **21 geometrias**, **10 mapas**, **5 volumes**, **140 aberturas**, **0 colliders**. Há **30 clusters** de props. Não houve crescimento de recursos medido na comparação.

[VISUAL_PAIRS.json](VISUAL_PAIRS.json) contém os cálculos por par; [VISUAL_COMPARISON.json](VISUAL_COMPARISON.json) contém os diagnósticos completos, bundles realmente servidos e hashes dos snapshots. As duas versões serviram os bundles SHA256 de [BUILD_PROVENANCE.json](BUILD_PROVENANCE.json). As 60 imagens são ficheiros Git persistentes; o ZIP do run é uma cópia adicional.
