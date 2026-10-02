# Novas tarefas para Claude — equipa MG34 e dano dos vagões

Pedido adicional do utilizador em 2026-10-02. A ckm wz.30 já foi entregue no PR #31 e aguarda revisão; a especificação está preservada em `docs/CLAUDE_CKM_TASK_REFERENCE.md`. Não repetir rkm, Ju 87, vagões intactos, MG34 de pé ou ckm.

Continuar **Brawl2007/COD-guerra**, sem reiniciar. Partir de `codex/m01-runtime` actualizado, ler `AGENTS.md` e consultar apenas os contratos dos assets afectados. Entregar dois PRs independentes para staging, nesta ordem. Usar branches novas; não reutilizar as branches dos PRs #25/#28/#29/#30/#31.

## 1. Prioridade: MG34 deitada, atirador e municiador

Branch sugerida: `claude/m01-mg34-prone`. Reutilizar o kit MG34 do #30 e o rig alemão existente. Ler `docs/assets/m01-mg34/README.md`, o manifesto da arma e o contrato dos soldados. Preservar a arma, os LODs e os clips de pé byte a byte.

- Criar clips novos `mg34_prone_enter`, `mg34_prone_idle`, `mg34_prone_aim`, `mg34_prone_fire_burst`, `mg34_prone_reload`, `mg34_prone_exit`. Para o municiador: `mg34_loader_prone_idle`, `mg34_loader_prone_feed`, `mg34_loader_prone_leave`. Não substituir nomes existentes.
- Uma só MG34 presa ao osso `weapon`, bípode aberto com pés no chão; esconder Kar98k/clipe e bípode dobrado. Prender a arma antes de criar as acções do mixer.
- Corpo apoiado, cotovelos/joelhos no solo, mãos nas pegas, face na coronha e cano livre. Entrada/saída sem saltos de raiz ou membros a atravessar o chão; documentar contactos aproximados.
- Rajada de sete tiros, eventos separados por 0,075 s, conforme o contrato actual. Documentar janela de disparo e interrupção após quatro/seis tiros. Eventos de clips descrevem apresentação; não causam dano, tiros ou gasto de munição.
- Recarga deitada com tampa, tambor, cinta e alavanca; municiador entrega o tambor em tempo coordenado. Manter o sistema de tambor do kit. Documentar qualquer limite em vez de criar regras de combate.
- Demonstrar ambos na galeria. A dupla é uma proposta visual, sem identificar pessoas históricas ou alterar o número de actores da missão.
- Novas pastas: `assets/models/provisional/m01/weapons/mg34-prone/`, `tools/assets/m01-mg34-prone/`, `docs/assets/m01-mg34-prone/`; teste `tests/m01-mg34-prone-glb.test.js`. Reutilizar funções existentes sem editar geradores partilhados.

Manifesto: clips/durações/eventos, escala, raiz/offsets da dupla, nós/sockets, postura/bípode, fontes/estimativas, autoria/licença e hashes dos assets reutilizados. Capturas: corpo inteiro lateral/frontal, bípode/cotovelos, mãos/face, início/fim da rajada e pelo menos seis instantes da recarga. Testar alvos no rig actual, valores finitos, quaterniões normalizados, ligação das peças móveis e reprodução do mesmo frame após pausa/restauro do tempo do mixer. A galeria não implementa `pose: prone` na engine; integração com o Codex.

## 2. Depois: estados queimado/danificado dos vagões

Branch sugerida: `claude/m01-wagon-damage`. Partir da staging, não da branch da tarefa 1. Ler `docs/assets/m01-wagons/README.md` e o manifesto. Preservar os vagões intactos do #29 byte a byte.

- Variantes **queimada** e **danificada** para coberto e aberto, cada uma com LOD0/1/2. Madeira carbonizada, metal escurecido/deformado e tábuas/painéis partidos devem dar leitura de dano; não apenas pintar tudo de preto.
- Conservar origem no topo do carril, metros, +Y vertical, frente −Z, passo de 9,10 m, pivôs dos rodados e sockets de engate/fogo/fumo. Separar peças partidas como nós quando útil; sem física/temporizadores de gameplay.
- Máximo 2500 triângulos visíveis no LOD0, redução por LOD e materiais/texturas limitados. Registar triângulos, draw calls, bytes e alterações da bbox; colisão futura não deve ser inferida de uma peça visual partida.
- Não criar locomotiva/inscrições. P16 continua aberta: variantes genéricas para composição, sem afirmar quais vagões históricos arderam ou foram atingidos.
- Novas pastas: `assets/models/provisional/m01-wagon-damage/`, `tools/assets/m01-wagon-damage/`, `docs/assets/m01-wagon-damage/`; teste `tests/m01-wagon-damage-glb.test.js`. Não editar o kit original.
- Galeria: intacto/queimado/danificado lado a lado, interiores, rodas/engates, sockets, três LODs e leitura do LOD2 à distância. Testar importação, valores finitos, escala, sockets/pivôs e orçamentos. Documentar estados disponíveis/limitações.

O evento `station_wagon_fire` e a escolha do vagão pertencem à simulação. Não adicionar fogo/fumo autónomo, detonar vagões, editar mapa, inventar vagão-alvo ou alterar coberturas/colisão.

## Limites comuns e entrega

Ferramentas gratuitas, arte original/licenciada, sem extracção de jogos. Não alterar `src/`, engine, combate, saves, RNG, checkpoints, relógios, demolições, mapa, bancada francesa, workflows, Graphify ou assets existentes. Alterações mínimas de créditos/status devem ser descritas separadamente. Modelos/poses continuam provisórios.

Guardar fonte reproduzível, manifesto, relatório real de importação e capturas inspeccionadas. Executar testes dos assets afectados, `npm test` e `npm run build`, indicando contagens reais e limites. Não declarar playtest humano, FPS no Chromebook, historicidade final ou ligação ao runtime a partir da galeria. Um PR pequeno por tarefa para `codex/m01-runtime`. Merge em main, publicação e `workflow_dispatch` pertencem ao utilizador.
