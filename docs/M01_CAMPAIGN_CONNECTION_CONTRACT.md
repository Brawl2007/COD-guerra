# M01 — Contrato de conexão com a campanha M02–M30

Estado: **DIREÇÃO NARRATIVA / NÃO ALTERAR RUNTIME DURANTE O DESENVOLVIMENTO ATUAL DE M01**

Objetivo: evoluir M01 para funcionar como primeiro capítulo de uma campanha de 30 missões sem reescrever ou desestabilizar o protótipo jogável já em desenvolvimento.

## Regra principal

M01 continua sendo **A Primeira Manhã**, uma história fechada sobre Tczew e a secção de Jan Wrona.

Ela NÃO precisa:
- trazer Piotr Sokół para Tczew;
- fazer Jan aparecer em Bzura;
- introduzir protagonistas das outras frentes;
- prever verbalmente batalhas futuras;
- adicionar cenas só para "montar sequências";
- alterar objetivos, relógios, demolições, checkpoints ou eventos já validados.

A conexão com a campanha acontece por:
1. tema;
2. linguagem cinematográfica;
3. estado persistente;
4. debrief/transição;
5. escala crescente da guerra.

---

# 1. Função de M01 dentro da campanha

M01 estabelece cinco regras emocionais que M02–M30 devem continuar:

### A. A guerra acontece antes de o jogador entendê-la
Nowicki ouve os aviões; o ataque começa; Jan reage.

Eco futuro:
- M22 começa em rotina e só depois a ofensiva das Ardenas se revela;
- M26 começa com um desembarque estranhamente quieto;
- M28 termina com o inverso: o jogador percebe o silêncio antes de entender que a luta está acabando.

### B. O jogador é parte da guerra, não o centro
Tczew tem setores S2/S3/S4/S5 funcionando fora da câmera.

Eco futuro:
- Bzura avança/recuará em vários eixos;
- Stalingrado continua em outros quarteirões;
- Seelow mostra forças à frente, atrás e nos flancos.

### C. Pessoas importam mais do que contagem de inimigos
Jan começa contando coisas e termina contando pessoas.

Eco futuro:
- M02 conta quem conseguiu voltar;
- M23 usa as luvas para representar ausência;
- M29 muda objetivo de terreno para evacuação de Cole;
- M30 lê quem sobreviveu, desapareceu ou ficou ferido.

### D. Objetos pequenos carregam memória
Caneca de Nowicki.

Eco futuro:
- chave de Lis;
- carta de Marsh;
- luvas de M23;
- outros objetos discretos, nunca colecionáveis arcade.

### E. Vitória local não é vitória estratégica
A ponte pode cumprir seu papel e a guerra continuar.

Eco futuro:
- Bzura consegue avanços locais e depois recua;
- Tobruk segura posição enquanto cerco continua;
- Omaha abre saída sem "vencer a Normandia";
- Remagen captura uma ponte sem encerrar o Reno.

---

# 2. O que permanece congelado enquanto M01 está em desenvolvimento

NÃO alterar por causa da campanha:
- 04:30 prelúdio;
- 04:34 bombardeio;
- Train 963 / Panzerzug 7;
- relógios/gates;
- demolição leste/oeste;
- Nowicki = `missing`;
- Bąk/Dudek branches;
- CP-A..D;
- ids de eventos existentes;
- schema 2;
- RNG;
- setores S1–S5;
- posição e função da chamada;
- duração e fluxo principal;
- contratos renderer/simulação.

Qualquer mudança futura nesses pontos exige task própria de runtime e regressão completa.

---

# 3. Evolução segura imediata: documentação e campanha

Enquanto M01 continua em desenvolvimento, podemos evoluir sem tocar em runtime:

## 3.1 Identidade de campanha
M01 recebe a assinatura oficial:

**GANCHO:** rotina ferroviária antes do amanhecer.  
**EXPANSÃO:** bombardeio e guerra surgindo em setores independentes.  
**COMPRESSÃO:** homens presos à ponte/corredor.  
**REVERSÃO:** ordem passa de defesa para retirada/demolição.  
**CLÍMAX:** pelotão atravessa enquanto a ponte é perdida.  
**CONSEQUÊNCIA:** chamada nominal e Nowicki sem resposta.

## 3.2 Assinatura espacial
ENTRY posto → ponte → reorganização → trem/setores → ponte/corredor → abrigo/chamada.

M01 é o padrão de referência para futuros mapas:
- mapa é lugar real antes de arena;
- alterações físicas contam a história;
- o mesmo terreno muda de função;
- batalha persiste fora da câmera.

## 3.3 Assinatura sonora
- apito/ferrovia/água/vento antes da guerra;
- aeronaves precedem compreensão;
- explosões respeitam distância;
- silêncio após destruição;
- nada heroico na chamada.

## 3.4 Assinatura de personagem
Jan = observação/contagem.  
Zieliński = responsabilidade.  
Krawiec = trabalho/continuidade.  
Nowicki = primeira ausência.  
Bąk/Dudek = consequência jogável.

---

# 4. Ponte M01 → M02

A conexão NÃO é física entre protagonistas.

## Final de M01
A chamada termina.

Kowal:
> Agora é no norte.

Zieliński:
> O norte é de quem está lá. Bebam água. Durmam se conseguirem.

Essas falas já funcionam como fechamento do mundo de Jan.

## Debrief
O debrief continua factual e limitado ao que a pesquisa aprova.

Depois dele entra uma **transição de campanha separada**, não uma nova cena dentro de M01.

### Intermissão M01→M02 — 20–35 s

