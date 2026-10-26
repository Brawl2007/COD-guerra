# M02 — revisão das armas e apresentação

Data: 2026-10-26. Base: `9385b2d`. Esta revisão distingue dados preliminares, código realmente usado e decisões de gameplay; não certifica reprodução histórica ou qualidade AAA.

## Fontes e limites

Lidas nesta etapa: fichas locais `research/weapons/kb_wz29.md`, `kb_wz29.profile.json`, `mg34.md`, `rkm_wz28.md`; código Wz29/M02/áudio; manifestos e revisões de assets M01. As fichas MG34/wz.28 assinalam investigação preliminar por resumos, não leitura integral dos manuais originais. As incertezas sobre variantes, equipamento e medidas continuam abertas. O novo PROMPT MESTRE integral ainda não chegou.

Foi estudada a matriz local WaW/WWII: legibilidade da arma, mecânica que acompanha o disparo, assinaturas sonoras, inimigos a distância jogável e ritmo irregular de cobertura/flanco. As URLs oficiais consultadas (`https://store.steampowered.com/manual/10090/`, `https://www.callofduty.com/wwii/campaign`) foram bloqueadas pelo proxy com 403; não se afirma leitura externa nem comparação jogada. Não se usam ficheiros, malhas, animações ou sons de COD.

## Identidade e integração

| Arma | Identidade documental/preliminar | Implementação preservada | Lacuna verificada / direção |
| --- | --- | --- | --- |
| kbk wz.29 | Mauser polaco, ferrolho, carregador interno de 5, clipe; 1,10 m segundo T21 preliminar. Alavanca reta distingue-a da Kar98k. | Classe Wz29 da M01: ciclo 1,05 s, recarga vazia por clipe 3,4 s e parcial cartucho a cartucho; viewmodel/rig/mãos/sockets e áudio próprios. Valores de tempo são gameplay. | O controlador M02 passava `exactAim=true` também no jogo. Corrigir para a dispersão M01/ADS; preservar tiro exato apenas nas chamadas da bancada. Alça continua referência sem queda balística: não anunciar balística inexistente. |
| MG34 | 7,92 mm, manga perfurada, alimentação lateral e bípode; ficha preliminar: 1,219 m, 800–900 rpm. | GLB M01 com LOD, tampa, alavanca, tambor/cinta e clips. Usar intervalo M01 de 0,075 s dentro da rajada; janela tática separada de 2,1 s. | Cinco rondas eram aplicadas simultaneamente, enquanto áudio tocava espaçado. Havia ainda outro emissor B02. Separar rondas no relógio da simulação e remover o emissor fantasma. Postura de apoio/deitado e servente continuam a avaliar em C02. |
| rkm wz.28 | Browning polaca de 20 cartuchos, gas-operated/ferrolho aberto segundo ficha preliminar; 1,11 m, cerca de 600 rpm. | Arma e equipamento M01, carregador animado, alavanca, bípode e família de clips `rkm_*`. | D1 separou as quatro rondas do baseline. D2 passa a três rondas a 0,10 s, acompanhando o clip M01 de três impulsos; conserva a janela tática. Checkpoints D1 com quatro rondas pendentes continuam as quatro, sem perda ou duplicação. |
| MP38 | Arma alemã do período, caixa de 32; não substituir por MP40. A confirmação primária de variante e acessórios permanece pendente. | Silhueta original do projeto de 0,833 m, dois LODs, socket M01 e perfil sonoro próprio; nenhuma extração de jogos. | Malha ainda simplificada e pose de espingarda adaptada; falta revisão de apoio das mãos/recarga própria. Intervalo M02 de 0,11 s é afinação de gameplay, não medição histórica. Exigir três eventos/rondas reais, não um dano instantâneo de três tiros. |

## Contratos de D1

- Capacidade, reserva e consumo por ronda continuam no estado serializável do ator. A fila de rajada guarda alvo conhecido, ponto observado, próxima ronda e fim do ciclo. Não segue coordenadas ocultas do alvo.
- Cada ronda volta a consultar obstrução/atores. Fechar uma porta depois do primeiro tiro impede dano posterior. A arma não recebe dano/munição do renderer.
- Pausa não avança o relógio. Restauro a meio da rajada reproduz munição, eventos, dano e RNG; save antigo sem fila permanece compatível e fila corrompida é rejeitada antes de mutação.
- Eventos por ronda alimentam o AudioManager M01 e os timestamps dos clips/muzzle flashes. O som não anuncia rondas futuras que a simulação ainda não disparou.
- Dano, tamanho de carregador, reservas, número de inimigos, checkpoints, falas protegidas e ponte M03 não são reduzidos para fazer o percurso passar.

