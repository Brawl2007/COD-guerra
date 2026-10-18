# COD-guerra — SISTEMA DE DIÁLOGOS HUMANOS REATIVOS E CONTRATOS DE CENA · V3

> **GUIA DE PRODUÇÃO / NÃO IMPLEMENTADO.** Nenhum ficheiro de áudio, sistema de voz, `mission.json` ou handler da simulação foi alterado. As 90 falas abaixo são **exemplos editoriais** para revisão, não falas canónicas nem texto para inserir automaticamente. Onde existir diálogo com ID fixo — especialmente M01 — prevalece sempre o roteiro e o estado real do projeto.

## Objetivo

O soldado não deve parecer uma máquina que diz sempre «Recarregando!» ou «Mais inimigos!» sem olhar para nada. Quero **voz relacionada com pessoa, lugar, observação e memória**, em três fases: antes do perigo, quando algo muda, depois da consequência.

A voz precisa de parecer humana: raiva, gaguejo por cansaço, intervenção rápida quando um aliado perde autocontrolo, silêncio e ajuda sem espetáculo. A mesma personagem pode estar com medo e ainda agir com disciplina. O sistema de diálogo não deve premiar violência contra rendidos ou civis.

## 1. Contrato mínimo de cada fala futura

```text
speech_id              id estável e único por missão
mission_id             M01...M30
speaker_actor_id       ator real existente ou substituto declarado
addressee_actor_id     destinatário opcional, dentro de alcance/plausibilidade
required_world_flags   estado/evento da simulação (não derivar de posição de câmera)
required_actor_state   vivo, presente, capaz de falar, não incapacitado, não evacuado
prohibited_flags       impede contradições (morto, cena concluída, outro locutor ativo)
spatial_origin         actor real na cena; rádio é explicitado como tal
priority               mission_critical > danger > response > ambient
cooldown               entre falas repetíveis, sem spam; importante não repete depois de executada
interruption_policy    pausar/suprimir/finalizar se explosão, morte, alteração de setor, reload ou skip
subtitle_timing        leitura e acessibilidade, sem sobrepor ordens de proteção
delivery_style         ritmo, volume, respiração e gesto, sem caricatura de sotaque
fallback               informação obrigatória entregue por ator apropriado ou UI se o original faltou
persisted_seen_flag    um evento canónico não é duplicado por reload/skip
```

**Todos os campos acima são CONTRATO DE DESIGN, não schema atual.** Investigar componentes reais de diálogo/mission/director antes de alterar código. A implementação deve usar nomenclatura e persistência compatíveis, com testes de determinismo existentes.

## 2. Seis camadas de fala com exemplos de prioridade

| Camada | Prioridade | Quando | Regra |
|---|---|---|---|
| Ordem de proteção | Altíssima | Fogo, explosão, saída perigosa, perigo visível | Nunca escondida por conversa pessoal. Precisa indicar direção/objeto percebido. |
| Estado de missão | Alta | objetivo/rota/retirada muda | Ligado ao evento real e ao estado de setor. |
| Intervenção moral | Alta quando ocorre | Aliado ameaça prisioneiro ou civil, agressão interna | Deve acontecer como ação física e fala curta; não repetir três vezes depois de concluído. |
| Resposta a personagem | Média | um aliado pede ajuda, acusa, brinca ou confessa medo | Presença, proximidade e memória importam. |
| Ambiente e vida | Baixa | pausa segura, viagem, espera | Máximo de 1–2 falas por local/intervalo; uso de silêncio é válido. |
| Pós-consequência | Média, não urgente | algo mudou no mundo | Falas de luto, alívio ou incerteza só quando ator realmente sabe. |

## 3. Regras de atuação e áudio

