# Ficha do primeiro playtest humano da M01

Estado: **por preencher**. Regista o primeiro playtest humano do projeto. Não é validação de marco, não mede FPS e não substitui os testes automáticos.

## 1. Preparação (2 minutos)

```bash
cd ~/projetos/COD-guerra-agentes   # o repositório atualizado
git pull
.agent/tools/jogar.sh <branch-da-tarefa>
```

- O script mostra a branch e o commit: copia-os para a ficha.
- Abre `http://127.0.0.1:4173/COD-guerra/`. Antes de correr, para o preview anterior com Ctrl+C, senão o porto 4173 está ocupado.
- A versão de jogo fica numa pasta própria (`~/projetos/COD-guerra-jogar`). Não uses a pasta do Captain (`COD-guerra-v7-cert`).
- Se o script disser que faltam dependências, cola-me a mensagem.
- A versão pública do GitHub Pages sai só da `main`.

## 2. Controlos (confirmados no código e no README)

| Ação | Tecla |
|---|---|
| Andar | W A S D |
| Olhar | rato |
| Disparar | clique esquerdo |
| Mirar | clique direito |
| Recarregar | R |
| Granada | G |
| Correr | Shift |
| Agachar | C |
| Interagir | E |
| Alça de mira | V |
| Saltar intro/outro | Espaço |
| Pausa | Esc |

Clica em **Iniciar** para capturar o rato e ativar o som.

## 3. O que jogar

Começa pela missão e joga até à primeira grande cena (a ponte e a demolição a leste). Se chegares, continua até ao fim ou até ao ponto em que te perdes. **15 a 20 minutos, depois para.**

## 4. Registo de problemas

Uma linha por problema.

| # | Onde/quando | O que aconteceu | O que esperavas | Tipo | Gravidade |
|---|---|---|---|---|---|
| 1 | | | | | |

- **Tipo:** jogabilidade, IA, arma, som, visual, objetivo, bug.
- **Gravidade:** *bloqueia* (não consegues continuar), *incomoda* (estraga a experiência), *detalhe*.
- Faz uma captura de ecrã de cada problema *bloqueia* ou *incomoda*.

## 5. Perguntas fixas (responde em poucas palavras)

1. Percebeste o objetivo nos primeiros 2 minutos? (sim / não / em parte)
2. Os teus tiros e movimentos tiveram efeito visível?
3. Os inimigos reagiram de forma credível (procuram cobertura, avançam, recuam)?
4. Na ponte: percebeste o que estava a acontecer e porquê?
5. **A metralhadora ckm, na casamata:** viste-a? Achaste que devia disparar? (sim / não / não sei)
6. Qual foi o momento mais forte? E o mais fraco?
7. Se pudesses mudar uma coisa só, qual seria?
8. Sensação de guerra opressiva (1 = nenhuma, 5 = muito forte):
9. Comparado com a versão anterior, o visual está: melhor / igual / pior?
10. Até onde chegaste, e porque paraste?

## 6. O que não fazer

- Não reportar FPS: não foi medido, e o Chromebook não é o hardware de referência.
- Não alterar código nem mudar de branch durante o playtest.
- Não juntar nada à `main`.

## 7. Como devolver

Cola no chat a tabela e as respostas 1 a 10, com a branch e o commit da linha 1.

## 8. O que a resposta da pergunta 5 decide

- **A maioria acha que devia disparar:** a geometria da ckm passa a ser prioridade (fase 0: abertura, collider ou posto). Escolhe-se a, b ou c.
- **A maioria acha que não faz falta:** a ckm fica como está, e a fase 0 deixa de ser prioritária.
- **Ninguém a notou:** é um problema de visibilidade, não de disparo; sobe a prioridade de a tornar legível.

## 9. Triagem (para o Captain, depois do playtest)

| Gravidade / tipo | Quem trata |
|---|---|
| bloqueia | prioridade imediata; o bug vai direto ao implementador |
| IA ou jogabilidade | `opus-medium` desenha; depois `sonnet-max` ou `sonnet-xhigh` implementa |
| visual | `sonnet-high` (renderer) |
| som | `sonnet-medium` |
| detalhe | lista para depois |

Toda a alteração de código passa pelo `verifier` e pelo `reviewer`.

## 10. Resultados do playtest 1 (2026-10-09)

Fonte: notas do utilizador e 4 capturas do Chromebook (tempos no HUD: 04:55, 05:00, cerca de 05:0x e 05:09:38).
**Por confirmar pelo utilizador:** branch e commit (linha 1 da ficha), resposta 5 (metralhadora ckm) e respostas 1 a 10.
A gravidade e o tipo são provisórios, decididos a partir das notas.

| # | Queixa (palavras do utilizador) | Tipo | Gravidade (provisória) | Estado no projeto |
|---|---|---|---|---|
| 1 | Água com aspeto estranho | visual | incomoda | Tarefa da água (T42) em correção; a versão jogada pode ser anterior |
| 2 | Árvores feitas de bolas, pouco realistas | visual | incomoda | A vegetação de produção já está na V7; confirmar se a árvore jogada é a nova |
| 3 | Soldados parados, sem animação | animação | central | Animation Resolver ausente na V7 (lacuna conhecida); locomoção excluída da V7 |
| 4 | Soldados não procuram cobertura, não reagem, não se deslocam | IA | central | O M01 não usa a lógica de cobertura do motor base (`actors.js`); só há deslocações do guião (retirada, evacuação, movimentos de grupo) |
| 5 | Paredes invisíveis e atravessar qualquer parede | colisão | bloqueia, se impedir o avanço | Hipótese: os colisores exportados não batem com o visual; confirmar |
| 6 | Capacetes dos soldados sem textura no interior | visual | detalhe | A confirmar |
| 7 | Quedas instantâneas, sem gravidade | animação | incomoda | Provavelmente a mesma causa do item 3; confirmar se são soldados mortos |

**Leitura:** os itens 3 e 4 são a queixa principal e não são um bug novo. A matriz de entregas da V7 excluiu a locomoção dos soldados, e o M01 não usa a cobertura do motor base. Corrigir isto é uma tarefa de escopo grande, com decisão do utilizador. Os itens 1, 2, 5, 6 e 7 são tarefas menores, uma a uma.
