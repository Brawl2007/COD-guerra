# Verificações e alcance

Base de todas as execuções abaixo: `68301b779b856af46ed35a10fde42df9559d9ed4`. Resultados de SHAs anteriores não foram somados a esta auditoria.

| Verificação | Resultado | Prova / limite |
| --- | --- | --- |
| `npm ci --cache /tmp/cod-guerra-npm-cache --no-audit --no-fund` | Concluído, código 0 | [install.log](evidence/checks/install.log) |
| `npm run build` | Concluído, código 0 | [build.log](evidence/checks/build.log) |
| `npm test` | **1131/1131**, zero falhas, cancelados ou ignorados; 520,4 s nesta máquina | [unit-tests.log](evidence/checks/unit-tests.log); houve concorrência com o navegador |
| Spec existente `m01-audio-offline-render.spec.js` | **1/1**, 31 sinais renderizados | [audio.log](evidence/checks/audio.log), [WAVs e métricas](evidence/audio/); não houve escuta |
| Piloto de navegador original, 1280×720/Low | Interrompido pelo auditor após bloqueio de controlo no primeiro trajeto | A conserva a prova; não é aprovação nem defeito de colisão isolado |
| Piloto adaptado, 640×360/Low | Consultar resultado final em A | Só adaptação do controlador e viewport; sem atribuição de estados à partida |
| Navegação visual independente, High/1280×720 | Parcial: inspeção da secção e entrega da primeira mensagem com inputs reais | Fotos e log; auditor conhecia o mapa, sem teste cego |
| Contrato de cobertura | Reproduzidos destino ausente e sugestão igual à posição ocupada | Rota separada de controlos de simulação; [prova](evidence/cover-contract.json) |
| Fronteiras de interação | Reproduzidos dois prompts sem ação válida no ponto anunciado | Instâncias descartáveis com estado atribuído, explicitamente fora da partida; [prova](evidence/interaction-probes.json) |
| Altura na margem | Reproduzida descida de 7 m num passo de 0,05 s | Rota separada por controlos; [prova](evidence/height-probe.json), sem vídeo |

Não foi executada a suite completa de navegador nesta auditoria, nem um playtest móvel, uma medição de FPS no PC-alvo ou uma validação humana de áudio/diversão. Os testes de estado/checkpoint/touch incluídos em `npm test` não substituem esses ensaios. Os relatos gráficos distinguem Low de High.

Não foram alterados código de produção, física, IA, cronologia, objetivos, saves, fixtures ou goldens. A comparação de hashes no manifesto de integridade fecha esta afirmação. Uma bateria verde comprova os contratos testados; não aprova qualidade cinematográfica nem entretenimento.