- Quem fala **continua a cumprir tarefas**. Uma chamada por rádio não faz o NPC largar arma e virar-se para a câmara sem motivo.
- Reações a mortos, feridos e desaparecidos respeitam estado. Ninguém chama “morto” a alguém que permanece `missing` sem confirmação.
- NPC em combate nunca identifica uma pessoa ou posição fora do seu campo de percepção apenas porque o roteirista sabe.
- Gesto de impedir abuso significa mão a afastar arma, postura, proximidade e outro ator sob risco. Não basta uma legenda moralista com soldados imóveis.
- Os companheiros recordam gestos/objetos só quando plausível, sem memória coletiva mágica de eventos que não presenciaram.
- Em primeira pessoa, a câmara pode permanecer livre; trabalhar **micro-encenação**: olhos que olham para alguém, pausa, respiração, mão que quase falha a pegar num objeto.
- Som espacial: voz no mundo, rádio com distorção moderada, vento, reverberação por interiores e obstáculos; avisos necessários sempre legíveis.
- **Voz e línguas:** usar idioma original conforme investigação e localização; legendas portuguesas. Não fazer imitação caricatural de sotaques, nem copiar gravações/vozes de jogos conhecidos. Originalidade e licenciamento explícitos.
- Quantidade: silêncio intencional e sons de guerra ao redor são permitidos. Diálogo não deve comentar cada disparo para parecer vivo.
- Versão reduzida de violência preserva diálogo e consequência; não substitui crimes de guerra por humor.

## 4. Exemplo de comportamento moral (M28 — «A porta aberta»)

**Condicional de pré-produção:** cenário ficcional e setor histórico validados. O jogador vê um combatente alemão depor arma e render-se; outro soviético levanta arma por fúria. A custódia do rendido deve ser um estado real, com regras de alvo distintas do combate.

**Modelo de execução e não garantia de motor atual:**
- T0: som de arma a cair e silhueta desarmada; a simulação atualiza estado de rendição. `pow_event_started`.
- T+0.5: aliado furioso aproxima-se e ergue o fuzil, com expressão/atuação distinta.
- T+1.5: camarada coloca a mão no cano ou no antebraço, «Largou a arma. Baixa a tua.»
- T+3: Orlov pode aproximar-se ou ordenar contenção se o jogador tiver input real; em modo estritamente cinematográfico, o camarada interrompe independentemente. **Não criar uma janela falsa de salvamento.**
- T+5: o rendido é levado sob guarda, o soldado furioso recua. A cena termina quando custódia e actores estão seguros, não quando relógio expira arbitrariamente.
- Posteriormente: no cessar-fogo real de 2/5, a arma do mesmo homem baixa antes da ordem; a memória visual substitui um monólogo.
- `pow_event_done`, `pow_custody_confirmed`, `ally_deescalated` são **nomes exemplificativos** para um futuro contrato de dados, não IDs existentes.

**Falhas a evitar:** disparar em prisioneiro para ganhar objetivo; render-se com arma ainda ativa; prisioneiro duplicado após reload; aliado zangado repetir impulso três vezes; jogador tentar intervir mas input desativado sem aviso; execução filmada como troféu; atribuir a conduta fictícia a unidade histórica concreta sem fontes.

## 5. Biblioteca de exemplos por missão — 90 falas propostas

### M01 — Zieliński / Kowal / Jan

- **Antes / apresentação pessoal:** KOWAL: «Hoje deram-nos café. Isso não costuma trazer boas notícias.»
- **Durante / mudança concreta no mundo:** ZIELIŃSKI: «Wrona, no chão. Agora!»
- **Depois / consequência reconhecida:** ZIELIŃSKI: «Diga os nomes devagar.»
- **Condição de continuidade:** Nowicki desaparecido; evitar falas contraditórias com caneca e roteiro canónico.
- **História e técnica:** M01 SCRIPT.md tem falas/IDs fixos. Estas linhas **são exemplos rejeitáveis**, não substituição dos IDs existentes.

### M02 — Piotr / Lis / graduado

- **Antes / apresentação pessoal:** LIS: «Daqui ainda vejo a estrada de casa.»
- **Durante / mudança concreta no mundo:** GRADUADO: «A direita saiu. Preparem a passagem.»
- **Depois / consequência reconhecida:** PIOTR: «Antes seguíamos a estrada. Agora seguimos os últimos.»
- **Condição de continuidade:** Lis presente/ferido/evacuado/ausente segundo estado do capítulo.
- **História e técnica:** Não sugerir retirada antes da ofensiva canónica.

### M03 — Piotr / morador / defensor

- **Antes / apresentação pessoal:** MORADOR: «A porta só fecha deste lado. Não a deixe aberta.»
- **Durante / mudança concreta no mundo:** DEFENSOR: «Pelo pátio. A rua já não serve!»
- **Depois / consequência reconhecida:** PIOTR: «Há pessoas lá em baixo. Primeiro elas.»
- **Condição de continuidade:** Família e Lis só aparecem se disponíveis; estado civil opcional altera resposta.
- **História e técnica:** Não inventar capitulação prematura.

