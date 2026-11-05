# Guia de playtest — M01 Tczew (Ato I, VII-a, VII-b, VII-c)

**Estado: PROVISÓRIO. Nada disto está validado em jogo.** Ainda não houve playtest humano. Os testes automáticos e os pilotos (programas que jogam sozinhos) não contam como validação. Verificado no ramo `claude/dreamy-ramanujan-6v62vr`, SHA `4a4366ae` ou posterior (ver o topo de `docs/direction/M01_INTEGRATION_LEDGER.md`), 2026-11-05. Os atos novos estão **desligados** na distribuição: só se veem pelos endereços de teste indicados abaixo.

## 1. Como começar

Na pasta do projeto (Node 22.12 ou superior):

    npm ci
    npm run dev

Abrir **http://127.0.0.1:5173/COD-guerra/**. Para medir desempenho, use a versão de produção: `npm run build` e depois `npm run preview`, em **http://127.0.0.1:4173/COD-guerra/**.

| Endereço | O que abre |
|---|---|
| `/COD-guerra/` | Jogo normal: só o Ato I (04:30–07:05), debrief às 07:05. Inclui as alterações do pacote 2 (pó, socorro, granadas). |
| `/COD-guerra/?acts=1` | Cadeia completa: Ato I → VII-a → VII-b → VII-c → debrief. Depois da chamada no abrigo aparece o cartão de transição. |
| `?act=vii-a`, `?act=vii-b`, `?act=vii-c` | Começa diretamente nesse ato (teste). Liga a cadeia nesta página. |
| `?debug=1` | Acrescenta `window.gameDiagnostics()` à consola (F12): ato ativo, qualidade, chamadas de desenho, triângulos. **Não mostra FPS.** |
| `?acts=0` | Força a cadeia desligada. |

Antes de cada sessão, comece um **jogo novo**. «Continuar» abre o save mais recente; desde `bf9f79ad`, um jogo novo põe de lado o save antigo dos atos novos (VII-a/b/c), e um save dos atos estragado recua para o save do Ato I com um aviso, sem apagar nada.

Comandos: WASD mover · rato olhar · clique esquerdo disparar · botão direito mira · R recarregar · G granada · Shift correr · E reabastecer/entregar · C agachar · Espaço salta cartões · Esc pausa.

Teste cada qualidade do menu (**Baixa, Média, Alta**) e anote qual usou.

## 2. Como anotar cada ato

Dê de 1 a 5 (1 = muito mau, 5 = muito bom) e escreva uma frase por ponto:
- **Diversão**: apeteceu continuar?
- **Clareza**: percebeu o objetivo, o marcador e o que fazer a seguir?
- **Dificuldade**: fácil (1), certa (3) ou injusta (5)?
- **Visibilidade**: viu os alemães e as ameaças quando precisou?
- **Duração**: curta (1), certa (3) ou longa (5)? Anote os minutos reais do seu relógio.

## 3. Ato I — Ponte, 04:30–07:05

- **Pó**: depois de uma bomba, granada ou demolição fica uma nuvem sobre a cratera (bomba: raio 16 m, 40 s; demolição: raio 42 m, 150 s; granada: 20 s). Desde `4a4366ae` a nuvem é desenhada com a espessura que a simulação lhe dá: uma nuvem que cega a IA também deve tapar-lhe a vista. Os alemães ou polacos atrás da nuvem deixam de se ver? A nuvem pareceu exagerada, certa ou fraca?
- **Tiro de apoio e busca alemã** (emenda 22): um tiro de apoio alemão cai perto da linha polaca e os homens do assalto do tabuleiro que perdem o alvo deslocam-se para o reencontrar. Notou-os a mudar de posição? Pareceu inteligente ou estranho?
- **Feridos**: as bombas das 04:34–04:43 ferem homens da guarnição oeste, que chamam. Dudek, o médico, vai ao mais próximo, ajoelha-se, trata durante 6–10 s e leva-o ao ombro para a cobertura. O gesto lê-se? Percebeu que era o médico? Voltou ao posto?
- **Granadas alemãs**: só aparecem em algumas rotas (nas simulações: 6 de 12 de controlo, nenhuma das de apoio). Se aparecer, o aviso (mensagem no HUD a 17 m ou menos) foi claro?
- **Assalto no tabuleiro**: os alemães chegam mais perto (`safeX` 190, a cerca de 23 m da retaguarda polaca). Pareceu justo ou apertado?
- **Duração**: cerca de 18–22 min nas rotas simuladas.

## 4. Ato VII-a — Perímetro norte, manhã (~07:00)

Cartão de entrada (9 s), chegada, objetivo «Junte-se à secção no parapeito norte», checkpoint CP-E.
- **1.ª vaga**: 9 atacantes em três faixas e 4 de apoio na orla. Quebra aos 7 caídos ou ao fim de 120 s.
- **Pausa de 40 s**: os atacantes recuam; o apoio fica nos postos. Zieliński diz a pausa. Checkpoint CP-F quando a 1.ª vaga quebra.
- **2.ª vaga**: 16 atacantes em dois grupos (oeste e leste) e 2 MG34. Quebra aos 14 caídos ou ao fim de 120 s. Morrer aqui volta ao CP-F; morrer na 1.ª vaga volta ao CP-E.
- **Fim**: «Repelidos. Por agora.», cartão de fim e debrief.
- Confirme o relevo, o campo, as árvores e o destroço com coluna de fumo.
- Anote a duração da luta. Os pilotos fizeram 2–4 min (ativo) e 4–5 min (passivo); isto não é medida de jogador.

