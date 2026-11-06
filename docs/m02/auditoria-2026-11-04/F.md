# F. Auditoria do catálogo de construções (B01–B12)

Data: 2026-11-04. Branch: origin/gemini/m02-01-quinta (fetch efetuado; repositório não alterado).
Fontes: PDF pp. 23–27 (secção F); plantas B01, B02, B09, B12; missions/m02-bzura/m02-01-quinta-layout.json (B01–B04); missions/m02-bzura/m02-cells-bc-layout.json (B05–B12); src/world/m02-quinta-world.js; src/render/m02-01-renderer.js; src/world/m02-zone-streamer.js (gera B05–B12, lido por necessidade).
Legenda: IMPLEMENTADO = coincide com o PDF; PARCIAL = dados coerentes, faltam itens; EM FALTA = elemento principal ausente; CONTRADIZ = valor explícito do PDF (medida, vão, divisão, orientação) não coincide com os dados.

## 1. Resumo

| B | Edifício | Estado | Divergência principal |
|---|---|---|---|
| B01 | Casa rural | PARCIAL | Mobiliário incompleto (cadeira, armário, prateleiras, roupa); materiais só "brick" |
| B02 | Celeiro | IMPLEMENTADO | Faltam vigas/acesso do sótão e embasamento pontual (detalhe) |
| B03 | Estábulo | CONTRADIZ | Janelas altas nas fachadas N/S nos dados estão a oeste; baias 3+2 ausentes |
| B04 | Forno | PARCIAL | Sem chaminé, nicho/alpendre, pá e recipiente |
| B05 | Oficina | CONTRADIZ | 3.ª janela "para o quintal" nos dados está a este; sem divisória cozinha/quarto |
| B06 | Loja | CONTRADIZ | Sem corredor de serviço u0–3/v8–22; arrecadação em u0–16 (PDF u3–16) |
| B07 | Telheiro | CONTRADIZ | Vão leste 6,4 m (PDF 3,2 m); sem baias de 7 m e sem postes |
| B08 | Habitação fechada | CONTRADIZ | 0 portas e 0 janelas (PDF: porta fechada, 2 janelas vedadas); teste exige 0 portas |
| B09 | Armazém | CONTRADIZ | Medidas OK; 2 de 3 vãos e 2 paredes horizontais em falta; janelas a oeste em falta |
| B10 | Oficina lateral | PARCIAL | Sem divisória bancada/arrecadação; anexo baixo a este ausente; bancada "stone" |
| B11 | Portaria | CONTRADIZ | Janela oeste em falta; sem divisória; telhado "tile" igual ao B09 (PDF: distinto) |
| B12 | Casa de socorro | CONTRADIZ | Portas 1,6 m (PDF 1,4 m); 3 divisões em vez de 5; 1 janela (imagem mostra 3) |

## 2. Medidas: PDF, dados e handoff

- Dados = PDF em B01–B12 (bounds e largura × profundidade).
- Handoff (docs/m02/M02_HANDOFF.md) diverge em B05–B12: B05 16×11, B06 12×9, B07 15×7, B08 10×8, B09 22×12, B10 14×10, B11 6×5, B12 12×9.
- Confirmado: B09 é 28×18 m (PDF p. 26, plantas e layout) e B12 é 18×12 m (PDF p. 27, plantas e layout). O handoff está errado.
- Nenhum código ou teste do branch usa 22×12 ou 12×9 (grep sem resultados em src/tests/missions).

## 3. Detalhe por edifício

**B01 — PARCIAL.** 14×10, beiral 2,8, cumeeira 5,2, 5 divisões, 6 portas, 4 janelas e palha conformes. Entrada este 1,1 m (PDF pede pedonal 1,0 m; confirmar). Janelas: PDF cita 2 no texto, a imagem mostra 4; os dados seguem a imagem (incoerência interna do PDF). Em falta: cadeira, armário, roupa, prateleiras da despensa, fotografia. Materiais: PDF "barro/reboco" e "embasamento de pedra" (a validar) vs dados "brick".

**B02 — IMPLEMENTADO.** 24×14, beiral 3,6, cumeeira 7,2, faixas v0–4/4–10/10–14, portão norte 3,0 m (u12), porta sul 1,2 m fechada (u18), abertura MG a oeste (v8), 4 montantes e objetos (sacos, feixes, palha, carroça, MG) coincidem com texto e imagem. Detalhe em falta: vigas e acesso fechado do sótão; embasamento pontual.

**B03 — CONTRADIZ.** 18×12, corredor u7–11 e portas N/S de 2,4 m conformes. PDF: janelas altas nas fachadas longas (N/S); dados: 1 janela a oeste. PDF: 3 baias a oeste e 2 a este mais arreios; dados: 1 divisória por lado, sem vãos. Porta N/S com offset u9 fica centrada em u10,2 (corredor centrado em u9): verificar. Objetos (bebedouro, palha, ganchos, balde, cordas) em falta.

