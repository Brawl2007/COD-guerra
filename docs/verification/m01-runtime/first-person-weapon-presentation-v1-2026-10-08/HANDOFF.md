# HANDOFF — M01 first-person weapon presentation V1

TASK_ID: `M01-FIRST-PERSON-WEAPON-PRESENTATION-V1`  
BASE: `99309d9cb023cc94a07d41ff863e1362e4460570`  
BRANCH: `codex/m01-first-person-weapon-presentation-v1` (sem merge, sem PR, `main` intacta)  
Runtime verificado: commit indicado em [`EVIDENCE.md`](EVIDENCE.md). Os commits seguintes só acrescentam documentação.

M01 continua **PROTÓTIPO JOGÁVEL**. Trabalho **só de apresentação**: dano, dispersão autoritativa, cadência, munição, detecção de impactos e `Simulation` não mudaram.

## O que o jogador percebe

**Karabinek wz.29 (M01).** A espingarda sobe ao olho com uma curva suavizada à entrada e à saída, um pouco mais pesada do que antes (constante de 55 ms em vez de 45 ms, nos dois sentidos), e com um ligeiro mergulho e cant a meio do gesto. No disparo há um empurrão forte para o ombro, subida e ligeiro cant à direita, uma descida abaixo do repouso e um assentamento lento. O clarão tem camadas no socket real da boca: núcleo branco, língua de chama e estrela de quatro pontas. Junta-se uma luz curta na mão/arma, fumo no cano e, quando o ferrolho abre, um fio de fumo na câmara. O ferrolho tira a arma do olho, com cant para mostrar a acção, e volta às miras antes de `READY`. Os batentes do ferrolho e o assentar do clipe dão um pequeno solavanco nos marcadores do GLB. O invólucro 7,92×57 sai da janela de ejecção no marcador `eject` do clip `fire_bolt`, voa no mundo, gira, cai no chão real (também em encostas) e fica lá cerca de 24 s. No recarregamento por clipe, o carregador vazio sai aos 2,45 s (`clip_ejected`) e cai no mundo. Ao rodar o rato à anca a arma atrasa-se ligeiramente; em ADS segue a vista exactamente, também durante a rotação, para as miras mostrarem sempre onde vai o tiro. Na anca há uma oscilação de respiração não periódica. O aço da arma lê-se como aço azulado com reflexo moderado e a madeira fica acetinada, iluminadas pelo mesmo céu/sol do mundo.

**M1 Carbine (bancada francesa preservada).** Identidade própria de semi-automática leve: estalo rápido, pouco empurrão e retorno rápido para seguimentos a 180 ms. O clarão é proporcionalmente maior do que o da wz.29 (cano de 457 mm). O invólucro .30 Carbine sai com o tiro (não há ferrolho manual), há fumo próprio e o ADS é suave. Madeira acetinada, metal com brilho contido.

## Implementação

| Campo | Resultado |
|---|---|
| PERFIS | `WEAPON_PRESENTATION` congelado em `src/render/first-person-weapon-fx.js`: `wz29` (bolt) e `m1_carbine` (semi). Só aparência (m, rad, s); nenhum campo de gameplay (teste). |
| POSIÇÃO / ESCALA / ADS | Posição/escala calibradas da base mantidas. Pose a partir do blend autoritativo `player.aiming`, com curva de easing e arco de elevação. Miras do GLB (`rear`/`front`) exactas em ADS, também durante a rotação: sem atraso de olhar em ADS (teste). |
| IDLE | Oscilação só na anca, frequências incomensuráveis, nunca move a linha de mira em ADS. |
| RECUO VISUAL | Impulso finito amostrado de `weapon.lastShot` (sem integração, sem timers, sem RNG). Contagem de tiros só varia o lado/cant por hash de apresentação. |
| RECARGA | Clip `reload_clip` do asset; solavancos nos marcadores; clipe vazio passa a objecto do mundo a partir de 2,45 s. Recarga de um cartucho não lança clipe. |
| SOCKET DA BOCA | Clarão/luz/fumo no socket `muzzle` do GLB (`WZ29_VISUAL.muzzle`); janela de ejecção do socket `ejection_port`. |
| CLARÃO | Núcleo + língua + estrela, texturas procedurais (DataTexture, sem canvas). Janela autoritativa de 60 ms; um frame lento que salta a janela mostra o tiro uma vez, nunca outra vez, nunca depois de um restore. Em ADS a estrela fica à frente da massa de mira. |
| FUMO | Fios no cano e na câmara (passe da arma) + nuvem no mundo, por tiro e por id. |
| INVÓLUCROS | Perfis de torno (7,92×57, .30 Carbine), voo analítico em idade (sem integração), pousados por bissecção em `world.heightAt`. Ids por tiro/recarga: frames repetidos nunca duplicam. Pool limitado. |
| MATERIAIS | Cópias só do viewmodel: limites de rugosidade/metalness, aço do atlas levantado para reflectância de aço azulado. Mãos/mangas usam cópia privada do atlas (os soldados do mundo não mudam de programa). |
| ILUMINAÇÃO | `WeaponLighting`: chave e enchimento seguem o céu e o sol do mundo e a vista. Número constante de luzes (sem recompilações por frame); ambiente céu/chão de baixa resolução no passe da arma. Ao amanhecer (início da rota) a chave fica em 0,60 e o enchimento em 2,17, com ambiente 0,33; antes eram constantes 2,0/2,7, como ao meio-dia. A bancada fica em 1,95/2,6. |
| CLIPPING | Todos os vértices do viewmodel ficam além do near plane durante curso do ferrolho, atraso de olhar e FX (teste). |
| PAUSA / RESTORE | Tudo é função do relógio da simulação; pausa repete o mesmo frame; restore reconstrói em repouso e descarta o histórico de mundo (teste). |
| PRÉ-COMPILAÇÃO | `prewarmWeaponFx`, via `warmWeaponFx()` no M01 e na bancada, antes do render do mundo. Os FX do tiro estão escondidos em repouso, por isso os seus programas eram criados no primeiro tiro. O SwiftShader só termina compilação/link no primeiro uso: um frame de ~3,9 s nesse tiro. Agora cada objecto de FX é compilado sozinho contra a sua cena (luzes visíveis, sombras, nevoeiro, ambiente) e cada programa é usado uma vez, por isso o link acontece antes. Os dois passes (arma e mundo) são preparados de novo sempre que muda um valor das chaves dos programas (`programStateKey`): shadow maps ligados (qualidade), o tipo de shadow map e, no M01, a sombra do sol ao nascer. O passe do mundo inclui a luz das explosões nos dois estados. A bancada pede `PCFShadowMap`, o tipo que o three r186 desenha: o r186 reescrevia `PCFSoftShadowMap` dentro do primeiro render com sombra, depois da preparação, e o primeiro tiro em Média voltava a compilar. Não desenha nada e não muda visibilidades (testes, um deles com o renderer real do three; medição em Baixa e Média em [`EVIDENCE.md`](EVIDENCE.md)). |