Estrutura:
1. mapa da Polônia;
2. Tczew marcado em 1/9;
3. frente muda ao longo dos dias;
4. data avança para 9/9;
5. novo foco aparece na região do Bzura/Łęczyca;
6. cartela identifica novo protagonista/unidade;
7. som do mapa dissolve no som de homens esperando nos campos de M02.

Texto deve ser factual e curto.

Função:
- mostrar que Jan não foi teleportado;
- mostrar passagem de oito dias;
- aumentar escala;
- deixar claro que a campanha muda de POV.

Não usar narração que diga que Jan conheceu Piotr.

---

# 5. Pontes temáticas específicas

## M01 → M02
M01 termina com poucos homens sendo contados.
M02 começa mostrando centenas de homens deitados nos campos.

**Ligação visual:** indivíduo → exército.

## M01 → M03
M01 apresenta infraestrutura que vira campo de batalha.
M03 amplia isso: casas, apartamentos e ruas civis viram frente.

## M01 → M25
Duas pontes, funções opostas:
- Tczew: impedir uso inimigo / retirada.
- Remagen: aproveitar ponte ainda existente / atravessar.

M25 pode criar um eco visual discreto de estrutura metálica e homens correndo, mas não citar Jan nem recriar enquadramento de M01.

## M01 → M30
A caneca de Nowicki pode aparecer apenas como registro/epílogo polonês se houver uma trajetória plausível do objeto no arquivo da campanha.

Não teleportar a caneca para o USS Missouri.

Se não houver cadeia plausível, o epílogo usa a memória visual da chamada, não o objeto físico.

---

# 6. Estado global de campanha

Não alterar agora o schema de M01.

Quando o sistema global de campanha existir, derivar no FINAL da missão:

```
campaign.m01.completed = true
campaign.m01.nowicki = m01.nowicki_status
campaign.m01.bak = m01.bak_status
campaign.m01.dudek = m01.dudek_status
campaign.m01.eastPlatoonSurvivors = m01.east_platoon_survivors
campaign.m01.theme = "count_people"
campaign.lastMission = "m01"
campaign.nextMission = "m02"
```

Esses campos são proposta de contrato, NÃO implementação atual.

A derivação deve ocorrer após a conclusão e ser idempotente.

---

# 7. Como M01 prepara personagens marcantes sem copiar outros jogos

M01 já tem o núcleo necessário:
- líder reconhecível;
- companheiro técnico;
- metralhador;
- recruta;
- socorrista;
- mensageiro;
- civil;
- personagem ausente que deixa memória.

Não adicionar "um Reznov" ou "um Roebuck" artificial.

O que falta futuramente para polimento:
- vozes claramente diferenciadas;
- gestos reconhecíveis;
- animações de pausa;
- visual facial mais individual;
- pequenas reações específicas após 04:34, 06:10 e chamada.

Isso é polimento de atuação/arte, não mudança de roteiro estrutural.

---

# 8. Evolução de M01 para o padrão dos 10 pilares

## Pilar 1 — Roteiro
Já detalhado em 10 cenas. Não reestruturar enquanto runtime está ativo.

## Pilar 2 — Pesquisa
`HISTORICAL_RESEARCH.md` e `SOURCE_CHECK.md` já existem. Pendências continuam explícitas.

## Pilar 3 — Mapa
`MAP.md`, `map-layout.json`, `map-layout.svg` e measurements já existem. M01 é referência para M02+.

## Pilar 4 — Elenco
`STORY_BIBLE.md` já detalha o grupo. Futuro foco: atuação/voz, não inventar novo elenco.

## Pilar 5 — Eventos
`mission.json` já possui IDs/gatilhos/persistência. Não duplicar sistema.

## Pilar 6 — Briefing/transição
**Principal lacuna de conexão com campanha.**
Adicionar futuramente intermissão M01→M02 fora do runtime da batalha.

## Pilar 7 — Áudio/cinematografia
Estrutura existe; polimento futuro deve reforçar rotina→ataque→silêncio/chamada.

## Pilar 8 — Consequências
Flags locais existem. Futuro adaptador global deriva estados após conclusão.

## Pilar 9 — Checkpoints/fail/skip
Já definido. Campanha não deve mudar CP-A..D.

## Pilar 10 — Anti-repetição
M01 assinatura exclusiva:
**uma manhã ferroviária vira guerra; defender → ganhar tempo → retirar → contar quem sobrou.**

M02 não pode copiar isso. Sua assinatura é:
**massa avança com confiança → consegue terreno → frente inverte → massa recua.**

---

# 9. Trabalho futuro quando M01 estabilizar

Criar task isolada:
**M01-CAMPAIGN-BRIDGE-RUNTIME-V1**

Escopo pequeno:
1. implementar transição pós-debrief M01→M02;
2. adaptar flags locais para estado global de campanha;
3. incluir tela/cartela de continuidade;
4. garantir skip/idempotência;
5. não tocar no combate da missão;
6. testar save/load/conclusão/debrief/transição.

Arquivos de combate, IA, bridge physics, armas e eventos históricos ficam fora.

---

# 10. Critério de sucesso

M01 estará conectada à campanha quando:

- terminar satisfatoriamente como história própria;
- o jogador entender que a guerra continua além de Tczew;
- M02 começar como novo POV sem parecer jogo diferente;
- nenhum personagem for teleportado;
- os estados de M01 persistirem;
- a campanha lembrar perdas sem transformar M01 em prólogo expositivo;
- nenhuma regressão for introduzida no protótipo em desenvolvimento.