### M04 — Reed / Whitfield / marinheiro

- **Antes / apresentação pessoal:** WHITFIELD: «Consegue subir? Apoie-se em mim.»
- **Durante / mudança concreta no mundo:** MARINHEIRO: «Soltem aquela maca. Há espaço aqui!»
- **Depois / consequência reconhecida:** REED: «Continue a olhar para a costa. Só até sairmos.»
- **Condição de continuidade:** Se Whitfield não evacuou, não emitir linha a bordo.
- **História e técnica:** Nenhum barco espera indefinidamente.

### M05 — Malec / mecânico / ala

- **Antes / apresentação pessoal:** MECÂNICO: «Ouvi a vibração de ontem. Veja como regressa.»
- **Durante / mudança concreta no mundo:** ALA: «Estou a perder altura! Não vejo a costa!»
- **Depois / consequência reconhecida:** MALEC: «A máquina parou. As minhas mãos, ainda não.»
- **Condição de continuidade:** Ala danificado ou salvo/ausente e integridade da aeronave.
- **História e técnica:** Falas de rádio têm distorção e prioridade na aviação.

### M06 — Daniel / Ellis / Morrow

- **Antes / apresentação pessoal:** MORROW: «Há areia dentro de tudo, até da voz.»
- **Durante / mudança concreta no mundo:** MORROW: «Esse homem era do outro lado!» — ELLIS: «Agora precisa de ajuda.»
- **Depois / consequência reconhecida:** DANIEL: «Deixe-lhe a sombra. Depois voltamos ao posto.»
- **Condição de continuidade:** O inimigo não combate depois da rendição; condição de ferido médico mantém-se.
- **História e técnica:** Não criar cura instantânea ou recompensa moral.

### M07 — Orlov / Saveliev / Makarov

- **Antes / apresentação pessoal:** SAVELIEV: «Não tires a luva se não precisas.»
- **Durante / mudança concreta no mundo:** SAVELIEV: «Baixa. Não sabes quem está diante de ti.»
- **Depois / consequência reconhecida:** ORLOV: «A estrada ainda está aqui. Os homens é que faltam.»
- **Condição de continuidade:** Quem reaparece em 1945 depende de transferência/estado.
- **História e técnica:** Encontro de rendição ficcional sujeito a fonte/sector.

### M08 — Brooks / Henry Cole / Marsh

- **Antes / apresentação pessoal:** MARSH: «Estavam todos à espera de disparos.»
- **Durante / mudança concreta no mundo:** COLE: «Ainda não viste um inimigo. Não dispares por adivinhar.»
- **Depois / consequência reconhecida:** BROOKS: «Agora temos o campo. Quem traz comida?»
- **Condição de continuidade:** Brooks não é veterano de Okinawa ainda.
- **História e técnica:** Guadalcanal inicial com pouca resistência.

### M09 — Antonov / camarada / defensor

- **Antes / apresentação pessoal:** CAMARADA: «Quando chegar à outra margem, procure a minha voz.»
- **Durante / mudança concreta no mundo:** DEFENSOR: «Segurem a passagem para os barcos!»
- **Depois / consequência reconhecida:** ANTONOV: «Preciso de saber o nome do homem na maca.»
- **Condição de continuidade:** Os mortos/feridos/embarques persistem entre setores.
- **História e técnica:** A história do rio não pára para a conversa.

### M10 — Gromov / Rybin / graduado

- **Antes / apresentação pessoal:** RYBIN: «Esta máquina para quando se cala o eixo.»
- **Durante / mudança concreta no mundo:** GRADUADO: «Gromov! Por aqui, ainda há alguém vivo!»
- **Depois / consequência reconhecida:** GROMOV: «Ele mostrou-me aquela máquina. Não posso voltar lá.»
- **Condição de continuidade:** Rybin fala só antes da sua morte fixa.
- **História e técnica:** Não oferecer opção falsa para salvá-lo.

### M11 — Daniel / Fraser / Ellis

