# Relatório de qualidade — fundação

## Evidências locais

| Verificação | Resultado | O que demonstra |
| --- | --- | --- |
| `npm test` | 35/35 passam | 11 testes preservados, 14 regressões da fundação e 10 validações de dados de M01 |
| `npm run build` | Passa | Build Vite de produção com assets originais; JS ~698 kB / 181 kB gzip |
| Playwright sobre produção | 4/4 passam, 44,8 s | Prefixo/ assets; controlos/recarga/pausa; movimento/checkpoint/reload; erro de save recuperável; fallback |
| Inspecção de capturas | Menu e jogo inspeccionados | Layout a 1280×720; correcção dos triângulos sobrepostos dos placeholders e escala do ViewModel |
| Revisão PR #8 | Integrado com correcções | Contrato de engine, personagens históricos fora de cena, limite anunciado e incertezas documentadas |

O teste de tiro detecta acerto horizontal e falha acima da cabeça, paredes/terreno e bloqueio do cano. A IA não dispara de cobertura sem visão. O teste de explosão distingue actor obstruído de actor exposto. Saves inválidos são rejeitados sem modificar a simulação; decisões futuras reproduzem-se após restaurar o RNG. Um teste de morte conserva o checkpoint vivo e as baixas anteriores.

## Ambiente e limites

Node 24.19.0, Three.js 0.186.1, Vite 8.3.1, Playwright 1.58.2; Chromium 153 com SwiftShader em ambiente Linux, 1280×720. O download padrão de Chromium falhou neste ambiente; foi usado `CHROME_EXECUTABLE`, descrito no runbook. O daemon de agent-browser não arrancou; a verificação efectiva foi Playwright.

O build emite aviso de chunk maior que 500 kB. Não é erro de compilação; reduzir/cortar carregamento será avaliado com medição real. FPS, memória prolongada e budgets no Chromebook ainda não medidos. Não há relatório de performance fabricado.

As capturas e traces ficam em `test-results/`; o CI publica `browser-evidence`. O PR deve passar o workflow antes de merge; os resultados locais não comprovam que Actions/Pages já publicaram esta branch.

As duas primeiras execuções do CI passaram instalação, Node e build, mas excederam o tempo do navegador. O trace mostrou o primeiro teste a concluir disparo/recarga/pausa e a expirar ao capturar a imagem final; a caminhada também excedeu 20 s com renderização em software. Mantêm-se viewport 1280×720, controlos e assertions; o CI recebe orçamento de 180 s por teste e 120 s para o percurso, sem retries. Falhas futuras incluem diagnóstico serializável. Estes tempos não são uma aprovação de performance no Chromebook.

## Critérios ainda não aprovados

M01 continua PLANEJADA. Testes que comparam cronologia e medidas ao JSON não provam historicidade. Faltam leitura integral/cartografia, ligação à engine e partida completa; CP-A..D, skip, wz.29, baixas S2 através de LOD, resgate opcional, espera visual de 90 s e demolições seguras precisam de demonstração em navegador.

Arte final, soldados riggados, mãos convincentes, áudio gravado, mixagem e validação no Chromebook são trabalho posterior. A bancada francesa permite testar a fundação e não representa Tczew.
