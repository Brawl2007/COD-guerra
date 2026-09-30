# Operação: Estrada de Cinzas

Vertical slice original de um FPS single-player ambientado na França de 1944. O cenário, personagens e arma são renderizados em WebGL 2 por uma camada 3D própria, e os efeitos sonoros são sintetizados pela Web Audio API.

O renderer 3D usa câmera em perspectiva, malhas iluminadas, névoa, sombras projetadas simplificadas, partículas, uma M1 Carbine animada com braços e soldados humanoides articulados. A aldeia possui casas com telhados, interiores, estrada, becos, cercas, árvores, vegetação e posições de cobertura. Ele não baixa bibliotecas ou assets em tempo de execução, mantendo o preview autocontido no GitHub Pages.

## Sistemas da V4

- `src/assets/obj-loader.js` carrega os modelos temporários `.obj/.mtl`, inteiramente textuais; a M1 Carbine e os torsos humanoides aliados/inimigos usam esses modelos originais em `assets/models` com fallback procedural. A pipeline `.gltf/.glb` permanece preparada em `src/assets/gltf-loader.js` para assets finais futuros.
- `src/game/weapon.js` contém perfis de armas extensíveis para dano, cadência, spread, recoil, carregador, recarga, áudio, modelo e animações.
- `src/game/battle-director.js` coordena intensidade, reforços e áudio distante sem substituir a IA individual.
- `src/game/grenade.js` implementa arremesso, física, colisão, aviso à IA, explosão e dano radial.
- `src/core/audio.js` fornece áudio procedural espacial e mantém a API de carregamento de áudio real preparada para os assets binários futuros.

Todos os modelos `.obj/.mtl` em `assets/` foram produzidos originalmente para este projeto e podem ser distribuídos junto com o código. Nenhum asset de Call of Duty ou de outro jogo foi utilizado. Os binários futuros estão documentados em `assets-needed.md` e não fazem parte deste patch.

## Jogar

```bash
npm start
```

Acesse `http://localhost:8080`. Use **WASD** para mover, **mouse** para mirar, **clique esquerdo** para atirar, **R** para recarregar, **G** para lançar granada e **Shift** para correr. O navegador precisa permitir Pointer Lock e áudio.

## Abrir no Chromebook com GitHub Pages

Este repositório inclui o workflow `.github/workflows/pages.yml`, que publica o mesmo jogo como um site estático, sem alterar o gameplay e sem exigir instalação no Chromebook.

1. Faça merge do pull request no GitHub.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**. Se essa opção já estiver selecionada, não altere nada.
4. Abra **Actions → Publicar preview do jogo**. Caso o workflow não tenha iniciado automaticamente, clique em **Run workflow**, selecione a branch `main` (ou `master`) e confirme.
5. Aguarde o job **deploy** ficar verde. O endereço público aparece no resumo do workflow e em **Settings → Pages**. Normalmente ele será `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
6. Abra esse endereço no Chrome do Chromebook, clique em **INICIAR MISSÃO** e aceite a captura do ponteiro quando o navegador solicitar.

O endereço publicado utiliza HTTPS, requisito importante para APIs de navegador como áudio e captura do ponteiro. Novos pushes para `main` ou `master` atualizam o site automaticamente. Também é possível remover o preview a qualquer momento em **Settings → Pages**.

## Arquitetura

- `src/core`: entrada, áudio procedural e utilitários matemáticos;
- `src/world`: mapa, colisão, raycast e linha de visão;
- `src/game`: regras, atores, arma, checkpoint e progressão da missão;
- `src/render`: renderer WebGL 2, matemática matricial, malhas e personagens 3D procedurais;
- `tests`: testes das regras independentes do navegador.

Os sistemas são desacoplados para permitir a evolução futura de direção de batalha, navegação avançada, veículos, artilharia, destruição e campanhas adicionais sem misturar essas responsabilidades ao loop principal.

## Escopo do vertical slice

Atravesse a aldeia, acione o checkpoint, combata três soldados com o apoio do Sargento Hale e alcance o rádio. A morte restaura o jogador no último checkpoint. Este é um protótipo técnico deliberadamente curto, não uma campanha completa.
