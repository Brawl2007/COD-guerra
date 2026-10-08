# Jogar a M01 da V7

Esta entrega prepara a **V7**, preservando a V6. Não foi criado um site público, um novo deploy de produção ou um URL online de jogo. As capturas não substituem esta prévia jogável. M01 continua **PROTÓTIPO JOGÁVEL**.

O caminho recomendado é um GitHub Codespace da [branch V7](https://github.com/Brawl2007/COD-guerra/tree/codex/m01-final-production-consolidation-v7). Na página da branch, selecionar **Code → Codespaces → Create codespace**. Isso é uma ação do utilizador na sua conta; não foi criado um Codespace nem contratado outro fornecedor automaticamente.

No terminal do Codespace:

```bash
git branch --show-current
git rev-parse HEAD
node --version
npm ci
export __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

A branch deve ser `codex/m01-final-production-consolidation-v7`; comparar o SHA com o HEAD final da PR draft. Node **24** foi usado na validação; o projeto exige no mínimo **22.12.0**. Não executar checkout de `main` nem scripts de Pages.

No painel **PORTS**, encaminhar a porta **5173**, mantendo-a **Private**, e selecionar **Open in Browser**. Abrir a URL encaminhada com o caminho `/COD-guerra/`, numa aba normal do Chrome. O terminal mantém o Vite ativo. A variável acima autoriza apenas o hostname desse Codespace; não desativa a validação de hosts.

O comando do Vite com `--host 0.0.0.0`, a resposta ao hostname de uma porta encaminhada e o fluxo com controlos foram verificados em Ubuntu 24.04/Node 24 no CI desta V7. O teste é do servidor e da aplicação; não é uma sessão humana no serviço Codespaces nem uma medição do Chromebook. O executor local restringe interfaces de rede, por isso a sua própria prévia foi testada em `127.0.0.1`.

No Chromebook, com o ambiente Linux, Git e Node 24 já disponíveis:

```bash
git clone --branch codex/m01-final-production-consolidation-v7 --single-branch https://github.com/Brawl2007/COD-guerra.git COD-guerra-v7
cd COD-guerra-v7
git rev-parse HEAD
npm ci
npm run dev -- --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173/COD-guerra/` no Chrome. O build e o servidor local dessa aplicação foram executados; a disponibilidade do ambiente Linux, acesso à porta e desempenho no seu Chromebook devem ser confirmados no aparelho. Começar em **Low**, testar Medium/High se o hardware permitir; não existe aqui uma alegação de FPS.

| Ação | Controlo / resultado |
|---|---|
| Começar | Escolher M01, qualidade e **Iniciar**; permitir captura do rato após o clique |
| Intro | Deixar tocar; **Espaço** salta a cena quando permitido |
| Movimento / olhar | **WASD** e rato com pointer lock |
| Disparar / ADS | Botão esquerdo / manter botão direito |
| Recarga | **R**; respeita o ciclo de ferrolho e recarga da simulação |
| Pausa | **Esc**; **Retomar** recupera o controlo e áudio |
| Checkpoint | CP-A é criado pela sequência inicial; os restantes são automáticos pela missão |
| Continue | Voltar ao menu, recarregar a mesma origem/aba e clicar **Continuar** |

O smoke test executou menu, início/intro, as quatro teclas WASD, pointer lock nativo, movimento relativo do rato recebido pelo Input, disparo, ADS, recarga parcial, pausa/retoma, áudio ativo, HUD, Schema 2/CP-A e Continue após reload. Zero erros fatais JS/HTTP nessa execução. Não é um playtest humano nem certificação completa de hardware.

Para reproduzir a verificação automatizada, com Chromium instalado pelo Playwright:

```bash
npx playwright install chromium
node tools/verification/m01-v7-playable-preview.mjs --start-server
```

O teste inicia apenas um servidor local, grava `PLAYABLE_PREVIEW.json` e uma captura, e fecha os processos que criou. Não publica o jogo.
