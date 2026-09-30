# Operação: Estrada de Cinzas

Vertical slice original de um FPS single-player ambientado na França de 1944. O protótipo não usa bibliotecas ou assets externos: cenário, personagens e arma são renderizados em Canvas, e os efeitos sonoros são sintetizados pela Web Audio API.

## Jogar

```bash
npm start
```

Acesse `http://localhost:8080`. Use **WASD** para mover, **mouse** para mirar, **clique esquerdo** para atirar, **R** para recarregar e **Shift** para correr. O navegador precisa permitir Pointer Lock e áudio.

## Arquitetura

- `src/core`: entrada, áudio procedural e utilitários matemáticos;
- `src/world`: mapa, colisão, raycast e linha de visão;
- `src/game`: regras, atores, arma, checkpoint e progressão da missão;
- `src/render`: renderer raycasting e sprites procedurais;
- `tests`: testes das regras independentes do navegador.

Os sistemas são desacoplados para permitir a evolução futura de direção de batalha, navegação avançada, veículos, artilharia, destruição e campanhas adicionais sem misturar essas responsabilidades ao loop principal.

## Escopo do vertical slice

Atravesse a aldeia, acione o checkpoint, combata três soldados com o apoio do Sargento Hale e alcance o rádio. A morte restaura o jogador no último checkpoint. Este é um protótipo técnico deliberadamente curto, não uma campanha completa.