## Revisão visual seguinte

Capturar a wz.29 em repouso/ADS/disparo/ciclo/recarga vazia e parcial, MG34 a dominar o eixo da estrada, wz.28 a fixar a posição e MP38 a curta distância. Medir contactos de mãos, boca do cano, recuo, caudas de áudio e oclusão; distinguir fotografia de fixture de percurso jogado. Aplicar a C01–C02 antes de expandir outras cenas. Escala e licenças já verificadas não substituem revisão da atuação, composição e leitura dos inimigos.

## Aplicação D2

Adaptador M02 herda M01Characters sem modificar fontes M01. A preparação de Lis/Gruca, tiro, mira e recargas agachadas reutilizam a parte superior dos clips existentes e a base `crouched_idle`. Os ossos reais são `thigh/calf/foot/ball`; arma e clipe estão na raiz do rig e recebem a transformação rígida das ancas para preservar contacto com as mãos. Testes carregam os GLB reais e medem pés/ancas e distâncias arma–mãos em vários instantes; clips originais permanecem idênticos. Recargas percorrem o clip completo no tempo da simulação, sem deslizar durante navegação. MP38 deixa de executar ferrolho de espingarda; a recarga rkm adaptada e o carregador estático MP38 continuam lacunas explícitas.

Tiro NPC consulta também a obstrução desde a boca do cano com a função espacial M01: ver o alvo acima do parapeito não permite disparar através dele. Recuo de câmara da wz.29 usa `weaponRecoil` M01 e respeita redução de movimento; não altera mira física/dano. Rajadas conservam agora o instante inicial para não reiniciar o clip a cada ronda. MG34 continua com apoio em pé/agachado; servente/deitado específico não fica aprovado por esta entrega.

Inspeção ADS revelou outro desvio da integração: a M02 calculava a arma com FOV 68° e desenhava-a copiando o zoom da câmara do mundo (48° em ADS). Reposto o contrato M01: câmara própria de 58°, near 0,03 m/far 6 m, mesma lente enviada ao viewmodel; só o mundo faz zoom. Regressão carrega o FP GLB real e mede alinhamento da mira/subpixel e independência da projeção em hip/ADS. Não é reconstrução de mãos ou alteração dos assets partilhados.

## Análise mecânica e de implementação

### kb wz.29 — jogador e NPC não têm o mesmo contrato temporal

O jogador usa `Wz29` M01: cinco no carregador, reserva inicial 40, `READY → BOLT_CYCLE → READY`. Até o último cartucho passa pelo ciclo de 1,05 s. Recarga de clipe apenas vazia (3,4 s); parcial é de 0,8 s por cartucho, interrompível se já existir munição no carregador. Estes são tempos de jogo. O NPC wz.29 conserva o perfil M02: dano 58, ciclo 1,35 s e recarga 2,6 s. Não se uniformizaram os números para esconder divergências; o clip NPC é normalizado ao respetivo intervalo de recarga.

O clip `fire_bolt` dura aproximadamente 1,17 s. Os marcadores M01 de abertura (0,43 s), ejeção (0,60 s) e câmara fechada (1,00 s) são frações desse clip aplicadas ao ciclo autoritativo: aproximadamente 0,386 / 0,538 / 0,897 s após o tiro. Na recarga por clipe, a ejeção visual do clipe ocorre aos 2,45 s; a disponibilidade final de munição continua a ser decidida pela classe Wz29, não por um callback de animação.

O fallback real é raio instantâneo com dispersão angular. A implementação sorteia uma banda total de 2,5° na anca e 0,05° em ADS, acrescentando 0,6° em movimento; não são cone/meia amplitude nem precisão medida da arma real. `aimSuppressedAdd` e os valores de recuo da ficha são intenções documentais; não afirmar que todos são consumidos pela classe. A alça tem presets 300/500/800/1000 m, mas não implementa queda ou tempo de voo. Dispersão, consumo e dano nunca são decididos pelo viewmodel.

Mira geométrica M01: alça `[0,0.056,-0.29]`, lâmina `[0,0.065,-0.752]`, boca `[0,0.032,-0.765]` no osso da arma. O teste de adaptação usa o GLB FP real e exige alinhamento inferior a 0,5 pixel. Isso prova alinhamento, não qualidade das mãos: segmentos/dedos ainda exigem intervenção artística.

### MG34 — cadência dentro da rajada, janela tática e implantação