- **Antes / apresentação pessoal:** FRASER: «Quando a barragem começar, sigam o corredor.»
- **Durante / mudança concreta no mundo:** ELLIS: «Não passem sobre ele. Há um homem aqui!»
- **Depois / consequência reconhecida:** DANIEL: «Morrow, beba. O próximo trecho é nosso.»
- **Condição de continuidade:** Fraser/Ellis/Morrow conforme estado entre M06/M11.
- **História e técnica:** Barragem 21:40 no setor confirmado.

### M12 — Mercer / motorista / graduado

- **Antes / apresentação pessoal:** MOTORISTA: «O motor está a trabalhar. Não o quero desligar.»
- **Durante / mudança concreta no mundo:** MERCER: «Entra primeiro o grupo que não consegue andar.»
- **Depois / consequência reconhecida:** GRADUADO: «Escreva os que chegaram. Os outros ficam por confirmar.»
- **Condição de continuidade:** Grupos/veículos/feridos não se multiplicam em reload.
- **História e técnica:** Retirada pode ser histórica sem transformar aliadas em caricaturas.

### M13 — Demin / comandante / carregador

- **Antes / apresentação pessoal:** COMANDANTE: «Confirme a escotilha. Não quero ninguém solto.»
- **Durante / mudança concreta no mundo:** CARREGADOR: «Torre presa! Dê-me um segundo!»
- **Depois / consequência reconhecida:** DEMIN: «Chamem cada um. Não desliguem ainda o rádio.»
- **Condição de continuidade:** Tripulantes vivos/feridos e danos de torre.
- **História e técnica:** Comandos reais dependem de funções de tanque implementadas.

### M14 — Lane / Morgan / Price

- **Antes / apresentação pessoal:** MORGAN: «Lembrem-se: carro carregado vira devagar.»
- **Durante / mudança concreta no mundo:** PRICE: «Não é nossa estrada apenas. Dê-lhes passagem.»
- **Depois / consequência reconhecida:** LANE: «Se sairmos daqui, a carga chega. Eles ficam com a casa.»
- **Condição de continuidade:** Moradores e carga condicionais; Price não reaparece sozinho em M19 se evacuado.
- **História e técnica:** Jeep com passageiros reais, sem câmara que finge condução.

### M15 — Turner / socorrista / graduado

- **Antes / apresentação pessoal:** GRADUADO: «Os veículos da frente passaram. Nós não.»
- **Durante / mudança concreta no mundo:** SOCORRISTA: «Cubra-me até à água. Só até à água!»
- **Depois / consequência reconhecida:** TURNER: «Isto era dele. Guardem até sabermos.»
- **Condição de continuidade:** Vítima desaparecida não vira morte confirmada sem fonte narrativa.
- **História e técnica:** Distinguir LVT de embarcação convencional.

### M16 — Ostrowski / companheiro / carregador

- **Antes / apresentação pessoal:** COMPANHEIRO: «Ainda não acabei a carta.»
- **Durante / mudança concreta no mundo:** CARREGADOR: «Abram espaço na descida. Há um ferido!»
- **Depois / consequência reconhecida:** OSTROWSKI: «Guardo-a até desceres também.»
- **Condição de continuidade:** Carta só ligada ao seu portador ficcional; feridos não são curados instantaneamente.
- **História e técnica:** 17/18 de maio, cota 593 e equipamento do II Corpo.

### M17 — Nathan Cole / sargento / companheiro

- **Antes / apresentação pessoal:** COMPANHEIRO: «Contei cinco antes de saltarmos. E agora?»
- **Durante / mudança concreta no mundo:** NATHAN: «Espera. Não sabes quem está nessa sebe.»
- **Depois / consequência reconhecida:** SARGENTO: «Façam a chamada. Alguém vai responder.»
- **Condição de continuidade:** Equipa reunida durante o salto é a que fala.
- **História e técnica:** Nathan Cole é diferente de Henry Cole Marine.

### M18 — Lane / Bell / Price

- **Antes / apresentação pessoal:** BELL: «Sei quem está no barco. Mal vejo quem saiu.»
- **Durante / mudança concreta no mundo:** PRICE: «Não se mexam todos! Preciso da passagem!»
- **Depois / consequência reconhecida:** LANE: «Subimos. Agora ainda há homens lá em baixo.»
- **Condição de continuidade:** Price presente, ferido ou evacuado altera próxima cena.
- **História e técnica:** Fox Green e continuidade Omaha→Bocage.

