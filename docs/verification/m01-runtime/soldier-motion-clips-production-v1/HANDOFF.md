# M01 soldier motion clips — handoff

TASK_ID `M01-SOLDIER-MOTION-CLIPS-PRODUCTION-V1`. Estado: **READY_FOR_CAPTAIN_REVIEW**. M01 continua **PROTÓTIPO JOGÁVEL**.

Base remota confirmada: `codex/m01-anim-contract-sim-v1` @ `d070225d49840f5bd304a0825c0656651b82c26d`. Branch de entrega: `codex/m01-soldier-motion-clips-production-v1`. O HEAD exato publicado consta da PR draft e da mensagem final de entrega; este documento faz parte desse commit.

## Pacote

`assets/models/provisional/m01/characters/motion-clips-v1/m01_soldier_motion_clips.glb`: **415.724 bytes**, SHA-256 `dbcb3e56015c1902d691c9fdb1783997e86c0a69e7c2abc29135ea773611031c`. O [manifesto](../../../../assets/models/provisional/m01/characters/motion-clips-v1/manifest.json) contém os metadados, hashes dos seis rigs e fontes da geração; os mesmos metadados estão em `animation.extras` no GLB.

Seis clips originais, criados neste repositório reutilizando o solver FK/IK existente. Nenhum asset de Call of Duty, biblioteca de mocap ou GLB original foi copiado/substituído. O pacote contém apenas a hierarquia de animação e canais: zero meshes, materiais, imagens ou skins adicionais. A licença geral do projeto continua a ser uma decisão do proprietário.

| Clip | Duração | Loop | Velocidade nominal | Distância/ciclo; passo | Contactos L / R (fração do clip) |
| --- | ---: | --- | ---: | --- | --- |
| `sprint` | 0,64 s | sim | 5 m/s | 3,2 m; 1,6 m | L 0–0,24; R 0,50–0,74 |
| `crouch_walk` | 0,96 s | sim | 0,8 m/s | 0,768 m; 0,384 m | L 0–0,64; R 0–0,14 e 0,50–1 |
| `turn_left` | 1,14 s | não | 0 | 0 | L 0–0,13 e 0,49–1; R 0–0,49 e 0,85–1 |
| `turn_right` | 1,14 s | não | 0 | 0 | R 0–0,13 e 0,49–1; L 0–0,49 e 0,85–1 |
| `hit_front` | 0,76 s | não | 0 | 0 | ambos 0–1 |
| `near_miss_duck` | 0,98 s | não | 0 | 0 | ambos 0–1 |

O sprint combina apoio comprimido, voo, recuperação dos joelhos e contrarrotação de quadril/ombros; ambas as mãos seguram a espingarda. Crouch usa passos curtos, apoio sobreposto e centro de gravidade baixo. Giros de ±90° têm antecipação do olhar, duas colocações dos pés e assentamento. Hit/duck têm impulso ou compressão, atraso da cabeça e recuperação. Contactos são definidos em solo plano; as velocidades acima são **metadados de autoria**, sem alteração às velocidades dos actores.

## Integração futura no Animation Resolver

1. Carregar o GLB uma vez com `GLTFLoader`; usar apenas `animations` num `AnimationMixer` associado à cena do soldado original. Não anexar outra hierarquia de ossos ao avatar. Os nomes/bind transforms são compatíveis com PL/DE LOD0/1 (61 joints) e LOD2 (28 joints de skin, mantendo os 61 nós de transformação).
2. Para locomoção, usar `motion.odometer` em metros: `phase = fract((odometer - phaseOrigin) / cycle_distance_m)` e `clipTime = phase * duration_s`. `phaseOrigin` deve ser estável por actor/transição, inclusive após reload. O odómetro determina a passada; o clip nunca altera a posição, velocidade, `facing`, hitboxes ou raiz autoritativa.
3. `motion.gait`, `motion.gaitSince`, `posture` e `postureSince` seleccionam/transitam apresentação. Os tempos de blend do manifesto são sugestões, ainda sem validação de blends no runtime. O clock é o `clock` activo da missão, nunca wall-clock, frame count ou `battleClock`; pausa mantém exactamente a mesma amostra.
4. Hit usa um `hitAt` real; usar `hitYaw`/`bodyYaw` para verificar incidência frontal. Sem direção conhecida, o resolver deve decidir um fallback explícito, não atribuir impacto frontal fictício. Duck usa `suppressedAt` real e não renova o evento enquanto a supressão simplesmente permanece activa. Ausência de timestamp em saves antigos não deve reproduzir um evento inventado. Ambos recuperam à pose ready inicial.
5. Giros são one-shots, não loops. O yaw está em `hips.quaternion`, com pés/arma coordenados, terminando em ±90°. Para evitar dupla rotação, o grupo **somente visual** deve compensar `bodyYaw - authoredHipsYaw` durante o clip; ao sair, transferir o yaw para o grupo de apresentação e fazer blend para ready. Nunca escrever na raiz/facing de combate. A base não persiste um instante próprio de início de giro; a política determinística de disparo/restore desse giro pertence ao resolver e continua pendente.
6. Os clips seguram o perfil de espingarda existente (wz.29 / Kar98k e mesmo wrist profile da wz.98a). Preservar precedência de MG34 prone, RKM, CKM montada, sentado, transporte/drag, ferido/morto e dos sockets/adaptadores especializados. Não aplicar estes grips genéricos por cima desses adaptadores. Não acrescentar disparos, dano, som/footsteps ou eventos de missão a partir das tracks.

