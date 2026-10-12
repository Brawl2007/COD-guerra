# T31 / T33 — leito da via e props reais

Estado: **ACEITE**; verifier PASS e reviewer ACCEPT independentes no código `6878d01e895787342d5f43b98524d47d53475943`. Branch `codex/m01-t31-t33-rail-props-v1`; base `02f2145cd71ce17a6af84ef611823a0c0f1ddac5`. Integração e testes do resultado pendentes.

T31 substitui os caminhos duplicados por quatro batches reais: perfil de carril, travessas, balastro e talas. Travessas0,63m High/Medium e1,26m Low, talas15m, agulha da estação e via própria do trem com um único dono. Metadados reais do GLB determinam os encontros: vão final1044,7; apoio1049,2; conector plano seguido da transição até1062 a−0,82m. Posições/arte dos trens e modelos originais preservados. A transição curta de aproximadamente6,5% é reconstrução visual do protótipo, sem afirmação histórica.

T33 carrega os42 GLBs imutáveis/21 tipos do kitT12, preservando geometria indexada, transformações, normais, cores e PBR em três batches instanciados. Há postes/fios, cercas, lanternas e equipamento ferroviário. Residency atómica, fallback, cargas parciais/stale, descarte único e reutilização dos atributos no restauro.

## Provas finais

- `ci-final-runs.json`, `ci-node-build.log`: [CI38279380748](https://github.com/Brawl2007/COD-guerra/actions/runs/38279380748), código aceite,661/661 Node,173 tooling e build89 módulos PASS.
- `ci-browser.log`: [CI38279380744](https://github.com/Brawl2007/COD-guerra/actions/runs/38279380744), código aceite,3/3 browser/autoridade PASS,16,6min;83 colisores, rota26 eventos/4 checkpoints/saúde92.
- `browser.log/json`: produção local3/3 PASS,13,9min, sem retries/skips/flaky. Quinze vistas:01/02/03/07/10/16 e nove detalhes de props/junções. Todos os saves/câmaras iguais aos registos da base real; relógio desenhado igual ao real; controlMaxDiff0 e mínimo420 píxeis alterados. Via4 draws; props1..3, limite8.
- `captures/baseline/`: base imutável02f. Banco final composto de13 capturas da execução original15/15, mais duas vistas leste/trem recapturadas com câmaras corrigidas. Logs/JSON de ambas preservados; não se afirma uma segunda execução integral15/15.
- `captures/candidate/restore-plateau.json`: quatro restauros iguais mantêm relógio0,05,374 geometrias e74 texturas. Low/High, reload, falha opcional e residency tardia em pausa PASS.
- `VERIFIER.md`, `REVIEW.md`: inspeção independente de buffers GLB reais,15 imagens atuais, qualidade/falha/residency;13/13 testes independentes. `verifier-fix1-contact.json`:132 amostras oeste e288 hits reais de piso leste, sem oclusão residual nas amostras retidas. Os356 caminhos protegidos permanecem byte-idênticos à base.
- `route-equivalence.json` compara o relatório integral da base com a primeira fonteab85. A equivalência é transportada para6878 por entradas de gameplay byte-idênticas; o CI corrigido executou novamente a rota. O JSON antigo não é atribuído a uma execução nova.

## Correcção e limites

Uma tentativa formal de correcção; zero rejeições de revisão. `attempts/attempt1/` conserva browser/CI falhados e imagens da fonteab85. Suposições24,5/1130 e pedido inicial de portão aberto foram substituídos por medição dos modelos reais. As duas câmaras finais mostram cada encontro antes do portão fechado; o trecho oculto é apoiado por geometria/raycast.

O reveal restrito do piso usa quatro materiais clonados; preserva fundação/masonry fora das duas faixas e abaixo da coroa, bytes/vertices originais, alturas físicas e texturas emprestadas. Detalhes suplementares antigos junto à cabana são removidos sem substituição nos mesmos pontos; os30 clusters de produção mantêm âncoras numa nova composição. Padding degenerado dos atlas é contado separadamente dos triângulos reais. Licença provisória doT12 intacta. Sem FPS/VRAM medidos ou playtest humano novo; M01 continua PROTÓTIPO JOGÁVEL.

