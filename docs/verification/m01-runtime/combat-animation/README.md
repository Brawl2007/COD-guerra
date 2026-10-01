# M01 — animações procedurais de combate

Base de revisão: `e0ecc3b` de `codex/m01-runtime`. Estado da missão: **PROTÓTIPO JOGÁVEL**.

## O que mudou

A arma à cintura passa ao ombro durante os tiros; mãos, coronha, cano e clarão usam o mesmo referencial, incluindo recuo e orientação. A mira recente termina mesmo quando o actor conserva `state: SUPPRESS`. Aliados sob fogo curvam o tronco sobre os joelhos, com os pés no chão; alemães usam o `crouched` da simulação. O passo alterna apoio e elevação de um pé.

As poses sentada, ferida e transportada têm prioridade. Civis e socorristas não ganham arma/disparo. A animação é função de dados já guardados e do relógio activo; pausa e reload reproduzem o frame sem cache de progressão ou campos novos de save.

## Galeria isolada

| Ficheiro | Amostra |
| --- | --- |
| [combat-recoil.png](gallery/combat-recoil.png) | 10,016 s: mira, recuo inicial, postura sob fogo e passo |
| [combat-recovery.png](gallery/combat-recovery.png) | 10,120 s: recuperação do recuo e outra fase do passo |
| [gallery-report.json](gallery/gallery-report.json) | Relógio, poses, animações, erros e contagens de render |

Os quatro actores são **dados de exemplo** no renderer real de M01. Esta galeria não executa a missão. Chromium 153/SwiftShader, 1280×720; 0 erros de página/consola/rede, 18 chamadas / 18.778 triângulos por amostra. As capturas são originais, sem edição. As contagens não são FPS nem medição no Chromebook.

```sh
CHROME_EXECUTABLE=/caminho/para/chromium node tools/verify-m01-poses.mjs --combat --out docs/verification/m01-runtime/combat-animation/gallery
```

## Verificação de estado e geometria

Node **104/104**. As regressões verificam matrizes reais: arma ao ombro, mãos no corpo da arma, cano/clarão alinhados através de yaw/recuo, botas assentes sob fogo, prioridade dos feridos/sentados e reprodução exacta em pausa/reload de um save genuíno do combate. O snapshot conserva dados/RNG. O teste de reparo no navegador continua uma rota alcançada por controlos e exige contagens de mira/supressão coerentes com o estado observado; não é uma nova partida contínua.

Build **1013,01 kB / 261,87 kB gzip**, com o aviso de chunk grande. Suíte completa de produção **16/16**, exit code 0 e zero retries: inclui reparo, retirada, chamada/restauro, demolições, origem das salvas e bancada francesa. O resultado e ambiente estão em [production-report.json](production-report.json), com capturas originais do [reparo](production/repair-under-fire.png) e da [chamada](production/roll-call-seated.png). São continuações de snapshots genuínos, sem nova partida contínua/humana.

## Limites

Movimentos e armas são procedurais e estilizados, sem rig ou anatomia final. As amostras de recuo são parâmetros artísticos; não são uma medição do comportamento de armas históricas. Animações de ferrolho/recarga de NPCs, IK com obstáculos, contacto de pés com inclinações e transições completas entre clips continuam pendentes. O rig final dos soldados permanece na tarefa do Claude. Playtest humano e Chromebook permanecem pendentes.
