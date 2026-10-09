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