### M19 — Lane / Morgan / rendido

- **Antes / apresentação pessoal:** MORGAN: «Não vês nada? Então espera por confirmação.»
- **Durante / mudança concreta no mundo:** ALIADO: «Depois de Omaha, queres deixá-lo sair?» — MORGAN: «Ele já largou a arma.»
- **Depois / consequência reconhecida:** LANE: «A estrada está livre. O homem ficou sob guarda.»
- **Condição de continuidade:** Rendido muda de AI de combate para custódia; não pontuar execução.
- **História e técnica:** Não copiar coreografia de WaW nem atribuir crime real ao grupo.

### M20 — Reed / socorrista / graduado

- **Antes / apresentação pessoal:** REED: «Da última vez também havia água à frente.»
- **Durante / mudança concreta no mundo:** SOCORRISTA: «Não posso levá-los todos de uma vez!»
- **Depois / consequência reconhecida:** REED: «Fiquem com eles. Nós abrimos o caminho.»
- **Condição de continuidade:** Whitfield só memória válida; feridos de Oosterbeek não teletransportados.
- **História e técnica:** 17→21→25 setembro, escassez real, sem falso resgate.

### M21 — Allen / carregador / graduado

- **Antes / apresentação pessoal:** GRADUADO: «Não assuma que conhece o vale. Confira a trilha.»
- **Durante / mudança concreta no mundo:** CARREGADOR: «O tronco caiu. Procurem passagem para a maca!»
- **Depois / consequência reconhecida:** ALLEN: «Um regressou. De outro ainda não sei nada.»
- **Condição de continuidade:** Caminho alterado por destroços; homens ausentes/missing não ressuscitam.
- **História e técnica:** Geografia e dano visíveis, sem morte invisível.

### M22 — Lewis / operador de rádio / motorista

- **Antes / apresentação pessoal:** OPERADOR: «Tenho resposta do posto da estrada. Não da colina.»
- **Durante / mudança concreta no mundo:** LEWIS: «Não o acusem. Ele transmitiu o que ouviu.»
- **Depois / consequência reconhecida:** LEWIS: «Estes chegaram. Dos outros ainda espero notícias.»
- **Condição de continuidade:** Setor perdido altera as fontes de rádio e atores.
- **História e técnica:** 16→17 dezembro e derrota local documentada.

### M23 — Bennett / companheiro / socorrista

- **Antes / apresentação pessoal:** BENNETT: «Guardei estas luvas para quando voltasse.»
- **Durante / mudança concreta no mundo:** SOCORRISTA: «Não há cobertores. Há um lugar longe do vento.»
- **Depois / consequência reconhecida:** BENNETT: «Agora és tu que precisas delas.»
- **Condição de continuidade:** Portador inicial das luvas ausente ou não; datas de Bastogne/Foy preservadas.
- **História e técnica:** Não copiar interpretações de Easy Company.

### M24 — Finch / socorrista / graduado

- **Antes / apresentação pessoal:** GRADUADO: «É areia, mas não conseguimos correr nela.»
- **Durante / mudança concreta no mundo:** SOCORRISTA: «Não dispare às cegas. Preciso de passar!»
- **Depois / consequência reconhecida:** FINCH: «Estava aqui. Foi aqui que o vimos.»
- **Condição de continuidade:** Companheiro desaparecido permanece incerto.
- **História e técnica:** 19/2 sem bandeira de 23/2.

### M25 — Hughes / engenheiro / graduado

- **Antes / apresentação pessoal:** GRADUADO: «Aquilo ainda está de pé?»
- **Durante / mudança concreta no mundo:** ENGENHEIRO: «Para trás da zona danificada. Deixem a passagem livre!»
- **Depois / consequência reconhecida:** HUGHES: «Se o próximo grupo atravessa, fazemos a nossa parte.»
- **Condição de continuidade:** Ponte danificada mas utilizável, não colapsada a 7/3.
- **História e técnica:** Colapso em 17/3 no debrief.

### M26 — Brooks / Henry Cole / Marsh