Ficheiros alterados: `src/render/first-person-weapon-fx.js` (novo), `src/render/m01-wz29-presentation.js`, `src/render/m01-viewmodel.js`, `src/render/m01-view.js`, `src/render/three-renderer.js`; testes e ferramentas de captura novos. Lista em [`FILES_CHANGED.txt`](FILES_CHANGED.txt).

## Validação

Ver [`EVIDENCE.md`](EVIDENCE.md).

## Limitações presentes

- O braço/antebraço do asset ainda cobre parte da vista no curso do ferrolho em ADS (asset existente). A convenção de tirar a arma do olho reduz o efeito, mas não substitui uma animação própria.
- Não há modelo de mãos novo nem animação nova: só pose, FX e materiais sobre o rig licenciado existente.
- **Mantido da base, sem alteração:**
  - a posição/escala calibradas da arma à anca e o alinhamento mão/arma (`placeViewArms` só passou a receber os ombros como constante);
  - a recarga procedural da M1 Carbine na bancada (arco do carregador, sem carregador a cair);
  - o fallback procedural M01 (sem o rig licenciado). Este ganhou clarão/luz/fumo da wz.29, mas mantém a pose/recuo antigos e não lança invólucros.
- O teste de clipping cobre o rig GLB; o fallback procedural não tem esse teste.
- O blend de ADS continua limitado a 50 ms por frame (como na base): abaixo de 20 frames/s a subida ao olho demora mais frames.
- A pré-compilação usa duas peças internas do three r186, `renderer.properties` e `WebGLProgram.getUniforms`, com encadeamento opcional. Se mudarem numa actualização do three, fica só o `compile` (sem erro), e o primeiro tiro pode voltar a pagar o link. Depois de actualizar o three, repetir `logs/first-shot-programs.mjs` em Média (bancada e M01 a partir de `logs/sunrise-save.mjs`) e `logs/first-shot-ab.mjs`.
- A pré-compilação acompanha o que o M01 e a bancada mudam hoje. Uma luz que pisca durante o jogo (como a das explosões) entra na lista `lights` do passe do mundo, que compila os seus estados. Uma mudança de configuração (sombras, tipo de shadow map, número de luzes) entra na chave de `warmWeaponFx()`.
- Em SwiftShader, os frames com efeitos de tiro activos foram mais pesados do que na base: até ~1,9 s contra 1,1–1,5 s (medição do primeiro disparo, n = 2 por build). Não foi medido em GPU real.
- **Risco aberto: `m01.spec.js:38`.** O passo que espera a recarga em 15 s de parede:
  - falha quase sempre neste contentor (SwiftShader) nas builds com a pré-compilação de `d97329c`: `d97329c` 1 de 7, `5743b83` 0 de 2;
  - passa na base (5 de 5) e em `dfb1572` (3 de 3).

  A causa não foi encontrada (ver [`EVIDENCE.md`](EVIDENCE.md)). Verificar num CI com GPU antes do merge.
- Na bancada em Média, o primeiro impacto ainda compila 1 programa: as partículas de impacto da bancada antiga ganham cor por instância no primeiro `setColorAt`. A base compila o mesmo programa, e mais um. Não é um FX da arma. Correcção proposta, não aplicada: criar a cor por instância na construção.
- Sem som novo (o áudio do wz.29 existente não mudou).
- Sem playtest humano, sem Chromebook físico, sem números de FPS.