## Verificação concluída

- **27/27 testes Node focados**: 12 novos + 15 existentes de soldiers/character assets. GLTFLoader/AnimationMixer reais em 36 combinações; 8.148 amostras a 240 Hz, incluindo interpolação entre keys; 5.374.964 avaliações de vértices das botas. Sem NaN, warnings de bindings, root motion ou alteração de comprimentos dos membros.
- Mínimo das solas: **+1,905 mm** sobre Y=0; drift máximo durante apoio compensando deslocamento nominal: **1,088 mm**; erro máximo dos wrist grips: **2,050 mm**. Loops têm endpoints iguais; reações recuperam; giros conservam a raiz e colocam primeiro o pé correto. Toda a skin visível foi verificada nas cinco fases em todos os modelos.
- Duas gerações temporárias reproduzem GLB e manifesto **byte a byte**. `invariance.json` compara hashes de todos os ficheiros protegidos da base; source/runtime/gameplay/GLBs originais/dependências/workflows intactos.
- Build PASS; permanece o aviso existente de chunk JS >500 kB. Sem mudança de código runtime. Browser Chromium 153/SwiftShader: zero erros; draw calls da galeria **32 → 32** ao adicionar a cena do pacote (zero meshes).
- 30 capturas comparativas em 0/25/50/75/100%, cada uma com frontal/lateral; 36 capturas PL/DE × LODs × clips; seis MP4 a 30 fps; 24 sheets. Foi feita inspeção visual das cinco fases, das variantes e dos frames cronológicos extraídos dos MP4 finais. [Revisão visual](visual-review.md), [índice das provas](README.md) e [galeria](gallery.html).

## Falhas corrigidas e limites

As primeiras trajetórias de sprint foram rejeitadas por alcance excessivo do IK e drift de apoio. O clip final usa compressão de quadril e recuperação limitada, sem clamp dos alvos. A amostragem foi aumentada de 120 para 240 Hz para verificar interpolação real. O primeiro lote de vídeos de evidência ficou estático por `LoopOnce` pausado depois do frame final; foi rejeitado e substituído. O viewer agora reset/play antes de cada seek, compara amostras em ordem inversa e exige várias poses distintas em cada vídeo.

Nenhum clip final foi omitido por falha detectada. A avaliação artística humana do Capitão permanece pendente: testes estruturais não certificam naturalidade. As sequências finais foram inspecionadas por frames cronológicos, sem alegar playtest humano, mocap, equivalência artística a CoD ou medição de FPS. O rig/skin/roupa/faces originais limitam o detalhe e LOD2 mantém a simplificação existente.

Blends entre estados, slopes/terrain IK, variantes de reação, políticas de giro, máscaras upper-body, footsteps e integração especializada não foram implementados. A biblioteca oferece um ciclo por gait, sem prometer variação antirrepetição para multidões. Não foram executadas suites completas Node/browser: esta entrega de assets usa os testes focados acima. O resultado histórico 343/344 da base aprovada continua documentado no handoff da tarefa anterior; não é uma nova execução nesta branch.

Main/deploy/base aprovadas preservadas, sem merge, dispatch ou integração no renderer. A próxima tarefa é a implementação do Animation Resolver após revisão desta biblioteca.
