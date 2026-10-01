# M01 — cenário, materiais e atmosfera

As capturas visuais comparam `0ab60d7` com o sprint antes da fusão do PR #15. A integração posterior conserva os tiros em voo e a pose `pinned`; os resultados próprios ficam em `integration-cover-comparison.json`. M01 permanece **PROTÓTIPO JOGÁVEL**.

## O que mudou

- Solo, alvenaria, madeira, aço, água, lã e couro têm texturas procedurais originais. Terreno e kit GLB usam projecção em metros para evitar esticar uma textura por um quilómetro de ponte. O terreno visual tem amostragem mais fina, sobre a função de altura existente.
- Céu com campo de nuvens, gradiente de horizonte e luz de madrugada. O azimute/altura do sol continuam a seguir os keyframes históricos do mapa; não se inventa um sol alto às 04:45.
- Fumaça/poeira passam de esferas a quadrados orientados para a câmara, com textura de densidade e bordo suave. Um lote limitado a 112/192/256 partículas segue os danos reais; demolições têm prioridade quando há muitos emissores. Clarões usam sprites suaves, com até 24 explosões transitórias. Não são fluidos volumétricos.
- Árvores, ervas, juncos, cascalho, folhas, dormentes, madeira empilhada, caixotes, cercas, janelas, cornijas e sacos de areia. Os 17 troncos próximos têm colisores na simulação; a folhagem e as pequenas decorações não bloqueiam tiros. Árvores de fundo e detalhes são decoração, não posições comprovadas de 1939. Nenhuma rua alemã ou arma posterior foi acrescentada.
- Humanos com geometria mais suave, nariz/olhos/orelhas, gola, cinto, cartucheiras, mochila e botões. Acessórios do rosto só são desenhados até 45 m; a cabeça/pose/actor continuam representados à distância. A arma conserva o wz.29 e a recarga existente, com coronha perfilada, grão da madeira, braçadeiras, guarda-mato e dedos.
- Sombras direccionais nos presets médio/alto, quando o sol está acima do horizonte. Manchas de contacto suaves nos actores são uma aproximação visual; não são ambient occlusion calculada. O preset baixo reduz ervas e partículas.

## Comparação real

As pastas `before/` e `after/` contêm capturas **do jogo de produção**, a 1280×720, qualidade média, Chromium/SwiftShader. Partem dos snapshots do percurso por controlos: reparo sob fogo, retirada e chamada. A vista da estação usa input de olhar. Não são imagens geradas, uma partida contínua ou um playtest humano. Cada renderer demora tempos diferentes; os relógios após iniciar podem diferir alguns segundos.

| Cena | Antes | Depois |
| --- | --- | --- |
| Reparo / acesso às pontes | [before/repair.png](before/repair.png) | [after/repair.png](after/repair.png) |
| Estação e fumaça | [before/station-damage.png](before/station-damage.png) | [after/station-damage.png](after/station-damage.png) |
| Tabuleiro na retirada | [before/withdrawal.png](before/withdrawal.png) | [after/withdrawal.png](after/withdrawal.png) |
| Humanos na chamada | [before/roll-call.png](before/roll-call.png) | [after/roll-call.png](after/roll-call.png) |

`report.json` de cada pasta contém diagnóstico lido do jogo e erros. Contagens de triângulos/chamadas são do frame, incluindo passes de sombra, não FPS ou desempenho de GPU no Chromebook.

## Reproduzir

```sh
npm ci
npm test
npm run build
CHROME_EXECUTABLE=/caminho/chromium CI=1 npm run test:browser
CHROME_EXECUTABLE=/caminho/chromium node tools/capture-m01-visual.mjs docs/verification/m01-runtime/visual-sprint/after
```

O capturador inicia e termina o seu próprio preview na porta 4173. Para repetir o antes, executar o capturador com o checkout `0ab60d7` como directório corrente: importa a rota e serve o build desse checkout. Não deixar outro preview na mesma porta.

## Limites

Os humanos e as mãos continuam estilizados/procedurais; **não atingem o realismo das referências**. Faltam modelos humanos finais com rig, anatomia/rostos profissionais, uniformes finais, mãos/recarga mais naturais, vozes, texturas fotogramétricas e mais trabalho de composição. As referências misturam cenários e épocas; não autorizam copiar COD ou mudar a história de Tczew. O novo cenário aumenta geometria e overdraw; medição no hardware alvo e uma nova partida humana completa permanecem pendentes. Este sprint não aprova o marco 2 nem a campanha.


A revisão do PR #15 corrigiu a baixa por ID que ignorava o resultado do traçado. Agora só um impacto no actor vivo reduz a contagem. Um teste cobre parede, tiro falhado, acerto e chegada duplicada. A pontaria antecipa os 5,5 m/s do pelotão no tabuleiro; continua a ser tuning de protótipo. As partidas contínuas do Claude são evidência da versão dele, não desta fusão visual.