**B04 — PARCIAL.** 8×6, porta sul 1,0 m, forno de alvenaria no terço oeste e pilha de lenha exterior (cov_b04_woodpile, junto ao beiral sul) conformes. Em falta: chaminé curta, nicho e alpendre a este, pá e recipiente. "Telhado baixo assimétrico" não se confirma: o renderer usa gable simétrico (#createGableRoof).

**B05 — CONTRADIZ.** 18×12; oficina, quarto de fundos, cozinha e passagem nas posições certas; portão oeste 2,6 m, porta este 1,1 m, saída sul da cozinha 1,0 m conformes. PDF: 2 janelas a norte e 1 "para o quintal"; dados: 2 a norte e 1 a este ("sobre o cruzamento"). Sem parede entre quarto de fundos (u0–7/v8–12) e cozinha (u7–11/v8–12). Mobiliário: só bancada; peças de carroça e ferragens em falta.

**B06 — CONTRADIZ.** 16×22; portas 1,2 / 1,2 / 2,0 m conformes. PDF: loja v0–8, corredor de serviço u0–3/v8–22, arrecadação u3–16/v8–16, privado v16–22. Dados: três faixas de largura total (u0–16), sem corredor. Janela da montra a oeste ("sobre a rua"): PDF diz "frente estreita" (norte): verificar orientação. Em falta: prateleiras, balança, sacos, letreiro.

**B07 — CONTRADIZ.** 20×12; porta norte de serviço 3,2 m conforme. Frente leste: dados 6,4 m vs PDF "vão livre de 3,2 m em cada entrada". Em falta: duas baias de 7 m, faixa de ferramentas a norte, postes de cobertura.

**B08 — CONTRADIZ (decisão necessária).** 12×10, não navegável e opaco, telhado de palha: conformes. PDF: porta fechada com tranca visível, duas janelas vedadas, cor de reboco própria; dados: 0 portas, 0 janelas, cor brick_cover comum. O teste m02-04-05 exige 0 portas: o Capitão decide se o PDF ou o teste prevalece. Em falta: horta, tina, portão exterior.

**B09 — CONTRADIZ.** 28×18 conforme (handoff errado). Nave u0–20, escritório, depósito e serviço nas posições. Só há 1 parede interna (u20, com vão em v9): faltam paredes horizontais escritório/depósito e depósito/serviço e os vãos v3 e v15. Portas: norte 3,2 m conforme; sul 1,6 m (PDF 1,4 m); leste 1,4 m (PDF 1,2 m). Janelas: dados têm 1 a leste (v4); a imagem mostra 2 a oeste (v≈3–5 e v≈12–14). Props: 2 pilhas (imagem mostra 4 "Carga" e uma mesa); carro de mão e quadro de contagem em falta.

**B10 — PARCIAL.** 20×16; portão oeste 2,8 m, porta sul 1,2 m e janela norte conformes. Sem parede entre salão e bancada/arrecadação (u14/v10). Anexo baixo na face este em falta. Bancada em "stone" vs PDF "mesa de aço leve" (confirmar). Janela norte com peitoril 1,0 m vs PDF "luz alta" (confirmar).

**B11 — CONTRADIZ.** 10×8; portas oeste e sul 1,2 m conformes. PDF: janelas a norte e a oeste; dados: só a norte. Sem divisória sala de controlo / arquivo (u6). Telhado "tile", igual ao B09 (PDF: distinto). Em falta: barreira manual, livro, banco e portão exterior.

**B12 — CONTRADIZ.** 18×12 conforme (handoff errado). Portas norte e sul 1,6 m vs PDF 1,4 m. PDF: 5 divisões (sala u0–12/v0–8, cozinha u12–18/v0–8, quarto u0–8/v8–12, passagem u8–12/v8–12, despensa u12–18/v8–12); dados: 3 (passagem ocupa u0–18). Janelas: dados 1 a leste; imagem mostra 3 (oeste, leste, sul). Macas: 2 conformes, mas renderer (m02-01-renderer.js) desenha 2 macas fixas em (-58,5; 52) e (-54,5; 52), dimensões e orientação diferentes das props (possível duplicação). Em falta: cama, fogão e mesa (aparecem na imagem). Telhado "thatch", igual ao B01 (PDF: distinto de B01).

## 4. Pontos transversais

- Larguras de porta: B09 e B12 usam 1,4–1,6 m, fora das folgas da secção F1 (pedonal 1,0 m; socorro 1,2 m); decidir se é a exceção do PDF.
- Materiais: dados só têm brick, wood, thatch, tile; o renderer diferencia brick_B01/B04/cover, não o reboco de B05–B12.
- Não verificado: render, escala real e colisões em jogo. Nenhum teste foi executado nesta auditoria.

## 5. Ações sugeridas (não executadas)

1. Corrigir as medidas B05–B12 em docs/m02/M02_HANDOFF.md.
2. Decidir B08 (0 portas vs PDF) antes de alterar o teste m02-04-05.
3. Corrigir layout BC: B09, B12, B11, B06, B05, B03, B07 (ver secção 3).
4. Remover ou alinhar as macas hardcoded do renderer com as props de B12.