- **Antes / apresentação pessoal:** MARSH: «Eu esperava outra coisa desta praia.»
- **Durante / mudança concreta no mundo:** COLE: «Baixa a arma. São civis.»
- **Depois / consequência reconhecida:** BROOKS: «Não sei o que há a sul. É por isso que vamos ver.»
- **Condição de continuidade:** Família civil preserva receio sem converter em favor RPG.
- **História e técnica:** Desembarque inicialmente pouco contestado.

### M27 — Orlov / Makarov / jovem

- **Antes / apresentação pessoal:** MAKAROV: «As baterias à esquerda continuam. Não vejo a outra linha.»
- **Durante / mudança concreta no mundo:** ORLOV: «Não confundas o homem no chão com o ataque todo.»
- **Depois / consequência reconhecida:** JOVEM: «Pensei que chegávamos hoje.» — ORLOV: «Chegámos aqui.»
- **Condição de continuidade:** Makarov só se presente após percurso de guerra.
- **História e técnica:** Seelow 16/4 não é queda final de Berlim.

### M28 — Orlov / aliado furioso / camarada

- **Antes / apresentação pessoal:** ALIADO: «Hoje acaba. Só quero que acabe.»
- **Durante / mudança concreta no mundo:** ALIADO: «Ele pode render-se agora?» — CAMARADA: «Largou a arma. Baixa a tua.»
- **Depois / consequência reconhecida:** ORLOV: «Confirmaram a ordem. Deixem de disparar.»
- **Condição de continuidade:** Prisioneiro rendido não é alvo, cessar-fogo aplica-se uma só vez.
- **História e técnica:** Cena ficcional e original, não copiar WaW; 2/5 separa ordem de rendição do encontro.

### M29 — Brooks / Henry Cole / Gray

- **Antes / apresentação pessoal:** COLE: «Sem pressa cega. Ainda há homens na passagem.»
- **Durante / mudança concreta no mundo:** BROOKS: «Não os persigas! Ajudem a tirar o Cole!»
- **Depois / consequência reconhecida:** GRAY: «Continuem a passar as macas. Ainda não acabámos.»
- **Condição de continuidade:** Cole ferido/evacuado; não fala em combate depois de sair.
- **História e técnica:** Shuri abandonado no setor após 29/5; limites de unidade pesquisados.

### M30 — Cross / marinheiro / sobrevivente epílogo

- **Antes / apresentação pessoal:** MARINHEIRO: «Passei meses à espera da próxima ordem.»
- **Durante / mudança concreta no mundo:** CROSS: «É estranho que ninguém esteja a disparar.»
- **Depois / consequência reconhecida:** SOBREVIVENTE: «Vamos começar por esta parede.»
- **Condição de continuidade:** Epílogos condicionais por local e ator, sem unir todos ao Missouri.
- **História e técnica:** Cerimónia historicamente validada; não usar falas reais sem fonte/licença.


---

## 6. Critérios de aprovação e testes que ainda faltam

**Revisão textual:**
- [ ] Revisão de originalidade e de cronologia (incluindo idioma e relação entre ator e destinatário).
- [ ] Diálogo não contradiz roteiro canónico nem estados de missão já existentes.
- [ ] Cada fala tem razão de existir e local adequado; cortar linhas que só repetem objetivos no HUD.
- [ ] Há trechos silenciosos; pelo menos três NPCs de cada elenco recorrente soam distintos.
- [ ] Rendidos/civis têm estado próprio, não são alvos de pontos.

**Só após implementação real no motor:**
- [ ] Falas de morto/evacuado não disparam, inclusive após skip, checkpoint ou troca de LOD.
- [ ] Eventos críticos ocorrem uma única vez e não duplicam atores/prisioneiros.
- [ ] Música e tiros não ocultam ordem que salva o jogador; subtítulos permanecem legíveis.
- [ ] A câmara e input funcionam durante micro-encenação; animações de braços/rostos reais sincronizam as falas.
- [ ] Respiração/reação alteram-se por estado, não por animação genérica aleatória.
- [ ] Playtest humano reconhece medo, raiva e ajuda sem depender de texto explicativo pós-missão.
- [ ] Equipamento, fardas e atos relevantes para crimes reais exigem pesquisa antes de finalização.
- [ ] Comparação da mesma cena com opção de violência gráfica reduzida mantém clareza e respeito.

**Entrega actual:** 90 exemplos de linhas, 30 sets de guardrails, 0 linhas inseridas no jogo, 0 sessões de playtest.
