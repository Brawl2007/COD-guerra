# COD Guerra — especificação do produto

FPS original da Segunda Guerra Mundial, de 1/9/1939 a 2/9/1945, com campanha cronológica de 30 capítulos em lugares e operações reais. Ritmo, intensidade e direcção humana inspirados em FPS militares clássicos; código, personagens, falas, mapas e assets próprios ou licenciados.

A especificação integral entregue pelo utilizador está em [docs/PROMPT_MESTRE.txt](docs/PROMPT_MESTRE.txt). As secções 69–82 consolidam o contrato técnico, os roteiros e os critérios. O índice de campanha fica na secção 52; todos os roteiros na 79. O ficheiro é um plano, não evidência de implementação.

## Requisitos permanentes

- NPCs usam percepção, cobertura, exposição, movimento de equipa e recursos coerentes; sem dano através de paredes.
- Combate acontece em sectores próximos, médios e longos, conservando identidade, perdas e eventos fora da câmara.
- Violência adulta de guerra com sofrimento, socorro, civis e consequências; intensidade configurável sem premiar atrocidades.
- Armas, uniformes, veículos e unidade dependem de país, data, teatro e função. M01 exige equipamento polonês de 1939, nunca M1 Carbine.
- Personagens ficcionais não mudam o resultado histórico. Mapas classificam precisão, reconstrução e compressão.
- Checkpoints serializam mundo, actores, relógio, munição, objectivos, eventos e estado aleatório.
- Build de produção funciona em `/COD-guerra/`, sem dependências externas no carregamento do jogo.
- Meta inicial de 30 FPS em 1280×720 num Chromebook de referência; precisa de medição no aparelho real.

## Estado actual

A aldeia de 1944 permanece uma bancada ficcional jogável, com M1 Carbine provisória. A fundação foi migrada para Three.js/Vite e recebeu regressões de combate, pausa e checkpoint. Ela não representa a missão M01. As 30 missões da campanha estão PLANEJADAS. Consultar [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) para resultados observados.