## 5. Ato VII-b — Norte, durante o dia

Cartão «Mais tarde…» (9 s) e etiqueta «DURANTE O DIA», sem hora.
- Reabastecer (E na caixa) e ocupar o posto do flanco oeste.
- **Barragem 1**: 12 impactos, cada um com assobio cerca de 1,5 s antes; «Ao chão!»; abrigue-se atrás do parapeito. Um homem é ferido e levado por dois maqueiros. O jogador nunca morre pela artilharia (só fica atordoado).
- **1.ª investida** (15 + 3): quebra aos 10 caídos ou aos 100 s → checkpoint CP-I2.
- **Intervalo** (até 30 s): barragem 2 (6 impactos); a ckm recarrega.
- **2.ª investida** (16 + 2): quebra aos 15 caídos ou aos 100 s → «Repelidos» → debrief.
- Anote se o assobio se percebe, se o aviso chega a tempo e se as crateras se distinguem (de trincheira, quase só se vê o fumo).
- Duração: os pilotos fizeram 3,5–6 min.

## 6. Ato VII-c — Ordem às 17:00 e retirada

Cartão «Por volta das 17:00» (9 s, ecrã preto), cartão «Ao anoitecer» (6 s), checkpoint CP-J e etiqueta «ANOITECER».
- Um mensageiro (fictício) chega pelo sudoeste, leva cerca de 29 s e dá a ordem ao posto de comando.
- A secção sobe ao parapeito. A linha sai por lanços (checkpoint CP-K quando o último sai). A retaguarda sai por último; Pawlak chama quem fica para trás.
- **Fim**: com a retaguarda fora e o jogador na faixa de saída (canto sudoeste, marcador «Saída»). Cartão de fim e debrief.
- Não há inimigos neste ato, nem tiros.
- Anote: é monótono? Encontrou a saída sem ajuda? Os homens lêem-se contra o campo ao anoitecer? Duração: cerca de 3,5–4 min com cartões.

## 7. Perguntas abertas: o que julgar

1. **Alemães a 120–250 m**: quase invisíveis. Nas capturas, a 120–195 m um homem tem 6–10 píxeis. Distinguem-se os atacantes?
2. **Duração** do VII-a (luta de 2–5 min) e do VII-b (4–6 min).
3. **MG34 a fogo cego na pausa do VII-a**: as MG34 sem alvo à vista, mas com um clarão recente (30 s), disparam rajadas a cada 4–8 s; presas ao solo, disparam às cegas a cada 8–16 s. Pareceu ameaça justa ou aleatória?
4. **Tamanho da 2.ª vaga** (16 + 2) e os limiares de quebra (14 caídos no VII-a; 15 no VII-b).
5. **Veteranos no VII-b**: nos pilotos, as mortes do veterano subiram de 12 para 19 depois de uma correção. Pareceu injusto?
6. **Legibilidade ao anoitecer** (VII-c): a luminância das capturas (59–87) é próxima da do amanhecer das 04:30 (80), mas nunca foi vista por uma pessoa.
7. **Pó**: a cor (`#90866f`) e a densidade nunca foram vistas numa placa gráfica real.
8. **Números de jogo**: `safeX` 190, `closeExtraSec` 100, duração e raio do pó.
9. **Nuvem da demolição leste**: pode tapar a vista e tornar a escolta mais fácil (saúde final do piloto de controlo: 76 → 100).
10. **Sem sonda alemã na retirada** (D-5 por construir): o VII-c não tem inimigos. É decisão do proprietário, não um bug.

## 8. O que não julgar ainda

- **Áudio**: provisório. O assobio da artilharia não foi ouvido em navegador sem som. As vozes do mensageiro e do Pawlak são legendas, sem voz gravada.
- **Falas em polaco** (incluindo as 220–226 do Ato I): escritas por IA, por rever por falante nativo. Julgue só se o sentido se percebe.
- **História**: as fontes são parciais. «Desconhecido» nos cartões (quem transmitiu a ordem, itinerário, insígnias) é intencional.
- **Gráficos finais**: as capturas foram feitas em software (SwiftShader), não numa placa real.

## 9. Como reportar um problema

Um parágrafo por problema, com:
1. Data e hora real, e a hora de jogo mostrada no HUD («MANHÃ · ~07:00», «DURANTE O DIA», «ANOITECER»).
2. Ato (Ato I, VII-a, VII-b ou VII-c) e o endereço usado.
3. Último checkpoint visto («PROGRESSO GUARDADO · CP-…»).
4. Dificuldade (Recruta, Soldado ou Veterano) e qualidade (Baixa, Média ou Alta).
5. Navegador, computador e resolução.
6. O que aconteceu, o que se esperava e como repetir.
7. Captura de ecrã com o HUD visível. Se surgir erro, copie o texto da consola (F12, com `?debug=1`).

## 10. FPS no PC de referência

- Referência: Intel HD 5500, 1366×768. O FPS nesse PC é uma medição humana (T49). Nenhum relatório do projeto afirma valores de FPS.
- O jogo não tem contador de FPS. `?debug=1` mostra chamadas de desenho e triângulos, não FPS.
- Método: janela do navegador a 1366×768, build de produção (porta 4173), uma qualidade de cada vez (Baixa, Média, Alta), contador de fotogramas externo à sua escolha, pelo menos 2 minutos seguidos por ato, na chegada e em combate. Anote a média, o mínimo e o que se passava em ecrã.
