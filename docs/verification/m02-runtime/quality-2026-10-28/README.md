# M02 — revisão de qualidade após avaliação do proprietário

2026-10-28, mesma candidata `codex/m02-recovery-v1`, base `4aab5bb`. Trabalho reaberto por rejeição visual; não declarar a missão aprovada.

`before/` é a apresentação anterior, `lighting/` a F1 com volumes de sombra a seguir o observador, cascatas/modelo de luz/grade/AO M01 e contacto sob os atores. Mesmas fixtures, posição, relógio e resolução; `report.json` identifica fontes/árvore suja. Capturas reais de Chromium/SwiftShader, High, 1280 × 720, explicitamente rotuladas como inspeções controladas. Não são playtest contínuo ou benchmark de GPU.

F1: 81 testes M02 PASS e build PASS, logs nesta pasta. A prova unitária atravessa as áreas A/B/C, exige alvo de sombra no jogador, distância da luz e intensidade total corretas, postprocess em High/libertação em Low e snapshot/RNG/eventos idênticos. M01 não alterada; a adaptação reutiliza os seus componentes. As fotografias mantêm o terreno vazio visível: este defeito não foi declarado resolvido pela iluminação.

Próxima implementação em curso: efeitos causais por ronda e composição da paisagem. Provas de F1 não validam alterações posteriores. Sem main, deploy ou force-push.

## F2 — tiro causal e partículas M01

As rondas NPC passam a publicar o traço realmente resolvido (obstrução, dispersão, material e ponto de impacto); o ponto tático continua preservado separadamente. Dano, munição, RNG e relógio não mudam. O renderer usa os perfis de superfície/explosão, envelopes de clarão, textura de estrela da arma e billboards M01. As pools são limitadas: 128 registos de tiro, 16 explosões, geometria partilhada e contagens limitadas por batch. Sem raios de 1,4 s nem esfera a assinalar acertos; só algumas rondas automáticas recebem um traçante curto em movimento. Restauro de mesmo relógio limpa o estado transitório.

**83 testes M02 PASS, build PASS.** Novas provas exigem que uma parede junto à arma corte o traço/impacto, sem dano no alvo atrás; renderizar conserva snapshot/RNG; 512 tiros mantêm capacidade fixa e todos os efeitos expiram. `fx/` mostra a remoção dos lasers em C11, mas a primeira MG ainda tinha clarão esférico e foi rejeitada. **Usar `fx-star/mg34-fire.png`** para o clarão corrigido, com a textura M01 transparente. Capturas controladas, não novo percurso integral.

Continua em curso F3: cobertura visual de terreno em todas as células, horizonte e composição rural. Não declarar qualidade final ou aprovação.

## F3 — terreno, horizonte e arquitetura (validação de jogo em curso)

A malha antiga terminava em x ±120 / z 105 em todas as áreas, mas B permite z 140 e C permite x ±150 / z 180. O material também fixava a máscara da quinta. Agora a malha e a máscara M01 usam os limites da célula com margem de 25 m, e quatro faixas de terreno contínuo prolongam a mesma superfície até ao horizonte. Geometria antiga do chão é libertada ao reconstruir a célula. Os 128 elementos novos de sebe/arboredo ficam inteiramente fora da área de combate, incluindo a copa, sem cobertura visual que a IA ignore. A vegetação baixa cobre a extensão correta de cada célula, com distância/fade por qualidade e capacidade fixa. O shader/atlas/LOD M01 permanecem partilhados. Fachadas de madeira recebem ripas só sobre segmentos sólidos; plintos e tesouras acima da cabeça dão estrutura aos edifícios sem tapar aberturas.

**84 testes M02 PASS/build PASS**. Nova regressão percorre os três mundos e exige cobertura de todos os limites, ring sem buracos/sobreposição, árvores fora da área jogável e snapshot/RNG preservados. Novo caso de navegador verifica a geometria/máscara realmente desenhadas nos limites B/C e mantém Low sem postprocess. O teste de qualidade passa também a exigir AO/grade M01 ativo em High.

A primeira tentativa de galeria F3 foi invalidada por edição de fonte durante a captura: o HMR recarregou a página e perdeu o rótulo (log `landscape-invalid-hmr.txt`). Não é validação visual de B/C nem resultado verde. O capturador passa a guardar a falha explicitamente no report. Repetir na fonte congelada, sem alterações durante browser/percurso.