O asset M01 tem sete marcadores: 0 / 0,075 / 0,150 / 0,225 / 0,300 / 0,375 / 0,450 s. A M02 usa cinco rondas, idealmente até 0,300 s, dentro de uma janela tática de 2,1 s. Com ticks de 50 ms, a entrega causal ocorre no primeiro tick elegível: por exemplo 0 / 0,10 / 0,15 / 0,25 / 0,30 s. Essa quantização existe no estado do jogo; não se anunciam 800 rpm sustentadas a partir do intervalo entre rajadas.

O clip tem tampa, tambor, cinta e alavanca. Os marcadores de recarga M01 incluem abertura 0,85 s, saída do tambor 1,35 s, montagem do novo 2,50 s, cinta 2,80 s, fecho 3,20 s e alavanca 3,60/3,90 s num clip de 4,4 s; M02 normaliza-o à sua recarga de 4,0 s. A origem especial B02 fica na abertura oeste, `[11.82,1.42,-30]`, e o arco é limitado. Fotografar a fachada norte não demonstra o setor da MG.

A inspeção interior confirma implantação e auxiliar próximos do apoio de madeira, com possível interpenetração visual. Um servente a alimentar/deitar-se precisa de postura física e espaço próprios antes de reutilizar os clips M01 `mg34_loader_prone_*`; não colocar uma animação deitada num combatente cujo estado/hitboxes continuam de pé. Esse trabalho não foi declarado concluído.

### rkm wz.28 — apoio da secção

Vinte cartuchos, três rondas novas por rajada de 0,10 s, ciclo tático de 1,55 s. Após seis rajadas completas sobram dois cartuchos: a seguinte só pode emitir esses dois, sem fabricar uma terceira ronda. Checkpoints D1 com quatro rondas pendentes mantêm as quatro e respetiva munição/RNG. A recarga M02 de 3,2 s é uma decisão de gameplay; a seleção usa o clip especializado, não o ferrolho de espingarda.

Modelos/kit e clips `rkm_walk/run/aim/crouched_idle/fire_burst/reload` pertencem à M01. A M02 adapta a base agachada e conserva ancas/pés; o osso raiz da arma recebe a mesma transformação rígida que os braços. Usar apenas deslocamento vertical quebrava os contactos. A versão deitada/bípode já existe na biblioteca M01, mas exige contrato físico de postura antes de aparecer em combate M02. Não duplicar a arma ou o mixer para a introduzir.

### MP38 — distinguir identidade, proxy e funcionalidade disponível

O modelo original do projeto mede 0,833 m no eixo longitudinal, com origem na empunhadura e boca em `[0,0.032,-0.5]`; LOD0 548 triângulos, LOD1 236. A construção usa o pipeline determinístico M01, aço/Bakelite aproximados por materiais PBR de cor por vértice. A forma é reconstrução visual; dimensões/acessórios de variante ainda precisam de referência primária. Não substituir por MP40 ou importar malhas de COD.

A capacidade é 32, rajada de três a 0,11 s e janela tática de 1,45 s, com recarga 2,7 s. O intervalo de 0,11 s é afinação M02. O perfil áudio M01 mantém o default de 0,09 s para as chamadas antigas; os novos eventos M02 passam a sua própria cadência e uma ronda por evento. A animação automática reaproveitada evita o gesto de ferrolho de Mauser, mas o suporte da mão esquerda, a extração/inserção de carregador e a atuação específica MP38 continuam incompletos. Não basta esconder a espingarda e chamar essa recarga final.

### Áudio, efeitos e fronteira de autoridade

Só a wz.29 está atualmente nas mãos do jogador; MG34/wz.28/MP38 são usadas pelos NPC. Não se implementou nem anunciou recolha/troca de quatro armas. Cada ronda NPC emite munição consumida, origem/ponto observado, índice e timestamp; áudio, impulso animado e clarão leem esse evento. A fila não segue um alvo oculto e volta a consultar a obstrução. Morte/desarme/recarga ou supressão elevada interrompem-na sem consumir rondas futuras.

AudioManager M01 conserva perfis de crack/corpo/mecânica/caudas, distância e espacialização. Na adaptação, oclusão sólida aplica filtro de 1200 Hz e ganho 0,4 por fonte, depois repõe o contexto. O pico gravado no navegador confirma sinal audível após gesto; a qualidade artística e inteligibilidade não foram ouvidas/aprovadas por uma pessoa. Passos ainda usam cadência temporal no adaptador M02, com `player.moving` vindo do input: verificar passos contra paredes e preferir o percurso/odómetro partilhado M01 numa próxima integração, sem fazer o áudio alterar o estado físico.
