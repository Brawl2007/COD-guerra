# Poses procedurais de M01

Os presentes da chamada das 07:05 agora ficam sentados. A postura é um dado da simulação (`pose: seated`, `crouched: true`) e sobrevive ao save/reload. Joelhos e cotovelos são segmentos articulados; pés usam botas separadas. As poses em pé, agachada, ferida e transportada derivam dos estados já existentes, sem alterar saúde, trajecto ou resultados no renderer.

- [Chamada no build de produção](roll-call-seated.png): continuação do snapshot de outro realmente alcançado pela rota automática da simulação. O teste também recarrega a página e verifica a mesma contagem de sentados. **É uma verificação por trecho, não uma nova partida contínua.**
- [Comparação isolada](pose-gallery.png): exemplos no mesmo renderer, sem executar a missão. [Relatório](gallery-report.json), zero erros de página. As contagens de chamadas/triângulos referem-se somente à galeria, não ao jogo.

Validação: 76/76 testes Node, build e 10/10 testes de navegador em Chromium 153/SwiftShader, 1280×720. Os três testes novos verificam matrizes efectivas, pés no chão, altura da cabeça, corpo horizontal, ausência de mutação, capacidade para o elenco inteiro, save e rejeição de pose desconhecida. As imagens foram inspeccionadas.

```sh
npm ci
npm test
npm run build
CHROME_EXECUTABLE=/caminho/para/chromium npm run test:browser
CHROME_EXECUTABLE=/caminho/para/chromium node tools/verify-m01-poses.mjs --out test-results/m01-poses
```

Todos os modelos continuam procedurais provisórios. A chamada não implementa ainda cantil/caneca, gestos finais ou vozes. O transporte na primeira pessoa conserva o placeholder de pernas/mão; esta alteração melhora o corpo visto no mundo. Falta playtest humano e medição no Chromebook. M01 permanece **PROTÓTIPO JOGÁVEL**.
